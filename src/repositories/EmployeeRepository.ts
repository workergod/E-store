import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { Employee, EmployeeStatus } from '../shared/types/Employee';
import { auditLogRepository } from './AuditLogRepository';

const COLLECTION_NAME = 'employees';

export const employeeRepository = {
  getCollection: () => collection(db, COLLECTION_NAME),

  getAll: async (companyId: string): Promise<Employee[]> => {
    const q = query(
      employeeRepository.getCollection(),
      where('companyId', '==', companyId)
    );
    const snapshot = await getDocs(q);
    const employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    return employees.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA; // desc
    });
  },

  getById: async (id: string, companyId: string): Promise<Employee | null> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().companyId !== companyId) return null;
    return { id: docSnap.id, ...docSnap.data() } as Employee;
  },

  create: async (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt' | 'employeeCode'>, userId: string): Promise<string> => {
    const newRef = doc(employeeRepository.getCollection());
    
    // Auto-generate employeeCode
    // E.g. EMP-2026-000001
    const year = new Date().getFullYear();
    const q = query(employeeRepository.getCollection(), where('companyId', '==', data.companyId));
    const snapshot = await getDocs(q);
    const count = snapshot.size + 1;
    const employeeCode = `EMP-${year}-${count.toString().padStart(6, '0')}`;

    const payload: Omit<Employee, 'id'> = {
      ...data,
      employeeCode,
      createdAt: serverTimestamp() as any,
    };

    await setDoc(newRef, payload);

    await auditLogRepository.logAction(
      userId,
      data.companyId,
      'CREATE',
      'Employee',
      newRef.id,
      { employeeCode, name: `${data.firstName} ${data.lastName}` }
    );

    return newRef.id;
  },

  update: async (id: string, data: Partial<Omit<Employee, 'id' | 'companyId' | 'employeeCode' | 'createdAt'>>, companyId: string, userId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    const payload = {
      ...data,
      updatedAt: serverTimestamp()
    };

    await updateDoc(docRef, payload);

    await auditLogRepository.logAction(
      userId,
      companyId,
      'UPDATE',
      'Employee',
      id,
      { updatedFields: Object.keys(data) }
    );
  },

  updateStatus: async (id: string, status: EmployeeStatus, companyId: string, userId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp()
    });

    await auditLogRepository.logAction(
      userId,
      companyId,
      'UPDATE',
      'Employee',
      id,
      { status }
    );
  },

  delete: async (id: string, companyId: string, userId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);

    await auditLogRepository.logAction(
      userId,
      companyId,
      'DELETE',
      'Employee',
      id,
      {}
    );
  }
};
