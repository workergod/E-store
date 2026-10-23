import { collection, doc, addDoc, updateDoc, getDocs, getDoc, query, where, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { IssueTransaction } from '../shared/types/IssueTransaction';
import { stockLedgerRepository } from './StockLedgerRepository';
import { auditLogRepository } from './AuditLogRepository';

export const issueRepository = {
  getCollection: () => collection(db, 'issueTransactions'),

  getAll: async (companyId: string): Promise<IssueTransaction[]> => {
    const q = query(
      issueRepository.getCollection(), 
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);
    const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IssueTransaction));
    return issues.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt as any).getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt as any).getTime() : 0);
      return timeB - timeA;
    });
  },

  getById: async (id: string, companyId: string): Promise<IssueTransaction | null> => {
    const docRef = doc(db, 'issueTransactions', id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.companyId === companyId) {
        return { id: snapshot.id, ...data } as IssueTransaction;
      }
    }
    return null;
  },

  generateIssueNumber: async (companyId: string): Promise<string> => {
    const q = query(
      issueRepository.getCollection(),
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return 'CRYO-1';
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
    return `CRYO-${nextNum}`;
  },

  issueItems: async (data: Omit<IssueTransaction, 'id' | 'createdAt' | 'updatedAt' | 'status'>, userId: string): Promise<string> => {
    const now = serverTimestamp();
    const issueNumber = data.issueNumber || await issueRepository.generateIssueNumber(data.companyId);
    data.issueNumber = issueNumber;
    
    let createdByName = 'Staff';
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        createdByName = userSnap.data()?.fullName || 'Staff';
      }
    } catch (e) {
      console.error("Failed to fetch user name for issue log", e);
    }

    const payload = {
      ...data,
      issueNumber,
      status: 'ISSUED',
      createdByName,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId
    };

    const docRef = await addDoc(issueRepository.getCollection(), payload);

    for (const item of data.items) {
      if (item.issuedQty > 0) {
        await stockLedgerRepository.recordTransaction({
          transactionId: `iss_${Date.now()}_${Math.floor(Math.random()*1000)}`,
          companyId: data.companyId,
          productId: item.productId,
          transactionType: 'ISSUE',
          quantity: -item.issuedQty,
          referenceId: docRef.id,
          referenceType: 'ISSUE',
          notes: `Issued (${issueNumber}) to employee ${data.employeeId}`,
          performedBy: userId
        });
      }
    }

    await auditLogRepository.logAction(userId, data.companyId, 'CREATE', 'IssueTransaction', docRef.id, payload);
    return docRef.id;
  },

  returnItems: async (issueId: string, returns: { productId: string; returnQty: number }[], companyId: string, userId: string): Promise<void> => {
    const docRef = doc(db, 'issueTransactions', issueId);
    
    const issueDoc = await getDoc(docRef);
    if (!issueDoc.exists()) throw new Error('Issue not found');
    
    const issueData = issueDoc.data() as IssueTransaction;
    if (issueData.companyId !== companyId) throw new Error('Permission denied');
    if (issueData.status === 'CLOSED') throw new Error('Issue already closed');

    const updatedItems = [...issueData.items];
    let allFullyReturned = true;
    const returnedItemsPayload: any[] = [];

    for (const ret of returns) {
      const itemIdx = updatedItems.findIndex(i => i.productId === ret.productId);
      if (itemIdx === -1) continue;

      const item = updatedItems[itemIdx];
      if (ret.returnQty <= 0) {
          allFullyReturned = allFullyReturned && (item.returnedQty === item.issuedQty);
          continue;
      }

      const newReturnedQty = item.returnedQty + ret.returnQty;
      if (newReturnedQty > item.issuedQty) {
        throw new Error(`Cannot return more than issued for product ${item.productName}`);
      }

      updatedItems[itemIdx] = {
        ...item,
        returnedQty: newReturnedQty,
        usedQty: item.issuedQty - newReturnedQty
      };

      if (newReturnedQty < item.issuedQty) {
        allFullyReturned = false;
      }

      returnedItemsPayload.push({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku || '',
        returnedQty: ret.returnQty
      });

      await stockLedgerRepository.recordTransaction({
        transactionId: `ret_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        companyId,
        productId: item.productId,
        transactionType: 'RETURN',
        quantity: ret.returnQty,
        referenceId: issueId,
        referenceType: 'ISSUE_RETURN',
        notes: `Returned by employee ${issueData.employeeId}`,
        performedBy: userId
      });
    }

    if (returnedItemsPayload.length > 0) {
      let createdByName = 'Staff';
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          createdByName = userSnap.data()?.fullName || 'Staff';
        }
      } catch (e) {
        console.error("Failed to fetch user name for return log", e);
      }

      await addDoc(collection(db, 'returnTransactions'), {
        companyId,
        employeeId: issueData.employeeId,
        issueId,
        issueNumber: issueData.issueNumber || null,
        items: returnedItemsPayload,
        createdAt: serverTimestamp(),
        createdBy: userId,
        createdByName,
        notes: issueData.notes || ''
      });
    }

    const newStatus = allFullyReturned ? 'CLOSED' : 'PARTIALLY_RETURNED';

    await updateDoc(docRef, {
      items: updatedItems,
      status: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });

    await auditLogRepository.logAction(userId, companyId, 'UPDATE', 'IssueTransaction', issueId, { type: 'RETURN', returns });
  },

  returnDirectItems: async (
    params: {
      employeeId: string;
      items: { productId: string; productName: string; sku?: string; returnQty: number; unit?: string }[];
      notes?: string;
    },
    companyId: string,
    userId: string
  ): Promise<string> => {
    const { employeeId, items, notes } = params;
    if (!items || items.length === 0) throw new Error('No items specified for return');

    let createdByName = 'Staff';
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        createdByName = userSnap.data()?.fullName || 'Staff';
      }
    } catch (e) {
      console.error("Failed to fetch user name for return log", e);
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
        console.error("Failed to fetch employee name for return log", e);
      }
    }

    const returnedItemsPayload: any[] = [];

    for (const item of items) {
      const qty = Number(item.returnQty) || 0;
      if (qty <= 0) continue;

      returnedItemsPayload.push({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku || '',
        returnedQty: qty,
        unit: item.unit || ''
      });

      await stockLedgerRepository.recordTransaction({
        transactionId: `ret_dir_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        companyId,
        productId: item.productId,
        transactionType: 'RETURN',
        quantity: qty,
        referenceId: 'DIRECT_RETURN',
        referenceType: 'DIRECT_RETURN',
        notes: `Direct Return (unissued) from ${employeeName || 'Technician'}${notes ? `: ${notes}` : ''}`,
        performedBy: userId
      });
    }

    if (returnedItemsPayload.length === 0) {
      throw new Error('Please enter a valid return quantity greater than 0');
    }

    const retDocRef = await addDoc(collection(db, 'returnTransactions'), {
      companyId,
      employeeId: employeeId || 'UNLINKED',
      employeeName: employeeName || 'Technician',
      issueId: 'DIRECT_RETURN',
      isDirectReturn: true,
      items: returnedItemsPayload,
      createdAt: serverTimestamp(),
      createdBy: userId,
      createdByName,
      notes: notes || 'Direct return without active issue'
    });

    await auditLogRepository.logAction(userId, companyId, 'CREATE', 'DirectReturnTransaction', retDocRef.id, {
      items: returnedItemsPayload,
      notes
    });

    return retDocRef.id;
  }
};
