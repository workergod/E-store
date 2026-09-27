import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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

async function testSys() {
  await signInWithEmailAndPassword(auth, 'developeremil@estorepro.internal', 'dev123');
  try {
    const docRef = doc(db, 'systemSettings', 'supportStatus');
    await setDoc(docRef, { isDeveloperOnline: true, lastSeen: new Date().toISOString() });
    console.log("Write success");
    const snap = await getDoc(docRef);
    console.log("Data:", snap.data());
  } catch (err: any) {
    console.error("Error systemSettings:", err.message);
  }
  process.exit(0);
}

testSys().catch(console.error);
