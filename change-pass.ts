import { getAuth, signInWithEmailAndPassword, updatePassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { app } from './src/firebase/config.ts';

const auth = getAuth(app);
const email = 'developeremil@estorepro.internal';

async function changePass() {
  try {
    console.log('Attempting to log in with previous password...');
    const cred = await signInWithEmailAndPassword(auth, email, 'developerpass');
    console.log('Logged in! Changing password to dev123...');
    await updatePassword(cred.user, 'dev123');
    console.log('Password successfully changed to dev123!');
  } catch (err: any) {
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
      try {
        console.log('User not found or password incorrect. Trying to create new user with dev123...');
        await createUserWithEmailAndPassword(auth, email, 'dev123');
        console.log('Successfully created new user with dev123!');
      } catch (createErr: any) {
        console.error('Error creating user:', createErr.message);
      }
    } else {
      console.error('Error:', err.message);
    }
  }
  process.exit(0);
}

changePass();
