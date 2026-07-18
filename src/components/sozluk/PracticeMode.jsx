import React, { useRef, useState, useEffect } from 'react';
import { useSozluk } from './context/SozlukContext';
import { db } from '../../firebase';
import { doc, updateDoc, writeBatch, collection, addDoc, deleteDoc, setDoc, getDocs, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import PracticeTestContainer from './components/practice/PracticeTestContainer';

const PracticeMode = ({ initialConfig, clearInitialConfig }) => {
  const { words, customLists, customQuickTests, setCustomQuickTests, dailyStats, practiceTests, stickyNotes, loading } = useSozluk();
  const { user } = useAuth();
  const containerRef = useRef(null);

  // Clear initialConfig after first render so we don't restart when navigating back
  useEffect(() => {
    if (initialConfig && clearInitialConfig) {
      // Small timeout to allow PracticeTestContainer to pick it up first
      const t = setTimeout(() => {
        clearInitialConfig();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [initialConfig, clearInitialConfig]);

  // Load saved options from localStorage
  const [savedOptions, setSavedOptions] = useState(() => {
    try {
      const saved = localStorage.getItem('practice_saved_options');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleSaveOptions = (newOptionsOrUpdater) => {
    setSavedOptions(prev => {
      const updated = typeof newOptionsOrUpdater === 'function' ? newOptionsOrUpdater(prev) : newOptionsOrUpdater;
      try {
        localStorage.setItem('practice_saved_options', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  if (loading) return <div className="text-center py-5 text-muted">Yükleniyor...</div>;

  const handleUpdateStage = async (wordId, isCorrect) => {
    try {
      const word = words.find(w => w.id === wordId);
      if (word) {
        const currentStage = word.learningStage ?? 0;
        const newStage = isCorrect ? Math.min(10, currentStage + 1) : Math.max(0, currentStage - 1);
        if (newStage !== currentStage) {
          await updateDoc(doc(db, `users/${user.uid}/words`, wordId), {
            learningStage: newStage
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStagesBatch = async (updates) => {
    if (!updates || updates.length === 0) return;
    try {
      const batch = writeBatch(db);
      updates.forEach(({ wordId, isCorrect }) => {
        const word = words.find(w => w.id === wordId);
        if (word) {
          const currentStage = word.learningStage ?? 0;
          const newStage = isCorrect ? Math.min(10, currentStage + 1) : Math.max(0, currentStage - 1);
          if (newStage !== currentStage) {
            batch.update(doc(db, `users/${user.uid}/words`, wordId), { learningStage: newStage });
          }
        }
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleStar = async (e, word) => {
    if(e) e.stopPropagation();
    try {
      await updateDoc(doc(db, `users/${user.uid}/words`, word.id), {
        isStarred: !word.isStarred
      });
    } catch (err) {
      console.error(err);
    }
  };

  // --- Handlers for Quick Tests (LocalStorage) ---
  const handleSaveQuickTest = async (id, name, config) => {
    try {
      let resultId = id;
      setCustomQuickTests(prev => {
        let updated;
        if (id) {
          updated = prev.map(t => {
            if (t.id === id) {
              return { ...t, name: name !== null && name !== undefined ? name : t.name, config: config !== null && config !== undefined ? config : t.config, updatedAt: new Date().toISOString() };
            }
            return t;
          });
        } else {
          resultId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          updated = [{ id: resultId, name, config, createdAt: new Date().toISOString() }, ...prev];
        }
        localStorage.setItem('local_custom_quick_tests', JSON.stringify(updated));
        return updated;
      });
      return resultId;
    } catch (err) {
      console.error("Save quick test error", err);
      throw err;
    }
  };

  const handleDeleteQuickTest = async (id) => {
    try {
      setCustomQuickTests(prev => {
        const updated = prev.filter(t => t.id !== id);
        localStorage.setItem('local_custom_quick_tests', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error("Delete quick test error", err);
      throw err;
    }
  };

  // --- Handlers for Practice Tests (Active & History) ---
  const handleSaveTest = async (id, testData) => {
    try {
      let docRef;
      if (id) {
        docRef = doc(db, `users/${user.uid}/practice_tests`, id);
        await updateDoc(docRef, { ...testData, updatedAt: serverTimestamp() });
        return id;
      } else {
        docRef = await addDoc(collection(db, `users/${user.uid}/practice_tests`), {
          ...testData,
          createdAt: serverTimestamp()
        });
        return docRef.id;
      }
    } catch (err) {
      console.error("Save practice test error", err);
      throw err;
    }
  };

  const handleDeleteTest = async (id) => {
    try {
      await deleteDoc(doc(db, `users/${user.uid}/practice_tests`, id));
    } catch (err) {
      console.error("Delete test error", err);
      throw err;
    }
  };

  const handleDeleteAllTests = async () => {
    try {
      const snap = await getDocs(collection(db, `users/${user.uid}/practice_tests`));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (err) {
      console.error("Delete all tests error", err);
      throw err;
    }
  };

  const handleTogglePinTest = async (id, currentPin) => {
    try {
      await updateDoc(doc(db, `users/${user.uid}/practice_tests`, id), {
        isPinned: !currentPin
      });
    } catch (err) {
      console.error("Toggle pin test error", err);
      throw err;
    }
  };

  const handleLogTestResults = async (correctDelta, wordStats) => {
    const tzOffset = (new Date()).getTimezoneOffset() * 60000;
    const localToday = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
    const statRef = doc(db, `users/${user.uid}/daily_stats`, localToday);
    
    try {
      // Get current doc from firebase to merge correctly
      const currentDocSnap = await getDoc(statRef);
      const currentDoc = currentDocSnap.exists() ? currentDocSnap.data() : {};
      
      const currentCount = currentDoc.correctCount || 0;
      const currentWords = currentDoc.words || {};

      const newCount = Math.max(0, currentCount + correctDelta);
      const newWords = { ...currentWords };

      if (wordStats) {
        for (const [wId, stats] of Object.entries(wordStats)) {
          if (!newWords[wId]) newWords[wId] = { correct: 0, incorrect: 0, term: stats.term };
          newWords[wId].correct += stats.correct;
          newWords[wId].incorrect += stats.incorrect;
        }
      }

      await setDoc(statRef, {
        correctCount: newCount,
        words: newWords,
        lastActivity: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Log test results error", err);
    }
  };

  const handleUpdateStatusBatch = async (ids, newStatus, newStage) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.update(doc(db, `users/${user.uid}/words`, id), {
          learningStatus: newStatus,
          learningStage: newStage
        });
      });
      await batch.commit();
    } catch (e) {
      console.error("Batch update status error:", e);
    }
  };

  const handleToggleStarBatch = async (ids, isStarred) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.update(doc(db, `users/${user.uid}/words`, id), {
          isStarred
        });
      });
      await batch.commit();
    } catch (e) {
      console.error("Batch toggle star error:", e);
    }
  };

  return (
    <div className="animate-fade-in">
      <PracticeTestContainer
        ref={containerRef}
        initialConfig={initialConfig}
        words={words}
        customLists={customLists}
        customQuickTests={customQuickTests}
        dailyStats={dailyStats}
        practiceTests={practiceTests}
        stickyNotes={stickyNotes}
        savedOptions={savedOptions}
        onSaveOptions={handleSaveOptions}
        onSaveQuickTest={handleSaveQuickTest}
        onDeleteQuickTest={handleDeleteQuickTest}
        onSaveTest={handleSaveTest}
        onDeleteTest={handleDeleteTest}
        onDeleteAllTests={handleDeleteAllTests}
        onTogglePinTest={handleTogglePinTest}
        onLogTestResults={handleLogTestResults}
        onUpdateStage={handleUpdateStage}
        onUpdateStagesBatch={handleUpdateStagesBatch}
        onToggleStar={handleToggleStar}
        onUpdateStatusBatch={handleUpdateStatusBatch}
        onToggleStarBatch={handleToggleStarBatch}
      />
    </div>
  );
};

export default PracticeMode;
