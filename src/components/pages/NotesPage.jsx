import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { db } from '../../firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Tag as TagIcon,
  Search,
  Calendar as CalendarIcon,
  Trash2,
  Edit2,
  Type,
  AlignLeft,
  Settings,
  Filter,
  Check,
  Columns,
  Grid,
  ChevronDown,
  RotateCcw,
  Landmark,
  PieChart,
  Link2,
  CircleDot,
  Banknote,
  List as ListIcon,
  Hash,
  Percent,
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Layers,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Quote,
  Sparkles,
  Flag
} from 'lucide-react';
import { Modal, Button, Form, Badge, Dropdown, Collapse } from 'react-bootstrap';
import './NotesPage.css';

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const TR_DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];



const FILTER_OPERATORS = [
  { label: 'İçeriyor', value: 'contains' },
  { label: 'İçermiyor', value: 'not_contains' },
  { label: 'Eşittir', value: 'equals' },
  { label: 'Eşit Değildir', value: 'not_equals' },
  { label: 'Başlıyor', value: 'starts_with' },
  { label: 'Bitiyor', value: 'ends_with' },
];

const COLORS = [
  { name: 'Gray', bg: '#f1f1ef', text: '#37352f' },
  { name: 'Brown', bg: '#f4eeee', text: '#44331b' },
  { name: 'Orange', bg: '#fbede7', text: '#d9730d' },
  { name: 'Yellow', bg: '#fff9e3', text: '#cb912f' },
  { name: 'Green', bg: '#edf3ec', text: '#448361' },
  { name: 'Blue', bg: '#e7f3f8', text: '#337ea9' },
  { name: 'Purple', bg: '#f5f0f7', text: '#9065b0' },
  { name: 'Pink', bg: '#f9f0f5', text: '#c14c8a' },
  { name: 'Red', bg: '#fdebec', text: '#d44c47' },
];

const getTagStyleByColor = (colorName) => {
  const color = COLORS.find(c => c.name === colorName) || COLORS[0];
  return {
    backgroundColor: color.bg,
    color: color.text,
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
    border: 'none'
  };
};

const parseNum = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = val.toString().trim();
  if (!str) return 0;
  // Handle Turkish format 1.234,56 or 1,234.56
  if (str.includes(',') && str.includes('.')) {
    // If dot comes before comma, it's 1.234,56
    if (str.indexOf('.') < str.indexOf(',')) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }
  }
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
};

const NotesPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('month'); // 'week', 'month', 'year'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [notes, setNotes] = useState([]);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [financeTransactions, setFinanceTransactions] = useState([]);
  const [banks, setBanks] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [quickActionTags, setQuickActionTags] = useState([]);
  const [typeTags, setTypeTags] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryItem, setSummaryItem] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteTags, setNoteTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    quote: false
  });
  const [showSimilarNotes, setShowSimilarNotes] = useState(true);
  const [globalNoteTags, setGlobalNoteTags] = useState([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [highlightedDate, setHighlightedDate] = useState(null);
  const [holidays, setHolidays] = useState([]);
  
  // Refs
  const contentInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const yearScrollTimeoutRef = useRef(null);

  const [headerPortalTarget, setHeaderPortalTarget] = useState(null);
  useEffect(() => {
    setHeaderPortalTarget(document.getElementById('mobile-header-actions'));
  }, []);

  useEffect(() => {
    if (viewMode === 'month' && window.innerWidth < 992) {
      setTimeout(() => {
        const currentMonthIndex = currentDate.getMonth();
        const element = document.getElementById(`month-${currentMonthIndex}`);
        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }, 100);
    }
  }, [viewMode]);


  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const filteredSearchNotes = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return notes.filter(note => 
      (note.title || '').toLowerCase().includes(lowerQuery) || 
      (note.text || '').toLowerCase().includes(lowerQuery)
    ).slice(0, 10); // Limit to 10 results
  }, [searchQuery, notes]);

  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('notes_filters');
    return saved ? JSON.parse(saved) : {
      title: { value: '', op: 'contains' },
      text: { value: '', op: 'contains' },
      tags: [],
      bankId: 'all',
      quickActionId: 'all',
      typeTagId: 'all',
      financeType: 'all',
      stockId: 'all',
      institutionId: 'all'
    };
  });

  const [showFilterBar, setShowFilterBar] = useState(() => {
    const saved = localStorage.getItem('notes_filters');
    if (!saved) return false;
    const f = JSON.parse(saved);
    return f.title.value !== '' || 
           f.text.value !== '' || 
           (f.tags && f.tags.length > 0) || 
           f.bankId !== 'all' || 
           f.quickActionId !== 'all' || 
           f.typeTagId !== 'all' || 
           f.financeType !== 'all' || 
           f.stockId !== 'all' || 
           f.institutionId !== 'all';
  });

  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [activeWeekDayIndex, setActiveWeekDayIndex] = useState(new Date().getDate() - 1);

  const handleMobileSearchClick = () => {
    setShowMobileSearch(!showMobileSearch);
    if (!showMobileSearch) {
      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 100);
    }
  };

  const handleSearchItemClick = (note) => {
    handleEditNote(note);
    setSearchQuery('');
    setShowSearchDropdown(false);
    setShowMobileSearch(false);
  };

  useEffect(() => {
    localStorage.setItem('notes_filters', JSON.stringify(filters));
  }, [filters]);
  const { 
    notes: globalNotes,
    bankTransactions: globalBankTrans,
    financeTransactions: globalFinTrans,
    banks: globalBanks,
    institutions: globalInst,
    stocks: globalStocks,
    quickActionTags: globalQA,
    typeTags: globalTT,
    noteTags: globalNoteTagsContext,
    notesConfig,
    holidays: globalHolidays
  } = useData();

  const [visibilityConfig, setVisibilityConfig] = useState({ notes: true, bank: true, finance: true, holidays: true });

  useEffect(() => {
    if (notesConfig?.visibility) {
      setVisibilityConfig(notesConfig.visibility);
    }
  }, [notesConfig]);

  useEffect(() => {
    if (globalHolidays) {
      setHolidays(globalHolidays);
    }
  }, [globalHolidays]);

  const updateVisibilityConfig = async (newConfig) => {
    const next = { ...visibilityConfig, ...newConfig };
    setVisibilityConfig(next);
    if (user) {
      await updateDoc(doc(db, `users/${user.uid}/config`, 'notesSettings'), {
        visibility: next
      }).catch(async (err) => {
        // If doc doesn't exist, create it
        if (err.code === 'not-found') {
          await setDoc(doc(db, `users/${user.uid}/config`, 'notesSettings'), { visibility: next });
        }
      });
    }
  };


  // Sync contentEditable with noteText
  useEffect(() => {
    if (showModal && contentInputRef.current) {
      if (contentInputRef.current.innerHTML !== noteText) {
        contentInputRef.current.innerHTML = noteText || '';
      }
      checkActiveFormats();
    }
  }, [showModal, editingNote]);

  const [listMode, setListMode] = useState('list');

  useEffect(() => {
    if (notesConfig?.listMode) {
      setListMode(notesConfig.listMode);
    }
  }, [notesConfig]);

  const updateListMode = async (newMode) => {
    setListMode(newMode);
    if (user) {
      await updateDoc(doc(db, `users/${user.uid}/config`, 'notesSettings'), {
        listMode: newMode
      }).catch(async (err) => {
        if (err.code === 'not-found') {
          await setDoc(doc(db, `users/${user.uid}/config`, 'notesSettings'), { listMode: newMode });
        }
      });
    }
  };

  const [expandedStacks, setExpandedStacks] = useState({});

  const toggleStack = (stackId, e) => {
    if (e) e.stopPropagation();
    setExpandedStacks(prev => ({
      ...prev,
      [stackId]: !prev[stackId]
    }));
  };
  const processedFinanceTransactions = useMemo(() => {
    if (!financeTransactions.length) return [];
    
    const sorted = [...financeTransactions].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      const typeScore = (t) => t.type === 'ALIŞ' ? 0 : 1;
      const typeCmp = typeScore(a) - typeScore(b);
      if (typeCmp !== 0) return typeCmp;
      return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
    });

    const buyLots = {};
    const intermediateResults = [];

    sorted.forEach((t) => {
      const q = parseNum(t.quantity);
      const p = parseNum(t.price);
      const tr = parseNum(t.taxRate);
      const sId = t.stockId || 'MISSING_ID';
      const instId = t.institutionId || 'MISSING_INST';
      const storageKey = `${sId}_${instId}`;

      if (t.type === 'ALIŞ') {
        if (!buyLots[storageKey]) buyLots[storageKey] = [];
        const lotIndex = buyLots[storageKey].length;
        const newLot = { originalQty: q, remaining: q, price: p, taxRate: tr, date: t.date };
        buyLots[storageKey].push(newLot);
        
        intermediateResults.push({
          ...t,
          quantity: q, price: p, taxRate: tr,
          _isAlis: true,
          _lotIndex: lotIndex,
          _storageKey: storageKey,
          calculatedTaxDeduction: 0,
          totalBuyAmount: q * p,
          totalSaleAmount: 0,
          totalProfit: 0
        });
      } else {
        let remainingToSell = q;
        let taxDeduction = 0;
        let grossProfit = 0;
        let weightedDaysSum = 0;
        let totalSoldUnits = 0;
        
        const lots = buyLots[storageKey] || [];
        for (const lot of lots) {
          if (remainingToSell <= 0) break;
          if (lot.remaining <= 0) continue;

          const sellAmount = Math.min(lot.remaining, remainingToSell);
          const profit = (p - lot.price) * sellAmount;
          grossProfit += profit;
          if (profit > 0 && lot.taxRate > 0) taxDeduction += Math.round(profit * (lot.taxRate / 100) * 100) / 100;
          
          if (lot.date && t.date) {
            const start = new Date(lot.date);
            const end = new Date(t.date);
            const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
            weightedDaysSum += (diffDays > 0 ? diffDays : 0) * sellAmount;
            totalSoldUnits += sellAmount;
          }

          lot.remaining -= sellAmount;
          remainingToSell -= sellAmount;
        }

        const durationDays = totalSoldUnits > 0 ? Math.round(weightedDaysSum / totalSoldUnits) : 0;
        const totalSaleAmount = q * p;
        const totalProfit = grossProfit - taxDeduction;
        const costBasis = totalSaleAmount - grossProfit;
        const profitPercentage = costBasis > 0 ? (totalProfit / costBasis) * 100 : 0;
        const totalRemainingAfterSale = (buyLots[storageKey] || []).reduce((acc, lot) => acc + lot.remaining, 0);

        intermediateResults.push({
          ...t,
          quantity: q, price: p, taxRate: tr,
          _isAlis: false,
          _storageKey: storageKey,
          calculatedRemaining: totalRemainingAfterSale,
          calculatedTaxDeduction: taxDeduction,
          totalBuyAmount: 0,
          totalSaleAmount: totalSaleAmount,
          costBasis: costBasis,
          grossProfit: grossProfit,
          totalProfit: totalProfit,
          profitPercentage: profitPercentage,
          holdingDurationDays: durationDays > 0 ? durationDays : 0
        });
      }
    });

    return intermediateResults.map(item => {
      if (item._isAlis) {
        const finalLot = buyLots[item._storageKey][item._lotIndex];
        return { ...item, calculatedRemaining: finalLot.remaining };
      }
      return item;
    });
  }, [financeTransactions]);

  const stockBalances = useMemo(() => {
    const balances = {};
    const latestByStorage = {};
    processedFinanceTransactions.forEach(t => {
      const key = `${t.stockId}_${t.institutionId}`;
      latestByStorage[key] = t.calculatedRemaining || 0;
    });

    const finalBalances = {};
    Object.keys(latestByStorage).forEach(key => {
      const [sId] = key.split('_');
      finalBalances[sId] = (finalBalances[sId] || 0) + latestByStorage[key];
    });
    return finalBalances;
  }, [processedFinanceTransactions]);

  useEffect(() => {
    if (location.state?.openNoteId && notes.length > 0) {
      const noteToOpen = notes.find(n => n.id === location.state.openNoteId);
      if (noteToOpen) {
        handleEditNote(noteToOpen);
        // Clear state to prevent re-opening
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, notes]);

  useEffect(() => { setNotes(globalNotes); }, [globalNotes]);
  useEffect(() => { setBankTransactions(globalBankTrans.filter(t => t.deleted !== true).map(t => ({ ...t, type: 'bank' }))); }, [globalBankTrans]);
  useEffect(() => { setFinanceTransactions(globalFinTrans.filter(t => t.deleted !== true).map(t => ({ ...t, type: 'finance' }))); }, [globalFinTrans]);
  useEffect(() => { setBanks(globalBanks); }, [globalBanks]);
  useEffect(() => { setInstitutions(globalInst); }, [globalInst]);
  useEffect(() => { setStocks(globalStocks); }, [globalStocks]);
  useEffect(() => { setQuickActionTags(globalQA); }, [globalQA]);
  useEffect(() => { setTypeTags(globalTT); }, [globalTT]);
  useEffect(() => { setGlobalNoteTags(globalNoteTagsContext || []); }, [globalNoteTagsContext]);


  // All unique tags from all notes for suggestions
  const allTags = useMemo(() => {
    const tags = new Set();
    notes.forEach(note => {
      note.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [notes]);

  const filteredSuggestions = useMemo(() => {
    if (!tagInput.trim()) return [];
    return allTags.filter(tag => 
      tag.toLowerCase().includes(tagInput.toLowerCase()) && 
      !noteTags.includes(tag)
    );
  }, [tagInput, allTags, noteTags]);


  // Filter Logic
  const similarNotes = useMemo(() => {
    if (!noteTitle || noteTitle.trim().length < 1) return [];
    return notes.filter(n => 
      n.id !== editingNote?.id && 
      n.title?.toLowerCase().includes(noteTitle.toLowerCase())
    ).slice(0, 5);
  }, [noteTitle, notes, editingNote]);

  const displayTags = useMemo(() => {
    const combined = [...globalNoteTags];
    allTags.forEach(tagName => {
      if (!combined.find(t => t.name === tagName)) {
        combined.push({ name: tagName, color: 'Blue', isUnmanaged: true });
      }
    });
    return combined.sort((a,b) => a.name.localeCompare(b.name));
  }, [globalNoteTags, allTags]);

  const filteredItems = useMemo(() => {
    const applyFilter = (target, op, val) => {
      if (!val) return true;
      const v = val.toLowerCase();
      const t = target.toLowerCase();
      if (op === 'contains') return t.includes(v);
      if (op === 'not_contains') return !t.includes(v);
      if (op === 'equals') return t === v;
      if (op === 'not_equals') return t !== v;
      if (op === 'starts_with') return t.startsWith(v);
      if (op === 'ends_with') return t.endsWith(v);
      return true;
    };

    const allItems = [
      ...(visibilityConfig.notes ? notes.map(n => ({ ...n, itemType: 'note' })) : []),
      ...(visibilityConfig.bank ? bankTransactions.map(t => ({ ...t, itemType: 'bank' })) : []),
      ...(visibilityConfig.finance ? processedFinanceTransactions.map(t => ({ ...t, itemType: 'finance' })) : []),
      ...(visibilityConfig.holidays ? holidays : [])
    ];

    return allItems.filter(item => {
      const stockName = item.itemType === 'finance' ? (stocks.find(s => s.id === item.stockId)?.name || '') : '';
      const bankName = item.itemType === 'bank' ? (banks.find(b => b.id === item.bankId)?.name || '') : '';
      
      const title = (item.title || item.description || stockName || bankName || '').toLowerCase();
      const text = (item.text || item.description || '').toLowerCase();
      const tags = (item.tags || []).join(' ').toLowerCase();

      // Global Search
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        if (!title.includes(searchLower) && !text.includes(searchLower) && !tags.includes(searchLower)) return false;
      }

      // Advanced Filters
      if (showFilterBar) {
        // General Note Filtering Logic
        if (item.itemType === 'note') {
          const titleMatch = applyFilter(item.title || '', filters.title.op, filters.title.value);
          const textMatch = applyFilter(item.text || '', filters.text.op, filters.text.value);
          const tagMatch = filters.tags.length === 0 || filters.tags.every(t => item.tags?.includes(t));
          if (!titleMatch || !textMatch || !tagMatch) return false;
          
          // Hide notes if specific bank/finance filters are active
          if (filters.bankId !== 'all' || filters.quickActionId !== 'all' || filters.typeTagId !== 'all' || filters.financeType !== 'all' || filters.stockId !== 'all' || filters.institutionId !== 'all') return false;
        }

        // Bank Transaction Filtering Logic
        if (item.itemType === 'bank') {
          const bankMatch = filters.bankId === 'all' || item.bankId === filters.bankId;
          const quickActionMatch = filters.quickActionId === 'all' || (item.quickActions && item.quickActions.includes(filters.quickActionId));
          const typeTagMatch = filters.typeTagId === 'all' || item.type === filters.typeTagId;
          const textMatch = !filters.text.value || (item.description || '').toLowerCase().includes(filters.text.value.toLowerCase());
          if (!bankMatch || !quickActionMatch || !typeTagMatch || !textMatch) return false;
          
          // Skip bank if finance filters are active
          if (filters.financeType !== 'all' || filters.stockId !== 'all' || filters.institutionId !== 'all') return false;
        }

        // Finance Transaction Filtering Logic
        if (item.itemType === 'finance') {
          const typeMatch = filters.financeType === 'all' || item.type === filters.financeType;
          const stockMatch = filters.stockId === 'all' || item.stockId === filters.stockId;
          const institutionMatch = filters.institutionId === 'all' || item.institutionId === filters.institutionId;
          if (!typeMatch || !stockMatch || !institutionMatch) return false;
          
          // Skip finance if bank filters are active
          if (filters.bankId !== 'all' || filters.quickActionId !== 'all' || filters.typeTagId !== 'all') return false;
        }
      }

      return true;
    });
  }, [notes, bankTransactions, processedFinanceTransactions, searchQuery, filters, showFilterBar, visibilityConfig, stocks, banks]);

  // Calendar Helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust to Monday start
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction * 7));
    } else if (viewMode === 'year') {
      newDate.setFullYear(currentDate.getFullYear() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    
    if (viewMode === 'month' && window.innerWidth < 992) {
      setTimeout(() => {
        const currentMonthIndex = today.getMonth();
        const element = document.getElementById(`month-${currentMonthIndex}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else if (viewMode === 'year') {
      setTimeout(() => {
        const element = document.getElementById(`year-section-${today.getFullYear()}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  // Auto-scroll to today in Week View
  useEffect(() => {
    if (viewMode === 'week') {
      const today = new Date();
      if (currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()) {
        const todayIndex = today.getDate() - 1;
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          // Scroll content area
          const contentContainer = document.getElementById('mobile-week-content-scroll');
          const targetCol = document.getElementById(`month-day-col-${todayIndex}`);
          if (contentContainer && targetCol) {
            contentContainer.scrollTo({ left: targetCol.offsetLeft, behavior: 'smooth' });
          }
          
          // Scroll header
          const headerContainer = document.querySelector('.mobile-month-days-header');
          const targetHeader = headerContainer?.children[todayIndex];
          if (headerContainer && targetHeader) {
            headerContainer.scrollTo({ 
              left: targetHeader.offsetLeft - (headerContainer.offsetWidth / 2) + (targetHeader.offsetWidth / 2), 
              behavior: 'smooth' 
            });
          }
        }, 300);
      }
    }
  }, [viewMode, currentDate]);

  // Initial entry scroll for Year View
  useEffect(() => {
    if (viewMode === 'year') {
      const today = new Date();
      setTimeout(() => {
        const element = document.getElementById(`year-section-${today.getFullYear()}`);
        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }, 100);
    }
  }, [viewMode]);

  const formatIdDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const resetForm = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteText('');
    setNoteTags([]);
    setTagInput('');
  };

  const checkActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
      quote: document.queryCommandValue('formatBlock') === 'blockquote'
    });
  };

  const applyFormatting = (type) => {
    const editor = contentInputRef.current;
    if (!editor) return;

    editor.focus();
    
    switch (type) {
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'underline':
        document.execCommand('underline', false, null);
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough', false, null);
        break;
      case 'quote':
        // Toggle blockquote
        const isQuote = document.queryCommandValue('formatBlock') === 'blockquote';
        document.execCommand('formatBlock', false, isQuote ? 'p' : 'blockquote');
        break;
      default:
        return;
    }
    
    checkActiveFormats();
    setNoteText(editor.innerHTML);
  };

  const handleDayClick = (date) => {
    setSelectedDate(date);
    resetForm();
    setShowModal(true);
  };

  const handleEditNote = (note, e) => {
    if (e) e.stopPropagation();
    setSelectedDate(new Date(note.date));
    setEditingNote(note);
    setNoteTitle(note.title || '');
    setNoteText(note.text || '');
    setNoteTags(note.tags || []);
    setShowModal(true);
  };

  const handleShowSummary = (item, e) => {
    if (e) e.stopPropagation();
    setSummaryItem(item);
    setShowSummaryModal(true);
  };

  const handleSaveTagEdit = async (tag, newName, newColor) => {
    if (!user) return;
    
    try {
      if (tag.id) {
        // Update existing managed tag
        await updateDoc(doc(db, `users/${user.uid}/noteTags`, tag.id), {
          name: newName,
          color: newColor,
          updatedAt: serverTimestamp()
        });
        
        // Update all notes if name changed
        if (tag.name !== newName) {
          const notesToUpdate = notes.filter(n => n.tags?.includes(tag.name));
          for (const note of notesToUpdate) {
            const newTags = note.tags.map(t => t === tag.name ? newName : t);
            await updateDoc(doc(db, `users/${user.uid}/notes`, note.id), { tags: newTags });
          }
        }
      } else {
        // Create new management entry for discovered tag
        await addDoc(collection(db, `users/${user.uid}/noteTags`), {
          name: newName,
          color: newColor,
          createdAt: serverTimestamp()
        });
        // If name changed from the original discovered name
        if (tag.name !== newName) {
          const notesToUpdate = notes.filter(n => n.tags?.includes(tag.name));
          for (const note of notesToUpdate) {
            const newTags = note.tags.map(t => t === tag.name ? newName : t);
            await updateDoc(doc(db, `users/${user.uid}/notes`, note.id), { tags: newTags });
          }
        }
      }
      setEditingTag(null);
    } catch (error) {
      console.error("Error updating tag:", error);
    }
  };

  const handleDeleteGlobalTag = async (tagName, tagId) => {
    if (!user || !window.confirm('Bu etiketi silmek istediğinize emin misiniz? Tüm notlardan kaldırılacaktır.')) return;
    
    try {
      // 1. Remove from all notes
      const notesToUpdate = notes.filter(n => n.tags?.includes(tagName));
      for (const note of notesToUpdate) {
        const newTags = note.tags.filter(t => t !== tagName);
        await updateDoc(doc(db, `users/${user.uid}/notes`, note.id), { tags: newTags });
      }

      // 2. Delete tag definition if it exists
      if (tagId) {
        await deleteDoc(doc(db, `users/${user.uid}/noteTags`, tagId));
      }
    } catch (error) {
      console.error("Error deleting tag:", error);
    }
  };

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData('itemId', item.id);
    e.dataTransfer.setData('itemType', item.itemType);
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = async (e, targetDate) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const itemId = e.dataTransfer.getData('itemId');
    const itemType = e.dataTransfer.getData('itemType');
    const newDate = formatIdDate(targetDate);

    if (!user || !itemId || !itemType) return;

    try {
      let collectionName = '';
      if (itemType === 'note') collectionName = 'notes';
      else if (itemType === 'bank') collectionName = 'bankTransactions';
      else if (itemType === 'finance') collectionName = 'financeTransactions';

      if (collectionName) {
        await updateDoc(doc(db, `users/${user.uid}/${collectionName}`, itemId), {
          date: newDate,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error moving item:", error);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (contentInputRef.current) {
        contentInputRef.current.focus();
        // Move cursor to the end for contentEditable
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(contentInputRef.current);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };

  const handleAutoSave = async () => {
    if (!user || !selectedDate) return;
    
    // 1. Prevent saving if empty AND it's a new note
    if (!editingNote && !noteTitle.trim() && !noteText.trim() && noteTags.length === 0) return;

    // 2. Prevent saving if nothing changed compared to existing state
    if (editingNote) {
      const isTitleSame = noteTitle === (editingNote.title || '');
      const isTextSame = noteText === (editingNote.text || '');
      const isTagsSame = JSON.stringify(noteTags) === JSON.stringify(editingNote.tags || []);
      if (isTitleSame && isTextSame && isTagsSame) return;
    }
    
    setIsSaving(true);
    const dateStr = formatIdDate(selectedDate);
    const noteData = {
      title: noteTitle,
      text: noteText,
      tags: noteTags,
      date: dateStr,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingNote?.id) {
        await updateDoc(doc(db, `users/${user.uid}/notes`, editingNote.id), noteData);
        // Update editingNote to reflect new saved state
        setEditingNote(prev => ({ ...prev, ...noteData }));
      } else {
        const docRef = await addDoc(collection(db, `users/${user.uid}/notes`), {
          ...noteData,
          createdAt: serverTimestamp()
        });
        setEditingNote({ id: docRef.id, ...noteData });
      }
      setIsSaving(false);
      setShowSaveIndicator(true);
      setLastSaved(new Date());
      setTimeout(() => setShowSaveIndicator(false), 1500);
    } catch (error) {
      console.error("Error auto-saving note:", error);
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!showModal) return;
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 1500);
    return () => clearTimeout(timer);
  }, [noteTitle, noteText, noteTags]);

  const handleDeleteNote = async (noteId, e) => {
    if (e) e.stopPropagation();
    if (!user) return;
    if (!window.confirm("Bu notu silmek istediğinize emin misiniz?")) return;
    
    try {
      await deleteDoc(doc(db, `users/${user.uid}/notes`, noteId || editingNote?.id));
      if (editingNote) setShowModal(false);
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const addTag = (tag) => {
    const finalTag = (typeof tag === 'string' ? tag : tagInput).trim();
    if (finalTag && !noteTags.includes(finalTag)) {
      setNoteTags([...noteTags, finalTag]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const removeTag = (tag) => {
    setNoteTags(noteTags.filter(t => t !== tag));
  };

  const toggleFilterTag = (tag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag) 
        : [...prev.tags, tag]
    }));
  };

  const resetFilters = () => {
    setFilters({
      title: { value: '', op: 'contains' },
      text: { value: '', op: 'contains' },
      tags: [],
      bankId: 'all',
      quickActionId: 'all',
      typeTagId: 'all',
      financeType: 'all',
      stockId: 'all',
      institutionId: 'all'
    });
  };
  const getGroupedItems = (dayItems, dateStr) => {
    if (listMode === 'list') return dayItems;

    const groups = {};
    dayItems.forEach(item => {
      let key = item.id;
      if (item.itemType === 'bank') key = `bank-${item.bankId}`;
      else if (item.itemType === 'finance') key = `finance-${item.stockId}`;
      else key = `note-${item.id}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    const displayItems = [];
    Object.entries(groups).forEach(([key, items]) => {
      if (items.length > 1 && !expandedStacks[`${dateStr}-${key}`]) {
        displayItems.push({
          id: key,
          itemType: 'stack',
          stackKey: `${dateStr}-${key}`,
          type: items[0].itemType,
          count: items.length,
          items: items,
          mainInfo: items[0]
        });
      } else {
        items.forEach(it => displayItems.push(it));
      }
    });
    return displayItems;
  };

  // Render Views
  const renderMonthView = (targetDate = currentDate) => {
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);

    const days = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, month: month - 1, year: year, currentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month: month, year: year, currentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: month + 1, year: year, currentMonth: false });
    }

    const getWeekNumber = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    return (
      <div className="calendar-grid month-view">
        <div className="calendar-header-row">
          {TR_DAYS.map(day => <div key={day} className="calendar-header-cell">{day}</div>)}
        </div>
        <div className="calendar-days-grid">
          {days.map((d, i) => {
            const dateObj = new Date(d.year, d.month, d.day);
            const dateStr = formatIdDate(dateObj);
            const dayItems = filteredItems.filter(n => n.date === dateStr);
            const displayItems = getGroupedItems(dayItems, dateStr);

            const isToday = formatIdDate(new Date()) === dateStr;

            const isFirstDayOfWeek = i % 7 === 0;
            const weekNumber = getWeekNumber(dateObj);

            return (
              <React.Fragment key={i}>
                <div 
                  className={`calendar-day-cell ${!d.currentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${highlightedDate === dateStr ? 'highlight-day' : ''}`}
                  onClick={() => handleDayClick(dateObj)}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dateObj)}
                >
                  {isFirstDayOfWeek && (
                    <div className="week-number-cell d-lg-none">{weekNumber}</div>
                  )}
                  <div className="day-number">{d.day}</div>
                <div className="day-content">
                  {displayItems.map(item => {
                    if (item.itemType === 'stack') {
                      const bank = item.type === 'bank' ? banks.find(b => b.id === item.mainInfo.bankId) : null;
                      const stock = item.type === 'finance' ? stocks.find(s => s.id === item.mainInfo.stockId) : null;

                      return (
                        <div 
                          key={item.stackKey}
                          className={`day-note-preview stack-item ${item.type === 'bank' ? 'bank-item' : 'finance-item'}`}
                          onClick={(e) => toggleStack(item.stackKey, e)}
                        >
                          {bank?.logo && <img src={bank.logo} alt="" style={{ width: '12px', height: '12px', objectFit: 'contain', marginRight: '4px' }} />}
                          <span className="note-text-snippet fw-bold">
                            {bank?.name || stock?.name || 'Grup'} + {item.count} İşlem
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={item.id} 
                        className={`day-note-preview ${item.itemType === 'bank' ? 'bank-item' : item.itemType === 'finance' ? 'finance-item' : item.itemType === 'holiday' ? 'holiday-item' : ''}`} 
                        draggable={item.itemType !== 'holiday'}
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                          if (item.itemType === 'note') handleEditNote(item, e);
                          else if (item.itemType === 'holiday') return; // Holidays are read-only
                          else handleShowSummary(item, e);
                        }}
                      >
                        {item.itemType === 'holiday' ? (
                          <Flag size={10} className="text-warning" />
                        ) : item.itemType === 'bank' && banks.find(b => b.id === item.bankId)?.logo ? (
                          <img src={banks.find(b => b.id === item.bankId).logo} alt="" style={{ width: '12px', height: '12px', objectFit: 'contain', marginRight: '4px' }} />
                        ) : (
                          <div className="note-text-dot"></div>
                        )}
                        <span className="note-text-snippet fw-bold">
                          {item.itemType === 'finance' && <span className="item-type-badge me-1">{item.type}</span>}
                          {item.itemType === 'finance' 
                            ? (stocks.find(s => s.id === item.stockId)?.name || 'Bilinmeyen Hisse')
                            : (item.title || item.description || 'Başlıksız')
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    
    const monthDays = [];
    for (let i = 1; i <= daysInMonth; i++) {
      monthDays.push(new Date(year, month, i));
    }

    const scrollToMonthDay = (index) => {
      const container = document.getElementById('mobile-week-content-scroll');
      if (container) {
        const target = document.getElementById(`month-day-col-${index}`);
        if (target) {
          container.scrollTo({
            left: target.offsetLeft,
            behavior: 'smooth'
          });
          setActiveWeekDayIndex(index);
        }
      }
    };

    const handleContentScroll = (e) => {
      const container = e.target;
      const isMobile = window.innerWidth < 992;
      const dayWidth = container.offsetWidth / (isMobile ? 2 : 4); 
      const index = Math.round(container.scrollLeft / dayWidth);
      if (index !== activeWeekDayIndex) {
        setActiveWeekDayIndex(index);
        
        // Also scroll header to keep active day centered
        const headerContainer = document.querySelector('.mobile-month-days-header');
        const targetHeader = headerContainer?.children[index];
        if (headerContainer && targetHeader) {
          headerContainer.scrollTo({ 
            left: targetHeader.offsetLeft - (headerContainer.offsetWidth / 2) + (targetHeader.offsetWidth / 2), 
            behavior: 'smooth' 
          });
        }
      }
    };

    return (
      <div className="calendar-grid week-view">
        <div className="calendar-header-row mobile-month-days-header px-1" style={{ overflowX: 'auto', display: 'flex', whiteSpace: 'nowrap' }}>
          {monthDays.map((date, i) => (
            <div 
              key={i} 
              className={`calendar-header-cell cursor-pointer transition-all flex-shrink-0 ${activeWeekDayIndex === i ? 'active-day-highlight' : ''} ${formatIdDate(new Date()) === formatIdDate(date) ? 'today' : ''}`}
              style={{ minWidth: '50px' }}
              onClick={() => scrollToMonthDay(i)}
            >
              <div className="week-day-name" style={{ fontSize: '10px' }}>{TR_DAYS[(date.getDay() + 6) % 7]}</div>
              <div className={`week-day-number ${formatIdDate(new Date()) === formatIdDate(date) ? 'today-pill' : ''} ${activeWeekDayIndex === i ? 'fw-black scale-110' : ''}`}>
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>
        <div className="calendar-week-grid mobile-week-scroll-container" id="mobile-week-content-scroll" onScroll={handleContentScroll}>
          {monthDays.map((date, i) => {
            const dateStr = formatIdDate(date);
            const dayItems = filteredItems.filter(n => n.date === dateStr);
            const displayItems = getGroupedItems(dayItems, dateStr);

            return (
              <div 
                key={i} 
                id={`month-day-col-${i}`}
                className="calendar-week-cell mobile-week-day-col" 
                onClick={() => handleDayClick(date)}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, date)}
              >
                <div className="week-col-mobile-header border-bottom mb-2 pb-1">
                  <span className="fw-bold fs-12 text-muted">{TR_DAYS[(date.getDay() + 6) % 7]}</span>
                  <span className="ms-2 badge bg-light text-dark">{date.getDate()} {TR_MONTHS[date.getMonth()]}</span>
                </div>
                {displayItems.map(item => {
                  if (item.itemType === 'stack') {
                    const bank = item.type === 'bank' ? banks.find(b => b.id === item.mainInfo.bankId) : null;
                    const stock = item.type === 'finance' ? stocks.find(s => s.id === item.mainInfo.stockId) : null;

                    return (
                      <div 
                        key={item.stackKey} 
                        className={`week-note-card glass-card mb-2 stack-card ${item.type === 'bank' ? 'bank-card' : 'finance-card'}`} 
                        onClick={(e) => toggleStack(item.stackKey, e)}
                        style={{ borderLeft: `4px solid ${item.type === 'bank' ? '#dc3545' : '#198754'}`, background: 'rgba(255,255,255,0.8)' }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          {bank?.logo && <img src={bank.logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
                          <div className="fw-bold fs-14 text-dark">
                            {bank?.name || stock?.name || 'Grup'} 
                            <span className="ms-2 badge bg-light text-dark border fs-10">+{item.count} İşlem</span>
                          </div>
                          <ChevronDown size={14} className="ms-auto opacity-50" />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={item.id} 
                      className={`week-note-card glass-card mb-2 ${item.itemType === 'bank' ? 'bank-card' : item.itemType === 'finance' ? 'finance-card' : item.itemType === 'holiday' ? 'holiday-card' : ''}`} 
                      draggable={item.itemType !== 'holiday'}
                      onDragStart={(e) => handleDragStart(e, item)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        if (item.itemType === 'note') handleEditNote(item, e);
                        else if (item.itemType === 'holiday') return; // Holidays are read-only
                        else handleShowSummary(item, e);
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <div className="fw-bold fs-14 text-dark d-flex align-items-center gap-2">
                          {item.itemType === 'holiday' && <Flag size={14} className="text-warning" />}
                          {item.itemType === 'finance' && <Badge bg="success" className="me-1 fs-9">{item.type}</Badge>}
                          {item.itemType === 'bank' && banks.find(b => b.id === item.bankId)?.logo && (
                            <img src={banks.find(b => b.id === item.bankId).logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                          )}
                          {item.itemType === 'finance' 
                            ? (stocks.find(s => s.id === item.stockId)?.name || 'Bilinmeyen Hisse')
                            : (item.title || item.description || 'Başlıksız')
                          }
                        </div>
                        {item.itemType === 'note' && (
                          <div className="d-flex gap-1">
                            <Edit2 size={12} className="text-muted cursor-pointer" />
                            <Trash2 size={12} className="text-danger cursor-pointer" onClick={(e) => handleDeleteNote(item.id, e)} />
                          </div>
                        )}
                      </div>
                      {item.itemType === 'note' && item.tags && (
                        <div className="note-tags mb-2 d-flex flex-wrap gap-1">
                          {item.tags?.map((t, idx) => {
                            const globalTag = globalNoteTags.find(gt => gt.name === t);
                            return (
                              <span key={idx} style={getTagStyleByColor(globalTag?.color || 'Blue')} className="fs-9 py-0.5 px-2 rounded fw-bold shadow-xs border-0 text-uppercase">
                                {t}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <div className="note-text-snippet x-small opacity-75">
                        {item.itemType === 'note' && (item.text || '').replace(/<[^>]*>?/gm, ' ')}
                        {item.itemType === 'bank' && `${item.amount} TL - ${item.description || 'Açıklama yok'}`}
                        {item.itemType === 'finance' && `${item.quantity} Adet x ${item.price} TL`}
                        {item.itemType === 'holiday' && 'Türkiye Cumhuriyeti Resmi Tatili'}
                      </div>
                    </div>
                  );
                })}
                <div className="add-note-hint"><Plus size={16} /> Not Ekle</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const baseYear = currentDate.getFullYear();
    const today = new Date();
    
    // Render a wider range for stability (2 prev, current, 2 next)
    const yearsToRender = [baseYear - 2, baseYear - 1, baseYear, baseYear + 1, baseYear + 2];

    const handleYearScroll = (e) => {
      if (yearScrollTimeoutRef.current) clearTimeout(yearScrollTimeoutRef.current);

      yearScrollTimeoutRef.current = setTimeout(() => {
        const container = e.target;
        const yearElements = container.querySelectorAll('.year-section');
        let mostVisibleYear = baseYear;
        let maxVisibleHeight = 0;

        yearElements.forEach(el => {
          const rect = el.getBoundingClientRect();
          const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
          if (visibleHeight > maxVisibleHeight) {
            maxVisibleHeight = visibleHeight;
            mostVisibleYear = parseInt(el.dataset.year);
          }
        });

        if (mostVisibleYear !== baseYear) {
          // Update internal state without shifting the whole DOM if possible
          // We only update if the year change is significant
          const newDate = new Date(currentDate);
          newDate.setFullYear(mostVisibleYear);
          setCurrentDate(newDate);
        }
      }, 100); // Debounce
    };

    return (
      <div className="year-view-scroll-container" onScroll={handleYearScroll}>
        {yearsToRender.map(year => (
          <div key={year} id={`year-section-${year}`} className="year-section" data-year={year}>
            <div className="year-divider d-flex align-items-center gap-3 px-4 py-5">
              <h2 className="display-4 fw-black mb-0 opacity-100" style={{ fontSize: '64px', letterSpacing: '-2px' }}>{year}</h2>
              <div className="flex-grow-1 border-bottom opacity-10" style={{ height: '2px' }}></div>
            </div>
            <div className="year-view-grid-v2">
              {Array.from({ length: 12 }, (_, i) => i).map(m => {
                const firstDay = getFirstDayOfMonth(year, m);
                const daysInMonth = getDaysInMonth(year, m);
                const days = [];
                for (let i = 0; i < firstDay; i++) days.push(null);
                for (let i = 1; i <= daysInMonth; i++) days.push(i);

                const isCurrentMonth = today.getFullYear() === year && today.getMonth() === m;

                return (
                  <div key={m} className="mini-month-v2" onClick={() => {
                    setCurrentDate(new Date(year, m, 1));
                    setViewMode('month');
                  }}>
                    <h3 className={`mini-month-title-v2 ${isCurrentMonth ? 'text-danger' : ''}`}>
                      {TR_MONTHS[m].substring(0, 3)}
                    </h3>
                    <div className="mini-days-grid-v2">
                      {TR_DAYS.map((day, i) => (
                        <div key={day} className={`mini-day-name-v2 ${i >= 5 ? 'weekend-header' : ''}`}>{day[0]}</div>
                      ))}
                      {days.map((d, i) => {
                        if (d === null) return <div key={i} className="mini-day-v2 empty"></div>;
                        const dateStr = formatIdDate(new Date(year, m, d));
                        const isToday = formatIdDate(today) === dateStr;
                        
                        const dayItems = filteredItems.filter(n => n.date === dateStr);
                        const hasNote = dayItems.some(i => i.itemType === 'note');
                        const hasBank = dayItems.some(i => i.itemType === 'bank' || (i.itemType === 'stack' && i.type === 'bank'));
                        const hasFinance = dayItems.some(i => i.itemType === 'finance' || (i.itemType === 'stack' && i.type === 'finance'));
                        const hasHoliday = dayItems.some(i => i.itemType === 'holiday');

                        return (
                          <div 
                            key={i} 
                            className={`mini-day-v2 ${isToday ? 'today-v2' : ''} ${i % 7 >= 5 ? 'weekend-cell' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentDate(new Date(year, m, d));
                              setViewMode('month');
                              setHighlightedDate(dateStr);
                              setTimeout(() => setHighlightedDate(null), 3000);
                            }}
                          >
                            <span className="mini-day-number-text">{d}</span>
                            <div className="mini-day-indicators">
                              {hasNote && <span className="indicator-dot note-dot"></span>}
                              {hasBank && <span className="indicator-dot bank-dot"></span>}
                              {hasFinance && <span className="indicator-dot finance-dot"></span>}
                              {hasHoliday && <span className="indicator-dot holiday-dot"></span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSettingsMenu = () => (
    <Dropdown.Menu className="glass-card border-0 shadow-lg p-2 settings-dropdown-menu">
      <Dropdown.Item className="rounded d-flex align-items-center justify-content-between py-2 mb-1" onClick={() => setShowFilterBar(!showFilterBar)}>
        <div className="d-flex align-items-center gap-2">
          <Filter size={16} className="text-muted" /> 
          <span className="fw-medium">{showFilterBar ? 'Filtreleri Kapat' : 'Filtreleri Göster'}</span>
        </div>
      </Dropdown.Item>
      
      <div className="dropdown-divider opacity-50 my-2"></div>
      <div className="dropdown-header fs-10 text-uppercase opacity-50 fw-bold px-3 mb-1">Listelenecek İşlemler</div>
      
      <div className="dropdown-item d-flex align-items-center justify-content-between py-2 mb-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); updateVisibilityConfig({ notes: !visibilityConfig.notes }); }}>
        <div className="d-flex align-items-center gap-2">
          <Type size={16} className="text-muted" /> 
          <span className={visibilityConfig.notes ? 'text-dark' : 'text-muted'}>Notlar</span>
        </div>
        {visibilityConfig.notes ? <Eye size={16} className="text-primary" /> : <EyeOff size={16} className="text-muted opacity-50" />}
      </div>

      <div className="dropdown-item d-flex align-items-center justify-content-between py-2 mb-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); updateVisibilityConfig({ bank: !visibilityConfig.bank }); }}>
        <div className="d-flex align-items-center gap-2">
          <Landmark size={16} className="text-muted" /> 
          <span className={visibilityConfig.bank ? 'text-dark' : 'text-muted'}>Banka İşlemleri</span>
        </div>
        {visibilityConfig.bank ? <Eye size={16} className="text-danger" /> : <EyeOff size={16} className="text-muted opacity-50" />}
      </div>

      <div className="dropdown-item d-flex align-items-center justify-content-between py-2 mb-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); updateVisibilityConfig({ finance: !visibilityConfig.finance }); }}>
        <div className="d-flex align-items-center gap-2">
          <TrendingUp size={16} className="text-muted" /> 
          <span className={visibilityConfig.finance ? 'text-dark' : 'text-muted'}>Finans İşlemleri</span>
        </div>
        {visibilityConfig.finance ? <Eye size={16} className="text-success" /> : <EyeOff size={16} className="text-muted opacity-50" />}
      </div>

      <div className="dropdown-item d-flex align-items-center justify-content-between py-2 mb-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); updateVisibilityConfig({ holidays: !visibilityConfig.holidays }); }}>
        <div className="d-flex align-items-center gap-2">
          <Flag size={16} className="text-muted" /> 
          <span className={visibilityConfig.holidays ? 'text-dark' : 'text-muted'}>Resmi Tatiller (TR)</span>
        </div>
        {visibilityConfig.holidays ? <Eye size={16} className="text-warning" /> : <EyeOff size={16} className="text-muted opacity-50" />}
      </div>

      <div className="dropdown-divider opacity-50 my-2"></div>
      <div className="dropdown-header fs-10 text-uppercase opacity-50 fw-bold px-3 mb-1">Listeleme Görünümü</div>

      <Dropdown.Item className="rounded d-flex align-items-center justify-content-between py-2 mb-1" onClick={(e) => { e.stopPropagation(); updateListMode('list'); }}>
        <div className="d-flex align-items-center gap-2">
          <ListIcon size={16} className="text-muted" /> 
          <span className={listMode === 'list' ? 'text-dark fw-bold' : 'text-muted'}>Liste</span>
        </div>
        {listMode === 'list' && <div className="bg-primary rounded-circle" style={{ width: '6px', height: '6px' }}></div>}
      </Dropdown.Item>

      <Dropdown.Item className="rounded d-flex align-items-center justify-content-between py-2" onClick={(e) => { e.stopPropagation(); updateListMode('stack'); }}>
        <div className="d-flex align-items-center gap-2">
          <Layers size={16} className="text-muted" /> 
          <span className={listMode === 'stack' ? 'text-dark fw-bold' : 'text-muted'}>Stack (Grupla)</span>
        </div>
        {listMode === 'stack' && <div className="bg-primary rounded-circle" style={{ width: '6px', height: '6px' }}></div>}
      </Dropdown.Item>

      <div className="dropdown-divider opacity-50 my-2"></div>
      <div className="dropdown-header fs-10 text-uppercase opacity-50 fw-bold px-3 mb-1">Yönetim</div>

      <Dropdown.Item className="rounded d-flex align-items-center justify-content-between py-2 mb-1" onClick={() => setShowTagManager(true)}>
        <div className="d-flex align-items-center gap-2">
          <Hash size={16} className="text-muted" /> 
          <span className="fw-medium">Etiketleri Yönet</span>
        </div>
        <ChevronRight size={14} className="text-muted opacity-50" />
      </Dropdown.Item>
    </Dropdown.Menu>
  );



  return (

    <div className="notes-container animate-fade-in">
      <div className="notes-header glass-card d-none d-lg-flex">
        <div className="header-left">
          <h1 className="current-title fw-bold">
            <span className="d-lg-inline d-none">
              {viewMode === 'year' ? currentDate.getFullYear() : `${TR_MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            </span>
            <span className="d-lg-none d-inline text-primary d-none">
              {viewMode === 'year' ? 'Tüm Yıl' : TR_MONTHS[currentDate.getMonth()]}
            </span>
          </h1>
          <div className="nav-controls d-none d-lg-flex">
            <button className="nav-btn" onClick={() => navigateDate(-1)}><ChevronLeft size={20} /></button>
            <button className="nav-btn today-btn" onClick={goToToday}>Bugün</button>
            <button className="nav-btn" onClick={() => navigateDate(1)}><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="header-center">
          <div className="view-toggle glass-card">
            <button className={`toggle-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => setViewMode('week')}>Hafta</button>
            <button className={`toggle-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>Ay</button>
            <button className={`toggle-btn ${viewMode === 'year' ? 'active' : ''}`} onClick={() => setViewMode('year')}>Yıl</button>
          </div>
        </div>

        <div className="header-right d-none d-lg-flex">
          <div className="search-box glass-card position-relative">
            <Search size={18} className="text-muted" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Notlarda ara..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
            />

            {showSearchDropdown && filteredSearchNotes.length > 0 && (
              <div className="search-dropdown glass-card animate-slide-up">
                <div className="search-dropdown-header">Eşleşen Notlar</div>
                <div className="search-results-list">
                  {filteredSearchNotes.map(note => (
                    <div 
                      key={note.id} 
                      className="search-result-item"
                      onClick={() => handleSearchItemClick(note)}
                    >
                      <div className="result-info">
                        <span className="result-title">{note.title || 'Başlıksız Not'}</span>
                        <span className="result-date">
                          {new Date(note.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-muted opacity-50" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Dropdown align="end">
            <Dropdown.Toggle as="button" className="nav-btn border-0 shadow-none">
              <Settings size={20} />
            </Dropdown.Toggle>
            {renderSettingsMenu()}
          </Dropdown>
        </div>
      </div>

      <Collapse in={showFilterBar}>
        <div>
          <div className="filter-bar glass-card mb-4 animate-slide-down">
            <div className="filter-row gap-4">
              {/* Note Filters Section */}
              <div className="filter-section">
                <div className="filter-group">
                  <label>BAŞLIK</label>
                  <div className="unified-filter-input glass-card">
                    <Dropdown>
                      <Dropdown.Toggle as="button" className="filter-op-toggle border-0 shadow-none">
                        {FILTER_OPERATORS.find(o => o.value === filters.title.op)?.label} <ChevronDown size={10} className="ms-1 opacity-50" />
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="glass-card dropdown-menu notion-dropdown-menu">
                        {FILTER_OPERATORS.map(op => (
                          <Dropdown.Item key={op.value} onClick={() => setFilters(f => ({ ...f, title: { ...f.title, op: op.value } }))}>
                            {op.label}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                    <div className="filter-divider"></div>
                    <input 
                      type="text" 
                      className="filter-input-field" 
                      placeholder="Başlık ara..."
                      value={filters.title.value}
                      onChange={(e) => setFilters(f => ({ ...f, title: { ...f.title, value: e.target.value } }))}
                    />
                  </div>
                </div>

                <div className="filter-group">
                  <label>İÇERİK / AÇIKLAMA</label>
                  <div className="unified-filter-input glass-card">
                    <Dropdown>
                      <Dropdown.Toggle as="button" className="filter-op-toggle border-0 shadow-none">
                        {FILTER_OPERATORS.find(o => o.value === filters.text.op)?.label} <ChevronDown size={10} className="ms-1 opacity-50" />
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="glass-card dropdown-menu notion-dropdown-menu">
                        {FILTER_OPERATORS.map(op => (
                          <Dropdown.Item key={op.value} onClick={() => setFilters(f => ({ ...f, text: { ...f.text, op: op.value } }))}>
                            {op.label}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                    <div className="filter-divider"></div>
                    <input 
                      type="text" 
                      className="filter-input-field" 
                      placeholder="İçerik ara..."
                      value={filters.text.value}
                      onChange={(e) => setFilters(f => ({ ...f, text: { ...f.text, value: e.target.value } }))}
                    />
                  </div>
                </div>
              </div>

              {/* Bank Filters Section */}
              {visibilityConfig.bank && (
                <div className={`filter-section ${visibilityConfig.notes ? 'has-divider' : ''}`}>
                  <div className="filter-group">
                    <label>BANKA</label>
                    <Dropdown>
                      <Dropdown.Toggle as="div" className="custom-filter-dropdown glass-card">
                        {filters.bankId === 'all' ? (
                          <span className="text-muted opacity-75">Tüm Bankalar</span>
                        ) : (
                          <div className="d-flex align-items-center gap-2">
                            <img src={banks.find(b => b.id === filters.bankId)?.logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                            <span className="fw-medium">{banks.find(b => b.id === filters.bankId)?.name}</span>
                          </div>
                        )}
                        <ChevronDown size={12} className="ms-auto opacity-50" />
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="glass-card dropdown-menu notion-dropdown-menu" style={{ minWidth: '220px' }}>
                        <Dropdown.Item onClick={() => setFilters(f => ({ ...f, bankId: 'all' }))}>Tüm Bankalar</Dropdown.Item>
                        <div className="dropdown-divider opacity-50"></div>
                        {[...banks].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)).map(b => (
                          <Dropdown.Item key={b.id} className="d-flex align-items-center gap-2" onClick={() => setFilters(f => ({ ...f, bankId: b.id }))}>
                            {b.logo && <img src={b.logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
                            {b.name}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                  
                  <div className="filter-group">
                    <label>HIZLI İŞLEM</label>
                    <Dropdown>
                      <Dropdown.Toggle as="div" className="custom-filter-dropdown glass-card">
                        {filters.quickActionId === 'all' ? (
                          <span className="text-muted opacity-75">Tümü</span>
                        ) : (
                          <span className="px-2 rounded-pill fs-11 py-0.5" style={getTagStyleByColor(quickActionTags.find(t => t.id === filters.quickActionId)?.color || 'Light Gray')}>
                            {quickActionTags.find(t => t.id === filters.quickActionId)?.name}
                          </span>
                        )}
                        <ChevronDown size={12} className="ms-auto opacity-50" />
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="glass-card dropdown-menu notion-dropdown-menu" style={{ minWidth: '200px' }}>
                        <Dropdown.Item onClick={() => setFilters(f => ({ ...f, quickActionId: 'all' }))}>Tümü</Dropdown.Item>
                        <div className="dropdown-divider opacity-50"></div>
                        {quickActionTags.map(t => (
                          <Dropdown.Item key={t.id} className="d-flex align-items-center gap-2" onClick={() => setFilters(f => ({ ...f, quickActionId: t.id }))}>
                            <span className="px-2 rounded-pill fs-11 py-0.5" style={getTagStyleByColor(t.color || 'Light Gray')}>
                              {t.name}
                            </span>
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>

                  <div className="filter-group">
                    <label>İŞLEM TÜRÜ</label>
                    <Dropdown>
                      <Dropdown.Toggle as="div" className="custom-filter-dropdown glass-card">
                        {filters.typeTagId === 'all' ? (
                          <span className="text-muted opacity-75">Tümü</span>
                        ) : (
                          <span className="px-2 rounded-pill fs-11 py-0.5" style={getTagStyleByColor(typeTags.find(t => t.id === filters.typeTagId)?.color || 'Light Gray')}>
                            {typeTags.find(t => t.id === filters.typeTagId)?.name}
                          </span>
                        )}
                        <ChevronDown size={12} className="ms-auto opacity-50" />
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="glass-card dropdown-menu notion-dropdown-menu" style={{ minWidth: '200px' }}>
                        <Dropdown.Item onClick={() => setFilters(f => ({ ...f, typeTagId: 'all' }))}>Tümü</Dropdown.Item>
                        <div className="dropdown-divider opacity-50"></div>
                        {typeTags.map(t => (
                          <Dropdown.Item key={t.id} className="d-flex align-items-center gap-2" onClick={() => setFilters(f => ({ ...f, typeTagId: t.id }))}>
                            <span className="px-2 rounded-pill fs-11 py-0.5" style={getTagStyleByColor(t.color || 'Light Gray')}>
                              {t.name}
                            </span>
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                </div>
              )}

              {/* Finance Filters Section */}
              {visibilityConfig.finance && (
                <div className="filter-section has-divider">
                  <div className="filter-group">
                    <label>FİNANS TÜRÜ</label>
                    <Dropdown>
                      <Dropdown.Toggle as="div" className="custom-filter-dropdown glass-card">
                        {filters.financeType === 'all' ? (
                          <span className="text-muted opacity-75">Tümü</span>
                        ) : (
                          <span className={`px-2 rounded-pill fs-11 py-0.5 text-white ${filters.financeType === 'ALIŞ' ? 'bg-success' : 'bg-danger'}`}>
                            {filters.financeType}
                          </span>
                        )}
                        <ChevronDown size={12} className="ms-auto opacity-50" />
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="glass-card dropdown-menu notion-dropdown-menu" style={{ minWidth: '140px' }}>
                        <Dropdown.Item onClick={() => setFilters(f => ({ ...f, financeType: 'all' }))}>Tümü</Dropdown.Item>
                        <Dropdown.Item className="d-flex align-items-center gap-2" onClick={() => setFilters(f => ({ ...f, financeType: 'ALIŞ' }))}>
                          <span className="bg-success text-white px-2 rounded-pill fs-10">ALIŞ</span>
                        </Dropdown.Item>
                        <Dropdown.Item className="d-flex align-items-center gap-2" onClick={() => setFilters(f => ({ ...f, financeType: 'SATIŞ' }))}>
                          <span className="bg-danger text-white px-2 rounded-pill fs-10">SATIŞ</span>
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>

                  <div className="filter-group">
                    <label>ARACI KURUM</label>
                    <Dropdown>
                      <Dropdown.Toggle as="div" className="custom-filter-dropdown glass-card">
                        {filters.institutionId === 'all' ? (
                          <span className="text-muted opacity-75">Tümü</span>
                        ) : (
                          <div className="d-flex align-items-center gap-2">
                            <img src={institutions.find(i => i.id === filters.institutionId)?.logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                            <span className="fw-medium">{institutions.find(i => i.id === filters.institutionId)?.name}</span>
                          </div>
                        )}
                        <ChevronDown size={12} className="ms-auto opacity-50" />
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="glass-card shadow-lg border-0 mt-2 p-2 notion-dropdown-menu" style={{ minWidth: '200px' }}>
                        <Dropdown.Item className="rounded py-2 fs-12" onClick={() => setFilters(f => ({ ...f, institutionId: 'all' }))}>Tümü</Dropdown.Item>
                        <div className="dropdown-divider opacity-50"></div>
                        {[...institutions].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)).map(i => (
                          <Dropdown.Item key={i.id} className="rounded py-2 fs-12 d-flex align-items-center gap-2" onClick={() => setFilters(f => ({ ...f, institutionId: i.id }))}>
                            {i.logo && <img src={i.logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
                            {i.name}
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>

                  <div className="filter-group">
                    <label>HİSSE</label>
                    <Dropdown>
                      <Dropdown.Toggle as="div" className="custom-filter-dropdown glass-card">
                        {filters.stockId === 'all' ? (
                          <span className="text-muted opacity-75">Tüm Hisseler</span>
                        ) : (
                          <span className="fw-bold text-primary">{stocks.find(s => s.id === filters.stockId)?.name}</span>
                        )}
                        <ChevronDown size={12} className="ms-auto opacity-50" />
                      </Dropdown.Toggle>
                      <Dropdown.Menu className="glass-card shadow-lg border-0 mt-2 p-2 notion-dropdown-menu" style={{ minWidth: '220px' }}>
                        <Dropdown.Item className="rounded py-2 fs-12" onClick={() => setFilters(f => ({ ...f, stockId: 'all' }))}>Tüm Hisseler</Dropdown.Item>
                        <div className="dropdown-divider opacity-50"></div>
                        
                        {/* Active Stocks (qty > 0) */}
                        <div className="dropdown-header fs-10 text-uppercase opacity-50 fw-bold">Aktif Portföy</div>
                        {stocks.filter(s => stockBalances[s.id] > 0).sort((a, b) => stockBalances[b.id] - stockBalances[a.id]).map(s => (
                          <Dropdown.Item key={s.id} className="rounded py-2 fs-12 d-flex justify-content-between align-items-center" onClick={() => setFilters(f => ({ ...f, stockId: s.id }))}>
                            <span className="fw-bold text-primary">{s.name}</span>
                            <span className="small text-muted">{stockBalances[s.id]} Adet</span>
                          </Dropdown.Item>
                        ))}

                        {/* Inactive Stocks (qty <= 0) */}
                        <div className="dropdown-header fs-10 text-uppercase opacity-50 fw-bold mt-2">Geçmiş Hisseler</div>
                        {stocks.filter(s => !(stockBalances[s.id] > 0)).sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                          <Dropdown.Item key={s.id} className="rounded py-2 fs-12 d-flex justify-content-between align-items-center opacity-75" onClick={() => setFilters(f => ({ ...f, stockId: s.id }))}>
                            <span>{s.name}</span>
                            <span className="small text-muted">0 Adet</span>
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                </div>
              )}

              <div className="filter-actions ms-auto align-self-end pb-1">
                <button className="reset-filter-btn" onClick={resetFilters}>
                  <RotateCcw size={14} /> Temizle
                </button>
              </div>
            </div>

            <div className="filter-row mt-3 pt-3 border-top">
              {/* Tags Filter */}
              <div className="filter-group flex-grow-1">
                <label className="mb-2">NOT ETİKETLERİ</label>
                <div className="filter-tags-scroll">
                  {allTags.map(tag => (
                    <Badge 
                      key={tag} 
                      bg={filters.tags.includes(tag) ? 'primary' : 'light'} 
                      className={`cursor-pointer tag-filter-badge ${filters.tags.includes(tag) ? 'text-white' : 'text-dark border'}`}
                      onClick={() => toggleFilterTag(tag)}
                    >
                      {filters.tags.includes(tag) && <Check size={10} className="me-1" />}
                      {tag}
                    </Badge>
                  ))}
                  {allTags.length === 0 && <span className="text-muted fs-12">Etiket bulunamadı</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Collapse>
      
      <Collapse in={showMobileSearch}>
        <div className="d-lg-none w-100 bg-white border-bottom shadow-sm">
          <div className="d-flex flex-column w-100 px-3 py-3">
            <div className="d-flex align-items-center w-100">
              <Search size={20} className="text-muted me-3" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Notlarda ara..." 
                className="border-0 bg-transparent w-100 fs-16"
                style={{ outline: 'none', border: 'none' }}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
              />
            </div>
            
            {showSearchDropdown && filteredSearchNotes.length > 0 && (
              <div className="mobile-search-results mt-3 animate-slide-up">
                <div className="search-dropdown-header border-top pt-3">Eşleşen Notlar</div>
                <div className="search-results-list">
                  {filteredSearchNotes.map(note => (
                    <div 
                      key={note.id} 
                      className="search-result-item py-3 border-bottom"
                      onClick={() => handleSearchItemClick(note)}
                    >
                      <div className="result-info">
                        <span className="result-title fw-bold">{note.title || 'Başlıksız Not'}</span>
                        <span className="result-date small text-muted">
                          {new Date(note.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-muted" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Collapse>

      <div className="notes-content d-flex flex-column">
        {viewMode === 'month' && (
          <div className="d-lg-none w-100">
            {Array.from({ length: 12 }, (_, i) => {
              const monthDate = new Date(currentDate.getFullYear(), i, 1);
              return (
                <div key={i} className="mobile-month-section" id={`month-${i}`}>
                  <div className="mobile-month-sticky-header px-3 py-2 bg-white bg-opacity-75" style={{ position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)' }}>
                    <h2 className="fw-bold mb-0" style={{ fontSize: '28px' }}>{TR_MONTHS[i]}</h2>
                  </div>
                  {renderMonthView(monthDate)}
                </div>
              );
            })}
          </div>
        )}
        <div className="d-none d-lg-block w-100">
          {viewMode === 'month' && renderMonthView()}
        </div>
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'year' && renderYearView()}
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered className="notion-modal mobile-fullscreen-modal" backdropClassName="notion-modal-backdrop">
        <div className="notes-modal-header-container">
          <div className="modal-title-date">
            <CalendarIcon size={16} className="text-primary flex-shrink-0" />
            <span className="fw-bold fs-15 text-dark text-truncate">
              {selectedDate && `${selectedDate.getDate()} ${TR_MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
            </span>
          </div>
          
          <div className="modal-header-actions">
            <div className={`save-status-pill ${showSaveIndicator ? 'saved' : ''}`}>
              {isSaving ? (
                <div className="spinner-border spinner-border-sm" role="status" style={{ width: '10px', height: '10px', borderWidth: '2px' }}></div>
              ) : showSaveIndicator ? (
                <Check size={12} />
              ) : (
                <Sparkles size={12} className="opacity-50" />
              )}
              <span className="save-indicator-text d-none d-sm-inline">{isSaving ? 'Kaydediliyor...' : showSaveIndicator ? 'Kaydedildi' : 'Otomatik Kayıt'}</span>
            </div>

            {editingNote && (
              <Button variant="link" className="text-danger p-0 d-flex align-items-center justify-content-center opacity-75 hover-opacity-100" onClick={() => handleDeleteNote()} style={{ width: '32px', height: '32px' }}>
                <Trash2 size={18} />
              </Button>
            )}

            <Button variant="link" className="text-muted p-0 d-flex align-items-center justify-content-center" onClick={() => setShowModal(false)} style={{ width: '32px', height: '32px' }}>
              <X size={24} />
            </Button>
          </div>
        </div>
        <Modal.Body className="pt-4">
          <Form.Group className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <Type size={14} className="text-muted" />
              <Form.Label className="text-muted small fw-bold mb-0 uppercase-tracking">BAŞLIK</Form.Label>
            </div>
            <div className="position-relative">
              <Form.Control 
                type="text"
                placeholder="Not başlığı girin..."
                className="notion-title-input border-0 bg-transparent p-0 fs-20 fw-bold w-100"
                value={noteTitle}
                onChange={(e) => {
                  setNoteTitle(e.target.value);
                  setShowSimilarNotes(true);
                }}
                onKeyDown={handleTitleKeyDown}
                autoFocus
              />
              
              {similarNotes.length > 0 && showSimilarNotes && (
                <div className="similar-notes-dropdown glass-card shadow-lg position-absolute w-100 mt-2 z-1000 p-1">
                  <div className="text-muted x-small fw-bold px-3 py-2 opacity-50 border-bottom mb-1">VAROLAN BAŞLIKLAR</div>
                  {similarNotes.map(note => (
                    <div 
                      key={note.id} 
                      className="suggestion-item p-2 px-3 rounded cursor-pointer fs-13 d-flex align-items-center gap-2" 
                      onClick={() => {
                        setNoteTitle(note.title);
                        setNoteTags(note.tags || []);
                        setShowSimilarNotes(false);
                      }}
                    >
                      <Search size={14} className="opacity-50" />
                      <span className="fw-medium">{note.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2 sticky-content-toolbar bg-white py-2 px-1">
              <div className="d-flex align-items-center gap-2">
                <AlignLeft size={14} className="text-muted" />
                <Form.Label className="text-muted small fw-bold mb-0 uppercase-tracking">İÇERİK</Form.Label>
              </div>
              <div className="d-flex align-items-center gap-1 bg-light rounded-pill px-2 py-1 format-toolbar shadow-sm">
                <button type="button" className={`btn btn-link p-1 border-0 shadow-none ${activeFormats.bold ? 'text-primary bg-white shadow-sm scale-110' : 'text-muted hover-text-dark'}`} onClick={() => applyFormatting('bold')} title="Kalın">
                  <Bold size={14} />
                </button>
                <button type="button" className={`btn btn-link p-1 border-0 shadow-none ${activeFormats.italic ? 'text-primary bg-white shadow-sm scale-110' : 'text-muted hover-text-dark'}`} onClick={() => applyFormatting('italic')} title="İtalik">
                  <Italic size={14} />
                </button>
                <button type="button" className={`btn btn-link p-1 border-0 shadow-none ${activeFormats.underline ? 'text-primary bg-white shadow-sm scale-110' : 'text-muted hover-text-dark'}`} onClick={() => applyFormatting('underline')} title="Altı Çizili">
                  <Underline size={14} />
                </button>
                <button type="button" className={`btn btn-link p-1 border-0 shadow-none ${activeFormats.strikethrough ? 'text-primary bg-white shadow-sm scale-110' : 'text-muted hover-text-dark'}`} onClick={() => applyFormatting('strikethrough')} title="Üstü Çizili">
                  <Strikethrough size={14} />
                </button>
                <button type="button" className={`btn btn-link p-1 border-0 shadow-none ${activeFormats.quote ? 'text-primary bg-white shadow-sm scale-110' : 'text-muted hover-text-dark'}`} onClick={() => applyFormatting('quote')} title="Alıntı">
                  <Quote size={14} />
                </button>
              </div>
            </div>
            <div 
              ref={contentInputRef}
              contentEditable={true}
              onInput={(e) => {
                setNoteText(e.currentTarget.innerHTML);
                checkActiveFormats();
              }}
              onKeyUp={checkActiveFormats}
              onMouseUp={checkActiveFormats}
              className="notion-text-input border-0 bg-transparent p-0 fs-15"
              style={{ 
                outline: 'none', 
                minHeight: '180px', 
                overflowY: 'auto',
                cursor: 'text'
              }}
              data-placeholder="Buraya bir şeyler yazın..."
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <div className="d-flex align-items-center gap-2 mb-2">
              <TagIcon size={14} className="text-muted" />
              <Form.Label className="text-muted small fw-bold mb-0 uppercase-tracking">ETİKETLER</Form.Label>
            </div>
            <div className="tags-input-container glass-card p-2 d-flex flex-wrap gap-2 align-items-center position-relative">
              {noteTags.map((tag, idx) => {
                const globalTag = globalNoteTags.find(gt => gt.name === tag);
                return (
                  <span 
                    key={idx} 
                    style={getTagStyleByColor(globalTag?.color || 'Blue')} 
                    className="tag-badge d-flex align-items-center gap-1 py-1 px-2 border-0 animate-fade-in"
                  >
                    {tag}
                    <X size={12} className="cursor-pointer opacity-50 hover-opacity-100" onClick={() => removeTag(tag)} />
                  </span>
                );
              })}
              <div className="flex-grow-1 position-relative">
                <input 
                  type="text" 
                  className="tag-input border-0 bg-transparent w-100"
                  placeholder="Etiket ekle..."
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setShowTagSuggestions(true);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  onFocus={() => setShowTagSuggestions(true)}
                  style={{ outline: 'none', fontSize: '14px' }}
                />
                {showTagSuggestions && filteredSuggestions.length > 0 && (
                  <div className="tag-suggestions-menu glass-card shadow-lg position-absolute w-100 bottom-100 mb-2 p-1 z-1000">
                    {filteredSuggestions.map((tagName, idx) => {
                      const globalTag = globalNoteTags.find(gt => gt.name === tagName);
                      return (
                        <div key={idx} className="suggestion-item p-2 rounded cursor-pointer fs-13" onClick={() => addTag(tagName)}>
                          <span style={getTagStyleByColor(globalTag?.color || 'Blue')} className="px-2 py-0.5 rounded shadow-xs">
                            {tagName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Form.Group>
        </Modal.Body>
      </Modal>

      {/* Summary Modal for Transactions */}
      <Modal show={showSummaryModal} onHide={() => setShowSummaryModal(false)} centered className="notion-modal" backdropClassName="notion-modal-backdrop">
        <Modal.Header className="border-0 pb-0 pt-4 px-4">
          <Modal.Title className="fs-15 fw-bold text-dark d-flex align-items-center gap-2 opacity-75">
            {summaryItem?.itemType === 'bank' ? <Landmark size={16} className="text-danger" /> : <PieChart size={16} className="text-success" />}
            {summaryItem?.date && new Date(summaryItem.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            <span className={`ms-1 badge ${summaryItem?.itemType === 'bank' ? 'bg-danger' : 'bg-success'} bg-opacity-10 ${summaryItem?.itemType === 'bank' ? 'text-danger' : 'text-success'} fs-9 rounded-pill fw-medium`}>
              {summaryItem?.itemType === 'bank' ? 'Banka İşlemi' : 'Finans İşlemi'}
            </span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-4 px-4 pb-4">
          <div className="summary-details">
            {summaryItem?.itemType === 'bank' ? (
              <div className="property-list">
                <div className="property-item d-flex mb-3 py-1 pb-3 border-bottom">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <Landmark size={14} /> Bankalar
                  </div>
                  <div className="property-value d-flex align-items-center gap-2">
                    {banks.find(b => b.id === summaryItem.bankId)?.logo && (
                      <img src={banks.find(b => b.id === summaryItem.bankId).logo} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                    )}
                    <span className="fw-bold fs-16">{banks.find(b => b.id === summaryItem.bankId)?.name || 'Bilinmeyen Banka'}</span>
                  </div>
                </div>

                <div className="property-item d-flex mb-2 py-1">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <CalendarIcon size={14} /> Tarih
                  </div>
                  <div className="property-value fs-14 fw-medium">
                    {summaryItem?.date && new Date(summaryItem.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                <div className="property-item d-flex mb-2 py-1">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <Type size={14} /> İşlem Adı
                  </div>
                  <div className="property-value fs-14">
                    {summaryItem.title || <span className="opacity-25">Boş</span>}
                  </div>
                </div>

                <div className="property-item d-flex mb-2 py-1">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <ListIcon size={14} /> Hızlı İşlemler
                  </div>
                  <div className="property-value d-flex flex-wrap gap-1">
                    {summaryItem.quickActions && summaryItem.quickActions.length > 0 ? (
                      summaryItem.quickActions.map((tagId, idx) => {
                        const tag = quickActionTags.find(t => t.id === tagId);
                        return (
                          <span key={idx} style={getTagStyleByColor(tag?.color || 'Gray')}>
                            {tag ? tag.name : tagId}
                          </span>
                        );
                      })
                    ) : (
                      <span className="opacity-25">Boş</span>
                    )}
                  </div>
                </div>

                <div className="property-item d-flex mb-2 py-1">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <CircleDot size={14} /> İşlem Türü
                  </div>
                  <div className="property-value">
                    {(() => {
                      const tagId = summaryItem.typeId || summaryItem.type;
                      const tag = typeTags.find(t => t.id === tagId);
                      return (
                        <span style={getTagStyleByColor(tag?.color || (summaryItem.type === 'gider' ? 'Red' : 'Green'))}>
                          {tag ? tag.name : (summaryItem.typeName || summaryItem.type)}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="property-item d-flex mb-2 py-1">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <Banknote size={14} /> Tutar
                  </div>
                  <div className={`property-value fw-bold fs-15 ${summaryItem.type === 'gider' ? 'text-danger' : 'text-success'}`}>
                    {parseNum(summaryItem.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                  </div>
                </div>

                <div className="property-item d-flex mb-2 py-1">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <Link2 size={14} /> Dekont
                  </div>
                  <div className="property-value">
                    {summaryItem.receiptUrl ? (
                      <a href={summaryItem.receiptUrl} target="_blank" rel="noreferrer" className="text-primary text-decoration-none d-flex align-items-center gap-1 fs-13">
                        Dekontu Görüntüle <ChevronRight size={12} />
                      </a>
                    ) : (
                      <span className="opacity-25">Boş</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="property-list">
                <div className="property-item d-flex mb-3 py-1 pb-3 border-bottom">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <PieChart size={14} /> Hisse
                  </div>
                  <div className="property-value d-flex align-items-center gap-2">
                    <span className="fw-bold fs-16 text-primary">{stocks.find(s => s.id === summaryItem?.stockId)?.name || 'Bilinmeyen Varlık'}</span>
                  </div>
                </div>

                <div className="property-item d-flex mb-2 py-1">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <CalendarIcon size={14} /> Tarih
                  </div>
                  <div className="property-value fs-14 fw-medium">
                    {summaryItem?.date && new Date(summaryItem.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                <div className="property-item d-flex mb-2 py-1">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <Landmark size={14} /> Aracı Kurum
                  </div>
                  <div className="property-value fs-14">
                    {institutions.find(i => i.id === summaryItem?.institutionId)?.name || 'Bilinmeyen Kurum'}
                  </div>
                </div>

                <div className="property-item d-flex mb-2 py-1">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <CircleDot size={14} /> İşlem Türü
                  </div>
                  <div className="property-value">
                    <span style={getTagStyleByColor(summaryItem?.type === 'ALIŞ' ? 'Green' : 'Red')}>
                      {summaryItem?.type}
                    </span>
                  </div>
                </div>

                <div className="property-item d-flex mb-2 py-1">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <Hash size={14} /> Adet
                  </div>
                  <div className="property-value fw-bold fs-14">
                    {new Intl.NumberFormat('tr-TR').format(parseNum(summaryItem?.quantity))}
                  </div>
                </div>

                <div className="property-item d-flex mb-2 py-1">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <Banknote size={14} /> Fiyat
                  </div>
                  <div className="property-value fs-14">
                    {parseNum(summaryItem?.price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} TL
                  </div>
                </div>

                <div className="property-item d-flex mb-2 py-1">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <Percent size={14} /> % Stopaj (%)
                  </div>
                  <div className="property-value fs-14">
                    %{parseNum(summaryItem?.taxRate).toString().replace('.', ',')}
                  </div>
                </div>

                {summaryItem?.type === 'ALIŞ' && (
                  <div className="property-item d-flex mb-2 py-1">
                    <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                      <ListIcon size={14} /> Kalan Adet
                    </div>
                    <div className="property-value">
                      <Badge bg={parseNum(summaryItem?.calculatedRemaining) === 0 ? "secondary" : "info"} className="rounded-pill px-2">
                        {parseNum(summaryItem?.calculatedRemaining)}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="property-item d-flex mb-2 py-1 border-top mt-3 pt-3">
                  <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                    <Activity size={14} /> {summaryItem?.type === 'ALIŞ' ? 'Toplam Alış' : 'Toplam Satış'}
                  </div>
                  <div className={`property-value fw-bold fs-15 text-dark`}>
                    {(() => {
                      const qty = parseNum(summaryItem?.quantity);
                      const prc = parseNum(summaryItem?.price);
                      const total = summaryItem?.type === 'ALIŞ' 
                        ? (summaryItem?.totalBuyAmount || (qty * prc)) 
                        : (summaryItem?.totalSaleAmount || (qty * prc));
                      return parseNum(total).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
                    })()} TL
                  </div>
                </div>

                {summaryItem?.type === 'SATIŞ' && (
                  <>
                    <div className="property-item d-flex mb-2 py-1">
                      <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                        <TrendingUp size={14} className={parseNum(summaryItem?.grossProfit) > 0 ? 'text-success' : 'text-danger'} /> Brüt Kazanç
                      </div>
                      <div className={`property-value fw-bold fs-14 ${parseNum(summaryItem?.grossProfit) > 0 ? 'text-success' : 'text-danger'}`}>
                        {parseNum(summaryItem?.grossProfit).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                        <span className="ms-1 small opacity-75">
                          (%{parseNum(summaryItem?.costBasis) > 0 ? (parseNum(summaryItem.grossProfit) / parseNum(summaryItem.costBasis) * 100).toFixed(2) : '0,00'})
                        </span>
                      </div>
                    </div>

                    <div className="property-item d-flex mb-2 py-1">
                      <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                        <TrendingDown size={14} className="text-danger" /> Stopaj Kesintisi
                      </div>
                      <div className="property-value text-danger fw-bold fs-14">
                        {parseNum(summaryItem?.taxDeduction || summaryItem?.calculatedTaxDeduction).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                      </div>
                    </div>

                    <div className="property-item d-flex mb-2 py-1">
                      <div className="property-label text-muted d-flex align-items-center gap-2 fs-13" style={{ width: '140px' }}>
                        <TrendingUp size={14} className={parseNum(summaryItem?.totalProfit) > 0 ? 'text-success' : 'text-danger'} /> Net Kazanç
                      </div>
                      <div className={`property-value fw-bold fs-14 ${parseNum(summaryItem?.totalProfit) > 0 ? 'text-success' : 'text-danger'}`}>
                        {parseNum(summaryItem?.totalProfit).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                        <span className="ms-1 small opacity-75">
                          ({summaryItem?.holdingDurationDays || 0} gün, %{parseNum(summaryItem?.profitPercentage).toFixed(2)})
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 pb-4 px-4">
          <Button variant="light" className="rounded-pill w-100 py-2 fs-13 fw-bold" onClick={() => setShowSummaryModal(false)}>Kapat</Button>
        </Modal.Footer>
      </Modal>

      {/* Tag Manager Modal */}
      <Modal show={showTagManager} onHide={() => setShowTagManager(false)} centered className="notion-modal">
        <Modal.Header className="border-0 pb-0 pt-4 px-4 d-flex align-items-center justify-content-between">
          <Modal.Title className="fs-15 fw-bold text-dark d-flex align-items-center gap-2">
            <Hash size={18} className="text-primary" /> Etiket Yönetimi
          </Modal.Title>
          <Button variant="light" className="rounded-pill px-3 py-1 fs-12 fw-medium border-0" onClick={() => setShowTagManager(false)}>Kapat</Button>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="tag-list">
            {displayTags.length === 0 ? (
              <div className="text-center py-5 opacity-50">
                <Hash size={40} className="mb-2" />
                <p className="small">Henüz etiket bulunamadı.</p>
              </div>
            ) : (
              displayTags.map(tag => {
                const isEditing = editingTag && (editingTag.id ? editingTag.id === tag.id : editingTag.name === tag.name);
                
                if (isEditing) {
                  return (
                    <div key={tag.id || tag.name} className="p-3 rounded bg-light mb-2 animate-fade-in shadow-sm border border-primary border-opacity-10">
                      <div className="d-flex align-items-center gap-2 mb-3">
                        <Form.Control 
                          type="text" 
                          size="sm"
                          className="notion-title-input fs-13 fw-bold flex-grow-1 border-0" 
                          style={getTagStyleByColor(editingTag.color)}
                          value={editingTag.name} 
                          onChange={(e) => setEditingTag({...editingTag, name: e.target.value})}
                          autoFocus
                        />
                        <div className="d-flex gap-1">
                          <Button variant="primary" size="sm" className="rounded-pill p-1" onClick={() => handleSaveTagEdit(tag, editingTag.name, editingTag.color)}>
                            <Check size={14} />
                          </Button>
                          <Button variant="light" size="sm" className="rounded-pill p-1" onClick={() => setEditingTag(null)}>
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {COLORS.map(color => (
                          <div 
                            key={color.name}
                            className={`color-swatch rounded-circle cursor-pointer transition-all ${editingTag.color === color.name ? 'scale-125 shadow-sm ring-2 ring-primary ring-offset-2' : 'hover-scale-110 opacity-70 hover-opacity-100'}`}
                            style={{ width: '18px', height: '18px', backgroundColor: color.bg, border: '1px solid rgba(0,0,0,0.1)' }}
                            onClick={() => setEditingTag({...editingTag, color: color.name})}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={tag.id || tag.name} className="d-flex align-items-center justify-content-between p-2 px-3 rounded hover-bg-light mb-1 group transition-all">
                    <span style={getTagStyleByColor(tag.color)} className="shadow-xs border-0">{tag.name}</span>
                    <div className="d-flex gap-1 transition-all">
                      <Button variant="link" className="p-1 text-muted hover-text-primary opacity-50 hover-opacity-100" onClick={() => setEditingTag({...tag})}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="link" className="p-1 text-muted hover-text-danger opacity-50 hover-opacity-100" onClick={() => handleDeleteGlobalTag(tag.name, tag.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Modal.Body>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .notes-container { padding: 20px; height: calc(100vh - 80px); display: flex; flex-direction: column; gap: 20px; position: relative; }
        .notes-header { display: flex; align-items: center; justify-content: space-between; padding: 15px 25px; border-radius: 20px; position: relative; z-index: 1000; }
        .header-left { display: flex; align-items: center; gap: 30px; }
        .current-title { font-size: 24px; margin: 0; min-width: 200px; }
        .nav-controls { display: flex; align-items: center; gap: 10px; }
        .nav-btn { background: rgba(0,0,0,0.05); border: none; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; color: var(--text-main); }
        [data-theme="dark"] .nav-btn { background: rgba(255,255,255,0.05); }
        .nav-btn:hover { background: rgba(0,0,0,0.1); transform: scale(1.05); }
        .today-btn { width: auto; padding: 0 15px; font-weight: 600; font-size: 14px; }
        .view-toggle { display: flex; padding: 4px; border-radius: 12px; background: rgba(0,0,0,0.05); }
        [data-theme="dark"] .view-toggle { background: rgba(255,255,255,0.05); }
        .toggle-btn { border: none; background: transparent; padding: 6px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; color: var(--text-muted); transition: all 0.2s; }
        .toggle-btn.active { background: var(--primary-color); color: white; box-shadow: 0 4px 12px rgba(62, 100, 255, 0.3); }
        .header-right { display: flex; align-items: center; gap: 10px; }
        .search-box { display: flex; align-items: center; gap: 10px; padding: 8px 15px; border-radius: 12px; width: 250px; background: rgba(0,0,0,0.03); }
        .search-box input { border: none; background: transparent; width: 100%; font-size: 14px; outline: none; color: var(--text-main); }
        
        /* Filter Bar Styles */
        .filter-bar { padding: 15px 25px; border-radius: 20px; position: relative; z-index: 999; }
        .filter-row { display: flex; align-items: flex-start; gap: 25px; flex-wrap: wrap; }
        .filter-group { display: flex; flex-direction: column; gap: 5px; }
        .filter-group label { font-size: 9px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.1em; margin-bottom: 4px; }
        .unified-filter-input { display: flex; align-items: center; background: rgba(0,0,0,0.03) !important; border-radius: 10px; padding: 2px; transition: all 0.2s; border: 1px solid transparent; }
        .unified-filter-input:focus-within { background: rgba(0,0,0,0.05) !important; border-color: var(--primary-color); box-shadow: 0 0 0 4px rgba(62, 100, 255, 0.1); }
        .filter-op-toggle { background: transparent; border: none; padding: 4px 12px; font-size: 11px; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 6px; white-space: nowrap; min-width: 90px; }
        .filter-divider { width: 1px; height: 16px; background: rgba(0,0,0,0.1); }
        .filter-input-field { background: transparent; border: none; padding: 6px 12px; font-size: 13px; outline: none; width: 150px; color: var(--text-main); }
        .filter-tags-scroll { display: flex; flex-wrap: wrap; gap: 6px; max-height: 80px; overflow-y: auto; padding: 2px; }
        .tag-filter-badge { padding: 5px 10px; font-size: 11px; border-radius: 8px; transition: all 0.2s; }
        .tag-filter-badge:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
        .reset-filter-btn { background: transparent; border: none; color: var(--text-muted); font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 5px; padding: 8px 15px; border-radius: 10px; transition: all 0.2s; }
        .reset-filter-btn:hover { background: rgba(0,0,0,0.05); color: var(--text-main); }

        .notes-content { flex-grow: 1; overflow: hidden; display: flex; z-index: 1; }
        .calendar-grid { width: 100%; display: flex; flex-direction: column; background: var(--glass-bg); backdrop-filter: blur(12px); border: 1px solid var(--glass-border); border-radius: 20px; height: 100%; }
        .calendar-header-row {
          grid-template-columns: repeat(7, 1fr) !important;
          display: grid !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          border-bottom: 1px solid rgba(0,0,0,0.05) !important;
        }
        .calendar-header-cell { padding: 12px; text-align: center; font-weight: 600; font-size: 13px; text-transform: uppercase; color: var(--text-muted); border-right: 1px solid var(--glass-border); }
        .calendar-header-cell:last-child { border-right: none; }
        .calendar-days-grid {
          grid-template-columns: repeat(7, 1fr) !important;
          display: grid !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .calendar-day-cell {
          position: relative !important;
          min-height: 80px !important;
          border: none !important;
          border-bottom: 1px solid rgba(0, 0, 0, 0.03) !important;
          padding: 4px !important;
          background: white !important;
          box-sizing: border-box !important;
        }
        [data-theme="dark"] .calendar-day-cell { border-right: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); }
        .calendar-day-cell:nth-child(7n) { border-right: none; }
        .calendar-day-cell:hover { background: rgba(62, 100, 255, 0.03); }
        .calendar-day-cell.other-month { opacity: 0.4; }
        .week-number-cell {
          position: absolute !important;
          left: 2px !important;
          top: 2px !important;
          font-size: 8px !important;
          color: #bbb !important;
          z-index: 5;
          background: rgba(255,255,255,0.8);
          padding: 0 2px;
          border-radius: 4px;
          pointer-events: none;
        }
        .main-content.collapsed {
          padding-left: 0 !important;
          padding-right: 0 !important;
          padding-bottom: 0 !important;
        }
        .day-number { font-weight: 600; font-size: 14px; margin-bottom: 5px; }
        .calendar-day-cell.today .day-number { color: var(--primary-color); background: rgba(62, 100, 255, 0.1); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin-top: -4px; margin-left: -4px; }
        .day-content { flex-grow: 1; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
        .day-content::-webkit-scrollbar { display: none; }
        .day-note-preview { display: flex; align-items: center; gap: 8px; padding: 0 10px; height: 25px; border-radius: 6px; margin-bottom: 4px; background: rgba(62, 100, 255, 0.05); transition: all 0.2s; border: 1px solid transparent; flex-shrink: 0; }
        .day-note-preview:hover { background: rgba(62, 100, 255, 0.1); border-color: rgba(62, 100, 255, 0.1); }
        .day-note-preview.bank-item { background: rgba(255, 77, 77, 0.1); }
        .day-note-preview.bank-item .note-text-dot { background: #ff4d4d; }
        .day-note-preview.finance-item { background: rgba(40, 167, 69, 0.1); }
        .day-note-preview.finance-item .note-text-dot { background: #28a745; }
        .item-type-badge { font-size: 8px; text-transform: uppercase; padding: 1px 4px; border-radius: 3px; background: rgba(0,0,0,0.05); }
        
        .week-note-card.bank-card { border-left-color: #ff4d4d !important; background: rgba(255, 77, 77, 0.05); }
        .week-note-card.finance-card { border-left-color: #28a745 !important; background: rgba(40, 167, 69, 0.05); }
        .fs-9 { font-size: 9px !important; }

        .note-text-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--primary-color); flex-shrink: 0; }
        .note-text-snippet { font-size: 11px; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4; }
        .week-view .calendar-header-cell { padding: 20px 10px; display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .week-day-name { font-size: 12px; }
        .week-day-number { font-size: 20px; font-weight: 700; color: var(--text-main); }
        .week-day-number.today { color: white; background: var(--primary-color); width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
        .calendar-week-grid { display: grid; grid-template-columns: repeat(7, 1fr); flex-grow: 1; }
        .calendar-week-cell { padding: 15px; border-right: 1px solid rgba(0,0,0,0.08); position: relative; overflow-y: auto; }
        [data-theme="dark"] .calendar-week-cell { border-right: 1px solid rgba(255,255,255,0.1); }
        .calendar-week-cell:last-child { border-right: none; }
        .week-note-card { padding: 12px; border-radius: 12px; background: rgba(62, 100, 255, 0.05); border-left: 4px solid var(--primary-color) !important; transition: transform 0.2s; }
        .week-note-card:hover { transform: scale(1.02); background: rgba(62, 100, 255, 0.08); }
        .note-tag-pill { font-size: 9px; padding: 2px 6px; background: var(--primary-color); color: white; border-radius: 4px; margin-right: 4px; text-transform: uppercase; font-weight: 700; }
        .add-note-hint { display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 12px; color: var(--text-muted); opacity: 0; transition: opacity 0.2s; height: 40px; margin-top: auto; }
        .calendar-week-cell:hover .add-note-hint { opacity: 1; }
        .year-view-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; width: 100%; overflow-y: auto; padding-right: 10px; }
        .mini-month { padding: 15px; cursor: pointer; transition: all 0.2s; }
        .mini-month:hover { transform: translateY(-5px); background: rgba(62, 100, 255, 0.05); }
        .mini-month-title { font-weight: 700; margin-bottom: 10px; color: var(--primary-color); }
        .mini-days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .mini-day-header { font-size: 9px; font-weight: 700; text-align: center; color: var(--text-muted); padding-bottom: 4px; }
        .mini-day { font-size: 10px; text-align: center; padding: 4px 0; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 32px; transition: all 0.2s; border: 1px solid rgba(0,0,0,0.05); position: relative; }
        .mini-day-number { font-weight: 600; line-height: 1; }
        .mini-day-count { font-size: 8px; font-weight: 800; opacity: 0.7; position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.05); padding: 0 3px; border-radius: 3px; line-height: 1.2; }
        .mini-day.today { background: var(--primary-color); color: white; }
        .mini-day.today .mini-day-count { background: rgba(255,255,255,0.2); color: white; }
        .btn-close-custom { background: transparent; border: none; color: var(--text-muted); transition: color 0.2s; }
        .btn-close-custom:hover { color: var(--text-main); }
        .tag-badge { font-size: 12px; border-radius: 6px; }
        .tags-input-container { min-height: 45px; border-radius: 12px; }
        .tag-suggestions-menu { background: var(--glass-bg); backdrop-filter: blur(20px); border: 1px solid var(--glass-border); border-radius: 10px; max-height: 150px; overflow-y: auto; }
        .suggestion-item:hover { background: var(--primary-color); color: white; }
        .fs-20 { font-size: 20px !important; }
        .fs-15 { font-size: 15px !important; }
        .fs-13 { font-size: 13px !important; }
        .fs-9 { font-size: 9px !important; }
        .py-1-5 { padding-top: 0.4rem !important; padding-bottom: 0.4rem !important; }
        .hover-bg-danger:hover { background-color: #dc3545 !important; color: white !important; }
        .hover-opacity-100:hover { opacity: 1 !important; }
        .uppercase-tracking { text-transform: uppercase; letter-spacing: 0.1em; font-size: 9px !important; opacity: 0.6; }
        .mobile-month-title h2 { font-size: 32px !important; color: #000; }
        .calendar-grid {
          width: 100% !important;
          display: block !important;
          clear: both;
        }

        /* Fullscreen Modal on Mobile */
        @media (max-width: 991px) {
          .mobile-fullscreen-modal .modal-dialog {
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100% !important;
          }
          
          .mobile-fullscreen-modal .modal-content {
            height: 100% !important;
            border-radius: 0 !important;
            border: none !important;
            display: flex;
            flex-direction: column;
            padding-top: 56px !important;
          }

          .mobile-fullscreen-modal .modal-body {
            flex: 1;
            overflow-y: auto;
            padding-bottom: 40px;
          }

          .notes-modal-header {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            flex-wrap: nowrap !important;
            padding: 12px 16px !important;
          }
          
          .notes-modal-header-container {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            flex-wrap: nowrap !important;
            padding: 12px 16px !important;
            background: white !important;
            position: sticky !important;
            top: 0 !important;
            z-index: 1050 !important;
            width: 100% !important;
            border-bottom: 1px solid #eee !important;
          }

          .modal-title-date {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            min-width: 0 !important;
            flex: 1 1 auto !important;
          }
          
          .modal-title-date span {
            font-size: 14px !important;
            font-weight: bold !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .modal-header-actions {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 8px !important;
            flex-shrink: 0 !important;
          }

          .save-status-pill {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            padding: 4px 10px !important;
            border-radius: 20px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            background-color: #f8f9fa !important;
            color: #6c757d !important;
            height: 32px !important;
            white-space: nowrap !important;
          }

          .save-status-pill.saved {
            background-color: #28a745 !important;
            color: white !important;
          }

          .sticky-content-toolbar {
            position: sticky !important;
            top: -24px !important; /* Adjust for Modal.Body padding-top */
            z-index: 1000 !important;
            border-bottom: 1px solid #f0f0f0 !important;
            margin-top: -16px !important;
            padding-top: 16px !important;
          }
        }

        .notion-title-input:focus, .notion-text-input:focus { box-shadow: none !important; }
        .notion-modal .modal-content { border: none; }
        @media (max-width: 1200px) { .year-view-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 991px) { .year-view-grid { grid-template-columns: repeat(2, 1fr); } .header-right { display: none; } .header-left { gap: 15px; } .current-title { font-size: 18px; min-width: 150px; } }
        @media (max-width: 576px) { .year-view-grid { grid-template-columns: 1fr; } .nav-controls .today-btn { display: none; } .calendar-header-cell { font-size: 11px; padding: 8px; } }
        .calendar-day.drag-over { background: rgba(var(--bs-primary-rgb), 0.05); border: 2px dashed rgba(var(--bs-primary-rgb), 0.2); }
        .calendar-item { cursor: grab; transition: transform 0.1s; }
        .calendar-item:active { cursor: grabbing; transform: scale(0.98); }

        /* Dark Mode Refinements */
        [data-theme="dark"] .notion-modal .modal-content { 
          background: #141414 !important; 
          border: 1px solid rgba(255,255,255,0.08) !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7) !important;
        }
        [data-theme="dark"] .notion-title-input { color: #ffffff !important; }
        [data-theme="dark"] .notion-text-input { 
          background: rgba(255,255,255,0.02) !important; 
          color: #e0e0e0 !important;
          border: 1px solid rgba(255,255,255,0.05) !important;
        }
        [data-theme="dark"] .glass-card { 
          background: rgba(30,30,30,0.4) !important; 
          border-color: rgba(255,255,255,0.08) !important; 
        }
        [data-theme="dark"] .format-toolbar { 
          background: rgba(40,40,40,0.8) !important; 
          border: 1px solid rgba(255,255,255,0.1) !important;
          backdrop-filter: blur(10px);
        }
        [data-theme="dark"] .format-btn { color: rgba(255,255,255,0.6); }
        [data-theme="dark"] .format-btn:hover { background: rgba(255,255,255,0.05); color: #fff; }
        [data-theme="dark"] .format-btn.active { background: rgba(62, 100, 255, 0.2); color: #4dabff; }
        [data-theme="dark"] .uppercase-tracking { color: rgba(255,255,255,0.4) !important; }
        [data-theme="dark"] .btn-light { background: rgba(255,255,255,0.05); border: none; color: #ccc; }
        [data-theme="dark"] .btn-light:hover { background: rgba(255,255,255,0.1); color: #fff; }
        [data-theme="dark"] .tags-input-container { background: rgba(255,255,255,0.02) !important; border: 1px solid rgba(255,255,255,0.05) !important; }
        [data-theme="dark"] .tags-input-container input { color: #ffffff !important; }
        [data-theme="dark"] .notion-dropdown-menu { background: #1a1a1a !important; border-color: rgba(255,255,255,0.1) !important; }

        /* Year View Dark Mode */
        [data-theme="dark"] .mini-month { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); }
        [data-theme="dark"] .mini-day { border: 1px solid rgba(255,255,255,0.08); }
        [data-theme="dark"] .mini-month-title { color: #ffffff !important; }
        [data-theme="dark"] .mini-day-number { color: #ffffff !important; opacity: 0.9; }
        [data-theme="dark"] .mini-day.today .mini-day-number { color: #ffffff !important; opacity: 1; }
        [data-theme="dark"] .mini-day-count { background: rgba(255,255,255,0.15); color: #ffffff; opacity: 1; }

          /* Global Horizontal Month View (Previously Week View) */
          .mobile-week-scroll-container {
            display: flex !important;
            flex-direction: row !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            scroll-snap-type: x mandatory !important;
            -webkit-overflow-scrolling: touch !important;
            width: 100% !important;
            padding: 0 !important;
            gap: 0 !important;
          }

          .mobile-week-day-col {
            min-width: 50% !important;
            max-width: 50% !important;
            flex: 0 0 50% !important;
            scroll-snap-align: start !important;
            border-right: 1px solid #eee !important;
            height: calc(100vh - 160px) !important;
            overflow-y: auto !important;
            padding: 12px !important;
            background: white !important;
          }

          @media (min-width: 992px) {
            .mobile-week-day-col {
              min-width: 25% !important;
              max-width: 25% !important;
              flex: 0 0 25% !important;
            }
          }

          .mobile-week-header, .mobile-month-days-header {
            display: flex !important;
            justify-content: flex-start !important;
            background: #f8f9fa !important;
            border-bottom: 1px solid #eee !important;
            position: sticky !important;
            top: 0 !important;
            z-index: 20 !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }

          .mobile-month-days-header::-webkit-scrollbar {
            display: none;
          }

          .week-day-number.today-pill {
            background: #007bff !important;
            color: white !important;
            border-radius: 50% !important;
            width: 28px !important;
            height: 28px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .week-col-mobile-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
          }

          .active-day-highlight {
            transform: translateY(-2px) !important;
            border-bottom: 3px solid #007bff !important;
            opacity: 1 !important;
          }
          
          .year-view-scroll-container {
            height: calc(100vh - 120px) !important;
            overflow-y: auto !important;
            padding-bottom: 100px !important;
          }

          .year-section {
            margin-bottom: 60px !important;
          }

          .year-divider h2 {
            font-family: 'Inter', sans-serif !important;
            color: #000 !important;
            margin-bottom: 0 !important;
          }

          .year-view-grid-v2 {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 24px !important;
            padding: 20px !important;
            background: white !important;
          }

          .mini-month-v2 {
            cursor: pointer !important;
            padding: 10px !important;
          }

          .mini-month-title-v2 {
            font-size: 24px !important;
            font-weight: 800 !important;
            margin-bottom: 12px !important;
            color: #000 !important;
          }

          .mini-days-grid-v2 {
            display: grid !important;
            grid-template-columns: repeat(7, 1fr) !important;
            gap: 2px !important;
          }

          .mini-day-name-v2 {
            font-size: 8px !important;
            font-weight: bold !important;
            color: #ccc !important;
            text-align: center !important;
            padding-bottom: 4px !important;
            text-transform: uppercase !important;
          }

          .mini-day-name-v2.weekend-header {
            color: #ff4d4d !important;
            opacity: 0.7;
          }

          .mini-day-v2.weekend-cell {
            background-color: #f5f5f5 !important;
            color: #888 !important;
          }

          .mini-day-v2 {
            position: relative !important;
            font-size: 11px !important;
            text-align: center !important;
            padding: 2px 0 6px 0 !important;
            color: #333 !important;
            border-radius: 8px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            min-height: 28px !important;
          }

          .mini-day-indicators {
            display: flex !important;
            gap: 1.5px !important;
            margin-top: 1px !important;
            height: 3px !important;
          }

          .indicator-dot {
            width: 3px !important;
            height: 3px !important;
            border-radius: 50% !important;
          }

          .note-dot { background-color: #007bff !important; }
          .bank-dot { background-color: #dc3545 !important; }
          .finance-dot { background-color: #198754 !important; }
          .holiday-dot { background-color: #ffc107 !important; }

          .mini-day-v2.today-v2 {
            background-color: #ff4d4d !important;
            color: white !important;
            font-weight: bold !important;
          }
          
          .mini-day-v2.today-v2 .mini-day-indicators .indicator-dot {
            background-color: white !important;
            opacity: 0.8;
          }

          .mini-day-number-text {
            line-height: 1 !important;
            margin-bottom: 2px !important;
          }

          .mini-day-v2.empty {
            visibility: hidden !important;
          }

          @media (max-width: 768px) {
            .year-view-grid-v2 {
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 8px !important;
              padding: 10px 5px !important;
            }
            .mini-month-title-v2 {
              font-size: 14px !important;
              margin-bottom: 4px !important;
            }
            .mini-day-v2 {
              font-size: 7.5px !important;
              padding: 2px 0 !important;
            }
            .mini-month-v2 {
              padding: 5px !important;
            }
          }
          
          .active-day-highlight .week-day-number {
            color: #007bff !important;
            font-weight: 800 !important;
          }

          .highlight-day { background: rgba(255, 77, 77, 0.2) !important; transition: background 0.3s ease; z-index: 10; }

          .bg-success { background-color: #28a745 !important; }
          .transition-all { transition: all 0.3s ease; }
        `}} />
      {headerPortalTarget && createPortal(
        <div className="d-flex align-items-center gap-1">
          <div className="d-flex align-items-center gap-1">
            <span className="fw-bold text-danger fs-14">{currentDate.getFullYear()}</span>
          </div>

          <div className="d-flex align-items-center bg-light rounded-3 px-1">
            <button 
              className={`nav-btn p-0 border-0 bg-transparent ${viewMode === 'week' ? 'text-primary' : 'text-muted opacity-50'}`} 
              onClick={() => setViewMode('week')}
              style={{ width: '28px' }}
            >
              <Columns size={15} />
            </button>
            <button 
              className={`nav-btn p-0 border-0 bg-transparent ${viewMode === 'month' ? 'text-primary' : 'text-muted opacity-50'}`} 
              onClick={() => setViewMode('month')}
              style={{ width: '28px' }}
            >
              <CalendarIcon size={15} />
            </button>
            <button 
              className={`nav-btn p-0 border-0 bg-transparent ${viewMode === 'year' ? 'text-primary' : 'text-muted opacity-50'}`} 
              onClick={() => setViewMode('year')}
              style={{ width: '28px' }}
            >
              <Layers size={15} />
            </button>
          </div>

          <div className="d-flex align-items-center bg-light rounded-3 px-1" style={{ scale: '0.85' }}>
            <button className="nav-btn today-btn p-0 border-0 bg-transparent fs-10 fw-bold" onClick={goToToday} style={{ width: 'auto', padding: '0 8px' }}>BUGÜN</button>
          </div>

          <button className="nav-btn p-0 border-0 bg-transparent shadow-none ms-auto" onClick={handleMobileSearchClick} style={{ width: '32px' }}>
            <Search size={18} className="text-muted" />
          </button>
          <button className="nav-btn p-0 border-0 bg-transparent shadow-none" onClick={() => handleDayClick(new Date())} style={{ width: '32px' }}>
            <Plus size={20} className="text-muted" />
          </button>
          <Dropdown align="end">
            <Dropdown.Toggle as="button" className="nav-btn p-0 border-0 bg-transparent shadow-none no-caret" style={{ width: '32px' }}>
              <Settings size={18} className="text-muted" />
            </Dropdown.Toggle>
            {renderSettingsMenu()}
          </Dropdown>
        </div>,
        headerPortalTarget
      )}
    </div>
  );
};

export default NotesPage;
