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
  ExternalLink,
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
  Flag,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Pilcrow,
  Undo,
  Redo,
  ArrowUp,
  ArrowDown,
  Calendar,
  WrapText,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  Repeat,
  XCircle,
  Scissors,
  CalendarOff,
  Clipboard,
  Copy,
  CheckCheck
} from 'lucide-react';
import { Modal, Button, Form, Badge, Dropdown, Collapse, Table, Card } from 'react-bootstrap';
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

const DATE_OPERATORS = [
  { label: 'Eşittir', value: 'equals' },
  { label: 'Başlangıç', value: 'after' },
  { label: 'Bitiş', value: 'before' },
  { label: 'Arasında', value: 'between' },
  { label: 'Boş', value: 'is_empty' },
  { label: 'Dolu', value: 'is_not_empty' },
];

const DATE_FORMATS = [
  { id: 'full', label: '01/12/2026', format: 'DD/MM/YYYY' },
  { id: 'dots', label: '01.12.2026', format: 'DD.MM.YYYY' },
  { id: 'words', label: '01 Ocak 2026', format: 'DD MMMM YYYY' },
  { id: 'short', label: '01 Oca 2026', format: 'DD MMM YYYY' },
];

const COLORS = [
  { name: 'Gray', bg: 'var(--tag-gray-bg, #f1f1ef)', text: 'var(--tag-gray-text, #37352f)' },
  { name: 'Brown', bg: 'var(--tag-brown-bg, #f4eeee)', text: 'var(--tag-brown-text, #44331b)' },
  { name: 'Orange', bg: 'var(--tag-orange-bg, #fbede7)', text: 'var(--tag-orange-text, #d9730d)' },
  { name: 'Yellow', bg: 'var(--tag-yellow-bg, #fff9e3)', text: 'var(--tag-yellow-text, #cb912f)' },
  { name: 'Green', bg: 'var(--tag-green-bg, #edf3ec)', text: 'var(--tag-green-text, #448361)' },
  { name: 'Blue', bg: 'var(--tag-blue-bg, #e7f3f8)', text: 'var(--tag-blue-text, #337ea9)' },
  { name: 'Purple', bg: 'var(--tag-purple-bg, #f5f0f7)', text: 'var(--tag-purple-text, #9065b0)' },
  { name: 'Pink', bg: 'var(--tag-pink-bg, #f9f0f5)', text: 'var(--tag-pink-text, #c14c8a)' },
  { name: 'Red', bg: 'var(--tag-red-bg, #fdebec)', text: 'var(--tag-red-text, #d44c47)' },
];

