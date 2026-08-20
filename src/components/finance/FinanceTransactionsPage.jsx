import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { updateStockPortfolioSummary, resyncAllFinanceSummaries, parseAmt } from '../../utils/accountSummaryHelper';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  limit,
  getDocs,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { Button, Form, Card, Row, Col, Table, Badge, Dropdown, Modal, Overlay, Collapse } from 'react-bootstrap';
import {
  Trash2,
  Plus,
  Settings,
  ArrowUpDown,
  Wallet,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Check,
  List as ListIcon,
  MoreHorizontal,
  Landmark,
  Zap,
  Search,
  Maximize2,
  SlidersHorizontal,
  Type,
  GripVertical,
  Edit2,
  Calendar,
  Sparkles,
  ListFilter,
  Eye,
  EyeOff,
  Rows,
  PaintRoller,
  CircleDot,
  CircleDollarSign,
  Link2,
  ChevronsUpDown,
  X,
  Table as TableIcon,
  List,
  Banknote,
  CreditCard,
  WrapText,
  ArrowUp,
  ArrowDown,
  Clipboard,
  Copy,
  Upload,
  Download,
  FileSpreadsheet,
  ExternalLink,
  Filter,
  Tag,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Percent,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  ShoppingBag,
  Sigma,
  Briefcase
} from 'lucide-react';

// Dnd Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    whiteSpace: 'nowrap'
  };
};

