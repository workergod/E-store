import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function check() {
  await signInWithEmailAndPassword(auth, 'developeremil@estorepro.internal', 'dev123');
  
  const devDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
  console.log("Developer companyId:", devDoc.data()?.companyId);

  const compSnap = await getDocs(collection(db, 'companies'));
  console.log("Companies count:", compSnap.size);
  compSnap.docs.forEach(d => console.log("Company:", d.id, d.data().companyName));

  const userSnap = await getDocs(collection(db, 'users'));
  console.log("Users count:", userSnap.size);
  userSnap.docs.forEach(d => {
    const data = d.data();
    if (data.username === '@cryodeal' || data.status === 'Pending') {
      console.log("User:", data.username, "| companyId:", data.companyId, "| status:", data.status, "| isApproved:", data.isApproved);
    }
  });
  
  process.exit(0);
}

check().catch(console.error);
