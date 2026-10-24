import { collection, doc, addDoc, updateDoc, getDocs, getDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { Tool } from '../shared/types/Tool';
import { auditLogRepository } from './AuditLogRepository';

export const toolRepository = {
  // Stored in 'products' collection with isTool: true to use existing approved Firestore security rules
  getCollection: () => collection(db, 'products'),

  getAll: async (companyId: string): Promise<Tool[]> => {
    try {
      const q = query(
        toolRepository.getCollection(),
        where('companyId', '==', companyId)
      );
      const snapshot = await getDocs(q);
      const tools = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(t => t.isTool === true || t.itemType === 'TOOL');
      return tools.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (err) {
      console.error('Failed to load tools:', err);
      return [];
    }
  },

  getById: async (id: string, companyId: string): Promise<Tool | null> => {
    try {
      const docRef = doc(db, 'products', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.companyId === companyId) {
          return { id: snapshot.id, ...data } as Tool;
        }
      }
      return null;
    } catch (err) {
      console.error('Failed to get tool by id:', err);
      return null;
    }
  },

  generateToolCode: async (companyId: string): Promise<string> => {
    try {
      const tools = await toolRepository.getAll(companyId);
      if (tools.length === 0) {
        return 'TOOL-001';
      }

      let maxNum = 0;
      tools.forEach(t => {
        const code = t.toolCode || (t as any).sku || '';
        if (code) {
          const match = code.match(/(\d+)$/);
          if (match) {
            const n = parseInt(match[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
      });

      const nextNum = Math.max(maxNum + 1, tools.length + 1);
      return `TOOL-${String(nextNum).padStart(3, '0')}`;
    } catch (e) {
      return `TOOL-${Date.now().toString().slice(-4)}`;
    }
  },

  create: async (data: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> => {
    const now = serverTimestamp();
    const toolCode = data.toolCode?.trim() || await toolRepository.generateToolCode(data.companyId);
    
    const totalQty = Number(data.totalQty) || 1;
    const availableQty = data.availableQty !== undefined ? Number(data.availableQty) : totalQty;
    const issuedQty = Number(data.issuedQty) || 0;
    const maintenanceQty = Number(data.maintenanceQty) || 0;

    let computedStatus = data.status || 'AVAILABLE';
    if (availableQty <= 0 && issuedQty > 0) {
      computedStatus = 'IN_USE';
    } else if (maintenanceQty > 0 && availableQty <= 0 && issuedQty <= 0) {
      computedStatus = 'MAINTENANCE';
    } else if (availableQty > 0) {
      computedStatus = 'AVAILABLE';
    }

    const payload = {
      ...data,
      isTool: true,
      itemType: 'TOOL',
      sku: toolCode, // Keep sku populated for consistency in Firestore
      toolCode,
      totalQty,
      availableQty,
      issuedQty,
      maintenanceQty,
      status: computedStatus,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId
    };

    const docRef = await addDoc(toolRepository.getCollection(), payload);
    await auditLogRepository.logAction(userId, data.companyId, 'CREATE', 'Tool', docRef.id, payload);
    return docRef.id;
  },

  update: async (id: string, data: Partial<Tool>, companyId: string, userId: string): Promise<void> => {
    const docRef = doc(db, 'products', id);
    const now = serverTimestamp();

    // Check permissions
    const existing = await toolRepository.getById(id, companyId);
    if (!existing) throw new Error('Tool not found or unauthorized');

    const totalQty = data.totalQty !== undefined ? Number(data.totalQty) : existing.totalQty;
    const availableQty = data.availableQty !== undefined ? Number(data.availableQty) : existing.availableQty;
    const issuedQty = data.issuedQty !== undefined ? Number(data.issuedQty) : existing.issuedQty;
    const maintenanceQty = data.maintenanceQty !== undefined ? Number(data.maintenanceQty) : (existing.maintenanceQty || 0);

    let computedStatus = data.status || existing.status;
    if (computedStatus !== 'RETIRED' && computedStatus !== 'DELETED') {
      if (availableQty <= 0 && issuedQty > 0) {
        computedStatus = 'IN_USE';
      } else if (availableQty > 0) {
        computedStatus = 'AVAILABLE';
      } else if (maintenanceQty > 0) {
        computedStatus = 'MAINTENANCE';
      }
    }

    const payload = {
      ...data,
      isTool: true,
      itemType: 'TOOL',
      totalQty,
      availableQty,
      issuedQty,
      maintenanceQty,
      status: computedStatus,
      updatedAt: now,
      updatedBy: userId
    };

    await updateDoc(docRef, payload);
    await auditLogRepository.logAction(userId, companyId, 'UPDATE', 'Tool', id, payload);
  },

  delete: async (id: string, companyId: string, userId: string): Promise<void> => {
    const existing = await toolRepository.getById(id, companyId);
    if (!existing) throw new Error('Tool not found');

    if (existing.issuedQty > 0) {
      throw new Error(`Cannot delete tool "${existing.name}" because ${existing.issuedQty} units are currently issued to technicians. Please return them first.`);
    }

    // Soft delete so historical issue/return records remain intact
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      status: 'DELETED',
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });

    await auditLogRepository.logAction(userId, companyId, 'DELETE', 'Tool', id, { status: 'DELETED' });
  }
};
