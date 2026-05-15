import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc, limit } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Bank States
  const [banks, setBanks] = useState([]);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [bankConfig, setBankConfig] = useState(null);
  const [quickActionTags, setQuickActionTags] = useState([]);
  const [typeTags, setTypeTags] = useState([]);
  const [bankBulkHistory, setBankBulkHistory] = useState([]);
  const [bankGroupSettings, setBankGroupSettings] = useState({});
  const [bankGroupConfigs, setBankGroupConfigs] = useState({});

  // Finance States
  const [institutions, setInstitutions] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [financeTransactions, setFinanceTransactions] = useState([]);
  const [financeConfig, setFinanceConfig] = useState(null);
  const [financeBulkHistory, setFinanceBulkHistory] = useState([]);

  // Notes States
  const [notes, setNotes] = useState([]);
  const [noteTags, setNoteTags] = useState([]);
  const [notesConfig, setNotesConfig] = useState(null);
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // --- BANK LISTENERS ---
    const unsubBanks = onSnapshot(collection(db, `users/${user.uid}/banks`), (snap) => {
      setBanks(snap.docs.map(d => ({ id: d.id, ...d.data(), source: 'banks' })));
    });

    const unsubBankTrans = onSnapshot(query(collection(db, `users/${user.uid}/bankTransactions`), orderBy('createdAt', 'desc')), (snap) => {
      setBankTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubBankConfig = onSnapshot(doc(db, `users/${user.uid}/config`, 'bankSettings'), (snap) => {
      if (snap.exists()) setBankConfig(snap.data());
    });

    const unsubQA = onSnapshot(query(collection(db, `users/${user.uid}/quickActions`), orderBy('order', 'asc')), (snap) => {
      setQuickActionTags(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTT = onSnapshot(query(collection(db, `users/${user.uid}/transactionTypes`), orderBy("order", "asc")), (snap) => {
      setTypeTags(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubBankHistory = onSnapshot(query(collection(db, `users/${user.uid}/bulkHistory`), orderBy("timestamp", "desc"), limit(10)), (snap) => {
      setBankBulkHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubGroupSettings = onSnapshot(doc(db, `users/${user.uid}/groupSettings`, 'bankGroups'), (snap) => {
      if (snap.exists()) setBankGroupSettings(snap.data());
    });

    const unsubGroupConfigs = onSnapshot(doc(db, `users/${user.uid}/config`, 'bankGroupConfigs'), (snap) => {
      if (snap.exists()) setBankGroupConfigs(snap.data());
    });

    // --- FINANCE LISTENERS ---
    const unsubInst = onSnapshot(collection(db, `users/${user.uid}/institutions`), (snap) => {
      setInstitutions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubStocks = onSnapshot(collection(db, `users/${user.uid}/stocks`), (snap) => {
      setStocks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubFinTrans = onSnapshot(query(collection(db, `users/${user.uid}/financeTransactions`), orderBy('date', 'desc'), orderBy('createdAt', 'desc')), (snap) => {
      setFinanceTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubFinConfig = onSnapshot(doc(db, `users/${user.uid}/config`, 'financeSettings'), (snap) => {
      if (snap.exists()) setFinanceConfig(snap.data());
    });

    const unsubFinHistory = onSnapshot(query(collection(db, `users/${user.uid}/bulkHistory_finance`), orderBy('timestamp', 'desc'), limit(10)), (snap) => {
      setFinanceBulkHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // --- NOTES LISTENERS ---
    const unsubNotes = onSnapshot(query(collection(db, `users/${user.uid}/notes`), orderBy('createdAt', 'desc')), (snap) => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubNoteTags = onSnapshot(collection(db, `users/${user.uid}/noteTags`), (snap) => {
      setNoteTags(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubNotesConfig = onSnapshot(doc(db, `users/${user.uid}/config`, 'notesSettings'), (snap) => {
      setNotesConfig(snap.exists() ? snap.data() : {});
    });

    // Fetch holidays once per user session
    const fetchHolidays = async () => {
      try {
        const year = new Date().getFullYear();
        const yearsToFetch = [year - 1, year, year + 1];
        const promises = yearsToFetch.map(y => 
          fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/TR`).then(r => r.ok ? r.json() : [])
        );
        const results = await Promise.all(promises);
        const apiHolidays = results.flat();
        
        const religiousHolidays = [
          // 2024
          { date: '2024-04-10', localName: 'Ramazan Bayramı 1. Gün' },
          { date: '2024-04-11', localName: 'Ramazan Bayramı 2. Gün' },
          { date: '2024-04-12', localName: 'Ramazan Bayramı 3. Gün' },
          { date: '2024-06-16', localName: 'Kurban Bayramı 1. Gün' },
          { date: '2024-06-17', localName: 'Kurban Bayramı 2. Gün' },
          { date: '2024-06-18', localName: 'Kurban Bayramı 3. Gün' },
          { date: '2024-06-19', localName: 'Kurban Bayramı 4. Gün' },
          // 2025
          { date: '2025-03-30', localName: 'Ramazan Bayramı 1. Gün' },
          { date: '2025-03-31', localName: 'Ramazan Bayramı 2. Gün' },
          { date: '2025-04-01', localName: 'Ramazan Bayramı 3. Gün' },
          { date: '2025-06-06', localName: 'Kurban Bayramı 1. Gün' },
          { date: '2025-06-07', localName: 'Kurban Bayramı 2. Gün' },
          { date: '2025-06-08', localName: 'Kurban Bayramı 3. Gün' },
          { date: '2025-06-09', localName: 'Kurban Bayramı 4. Gün' },
          // 2026
          { date: '2026-03-20', localName: 'Ramazan Bayramı 1. Gün' },
          { date: '2026-03-21', localName: 'Ramazan Bayramı 2. Gün' },
          { date: '2026-03-22', localName: 'Ramazan Bayramı 3. Gün' },
          { date: '2026-05-27', localName: 'Kurban Bayramı 1. Gün' },
          { date: '2026-05-28', localName: 'Kurban Bayramı 2. Gün' },
          { date: '2026-05-29', localName: 'Kurban Bayramı 3. Gün' },
          { date: '2026-05-30', localName: 'Kurban Bayramı 4. Gün' },
          // 2027
          { date: '2027-03-09', localName: 'Ramazan Bayramı 1. Gün' },
          { date: '2027-03-10', localName: 'Ramazan Bayramı 2. Gün' },
          { date: '2027-03-11', localName: 'Ramazan Bayramı 3. Gün' },
          { date: '2027-05-16', localName: 'Kurban Bayramı 1. Gün' },
          { date: '2027-05-17', localName: 'Kurban Bayramı 2. Gün' },
          { date: '2027-05-18', localName: 'Kurban Bayramı 3. Gün' },
          { date: '2027-05-19', localName: 'Kurban Bayramı 4. Gün' }
        ];

        const merged = [...apiHolidays, ...religiousHolidays].map(h => ({
          id: `holiday-${h.date}-${h.localName}`,
          date: h.date,
          title: h.localName,
          itemType: 'holiday',
          isGlobal: h.global ?? true
        }));

        const uniqueHolidays = Array.from(new Map(merged.map(h => [`${h.date}-${h.title}`, h])).values());
        setHolidays(uniqueHolidays);
      } catch (err) {
        console.error('Holiday fetch error:', err);
      }
    };

    fetchHolidays();

    setLoading(false);

    return () => {
      unsubBanks();
      unsubBankTrans();
      unsubBankConfig();
      unsubQA();
      unsubTT();
      unsubBankHistory();
      unsubGroupSettings();
      unsubGroupConfigs();
      unsubInst();
      unsubStocks();
      unsubFinTrans();
      unsubFinConfig();
      unsubFinHistory();
      unsubNotes();
      unsubNoteTags();
      unsubNotesConfig();
    };
  }, [user]);

  const value = {
    loading,
    banks,
    bankTransactions,
    bankConfig,
    quickActionTags,
    typeTags,
    bankBulkHistory,
    bankGroupSettings,
    bankGroupConfigs,
    institutions,
    stocks,
    financeTransactions,
    financeConfig,
    financeBulkHistory,
    notes,
    noteTags,
    notesConfig,
    holidays
  };



  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
