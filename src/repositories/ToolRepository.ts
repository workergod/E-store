import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { Tool } from '../shared/types/Tool';
import { auditLogRepository } from './AuditLogRepository';

export const toolRepository = {
  getCollection: () => collection(db, 'tools'),

  getAll: async (companyId: string): Promise<Tool[]> => {
    const q = query(
      toolRepository.getCollection(),
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);
    const tools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tool));
    return tools.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  getById: async (id: string, companyId: string): Promise<Tool | null> => {
    const docRef = doc(db, 'tools', id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.companyId === companyId) {
        return { id: snapshot.id, ...data } as Tool;
      }
    }
    return null;
  },

  generateToolCode: async (companyId: string): Promise<string> => {
    const q = query(
      toolRepository.getCollection(),
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return 'TOOL-001';
    }

    let maxNum = 0;
    snapshot.forEach(docSnap => {
      const code = docSnap.data().toolCode as string;
      if (code) {
        const match = code.match(/(\d+)$/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    });

    const nextNum = Math.max(maxNum + 1, snapshot.size + 1);
    return `TOOL-${String(nextNum).padStart(3, '0')}`;
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
    const docRef = doc(db, 'tools', id);
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
    const docRef = doc(db, 'tools', id);
    await updateDoc(docRef, {
      status: 'DELETED',
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });

    await auditLogRepository.logAction(userId, companyId, 'DELETE', 'Tool', id, { status: 'DELETED' });
  }
};
