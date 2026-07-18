import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../../../firebase';
import { collection, onSnapshot, query, orderBy, where, limit, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';

const SozlukContext = createContext();

export const useSozluk = () => useContext(SozlukContext);

export const SozlukProvider = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Dictionary States
  const [words, setWords] = useState([]);
  const [customLists, setCustomLists] = useState([]);
  const [stickyNotes, setStickyNotes] = useState([]);
  const [practiceTests, setPracticeTests] = useState([]);
  const [customQuickTests, setCustomQuickTests] = useState(() => {
    const local = localStorage.getItem('local_custom_quick_tests') || localStorage.getItem('custom_quick_tests');
    return local ? JSON.parse(local) : [];
  });
  const [dailyStats, setDailyStats] = useState(null);
  
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch Words
    const unsubWords = onSnapshot(query(collection(db, `users/${user.uid}/words`), orderBy('createdAt', 'desc')), (snap) => {
      setWords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
        console.error("Words fetch error", err);
        setLoading(false);
    });

    // Fetch Custom Lists (optional, if we support them later)
    const unsubLists = onSnapshot(
      collection(db, `users/${user.uid}/customLists`), 
      (snap) => {
        const lists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        lists.sort((a, b) => {
          const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        setCustomLists(lists);
      },
      (err) => console.error("Custom lists fetch error", err)
    );

    // Fetch Sticky Notes
    const unsubNotes = onSnapshot(
      query(collection(db, `users/${user.uid}/stickyNotes`), orderBy('createdAt', 'desc')),
      (snap) => {
        setStickyNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error("Sticky notes fetch error", err);
      }
    );

    // Fetch Practice Tests
    const unsubPractice = onSnapshot(query(collection(db, `users/${user.uid}/practice_tests`), orderBy('updatedAt', 'desc'), limit(15)), (snap) => {
      setPracticeTests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Practice tests fetch error:", error));

    // Fetch Custom Quick Tests
    const unsubQuickTests = onSnapshot(query(collection(db, `users/${user.uid}/quick_tests`), orderBy('createdAt', 'desc')), (snap) => {
      const tests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCustomQuickTests(tests);
      localStorage.setItem('local_custom_quick_tests', JSON.stringify(tests));
    }, (error) => console.error("Quick tests fetch error:", error));

    // Fetch Daily Stats
    const today = new Date().toISOString().split('T')[0];
    const unsubDaily = onSnapshot(doc(db, `users/${user.uid}/daily_stats`, today), (docSnap) => {
      if (docSnap.exists()) {
        setDailyStats(docSnap.data());
      } else {
        setDailyStats(null);
      }
    }, (error) => console.error("Daily stats fetch error:", error));

    return () => {
      unsubWords();
      unsubNotes();
      unsubLists();
      unsubPractice();
      unsubQuickTests();
      unsubDaily();
    };
  }, [user]);

  const handleCreateList = async (name) => {
    if (!name.trim() || !user) return;
    try {
      await addDoc(collection(db, `users/${user.uid}/customLists`), {
        name: name.trim(),
        createdAt: serverTimestamp(),
        order: customLists.length
      });
    } catch (error) {
      console.error("List creation error:", error);
    }
  };

  const handleUpdateList = async (listId, name) => {
    if (!name.trim() || !user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/customLists`, listId), {
        name: name.trim()
      });
    } catch (error) {
      console.error("List update error:", error);
    }
  };

  const handleDeleteList = async (listId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/customLists`, listId));
    } catch (error) {
      console.error("List delete error:", error);
    }
  };

  const handleMoveList = async (listId, direction) => {
    if (!user) return;
    
    const sorted = [...customLists].sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const currentIndex = sorted.findIndex(l => l.id === listId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const newSorted = [...sorted];
    const [movedItem] = newSorted.splice(currentIndex, 1);
    newSorted.splice(targetIndex, 0, movedItem);

    try {
      const batch = writeBatch(db);
      newSorted.forEach((list, index) => {
        const ref = doc(db, `users/${user.uid}/customLists`, list.id);
        batch.update(ref, { order: index });
      });
      await batch.commit();
    } catch (error) {
      console.error("List order update error:", error);
    }
  };

  const value = {
    loading,
    words,
    customLists,
    stickyNotes,
    practiceTests,
    customQuickTests,
    setCustomQuickTests,
    dailyStats,
    handleCreateList,
    handleUpdateList,
    handleDeleteList,
    handleMoveList
  };

  return (
    <SozlukContext.Provider value={value}>
      {children}
    </SozlukContext.Provider>
  );
};