// Visible date input that allows both manual typing and auto-opens calendar
const DateCellInput = ({ value, onSave, onCancel }) => {
  const ref = React.useRef(null);
  const [draft, setDraft] = React.useState(value || '');

  React.useEffect(() => {
    if (ref.current) {
      const timer = setTimeout(() => {
        try { ref.current.showPicker(); } catch (e) { }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <Form.Control
      ref={ref}
      type="date"
      value={draft}
      className="border-0 bg-transparent p-0 cell-date-input fs-14"
      style={{ boxShadow: 'none' }}
      onChange={e => {
        const val = e.target.value;
        setDraft(val);
        if (val) {
          onSave(val);
        }
      }}
      onBlur={() => onSave(draft)}
      onKeyDown={e => {
        if (e.key === 'Enter') onSave(draft);
        if (e.key === 'Escape') onCancel();
      }}
    />
  );
};

const BulkDateInput = ({ value, onSave, onClear }) => {
  const ref = React.useRef(null);
  const [draft, setDraft] = React.useState(value || '');

  React.useEffect(() => {
    setDraft(value || '');
  }, [value]);

  return (
    <div className="d-flex align-items-center gap-2">
      <Form.Control
        ref={ref}
        type="date"
        value={draft}
        size="sm"
        className="fs-12 border-0 bg-light rounded-pill px-3"
        style={{ width: '130px' }}
        onChange={e => {
          const val = e.target.value;
          setDraft(val);
          if (val) onSave(val);
        }}
      />
      {draft && (
        <X 
          size={14} 
          className="text-muted cursor-pointer hover-text-danger" 
          onClick={() => { setDraft(''); onClear(); }}
        />
      )}
    </div>
  );
};

const PROPERTIES = [
  { id: 'date', label: 'Tarih', icon: <Calendar size={14} /> },
  { id: 'institutionId', label: 'Aracı Kurum', icon: <Landmark size={14} /> },
  { id: 'stockId', label: 'Hisse', icon: <TrendingUp size={14} /> },
  { id: 'type', label: 'İşlem Türü', icon: <CircleDot size={14} /> },
  { id: 'quantity', label: 'Adet', icon: <List size={14} /> },
  { id: 'price', label: 'Fiyat', icon: <Banknote size={14} /> },
  { id: 'taxRate', label: 'Stopaj (%)', icon: <Percent size={14} />, type: 'number' },
  { id: 'remainingQuantity', label: 'Kalan Adet', icon: <ListFilter size={14} />, type: 'number' },
  { id: 'taxDeduction', label: 'Stopaj Kesintisi', icon: <ShieldCheck size={14} />, type: 'number' },
  { id: 'totalBuyAmount', label: 'Toplam Alış', icon: <ShoppingBag size={14} />, type: 'number' },
  { id: 'totalSaleAmount', label: 'Toplam Satış', icon: <DollarSign size={14} />, type: 'number' },
  { id: 'avgBuyPrice', label: 'Ortalama Alış Fiyatı', icon: <Banknote size={14} />, type: 'number' },
  { id: 'grossProfit', label: 'Brüt Kazanç', icon: <TrendingUp size={14} />, type: 'number' },
  { id: 'totalProfit', label: 'Net Kazanç', icon: <TrendingUp size={14} />, type: 'number' },
];

const ICON_LIST = [
  { name: 'Calendar', icon: <Calendar size={14} /> },
  { name: 'Type', icon: <Type size={14} /> },
  { name: 'List', icon: <List size={14} /> },
  { name: 'CircleDot', icon: <CircleDot size={14} /> },
  { name: 'Banknote', icon: <Banknote size={14} /> },
  { name: 'Link2', icon: <Link2 size={14} /> },
  { name: 'Landmark', icon: <Landmark size={14} /> },
  { name: 'TrendingUp', icon: <TrendingUp size={14} /> },
  { name: 'Percent', icon: <Percent size={14} /> },
  { name: 'PieChart', icon: <PieChart size={14} /> },
  { name: 'ShieldAlert', icon: <ShieldAlert size={14} /> },
];

const getPropertyIcon = (id, config) => {
  const customIconName = config.propertyIcons?.[id];
  if (customIconName) {
    const found = ICON_LIST.find(i => i.name === customIconName);
    if (found) return found.icon;
  }
  return PROPERTIES.find(p => p.id === id)?.icon;
};

const SimulationCalculatorCard = ({ 
  currentPortfolio, 
  stocks, 
  transactions, 
  simStockId, 
  setSimStockId, 
  simQuantity, 
  setSimQuantity, 
  simPrice, 
  setSimPrice 
}) => {
  return (
    <Card className="glass-card border shadow-lg p-4 h-100" style={{ borderRadius: '20px' }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <div className="rounded bg-success bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>
          <Sparkles size={20} className="text-success" />
        </div>
        <span className="fw-bold fs-18">Kazanç Hesaplayıcı</span>
      </div>
      
      <Row className="g-3">
        <Col xs={12}>
          <Form.Select 
            size="lg" 
            className="rounded-3 border-light bg-theme-light fs-15 py-2.5"
            value={simStockId}
            onChange={e => {
              setSimStockId(e.target.value);
              const stock = currentPortfolio.find(s => s.id === e.target.value);
              if (stock) {
                setSimQuantity(stock.quantity.toString());
                const dbStock = stocks.find(s => s.id === e.target.value);
                if (dbStock && dbStock.currentPrice) setSimPrice(dbStock.currentPrice.toString());
              }
            }}
          >
            <option value="">Hisse Seçiniz...</option>
            {currentPortfolio.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Form.Select>
        </Col>
        <Col xs={12}>
          <Form.Control 
            size="lg" 
            type="text" 
            placeholder="Adet" 
            className="rounded-3 border-light bg-theme-light fs-15 py-2.5"
            value={simQuantity}
            onChange={e => setSimQuantity(e.target.value.replace(/[^0-9,.]/g, ''))}
          />
        </Col>
      </Row>

      {(() => {
        const stock = currentPortfolio.find(s => s.id === simStockId);
        const qty = parseFloat(simQuantity.replace(',', '.')) || 0;
        const price = parseFloat(simPrice.replace(',', '.')) || 0;
        if (!stock || !qty || !price) return <div className="text-center text-muted fs-14 py-3 opacity-50">Hesaplamak için bilgileri girin</div>;
        
        const totalValue = qty * price;
        const cost = qty * stock.avgPrice;
        const profit = totalValue - cost;
        const stockTransactions = transactions.filter(t => t.stockId === simStockId && t.type === 'ALIŞ' && !t.deleted);
        const taxRate = stockTransactions.length > 0 ? (stockTransactions[0].taxRate || 0) : 0;
        const estimatedTax = profit > 0 ? (profit * taxRate / 100) : 0;
        const netProfit = profit - estimatedTax;
        const profitPercentage = cost > 0 ? (netProfit / cost) * 100 : 0;

        return (
          <div className="mt-3 pt-2 border-top border-light border-opacity-10">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="text-muted x-small fw-bold opacity-50 text-uppercase">Toplam Değer</div>
              <div className="fw-medium fs-14 text-muted">
                {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalValue)} TL
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="text-muted x-small fw-bold opacity-50 text-uppercase">Brüt Kazanç</div>
              <div className="text-end">
                <div className={`fw-bold fs-14 ${profit > 0 ? 'text-success' : profit < 0 ? 'text-danger' : 'text-muted'}`}>
                  {profit > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(profit)} TL
                </div>
                <div className="x-small text-muted opacity-75">
                  (%{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cost > 0 ? (profit / cost * 100) : 0)})
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div className="text-muted x-small fw-bold opacity-50 text-uppercase">Stopaj Kesintisi</div>
              <div className="text-end">
                <div className="fw-bold fs-14 text-danger">
                  -{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(estimatedTax)} TL
                </div>
                <div className="x-small text-muted opacity-75">
                  (%{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cost > 0 ? (estimatedTax / cost * 100) : 0)})
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted x-small fw-bold opacity-50 text-uppercase">Net Kazanç</div>
              <div className="text-end">
                <div className={`fw-bold fs-14 ${netProfit > 0 ? 'text-success' : netProfit < 0 ? 'text-danger' : 'text-muted'}`}>
                  {netProfit > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(netProfit)} TL
                </div>
                <div className="x-small text-muted opacity-75">
                  (%{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(profitPercentage || 0)})
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </Card>
  );
};

const normalizeFinanceHeaderKey = (h) => {
  return (h || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/i̇/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
};

const mapFinanceHeaderToField = (norm) => {
  if (/^(tarih|date|zaman|tarihi)$/.test(norm)) return 'date';
  if (/^(aracikurum|aracikurumu|kurum|institution|araci|banka|broker)$/.test(norm)) return 'institutionName';
  if (/^(hisse|hisseler|stock|sembol|ticker|kod|hissekodu|hisseadi|symbol|sembolborsa)$/.test(norm)) return 'stockName';
  if (/^(islemturu|islemtur|tur|turu|durum|type|action|alissatis)$/.test(norm)) return 'typeName';
  if (/^(adet|miktar|lot|quantity|qty|sayi)$/.test(norm)) return 'quantity';
  if (/^(fiyat|price|birimfiyat|fiyati|alisveyafiyat|fiyatı)$/.test(norm)) return 'price';
  if (/^(stopaj|stopajorani|stopajyuzde|taxrate|tax|komisyon)$/.test(norm)) return 'taxRate';
  if (/^(brutkazanc|brutkar|grossprofit|brut)$/.test(norm)) return 'grossProfit';
  if (/^(netkazanc|netkar|totalprofit|net|kazanc|kar)$/.test(norm)) return 'totalProfit';
  if (/^(stopajkesintisi|vergi|taxdeduction)$/.test(norm)) return 'taxDeduction';
  if (/^(ortalamalis|ortalamaalisfiyati|avgbuyprice|maliyet)$/.test(norm)) return 'avgBuyPrice';
  return null;
};

const normalizeFinanceDate = (val) => {
  if (!val) return '';
  const s = val.trim();
  const dmyMatch = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3].length === 2 ? '20' + dmyMatch[3] : dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  const ymdMatch = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return s;
};

const normalizeFinanceNumber = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim()
    .replace(/₺/g, '')
    .replace(/TL/gi, '')
    .replace(/%/g, '')
    .replace(/\s/g, '');
  if (!str) return 0;

  if (str.includes(',') && str.includes('.')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      return parseFloat(str.replace(/,/g, '')) || 0;
    }
  } else if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  return parseFloat(str) || 0;
};

const normalizeFinanceType = (val) => {
  if (!val) return 'ALIŞ';
  const s = val.toString().trim().toLocaleUpperCase('tr-TR');
  if (s.includes('SAT') || s.includes('SELL') || s === 'S' || s === '-') return 'SATIŞ';
  return 'ALIŞ';
};

const processFinanceImportMatrix = (matrix, formatName) => {
  if (!matrix || matrix.length === 0) return { items: [], format: formatName, detectedHeaders: [], hasHeaderRow: false };

  const firstRow = matrix[0];
  const headerMap = [];
  let headerMatchCount = 0;

  firstRow.forEach((col, idx) => {
    const norm = normalizeFinanceHeaderKey(col);
    const field = mapFinanceHeaderToField(norm);
    if (field) {
      headerMap[idx] = field;
      headerMatchCount++;
    }
  });

  const hasHeaderRow = headerMatchCount >= 2 || (firstRow.length <= 3 && headerMatchCount >= 1);
  const dataRows = hasHeaderRow ? matrix.slice(1) : matrix;

  const effectiveMap = hasHeaderRow ? headerMap : [];
  if (!hasHeaderRow) {
    const colCount = Math.max(...matrix.map(r => r.length));
    if (colCount >= 11) {
      effectiveMap[0] = 'institutionName';
      effectiveMap[2] = 'stockName';
      effectiveMap[3] = 'typeName';
      effectiveMap[4] = 'quantity';
      effectiveMap[5] = 'price';
      effectiveMap[6] = 'taxRate';
      effectiveMap[10] = 'date';
    } else if (colCount >= 7) {
      ['date', 'institutionName', 'stockName', 'typeName', 'quantity', 'price', 'taxRate'].forEach((f, idx) => {
        effectiveMap[idx] = f;
      });
    } else if (colCount === 6) {
      ['date', 'institutionName', 'stockName', 'typeName', 'quantity', 'price'].forEach((f, idx) => {
        effectiveMap[idx] = f;
      });
    } else if (colCount === 5) {
      ['date', 'stockName', 'typeName', 'quantity', 'price'].forEach((f, idx) => {
        effectiveMap[idx] = f;
      });
    } else if (colCount === 4) {
      ['date', 'stockName', 'quantity', 'price'].forEach((f, idx) => {
        effectiveMap[idx] = f;
      });
    } else {
      ['stockName', 'quantity', 'price'].forEach((f, idx) => {
        effectiveMap[idx] = f;
      });
    }
  }

  const items = dataRows.map((row) => {
    const item = {
      date: '',
      institutionName: '',
      stockName: '',
      typeName: 'ALIŞ',
      quantity: 0,
      price: 0,
      taxRate: 0,
      grossProfit: 0,
      totalProfit: 0,
      taxDeduction: 0,
      avgBuyPrice: 0
    };

    row.forEach((val, idx) => {
      const field = effectiveMap[idx];
      if (!field) return;
      if (field === 'date') item.date = normalizeFinanceDate(val);
      else if (field === 'institutionName') item.institutionName = (val || '').trim();
      else if (field === 'stockName') item.stockName = (val || '').trim().toUpperCase();
      else if (field === 'typeName') item.typeName = normalizeFinanceType(val);
      else if (field === 'quantity') item.quantity = normalizeFinanceNumber(val);
      else if (field === 'price') item.price = normalizeFinanceNumber(val);
      else if (field === 'taxRate') item.taxRate = normalizeFinanceNumber(val);
      else if (field === 'grossProfit') item.grossProfit = normalizeFinanceNumber(val);
      else if (field === 'totalProfit') item.totalProfit = normalizeFinanceNumber(val);
      else if (field === 'taxDeduction') item.taxDeduction = normalizeFinanceNumber(val);
      else if (field === 'avgBuyPrice') item.avgBuyPrice = normalizeFinanceNumber(val);
    });

    if (!item.date) item.date = new Date().toISOString().split('T')[0];

    const hasContent = item.stockName || item.quantity > 0 || item.price > 0;
    return hasContent ? item : null;
  }).filter(Boolean);

  const detectedHeaders = effectiveMap.filter(Boolean);
  return { items, format: formatName, detectedHeaders, hasHeaderRow };
};

const parseFinanceImportText = (rawText) => {
  if (!rawText || !rawText.trim()) return { items: [], format: '', detectedHeaders: [], hasHeaderRow: false };

  const text = rawText.trim();

  // 1. HTML tablosu kontrolü
  if (text.includes('<tr') || text.includes('<td')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<table>${text}</table>`, 'text/html');
      const trs = Array.from(doc.querySelectorAll('tr'));
      if (trs.length > 0) {
        const matrix = trs.map(tr => {
          const cells = Array.from(tr.querySelectorAll('th, td'));
          return cells.map(td => td.innerText.trim());
        }).filter(r => r.length > 0);

        if (matrix.length > 0) {
          return processFinanceImportMatrix(matrix, 'HTML Tablo');
        }
      }
    } catch (e) {
      console.warn('HTML parse error, text parsing devrede', e);
    }
  }

  // 2. Metin ayrıştırma (TSV / CSV)
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { items: [], format: '', detectedHeaders: [], hasHeaderRow: false };

  let tabCount = 0;
  let semiCount = 0;
  let commaCount = 0;
  const sampleLines = lines.slice(0, 5);
  sampleLines.forEach(l => {
    tabCount += (l.match(/\t/g) || []).length;
    semiCount += (l.match(/;/g) || []).length;
    commaCount += (l.match(/,/g) || []).length;
  });

  let delimiter = '\t';
  let formatName = 'Google E-Tablo / Excel (TSV)';
  if (tabCount === 0) {
    if (semiCount >= commaCount && semiCount > 0) {
      delimiter = ';';
      formatName = 'CSV (Noktalı Virgül)';
    } else if (commaCount > 0) {
      delimiter = ',';
      formatName = 'CSV (Virgül)';
    }
  }

  const parseLine = (line, delim) => {
    if (delim === '\t') {
      return line.split('\t').map(c => c.replace(/^"|"$/g, '').trim());
    }
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delim && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const matrix = lines.map(l => parseLine(l, delimiter)).filter(r => r.length > 0 && r.some(c => c.length > 0));
  return processFinanceImportMatrix(matrix, formatName);
};

const FINANCE_FIELD_LABEL_MAP = {
  date: 'Tarih',
  institutionName: 'Aracı Kurum',
  stockName: 'Hisse',
  typeName: 'İşlem Türü',
  quantity: 'Adet',
  price: 'Fiyat',
  taxRate: 'Stopaj (%)',
  grossProfit: 'Brüt Kazanç',
  totalProfit: 'Net Kazanç',
  taxDeduction: 'Stopaj Kesintisi',
  avgBuyPrice: 'Ortalama Alış Fiyatı'
};

const ImportModal = ({ show, onHide, onImport, institutions = [], stocks = [] }) => {
  const [text, setText] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  const parsed = React.useMemo(() => parseFinanceImportText(text), [text]);
  const { items, format, detectedHeaders } = parsed;

  const handlePasteClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(clipText);
        setErrorMessage('');
      }
    } catch (e) {
      console.warn('Clipboard read error', e);
    }
  };

  const handleClear = () => {
    setText('');
    setErrorMessage('');
  };

  const handleProcess = async () => {
    if (!items || items.length === 0) {
      setErrorMessage('İçe aktarılacak geçerli bir veri bulunamadı.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onImport(items);
      setText('');
      onHide();
    } catch (err) {
      console.error('Import error', err);
      setErrorMessage('İçe aktarılırken bir hata oluştu: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDisplayDate = (dStr) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dStr;
  };

  const formatDisplayNumber = (val, decimals = 2) => {
    const n = typeof val === 'number' ? val : parseFloat(val) || 0;
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px 14px', borderBottom: '1.5px solid #f3f4f6', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Upload size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>Hisse İşlemlerini İçe Aktar</div>
              <div style={{ fontSize: '11.5px', color: '#9ca3af', marginTop: '2px' }}>
                Google E-Tablolar, Excel, TSV, CSV veya HTML formatındaki borsa işlemlerinizi yapıştırın
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onHide}
            style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', flexShrink: 0 }}
          >
            <X size={15} />
          </button>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* TEXTAREA CONTAINER */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#374151' }}>Veri Giriş Alanı</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer' }}
                >
                  <Clipboard size={12} /> Panodan Yapıştır
                </button>
                {text && (
                  <button
                    type="button"
                    onClick={handleClear}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#fff', color: '#ef4444', fontSize: '11.5px', fontWeight: 500, cursor: 'pointer' }}
                  >
                    <Trash2 size={12} /> Temizle
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={5}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Örnek (Başlık satırlı veya başlıksız yapıştırabilirsiniz):\nTarih\tAracı Kurum\tHisse\tİşlem Türü\tAdet\tFiyat\tStopaj (%)\n20.08.2026\tGaranti Yatırım\tTHYAO\tALIŞ\t100\t285,50\t0\n19.08.2026\tMidas\tEREGL\tSATIŞ\t50\t48,20\t10`}
              style={{
                width: '100%',
                borderRadius: '10px',
                border: '1.5px solid #e5e7eb',
                padding: '10px 12px',
                fontSize: '12px',
                fontFamily: 'monospace',
                lineHeight: 1.5,
                background: '#fafafa',
                outline: 'none',
                resize: 'vertical',
                minHeight: '90px'
              }}
            />
          </div>

          {/* DETECTED INFO BAR */}
          {items.length > 0 && (
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', background: '#16a34a', color: '#fff', fontSize: '11.5px', fontWeight: 700 }}>
                  <CheckCircle2 size={12} /> {items.length} İşlem Algılandı
                </span>
                <span style={{ padding: '3px 9px', borderRadius: '20px', background: '#e0e7ff', color: '#3730a3', fontSize: '11px', fontWeight: 600 }}>
                  Format: {format}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>Eşleşen Sütunlar:</span>
                {detectedHeaders.map((h, i) => (
                  <span key={i} style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '6px', background: '#dcfce7', color: '#166534', fontWeight: 600 }}>
                    {FINANCE_FIELD_LABEL_MAP[h] || h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ERROR ALERT */}
          {errorMessage && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontSize: '12px' }}>
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* PREVIEW TABLE */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>İçe Aktarılacak Veri Önizlemesi</span>
                <span style={{ fontSize: '11.5px', color: '#9ca3af' }}>
                  {items.length > 0 ? `${items.length} kaydın tümü listeleniyor` : 'Henüz veri girilmedi'}
                </span>
              </div>
            </div>

            <div style={{ border: '1px solid #f3f4f6', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '230px' }}>
                {items.length === 0 ? (
                  <div style={{ padding: '36px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '12.5px' }}>
                    Yukarıdaki metin alanına verilerinizi yapıştırın. Önizleme burada anında görünecektir.
                  </div>
                ) : (
                  <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%', fontVariantNumeric: 'tabular-nums', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>#</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>Tarih</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>Aracı Kurum</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>Hisse</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>İşlem Türü</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>Adet</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>Fiyat</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>Toplam Tutar</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>Brüt Kazanç</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>Net Kazanç</th>
                        <th style={{ padding: '8px 12px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right', position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>Stopaj (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const isBuy = item.typeName === 'ALIŞ';
                        const totalAmt = item.quantity * item.price;
                        const hasGrossProfit = item.grossProfit !== undefined && item.grossProfit !== 0;
                        const hasTotalProfit = item.totalProfit !== undefined && item.totalProfit !== 0;

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f8fafc', background: idx % 2 === 0 ? '#fff' : '#fcfcfd' }}>
                            <td style={{ padding: '7px 12px', color: '#cbd5e1', fontWeight: 500 }}>{idx + 1}</td>
                            <td style={{ padding: '7px 12px', color: '#6b7280', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                              {formatDisplayDate(item.date)}
                            </td>
                            <td style={{ padding: '7px 12px', color: '#4f46e5', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {item.institutionName || <span style={{ color: '#9ca3af', fontWeight: 400 }}>Varsayılan</span>}
                            </td>
                            <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#f3e8ff', color: '#6b21a8', fontWeight: 800, fontSize: '11.5px', letterSpacing: '0.5px' }}>
                                {item.stockName || '—'}
                              </span>
                            </td>
                            <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: isBuy ? '#dcfce7' : '#fee2e2',
                                color: isBuy ? '#15803d' : '#b91c1c'
                              }}>
                                {item.typeName}
                              </span>
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                              {formatDisplayNumber(item.quantity, 0)}
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                              {formatDisplayNumber(item.price, 2)} ₺
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: isBuy ? '#16a34a' : '#dc2626' }}>
                              {formatDisplayNumber(totalAmt, 2)} ₺
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: (item.grossProfit || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                              {!isBuy && hasGrossProfit ? `${formatDisplayNumber(item.grossProfit, 2)} ₺` : <span style={{ color: '#cbd5e1', fontWeight: 400 }}>Otomatik</span>}
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: (item.totalProfit || 0) >= 0 ? '#16a34a' : '#dc2626' }}>
                              {!isBuy && hasTotalProfit ? `${formatDisplayNumber(item.totalProfit, 2)} ₺` : <span style={{ color: '#cbd5e1', fontWeight: 400 }}>Otomatik</span>}
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', color: '#6b7280', whiteSpace: 'nowrap' }}>
                              %{item.taxRate || 0}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderTop: '1.5px solid #f3f4f6', flexShrink: 0, background: '#fafafa' }}>
          <div style={{ fontSize: '11.5px', color: '#9ca3af' }}>
            💡 Excel veya Google E-Tablolardan doğrudan kopyalayıp (Ctrl+V) yapıştırabilirsiniz.
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onHide}
              disabled={isSubmitting}
              style={{ padding: '8px 18px', borderRadius: '9px', border: '1px solid #e5e7eb', background: '#fff', fontSize: '13px', color: '#374151', fontWeight: 500, cursor: 'pointer' }}
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleProcess}
              disabled={items.length === 0 || isSubmitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                borderRadius: '9px',
                border: 'none',
                background: items.length === 0 || isSubmitting ? '#e5e7eb' : '#4f46e5',
                color: items.length === 0 || isSubmitting ? '#9ca3af' : '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: items.length === 0 || isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.12s'
              }}
            >
              <Upload size={14} />
              {isSubmitting ? 'İçe Aktarılıyor...' : `İçe Aktar (${items.length} Kayıt)`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const MultiSelectDropdown = ({ options, selectedIds, onChange, allLabel = 'Tümü', placeholder = 'Ara...' }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const dropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    return options.filter(opt => (opt.name || '').toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const toggleOption = (id) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(v => v !== id) : [...selectedIds, id]);
  };

  const displayText = React.useMemo(() => {
    if (selectedIds.length === 0) return `${allLabel} (${options.length})`;
    if (selectedIds.length === 1) {
      const item = options.find(o => o.id === selectedIds[0]);
      return item ? item.name : allLabel;
    }
    return `${selectedIds.length} seçildi`;
  }, [selectedIds, options, allLabel]);

  return (
    <div className="position-relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
          background: selectedIds.length > 0 ? '#ede9fe' : '#f4f4f5',
          color: selectedIds.length > 0 ? '#5b21b6' : '#71717a',
          border: `1px solid ${selectedIds.length > 0 ? '#c4b5fd' : '#e4e4e7'}`,
          fontSize: '12px', fontWeight: selectedIds.length > 0 ? 600 : 400,
          transition: 'all 0.12s'
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '6px' }}>{displayText}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {selectedIds.length > 0 && (
            <span
              onClick={e => { e.stopPropagation(); onChange([]); }}
              style={{ width: '15px', height: '15px', borderRadius: '50%', background: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={9} color="#5b21b6" strokeWidth={3} />
            </span>
          )}
          <ChevronDown size={12} color="#71717a" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10055,
            background: '#ffffff', borderRadius: '10px', border: '1px solid #e4e4e7',
            boxShadow: '0 12px 28px -4px rgba(0,0,0,0.10), 0 4px 8px -2px rgba(0,0,0,0.07)'
          }}
        >
          <div style={{ padding: '8px 8px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f4f4f5', borderRadius: '6px', padding: '5px 8px' }}>
              <Search size={11} color="#a1a1aa" style={{ marginRight: '6px', flexShrink: 0 }} />
              <input
                autoFocus
                type="text"
                placeholder={placeholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', color: '#18181b' }}
              />
              {search && <X size={10} color="#a1a1aa" style={{ cursor: 'pointer' }} onClick={() => setSearch('')} />}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', padding: '0 2px', fontSize: '10.5px' }}>
              <span style={{ color: '#6366f1', cursor: 'pointer' }} onClick={() => onChange([])}>Tümü ({options.length})</span>
              {selectedIds.length > 0 && <span style={{ color: '#ef4444', cursor: 'pointer' }} onClick={() => onChange([])}>Temizle</span>}
            </div>
          </div>
          <div style={{ maxHeight: '165px', overflowY: 'auto', borderTop: '1px solid #e4e4e7' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#a1a1aa', fontSize: '12px' }}>Sonuç bulunamadı</div>
            ) : filteredOptions.map(opt => {
              const isSelected = selectedIds.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', cursor: 'pointer', fontSize: '12px',
                    background: isSelected ? '#ede9fe' : 'transparent',
                    color: isSelected ? '#5b21b6' : '#374151',
                    fontWeight: isSelected ? 600 : 400,
                    borderBottom: '1px solid #f4f4f5', transition: 'background 0.1s'
                  }}
                >
                  <span>{opt.name}</span>
                  <div style={{ width: '13px', height: '13px', borderRadius: '3px', border: isSelected ? 'none' : '1.5px solid #d1d5db', background: isSelected ? '#7c3aed' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSelected && <Check size={9} color="white" strokeWidth={3.5} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const ExportModal = ({ show, onHide, transactions, institutions, stocks, config }) => {
  const [selectedFields, setSelectedFields] = React.useState(PROPERTIES.map(p => p.id));
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [selectedInstitutions, setSelectedInstitutions] = React.useState([]);
  const [selectedStocks, setSelectedStocks] = React.useState([]);
  const [typeFilter, setTypeFilter] = React.useState('ALL');
  const [activePreset, setActivePreset] = React.useState('all');
  const [delimiter, setDelimiter] = React.useState(';');
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => { if (show) setCopied(false); }, [show]);

  const applyDatePreset = (preset) => {
    setActivePreset(preset);
    const today = new Date();
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = fmt(today);
    if (preset === 'all') { setStartDate(''); setEndDate(''); }
    else if (preset === 'thisMonth') { setStartDate(fmt(new Date(today.getFullYear(), today.getMonth(), 1))); setEndDate(todayStr); }
    else if (preset === 'thisYear') { setStartDate(fmt(new Date(today.getFullYear(), 0, 1))); setEndDate(todayStr); }
    else if (preset === 'last30') { const d = new Date(); d.setDate(today.getDate() - 30); setStartDate(fmt(d)); setEndDate(todayStr); }
    else if (preset === 'last90') { const d = new Date(); d.setDate(today.getDate() - 90); setStartDate(fmt(d)); setEndDate(todayStr); }
  };

  const filteredData = React.useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) return [];
    const filtered = transactions.filter(t => {
      if (startDate && t.date && t.date < startDate) return false;
      if (endDate && t.date && t.date > endDate) return false;
      if (selectedInstitutions.length > 0 && !selectedInstitutions.includes(t.institutionId)) return false;
      if (selectedStocks.length > 0 && !selectedStocks.includes(t.stockId)) return false;
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      return true;
    });
    // En yeni tarihten en eskiye sırala (azalan)
    return filtered.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
  }, [transactions, startDate, endDate, selectedInstitutions, selectedStocks, typeFilter]);

  const getPropLabel = (propId) => config?.propertyLabels?.[propId] || PROPERTIES.find(p => p.id === propId)?.label || propId;

  const formatTrDate = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d?.padStart(2,'0')}.${m?.padStart(2,'0')}.${y}`;
  };

  const formatTrNumber = (val, decimals = 2, forceDecimals = true) => {
    if (val === undefined || val === null || val === '') return '0,00';
    let num = typeof val === 'number' ? val : parseFloat((val.toString().trim().replace(/\s/g, '').replace('₺','').replace('TL','').includes(',') ? val.toString().replace(/\./g,'').replace(',','.') : val.toString()));
    if (isNaN(num)) return '0,00';
    return forceDecimals ? num.toFixed(decimals).replace('.', ',') : (Number.isInteger(num) ? num.toString() : num.toString().replace('.', ','));
  };

  const getExportFieldValue = (t, propId) => {
    const inst = institutions.find(i => i.id === t.institutionId);
    const stock = stocks.find(s => s.id === t.stockId);
    switch (propId) {
      case 'date': return formatTrDate(t.date);
      case 'institutionId': return inst ? inst.name : (t.institutionId || '');
      case 'stockId': return stock ? stock.name : (t.stockId || '');
      case 'type': return t.type || '';
      case 'quantity': return formatTrNumber(t.quantity ?? 0, 0, false);
      case 'price': { const p = t.price ?? 0; const dc = (p.toString().split('.')[1] || '').length; return formatTrNumber(p, dc > 2 ? Math.min(4, dc) : 2, true); }
      case 'taxRate': return formatTrNumber(t.taxRate ?? 0, 0, false);
      case 'remainingQuantity': return formatTrNumber(t.runningBalance ?? t.calculatedRemaining ?? 0, 0, false);
      case 'taxDeduction': return formatTrNumber(t.calculatedTaxDeduction ?? 0, 2, true);
      case 'totalBuyAmount': return formatTrNumber(t.type === 'ALIŞ' ? (t.totalBuyAmount ?? 0) : 0, 2, true);
      case 'totalSaleAmount': return formatTrNumber(t.type === 'SATIŞ' ? (t.totalSaleAmount ?? 0) : 0, 2, true);
      case 'avgBuyPrice': return formatTrNumber(t.avgBuyPrice ?? 0, 2, true);
      case 'grossProfit': return formatTrNumber(t.type === 'SATIŞ' ? (t.grossProfit ?? 0) : 0, 2, true);
      case 'totalProfit': return formatTrNumber(t.type === 'SATIŞ' ? (t.totalProfit ?? 0) : 0, 2, true);
      default: return t[propId] ?? '';
    }
  };

  const isNumericField = (id) => ['quantity','price','taxRate','remainingQuantity','taxDeduction','totalBuyAmount','totalSaleAmount','avgBuyPrice','grossProfit','totalProfit'].includes(id);

  const generateCSVContent = () => {
    const sep = delimiter;
    const header = selectedFields.map(id => `"${getPropLabel(id).replace(/"/g,'""')}"`).join(sep);
    const rows = filteredData.map(t => selectedFields.map(id => `"${(getExportFieldValue(t,id)?? '').toString().replace(/"/g,'""')}"`).join(sep));
    return '\uFEFF' + [header, ...rows].join('\r\n');
  };

  const generateTSVContent = () => {
    const header = selectedFields.map(id => getPropLabel(id)).join('\t');
    const rows = filteredData.map(t => selectedFields.map(id => (getExportFieldValue(t,id)?? '').toString()).join('\t'));
    return [header, ...rows].join('\n');
  };

  const handleDownloadCSV = () => {
    if (!filteredData.length || !selectedFields.length) return;
    const blob = new Blob([generateCSVContent()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `finans_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = async () => {
    if (!filteredData.length || !selectedFields.length) return;
    try { await navigator.clipboard.writeText(generateTSVContent()); setCopied(true); setTimeout(() => setCopied(false), 3500); }
    catch (err) { console.error(err); }
  };

  const sortedStocks = React.useMemo(() => [...stocks].sort((a, b) => (a.name || '').localeCompare(b.name || '')), [stocks]);
  const previewData = filteredData.slice(0, 5);

  const PRESETS = [
    { id: 'all', label: 'Tümü' },
    { id: 'thisMonth', label: 'Bu Ay' },
    { id: 'thisYear', label: 'Bu Yıl' },
    { id: 'last30', label: 'Son 30G' },
    { id: 'last90', label: 'Son 90G' },
  ];

  const SB = '#ffffff';    // sidebar bg
  const SBB = '#f4f4f5';   // sidebar element bg
  const SBT = '#18181b';   // sidebar text
  const SBM = '#71717a';   // sidebar muted
  const SBC = '#e4e4e7';   // sidebar border

  const btnDisabled = !filteredData.length || !selectedFields.length;

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <div style={{ display: 'flex', height: '86vh', maxHeight: '700px', borderRadius: '16px', overflow: 'hidden', background: '#fff', boxShadow: '0 25px 60px -10px rgba(0,0,0,0.25)' }}>

        {/* ══ DARK SIDEBAR ══ */}
        <div style={{ width: '252px', flexShrink: 0, background: SB, display: 'flex', flexDirection: 'column', borderRight: `1px solid ${SBC}` }}>

          {/* Sidebar Brand */}
          <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${SBC}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileSpreadsheet size={17} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Dışa Aktar</div>
                <div style={{ fontSize: '10.5px', color: SBM, marginTop: '1px' }}>Filtrele &amp; İndir</div>
              </div>
            </div>

            {/* Live count */}
            <div style={{ marginTop: '10px', padding: '10px 12px', background: filteredData.length > 0 ? 'rgba(79,70,229,0.2)' : SBB, borderRadius: '10px', border: `1px solid ${filteredData.length > 0 ? '#4338ca' : SBC}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '11px', color: SBM }}>Eşleşen kayıt</div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: filteredData.length > 0 ? '#a5b4fc' : '#52525b', lineHeight: 1 }}>{filteredData.length}</div>
            </div>
          </div>

          {/* Sidebar Filters (scrollable) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Tarih */}
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: SBM, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '7px' }}>Tarih Aralığı</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '7px' }}>
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setActivePreset('custom'); }}
                  style={{ width: '100%', background: SBB, color: startDate ? SBT : SBM, border: `1px solid ${SBC}`, borderRadius: '7px', padding: '6px 10px', fontSize: '12px', outline: 'none' }}
                />
                <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setActivePreset('custom'); }}
                  style={{ width: '100%', background: SBB, color: endDate ? SBT : SBM, border: `1px solid ${SBC}`, borderRadius: '7px', padding: '6px 10px', fontSize: '12px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {PRESETS.map(p => {
                  const isActive = activePreset === p.id && (p.id !== 'all' || (!startDate && !endDate));
                  return (
                    <button key={p.id} type="button" onClick={() => applyDatePreset(p.id)}
                      style={{ fontSize: '10.5px', padding: '3px 9px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: isActive ? 700 : 400, background: isActive ? '#4f46e5' : SBB, color: isActive ? '#fff' : SBM, transition: 'all 0.12s' }}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kurumlar */}
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: SBM, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '7px' }}>Aracı Kurumlar</div>
              <MultiSelectDropdown options={institutions} selectedIds={selectedInstitutions} onChange={setSelectedInstitutions} allLabel="Tüm Kurumlar" placeholder="Kurum ara..." />
            </div>

            {/* Hisseler */}
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: SBM, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '7px' }}>Hisseler</div>
              <MultiSelectDropdown options={sortedStocks} selectedIds={selectedStocks} onChange={setSelectedStocks} allLabel="Tüm Hisseler" placeholder="Hisse ara..." />
            </div>

            {/* İşlem Türü */}
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: SBM, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '7px' }}>İşlem Türü</div>
              <div style={{ display: 'flex', background: SBB, borderRadius: '8px', padding: '3px', gap: '2px' }}>
                {[
                  { label: 'Tümü', value: 'ALL', activeBg: '#3f3f46', activeColor: '#fff' },
                  { label: 'Alış', value: 'ALIŞ', activeBg: '#166534', activeColor: '#bbf7d0' },
                  { label: 'Satış', value: 'SATIŞ', activeBg: '#991b1b', activeColor: '#fecaca' },
                ].map(item => (
                  <button key={item.value} type="button" onClick={() => setTypeFilter(item.value)}
                    style={{ flex: 1, fontSize: '11px', padding: '5px 2px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: typeFilter === item.value ? 700 : 400, background: typeFilter === item.value ? item.activeBg : 'transparent', color: typeFilter === item.value ? item.activeColor : SBM, transition: 'all 0.12s' }}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CSV Ayırıcı */}
            <div>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: SBM, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '7px' }}>CSV Ayırıcı</div>
              <select value={delimiter} onChange={e => setDelimiter(e.target.value)}
                style={{ width: '100%', background: SBB, color: SBT, border: `1px solid ${SBC}`, borderRadius: '7px', padding: '6px 10px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}>
                <option value=";">Noktalı Virgül (;) — Excel / TR</option>
                <option value=",">Virgül (,) — Standart CSV</option>
                <option value={"\t"}>Sekme (Tab) — TSV</option>
              </select>
            </div>
          </div>
        </div>

        {/* ══ MAIN PANEL ══ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#fff' }}>

          {/* Top Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px 14px', borderBottom: '1.5px solid #f3f4f6', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>Finans İşlemlerini Dışa Aktar</div>
              <div style={{ fontSize: '11.5px', color: '#9ca3af', marginTop: '1px' }}>Excel &amp; Google E-Tablo · Tarih: Gün.Ay.Yıl · Sayı: virgüllü ondalık</div>
            </div>
            <button type="button" onClick={onHide}
              style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', flexShrink: 0 }}>
              <X size={15} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>

            {/* Copy success */}
            {copied && (
              <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 600 }}>
                    Panoya kopyalandı — Google E-Tablo'da <kbd style={{ background: '#16a34a', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>Ctrl+V</kbd>
                  </span>
                </div>
                <a href="https://sheets.new" target="_blank" rel="noreferrer" style={{ fontSize: '11.5px', fontWeight: 600, color: '#16a34a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                  <ExternalLink size={12} /> sheets.new
                </a>
              </div>
            )}

            {/* Column Picker */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Dışa Aktarılacak Sütunlar</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 9px', borderRadius: '20px', background: '#ede9fe', color: '#6d28d9' }}>
                    {selectedFields.length}/{PROPERTIES.length}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[
                    { label: 'Tümünü Seç', fn: () => setSelectedFields(PROPERTIES.map(p => p.id)) },
                    { label: 'Temizle', fn: () => setSelectedFields([]) },
                    { label: 'Varsayılan', fn: () => setSelectedFields(PROPERTIES.map(p => p.id)) },
                  ].map(b => (
                    <button key={b.label} type="button" onClick={b.fn}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11.5px', color: '#6366f1', fontWeight: 500, padding: 0 }}>
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {PROPERTIES.map(prop => {
                  const isSelected = selectedFields.includes(prop.id);
                  const label = getPropLabel(prop.id);
                  return (
                    <button
                      key={prop.id}
                      type="button"
                      onClick={() => setSelectedFields(prev => prev.includes(prop.id) ? prev.filter(f => f !== prop.id) : [...prev, prop.id])}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 11px', borderRadius: '20px', cursor: 'pointer',
                        fontSize: '12px', fontWeight: isSelected ? 600 : 400,
                        background: isSelected ? '#ede9fe' : '#f9fafb',
                        color: isSelected ? '#5b21b6' : '#9ca3af',
                        border: `1.5px solid ${isSelected ? '#c4b5fd' : '#f3f4f6'}`,
                        transition: 'all 0.12s'
                      }}
                    >
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: isSelected ? '#7c3aed' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isSelected && <Check size={8} color="white" strokeWidth={4} />}
                      </div>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Önizleme</span>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {filteredData.length > 0 ? `${filteredData.length} kayıttan ilk 5 · Yatay kaydırma desteklenir` : 'Kayıt bulunamadı'}
                </span>
              </div>

              <div style={{ border: '1px solid #f3f4f6', borderRadius: '12px', overflow: 'hidden' }}>
                <div
                  style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '195px', cursor: 'grab' }}
                  onMouseDown={e => {
                    const el = e.currentTarget;
                    el.style.cursor = 'grabbing';
                    const startX = e.clientX + el.scrollLeft;
                    const handleMove = (me) => { el.scrollLeft = startX - me.clientX; };
                    const handleUp = () => { el.style.cursor = 'grab'; document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
                    document.addEventListener('mousemove', handleMove);
                    document.addEventListener('mouseup', handleUp);
                  }}
                >
                  {filteredData.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                      Seçilen filtrelere uygun kayıt bulunamadı.
                    </div>
                  ) : selectedFields.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                      En az bir sütun seçiniz.
                    </div>
                  ) : (
                    <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%', fontVariantNumeric: 'tabular-nums' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                          <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#f8fafc' }}>#</th>
                          {selectedFields.map(id => (
                            <th key={id} style={{ padding: '9px 14px', textAlign: isNumericField(id) ? 'right' : (id === 'type' ? 'center' : 'left'), fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: '#f8fafc' }}>
                              {getPropLabel(id)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((t, idx) => (
                          <tr key={t.id || idx} style={{ borderBottom: '1px solid #f8fafc', background: '#fff' }}>
                            <td style={{ padding: '8px 14px', color: '#cbd5e1', fontSize: '12px', fontWeight: 500 }}>{idx + 1}</td>
                            {selectedFields.map(id => {
                              const rawVal = getExportFieldValue(t, id);
                              let cell;

                              if (id === 'type') {
                                const isBuy = rawVal === 'ALIŞ';
                                cell = (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 700, background: isBuy ? '#dcfce7' : '#fee2e2', color: isBuy ? '#15803d' : '#b91c1c', whiteSpace: 'nowrap' }}>
                                    {isBuy ? <ArrowDownLeft size={11} strokeWidth={2.5} /> : <ArrowUpRight size={11} strokeWidth={2.5} />}
                                    {rawVal}
                                  </span>
                                );
                              } else if (['grossProfit', 'totalProfit'].includes(id)) {
                                const n = parseFloat(rawVal.replace(',', '.'));
                                cell = <span style={{ fontWeight: 700, fontSize: '12.5px', color: n > 0 ? '#16a34a' : n < 0 ? '#dc2626' : '#9ca3af' }}>{rawVal} ₺</span>;
                              } else if (['price','totalBuyAmount','totalSaleAmount','taxDeduction','avgBuyPrice'].includes(id)) {
                                cell = <span style={{ fontSize: '12.5px', color: '#374151', fontWeight: 500 }}>{rawVal} ₺</span>;
                              } else if (id === 'taxRate') {
                                cell = <span style={{ fontSize: '12px', color: '#9ca3af' }}>%{rawVal}</span>;
                              } else if (['quantity','remainingQuantity'].includes(id)) {
                                cell = <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#111827' }}>{rawVal}</span>;
                              } else if (id === 'stockId') {
                                cell = <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#4f46e5' }}>{rawVal}</span>;
                              } else if (id === 'date') {
                                cell = <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>{rawVal}</span>;
                              } else {
                                cell = <span style={{ fontSize: '12.5px', color: '#374151' }}>{rawVal}</span>;
                              }

                              return (
                                <td key={id} style={{ padding: '8px 14px', textAlign: isNumericField(id) ? 'right' : (id === 'type' ? 'center' : 'left'), whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                  {cell}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px', borderTop: '1.5px solid #f3f4f6', flexShrink: 0 }}>
            <a href="https://sheets.new" target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#9ca3af', textDecoration: 'none', fontWeight: 500, transition: 'color 0.1s' }}>
              <ExternalLink size={13} color="#22c55e" /> sheets.new Aç
            </a>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button type="button" onClick={onHide}
                style={{ padding: '8px 18px', borderRadius: '9px', border: '1px solid #e5e7eb', background: '#fff', fontSize: '13px', color: '#374151', fontWeight: 500, cursor: 'pointer' }}>
                Kapat
              </button>
              <button type="button" onClick={handleCopyToClipboard} disabled={btnDisabled}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '9px', border: 'none', background: btnDisabled ? '#e5e7eb' : '#4f46e5', color: btnDisabled ? '#9ca3af' : '#fff', fontSize: '13px', fontWeight: 600, cursor: btnDisabled ? 'not-allowed' : 'pointer', transition: 'all 0.12s' }}>
                <Copy size={13} /> Kopyala ({filteredData.length})
              </button>
              <button type="button" onClick={handleDownloadCSV} disabled={btnDisabled}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '9px', border: 'none', background: btnDisabled ? '#e5e7eb' : '#059669', color: btnDisabled ? '#9ca3af' : '#fff', fontSize: '13px', fontWeight: 600, cursor: btnDisabled ? 'not-allowed' : 'pointer', transition: 'all 0.12s' }}>
                <FileSpreadsheet size={14} /> CSV İndir ({filteredData.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const OverlayCell = ({ isEditing, display, input }) => (
  <div style={{ position: 'relative', minHeight: '1.2em' }}>
    <div style={{ visibility: isEditing ? 'hidden' : 'visible' }}>{display}</div>
    {isEditing && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>{input}</div>}
  </div>
);

const TransactionRow = React.memo(({ t, visibleProperties, selectedIds, onSelect, renderCell }) => {
  return (
    <tr key={t.id} className="align-middle border-bottom border-light">
      <td className="ps-2 py-2">
        <Form.Check 
          type="checkbox" 
          checked={selectedIds.includes(t.id)} 
          onChange={e => onSelect(t.id, e.target.checked)} 
        />
      </td>
      {visibleProperties.map(id => renderCell(id, t))}
    </tr>
  );
});

const LocalTextInput = ({ value, onSave, onCancel, ...props }) => {
  const [draft, setDraft] = React.useState(value || '');

  React.useEffect(() => {
    setDraft(value || '');
  }, [value]);

  return (
    <Form.Control
      {...props}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={() => onSave(draft)}
      onKeyDown={e => {
        if (e.key === 'Enter') onSave(draft);
        if (e.key === 'Escape') onCancel && onCancel();
      }}
    />
  );
};

const SortableBankItem = ({ bank, stats, viewLayout, handleDeleteBank, onEditClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: bank.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 1001 : 'auto', opacity: isDragging ? 0.5 : 1 };
  
  const totalGross = (stats?.realizedGross || 0) + (stats?.unrealizedGross || 0);
  const totalNet = (stats?.realizedNet || 0) + (stats?.unrealizedNet || 0);
  const isProfit = totalNet >= 0;

  const formatCurrency = (val) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  if (viewLayout === 'table') {
    return (
      <tr ref={setNodeRef} style={style} {...attributes} className="align-middle group">
        <td className="ps-4">
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex align-items-center gap-1 me-2">
              <div {...listeners} style={{ cursor: 'grab' }} className="text-muted opacity-25 group-hover-opacity-100"><GripVertical size={14} /></div>
              <div onClick={() => onEditClick(bank)} className="text-muted opacity-25 group-hover-opacity-100 p-1" style={{ cursor: 'pointer' }}><Edit2 size={14} /></div>
              <div onClick={() => handleDeleteBank(bank.id)} className="text-danger opacity-25 group-hover-opacity-100 p-1" style={{ cursor: 'pointer' }}><Trash2 size={14} /></div>
            </div>
            {bank.logo ? <img src={bank.logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} /> : <Landmark size={18} className="text-muted" />}
            <span className="fw-bold fs-16">{bank.name}</span>
          </div>
        </td>
        <td className="fw-medium fs-15 py-3">
          <div className="d-flex flex-column gap-1" style={{ maxWidth: '240px' }}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="x-small text-muted fw-medium text-nowrap">Brüt Kar/Zarar:</span>
              <span className={`x-small fw-bold text-nowrap ms-2 ${(stats?.unrealizedGross || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                {(stats?.unrealizedGross || 0) > 0 ? '+' : ''}{formatCurrency(stats?.unrealizedGross || 0)} TL
              </span>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="x-small text-muted fw-medium text-nowrap">Stopaj Kesintisi:</span>
              <span className="x-small fw-bold text-danger text-nowrap ms-2">
                -{formatCurrency((stats?.unrealizedGross || 0) - (stats?.unrealizedNet || 0))} TL
              </span>
            </div>
            <div className="d-flex justify-content-between align-items-start mb-1">
              <span className="x-small text-muted fw-medium text-nowrap">Net Kar/Zarar:</span>
              <div className="text-end text-nowrap ms-2">
                <div className={`x-small fw-bold ${(stats?.unrealizedNet || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {(stats?.unrealizedNet || 0) > 0 ? '+' : ''}{formatCurrency(stats?.unrealizedNet || 0)} TL
                </div>
                <div className={`fw-bold ${(stats?.unrealizedNet || 0) >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '9px', opacity: 0.7, marginTop: '-2px' }}>
                  ({(stats?.unrealizedNet || 0) > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((stats?.totalInvestment || 0) > 0 ? ((stats?.unrealizedNet || 0) / stats.totalInvestment * 100) : 0)}%)
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-start pt-1 border-top border-light" style={{ marginTop: '2px' }}>
              <span className="x-small text-muted fw-medium text-nowrap">Günlük Kazanç:</span>
              <div className="text-end text-nowrap ms-2">
                <div className={`x-small fw-bold ${(stats?.dailyGain || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {(stats?.dailyGain || 0) > 0 ? '+' : ''}{formatCurrency(stats?.dailyGain || 0)} TL
                </div>
                <div className={`fw-bold ${(stats?.dailyGain || 0) >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '9px', opacity: 0.7, marginTop: '-2px' }}>
                  ({(stats?.dailyGain || 0) > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((stats?.currentValue || 0) > 0 ? ((stats?.dailyGain || 0) / (stats.currentValue - stats.dailyGain) * 100) : 0)}%)
                </div>
              </div>
            </div>
          </div>
        </td>
        <td className="text-end pe-4 py-3">
          <div className="d-flex flex-column align-items-stretch gap-1 ms-auto" style={{ maxWidth: '240px' }}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="x-small text-muted fw-bold text-nowrap">PORTFÖY DEĞERİ:</span>
              <span className="x-small fw-bold text-nowrap ms-2">{formatCurrency(stats?.totalInvestment || 0)} TL</span>
            </div>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="x-small text-muted fw-bold text-nowrap">BRÜT DEĞER:</span>
              <span className={`x-small fw-bold text-nowrap ms-2 ${(stats?.totalInvestment || 0) + (stats?.unrealizedGross || 0) >= (stats?.totalInvestment || 0) ? 'text-success' : 'text-danger'}`}>
                {formatCurrency((stats?.totalInvestment || 0) + (stats?.unrealizedGross || 0))} TL
              </span>
            </div>
            <div className="d-flex justify-content-between align-items-center">
              <span className="x-small text-muted fw-bold text-nowrap">NET DEĞER:</span>
              <span className={`x-small fw-bold text-nowrap ms-2 ${(stats?.totalInvestment || 0) + (stats?.unrealizedNet || 0) >= (stats?.totalInvestment || 0) ? 'text-success' : 'text-danger'}`}>
                {formatCurrency((stats?.totalInvestment || 0) + (stats?.unrealizedNet || 0))} TL
              </span>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <Col ref={setNodeRef} style={style} {...attributes}>
      <Card className="glass-card border shadow-sm p-3 position-relative group" style={{ borderRadius: '20px', transition: 'all 0.2s ease-in-out' }}>
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <div className="rounded-circle bg-light d-flex align-items-center justify-content-center overflow-hidden border shadow-sm" style={{ width: '32px', height: '32px' }}>
              {bank.logo ? <img src={bank.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Landmark size={16} className="text-muted" />}
            </div>
            <span className="fw-bold fs-16 text-truncate" style={{ maxWidth: '120px' }}>{bank.name}</span>
          </div>
          <div className="d-flex align-items-center gap-1 group-hover-visible transition-all">
            <div {...listeners} style={{ cursor: 'grab' }} className="text-muted p-1 hover-bg-light rounded"><GripVertical size={14} /></div>
            <div onClick={() => onEditClick(bank)} style={{ cursor: 'pointer' }} className="text-muted p-1 hover-bg-light rounded"><Edit2 size={14} /></div>
            <div onClick={() => handleDeleteBank(bank.id)} style={{ cursor: 'pointer' }} className="text-danger p-1 hover-bg-light rounded"><Trash2 size={14} /></div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-top border-light border-opacity-10">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="x-small text-muted fw-medium text-nowrap">Brüt Kar/Zarar:</span>
            <span className={`x-small fw-bold text-nowrap ms-2 ${(stats?.unrealizedGross || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
              {(stats?.unrealizedGross || 0) > 0 ? '+' : ''}{formatCurrency(stats?.unrealizedGross || 0)} TL
            </span>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="x-small text-muted fw-medium text-nowrap">Stopaj Kesintisi:</span>
            <span className="x-small fw-bold text-danger text-nowrap ms-2">
              -{formatCurrency((stats?.unrealizedGross || 0) - (stats?.unrealizedNet || 0))} TL
            </span>
          </div>
          <div className="d-flex justify-content-between align-items-start mb-1">
            <span className="x-small text-muted fw-medium text-nowrap">Net Kar/Zarar:</span>
            <div className="text-end text-nowrap ms-2">
              <div className={`x-small fw-bold ${(stats?.unrealizedNet || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                {(stats?.unrealizedNet || 0) > 0 ? '+' : ''}{formatCurrency(stats?.unrealizedNet || 0)} TL
              </div>
              <div className={`fw-bold ${(stats?.unrealizedNet || 0) >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '9px', opacity: 0.7, marginTop: '-2px' }}>
                ({(stats?.unrealizedNet || 0) > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((stats?.totalInvestment || 0) > 0 ? ((stats?.unrealizedNet || 0) / stats.totalInvestment * 100) : 0)}%)
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-start mb-1" style={{ border: '1px solid #f1f1f1', borderLeft: 0, borderRight: 0, marginLeft: '-15px', marginRight: '-15px', padding: '3px 15px' }}>
            <span className="x-small text-muted fw-medium text-nowrap">Günlük Kazanç:</span>
            <div className="text-end text-nowrap ms-2">
              <div className={`x-small fw-bold ${(stats?.dailyGain || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                {(stats?.dailyGain || 0) > 0 ? '+' : ''}{formatCurrency(stats?.dailyGain || 0)} TL
              </div>
              <div className={`fw-bold ${(stats?.dailyGain || 0) >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '9px', opacity: 0.7, marginTop: '-2px' }}>
                ({(stats?.dailyGain || 0) > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((stats?.currentValue || 0) > 0 ? ((stats?.dailyGain || 0) / (stats.currentValue - stats.dailyGain) * 100) : 0)}%)
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-light border-opacity-10">
            <span className="x-small text-muted fw-bold text-nowrap">PORTFÖY DEĞERİ:</span>
            <span className="x-small fw-bold text-nowrap ms-2">{formatCurrency(stats?.totalInvestment || 0)} TL</span>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="x-small text-muted fw-bold text-nowrap">BRÜT DEĞER:</span>
            <span className={`x-small fw-bold text-nowrap ms-2 ${(stats?.totalInvestment || 0) + (stats?.unrealizedGross || 0) >= (stats?.totalInvestment || 0) ? 'text-success' : 'text-danger'}`}>
              {formatCurrency((stats?.totalInvestment || 0) + (stats?.unrealizedGross || 0))} TL
            </span>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="x-small text-muted fw-bold text-nowrap">NET DEĞER:</span>
            <span className={`x-small fw-bold text-nowrap ms-2 ${(stats?.totalInvestment || 0) + (stats?.unrealizedNet || 0) >= (stats?.totalInvestment || 0) ? 'text-success' : 'text-danger'}`}>
              {formatCurrency((stats?.totalInvestment || 0) + (stats?.unrealizedNet || 0))} TL
            </span>
          </div>
        </div>
      </Card>
    </Col>
  );
};

const SortableInstitutionDropdownItem = ({ inst, handleToggleInstitutionVisibility }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: inst.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10003 : 1, position: 'relative' };
  return (
    <div ref={setNodeRef} style={style} className="d-flex align-items-center justify-content-between px-3 py-1 hover-bg-light rounded-2">
      <div className="d-flex align-items-center gap-2 overflow-hidden flex-grow-1">
        <div {...listeners} {...attributes} className="cursor-grab text-muted opacity-50"><GripVertical size={14} /></div>
        {inst.logo ? <img src={inst.logo} alt="" width="14" height="14" className="object-fit-contain" /> : <Landmark size={12} className="text-muted" />}
        <span className="text-truncate" style={{ fontSize: '13px' }}>{inst.name}</span>
      </div>
      <div className="cursor-pointer d-flex align-items-center ps-2" onClick={(e) => { e.stopPropagation(); handleToggleInstitutionVisibility(inst, !(inst.visible !== false)); }}>
        {inst.visible !== false ? <Eye size={14} /> : <EyeOff size={14} className="text-muted opacity-25" />}
      </div>
    </div>
  );
};

const SortablePropertyItem = ({ prop, isVisible, toggleVisibility, icon }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: prop.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 1000 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="d-flex align-items-center justify-content-between py-1 px-2 hover-bg-light rounded-2 group">
      <div className="d-flex align-items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab text-muted opacity-0 group-hover-opacity-100 transition-all"><GripVertical size={14} /></div>
        <div className="text-muted">{icon}</div>
        <span style={{ fontSize: '14px' }}>{prop.label}</span>
      </div>
      <div className="cursor-pointer text-muted hover-text-primary" onClick={() => toggleVisibility(prop.id)}>{isVisible ? <Eye size={16} /> : <EyeOff size={16} className="opacity-50" />}</div>
    </div>
  );
};

const FinanceTransactionsPage = () => {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [limitCount, setLimitCount] = useState(10);
  const [isInfiniteScroll, setIsInfiniteScroll] = useState(false);
  const lastElementRef = useRef(null);
  const [config, setConfig] = useState({ viewLayout: 'gallery_basic', propertyOrder: PROPERTIES.map(p => p.id), propertyVisibility: {}, columnCalculations: {}, propertyWrap: {} });
  const [stagedChanges, setStagedChanges] = useState({});
  const [bulkHistory, setBulkHistory] = useState([]);
  const [settingsView, setSettingsView] = useState('main'); // 'main' or 'visibility'
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const selectAllRef = useRef(null);

  const [formInstitutionId, setFormInstitutionId] = useState('');
  const [formStockId, setFormStockId] = useState('');
  const [editingCell, setEditingCell] = useState(null);
  const [cellDraft, setCellDraft] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('ALIŞ');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('all');

  const [showInstitutionModal, setShowInstitutionModal] = useState(false);
  const [newInstitutionName, setNewInstitutionName] = useState('');
  const [newInstitutionLogo, setNewInstitutionLogo] = useState('');
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInstitutionName, setEditInstitutionName] = useState('');
  const [editInstitutionLogo, setEditInstitutionLogo] = useState('');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Simulation State
  const [simStockId, setSimStockId] = useState('');
  const [simQuantity, setSimQuantity] = useState('');
  const [simPrice, setSimPrice] = useState('');

  const [showCalculateSubmenu, setShowCalculateSubmenu] = useState(false);
  const [showDateFormatSubmenu, setShowDateFormatSubmenu] = useState(false);
  const [showVisibilitySubmenu, setShowVisibilitySubmenu] = useState(false);

  // Stock Edit States
  const [showEditStockModal, setShowEditStockModal] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [editStockName, setEditStockName] = useState('');
  const [editStockValue, setEditStockValue] = useState('');

  const handleEditStock = (stock) => {
    setEditingStock(stock);
    setEditStockName(stock.name);
    setEditStockValue(stock.currentPrice || '');
    setShowEditStockModal(true);
  };

  const handleUpdateStock = async () => {
    if (!editStockName || !editStockValue) return;

    const parsePrice = (p) => {
      if (!p) return 0;
      if (typeof p === 'number') return p;
      const str = p.toString().trim();
      if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
      return parseFloat(str) || 0;
    };

    const oldPriceStr = editingStock.currentPrice || '0';
    const oldPrice = parsePrice(oldPriceStr);
    const newPrice = parsePrice(editStockValue);
    
    let dailyChange = 0;
    if (oldPrice > 0) {
      dailyChange = ((newPrice - oldPrice) / oldPrice) * 100;
    }

    await updateDoc(doc(db, `users/${user.uid}/stocks`, editingStock.id), {
      name: editStockName.toUpperCase(),
      currentPrice: editStockValue,
      previousPrice: oldPriceStr,
      dailyChange: dailyChange,
      updatedAt: new Date()
    });
    setShowEditStockModal(false);
  };

  const parseNum = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const str = val.toString().trim();
    if (!str) return 0;
    if (str.includes(',')) {
      const clean = str.replace(/\./g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    }
    return parseFloat(str) || 0;
  };

  const getDecimalPlaces = (val) => {
    if (val === undefined || val === null || val === '') return 2;
    const str = val.toString().trim();
    const normalizedStr = str.replace(',', '.');
    const dotIndex = normalizedStr.indexOf('.');
    const count = dotIndex === -1 ? 0 : normalizedStr.length - dotIndex - 1;
    return Math.min(8, count);
  };

  const getInstitutionInfo = (id) => institutions.find(i => i.id === id) || {};
  const getStockInfo = (id) => stocks.find(s => s.id === id) || {};

  const formatDate = (date) => {
    if (!date) return null;
    let d;
    if (date.toDate) {
      d = date.toDate();
    } else {
      d = new Date(date);
    }
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const displayDateFormatted = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(year, month - 1, day);
      const format = config.dateFormat || 'DD/MM/YYYY';
      if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
      if (format === 'DD.MM.YYYY') return `${day}.${month}.${year}`;
      if (format === 'DD MMMM YYYY') return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
      if (format === 'DD MMM YYYY') return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
      return dateStr;
    } catch (e) { return dateStr; }
  };

  const updateConfig = async (newConfig) => {
    const next = { ...config, ...newConfig };
    setConfig(next);
    if (user) await setDoc(doc(db, `users/${user.uid}/config`, 'financeSettings'), next, { merge: true });
  };

  const handleSort = (propId, direction) => {
    updateConfig({ sortConfig: { propId, direction } });
  };

  const handleUpdateFilter = (propId, operator, value) => {
    const currentFilters = config.filters || [];
    let nextFilters;
    if (operator === null) {
      nextFilters = currentFilters.filter(f => f.propId !== propId);
    } else {
      const existing = currentFilters.find(f => f.propId === propId);
      if (existing) {
        nextFilters = currentFilters.map(f => f.propId === propId ? { ...f, operator, value } : f);
      } else {
        nextFilters = [...currentFilters, { propId, operator, value }];
      }
    }
    updateConfig({ filters: nextFilters });
  };

  const handleUpdatePropertyVisibility = (propId, isVisible) => {
    const updatedVisibility = { ...(config.propertyVisibility || {}), [propId]: isVisible };
    updateConfig({ propertyVisibility: updatedVisibility });
  };
  const handleToggleWrap = (propId) => {
    const next = { ...(config.propertyWrap || {}), [propId]: !(config.propertyWrap?.[propId] !== false) };
    updateConfig({ propertyWrap: next });
  };

  const toggleAllProperties = (isVisible) => {
    const nextVisibility = {};
    PROPERTIES.forEach(p => { nextVisibility[p.id] = isVisible; });
    updateConfig({ propertyVisibility: nextVisibility });
  };

  const handleUpdatePropertyOrder = (oldIdx, newIdx) => {
    const savedOrder = Array.isArray(config.propertyOrder) ? config.propertyOrder : PROPERTIES.map(p => p.id);
    const allIds = PROPERTIES.map(p => p.id);
    // Ensure all current properties are included before moving
    const fullOrder = [...savedOrder];
    allIds.forEach(id => { if (!fullOrder.includes(id)) fullOrder.push(id); });

    const nextOrder = arrayMove(fullOrder, oldIdx, newIdx);
    updateConfig({ propertyOrder: nextOrder });
  };

  const getCalculatedValue = (propId) => {
    const calcType = config.columnCalculations?.[propId];
    if (!calcType || calcType === 'none') return null;

    const values = filteredTransactions.map(t => {
      if (['quantity', 'price', 'taxRate', 'totalBuyAmount', 'totalSaleAmount', 'grossProfit', 'totalProfit', 'taxDeduction', 'remainingQuantity', 'avgBuyPrice'].includes(propId)) {
        if (propId === 'taxDeduction') return t.calculatedTaxDeduction || 0;
        if (propId === 'remainingQuantity') return t.runningBalance || 0;
        return t[propId] || 0;
      }
      return t[propId];
    }).filter(v => v !== undefined && v !== null && v !== '');

    const numValues = values.filter(v => typeof v === 'number');

    switch (calcType) {
      case 'sum': return numValues.reduce((a, b) => a + b, 0);
      case 'avg': return numValues.length ? numValues.reduce((a, b) => a + b, 0) / numValues.length : 0;
      case 'min': return numValues.length ? Math.min(...numValues) : 0;
      case 'max': return numValues.length ? Math.max(...numValues) : 0;
      case 'count_all': return filteredTransactions.length;
      case 'count_values': return values.length;
      case 'count_unique': return new Set(values).size;
      case 'count_empty': return filteredTransactions.length - values.length;
      case 'count_not_empty': return values.length;
      default: return null;
    }
  };

  const renderCalculatedValue = (propId, value) => {
    if (value === null) return null;
    const calcType = config.columnCalculations?.[propId];
    const prefix = calcType.toUpperCase().replace('_', ' ');

    if (['quantity', 'remainingQuantity'].includes(propId)) {
      return <div className="text-end x-small text-muted fw-bold"><span className="opacity-50">{prefix}</span> {value}</div>;
    }

    if (['price', 'totalBuyAmount', 'totalSaleAmount', 'grossProfit', 'totalProfit', 'taxDeduction', 'avgBuyPrice'].includes(propId)) {
      const formatted = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
      return <div className="text-end x-small text-muted fw-bold"><span className="opacity-50">{prefix}</span> {formatted} TL</div>;
    }

    return <div className="text-end x-small text-muted fw-bold"><span className="opacity-50">{prefix}</span> {value}</div>;
  };

  const { 
    institutions: globalInstitutions, 
    stocks: globalStocks, 
    financeTransactions: globalTransactions,
    financeConfig,
    financeBulkHistory
  } = useData();

  useEffect(() => {
    setInstitutions(globalInstitutions.filter(i => i.deleted !== true).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));
  }, [globalInstitutions]);

  useEffect(() => {
    setStocks(globalStocks.filter(s => s.deleted !== true));
  }, [globalStocks]);

  useEffect(() => {
    setTransactions(globalTransactions.filter(t => t.deleted !== true));
  }, [globalTransactions]);

  useEffect(() => {
    if (financeConfig) setConfig(prev => ({ ...prev, ...financeConfig }));
  }, [financeConfig]);

  useEffect(() => {
    setBulkHistory(financeBulkHistory);
  }, [financeBulkHistory]);


  const isAlis = (val) => {
    const s = (val?.type || val || '').toString().trim().toLowerCase()
      .replace(/i̇/g, 'i').replace(/ı/g, 'i');
    return s.startsWith('al') || s.includes('buy') || s === 'b' || s === '+';
  };

  const processedTransactions = useMemo(() => {

    const sorted = [...transactions].sort((a, b) => {
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      
      // If dates are same, prioritize ALIŞ (Buy) over SATIŞ (Sell)
      const typeScore = (t) => isAlis(t) ? 0 : 1;
      const typeCmp = typeScore(a) - typeScore(b);
      if (typeCmp !== 0) return typeCmp;

      return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
    });
    const buyLots = {};
    const runningBalances = {};
    const intermediateResults = [];

    sorted.forEach((t) => {
      const q = parseNum(t.quantity);
      const p = parseNum(t.price);
      const tr = parseNum(t.taxRate);
      const sId = t.stockId || 'MISSING_ID';
      const instId = t.institutionId || 'MISSING_INST';
      const storageKey = `${sId}_${instId}`;

      if (!runningBalances[storageKey]) runningBalances[storageKey] = 0;

      if (isAlis(t)) {
        if (!buyLots[storageKey]) buyLots[storageKey] = [];
        const lotIndex = buyLots[storageKey].length;
        const newLot = { originalQty: q, remaining: q, price: p, taxRate: tr, date: t.date };
        buyLots[storageKey].push(newLot);
        
        runningBalances[storageKey] += q;
        
        intermediateResults.push({
          ...t,
          quantity: q, price: p, taxRate: tr,
          _isAlis: true,
          _lotIndex: lotIndex,
          _storageKey: storageKey,
          runningBalance: runningBalances[storageKey],
          calculatedTaxDeduction: 0,
          totalBuyAmount: q * p,
          totalSaleAmount: 0,
          totalProfit: 0,
          avgBuyPrice: p
        });
      } else {
        let remainingToSell = q;
        let taxDeduction = 0;
        let grossProfit = 0;
        let weightedDaysSum = 0;
        let totalSoldUnits = 0;
        
        let lots = buyLots[storageKey] || [];
        // If no lots in this specific storageKey, check other institutions for same stock
        if (lots.every(l => l.remaining <= 0)) {
          const otherKeys = Object.keys(buyLots).filter(k => k.startsWith(`${sId}_`) && buyLots[k].some(l => l.remaining > 0));
          if (otherKeys.length > 0) {
            lots = buyLots[otherKeys[0]];
          }
        }

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

        // Fallback if no buy lots exist or explicit values were imported/entered
        const explicitGross = (t.grossProfit !== undefined && t.grossProfit !== null && t.grossProfit !== '' && t.grossProfit !== 0) ? parseNum(t.grossProfit) : null;
        const explicitTotal = (t.totalProfit !== undefined && t.totalProfit !== null && t.totalProfit !== '' && t.totalProfit !== 0) ? parseNum(t.totalProfit) : null;
        const explicitAvgBuy = (t.avgBuyPrice !== undefined && t.avgBuyPrice !== null && t.avgBuyPrice !== '' && t.avgBuyPrice !== 0) ? parseNum(t.avgBuyPrice) : null;

        if (grossProfit === 0 && totalSoldUnits === 0) {
          if (explicitGross !== null) {
            grossProfit = explicitGross;
          } else if (explicitAvgBuy !== null && explicitAvgBuy > 0) {
            grossProfit = q * (p - explicitAvgBuy);
          }
        }

        const durationDays = totalSoldUnits > 0 ? Math.round(weightedDaysSum / totalSoldUnits) : 0;

        const totalSaleAmount = q * p;
        const finalTaxDeduction = (t.taxDeduction !== undefined && t.taxDeduction !== null && t.taxDeduction !== 0) ? parseNum(t.taxDeduction) : taxDeduction;
        const totalProfit = (explicitTotal !== null && (grossProfit === explicitGross || totalSoldUnits === 0)) ? explicitTotal : (grossProfit - finalTaxDeduction);
        const costBasis = totalSaleAmount - grossProfit;
        const profitPercentage = costBasis > 0 ? (totalProfit / costBasis) * 100 : 0;
        const avgBuyPrice = (explicitAvgBuy !== null && explicitAvgBuy > 0) ? explicitAvgBuy : (q > 0 ? Math.max(0, costBasis / q) : 0);

        runningBalances[storageKey] = Math.max(0, runningBalances[storageKey] - q);

        const totalRemainingAfterSale = (buyLots[storageKey] || []).reduce((acc, lot) => acc + lot.remaining, 0);
        intermediateResults.push({
          ...t,
          quantity: q, price: p, taxRate: tr,
          _isAlis: false,
          _storageKey: storageKey,
          runningBalance: runningBalances[storageKey],
          calculatedRemaining: totalRemainingAfterSale,
          calculatedTaxDeduction: finalTaxDeduction,
          totalBuyAmount: 0,
          totalSaleAmount: totalSaleAmount,
          costBasis: costBasis,
          grossProfit: grossProfit,
          totalProfit: totalProfit,
          profitPercentage: profitPercentage,
          holdingDurationDays: durationDays > 0 ? durationDays : 0,
          avgBuyPrice: avgBuyPrice
        });
      }
    });

    const finalResult = intermediateResults.map(item => {
      if (item._isAlis) {
        const finalLot = buyLots[item._storageKey][item._lotIndex];
        return { ...item, calculatedRemaining: finalLot.remaining };
      }
      return item;
    });

    return finalResult;
  }, [transactions, stocks]);

  const stockRemainingQuantities = useMemo(() => {
    const quantities = {};
    processedTransactions.forEach(t => {
      if (isAlis(t) && (t.calculatedRemaining || 0) > 0) {
        quantities[t.stockId] = (quantities[t.stockId] || 0) + t.calculatedRemaining;
      }
    });
    return quantities;
  }, [processedTransactions]);

  const institutionStats = useMemo(() => {
    const stats = {};
    institutions.forEach(inst => {
      stats[inst.id] = { realizedGross: 0, realizedNet: 0, unrealizedGross: 0, unrealizedNet: 0, totalInvestment: 0, currentValue: 0, dailyGain: 0 };
    });

    processedTransactions.forEach(t => {
      const instId = t.institutionId;
      if (!stats[instId]) return;

      if (isAlis(t)) {
        const remaining = t.calculatedRemaining || 0;
        if (remaining > 0) {
          const sInfo = getStockInfo(t.stockId);
          const currentPrice = parseNum(sInfo.currentPrice) || 0;
          const cost = t.price * remaining;
          const currentVal = currentPrice * remaining;
          const uGross = currentVal - cost;
          let uTax = 0;
          if (uGross > 0 && t.taxRate > 0) uTax = uGross * (t.taxRate / 100);
          
          stats[instId].unrealizedGross += uGross;
          stats[instId].unrealizedNet += (uGross - uTax);
          stats[instId].totalInvestment += cost;
          stats[instId].currentValue += currentVal;
          const dChange = parseFloat(sInfo.dailyChange) || 0;
          stats[instId].dailyGain += currentVal * (dChange / (100 + dChange));
        }
      } else {
        stats[instId].realizedGross += (t.grossProfit || 0);
        stats[instId].realizedNet += (t.totalProfit || 0);
      }
    });

    return stats;
  }, [institutions, processedTransactions, stocks]);

  // Auto-sync finance summaries (totalStockPortfolio, totalStockTax, institutionBalances) to Firestore users/{uid}/summaries/overview
  useEffect(() => {
    if (user?.uid && (processedTransactions.length > 0 || institutions.length > 0)) {
      resyncAllFinanceSummaries(user.uid, processedTransactions, stocks, institutions);
    }
  }, [user?.uid, processedTransactions, stocks, institutions]);

  const handleBulkImport = async (data) => {
    if (!user || !data || data.length === 0) return;
    setIsBulkProcessing(true);
    setBulkProgress(0);
    let totalCount = 0;
    
    // Track newly created entities to avoid duplicates within the same import
    const localInstitutions = [...institutions];
    const localStocks = [...stocks];

    // Split into chunks of 400 for Firestore Batch limit
    const chunkSize = 400;
    const chunks = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const batch = writeBatch(db);

        for (const item of chunk) {
          const rawStockName = (item.stockName || '').trim().toUpperCase();
          if (!rawStockName) continue;

          // Find or create Institution
          const rawInstName = (item.institutionName || '').trim() || (localInstitutions[0]?.name || 'Genel');
          let inst = localInstitutions.find(instItem => instItem.name.toLowerCase() === rawInstName.toLowerCase());
          if (!inst) {
            const newInstRef = doc(collection(db, `users/${user.uid}/institutions`));
            const newInst = { id: newInstRef.id, name: rawInstName, logo: '', createdAt: serverTimestamp(), deleted: false };
            batch.set(newInstRef, { name: newInst.name, logo: newInst.logo, createdAt: newInst.createdAt, deleted: newInst.deleted });
            localInstitutions.push(newInst);
            inst = newInst;
          }

          // Find or create Stock
          let stock = localStocks.find(s => s.name.toLowerCase() === rawStockName.toLowerCase());
          if (!stock) {
            const newStockRef = doc(collection(db, `users/${user.uid}/stocks`));
            const newStock = { id: newStockRef.id, name: rawStockName, currentPrice: 0, createdAt: serverTimestamp(), deleted: false };
            batch.set(newStockRef, { name: newStock.name, currentPrice: newStock.currentPrice, createdAt: newStock.createdAt, deleted: newStock.deleted });
            localStocks.push(newStock);
            stock = newStock;
          }

          const qty = typeof item.quantity === 'number' ? item.quantity : (parseFloat(item.quantity) || 0);
          const prc = typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0);
          const tax = typeof item.taxRate === 'number' ? item.taxRate : (parseFloat(item.taxRate) || 0);
          const typeName = item.typeName === 'SATIŞ' ? 'SATIŞ' : 'ALIŞ';
          
          const payload = { 
            institutionId: inst.id, 
            stockId: stock.id, 
            type: typeName, 
            quantity: qty, 
            price: prc, 
            taxRate: tax, 
            date: item.date || new Date().toISOString().split('T')[0], 
            createdAt: serverTimestamp(), 
            deleted: false 
          };

          if (item.grossProfit !== undefined && item.grossProfit !== null && item.grossProfit !== 0) {
            payload.grossProfit = typeof item.grossProfit === 'number' ? item.grossProfit : (parseFloat(item.grossProfit) || 0);
          }
          if (item.totalProfit !== undefined && item.totalProfit !== null && item.totalProfit !== 0) {
            payload.totalProfit = typeof item.totalProfit === 'number' ? item.totalProfit : (parseFloat(item.totalProfit) || 0);
          }
          if (item.taxDeduction !== undefined && item.taxDeduction !== null && item.taxDeduction !== 0) {
            payload.taxDeduction = typeof item.taxDeduction === 'number' ? item.taxDeduction : (parseFloat(item.taxDeduction) || 0);
          }
          if (item.avgBuyPrice !== undefined && item.avgBuyPrice !== null && item.avgBuyPrice !== 0) {
            payload.avgBuyPrice = typeof item.avgBuyPrice === 'number' ? item.avgBuyPrice : (parseFloat(item.avgBuyPrice) || 0);
          }

          const newRef = doc(collection(db, `users/${user.uid}/financeTransactions`));
          batch.set(newRef, payload);
          totalCount++;
        }
        
        await batch.commit();
        setBulkProgress(Math.round(((i + 1) / chunks.length) * 100));
      }
    } catch (err) {
      console.error('Bulk import error:', err);
      throw err;
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress(0);
    }
  };

  const filteredTransactions = useMemo(() => {
    let result = processedTransactions.filter(t => {
      if (selectedInstitutionId !== 'all' && t.institutionId !== selectedInstitutionId) return false;
      return true;
    });

    if (config.filters && config.filters.length > 0) {
      config.filters.forEach(f => {
        const filterValueRaw = (f.value || '');
        if (!filterValueRaw && !['is_empty', 'is_not_empty'].includes(f.operator)) return;

        result = result.filter(t => {
          let rawVal = (t[f.propId] || '').toString().toLowerCase();
          let displayVal = rawVal;
          if (f.propId === 'institutionId') displayVal = (getInstitutionInfo(t[f.propId]).name || '').toLowerCase();
          if (f.propId === 'stockId') displayVal = (getStockInfo(t[f.propId]).name || '').toLowerCase();
          
          const filterVal = filterValueRaw.toLowerCase();

          if (f.operator === 'is_empty') return !t[f.propId];
          if (f.operator === 'is_not_empty') return !!t[f.propId];
          if (f.operator === 'contains') return rawVal.includes(filterVal) || displayVal.includes(filterVal);
          if (f.operator === 'does_not_contain') return !rawVal.includes(filterVal) && !displayVal.includes(filterVal);
          return true;
        });
      });
    }

    return result;
  }, [processedTransactions, selectedInstitutionId, config.filters, institutions, stocks]);

  const currentPortfolio = useMemo(() => {
    const portfolio = {};
    const today = new Date();
    
    const safeParseNum = (val) => {
      if (val === undefined || val === null || val === '') return 0;
      if (typeof val === 'number') return val;
      const str = val.toString().trim();
      if (str.includes(',')) {
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
      }
      return parseFloat(str) || 0;
    };

    processedTransactions.forEach(t => {
      if (!portfolio[t.stockId]) {
        const sInfo = getStockInfo(t.stockId);
        portfolio[t.stockId] = {
          id: t.stockId,
          name: sInfo.name,
          currentPrice: safeParseNum(sInfo.currentPrice),
          quantity: 0,
          totalCost: 0,
          firstPurchaseDate: null,
          avgPrice: 0,
          institutionBreakdown: {},
          updatedAt: sInfo.updatedAt,
          createdAt: sInfo.createdAt,
          dailyChange: sInfo.dailyChange
        };
      }
      
      if (isAlis(t) && (t.calculatedRemaining || 0) > 0) {
        portfolio[t.stockId].quantity += t.calculatedRemaining;
        portfolio[t.stockId].totalCost += t.calculatedRemaining * t.price;
        
        const instId = t.institutionId;
        portfolio[t.stockId].institutionBreakdown[instId] = (portfolio[t.stockId].institutionBreakdown[instId] || 0) + t.calculatedRemaining;
        
        // Track the earliest purchase date of shares currently in hand
        if (!portfolio[t.stockId].firstPurchaseDate || (t.date && new Date(t.date).toString() !== 'Invalid Date' && (!portfolio[t.stockId].firstPurchaseDate || new Date(t.date) < new Date(portfolio[t.stockId].firstPurchaseDate)))) {
          portfolio[t.stockId].firstPurchaseDate = t.date;
        }
      }
    });

    return Object.values(portfolio)
      .filter(item => item.quantity > 0)
      .map(item => {
        const avgPrice = item.totalCost / item.quantity;
        const grossProfit = (item.currentPrice - avgPrice) * item.quantity;
        
        // Potential tax deduction based on unrealized profit per lot
        let potentialTax = 0;
        if (item.currentPrice > 0) {
          processedTransactions.forEach(t => {
            if (t.stockId === item.id && isAlis(t) && (t.calculatedRemaining || 0) > 0) {
              const lotProfit = (item.currentPrice - t.price) * t.calculatedRemaining;
              if (lotProfit > 0 && t.taxRate > 0) {
                potentialTax += lotProfit * (t.taxRate / 100);
              }
            }
          });
        }

        // Duration calculation
        let duration = 0;
        if (item.firstPurchaseDate) {
          duration = Math.floor((today - new Date(item.firstPurchaseDate)) / (1000 * 60 * 60 * 24));
        }

        const netProfit = grossProfit - potentialTax;
        const profitPercentage = item.totalCost > 0 ? (netProfit / item.totalCost) * 100 : 0;

        const dailyChangePerc = parseFloat(item.dailyChange) || 0;
        const dailyGain = (item.quantity * item.currentPrice) * (dailyChangePerc / (100 + dailyChangePerc));

        return {
          ...item,
          avgPrice,
          totalCost: item.totalCost,
          totalGrossProfit: grossProfit,
          totalTaxDeduction: potentialTax,
          totalProfit: netProfit,
          profitPercentage: profitPercentage,
          holdingDurationDays: duration,
          dailyGain,
          dailyChangePerc
        };
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [processedTransactions, stocks]);


  const propertyOrder = useMemo(() => {
    const baseOrder = PROPERTIES.map(p => p.id);
    const storedOrder = Array.isArray(config.propertyOrder) ? config.propertyOrder : baseOrder;
    const validStored = storedOrder.filter(id => PROPERTIES.some(p => p.id === id));
    const missing = baseOrder.filter(id => !validStored.includes(id));
    return [...validStored, ...missing];
  }, [config.propertyOrder]);

  const visibleProperties = useMemo(() => {
    return propertyOrder.filter(id => config.propertyVisibility?.[id] !== false);
  }, [propertyOrder, config.propertyVisibility]);

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

  const applySort = (data, sortConfig) => {
    return [...data].sort((a, b) => {
      if (!sortConfig) {
        const timeA = getCreatedTime(a);
        const timeB = getCreatedTime(b);
        if (timeB !== timeA) return timeB - timeA;
        return (a.order || 0) - (b.order || 0);
      }
      const { propId, direction } = sortConfig;
      let valA = a[propId], valB = b[propId];
      if (propId === 'date') {
        valA = valA || '0000-00-00';
        valB = valB || '0000-00-00';
      } else if (propId === 'institutionId') {
        valA = getInstitutionInfo(valA).name || '';
        valB = getInstitutionInfo(valB).name || '';
      } else if (propId === 'stockId') {
        valA = getStockInfo(valA).name || '';
        valB = getStockInfo(valB).name || '';
      } else if (['quantity', 'price', 'taxRate', 'remainingQuantity', 'taxDeduction'].includes(propId)) {
        valA = typeof valA === 'string' ? parseFloat(valA) : (valA || 0);
        valB = typeof valB === 'string' ? parseFloat(valB) : (valB || 0);
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;

      const timeA = getCreatedTime(a);
      const timeB = getCreatedTime(b);
      if (timeB !== timeA) return timeB - timeA;
      return (a.order || 0) - (b.order || 0);
    });
  };

  const sortedTransactions = useMemo(() => {
    return applySort(filteredTransactions, config.sortConfig);
  }, [filteredTransactions, config.sortConfig, institutions, stocks]);

  const visibleTransactions = useMemo(() => sortedTransactions.slice(0, limitCount), [sortedTransactions, limitCount]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!isInfiniteScroll) return;
    const options = { root: null, rootMargin: '20px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && limitCount < sortedTransactions.length) {
        setLimitCount(prev => Math.min(prev + 100, sortedTransactions.length));
      }
    }, options);
    if (lastElementRef.current) observer.observe(lastElementRef.current);
    return () => observer.disconnect();
  }, [sortedTransactions.length, limitCount, isInfiniteScroll]);

  const handleUpdateDateFormat = async (format) => { await updateConfig({ dateFormat: format }); };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!formInstitutionId || !formStockId || !quantity || !price || !date) return;
    const qty = parseFloat(quantity.replace(',', '.'));
    const prc = parseFloat(price.replace(',', '.'));
    const tax = parseFloat(taxRate.replace(',', '.')) || 0;
    try {
      const batch = writeBatch(db);
      let calculatedTaxDeduction = 0;
      let portfolioRemainingQty = 0;
      const stockTrans = transactions.filter(t => t.stockId === formStockId).sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.createdAt?.seconds - b.createdAt?.seconds);
      const currentTotalQty = stockTrans.reduce((acc, t) => acc + (t.type === 'ALIŞ' ? t.quantity : -t.quantity), 0);
      if (type === 'SATIŞ') {
        const buyDocs = transactions.filter(t => t.stockId === formStockId && t.type === 'ALIŞ' && t.remainingQuantity > 0).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        let totalAvailable = buyDocs.reduce((acc, d) => acc + (d.remainingQuantity || 0), 0);
        if (totalAvailable < qty) { alert(`Yetersiz adet! Mevcut: ${totalAvailable}`); return; }
        let remainingToSell = qty;
        for (const buyData of buyDocs) {
          if (remainingToSell <= 0) break;
          const available = buyData.remainingQuantity;
          const toDeduct = Math.min(available, remainingToSell);
          const profit = (prc - buyData.price) * toDeduct;
          if (profit > 0 && buyData.taxRate > 0) { calculatedTaxDeduction += profit * (buyData.taxRate / 100); }
          batch.update(doc(db, `users/${user.uid}/financeTransactions`, buyData.id), { remainingQuantity: available - toDeduct });
          remainingToSell -= toDeduct;
        }
        portfolioRemainingQty = currentTotalQty - qty;
      } else {
        portfolioRemainingQty = currentTotalQty + qty;
      }
      const newRef = doc(collection(db, `users/${user.uid}/financeTransactions`));
      batch.set(newRef, { institutionId: formInstitutionId, stockId: formStockId, type, quantity: qty, remainingQuantity: type === 'ALIŞ' ? qty : portfolioRemainingQty, price: prc, date, taxRate: tax, createdAt: serverTimestamp(), deleted: false });
      await batch.commit();
      
      const portfolioDelta = type === 'ALIŞ' ? (qty * prc) : -(qty * prc);
      const taxDelta = calculatedTaxDeduction || 0;
      updateStockPortfolioSummary(user.uid, portfolioDelta, taxDelta);
      
      setQuantity(''); setPrice(''); setTaxRate('0'); setShowTransactionModal(false);
    } catch (error) { console.error(error); }
  };

  const handleQuickNewTransaction = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    await addDoc(collection(db, `users/${user.uid}/financeTransactions`), { institutionId: '', stockId: '', type: 'ALIŞ', quantity: 0, price: 0, taxRate: 0, remainingQuantity: 0, date: today, createdAt: serverTimestamp(), deleted: false });
  };


  const handleToggleInstitutionVisibility = async (inst, isVisible) => {
    await updateDoc(doc(db, `users/${user.uid}/institutions`, inst.id), { visible: isVisible });
  };

  const handleAutoSortInstitutions = async (criteria) => {
    let sorted = [...institutions];
    if (criteria === 'name') {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (criteria === 'date') {
      sorted.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
    }
    
    const batch = writeBatch(db);
    sorted.forEach((inst, i) => {
      batch.update(doc(db, `users/${user.uid}/institutions`, inst.id), { order: i });
    });
    await batch.commit();
  };

  const handleBulkDelete = async () => { if (!window.confirm(`${selectedIds.length} işlemi silmek istediğinize emin misiniz?`)) return; const batch = writeBatch(db); const affectedData = selectedIds.map(id => ({ id, current: transactions.find(t => t.id === id) })); selectedIds.forEach((id) => { batch.update(doc(db, `users/${user.uid}/financeTransactions`, id), { deleted: true }); }); await addDoc(collection(db, `users/${user.uid}/bulkHistory_finance`), { type: 'DELETE', count: selectedIds.length, affectedData, timestamp: serverTimestamp() }); await batch.commit(); setSelectedIds([]); };

  const handleBulkSave = async () => {
    if (Object.keys(stagedChanges).length === 0 || selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    setBulkProgress(0);
    const total = selectedIds.length;
    const affectedData = [];
    try {
      for (let i = 0; i < total; i++) {
        const id = selectedIds[i];
        const current = transactions.find(t => t.id === id);
        affectedData.push({ id, current: { ...current } });

        const updates = { ...stagedChanges };
        if (updates.taxRate !== undefined) {
          updates.taxRate = parseFloat(updates.taxRate.toString().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) || 0;
        }

        await updateDoc(doc(db, `users/${user.uid}/financeTransactions`, id), updates);
        setBulkProgress(Math.round(((i + 1) / total) * 100));
      }
      await addDoc(collection(db, `users/${user.uid}/bulkHistory_finance`), { type: 'BULK_UPDATE', count: total, fields: Object.keys(stagedChanges), stagedChanges, affectedData, timestamp: serverTimestamp() });
      setStagedChanges({});
      setSelectedIds([]);
    } catch (err) { console.error('Bulk update error:', err); } finally { setIsBulkProcessing(false); setBulkProgress(0); }
  };

  const handleUndoBulkAction = async (historyItem) => {
    if (!window.confirm('Bu toplu işlemi geri almak istediğinize emin misiniz?')) return;
    setIsBulkProcessing(true);
    setBulkProgress(0);
    try {
      const total = historyItem.affectedData.length;
      for (let i = 0; i < total; i++) {
        const item = historyItem.affectedData[i];
        if (historyItem.type === 'DELETE') {
          await updateDoc(doc(db, `users/${user.uid}/financeTransactions`, item.id), { deleted: false });
        } else {
          const revertData = {};
          Object.keys(historyItem.stagedChanges).forEach(field => { revertData[field] = item.current[field]; });
          await updateDoc(doc(db, `users/${user.uid}/financeTransactions`, item.id), revertData);
        }
        setBulkProgress(Math.round(((i + 1) / total) * 100));
      }
      await deleteDoc(doc(db, `users/${user.uid}/bulkHistory_finance`, historyItem.id));
    } catch (err) { console.error('Undo error:', err); } finally { setIsBulkProcessing(false); setBulkProgress(0); }
  };

  const handleClearBulkHistory = async () => { if (window.confirm('Tüm geçmişi silmek istediğinize emin misiniz?')) { const batch = writeBatch(db); bulkHistory.forEach(item => batch.delete(doc(db, `users/${user.uid}/bulkHistory_finance`, item.id))); await batch.commit(); } };
  const handleDeleteBulkHistory = async (id) => { await deleteDoc(doc(db, `users/${user.uid}/bulkHistory_finance`, id)); };

  const handleClearCache = async () => {
    if (window.confirm('Tarayıcıdaki yerel verileri (cache) silmek istediğinize emin misiniz? Bu işlem sonrası sayfa yenilenecektir.')) {
      try {
        await db._delegate._persistence.clear(); // This clears Firestore persistence
        window.location.reload();
      } catch (err) {
        console.error('Clear cache error:', err);
        window.location.reload();
      }
    }
  };

  const saveCell = async (transId, propId, value) => {
    let finalValue = value;
    if (['quantity', 'price', 'taxRate'].includes(propId)) {
      const cleanValue = value.toString().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
      finalValue = parseFloat(cleanValue) || 0;
    }
    
    const updates = { [propId]: finalValue };
    
    if (propId === 'stockId') {
      const stock = stocks.find(s => s.id === value);
      if (stock && stock.currentPrice !== undefined && stock.currentPrice !== null && stock.currentPrice !== '') {
        const parsePrice = (p) => {
          if (!p) return 0;
          if (typeof p === 'number') return p;
          const str = p.toString().trim();
          if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
          return parseFloat(str) || 0;
        };
        updates.price = parsePrice(stock.currentPrice);
      }
    }
    
    await updateDoc(doc(db, `users/${user.uid}/financeTransactions`, transId), updates);
    if (user?.uid) {
      setTimeout(() => {
        resyncAllFinanceSummaries(user.uid, globalFinanceTransactions, globalStocks);
      }, 500);
    }
    setEditingCell(prev => {
      if (prev && prev.transId === transId && prev.propId === propId) {
        setCellDraft(null);
        return null;
      }
      return prev;
    });
  };

  const handleSelect = React.useCallback((id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  }, []);

  const renderCell = React.useCallback((propId, t) => {
    const inst = getInstitutionInfo(t.institutionId);
    const stock = getStockInfo(t.stockId);
    const isEditing = editingCell?.transId === t.id && editingCell?.propId === propId;
    const startEdit = (e) => { 
      e.stopPropagation(); 
      setEditTarget(e.currentTarget);
      // Auto-save previous cell if exists
      if (editingCell && cellDraft !== null) {
        saveCell(editingCell.transId, editingCell.propId, cellDraft);
      }
      let initialValue = t[propId] ?? '';
      if (typeof initialValue === 'number' && ['quantity', 'price', 'taxRate'].includes(propId)) {
        initialValue = initialValue.toString().replace('.', ',');
      }
      setEditingCell({ transId: t.id, propId }); 
      setCellDraft(initialValue);
      setSearchTerm('');
    };
    const isWrapped = config.propertyWrap?.[propId] !== false;
    const tdClass = `cell-editable${isEditing ? ' cell-editing' : ''} ${!isWrapped ? 'text-nowrap' : ''}`;
    const tdClick = isEditing ? undefined : startEdit;

    switch (propId) {
      case 'date': return <td key={propId} className={tdClass} onClick={tdClick}>{isEditing ? <DateCellInput value={t.date} onSave={(v) => saveCell(t.id, 'date', v)} onCancel={() => setEditingCell(null)} /> : <span className="text-muted small">{displayDateFormatted(t.date)}</span>}</td>;
      case 'institutionId': return (
        <td key={propId} className={tdClass} onClick={tdClick} style={{ position: 'relative', zIndex: isEditing ? 1000 : 1 }}>
          {isEditing ? (
            <>
              <div className="small cursor-default">
                <div className="d-flex align-items-center gap-2">
                  {getInstitutionInfo(cellDraft).logo ? <img src={getInstitutionInfo(cellDraft).logo} alt="" width="16" height="16" className="rounded-circle" /> : <Landmark size={14} className="text-muted" />}
                  <span>{getInstitutionInfo(cellDraft).name || 'Seçiniz...'}</span>
                </div>
              </div>
              <Overlay
                target={editTarget}
                show={isEditing}
                placement="bottom-start"
                rootClose
                onHide={() => { saveCell(t.id, 'institutionId', cellDraft); setEditingCell(null); }}
                popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'offset', options: { offset: [0, 4] } }, { name: 'preventOverflow', options: { boundary: 'viewport' } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }}
              >
                {({ placement, arrowProps, show: _show, popper, hasDoneInitialMeasure, ...props }) => (
                  <div {...props} className="glass-card border-0 shadow-lg p-2 overflow-auto" style={{ ...props.style, zIndex: 20000, minWidth: '200px', maxHeight: '300px', backgroundColor: 'white' }}>
                    <div className="px-2 py-1 sticky-top bg-white border-bottom mb-1" style={{ zIndex: 1 }}>
                      <Form.Control size="sm" placeholder="Kurum ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border-0 bg-light" />
                    </div>
                    {institutions.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(i => (
                      <div key={i.id} className="d-flex align-items-center gap-2 p-1 px-2 rounded-1 cursor-pointer notion-option-item fs-14" onClick={(e) => { e.stopPropagation(); setCellDraft(i.id); saveCell(t.id, 'institutionId', i.id); setEditingCell(null); }}>
                        {i.logo ? <img src={i.logo} alt="" width="14" height="14" className="rounded-circle" /> : <Landmark size={12} className="text-muted" />}
                        <span>{i.name}</span>
                        {cellDraft === i.id && <Check size={12} className="text-primary ms-auto" />}
                      </div>
                    ))}
                  </div>
                )}
              </Overlay>
            </>
          ) : (
            <div className="d-flex align-items-center gap-2 small">
              {inst.logo ? <img src={inst.logo} alt="" width="16" height="16" className="rounded-circle" /> : <Landmark size={14} className="text-muted" />}
              <span>{inst.name || '-'}</span>
            </div>
          )}
        </td>
      );
      case 'stockId': return (
        <td key={propId} className={tdClass} onClick={tdClick} style={{ position: 'relative', zIndex: isEditing ? 1000 : 1 }}>
          {isEditing ? (
            <>
              <div className="fw-bold cursor-default">
                <span>{getStockInfo(cellDraft).name || 'Seçiniz...'}</span>
              </div>
              <Overlay
                target={editTarget}
                show={isEditing}
                placement="bottom-start"
                rootClose
                onHide={() => { saveCell(t.id, 'stockId', cellDraft); setEditingCell(null); }}
                popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'offset', options: { offset: [0, 4] } }, { name: 'preventOverflow', options: { boundary: 'viewport' } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }}
              >
                {({ placement, arrowProps, show: _show, popper, hasDoneInitialMeasure, ...props }) => (
                  <div {...props} className="glass-card border-0 shadow-lg p-2 overflow-auto" style={{ ...props.style, zIndex: 20000, minWidth: '220px', maxHeight: '300px', backgroundColor: 'white' }}>
                    <div className="px-2 py-1 sticky-top bg-white border-bottom mb-1" style={{ zIndex: 1 }}>
                      <Form.Control size="sm" placeholder="Hisse ara..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border-0 bg-light" />
                    </div>
                    {[...stocks].filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => (stockRemainingQuantities[b.id] || 0) - (stockRemainingQuantities[a.id] || 0)).map(s => { 
                      const qty = stockRemainingQuantities[s.id] || 0; 
                      return (
                        <div key={s.id} className="d-flex align-items-center gap-2 p-1 px-2 rounded-1 cursor-pointer notion-option-item fs-14" onClick={(e) => { e.stopPropagation(); setCellDraft(s.id); saveCell(t.id, 'stockId', s.id); setEditingCell(null); }}>
                          <TrendingUp size={12} className="text-muted" />
                          <span className="flex-grow-1">{s.name}</span>
                          {qty > 0 && <Badge bg="primary" className="rounded-pill opacity-75" style={{ fontSize: '9px' }}>{new Intl.NumberFormat('tr-TR').format(qty)}</Badge>}
                          {cellDraft === s.id && <Check size={12} className="text-primary ms-auto" />}
                        </div>
                      ); 
                    })}
                  </div>
                )}
              </Overlay>
            </>
          ) : (
            <span className="fw-bold text-primary">{stock.name || '-'}</span>
          )}
        </td>
      );
      case 'type': return (
        <td key={propId} className={tdClass} onClick={tdClick} style={{ position: 'relative', zIndex: isEditing ? 1000 : 1 }}>
          {isEditing ? (
            <>
              <div className="fw-bold cursor-default">
                <Badge bg={cellDraft === 'ALIŞ' ? "success" : "danger"} className="rounded-pill px-2">{cellDraft}</Badge>
              </div>
              <Overlay
                target={editTarget}
                show={isEditing}
                placement="bottom-start"
                rootClose
                onHide={() => { saveCell(t.id, 'type', cellDraft); setEditingCell(null); }}
                popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'offset', options: { offset: [0, 4] } }, { name: 'preventOverflow', options: { boundary: 'viewport' } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }}
              >
                {({ placement, arrowProps, show: _show, popper, hasDoneInitialMeasure, ...props }) => (
                  <div {...props} className="glass-card border-0 shadow-lg p-1" style={{ ...props.style, zIndex: 20000, minWidth: '120px', backgroundColor: 'white' }}>
                    {['ALIŞ', 'SATIŞ'].map(type => (
                      <div key={type} className="d-flex align-items-center gap-2 p-1 px-2 rounded-1 cursor-pointer notion-option-item fs-14" onClick={(e) => { e.stopPropagation(); setCellDraft(type); saveCell(t.id, 'type', type); setEditingCell(null); }}>
                        <Badge bg={type === 'ALIŞ' ? "success" : "danger"} className="rounded-pill px-2">{type}</Badge>
                        {cellDraft === type && <Check size={12} className="text-primary ms-auto" />}
                      </div>
                    ))}
                  </div>
                )}
              </Overlay>
            </>
          ) : (
            <Badge bg={t.type === 'ALIŞ' ? "success" : "danger"} className="rounded-pill px-2">{t.type === 'ALIŞ' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />} {t.type}</Badge>
          )}
        </td>
      );
      case 'quantity': return <td key={propId} className={tdClass} onClick={tdClick}><OverlayCell isEditing={isEditing} display={t.quantity} input={<LocalTextInput size="sm" inputMode="text" autoFocus value={cellDraft} onSave={(val) => saveCell(t.id, 'quantity', val)} onCancel={() => setEditingCell(null)} className="border-0 bg-transparent p-0" />} /></td>;
      case 'price': return <td key={propId} className={tdClass} onClick={tdClick}><OverlayCell isEditing={isEditing} display={`${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 8 }).format(t.price)} TL`} input={<LocalTextInput size="sm" inputMode="text" autoFocus value={cellDraft} onSave={(val) => saveCell(t.id, 'price', val)} onCancel={() => setEditingCell(null)} className="border-0 bg-transparent p-0" />} /></td>;
      case 'taxRate': return <td key={propId} className={tdClass} onClick={tdClick}><OverlayCell isEditing={isEditing} display={`%${(t.taxRate ?? 0).toString().replace('.', ',')}`} input={<LocalTextInput size="sm" inputMode="text" autoFocus value={cellDraft} onSave={(val) => saveCell(t.id, 'taxRate', val)} onCancel={() => setEditingCell(null)} className="border-0 bg-transparent p-0" />} /></td>;
      case 'grossProfit': return (
        <td key={propId} className={`fw-bold ${!isWrapped ? 'text-nowrap' : ''}`}>
          {t.type === 'SATIŞ' && t.grossProfit !== 0 ? (
            <div className="d-flex flex-column align-items-end">
              <span>{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.grossProfit)} TL</span>
              <span className="x-small opacity-75">(%{(t.costBasis > 0 ? (t.grossProfit / t.costBasis * 100) : 0).toFixed(2)})</span>
            </div>
          ) : '-'}
        </td>
      );
      case 'remainingQuantity': return <td key={propId} className="fw-bold"><Badge bg={t.type === 'ALIŞ' ? (t.calculatedRemaining === 0 ? "secondary" : "info") : "primary"} className="rounded-pill">{t.runningBalance}</Badge></td>;
      case 'taxDeduction': 
        const taxVal = t.calculatedTaxDeduction;
        return (
          <td key={propId} className={`text-danger fw-bold ${!isWrapped ? 'text-nowrap' : ''}`}>
            {taxVal > 0 ? (
              <div className="d-flex flex-column align-items-end">
                <span>{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(taxVal)} TL</span>
                <span className="x-small opacity-75">(%{(t.costBasis > 0 ? (taxVal / t.costBasis * 100) : 0).toFixed(2)})</span>
              </div>
            ) : '-'}
          </td>
        );
      case 'totalBuyAmount': return <td key={propId} className="fw-bold">{t.type === 'ALIŞ' && t.totalBuyAmount > 0 ? `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.totalBuyAmount)} TL` : '-'}</td>;
      case 'totalSaleAmount': return <td key={propId} className="fw-bold">{t.type === 'SATIŞ' && t.totalSaleAmount > 0 ? `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.totalSaleAmount)} TL` : '-'}</td>;
      case 'avgBuyPrice': {
        const decimals = getDecimalPlaces(t.price);
        return (
          <td key={propId} className={`fw-bold ${!isWrapped ? 'text-nowrap' : ''}`}>
            {t.avgBuyPrice > 0 ? `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(t.avgBuyPrice)} TL` : '-'}
          </td>
        );
      }
      case 'totalProfit': return (
        <td key={propId} className={`fw-bold ${t.totalProfit > 0 ? 'text-success' : t.totalProfit < 0 ? 'text-danger' : ''}`}>
          {t.type === 'SATIŞ' && t.totalProfit !== 0 ? (
            <div className="d-flex flex-column align-items-end">
              <span>{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.totalProfit)} TL</span>
              <span className="x-small opacity-75">({t.holdingDurationDays || 0} gün, %{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.profitPercentage || 0)})</span>
            </div>
          ) : '-'}
        </td>
      );
      default: return <td key={propId}></td>;
    }
  }, [editingCell, cellDraft, searchTerm, institutions, stocks, stockRemainingQuantities, editTarget, config.propertyWrap]);

  if (!user) return null;

  return (
    <div className="container-fluid   min-vh-100 notion-style pb-5">
      <style>{`
        .notion-option-item:hover { background-color: rgba(0, 0, 0, 0.05); }
        .dropdown-submenu { position: relative; }
        .dropdown-submenu:hover > .submenu-content { 
          opacity: 1 !important; 
          visibility: visible !important; 
          pointer-events: all !important;
          transform: translateX(0) !important;
        }
        .submenu-content { 
          position: absolute !important;
          top: 0 !important;
          left: 100% !important;
          margin-left: 2px !important;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translateX(-10px);
          transition: all 0.2s ease-in-out;
          background: white !important;
          border: 1px solid rgba(0,0,0,0.1) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
          border-radius: 8px !important;
          min-width: 180px !important;
          z-index: 10002 !important;
          padding: 8px !important;
        }
        .transition-all { transition: all 0.2s ease-in-out; }
        .hover-bg-light:hover { background-color: rgba(0, 0, 0, 0.03); }
        .x-small { font-size: 11px; }
      `}</style>
      <div className="mb-4">
        {/* Mobile Header: Title + Switcher */}
        <div className="d-md-none mb-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h1 className="fw-bold m-0">Finans</h1>
            <div className="d-flex align-items-center gap-2">
              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret" style={{ cursor: 'pointer' }}>
                  <ArrowUpDown size={18} className="text-muted" />
                </Dropdown.Toggle>
                <Dropdown.Menu popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'computeStyles', options: { adaptive: false } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '220px' }}>
                  <div className="px-3 py-1 mb-1 small fw-bold text-muted opacity-50 fs-10">SIRALAMA SEÇENEKLERİ</div>
                  <Dropdown.Item onClick={() => handleAutoSortInstitutions('name')} className="rounded-2 d-flex align-items-center gap-2">
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0 icon-box-sm"><Type size={15} /></div> İsme Göre (A-Z)
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleAutoSortInstitutions('date')} className="rounded-2 d-flex align-items-center gap-2">
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0 icon-box-sm"><Calendar size={15} /></div> Eklenme Tarihi
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret" style={{ cursor: 'pointer' }}>
                  <SlidersHorizontal size={20} className="text-muted" />
                </Dropdown.Toggle>
                <Dropdown.Menu popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'computeStyles', options: { adaptive: false } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '220px' }}>
                  <div className="px-3 py-1 mb-1 small fw-bold text-muted opacity-50 fs-10">KURUM GÖRÜNÜRLÜĞÜ</div>
                  <div className="overflow-auto mb-2" style={{ maxHeight: '300px' }}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={async (e) => { const { active, over } = e; if (active && over && active.id !== over.id) { const oldIdx = institutions.findIndex(i => i.id === active.id), newIdx = institutions.findIndex(i => i.id === over.id); const reordered = arrayMove(institutions, oldIdx, newIdx); setInstitutions(reordered); const batch = writeBatch(db); reordered.forEach((inst, i) => batch.update(doc(db, `users/${user.uid}/institutions`, inst.id), { order: i })); await batch.commit(); } }}>
                      <SortableContext items={institutions.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        {institutions.map(inst => (
                          <SortableInstitutionDropdownItem key={inst.id} inst={inst} handleToggleInstitutionVisibility={handleToggleInstitutionVisibility} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </Dropdown.Menu>
              </Dropdown>

              <Button variant="primary" size="sm" onClick={() => setShowInstitutionModal(true)} className="d-flex align-items-center gap-1 rounded-pill px-3 shadow-sm ms-2">
                Yeni Kurum <ChevronDown size={14} />
              </Button>
            </div>
          </div>
          <div className="d-flex align-items-center gap-1 mobile-scroll-x">
            <Button variant="light" size="sm" onClick={() => setDoc(doc(db, `users/${user.uid}/config`, 'financeSettings'), { viewLayout: 'gallery_basic' }, { merge: true })} className={`rounded-pill px-3 py-1 fw-medium border-0 ${config.viewLayout === 'gallery_basic' ? 'bg-white shadow-sm' : 'bg-transparent text-muted'}`}><LayoutGrid size={16} /> Galeri</Button>
            <Button variant="light" size="sm" onClick={() => setDoc(doc(db, `users/${user.uid}/config`, 'financeSettings'), { viewLayout: 'table' }, { merge: true })} className={`rounded-pill px-3 py-1 fw-medium border-0 ${config.viewLayout === 'table' ? 'bg-white shadow-sm' : 'bg-transparent text-muted'}`}><ListIcon size={16} /> Tablo</Button>
          </div>
        </div>

        <h1 className="fw-bold mb-4 d-none d-md-block">Finans</h1>

        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-none d-md-flex align-items-center gap-1 mobile-scroll-x">
            <Button variant="light" size="sm" onClick={() => setDoc(doc(db, `users/${user.uid}/config`, 'financeSettings'), { viewLayout: 'gallery_basic' }, { merge: true })} className={`rounded-pill px-3 py-1 fw-medium border-0 ${config.viewLayout === 'gallery_basic' ? 'bg-white shadow-sm' : 'bg-transparent text-muted'}`}><LayoutGrid size={16} /> Galeri</Button>
            <Button variant="light" size="sm" onClick={() => setDoc(doc(db, `users/${user.uid}/config`, 'financeSettings'), { viewLayout: 'table' }, { merge: true })} className={`rounded-pill px-3 py-1 fw-medium border-0 ${config.viewLayout === 'table' ? 'bg-white shadow-sm' : 'bg-transparent text-muted'}`}><ListIcon size={16} /> Tablo</Button>
          </div>
          <div className="d-none d-md-flex align-items-center gap-3 w-100 w-md-auto justify-content-between justify-content-md-end">
            <div className="d-flex align-items-center gap-3 text-muted">
              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret" style={{ cursor: 'pointer' }}>
                  <ArrowUpDown size={18} />
                </Dropdown.Toggle>
                <Dropdown.Menu popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'computeStyles', options: { adaptive: false } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '220px' }}>
                  <div className="px-3 py-1 mb-1 small fw-bold text-muted opacity-50 fs-10">SIRALAMA SEÇENEKLERİ</div>
                  <Dropdown.Item onClick={() => handleAutoSortInstitutions('name')} className="rounded-2 d-flex align-items-center gap-2">
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0 icon-box-sm"><Type size={15} /></div> İsme Göre (A-Z)
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleAutoSortInstitutions('date')} className="rounded-2 d-flex align-items-center gap-2">
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0 icon-box-sm"><Calendar size={15} /></div> Eklenme Tarihi
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret" style={{ cursor: 'pointer' }}>
                  <SlidersHorizontal size={20} />
                </Dropdown.Toggle>
                <Dropdown.Menu popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'computeStyles', options: { adaptive: false } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '220px' }}>
                  <div className="px-3 py-1 mb-1 small fw-bold text-muted opacity-50 fs-10">KURUM GÖRÜNÜRLÜĞÜ</div>
                  <div className="overflow-auto mb-2" style={{ maxHeight: '300px' }}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={async (e) => { const { active, over } = e; if (active && over && active.id !== over.id) { const oldIdx = institutions.findIndex(i => i.id === active.id), newIdx = institutions.findIndex(i => i.id === over.id); const reordered = arrayMove(institutions, oldIdx, newIdx); setInstitutions(reordered); const batch = writeBatch(db); reordered.forEach((inst, i) => batch.update(doc(db, `users/${user.uid}/institutions`, inst.id), { order: i })); await batch.commit(); } }}>
                      <SortableContext items={institutions.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        {institutions.map(inst => (
                          <SortableInstitutionDropdownItem key={inst.id} inst={inst} handleToggleInstitutionVisibility={handleToggleInstitutionVisibility} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                </Dropdown.Menu>
              </Dropdown>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowInstitutionModal(true)} className="rounded-pill px-3 shadow-sm">Yeni Kurum <ChevronDown size={14} /></Button>
          </div>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={async (e) => { const { active, over } = e; if (active && over && active.id !== over.id) { const oldIdx = institutions.findIndex(i => i.id === active.id), newIdx = institutions.findIndex(i => i.id === over.id); const reordered = arrayMove(institutions, oldIdx, newIdx); setInstitutions(reordered); const batch = writeBatch(db); reordered.forEach((inst, i) => batch.update(doc(db, `users/${user.uid}/institutions`, inst.id), { order: i })); await batch.commit(); } }}>
          <SortableContext items={institutions.map(i => i.id)} strategy={config.viewLayout === 'table' ? verticalListSortingStrategy : rectSortingStrategy}>
            {config.viewLayout === 'table' ? (
              <div className="bg-white border rounded-4 overflow-hidden mb-0 shadow-sm">
                <Table hover className="mb-0 fs-14 align-middle">
                  <thead className="bg-light bg-opacity-50">
                    <tr className="text-muted x-small fw-bold text-uppercase border-bottom">
                      <th className="ps-4 py-3" style={{ width: '40%' }}>Kurum</th>
                      <th style={{ width: '30%' }}>Net Kar/Zarar</th>
                      <th className="text-end pe-4" style={{ width: '30%' }}>Portföy Değeri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {institutions.filter(inst => inst.visible !== false).map(inst => (
                      <SortableBankItem 
                        key={inst.id}
                        bank={inst} 
                        stats={institutionStats[inst.id]} 
                        viewLayout="table" 
                        handleDeleteBank={id => updateDoc(doc(db, `users/${user.uid}/institutions`, id), { deleted: true })} 
                        onEditClick={i => { setEditingInstitution(i); setEditInstitutionName(i.name); setEditInstitutionLogo(i.logo || ''); setShowEditModal(true); }} 
                      />
                    ))}
                    <tr className="border-top">
                      <td colSpan="3" className="p-0">
                        <div className="py-2 px-4 hover-bg-light cursor-pointer text-muted x-small d-flex align-items-center gap-2" onClick={() => setShowInstitutionModal(true)}>
                          <Plus size={14} /> Yeni Kurum Ekle
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'nowrap', minWidth: 'max-content' }} className="mb-0 pb-2">
                  {institutions.filter(inst => inst.visible !== false).map(inst => (
                    <div key={inst.id} style={{ width: '240px', flexShrink: 0 }}>
                      <SortableBankItem 
                        bank={inst} 
                        stats={institutionStats[inst.id]} 
                        viewLayout={config.viewLayout} 
                        handleDeleteBank={id => updateDoc(doc(db, `users/${user.uid}/institutions`, id), { deleted: true })} 
                        onEditClick={i => { setEditingInstitution(i); setEditInstitutionName(i.name); setEditInstitutionLogo(i.logo || ''); setShowEditModal(true); }} 
                      />
                    </div>
                  ))}
                  <div style={{ width: '240px', flexShrink: 0 }}>
                    <div className="h-100 bg-white border shadow-sm d-flex align-items-center justify-content-center p-2 text-muted opacity-50 cursor-pointer rounded-3" style={{ minHeight: '140px', borderStyle: 'dashed', borderColor: '#ccc' }} onClick={() => setShowInstitutionModal(true)}>
                      <div className="text-center">
                        <Plus size={20} className="mb-2" />
                        <div className="small fw-bold">Yeni Kurum</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SortableContext>
        </DndContext>

        <div className="mb-4 mt-5">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
            <h1 className="fw-bold m-0 flex-grow-1 flex-md-grow-0 mb-md-4">Mevcut Hisseler</h1>
            <div className="d-flex align-items-center gap-1 mobile-scroll-x">
              <Button variant="light" size="sm" onClick={() => updateConfig({ stockViewLayout: 'gallery' })} className={`rounded-pill px-3 py-1 fw-medium border-0 ${config.stockViewLayout === 'gallery' || !config.stockViewLayout ? 'bg-white shadow-sm' : 'bg-transparent text-muted'}`}><LayoutGrid size={16} /> Galeri</Button>
              <Button variant="light" size="sm" onClick={() => updateConfig({ stockViewLayout: 'table' })} className={`rounded-pill px-3 py-1 fw-medium border-0 ${config.stockViewLayout === 'table' ? 'bg-white shadow-sm' : 'bg-transparent text-muted'}`}><ListIcon size={16} /> Tablo</Button>
              <Button variant="light" size="sm" onClick={() => updateConfig({ stockViewLayout: 'special' })} className={`rounded-pill px-3 py-1 fw-medium border-0 ${config.stockViewLayout === 'special' ? 'bg-white shadow-sm' : 'bg-transparent text-muted'}`}><TableIcon size={16} /> Özel</Button>
            </div>
          </div>
        </div>

        {config.stockViewLayout === 'special' ? (
          <div className="bg-white border rounded-4 mb-5 shadow-sm overflow-hidden">
            <Table responsive hover className="mb-0 align-middle" style={{ fontSize: '11px', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead className="bg-white text-uppercase x-small fw-bold sticky-top" style={{ top: 0, zIndex: 10 }}>
                <tr className="sticky-top" style={{ top: 0 }}>
                  <th className="px-2 py-3 sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>T%</th>
                  <th className="sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>G%</th>
                  <th className="sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>G. KAZANÇ</th>
                  <th className="sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>YATIRILAN PARA</th>
                  <th className="sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>NET KAZANÇ</th>
                  <th className="sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>BANKA</th>
                  <th className="sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>GİRİŞ KURU</th>
                  <th className="sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>MEVCUT FİYAT</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const activeLots = processedTransactions
                    .filter(t => isAlis(t) && (t.calculatedRemaining || 0) > 0)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                  
                  const groups = {};
                  activeLots.forEach(lot => {
                    const gId = lot.institutionId || 'UNKNOWN';
                    if (!groups[gId]) groups[gId] = [];
                    groups[gId].push(lot);
                  });

                  const sortedInstIds = Object.keys(groups).sort((a, b) => {
                    const nameA = getInstitutionInfo(a).name || '';
                    const nameB = getInstitutionInfo(b).name || '';
                    return (nameA || '').localeCompare(nameB || '');
                  });

                  const parsePrice = (val) => {
                    if (!val) return 0;
                    if (typeof val === 'number') return val;
                    const str = val.toString().trim();
                    if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
                    return parseFloat(str) || 0;
                  };

                  let totalInvested = 0;
                  let totalDailyProfit = 0;
                  let totalNetProfit = 0;
                  let totalTaxDeduction = 0;

                  activeLots.forEach(lot => {
                    const stock = getStockInfo(lot.stockId);
                    const currentPrice = parsePrice(stock.currentPrice);
                    const previousPrice = parsePrice(stock.previousPrice);
                    const lotPrice = parsePrice(lot.price);
                    const qty = lot.calculatedRemaining;
                    
                    const invested = qty * lotPrice;
                    const grossProfit = qty * (currentPrice - lotPrice);
                    const taxRate = parseFloat(lot.taxRate) || 0;
                    const taxDeduction = grossProfit > 0 ? (grossProfit * taxRate / 100) : 0;
                    const netProfit = grossProfit - taxDeduction;
                    
                    const dailyChangePrice = currentPrice - previousPrice;
                    const dailyProfit = qty * dailyChangePrice;

                    totalInvested += invested;
                    totalDailyProfit += dailyProfit;
                    totalNetProfit += netProfit;
                    totalTaxDeduction += taxDeduction;
                  });

                  const finalRows = [];
                  sortedInstIds.forEach((instId, gIdx) => {
                    // Sort within institution group: first by stock name, then by date
                    const sortedLots = [...groups[instId]].sort((a, b) => {
                      const stockA = getStockInfo(a.stockId).name || '';
                      const stockB = getStockInfo(b.stockId).name || '';
                      if (stockA !== stockB) return (stockA || '').localeCompare(stockB || '');
                      return new Date(a.date) - new Date(b.date);
                    });
                    
                    sortedLots.forEach(lot => finalRows.push({ type: 'lot', data: lot }));
                    finalRows.push({ type: 'groupTotal', lots: sortedLots });
                    if (gIdx < sortedInstIds.length - 1) finalRows.push({ type: 'spacer' });
                  });

                  return finalRows.map((row, idx) => {
                    if (row.type === 'spacer') return <tr key={`spacer-${idx}`} style={{ height: '24px' }}><td colSpan="12" className="bg-light bg-opacity-25 border-0"></td></tr>;
                    
                    if (row.type === 'groupTotal') {
                      let gInvested = 0, gDailyProfit = 0, gNetProfit = 0, gTaxDeduction = 0, gTotalDays = 0, gTotalQty = 0;
                      let gTotalTPerc = 0, gTotalGPerc = 0;
                      
                      row.lots.forEach(lot => {
                        const s = getStockInfo(lot.stockId);
                        const cP = parsePrice(s.currentPrice);
                        const pP = parsePrice(s.previousPrice);
                        const lP = parsePrice(lot.price);
                        const q = lot.calculatedRemaining;
                        const inv = q * lP;
                        const gP = q * (cP - lP);
                        const tR = parseFloat(lot.taxRate) || 0;
                        const tD = gP > 0 ? (gP * tR / 100) : 0;
                        const nP = gP - tD;
                        const dCP = cP - pP;
                        const dP = q * dCP;
                        const days = Math.floor((new Date() - new Date(lot.date)) / (1000 * 60 * 60 * 24));
                        
                        const tPP = inv > 0 ? (nP / inv) * 100 : 0;
                        const dCPerc = parsePrice(s.dailyChange);
                        
                        gTotalDays += days;
                        gTotalQty += q;
                        gInvested += inv; gDailyProfit += dP; gNetProfit += nP; gTaxDeduction += tD;
                        gTotalTPerc += tPP;
                        gTotalGPerc += dCPerc;
                      });
                      
                      const gAvgDays = row.lots.length > 0 ? Math.round(gTotalDays / row.lots.length) : 0;
                      const gAvgTPerc = row.lots.length > 0 ? (gTotalTPerc / row.lots.length) : 0;
                      const gAvgGPerc = row.lots.length > 0 ? (gTotalGPerc / row.lots.length) : 0;
                      
                      return (
                        <tr key={`group-total-${idx}`} className="bg-light bg-opacity-75 fw-bold border-bottom">
                          <td className={`px-2 py-2 text-center x-small ${gAvgTPerc >= 0 ? 'text-success' : 'text-danger'}`}>
                            {gAvgTPerc.toFixed(2)}%
                          </td>
                          <td className={`px-2 py-2 text-center x-small ${gAvgGPerc >= 0 ? 'text-success' : 'text-danger'}`}>
                            {gAvgGPerc.toFixed(2)}%
                          </td>
                          <td className={`${gDailyProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                            <div className="text-muted x-small opacity-50" style={{ fontSize: '9px', fontWeight: 400 }}>G. KAZANÇ</div>
                            {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(gDailyProfit)}₺
                          </td>
                          <td className="text-dark">
                            <div className="text-muted x-small opacity-50" style={{ fontSize: '9px', fontWeight: 400 }}>YATIRILAN</div>
                            {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(gInvested)}₺
                          </td>
                          <td className={`${gNetProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                            <div className="text-muted x-small opacity-50" style={{ fontSize: '9px', fontWeight: 400 }}>NET KAZANÇ</div>
                            <div>{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(gNetProfit)}₺</div>
                            {gTaxDeduction > 0 && (
                              <div className="text-danger x-small opacity-75" style={{ fontSize: '9px', fontWeight: 500 }}>
                                Stopaj: -{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(gTaxDeduction)}₺
                              </div>
                            )}
                          </td>
                          <td colSpan="3"></td>
                          <td className="text-dark opacity-75">{gAvgDays} <span className="x-small fw-normal">ort.</span></td>
                          <td className="text-dark fw-bold">{new Intl.NumberFormat('tr-TR').format(gTotalQty)}</td>
                          <td colSpan="2"></td>
                        </tr>
                      );
                    }
                    
                    const lot = row.data;
                    const stock = getStockInfo(lot.stockId);
                    const inst = getInstitutionInfo(lot.institutionId);
                    
                    const currentPrice = parsePrice(stock.currentPrice);
                    const previousPrice = parsePrice(stock.previousPrice);
                    const dailyChange = parsePrice(stock.dailyChange);
                    const dailyChangePrice = currentPrice - previousPrice;
                    
                    const lotPrice = parsePrice(lot.price);
                    const invested = lot.calculatedRemaining * lotPrice;
                    const grossProfit = lot.calculatedRemaining * (currentPrice - lotPrice);
                    const taxRate = parseFloat(lot.taxRate) || 0;
                    const taxDeduction = grossProfit > 0 ? (grossProfit * taxRate / 100) : 0;
                    const netProfit = grossProfit - taxDeduction;
                    
                    const totalProfitPerc = invested > 0 ? (netProfit / invested) * 100 : 0;
                    const dailyProfit = lot.calculatedRemaining * dailyChangePrice;
                    const days = Math.floor((new Date() - new Date(lot.date)) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <tr key={`lot-${idx}`} className="border-bottom border-light">
                        <td className={`px-2 py-2 fw-bold ${netProfit >= 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                          {totalProfitPerc.toFixed(2)}%
                        </td>
                        <td className={`fw-bold ${dailyChange >= 0 ? 'bg-success bg-opacity-25 text-success' : 'bg-danger bg-opacity-25 text-danger'}`} style={{ width: '60px' }}>
                          {dailyChange.toFixed(2)}%
                        </td>
                        <td className={`fw-bold ${dailyProfit >= 0 ? 'bg-success bg-opacity-25 text-success' : 'bg-danger bg-opacity-25 text-danger'}`}>
                          {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(dailyProfit)}₺
                        </td>
                        <td className="fw-medium">{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(invested)}₺</td>
                        <td className={`fw-bold ${netProfit >= 0 ? 'bg-success bg-opacity-25 text-success' : 'bg-danger bg-opacity-25 text-danger'}`}>
                          <div>{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(netProfit)}₺</div>
                          {taxDeduction > 0 && (
                            <div className="text-danger x-small opacity-75" style={{ fontSize: '9px', fontWeight: 500 }}>
                              Stopaj: -{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(taxDeduction)}₺
                            </div>
                          )}
                        </td>
                        <td className="text-muted">{inst.name}</td>
                        <td className="fw-bold text-primary cursor-pointer hover-text-primary-dark" onClick={() => handleEditStock(stock)}>
                          <div>{stock.name}</div>
                          {(stock.updatedAt || stock.createdAt) && (
                            <div className="text-muted" style={{ fontSize: '9px', opacity: 0.6, fontWeight: 400 }}>
                              {formatDate(stock.updatedAt || stock.createdAt)}
                            </div>
                          )}
                        </td>
                        <td className="text-muted">{new Date(lot.date).toLocaleDateString('tr-TR')}</td>
                        <td className="fw-medium">{days}</td>
                        <td className="fw-bold">{new Intl.NumberFormat('tr-TR').format(lot.calculatedRemaining)}</td>
                        <td className="text-muted">{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(lotPrice)}₺</td>
                        <td className="fw-medium text-dark">
                          <div>{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(currentPrice)}₺</div>
                          {previousPrice > 0 && (
                            <div className="text-muted x-small opacity-50" style={{ fontSize: '9px' }}>
                              Eski: {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(previousPrice)}₺
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
              <tfoot className="bg-light fw-bold" style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                {(() => {
                  const activeLots = processedTransactions
                    .filter(t => t.type === 'ALIŞ' && (t.calculatedRemaining || 0) > 0);
                  
                  const parsePrice = (val) => {
                    if (!val) return 0;
                    if (typeof val === 'number') return val;
                    const str = val.toString().trim();
                    if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
                    return parseFloat(str) || 0;
                  };

                  let totalInvested = 0;
                  let totalDailyProfit = 0;
                  let totalNetProfit = 0;
                  let totalTaxDeduction = 0;
                  let totalDaysCount = 0;
                  let totalQty = 0;

                  activeLots.forEach(lot => {
                    const stock = getStockInfo(lot.stockId);
                    const currentPrice = parsePrice(stock.currentPrice);
                    const previousPrice = parsePrice(stock.previousPrice);
                    const lotPrice = parsePrice(lot.price);
                    const qty = lot.calculatedRemaining;
                    
                    const invested = qty * lotPrice;
                    const grossProfit = qty * (currentPrice - lotPrice);
                    const taxRate = parseFloat(lot.taxRate) || 0;
                    const taxDeduction = grossProfit > 0 ? (grossProfit * taxRate / 100) : 0;
                    const netProfit = grossProfit - taxDeduction;
                    
                    const dailyChangePrice = currentPrice - previousPrice;
                    const dailyProfit = qty * dailyChangePrice;

                    totalInvested += invested;
                    totalDailyProfit += dailyProfit;
                    totalNetProfit += netProfit;
                    totalTaxDeduction += taxDeduction;
                    totalDaysCount += Math.floor((new Date() - new Date(lot.date)) / (1000 * 60 * 60 * 24));
                    totalQty += qty;
                  });

                  const globalAvgDays = activeLots.length > 0 ? Math.round(totalDaysCount / activeLots.length) : 0;

                  return (
                    <tr>
                      <td colSpan="2" className="px-2 py-3 text-end text-muted small opacity-50">TOPLAM:</td>
                      <td className={`fw-bold ${totalDailyProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDailyProfit)}₺
                      </td>
                      <td className="fw-bold">
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalInvested)}₺
                      </td>
                      <td className={`fw-bold ${totalNetProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                        <div>{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalNetProfit)}₺</div>
                        {totalTaxDeduction > 0 && (
                          <div className="text-danger x-small opacity-75" style={{ fontSize: '9px', fontWeight: 500 }}>
                            Stopaj: -{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalTaxDeduction)}₺
                          </div>
                        )}
                      </td>
                      <td colSpan="3"></td>
                      <td className="text-dark">{globalAvgDays} <span className="x-small fw-normal">ort.</span></td>
                      <td className="text-dark fw-bold">{new Intl.NumberFormat('tr-TR').format(totalQty)}</td>
                      <td colSpan="2"></td>
                    </tr>
                  );
                })()}
              </tfoot>
            </Table>
          </div>
        ) : config.stockViewLayout === 'table' ? (
          <>
            <div className="bg-white border rounded-4 overflow-hidden mb-4 shadow-sm">
              <Table responsive hover className="mb-0 fs-14 align-middle">
                <thead className="bg-light bg-opacity-50">
                  <tr className="text-muted x-small fw-bold text-uppercase border-bottom">
                    <th className="px-4 py-3" style={{ whiteSpace: 'nowrap' }}>Hisse</th>
                    <th className="text-end" style={{ whiteSpace: 'nowrap' }}>Adet</th>
                    <th className="text-end" style={{ whiteSpace: 'nowrap' }}>Günlük Kazanç</th>
                    <th className="text-end" style={{ whiteSpace: 'nowrap' }}>Güncel Fiyat</th>
                    <th className="text-end" style={{ whiteSpace: 'nowrap' }}>Toplam Değer</th>
                    <th className="text-end" style={{ whiteSpace: 'nowrap' }}>Brüt Kazanç</th>
                    <th className="text-end" style={{ whiteSpace: 'nowrap' }}>Stopaj</th>
                    <th className="text-end" style={{ whiteSpace: 'nowrap' }}>Net Kazanç</th>
                    <th className="text-end px-4" style={{ whiteSpace: 'nowrap' }}>Süre</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPortfolio.map(item => (
                    <tr key={item.id} className="border-bottom border-light">
                      <td className="px-4 py-3">
                        <div className="d-flex align-items-center gap-2">
                          <TrendingUp size={14} className="text-primary opacity-50" />
                          <div>
                            <span className="fw-bold text-primary cursor-pointer hover-text-primary-dark" onClick={() => handleEditStock(item)}>{item.name}</span>
                            {(item.updatedAt || item.createdAt) && (
                              <div className="text-muted" style={{ fontSize: '9px', opacity: 0.6, fontWeight: 400 }}>
                                {formatDate(item.updatedAt || item.createdAt)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-end">
                        <div className="fw-medium">{new Intl.NumberFormat('tr-TR').format(item.quantity)} Lot</div>
                        <div className="d-flex flex-column align-items-end mt-1">
                          {Object.entries(item.institutionBreakdown).map(([instId, qty]) => (
                            <div key={instId} className="text-muted x-small opacity-50" style={{ fontSize: '10px' }}>
                              {getInstitutionInfo(instId).name}: {new Intl.NumberFormat('tr-TR').format(qty)}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="text-end">
                        <div className={`fw-bold ${item.dailyGain >= 0 ? 'text-success' : 'text-danger'}`}>
                          {item.dailyGain > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.dailyGain)}₺
                        </div>
                        <div className={`x-small opacity-75 ${item.dailyChangePerc >= 0 ? 'text-success' : 'text-danger'}`}>
                          (%{item.dailyChangePerc.toFixed(2)})
                        </div>
                      </td>
                      <td className="text-end text-muted">{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(item.currentPrice)} TL</td>
                      <td className="text-end fw-bold">{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(item.quantity * item.currentPrice)} TL</td>
                      <td className="text-end">
                        <div className={`fw-bold ${item.totalGrossProfit > 0 ? 'text-success' : item.totalGrossProfit < 0 ? 'text-danger' : 'text-muted'}`}>
                          {item.totalGrossProfit > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(item.totalGrossProfit)} TL
                        </div>
                        <div className="x-small text-muted opacity-50">(%{(item.totalCost > 0 ? (item.totalGrossProfit / item.totalCost * 100) : 0).toFixed(2)})</div>
                      </td>
                      <td className="text-end">
                        <div className="fw-bold text-danger">-{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(item.totalTaxDeduction)} TL</div>
                        <div className="x-small text-muted opacity-50">(%{(item.totalCost > 0 ? (item.totalTaxDeduction / item.totalCost * 100) : 0).toFixed(2)})</div>
                      </td>
                      <td className="text-end">
                        <div className={`fw-bold ${item.totalProfit > 0 ? 'text-success' : item.totalProfit < 0 ? 'text-danger' : 'text-muted'}`}>
                          {item.totalProfit > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(item.totalProfit)} TL
                        </div>
                        <div className="x-small text-muted opacity-50">(%{item.profitPercentage.toFixed(2)})</div>
                      </td>
                      <td className="text-end px-4 text-muted small">{item.holdingDurationDays || 0} gün</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Row className="g-3 mb-5">
              <Col md={4}>
                <SimulationCalculatorCard currentPortfolio={currentPortfolio} stocks={stocks} transactions={transactions} simStockId={simStockId} setSimStockId={setSimStockId} simQuantity={simQuantity} setSimQuantity={setSimQuantity} simPrice={simPrice} setSimPrice={setSimPrice} />
              </Col>
            </Row>
          </>
        ) : (
          <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'nowrap', minWidth: 'max-content' }} className="mb-5 pb-2">
              {currentPortfolio.map(item => (
                <div key={item.id} style={{ width: '240px', flexShrink: 0 }}>
                  <Card className="bg-white border shadow-sm p-3 h-100" style={{ borderRadius: '12px' }}>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px' }}>
                          <TrendingUp size={14} className="text-primary" />
                        </div>
                        <div className="d-flex flex-column">
                          <span className="fw-bold fs-16 text-primary cursor-pointer hover-text-primary-dark" onClick={() => handleEditStock(item)}>{item.name}</span>
                          {(item.updatedAt || item.createdAt) && (
                            <div className="text-muted" style={{ fontSize: '9px', opacity: 0.6, fontWeight: 400 }}>
                              {formatDate(item.updatedAt || item.createdAt)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="d-flex flex-column align-items-end">
                        <Badge bg="light" text="dark" className="rounded-pill px-2 py-1 x-small fw-bold border">
                          {new Intl.NumberFormat('tr-TR').format(item.quantity)} Lot
                        </Badge>
                        <div className="mt-1">
                          {Object.entries(item.institutionBreakdown).map(([instId, qty]) => (
                            <div key={instId} className="text-muted text-end" style={{ fontSize: '9px', fontWeight: 600, opacity: 0.6 }}>
                              {getInstitutionInfo(instId).name}: {new Intl.NumberFormat('tr-TR').format(qty)}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 d-flex justify-content-between align-items-end">
                      <div>
                        <div className="text-muted x-small fw-bold opacity-50 text-uppercase mb-1">Günlük Kazanç</div>
                        <div className={`fw-bold fs-15 ${item.dailyGain >= 0 ? 'text-success' : 'text-danger'}`}>
                          {item.dailyGain > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.dailyGain)}₺
                        </div>
                        <div className={`x-small fw-bold opacity-75 ${item.dailyChangePerc >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '10px' }}>
                          (%{item.dailyChangePerc.toFixed(2)})
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="text-muted x-small fw-bold opacity-50 text-uppercase mb-1 text-end">Süre</div>
                        <div className="fw-bold fs-14 text-muted opacity-75 text-end">
                          {item.holdingDurationDays || 0} gün <br />
                          (%{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.profitPercentage || 0)})
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-top border-light border-opacity-10">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="text-muted x-small fw-bold opacity-50 text-uppercase">Toplam Değer</div>
                        <div className="fw-medium fs-14 text-muted">
                          {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.quantity * item.currentPrice)} TL
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="text-muted x-small fw-bold opacity-50 text-uppercase">Brüt Kazanç</div>
                        <div className="text-end">
                          <div className={`fw-bold fs-14 ${item.totalGrossProfit > 0 ? 'text-success' : item.totalGrossProfit < 0 ? 'text-danger' : 'text-muted'}`}>
                            {item.totalGrossProfit > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.totalGrossProfit)} TL
                          </div>
                          <div className="x-small text-muted opacity-75">
                            (%{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.totalCost > 0 ? (item.totalGrossProfit / item.totalCost * 100) : 0)})
                          </div>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="text-muted x-small fw-bold opacity-50 text-uppercase">Stopaj Kesintisi</div>
                        <div className="text-end">
                          <div className="fw-bold fs-14 text-danger">
                            -{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.totalTaxDeduction)} TL
                          </div>
                          <div className="x-small text-muted opacity-75">
                            (%{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.totalCost > 0 ? (item.totalTaxDeduction / item.totalCost * 100) : 0)})
                          </div>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="text-muted x-small fw-bold opacity-50 text-uppercase">Net Kazanç</div>
                        <div className="text-end">
                          <div className={`fw-bold fs-14 ${item.totalProfit > 0 ? 'text-success' : item.totalProfit < 0 ? 'text-danger' : 'text-muted'}`}>
                            {item.totalProfit > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.totalProfit)} TL
                          </div>
                          <div className="x-small text-muted opacity-75">
                            (%{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.profitPercentage || 0)})
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
              <div style={{ width: '240px', flexShrink: 0 }}>
                <SimulationCalculatorCard currentPortfolio={currentPortfolio} stocks={stocks} transactions={transactions} simStockId={simStockId} setSimStockId={setSimStockId} simQuantity={simQuantity} setSimQuantity={setSimQuantity} simPrice={simPrice} setSimPrice={setSimPrice} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3" style={{ position: 'relative', zIndex: 100 }}>
        <h1 className="fw-bold m-0 text-nowrap flex-shrink-0">Finans İşlemleri</h1>
        <div className="d-flex align-items-center gap-3 w-100 w-md-auto ms-md-auto justify-content-end" style={{ overflow: 'visible !important' }}>
          <div className="d-flex align-items-center gap-3 text-muted">
            <Dropdown align="end" className="d-inline" autoClose="outside" onToggle={(isOpen) => !isOpen && setSettingsView('main')}>
              <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret cursor-pointer hover-text-primary transition-all">
                <SlidersHorizontal size={20} />
              </Dropdown.Toggle>
              <Dropdown.Menu rootCloseEvent="mousedown" popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'computeStyles', options: { adaptive: false } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '300px', zIndex: 10005 }}>
                <div className="d-flex flex-column gap-1">
                  <div className="px-3 py-2 mb-1 small fw-bold text-muted opacity-50 fs-10">TABLO AYARLARI</div>

                  {/* Property Visibility Section */}
                  <div className="px-1">
                    <div 
                      className="rounded-2 d-flex align-items-center justify-content-between py-2 small cursor-pointer hover-bg-light px-2 transition-all"
                      onClick={(e) => { e.stopPropagation(); setShowVisibilitySubmenu(!showVisibilitySubmenu); }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '28px', height: '28px' }}><Eye size={16} className="text-muted" /></div>
                        <span>Sütun Görünürlüğü</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 text-muted">
                        <span className="bg-light px-2 rounded-pill fs-11 opacity-50">{Object.values(config.propertyVisibility || {}).filter(v => v !== false).length}</span>
                        <ChevronDown size={14} className={`transition-all ${showVisibilitySubmenu ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    <Collapse in={showVisibilitySubmenu}>
                      <div className="mt-2 border-start ms-3 ps-2 py-2 d-flex flex-column gap-2 overflow-auto" style={{ maxHeight: '350px' }}>
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fs-11 fw-bold text-muted opacity-50">SÜTUNLAR</span>
                          <div className="d-flex gap-2">
                            <span className="fs-10 text-primary cursor-pointer fw-bold hover-underline" onClick={(e) => { e.stopPropagation(); toggleAllProperties(true); }}>Tümünü Aç</span>
                            <span className="fs-10 text-primary cursor-pointer fw-bold hover-underline" onClick={(e) => { e.stopPropagation(); toggleAllProperties(false); }}>Kapat</span>
                          </div>
                        </div>
                        {(() => {
                          const currentOrder = Array.isArray(config.propertyOrder) ? config.propertyOrder : PROPERTIES.map(p => p.id);
                          const allIds = PROPERTIES.map(p => p.id);
                          const finalOrder = [...currentOrder];
                          allIds.forEach(id => { if (!finalOrder.includes(id)) finalOrder.push(id); });

                          return (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => { const { active, over } = e; if (active && over && active.id !== over.id) { handleUpdatePropertyOrder(finalOrder.indexOf(active.id), finalOrder.indexOf(over.id)); } }}>
                              <SortableContext items={finalOrder} strategy={verticalListSortingStrategy}>
                                <div className="d-flex flex-column gap-1">
                                  {finalOrder.map(id => {
                                    const prop = PROPERTIES.find(p => p.id === id);
                                    if (!prop) return null;
                                    return <SortablePropertyItem key={id} prop={prop} icon={getPropertyIcon(id, config)} isVisible={config.propertyVisibility?.[id] !== false} toggleVisibility={handleUpdatePropertyVisibility} />;
                                  })}
                                </div>
                              </SortableContext>
                            </DndContext>
                          );
                        })()}
                      </div>
                    </Collapse>
                  </div>

                  <div className="dropdown-divider mx-2 opacity-10"></div>

                  <div className="px-3 py-2 mb-1 small fw-bold text-muted opacity-50 fs-10">İŞLEM SEÇENEKLERİ</div>
                  <Dropdown.Item onClick={() => updateConfig({ propertyLabels: {} })} className="rounded-2 d-flex align-items-center gap-2 py-2 small">
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '28px', height: '28px' }}><RotateCcw size={16} className="text-muted" /></div> 
                    <span>Başlıkları Sıfırla</span>
                  </Dropdown.Item>
                </div>
              </Dropdown.Menu>
            </Dropdown>
          </div>
          <Button variant="light" size="sm" onClick={() => setShowImportModal(true)} className="d-flex align-items-center gap-2 rounded-pill px-3 shadow-sm border glass-card"><Upload size={14} /> Import</Button>
          <Button variant="light" size="sm" onClick={() => setShowExportModal(true)} className="d-flex align-items-center gap-2 rounded-pill px-3 shadow-sm border glass-card"><Download size={14} /> Export</Button>
          <div className="d-flex align-items-center shadow-sm rounded-pill overflow-hidden" style={{ background: '#0d6efd' }}><Button variant="primary" size="sm" onClick={handleQuickNewTransaction} className="border-0 px-3 h-100 rounded-0 border-end">New</Button><Button variant="primary" size="sm" onClick={() => setShowTransactionModal(true)} className="border-0 px-2 h-100 rounded-0 d-flex align-items-center"><ChevronDown size={14} /></Button></div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="position-sticky top-0 mb-3" style={{ zIndex: 1000, marginTop: '-10px' }}>
          <Card className="glass-card border-0 shadow-lg p-1 d-flex flex-row align-items-center gap-1 rounded-pill w-fit-content" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', overflow: 'visible' }}>
            <div className="px-3 border-end text-primary fw-bold fs-14 d-flex align-items-center gap-2">
              {selectedIds.length} seçili
              <div className="hover-bg-secondary rounded p-0 d-flex align-items-center justify-content-center opacity-50 hover-opacity-100 transition-all cursor-pointer" style={{ width: '16px', height: '16px' }} onClick={() => setSelectedIds([])}><X size={12} /></div>
            </div>

            <div className="d-flex align-items-center gap-1 px-1 mobile-scroll-x">
              {/* Date Update */}
              <Dropdown autoClose="outside" className="d-inline">
                <Dropdown.Toggle as="div" className={`text-dark text-decoration-none py-1 px-2 hover-bg-light rounded-pill d-flex flex-column align-items-center justify-content-center cursor-pointer dropdown-no-caret ${stagedChanges.date ? 'text-primary' : ' '}`} style={{ minWidth: '80px' }}>
                  <div className="d-flex align-items-center gap-1 opacity-50 w-100 justify-content-center x-small fw-bold">
                    <Calendar size={10} /> TARİH
                    {stagedChanges.date && <X size={10} className="ms-1 text-danger" onClick={(e) => { e.stopPropagation(); setStagedChanges(prev => { const n = { ...prev }; delete n.date; return n; }); }} />}
                  </div>
                  {stagedChanges.date && <div className="fw-bold x-small mt-0.5">{stagedChanges.date}</div>}
                </Dropdown.Toggle>
                <Dropdown.Menu rootCloseEvent="mousedown" className="glass-card border-0 shadow-lg p-2" style={{ zIndex: 10005 }}>
                  <Form.Control type="date" size="sm" value={stagedChanges.date || ''} onChange={e => setStagedChanges(prev => ({ ...prev, date: e.target.value }))} />
                </Dropdown.Menu>
              </Dropdown>

              {/* Institution Update */}
              <Dropdown autoClose="outside" className="d-inline">
                <Dropdown.Toggle as="div" className={`text-dark text-decoration-none py-1 px-2 hover-bg-light rounded-pill d-flex flex-column align-items-center justify-content-center cursor-pointer dropdown-no-caret ${stagedChanges.institutionId ? 'text-primary' : ' '}`} style={{ minWidth: '100px' }}>
                  <div className="d-flex align-items-center gap-1 opacity-50 w-100 justify-content-center x-small fw-bold">
                    <Landmark size={10} /> KURUM
                    {stagedChanges.institutionId && <X size={10} className="ms-1 text-danger" onClick={(e) => { e.stopPropagation(); setStagedChanges(prev => { const n = { ...prev }; delete n.institutionId; return n; }); }} />}
                  </div>
                  {stagedChanges.institutionId && <div className="fw-bold x-small mt-0.5 text-truncate" style={{ maxWidth: '80px' }}>{getInstitutionInfo(stagedChanges.institutionId).name}</div>}
                </Dropdown.Toggle>
                <Dropdown.Menu rootCloseEvent="mousedown" className="glass-card border-0 shadow-lg p-1" style={{ minWidth: '180px', maxHeight: '300px', overflowY: 'auto', zIndex: 10005 }}>
                  {institutions.map(i => <Dropdown.Item key={i.id} onClick={() => setStagedChanges(prev => ({ ...prev, institutionId: i.id }))} className="small rounded-2">{i.name}</Dropdown.Item>)}
                </Dropdown.Menu>
              </Dropdown>

              {/* Stock Update */}
              <Dropdown autoClose="outside" className="d-inline">
                <Dropdown.Toggle as="div" className={`text-dark text-decoration-none py-1 px-2 hover-bg-light rounded-pill d-flex flex-column align-items-center justify-content-center cursor-pointer dropdown-no-caret ${stagedChanges.stockId ? 'text-primary' : ' '}`} style={{ minWidth: '100px' }}>
                  <div className="d-flex align-items-center gap-1 opacity-50 w-100 justify-content-center x-small fw-bold">
                    <TrendingUp size={10} /> HİSSE
                    {stagedChanges.stockId && <X size={10} className="ms-1 text-danger" onClick={(e) => { e.stopPropagation(); setStagedChanges(prev => { const n = { ...prev }; delete n.stockId; return n; }); }} />}
                  </div>
                  {stagedChanges.stockId && <div className="fw-bold x-small mt-0.5 text-truncate" style={{ maxWidth: '80px' }}>{getStockInfo(stagedChanges.stockId).name}</div>}
                </Dropdown.Toggle>
                <Dropdown.Menu rootCloseEvent="mousedown" className="glass-card border-0 shadow-lg p-1" style={{ minWidth: '180px', maxHeight: '300px', overflowY: 'auto', zIndex: 10005 }}>
                  {stocks.map(s => <Dropdown.Item key={s.id} onClick={() => setStagedChanges(prev => ({ ...prev, stockId: s.id }))} className="small rounded-2">{s.name}</Dropdown.Item>)}
                </Dropdown.Menu>
              </Dropdown>

              {/* Type Update */}
              <Dropdown autoClose="outside" className="d-inline">
                <Dropdown.Toggle as="div" className={`text-dark text-decoration-none py-1 px-2 hover-bg-light rounded-pill d-flex flex-column align-items-center justify-content-center cursor-pointer dropdown-no-caret ${stagedChanges.type ? 'text-primary' : ' '}`} style={{ minWidth: '80px' }}>
                  <div className="d-flex align-items-center gap-1 opacity-50 w-100 justify-content-center x-small fw-bold">
                    <Tag size={10} /> TÜR
                    {stagedChanges.type && <X size={10} className="ms-1 text-danger" onClick={(e) => { e.stopPropagation(); setStagedChanges(prev => { const n = { ...prev }; delete n.type; return n; }); }} />}
                  </div>
                  {stagedChanges.type && <div className="fw-bold x-small mt-0.5">{stagedChanges.type}</div>}
                </Dropdown.Toggle>
                <Dropdown.Menu rootCloseEvent="mousedown" className="glass-card border-0 shadow-lg p-1" style={{ zIndex: 10005 }}>
                  {['ALIŞ', 'SATIŞ'].map(t => <Dropdown.Item key={t} onClick={() => setStagedChanges(prev => ({ ...prev, type: t }))} className="small rounded-2">{t}</Dropdown.Item>)}
                </Dropdown.Menu>
              </Dropdown>

              {/* Tax Rate Update */}
              <Dropdown autoClose="outside" className="d-inline">
                <Dropdown.Toggle as="div" className={`text-dark text-decoration-none py-1 px-2 hover-bg-light rounded-pill d-flex flex-column align-items-center justify-content-center cursor-pointer dropdown-no-caret ${stagedChanges.taxRate !== undefined ? 'text-primary' : ' '}`} style={{ minWidth: '80px' }}>
                  <div className="d-flex align-items-center gap-1 opacity-50 w-100 justify-content-center x-small fw-bold">
                    <Percent size={10} /> STOPAJ
                    {stagedChanges.taxRate !== undefined && <X size={10} className="ms-1 text-danger" onClick={(e) => { e.stopPropagation(); setStagedChanges(prev => { const n = { ...prev }; delete n.taxRate; return n; }); }} />}
                  </div>
                  {stagedChanges.taxRate !== undefined && <div className="fw-bold x-small mt-0.5">%{stagedChanges.taxRate}</div>}
                </Dropdown.Toggle>
                <Dropdown.Menu rootCloseEvent="mousedown" className="glass-card border-0 shadow-lg p-2" style={{ minWidth: '100px', zIndex: 10005 }}>
                  <Form.Control type="text" size="sm" placeholder="Oran (%)" value={stagedChanges.taxRate ?? ''} onChange={e => setStagedChanges(prev => ({ ...prev, taxRate: e.target.value.replace(/[^0-9,]/g, '') }))} onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }} />
                </Dropdown.Menu>
              </Dropdown>
            </div>

            <div className="d-flex align-items-center gap-1 ps-2 border-start">
              {Object.keys(stagedChanges).length > 0 && (
                <Button variant="primary" size="sm" className="rounded-pill px-3 fw-bold shadow-sm border-0 position-relative overflow-hidden" disabled={isBulkProcessing} onClick={handleBulkSave} style={{ minWidth: '80px', height: '32px', background: 'linear-gradient(135deg, #006fee 0%, #005bc4 100%)', fontSize: '13px' }}>
                  <div className="position-absolute top-0 start-0 h-100 transition-all" style={{ width: `${bulkProgress}%`, backgroundColor: 'rgba(255,255,255,0.3)', zIndex: 0 }} />
                  <span className="position-relative" style={{ zIndex: 1 }}>{isBulkProcessing ? `%${bulkProgress}` : 'Kaydet'}</span>
                </Button>
              )}
              <Button variant="link" className="text-danger p-2 hover-bg-light rounded-pill" onClick={handleBulkDelete} disabled={isBulkProcessing}><Trash2 size={16} /></Button>

              <Dropdown align="end">
                <Dropdown.Toggle as="div" className="text-muted p-2 hover-bg-light rounded-pill cursor-pointer d-inline-block"><RotateCcw size={16} /></Dropdown.Toggle>
                <Dropdown.Menu rootCloseEvent="mousedown" className="glass-card border-0 shadow-lg p-2" style={{ minWidth: '320px', maxHeight: '400px', overflowY: 'auto', zIndex: 10005 }}>
                  <div className="d-flex align-items-center justify-content-between px-2 border-bottom pb-2 mb-2">
                    <span className="x-small fw-bold text-muted">İŞLEM GEÇMİŞİ</span>
                    {bulkHistory.length > 0 && <span className="x-small text-danger fw-bold cursor-pointer" onClick={handleClearBulkHistory}>TEMİZLE</span>}
                  </div>
                  {bulkHistory.length === 0 && <div className="text-center py-3 text-muted small">Geçmiş bulunamadı</div>}
                  {bulkHistory.map(item => (
                    <div key={item.id} className="p-2 border-bottom last-border-0 hover-bg-light rounded-2 d-flex align-items-center justify-content-between mb-1">
                      <div className="d-flex flex-column">
                        <div className="d-flex align-items-center gap-2"><Badge bg="light" text="dark" style={{ fontSize: '10px' }}>{item.count} İşlem</Badge><span className="text-muted" style={{ fontSize: '10px' }}>{item.timestamp?.toDate().toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
                        <div className="small fw-bold mt-1">{item.type === 'DELETE' ? '🗑️ Silme' : '✏️ Güncelleme'}</div>
                      </div>
                      <div className="d-flex gap-1"><Button variant="primary" size="sm" className="px-2 py-0.5 rounded-pill" style={{ fontSize: '10px' }} onClick={() => handleUndoBulkAction(item)}>Geri Al</Button><Button variant="outline-danger" size="sm" className="px-1 py-0.5 rounded-pill" onClick={() => handleDeleteBulkHistory(item.id)}><X size={12} /></Button></div>
                    </div>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </Card>
        </div>
      )}

      <Card className="bg-white border shadow-sm rounded-3" style={{ overflow: 'visible', zIndex: 15 }}>
        <Table responsive hover className="notion-table mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead className="sticky-top bg-white" style={{ zIndex: 5, top: 0 }}>
            {config.filters?.length > 0 && (
              <tr className="bg-light" style={{ position: 'relative', zIndex: 10 }}>
                <th colSpan={100} className="py-2 px-3 border-bottom font-normal">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <div className="text-muted x-small fw-bold d-flex align-items-center gap-1 opacity-50 pe-2 border-end">
                      <Filter size={12} /> FİLTRELER
                    </div>
                    {config.filters.map(f => {
                      const p = PROPERTIES.find(item => item.id === f.propId);
                      const label = config.propertyLabels?.[f.propId] || p?.label;
                      return (
                        <div key={f.propId} className="glass-card border rounded-pill px-2 py-1 d-flex align-items-center gap-2 shadow-sm bg-white" style={{ fontSize: '11px', fontWeight: 400 }}>
                          <span className="text-muted">{label}</span>
                          <Dropdown autoClose="outside">
                            <Dropdown.Toggle as="span" className="fw-bold cursor-pointer hover-text-primary d-inline-block">
                              {f.operator.replace(/_/g, ' ')}
                            </Dropdown.Toggle>
                            <Dropdown.Menu rootCloseEvent="mousedown" className="glass-card border-0 shadow-lg p-1" style={{ zIndex: 10005 }}>
                              {['contains', 'does_not_contain', 'is_empty', 'is_not_empty'].map(op => <Dropdown.Item key={op} onClick={() => handleUpdateFilter(f.propId, op, f.value)} className="small rounded-2">{op.replace(/_/g, ' ')}</Dropdown.Item>)}
                            </Dropdown.Menu>
                          </Dropdown>
                          {!['is_empty', 'is_not_empty'].includes(f.operator) && (
                            <div className="d-inline-block ms-1">
                              {f.propId === 'institutionId' ? (
                                <Dropdown autoClose="outside">
                                  <Dropdown.Toggle as="span" className="fw-bold cursor-pointer hover-text-primary text-truncate d-inline-block" style={{ maxWidth: '100px' }}>
                                    {getInstitutionInfo(f.value).name || 'Seçiniz...'}
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu rootCloseEvent="mousedown" className="glass-card border-0 shadow-lg p-1" style={{ maxHeight: '300px', overflowY: 'auto', zIndex: 10005 }}>
                                    {institutions.map(i => <Dropdown.Item key={i.id} onClick={() => handleUpdateFilter(f.propId, f.operator, i.id)} className="small rounded-2">{i.name}</Dropdown.Item>)}
                                  </Dropdown.Menu>
                                </Dropdown>
                              ) : f.propId === 'stockId' ? (
                                <Dropdown autoClose="outside">
                                  <Dropdown.Toggle as="span" className="fw-bold cursor-pointer hover-text-primary text-truncate d-inline-block" style={{ maxWidth: '100px' }}>
                                    {getStockInfo(f.value).name || 'Seçiniz...'}
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu rootCloseEvent="mousedown" className="glass-card border-0 shadow-lg p-1" style={{ maxHeight: '300px', overflowY: 'auto', zIndex: 10005 }}>
                                    {[...stocks].sort((a, b) => (stockRemainingQuantities[b.id] || 0) - (stockRemainingQuantities[a.id] || 0)).map(s => {
                                      const qty = stockRemainingQuantities[s.id] || 0;
                                      return (
                                        <Dropdown.Item key={s.id} onClick={() => handleUpdateFilter(f.propId, f.operator, s.id)} className="small rounded-2 d-flex justify-content-between align-items-center gap-4">
                                          <span>{s.name}</span>
                                          {qty > 0 && <Badge bg="primary" className="rounded-pill opacity-75" style={{ fontSize: '9px' }}>{new Intl.NumberFormat('tr-TR').format(qty)}</Badge>}
                                        </Dropdown.Item>
                                      );
                                    })}
                                  </Dropdown.Menu>
                                </Dropdown>
                              ) : f.propId === 'type' ? (
                                <Dropdown autoClose="outside">
                                  <Dropdown.Toggle as="span" className="fw-bold cursor-pointer hover-text-primary d-inline-block">
                                    {f.value || 'Seçiniz...'}
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu rootCloseEvent="mousedown" className="glass-card border-0 shadow-lg p-1" style={{ zIndex: 10005 }}>
                                    {['ALIŞ', 'SATIŞ'].map(type => (
                                      <Dropdown.Item 
                                        key={type} 
                                        onClick={() => handleUpdateFilter(f.propId, f.operator, type)} 
                                        className="small rounded-2 py-1"
                                      >
                                        <span style={getTagStyleByColor(type === 'ALIŞ' ? 'Green' : 'Red')}>
                                          {type === 'ALIŞ' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                                          {type}
                                        </span>
                                      </Dropdown.Item>
                                    ))}
                                  </Dropdown.Menu>
                                </Dropdown>
                              ) : (
                                <LocalTextInput size="sm" className="border-0 bg-transparent p-0 fw-bold" style={{ width: '80px', fontSize: '11px' }} value={f.value} onSave={val => handleUpdateFilter(f.propId, f.operator, val)} />
                              )}
                            </div>
                          )}
                          <X size={12} className="text-muted cursor-pointer hover-text-danger" onClick={() => handleUpdateFilter(f.propId, null, null)} />
                        </div>
                      );
                    })}
                    <Button variant="link" size="sm" className="text-muted p-0 x-small ms-auto text-decoration-none" onClick={() => updateConfig({ filters: [] })}>Tümünü temizle</Button>
                  </div>
                </th>
              </tr>
            )}
            <tr className="bg-white">
              <th className="ps-2"><Form.Check ref={selectAllRef} type="checkbox" checked={selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0} onChange={e => setSelectedIds(e.target.checked ? filteredTransactions.map(t => t.id) : [])} /></th>
              {propertyOrder.filter(id => config.propertyVisibility?.[id] !== false).map(id => {
                const p = PROPERTIES.find(item => item.id === id);
                const label = config.propertyLabels?.[id] || p.label;
                const isSorted = config.sortConfig?.propId === id;
                return (
                  <th key={id}>
                    <Dropdown autoClose="outside" onToggle={(isOpen) => { if (!isOpen) { setShowCalculateSubmenu(false); setShowDateFormatSubmenu(false); } }}>
                      <Dropdown.Toggle as="div" className="btn btn-link p-2 text-decoration-none border-0 d-flex align-items-center gap-2 cursor-pointer dropdown-no-caret hover-bg-light rounded flex-grow-1" style={{ marginLeft: '-8px' }}>
                        <span className="text-muted d-flex align-items-center">{getPropertyIcon(id, config)}</span>
                        <span className="text-nowrap fw-bold fs-13 text-dark">{label}</span>
                        <div className="ms-auto d-flex align-items-center gap-2">
                          <ChevronDown size={14} className="text-muted opacity-50" />
                        </div>
                      </Dropdown.Toggle>
                      <Dropdown.Menu rootCloseEvent="mousedown" popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '240px', zIndex: 10005 }}>
                        <div className="d-flex flex-column gap-1">
                          {/* Filter Section */}
                          <Dropdown.Item className="rounded-2 d-flex align-items-center gap-2 py-2 small" onClick={() => handleUpdateFilter(id, 'contains', '')}>
                            <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><ListFilter size={14} className="text-muted" /></div> 
                            <span>Filtrele</span>
                          </Dropdown.Item>
                          
                          <div className="dropdown-divider opacity-10 mx-1"></div>

                    {/* Hesapla Section */}
                    <div className="px-1 py-1">
                      <div 
                        className="dropdown-item rounded-2 d-flex align-items-center justify-content-between py-2 small cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setShowCalculateSubmenu(!showCalculateSubmenu); }}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <Sigma size={14} className="text-muted" />
                          <span>Hesapla</span>
                        </div>
                        <ChevronDown size={14} className={`text-muted transition-all ${showCalculateSubmenu ? 'rotate-180' : ''}`} />
                      </div>
                      <Collapse in={showCalculateSubmenu}>
                        <div className="px-1 py-1">
                          <div className="bg-light bg-opacity-50 rounded-3 p-1 d-flex flex-column gap-1">
                            {[
                              { label: 'Hiçbiri', value: 'none' },
                              { label: 'Tümünü Say', value: 'count_all' },
                              { label: 'Değerleri Say', value: 'count_values' },
                              { label: 'Benzersizleri Say', value: 'count_unique' },
                              { label: 'Boş Olanları Say', value: 'count_empty' },
                              { label: 'Dolu Olanları Say', value: 'count_not_empty' },
                              ...(['quantity', 'price', 'taxRate', 'totalBuyAmount', 'totalSaleAmount', 'grossProfit', 'totalProfit', 'taxDeduction', 'remainingQuantity', 'avgBuyPrice'].includes(id) ? [
                                { label: 'Toplam (Sum)', value: 'sum' },
                                { label: 'Ortalama (Avg)', value: 'avg' },
                                { label: 'En Küçük (Min)', value: 'min' },
                                { label: 'En Büyük (Max)', value: 'max' }
                              ] : [])
                            ].map(item => (
                              <div 
                                key={item.value}
                                className={`dropdown-item small rounded-2 py-1.5 d-flex align-items-center justify-content-between cursor-pointer ${(!config.columnCalculations?.[id] && item.value === 'none') || config.columnCalculations?.[id] === item.value ? 'bg-light text-primary fw-bold' : 'text-muted'}`}
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  updateConfig({ columnCalculations: { ...config.columnCalculations, [id]: item.value } }); 
                                }}
                              >
                                <span>{item.label}</span>
                                {((!config.columnCalculations?.[id] && item.value === 'none') || config.columnCalculations?.[id] === item.value) && <Check size={12} className="text-primary" />}
                              </div>
                            ))}
                          </div>
                        </div>
                      </Collapse>
                    </div>

                    <div className="dropdown-divider opacity-10 mx-1"></div>

                          {/* Rename Section */}
                          <Dropdown.Item className="rounded-2 d-flex align-items-center gap-2 py-2 small" onClick={() => { const newLabel = prompt('Yeni başlık ismi:', label); if (newLabel) updateConfig({ propertyLabels: { ...config.propertyLabels, [id]: newLabel } }); }}>
                            <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><Edit2 size={14} className="text-muted" /></div> 
                            <span>Yeniden Adlandır</span>
                          </Dropdown.Item>

                          <div className="dropdown-divider opacity-10 mx-1"></div>

                          <Dropdown.Item
                            className={`rounded-2 d-flex align-items-center gap-2 py-2 small ${isSorted && config.sortConfig.direction === 'asc' ? 'bg-light text-primary fw-bold' : ''}`}
                            onClick={() => handleSort(id, 'asc')}
                          >
                            <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><ArrowUp size={14} className="text-muted" /></div> 
                            <span>Artan Sırala</span>
                            {isSorted && config.sortConfig.direction === 'asc' && <Check size={12} className="ms-auto" />}
                          </Dropdown.Item>
                          <Dropdown.Item
                            className={`rounded-2 d-flex align-items-center gap-2 py-2 small ${isSorted && config.sortConfig.direction === 'desc' ? 'bg-light text-primary fw-bold' : ''}`}
                            onClick={() => handleSort(id, 'desc')}
                          >
                            <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><ArrowDown size={14} className="text-muted" /></div> 
                            <span>Azalan Sırala</span>
                            {isSorted && config.sortConfig.direction === 'desc' && <Check size={12} className="ms-auto" />}
                          </Dropdown.Item>

                          <div className="dropdown-divider opacity-10 mx-1"></div>

                          <Dropdown.Item
                            className="rounded-2 d-flex align-items-center gap-2 py-2 small"
                            onClick={() => updateConfig({ propertyWrap: { ...config.propertyWrap, [id]: !config.propertyWrap?.[id] } })}
                          >
                            <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><WrapText size={14} className="text-muted" /></div>
                            <span>Metni Kaydır</span>
                            {config.propertyWrap?.[id] !== false ? (
                              <Eye size={14} className="text-primary" />
                            ) : (
                              <EyeOff size={14} className="text-muted opacity-50" />
                            )}
                          </Dropdown.Item>
                          <Dropdown.Item
                            className="rounded-2 d-flex align-items-center gap-2 py-2 small"
                            onClick={() => updateConfig({ propertyVisibility: { ...config.propertyVisibility, [id]: false } })}
                          >
                            <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><EyeOff size={14} className="text-muted" /></div> 
                            <span>Gizle</span>
                          </Dropdown.Item>

                          {id === 'date' && (
                            <>
                              <div className="dropdown-divider opacity-10 mx-1"></div>
                              <div className="px-1 py-1">
                                <div 
                                  className="dropdown-item rounded-2 d-flex align-items-center justify-content-between py-2 small cursor-pointer"
                                  onClick={(e) => { e.stopPropagation(); setShowDateFormatSubmenu(!showDateFormatSubmenu); }}
                                >
                                  <div className="d-flex align-items-center gap-2">
                                    <Calendar size={14} className="text-muted" />
                                    <span>Tarih Formatı</span>
                                  </div>
                                  <ChevronDown size={14} className={`text-muted transition-all ${showDateFormatSubmenu ? 'rotate-180' : ''}`} />
                                </div>
                                <Collapse in={showDateFormatSubmenu}>
                                  <div className="px-1 py-1">
                                    <div className="bg-light bg-opacity-50 rounded-3 p-1 d-flex flex-column gap-1">
                                      {[
                                        { label: '01/12/2026', value: 'DD/MM/YYYY' },
                                        { label: '01.12.2026', value: 'DD.MM.YYYY' },
                                        { label: '01 Ocak 2026', value: 'DD MMMM YYYY' },
                                        { label: '01 Oca 2026', value: 'DD MMM YYYY' }
                                      ].map(fmt => (
                                        <div 
                                          key={fmt.value} 
                                          className={`dropdown-item small rounded-2 py-1.5 d-flex align-items-center justify-content-between cursor-pointer ${(config.dateFormat === fmt.value || (!config.dateFormat && fmt.value === 'DD/MM/YYYY')) ? 'bg-light text-primary fw-bold' : 'text-muted'}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateConfig({ ...config, dateFormat: fmt.value });
                                          }}
                                        >
                                          <span>{fmt.label}</span>
                                          {(config.dateFormat === fmt.value || (!config.dateFormat && fmt.value === 'DD/MM/YYYY')) && <Check size={12} className="text-primary" />}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </Collapse>
                              </div>
                            </>
                          )}
                        </div>
                      </Dropdown.Menu>
                    </Dropdown>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white">
            {visibleTransactions.map(t => (
              <TransactionRow 
                key={t.id} 
                t={t} 
                visibleProperties={visibleProperties} 
                selectedIds={selectedIds} 
                onSelect={handleSelect}
                renderCell={renderCell}
              />
            ))}
            {/* Sentinel for Infinite Scroll */}
            <tr ref={lastElementRef} style={{ height: '10px' }}>
              <td colSpan="100%" className="border-0"></td>
            </tr>
          </tbody>
          {Object.keys(config.columnCalculations || {}).some(k => config.columnCalculations[k] !== 'none') && (
            <tfoot className="border-top bg-light bg-opacity-10 position-sticky bottom-0" style={{ zIndex: 100, backgroundColor: '#fcfcfc' }}>
              <tr className="bg-white">
                <td style={{ width: '40px' }} className="bg-white border-bottom-0"></td>
                {visibleProperties.map(id => (
                  <td key={id} className="py-2 px-2 border-start border-light border-opacity-10 bg-white border-bottom-0">
                    {renderCalculatedValue(id, getCalculatedValue(id))}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </Table>
      </Card>

      {limitCount < filteredTransactions.length && (
        <div className="d-flex align-items-center gap-4 mt-2 mobile-scroll-x">
          <div className="d-flex align-items-center gap-2 py-2 px-3 hover-bg-light cursor-pointer text-muted small rounded-2"
            style={{ width: 'fit-content' }}
            onClick={() => setLimitCount(prev => prev + 100)}>
            <Plus size={14} className="opacity-50" />
            <span>Daha fazla göster</span>
          </div>

          <div className="d-flex align-items-center gap-2 text-muted x-small border-start ps-4">
            <span className="opacity-50 fw-bold">GÖRÜNÜM LİMİTİ:</span>
            {[10, 20, 50, 100, 500].map(v => (
              <span
                key={v}
                className={`cursor-pointer hover-text-primary px-2 py-1 rounded ${limitCount === v && !isInfiniteScroll ? 'bg-light-primary text-primary fw-bold' : ''}`}
                onClick={() => {
                  setIsInfiniteScroll(false);
                  setLimitCount(v);
                }}
              >
                {v}
              </span>
            ))}
            <span
              className={`cursor-pointer hover-text-primary px-2 py-1 rounded ${isInfiniteScroll ? 'bg-light-primary text-primary fw-bold' : ''}`}
              onClick={() => {
                setIsInfiniteScroll(true);
                setLimitCount(100);
              }}
            >
              Hepsini Gör ({filteredTransactions.length})
            </span>
          </div>
        </div>
      )}

      <FinanceCharts 
        currentPortfolio={currentPortfolio}
        institutions={institutions}
        institutionStats={institutionStats}
        getStockInfo={getStockInfo}
        getInstitutionInfo={getInstitutionInfo}
        parseNum={parseNum}
        processedTransactions={processedTransactions}
      />

      <Modal show={showTransactionModal} onHide={() => setShowTransactionModal(false)} size="lg" className="notion-modal">
        <Modal.Body className="p-5">
          <Form onSubmit={handleAddTransaction}>
            <h2 className="fw-bold mb-4">Yeni İşlem</h2>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="small fw-bold text-muted">Kurum</Form.Label>
                <Form.Select value={formInstitutionId} onChange={e => setFormInstitutionId(e.target.value)} required>
                  <option value="">Seçiniz...</option>
                  {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-bold text-muted">Hisse</Form.Label>
                <Form.Select 
                  value={formStockId} 
                  onChange={e => {
                    const stockId = e.target.value;
                    setFormStockId(stockId);
                    const stock = stocks.find(s => s.id === stockId);
                    if (stock && stock.currentPrice !== undefined && stock.currentPrice !== null && stock.currentPrice !== '') {
                      const priceStr = stock.currentPrice.toString().replace('.', ',');
                      setPrice(priceStr);
                    }
                  }} 
                  required
                >
                  <option value="">Seçiniz...</option>
                  {stocks.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label className="small fw-bold text-muted">Tür</Form.Label>
                <Form.Select value={type} onChange={e => setType(e.target.value)}>
                  <option value="ALIŞ">ALIŞ</option>
                  <option value="SATIŞ">SATIŞ</option>
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label className="small fw-bold text-muted">Adet</Form.Label>
                <Form.Control value={quantity} onChange={e => setQuantity(e.target.value.replace(/[^0-9,]/g, ''))} required />
              </Col>
              <Col md={4}>
                <Form.Label className="small fw-bold text-muted">Fiyat</Form.Label>
                <Form.Control value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9,]/g, ''))} required />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-bold text-muted">Tarih</Form.Label>
                <Form.Control type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </Col>
              <Col md={6}>
                <Form.Label className="small fw-bold text-muted">Stopaj (%)</Form.Label>
                <Form.Control value={taxRate} onChange={e => setTaxRate(e.target.value.replace(/[^0-9,]/g, ''))} />
              </Col>
            </Row>
            <Button variant="primary" type="submit" className="w-100 rounded-pill mt-4 py-2 fw-bold">Kaydet</Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={showInstitutionModal} onHide={() => setShowInstitutionModal(false)} centered className="glass-card">
        <Modal.Header closeButton className="border-0"><Modal.Title className="fw-bold">Kurum Ekle</Modal.Title></Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={(e) => { e.preventDefault(); addDoc(collection(db, `users/${user.uid}/institutions`), { name: newInstitutionName, logo: newInstitutionLogo, createdAt: serverTimestamp(), deleted: false, order: institutions.length }); setShowInstitutionModal(false); setNewInstitutionName(''); setNewInstitutionLogo(''); }}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold opacity-50">KURUM ADI</Form.Label>
              <Form.Control className="border-0 bg-light" value={newInstitutionName} onChange={e => setNewInstitutionName(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold opacity-50">LOGO</Form.Label>
              <div className="d-flex align-items-center gap-3">
                <div className="rounded p-2 shadow-sm border" style={{ width: '48px', height: '48px', backgroundColor: 'var(--card-bg)' }}>
                  {newInstitutionLogo ? <img src={newInstitutionLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Landmark size={24} className="text-muted" />}
                </div>
                <Form.Control className="border-0 bg-light" type="file" size="sm" accept="image/*" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setNewInstitutionLogo(reader.result);
                    reader.readAsDataURL(file);
                  }
                }} />
              </div>
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100 rounded-pill py-2 fw-bold">Ekle</Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered className="glass-card">
        <Modal.Header closeButton className="border-0"><Modal.Title className="fw-bold">Kurumu Düzenle</Modal.Title></Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={(e) => { e.preventDefault(); updateDoc(doc(db, `users/${user.uid}/institutions`, editingInstitution.id), { name: editInstitutionName, logo: editInstitutionLogo }); setShowEditModal(false); }}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold opacity-50">KURUM ADI</Form.Label>
              <Form.Control className="border-0 bg-light" value={editInstitutionName} onChange={e => setEditInstitutionName(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold opacity-50">LOGO</Form.Label>
              <div className="d-flex align-items-center gap-3">
                <div className="rounded p-2 shadow-sm border" style={{ width: '48px', height: '48px', backgroundColor: 'var(--card-bg)' }}>
                  {editInstitutionLogo ? <img src={editInstitutionLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Landmark size={24} className="text-muted" />}
                </div>
                <Form.Control className="border-0 bg-light" type="file" size="sm" accept="image/*" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setEditInstitutionLogo(reader.result);
                    reader.readAsDataURL(file);
                  }
                }} />
              </div>
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100 rounded-pill py-2 fw-bold">Güncelle</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Stock Edit Modal */}
      <Modal show={showEditStockModal} onHide={() => setShowEditStockModal(false)} centered className="glass-card">
        <Modal.Header closeButton className="border-0"><Modal.Title className="fw-bold">Hisse Düzenle</Modal.Title></Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={(e) => { e.preventDefault(); handleUpdateStock(); }}>
            {editingStock && (
              <div className="mb-4 p-3 rounded-3 bg-light bg-opacity-50 border border-light">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="x-small text-muted fw-bold">SON GÜNCELLEME:</span>
                  <span className="x-small fw-bold text-muted opacity-75">{editingStock.updatedAt ? formatDate(editingStock.updatedAt) : 'Hiç güncellenmedi'}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="x-small text-muted fw-bold">ÖNCEKİ FİYAT:</span>
                  <span className="x-small fw-bold">{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(parseNum(editingStock.currentPrice))} TL</span>
                </div>
              </div>
            )}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold opacity-50">HİSSE KODU</Form.Label>
              <Form.Control className="border-0 bg-light" value={editStockName} onChange={(e) => setEditStockName(e.target.value)} />
            </Form.Group>
            <Form.Group className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <Form.Label className="small fw-bold opacity-50 m-0">GÜNCEL FİYAT</Form.Label>
                {editingStock && editStockValue && (
                  <span className={`fw-bold x-small ${((parseNum(editStockValue) - parseNum(editingStock.currentPrice)) / parseNum(editingStock.currentPrice)) >= 0 ? 'text-success' : 'text-danger'}`}>
                    {((parseNum(editStockValue) - parseNum(editingStock.currentPrice)) / parseNum(editingStock.currentPrice) * 100).toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="d-flex align-items-center gap-2">
                <Form.Control 
                  className="border-0 bg-light flex-grow-1" 
                  value={editStockValue} 
                  onChange={(e) => setEditStockValue(e.target.value.replace(/[^0-9,.]/g, ''))} 
                  autoFocus 
                />
                <Button
                  variant="light"
                  className="d-flex align-items-center justify-content-center border"
                  style={{ width: '38px', height: '38px', borderRadius: '8px', flexShrink: 0 }}
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      const cleanText = text.replace(/[^0-9,.]/g, '');
                      setEditStockValue(cleanText);
                    } catch (err) {
                      console.error('Clipboard read failed:', err);
                    }
                  }}
                  title="Yapıştır"
                  type="button"
                >
                  <Clipboard size={16} className="text-muted" />
                </Button>
              </div>
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100 rounded-pill py-2 fw-bold">Güncelle</Button>
          </Form>
        </Modal.Body>
      </Modal>

      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleBulkImport}
        institutions={institutions}
        stocks={stocks}
      />
      <ExportModal
        show={showExportModal}
        onHide={() => setShowExportModal(false)}
        transactions={processedTransactions}
        institutions={institutions}
        stocks={stocks}
        config={config}
      />
    </div>
  );
};

