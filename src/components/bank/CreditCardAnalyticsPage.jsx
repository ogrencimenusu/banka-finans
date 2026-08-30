import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { db } from '../../firebase';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { parseAmt } from '../../utils/accountSummaryHelper';
import { Modal, Button, Form, Dropdown } from 'react-bootstrap';
import Swal from 'sweetalert2';
import {
  ChevronLeft,
  Settings,
  CreditCard,
  Calendar,
  SlidersHorizontal,
  TrendingUp,
  BarChart2,
  PieChart,
  Landmark,
  Star,
  CalendarDays,
  Search,
  X,
  ArrowUpDown,
  FileText,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  Wifi,
  Sparkles,
  Layers
} from 'lucide-react';
import './CreditCardAnalyticsPage.css';

// MARK: - Constants & Enums matching iOS 1:1

const TIME_FILTERS = [
  { id: 'thisMonth', raw: 'Bu Ay', shortTitle: 'Bu Ay' },
  { id: 'lastMonth', raw: 'Geçen Ay', shortTitle: 'Geçen Ay' },
  { id: 'last3Months', raw: 'Son 3 Ay', shortTitle: 'Son 3 Ay' },
  { id: 'last6Months', raw: 'Son 6 Ay', shortTitle: 'Son 6 Ay' },
  { id: 'thisYear', raw: 'Bu Yıl', shortTitle: 'Bu Yıl' },
  { id: 'allTime', raw: 'Tüm Zamanlar', shortTitle: 'Tümü' },
  { id: 'custom', raw: 'Özel (Dönem)', shortTitle: 'Özel' }
];

const SORT_OPTIONS = [
  { id: 'dateDesc', raw: 'En Yeni', label: 'En Yeni' },
  { id: 'dateAsc', raw: 'En Eski', label: 'En Eski' },
  { id: 'amountDesc', raw: 'En Yüksek Tutar', label: 'En Yüksek Tutar' },
  { id: 'amountAsc', raw: 'En Düşük Tutar', label: 'En Düşük Tutar' },
  { id: 'titleAsc', raw: 'İşlem Adı (A-Z)', label: 'İşlem Adı (A-Z)' }
];

const CHART_TABS = [
  { id: 'monthly', raw: 'Aylık Trend', label: 'Aylık Trend', icon: BarChart2 },
  { id: 'cards', raw: 'Kart Dağılımı', label: 'Kart Dağılımı', icon: PieChart },
  { id: 'banks', raw: 'Bankalar', label: 'Bankalar', icon: Landmark },
  { id: 'dayOfWeek', raw: 'Haftanın Günleri', label: 'Haftanın Günleri', icon: Calendar },
  { id: 'cumulative', raw: 'Kümülatif', label: 'Kümülatif', icon: TrendingUp },
  { id: 'topMerchants', raw: 'En Çok Harcanan', label: 'En Çok Harcanan', icon: Star },
  { id: 'buckets', raw: 'Tutar Aralıkları', label: 'Tutar Aralıkları', icon: SlidersHorizontal },
  { id: 'dayOfMonth', raw: 'Günlük Dağılım', label: 'Günlük Dağılım', icon: CalendarDays }
];

const CARD_KEYWORDS = [
  'kart', 'kredi', 'card', 'bonus', 'world', 'maximum', 'axess',
  'wings', 'combo', 'enpara', 'miles', 'paraf', 'bankkart',
  'advantage', 'sağlam', 'worldcard', 'shop', 'fly', 'platinum',
  'gold', 'black', 'troy', 'mastercard', 'visa'
];

function cardColorFromTagColor(color) {
  if (!color) return '#3b82f6';
  const c = color.toLowerCase();
  switch (c) {
    case 'red': return '#ef4444';
    case 'blue': return '#3b82f6';
    case 'green': return '#10b981';
    case 'orange': return '#f97316';
    case 'yellow': return '#eab308';
    case 'purple': return '#a855f7';
    case 'teal': return '#14b8a6';
    case 'indigo': return '#6366f1';
    case 'pink': return '#ec4899';
    case 'gray': return '#64748b';
    case 'brown': return '#8b5cf6';
    default:
      if (c.startsWith('#') || c.length >= 6) {
        return c.startsWith('#') ? c : `#${c}`;
      }
      return '#3b82f6';
  }
}

function formatTransactionDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return dateStr;
}

function formatCurrency(val) {
  const num = typeof val === 'number' ? val : parseAmt(val);
  if (isNaN(num)) return '0,00 TL';
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' TL';
}

function formatShortCurrency(val) {
  const num = typeof val === 'number' ? val : parseAmt(val);
  if (isNaN(num) || num === 0) return '0 ₺';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace('.', ',') + 'M ₺';
  } else if (num >= 10000) {
    return (num / 1000).toFixed(1).replace('.', ',') + 'B ₺';
  } else {
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(num) + ' ₺';
  }
}

