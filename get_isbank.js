import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const config = {};
env.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) config[key.trim()] = val.join('=').trim();
});

const firebaseConfig = {
  apiKey: config.VITE_FIREBASE_API_KEY,
  authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: config.VITE_FIREBASE_PROJECT_ID,
  storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: config.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const users = await getDocs(collection(db, 'users'));
  for (const userDoc of users.docs) {
    const banks = await getDocs(collection(db, `users/${userDoc.id}/banks`));
    let isbankId = null;
    banks.forEach(b => {
      if (b.data().name.includes('İş') || b.data().name.includes('isbank') || b.data().name.includes('İşbank')) {
        isbankId = b.id;
      }
    });

    if (isbankId) {
      console.log(`Found Isbank with ID: ${isbankId} for user ${userDoc.id}`);
      const txs = await getDocs(collection(db, `users/${userDoc.id}/bankTransactions`));
      let sum = 0;
      let jsSum = 0;
      txs.forEach(t => {
        const data = t.data();
        if (data.bankId === isbankId && data.deleted !== true && data.type !== 'Eyv0oZlOuCPWJbmRkv0h') {
          console.log(`Transaction: amount="${data.amount}", type=${data.type}, deleted=${data.deleted}, typeof amount=${typeof data.amount}`);
          let amt = data.amount;
          if (typeof amt === 'string') {
              amt = parseFloat(amt.replace(/\./g, '').replace(',', '.'));
          }
          jsSum += (isNaN(amt) ? 0 : amt);
        }
      });
      console.log(`Total calculated by JS logic: ${jsSum}`);
    }
  }
}
run().catch(console.error);
