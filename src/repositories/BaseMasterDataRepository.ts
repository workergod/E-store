import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { BaseMasterData } from '../shared/types/MasterData';
import { auditLogRepository } from './AuditLogRepository';

export abstract class BaseMasterDataRepository<T extends BaseMasterData> {
  protected collectionName: string;
  protected resourceName: string;

  constructor(collectionName: string, resourceName: string) {
    this.collectionName = collectionName;
    this.resourceName = resourceName;
  }

  protected getCollection() {
    return collection(db, this.collectionName);
  }

  protected async checkDependencies(_id: string, _companyId: string): Promise<boolean> {
    // Default implementation assumes no dependencies.
    // Subclasses will check products, etc.
    return false; // Returns true if it HAS dependencies (meaning it cannot be archived)
  }

  async getAll(companyId: string): Promise<T[]> {
    const q = query(
      this.getCollection(), 
      where('companyId', '==', companyId),
      orderBy('displayOrder', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  }

  async getActive(companyId: string): Promise<T[]> {
    const q = query(
      this.getCollection(), 
      where('companyId', '==', companyId),
      where('status', '==', 'ACTIVE'),
      orderBy('displayOrder', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  }

  async getArchived(companyId: string): Promise<T[]> {
    const q = query(
      this.getCollection(), 
      where('companyId', '==', companyId),
      where('status', '==', 'ARCHIVED'),
      orderBy('displayOrder', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  }

  async checkDuplicateCode(code: string, companyId: string, excludeId?: string): Promise<boolean> {
    const q = query(
      this.getCollection(), 
      where('companyId', '==', companyId),
      where('code', '==', code)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return false;
    
    if (excludeId) {
      return snapshot.docs.some(doc => doc.id !== excludeId);
    }
    return true;
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> {
    const isDuplicate = await this.checkDuplicateCode(data.code, data.companyId);
    if (isDuplicate) throw new Error(`Code ${data.code} already exists.`);

    const now = serverTimestamp();
    const payload = {
      ...data,
      status: data.status || 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
      deletedAt: null,
      deletedBy: null
    };

    const docRef = await addDoc(this.getCollection(), payload);
    
    await auditLogRepository.logAction(userId, data.companyId, 'CREATE', this.resourceName, docRef.id, payload);
    
    return docRef.id;
  }

  async update(id: string, data: Partial<T>, companyId: string, userId: string): Promise<void> {
    if (data.code) {
      const isDuplicate = await this.checkDuplicateCode(data.code, companyId, id);
      if (isDuplicate) throw new Error(`Code ${data.code} already exists.`);
    }

    const docRef = doc(db, this.collectionName, id);
    const payload = {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    };

    await updateDoc(docRef, payload);
    
    await auditLogRepository.logAction(userId, companyId, 'UPDATE', this.resourceName, id, payload);
  }

  async softDelete(id: string, companyId: string, userId: string): Promise<void> {
    const hasDependencies = await this.checkDependencies(id, companyId);
    if (hasDependencies) {
      throw new Error(`Cannot archive ${this.resourceName} because it is referenced by other records.`);
    }

    const docRef = doc(db, this.collectionName, id);
    const payload = {
      status: 'ARCHIVED',
      deletedAt: serverTimestamp(),
      deletedBy: userId,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    };

    await updateDoc(docRef, payload);
    
    await auditLogRepository.logAction(userId, companyId, 'DELETE', this.resourceName, id, { action: 'soft_delete' });
  }

  async restore(id: string, companyId: string, userId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    const payload = {
      status: 'ACTIVE',
      deletedAt: null,
      deletedBy: null,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    };

    await updateDoc(docRef, payload);
    
    await auditLogRepository.logAction(userId, companyId, 'UPDATE', this.resourceName, id, { action: 'restore' });
  }

  // SuperAdmin Only
  async hardDelete(id: string, companyId: string, userId: string): Promise<void> {
    const docRef = doc(db, this.collectionName, id);
    await deleteDoc(docRef);
    
    await auditLogRepository.logAction(userId, companyId, 'DELETE', this.resourceName, id, { action: 'hard_delete' });
  }
}
