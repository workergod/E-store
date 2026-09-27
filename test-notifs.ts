import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

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

async function testNotifs() {
  await signInWithEmailAndPassword(auth, 'developeremil@estorepro.internal', 'dev123');
  try {
    const docRef = await addDoc(collection(db, 'notifications'), { test: true });
    console.log("Write success:", docRef.id);
    const snap = await getDocs(collection(db, 'notifications'));
    console.log("Read success, count:", snap.size);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
  process.exit(0);
}

testNotifs().catch(console.error);
