import { collection, doc, addDoc, updateDoc, getDocs, getDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { ToolIssueTransaction, ToolReturnTransaction, ToolCondition } from '../shared/types/Tool';
import { toolRepository } from './ToolRepository';
import { auditLogRepository } from './AuditLogRepository';

export const toolTransactionRepository = {
  getIssueCollection: () => collection(db, 'toolIssueTransactions'),
  getReturnCollection: () => collection(db, 'toolReturnTransactions'),

  getIssueTransactions: async (companyId: string): Promise<ToolIssueTransaction[]> => {
    const q = query(
      toolTransactionRepository.getIssueCollection(),
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);
    const issues = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ToolIssueTransaction));
    return issues.sort((a, b) => {
      const timeA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : 0;
      const timeB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : 0;
      return timeB - timeA;
    });
  },

  getReturnTransactions: async (companyId: string): Promise<ToolReturnTransaction[]> => {
    const q = query(
      toolTransactionRepository.getReturnCollection(),
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);
    const returns = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ToolReturnTransaction));
    return returns.sort((a, b) => {
      const timeA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : 0;
      const timeB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : 0;
      return timeB - timeA;
    });
  },

  generateIssueNumber: async (companyId: string): Promise<string> => {
    const q = query(
      toolTransactionRepository.getIssueCollection(),
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return 'CRYO-TISS-1';
    }

    let maxNum = 0;
    snapshot.forEach(docSnap => {
      const numStr = docSnap.data().issueNumber as string;
      if (numStr) {
        const match = numStr.match(/(\d+)$/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    });

    const nextNum = Math.max(maxNum + 1, snapshot.size + 1);
    return `CRYO-TISS-${nextNum}`;
  },

  generateReturnNumber: async (companyId: string): Promise<string> => {
    const q = query(
      toolTransactionRepository.getReturnCollection(),
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return 'CRYO-TRET-1';
    }

    let maxNum = 0;
    snapshot.forEach(docSnap => {
      const numStr = docSnap.data().returnNumber as string;
      if (numStr) {
        const match = numStr.match(/(\d+)$/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
    });

    const nextNum = Math.max(maxNum + 1, snapshot.size + 1);
    return `CRYO-TRET-${nextNum}`;
  },

  issueTools: async (
    data: {
      companyId: string;
      employeeId: string;
      employeeName?: string;
      additionalTechnicians?: string[];
      siteName?: string;
      issueDate: Date;
      expectedReturnDate?: string;
      notes?: string;
      items: {
        toolId: string;
        quantity: number;
        conditionOut?: ToolCondition;
      }[];
    },
    userId: string
  ): Promise<{ id: string; issueNumber: string }> => {
    const { companyId, employeeId, items, siteName, notes, issueDate, expectedReturnDate, additionalTechnicians } = data;
    if (!items || items.length === 0) throw new Error('No tools selected for issue');

    // Resolve user staff name
    let createdByName = 'Staff';
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        createdByName = userSnap.data()?.fullName || 'Staff';
      }
    } catch (e) {
      console.error("Failed to fetch user name for tool issue", e);
    }

    // Resolve employee name
    let employeeName = data.employeeName || '';
    if (!employeeName && employeeId) {
      try {
        const empRef = doc(db, 'employees', employeeId);
        const empSnap = await getDoc(empRef);
        if (empSnap.exists()) {
          const emp = empSnap.data();
          employeeName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        }
      } catch (e) {
        console.error("Failed to fetch employee name for tool issue", e);
      }
    }

    const issueNumber = await toolTransactionRepository.generateIssueNumber(companyId);
    const enrichedItems: any[] = [];

    // Verify stock and prepare items
    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const tool = await toolRepository.getById(item.toolId, companyId);
      if (!tool) throw new Error(`Tool with ID ${item.toolId} not found`);
      if (tool.availableQty < qty) {
        throw new Error(`Insufficient stock for "${tool.name}". Available: ${tool.availableQty}, requested: ${qty}`);
      }

      enrichedItems.push({
        toolId: tool.id!,
        toolCode: tool.toolCode,
        toolName: tool.name,
        brand: tool.brand || '',
        serialNumber: tool.serialNumber || '',
        quantity: qty,
        conditionOut: item.conditionOut || tool.condition || 'GOOD',
        returnedQuantity: 0
      });
    }

    const now = serverTimestamp();
    const payload = {
      companyId,
      issueNumber,
      employeeId,
      employeeName: employeeName || 'Technician',
      additionalTechnicians: additionalTechnicians || [],
      siteName: siteName || '',
      issueDate: issueDate || new Date(),
      expectedReturnDate: expectedReturnDate || '',
      status: 'ISSUED',
      notes: notes || '',
      items: enrichedItems,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      createdByName
    };

    const docRef = await addDoc(toolTransactionRepository.getIssueCollection(), payload);

    // Update each tool stock
    for (const item of enrichedItems) {
      const toolRef = doc(db, 'tools', item.toolId);
      const toolSnap = await getDoc(toolRef);
      if (toolSnap.exists()) {
        const cur = toolSnap.data();
        const newAvailable = Math.max(0, (cur.availableQty || 0) - item.quantity);
        const newIssued = (cur.issuedQty || 0) + item.quantity;
        const newStatus = newAvailable === 0 ? 'IN_USE' : cur.status;

        await updateDoc(toolRef, {
          availableQty: newAvailable,
          issuedQty: newIssued,
          status: newStatus,
          updatedAt: now,
          updatedBy: userId
        });
      }
    }

    await auditLogRepository.logAction(userId, companyId, 'CREATE', 'ToolIssueTransaction', docRef.id, payload);
    return { id: docRef.id, issueNumber };
  },

  returnTools: async (
    issueId: string,
    returns: {
      toolId: string;
      returnQty: number;
      conditionIn?: ToolCondition;
      actionNeeded?: 'RESTOCK' | 'MAINTENANCE' | 'WRITE_OFF';
      notes?: string;
    }[],
    companyId: string,
    userId: string,
    siteName?: string,
    returnNotes?: string
  ): Promise<{ id: string; returnNumber: string }> => {
    const docRef = doc(db, 'toolIssueTransactions', issueId);
    const issueDoc = await getDoc(docRef);
    if (!issueDoc.exists()) throw new Error('Tool issue transaction not found');

    const issueData = issueDoc.data() as ToolIssueTransaction;
    if (issueData.companyId !== companyId) throw new Error('Permission denied');
    if (issueData.status === 'CLOSED') throw new Error('Tool issue already fully returned and closed');

    const updatedItems = [...issueData.items];
    let allFullyReturned = true;
    const returnedItemsPayload: any[] = [];
    const returnNumber = await toolTransactionRepository.generateReturnNumber(companyId);
    const now = serverTimestamp();

    for (const ret of returns) {
      const itemIdx = updatedItems.findIndex(i => i.toolId === ret.toolId);
      if (itemIdx === -1) continue;

      const item = updatedItems[itemIdx];
      const retQty = Number(ret.returnQty) || 0;
      if (retQty <= 0) {
        allFullyReturned = allFullyReturned && (item.returnedQuantity === item.quantity);
        continue;
      }

      const newReturnedQty = (item.returnedQuantity || 0) + retQty;
      if (newReturnedQty > item.quantity) {
        throw new Error(`Cannot return more than issued for tool ${item.toolName} (Max: ${item.quantity - (item.returnedQuantity || 0)})`);
      }

      updatedItems[itemIdx] = {
        ...item,
        returnedQuantity: newReturnedQty
      };

      if (newReturnedQty < item.quantity) {
        allFullyReturned = false;
      }

      const action = ret.actionNeeded || 'RESTOCK';
      const condIn = ret.conditionIn || 'GOOD';

      returnedItemsPayload.push({
        toolId: item.toolId,
        toolCode: item.toolCode,
        toolName: item.toolName,
        serialNumber: item.serialNumber || '',
        returnQty: retQty,
        conditionIn: condIn,
        actionNeeded: action,
        notes: ret.notes || ''
      });

      // Update Tool master stock
      const toolRef = doc(db, 'tools', item.toolId);
      const toolSnap = await getDoc(toolRef);
      if (toolSnap.exists()) {
        const tData = toolSnap.data();
        let newAvailable = tData.availableQty || 0;
        let newIssued = Math.max(0, (tData.issuedQty || 0) - retQty);
        let newMaintenance = tData.maintenanceQty || 0;
        let newTotal = tData.totalQty || 0;
        let newStatus = tData.status;

        if (action === 'RESTOCK') {
          newAvailable += retQty;
          newStatus = newAvailable > 0 ? 'AVAILABLE' : tData.status;
        } else if (action === 'MAINTENANCE') {
          newMaintenance += retQty;
          newStatus = newAvailable === 0 ? 'MAINTENANCE' : tData.status;
        } else if (action === 'WRITE_OFF') {
          newTotal = Math.max(0, newTotal - retQty);
        }

        await updateDoc(toolRef, {
          availableQty: newAvailable,
          issuedQty: newIssued,
          maintenanceQty: newMaintenance,
          totalQty: newTotal,
          condition: condIn,
          status: newStatus,
          updatedAt: now,
          updatedBy: userId
        });
      }
    }

    if (returnedItemsPayload.length === 0) {
      throw new Error('Please enter a return quantity greater than 0 for at least one tool.');
    }

    let createdByName = 'Staff';
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        createdByName = userSnap.data()?.fullName || 'Staff';
      }
    } catch (e) {
      console.error("Failed to fetch user name for tool return", e);
    }

    const retDocRef = await addDoc(toolTransactionRepository.getReturnCollection(), {
      companyId,
      returnNumber,
      employeeId: issueData.employeeId,
      employeeName: issueData.employeeName || 'Technician',
      issueId,
      issueNumber: issueData.issueNumber || null,
      siteName: siteName !== undefined ? siteName : (issueData.siteName || ''),
      returnDate: new Date(),
      items: returnedItemsPayload,
      notes: returnNotes || '',
      createdAt: now,
      createdBy: userId,
      createdByName
    });

    const newStatus = allFullyReturned ? 'CLOSED' : 'PARTIALLY_RETURNED';
    await updateDoc(docRef, {
      items: updatedItems,
      status: newStatus,
      updatedAt: now,
      updatedBy: userId
    });

    await auditLogRepository.logAction(userId, companyId, 'CREATE', 'ToolReturnTransaction', retDocRef.id, {
      returnNumber,
      issueNumber: issueData.issueNumber,
      items: returnedItemsPayload
    });

    return { id: retDocRef.id, returnNumber };
  },

  returnDirectTools: async (
    params: {
      employeeId: string;
      siteName?: string;
      notes?: string;
      items: {
        toolId: string;
        returnQty: number;
        conditionIn?: ToolCondition;
        actionNeeded?: 'RESTOCK' | 'MAINTENANCE' | 'WRITE_OFF';
      }[];
    },
    companyId: string,
    userId: string
  ): Promise<{ id: string; returnNumber: string }> => {
    const { employeeId, siteName, notes, items } = params;
    if (!items || items.length === 0) throw new Error('No tools specified for return');

    const returnNumber = await toolTransactionRepository.generateReturnNumber(companyId);
    const now = serverTimestamp();

    let createdByName = 'Staff';
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        createdByName = userSnap.data()?.fullName || 'Staff';
      }
    } catch (e) {
      console.error("Failed to fetch user name for direct tool return", e);
    }

    let employeeName = '';
    if (employeeId && employeeId !== 'UNLINKED') {
      try {
        const empRef = doc(db, 'employees', employeeId);
        const empSnap = await getDoc(empRef);
        if (empSnap.exists()) {
          const emp = empSnap.data();
          employeeName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        }
      } catch (e) {
        console.error("Failed to fetch employee name for direct tool return", e);
      }
    }

    const returnedItemsPayload: any[] = [];

    for (const item of items) {
      const qty = Number(item.returnQty) || 0;
      if (qty <= 0) continue;

      const tool = await toolRepository.getById(item.toolId, companyId);
      if (!tool) continue;

      const action = item.actionNeeded || 'RESTOCK';
      const condIn = item.conditionIn || 'GOOD';

      returnedItemsPayload.push({
        toolId: tool.id!,
        toolCode: tool.toolCode,
        toolName: tool.name,
        serialNumber: tool.serialNumber || '',
        returnQty: qty,
        conditionIn: condIn,
        actionNeeded: action
      });

      // Update Tool master
      const toolRef = doc(db, 'tools', tool.id!);
      const toolSnap = await getDoc(toolRef);
      if (toolSnap.exists()) {
        const tData = toolSnap.data();
        let newAvailable = tData.availableQty || 0;
        let newIssued = Math.max(0, (tData.issuedQty || 0) - qty);
        let newMaintenance = tData.maintenanceQty || 0;
        let newTotal = tData.totalQty || 0;
        let newStatus = tData.status;

        if (action === 'RESTOCK') {
          newAvailable += qty;
          newStatus = newAvailable > 0 ? 'AVAILABLE' : tData.status;
        } else if (action === 'MAINTENANCE') {
          newMaintenance += qty;
          newStatus = newAvailable === 0 ? 'MAINTENANCE' : tData.status;
        } else if (action === 'WRITE_OFF') {
          newTotal = Math.max(0, newTotal - qty);
        }

        await updateDoc(toolRef, {
          availableQty: newAvailable,
          issuedQty: newIssued,
          maintenanceQty: newMaintenance,
          totalQty: newTotal,
          condition: condIn,
          status: newStatus,
          updatedAt: now,
          updatedBy: userId
        });
      }
    }

    if (returnedItemsPayload.length === 0) {
      throw new Error('Please enter a valid return quantity greater than 0');
    }

    const retDocRef = await addDoc(toolTransactionRepository.getReturnCollection(), {
      companyId,
      returnNumber,
      employeeId: employeeId || 'UNLINKED',
      employeeName: employeeName || 'Technician',
      issueId: 'DIRECT_RETURN',
      isDirectReturn: true,
      siteName: siteName || '',
      returnDate: new Date(),
      items: returnedItemsPayload,
      notes: notes || 'Direct tool return without prior issue record',
      createdAt: now,
      createdBy: userId,
      createdByName
    });

    await auditLogRepository.logAction(userId, companyId, 'CREATE', 'ToolDirectReturnTransaction', retDocRef.id, {
      returnNumber,
      siteName,
      items: returnedItemsPayload,
      notes
    });

    return { id: retDocRef.id, returnNumber };
  }
};
