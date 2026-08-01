import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const banksSnapshot = await getDocs(collection(db, "banks"));
  const banks = banksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const isbank = banks.find(b => b.name.toLowerCase().includes("işbank") || b.name.toLowerCase().includes("iş bank"));
  console.log("Isbank:", isbank);
  
  if (!isbank) return;
  
  const transSnapshot = await getDocs(collection(db, "bankTransactions"));
  const trans = transSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(t => t.bankId === isbank.id);
  
  console.log("Found", trans.length, "transactions for Isbank");
  let sum = 0;
  for (const t of trans) {
    if (t.deleted === true) continue;
    if (t.type === 'Eyv0oZlOuCPWJbmRkv0h') continue;
    
    let amt = t.amount;
    let amtType = typeof amt;
    if (typeof amt === 'string') {
      amt = parseFloat(amt.replace(/\./g, '').replace(',', '.'));
    }
    console.log(`Trans ${t.id}: orig_amount=${t.amount} (type ${amtType}), parsed=${amt}, type=${t.type}`);
    sum += (isNaN(amt) ? 0 : amt);
  }
  console.log("Total computed balance:", sum);
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
