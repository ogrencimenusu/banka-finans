const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
const fs = require("fs");
const path = require("path");

// Read .env file manually
const envPath = path.join(__dirname, ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const env = {};
envContent.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length === 2) {
    env[parts[0].trim()] = parts[1].trim();
  }
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("Connecting to Firestore with Project ID:", firebaseConfig.projectId);
  
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    console.log("Found users docs:", usersSnap.size);
    
    let uids = [];
    usersSnap.forEach(doc => {
      uids.push(doc.id);
      console.log("User UID:", doc.id);
    });

    if (uids.length === 0) {
      console.log("No explicit user documents in /users. Trying to search using collectionGroup or standard subcollection structure.");
    }

    for (const uid of uids) {
      console.log(`\n--- Fetching transactions for UID: ${uid} ---`);
      
      // Fetch Institutions
      const instsSnap = await getDocs(collection(db, `users/${uid}/institutions`));
      const insts = {};
      instsSnap.forEach(d => {
        insts[d.id] = d.data().name;
      });
      console.log(`Fetched ${instsSnap.size} institutions.`);

      // Fetch Stocks
      const stocksSnap = await getDocs(collection(db, `users/${uid}/stocks`));
      const stocks = {};
      stocksSnap.forEach(d => {
        stocks[d.id] = d.data().name;
      });
      console.log(`Fetched ${stocksSnap.size} stocks.`);

      // Fetch Transactions
      const transSnap = await getDocs(collection(db, `users/${uid}/financeTransactions`));
      console.log(`Fetched ${transSnap.size} transactions.`);

      const transList = [];
      transSnap.forEach(d => {
        const data = d.data();
        transList.push({
          id: d.id,
          ...data,
          instName: insts[data.institutionId] || data.institutionId,
          stockName: stocks[data.stockId] || data.stockId
        });
      });

      // Filter Midas transactions to inspect
      const midasTrans = transList
        .filter(t => t.instName && t.instName.toLowerCase().includes("midas") && t.deleted !== true)
        .sort((a, b) => a.date.localeCompare(b.date)); // Sort chronologically (oldest first)

      console.log("\nMidas Transactions in Database (Chronological):");
      midasTrans.forEach((t, i) => {
        console.log(`${i+1}. ID: ${t.id} | Date: ${t.date} | ${t.stockName} | ${t.type} | Qty: ${t.quantity} | Price: ${t.price} TL`);
      });
    }

  } catch (e) {
    console.error("Query Error:", e);
  }
}
run();
