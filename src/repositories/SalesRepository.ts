import {
  collection, addDoc, getDocs, query, where, orderBy,
  serverTimestamp, doc, getDoc
} from 'firebase/firestore';
import { db } from '../firebase/firestore';

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CustomerSale {
  id?: string;
  companyId: string;
  customerName: string;
  customerPhone: string;
  saleDate: Date | any;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  notes?: string;
  servedBy: string; // staff name
  receiptNo?: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

class SalesRepository {
  private col = 'customerSales';

  async create(data: Omit<CustomerSale, 'id' | 'createdAt' | 'updatedAt'>, userId: string): Promise<string> {
    const snap = await getDocs(query(collection(db, this.col), where('companyId', '==', data.companyId)));
    const receiptNo = `RCP-${String(snap.size + 1).padStart(5, '0')}`;
    const ref = await addDoc(collection(db, this.col), {
      ...data,
      receiptNo,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
    });
    return ref.id;
  }

  async getAll(companyId: string): Promise<CustomerSale[]> {
    const q = query(
      collection(db, this.col),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerSale));
  }

  async getById(id: string): Promise<CustomerSale | null> {
    const ref = doc(db, this.col, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as CustomerSale;
  }
}

export const salesRepository = new SalesRepository();
