import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
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

const ImportModal = ({ show, onHide, onImport }) => {
  const [text, setText] = React.useState('');
  const handleProcess = () => {
    const lines = text.trim().split('\n');
    const results = lines.map(line => {
      const parts = line.split('\t');
      if (parts.length < 11) return null;
      const institutionName = parts[0].trim();
      const stockName = parts[2].trim();
      const typeName = parts[3].trim().toUpperCase() === 'ALIŞ' ? 'ALIŞ' : 'SATIŞ';
      const quantity = parts[4].trim().replace(/\./g, '').replace(',', '.');
      const price = parts[5].trim().replace('₺', '').replace(/\./g, '').replace(',', '.');
      const taxRate = parts[6].trim().replace('₺', '').replace(/\./g, '').replace(',', '.');
      const dateStr = parts[10].trim();
      const [d, m, y] = dateStr.split('.');
      const formattedDate = `${y}-${m}-${d}`;
      return { institutionName, stockName, typeName, quantity, price, taxRate, date: formattedDate };
    }).filter(Boolean);
    onImport(results);
    setText('');
    onHide();
  };
  return (
    <Modal show={show} onHide={onHide} size="lg" className="glass-card">
      <Modal.Header closeButton className="border-0"><Modal.Title className="fw-bold">İşlemleri İçe Aktar</Modal.Title></Modal.Header>
      <Modal.Body className="p-4">
        <div className="alert alert-info border-0 rounded-3 small mb-3">Verileri sütunları ile birlikte (başlıksız) buraya yapıştırın. Format: Kurum, Sembol Borsa, Sembol, Durum, Adet, Fiyat, Komisyon... Tarih</div>
        <Form.Control as="textarea" rows={10} className="glass-card p-3 border-0 bg-light" placeholder="Verileri buraya yapıştırın..." value={text} onChange={e => setText(e.target.value)} style={{ fontSize: '13px' }} />
        <Button className="mt-3 w-100 rounded-pill py-2 fw-bold" onClick={handleProcess}>Aktarımı Tamamla</Button>
      </Modal.Body>
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
        <td className="fw-medium fs-15">
          <div className="d-flex flex-column">
            <span className={totalNet >= 0 ? 'text-success' : 'text-danger'}>{formatCurrency(totalNet)} TL</span>
            <span className="x-small text-muted opacity-50">Net Kar</span>
          </div>
        </td>
        <td className="text-end pe-4">
          <div className="d-flex flex-column align-items-end">
            <span className="fw-bold fs-14">{formatCurrency(stats?.currentValue || 0)} TL</span>
            <span className="x-small text-muted opacity-50">Mevcut Değer</span>
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
      if (['quantity', 'price', 'taxRate', 'totalBuyAmount', 'totalSaleAmount', 'grossProfit', 'totalProfit', 'taxDeduction', 'remainingQuantity'].includes(propId)) {
        if (propId === 'taxDeduction') return t.calculatedTaxDeduction || 0;
        if (propId === 'remainingQuantity') return t.calculatedRemaining || 0;
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

    if (['price', 'totalBuyAmount', 'totalSaleAmount', 'grossProfit', 'totalProfit', 'taxDeduction'].includes(propId)) {
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


  const processedTransactions = useMemo(() => {

    const sorted = [...transactions].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      
      // If dates are same, prioritize ALIŞ (Buy) over SATIŞ (Sell)
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
        const finalTaxDeduction = (t.taxDeduction !== undefined && t.taxDeduction !== null && t.taxDeduction !== 0) ? t.taxDeduction : taxDeduction;
        const totalProfit = grossProfit - finalTaxDeduction;
        const costBasis = totalSaleAmount - grossProfit;
        const profitPercentage = costBasis > 0 ? (totalProfit / costBasis) * 100 : 0;

        const totalRemainingAfterSale = (buyLots[storageKey] || []).reduce((acc, lot) => acc + lot.remaining, 0);
        intermediateResults.push({
          ...t,
          quantity: q, price: p, taxRate: tr,
          _isAlis: false,
          _storageKey: storageKey,
          calculatedRemaining: totalRemainingAfterSale,
          calculatedTaxDeduction: finalTaxDeduction,
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
      if (t.type === 'ALIŞ' && (t.calculatedRemaining || 0) > 0) {
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

      if (t.type === 'SATIŞ') {
        stats[instId].realizedGross += (t.grossProfit || 0);
        stats[instId].realizedNet += (t.totalProfit || 0);
      } else if (t.type === 'ALIŞ') {
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
      }
    });

    return stats;
  }, [institutions, processedTransactions, stocks]);

  const handleBulkImport = async (data) => {
    if (!user) return;
    setIsBulkProcessing(true);
    setBulkProgress(0);
    let totalCount = 0;
    
    // Track newly created entities to avoid duplicates within the same import
    const localInstitutions = [...institutions];
    const localStocks = [...stocks];

    // Split into chunks of 500 for Firestore Batch limit
    const chunkSize = 400; // Safer side
    const chunks = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const batch = writeBatch(db);

        for (const item of chunk) {
          if (!item.institutionName || !item.stockName) continue;

          // Find or create Institution
          let inst = localInstitutions.find(i => i.name.toLowerCase() === item.institutionName.trim().toLowerCase());
          if (!inst) {
            const newInstRef = doc(collection(db, `users/${user.uid}/institutions`));
            const newInst = { id: newInstRef.id, name: item.institutionName.trim(), logo: '', createdAt: serverTimestamp(), deleted: false };
            batch.set(newInstRef, { name: newInst.name, logo: newInst.logo, createdAt: newInst.createdAt, deleted: newInst.deleted });
            localInstitutions.push(newInst);
            inst = newInst;
          }

          // Find or create Stock
          let stock = localStocks.find(s => s.name.toLowerCase() === item.stockName.trim().toLowerCase());
          if (!stock) {
            const newStockRef = doc(collection(db, `users/${user.uid}/stocks`));
            const newStock = { id: newStockRef.id, name: item.stockName.trim().toUpperCase(), currentPrice: 0, createdAt: serverTimestamp(), deleted: false };
            batch.set(newStockRef, { name: newStock.name, currentPrice: newStock.currentPrice, createdAt: newStock.createdAt, deleted: newStock.deleted });
            localStocks.push(newStock);
            stock = newStock;
          }

          const qty = parseFloat(item.quantity) || 0;
          const prc = parseFloat(item.price) || 0;
          const tax = parseFloat(item.taxRate) || 0;
          
          const newRef = doc(collection(db, `users/${user.uid}/financeTransactions`));
          batch.set(newRef, { 
            institutionId: inst.id, 
            stockId: stock.id, 
            type: item.typeName, 
            quantity: qty, 
            price: prc, 
            taxRate: tax, 
            date: item.date, 
            createdAt: serverTimestamp(), 
            deleted: false 
          });
          totalCount++;
        }
        
        await batch.commit();
        setBulkProgress(Math.round(((i + 1) / chunks.length) * 100));
      }
      
      if (totalCount > 0) { 
        alert(`${totalCount} işlem başarıyla aktarıldı. Yeni kurumlar/hisseler otomatik oluşturuldu.`); 
      } else { 
        alert('Aktarılacak uygun işlem bulunamadı.'); 
      }
    } catch (err) {
      console.error('Bulk import error:', err);
      alert('Aktarım sırasında bir hata oluştu.');
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

    if (config.sortConfig?.propId) {
      const { propId, direction } = config.sortConfig;
      result.sort((a, b) => {
        let valA = a[propId], valB = b[propId];
        if (propId === 'institutionId') { valA = getInstitutionInfo(valA).name; valB = getInstitutionInfo(valB).name; }
        if (propId === 'stockId') { valA = getStockInfo(valA).name; valB = getStockInfo(valB).name; }
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [processedTransactions, selectedInstitutionId, config.filters, config.sortConfig, institutions, stocks]);

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
      
      if (t.type === 'ALIŞ' && (t.calculatedRemaining || 0) > 0) {
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
            if (t.stockId === item.id && t.type === 'ALIŞ' && (t.calculatedRemaining || 0) > 0) {
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
      .sort((a, b) => a.name.localeCompare(b.name));
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

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (!config.sortConfig) return 0;
      const { propId, direction } = config.sortConfig;
      let valA = a[propId], valB = b[propId];
      if (propId === 'date') { valA = valA || ''; valB = valB || ''; }
      else if (['quantity', 'price', 'taxRate', 'remainingQuantity', 'taxDeduction'].includes(propId)) { valA = parseFloat(valA) || 0; valB = parseFloat(valB) || 0; }
      else { valA = (valA || '').toString().toLowerCase(); valB = (valB || '').toString().toLowerCase(); }
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTransactions, config.sortConfig]);

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
      const stockTrans = transactions.filter(t => t.stockId === formStockId).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt?.seconds - b.createdAt?.seconds);
      const currentTotalQty = stockTrans.reduce((acc, t) => acc + (t.type === 'ALIŞ' ? t.quantity : -t.quantity), 0);
      if (type === 'SATIŞ') {
        const buyDocs = transactions.filter(t => t.stockId === formStockId && t.type === 'ALIŞ' && t.remainingQuantity > 0).sort((a, b) => a.date.localeCompare(b.date));
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
      sorted.sort((a, b) => a.name.localeCompare(b.name));
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
        <td key={propId} className={`fw-bold ${t.grossProfit > 0 ? 'text-success' : t.grossProfit < 0 ? 'text-danger' : ''}`}>
          {t.type === 'SATIŞ' && t.grossProfit !== 0 ? (
            <div className="d-flex flex-column align-items-end">
              <span>{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.grossProfit)} TL</span>
              <span className="x-small opacity-75">(%{(t.costBasis > 0 ? (t.grossProfit / t.costBasis * 100) : 0).toFixed(2)})</span>
            </div>
          ) : '-'}
        </td>
      );
      case 'remainingQuantity': return <td key={propId} className="fw-bold"><Badge bg={t.type === 'ALIŞ' ? (t.calculatedRemaining === 0 ? "secondary" : "info") : "primary"} className="rounded-pill">{t.calculatedRemaining}</Badge></td>;
      case 'taxDeduction': 
        const taxVal = t.calculatedTaxDeduction;
        return (
          <td key={propId} className={`${tdClass} text-danger fw-bold`} onClick={t.type === 'SATIŞ' ? tdClick : undefined}>
            {isEditing ? (
              <OverlayCell isEditing={isEditing} display={taxVal} input={<LocalTextInput size="sm" inputMode="text" autoFocus value={cellDraft} onSave={(val) => saveCell(t.id, 'taxDeduction', val)} onCancel={() => setEditingCell(null)} className="border-0 bg-transparent p-0 text-end fw-bold text-danger" />} />
            ) : (
              taxVal > 0 ? (
                <div className="d-flex flex-column align-items-end">
                  <span>{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(taxVal)} TL</span>
                  <span className="x-small opacity-75">(%{(t.costBasis > 0 ? (taxVal / t.costBasis * 100) : 0).toFixed(2)})</span>
                </div>
              ) : '-'
            )}
          </td>
        );
      case 'totalBuyAmount': return <td key={propId} className="fw-bold">{t.type === 'ALIŞ' && t.totalBuyAmount > 0 ? `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.totalBuyAmount)} TL` : '-'}</td>;
      case 'totalSaleAmount': return <td key={propId} className="fw-bold">{t.type === 'SATIŞ' && t.totalSaleAmount > 0 ? `${new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(t.totalSaleAmount)} TL` : '-'}</td>;
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
                  <th className="sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>DÖVİZ</th>
                  <th className="sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>GİRİŞ TARİHİ</th>
                  <th className="sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>GÜN</th>
                  <th className="sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>ADET</th>
                  <th className="sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>GİRİŞ KURU</th>
                  <th className="sticky-top bg-white" style={{ top: 0, zIndex: 11, borderBottom: '1px solid #eee', color: '#666', whiteSpace: 'nowrap' }}>MEVCUT FİYAT</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const activeLots = processedTransactions
                    .filter(t => t.type === 'ALIŞ' && (t.calculatedRemaining || 0) > 0)
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
                    return nameA.localeCompare(nameB);
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
                      if (stockA !== stockB) return stockA.localeCompare(stockB);
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
                              <div className="text-muted x-small opacity-50" style={{ fontSize: '9px', fontWeight: 400 }}>
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
                            <div className="text-muted x-small opacity-50" style={{ fontSize: '9px' }}>
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
                          <div className="text-muted x-small opacity-50" style={{ fontSize: '9px', fontWeight: 400 }}>
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
                              ...(['quantity', 'price', 'taxRate', 'totalBuyAmount', 'totalSaleAmount', 'grossProfit', 'totalProfit', 'taxDeduction', 'remainingQuantity'].includes(id) ? [
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
                            className="rounded-2 d-flex align-items-center justify-content-between py-2 small"
                            onClick={() => handleToggleWrap(id)}
                          >
                            <div className="d-flex align-items-center gap-2">
                              <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><WrapText size={14} className="text-muted" /></div> 
                              <span>Metni Kaydır</span>
                            </div>
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
              Hepsini Gör
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
            <Form.Control className="border-0 bg-light" value={editStockValue} onChange={(e) => setEditStockValue(e.target.value.replace(/[^0-9,.]/g, ''))} autoFocus />
          </Form.Group>
          <Button variant="success" className="w-100 rounded-pill mt-3 py-2 fw-bold" onClick={handleUpdateStock}>Değişiklikleri Kaydet</Button>
        </Modal.Body>
      </Modal>
      <ImportModal show={showImportModal} onHide={() => setShowImportModal(false)} onImport={handleBulkImport} />
    </div>
  );
};

const FinanceCharts = ({
  currentPortfolio,
  institutions,
  institutionStats,
  getStockInfo,
  getInstitutionInfo,
  parseNum
}) => {
  const [chartLayout, setChartLayout] = useState('hisse'); // 'hisse' or 'kurum'
  const [hoveredSlice, setHoveredSlice] = useState(null);

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
  // HISSE LAYOUT DATA
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

  const overallStockProfitPercent = totalStockCost > 0 ? (totalStockProfit / totalStockCost) * 100 : 0;

  const stockDonutData = useMemo(() => {
    let accumulatedPercent = 0;
    return activeStocks.map((item, idx) => {
      const percentage = totalStockValue > 0 ? item.value / totalStockValue : 0;
      const strokeLength = percentage * 314.159;
      const strokeOffset = 314.159 - (accumulatedPercent * 314.159) + 78.539;
      accumulatedPercent += percentage;
      return {
        ...item,
        percentageVal: percentage * 100,
        strokeLength,
        strokeOffset,
        color: colors[idx % colors.length]
      };
    });
  }, [activeStocks, totalStockValue]);

  // -------------------------------------------------------------
  // KURUM LAYOUT DATA
  // -------------------------------------------------------------
  const activeInstitutions = useMemo(() => {
    return institutions
      .map((i) => {
        const stats = institutionStats[i.id] || { currentValue: 0, totalInvestment: 0, realizedNet: 0, unrealizedNet: 0, dailyGain: 0 };
        return {
          id: i.id,
          name: i.name,
          logo: i.logo,
          value: stats.currentValue,
          cost: stats.totalInvestment,
          profit: stats.unrealizedNet + stats.realizedNet,
          dailyGain: stats.dailyGain,
        };
      })
      .filter(i => i.value > 0 || i.cost > 0)
      .sort((a, b) => b.value - a.value);
  }, [institutions, institutionStats]);

  const totalInstValue = useMemo(() => {
    return activeInstitutions.reduce((sum, i) => sum + i.value, 0);
  }, [activeInstitutions]);

  const totalInstCost = useMemo(() => {
    return activeInstitutions.reduce((sum, i) => sum + i.cost, 0);
  }, [activeInstitutions]);

  const totalInstProfit = useMemo(() => {
    return activeInstitutions.reduce((sum, i) => sum + i.profit, 0);
  }, [activeInstitutions]);

  const overallInstProfitPercent = totalInstCost > 0 ? (totalInstProfit / totalInstCost) * 100 : 0;

  const instDonutData = useMemo(() => {
    let accumulatedPercent = 0;
    return activeInstitutions.map((item, idx) => {
      const percentage = totalInstValue > 0 ? item.value / totalInstValue : 0;
      const strokeLength = percentage * 314.159;
      const strokeOffset = 314.159 - (accumulatedPercent * 314.159) + 78.539;
      accumulatedPercent += percentage;
      return {
        ...item,
        percentageVal: percentage * 100,
        strokeLength,
        strokeOffset,
        color: colors[idx % colors.length]
      };
    });
  }, [activeInstitutions, totalInstValue]);

  const currentDonutData = chartLayout === 'hisse' ? stockDonutData : instDonutData;
  const currentTotalValue = chartLayout === 'hisse' ? totalStockValue : totalInstValue;

  const activeHoverInfo = useMemo(() => {
    if (hoveredSlice !== null && currentDonutData[hoveredSlice]) {
      return currentDonutData[hoveredSlice];
    }
    return null;
  }, [hoveredSlice, currentDonutData]);

  return (
    <div className="mt-5 mb-5 animate-fade-in">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold m-0 text-dark">Portföy Analizi</h2>
          <p className="text-muted small m-0 mt-1">Mevcut hisse dağılımları ve kurum bazlı finansal özetler</p>
        </div>
        <div className="d-flex align-items-center gap-1 bg-light bg-opacity-50 p-1 rounded-pill" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
          <Button
            variant="light"
            size="sm"
            onClick={() => { setChartLayout('hisse'); setHoveredSlice(null); }}
            className={`rounded-pill px-3 py-1 fw-bold border-0 transition-all ${chartLayout === 'hisse' ? 'bg-white shadow-sm text-primary' : 'bg-transparent text-muted'}`}
            style={{ fontSize: '12px' }}
          >
            <PieChart size={14} className="me-1" /> Hisse Dağılımı
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={() => { setChartLayout('kurum'); setHoveredSlice(null); }}
            className={`rounded-pill px-3 py-1 fw-bold border-0 transition-all ${chartLayout === 'kurum' ? 'bg-white shadow-sm text-primary' : 'bg-transparent text-muted'}`}
            style={{ fontSize: '12px' }}
          >
            <Briefcase size={14} className="me-1" /> Kurum Dağılımı
          </Button>
        </div>
      </div>

      <Row className="g-4">
        <Col lg={5} md={12}>
          <Card className="glass-card border shadow-sm p-4 h-100 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '380px' }}>
            <div className="w-100 d-flex justify-content-between align-items-center mb-3">
              <span className="x-small fw-bold text-muted opacity-75 text-uppercase">
                {chartLayout === 'hisse' ? 'HİSSE DAĞILIMI' : 'KURUMSAL DAĞILIM'}
              </span>
              <span className="x-small text-muted">Halka üzerine geliniz</span>
            </div>
            
            {currentDonutData.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <div className="opacity-50 mb-2"><PieChart size={32} /></div>
                <div className="small">Görüntülenecek veri bulunamadı</div>
              </div>
            ) : (
              <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: '220px', height: '220px' }}>
                <svg viewBox="0 0 160 160" width="100%" height="100%">
                  <circle cx="80" cy="80" r="50" fill="transparent" stroke="rgba(0,0,0,0.03)" strokeWidth="15" />
                  {currentDonutData.map((d, i) => (
                    <circle
                      key={d.id}
                      cx="80"
                      cy="80"
                      r="50"
                      fill="transparent"
                      stroke={d.color}
                      strokeWidth={hoveredSlice === i ? 18 : 15}
                      strokeDasharray={`${d.strokeLength} 314.159`}
                      strokeDashoffset={d.strokeOffset}
                      strokeLinecap="round"
                      className="transition-all"
                      style={{ 
                        cursor: 'pointer',
                        filter: hoveredSlice === i ? 'drop-shadow(0px 4px 8px rgba(0,0,0,0.15))' : 'none'
                      }}
                      onMouseEnter={() => setHoveredSlice(i)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  ))}
                </svg>
                
                <div className="position-absolute text-center d-flex flex-column align-items-center justify-content-center" style={{ width: '130px', height: '130px', borderRadius: '50%', pointerEvents: 'none' }}>
                  {activeHoverInfo ? (
                    <>
                      <span className="fw-bold text-dark fs-14 text-truncate px-2 w-100">{activeHoverInfo.name}</span>
                      <span className="text-muted fs-11 mt-0.5">{activeHoverInfo.percentageVal.toFixed(1)}%</span>
                      <span className="fw-bold text-primary fs-14 mt-1">
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(activeHoverInfo.value)}₺
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-muted fs-10 text-uppercase fw-bold opacity-75">TOPLAM DEĞER</span>
                      <span className="fw-bold text-dark fs-18 mt-1">
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(currentTotalValue)}₺
                      </span>
                      <span className={`fw-bold fs-11 mt-1 ${chartLayout === 'hisse' ? (totalStockProfit >= 0 ? 'text-success' : 'text-danger') : (totalInstProfit >= 0 ? 'text-success' : 'text-danger')}`}>
                        {chartLayout === 'hisse' ? (overallStockProfitPercent >= 0 ? '+' : '') : (overallInstProfitPercent >= 0 ? '+' : '')}
                        {chartLayout === 'hisse' ? overallStockProfitPercent.toFixed(2) : overallInstProfitPercent.toFixed(2)}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </Card>
        </Col>

        <Col lg={7} md={12}>
          <Card className="glass-card border shadow-sm p-4 h-100 d-flex flex-column justify-content-between" style={{ minHeight: '380px' }}>
            <div>
              <div className="d-flex align-items-center justify-content-between mb-4">
                <span className="x-small fw-bold text-muted opacity-75 text-uppercase">
                  {chartLayout === 'hisse' ? 'HİSSE DETAYLARI VE KAR/ZARAR' : 'KURUMSAL ÖZETLER'}
                </span>
                <Badge bg="primary" className="rounded-pill opacity-75 px-3 py-1 fs-11">
                  {chartLayout === 'hisse' ? `${activeStocks.length} Aktif Hisse` : `${activeInstitutions.length} Aktif Kurum`}
                </Badge>
              </div>

              {chartLayout === 'hisse' ? (
                activeStocks.length === 0 ? (
                  <div className="text-center py-5 text-muted small">Aktif portföy bulunmamaktadır</div>
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
                        {stockDonutData.map((d, i) => (
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
                            <td className="text-end text-muted">{new Intl.NumberFormat('tr-TR').format(d.quantity)} Lot</td>
                            <td className="text-end fw-medium">{d.percentageVal.toFixed(1)}%</td>
                            <td className={`text-end pe-2 fw-bold ${d.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                              <div className="d-flex flex-column align-items-end">
                                <span>{d.profit >= 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.profit)}₺</span>
                                <span style={{ fontSize: '9px' }} className="opacity-75">({d.percentage >= 0 ? '+' : ''}{d.percentage.toFixed(2)}%)</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
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
                          <th className="text-end pe-2" style={{ width: '20%' }}>TOPLAM KAZANÇ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {instDonutData.map((d, i) => (
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
                              {d.profit >= 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(d.profit)}₺
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
                      {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(chartLayout === 'hisse' ? totalStockCost : totalInstCost)}₺
                    </div>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className="bg-light bg-opacity-25 rounded-3 p-2 text-center border">
                    <div className="text-muted x-small opacity-75" style={{ fontSize: '9px' }}>PORTFÖY DEĞERİ</div>
                    <div className="fw-bold text-primary mt-1 fs-12">
                      {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(chartLayout === 'hisse' ? totalStockValue : totalInstValue)}₺
                    </div>
                  </div>
                </Col>
                <Col xs={4}>
                  <div className={`rounded-3 p-2 text-center border ${chartLayout === 'hisse' ? (totalStockProfit >= 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger') : (totalInstProfit >= 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger')}`}>
                    <div className="x-small opacity-75" style={{ fontSize: '9px' }}>NET KAR/ZARAR</div>
                    <div className="fw-bold mt-1 fs-12">
                      {chartLayout === 'hisse' ? (totalStockProfit >= 0 ? '+' : '') : (totalInstProfit >= 0 ? '+' : '')}
                      {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(chartLayout === 'hisse' ? totalStockProfit : totalInstProfit)}₺
                    </div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FinanceTransactionsPage;
