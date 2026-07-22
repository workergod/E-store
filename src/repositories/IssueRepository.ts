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
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IssueTransaction));
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

  issueItems: async (data: Omit<IssueTransaction, 'id' | 'createdAt' | 'updatedAt' | 'status'>, userId: string): Promise<string> => {
    const now = serverTimestamp();
    const payload = {
      ...data,
      status: 'ISSUED',
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
          notes: `Issued to employee ${data.employeeId}`,
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

    const newStatus = allFullyReturned ? 'CLOSED' : 'PARTIALLY_RETURNED';

    await updateDoc(docRef, {
      items: updatedItems,
      status: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });

    await auditLogRepository.logAction(userId, companyId, 'UPDATE', 'IssueTransaction', issueId, { type: 'RETURN', returns });
  }
};
