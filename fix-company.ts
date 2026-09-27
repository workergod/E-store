import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Load service account (replace path as needed)
const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixCompanyIds() {
  console.log("Searching for users without companyId...");
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.companyId) {
      console.log(`Fixing user: ${data.email} (${doc.id})`);
      await doc.ref.update({ companyId: 'company_default' });
      count++;
    }
  }
  
  console.log(`Fixed ${count} users.`);
}

fixCompanyIds().catch(console.error);
