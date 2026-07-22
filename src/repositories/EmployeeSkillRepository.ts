import { collection, doc, getDocs, setDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { EmployeeSkill } from '../shared/types/EmployeeSkill';
import { auditLogRepository } from './AuditLogRepository';

const COLLECTION_NAME = 'employeeSkills';

export const employeeSkillRepository = {
  getCollection: () => collection(db, COLLECTION_NAME),

  getByEmployee: async (companyId: string, employeeId: string): Promise<EmployeeSkill[]> => {
    const q = query(
      employeeSkillRepository.getCollection(),
      where('companyId', '==', companyId),
      where('employeeId', '==', employeeId)
    );
    const snapshot = await getDocs(q);
    const skills = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeSkill));
    return skills.sort((a, b) => {
      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt as any).getTime() : 0);
      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt as any).getTime() : 0);
      return timeB - timeA;
    });
  },

  create: async (data: Omit<EmployeeSkill, 'id' | 'createdAt'>, userId: string): Promise<string> => {
    const newRef = doc(employeeSkillRepository.getCollection());
    
    const payload: Omit<EmployeeSkill, 'id'> = {
      ...data,
      createdAt: serverTimestamp() as any,
    };

    await setDoc(newRef, payload);

    await auditLogRepository.logAction(
      userId,
      data.companyId,
      'CREATE',
      'EmployeeSkill',
      newRef.id,
      { skillName: data.skillName, employeeId: data.employeeId }
    );

    return newRef.id;
  },

  delete: async (id: string, companyId: string, userId: string): Promise<void> => {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);

    await auditLogRepository.logAction(
      userId,
      companyId,
      'DELETE',
      'EmployeeSkill',
      id,
      {}
    );
  }
};