const getTagStyleByColor = (colorName) => {
  const color = COLORS.find(c => c.name === colorName) || COLORS[0];
  return {
    backgroundColor: color.bg,
    color: color.text,
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
    border: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
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

const NOTE_COLORS = {
  red: '#ff4d4d',
  green: '#2ecc71',
  yellow: '#f1c40f',
  blue: '#3498db'
};

const NotesPage = () => {
  const formatDisplayDate = (dateStr, formatId = 'dots') => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    
    switch (formatId) {
      case 'full': return `${d}/${m}/${y}`;
      case 'dots': return `${d}.${m}.${y}`;
      case 'words': return `${parseInt(d)} ${TR_MONTHS[date.getMonth()]} ${y}`;
      case 'short': return `${parseInt(d)} ${TR_MONTHS[date.getMonth()].substring(0, 3)} ${y}`;
      default: return `${d}.${m}.${y}`;
    }
  };

  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState(null); // 'week', 'month', 'year', 'list'
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Note List View Configuration
  const [noteConfig, setNoteConfig] = useState({
    propertyOrder: ['date', 'title', 'tags'],
    propertyLabels: { date: 'Tarih', title: 'Başlık', tags: 'Etiketler' },
    propertyVisibility: { date: true, title: true, tags: true },
    sortConfig: { propId: 'date', direction: 'desc' },
    dateFormat: 'dots',
    filters: []
  });

  const NOTE_PROPERTIES = [
    { id: 'date', label: 'Tarih', icon: <Calendar size={14} /> },
    { id: 'title', label: 'Başlık', icon: <Type size={14} /> },
    { id: 'tags', label: 'Etiketler', icon: <TagIcon size={14} /> }
  ];

  const [selectedNoteIds, setSelectedNoteIds] = useState([]);
  const [noteEditingCell, setNoteEditingCell] = useState(null);
  const [noteListLimit, setNoteListLimit] = useState(10);
  const [isInfiniteNoteScroll, setIsInfiniteNoteScroll] = useState(false);
  const [stagedNoteChanges, setStagedNoteChanges] = useState({});
  const [noteActionHistory, setNoteActionHistory] = useState([]);
  const [isBulkNoteProcessing, setIsBulkNoteProcessing] = useState(false);
  const [bulkNoteProgress, setBulkNoteProgress] = useState(0);
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
  const [noteColor, setNoteColor] = useState('blue');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    quote: false,
    h1: false,
    h2: false,
    h3: false,
    p: false,
    ul: false,
    ol: false
  });
  const [floatingToolbar, setFloatingToolbar] = useState({ show: false, x: 0, y: 0 });
  const [linkEditor, setLinkEditor] = useState({ show: false, text: '', url: '', range: null, element: null });
  const [linkPopup, setLinkPopup] = useState({ show: false, x: 0, y: 0, url: '', element: null });
  const [showSimilarNotes, setShowSimilarNotes] = useState(false);
  const [globalNoteTags, setGlobalNoteTags] = useState([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [highlightedDate, setHighlightedDate] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const isSavingRef = useRef(false);
  
  const [showFarFuture, setShowFarFuture] = useState(false);
  const [showDateFormatSubmenu, setShowDateFormatSubmenu] = useState(false);
  const [showVisibilitySubmenu, setShowVisibilitySubmenu] = useState(false);
  const [showTagsSubmenu, setShowTagsSubmenu] = useState(false);
  const [showViewModeSubmenu, setShowViewModeSubmenu] = useState(false);
  const [showManagementSubmenu, setShowManagementSubmenu] = useState(false);
  
  // Refs
  const contentInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const yearScrollTimeoutRef = useRef(null);
  const dateInputRef = useRef(null);

  const [headerPortalTarget, setHeaderPortalTarget] = useState(null);
  useEffect(() => {
    setHeaderPortalTarget(document.getElementById('mobile-header-actions'));
  }, []);

  // Ensure suggestion dropdowns are closed when modal opens/closes
  useEffect(() => {
    setShowSimilarNotes(false);
    setShowTagSuggestions(false);
  }, [showModal]);

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
    const matched = notes.filter(note => 
      (note.title || '').toLowerCase().includes(lowerQuery) || 
      (note.text || '').toLowerCase().includes(lowerQuery)
    );

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const getCategory = (noteDate) => {
      if (!noteDate) return 3;
      if (noteDate === todayStr) return 0;
      if (noteDate > todayStr) return 1;
      return 2;
    };

    matched.sort((a, b) => {
      const catA = getCategory(a.date);
      const catB = getCategory(b.date);

      if (catA !== catB) {
        return catA - catB;
      }

      if (catA === 1) {
        // Future: nearest first (ascending)
        return (a.date || '').localeCompare(b.date || '');
      }

      if (catA === 2) {
        // Past: recent first (descending)
        return (b.date || '').localeCompare(a.date || '');
      }

      return (a.title || '').localeCompare(b.title || '');
    });

    return matched.slice(0, 10); // Limit to 10 results
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
      institutionId: 'all',
      color: 'all'
    };
  });

  const [showFilterBar, setShowFilterBar] = useState(false);

  // Local state for visibility to allow immediate UI toggling
  const [visibilityConfig, setVisibilityConfig] = useState({ 
    notes: true, 
    bank: false, 
    finance: false, 
    holidays: true 
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

  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (notesConfig && isFirstLoad.current) {
      if (notesConfig.listConfig) setNoteConfig(notesConfig.listConfig);
      if (notesConfig.filters) setFilters(notesConfig.filters);
      if (notesConfig.visibility) setVisibilityConfig(notesConfig.visibility);
      else if (Object.keys(notesConfig).length === 0) {
        // Config loaded but empty (first time user), enable all
        setVisibilityConfig({ notes: true, bank: true, finance: true, holidays: true });
      }
      if (notesConfig.listMode) setListMode(notesConfig.listMode);
      if (notesConfig.viewMode) setViewMode(notesConfig.viewMode);
      else setViewMode('month');
      isFirstLoad.current = false;
    }
  }, [notesConfig]);

  useEffect(() => {
    if (isFirstLoad.current) return;
    localStorage.setItem('notes_filters', JSON.stringify(filters));
    
    const timer = setTimeout(() => {
      if (user) {
        setDoc(doc(db, `users/${user.uid}/config`, 'notesSettings'), { 
          filters: filters 
        }, { merge: true }).catch(err => console.error("Error updating filters:", err));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [filters, user]);

  useEffect(() => {
    if (isFirstLoad.current) return;
    const timer = setTimeout(() => {
      if (user) {
        setDoc(doc(db, `users/${user.uid}/config`, 'notesSettings'), { 
          listConfig: noteConfig 
        }, { merge: true }).catch(err => console.error("Error updating noteConfig:", err));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [noteConfig, user]);

  const updateNoteConfig = (newConfig) => setNoteConfig(newConfig);
  const updateFilters = (newFilters) => setFilters(newFilters);

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('monthly');
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [tempIsRecurring, setTempIsRecurring] = useState(false);
  const [tempRecurringType, setTempRecurringType] = useState('monthly');
  const [tempRecurringEndDate, setTempRecurringEndDate] = useState('');
  const [recurringGroupId, setRecurringGroupId] = useState(null);
  const [showRecurringDeleteModal, setShowRecurringDeleteModal] = useState(false);
  const [activeRecurringDeleteAction, setActiveRecurringDeleteAction] = useState(null);
  const [actionProgress, setActionProgress] = useState(0);

  const triggerDeleteAction = (action) => {
    setActiveRecurringDeleteAction(action);
    setActionProgress(0);
    
    let progress = 0;
    const interval = setInterval(async () => {
      progress += 5;
      setActionProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        try {
          await handleRecurringDeleteAction(action);
        } catch (err) {
          console.error("Error executing recurring action:", err);
        } finally {
          setActiveRecurringDeleteAction(null);
          setActionProgress(0);
        }
      }
    }, 40); // 40ms * 20 steps = 800ms total progress bar fill time
  };


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

  const updateViewMode = async (newMode) => {
    setViewMode(newMode);
    if (user) {
      await updateDoc(doc(db, `users/${user.uid}/config`, 'notesSettings'), {
        viewMode: newMode
      }).catch(async (err) => {
        if (err.code === 'not-found') {
          await setDoc(doc(db, `users/${user.uid}/config`, 'notesSettings'), { viewMode: newMode });
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
      const dateCmp = (a.date || '').localeCompare(b.date || '');
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
      const noteToOpen = notes.find(n => n.id === location.state.openNoteId && n.deleted !== true);
      if (noteToOpen) {
        handleEditNote(noteToOpen);
        // Clear state to prevent re-opening
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, notes]);

  useEffect(() => { setNotes(globalNotes.filter(n => n.deleted !== true)); }, [globalNotes]);
  useEffect(() => { setBankTransactions(globalBankTrans.filter(t => t.deleted !== true)); }, [globalBankTrans]);
  useEffect(() => { setFinanceTransactions(globalFinTrans.filter(t => t.deleted !== true)); }, [globalFinTrans]);
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
    const input = tagInput.trim().toLowerCase();
    return allTags.filter(tag => 
      (!input || tag.toLowerCase().includes(input)) && 
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
    return combined.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
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
          const colorMatch = filters.color === 'all' || item.color === filters.color;
          if (!titleMatch || !textMatch || !tagMatch || !colorMatch) return false;
          
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

  const scrollYearContainerToYear = (year, smooth = false) => {
    const container = document.querySelector('.year-view-scroll-container');
    const element = document.getElementById(`year-section-${year}`);
    if (container && element) {
      container.scrollTo({
        top: element.offsetTop,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
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
        scrollYearContainerToYear(today.getFullYear(), true);
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
        scrollYearContainerToYear(today.getFullYear(), false);
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
    setNoteColor('blue');
    setIsRecurring(false);
    setRecurringType('monthly');
    setRecurringEndDate('');
    setTempIsRecurring(false);
    setTempRecurringType('monthly');
    setTempRecurringEndDate('');
    setRecurringGroupId(null);
  };

  const checkActiveFormats = () => {
    const formatBlock = document.queryCommandValue('formatBlock');
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
      quote: formatBlock === 'blockquote',
      h1: formatBlock === 'h1',
      h2: formatBlock === 'h2',
      h3: formatBlock === 'h3',
      p: formatBlock === 'p' || formatBlock === 'div' || formatBlock === 'default',
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList')
    });
  };

  const trimSelectionRange = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

    const range = selection.getRangeAt(0);
    let startContainer = range.startContainer;
    let startOffset = range.startOffset;
    let endContainer = range.endContainer;
    let endOffset = range.endOffset;
    let rangeChanged = false;

    if (startContainer === endContainer) {
      if (startContainer.nodeType === Node.TEXT_NODE) {
        const text = startContainer.textContent;
        while (startOffset < endOffset && /\s/.test(text.charAt(startOffset))) {
          startOffset++;
          rangeChanged = true;
        }
        while (endOffset > startOffset && /\s/.test(text.charAt(endOffset - 1))) {
          endOffset--;
          rangeChanged = true;
        }
      }
    } else {
      if (startContainer.nodeType === Node.TEXT_NODE) {
        const text = startContainer.textContent;
        while (startOffset < text.length && /\s/.test(text.charAt(startOffset))) {
          startOffset++;
          rangeChanged = true;
        }
      }
      if (endContainer.nodeType === Node.TEXT_NODE) {
        const text = endContainer.textContent;
        while (endOffset > 0 && /\s/.test(text.charAt(endOffset - 1))) {
          endOffset--;
          rangeChanged = true;
        }
      }
    }

    if (rangeChanged) {
      const newRange = document.createRange();
      newRange.setStart(startContainer, startOffset);
      newRange.setEnd(endContainer, endOffset);
      selection.removeAllRanges();
      selection.addRange(newRange);
      return newRange;
    }
    return range;
  };

  const applyFormatting = (type) => {
    const editor = contentInputRef.current;
    if (!editor) return;

    editor.focus();

    if (['bold', 'italic', 'underline', 'strikethrough'].includes(type)) {
      trimSelectionRange();
    }
    
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
        const isQuote = document.queryCommandValue('formatBlock') === 'blockquote';
        document.execCommand('formatBlock', false, isQuote ? 'p' : 'blockquote');
        break;
      case 'h1':
        document.execCommand('formatBlock', false, activeFormats.h1 ? 'p' : 'h1');
        break;
      case 'h2':
        document.execCommand('formatBlock', false, activeFormats.h2 ? 'p' : 'h2');
        break;
      case 'h3':
        document.execCommand('formatBlock', false, activeFormats.h3 ? 'p' : 'h3');
        break;
      case 'p':
        document.execCommand('formatBlock', false, 'p');
        break;
      case 'ul':
        document.execCommand('insertUnorderedList', false, null);
        break;
      case 'ol':
        document.execCommand('insertOrderedList', false, null);
        break;
      default:
        return;
    }
    
    checkActiveFormats();
    setNoteText(editor.innerHTML);
  };

  const handleUndo = () => {
    document.execCommand('undo', false, null);
    if (contentInputRef.current) {
      setNoteText(contentInputRef.current.innerHTML);
    }
  };

  const handleRedo = () => {
    document.execCommand('redo', false, null);
    if (contentInputRef.current) {
      setNoteText(contentInputRef.current.innerHTML);
    }
  };

  const linkEditorShowRef = useRef(false);
  useEffect(() => {
    linkEditorShowRef.current = linkEditor.show;
  }, [linkEditor.show]);

  const handleEditorClick = (e) => {
    const anchor = e.target.closest('a');
    if (anchor) {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = anchor.getBoundingClientRect();
      const clickX = e.clientX;
      
      // If clicked on the icon (last 22px of the anchor box width)
      if (clickX >= rect.right - 22 && clickX <= rect.right + 4) {
        const url = anchor.getAttribute('href') || '';
        if (url) {
          window.open(url, '_blank', 'noopener,noreferrer');
          return;
        }
      }
      
      const x = rect.left + rect.width / 2 + window.scrollX;
      const y = rect.bottom + window.scrollY + 6;
      
      setLinkPopup({
        show: true,
        x: x,
        y: y,
        url: anchor.getAttribute('href') || '',
        element: anchor
      });
      
      setFloatingToolbar(prev => ({ ...prev, show: false }));
    } else {
      setLinkPopup({ show: false, x: 0, y: 0, url: '', element: null });
    }
  };

  const handleOpenLinkInNewTab = () => {
    if (linkPopup.url) {
      window.open(linkPopup.url, '_blank', 'noopener,noreferrer');
    }
    setLinkPopup({ show: false, x: 0, y: 0, url: '', element: null });
  };

  const handleEditLinkFromPopup = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const { element, url } = linkPopup;
    if (!element) return;
    
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2 + window.scrollX;
    const y = rect.top + window.scrollY - 12;
    
    setFloatingToolbar({
      show: true,
      x: x,
      y: y
    });
    
    setLinkEditor({
      show: true,
      text: element.textContent || '',
      url: url,
      range: range,
      element: element
    });
    
    setLinkPopup({ show: false, x: 0, y: 0, url: '', element: null });
  };

  const handleUnlink = () => {
    const { element } = linkPopup;
    if (!element) return;
    
    const parent = element.parentNode;
    while (element.firstChild) {
      parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
    
    setLinkPopup({ show: false, x: 0, y: 0, url: '', element: null });
    if (contentInputRef.current) {
      setNoteText(contentInputRef.current.innerHTML);
    }
  };

  const handleOpenLinkEditor = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    trimSelectionRange();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0).cloneRange();
    let selectedText = range.toString().trim();
    let existingUrl = '';
    let existingLinkElement = null;
    
    // Check if the range is inside an existing anchor link
    let parent = range.commonAncestorContainer;
    if (parent.nodeType === Node.TEXT_NODE) {
      parent = parent.parentNode;
    }
    const anchor = parent.closest('a');
    if (anchor) {
      existingLinkElement = anchor;
      existingUrl = anchor.getAttribute('href') || '';
      selectedText = anchor.textContent || '';
    }
    
    setLinkEditor({
      show: true,
      text: selectedText,
      url: existingUrl || 'https://',
      range: range,
      element: existingLinkElement
    });
  };

  const handleSaveLink = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const { text, url, range, element } = linkEditor;
    if (!url.trim()) return;
    
    const editor = contentInputRef.current;
    if (!editor) return;
    
    editor.focus();
    
    // Restore the selection
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    if (element) {
      // Editing existing link element
      element.setAttribute('href', url);
      element.textContent = text;
    } else {
      // Creating new link
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      a.textContent = text || url;
      
      range.deleteContents();
      range.insertNode(a);
    }
    
    setLinkEditor({ show: false, text: '', url: '', range: null, element: null });
    setFloatingToolbar(prev => ({ ...prev, show: false }));
    setNoteText(editor.innerHTML);
  };

  const handleTextSelection = () => {
    if (linkEditorShowRef.current) return;
    // Small timeout to ensure selection is complete
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !selection.toString().trim()) {
        setFloatingToolbar(prev => (prev.show ? { ...prev, show: false } : prev));
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Ensure the selection is within our content editor
      if (contentInputRef.current && !contentInputRef.current.contains(range.commonAncestorContainer)) {
        setFloatingToolbar(prev => (prev.show ? { ...prev, show: false } : prev));
        return;
      }

      // Use absolute positioning relative to document for better mobile stability
      let x = rect.left + rect.width / 2 + window.scrollX;
      let y = rect.top + window.scrollY;

      // Vertical offset
      if (window.innerWidth < 768) {
        y -= 6; // Closer on mobile
      } else {
        y -= 12;
      }

      // Mobile overflow prevention
      if (window.innerWidth < 768) {
        const padding = 10;
        const estimatedWidth = Math.min(window.innerWidth - 20, 340);
        const halfWidth = estimatedWidth / 2;
        
        if (x - halfWidth < padding) {
          x = halfWidth + padding;
        } else if (x + halfWidth > window.innerWidth - padding) {
          x = window.innerWidth - halfWidth - padding;
        }
      }

      setFloatingToolbar({
        show: true,
        x: x,
        y: y
      });
    });
  };

  // Add selectionchange listener for mobile Safari reliability and reset states
  useEffect(() => {
    if (showModal) {
      document.addEventListener('selectionchange', handleTextSelection);
      return () => document.removeEventListener('selectionchange', handleTextSelection);
    } else {
      setLinkEditor({ show: false, text: '', url: '', range: null, element: null });
      setFloatingToolbar({ show: false, x: 0, y: 0 });
      setLinkPopup({ show: false, x: 0, y: 0, url: '', element: null });
    }
  }, [showModal]);

  // Global click-outside listener to hide the floating styling toolbar and link popup
  useEffect(() => {
    if (!floatingToolbar.show && !linkPopup.show) return;
    
    const handleOutsideClick = (e) => {
      const isClickInsideToolbar = e.target.closest('.floating-format-toolbar');
      const isClickInsidePopup = e.target.closest('.link-preview-popup');
      const isClickInsideEditor = contentInputRef.current?.contains(e.target);
      
      if (!isClickInsideToolbar && !isClickInsidePopup && !isClickInsideEditor) {
        setFloatingToolbar(prev => ({ ...prev, show: false }));
        setLinkEditor({ show: false, text: '', url: '', range: null, element: null });
        setLinkPopup({ show: false, x: 0, y: 0, url: '', element: null });
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [floatingToolbar.show, linkPopup.show]);

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
    setNoteColor(note.color || 'blue');
    setIsRecurring(note.isRecurring || false);
    setRecurringType(note.recurringType || 'monthly');
    setRecurringEndDate(note.recurringEndDate || '');
    setTempIsRecurring(note.isRecurring || false);
    setTempRecurringType(note.recurringType || 'monthly');
    setTempRecurringEndDate(note.recurringEndDate || '');
    setRecurringGroupId(note.recurringGroupId || null);
    setShowModal(true);
  };

  // Template auto-fill logic
  useEffect(() => {
    if (!editingNote && noteTitle.trim() && showModal) {
      const template = notes.find(n => n.isRecurring && n.title.toLowerCase() === noteTitle.toLowerCase());
      if (template) {
        setNoteText(template.text || '');
        setNoteTags(template.tags || []);
        setIsRecurring(true);
        setTempIsRecurring(true);
      }
    }
  }, [noteTitle, notes, editingNote, showModal]);

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

  const getRecurringCount = () => {
    if (!tempIsRecurring || !tempRecurringEndDate || !selectedDate) return 0;
    
    const startY = selectedDate.getFullYear();
    const startM = selectedDate.getMonth();
    const startD = selectedDate.getDate();
    let curr = new Date(startY, startM, startD);
    
    const [endY, endM, endD] = tempRecurringEndDate.split('-').map(Number);
    if (!endY || isNaN(endM) || isNaN(endD)) return 0;
    const end = new Date(endY, endM - 1, endD);
    
    if (curr >= end) return 0;
    
    let count = 0;
    while (true) {
      if (tempRecurringType === 'daily') curr.setDate(curr.getDate() + 1);
      else if (tempRecurringType === 'weekly') curr.setDate(curr.getDate() + 7);
      else if (tempRecurringType === 'monthly') curr.setMonth(curr.getMonth() + 1);
      else if (tempRecurringType === 'yearly') curr.setFullYear(curr.getFullYear() + 1);
      
      if (curr > end) break;
      count++;
      if (count > 500) break; // Safety limit
    }
    return count;
  };

  const handleSaveRecursion = async (nextIsRecurring, nextType, nextEndDate) => {
    if (!user || !selectedDate) return;

    isSavingRef.current = true;
    setIsSaving(true);
    const dateStr = formatIdDate(selectedDate);
    
    let gid = recurringGroupId;
    if (nextIsRecurring && !gid) {
      gid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setRecurringGroupId(gid);
    }

    const noteData = {
      title: noteTitle,
      text: noteText,
      tags: noteTags,
      color: noteColor,
      date: dateStr,
      isRecurring: nextIsRecurring,
      recurringType: nextIsRecurring ? nextType : null,
      recurringEndDate: nextIsRecurring ? nextEndDate : null,
      recurringGroupId: nextIsRecurring ? gid : null,
      updatedAt: serverTimestamp()
    };

    try {
      let currentNoteId = editingNote?.id;
      if (currentNoteId) {
        await updateDoc(doc(db, `users/${user.uid}/notes`, currentNoteId), noteData);
        
        // SYNC RECURRING NOTES (Update existing items in the series)
        if (nextIsRecurring && gid) {
          const notesToSync = notes.filter(n => n.recurringGroupId === gid && n.id !== currentNoteId);
          for (const sn of notesToSync) {
            await updateDoc(doc(db, `users/${user.uid}/notes`, sn.id), {
              title: noteTitle,
              text: noteText,
              tags: noteTags,
              updatedAt: serverTimestamp()
            });
          }
        }
        setEditingNote(prev => ({ ...prev, ...noteData }));
      } else {
        const docRef = await addDoc(collection(db, `users/${user.uid}/notes`), {
          ...noteData,
          createdAt: serverTimestamp()
        });
        currentNoteId = docRef.id;
        setEditingNote({ id: docRef.id, ...noteData });
      }

      // GENERATE MISSING FUTURE OCCURRENCES
      if (nextIsRecurring && gid && nextEndDate) {
        const existingDates = notes.filter(n => n.recurringGroupId === gid).map(n => n.date);
        const futureDates = [];
        
        const startY = selectedDate.getFullYear();
        const startM = selectedDate.getMonth();
        const startD = selectedDate.getDate();
        let curr = new Date(startY, startM, startD);
        
        const [endY, endM, endD] = nextEndDate.split('-').map(Number);
        const end = new Date(endY, endM - 1, endD);

        while (true) {
          if (nextType === 'daily') curr.setDate(curr.getDate() + 1);
          else if (nextType === 'weekly') curr.setDate(curr.getDate() + 7);
          else if (nextType === 'monthly') curr.setMonth(curr.getMonth() + 1);
          else if (nextType === 'yearly') curr.setFullYear(curr.getFullYear() + 1);
          
          if (curr > end) break;
          const fDate = formatIdDate(new Date(curr));
          if (!existingDates.includes(fDate)) {
            futureDates.push(fDate);
          }
          if (futureDates.length > 500) break; // Safety limit
        }

        for (const fDate of futureDates) {
          await addDoc(collection(db, `users/${user.uid}/notes`), {
            ...noteData,
            date: fDate,
            createdAt: serverTimestamp()
          });
        }
      }

      // Commit to main states
      setIsRecurring(nextIsRecurring);
      setRecurringType(nextType);
      setRecurringEndDate(nextEndDate);

      setIsSaving(false);
      isSavingRef.current = false;
      setShowSaveIndicator(true);
      setLastSaved(new Date());
      setTimeout(() => setShowSaveIndicator(false), 1500);
    } catch (error) {
      console.error("Error saving recursion:", error);
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  const handleAutoSave = async () => {
    if (!user || !selectedDate || isSavingRef.current) return;
    
    // 1. Prevent saving if empty AND it's a new note
    if (!editingNote && !noteTitle.trim() && !noteText.trim() && noteTags.length === 0) return;

    // 2. Prevent saving if nothing changed compared to existing state
    if (editingNote) {
      const isTitleSame = noteTitle === (editingNote.title || '');
      const isTextSame = noteText === (editingNote.text || '');
      const isTagsSame = JSON.stringify(noteTags) === JSON.stringify(editingNote.tags || []);
      const isDateSame = formatIdDate(selectedDate) === (editingNote.date || '');
      const isColorSame = noteColor === (editingNote.color || 'blue');
      const isRecurringSame = isRecurring === (editingNote.isRecurring || false);
      const isRecTypeSame = recurringType === (editingNote.recurringType || 'monthly');
      const isRecEndSame = recurringEndDate === (editingNote.recurringEndDate || '');
      
      if (isTitleSame && isTextSame && isTagsSame && isDateSame && isColorSame && isRecurringSame && isRecTypeSame && isRecEndSame) return;
    }
    
    isSavingRef.current = true;
    setIsSaving(true);
    const dateStr = formatIdDate(selectedDate);
    
    let gid = recurringGroupId;
    if (isRecurring && !gid) {
      gid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setRecurringGroupId(gid);
    }

    const noteData = {
      title: noteTitle,
      text: noteText,
      tags: noteTags,
      color: noteColor,
      date: dateStr,
      isRecurring: isRecurring,
      recurringType: isRecurring ? recurringType : null,
      recurringEndDate: isRecurring ? recurringEndDate : null,
      recurringGroupId: isRecurring ? gid : null,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingNote?.id) {
        await updateDoc(doc(db, `users/${user.uid}/notes`, editingNote.id), noteData);
        
        // SYNC RECURRING NOTES (Update existing items in the series)
        if (isRecurring && gid) {
          const notesToSync = notes.filter(n => n.recurringGroupId === gid && n.id !== editingNote.id);
          for (const sn of notesToSync) {
            await updateDoc(doc(db, `users/${user.uid}/notes`, sn.id), {
              title: noteTitle,
              text: noteText,
              tags: noteTags,
              updatedAt: serverTimestamp()
            });
          }
        }
        setEditingNote(prev => ({ ...prev, ...noteData }));
      } else {
        const docRef = await addDoc(collection(db, `users/${user.uid}/notes`), {
          ...noteData,
          createdAt: serverTimestamp()
        });
        setEditingNote({ id: docRef.id, ...noteData });
      }

      setIsSaving(false);
      isSavingRef.current = false;
      setShowSaveIndicator(true);
      setLastSaved(new Date());
      setTimeout(() => setShowSaveIndicator(false), 1500);
    } catch (error) {
      console.error("Error auto-saving note:", error);
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  useEffect(() => {
    if (!showModal) return;
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 1500);
    return () => clearTimeout(timer);
  }, [noteTitle, noteText, noteTags, selectedDate, noteColor, isRecurring, recurringType, recurringEndDate, editingNote, showModal]);

  const handleDeleteNote = async (noteId, e) => {
    if (e) e.stopPropagation();
    if (!user) return;
    if (!window.confirm("Bu notu silmek istediğinize emin misiniz?")) return;
    
    try {
      await updateDoc(doc(db, `users/${user.uid}/notes`, noteId || editingNote?.id), { deleted: true });
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

  const handleRecurringToggle = (checked) => {
    const gid = editingNote?.recurringGroupId || recurringGroupId;
    setTempIsRecurring(checked);
    if (!checked && gid) {
      setShowRecurringDeleteModal(true);
    } else {
      setIsRecurring(checked);
    }
  };

  const handleRecurringDeleteAction = async (action) => {
    const gid = editingNote?.recurringGroupId || recurringGroupId;
    if (!gid) return;

    try {
      const currentDateStr = formatIdDate(selectedDate);

      if (action === 'future') {
        // 1. Delete future ones (after selected date)
        const futureNotes = notes.filter(n => n.recurringGroupId === gid && n.date > currentDateStr);
        for (const fn of futureNotes) {
          await updateDoc(doc(db, `users/${user.uid}/notes`, fn.id), { deleted: true });
        }
        
        // 2. Update remaining notes (this and previous) to end on this date
        const remainingNotesInSeries = notes.filter(n => n.recurringGroupId === gid && n.date <= currentDateStr);
        for (const rn of remainingNotesInSeries) {
          await updateDoc(doc(db, `users/${user.uid}/notes`, rn.id), {
            recurringEndDate: currentDateStr,
            updatedAt: serverTimestamp()
          });
        }
        
        // Update local state
        setRecurringEndDate(currentDateStr);
        setTempRecurringEndDate(currentDateStr);
        setIsRecurring(true); // Keep it on as requested
        setTempIsRecurring(true);
        
      } else if (action === 'past') {
        // Delete previous ones (before selected date)
        const pastNotes = notes.filter(n => n.recurringGroupId === gid && n.date < currentDateStr);
        for (const pn of pastNotes) {
          await updateDoc(doc(db, `users/${user.uid}/notes`, pn.id), { deleted: true });
        }
        
      } else if (action === 'all') {
        // Delete all notes in the series
        const allInSeries = notes.filter(n => n.recurringGroupId === gid);
        for (const sn of allInSeries) {
          await updateDoc(doc(db, `users/${user.uid}/notes`, sn.id), { deleted: true });
        }
        
        setIsRecurring(false);
        setTempIsRecurring(false);
        setRecurringGroupId(null);
        setRecurringType(null);
        setTempRecurringType('monthly');
        setRecurringEndDate('');
        setTempRecurringEndDate('');
        setShowModal(false);
        
      } else if (action === 'unlink') {
        // 1. Delete all other notes in the series (both before and after)
        const otherNotesInSeries = notes.filter(n => n.recurringGroupId === gid && n.id !== editingNote?.id);
        for (const on of otherNotesInSeries) {
          await updateDoc(doc(db, `users/${user.uid}/notes`, on.id), { deleted: true });
        }
        
        // 2. Remove recurrence from this note to make it standalone
        setIsRecurring(false);
        setTempIsRecurring(false);
        setRecurringGroupId(null);
        setRecurringType(null);
        setTempRecurringType('monthly');
        setRecurringEndDate('');
        setTempRecurringEndDate('');
        
        if (editingNote?.id) {
          await updateDoc(doc(db, `users/${user.uid}/notes`, editingNote.id), {
            isRecurring: false,
            recurringGroupId: null,
            recurringType: null,
            recurringEndDate: null,
            updatedAt: serverTimestamp()
          });
        }
      }
      
      setShowRecurringDeleteModal(false);
    } catch (err) {
      console.error("Recurring delete error:", err);
    }
  };

  const removeTag = (tag) => {
    setNoteTags(noteTags.filter(t => t !== tag));
  };

  const toggleFilterTag = (tag) => {
    const next = {
      ...filters,
      tags: filters.tags.includes(tag) 
        ? filters.tags.filter(t => t !== tag) 
        : [...filters.tags, tag]
    };
    updateFilters(next);
  };

  const isAllTagsSelected = useMemo(() => {
    return allTags.length > 0 && allTags.every(t => filters.tags.includes(t));
  }, [allTags, filters.tags]);

  const toggleAllTagsFilter = (e) => {
    e.stopPropagation();
    if (isAllTagsSelected) {
      updateFilters({
        ...filters,
        tags: []
      });
    } else {
      updateFilters({
        ...filters,
        tags: [...allTags]
      });
    }
  };

  const resetFilters = () => {
    updateFilters({
      title: { value: '', op: 'contains' },
      text: { value: '', op: 'contains' },
      tags: [],
      bankId: 'all',
      quickActionId: 'all',
      typeTagId: 'all',
      financeType: 'all',
      stockId: 'all',
      institutionId: 'all',
      color: 'all'
    });
  };
  const handleNoteSort = (propId, direction) => {
    updateNoteConfig({
      ...noteConfig,
      sortConfig: direction === null ? { propId: 'date', direction: 'desc' } : { propId, direction }
    });
  };

  const handleUpdateNoteFilter = (propId, operator, value) => {
    const newFilters = [...(noteConfig.filters || [])];
    const idx = newFilters.findIndex(f => f.propId === propId);
    if (idx !== -1) {
      if (operator === null) newFilters.splice(idx, 1);
      else newFilters[idx] = { propId, operator, value };
    } else {
      if (operator !== null) newFilters.push({ propId, operator, value });
    }
    updateNoteConfig({ ...noteConfig, filters: newFilters });
  };

  const handleUpdateNotePropertyLabel = (id, label) => {
    updateNoteConfig({
      ...noteConfig,
      propertyLabels: { ...noteConfig.propertyLabels, [id]: label }
    });
  };

  const handleUpdateNotePropertyVisibility = (id, visible) => {
    updateNoteConfig({
      ...noteConfig,
      propertyVisibility: { ...noteConfig.propertyVisibility, [id]: visible }
    });
  };

  const getGroupedItems = (dayItems, dateStr) => {
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




  const filteredNoteListData = useMemo(() => {
    let data = [
      ...(visibilityConfig.notes ? notes.map(n => ({ ...n, itemType: 'note' })) : []),
      ...(visibilityConfig.bank ? bankTransactions.map(t => ({ ...t, itemType: 'bank' })) : []),
      ...(visibilityConfig.finance ? processedFinanceTransactions.map(t => ({ ...t, itemType: 'finance' })) : []),
      ...(visibilityConfig.holidays ? holidays.map(h => ({ ...h, itemType: 'holiday' })) : [])
    ];

    // Apply Column Filters
    (noteConfig.filters || []).forEach(f => {
      // Only filter if value is present or it's a null-check operator
      if (!f.value && !['is_empty', 'is_not_empty'].includes(f.operator)) return;

      data = data.filter(item => {
        let val = item[f.propId];
        
        // Intelligent field selection for 'title' property across types
        if (f.propId === 'title') {
          if (item.itemType === 'finance') val = stocks.find(s => s.id === item.stockId)?.name || '';
          else val = item.title || item.name || item.description || '';
        }

        val = (val || '').toString().toLowerCase();
        const filterVal = (f.value || '').toLowerCase();
        
        switch (f.operator) {
          case 'contains': return val.includes(filterVal);
          case 'not_contains': return !val.includes(filterVal);
          case 'equals': return val === filterVal;
          case 'before': return val <= filterVal;
          case 'after': return val >= filterVal;
          case 'between': {
            const [start, end] = filterVal.split('|');
            if (!start && !end) return true;
            if (start && !end) return val >= start;
            if (!start && end) return val <= end;
            return val >= start && val <= end;
          }
          case 'is_empty': return !val;
          case 'is_not_empty': return !!val;
          case 'starts_with': return val.startsWith(filterVal);
          case 'ends_with': return val.endsWith(filterVal);
          default: return true;
        }
      });
    });
    
    // Apply 1-Month Visibility Filter for Notes (as requested)
    const todayForFilter = new Date();
    todayForFilter.setHours(0, 0, 0, 0);
    const oneMonthTimeForFilter = todayForFilter.getTime() + (30 * 24 * 60 * 60 * 1000);
    
    data = data.filter(item => {
      if (item.itemType !== 'note') return true;
      const d = new Date(item.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() <= oneMonthTimeForFilter;
    });


    // Apply Global Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(item => {
        const stockName = item.itemType === 'finance' ? (stocks.find(s => s.id === item.stockId)?.name || '') : '';
        const bankName = item.itemType === 'bank' ? (banks.find(b => b.id === item.bankId)?.name || '') : '';
        
        const title = (item.title || item.name || item.description || stockName || bankName || '').toLowerCase();
        const text = (item.text || item.description || '').toLowerCase();
        const tags = (item.tags || []).join(' ').toLowerCase();

        return title.includes(q) || text.includes(q) || tags.includes(q);
      });
    }

    // Apply Top Panel Color Filter
    if (filters.color !== 'all') {
      data = data.filter(item => item.itemType === 'note' && item.color === filters.color);
    }

    const getCreatedTime = (item) => {
      if (!item || !item.createdAt) return Date.now();
      const c = item.createdAt;
      if (typeof c.seconds === 'number') return c.seconds * 1000 + (c.nanoseconds || 0) / 1000000;
      if (c instanceof Date) return c.getTime();
      if (typeof c === 'number') return c;
      if (typeof c === 'string') {
        const t = new Date(c).getTime();
        return isNaN(t) ? Date.now() : t;
      }
      return Date.now();
    };

    // Apply Sorting
    data.sort((a, b) => {
      let valA = a[noteConfig.sortConfig.propId];
      let valB = b[noteConfig.sortConfig.propId];
      
      // Fallback for titles across different types
      if (noteConfig.sortConfig.propId === 'title') {
        const getTitle = (item) => {
          if (item.itemType === 'finance') return stocks.find(s => s.id === item.stockId)?.name || '';
          return item.title || item.name || item.description || '';
        };
        valA = getTitle(a);
        valB = getTitle(b);
      }

      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
      
      if (noteConfig.sortConfig.propId === 'date') {
        const diff = noteConfig.sortConfig.direction === 'asc' 
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
        if (diff !== 0) return diff;
        const timeA = getCreatedTime(a);
        const timeB = getCreatedTime(b);
        return timeB - timeA;
      }

      const cmp = noteConfig.sortConfig.direction === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
      if (cmp !== 0) return cmp;
      const timeA = getCreatedTime(a);
      const timeB = getCreatedTime(b);
      return timeB - timeA;
    });

    return data;
  }, [globalNotes, noteConfig, searchQuery, filters, visibilityConfig, bankTransactions, processedFinanceTransactions, holidays, stocks]);

  const handleBulkNoteSave = async () => {
    if (selectedNoteIds.length === 0 || Object.keys(stagedNoteChanges).length === 0) return;
    setIsBulkNoteProcessing(true);
    setBulkNoteProgress(0);

    const total = selectedNoteIds.length;
    let successCount = 0;
    const affectedItems = [];
    
    for (let i = 0; i < total; i++) {
      const noteId = selectedNoteIds[i];
      const note = notes.find(n => n.id === noteId);
      if (!note) continue;

      const previousState = {
        title: note.title || '',
        date: note.date || '',
        tags: note.tags || []
      };

      const updates = {};
      if (stagedNoteChanges.date) updates.date = stagedNoteChanges.date;
      if (stagedNoteChanges.tags) updates.tags = stagedNoteChanges.tags;
      
      if (stagedNoteChanges.titleUpdate) {
        const { mode, value } = stagedNoteChanges.titleUpdate;
        let newTitle = note.title || '';
        if (mode === 'replace') newTitle = value;
        else if (mode === 'prefix') newTitle = value + newTitle;
        else if (mode === 'suffix') newTitle = newTitle + value;
        updates.title = newTitle;
      }

      try {
        await updateDoc(doc(db, `users/${user.uid}/notes`, noteId), updates);
        successCount++;
        affectedItems.push({ id: noteId, previousState });
      } catch (err) {
        console.error("Bulk update error:", err);
      }
      setBulkNoteProgress(Math.round(((i + 1) / total) * 100));
    }

    const historyItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      count: successCount,
      type: 'BULK_UPDATE',
      changes: { ...stagedNoteChanges },
      affectedItems
    };

    setNoteActionHistory(prev => [historyItem, ...prev]);

    setIsBulkNoteProcessing(false);
    setStagedNoteChanges({});
    setSelectedNoteIds([]);
  };

  const handleUndoBulkNoteAction = async (item) => {
    if (isBulkNoteProcessing || !item.affectedItems) return;
    setIsBulkNoteProcessing(true);
    setBulkNoteProgress(0);

    const total = item.affectedItems.length;
    for (let i = 0; i < total; i++) {
      const { id, previousState } = item.affectedItems[i];
      try {
        await updateDoc(doc(db, `users/${user.uid}/notes`, id), previousState);
      } catch (err) {
        console.error("Undo error:", err);
      }
      setBulkNoteProgress(Math.round(((i + 1) / total) * 100));
    }

    setNoteActionHistory(prev => prev.filter(h => h.id !== item.id));
    setIsBulkNoteProcessing(false);
  };

  const handleDeleteBulkNoteHistory = (id) => {
    setNoteActionHistory(prev => prev.filter(h => h.id !== id));
  };

  const handleClearBulkNoteHistory = () => {
    if (window.confirm("Tüm işlem geçmişini silmek istediğinize emin misiniz?")) {
      setNoteActionHistory([]);
    }
  };

  const visibleNoteListData = filteredNoteListData;

  const renderListView = () => {
    const isAllSelected = filteredNoteListData.length > 0 && selectedNoteIds.length === filteredNoteListData.length;

    return (
      <div className="note-list-view-container p-0">
        {selectedNoteIds.length > 0 && (
          <div className="position-sticky mb-2" style={{ zIndex: 1015, top: '10px' }}>
            <div className="glass-card p-1 d-flex align-items-center flex-wrap gap-1 shadow-lg border-primary border-opacity-25" style={{ minHeight: '48px', height: 'auto', width: 'fit-content', maxWidth: '100%', borderRadius: '12px' }}>
              <div className="px-3 border-end text-primary fw-bold small d-flex align-items-center gap-2">
                {selectedNoteIds.length} Seçili
                <div
                  className="hover-bg-secondary rounded p-0 d-flex align-items-center justify-content-center opacity-50 hover-opacity-100 transition-all cursor-pointer"
                  style={{ width: '16px', height: '16px' }}
                  onClick={() => setSelectedNoteIds([])}
                >
                  <X size={12} />
                </div>
              </div>
              
              <div className="d-flex align-items-center gap-1 px-1 mobile-scroll-x">
                {/* Date Update */}
                <Dropdown autoClose="outside" className="d-inline">
                  <Dropdown.Toggle as="button" className={`btn btn-link text-dark text-decoration-none py-1 px-2 hover-bg-light rounded-2 d-flex flex-column align-items-center justify-content-center cursor-pointer dropdown-no-caret ${stagedNoteChanges.date ? 'text-primary' : ''}`} style={{ minWidth: '80px' }}>
                    <div className="d-flex align-items-center gap-1 opacity-50 w-100 justify-content-center" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>
                      <CalendarIcon size={10} /> Tarih
                      {stagedNoteChanges.date && <X size={10} className="ms-1" onClick={(e) => { e.stopPropagation(); setStagedNoteChanges(prev => { const n = {...prev}; delete n.date; return n; }); }} />}
                    </div>
                    {stagedNoteChanges.date && <div className="fw-bold" style={{ fontSize: '11px' }}>{new Date(stagedNoteChanges.date).toLocaleDateString('tr-TR')}</div>}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="glass-card border-0 shadow-lg p-2">
                    <Form.Control type="date" value={stagedNoteChanges.date || ''} onChange={e => setStagedNoteChanges(prev => ({ ...prev, date: e.target.value }))} className="border-0 bg-light fs-14" />
                  </Dropdown.Menu>
                </Dropdown>

                {/* Title Update */}
                <Dropdown autoClose="outside" className="d-inline">
                  <Dropdown.Toggle as="button" className={`btn btn-link text-dark text-decoration-none py-1 px-2 hover-bg-light rounded-2 d-flex flex-column align-items-center justify-content-center cursor-pointer dropdown-no-caret ${stagedNoteChanges.titleUpdate ? 'text-primary' : ''}`} style={{ minWidth: '80px' }}>
                    <div className="d-flex align-items-center gap-1 opacity-50 w-100 justify-content-center" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>
                      <Type size={10} /> Başlık
                      {stagedNoteChanges.titleUpdate && <X size={10} className="ms-1" onClick={(e) => { e.stopPropagation(); setStagedNoteChanges(prev => { const n = {...prev}; delete n.titleUpdate; return n; }); }} />}
                    </div>
                    {stagedNoteChanges.titleUpdate && <div className="fw-bold text-truncate" style={{ fontSize: '11px', maxWidth: '100px' }}>{stagedNoteChanges.titleUpdate.value}</div>}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="glass-card border-0 shadow-lg p-2" style={{ width: '220px' }}>
                    <div className="d-flex gap-1 mb-2">
                      {['replace', 'prefix', 'suffix'].map(m => (
                        <Button key={m} size="sm" variant={stagedNoteChanges.titleUpdate?.mode === m ? 'primary' : 'light'} className="x-small flex-grow-1" onClick={() => setStagedNoteChanges(prev => ({ ...prev, titleUpdate: { ...prev.titleUpdate, mode: m } }))}>
                          {m === 'replace' ? 'Değiştir' : m === 'prefix' ? 'Başına' : 'Sonuna'}
                        </Button>
                      ))}
                    </div>
                    <Form.Control 
                      size="sm" 
                      placeholder="Yeni başlık veya ek..." 
                      className="border-0 bg-light fs-14" 
                      value={stagedNoteChanges.titleUpdate?.value || ''} 
                      onChange={e => setStagedNoteChanges(prev => ({ ...prev, titleUpdate: { mode: prev.titleUpdate?.mode || 'replace', value: e.target.value } }))}
                    />
                  </Dropdown.Menu>
                </Dropdown>

                {/* Tags Update */}
                <Dropdown autoClose="outside" className="d-inline">
                  <Dropdown.Toggle as="button" className={`btn btn-link text-dark text-decoration-none py-1 px-2 hover-bg-light rounded-2 d-flex flex-column align-items-center justify-content-center cursor-pointer dropdown-no-caret ${stagedNoteChanges.tags ? 'text-primary' : ''}`} style={{ minWidth: '80px' }}>
                    <div className="d-flex align-items-center gap-1 opacity-50 w-100 justify-content-center" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>
                      <TagIcon size={10} /> Etiketler
                      {stagedNoteChanges.tags && <X size={10} className="ms-1" onClick={(e) => { e.stopPropagation(); setStagedNoteChanges(prev => { const n = {...prev}; delete n.tags; return n; }); }} />}
                    </div>
                    {stagedNoteChanges.tags && <div className="fw-bold" style={{ fontSize: '11px' }}>{stagedNoteChanges.tags.length} Etiket</div>}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="glass-card border-0 shadow-lg p-2" style={{ width: '200px', maxHeight: '250px', overflowY: 'auto' }}>
                    {globalNoteTags.map(tag => {
                      const isSelected = stagedNoteChanges.tags?.includes(tag.name);
                      return (
                        <div key={tag.name} className="d-flex align-items-center gap-2 p-1 px-2 rounded-1 cursor-pointer hover-bg-light fs-14" onClick={() => {
                          const current = stagedNoteChanges.tags || [];
                          const next = current.includes(tag.name) ? current.filter(t => t !== tag.name) : [...current, tag.name];
                          setStagedNoteChanges(prev => ({ ...prev, tags: next }));
                        }}>
                          <span className="px-2 py-0.5 rounded-pill fs-11" style={getTagStyleByColor(tag.color)}>{tag.name}</span>
                          {isSelected && <Check size={14} className="text-primary ms-auto" />}
                        </div>
                      );
                    })}
                  </Dropdown.Menu>
                </Dropdown>

                <div className="border-start ms-1 ps-1 d-flex align-items-center gap-1">
                  {Object.keys(stagedNoteChanges).length > 0 && (
                    <Button variant="primary" size="sm" className="rounded-pill px-3 fw-bold d-flex align-items-center gap-2 shadow-sm border-0 position-relative overflow-hidden" disabled={isBulkNoteProcessing} onClick={handleBulkNoteSave} style={{ minWidth: '90px', background: 'linear-gradient(135deg, #006fee 0%, #005bc4 100%)' }}>
                      <div className="position-absolute top-0 start-0 h-100 transition-all" style={{ width: `${bulkNoteProgress}%`, backgroundColor: 'rgba(255,255,255,0.2)' }} />
                      <span className="position-relative">{isBulkNoteProcessing ? `%${bulkNoteProgress}` : 'Kaydet'}</span>
                    </Button>
                  )}
                  
                  <Button variant="link" className="text-danger p-2 hover-bg-light rounded-2" onClick={async () => {
                    if (window.confirm(`${selectedNoteIds.length} notu silmek istediğinize emin misiniz?`)) {
                      for (const id of selectedNoteIds) {
                        await updateDoc(doc(db, `users/${user.uid}/notes`, id), { deleted: true });
                      }
                      setSelectedNoteIds([]);
                    }
                  }}>
                    <Trash2 size={18} />
                  </Button>

                  {/* History */}
                  <Dropdown autoClose="outside" className="d-inline ms-1">
                    <Dropdown.Toggle as="div" className="cursor-pointer text-muted hover-text-primary p-1 rounded-circle hover-bg-light transition-all d-flex align-items-center justify-content-center">
                      <RotateCcw size={18} />
                    </Dropdown.Toggle>
                    <Dropdown.Menu align="end" className="glass-card border-0 shadow-lg p-2" style={{ minWidth: '350px' }}>
                      <div className="d-flex align-items-center justify-content-between px-2 border-bottom pb-1 mb-2">
                        <div className="x-small fw-bold text-muted">TOPLU İŞLEM GEÇMİŞİ</div>
                        {noteActionHistory.length > 0 && (
                          <div
                            className="x-small text-danger fw-bold cursor-pointer hover-opacity-75 transition-all"
                            style={{ fontSize: '10px', letterSpacing: '0.02em' }}
                            onClick={(e) => { e.stopPropagation(); handleClearBulkNoteHistory(); }}
                          >
                            TÜMÜNÜ SİL
                          </div>
                        )}
                      </div>
                      <div className="overflow-auto" style={{ maxHeight: '400px' }}>
                        {noteActionHistory.length === 0 && <div className="p-3 text-center text-muted opacity-50 small">Geçmiş işlem bulunamadı</div>}
                        {noteActionHistory.map((h, i) => (
                          <div key={h.id || i} className="p-2 border-bottom last-border-0 hover-bg-light rounded-2 d-flex align-items-center justify-content-between gap-3 mb-1">
                            <div className="d-flex flex-column gap-1 overflow-hidden">
                              <div className="d-flex align-items-center gap-2">
                                <span className="badge bg-primary bg-opacity-10 text-primary fw-bold" style={{ fontSize: '10px' }}>{h.count} Not</span>
                                <span className="text-muted" style={{ fontSize: '11px' }}>
                                  {h.timestamp?.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="small fw-medium text-truncate" style={{ maxWidth: '200px' }}>
                                <span className="me-1">✏️</span>
                                {h.changes.date && <span className="me-1">Tarih</span>}
                                {h.changes.tags && <span className="me-1">Etiket</span>}
                                {h.changes.titleUpdate && <span>Başlık ({h.changes.titleUpdate.mode === 'replace' ? 'Değişim' : 'Ek'})</span>}
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                className="px-2 py-0.5 rounded-pill transition-all shadow-sm border-0"
                                style={{ fontSize: '11px', fontWeight: 600, height: '24px' }}
                                disabled={isBulkNoteProcessing}
                                onClick={() => handleUndoBulkNoteAction(h)}
                              >
                                Geri Al
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                className="px-2 py-1 x-small fw-bold rounded-pill transition-all d-flex align-items-center justify-content-center"
                                onClick={() => handleDeleteBulkNoteHistory(h.id)}
                                style={{ width: '28px', height: '28px' }}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>
            </div>
          </div>
        )}

        <Card className="note-list-card glass-card border shadow-sm overflow-hidden" style={{ border: 'none' }}>
          <Table responsive hover className="notion-table mb-0">
            <thead className="sticky-top bg-white" style={{ zIndex: 1100 }}>
              {noteConfig.filters?.length > 0 && (
                <tr className="border-bottom" style={{ position: 'relative', zIndex: 1110 }}>
                  <th colSpan={100} className="py-2 px-3 border-bottom font-normal">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <div className="text-muted x-small fw-bold d-flex align-items-center gap-1 opacity-50 pe-2 border-end">
                        <Filter size={12} /> FILTERS
                      </div>
                      {noteConfig.filters.map(f => {
                        const p = NOTE_PROPERTIES.find(item => item.id === f.propId);
                        const label = noteConfig.propertyLabels?.[f.propId] || p?.label;
                        return (
                          <div key={f.propId} className="glass-card border rounded-pill px-2 py-1 d-flex align-items-center gap-2 shadow-sm" style={{ fontSize: '11px', fontWeight: 400 }}>
                            <span className="text-muted">{label}</span>
                            <Dropdown autoClose="outside">
                              <Dropdown.Toggle as="span" className="fw-bold cursor-pointer hover-text-primary text-lowercase">
                                {f.operator.replace(/_/g, ' ')}
                              </Dropdown.Toggle>
                              <Dropdown.Menu className="glass-card border-0 shadow-lg p-1" style={{ zIndex: 1200 }}>
                                {(f.propId === 'date' ? DATE_OPERATORS : FILTER_OPERATORS).map(op => (
                                  <Dropdown.Item key={op.value} className="small rounded-2" onClick={() => handleUpdateNoteFilter(f.propId, op.value, f.value)}>
                                    {op.label}
                                  </Dropdown.Item>
                                ))}
                              </Dropdown.Menu>
                            </Dropdown>
                            {f.propId === 'date' && f.operator === 'between' ? (
                              <div className="d-flex align-items-center gap-1">
                                <Form.Control 
                                  size="sm"
                                  type="date"
                                  className="border-0 bg-transparent p-0 fw-medium"
                                  style={{ width: '85px', fontSize: '11px' }}
                                  value={(f.value || '').split('|')[0] || ''}
                                  onChange={(e) => {
                                    const parts = (f.value || '').split('|');
                                    handleUpdateNoteFilter(f.propId, f.operator, `${e.target.value}|${parts[1] || ''}`);
                                  }}
                                />
                                <span className="opacity-50">-</span>
                                <Form.Control 
                                  size="sm"
                                  type="date"
                                  className="border-0 bg-transparent p-0 fw-medium"
                                  style={{ width: '85px', fontSize: '11px' }}
                                  value={(f.value || '').split('|')[1] || ''}
                                  onChange={(e) => {
                                    const parts = (f.value || '').split('|');
                                    handleUpdateNoteFilter(f.propId, f.operator, `${parts[0] || ''}|${e.target.value}`);
                                  }}
                                />
                              </div>
                            ) : (
                              f.propId === 'date' ? (
                                <Form.Control 
                                  size="sm"
                                  type="date"
                                  className="border-0 bg-transparent p-0 fw-medium"
                                  style={{ width: '100px', fontSize: '11px' }}
                                  value={f.value || ''}
                                  onChange={(e) => handleUpdateNoteFilter(f.propId, f.operator, e.target.value)}
                                />
                              ) : f.propId === 'tags' ? (
                                <Dropdown autoClose="outside" className="d-inline">
                                  <Dropdown.Toggle as="div" className="cursor-pointer text-primary d-flex align-items-center gap-1">
                                    <span className="fw-bold" style={{ fontSize: '11px' }}>{(f.value || '').split(',').filter(v => v).length} Etiket</span>
                                    <ChevronDown size={10} />
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu className="glass-card border-0 shadow-lg p-1 overflow-auto" style={{ maxHeight: '300px', minWidth: '160px', zIndex: 1200 }}>
                                    {globalNoteTags.map(tag => {
                                      const isSelected = (f.value || '').split(',').includes(tag.name);
                                      return (
                                        <Dropdown.Item
                                          key={tag.name}
                                          className="small rounded-2 py-1 mb-1"
                                          onClick={(e) => { 
                                            e.stopPropagation(); 
                                            const current = (f.value || '').split(',').filter(v => v);
                                            const next = current.includes(tag.name) ? current.filter(v => v !== tag.name) : [...current, tag.name];
                                            handleUpdateNoteFilter(f.propId, f.operator, next.join(',')); 
                                          }}
                                        >
                                          <div className="d-flex align-items-center justify-content-between">
                                            <span className="px-2 py-0.5 rounded-pill fs-11" style={getTagStyleByColor(tag.color)}>{tag.name}</span>
                                            {isSelected && <Check size={14} className="text-primary" />}
                                          </div>
                                        </Dropdown.Item>
                                      );
                                    })}
                                  </Dropdown.Menu>
                                </Dropdown>
                              ) : f.propId === 'color' ? (
                                <Dropdown>
                                  <Dropdown.Toggle as="div" className="cursor-pointer d-flex align-items-center gap-1 x-small fw-medium border-0 bg-transparent p-0">
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: NOTE_COLORS[f.value] || '#ccc' }}></div>
                                    <span className="text-muted">{f.value || 'Seç'}</span>
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu className="glass-card shadow-sm border-0 p-1" style={{ zIndex: 10006 }}>
                                    {Object.keys(NOTE_COLORS).map(c => (
                                      <Dropdown.Item key={c} className="rounded-2 d-flex align-items-center gap-2 py-1 small" onClick={() => handleUpdateNoteFilter('color', 'equals', c)}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: NOTE_COLORS[c] }}></div>
                                        {c.charAt(0).toUpperCase() + c.slice(1)}
                                      </Dropdown.Item>
                                    ))}
                                  </Dropdown.Menu>
                                </Dropdown>
                              ) : (
                                <Form.Control 
                                  size="sm"
                                  className="border-0 bg-transparent p-0 fw-medium"
                                  style={{ width: '80px', fontSize: '11px' }}
                                  value={f.value || ''}
                                  onChange={(e) => handleUpdateNoteFilter(f.propId, f.operator, e.target.value)}
                                />
                              )
                            )}
                            <X size={14} className="text-muted cursor-pointer hover-text-danger" onClick={() => handleUpdateNoteFilter(f.propId, null, null)} />
                          </div>
                        );
                      })}
                      <Button variant="link" size="sm" className="text-muted p-0 x-small text-decoration-none ms-auto" onClick={() => setNoteConfig(prev => ({ ...prev, filters: [] }))}>Clear all</Button>
                    </div>
                  </th>
                </tr>
              )}
              <tr>
                <th style={{ width: '40px' }} className="ps-3">
                  <Form.Check 
                    type="checkbox"
                    className="notion-checkbox custom-checkbox-sm"
                    checked={isAllSelected}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedNoteIds(filteredNoteListData.map(n => n.id));
                      else setSelectedNoteIds([]);
                    }}
                  />
                </th>
                {NOTE_PROPERTIES.filter(p => noteConfig.propertyVisibility[p.id] !== false).map(p => {
                  const label = noteConfig.propertyLabels[p.id] || p.label;
                  return (
                    <th key={p.id} className="py-2" style={p.id === 'title' ? { width: '40%' } : {}}>
                      <Dropdown autoClose="outside">
                        <Dropdown.Toggle as="button" type="button" className="btn btn-link p-0 text-decoration-none border-0 d-flex align-items-center gap-2 cursor-pointer dropdown-no-caret hover-bg-light rounded px-2 py-1 flex-grow-1" style={{ marginLeft: '-8px' }}>
                          <span className="text-muted d-flex align-items-center">{p.icon}</span>
                          <span className="text-nowrap">{label}</span>
                          {noteConfig.sortConfig?.propId === p.id && (
                            <div className="ms-auto d-flex align-items-center gap-1">
                              <span className="text-primary d-flex align-items-center">
                                {noteConfig.sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                              </span>
                            </div>
                          )}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="glass-card border-0 shadow-lg p-2" style={{ width: '240px', zIndex: 10005 }}>
                          <div className="px-1 py-1 mb-2 d-flex flex-column gap-1">
                            <Dropdown.Item className="rounded-2 d-flex align-items-center gap-2 py-2 small" onClick={() => handleUpdateNoteFilter(p.id, p.id === 'date' ? 'equals' : 'contains', '')}>
                              <Filter size={14} className="text-muted" /> Filter
                            </Dropdown.Item>
                          </div>
                          <div className="dropdown-divider opacity-10"></div>
                          <Dropdown.Item className="rounded-2 d-flex align-items-center gap-2 py-2 small" onClick={() => handleNoteSort(p.id, 'asc')}>
                            <ArrowUp size={14} className="text-muted" /> Sort ascending
                          </Dropdown.Item>
                          <Dropdown.Item className="rounded-2 d-flex align-items-center gap-2 py-2 small" onClick={() => handleNoteSort(p.id, 'desc')}>
                            <ArrowDown size={14} className="text-muted" /> Sort descending
                          </Dropdown.Item>

                          {p.id === 'date' && (
                            <>
                              <div className="dropdown-divider opacity-10"></div>
                              <div 
                                className="dropdown-item rounded-2 d-flex align-items-center justify-content-between py-2 small cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); setShowDateFormatSubmenu(!showDateFormatSubmenu); }}
                              >
                                <div className="d-flex align-items-center gap-2">
                                  <Calendar size={14} className="text-muted" /> Date format
                                </div>
                                <ChevronDown size={14} className="text-muted opacity-50 transition-all" style={{ transform: showDateFormatSubmenu ? 'rotate(180deg)' : 'none' }} />
                              </div>
                              <Collapse in={showDateFormatSubmenu}>
                                <div className="px-1 py-1">
                                  <div className="bg-light bg-opacity-50 rounded-3 p-1">
                                    {DATE_FORMATS.map(fmt => (
                                      <div 
                                        key={fmt.id} 
                                        className="dropdown-item small rounded-2 py-2 d-flex align-items-center justify-content-between cursor-pointer"
                                        onClick={() => {
                                          updateNoteConfig({ ...noteConfig, dateFormat: fmt.id });
                                        }}
                                      >
                                        <span>{fmt.label}</span>
                                        {noteConfig.dateFormat === fmt.id && <Check size={14} className="text-primary" />}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </Collapse>
                            </>
                          )}

                          {p.id === 'title' && (
                            <>
                              <div className="dropdown-divider opacity-10"></div>
                              <div className="px-3 py-2 text-muted x-small fw-bold opacity-50 uppercase-tracking">RENK FİLTRESİ</div>
                              <div className="d-flex align-items-center gap-2 px-3 py-1 mb-2">
                                {[
                                  { id: 'blue', color: '#3498db' },
                                  { id: 'red', color: '#ff4d4d' },
                                  { id: 'green', color: '#2ecc71' },
                                  { id: 'yellow', color: '#f1c40f' }
                                ].map(c => {
                                  const isActive = noteConfig.filters?.some(f => f.propId === 'color' && f.value === c.id);
                                  return (
                                    <div 
                                      key={c.id}
                                      onClick={() => handleUpdateNoteFilter('color', 'equals', c.id)}
                                      className={`color-filter-dot ${isActive ? 'active' : ''}`}
                                      style={{ 
                                        width: '18px', 
                                        height: '18px', 
                                        borderRadius: '50%', 
                                        backgroundColor: c.color,
                                        cursor: 'pointer',
                                        border: isActive ? '2px solid white' : '1px solid rgba(0,0,0,0.1)',
                                        boxShadow: isActive ? '0 0 0 1px #3498db' : 'none',
                                        transition: 'all 0.2s ease'
                                      }}
                                      title={c.id.charAt(0).toUpperCase() + c.id.slice(1)}
                                    />
                                  );
                                })}
                                {noteConfig.filters?.some(f => f.propId === 'color') && (
                                  <div 
                                    className="ms-auto p-1 rounded-circle hover-bg-light cursor-pointer d-flex align-items-center justify-content-center"
                                    onClick={() => handleUpdateNoteFilter('color', null, null)}
                                    title="Filtreyi Temizle"
                                  >
                                    <X size={14} className="text-muted" />
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </Dropdown.Menu>
                      </Dropdown>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayTime = today.getTime();
                
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                const tomorrowTime = tomorrow.getTime();

                const farFutureTime = today.getTime() + (4 * 24 * 60 * 60 * 1000);
                const oneMonthTime = today.getTime() + (30 * 24 * 60 * 60 * 1000);
                
                const rows = [];
                let yarinDivider = false;
                let bugunDivider = false;
                let gecmisDivider = false;

                const farFutureNotes = visibleNoteListData.filter(n => {
                  const d = new Date(n.date);
                  d.setHours(0,0,0,0);
                  const t = d.getTime();
                  return t > farFutureTime && t <= oneMonthTime;
                });

                const displayNoteListAll = visibleNoteListData.filter(n => {
                  const d = new Date(n.date);
                  d.setHours(0,0,0,0);
                  return d.getTime() <= farFutureTime;
                });
                
                const displayNoteList = isInfiniteNoteScroll ? displayNoteListAll : displayNoteListAll.slice(0, noteListLimit);

                if (farFutureNotes.length > 0) {
                  rows.push(
                    <tr key="divider-far-future" className="bg-light bg-opacity-10 divider-row cursor-pointer" onClick={() => setShowFarFuture(!showFarFuture)}>
                      <td colSpan={100} className="py-2 px-4 border-y border-secondary border-opacity-10 shadow-inner">
                        <div className="d-flex align-items-center justify-content-between gap-2">
                          <div className="d-flex align-items-center gap-2">
                            <Sparkles size={14} className="text-muted opacity-50" />
                            <span className="text-muted fw-bold x-small opacity-75" style={{ letterSpacing: '0.05em' }}>
                              4 GÜN SONRASI ({farFutureNotes.length})
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-2 text-muted x-small">
                            {showFarFuture ? 'Gizle' : 'Göster'}
                            <ChevronDown size={14} style={{ transform: showFarFuture ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );

                  if (showFarFuture) {
                    farFutureNotes.forEach(note => {
                      rows.push(
                        <tr key={note.id || `far-holiday-${note.date}-${note.name}`} className="align-middle cursor-pointer opacity-75" onClick={() => {
                          if (note.itemType === 'note') handleEditNote(note);
                          else if (note.itemType === 'holiday') return;
                          else handleShowSummary(note);
                        }}>
                          <td className="ps-3" onClick={e => e.stopPropagation()}>
                            {note.itemType === 'note' && (
                              <Form.Check 
                                type="checkbox"
                                className="notion-checkbox custom-checkbox-sm"
                                checked={selectedNoteIds.includes(note.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedNoteIds([...selectedNoteIds, note.id]);
                                  else setSelectedNoteIds(selectedNoteIds.filter(id => id !== note.id));
                                }}
                              />
                            )}
                          </td>
                          {NOTE_PROPERTIES.filter(p => noteConfig.propertyVisibility[p.id] !== false).map(p => (
                            <td key={p.id}>
                              {p.id === 'date' && (
                                <span className={`small ${note.itemType === 'holiday' ? 'text-warning fw-bold' : 'text-muted'}`}>
                                  {formatDisplayDate(note.date, noteConfig.dateFormat)}
                                </span>
                              )}
                              {p.id === 'title' && (
                                <div className="d-flex align-items-center gap-2">
                                  {note.itemType === 'note' && (
                                    <div className="note-dot me-2" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: NOTE_COLORS[note.color] || NOTE_COLORS.blue }}></div>
                                  )}
                                  {note.itemType === 'holiday' && <Flag size={14} className="text-warning" />}
                                  {note.itemType === 'bank' && <Landmark size={14} className="text-danger opacity-50" />}
                                  {note.itemType === 'finance' && <PieChart size={14} className="text-success opacity-50" />}
                                  <span className={`fw-bold text-truncate d-inline-block ${note.itemType === 'holiday' ? 'text-warning' : ''}`} style={{ maxWidth: '350px', verticalAlign: 'middle' }}>
                                    {note.itemType === 'finance' 
                                      ? (stocks.find(s => s.id === note.stockId)?.name || 'Bilinmeyen Hisse')
                                      : (note.title || note.name || note.description || 'Başlıksız')
                                    }
                                  </span>
                                  {note.isRecurring && <Repeat size={12} className="text-primary opacity-75 ms-1" title="Tekrar Eden Not" />}
                                </div>
                              )}
                              {p.id === 'tags' && (
                                <div className="d-flex flex-wrap gap-1">
                                  {note.itemType === 'holiday' && <span className="badge bg-warning bg-opacity-10 text-warning rounded-pill px-2 py-0.5 fs-11">Resmi Tatil</span>}
                                  {note.itemType === 'bank' && <span className="badge bg-danger bg-opacity-10 text-danger rounded-pill px-2 py-0.5 fs-11">{banks.find(b => b.id === note.bankId)?.name || 'Banka'}</span>}
                                  {note.itemType === 'finance' && <span className="badge bg-success bg-opacity-10 text-success rounded-pill px-2 py-0.5 fs-11">{note.type}</span>}
                                  {note.tags?.map((t, i) => {
                                    const globalTag = globalNoteTags.find(gt => gt.name === t);
                                    return (
                                      <span key={i} style={getTagStyleByColor(globalTag?.color || 'Blue')} className="px-2 py-0.5 rounded-pill fs-11">
                                        {t}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    });
                  }
                }
                
                displayNoteList.forEach((note, index) => {
                  const noteDate = new Date(note.date);
                  noteDate.setHours(0, 0, 0, 0);
                  const time = noteDate.getTime();
                  
                  // Yaklaşan 4 Gün Divider (Replaces Tomorrow Divider)
                  if (!yarinDivider && time > todayTime && time <= farFutureTime) {
                    rows.push(
                      <tr key="divider-tomorrow" className="bg-light bg-opacity-10 divider-row">
                        <td colSpan={100} className="py-2 px-4 border-y border-success border-opacity-10 shadow-inner">
                          <div className="d-flex align-items-center gap-2">
                            <Calendar size={14} className="text-success opacity-50" />
                            <span className="text-success fw-bold x-small opacity-75" style={{ letterSpacing: '0.05em' }}>YAKLAŞAN 4 GÜN</span>
                            <div className="flex-grow-1 border-top border-success border-opacity-10 ms-2"></div>
                          </div>
                        </td>
                      </tr>
                    );
                    yarinDivider = true;
                  }

                  // Today Divider
                  if (!bugunDivider && time === todayTime) {
                    rows.push(
                      <tr key="divider-today" className="bg-light bg-opacity-10 divider-row">
                        <td colSpan={100} className="py-2 px-4 border-y border-primary border-opacity-10 shadow-inner">
                          <div className="d-flex align-items-center gap-2">
                            <Calendar size={14} className="text-primary opacity-50" />
                            <span className="text-primary fw-bold x-small opacity-75" style={{ letterSpacing: '0.05em' }}>BUGÜN</span>
                            <div className="flex-grow-1 border-top border-primary border-opacity-10 ms-2"></div>
                          </div>
                        </td>
                      </tr>
                    );
                    bugunDivider = true;
                  }

                  // Past Divider
                  if (!gecmisDivider && time < todayTime) {
                    rows.push(
                      <tr key="divider-past" className="bg-light bg-opacity-10 divider-row">
                        <td colSpan={100} className="py-2 px-4 border-y border-muted border-opacity-10 shadow-inner">
                          <div className="d-flex align-items-center gap-2">
                            <Calendar size={14} className="text-muted opacity-50" />
                            <span className="text-muted fw-bold x-small opacity-75" style={{ letterSpacing: '0.05em' }}>GEÇMİŞ</span>
                            <div className="flex-grow-1 border-top border-muted border-opacity-10 ms-2"></div>
                          </div>
                        </td>
                      </tr>
                    );
                    gecmisDivider = true;
                  }
                  
                  rows.push(
                    <tr key={note.id || `holiday-${note.date}-${note.name}`} className="align-middle cursor-pointer" onClick={() => {
                      if (note.itemType === 'note') handleEditNote(note);
                      else if (note.itemType === 'holiday') return;
                      else handleShowSummary(note);
                    }}>
                      <td className="ps-3" onClick={e => e.stopPropagation()}>
                        {note.itemType === 'note' && (
                          <Form.Check 
                            type="checkbox"
                            className="notion-checkbox custom-checkbox-sm"
                            checked={selectedNoteIds.includes(note.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedNoteIds([...selectedNoteIds, note.id]);
                              else setSelectedNoteIds(selectedNoteIds.filter(id => id !== note.id));
                            }}
                          />
                        )}
                      </td>
                      {NOTE_PROPERTIES.filter(p => noteConfig.propertyVisibility[p.id] !== false).map(p => (
                        <td key={p.id}>
                          {p.id === 'date' && (
                            <span className={`small ${time === todayTime ? 'text-primary fw-bold' : time === tomorrowTime ? 'text-success fw-bold' : note.itemType === 'holiday' ? 'text-warning fw-bold' : 'text-muted'}`}>
                              {formatDisplayDate(note.date, noteConfig.dateFormat)}
                            </span>
                          )}
                          {p.id === 'title' && (
                            <div className="d-flex align-items-center gap-2">
                              {note.itemType === 'note' && (
                                <div className="note-dot me-2" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: NOTE_COLORS[note.color] || NOTE_COLORS.blue }}></div>
                              )}
                              {note.itemType === 'holiday' && <Flag size={14} className="text-warning" />}
                              {note.itemType === 'bank' && <Landmark size={14} className="text-danger opacity-50" />}
                              {note.itemType === 'finance' && <PieChart size={14} className="text-success opacity-50" />}
                              <span className={`fw-bold text-truncate d-inline-block ${note.itemType === 'holiday' ? 'text-warning' : ''}`} style={{ maxWidth: '350px', verticalAlign: 'middle' }}>
                                    {note.itemType === 'finance' 
                                      ? (stocks.find(s => s.id === note.stockId)?.name || 'Bilinmeyen Hisse')
                                      : (note.title || note.name || note.description || 'Başlıksız')
                                    }
                              </span>
                              {note.isRecurring && <Repeat size={12} className="text-primary opacity-75 ms-1" title="Tekrar Eden Not" />}
                            </div>
                          )}
                          {p.id === 'tags' && (
                            <div className="d-flex flex-wrap gap-1">
                              {note.itemType === 'holiday' && <span className="badge bg-warning bg-opacity-10 text-warning rounded-pill px-2 py-0.5 fs-11">Resmi Tatil</span>}
                              {note.itemType === 'bank' && (
                                <>
                                  <span className="badge bg-danger bg-opacity-10 text-danger rounded-pill px-2 py-0.5 fs-11">
                                    {banks.find(b => b.id === note.bankId)?.name || 'Banka'}
                                  </span>
                                  {note.typeTagId && (() => {
                                    const tTag = typeTags.find(t => t.id === note.typeTagId);
                                    return tTag ? (
                                      <span className="px-2 py-0.5 rounded-pill fs-11 ms-1" style={getTagStyleByColor(tTag.color || 'Gray')}>
                                        {tTag.name}
                                      </span>
                                    ) : null;
                                  })()}
                                  {note.quickActions && note.quickActions.map((tagId, idx) => {
                                    const qTag = quickActionTags.find(t => t.id === tagId);
                                    return qTag ? (
                                      <span key={idx} className="px-2 py-0.5 rounded-pill fs-11 ms-1" style={getTagStyleByColor(qTag.color || 'Gray')}>
                                        {qTag.name}
                                      </span>
                                    ) : null;
                                  })}
                                </>
                              )}
                              {note.itemType === 'finance' && (
                                <>
                                  <span className="badge bg-success text-white rounded-pill px-2 py-0.5 fs-11">
                                    {institutions.find(i => i.id === note.institutionId)?.name || 'Kurum'}
                                  </span>
                                  {note.type && (
                                    <span className={`badge ${note.type === 'SATIŞ' ? 'bg-danger' : 'bg-success'} text-white rounded-pill px-2 py-0.5 fs-11 ms-1`}>
                                      {note.type}
                                    </span>
                                  )}
                                </>
                              )}
                              {note.tags?.map((t, i) => {
                                const globalTag = globalNoteTags.find(gt => gt.name === t);
                                return (
                                  <span key={i} style={getTagStyleByColor(globalTag?.color || 'Blue')} className="px-2 py-0.5 rounded-pill fs-11">
                                    {t}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                });
                return rows;
              })()}
              {filteredNoteListData.length === 0 && (
                <tr>
                  <td colSpan={100} className="text-center py-5 text-muted opacity-50">
                    Not bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-top bg-light bg-opacity-10 position-sticky bottom-0" style={{ zIndex: 10, backgroundColor: 'var(--card-bg)' }}>
              <tr>
                <td colSpan={100} className="py-2 px-4 text-start">
                  <span className="text-muted x-small fw-bold opacity-50 me-2">SUM</span>
                  <span className="fw-bold fs-14">{filteredNoteListData.filter(n => n.itemType === 'note').length} Not</span>
                </td>
              </tr>
            </tfoot>
          </Table>
        </Card>

        {noteListLimit < filteredNoteListData.length && (
          <div className="d-flex align-items-center gap-4 mt-2 mobile-scroll-x overflow-auto py-2">
            <div className="d-flex align-items-center gap-2 py-2 px-3 hover-bg-light cursor-pointer text-muted small rounded-2"
              style={{ width: 'fit-content', whiteSpace: 'nowrap' }}
              onClick={() => setNoteListLimit(prev => prev + 100)}>
              <Plus size={14} className="opacity-50" />
              <span>Daha fazla göster</span>
            </div>

            <div className="d-flex align-items-center gap-2 text-muted x-small border-start ps-4">
              <span className="opacity-50 fw-bold" style={{ whiteSpace: 'nowrap' }}>GÖRÜNÜM LİMİTİ:</span>
              {[10, 20, 50, 100, 500].map(v => (
                <span
                  key={v}
                  className={`cursor-pointer hover-text-primary px-2 py-1 rounded transition-all ${noteListLimit === v && !isInfiniteNoteScroll ? 'bg-primary bg-opacity-10 text-primary fw-bold' : ''}`}
                  onClick={() => {
                    setIsInfiniteNoteScroll(false);
                    setNoteListLimit(v);
                  }}
                >
                  {v}
                </span>
              ))}
              <span
                className={`cursor-pointer hover-text-primary px-2 py-1 rounded transition-all ${isInfiniteNoteScroll ? 'bg-primary bg-opacity-10 text-primary fw-bold' : ''}`}
                onClick={() => {
                  setIsInfiniteNoteScroll(true);
                }}
                style={{ whiteSpace: 'nowrap' }}
              >
                Hepsini Gör ({filteredNoteListData.length})
              </span>
            </div>
          </div>
        )}
      </div>
    );
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
            const dayItems = filteredItems.filter(n => n.date === dateStr && n.deleted !== true);
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
                          <Flag size={10} className="holiday-flag text-warning" />
                        ) : item.itemType === 'bank' && banks.find(b => b.id === item.bankId)?.logo ? (
                          <img src={banks.find(b => b.id === item.bankId).logo} alt="" className="bank-logo-img" />
                        ) : (
                          <div className="note-text-dot" style={{ 
                            backgroundColor: item.color === 'red' ? '#ff4d4d' : item.color === 'green' ? '#2ecc71' : item.color === 'yellow' ? '#f1c40f' : '#3498db' 
                          }}></div>
                        )}
                        <span className="note-text-snippet fw-bold">
                          {item.itemType === 'finance' && <span className="item-type-badge me-1">{item.type}</span>}
                          {item.itemType === 'finance' 
                            ? (stocks.find(s => s.id === item.stockId)?.name || 'Bilinmeyen Hisse')
                            : (item.title || item.name || item.description || 'Başlıksız')
                          }
                        </span>
                        {item.isRecurring && <Repeat size={10} className="repeat-icon text-primary opacity-75" />}
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
          {monthDays.map((date, i) => {
            const dateStr = formatIdDate(date);
            const dayItems = filteredItems.filter(n => n.date === dateStr && !n.deleted);
            const hasNote = dayItems.some(item => item.itemType === 'note');
            const hasBank = dayItems.some(item => item.itemType === 'bank' || (item.itemType === 'stack' && item.type === 'bank'));
            const hasFinance = dayItems.some(item => item.itemType === 'finance' || (item.itemType === 'stack' && item.type === 'finance'));
            const hasHoliday = dayItems.some(item => item.itemType === 'holiday');

            return (
              <div 
                key={i} 
                className={`calendar-header-cell cursor-pointer transition-all flex-shrink-0 ${activeWeekDayIndex === i ? 'active-day-highlight' : ''} ${formatIdDate(new Date()) === formatIdDate(date) ? 'today' : ''}`}
                style={{ minWidth: '50px', paddingBottom: '8px' }}
                onClick={() => scrollToMonthDay(i)}
              >
                <div className="week-day-name" style={{ fontSize: '10px' }}>{TR_DAYS[(date.getDay() + 6) % 7]}</div>
                <div className={`week-day-number ${formatIdDate(new Date()) === formatIdDate(date) ? 'today-pill' : ''} ${activeWeekDayIndex === i ? 'fw-black scale-110' : ''}`}>
                  {date.getDate()}
                </div>
                <div className="mini-day-indicators mt-1">
                  {hasNote && <span className="indicator-dot note-dot"></span>}
                  {hasBank && <span className="indicator-dot bank-dot"></span>}
                  {hasFinance && <span className="indicator-dot finance-dot"></span>}
                  {hasHoliday && <span className="indicator-dot holiday-dot"></span>}
                </div>
              </div>
            );
          })}
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
                  <span className="ms-2 badge bg-secondary bg-opacity-10 text-muted">{date.getDate()} {TR_MONTHS[date.getMonth()]}</span>
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
                        style={{ borderLeft: `4px solid ${item.type === 'bank' ? '#dc3545' : '#198754'}`, background: 'var(--glass-bg)' }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          {bank?.logo && <img src={bank.logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
                          <div className="fw-bold fs-14">
                            {bank?.name || stock?.name || 'Grup'} 
                            <span className="ms-2 badge bg-secondary bg-opacity-10 text-muted border fs-10">+{item.count} İşlem</span>
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
                        <div className="fw-bold fs-14 d-flex align-items-center gap-2">
                          {item.itemType === 'holiday' && <Flag size={14} className="text-warning" />}
                          {item.itemType === 'finance' && <Badge bg="success" className="me-1 fs-9">{item.type}</Badge>}
                          {item.itemType === 'bank' && banks.find(b => b.id === item.bankId)?.logo && (
                            <img src={banks.find(b => b.id === item.bankId).logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                          )}
                          {item.itemType === 'finance' 
                            ? (stocks.find(s => s.id === item.stockId)?.name || 'Bilinmeyen Hisse')
                            : (item.title || item.name || item.description || 'Başlıksız')
                          }
                        </div>
                        {item.isRecurring && <Repeat size={12} className="text-primary opacity-75 ms-1" />}
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
                              <span 
                                key={idx} 
                                style={getTagStyleByColor(globalTag?.color || 'Blue')} 
                                className="tag-badge d-flex align-items-center gap-1 py-1 px-2 border-0 animate-fade-in"
                              >
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
    
    // Render a static 11-year range so continuous scrolling doesn't shift the DOM and cause jumping on mobile
    const yearsToRender = Array.from({ length: 11 }, (_, i) => baseYear - 5 + i);

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
          // Removed setCurrentDate(newDate) here to prevent the DOM from re-rendering and shifting
          // while the user is actively swiping/scrolling on mobile. This fixes the skipping bug.
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
                    updateViewMode('month');
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
                              updateViewMode('month');
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
    <Dropdown.Menu className="glass-card border-0 shadow-lg p-2 settings-dropdown-menu" style={{ width: '260px', zIndex: 10005 }}>
      <Dropdown.Item className="rounded-2 d-flex align-items-center gap-2 py-2 small" onClick={() => setShowFilterBar(!showFilterBar)}>
        <Filter size={14} className="text-muted" /> 
        <span>{showFilterBar ? 'Filtreleri Kapat' : 'Filtreleri Göster'}</span>
      </Dropdown.Item>
      
      <div className="dropdown-divider opacity-10 my-2"></div>
      
      {/* Visibility Settings - Collapsible */}
      <div 
        className="dropdown-item rounded-2 d-flex align-items-center justify-content-between py-2 small cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setShowVisibilitySubmenu(!showVisibilitySubmenu); }}
      >
        <div className="d-flex align-items-center gap-2">
          <Eye size={14} className="text-muted" /> Listelenecek İşlemler
        </div>
        <ChevronDown size={14} className="text-muted opacity-50 transition-all" style={{ transform: showVisibilitySubmenu ? 'rotate(180deg)' : 'none' }} />
      </div>
      
      <Collapse in={showVisibilitySubmenu}>
        <div className="px-1 py-1">
          <div className="bg-light bg-opacity-50 rounded-3 p-1 d-flex flex-column gap-1">
            <div className="dropdown-item small rounded-2 py-2 d-flex align-items-center justify-content-between cursor-pointer" onClick={(e) => { e.stopPropagation(); updateVisibilityConfig({ notes: !visibilityConfig.notes }); }}>
              <div className="d-flex align-items-center gap-2">
                <Type size={14} className="text-muted" /> 
                <span className={visibilityConfig.notes ? 'text-dark fw-medium' : 'text-muted'}>Notlar</span>
              </div>
              {visibilityConfig.notes ? <Check size={14} className="text-primary" /> : <EyeOff size={14} className="text-muted opacity-30" />}
            </div>

            <div className="dropdown-item small rounded-2 py-2 d-flex align-items-center justify-content-between cursor-pointer" onClick={(e) => { e.stopPropagation(); updateVisibilityConfig({ bank: !visibilityConfig.bank }); }}>
              <div className="d-flex align-items-center gap-2">
                <Landmark size={14} className="text-muted" /> 
                <span className={visibilityConfig.bank ? 'text-dark fw-medium' : 'text-muted'}>Banka İşlemleri</span>
              </div>
              {visibilityConfig.bank ? <Check size={14} className="text-primary" /> : <EyeOff size={14} className="text-muted opacity-30" />}
            </div>

            <div className="dropdown-item small rounded-2 py-2 d-flex align-items-center justify-content-between cursor-pointer" onClick={(e) => { e.stopPropagation(); updateVisibilityConfig({ finance: !visibilityConfig.finance }); }}>
              <div className="d-flex align-items-center gap-2">
                <TrendingUp size={14} className="text-muted" /> 
                <span className={visibilityConfig.finance ? 'text-dark fw-medium' : 'text-muted'}>Finans İşlemleri</span>
              </div>
              {visibilityConfig.finance ? <Check size={14} className="text-primary" /> : <EyeOff size={14} className="text-muted opacity-30" />}
            </div>

            <div className="dropdown-item small rounded-2 py-2 d-flex align-items-center justify-content-between cursor-pointer" onClick={(e) => { e.stopPropagation(); updateVisibilityConfig({ holidays: !visibilityConfig.holidays }); }}>
              <div className="d-flex align-items-center gap-2">
                <Flag size={14} className="text-muted" /> 
                <span className={visibilityConfig.holidays ? 'text-dark fw-medium' : 'text-muted'}>Resmi Tatiller (TR)</span>
              </div>
              {visibilityConfig.holidays ? <Check size={14} className="text-primary" /> : <EyeOff size={14} className="text-muted opacity-30" />}
            </div>
          </div>
        </div>
      </Collapse>

      <div className="dropdown-divider opacity-10 my-2"></div>

      {/* Tags Visibility Settings - Collapsible */}
      <div 
        className="dropdown-item rounded-2 d-flex align-items-center justify-content-between py-2 small cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setShowTagsSubmenu(!showTagsSubmenu); }}
      >
        <div className="d-flex align-items-center gap-2">
          <TagIcon size={14} className="text-muted" /> 
          <span>Listelenecek Etiketler</span>
          <button 
            type="button"
            className="btn btn-link p-0 ms-1 border-0 d-inline-flex align-items-center justify-content-center text-muted hover-text-primary transition-all"
            style={{ width: '20px', height: '20px', outline: 'none', boxShadow: 'none' }}
            onClick={toggleAllTagsFilter}
            title={isAllTagsSelected ? "Tüm Seçimleri Kaldır" : "Tümünü Seç"}
          >
            <CheckCheck size={14} className={isAllTagsSelected ? "text-primary fw-bold" : "opacity-50"} />
          </button>
        </div>
        <ChevronDown size={14} className="text-muted opacity-50 transition-all" style={{ transform: showTagsSubmenu ? 'rotate(180deg)' : 'none' }} />
      </div>
      
      <Collapse in={showTagsSubmenu}>
        <div className="px-1 py-1">
          <div className="bg-light bg-opacity-50 rounded-3 p-1 d-flex flex-column gap-1" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {allTags.map(tag => {
              const globalTag = globalNoteTags.find(gt => gt.name === tag);
              const isSelected = filters.tags.includes(tag);
              const tagStyle = getTagStyleByColor(globalTag?.color || 'Gray');
              return (
                <div 
                  key={tag} 
                  className="dropdown-item small rounded-2 py-2 d-flex align-items-center justify-content-between cursor-pointer" 
                  onClick={(e) => { e.stopPropagation(); toggleFilterTag(tag); }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span 
                      className="rounded-circle" 
                      style={{ 
                        width: '8px', 
                        height: '8px', 
                        backgroundColor: tagStyle.color || 'var(--text-muted)' 
                      }} 
                    /> 
                    <span className={isSelected ? 'text-dark fw-medium' : 'text-muted'}>{tag}</span>
                  </div>
                  {isSelected ? <Check size={14} className="text-primary" /> : <EyeOff size={14} className="text-muted opacity-30" />}
                </div>
              );
            })}
            {allTags.length === 0 && (
              <div className="text-muted small text-center py-2">Etiket bulunamadı</div>
            )}
          </div>
        </div>
      </Collapse>

      <div className="dropdown-divider opacity-10 my-2"></div>

      {/* View Mode Settings - Collapsible */}
      <div 
        className="dropdown-item rounded-2 d-flex align-items-center justify-content-between py-2 small cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setShowViewModeSubmenu(!showViewModeSubmenu); }}
      >
        <div className="d-flex align-items-center gap-2">
          <Layers size={14} className="text-muted" /> Listeleme Görünümü
        </div>
        <ChevronDown size={14} className="text-muted opacity-50 transition-all" style={{ transform: showViewModeSubmenu ? 'rotate(180deg)' : 'none' }} />
      </div>

      <Collapse in={showViewModeSubmenu}>
        <div className="px-1 py-1">
          <div className="bg-light bg-opacity-50 rounded-3 p-1 d-flex flex-column gap-1">
            <div className="dropdown-item small rounded-2 py-2 d-flex align-items-center justify-content-between cursor-pointer" onClick={(e) => { e.stopPropagation(); updateListMode('list'); }}>
              <div className="d-flex align-items-center gap-2">
                <ListIcon size={14} className="text-muted" /> 
                <span className={listMode === 'list' ? 'text-dark fw-bold' : 'text-muted'}>Liste</span>
              </div>
              {listMode === 'list' && <Check size={14} className="text-primary" />}
            </div>

            <div className="dropdown-item small rounded-2 py-2 d-flex align-items-center justify-content-between cursor-pointer" onClick={(e) => { e.stopPropagation(); updateListMode('stack'); }}>
              <div className="d-flex align-items-center gap-2">
                <Layers size={14} className="text-muted" /> 
                <span className={listMode === 'stack' ? 'text-dark fw-bold' : 'text-muted'}>Stack (Grupla)</span>
              </div>
              {listMode === 'stack' && <Check size={14} className="text-primary" />}
            </div>
          </div>
        </div>
      </Collapse>

      <div className="dropdown-divider opacity-10 my-2"></div>

      {/* Management - Collapsible */}
      <div 
        className="dropdown-item rounded-2 d-flex align-items-center justify-content-between py-2 small cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setShowManagementSubmenu(!showManagementSubmenu); }}
      >
        <div className="d-flex align-items-center gap-2">
          <Settings size={14} className="text-muted" /> Yönetim
        </div>
        <ChevronDown size={14} className="text-muted opacity-50 transition-all" style={{ transform: showManagementSubmenu ? 'rotate(180deg)' : 'none' }} />
      </div>

      <Collapse in={showManagementSubmenu}>
        <div className="px-1 py-1">
          <div className="bg-light bg-opacity-50 rounded-3 p-1 d-flex flex-column gap-1">
            <div className="dropdown-item small rounded-2 py-2 d-flex align-items-center justify-content-between cursor-pointer" onClick={() => setShowTagManager(true)}>
              <div className="d-flex align-items-center gap-2">
                <Hash size={14} className="text-muted" /> 
                <span className="fw-medium">Etiketleri Yönet</span>
              </div>
              <ChevronRight size={12} className="text-muted opacity-50" />
            </div>
          </div>
        </div>
      </Collapse>
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
            <button className={`toggle-btn ${viewMode === 'week' ? 'active' : ''}`} onClick={() => updateViewMode('week')}>Hafta</button>
            <button className={`toggle-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => updateViewMode('month')}>Ay</button>
            <button className={`toggle-btn ${viewMode === 'year' ? 'active' : ''}`} onClick={() => updateViewMode('year')}>Yıl</button>
            <button className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => updateViewMode('list')}>Liste</button>
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
                  {filteredSearchNotes.map(note => {
                    const today = new Date();
                    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    const isPast = note.date && note.date < todayStr;
                    return (
                      <div 
                        key={note.id} 
                        className={`search-result-item ${isPast ? 'is-past' : ''}`}
                        onClick={() => handleSearchItemClick(note)}
                      >
                        <div className="result-info">
                          <span className="result-title">{note.title || 'Başlıksız Not'}</span>
                          <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
                            <span className="result-date">
                              {new Date(note.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {note.tags && note.tags.length > 0 && (
                              <div className="d-flex flex-wrap gap-1 align-items-center ms-1">
                                {note.tags.map((t, idx) => {
                                  const globalTag = globalNoteTags.find(gt => gt.name === t);
                                  return (
                                    <span 
                                      key={idx} 
                                      style={{
                                        ...getTagStyleByColor(globalTag?.color || 'Blue'),
                                        fontSize: '9px',
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        lineHeight: '1',
                                        fontWeight: '600'
                                      }}
                                    >
                                      {t}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-muted opacity-50" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <Dropdown align="end" autoClose="outside">
            <Dropdown.Toggle as="button" type="button" className="btn btn-link p-0 text-decoration-none border-0 d-flex align-items-center gap-2 cursor-pointer dropdown-no-caret hover-bg-light rounded px-2 py-1" style={{ height: '36px' }}>
              <Settings size={16} className="text-muted" />
              <ChevronDown size={14} className="text-muted opacity-50" />
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

                <div className="filter-group">
                  <label>NOT RENKLERİ</label>
                  <div className="d-flex align-items-center gap-2 pt-1">
                    <div 
                      onClick={() => setFilters(f => ({ ...f, color: 'all' }))}
                      className={`cursor-pointer x-small fw-bold px-2 py-1 rounded-pill transition-all ${filters.color === 'all' ? 'bg-primary text-white shadow-sm' : 'bg-light text-muted opacity-75'}`}
                    >
                      Tümü
                    </div>
                    {Object.entries(NOTE_COLORS).map(([id, color]) => (
                      <div 
                        key={id}
                        onClick={() => setFilters(f => ({ ...f, color: id }))}
                        className={`cursor-pointer color-filter-dot transition-all ${filters.color === id ? 'active' : ''}`}
                        style={{ 
                          width: '20px', 
                          height: '20px', 
                          borderRadius: '50%', 
                          backgroundColor: color,
                          border: filters.color === id ? '2px solid white' : '1px solid rgba(0,0,0,0.1)',
                          boxShadow: filters.color === id ? `0 0 0 2px ${color}` : 'none',
                          transform: filters.color === id ? 'scale(1.1)' : 'scale(1)'
                        }}
                        title={id.charAt(0).toUpperCase() + id.slice(1)}
                      />
                    ))}
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
                        {stocks.filter(s => !(stockBalances[s.id] > 0)).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(s => (
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
                  {allTags.map(tag => {
                    const globalTag = globalNoteTags.find(gt => gt.name === tag);
                    const isSelected = filters.tags.includes(tag);
                    return (
                      <span 
                        key={tag} 
                        className={`cursor-pointer tag-filter-badge transition-all d-inline-flex align-items-center ${isSelected ? 'opacity-100 shadow-sm fw-bold border-primary' : 'opacity-60'}`}
                        style={{
                          ...getTagStyleByColor(globalTag?.color || 'Gray'),
                          border: isSelected ? '1px solid currentColor' : '1px solid transparent',
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)'
                        }}
                        onClick={() => toggleFilterTag(tag)}
                      >
                        {isSelected && <Check size={10} className="me-1" />}
                        {tag}
                      </span>
                    );
                  })}
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
                  {filteredSearchNotes.map(note => {
                    const today = new Date();
                    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    const isPast = note.date && note.date < todayStr;
                    return (
                      <div 
                        key={note.id} 
                        className={`search-result-item py-3 border-bottom ${isPast ? 'is-past' : ''}`}
                        onClick={() => handleSearchItemClick(note)}
                      >
                        <div className="result-info">
                          <span className="result-title fw-bold">{note.title || 'Başlıksız Not'}</span>
                          <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
                            <span className="result-date small text-muted">
                              {new Date(note.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {note.tags && note.tags.length > 0 && (
                              <div className="d-flex flex-wrap gap-1 align-items-center ms-1">
                                {note.tags.map((t, idx) => {
                                  const globalTag = globalNoteTags.find(gt => gt.name === t);
                                  return (
                                    <span 
                                      key={idx} 
                                      style={{
                                        ...getTagStyleByColor(globalTag?.color || 'Blue'),
                                        fontSize: '9px',
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        lineHeight: '1',
                                        fontWeight: '600'
                                      }}
                                    >
                                      {t}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-muted" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </Collapse>

      <div className={`notes-content d-flex flex-column ${viewMode === 'list' ? 'is-list-view' : ''}`}>
        {viewMode === null && (
          <div className="flex-grow-1 d-flex align-items-center justify-content-center opacity-50">
            <div className="spinner-border spinner-border-sm me-2" role="status"></div>
            <span className="small fw-bold">Yükleniyor...</span>
          </div>
        )}
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
        {viewMode === 'list' && renderListView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'year' && renderYearView()}
        
        <div className="d-none d-lg-block w-100">
          {viewMode === 'month' && renderMonthView()}
        </div>
      </div>

      <Modal 
        show={showModal} 
        onHide={() => {
          setShowModal(false);
          setIsExpanded(false);
        }} 
        centered={!isExpanded} 
        className={`notion-modal mobile-fullscreen-modal ${isExpanded ? 'is-expanded' : ''}`} 
        backdropClassName="notion-modal-backdrop"
        size={isExpanded ? 'xl' : 'lg'}
        enforceFocus={false}
      >
        <div className="notes-modal-header-container">
          <div className="modal-title-date">
            <CalendarIcon size={16} className="text-primary flex-shrink-0" />
            <div 
              className="position-relative d-inline-flex align-items-center cursor-pointer"
              onClick={() => dateInputRef.current && dateInputRef.current.showPicker()}
            >
              <span 
                className="fw-bold fs-15 text-dark text-truncate hover-text-primary transition-all p-1 px-2 rounded hover-bg-light d-flex align-items-center gap-1"
                style={{ border: '1px solid transparent' }}
              >
                {selectedDate && `${selectedDate.getDate()} ${TR_MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`}
                <ChevronDown size={14} className="opacity-50" />
              </span>
              <input 
                type="date"
                ref={dateInputRef}
                className="position-absolute opacity-0 w-100 h-100 cursor-pointer"
                style={{ left: 0, top: 0, zIndex: 10, border: 'none', outline: 'none' }}
                value={selectedDate ? new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-');
                    setSelectedDate(new Date(y, m - 1, d));
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
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

            <Dropdown>
              <Dropdown.Toggle as="div" className="p-0 border-0 bg-transparent shadow-none dropdown-no-caret">
                <Button 
                  variant="link" 
                  className={`p-0 d-flex align-items-center justify-content-center transition-all ${isRecurring ? 'text-primary' : 'text-muted opacity-50'}`} 
                  style={{ width: '32px', height: '32px' }}
                  title="Tekrar Eden Not"
                >
                  <Repeat size={18} />
                </Button>
              </Dropdown.Toggle>
              <Dropdown.Menu className="glass-card shadow-lg border-0 p-3 mt-2 animate-fade-in" style={{ minWidth: '240px' }}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <span className="fw-bold fs-13">Tekrar Ayarları</span>
                  <Form.Check 
                    type="switch" 
                    id="recurring-switch"
                    checked={tempIsRecurring}
                    onChange={(e) => handleRecurringToggle(e.target.checked)}
                  />
                </div>
                
                {tempIsRecurring && (
                  <div className="animate-fade-in">
                    <Form.Group className="mb-3">
                      <Form.Label className="x-small fw-bold opacity-50 text-uppercase mb-2">SIKLIK</Form.Label>
                      <div className="d-grid gap-1">
                        {[
                          { id: 'daily', label: 'Her Gün' },
                          { id: 'weekly', label: 'Her Hafta' },
                          { id: 'monthly', label: 'Her Ay' },
                          { id: 'yearly', label: 'Her Yıl' }
                        ].map(type => (
                          <div 
                            key={type.id}
                            className={`p-2 px-3 rounded cursor-pointer fs-12 transition-all d-flex align-items-center justify-content-between ${tempRecurringType === type.id ? 'bg-primary bg-opacity-10 text-primary fw-bold' : 'hover-bg-light text-muted'}`}
                            onClick={() => setTempRecurringType(type.id)}
                          >
                            {type.label}
                            {tempRecurringType === type.id && <Check size={12} />}
                          </div>
                        ))}
                      </div>
                    </Form.Group>

                    <Form.Group className="mb-1">
                      <Form.Label className="x-small fw-bold opacity-50 text-uppercase mb-2">BİTİŞ TARİHİ</Form.Label>
                      <Form.Control 
                        type="date" 
                        size="sm"
                        className="bg-light border-0 fs-12"
                        value={tempRecurringEndDate}
                        min={selectedDate ? formatIdDate(selectedDate) : ''}
                        onChange={(e) => setTempRecurringEndDate(e.target.value)}
                      />
                    </Form.Group>
                    <div className="x-small text-muted opacity-50 mt-1">
                      * Bu serideki tüm notlar (renk hariç) senkronize edilecektir.
                    </div>
                    <div className="d-grid mt-3">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="text-white fw-bold py-1.5"
                        onClick={() => handleSaveRecursion(tempIsRecurring, tempRecurringType, tempRecurringEndDate)}
                      >
                        Kaydet
                      </Button>
                    </div>
                    <div className="x-small text-muted text-center mt-2 fw-medium">
                      Bu not {getRecurringCount()} kez tekrar edilecek.
                    </div>
                  </div>
                )}
              </Dropdown.Menu>
            </Dropdown>

            {editingNote && (
              <Button variant="link" className="text-danger p-0 d-flex align-items-center justify-content-center opacity-75 hover-opacity-100" onClick={() => handleDeleteNote()} style={{ width: '32px', height: '32px' }}>
                <Trash2 size={18} />
              </Button>
            )}

            <Button 
              variant="link" 
              className="text-muted p-0 d-none d-lg-flex align-items-center justify-content-center opacity-75 hover-opacity-100" 
              onClick={() => setIsExpanded(!isExpanded)} 
              style={{ width: '32px', height: '32px' }}
            >
              {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </Button>

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
              <div className="ms-auto d-flex gap-2">
                {[
                  { id: 'blue', color: NOTE_COLORS.blue },
                  { id: 'red', color: NOTE_COLORS.red },
                  { id: 'green', color: NOTE_COLORS.green },
                  { id: 'yellow', color: NOTE_COLORS.yellow }
                ].map(c => (
                  <div 
                    key={c.id}
                    onClick={() => setNoteColor(c.id)}
                    className={`color-picker-dot ${noteColor === c.id ? 'active' : ''}`}
                    style={{ 
                      width: '14px', 
                      height: '14px', 
                      borderRadius: '50%', 
                      backgroundColor: c.color,
                      cursor: 'pointer',
                      border: noteColor === c.id ? '2px solid white' : 'none',
                      boxShadow: noteColor === c.id ? '0 0 0 1px #ccc' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                    title={c.id.charAt(0).toUpperCase() + c.id.slice(1)}
                  />
                ))}
              </div>
            </div>
            <div className="position-relative w-100">
              <Form.Control 
                type="text"
                placeholder="Not başlığı girin..."
                className="notion-title-input border-0 bg-transparent p-0 fs-20 fw-bold w-100"
                value={noteTitle}
                onChange={(e) => {
                  setNoteTitle(e.target.value);
                  setShowSimilarNotes(true);
                }}
                onFocus={() => setShowSimilarNotes(true)}
                onBlur={() => setTimeout(() => setShowSimilarNotes(false), 200)}
                onKeyDown={handleTitleKeyDown}
              />
              
              {similarNotes.length > 0 && showSimilarNotes && (
                <div 
                  className="glass-card shadow-lg w-100 p-1 mt-2 animate-fade-in position-absolute" 
                  style={{ 
                    maxHeight: '300px', 
                    overflowY: 'auto', 
                    zIndex: 1060,
                    top: '100%',
                    left: 0
                  }}
                >
                  <div className="text-muted x-small fw-bold px-3 py-2 opacity-50 border-bottom mb-1">VAROLAN BAŞLIKLAR</div>
                  {similarNotes.map(note => (
                    <div 
                      key={note.id} 
                      className="suggestion-item p-2 px-3 rounded cursor-pointer fs-13 d-flex align-items-center gap-3 border-0 bg-transparent" 
                      onClick={() => {
                        setNoteTitle(note.title);
                        setNoteTags(note.tags || []);
                        setNoteColor(note.color || 'blue');
                        setShowSimilarNotes(false);
                      }}
                    >
                      <div 
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          backgroundColor: NOTE_COLORS[note.color || 'blue'],
                          flexShrink: 0 
                        }} 
                      />
                      <div className="d-flex flex-column min-width-0">
                        <span className="fw-bold text-dark text-truncate" style={{ lineHeight: '1.2' }}>{note.title}</span>
                        <span className="text-muted x-small opacity-75">{formatDisplayDate(note.date, 'dots')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Form.Group>

          <Form.Group className="mb-4">
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
                  onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                  style={{ outline: 'none', fontSize: '14px' }}
                />
                
                {filteredSuggestions.length > 0 && showTagSuggestions && (
                  <div 
                    className="glass-card shadow-lg w-100 p-1 animate-fade-in position-absolute" 
                    style={{ 
                      maxHeight: '200px', 
                      overflowY: 'auto',
                      top: '100%',
                      left: 0,
                      marginTop: '8px',
                      zIndex: 1060
                    }}
                  >
                    <div className="px-2 py-1 text-muted x-small fw-bold opacity-50 border-bottom mb-1">VAROLAN ETİKETLER</div>
                    {filteredSuggestions.map((tagName, idx) => {
                      const globalTag = globalNoteTags.find(gt => gt.name === tagName);
                      return (
                        <div 
                          key={idx} 
                          className="suggestion-item p-2 rounded cursor-pointer border-0 bg-transparent" 
                          onClick={() => addTag(tagName)}
                        >
                          <span style={getTagStyleByColor(globalTag?.color || 'Blue')} className="px-2 py-1 rounded shadow-xs fs-13 fw-medium">
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

          <Form.Group className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2 bg-transparent py-2 px-1">
              <div className="d-flex align-items-center gap-2">
                <AlignLeft size={14} className="text-muted" />
                <Form.Label className="text-muted small fw-bold mb-0 uppercase-tracking">İÇERİK</Form.Label>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button 
                  type="button" 
                  className="btn btn-link p-1 text-muted hover-text-primary border-0 shadow-none transition-all d-flex align-items-center gap-1" 
                  onClick={handleUndo} 
                  title="Geri Al"
                >
                  <Undo size={14} />
                  <span className="fs-12 fw-medium d-inline d-md-none">Geri</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-link p-1 text-muted hover-text-primary border-0 shadow-none transition-all d-flex align-items-center gap-1" 
                  onClick={handleRedo} 
                  title="İleri Al"
                >
                  <Redo size={14} />
                  <span className="fs-12 fw-medium d-inline d-md-none">İleri</span>
                </button>
              </div>
            </div>
            <div 
              ref={contentInputRef}
              contentEditable={true}
              onClick={handleEditorClick}
              onInput={(e) => {
                setNoteText(e.currentTarget.innerHTML);
                checkActiveFormats();
              }}
              onKeyUp={() => {
                checkActiveFormats();
                handleTextSelection();
              }}
              onMouseUp={() => {
                checkActiveFormats();
                handleTextSelection();
              }}
              onBlur={() => {
                if (linkEditorShowRef.current) return; // Prevent closing when link editor is open and focused
                // Delay hiding to allow clicking toolbar buttons
                setTimeout(() => {
                  if (!document.activeElement?.closest('.floating-format-toolbar')) {
                    setFloatingToolbar(prev => ({ ...prev, show: false }));
                  }
                }, 200);
              }}
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
        </Modal.Body>
      </Modal>

      {/* Floating Formatting Toolbar */}
      {floatingToolbar.show && createPortal(
        <div 
          className="floating-format-toolbar glass-card shadow-lg animate-scale-in"
          style={{ 
            position: 'absolute',
            top: `${floatingToolbar.y}px`,
            left: `${floatingToolbar.x}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 11000, // Above modal
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            borderRadius: '12px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.95))',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--glass-border, rgba(0,0,0,0.1))',
            padding: '4px',
            pointerEvents: 'auto',
            minWidth: linkEditor.show ? '280px' : 'auto',
            transition: 'all 0.2s ease-in-out'
          }}
          onMouseDown={(e) => {
            const target = e.target;
            if (target.tagName !== 'INPUT') {
              e.preventDefault();
            }
          }}
        >
          {/* Main Toolbar Buttons */}
          <div className="d-flex align-items-center gap-1 w-100 flex-nowrap" style={{ padding: '2px' }}>
            <button type="button" className={`btn btn-link p-2 border-0 shadow-none rounded-pill transition-all ${activeFormats.p ? 'text-primary bg-primary bg-opacity-10' : 'text-muted hover-bg-light'}`} onClick={() => applyFormatting('p')} title="Paragraf">
              <Pilcrow size={16} />
            </button>
            <button type="button" className={`btn btn-link p-2 border-0 shadow-none rounded-pill transition-all ${activeFormats.h1 ? 'text-primary bg-primary bg-opacity-10' : 'text-muted hover-bg-light'}`} onClick={() => applyFormatting('h1')} title="Başlık 1">
              <Heading1 size={16} />
            </button>
            <button type="button" className={`btn btn-link p-2 border-0 shadow-none rounded-pill transition-all ${activeFormats.h2 ? 'text-primary bg-primary bg-opacity-10' : 'text-muted hover-bg-light'}`} onClick={() => applyFormatting('h2')} title="Başlık 2">
              <Heading2 size={16} />
            </button>
            <button type="button" className={`btn btn-link p-2 border-0 shadow-none rounded-pill transition-all ${activeFormats.h3 ? 'text-primary bg-primary bg-opacity-10' : 'text-muted hover-bg-light'}`} onClick={() => applyFormatting('h3')} title="Başlık 3">
              <Heading3 size={16} />
            </button>
            
            <div className="vr mx-1 my-auto opacity-10" style={{ height: '20px' }} />

            <button type="button" className={`btn btn-link p-2 border-0 shadow-none rounded-pill transition-all ${activeFormats.bold ? 'text-primary bg-primary bg-opacity-10' : 'text-muted hover-bg-light'}`} onClick={() => applyFormatting('bold')} title="Kalın">
              <Bold size={16} />
            </button>
            <button type="button" className={`btn btn-link p-2 border-0 shadow-none rounded-pill transition-all ${activeFormats.italic ? 'text-primary bg-primary bg-opacity-10' : 'text-muted hover-bg-light'}`} onClick={() => applyFormatting('italic')} title="İtalik">
              <Italic size={16} />
            </button>
            <button type="button" className={`btn btn-link p-2 border-0 shadow-none rounded-pill transition-all ${activeFormats.underline ? 'text-primary bg-primary bg-opacity-10' : 'text-muted hover-bg-light'}`} onClick={() => applyFormatting('underline')} title="Altı Çizili">
              <Underline size={16} />
            </button>
            <button type="button" className={`btn btn-link p-2 border-0 shadow-none rounded-pill transition-all ${activeFormats.strikethrough ? 'text-primary bg-primary bg-opacity-10' : 'text-muted hover-bg-light'}`} onClick={() => applyFormatting('strikethrough')} title="Üstü Çizili">
              <Strikethrough size={16} />
            </button>

            <div className="vr mx-1 my-auto opacity-10" style={{ height: '20px' }} />

            {/* Link Edit Button */}
            <button 
              type="button" 
              className={`btn btn-link p-2 border-0 shadow-none rounded-pill transition-all ${linkEditor.show ? 'text-primary bg-primary bg-opacity-10' : 'text-muted hover-bg-light'}`} 
              onClick={handleOpenLinkEditor} 
              title="Bağlantı Ekle"
            >
              <Link2 size={16} />
            </button>

            <div className="vr mx-1 my-auto opacity-10" style={{ height: '20px' }} />

            <button type="button" className={`btn btn-link p-2 border-0 shadow-none rounded-pill transition-all ${activeFormats.ul ? 'text-primary bg-primary bg-opacity-10' : 'text-muted hover-bg-light'}`} onClick={() => applyFormatting('ul')} title="Noktalı Liste">
              <List size={16} />
            </button>
            <button type="button" className={`btn btn-link p-2 border-0 shadow-none rounded-pill transition-all ${activeFormats.ol ? 'text-primary bg-primary bg-opacity-10' : 'text-muted hover-bg-light'}`} onClick={() => applyFormatting('ol')} title="Numaralı Liste">
              <ListOrdered size={16} />
            </button>
            <button type="button" className={`btn btn-link p-2 border-0 shadow-none rounded-pill transition-all ${activeFormats.quote ? 'text-primary bg-primary bg-opacity-10' : 'text-muted hover-bg-light'}`} onClick={() => applyFormatting('quote')} title="Alıntı">
              <Quote size={16} />
            </button>
          </div>

          {/* Collapsible Link Form */}
          {linkEditor.show && (
            <div className="border-top w-100 p-2 d-flex flex-column gap-2 animate-slide-up" style={{ borderColor: 'rgba(0,0,0,0.08)' }} onMouseDown={(e) => e.stopPropagation()}>
              <div className="d-flex flex-column gap-1">
                <label className="text-muted fw-bold" style={{ fontSize: '10px' }}>Metin</label>
                <input 
                  type="text" 
                  className="form-control form-control-sm border shadow-none" 
                  style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px' }}
                  value={linkEditor.text}
                  onChange={(e) => setLinkEditor(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Metin..."
                />
              </div>
              <div className="d-flex flex-column gap-1">
                <label className="text-muted fw-bold" style={{ fontSize: '10px' }}>URL</label>
                <div className="d-flex align-items-center gap-1">
                  <input 
                    type="text" 
                    className="form-control form-control-sm border shadow-none flex-grow-1" 
                    style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '6px' }}
                    value={linkEditor.url}
                    onChange={(e) => setLinkEditor(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveLink(e);
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-light btn-xs p-1 d-flex align-items-center justify-content-center border"
                    style={{ width: '26px', height: '26px', borderRadius: '6px' }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        setLinkEditor(prev => ({ ...prev, url: text }));
                      } catch (err) {
                        console.error('Clipboard read failed:', err);
                      }
                    }}
                    title="Yapıştır"
                  >
                    <Clipboard size={12} className="text-muted" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-light btn-xs p-1 d-flex align-items-center justify-content-center border"
                    style={{ width: '26px', height: '26px', borderRadius: '6px' }}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(linkEditor.url);
                      } catch (err) {
                        console.error('Clipboard write failed:', err);
                      }
                    }}
                    title="Kopyala"
                  >
                    <Copy size={12} className="text-muted" />
                  </button>
                </div>
              </div>
              <div className="d-flex align-items-center justify-content-end gap-2 mt-1">
                <button 
                  type="button" 
                  className="btn btn-light btn-xs text-muted border py-1 px-2 rounded-2 fs-11"
                  onClick={() => setLinkEditor({ show: false, text: '', url: '', range: null, element: null })}
                >
                  İptal
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary btn-xs text-white py-1 px-3 rounded-2 fs-11"
                  onClick={handleSaveLink}
                >
                  Kaydet
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Link Popup Tooltip */}
      {linkPopup.show && createPortal(
        <div 
          className="link-preview-popup glass-card shadow animate-scale-in"
          style={{ 
            position: 'absolute',
            top: `${linkPopup.y}px`,
            left: `${linkPopup.x}px`,
            transform: 'translateX(-50%)',
            zIndex: 11050, // Above floating toolbar slightly
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderRadius: '8px',
            background: 'var(--glass-bg, rgba(255, 255, 255, 0.98))',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--glass-border, rgba(0,0,0,0.1))',
            padding: '6px 10px',
            pointerEvents: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span 
            className="text-truncate text-muted me-2" 
            style={{ 
              maxWidth: '180px', 
              fontSize: '11px',
              fontWeight: '500',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
            onClick={handleOpenLinkInNewTab}
            title={linkPopup.url}
          >
            {linkPopup.url.replace(/^https?:\/\//, '')}
          </span>
          
          <div className="vr opacity-10" style={{ height: '14px' }} />
          
          <button 
            type="button" 
            className="btn btn-link p-1 text-primary hover-bg-light rounded d-flex align-items-center justify-content-center border-0 shadow-none"
            onClick={handleOpenLinkInNewTab}
            title="Yeni Sekmede Aç"
            style={{ width: '22px', height: '22px' }}
          >
            <ExternalLink size={12} />
          </button>
          
          <button 
            type="button" 
            className="btn btn-link p-1 text-dark hover-bg-light rounded d-flex align-items-center justify-content-center border-0 shadow-none"
            onClick={handleEditLinkFromPopup}
            title="Düzenle"
            style={{ width: '22px', height: '22px' }}
          >
            <Edit2 size={12} className="opacity-75" />
          </button>
          
          <button 
            type="button" 
            className="btn btn-link p-1 text-danger hover-bg-danger-subtle rounded d-flex align-items-center justify-content-center border-0 shadow-none"
            onClick={handleUnlink}
            title="Bağlantıyı Kaldır"
            style={{ width: '22px', height: '22px' }}
          >
            <Trash2 size={12} />
          </button>
        </div>,
        document.body
      )}

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

      {/* Recurring Deletion Options Modal */}
      <Modal 
        show={showRecurringDeleteModal} 
        onHide={() => {
          if (activeRecurringDeleteAction === null) {
            setShowRecurringDeleteModal(false);
            setTempIsRecurring(isRecurring);
          }
        }} 
        className="notion-modal" 
        backdropClassName="notion-modal-backdrop"
        size="md"
      >
        <Modal.Header className="border-0 pb-0 pt-4 px-4">
          <Modal.Title className="fs-15 fw-bold text-dark d-flex align-items-center gap-2">
            <Repeat size={18} className="text-primary" />
            Tekrarı Kapat
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3 px-4 pb-4">
          <p className="text-muted fs-13 mb-4">Bu not bir tekrar serisinin parçası. Seriyi nasıl düzenlemek istersiniz?</p>
          <div className="d-flex flex-column gap-2">
            {/* Button 1: Sadece bu notu ayır */}
            <div 
              className={`recurring-action-card d-flex align-items-start gap-3 p-3 rounded-3 cursor-pointer transition-all border ${activeRecurringDeleteAction !== null ? 'disabled' : 'hover-bg-light'}`}
              onClick={() => activeRecurringDeleteAction === null && triggerDeleteAction('unlink')}
              style={{ 
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.06)', 
                background: 'rgba(0, 111, 238, 0.02)', 
                transition: 'all 0.2s',
                pointerEvents: activeRecurringDeleteAction !== null ? 'none' : 'auto'
              }}
            >
              {activeRecurringDeleteAction === 'unlink' && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    bottom: 0, 
                    width: `${actionProgress}%`, 
                    background: 'rgba(0, 111, 238, 0.12)', 
                    zIndex: 0,
                    transition: 'width 0.04s linear'
                  }} 
                />
              )}
              <div className="d-flex align-items-start gap-3 w-100" style={{ position: 'relative', zIndex: 1 }}>
                <div className="action-icon-wrapper rounded-circle p-2 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                  <Scissors size={18} />
                </div>
                <div className="d-flex flex-column text-start">
                  <span className="fw-bold fs-13 text-dark">Sadece bu notu ayır</span>
                  <span className="text-muted mt-1" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                    <strong>not:</strong> Bu buton mevcut notun tekrar eden önceki ve sonraki tümünü siler. Sadece şuanki notu bırakır geriye.
                  </span>
                </div>
              </div>
            </div>

            {/* Button 2: Bundan sonraki günleri sil */}
            <div 
              className={`recurring-action-card d-flex align-items-start gap-3 p-3 rounded-3 cursor-pointer transition-all border ${activeRecurringDeleteAction !== null ? 'disabled' : 'hover-bg-light'}`}
              onClick={() => activeRecurringDeleteAction === null && triggerDeleteAction('future')}
              style={{ 
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.06)', 
                background: 'rgba(220, 53, 69, 0.01)', 
                transition: 'all 0.2s',
                pointerEvents: activeRecurringDeleteAction !== null ? 'none' : 'auto'
              }}
            >
              {activeRecurringDeleteAction === 'future' && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    bottom: 0, 
                    width: `${actionProgress}%`, 
                    background: 'rgba(220, 53, 69, 0.12)', 
                    zIndex: 0,
                    transition: 'width 0.04s linear'
                  }} 
                />
              )}
              <div className="d-flex align-items-start gap-3 w-100" style={{ position: 'relative', zIndex: 1 }}>
                <div className="action-icon-wrapper rounded-circle p-2 d-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                  <CalendarOff size={18} />
                </div>
                <div className="d-flex flex-column text-start">
                  <span className="fw-bold fs-13 text-danger">Bundan sonraki günleri sil</span>
                  <span className="text-muted mt-1" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                    <strong>not:</strong> mevcut önceki ve şuanki not hariç sonraki günleri siler.
                  </span>
                </div>
              </div>
            </div>

            {/* Button 3: Bundan önceki günleri sil */}
            <div 
              className={`recurring-action-card d-flex align-items-start gap-3 p-3 rounded-3 cursor-pointer transition-all border ${activeRecurringDeleteAction !== null ? 'disabled' : 'hover-bg-light'}`}
              onClick={() => activeRecurringDeleteAction === null && triggerDeleteAction('past')}
              style={{ 
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.06)', 
                background: 'rgba(220, 53, 69, 0.01)', 
                transition: 'all 0.2s',
                pointerEvents: activeRecurringDeleteAction !== null ? 'none' : 'auto'
              }}
            >
              {activeRecurringDeleteAction === 'past' && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    bottom: 0, 
                    width: `${actionProgress}%`, 
                    background: 'rgba(220, 53, 69, 0.12)', 
                    zIndex: 0,
                    transition: 'width 0.04s linear'
                  }} 
                />
              )}
              <div className="d-flex align-items-start gap-3 w-100" style={{ position: 'relative', zIndex: 1 }}>
                <div className="action-icon-wrapper rounded-circle p-2 d-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                  <Trash2 size={18} />
                </div>
                <div className="d-flex flex-column text-start">
                  <span className="fw-bold fs-13 text-danger">Bundan önceki günleri sil</span>
                  <span className="text-muted mt-1" style={{ fontSize: '11px', lineHeight: '1.4' }}>
                    <strong>not:</strong> mevcut sonraki ve şuanki not hariç önceki günleri siler.
                  </span>
                </div>
              </div>
            </div>

            {/* Button 4: Tüm tekrar edenleri sil */}
            <div 
              className={`recurring-action-card d-flex align-items-start gap-3 p-3 rounded-3 cursor-pointer transition-all border ${activeRecurringDeleteAction !== null ? 'disabled' : 'hover-bg-light'}`}
              onClick={() => activeRecurringDeleteAction === null && triggerDeleteAction('all')}
              style={{ 
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(220, 53, 69, 0.1)', 
                background: 'rgba(220, 53, 69, 0.03)', 
                transition: 'all 0.2s',
                pointerEvents: activeRecurringDeleteAction !== null ? 'none' : 'auto'
              }}
            >
              {activeRecurringDeleteAction === 'all' && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    bottom: 0, 
                    width: `${actionProgress}%`, 
                    background: 'rgba(220, 53, 69, 0.2)', 
                    zIndex: 0,
                    transition: 'width 0.04s linear'
                  }} 
                />
              )}
              <div className="d-flex align-items-start gap-3 w-100" style={{ position: 'relative', zIndex: 1 }}>
                <div className="action-icon-wrapper rounded-circle p-2 d-flex align-items-center justify-content-center bg-danger text-white" style={{ width: '36px', height: '36px', flexShrink: 0 }}>
                  <XCircle size={18} />
                </div>
                <div className="d-flex flex-column text-start">
                  <span className="fw-bold fs-13 text-danger">Tüm Tekrar edenleri sil</span>
                  <span className="text-danger mt-1" style={{ fontSize: '11px', lineHeight: '1.4', opacity: 0.85 }}>
                    <strong>not:</strong> tekrar eden tüm notları siler.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 pb-4 px-4">
          <Button variant="link" className="text-muted fs-13 w-100 text-decoration-none" onClick={() => {
            if (activeRecurringDeleteAction === null) {
              setShowRecurringDeleteModal(false);
              setTempIsRecurring(isRecurring);
            }
          }}>İptal</Button>
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

        .notes-content { flex-grow: 1; display: flex; z-index: 1; }
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
        [data-theme="dark"] .calendar-header-cell { border-right-color: rgba(255, 255, 255, 0.15); }
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
          background: var(--glass-bg) !important;
          box-sizing: border-box !important;
        }
        [data-theme="dark"] .calendar-day-cell { border-right: 1px solid rgba(255,255,255,0.1) !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
        [data-theme="dark"] .calendar-day-cell.today { background: rgba(62, 100, 255, 0.08) !important; }
        .calendar-day-cell.today { background: rgba(62, 100, 255, 0.06) !important; }
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
        .calendar-day-cell.today .day-number { color: white; background: var(--primary-color); width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin-top: -4px; margin-left: -4px; box-shadow: 0 2px 8px rgba(62, 100, 255, 0.4); border: 2px solid white; }
        .day-content { flex-grow: 1; overflow: unset !important; scrollbar-width: none; -ms-overflow-style: none; }
        .day-content::-webkit-scrollbar { display: none; }
        .day-note-preview { display: flex; align-items: center; gap: 8px; padding: 1px !important; border-radius: 6px; margin-bottom: 4px; background: rgba(62, 100, 255, 0.05); transition: all 0.2s; border: 1px solid transparent; flex-shrink: 0; position: relative !important; overflow: visible !important; }
        .day-note-preview:hover { background: rgba(62, 100, 255, 0.1); border-color: rgba(62, 100, 255, 0.1); }
        .day-note-preview.bank-item { background: rgba(255, 77, 77, 0.1); }
        .day-note-preview.bank-item .note-text-dot { background: #ff4d4d; }
        .day-note-preview.finance-item { background: rgba(40, 167, 69, 0.1); }
        .day-note-preview.finance-item .note-text-dot { background: #28a745; }
        .item-type-badge { font-size: 8px; text-transform: uppercase; padding: 1px 4px; border-radius: 3px; background: rgba(0,0,0,0.05); }
        .day-note-preview .holiday-flag { position: absolute !important; top: -5px !important; left: -3px !important; z-index: 2; background: white; padding: 1px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
        [data-theme="dark"] .day-note-preview .holiday-flag { background: #1e1e26; border-color: rgba(255,255,255,0.15); }
        .day-note-preview .bank-logo-img { position: absolute !important; top: -3px !important; left: -3px !important; width: 12px !important; height: 12px !important; object-fit: contain; z-index: 2; background: white; padding: 1px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
        [data-theme="dark"] .day-note-preview .bank-logo-img { background: #1e1e26; border-color: rgba(255,255,255,0.15); }
        
        .week-note-card.bank-card { border-left-color: #ff4d4d !important; background: rgba(255, 77, 77, 0.05); }
        .week-note-card.finance-card { border-left-color: #28a745 !important; background: rgba(40, 167, 69, 0.05); }
        .fs-9 { font-size: 9px !important; }

        .note-text-dot { background: var(--primary-color); flex-shrink: 0; }
        .note-text-snippet { font-size: 10px; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4; }
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
        .mobile-month-title h2 { font-size: 32px !important; color: var(--text-main); }
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
        }

        /* Expanded Modal on Desktop */
        .notion-modal.is-expanded.modal {
          padding: 0 !important;
        }

        .notion-modal.is-expanded .modal-dialog {
          margin: 0 !important;
          margin-left: auto !important;
          width: calc(100% - var(--sidebar-width)) !important;
          max-width: none !important;
          height: 100% !important;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Sidebar kapalıyken (collapsed: true) genişliği ayarla */
        html[data-sidebar-collapsed="true"] .notion-modal.is-expanded .modal-dialog {
          width: calc(100% - var(--sidebar-collapsed-width)) !important;
        }
        
        .notion-modal.is-expanded .modal-content {
          height: 100% !important;
          border-radius: 0 !important;
          border: none !important;
          border-left: 1px solid var(--glass-border) !important;
          display: flex;
          flex-direction: column;
        }

        .notion-modal.is-expanded .modal-body {
          flex: 1;
          overflow-y: auto;
        }


          .notes-modal-header-container {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            flex-wrap: nowrap !important;
            padding: 12px 16px !important;
            background: var(--glass-bg) !important;
            position: sticky !important;
            top: 0 !important;
            z-index: 1050 !important;
            width: 100% !important;
            border-bottom: 1px solid var(--glass-border) !important;
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
            background-color: rgba(0,0,0,0.05) !important;
            color: var(--text-muted) !important;
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
        [data-theme="dark"] .notion-title-input, 
        [data-theme="dark"] .notion-text-input { 
          background: transparent !important; 
          color: #ffffff !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        [data-theme="dark"] .notion-title-input::placeholder,
        [data-theme="dark"] .notion-text-input::placeholder {
          color: rgba(255,255,255,0.3) !important;
        }
        [data-theme="dark"] .glass-card { 
          background: rgba(30,30,30,0.4) !important; 
          border-color: rgba(255,255,255,0.08) !important; 
        }
        [data-theme="dark"] .format-toolbar { 
          background: transparent !important; 
          border: 1px solid rgba(255,255,255,0.1) !important;
          backdrop-filter: none !important;
        }
        [data-theme="dark"] .format-btn { color: rgba(255,255,255,0.6); }
        [data-theme="dark"] .format-btn:hover { background: rgba(255,255,255,0.05); color: #fff; }
        [data-theme="dark"] .format-btn.active { background: rgba(62, 100, 255, 0.2); color: #4dabff; }
        [data-theme="dark"] .uppercase-tracking { color: rgba(255,255,255,0.4) !important; }
        [data-theme="dark"] .btn-light { background: rgba(255,255,255,0.05); border: none; color: #ccc; }
        [data-theme="dark"] .btn-light:hover { background: rgba(255,255,255,0.1); color: #fff; }
        [data-theme="dark"] .tags-input-container { 
          background: transparent !important; 
          border: 1px solid rgba(255,255,255,0.1) !important; 
        }
        [data-theme="dark"] .tags-input-container input { color: #ffffff !important; background: transparent !important; }
        [data-theme="dark"] .notion-dropdown-menu { background: #1a1a1a !important; border-color: rgba(255,255,255,0.1) !important; }
        [data-theme="dark"] .sticky-content-toolbar { 
          background: transparent !important; 
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }

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
            background: var(--glass-bg) !important;
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
            background: var(--glass-bg) !important;
            border-bottom: 1px solid var(--glass-border) !important;
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
            position: relative !important;
            height: calc(100vh - 120px) !important;
            overflow-y: auto !important;
            padding-bottom: 100px !important;
          }

          .year-section {
            margin-bottom: 60px !important;
          }

          .year-divider h2 {
            font-family: 'Inter', sans-serif !important;
            color: var(--text-main) !important;
            margin-bottom: 0 !important;
          }

          .year-view-grid-v2 {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 24px !important;
            padding: 20px !important;
            background: var(--glass-bg) !important;
          }

          .mini-month-v2 {
            cursor: pointer !important;
            padding: 10px !important;
          }

          .mini-month-title-v2 {
            font-size: 24px !important;
            font-weight: 800 !important;
            margin-bottom: 12px !important;
            color: var(--text-main) !important;
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
            background-color: rgba(0,0,0,0.02) !important;
            color: #888 !important;
          }

          .mini-day-v2 {
            position: relative !important;
            font-size: 11px !important;
            text-align: center !important;
            padding: 2px 0 6px 0 !important;
            color: var(--text-main) !important;
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

          .note-dot { background-color: #3498db; }
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
            .notion-text-input {
              padding: 10px !important;
              border: 0 !important;
              background: transparent !important;
            }
          }
          
          [data-theme="dark"] .active-day-highlight .week-day-number {
            color: #007bff !important;
            font-weight: 800 !important;
          }

          /* Dark Mode Overrides for V2 and Mobile components */
          [data-theme="dark"] .mobile-week-day-col { background: #1a1a1a !important; border-right-color: rgba(255,255,255,0.05) !important; }
          [data-theme="dark"] .mobile-week-header, 
          [data-theme="dark"] .mobile-month-days-header { background: #222 !important; border-bottom-color: rgba(255,255,255,0.05) !important; }
          [data-theme="dark"] .year-view-grid-v2 { background: #121212 !important; }
          [data-theme="dark"] .mini-month-title-v2 { color: #fff !important; }
          [data-theme="dark"] .mini-day-v2 { color: #ccc !important; }
          [data-theme="dark"] .mini-day-v2.weekend-cell { background-color: rgba(255,255,255,0.02) !important; color: #666 !important; }
          [data-theme="dark"] .year-divider h2 { color: #fff !important; }
          [data-theme="dark"] .mobile-month-title h2 { color: #fff !important; }
          [data-theme="dark"] .notes-modal-header-container { background: #1a1a1a !important; border-bottom-color: rgba(255,255,255,0.05) !important; }
          [data-theme="dark"] .mini-day-name-v2 { color: #555 !important; }
          [data-theme="dark"] .week-col-mobile-header { color: #eee !important; }
          [data-theme="dark"] .year-view-scroll-container { background: #121212 !important; }

          .highlight-day { background: rgba(255, 77, 77, 0.2) !important; transition: background 0.3s ease; z-index: 10; }

          .bg-success { background-color: #28a745 !important; }
          .transition-all { transition: all 0.3s ease; }
        `}} />
      {headerPortalTarget && createPortal(
        <div className="d-flex align-items-center gap-2">
          <div className="d-flex align-items-center bg-light rounded-3 px-2">
            <button 
              className={`nav-btn p-0 border-0 bg-transparent ${viewMode === 'list' ? 'text-primary' : 'text-muted opacity-50'}`} 
              onClick={() => updateViewMode('list')}
              style={{ width: '38px' }}
            >
              <ListIcon size={16} />
            </button>
            <button 
              className={`nav-btn p-0 border-0 bg-transparent ${viewMode === 'week' ? 'text-primary' : 'text-muted opacity-50'}`} 
              onClick={() => updateViewMode('week')}
              style={{ width: '38px' }}
            >
              <Columns size={16} />
            </button>
            <button 
              className={`nav-btn p-0 border-0 bg-transparent ${viewMode === 'month' ? 'text-primary' : 'text-muted opacity-50'}`} 
              onClick={() => updateViewMode('month')}
              style={{ width: '38px' }}
            >
              <CalendarIcon size={16} />
            </button>
            <button 
              className={`nav-btn p-0 border-0 bg-transparent ${viewMode === 'year' ? 'text-primary' : 'text-muted opacity-50'}`} 
              onClick={() => updateViewMode('year')}
              style={{ width: '38px' }}
            >
              <Layers size={16} />
            </button>
          </div>

          <div className="d-flex align-items-center bg-light rounded-3 px-2" style={{ scale: '0.95' }}>
            <button className="nav-btn today-btn p-0 border-0 bg-transparent fs-10 fw-bold" onClick={goToToday} style={{ width: 'auto', padding: '0 12px' }}>BUGÜN</button>
          </div>

          <button className="nav-btn p-0 border-0 bg-transparent shadow-none ms-auto" onClick={handleMobileSearchClick} style={{ width: '38px' }}>
            <Search size={19} className="text-muted" />
          </button>
          <button className="nav-btn p-0 border-0 bg-transparent shadow-none" onClick={() => handleDayClick(new Date())} style={{ width: '38px' }}>
            <Plus size={22} className="text-muted" />
          </button>
          <Dropdown align="end">
            <Dropdown.Toggle as="button" className="nav-btn p-0 border-0 bg-transparent shadow-none no-caret" style={{ width: '38px' }}>
              <Settings size={19} className="text-muted" />
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
