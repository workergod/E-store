import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { app } from './src/firebase/config.ts';

const auth = getAuth(app);
const db = getFirestore(app);
const emailToLog = 'developeremil@estorepro.internal';
const targetEmail = 'alexanderabraham1987@gmail.com';

async function removeUser() {
  try {
    console.log('Logging in as developer...');
    await signInWithEmailAndPassword(auth, emailToLog, 'dev123');
    console.log('Logged in!');

    console.log(`Searching for user with email: ${targetEmail}`);
    const q = query(collection(db, 'users'), where('email', '==', targetEmail));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('User not found in Firestore.');
    } else {
      for (const userDoc of snapshot.docs) {
        console.log(`Found user: ${userDoc.id}. Suspending/Removing...`);
        // Update the status to DELETED so it vanishes from pending, and scramble data
        await updateDoc(doc(db, 'users', userDoc.id), {
          status: 'DELETED',
          isApproved: false,
          fullName: 'Deleted User',
          email: 'deleted@deleted.com'
        });
        console.log('User removed successfully from views!');
      }
    }
  } catch (err: any) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

removeUser();
