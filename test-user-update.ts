import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc, getDocs, collection } from 'firebase/firestore';

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
    const snap = await getDocs(collection(db, 'users'));
    const firstOtherUser = snap.docs.find(d => d.id !== auth.currentUser!.uid);
    if (!firstOtherUser) {
      console.log("No other user found");
      process.exit(0);
    }
    console.log("Trying to update user:", firstOtherUser.id);
    const docRef = doc(db, 'users', firstOtherUser.id);
    await updateDoc(docRef, { testField: 'hello' });
    console.log("Write success");
  } catch (err: any) {
    console.error("Error writing to other user:", err.message);
  }
  process.exit(0);
}

testSys().catch(console.error);
