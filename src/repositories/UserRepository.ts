import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type { User } from '../types/User';

export class UserRepository {
  private collectionName = 'users';

  async getUser(uid: string): Promise<User | null> {
    const userRef = doc(db, this.collectionName, uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as User;
    }
    return null;
  }

  async createUser(user: User): Promise<void> {
    const userRef = doc(db, this.collectionName, user.uid);
    await setDoc(userRef, {
      ...user,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  async updateLastLogin(uid: string, ip?: string): Promise<void> {
    const userRef = doc(db, this.collectionName, uid);
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
      lastLoginIP: ip || null,
      updatedAt: serverTimestamp()
    });
  }

  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    const userRef = doc(db, this.collectionName, uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
}

export const userRepository = new UserRepository();
