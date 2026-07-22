import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getDocs, collection, query, where, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../../firebase/auth';
import { db } from '../../../firebase/firestore';
import { toast } from 'sonner';
import { useAuthStore } from "../../../store/authStore";
import { userRepository } from '../../../repositories/UserRepository';
import { companyRepository } from '../../../repositories/CompanyRepository';
import { loginHistoryRepository } from '../../../repositories/LoginHistoryRepository';
import { UserStatus } from '../../../types/User';
import { Role } from '../../../constants/roles';
import type { Company } from '../../../types/Company';

export function useAuth() {
  const { setUser, setCompany, setIsLoading, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let userDoc = await userRepository.getUser(firebaseUser.uid);
          
          if (!userDoc) {
            if (firebaseUser.email) {
              // Check if they are an employee in any company
              const empSnap = await getDocs(query(collection(db, 'employees'), where('email', '==', firebaseUser.email)));
              if (!empSnap.empty) {
                const empData = empSnap.docs[0].data();
                const newUser = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  fullName: firebaseUser.displayName || `${empData.firstName} ${empData.lastName}`,
                  photoURL: firebaseUser.photoURL || '',
                  role: empData.role === 'Manager' ? Role.MANAGER : Role.STAFF, // Map employee role to system role
                  companyId: empData.companyId,
                  status: UserStatus.ACTIVE,
                  permissions: [],
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  lastLogin: serverTimestamp(),
                };
                await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
                userDoc = await userRepository.getUser(firebaseUser.uid);
              }
            }
            
            if (!userDoc) {
              await loginHistoryRepository.logFailure(firebaseUser.uid, 'User document not found and not an employee');
              toast.error(`Email ${firebaseUser.email} is not registered as an Employee. Please add it first.`);
              logout();
              setIsLoading(false);
              return;
            }
          }

          if (userDoc.status !== UserStatus.ACTIVE) {
            await loginHistoryRepository.logFailure(firebaseUser.uid, `Account status: ${userDoc.status}`);
            logout();
            setIsLoading(false);
            navigate('/access-denied', { state: { message: `Your account is ${userDoc.status.toLowerCase()}. Contact administration.` }});
            return;
          }

          // Load company
          if (userDoc.role !== Role.SUPER_ADMIN) {
            // Regular user — must have a companyId
            if (!userDoc.companyId) {
              await loginHistoryRepository.logFailure(firebaseUser.uid, 'Missing company assignment');
              logout();
              setIsLoading(false);
              navigate('/access-denied', { state: { message: 'Your account is not assigned to a company.' }});
              return;
            }
            const companyDoc = await companyRepository.getCompany(userDoc.companyId);
            if (!companyDoc) {
              await loginHistoryRepository.logFailure(firebaseUser.uid, 'Company document not found');
              logout();
              setIsLoading(false);
              navigate('/access-denied', { state: { message: 'Your assigned company could not be found.' }});
              return;
            }
            setCompany(companyDoc);
          } else {
            // Super Admin — load company by companyId or find first available
            let company: Company | null = null;

            if (userDoc.companyId) {
              company = await companyRepository.getCompany(userDoc.companyId);
            }

            if (!company) {
              // Find first company in the system
              const snap = await getDocs(collection(db, 'companies'));
              if (!snap.empty) {
                const data = snap.docs[0].data() as Company;
                company = { ...data, companyId: snap.docs[0].id };
              } else {
                // No company exists at all — auto-create a default one for SuperAdmin
                const newCompanyId = `company_${firebaseUser.uid.slice(0, 8)}`;
                const defaultCompany: Company = {
                  companyId: newCompanyId,
                  companyName: 'E Store Pro',
                  companyEmailDomain: firebaseUser.email?.split('@')[1] || 'estorepro.com',
                  licenseStatus: 'Active' as any,
                  subscriptionType: 'Enterprise',
                  allowNegativeStock: false,
                  currency: 'USD',
                  timezone: 'Asia/Kolkata',
                  defaultTaxRate: 5,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                await companyRepository.createCompany(defaultCompany);
                company = defaultCompany;
              }
              // Persist companyId to user doc so next login is instant
              await userRepository.updateUser(userDoc.uid, { companyId: company.companyId });
            }

            setCompany(company);
          }

          // Update last login
          await userRepository.updateLastLogin(userDoc.uid);
          await loginHistoryRepository.logSignIn(userDoc.uid);
          
          setUser(userDoc);
        } catch (error: any) {
          console.error("Auth sync error:", error);
          toast.error(error.message || 'Authentication failed. Please contact your administrator.');
          logout();
        }
      } else {
        logout();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setCompany, setIsLoading, logout, navigate]);
}