export default function CreditCardAnalyticsPage() {
  const { user } = useAuth();
  const {
    banks = [],
    bankTransactions = [],
    quickActionTags = [],
    typeTags = [],
    creditCardSettings: globalCardSettings
  } = useData();

  // Local fallback states
  const [localCardSettings, setLocalCardSettings] = useState(() => {
    try {
      const savedIds = localStorage.getItem('selected_credit_card_qa_ids');
      const savedLimits = localStorage.getItem('credit_card_limits_json');
      return {
        selectedCreditCardIds: savedIds ? JSON.parse(savedIds) : [],
        cardLimits: savedLimits ? JSON.parse(savedLimits) : {}
      };
    } catch {
      return { selectedCreditCardIds: [], cardLimits: {} };
    }
  });

  const cardLimits = useMemo(() => {
    return globalCardSettings?.cardLimits || localCardSettings.cardLimits || {};
  }, [globalCardSettings?.cardLimits, localCardSettings.cardLimits]);

  const detectedCardIds = useMemo(() => {
    const fromGlobal = globalCardSettings?.selectedCreditCardIds;
    if (fromGlobal && fromGlobal.length > 0) return fromGlobal;
    const fromLocal = localCardSettings.selectedCreditCardIds;
    if (fromLocal && fromLocal.length > 0) return fromLocal;

    const detected = [];
    quickActionTags.forEach(qa => {
      const lower = (qa.name || '').toLowerCase();
      if (CARD_KEYWORDS.some(kw => lower.includes(kw))) {
        detected.push(qa.id);
      }
    });
    return detected;
  }, [globalCardSettings?.selectedCreditCardIds, localCardSettings.selectedCreditCardIds, quickActionTags]);

  const selectedCreditCardIds = detectedCardIds;

  // Tab & Filter States (Persisted from Firestore if present)
  const [timeFilter, setTimeFilter] = useState(() => {
    return globalCardSettings?.timeFilter || localStorage.getItem('cc_analytics_time_filter') || 'Bu Ay';
  });
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [selectedFilterCardId, setSelectedFilterCardId] = useState(() => {
    return globalCardSettings?.selectedFilterCardId || localStorage.getItem('cc_analytics_selected_card_id') || 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState(() => {
    return globalCardSettings?.selectedSort || localStorage.getItem('cc_analytics_selected_sort') || 'En Yeni';
  });
  const [activeChartTab, setActiveChartTab] = useState(() => {
    return globalCardSettings?.activeChartTab || localStorage.getItem('cc_analytics_active_chart_tab') || 'Aylık Trend';
  });

  // Pagination & View Limit (Default: 5)
  const [limitCount, setLimitCount] = useState(() => {
    const saved = localStorage.getItem('cc_analytics_limit_count');
    return saved ? parseInt(saved, 10) : 5;
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Modals & Active items
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const hasAutoDetected = useRef(false);
  const syncTimeoutRef = useRef(null);

  // Sync state changes back to Firestore with debounce (matching iOS syncTabStatesToFirestore)
  const syncTabStatesToFirestore = (newTf, newCardId, newChart, newSort) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      if (user?.uid) {
        setDoc(doc(db, `users/${user.uid}/config`, 'creditCardSettings'), {
          timeFilter: newTf,
          selectedFilterCardId: newCardId,
          activeChartTab: newChart,
          selectedSort: newSort,
          updatedAt: serverTimestamp()
        }, { merge: true }).catch(console.error);
      }
    }, 500);
  };

  const handleTimeFilterChange = (val) => {
    setTimeFilter(val);
    localStorage.setItem('cc_analytics_time_filter', val);
    setCurrentPage(1);
    syncTabStatesToFirestore(val, selectedFilterCardId, activeChartTab, selectedSort);
  };

  const handleCardFilterChange = (id) => {
    setSelectedFilterCardId(id);
    localStorage.setItem('cc_analytics_selected_card_id', id);
    setCurrentPage(1);
    syncTabStatesToFirestore(timeFilter, id, activeChartTab, selectedSort);
  };

  const handleChartTabChange = (tabRaw) => {
    setActiveChartTab(tabRaw);
    localStorage.setItem('cc_analytics_active_chart_tab', tabRaw);
    syncTabStatesToFirestore(timeFilter, selectedFilterCardId, tabRaw, selectedSort);
  };

  const handleSortChange = (sortRaw) => {
    setSelectedSort(sortRaw);
    localStorage.setItem('cc_analytics_selected_sort', sortRaw);
    setCurrentPage(1);
    syncTabStatesToFirestore(timeFilter, selectedFilterCardId, activeChartTab, sortRaw);
  };

  const handleLimitCountChange = (val) => {
    setLimitCount(val);
    localStorage.setItem('cc_analytics_limit_count', String(val));
    setCurrentPage(1);
  };

  // Save settings helper (Selected Cards & Limits)
  const saveSettingsToFirestore = async (newIds, newLimits) => {
    setLocalCardSettings({
      selectedCreditCardIds: newIds,
      cardLimits: newLimits
    });
    setCurrentPage(1);

    try {
      localStorage.setItem('selected_credit_card_qa_ids', JSON.stringify(newIds));
      localStorage.setItem('credit_card_limits_json', JSON.stringify(newLimits));
    } catch (e) {
      console.warn('Storage error:', e);
    }

    if (user?.uid) {
      try {
        await setDoc(doc(db, `users/${user.uid}/config`, 'creditCardSettings'), {
          selectedCreditCardIds: newIds,
          cardLimits: newLimits,
          timeFilter,
          selectedFilterCardId,
          activeChartTab,
          selectedSort,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        console.error('Error saving credit card settings:', err);
      }
    }
  };

  // Background sync for auto-detected cards if Firestore has not been initialized yet
  useEffect(() => {
    if (hasAutoDetected.current) return;
    if (!globalCardSettings?.selectedCreditCardIds && detectedCardIds.length > 0 && user?.uid) {
      hasAutoDetected.current = true;
      setDoc(doc(db, `users/${user.uid}/config`, 'creditCardSettings'), {
        selectedCreditCardIds: detectedCardIds,
        cardLimits,
        timeFilter,
        selectedFilterCardId,
        activeChartTab,
        selectedSort,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(console.error);
    }
  }, [detectedCardIds, globalCardSettings, user, cardLimits, timeFilter, selectedFilterCardId, activeChartTab, selectedSort]);

  // Selected Card tags
  const selectedCards = useMemo(() => {
    const cardSet = new Set(selectedCreditCardIds);
    return quickActionTags.filter(qa => cardSet.has(qa.id));
  }, [quickActionTags, selectedCreditCardIds]);

  // Date Range calculation based on active timeFilter
  const activeDateRange = useMemo(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (timeFilter === 'Bu Ay') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: toDateStr(start), end: toDateStr(end), label: 'Bu Ay' };
    }
    if (timeFilter === 'Geçen Ay') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: toDateStr(start), end: toDateStr(end), label: 'Geçen Ay' };
    }
    if (timeFilter === 'Son 3 Ay') {
      const start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      return { start: toDateStr(start), end: toDateStr(now), label: 'Son 3 Ay' };
    }
    if (timeFilter === 'Son 6 Ay') {
      const start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      return { start: toDateStr(start), end: toDateStr(now), label: 'Son 6 Ay' };
    }
    if (timeFilter === 'Bu Yıl') {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: toDateStr(start), end: toDateStr(now), label: `${now.getFullYear()}` };
    }
    if (timeFilter === 'Özel (Dönem)') {
      return { start: customStartDate, end: customEndDate, label: 'Özel Aralık' };
    }
    return { start: '', end: '', label: 'Tüm Zamanlar' };
  }, [timeFilter, customStartDate, customEndDate]);

  // Extract all Credit Card Transactions matching iOS single-pass extraction
  const allCreditCardTransactions = useMemo(() => {
    const cardSet = new Set(selectedCreditCardIds);
    if (cardSet.size === 0) return [];

    const quickActionsMap = new Map(quickActionTags.map(qa => [qa.id, qa]));
    const banksMap = new Map(banks.map(b => [b.id, b]));

    const list = [];
    const activeTrans = bankTransactions.filter(t => t.deleted !== true);

    for (const t of activeTrans) {
      // Find matching credit card tag from t.quickActions
      const matchingCardId = (t.quickActions || []).find(qaId => cardSet.has(qaId));
      if (!matchingCardId) continue;

      const rawAmt = parseAmt(t.amount);
      const spendAmt = Math.abs(rawAmt);
      if (spendAmt === 0) continue;

      const cardTag = quickActionsMap.get(matchingCardId);
      const cardName = cardTag?.name || 'Kredi Kartı';
      const cardColor = cardColorFromTagColor(cardTag?.color || 'blue');

      const bank = banksMap.get(t.bankId);
      const bankName = bank?.name || 'Banka';

      list.push({
        id: t.id,
        bankId: t.bankId || '',
        bankName,
        bankLogo: bank?.logo || null,
        cardTagId: matchingCardId,
        cardName,
        cardColor,
        title: t.title?.trim() || 'Kart Harcaması',
        amount: spendAmt,
        rawAmount: rawAmt,
        isRefund: rawAmt > 0,
        date: t.date || '',
        receiptUrl: t.receiptUrl || '',
        createdAt: t.createdAt || null,
        type: t.type
      });
    }

    return list;
  }, [bankTransactions, selectedCreditCardIds, quickActionTags, banks]);

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    const range = activeDateRange;
    const q = searchQuery.trim().toLowerCase();

    return allCreditCardTransactions.filter(item => {
      if (range.start && item.date < range.start) return false;
      if (range.end && item.date > range.end) return false;

      if (selectedFilterCardId !== 'all' && item.cardTagId !== selectedFilterCardId) {
        return false;
      }

      if (q) {
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const cardMatch = (item.cardName || '').toLowerCase().includes(q);
        const bankMatch = (item.bankName || '').toLowerCase().includes(q);
        if (!titleMatch && !cardMatch && !bankMatch) return false;
      }

      return true;
    }).sort((a, b) => {
      switch (selectedSort) {
        case 'En Eski':
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
        case 'En Yüksek Tutar':
          return b.amount - a.amount;
        case 'En Düşük Tutar':
          return a.amount - b.amount;
        case 'İşlem Adı (A-Z)':
          return a.title.localeCompare(b.title, 'tr');
        case 'En Yeni':
        default:
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }
    });
  }, [allCreditCardTransactions, activeDateRange, selectedFilterCardId, searchQuery, selectedSort]);

  // Map of per-card spend and count within the active filter
  const spentByCard = useMemo(() => {
    const map = {};
    const range = activeDateRange;
    allCreditCardTransactions.forEach(item => {
      if (range.start && item.date < range.start) return;
      if (range.end && item.date > range.end) return;
      if (!map[item.cardTagId]) map[item.cardTagId] = { total: 0, count: 0 };
      map[item.cardTagId].total += item.amount;
      map[item.cardTagId].count += 1;
    });
    return map;
  }, [allCreditCardTransactions, activeDateRange]);

  // Total spending & Metrics
  const totalSpending = useMemo(() => {
    return filteredTransactions.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredTransactions]);

  const averageDailySpending = useMemo(() => {
    if (filteredTransactions.length === 0 || totalSpending <= 0) return 0;
    const uniqueDates = new Set(filteredTransactions.map(t => t.date));
    return totalSpending / Math.max(1, uniqueDates.size);
  }, [filteredTransactions, totalSpending]);

  // Chart 1: Monthly Trend Data (Last 12 Months)
  const monthlySpendingData = useMemo(() => {
    const monthKeys = [];
    const now = new Date();
    const trMonths = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${trMonths[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
      monthKeys.push({ key, label, isCurrent: i === 0 });
    }

    const relevant = allCreditCardTransactions.filter(item => {
      if (selectedFilterCardId !== 'all') {
        return item.cardTagId === selectedFilterCardId;
      }
      return true;
    });

    const sums = {};
    monthKeys.forEach(m => { sums[m.key] = { total: 0, count: 0 }; });

    relevant.forEach(t => {
      const key = (t.date || '').slice(0, 7);
      if (sums[key]) {
        sums[key].total += t.amount;
        sums[key].count += 1;
      }
    });

    return monthKeys.map(m => ({
      key: m.key,
      label: m.label,
      total: sums[m.key].total,
      count: sums[m.key].count,
      isCurrent: m.isCurrent
    }));
  }, [allCreditCardTransactions, selectedFilterCardId]);

  const monthlyAverageSpending = useMemo(() => {
    const active = monthlySpendingData.filter(m => m.total > 0);
    if (active.length === 0) return 0;
    const sum = active.reduce((acc, m) => acc + m.total, 0);
    return sum / active.length;
  }, [monthlySpendingData]);

  // Chart 2: Card Shares Data
  const cardShares = useMemo(() => {
    const totals = {};
    filteredTransactions.forEach(t => {
      totals[t.cardTagId] = (totals[t.cardTagId] || 0) + t.amount;
    });

    const result = [];
    selectedCards.forEach(card => {
      const total = totals[card.id] || 0;
      if (total > 0 || selectedFilterCardId === card.id) {
        const pct = totalSpending > 0 ? (total / totalSpending) * 100 : 0;
        result.push({
          id: card.id,
          name: card.name,
          color: cardColorFromTagColor(card.color),
          total,
          percentage: pct,
          count: filteredTransactions.filter(t => t.cardTagId === card.id).length
        });
      }
    });

    Object.keys(totals).forEach(cardId => {
      if (!result.some(r => r.id === cardId)) {
        const tag = quickActionTags.find(qa => qa.id === cardId);
        const total = totals[cardId];
        const pct = totalSpending > 0 ? (total / totalSpending) * 100 : 0;
        result.push({
          id: cardId,
          name: tag?.name || 'Diğer Kart',
          color: cardColorFromTagColor(tag?.color || 'gray'),
          total,
          percentage: pct,
          count: filteredTransactions.filter(t => t.cardTagId === cardId).length
        });
      }
    });

    return result.sort((a, b) => b.total - a.total);
  }, [filteredTransactions, selectedCards, selectedFilterCardId, totalSpending, quickActionTags]);

  const topCardShare = cardShares[0]?.total > 0 ? cardShares[0] : null;

  // Chart 3: Bank Shares Data
  const bankShares = useMemo(() => {
    const totals = {};
    const counts = {};
    filteredTransactions.forEach(t => {
      totals[t.bankId] = (totals[t.bankId] || 0) + t.amount;
      counts[t.bankId] = (counts[t.bankId] || 0) + 1;
    });

    const result = Object.keys(totals).map(bankId => {
      const b = banks.find(item => item.id === bankId);
      const total = totals[bankId];
      const pct = totalSpending > 0 ? (total / totalSpending) * 100 : 0;
      return {
        id: bankId,
        name: b?.name || (bankId ? bankId : 'Tanımsız Banka'),
        logo: b?.logo || null,
        total,
        percentage: pct,
        count: counts[bankId] || 0
      };
    });

    return result.sort((a, b) => b.total - a.total);
  }, [filteredTransactions, totalSpending, banks]);

  // Chart 4: Day of Week Data
  const dayOfWeekData = useMemo(() => {
    const dayNames = [
      { num: 1, name: 'Pazartesi', short: 'Pzt', isWeekend: false },
      { num: 2, name: 'Salı', short: 'Sal', isWeekend: false },
      { num: 3, name: 'Çarşamba', short: 'Çar', isWeekend: false },
      { num: 4, name: 'Perşembe', short: 'Per', isWeekend: false },
      { num: 5, name: 'Cuma', short: 'Cum', isWeekend: false },
      { num: 6, name: 'Cumartesi', short: 'Cmt', isWeekend: true },
      { num: 7, name: 'Pazar', short: 'Paz', isWeekend: true }
    ];

    const sums = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

    filteredTransactions.forEach(t => {
      if (!t.date) return;
      const d = new Date(t.date + 'T12:00:00');
      const jsDay = d.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
      const mapped = jsDay === 0 ? 7 : jsDay;
      sums[mapped] += t.amount;
      counts[mapped] += 1;
    });

    return dayNames.map(d => {
      const total = sums[d.num];
      const pct = totalSpending > 0 ? (total / totalSpending) * 100 : 0;
      return {
        ...d,
        total,
        count: counts[d.num],
        percentage: pct
      };
    });
  }, [filteredTransactions, totalSpending]);

  const weekdayWeekendSplit = useMemo(() => {
    const weekday = dayOfWeekData.filter(d => !d.isWeekend).reduce((s, d) => s + d.total, 0);
    const weekend = dayOfWeekData.filter(d => d.isWeekend).reduce((s, d) => s + d.total, 0);
    const tot = weekday + weekend;
    return {
      weekday,
      weekend,
      weekdayPct: tot > 0 ? (weekday / tot) * 100 : 0,
      weekendPct: tot > 0 ? (weekend / tot) * 100 : 0
    };
  }, [dayOfWeekData]);

  // Chart 5: Cumulative Spending (Days 1 to 31)
  const cumulativeDailyData = useMemo(() => {
    const daily = {};
    filteredTransactions.forEach(t => {
      if (!t.date) return;
      const dayNum = parseInt(t.date.split('-')[2], 10);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        daily[dayNum] = (daily[dayNum] || 0) + t.amount;
      }
    });

    let running = 0;
    const items = [];
    for (let d = 1; d <= 31; d++) {
      const spend = daily[d] || 0;
      running += spend;
      items.push({ day: d, dailySpend: spend, cumulativeSpend: running });
    }
    return items;
  }, [filteredTransactions]);

  // Chart 6: Top Merchants
  const topMerchantsData = useMemo(() => {
    const map = {};
    filteredTransactions.forEach(t => {
      const title = t.title || 'Diğer Harcama';
      if (!map[title]) map[title] = { total: 0, count: 0 };
      map[title].total += t.amount;
      map[title].count += 1;
    });

    return Object.keys(map).map(title => {
      const total = map[title].total;
      const pct = totalSpending > 0 ? (total / totalSpending) * 100 : 0;
      return { title, total, count: map[title].count, percentage: pct };
    }).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredTransactions, totalSpending]);

  // Chart 7: Amount Buckets
  const amountBucketsData = useMemo(() => {
    const buckets = [
      { label: '0 - 250 ₺', min: 0, max: 250 },
      { label: '250 - 1.000 ₺', min: 250, max: 1000 },
      { label: '1.000 - 3.000 ₺', min: 1000, max: 3000 },
      { label: '3.000 - 10.000 ₺', min: 3000, max: 10000 },
      { label: '10.000 ₺ +', min: 10000, max: Infinity }
    ];

    return buckets.map(b => {
      const matches = filteredTransactions.filter(t => t.amount >= b.min && t.amount < b.max);
      const total = matches.reduce((sum, t) => sum + t.amount, 0);
      const pct = totalSpending > 0 ? (total / totalSpending) * 100 : 0;
      return {
        ...b,
        total,
        count: matches.length,
        percentage: pct
      };
    });
  }, [filteredTransactions, totalSpending]);

  // Chart 8: Day of Month Distribution (Days 1 to 31)
  const dayOfMonthData = useMemo(() => {
    const map = {};
    const countMap = {};
    for (let i = 1; i <= 31; i++) { map[i] = 0; countMap[i] = 0; }

    filteredTransactions.forEach(t => {
      if (!t.date) return;
      const dayNum = parseInt(t.date.split('-')[2], 10);
      if (dayNum >= 1 && dayNum <= 31) {
        map[dayNum] += t.amount;
        countMap[dayNum] += 1;
      }
    });

    return Array.from({ length: 31 }, (_, i) => ({
      day: i + 1,
      total: map[i + 1],
      count: countMap[i + 1]
    }));
  }, [filteredTransactions]);

  // Pagination calculations
  const totalPages = useMemo(() => {
    if (limitCount === -1 || limitCount <= 0) return 1;
    return Math.max(1, Math.ceil(filteredTransactions.length / limitCount));
  }, [filteredTransactions.length, limitCount]);

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const pagedTransactions = useMemo(() => {
    if (limitCount === -1) return filteredTransactions;
    const start = (safeCurrentPage - 1) * limitCount;
    return filteredTransactions.slice(start, start + limitCount);
  }, [filteredTransactions, safeCurrentPage, limitCount]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [1];
    if (safeCurrentPage > 3) pages.push(-1);
    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);
    for (let p = start; p <= end; p++) {
      if (!pages.includes(p)) pages.push(p);
    }
    if (safeCurrentPage < totalPages - 2) pages.push(-1);
    if (!pages.includes(totalPages)) pages.push(totalPages);
    return pages;
  }, [totalPages, safeCurrentPage]);

  // Quick action count helper for settings modal
  const getQATransactionCount = (qaId) => {
    return bankTransactions.filter(t => t.deleted !== true && (t.quickActions || []).includes(qaId)).length;
  };

  return (
    <div className="container-fluid cca-root py-4 px-md-4">
      {/* Top Header Bar */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <Link to="/bank-transactions" className="cca-back-btn" title="Banka İşlemlerine Dön">
            <ChevronLeft size={22} />
          </Link>
          <div>
            <h1 className="fw-bold fs-24 mb-0 d-flex align-items-center gap-2 text-dark" style={{ letterSpacing: '-0.5px' }}>
              <CreditCard size={26} className="text-primary" />
              Kredi Kartları
            </h1>
            <p className="text-muted mb-0 fs-12 fw-medium">Gider & Harcama Analizi</p>
          </div>
        </div>

        <button
          className="cca-settings-trigger"
          onClick={() => setShowSettingsModal(true)}
        >
          <Settings size={16} />
          <span>Kartlar ({selectedCreditCardIds.length})</span>
        </button>
      </div>

      {/* Unconfigured Cards Alert Banner */}
      {selectedCreditCardIds.length === 0 && (
        <div className="alert alert-warning border-0 rounded-4 shadow-sm p-3 mb-4 d-flex align-items-start gap-3">
          <AlertTriangle size={24} className="text-warning flex-shrink-0 mt-1" />
          <div className="flex-grow-1">
            <h6 className="fw-bold mb-1 fs-14">Kredi Kartları Seçilmedi</h6>
            <p className="mb-2 fs-12 text-muted">
              Harcamalarınızı grafiklerle analiz etmek için 'Hızlı İşlemler' listenizdeki kredi kartı başlıklarınızı ayarlardan seçin.
            </p>
            <Button
              variant="primary"
              size="sm"
              className="rounded-pill fw-bold px-3 fs-12"
              onClick={() => setShowSettingsModal(true)}
            >
              <SlidersHorizontal size={13} className="me-1" /> Kredi Kartlarını Ayarla
            </Button>
          </div>
        </div>
      )}

      {/* Time Filter Bar */}
      <div className="cca-horizontal-scroll mb-3 gap-2 align-items-center">
        {TIME_FILTERS.map(f => (
          <button
            key={f.id}
            className={`cca-time-pill ${timeFilter === f.raw ? 'active' : ''}`}
            onClick={() => handleTimeFilterChange(f.raw)}
          >
            {f.shortTitle}
          </button>
        ))}

        {timeFilter === 'Özel (Dönem)' && (
          <div className="d-flex align-items-center gap-2 ms-2 bg-white p-1 px-3 rounded-pill border shadow-sm">
            <Form.Control
              type="date"
              size="sm"
              value={customStartDate}
              onChange={(e) => { setCustomStartDate(e.target.value); setCurrentPage(1); }}
              className="border-0 bg-transparent py-0 fs-12 fw-bold"
              style={{ width: '130px' }}
            />
            <span className="text-muted small">-</span>
            <Form.Control
              type="date"
              size="sm"
              value={customEndDate}
              onChange={(e) => { setCustomEndDate(e.target.value); setCurrentPage(1); }}
              className="border-0 bg-transparent py-0 fs-12 fw-bold"
              style={{ width: '130px' }}
            />
          </div>
        )}
      </div>

      {/* Physical Credit Cards Carousel (Apple Card Aesthetic) */}
      {selectedCards.length > 0 && (
        <div className="cca-horizontal-scroll mb-4 gap-3 py-2">
          {/* Master "All Cards" Card */}
          <div
            className={`cca-card-item ${selectedFilterCardId === 'all' ? 'active' : ''}`}
            style={{
              background: selectedFilterCardId === 'all'
                ? 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)'
                : undefined,
              boxShadow: selectedFilterCardId === 'all' ? '0 12px 28px rgba(37, 99, 235, 0.4)' : undefined
            }}
            onClick={() => handleCardFilterChange('all')}
          >
            {selectedFilterCardId === 'all' && <div className="cca-card-shimmer" />}
            
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <div className="cca-emv-chip" />
                <Wifi size={14} className={selectedFilterCardId === 'all' ? 'text-white opacity-75' : 'text-muted'} />
              </div>
              {selectedFilterCardId === 'all' ? (
                <CheckCircle size={15} className="text-white" />
              ) : (
                <Layers size={15} className="text-primary" />
              )}
            </div>

            <div className="my-auto">
              <div className={`fs-11 fw-bold text-uppercase ${selectedFilterCardId === 'all' ? 'text-white opacity-80' : 'text-muted'}`} style={{ letterSpacing: '0.5px' }}>
                Tüm Kartlar
              </div>
              <div className={`fw-heavy fs-18 ${selectedFilterCardId === 'all' ? 'text-white' : 'text-dark'}`}>
                {formatCurrency(allCreditCardTransactions.reduce((s, t) => s + t.amount, 0))}
              </div>
            </div>

            <div className={`fs-10 fw-semibold ${selectedFilterCardId === 'all' ? 'text-white opacity-75' : 'text-muted'}`}>
              {selectedCards.length} Kart • {allCreditCardTransactions.length} Harcama
            </div>
          </div>

          {/* Individual Physical Credit Cards */}
          {selectedCards.map(card => {
            const isSelected = selectedFilterCardId === card.id;
            const cardColor = cardColorFromTagColor(card.color);
            const cardData = spentByCard[card.id] || { total: 0, count: 0 };
            const spent = cardData.total;
            const count = cardData.count;
            const limit = cardLimits[card.id] || 0;
            const limitPct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
            const isOverLimit = limit > 0 && limitPct >= 90;

            return (
              <div
                key={card.id}
                className={`cca-card-item ${isSelected ? 'active' : ''}`}
                style={{
                  background: isSelected
                    ? `linear-gradient(135deg, ${cardColor} 0%, ${cardColor}dd 100%)`
                    : undefined,
                  boxShadow: isSelected ? `0 12px 28px ${cardColor}66` : undefined
                }}
                onClick={() => handleCardFilterChange(isSelected ? 'all' : card.id)}
              >
                {isSelected && <div className="cca-card-shimmer" />}

                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <div className="cca-emv-chip" />
                    <Wifi size={14} className={isSelected ? 'text-white opacity-75' : 'text-muted'} />
                  </div>
                  <div className="d-flex align-items-center gap-1.5 overflow-hidden">
                    <span className="rounded-circle" style={{ width: '8px', height: '8px', backgroundColor: isSelected ? '#ffffff' : cardColor }} />
                    <span className={`fw-bold fs-12 text-truncate ${isSelected ? 'text-white' : 'text-dark'}`} style={{ maxWidth: '100px' }}>
                      {card.name}
                    </span>
                    {isSelected && <CheckCircle size={13} className="text-white flex-shrink-0 ms-1" />}
                  </div>
                </div>

                <div className="my-auto">
                  <div className={`fw-heavy fs-16 ${isSelected ? 'text-white' : 'text-dark'}`}>
                    {formatCurrency(spent)}
                  </div>
                </div>

                <div>
                  {limit > 0 ? (
                    <div>
                      <div className="cca-card-progress-bg mb-1">
                        <div
                          className="cca-card-progress-fill"
                          style={{
                            width: `${limitPct}%`,
                            backgroundColor: isOverLimit ? '#ef4444' : isSelected ? '#ffffff' : cardColor
                          }}
                        />
                      </div>
                      <div className={`d-flex justify-content-between fs-10 fw-semibold ${isSelected ? 'text-white opacity-85' : 'text-muted'}`}>
                        <span>%{limitPct.toFixed(0)} Limit</span>
                        <span>{formatShortCurrency(limit)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className={`fs-10 fw-semibold ${isSelected ? 'text-white opacity-80' : 'text-muted'}`}>
                      {count} işlem
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Executive Summary Hero Card */}
      <div className="cca-glass-panel cca-hero-container mb-4">
        <div className="cca-hero-glow-blue" />
        <div className="cca-hero-glow-purple" />

        <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
          <div>
            <div className="text-muted fw-bold fs-11 text-uppercase" style={{ letterSpacing: '0.8px' }}>
              TOPLAM KREDİ KARTI GİDERİ
            </div>
            <div className="fw-heavy fs-34 text-dark mt-1" style={{ letterSpacing: '-0.8px' }}>
              {formatCurrency(totalSpending)}
            </div>
          </div>

          <div className="d-flex flex-column align-items-end gap-1.5">
            <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-bold fs-12 d-flex align-items-center gap-1.5">
              <Calendar size={13} /> {activeDateRange.label}
            </span>
            {topCardShare && (
              <div className="d-flex align-items-center gap-1.5 fs-11 text-muted">
                <span className="rounded-circle" style={{ width: '7px', height: '7px', backgroundColor: topCardShare.color }} />
                <span>En çok: <strong className="text-dark">{topCardShare.name}</strong> (%{topCardShare.percentage.toFixed(1)})</span>
              </div>
            )}
          </div>
        </div>

        {/* 3 Metric Glass Pill Columns */}
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <div className="cca-metric-pill-box">
              <div className="d-flex align-items-center gap-2 text-muted fs-11 fw-bold text-uppercase mb-1.5">
                <BarChart2 size={15} className="text-primary" />
                <span>Aylık Ortalama</span>
              </div>
              <div className="fw-bold fs-18 text-dark">
                {formatCurrency(monthlyAverageSpending)}
              </div>
              <div className="text-muted fs-10 mt-0.5">Son 12 ay baz alınmıştır</div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="cca-metric-pill-box">
              <div className="d-flex align-items-center gap-2 text-muted fs-11 fw-bold text-uppercase mb-1.5">
                <Clock size={15} style={{ color: '#a855f7' }} />
                <span>Günlük Ortalama</span>
              </div>
              <div className="fw-bold fs-18 text-dark">
                {formatCurrency(averageDailySpending)}
              </div>
              <div className="text-muted fs-10 mt-0.5">Aktif harcama yapılan günler</div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="cca-metric-pill-box">
              <div className="d-flex align-items-center gap-2 text-muted fs-11 fw-bold text-uppercase mb-1.5">
                <CreditCard size={15} className="text-success" />
                <span>İşlem Adedi</span>
              </div>
              <div className="fw-bold fs-18 text-dark">
                {filteredTransactions.length} Adet
              </div>
              <div className="text-muted fs-10 mt-0.5">Seçili dönemdeki kayıtlar</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section Header & Pills */}
      <div className="mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="fw-bold fs-20 mb-0 text-dark d-flex align-items-center gap-2" style={{ letterSpacing: '-0.3px' }}>
            <Sparkles size={18} className="text-primary" />
            Grafik Analizleri
          </h2>
        </div>

        <div className="cca-horizontal-scroll gap-2 mb-3">
          {CHART_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeChartTab === tab.raw;
            return (
              <button
                key={tab.id}
                className={`cca-chart-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleChartTabChange(tab.raw)}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Chart Glass Panel */}
        <div className="cca-glass-panel p-4">
          {activeChartTab === 'Aylık Trend' && (
            <MonthlyTrendChart data={monthlySpendingData} average={monthlyAverageSpending} />
          )}
          {activeChartTab === 'Kart Dağılımı' && (
            <CardDistributionChart data={cardShares} total={totalSpending} count={filteredTransactions.length} />
          )}
          {activeChartTab === 'Bankalar' && (
            <BankDistributionChart data={bankShares} />
          )}
          {activeChartTab === 'Haftanın Günleri' && (
            <DayOfWeekChart data={dayOfWeekData} split={weekdayWeekendSplit} />
          )}
          {activeChartTab === 'Kümülatif' && (
            <CumulativeChart data={cumulativeDailyData} />
          )}
          {activeChartTab === 'En Çok Harcanan' && (
            <TopMerchantsChart data={topMerchantsData} />
          )}
          {activeChartTab === 'Tutar Aralıkları' && (
            <AmountBucketsChart data={amountBucketsData} />
          )}
          {activeChartTab === 'Günlük Dağılım' && (
            <DayOfMonthChart data={dayOfMonthData} />
          )}
        </div>
      </div>

      {/* Recent Transactions List Section */}
      <div className="cca-glass-panel p-4 mb-5">
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <h3 className="fw-bold fs-18 mb-0 text-dark">Kredi Kartı Harcamaları</h3>
            <span className="badge bg-primary bg-opacity-10 text-primary rounded-pill px-2.5 py-1 fw-bold fs-11">
              {limitCount === -1 || filteredTransactions.length <= limitCount
                ? `${filteredTransactions.length} Kayıt`
                : `${(safeCurrentPage - 1) * limitCount + 1}-${Math.min(safeCurrentPage * limitCount, filteredTransactions.length)} / ${filteredTransactions.length} Kayıt`}
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 flex-grow-1 flex-md-grow-0" style={{ maxWidth: '420px' }}>
            <div className="position-relative flex-grow-1">
              <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
              <Form.Control
                type="text"
                size="sm"
                placeholder="Harcamalarda ara..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="ps-5 pe-4 rounded-pill fs-13"
              />
              {searchQuery && (
                <X
                  size={14}
                  className="position-absolute top-50 end-0 translate-middle-y me-3 text-muted cursor-pointer"
                  onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                />
              )}
            </div>

            <Dropdown align="end">
              <Dropdown.Toggle variant="light" size="sm" className="rounded-circle p-2 shadow-sm border">
                <ArrowUpDown size={15} />
              </Dropdown.Toggle>
              <Dropdown.Menu className="shadow border-0 rounded-3 p-1 fs-13">
                <div className="px-3 py-1 text-muted fw-bold fs-10 text-uppercase">Sıralama</div>
                {SORT_OPTIONS.map(opt => (
                  <Dropdown.Item
                    key={opt.id}
                    active={selectedSort === opt.raw}
                    onClick={() => handleSortChange(opt.raw)}
                    className="rounded-2"
                  >
                    {opt.label}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <CreditCard size={44} className="opacity-25 mb-2" />
            <div className="fw-semibold fs-14">Bu dönemde harcama bulunamadı.</div>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2.5">
            {pagedTransactions.map(trans => (
              <div
                key={trans.id}
                className="cca-transaction-card"
                onClick={() => {
                  const original = bankTransactions.find(t => t.id === trans.id);
                  if (original) setEditingTransaction(original);
                }}
              >
                <div className="cca-avatar-circle">
                  {trans.bankLogo ? (
                    <img src={trans.bankLogo} alt="" />
                  ) : (
                    <CreditCard size={20} style={{ color: trans.cardColor }} />
                  )}
                </div>

                <div className="flex-grow-1 min-w-0">
                  <div className="fw-bold fs-14 text-dark text-truncate mb-1">
                    {trans.title}
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-wrap fs-11">
                    <span
                      className="cca-tag-chip"
                      style={{
                        backgroundColor: `${trans.cardColor}15`,
                        color: trans.cardColor
                      }}
                    >
                      <span className="rounded-circle" style={{ width: '5px', height: '5px', backgroundColor: trans.cardColor }} />
                      {trans.cardName}
                    </span>
                    <span className="text-muted fw-medium">{formatTransactionDate(trans.date)}</span>
                    <span className="text-muted opacity-40">•</span>
                    <span className="text-muted fw-medium">{trans.bankName}</span>
                  </div>
                </div>

                <div className="text-end flex-shrink-0">
                  <div className={`fw-heavy fs-15 ${trans.isRefund ? 'text-success' : 'text-danger'}`}>
                    {trans.isRefund ? '+' : '-'}{formatCurrency(trans.amount)}
                  </div>
                  {trans.receiptUrl && (
                    <a
                      href={trans.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cca-receipt-badge mt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileText size={11} /> Dekont
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Navigation */}
        {limitCount > 0 && totalPages > 1 && (
          <div className="d-flex align-items-center justify-content-between mt-4 pt-3 border-top flex-wrap gap-2">
            <Button
              variant="light"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="rounded-pill px-3 fw-bold fs-12 d-flex align-items-center gap-1 shadow-sm"
            >
              <ChevronLeft size={14} /> Önceki
            </Button>

            <div className="d-flex align-items-center gap-1">
              {pageNumbers.map((p, idx) => {
                if (p === -1) {
                  return <span key={`ell-${idx}`} className="px-2 text-muted fw-bold">...</span>;
                }
                return (
                  <Button
                    key={p}
                    variant={safeCurrentPage === p ? 'primary' : 'light'}
                    size="sm"
                    onClick={() => setCurrentPage(p)}
                    className={`rounded-3 px-2.5 py-1 fw-bold fs-12 ${safeCurrentPage === p ? 'shadow-sm' : ''}`}
                    style={{ minWidth: '34px' }}
                  >
                    {p}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="light"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="rounded-pill px-3 fw-bold fs-12 d-flex align-items-center gap-1 shadow-sm"
            >
              Sonraki <ChevronRight size={14} />
            </Button>
          </div>
        )}

        {/* View Limit Selector */}
        <div className="d-flex align-items-center gap-2 mt-3 pt-3 border-top fs-11 text-muted flex-wrap">
          <span className="fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>GÖRÜNÜM LİMİTİ:</span>
          {[5, 10, 20, 50, 100].map(val => (
            <button
              key={val}
              className={`btn btn-sm ${limitCount === val ? 'btn-primary text-white' : 'btn-light'} rounded-pill px-2.5 py-0.5 fs-11 fw-bold`}
              onClick={() => handleLimitCountChange(val)}
            >
              {val}
            </button>
          ))}
          <button
            className={`btn btn-sm ${limitCount === -1 ? 'btn-primary text-white' : 'btn-light'} rounded-pill px-3 py-0.5 fs-11 fw-bold`}
            onClick={() => handleLimitCountChange(-1)}
          >
            Hepsini Gör ({filteredTransactions.length})
          </button>
        </div>
      </div>

      {/* Credit Card Settings Modal */}
      <CreditCardSettingsModal
        show={showSettingsModal}
        onHide={() => setShowSettingsModal(false)}
        quickActionTags={quickActionTags}
        selectedCreditCardIds={selectedCreditCardIds}
        cardLimits={cardLimits}
        getQATransactionCount={getQATransactionCount}
        onSave={saveSettingsToFirestore}
      />

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <EditTransactionModal
          show={!!editingTransaction}
          transaction={editingTransaction}
          banks={banks}
          typeTags={typeTags}
          onHide={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
}

// ==========================================================================
// MARK: - 8 Interactive Visual SVG Charts
// ==========================================================================

// 1. Monthly Trend Chart
function MonthlyTrendChart({ data, average }) {
  const [hovered, setHovered] = useState(null);
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const chartHeight = 200;

  return (
    <div className="position-relative">
      <div className="mb-3">
        <h6 className="fw-bold text-muted fs-11 text-uppercase mb-0" style={{ letterSpacing: '0.6px' }}>AYLIK HARCAMA TRENDİ (SON 12 AY)</h6>
        <p className="text-muted fs-12 mb-0">Aylık bazda harcama değişimi ve ortalama karşılaştırması</p>
      </div>

      {hovered && (
        <div className="cca-floating-tooltip">
          <span>{hovered.label}:</span>
          <strong>{formatCurrency(hovered.total)}</strong>
          <span className="opacity-75">({hovered.count} işlem)</span>
        </div>
      )}

      {data.every(d => d.total === 0) ? (
        <div className="text-center py-4 text-muted small">Aylık harcama verisi bulunamadı.</div>
      ) : (
        <div className="position-relative pt-4 pb-2">
          {/* Average Reference Line */}
          {average > 0 && (
            <div
              className="position-absolute w-100 d-flex align-items-center"
              style={{
                top: `${chartHeight - (average / maxVal) * (chartHeight - 45) + 20}px`,
                borderTop: '1.5px dashed #a855f7',
                zIndex: 2,
                pointerEvents: 'none'
              }}
            >
              <span
                className="badge bg-purple text-white ms-auto shadow-sm"
                style={{ backgroundColor: '#a855f7', fontSize: '9.5px', transform: 'translateY(-50%)' }}
              >
                Ort: {formatShortCurrency(average)}
              </span>
            </div>
          )}

          {/* Bar Chart Grid */}
          <div className="d-flex align-items-end justify-content-between gap-1.5" style={{ height: `${chartHeight}px` }}>
            {data.map((item) => {
              const heightPct = (item.total / maxVal) * 100;
              const barH = Math.max(heightPct > 0 ? (heightPct / 100) * (chartHeight - 45) : 5, 5);

              return (
                <div
                  key={item.key}
                  className="flex-grow-1 text-center d-flex flex-column align-items-center justify-content-end h-100"
                  onMouseEnter={() => setHovered(item)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div
                    className="w-100 cca-bar-element"
                    style={{
                      height: `${barH}px`,
                      maxHeight: `${chartHeight - 45}px`,
                      background: item.isCurrent
                        ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                        : item.total > 0
                        ? 'linear-gradient(180deg, #93c5fd 0%, #60a5fa 100%)'
                        : 'rgba(0,0,0,0.04)',
                      borderRadius: '8px 8px 3px 3px'
                    }}
                  />
                  <span
                    className={`fs-10 mt-2 text-truncate ${item.isCurrent ? 'fw-bold text-primary' : 'text-muted'}`}
                    style={{ width: '100%', fontSize: '9.5px' }}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="d-flex align-items-center justify-content-between mt-3 pt-2.5 border-top fs-11 text-muted">
            <div className="d-flex align-items-center gap-2">
              <span className="rounded-circle bg-primary" style={{ width: '8px', height: '8px' }} />
              <span className="fw-semibold">Bu Ay</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span style={{ width: '14px', height: '2px', backgroundColor: '#a855f7' }} />
              <span className="fw-semibold">12 Aylık Ortalama: {formatCurrency(average)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 2. Card Distribution Chart (Apple-Style Donut + Leaderboard)
function CardDistributionChart({ data, total, count }) {
  const [hovered, setHovered] = useState(null);
  const CIRC = 2 * Math.PI * 45; // r=45

  const segments = useMemo(() => {
    return data.map((item, idx) => {
      const segLen = (item.percentage / 100) * CIRC;
      const priorPct = data.slice(0, idx).reduce((sum, d) => sum + d.percentage, 0);
      const offset = -(priorPct / 100) * CIRC;
      return { ...item, segLen, offset };
    });
  }, [data, CIRC]);

  return (
    <div className="position-relative">
      <div className="mb-3">
        <h6 className="fw-bold text-muted fs-11 text-uppercase mb-0" style={{ letterSpacing: '0.6px' }}>KART BAZLI HARCAMA DAĞILIMI</h6>
        <p className="text-muted fs-12 mb-0">Her bir kredi kartının toplam harcamadaki payı</p>
      </div>

      {hovered && (
        <div className="cca-floating-tooltip">
          <span>{hovered.name}:</span>
          <strong>{formatCurrency(hovered.total)}</strong>
          <span className="opacity-75">(%{hovered.percentage.toFixed(1)})</span>
        </div>
      )}

      {data.length === 0 ? (
        <div className="text-center py-4 text-muted small">Kart dağılım verisi bulunamadı.</div>
      ) : (
        <div className="row align-items-center g-4">
          <div className="col-12 col-md-5 text-center">
            <div className="position-relative d-inline-block" style={{ width: '190px', height: '190px' }}>
              <svg viewBox="0 0 100 100" width="190" height="190" style={{ transform: 'rotate(-90deg)' }}>
                {/* Track */}
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="11" />
                {/* Segments */}
                {segments.map((item) => {
                  if (item.segLen <= 0) return null;
                  return (
                    <circle
                      key={item.id}
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="11"
                      strokeDasharray={`${Math.max(0, item.segLen - 1.2)} ${CIRC - Math.max(0, item.segLen - 1.2)}`}
                      strokeDashoffset={item.offset}
                      className="cca-donut-ring"
                      onMouseEnter={() => setHovered(item)}
                      onMouseLeave={() => setHovered(null)}
                    />
                  );
                })}
              </svg>

              <div className="position-absolute top-50 start-50 translate-middle text-center pointer-events-none">
                <div className="text-muted fw-bold" style={{ fontSize: '10px', letterSpacing: '0.8px' }}>TOPLAM</div>
                <div className="fw-heavy text-dark fs-15">{formatShortCurrency(total)}</div>
                <div className="text-muted" style={{ fontSize: '10px' }}>{count} Harcama</div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-7">
            <div className="d-flex flex-column gap-2.5">
              {data.map(item => (
                <div
                  key={item.id}
                  className="d-flex align-items-center justify-content-between py-1.5 px-2 rounded-3"
                  onMouseEnter={() => setHovered(item)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ background: hovered?.id === item.id ? 'rgba(0,0,0,0.03)' : 'transparent' }}
                >
                  <div className="d-flex align-items-center gap-2.5 overflow-hidden">
                    <span className="rounded-circle flex-shrink-0" style={{ width: '10px', height: '10px', backgroundColor: item.color }} />
                    <span className="fw-bold fs-13 text-dark text-truncate">{item.name}</span>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <span className="text-muted fs-11">{item.count} işlem</span>
                    <span className="fw-bold text-primary fs-12" style={{ minWidth: '50px', textAlign: 'right' }}>
                      %{item.percentage.toFixed(1)}
                    </span>
                    <span className="fw-heavy text-dark fs-13" style={{ minWidth: '95px', textAlign: 'right' }}>
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 3. Bank Distribution Chart
function BankDistributionChart({ data }) {
  return (
    <div>
      <div className="mb-3">
        <h6 className="fw-bold text-muted fs-11 text-uppercase mb-0" style={{ letterSpacing: '0.6px' }}>BANKALARA GÖRE HARCAMA DAĞILIMI</h6>
        <p className="text-muted fs-12 mb-0">Kredi kartlarının bağlı olduğu bankalardaki toplam harcama</p>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-4 text-muted small">Banka verisi bulunamadı.</div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {data.map(item => (
            <div key={item.id}>
              <div className="d-flex align-items-center justify-content-between mb-1.5">
                <div className="d-flex align-items-center gap-2.5">
                  <div className="cca-avatar-circle" style={{ width: '30px', height: '30px', borderRadius: '8px' }}>
                    {item.logo ? <img src={item.logo} alt="" style={{ width: '18px', height: '18px' }} /> : <Landmark size={15} className="text-muted" />}
                  </div>
                  <span className="fw-bold fs-13 text-dark">{item.name}</span>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span className="text-muted fs-11">{item.count} işlem</span>
                  <span className="fw-bold text-primary fs-12">%{item.percentage.toFixed(1)}</span>
                  <span className="fw-heavy text-dark fs-13">{formatCurrency(item.total)}</span>
                </div>
              </div>
              <div className="progress" style={{ height: '8px', borderRadius: '10px', backgroundColor: 'rgba(0,0,0,0.05)' }}>
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{
                    width: `${item.percentage}%`,
                    background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                    borderRadius: '10px'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 4. Day of Week Chart
function DayOfWeekChart({ data, split }) {
  const [hovered, setHovered] = useState(null);
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const chartHeight = 170;

  return (
    <div className="position-relative">
      <div className="mb-3">
        <h6 className="fw-bold text-muted fs-11 text-uppercase mb-0" style={{ letterSpacing: '0.6px' }}>HAFTANIN GÜNLERİNE GÖRE HARCAMA</h6>
        <p className="text-muted fs-12 mb-0">Haftanın hangi günlerinde harcamalar yoğunlaşıyor?</p>
      </div>

      {hovered && (
        <div className="cca-floating-tooltip">
          <span>{hovered.name}:</span>
          <strong>{formatCurrency(hovered.total)}</strong>
          <span className="opacity-75">(%{hovered.percentage.toFixed(1)})</span>
        </div>
      )}

      <div className="d-flex align-items-end justify-content-between gap-2.5 mb-4" style={{ height: `${chartHeight}px` }}>
        {data.map(item => {
          const heightPct = (item.total / maxVal) * 100;
          const barH = Math.max(heightPct > 0 ? (heightPct / 100) * (chartHeight - 35) : 5, 5);

          return (
            <div
              key={item.num}
              className="flex-grow-1 text-center d-flex flex-column align-items-center justify-content-end h-100"
              onMouseEnter={() => setHovered(item)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="w-100 cca-bar-element"
                style={{
                  height: `${barH}px`,
                  background: item.isWeekend
                    ? 'linear-gradient(180deg, #f97316 0%, #dc2626 100%)'
                    : 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)',
                  borderRadius: '8px 8px 3px 3px'
                }}
              />
              <span className="fs-11 mt-2 text-muted fw-bold">{item.short}</span>
            </div>
          );
        })}
      </div>

      {/* Weekday vs Weekend Comparison Cards */}
      <div className="row g-2.5">
        <div className="col-6">
          <div className="p-3 rounded-4 bg-primary bg-opacity-10 border border-primary border-opacity-10">
            <div className="d-flex align-items-center gap-1.5 fs-11 text-primary fw-bold mb-1">
              <span className="rounded-circle bg-primary" style={{ width: '7px', height: '7px' }} />
              Hafta İçi (Pzt-Cum)
            </div>
            <div className="fw-heavy fs-15 text-dark">{formatCurrency(split.weekday)}</div>
            <div className="text-primary fw-bold fs-11">Pay: %{split.weekdayPct.toFixed(1)}</div>
          </div>
        </div>

        <div className="col-6">
          <div className="p-3 rounded-4 bg-warning bg-opacity-10 border border-warning border-opacity-10">
            <div className="d-flex align-items-center gap-1.5 fs-11 text-warning fw-bold mb-1">
              <span className="rounded-circle bg-warning" style={{ width: '7px', height: '7px' }} />
              Hafta Sonu (Cmt-Paz)
            </div>
            <div className="fw-heavy fs-15 text-dark">{formatCurrency(split.weekend)}</div>
            <div className="text-warning fw-bold fs-11">Pay: %{split.weekendPct.toFixed(1)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 5. Cumulative Spending Chart (Smooth Area + Spine)
function CumulativeChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const maxVal = Math.max(...data.map(d => d.cumulativeSpend), 1);
  const w = 600;
  const h = 200;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.cumulativeSpend / maxVal) * (h - 30) - 15;
    return { x, y, day: d.day, spend: d.cumulativeSpend, daily: d.dailySpend };
  });

  const pathStr = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = `0,${h} ${pathStr} ${w},${h}`;

  return (
    <div className="position-relative">
      <div className="mb-3">
        <h6 className="fw-bold text-muted fs-11 text-uppercase mb-0" style={{ letterSpacing: '0.6px' }}>KÜMÜLATİF HARCAMA ARTIŞI</h6>
        <p className="text-muted fs-12 mb-0">Ay boyunca harcamanın gün gün birikme ve hızlanma eğrisi</p>
      </div>

      {hovered && (
        <div className="cca-floating-tooltip">
          <span>{hovered.day}. Gün:</span>
          <strong>{formatCurrency(hovered.spend)}</strong>
          <span className="opacity-75">(Günlük: {formatShortCurrency(hovered.daily)})</span>
        </div>
      )}

      <div className="position-relative w-100">
        <svg viewBox={`0 0 ${w} ${h}`} className="cca-chart-svg" style={{ height: '200px' }}>
          <defs>
            <linearGradient id="ccaCumulGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <polygon points={areaPath} fill="url(#ccaCumulGrad)" />

          {/* Spine Line */}
          <polyline
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            points={pathStr}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Markers */}
          {[1, 5, 10, 15, 20, 25, 30].map(day => {
            const pt = points[day - 1];
            if (!pt) return null;
            return (
              <g
                key={day}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(pt)}
                onMouseLeave={() => setHovered(null)}
              >
                <line x1={pt.x} y1={0} x2={pt.x} y2={h} stroke="rgba(0,0,0,0.06)" strokeDasharray="3 3" />
                <circle cx={pt.x} cy={pt.y} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                <text x={pt.x} y={h - 2} fontSize="9" fontWeight="600" fill="#94a3b8" textAnchor="middle">{day}. Gün</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// 6. Top Merchants Leaderboard
function TopMerchantsChart({ data }) {
  return (
    <div>
      <div className="mb-3">
        <h6 className="fw-bold text-muted fs-11 text-uppercase mb-0" style={{ letterSpacing: '0.6px' }}>EN ÇOK HARCAMA YAPILAN YERLER</h6>
        <p className="text-muted fs-12 mb-0">İşlem başlıklarına göre en yüksek harcama yapılan ilk 10 kalem</p>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-4 text-muted small">Harcama kalemi bulunamadı.</div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {data.map((item, idx) => (
            <div key={item.title} className="d-flex align-items-center justify-content-between p-2.5 rounded-3 bg-white bg-opacity-70 border border-light">
              <div className="d-flex align-items-center gap-3 overflow-hidden">
                <span className={`cca-rank-circle ${idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other'}`}>
                  {idx + 1}
                </span>
                <div>
                  <div className="fw-bold fs-13 text-dark text-truncate">{item.title}</div>
                  <div className="text-muted fs-10">{item.count} kez harcandı</div>
                </div>
              </div>

              <div className="text-end flex-shrink-0">
                <div className="fw-heavy fs-13 text-dark">{formatCurrency(item.total)}</div>
                <div className="text-primary fw-bold fs-10">%{item.percentage.toFixed(1)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 7. Amount Buckets Histogram
function AmountBucketsChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const chartHeight = 160;

  return (
    <div className="position-relative">
      <div className="mb-3">
        <h6 className="fw-bold text-muted fs-11 text-uppercase mb-0" style={{ letterSpacing: '0.6px' }}>TUTAR ARALIKLARINA GÖRE HARCAMA</h6>
        <p className="text-muted fs-12 mb-0">Küçük, orta ve büyük harcamaların dağılımı ve işlem sıklığı</p>
      </div>

      {hovered && (
        <div className="cca-floating-tooltip">
          <span>{hovered.label}:</span>
          <strong>{formatCurrency(hovered.total)}</strong>
          <span className="opacity-75">({hovered.count} işlem)</span>
        </div>
      )}

      <div className="d-flex align-items-end justify-content-between gap-2 mb-3" style={{ height: `${chartHeight}px` }}>
        {data.map((b) => {
          const heightPct = (b.total / maxVal) * 100;
          const barH = Math.max(heightPct > 0 ? (heightPct / 100) * (chartHeight - 35) : 5, 5);

          return (
            <div
              key={b.label}
              className="flex-grow-1 text-center d-flex flex-column align-items-center justify-content-end h-100"
              onMouseEnter={() => setHovered(b)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="w-100 cca-bar-element"
                style={{
                  height: `${barH}px`,
                  background: 'linear-gradient(180deg, #6366f1 0%, #a855f7 100%)',
                  borderRadius: '8px 8px 3px 3px'
                }}
              />
              <span className="fs-10 mt-2 text-muted fw-semibold text-truncate" style={{ width: '100%', fontSize: '10px' }}>
                {b.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="d-flex flex-column gap-1 border-top pt-2.5">
        {data.map(b => (
          <div key={b.label} className="d-flex align-items-center justify-content-between py-1 fs-12">
            <span className="fw-semibold text-dark">{b.label}</span>
            <div className="d-flex align-items-center gap-3">
              <span className="text-muted fs-11">{b.count} İşlem</span>
              <span className="fw-heavy text-dark">{formatCurrency(b.total)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 8. Day of Month Matrix
function DayOfMonthChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const chartHeight = 160;

  return (
    <div className="position-relative">
      <div className="mb-3">
        <h6 className="fw-bold text-muted fs-11 text-uppercase mb-0" style={{ letterSpacing: '0.6px' }}>AYIN GÜNLERİNE GÖRE DAĞILIM (1-31)</h6>
        <p className="text-muted fs-12 mb-0">Ayın hangi günlerinde harcamalar yoğunlaşıyor?</p>
      </div>

      {hovered && (
        <div className="cca-floating-tooltip">
          <span>{hovered.day}. Gün:</span>
          <strong>{formatCurrency(hovered.total)}</strong>
          <span className="opacity-75">({hovered.count} işlem)</span>
        </div>
      )}

      <div className="d-flex align-items-end justify-content-between gap-1" style={{ height: `${chartHeight}px` }}>
        {data.map(item => {
          const heightPct = (item.total / maxVal) * 100;
          const barH = Math.max(heightPct > 0 ? (heightPct / 100) * (chartHeight - 30) : 4, 4);

          return (
            <div
              key={item.day}
              className="flex-grow-1 text-center d-flex flex-column align-items-center justify-content-end h-100"
              onMouseEnter={() => setHovered(item)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="w-100 cca-bar-element"
                style={{
                  height: `${barH}px`,
                  background: item.total > 0 ? 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(0,0,0,0.04)',
                  borderRadius: '4px 4px 1px 1px'
                }}
              />
              <span className="fs-10 mt-1.5 text-muted" style={{ fontSize: '9px' }}>
                {item.day % 5 === 0 || item.day === 1 ? item.day : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================================================
// MARK: - Modals
// ==========================================================================

function CreditCardSettingsModal({
  show,
  onHide,
  quickActionTags,
  selectedCreditCardIds,
  cardLimits,
  getQATransactionCount,
  onSave
}) {
  if (!show) return null;

  return (
    <CreditCardSettingsModalContent
      show={show}
      onHide={onHide}
      quickActionTags={quickActionTags}
      initialSelectedIds={selectedCreditCardIds}
      initialLimits={cardLimits}
      getQATransactionCount={getQATransactionCount}
      onSave={onSave}
    />
  );
}

function CreditCardSettingsModalContent({
  show,
  onHide,
  quickActionTags,
  initialSelectedIds,
  initialLimits,
  getQATransactionCount,
  onSave
}) {
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);
  const [limits, setLimits] = useState(initialLimits);
  const [search, setSearch] = useState('');

  const filteredQAs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return quickActionTags;
    return quickActionTags.filter(qa => (qa.name || '').toLowerCase().includes(q));
  }, [quickActionTags, search]);

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSave = () => {
    onSave(selectedIds, limits);
    Swal.fire({
      icon: 'success',
      title: 'Ayarlar Kaydedildi',
      timer: 1200,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold fs-18 d-flex align-items-center gap-2">
          <Settings size={18} className="text-primary" /> Kredi Kartı Ayarları
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-2">
        <p className="text-muted fs-12 mb-3">
          Hızlı İşlemler listenizdeki kredi kartı başlıklarınızı işaretleyin. Her kart için isteğe bağlı aylık harcama limiti (TL) belirleyebilirsiniz.
        </p>

        <div className="position-relative mb-3">
          <Search size={14} className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
          <Form.Control
            type="text"
            placeholder="Hızlı işlem ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-5 rounded-pill fs-13"
          />
        </div>

        <div className="d-flex flex-column gap-2 overflow-auto pe-1" style={{ maxHeight: '420px' }}>
          {filteredQAs.map(qa => {
            const isChecked = selectedIds.includes(qa.id);
            const count = getQATransactionCount(qa.id);
            const color = cardColorFromTagColor(qa.color);

            return (
              <div
                key={qa.id}
                className={`p-3 rounded-4 border transition-all ${
                  isChecked ? 'bg-primary bg-opacity-10 border-primary' : 'bg-light border-light'
                }`}
              >
                <div
                  className="d-flex align-items-center justify-content-between cursor-pointer"
                  onClick={() => toggleSelect(qa.id)}
                >
                  <div className="d-flex align-items-center gap-2.5">
                    <Form.Check
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="cursor-pointer"
                    />
                    <span className="rounded-circle" style={{ width: '10px', height: '10px', backgroundColor: color }} />
                    <span className="fw-bold fs-14 text-dark">{qa.name}</span>
                  </div>

                  <span className="badge bg-white text-muted border rounded-pill px-2.5 py-1 fw-bold fs-11">
                    {count} işlem
                  </span>
                </div>

                {/* Sub-inputs if selected */}
                {isChecked && (
                  <div className="row g-2 mt-2 pt-2 border-top border-primary border-opacity-15">
                    <div className="col-12 col-md-6">
                      <Form.Label className="fs-11 fw-bold text-muted mb-1">Aylık Limit (TL)</Form.Label>
                      <Form.Control
                        type="number"
                        size="sm"
                        placeholder="Limitsiz"
                        value={limits[qa.id] || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setLimits(prev => ({
                            ...prev,
                            [qa.id]: isNaN(val) ? undefined : val
                          }));
                        }}
                        className="rounded-3 fw-bold fs-13"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <Button variant="light" size="sm" onClick={onHide} className="rounded-pill px-3 fw-bold fs-12">
          Vazgeç
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave} className="rounded-pill px-4 fw-bold fs-12 shadow-sm">
          Kaydet
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function EditTransactionModal({ show, transaction, banks, typeTags, onHide }) {
  if (!show || !transaction) return null;

  return (
    <EditTransactionModalContent
      show={show}
      transaction={transaction}
      banks={banks}
      typeTags={typeTags}
      onHide={onHide}
    />
  );
}

function EditTransactionModalContent({ show, transaction, banks, typeTags, onHide }) {
  const { user } = useAuth();
  const [draft, setDraft] = useState({
    title: transaction.title || '',
    amount: Math.abs(parseAmt(transaction.amount)),
    date: transaction.date || '',
    bankId: transaction.bankId || '',
    type: transaction.type || '',
    quickActions: transaction.quickActions || [],
    receiptUrl: transaction.receiptUrl || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.uid || !transaction?.id) return;
    setSaving(true);
    try {
      const amt = -Math.abs(parseFloat(draft.amount) || 0);
      await updateDoc(doc(db, `users/${user.uid}/bankTransactions`, transaction.id), {
        title: draft.title.trim(),
        amount: amt,
        date: draft.date,
        bankId: draft.bankId,
        type: draft.type,
        quickActions: draft.quickActions,
        receiptUrl: draft.receiptUrl.trim()
      });
      Swal.fire({
        icon: 'success',
        title: 'İşlem Güncellendi',
        timer: 1200,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
      onHide();
    } catch (err) {
      console.error('Error updating transaction:', err);
      Swal.fire({ icon: 'error', title: 'Hata', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold fs-16">Harcama Detayı & Düzenle</Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-2">
        <Form className="d-flex flex-column gap-3">
          <div>
            <Form.Label className="fs-12 fw-bold text-muted mb-1">İşlem Başlığı</Form.Label>
            <Form.Control
              type="text"
              value={draft.title}
              onChange={(e) => setDraft(prev => ({ ...prev, title: e.target.value }))}
              className="rounded-3 fs-13"
            />
          </div>

          <div className="row g-2">
            <div className="col-6">
              <Form.Label className="fs-12 fw-bold text-muted mb-1">Tutar (TL)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={draft.amount}
                onChange={(e) => setDraft(prev => ({ ...prev, amount: e.target.value }))}
                className="rounded-3 fs-13 fw-bold text-danger"
              />
            </div>
            <div className="col-6">
              <Form.Label className="fs-12 fw-bold text-muted mb-1">Tarih</Form.Label>
              <Form.Control
                type="date"
                value={draft.date}
                onChange={(e) => setDraft(prev => ({ ...prev, date: e.target.value }))}
                className="rounded-3 fs-13"
              />
            </div>
          </div>

          <div className="row g-2">
            <div className="col-6">
              <Form.Label className="fs-12 fw-bold text-muted mb-1">Banka</Form.Label>
              <Form.Select
                value={draft.bankId}
                onChange={(e) => setDraft(prev => ({ ...prev, bankId: e.target.value }))}
                className="rounded-3 fs-13"
              >
                <option value="">Seçiniz...</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Form.Select>
            </div>
            <div className="col-6">
              <Form.Label className="fs-12 fw-bold text-muted mb-1">İşlem Türü</Form.Label>
              <Form.Select
                value={draft.type}
                onChange={(e) => setDraft(prev => ({ ...prev, type: e.target.value }))}
                className="rounded-3 fs-13"
              >
                <option value="">Seçiniz...</option>
                {typeTags.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Form.Select>
            </div>
          </div>

          <div>
            <Form.Label className="fs-12 fw-bold text-muted mb-1">Dekont URL</Form.Label>
            <Form.Control
              type="url"
              placeholder="https://..."
              value={draft.receiptUrl}
              onChange={(e) => setDraft(prev => ({ ...prev, receiptUrl: e.target.value }))}
              className="rounded-3 fs-13"
            />
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <Button variant="light" size="sm" onClick={onHide} className="rounded-pill px-3 fw-bold fs-12">
          Kapat
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={saving}
          onClick={handleSave}
          className="rounded-pill px-4 fw-bold fs-12 shadow-sm"
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
