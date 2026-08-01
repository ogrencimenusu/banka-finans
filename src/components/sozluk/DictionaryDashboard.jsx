import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Form, Button, Dropdown, Badge, Spinner } from 'react-bootstrap';
import { useSozluk } from './context/SozlukContext';
import { useStreak } from './hooks/useStreak';
import { Book, Plus, Hourglass, CheckCircle2, Volume2, Star, Edit, Trash2, Calendar, Search, Filter } from 'lucide-react';
import LearningStageBar from './LearningStageBar';
import WordDetailModal from './WordDetailModal';
import DailyStatsModal from './components/DailyStatsModal';
import BulkActionModal from './BulkActionModal';
import EditWordModal from './EditWordModal';
import { db } from '../../firebase';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, setDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { playAudio } from './utils/audio';

const DictionaryDashboard = ({ navigateTo, initialWordToOpen, clearInitialWord, initialListId, clearInitialListId }) => {
  const { words, customLists, stickyNotes, loading } = useSozluk();
  const { user } = useAuth();
  const { streakCount, isGoalReached, remaining, todayProgress, dailyStats, todayStr } = useStreak();
  
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem('dictionary_searchQuery') || '';
  });
  const [activeLanguageFilter, setActiveLanguageFilter] = useState(() => {
    return localStorage.getItem('activeLanguageFilter') || '';
  });
  const [selectedListFilter, setSelectedListFilter] = useState(() => {
    return localStorage.getItem('dictionary_selectedListFilter') || '';
  });
  const [showOnlyStarred, setShowOnlyStarred] = useState(() => {
    try {
      const saved = localStorage.getItem('showOnlyStarred');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [showDailyStatsModal, setShowDailyStatsModal] = useState(false);
  const [quickStatusFilter, setQuickStatusFilter] = useState(() => {
    return localStorage.getItem('quickStatusFilter') || '';
  });
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedWords, setSelectedWords] = useState([]);
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  
  const [editingWord, setEditingWord] = useState(null);
  const [sortRules, setSortRules] = useState(() => {
    try {
      const saved = localStorage.getItem('dictionary_sortRules');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Infinite scroll
  const [visibleCount, setVisibleCount] = useState(12);
  const observer = useRef(null);
  
  const lastWordElementRef = useCallback(node => {
    if (observer.current) observer.current.disconnect();
    if (node) {
      observer.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + 12);
        }
      }, { rootMargin: '200px' });
      observer.current.observe(node);
    }
  }, []);

  // Reset pagination when search or filters change
  useEffect(() => {
    setVisibleCount(12);
  }, [searchTerm, activeLanguageFilter, selectedListFilter, showOnlyStarred, quickStatusFilter, sortRules]);

  const isRemoteUpdateRef = useRef(false);
  const settingsLoaded = useRef(false);

  // Load settings from Firestore in real-time
  useEffect(() => {
    if (!user) {
      settingsLoaded.current = true;
      return;
    }

    const settingsDocRef = doc(db, 'users', user.uid, 'settings', 'app');
    const unsubscribe = onSnapshot(settingsDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        isRemoteUpdateRef.current = true;

        if (data.sortRules) {
          try { localStorage.setItem('dictionary_sortRules', JSON.stringify(data.sortRules)); } catch(e){}
          setSortRules(prev => JSON.stringify(prev) !== JSON.stringify(data.sortRules) ? data.sortRules : prev);
        }
        if (data.searchQuery !== undefined) {
          try { localStorage.setItem('dictionary_searchQuery', data.searchQuery); } catch(e){}
          setSearchTerm(prev => prev !== data.searchQuery ? data.searchQuery : prev);
        }
        if (data.filterLanguage !== undefined || data.activeLanguageFilter !== undefined) {
          const rawLang = data.filterLanguage !== undefined ? data.filterLanguage : data.activeLanguageFilter;
          const normLang = rawLang === 'all' ? '' : rawLang;
          try { localStorage.setItem('activeLanguageFilter', normLang); } catch(e){}
          setActiveLanguageFilter(prev => prev !== normLang ? normLang : prev);
        }
        if (data.filterStarredOnly !== undefined || data.showOnlyStarred !== undefined) {
          const starredVal = data.filterStarredOnly !== undefined ? data.filterStarredOnly : data.showOnlyStarred;
          try { localStorage.setItem('showOnlyStarred', JSON.stringify(starredVal)); } catch(e){}
          setShowOnlyStarred(prev => prev !== starredVal ? starredVal : prev);
        }
        if (data.filterStatus !== undefined || data.quickStatusFilter !== undefined) {
          const statusVal = data.filterStatus !== undefined ? data.filterStatus : data.quickStatusFilter;
          let normStatus = '';
          const lower = (statusVal || '').toLowerCase();
          if (lower === 'yeni') normStatus = 'Yeni';
          else if (lower === 'ogreniyor' || lower === 'öğreniyor') normStatus = 'Öğreniyor';
          else if (lower === 'ogrendi' || lower === 'öğrendi') normStatus = 'Öğrendi';
          try { localStorage.setItem('quickStatusFilter', normStatus); } catch(e){}
          setQuickStatusFilter(prev => prev !== normStatus ? normStatus : prev);
        }
        if (data.filterListId !== undefined) {
          try { localStorage.setItem('dictionary_selectedListFilter', data.filterListId); } catch(e){}
          setSelectedListFilter(prev => prev !== data.filterListId ? data.filterListId : prev);
        }

        setTimeout(() => {
          isRemoteUpdateRef.current = false;
        }, 500);
      }
      settingsLoaded.current = true;
    }, (err) => {
      console.warn('Dashboard ayarları dinlenemedi:', err);
      settingsLoaded.current = true;
    });

    return () => unsubscribe();
  }, [user]);

  // Save changes to Firestore and localStorage when user updates filters
  useEffect(() => {
    if (user && settingsLoaded.current) {
      try {
        localStorage.setItem('dictionary_searchQuery', searchTerm);
        localStorage.setItem('activeLanguageFilter', activeLanguageFilter);
        localStorage.setItem('dictionary_selectedListFilter', selectedListFilter);
        localStorage.setItem('showOnlyStarred', JSON.stringify(showOnlyStarred));
        localStorage.setItem('quickStatusFilter', quickStatusFilter);
        localStorage.setItem('dictionary_sortRules', JSON.stringify(sortRules));
      } catch (e) {}

      if (isRemoteUpdateRef.current) return;

      const iosStatus = quickStatusFilter === 'Yeni' ? 'yeni' : (quickStatusFilter === 'Öğreniyor' ? 'ogreniyor' : (quickStatusFilter === 'Öğrendi' ? 'ogrendi' : 'all'));
      const payload = {
        sortRules,
        activeLanguageFilter,
        filterLanguage: activeLanguageFilter || 'all',
        showOnlyStarred,
        filterStarredOnly: showOnlyStarred,
        quickStatusFilter,
        filterStatus: iosStatus,
        searchQuery: searchTerm,
        filterListId: selectedListFilter
      };

      setDoc(doc(db, 'users', user.uid, 'settings', 'app'), payload, { merge: true }).catch(() => {});
    }
  }, [searchTerm, activeLanguageFilter, selectedListFilter, showOnlyStarred, quickStatusFilter, sortRules, user]);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedWords(filteredWords.map(w => w.id));
    else setSelectedWords([]);
  };

  const [selectedWord, setSelectedWord] = useState(null);

  useEffect(() => {
    if (initialWordToOpen) {
      setSelectedWord(initialWordToOpen);
      if (clearInitialWord) clearInitialWord();
    }
  }, [initialWordToOpen, clearInitialWord]);

  useEffect(() => {
    if (initialListId) {
      setSelectedListFilter(initialListId);
      if (clearInitialListId) clearInitialListId();
    }
  }, [initialListId, clearInitialListId]);

  const handleAddWordsToList = async (listId, wordIds) => {
    try {
      await updateDoc(doc(db, `users/${user.uid}/customLists`, listId), {
        wordIds: arrayUnion(...wordIds)
      });
      const wordUpdatePromises = wordIds.map(wordId => 
        updateDoc(doc(db, `users/${user.uid}/words`, wordId), {
          listIds: arrayUnion(listId)
        })
      );
      await Promise.all(wordUpdatePromises);
    } catch (error) {
      console.error("Listeye ekleme hatası:", error);
    }
  };

  const handleRemoveWordFromList = async (listId, wordId) => {
    try {
      await updateDoc(doc(db, `users/${user.uid}/customLists`, listId), {
        wordIds: arrayRemove(wordId)
      });
      await updateDoc(doc(db, `users/${user.uid}/words`, wordId), {
        listIds: arrayRemove(listId)
      });
    } catch (error) {
      console.error("Listeden çıkarma hatası:", error);
    }
  };



  const duplicateIds = React.useMemo(() => {
    if (!showDuplicates) return new Set();
    const dups = new Set();
    
    const termMap = new Map();
    words.forEach(w => {
      if (!w.term) return;
      const term = w.term.toLowerCase().trim();
      if (!termMap.has(term)) termMap.set(term, []);
      termMap.get(term).push(w.id);
    });
    
    termMap.forEach(ids => {
      if (ids.length > 1) {
        ids.forEach(id => dups.add(id));
      }
    });
    
    return dups;
  }, [words, showDuplicates]);

  if (loading) {
    return <div className="text-center py-5 text-muted">Kelimeler yükleniyor...</div>;
  }

  // Derived stats
  const totalWords = words.length;
  // A word is "new" if learning stage is 0
  const newWords = words.filter(w => !w.learningStage || w.learningStage === 0).length;
  // Learning if >0 and <10
  const learningWords = words.filter(w => w.learningStage > 0 && w.learningStage < 10).length;
  // Learned if 10
  const learnedWords = words.filter(w => w.learningStage >= 10).length;

  const languageMap = {
    'english': 'İngilizce', 'en': 'İngilizce',
    'german': 'Almanca', 'de': 'Almanca',
    'french': 'Fransızca', 'fr': 'Fransızca',
    'spanish': 'İspanyolca', 'es': 'İspanyolca',
    'italian': 'İtalyanca', 'it': 'İtalyanca',
    'russian': 'Rusça', 'ru': 'Rusça',
    'turkish': 'Türkçe', 'tr': 'Türkçe',
    'japanese': 'Japonca', 'ja': 'Japonca',
    'arabic': 'Arapça', 'ar': 'Arapça'
  };

  const getLanguageLabel = (lang) => {
    if (!lang) return 'Belirtilmemiş';
    const lower = lang.toLowerCase();
    return languageMap[lower] || lang.charAt(0).toUpperCase() + lang.slice(1);
  };

  const getLanguageFlag = (langName) => {
    const lower = (langName || '').toLowerCase();
    if (lower.includes('ing') || lower.includes('eng') || lower === 'en') return '🇬🇧';
    if (lower.includes('ara') || lower === 'ar') return '🇸🇦';
    if (lower.includes('tür') || lower === 'tr') return '🇹🇷';
    if (lower.includes('alm') || lower === 'de') return '🇩🇪';
    if (lower.includes('fra') || lower === 'fr') return '🇫🇷';
    if (lower.includes('isp') || lower === 'es') return '🇪🇸';
    if (lower.includes('rus') || lower === 'ru') return '🇷🇺';
    if (lower.includes('ita') || lower === 'it') return '🇮🇹';
    if (lower.includes('jap') || lower === 'ja') return '🇯🇵';
    return '🌐';
  };

  const uniqueLanguages = [...new Set(words.map(w => w.language).filter(Boolean))].sort();

  const recentWords = words.slice().sort((a, b) => {
    const getMs = (val) => {
      if (!val) return 0;
      if (typeof val.toDate === 'function') return val.toDate().getTime();
      if (typeof val.seconds === 'number') return val.seconds * 1000;
      const d = new Date(val);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };
    const timeA = getMs(a.createdAt);
    const timeB = getMs(b.createdAt);
    if (timeA !== timeB) return timeB - timeA;
    return (a.term || '').localeCompare(b.term || '', 'tr');
  }).slice(0, 5);

  const filteredWords = words.filter(w => {
    const matchesSearch = w.term?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          w.shortMeanings?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLang = activeLanguageFilter ? w.language === activeLanguageFilter : true;
    const matchesStar = showOnlyStarred ? w.isStarred : true;
    const matchesList = selectedListFilter ? (w.listIds || []).includes(selectedListFilter) : true;
    
    if (showDuplicates && !duplicateIds.has(w.id)) return false;

    let matchesStatus = true;
    if (quickStatusFilter === 'Yeni') matchesStatus = !w.learningStage || w.learningStage === 0;
    else if (quickStatusFilter === 'Öğreniyor') matchesStatus = w.learningStage > 0 && w.learningStage < 10;
    else if (quickStatusFilter === 'Öğrendi') matchesStatus = w.learningStage >= 10;

    return matchesSearch && matchesLang && matchesStar && matchesStatus && matchesList;
  });

  if (sortRules.length > 0) {
    filteredWords.sort((a, b) => {
      for (const rule of sortRules) {
        let aVal = a[rule.field];
        let bVal = b[rule.field];

        if (rule.field === 'createdAt') {
          const getMs = (val) => {
            if (!val) return 0;
            if (typeof val.toDate === 'function') return val.toDate().getTime();
            if (typeof val.seconds === 'number') return val.seconds * 1000;
            const d = new Date(val);
            return isNaN(d.getTime()) ? 0 : d.getTime();
          };
          aVal = getMs(aVal);
          bVal = getMs(bVal);
        } else if (rule.field === 'learningStage') {
          aVal = aVal ?? 0;
          bVal = bVal ?? 0;
        } else if (typeof aVal === 'boolean') {
          aVal = aVal ? 1 : 0;
          bVal = bVal ? 1 : 0;
        } else if (typeof aVal === 'string') {
          aVal = (aVal || '').toLowerCase();
          bVal = (bVal || '').toLowerCase();
        }

        if (aVal < bVal) return rule.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return rule.direction === 'asc' ? 1 : -1;
      }
      return (a.term || '').localeCompare(b.term || '', 'tr');
    });
  } else {
    filteredWords.sort((a, b) => {
      const getMs = (val) => {
        if (!val) return 0;
        if (typeof val.toDate === 'function') return val.toDate().getTime();
        if (typeof val.seconds === 'number') return val.seconds * 1000;
        const d = new Date(val);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      const timeA = getMs(a.createdAt);
      const timeB = getMs(b.createdAt);
      if (timeA !== timeB) return timeB - timeA;
      return (a.term || '').localeCompare(b.term || '', 'tr');
    });
  }

  const handleToggleStar = async (e, word) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const targetWord = word || (e && e.id ? e : null);
    if (!targetWord || !targetWord.id) return;
    
    const newStarred = !targetWord.isStarred;

    if (selectedWord && String(selectedWord.id) === String(targetWord.id)) {
      setSelectedWord(prev => prev ? ({ ...prev, isStarred: newStarred }) : null);
    }
    
    try {
      if (user) {
        await updateDoc(doc(db, `users/${user.uid}/words`, targetWord.id), {
          isStarred: newStarred
        });
      }
    } catch (error) {
      console.error("Yıldız güncellenemedi:", error);
    }
  };

  const handleUpdateStatus = async (wordId, newStatus) => {
    if (!wordId) return;
    const stageMap = {
      'Yeni': 0,
      'Öğreniyor': 1,
      'Öğrendi': 10
    };
    const newStage = stageMap[newStatus] ?? 0;

    if (selectedWord && String(selectedWord.id) === String(wordId)) {
      setSelectedWord(prev => prev ? ({ ...prev, learningStatus: newStatus, learningStage: newStage }) : null);
    }

    try {
      if (user) {
        await updateDoc(doc(db, `users/${user.uid}/words`, wordId), {
          learningStatus: newStatus,
          learningStage: newStage
        });
      }
    } catch (error) {
      console.error("Durum güncellenemedi:", error);
    }
  };

  const handleDelete = async (e, wordId) => {
    e.stopPropagation();
    if (window.confirm("Bu kelimeyi silmek istediğinize emin misiniz?")) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/words`, wordId));
        if (selectedWord?.id === wordId) setSelectedWord(null);
      } catch (error) {
        console.error("Silinemedi:", error);
      }
    }
  };

  const handleAddNote = async (wordId, wordTerm, text, title) => {
    if (!user) return;
    try {
      await addDoc(collection(db, `users/${user.uid}/stickyNotes`), {
        wordId,
        wordTerm,
        text,
        title: title || '',
        createdAt: serverTimestamp(),
        selectedWords: []
      });
    } catch (e) {
      console.error("Not eklenemedi:", e);
    }
  };

  const handleUpdateNote = async (noteId, text, title) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/stickyNotes`, noteId), {
        text,
        title: title || ''
      });
    } catch (e) {
      console.error("Not güncellenemedi:", e);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!user) return;
    if (window.confirm("Bu notu silmek istediğinize emin misiniz?")) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/stickyNotes`, noteId));
      } catch (e) {
        console.error("Not silinemedi:", e);
      }
    }
  };

  return (
    <div className="animate-fade-in pb-5">
      {/* Header Area */}
      <div className="glass-card p-4 border-0 mb-4 bg-white shadow-sm position-relative" style={{ borderRadius: '24px' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
          <div>
            <h3 className="fw-bold mb-2">Kelime Hazineni Genişlet</h3>
            <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
              Kişisel sözlüğünde kelimelerini kaydet, öğrenme aşamalarını takip et ve test çözerek bilgilerini pekiştir.
            </p>
          </div>
          
          {/* Streak Badge Design */}
          <div className="flex-shrink-0" style={{ cursor: 'pointer' }} onClick={() => setShowDailyStatsModal(true)}>
            <div 
              className="d-flex align-items-center gap-3 p-2 px-3 rounded-pill border hover-shadow-sm transition-all"
              style={{
                background: isGoalReached 
                  ? 'linear-gradient(135deg, #fff3e0, #ffe0b2)' 
                  : 'rgba(249, 115, 22, 0.05)',
                borderColor: isGoalReached ? '#ffcc80' : 'rgba(249, 115, 22, 0.2)',
                boxShadow: isGoalReached ? '0 4px 12px rgba(249, 115, 22, 0.15)' : 'none',
                transition: 'all 0.3s ease'
              }}
            >
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center bg-white shadow-sm"
                style={{ width: '42px', height: '42px', color: isGoalReached ? '#f97316' : '#9ca3af' }}
              >
                <i className={`bi bi-fire fs-4 ${isGoalReached ? 'text-danger' : ''}`} style={{ filter: isGoalReached ? 'drop-shadow(0 2px 4px rgba(239, 68, 68, 0.4))' : 'none' }}></i>
              </div>
              
              <div className="d-flex flex-column pe-2">
                {isGoalReached ? (
                  <>
                    <span className="fw-bold text-dark" style={{ fontSize: '15px', lineHeight: '1.2' }}>{streakCount} Günlük Seri!</span>
                    <span className="text-muted" style={{ fontSize: '11px', fontWeight: '600' }}>HARİKA GİDİYORSUN</span>
                  </>
                ) : (
                  <>
                    <span className="fw-bold text-dark" style={{ fontSize: '15px', lineHeight: '1.2' }}>
                      {todayProgress} / 100
                    </span>
                    <span className="text-muted" style={{ fontSize: '11px', fontWeight: '600' }}>GÜNLÜK HEDEF</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="bg-white rounded-4 p-3 shadow-sm border d-flex align-items-center gap-3 h-100">
              <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-2 d-flex align-items-center justify-content-center">
                <Book size={20} />
              </div>
              <div>
                <div className="fw-bold h4 mb-0">{totalWords}</div>
                <div className="text-muted" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>TOPLAM KELİME</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="bg-white rounded-4 p-3 shadow-sm border d-flex align-items-center gap-3 h-100">
              <div className="bg-info bg-opacity-10 text-info rounded-circle p-2 d-flex align-items-center justify-content-center">
                <Plus size={20} />
              </div>
              <div>
                <div className="fw-bold h4 mb-0">{newWords}</div>
                <div className="text-muted" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>YENİ KELİMELER</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="bg-white rounded-4 p-3 shadow-sm border d-flex align-items-center gap-3 h-100">
              <div className="bg-warning bg-opacity-10 text-warning rounded-circle p-2 d-flex align-items-center justify-content-center">
                <Hourglass size={20} />
              </div>
              <div>
                <div className="fw-bold h4 mb-0">{learningWords}</div>
                <div className="text-muted" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>ÖĞRENME AŞAMASINDA</div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="bg-white rounded-4 p-3 shadow-sm border d-flex align-items-center gap-3 h-100">
              <div className="bg-success bg-opacity-10 text-success rounded-circle p-2 d-flex align-items-center justify-content-center">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="fw-bold h4 mb-0">{learnedWords}</div>
                <div className="text-muted" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>ÖĞRENİLENLER</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Words Chips */}
        {recentWords.length > 0 && (
          <div>
            <div className="text-muted mb-2" style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em' }}>SON EKLENEN KELİMELER</div>
            <div className="d-flex flex-wrap gap-2">
              {recentWords.map(w => (
                <div key={w.id} className="bg-white border rounded-pill px-3 py-1 shadow-sm text-dark cursor-pointer transition-all hover-bg-light" style={{ fontSize: '12px' }} onClick={() => setSelectedWord(w)}>
                  <span className="fw-bold">{w.term}</span> <span className="text-muted">— {w.shortMeanings?.split(',')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Search & Filter Controls */}
      <div className="d-flex flex-column gap-3 mb-4">
        
        {/* Row 1: Language & Status Tabs */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          
          <div className="d-flex flex-wrap gap-2">
            <button 
              className={`btn rounded-pill d-flex align-items-center gap-2 px-3 py-2 ${!activeLanguageFilter ? 'bg-dark text-white border-0' : 'bg-white border text-dark'}`}
              onClick={() => setActiveLanguageFilter('')}
              style={{ fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}
            >
              🌐 Tüm Diller
              <span className={`badge rounded-pill ${!activeLanguageFilter ? 'bg-white text-dark' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                {words.length}
              </span>
            </button>
            
            {uniqueLanguages.map(lang => {
              const isActive = activeLanguageFilter === lang;
              return (
                <button 
                  key={lang}
                  className={`btn rounded-pill d-flex align-items-center gap-2 px-3 py-2 ${isActive ? 'bg-dark text-white border-0' : 'bg-white border text-dark'}`}
                  onClick={() => setActiveLanguageFilter(lang)}
                  style={{ fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}
                >
                  {getLanguageFlag(lang)} {getLanguageLabel(lang)}
                  <span className={`badge rounded-pill ${isActive ? 'bg-info text-white' : 'bg-info text-white'}`}>
                    {words.filter(w => w.language === lang).length}
                  </span>
                </button>
              );
            })}

            <button 
              className={`btn rounded-pill d-flex align-items-center gap-2 px-3 py-2 ${showOnlyStarred ? 'bg-dark text-white border-0' : 'bg-white border text-dark'}`}
              onClick={() => setShowOnlyStarred(!showOnlyStarred)}
              style={{ fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}
            >
              <Star size={16} fill={showOnlyStarred ? "currentColor" : "none"} className={showOnlyStarred ? 'text-warning' : 'text-warning'} />
              Yıldızlılar
              <span className={`badge rounded-pill ${showOnlyStarred ? 'bg-white text-dark' : 'bg-secondary bg-opacity-10 text-secondary'}`}>
                {words.filter(w => w.isStarred).length}
              </span>
            </button>
          </div>

          <div className="bg-light p-1 rounded-pill d-flex gap-1 overflow-x-auto">
            {['Tümü', 'Yeni', 'Öğreniyor', 'Öğrendi'].map((status) => {
              const isActive = (quickStatusFilter || 'Tümü') === status;
              let activeClass = 'bg-white shadow-sm fw-bold text-dark';
              if (isActive) {
                if (status === 'Yeni') activeClass = 'bg-info text-white shadow-sm fw-bold';
                if (status === 'Öğreniyor') activeClass = 'bg-warning text-dark shadow-sm fw-bold';
                if (status === 'Öğrendi') activeClass = 'bg-success text-white shadow-sm fw-bold';
              }
              return (
                <button
                  key={status}
                  className={`btn btn-sm rounded-pill px-3 py-1 border-0 ${isActive ? activeClass : 'text-muted fw-medium'}`}
                  onClick={() => setQuickStatusFilter(status === 'Tümü' ? '' : status)}
                  style={{ fontSize: '13px', transition: 'all 0.2s' }}
                >
                  {status}
                </button>
              );
            })}
          </div>

        </div>

        {/* Row 2: Secondary Actions & Search */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button 
              className={`btn ${sortRules.length > 0 ? 'bg-dark text-white border-0' : 'bg-white border text-dark'} rounded-pill d-flex align-items-center gap-2 px-3 py-2`} 
              style={{ fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}
              onClick={() => setShowSortModal(true)}
            >
              <i className={`bi bi-sort-down ${sortRules.length > 0 ? 'text-white' : 'text-primary'}`}></i> Sırala
              {sortRules.length > 0 && <span className="badge rounded-pill bg-white text-dark">{sortRules.length}</span>}
            </button>

            {/* Listeler Dropdown (Functional) */}
            {customLists && customLists.length > 0 && (
              <Dropdown>
                <Dropdown.Toggle 
                  variant="light"
                  className={`btn rounded-pill d-flex align-items-center gap-2 px-3 py-2 ${selectedListFilter ? 'bg-dark text-white border-0' : 'bg-white border text-dark'}`}
                  style={{ fontSize: '13px', fontWeight: 600 }}
                >
                  <i className={`bi bi-collection-play-fill ${selectedListFilter ? 'text-white' : 'text-primary'}`}></i> 
                  {selectedListFilter ? customLists.find(l => l.id === selectedListFilter)?.name || 'Liste Seçili' : 'Listeler'}
                </Dropdown.Toggle>
                
                <Dropdown.Menu className="shadow-sm border-0 rounded-4 mt-2">
                  <Dropdown.Item 
                    className={`py-2 small fw-medium ${!selectedListFilter ? 'active bg-primary bg-opacity-10 text-primary' : ''}`}
                    onClick={() => setSelectedListFilter('')}
                  >
                    Tüm Kelimeler
                  </Dropdown.Item>
                  <Dropdown.Divider className="opacity-10" />
                  {customLists.map(list => (
                    <Dropdown.Item 
                      key={list.id}
                      className={`py-2 small d-flex align-items-center justify-content-between ${selectedListFilter === list.id ? 'active bg-primary bg-opacity-10 text-primary fw-bold' : ''}`}
                      onClick={() => setSelectedListFilter(list.id)}
                    >
                      {list.name}
                      {selectedListFilter === list.id && <i className="bi bi-check2 text-primary"></i>}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            )}

            <button 
              className={`btn rounded-pill d-flex align-items-center gap-2 px-3 py-2 ${isSelectionMode ? 'bg-dark text-white border-0' : 'bg-white border text-dark'}`}
              style={{ fontSize: '13px', fontWeight: 600 }}
              onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedWords([]); }}
            >
              <i className="bi bi-check2-square"></i> {isSelectionMode ? 'İptal' : 'Seç'}
            </button>
          </div>
          
          <div className="d-flex align-items-center gap-2" style={{ minWidth: '250px' }}>
            <div className="position-relative flex-grow-1">
              <Search size={16} className="position-absolute top-50 translate-middle-y text-muted" style={{ left: '16px' }} />
              <input 
                type="text" 
                className="form-control rounded-pill border shadow-sm bg-white w-100" 
                placeholder="Kelime veya anlam ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ fontSize: '13px', padding: '0.6rem 1rem 0.6rem 2.5rem' }}
              />
            </div>
            <button 
              className={`btn rounded-circle d-flex align-items-center justify-content-center shadow-sm border ${showDuplicates ? 'btn-primary text-white border-primary' : 'bg-white text-muted'}`}
              style={{ width: '38px', height: '38px', flexShrink: 0, transition: 'all 0.2s' }}
              onClick={() => setShowDuplicates(!showDuplicates)}
              title="Aynı Kelimeleri Göster"
            >
              <i className="bi bi-intersect"></i>
            </button>
          </div>
        </div>

      </div>

      {/* Word Cards Grid */}
      <div className="row g-3">
        {filteredWords.length === 0 ? (
          <div className="text-center text-muted p-5 bg-white rounded shadow-sm">Kayıtlı kelime bulunamadı.</div>
        ) : (
          filteredWords.slice(0, visibleCount).map((word, index) => {
            const isSelected = selectedWords.includes(word.id);
            const displayPron = word.pronunciation?.match(/^(.*?)\s*\(([^)]+)\)$/)?.[2] || word.pronunciation?.replace(/^\/|\/$/g, '').trim() || '';
            const isLastElement = index === filteredWords.slice(0, visibleCount).length - 1;
            
            return (
              <div key={word.id} ref={isLastElement ? lastWordElementRef : null} className="col-12 col-md-6 col-lg-4 col-xl-3">
                <div 
                  className={`bg-white rounded-4 p-3 shadow-sm border h-100 d-flex flex-column cursor-pointer transition-all hover-shadow ${isSelected ? 'border-primary border-2 bg-primary bg-opacity-10' : ''}`}
                  onClick={() => {
                    if (isSelectionMode) {
                      setSelectedWords(prev => 
                        prev.includes(word.id) ? prev.filter(id => id !== word.id) : [...prev, word.id]
                      );
                    } else {
                      setSelectedWord(word);
                    }
                  }}
                  style={{ position: 'relative' }}
                >
                  {/* Selection Checkbox */}
                  {isSelectionMode && (
                    <div className="position-absolute" style={{ top: '10px', left: '10px', zIndex: 10 }}>
                      <Form.Check 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} 
                        style={{ transform: 'scale(1.2)', pointerEvents: 'none' }}
                      />
                    </div>
                  )}

                  {/* Header Row */}
                  <div className="d-flex justify-content-between align-items-start mb-2" style={{ paddingLeft: isSelectionMode ? '25px' : '0' }}>
                    <div className="d-flex align-items-start gap-2">
                      <Star 
                        size={20} 
                        className={word.isStarred ? "text-warning" : "text-muted"} 
                        fill={word.isStarred ? "currentColor" : "none"}
                        onClick={(e) => { e.stopPropagation(); handleToggleStar(e, word); }}
                        style={{ cursor: 'pointer', marginTop: '2px', flexShrink: 0 }}
                      />
                      <div>
                        <h6 className="fw-bold mb-1 text-dark text-capitalize d-flex align-items-center gap-2" style={{ lineHeight: 1.1 }}>
                          {word.term}
                          {stickyNotes && stickyNotes.some(n => n.wordId === word.id || (n.wordTerm && n.wordTerm.toLowerCase() === word.term.toLowerCase()) || (n.selectedWords && n.selectedWords.some(sw => sw.toLowerCase() === word.term.toLowerCase()))) && (
                            <span 
                              className="bg-warning rounded-circle shadow-sm position-absolute" 
                              style={{ width: '10px', height: '10px', top: '12px', right: '12px' }} 
                              title="İlişikli Not Var"
                            ></span>
                          )}
                        </h6>
                        <div 
                          className="d-inline-flex align-items-center gap-1 text-primary opacity-75 hover-opacity-100"
                          onClick={(e) => { e.stopPropagation(); playAudio(word.term); }}
                          style={{ fontSize: '11px', cursor: 'pointer', transition: 'opacity 0.2s' }}
                        >
                          <Volume2 size={12} />
                          {displayPron ? displayPron : 'Dinle'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Add to List Dropdown */}
                    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} className="ms-auto">
                      <Dropdown align="end" className="d-inline-flex">
                        <Dropdown.Toggle
                          variant="link"
                          className="p-1 text-primary opacity-50 hover-opacity-100 transition-all border-0 shadow-none d-flex align-items-center no-caret position-relative"
                          title="Listeye Ekle/Çıkar"
                        >
                          <i className="bi bi-collection-play-fill" style={{ fontSize: '18px' }}></i>
                          {(word.listIds?.length || 0) > 0 && (
                            <Badge 
                              bg="danger" 
                              pill 
                              className="position-absolute top-0 start-100 translate-middle border border-2 border-white"
                              style={{ fontSize: '10px', padding: '0.25em 0.5em', minWidth: '18px' }}
                            >
                              {word.listIds.length}
                            </Badge>
                          )}
                        </Dropdown.Toggle>

                        <Dropdown.Menu 
                          className="shadow-lg border-secondary border-opacity-25 bg-body-tertiary rounded-3" 
                          style={{ minWidth: '220px', maxHeight: '350px', overflowY: 'auto' }}
                        >
                          <Dropdown.Header className="small fw-bold text-primary border-bottom border-opacity-10 mb-1 d-flex justify-content-between align-items-center">
                            <span>Listelere Ekle</span>
                            {(word.listIds?.length || 0) > 0 && <span className="badge bg-primary bg-opacity-10 text-primary fw-normal px-2">{word.listIds.length} Liste</span>}
                          </Dropdown.Header>
                          {customLists && customLists.length > 0 ? (
                            customLists.slice().sort((a,b) => {
                              const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
                              const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
                              if (orderA !== orderB) return orderA - orderB;
                              return new Date(b.createdAt) - new Date(a.createdAt);
                            }).map(list => {
                              const isInList = list.wordIds?.includes(word.id);
                              return (
                                <Dropdown.Item 
                                  key={list.id} 
                                  className={`small d-flex align-items-center justify-content-between gap-2 py-2 ${isInList ? 'bg-primary bg-opacity-10' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isInList) {
                                      handleRemoveWordFromList(list.id, word.id);
                                    } else {
                                      handleAddWordsToList(list.id, [word.id]);
                                    }
                                  }}
                                >
                                  <div className="d-flex align-items-center gap-2">
                                    <i className={`bi ${isInList ? 'bi-collection-play-fill text-primary' : 'bi-collection-play opacity-50'}`}></i> 
                                    <span className={isInList ? 'fw-bold text-primary' : ''}>{list.name}</span>
                                  </div>
                                  {isInList && <i className="bi bi-check2 text-primary fw-bold"></i>}
                                </Dropdown.Item>
                              );
                            })
                          ) : (
                            <Dropdown.Item disabled className="small text-muted py-2 text-center fst-italic">Henüz liste yok</Dropdown.Item>
                          )}
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                  </div>

                  <div className="flex-grow-1 mb-3">
                    {word.meanings && word.meanings.length > 0 ? (
                      <ol className="text-primary ps-3 mb-0" style={{ fontSize: '12px', lineHeight: 1.4 }}>
                        {word.meanings.slice(0, 3).map((m, idx) => (
                          <li key={idx} className="mb-1">{m.definition}</li>
                        ))}
                        {word.meanings.length > 3 && <li>...</li>}
                      </ol>
                    ) : (
                      <div className="text-primary" style={{ fontSize: '12px' }}>{word.shortMeanings}</div>
                    )}
                  </div>

                  <div className="mt-auto">
                    <div className="mb-3">
                      <LearningStageBar stage={word.learningStage} totalStages={10} />
                    </div>
                    
                    <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-3">
                      <div className="d-flex gap-2">
                        <span className={`badge ${!word.learningStage || word.learningStage === 0 ? 'bg-info' : word.learningStage >= 10 ? 'bg-success' : 'bg-warning'} bg-opacity-10 text-${!word.learningStage || word.learningStage === 0 ? 'info' : word.learningStage >= 10 ? 'success' : 'warning'}`}>
                          {!word.learningStage || word.learningStage === 0 ? 'YENİ' : word.learningStage >= 10 ? 'ÖĞRENDİ' : 'ÖĞRENİYOR'}
                        </span>
                      </div>
                      
                      <div className="d-flex gap-1 align-items-center">
                        {word.cefrLevel && (
                          <span className="badge bg-light text-secondary border me-1" style={{ fontSize: '10px' }}>
                            {word.cefrLevel.split(/[(\/\s]/)[0]}
                          </span>
                        )}
                        <button className="btn btn-sm btn-light p-1" onClick={(e) => { e.stopPropagation(); setEditingWord(word); }}>
                          <Edit size={14} className="text-primary" />
                        </button>
                        <button className="btn btn-sm btn-light p-1" onClick={(e) => handleDelete(e, word.id)}>
                          <Trash2 size={14} className="text-danger" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Infinite Scroll Target */}
        {filteredWords.length > visibleCount && (
          <div ref={lastWordElementRef} className="col-12 text-center py-4">
            <Spinner animation="border" size="sm" variant="primary" className="opacity-50" />
            <span className="ms-2 text-muted small">Daha fazla yükleniyor...</span>
          </div>
        )}
      </div>

      {/* Main Container Ends Here */}

      {/* Sort Modal */}
      <Modal show={showSortModal} onHide={() => setShowSortModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold"><i className="bi bi-sort-down text-primary me-2"></i>Sırala</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {sortRules.map((rule, idx) => (
            <div key={idx} className="d-flex gap-2 mb-3 px-3 py-2 bg-body-secondary rounded-3 align-items-center">
              <div className="d-flex flex-column align-items-center justify-content-center me-1" style={{ lineHeight: '0.8' }}>
                <i
                  className={`bi bi-caret-up-fill ${idx > 0 ? 'text-muted' : 'text-muted opacity-25'}`}
                  style={{ fontSize: '16px', cursor: idx > 0 ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (idx > 0) {
                      const newRules = [...sortRules];
                      [newRules[idx - 1], newRules[idx]] = [newRules[idx], newRules[idx - 1]];
                      setSortRules(newRules);
                    }
                  }}
                  onMouseEnter={e => idx > 0 && e.currentTarget.classList.replace('text-muted', 'text-primary')}
                  onMouseLeave={e => idx > 0 && e.currentTarget.classList.replace('text-primary', 'text-muted')}
                ></i>
                <i
                  className={`bi bi-caret-down-fill ${idx < sortRules.length - 1 ? 'text-muted' : 'text-muted opacity-25'}`}
                  style={{ fontSize: '16px', cursor: idx < sortRules.length - 1 ? 'pointer' : 'default' }}
                  onClick={() => {
                    if (idx < sortRules.length - 1) {
                      const newRules = [...sortRules];
                      [newRules[idx + 1], newRules[idx]] = [newRules[idx], newRules[idx + 1]];
                      setSortRules(newRules);
                    }
                  }}
                  onMouseEnter={e => idx < sortRules.length - 1 && e.currentTarget.classList.replace('text-muted', 'text-primary')}
                  onMouseLeave={e => idx < sortRules.length - 1 && e.currentTarget.classList.replace('text-primary', 'text-muted')}
                ></i>
              </div>
              <span className="fw-bold text-muted small" style={{ minWidth: '15px' }}>{idx + 1}.</span>
              <Form.Select
                value={rule.field}
                onChange={(e) => {
                  const newRules = [...sortRules];
                  newRules[idx].field = e.target.value;
                  setSortRules(newRules);
                }}
                className="border-0 shadow-none bg-body"
                size="sm"
              >
                <option value="term">Kelime (A-Z)</option>
                <option value="createdAt">Eklenme Tarihi</option>
                <option value="learningStage">Öğrenme Aşaması</option>
                <option value="isStarred">Yıldızlı Durumu</option>
              </Form.Select>
              <Form.Select
                value={rule.direction}
                onChange={(e) => {
                  const newRules = [...sortRules];
                  newRules[idx].direction = e.target.value;
                  setSortRules(newRules);
                }}
                className="border-0 shadow-none bg-body"
                size="sm"
              >
                <option value="asc">Artan</option>
                <option value="desc">Azalan</option>
              </Form.Select>
              <Button variant="link" className="p-0 text-danger opacity-75" onClick={() => setSortRules(sortRules.filter((_, i) => i !== idx))}>
                <i className="bi bi-x-circle-fill"></i>
              </Button>
            </div>
          ))}
          <Button
            variant="outline-primary"
            size="sm"
            className="w-100 rounded-pill border-dashed"
            onClick={() => setSortRules([...sortRules, { field: 'createdAt', direction: 'desc' }])}
            style={{ borderStyle: 'dashed' }}
          >
            <i className="bi bi-plus me-1"></i> Yeni Kural Ekle
          </Button>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" onClick={() => setSortRules([])}>Temizle</Button>
          <Button variant="primary" size="sm" className="px-4" onClick={() => setShowSortModal(false)}>Uygula</Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Word Modal */}
      <EditWordModal
        show={!!editingWord}
        onHide={() => setEditingWord(null)}
        word={editingWord}
        onSave={() => {
          setEditingWord(null);
        }}
      />

      {/* Detail Modal */}
      {selectedWord && !isSelectionMode && (
        <WordDetailModal
          show={!!selectedWord}
          onHide={() => setSelectedWord(null)}
          word={selectedWord}
          stickyNotes={stickyNotes}
          onDelete={handleDeleteNote} 
          onUpdate={handleUpdateNote} 
          onAddNote={handleAddNote}
          onEdit={(w) => setEditingWord(w)}
          onToggleStar={(e, w) => {
            const wordToToggle = w || e;
            handleToggleStar(e, wordToToggle);
          }}
          onUpdateStatus={handleUpdateStatus}
          allWords={words}
          onNext={() => {
             const idx = filteredWords.findIndex(w => String(w.id) === String(selectedWord.id));
             if (idx >= 0 && idx < filteredWords.length - 1) setSelectedWord(filteredWords[idx + 1]);
          }}
          onPrev={() => {
             const idx = filteredWords.findIndex(w => String(w.id) === String(selectedWord.id));
             if (idx > 0) setSelectedWord(filteredWords[idx - 1]);
          }}
          customLists={customLists}
          onAddWordsToList={handleAddWordsToList}
          onRemoveWordFromList={handleRemoveWordFromList}
          onSpeak={playAudio}
        />
      )}

      {/* Bulk Action Bar - Sticky Dock */}
      {isSelectionMode && (
        <div 
          className="position-fixed bottom-0 start-50 translate-middle-x mb-4 bg-dark text-white rounded-pill px-4 py-3 d-flex align-items-center gap-4 shadow-lg animate-fade-in"
          style={{ width: 'max-content', maxWidth: '90vw', zIndex: 1050 }}
        >
          <div className="d-flex align-items-center gap-2">
            <Form.Check
              type="checkbox"
              id="select-all-main"
              onChange={handleSelectAll}
              checked={filteredWords.length > 0 && selectedWords.length === filteredWords.length}
              style={{ transform: 'scale(1.15)', cursor: 'pointer' }}
            />
            <span className="fw-bold small ms-1">{selectedWords.length} Seçili</span>
          </div>
          
          <div className="vr bg-secondary opacity-50" style={{ height: '20px' }}></div>
          
          <div className="d-flex align-items-center gap-2">
            <button 
              type="button" 
              className="btn btn-sm btn-primary rounded-pill px-4 fw-bold" 
              disabled={selectedWords.length === 0} 
              onClick={() => setShowBulkActionModal(true)}
            >
              İşlem Yap
            </button>
            <button 
              type="button" 
              className="btn btn-sm btn-outline-light rounded-pill px-4 fw-bold border-opacity-25" 
              onClick={() => { setIsSelectionMode(false); setSelectedWords([]); }}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Modal */}
      <BulkActionModal 
        show={showBulkActionModal}
        onHide={() => setShowBulkActionModal(false)}
        selectedWords={selectedWords}
        words={words}
        customLists={customLists}
        onActionComplete={() => {
          setShowBulkActionModal(false);
          setIsSelectionMode(false);
          setSelectedWords([]);
        }}
        onPractice={(config, wordsToPractice) => {
          console.log("Practice config:", config, wordsToPractice);
          if (navigateTo) navigateTo('practice', { config });
        }}
        isSelectionMode={isSelectionMode}
      />

      {/* Daily Stats Modal */}
      <DailyStatsModal
        show={showDailyStatsModal}
        onHide={() => setShowDailyStatsModal(false)}
        dailyStats={dailyStats}
        todayStr={todayStr}
      />
    </div>
  );
};

export default DictionaryDashboard;
