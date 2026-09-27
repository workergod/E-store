import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Need to read the config from your local file
import { app } from './src/firebase/config.ts'; 

const auth = getAuth(app);
const db = getFirestore(app);

async function setupDev() {
  const email = 'developeremil@estorepro.internal';
  const password = 'developerpass';
  const username = '@developeremil';
  const normalized = 'developeremil';
  
  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
    console.log('Created auth user successfully!');
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('User already exists in Auth. Logging in to get UID...');
      const cred = await signInWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
    } else {
      console.error('Error creating user:', err);
      process.exit(1);
    }
  }

  // Claim username
  await setDoc(doc(db, 'usernameIndex', normalized), {
    uid,
    normalizedUsername: normalized,
    createdAt: new Date().toISOString()
  });

  // Create user doc
  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    username,
    normalizedUsername: normalized,
    fullName: 'Developer',
    photoURL: '',
    role: 'SuperAdmin',
    status: 'Active',
    permissions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
  });

  console.log('Successfully set up @developeremil account!');
  console.log('Password is: developerpass');
  process.exit(0);
}

setupDev();