const MONTH_NAMES = [
  { key: '01', name: 'Ocak' },
  { key: '02', name: 'Şubat' },
  { key: '03', name: 'Mart' },
  { key: '04', name: 'Nisan' },
  { key: '05', name: 'Mayıs' },
  { key: '06', name: 'Haziran' },
  { key: '07', name: 'Temmuz' },
  { key: '08', name: 'Ağustos' },
  { key: '09', name: 'Eylül' },
  { key: '10', name: 'Ekim' },
  { key: '11', name: 'Kasım' },
  { key: '12', name: 'Aralık' }
];

const FinanceCharts = ({
  currentPortfolio,
  institutions,
  institutionStats,
  getStockInfo,
  getInstitutionInfo,
  parseNum,
  processedTransactions
}) => {
  const [chartLayout, setChartLayout] = useState('yillara_gore'); // 'yillara_gore', 'hisse_mevcut', 'hisse_genel', 'kurum_mevcut', 'kurum_genel'
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [showAllHisseGenel, setShowAllHisseGenel] = useState(false);
  const [selectedYear, setSelectedYear] = useState('');
  const [expandedMonths, setExpandedMonths] = useState({});
  const [performanceViewMode, setPerformanceViewMode] = useState('eski'); // 'eski' (Realized - Yıllık/Tümü), 'devam_eden' (Unrealized - Mevcut Portföy)

  const colors = [
    '#3e64ff',
    '#10b981',
    '#f59e0b',
    '#ec4899',
    '#8b5cf6',
    '#06b6d4',
    '#f43f5e',
    '#14b8a6',
    '#f97316',
    '#a855f7'
  ];

  // -------------------------------------------------------------
  // YILLARA GÖRE HESAPLAMA VE VERİ HAZIRLIĞI
  // -------------------------------------------------------------
  const availableYears = useMemo(() => {
    if (!processedTransactions || processedTransactions.length === 0) {
      return [new Date().getFullYear().toString()];
    }
    const yearsSet = new Set();
    processedTransactions.forEach(t => {
      if (t.date && typeof t.date === 'string' && t.date.length >= 4) {
        const y = t.date.substring(0, 4);
        if (/^\d{4}$/.test(y)) {
          yearsSet.add(y);
        }
      }
    });
    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear().toString());
    }
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [processedTransactions]);

  const activeYear = (selectedYear === 'tumu')
    ? 'tumu'
    : (selectedYear && availableYears.includes(selectedYear))
      ? selectedYear
      : (availableYears[0] || new Date().getFullYear().toString());

  const toggleMonthExpand = (mKey) => {
    setExpandedMonths(prev => ({
      ...prev,
      [mKey]: !prev[mKey]
    }));
  };

  const yearlyPerformanceData = useMemo(() => {
    if (!processedTransactions) return { months: [], yearlySummary: {} };

    const yearTx = activeYear === 'tumu'
      ? processedTransactions
      : processedTransactions.filter(t => t.date && typeof t.date === 'string' && t.date.startsWith(activeYear));

    let totalYearNetProfit = 0;
    let totalYearTax = 0;
    let totalYearBuyAmount = 0;
    let totalYearSaleAmount = 0;
    let totalYearCostBasis = 0;
    let totalYearBuyCount = 0;
    let totalYearSaleCount = 0;

    const monthsMap = {};
    MONTH_NAMES.forEach(m => {
      monthsMap[m.key] = {
        monthKey: m.key,
        monthName: m.name,
        netProfit: 0,
        taxDeduction: 0,
        buyAmount: 0,
        saleAmount: 0,
        costBasis: 0,
        buyCount: 0,
        saleCount: 0,
        stockMap: {}
      };
    });

    yearTx.forEach(t => {
      if (!t.date || t.date.length < 7) return;
      const mKey = t.date.substring(5, 7);
      if (!monthsMap[mKey]) return;

      const isBuy = t._isAlis ?? (t.type === 'ALIŞ');
      const sInfo = getStockInfo(t.stockId);
      const stockName = sInfo?.name || t.stockId || 'Hisse';

      if (!monthsMap[mKey].stockMap[t.stockId]) {
        monthsMap[mKey].stockMap[t.stockId] = {
          stockId: t.stockId,
          stockName: stockName,
          buyQty: 0,
          sellQty: 0,
          buyAmount: 0,
          saleAmount: 0,
          netProfit: 0,
          taxDeduction: 0,
          costBasis: 0,
          txCount: 0
        };
      }
      const sItem = monthsMap[mKey].stockMap[t.stockId];
      sItem.txCount += 1;

      if (isBuy) {
        const bAmt = t.totalBuyAmount || (t.quantity * t.price) || 0;
        monthsMap[mKey].buyAmount += bAmt;
        monthsMap[mKey].buyCount += 1;
        sItem.buyQty += (t.quantity || 0);
        sItem.buyAmount += bAmt;

        totalYearBuyAmount += bAmt;
        totalYearBuyCount += 1;
      } else {
        const sAmt = t.totalSaleAmount || (t.quantity * t.price) || 0;
        const profit = t.totalProfit || 0;
        const tax = t.calculatedTaxDeduction || 0;
        const cost = t.costBasis || 0;

        monthsMap[mKey].saleAmount += sAmt;
        monthsMap[mKey].netProfit += profit;
        monthsMap[mKey].taxDeduction += tax;
        monthsMap[mKey].costBasis += cost;
        monthsMap[mKey].saleCount += 1;

        sItem.sellQty += (t.quantity || 0);
        sItem.saleAmount += sAmt;
        sItem.netProfit += profit;
        sItem.taxDeduction += tax;
        sItem.costBasis += cost;

        totalYearSaleAmount += sAmt;
        totalYearNetProfit += profit;
        totalYearTax += tax;
        totalYearCostBasis += cost;
        totalYearSaleCount += 1;
      }
    });

    const months = MONTH_NAMES.map(m => {
      const mData = monthsMap[m.key];
      const profitPercent = mData.costBasis > 0 ? (mData.netProfit / mData.costBasis) * 100 : 0;
      const stocksList = Object.values(mData.stockMap)
        .map(s => ({
          ...s,
          profitPercent: s.costBasis > 0 ? (s.netProfit / s.costBasis) * 100 : 0
        }))
        .sort((a, b) => b.netProfit - a.netProfit);

      return {
        ...mData,
        profitPercent,
        stocksList,
        hasActivity: mData.buyCount > 0 || mData.saleCount > 0
      };
    });

    const activeMonthsWithSales = months.filter(m => m.saleCount > 0);
    let bestMonth = null;
    if (activeMonthsWithSales.length > 0) {
      bestMonth = [...activeMonthsWithSales].sort((a, b) => b.netProfit - a.netProfit)[0];
    }

    const yearlyProfitPercent = totalYearCostBasis > 0 ? (totalYearNetProfit / totalYearCostBasis) * 100 : 0;

    return {
      months,
      yearlySummary: {
        netProfit: totalYearNetProfit,
        taxDeduction: totalYearTax,
        buyAmount: totalYearBuyAmount,
        saleAmount: totalYearSaleAmount,
        costBasis: totalYearCostBasis,
        profitPercent: yearlyProfitPercent,
        totalTxCount: totalYearBuyCount + totalYearSaleCount,
        buyCount: totalYearBuyCount,
        saleCount: totalYearSaleCount,
        bestMonth
      }
    };
  }, [processedTransactions, activeYear, getStockInfo]);

  // -------------------------------------------------------------
  // HISSE LAYOUT DATA (MEVCUT)
  // -------------------------------------------------------------
  const activeStocks = useMemo(() => {
    return currentPortfolio
      .map((s) => {
        const value = s.quantity * s.currentPrice;
        return {
          id: s.id,
          name: s.name,
          value: value,
          cost: s.totalCost,
          profit: s.totalProfit,
          tax: s.totalTaxDeduction,
          percentage: s.profitPercentage,
          quantity: s.quantity,
        };
      })
      .filter(s => s.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [currentPortfolio]);

  const totalStockValue = useMemo(() => {
    return activeStocks.reduce((sum, s) => sum + s.value, 0);
  }, [activeStocks]);

  const totalStockCost = useMemo(() => {
    return activeStocks.reduce((sum, s) => sum + s.cost, 0);
  }, [activeStocks]);

  const totalStockProfit = useMemo(() => {
    return activeStocks.reduce((sum, s) => sum + s.profit, 0);
  }, [activeStocks]);

  const totalStockTax = useMemo(() => {
    return activeStocks.reduce((sum, s) => sum + s.tax, 0);
  }, [activeStocks]);

  const overallStockProfitPercent = totalStockCost > 0 ? (totalStockProfit / totalStockCost) * 100 : 0;

  // -------------------------------------------------------------
  // HISSE LAYOUT DATA (GENEL - MEVCUT VE TARIHSEL)
  // -------------------------------------------------------------
  const allStocks = useMemo(() => {
    if (!processedTransactions) return [];
    
    // Get all unique stockIds from processedTransactions
    const uniqueStockIds = [...new Set(processedTransactions.map(t => t.stockId))].filter(Boolean);
    
    return uniqueStockIds.map(stockId => {
      const sInfo = getStockInfo(stockId);
      const portfolioStock = currentPortfolio.find(p => p.id === stockId);
      
      const stockTx = processedTransactions.filter(t => t.stockId === stockId);
      let realizedProfit = 0;
      let realizedTax = 0;
      let latestSoldDate = '';
      
      stockTx.forEach(t => {
        if (t.type === 'SATIŞ') {
          realizedProfit += t.totalProfit || 0;
          realizedTax += t.calculatedTaxDeduction || 0;
          if (!latestSoldDate || t.date > latestSoldDate) {
            latestSoldDate = t.date;
          }
        }
      });
      
      const quantity = portfolioStock ? portfolioStock.quantity : 0;
      const value = portfolioStock ? (portfolioStock.quantity * portfolioStock.currentPrice) : 0;
      const cost = portfolioStock ? portfolioStock.totalCost : 0;
      
      const unrealizedProfit = portfolioStock ? portfolioStock.totalProfit : 0;
      const unrealizedTax = portfolioStock ? portfolioStock.totalTaxDeduction : 0;
      
      const totalProfit = realizedProfit + unrealizedProfit;
      const totalTax = realizedTax + unrealizedTax;
      
      return {
        id: stockId,
        name: sInfo.name || stockId,
        value: value,
        cost: cost,
        profit: totalProfit,
        tax: totalTax,
        quantity: quantity,
        latestSoldDate: latestSoldDate,
        isActive: quantity > 0
      };
    }).sort((a, b) => {
      // Active holdings first
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      
      if (a.isActive && b.isActive) {
        // Both active: sort by value descending
        return b.value - a.value;
      } else {
        // Both sold out: sort by latestSoldDate descending (most recently sold first)
        return (b.latestSoldDate || '').localeCompare(a.latestSoldDate || '');
      }
    });
  }, [processedTransactions, currentPortfolio, getStockInfo]);

  const totalStockGenelCost = useMemo(() => {
    return allStocks.reduce((sum, s) => sum + s.cost, 0);
  }, [allStocks]);

  const totalStockGenelProfit = useMemo(() => {
    return allStocks.reduce((sum, s) => sum + s.profit, 0);
  }, [allStocks]);

  const totalStockGenelTax = useMemo(() => {
    return allStocks.reduce((sum, s) => sum + s.tax, 0);
  }, [allStocks]);

  // -------------------------------------------------------------
  // KURUM LAYOUT DATA (MEVCUT VE GENEL)
  // -------------------------------------------------------------
  const activeInstitutions = useMemo(() => {
    const isGenel = chartLayout === 'kurum_genel';
    return institutions
      .map((i) => {
        const stats = institutionStats[i.id] || { currentValue: 0, totalInvestment: 0, realizedGross: 0, realizedNet: 0, unrealizedGross: 0, unrealizedNet: 0, dailyGain: 0 };
        
        const value = stats.currentValue;
        const cost = stats.totalInvestment;
        
        const profit = isGenel 
          ? stats.unrealizedNet + stats.realizedNet 
          : stats.unrealizedNet;
          
        const tax = isGenel
          ? (stats.unrealizedGross - stats.unrealizedNet) + (stats.realizedGross - stats.realizedNet)
          : (stats.unrealizedGross - stats.unrealizedNet);
          
        return {
          id: i.id,
          name: i.name,
          logo: i.logo,
          value: value,
          cost: cost,
          profit: profit,
          tax: tax,
          dailyGain: stats.dailyGain,
        };
      })
      .filter(i => i.value > 0 || i.cost > 0 || (isGenel && Math.abs(i.profit) > 0))
      .sort((a, b) => b.value - a.value);
  }, [institutions, institutionStats, chartLayout]);

  const totalInstValue = useMemo(() => {
    return activeInstitutions.reduce((sum, i) => sum + i.value, 0);
  }, [activeInstitutions]);

  const totalInstCost = useMemo(() => {
    return activeInstitutions.reduce((sum, i) => sum + i.cost, 0);
  }, [activeInstitutions]);

  const totalInstProfit = useMemo(() => {
    return activeInstitutions.reduce((sum, i) => sum + i.profit, 0);
  }, [activeInstitutions]);

  const totalInstTax = useMemo(() => {
    return activeInstitutions.reduce((sum, i) => sum + i.tax, 0);
  }, [activeInstitutions]);

  const overallInstProfitPercent = totalInstCost > 0 ? (totalInstProfit / totalInstCost) * 100 : 0;

  // -------------------------------------------------------------
  // DYNAMIC CHART DATA ASSIGNMENTS
  // -------------------------------------------------------------
  const isHisse = chartLayout === 'hisse_mevcut' || chartLayout === 'hisse_genel';
  
  const currentData = useMemo(() => {
    if (chartLayout === 'hisse_mevcut') return activeStocks;
    if (chartLayout === 'hisse_genel') return allStocks;
    return activeInstitutions;
  }, [chartLayout, activeStocks, allStocks, activeInstitutions]);

  const currentTotalValue = totalStockValue; // donut calculations and chart visualization only for active portfolio values

  const currentTotalCost = useMemo(() => {
    if (chartLayout === 'hisse_mevcut') return totalStockCost;
    if (chartLayout === 'hisse_genel') return totalStockGenelCost;
    return totalInstCost;
  }, [chartLayout, totalStockCost, totalStockGenelCost, totalInstCost]);

  const currentTotalProfit = useMemo(() => {
    if (chartLayout === 'hisse_mevcut') return totalStockProfit;
    if (chartLayout === 'hisse_genel') return totalStockGenelProfit;
    return totalInstProfit;
  }, [chartLayout, totalStockProfit, totalStockGenelProfit, totalInstProfit]);

  const currentTotalTax = useMemo(() => {
    if (chartLayout === 'hisse_mevcut') return totalStockTax;
    if (chartLayout === 'hisse_genel') return totalStockGenelTax;
    return totalInstTax;
  }, [chartLayout, totalStockTax, totalStockGenelTax, totalInstTax]);

  const currentOverallProfitPercent = useMemo(() => {
    if (chartLayout === 'hisse_mevcut') return overallStockProfitPercent;
    if (chartLayout === 'hisse_genel') return totalStockGenelCost > 0 ? (totalStockGenelProfit / totalStockGenelCost) * 100 : 0;
    return overallInstProfitPercent;
  }, [chartLayout, overallStockProfitPercent, totalStockGenelCost, totalStockGenelProfit, overallInstProfitPercent]);

  // Bulletproof SVG donut segment calculations with CSS transform rotation
  const donutData = useMemo(() => {
    let accumulatedPercent = 0;
    
    // For Hisse Genel, donut chart visualization is based on value of active stocks only (value > 0)
    // Sold-out stocks (value = 0) are in currentData but will have 0% percentage and won't form a slice
    const valueData = currentData;
    const activeTotalVal = valueData.reduce((sum, item) => sum + item.value, 0);

    return valueData.map((item, idx) => {
      const percentage = activeTotalVal > 0 ? item.value / activeTotalVal : 0;
      const strokeLength = percentage * 314.159;
      const rotationAngle = -90 + (accumulatedPercent * 360);
      accumulatedPercent += percentage;
      return {
        ...item,
        percentageVal: percentage * 100,
        strokeLength,
        rotationAngle,
        color: colors[idx % colors.length]
      };
    });
  }, [currentData, colors]);

  const activeHoverInfo = useMemo(() => {
    if (hoveredSlice !== null && donutData[hoveredSlice]) {
      return donutData[hoveredSlice];
    }
    return null;
  }, [hoveredSlice, donutData]);

  const displayedStocks = useMemo(() => {
    if (chartLayout === 'hisse_mevcut') return donutData;
    if (chartLayout === 'hisse_genel') {
      return showAllHisseGenel ? donutData : donutData.slice(0, 10);
    }
    return [];
  }, [chartLayout, donutData, showAllHisseGenel]);

  return (
    <div className="mt-5 mb-5 animate-fade-in">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold m-0 text-dark">Portföy Analizi</h2>
          <p className="text-muted small m-0 mt-1">Mevcut hisse dağılımları, kurum bazlı finansal özetler ve dönemsel performans</p>
        </div>
        <div className="d-flex align-items-center gap-1 bg-light bg-opacity-50 p-1 rounded-pill flex-wrap" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
          <Button
            variant="light"
            size="sm"
            onClick={() => { setChartLayout('hisse_mevcut'); setHoveredSlice(null); }}
            className={`rounded-pill px-3 py-1 fw-bold border-0 transition-all ${chartLayout === 'hisse_mevcut' ? 'bg-white shadow-sm text-primary' : 'bg-transparent text-muted'}`}
            style={{ fontSize: '12px' }}
          >
            <PieChart size={14} className="me-1" /> Hisse Dağılımı
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={() => { setChartLayout('hisse_genel'); setHoveredSlice(null); }}
            className={`rounded-pill px-3 py-1 fw-bold border-0 transition-all ${chartLayout === 'hisse_genel' ? 'bg-white shadow-sm text-primary' : 'bg-transparent text-muted'}`}
            style={{ fontSize: '12px' }}
          >
            <PieChart size={14} className="me-1" /> Hisse Genel
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={() => { setChartLayout('kurum_mevcut'); setHoveredSlice(null); }}
            className={`rounded-pill px-3 py-1 fw-bold border-0 transition-all ${chartLayout === 'kurum_mevcut' ? 'bg-white shadow-sm text-primary' : 'bg-transparent text-muted'}`}
            style={{ fontSize: '12px' }}
          >
            <Briefcase size={14} className="me-1" /> Kurum Dağılımı
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={() => { setChartLayout('kurum_genel'); setHoveredSlice(null); }}
            className={`rounded-pill px-3 py-1 fw-bold border-0 transition-all ${chartLayout === 'kurum_genel' ? 'bg-white shadow-sm text-primary' : 'bg-transparent text-muted'}`}
            style={{ fontSize: '12px' }}
          >
            <Briefcase size={14} className="me-1" /> Kurum Genel
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={() => { setChartLayout('yillara_gore'); setHoveredSlice(null); }}
            className={`rounded-pill px-3 py-1 fw-bold border-0 transition-all ${chartLayout === 'yillara_gore' ? 'bg-white shadow-sm text-primary' : 'bg-transparent text-muted'}`}
            style={{ fontSize: '12px' }}
          >
            <Calendar size={14} className="me-1" /> Yıllara Göre
          </Button>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={5} md={12}>
          {chartLayout === 'yillara_gore' ? (() => {
            const isDevamEden = performanceViewMode === 'devam_eden';

            // Data for Eski (Realized):
            const s = yearlyPerformanceData.yearlySummary;
            const realizedNetProfit = s.netProfit || 0;
            const realizedTax = s.taxDeduction || 0;
            const realizedGross = realizedNetProfit + realizedTax;
            const realizedProfitPercent = s.profitPercent || 0;
            const realizedTxCount = s.totalTxCount || 0;

            // Data for Devam Eden (Unrealized active portfolio):
            const activeNetProfit = totalStockProfit;
            const activeTax = totalStockTax;
            const activeGross = activeNetProfit + activeTax;
            const activeProfitPercent = overallStockProfitPercent;
            const activeTxCount = activeStocks.length;

            const netProfit = isDevamEden ? activeNetProfit : realizedNetProfit;
            const tax = isDevamEden ? activeTax : realizedTax;
            const gross = isDevamEden ? activeGross : realizedGross;
            const profitPercent = isDevamEden ? activeProfitPercent : realizedProfitPercent;
            const countLabel = isDevamEden ? `${activeTxCount} hisse/fon` : `${realizedTxCount} işlem`;

            // Donut segments: profit (green/red), tax (red)
            const absGross = Math.abs(gross);
            const absProfit = Math.abs(netProfit);
            const absTax = Math.abs(tax);

            const CIRC = 2 * Math.PI * 50; // r=50
            const profitPct = (absProfit + absTax) > 0 ? absProfit / (absProfit + absTax) : 0;
            const taxPct = (absProfit + absTax) > 0 ? absTax / (absProfit + absTax) : 0;

            const profitLen = profitPct * CIRC;
            const taxLen = taxPct * CIRC;
            const gap = (profitLen > 0 && taxLen > 0) ? 4 : 0;

            const profitColor = netProfit >= 0 ? '#10b981' : '#f43f5e';
            const taxColor = '#f43f5e';

            return (
              <Card className="glass-card border-0 shadow-sm h-100 overflow-hidden" style={{ minHeight: '380px', background: 'linear-gradient(135deg, #fafafa 0%, #f4f7ff 100%)' }}>
                <div className="p-4 d-flex flex-column h-100">
                  {/* Header */}
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div>
                      <span className="x-small fw-bold text-muted text-uppercase" style={{ fontSize: '9px', letterSpacing: '0.8px' }}>
                        {isDevamEden
                          ? 'DEVAM EDEN PORTFÖY PERFORMANSI'
                          : (activeYear === 'tumu' ? 'TOPLAM PERFORMANS' : `${activeYear} PERFORMANS`)}
                      </span>
                      <div className={`fs-22 fw-bold mt-0.5 lh-1 ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {netProfit >= 0 ? '+' : ''}
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(netProfit)}₺
                      </div>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <span className={`fw-bold fs-11 px-2 py-0.5 rounded-pill ${netProfit >= 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                          {netProfit >= 0 ? '▲ +' : '▼ '}{(profitPercent || 0).toFixed(2)}%
                        </span>
                        <span className="text-muted" style={{ fontSize: '9px' }}>{countLabel}</span>
                      </div>
                    </div>

                    {/* Eski / Devam Eden Buttons */}
                    <div className="d-flex align-items-center gap-1 p-0.5 rounded-pill" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.07)' }}>
                      <Button
                        variant="light"
                        size="sm"
                        onClick={() => setPerformanceViewMode('eski')}
                        className={`rounded-pill border-0 fw-bold transition-all ${performanceViewMode === 'eski' ? 'bg-dark text-white shadow-sm' : 'bg-transparent text-muted'}`}
                        style={{ fontSize: '10px', padding: '3px 10px' }}
                      >
                        Eski
                      </Button>
                      <Button
                        variant="light"
                        size="sm"
                        onClick={() => setPerformanceViewMode('devam_eden')}
                        className={`rounded-pill border-0 fw-bold transition-all ${performanceViewMode === 'devam_eden' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted'}`}
                        style={{ fontSize: '10px', padding: '3px 10px' }}
                      >
                        Devam Eden
                      </Button>
                    </div>
                  </div>

                  {/* Donut Chart */}
                  <div className="d-flex align-items-center justify-content-center flex-grow-1 position-relative py-2">
                    <div className="position-relative" style={{ width: '180px', height: '180px' }}>
                      <svg viewBox="0 0 120 120" width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
                        {/* Background track */}
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="12" />
                        {/* Net Profit segment */}
                        {profitLen > 0 && (
                          <circle
                            cx="60" cy="60" r="50"
                            fill="none"
                            stroke={profitColor}
                            strokeWidth="12"
                            strokeDasharray={`${Math.max(0, profitLen - gap)} ${CIRC - Math.max(0, profitLen - gap)}`}
                            strokeDashoffset="0"
                            strokeLinecap="round"
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(16,185,129,0.3))' }}
                          />
                        )}
                        {/* Tax segment */}
                        {taxLen > 0 && (
                          <circle
                            cx="60" cy="60" r="50"
                            fill="none"
                            stroke={taxColor}
                            strokeWidth="12"
                            strokeDasharray={`${Math.max(0, taxLen - gap)} ${CIRC - Math.max(0, taxLen - gap)}`}
                            strokeDashoffset={`${-(profitLen)}`}
                            strokeLinecap="round"
                            style={{ opacity: 0.85, filter: 'drop-shadow(0 2px 4px rgba(244,63,94,0.2))' }}
                          />
                        )}
                      </svg>
                      {/* Center label */}
                      <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ pointerEvents: 'none' }}>
                        <div className="text-muted fw-bold" style={{ fontSize: '9px', letterSpacing: '0.5px' }}>NET / BRÜT</div>
                        <div className="fw-bold text-dark" style={{ fontSize: '13px', lineHeight: 1.2 }}>
                          {gross > 0
                            ? `${((netProfit / gross) * 100).toFixed(0)}%`
                            : '—'}
                        </div>
                        <div className="text-muted" style={{ fontSize: '9px' }}>verimlilik</div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="ms-3 d-flex flex-column gap-2">
                      <div>
                        <div className="d-flex align-items-center gap-1.5 mb-0.5">
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: profitColor, flexShrink: 0 }} />
                          <span className="text-muted fw-semibold" style={{ fontSize: '9px', letterSpacing: '0.4px' }}>NET KÂR/ZARAR</span>
                        </div>
                        <div className={`fw-bold fs-13 ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                          {netProfit >= 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(netProfit)}₺
                        </div>
                        {profitPct > 0 && <div className="text-muted" style={{ fontSize: '9px' }}>{(profitPct * 100).toFixed(1)}% pay</div>}
                      </div>
                      <div>
                        <div className="d-flex align-items-center gap-1.5 mb-0.5">
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: taxColor, opacity: 0.85, flexShrink: 0 }} />
                          <span className="text-muted fw-semibold" style={{ fontSize: '9px', letterSpacing: '0.4px' }}>STOPAJ KESİNTİ</span>
                        </div>
                        <div className="fw-bold text-danger fs-13">
                          -{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(tax)}₺
                        </div>
                        {taxPct > 0 && <div className="text-muted" style={{ fontSize: '9px' }}>{(taxPct * 100).toFixed(1)}% pay</div>}
                      </div>
                      {gross !== 0 && (
                        <div>
                          <div className="d-flex align-items-center gap-1.5 mb-0.5">
                            <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: '#e5e7eb', flexShrink: 0 }} />
                            <span className="text-muted fw-semibold" style={{ fontSize: '9px', letterSpacing: '0.4px' }}>BRÜT KÂR</span>
                          </div>
                          <div className="fw-bold text-dark fs-13">
                            {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(gross)}₺
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom stats */}
                  <div className="mt-2 pt-3 border-top d-flex justify-content-between align-items-center flex-wrap gap-1">
                    {isDevamEden ? (
                      <>
                        <div className="text-center">
                          <div className="text-muted" style={{ fontSize: '8px', letterSpacing: '0.5px', fontWeight: 600 }}>TOPLAM DEĞER</div>
                          <div className="fw-bold text-dark" style={{ fontSize: '11px' }}>
                            {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalStockValue || 0)}₺
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted" style={{ fontSize: '8px', letterSpacing: '0.5px', fontWeight: 600 }}>TOPLAM MALİYET</div>
                          <div className="fw-bold text-dark" style={{ fontSize: '11px' }}>
                            {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalStockCost || 0)}₺
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted" style={{ fontSize: '8px', letterSpacing: '0.5px', fontWeight: 600 }}>AKTİF ENSTRÜMAN</div>
                          <div className="fw-bold text-dark" style={{ fontSize: '11px' }}>
                            {activeStocks.length} Adet
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center">
                          <div className="text-muted" style={{ fontSize: '8px', letterSpacing: '0.5px', fontWeight: 600 }}>EN İYİ AY</div>
                          <div className="fw-bold text-dark" style={{ fontSize: '11px' }}>
                            {s.bestMonth ? s.bestMonth.monthName : '-'}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted" style={{ fontSize: '8px', letterSpacing: '0.5px', fontWeight: 600 }}>SATIŞ</div>
                          <div className="fw-bold text-dark" style={{ fontSize: '11px' }}>
                            {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(s.saleAmount || 0)}₺
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted" style={{ fontSize: '8px', letterSpacing: '0.5px', fontWeight: 600 }}>AKTİF AY</div>
                          <div className="fw-bold text-dark" style={{ fontSize: '11px' }}>
                            {yearlyPerformanceData.months.filter(m => m.hasActivity).length}/12
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })() : (
            <Card className="glass-card border shadow-sm p-4 h-100 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '380px' }}>
              <div className="w-100 d-flex justify-content-between align-items-center mb-3">
                <span className="x-small fw-bold text-muted opacity-75 text-uppercase">
                  {chartLayout === 'hisse_mevcut' ? 'HİSSE DAĞILIMI (MEVCUT)' : chartLayout === 'hisse_genel' ? 'HİSSE DAĞILIMI (GENEL)' : chartLayout === 'kurum_mevcut' ? 'KURUMSAL DAĞILIM (MEVCUT)' : 'KURUMSAL DAĞILIM (GENEL)'}
                </span>
                <span className="x-small text-muted">Halka üzerine geliniz</span>
              </div>
              
              {donutData.filter(d => d.value > 0).length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <div className="opacity-50 mb-2"><PieChart size={32} /></div>
                  <div className="small">Görüntülenecek aktif veri bulunamadı</div>
                </div>
              ) : (
                <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: '220px', height: '220px' }}>
                  <svg viewBox="0 0 160 160" width="100%" height="100%">
                    <circle cx="80" cy="80" r="50" fill="transparent" stroke="rgba(0,0,0,0.03)" strokeWidth="15" />
                    {donutData.map((d, i) => {
                      if (d.value <= 0) return null;
                      return (
                        <circle
                          key={d.id}
                          cx="80"
                          cy="80"
                          r="50"
                          fill="transparent"
                          stroke={d.color}
                          strokeWidth={hoveredSlice === i ? 18 : 15}
                          strokeDasharray={`${d.strokeLength} 314.159`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                          className="transition-all"
                          style={{ 
                            cursor: 'pointer',
                            filter: hoveredSlice === i ? 'drop-shadow(0px 4px 8px rgba(0,0,0,0.15))' : 'none',
                            transform: `rotate(${d.rotationAngle}deg)`,
                            transformOrigin: '80px 80px'
                          }}
                          onMouseEnter={() => setHoveredSlice(i)}
                          onMouseLeave={() => setHoveredSlice(null)}
                        />
                      );
                    })}
                  </svg>
                  
                  <div className="position-absolute text-center d-flex flex-column align-items-center justify-content-center" style={{ width: '130px', height: '130px', borderRadius: '50%', pointerEvents: 'none' }}>
                    {activeHoverInfo ? (
                      <>
                        <span className="fw-bold text-dark fs-14 text-truncate px-2 w-100">{activeHoverInfo.name}</span>
                        <span className="text-muted fs-11 mt-0.5">{activeHoverInfo.percentageVal.toFixed(1)}%</span>
                        {activeHoverInfo.value > 0 ? (
                          <span className="fw-bold text-primary fs-14 mt-1">
                            {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(activeHoverInfo.value)}₺
                          </span>
                        ) : (
                          <span className="text-muted fs-11 mt-1">
                            Aktif Değil
                          </span>
                        )}
                        <span className="text-danger fw-bold mt-0.5" style={{ fontSize: '9px' }}>
                          Stopaj: -{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(activeHoverInfo.tax)}₺
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-muted fs-10 text-uppercase fw-bold opacity-75">TOPLAM DEĞER</span>
                        <span className="fw-bold text-dark fs-18 mt-1">
                          {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalStockValue - currentTotalTax)}₺
                        </span>
                        <span className={`fw-bold fs-11 mt-1 ${currentTotalProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                          {currentTotalProfit >= 0 ? '+' : ''}
                          {currentOverallProfitPercent.toFixed(2)}%
                        </span>
                        <span className="text-danger fw-bold mt-0.5" style={{ fontSize: '9px' }}>
                          Stopaj: -{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(currentTotalTax)}₺
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}
        </Col>

        <Col lg={7} md={12}>
          {chartLayout === 'yillara_gore' ? (
            <Card className="glass-card border-0 shadow-sm h-100 overflow-hidden" style={{ minHeight: '380px', background: 'linear-gradient(135deg, #fafafa 0%, #f4f7ff 100%)' }}>
              <div className="p-4 d-flex flex-column h-100">
                <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
                  <span className="fw-bold text-dark" style={{ fontSize: '13px' }}>
                    {activeYear === 'tumu' ? 'Tüm Zamanlar' : `${activeYear} Performansı`}
                    <span className="text-muted ms-2 fw-normal" style={{ fontSize: '11px' }}>· Aylık Kırılım</span>
                  </span>
                  {/* Year Selector Buttons */}
                  <div className="d-flex align-items-center gap-1 p-0.5 rounded-pill" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.07)' }}>
                    <Button
                      variant="light"
                      size="sm"
                      onClick={() => { setSelectedYear('tumu'); setExpandedMonths({}); }}
                      className={`rounded-pill border-0 fw-bold transition-all ${activeYear === 'tumu' ? 'bg-dark text-white shadow-sm' : 'bg-transparent text-muted'}`}
                      style={{ fontSize: '10px', padding: '3px 10px' }}
                    >
                      Tümü
                    </Button>
                    {availableYears.map(y => (
                      <Button
                        key={y}
                        variant="light"
                        size="sm"
                        onClick={() => { setSelectedYear(y); setExpandedMonths({}); }}
                        className={`rounded-pill border-0 fw-bold transition-all ${activeYear === y ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted'}`}
                        style={{ fontSize: '10px', padding: '3px 10px' }}
                      >
                        {y}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="overflow-auto flex-grow-1 pe-1" style={{ maxHeight: '270px' }}>
                  <Table hover className="mb-0 fs-13 align-middle" borderless>
                    <thead>
                      <tr className="text-muted x-small fw-bold border-bottom" style={{ fontSize: '9px', opacity: 0.6 }}>
                        <th style={{ width: '28%' }}>AY</th>
                        <th className="text-end" style={{ width: '22%' }}>ALIŞ / SATIŞ</th>
                        <th className="text-end" style={{ width: '22%' }}>STOPAJ</th>
                        <th className="text-end pe-2" style={{ width: '28%' }}>NET KÂR / ZARAR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyPerformanceData.months.map((m) => {
                        const isExpanded = !!expandedMonths[m.monthKey];
                        const hasActivity = m.hasActivity;

                        return (
                          <React.Fragment key={m.monthKey}>
                            <tr
                              className={`rounded-3 transition-all ${isExpanded ? 'bg-light bg-opacity-75' : ''} ${!hasActivity ? 'opacity-50' : ''}`}
                              onClick={() => hasActivity && toggleMonthExpand(m.monthKey)}
                              style={{ cursor: hasActivity ? 'pointer' : 'default' }}
                            >
                              <td>
                                <div className="d-flex align-items-center gap-1.5">
                                  {hasActivity ? (
                                    isExpanded ? <ChevronDown size={14} className="text-primary flex-shrink-0" /> : <ChevronRight size={14} className="text-muted flex-shrink-0" />
                                  ) : (
                                    <div style={{ width: '14px' }} className="flex-shrink-0" />
                                  )}
                                  <span className={`fw-bold ${hasActivity ? 'text-dark' : 'text-muted'}`}>{m.monthName}</span>
                                  {hasActivity && (
                                    <span className="badge bg-light text-muted border px-1.5 py-0.5 rounded-pill" style={{ fontSize: '9px' }}>
                                      {m.buyCount + m.saleCount}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="text-end">
                                <div className="d-flex flex-column align-items-end">
                                  {m.saleAmount > 0 && (
                                    <span className="text-success fw-medium fs-11">
                                      S: {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(m.saleAmount)}₺
                                    </span>
                                  )}
                                  {m.buyAmount > 0 && (
                                    <span className="text-primary fw-medium fs-11">
                                      A: {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(m.buyAmount)}₺
                                    </span>
                                  )}
                                  {m.saleAmount === 0 && m.buyAmount === 0 && (
                                    <span className="text-muted fs-11">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="text-end">
                                {m.taxDeduction > 0 ? (
                                  <span className="text-danger fw-bold fs-11">
                                    -{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m.taxDeduction)}₺
                                  </span>
                                ) : (
                                  <span className="text-muted fs-11">-</span>
                                )}
                              </td>
                              <td className={`text-end pe-2 fw-bold ${m.saleCount > 0 ? (m.netProfit >= 0 ? 'text-success' : 'text-danger') : 'text-muted'}`}>
                                {m.saleCount > 0 ? (
                                  <div className="d-flex flex-column align-items-end">
                                    <span>{m.netProfit >= 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(m.netProfit)}₺</span>
                                    {m.costBasis > 0 && (
                                      <span style={{ fontSize: '9px' }} className="opacity-75">
                                        ({m.netProfit >= 0 ? '+' : ''}{m.profitPercent.toFixed(2)}%)
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span>-</span>
                                )}
                              </td>
                            </tr>

                            {/* Collapsible Stock Breakdown */}
                            {hasActivity && (
                              <tr>
                                <td colSpan={4} className="p-0 border-0">
                                  <Collapse in={isExpanded}>
                                    <div className="p-2.5 my-1 mx-2 bg-light bg-opacity-50 rounded-3 border">
                                      <div className="d-flex align-items-center justify-content-between mb-2">
                                        <span className="x-small fw-bold text-muted opacity-75 text-uppercase" style={{ fontSize: '9px' }}>
                                          {m.monthName} {activeYear} - HİSSE KIRILIMI
                                        </span>
                                        <span className="x-small text-muted" style={{ fontSize: '9px' }}>
                                          {m.stocksList.length} Hisse
                                        </span>
                                      </div>
                                      <Table size="sm" className="mb-0 fs-12" borderless>
                                        <thead>
                                          <tr className="text-muted border-bottom" style={{ fontSize: '9px', opacity: 0.7 }}>
                                            <th>HİSSE</th>
                                            <th className="text-end">İŞLEM DETAYI</th>
                                            <th className="text-end">STOPAJ</th>
                                            <th className="text-end pe-1">NET KÂR/ZARAR</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {m.stocksList.map(stk => (
                                            <tr key={stk.stockId} className="border-bottom border-light">
                                              <td className="fw-bold text-dark py-1.5">{stk.stockName}</td>
                                              <td className="text-end text-muted py-1.5" style={{ fontSize: '11px' }}>
                                                {stk.sellQty > 0 && <span className="text-danger fw-semibold">{stk.sellQty} Lot Satış</span>}
                                                {stk.sellQty > 0 && stk.buyQty > 0 && <span> / </span>}
                                                {stk.buyQty > 0 && <span className="text-primary fw-semibold">{stk.buyQty} Lot Alış</span>}
                                              </td>
                                              <td className="text-end text-danger py-1.5" style={{ fontSize: '11px' }}>
                                                {stk.taxDeduction > 0 ? `-${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(stk.taxDeduction)}₺` : '-'}
                                              </td>
                                              <td className={`text-end pe-1 fw-bold py-1.5 ${stk.sellQty > 0 ? (stk.netProfit >= 0 ? 'text-success' : 'text-danger') : 'text-muted'}`}>
                                                {stk.sellQty > 0 ? (
                                                  <span>
                                                    {stk.netProfit >= 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(stk.netProfit)}₺
                                                  </span>
                                                ) : (
                                                  <span className="text-muted fw-normal" style={{ fontSize: '10px' }}>Alış Yapıldı</span>
                                                )}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </Table>
                                    </div>
                                  </Collapse>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </div>

              {/* Footer */}
              <div className="border-top mx-4 pt-3 pb-4">
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <div className="text-center flex-fill p-2 rounded-3" style={{ background: 'rgba(0,0,0,0.04)' }}>
                    <div className="text-muted fw-bold" style={{ fontSize: '8px', letterSpacing: '0.4px' }}>SATIŞ</div>
                    <div className="fw-bold text-dark fs-12 mt-0.5">
                      {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(yearlyPerformanceData.yearlySummary.saleAmount || 0)}₺
                    </div>
                  </div>
                  <div className="text-center flex-fill p-2 rounded-3" style={{ background: 'rgba(244,63,94,0.08)' }}>
                    <div className="text-danger fw-bold" style={{ fontSize: '8px', letterSpacing: '0.4px' }}>STOPAJ</div>
                    <div className="fw-bold text-danger fs-12 mt-0.5">
                      -{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(yearlyPerformanceData.yearlySummary.taxDeduction || 0)}₺
                    </div>
                  </div>
                  <div className={`text-center flex-fill p-2 rounded-3 ${(yearlyPerformanceData.yearlySummary.netProfit || 0) >= 0 ? '' : ''}`} style={{ background: (yearlyPerformanceData.yearlySummary.netProfit || 0) >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)' }}>
                    <div className={`fw-bold ${(yearlyPerformanceData.yearlySummary.netProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '8px', letterSpacing: '0.4px' }}>NET KÂR</div>
                    <div className={`fw-bold fs-12 mt-0.5 ${(yearlyPerformanceData.yearlySummary.netProfit || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                      {(yearlyPerformanceData.yearlySummary.netProfit || 0) >= 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(yearlyPerformanceData.yearlySummary.netProfit || 0)}₺
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : (

            <Card className="glass-card border shadow-sm p-4 h-100 d-flex flex-column justify-content-between" style={{ minHeight: '380px' }}>
              <div>
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <span className="x-small fw-bold text-muted opacity-75 text-uppercase">
                    {chartLayout === 'hisse_mevcut' ? 'HİSSE DETAYLARI (MEVCUT)' : chartLayout === 'hisse_genel' ? 'HİSSE DETAYLARI (GENEL)' : chartLayout === 'kurum_mevcut' ? 'KURUMSAL ÖZETLER (MEVCUT)' : 'KURUMSAL ÖZETLER (GENEL)'}
                  </span>
                  <Badge bg="primary" className="rounded-pill opacity-75 px-3 py-1 fs-11">
                    {chartLayout === 'hisse_mevcut' ? `${activeStocks.length} Aktif Hisse` : chartLayout === 'hisse_genel' ? `${allStocks.length} Hisse (Mevcut/Tarihsel)` : `${activeInstitutions.length} Aktif Kurum`}
                  </Badge>
                </div>

                {(chartLayout === 'hisse_mevcut' || chartLayout === 'hisse_genel') ? (
                  (chartLayout === 'hisse_mevcut' ? activeStocks : allStocks).length === 0 ? (
                    <div className="text-center py-5 text-muted small">Portföy bulunmamaktadır</div>
                  ) : (
                    <div className="overflow-auto pe-1" style={{ maxHeight: '240px' }}>
                      <Table hover className="mb-0 fs-13 align-middle" borderless>
                        <thead>
                          <tr className="text-muted x-small fw-bold border-bottom" style={{ fontSize: '9px', opacity: 0.6 }}>
                            <th style={{ width: '40%' }}>HİSSE</th>
                            <th className="text-end" style={{ width: '20%' }}>MİKTAR</th>
                            <th className="text-end" style={{ width: '20%' }}>PORTFÖY PAYI</th>
                            <th className="text-end pe-2" style={{ width: '20%' }}>NET KAR/ZARAR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedStocks.map((d, i) => (
                            <tr 
                              key={d.id} 
                              className={`rounded-3 transition-all cursor-pointer ${hoveredSlice === i ? 'bg-light bg-opacity-75' : ''}`}
                              onMouseEnter={() => setHoveredSlice(i)}
                              onMouseLeave={() => setHoveredSlice(null)}
                            >
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div className="rounded flex-shrink-0" style={{ width: '12px', height: '12px', backgroundColor: d.color, borderRadius: '3px' }} />
                                  <span className="fw-bold text-dark">{d.name}</span>
                                </div>
                              </td>
                              <td className="text-end text-muted">{d.quantity > 0 ? `${new Intl.NumberFormat('tr-TR').format(d.quantity)} Lot` : '0 Lot'}</td>
                              <td className="text-end fw-medium">{d.percentageVal.toFixed(1)}%</td>
                              <td className={`text-end pe-2 fw-bold ${d.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                                <div className="d-flex flex-column align-items-end">
                                  <span>{d.profit >= 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.profit)}₺</span>
                                  {d.percentage !== undefined && d.percentage !== 0 && (
                                    <span style={{ fontSize: '9px' }} className="opacity-75">({d.percentage >= 0 ? '+' : ''}{d.percentage.toFixed(2)}%)</span>
                                  )}
                                  <span style={{ fontSize: '9px', fontWeight: 500 }} className="text-danger">Stopaj: -{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.tax)}₺</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      {chartLayout === 'hisse_genel' && allStocks.length > 10 && (
                        <div className="d-flex justify-content-center mt-2">
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-decoration-none text-primary fw-bold p-0 py-1"
                            onClick={() => setShowAllHisseGenel(!showAllHisseGenel)}
                          >
                            {showAllHisseGenel ? 'Daha Az Göster' : 'Devamını Gör'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  activeInstitutions.length === 0 ? (
                    <div className="text-center py-5 text-muted small">Aktif kurum bulunmamaktadır</div>
                  ) : (
                    <div className="overflow-auto pe-1" style={{ maxHeight: '240px' }}>
                      <Table hover className="mb-0 fs-13 align-middle" borderless>
                        <thead>
                          <tr className="text-muted x-small fw-bold border-bottom" style={{ fontSize: '9px', opacity: 0.6 }}>
                            <th style={{ width: '40%' }}>KURUM</th>
                            <th className="text-end" style={{ width: '20%' }}>GÜNLÜK KAZANÇ</th>
                            <th className="text-end" style={{ width: '20%' }}>PORTFÖY DEĞERİ</th>
                            <th className="text-end pe-2" style={{ width: '20%' }}>NET KAZANÇ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {donutData.map((d, i) => (
                            <tr 
                              key={d.id} 
                              className={`rounded-3 transition-all cursor-pointer ${hoveredSlice === i ? 'bg-light bg-opacity-75' : ''}`}
                              onMouseEnter={() => setHoveredSlice(i)}
                              onMouseLeave={() => setHoveredSlice(null)}
                            >
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div className="rounded flex-shrink-0" style={{ width: '12px', height: '12px', backgroundColor: d.color, borderRadius: '3px' }} />
                                  {d.logo ? (
                                    <img src={d.logo} alt="" width="16" height="16" className="rounded-circle" style={{ objectFit: 'contain' }} />
                                  ) : (
                                    <Landmark size={14} className="text-muted" />
                                  )}
                                  <span className="fw-bold text-dark">{d.name}</span>
                                </div>
                              </td>
                              <td className={`text-end fw-bold ${d.dailyGain >= 0 ? 'text-success' : 'text-danger'}`}>
                                {d.dailyGain > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.dailyGain)}₺
                              </td>
                              <td className="text-end fw-bold">{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.value)}₺</td>
                              <td className={`text-end pe-2 fw-bold ${d.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                                <div className="d-flex flex-column align-items-end">
                                  <span>{d.profit >= 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.profit)}₺</span>
                                  <span style={{ fontSize: '9px', fontWeight: 500 }} className="text-danger">Stopaj: -{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.tax)}₺</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )
                )}
              </div>

              <div className="border-top pt-3 mt-3">
                <Row className="g-2">
                  <Col xs={4}>
                    <div className="bg-light bg-opacity-25 rounded-3 p-2 text-center border">
                      <div className="text-muted x-small opacity-75" style={{ fontSize: '9px' }}>TOPLAM YATIRIM</div>
                      <div className="fw-bold text-dark mt-1 fs-12">
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(currentTotalCost)}₺
                      </div>
                    </div>
                  </Col>
                  <Col xs={4}>
                    <div className="bg-light bg-opacity-25 rounded-3 p-2 text-center border">
                      <div className="text-muted x-small opacity-75" style={{ fontSize: '9px' }}>PORTFÖY DEĞERİ</div>
                      <div className="fw-bold text-primary mt-1 fs-12">
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalStockValue - currentTotalTax)}₺
                      </div>
                    </div>
                  </Col>
                  <Col xs={4}>
                    <div className={`rounded-3 p-2 text-center border ${currentTotalProfit >= 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                      <div className="x-small opacity-75" style={{ fontSize: '9px', fontWeight: 500 }}>NET KAR/ZARAR</div>
                      <div className="fw-bold mt-1 fs-12">
                        {currentTotalProfit >= 0 ? '+' : ''}
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(currentTotalProfit)}₺
                      </div>
                      <div className="text-danger fw-bold mt-1" style={{ fontSize: '9px' }}>
                        Stopaj: -{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(currentTotalTax)}₺
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default FinanceTransactionsPage;
