import { collection, doc, getDoc, getDocs, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { Company } from '../types/Company';

export class CompanyRepository {
  private collectionName = 'companies';

  async getCompany(companyId: string): Promise<Company | null> {
    const companyRef = doc(db, this.collectionName, companyId);
    const companySnap = await getDoc(companyRef);

    if (companySnap.exists()) {
      return companySnap.data() as Company;
    }
    return null;
  }

  async getCompanyByDomain(domain: string): Promise<Company | null> {
    const q = query(collection(db, this.collectionName), where('companyEmailDomain', '==', domain));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as Company;
    }
    return null;
  }

  async createCompany(company: Company): Promise<void> {
    const companyRef = doc(db, this.collectionName, company.companyId);
    await setDoc(companyRef, {
      ...company,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async updateCompany(companyId: string, data: Partial<Company>): Promise<void> {
    const companyRef = doc(db, this.collectionName, companyId);
    await setDoc(companyRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

export const companyRepository = new CompanyRepository();
