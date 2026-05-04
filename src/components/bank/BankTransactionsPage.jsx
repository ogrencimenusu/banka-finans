import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  doc, 
  setDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { Button, Form, Card, Row, Col, Table, Badge, Dropdown, Modal } from 'react-bootstrap';
import { 
  Trash2, 
  Plus, 
  Settings, 
  ArrowUpDown,
  Wallet,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
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
  Rows,
  PaintRoller,
  CircleDot,
  CircleDollarSign,
  Link2,
  ChevronsUpDown,
  Check,
  X,
  Table as TableIcon,
  List,
  Banknote,
  CreditCard,
  EyeOff,
  WrapText,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

// Dnd Kit Imports
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
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

const PROPERTIES = [
  { id: 'date', label: 'Date', icon: <Calendar size={14} /> },
  { id: 'title', label: 'İşlem Adı', icon: <Type size={14} /> },
  { id: 'quickActions', label: 'Hızlı İşlemler', icon: <List size={14} /> },
  { id: 'type', label: 'İşlem Türü', icon: <CircleDot size={14} /> },
  { id: 'amount', label: 'Tutar', icon: <Banknote size={14} /> },
  { id: 'receiptUrl', label: 'Dekont', icon: <Link2 size={14} /> },
  { id: 'bankId', label: 'Bankalar', icon: <Landmark size={14} /> },
  { id: 'amountKK', label: 'Tutar KK', icon: <CreditCard size={14} /> },
];

const ICON_LIST = [
  { name: 'Calendar', icon: <Calendar size={14} /> },
  { name: 'Type', icon: <Type size={14} /> },
  { name: 'List', icon: <List size={14} /> },
  { name: 'CircleDot', icon: <CircleDot size={14} /> },
  { name: 'Banknote', icon: <Banknote size={14} /> },
  { name: 'Link2', icon: <Link2 size={14} /> },
  { name: 'Landmark', icon: <Landmark size={14} /> },
  { name: 'CreditCard', icon: <CreditCard size={14} /> },
  { name: 'Sparkles', icon: <Sparkles size={14} /> },
  { name: 'Zap', icon: <Zap size={14} /> },
  { name: 'Wallet', icon: <Wallet size={14} /> },
  { name: 'BanknoteIcon', icon: <Banknote size={14} /> },
];

const getPropertyIcon = (id, config) => {
  const customIconName = config.propertyIcons?.[id];
  if (customIconName) {
    const found = ICON_LIST.find(i => i.name === customIconName);
    if (found) return found.icon;
  }
  return PROPERTIES.find(p => p.id === id)?.icon;
};

const SortablePropertyItem = ({ prop, isVisible, toggleVisibility, icon }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: prop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="d-flex align-items-center justify-content-between py-1 px-2 hover-bg-light rounded-2 group"
    >
      <div className="d-flex align-items-center gap-2">
        <div {...attributes} {...listeners} className="cursor-grab text-muted opacity-25 group-hover-visible" style={{ cursor: 'grab' }}>
          <GripVertical size={14} />
        </div>
        <div className="text-muted d-flex align-items-center">{icon}</div>
        <span style={{ fontSize: '14px' }}>{prop.label}</span>
      </div>
      <div className="cursor-pointer d-flex align-items-center" onClick={(e) => { e.stopPropagation(); toggleVisibility(prop.id); }}>
        {isVisible ? <Eye size={16} className="text-dark" /> : <Eye size={16} className="text-muted opacity-25" />}
      </div>
    </div>
  );
};

const SortableTransactionRow = ({ t, config, selectedIds, onSelect, renderCell, isWrapped }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: t.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1001 : 'auto',
    opacity: isDragging ? 0.5 : 1,
    position: 'relative'
  };

  const isSelected = selectedIds.includes(t.id);

  return (
    <tr ref={setNodeRef} style={style} className="align-middle group">
      <td className="ps-2">
        <div 
          className={`d-flex align-items-center gap-2 ${isSelected ? 'opacity-100' : 'group-hover-visible'}`} 
          style={{ width: '50px' }}
        >
          <div {...listeners} {...attributes} className="cursor-grab text-muted opacity-25 hover-opacity-100"><GripVertical size={14} /></div>
          <Form.Check 
            type="checkbox" 
            className="notion-checkbox custom-checkbox-sm" 
            checked={isSelected}
            onChange={(e) => onSelect(t.id, e.target.checked)}
          />
        </div>
      </td>
      {(config.propertyOrder || PROPERTIES.map(p => p.id))
        .filter(id => config.propertyVisibility?.[id] !== false)
        .map(id => renderCell(id, t))}
    </tr>
  );
};

const SortableTagItem = ({ tag, type, isSelected, onClick, getTagStyle, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(tag.name);
  const [editColor, setEditColor] = useState(tag.color || 'Default');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: tag.name, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1001 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = (e) => {
    if (e) e.stopPropagation();
    if (editValue && (editValue !== tag.name || editColor !== (tag.color || 'Default'))) {
      onUpdate(tag.name, editValue, editColor);
    }
    setIsEditing(false);
  };

  const selectedColorObj = COLORS.find(c => c.name === editColor) || COLORS[0];

  return (
    <div 
      ref={setNodeRef}
      style={{
        ...style,
        cursor: isEditing ? 'default' : 'pointer',
        fontSize: '14px',
        backgroundColor: isEditing ? selectedColorObj.bg : undefined
      }}
      className={`d-flex flex-column p-1 rounded-1 notion-option-item group ${isEditing ? 'shadow-sm' : ''}`}
      onClick={!isEditing ? onClick : undefined}
    >
      <div className="d-flex align-items-center justify-content-between w-100">
        <div className="d-flex align-items-center gap-2 flex-grow-1">
          <div {...listeners} style={{ cursor: isEditing ? 'default' : 'grab' }}>
            <GripVertical size={12} className="text-muted opacity-25" />
          </div>
          {isEditing ? (
            <Form.Control 
              size="sm" 
              value={editValue} 
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave(e)}
              autoFocus
              className="border-0 bg-white py-0 px-1 shadow-sm"
              style={{ fontSize: '14px', height: '24px' }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="notion-tag m-0" style={getTagStyle(type, tag.name)}>{tag.name}</span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          {isEditing ? (
            <div className="d-flex align-items-center gap-1">
              <div 
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setIsEditing(false); setEditValue(tag.name); setEditColor(tag.color || 'Default'); }} 
                className="p-1 hover-bg-light rounded cursor-pointer"
              >
                <X size={14} className="text-danger" />
              </div>
              <div 
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSave(e); }} 
                className="p-1 hover-bg-light rounded cursor-pointer"
              >
                <Check size={14} className="text-success" />
              </div>
            </div>
          ) : (
            <div className="d-flex align-items-center gap-1 opacity-0 group-hover-opacity-100">
              <div 
                className="edit-trigger" 
                onClick={(e) => { e.stopPropagation(); if (window.confirm('Bu etiketi silmek istediğinize emin misiniz?')) onDelete(tag.name); }}
              >
                <Trash2 size={12} className="text-danger" />
              </div>
              <div 
                className="edit-trigger" 
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              >
                <Edit2 size={12} className="text-muted" />
              </div>
            </div>
          )}
          {isSelected && !isEditing && <Check size={14} className="text-primary" />}
        </div>
      </div>

      {isEditing && (
        <div className="mt-2 p-1 pt-2 border-top w-100">
          <div className="text-muted x-small mb-1 ps-1" style={{ fontSize: '11px' }}>Select Color</div>
          <div className="d-flex flex-wrap gap-2 ps-1" style={{ maxWidth: '240px' }}>
            {COLORS.map((c) => (
              <div 
                key={c.name}
                className={`rounded border cursor-pointer ${editColor === c.name ? 'border-primary' : 'border-light'}`}
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: c.bg,
                  position: 'relative'
                }}
                onClick={(e) => { e.stopPropagation(); setEditColor(c.name); }}
                title={c.name}
              >
                {editColor === c.name && <div style={{ position: 'absolute', top: '2px', left: '2px', right: '2px', bottom: '2px', border: '2px solid white', borderRadius: '1px' }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SortableBankItem = ({ bank, balance, viewLayout, handleDeleteBank, onEditClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: bank.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1001 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  if (viewLayout === 'table') {
    return (
      <tr ref={setNodeRef} style={style} {...attributes} className="align-middle group">
        <td className="ps-4">
          <div className="d-flex align-items-center gap-2">
            {/* Actions on the left */}
            <div className="d-flex align-items-center gap-1 me-2">
              <div {...listeners} style={{ cursor: 'grab' }} className="text-muted opacity-25 group-hover-opacity-100">
                <GripVertical size={14} />
              </div>
              <div 
                onClick={() => onEditClick(bank)}
                className="text-muted opacity-25 group-hover-opacity-100 p-1" 
                style={{ cursor: 'pointer' }}
              >
                <Edit2 size={14} />
              </div>
              <div 
                onClick={() => handleDeleteBank(bank.id)}
                className="text-danger opacity-25 group-hover-opacity-100 p-1" 
                style={{ cursor: 'pointer' }}
              >
                <Trash2 size={14} />
              </div>
            </div>
            {bank.logo ? <img src={bank.logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain' }} /> : <Landmark size={18} className="text-muted" />}
            <span className="fw-bold" style={{ fontSize: '16px' }}>{bank.name}</span>
          </div>
        </td>
        <td className="fw-medium" style={{ fontSize: '15px' }}>
          {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(balance)}
        </td>
        <td></td>
        <td className="text-end pe-4">
          {/* Empty spacer for alignment if needed, but actions are already on the left */}
        </td>
      </tr>
    );
  }

  if (viewLayout === 'gallery_advanced') {
    return (
      <Col ref={setNodeRef} style={style} {...attributes}>
        <Card className="h-100 glass-card border-0 p-0 shadow-sm group position-relative overflow-hidden" style={{ borderRadius: '12px' }}>
          <div className="d-flex align-items-center justify-content-center bg-white border-bottom overflow-hidden p-0 position-relative" style={{ height: '120px' }}>
            {bank.logo ? (
              <img src={bank.logo} alt="" style={{ width: '100%', height: '100%', minWidth: '100%', objectFit: 'cover' }} />
            ) : (
              <Landmark size={40} className="text-muted opacity-25" />
            )}
            <div className="position-absolute top-0 end-0 p-1 d-flex gap-1 group-hover-visible" style={{ zIndex: 10, right: '5px', top: '5px' }}>
              <div {...listeners} style={{ cursor: 'grab', textShadow: '0 0 4px rgba(0,0,0,0.5)', width: '25px', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="text-white bg-dark bg-opacity-25 rounded">
                <GripVertical size={14} />
              </div>
              <div 
                onClick={() => onEditClick(bank)}
                style={{ cursor: 'pointer', textShadow: '0 0 4px rgba(0,0,0,0.5)', width: '25px', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                className="text-white bg-dark bg-opacity-25 rounded"
              >
                <Edit2 size={14} />
              </div>
              <div 
                onClick={() => handleDeleteBank(bank.id)}
                style={{ cursor: 'pointer', textShadow: '0 0 4px rgba(0,0,0,0.5)', width: '25px', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                className="text-white bg-danger bg-opacity-50 rounded"
              >
                <Trash2 size={14} />
              </div>
            </div>
          </div>
          <div className="p-2 text-center">
            <div className="fw-bold mb-0" style={{ fontSize: '16px' }}>{bank.name}</div>
            <div className="text-muted" style={{ fontSize: '15px' }}>{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(balance)}</div>
          </div>
        </Card>
      </Col>
    );
  }

  // Default: gallery_basic
  return (
    <Col ref={setNodeRef} style={style} {...attributes}>
      <Card className="glass-card border-0 p-3 shadow-sm position-relative group" style={{ borderRadius: '12px' }}>
        <div className="d-flex align-items-center mb-2">
          <div className="d-flex align-items-center gap-2">
            <div className="rounded bg-white shadow-sm overflow-hidden" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 !important' }}>
              {bank.logo ? <img src={bank.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Landmark size={14} className="text-muted" />}
            </div>
            <span className="fw-bold" style={{ fontSize: '16px' }}>{bank.name}</span>
          </div>
          <div className="position-absolute d-flex align-items-center gap-1 group-hover-visible" style={{ right: '5px', top: '5px', paddingRight: '5px' }}>
            <div {...listeners} style={{ cursor: 'grab' }} className="text-muted p-1">
              <GripVertical size={14} />
            </div>
            <div 
              onClick={() => onEditClick(bank)}
              style={{ cursor: 'pointer' }} 
              className="text-muted p-1"
            >
              <Edit2 size={14} />
            </div>
            <div 
              onClick={() => handleDeleteBank(bank.id)}
              style={{ cursor: 'pointer' }} 
              className="text-danger p-1"
            >
              <Trash2 size={14} />
            </div>
          </div>
        </div>
        <div className="fw-medium text-muted" style={{ fontSize: '15px' }}>
          {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(balance)}
        </div>
      </Card>
    </Col>
  );
};

const BankTransactionsPage = () => {
  const { user } = useAuth();
  const [banks, setBanks] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [config, setConfig] = useState({ 
    quickActions: [], 
    types: [], 
    viewLayout: 'gallery_basic',
    propertyOrder: PROPERTIES.map(p => p.id),
    propertyVisibility: PROPERTIES.reduce((acc, p) => ({ ...acc, [p.id]: true }), {})
  });
  const [settingsView, setSettingsView] = useState('main');
  const [propSearch, setPropSearch] = useState('');
  
  // Layout state
  const viewLayout = config.viewLayout || 'gallery_basic';

  // Dnd Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const selectAllRef = React.useRef(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedIds.length > 0 && selectedIds.length < transactions.length;
    }
  }, [selectedIds, transactions]);

  // Transaction Form State
  const [selectedBankId, setSelectedBankId] = useState('all');
  const [title, setTitle] = useState('');
  const [selectedQuickActions, setSelectedQuickActions] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [amount, setAmount] = useState('');
  const [amountKK, setAmountKK] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Bank Management State
  const [showBankModal, setShowBankModal] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankLogo, setNewBankLogo] = useState('');

  // Editing State
  const [editingBank, setEditingBank] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBankName, setEditBankName] = useState('');
  const [editBankLogo, setEditBankLogo] = useState('');

  // Modal State for Tags
  const [showTagModal, setShowTagModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [activeTagType, setActiveTagType] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [bankSearch, setBankSearch] = useState('');

  useEffect(() => {
    if (!user) return;

    // Banks
    const unsubBanks = onSnapshot(collection(db, `users/${user.uid}/banks`), (snap) => {
      const bItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'banks' }));
      setBanks(prev => {
        const otherSourceBanks = prev.filter(b => b.source !== 'banks');
        const all = [...otherSourceBanks, ...bItems];
        // Deduplicate by ID, prioritizing items with names (avoiding empty placeholder docs)
        const unique = {};
        all.forEach(b => {
          if (!unique[b.id] || (b.name && !unique[b.id].name)) {
            unique[b.id] = b;
          }
        });
        return Object.values(unique)
          .filter(b => b.deleted !== true)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      });
    });

    const unsubBanka = onSnapshot(collection(db, `users/${user.uid}/banka`), (snap) => {
      const bItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'banka' }));
      setBanks(prev => {
        const otherSourceBanks = prev.filter(b => b.source !== 'banka');
        const all = [...otherSourceBanks, ...bItems];
        // Deduplicate by ID, prioritizing items with names
        const unique = {};
        all.forEach(b => {
          if (!unique[b.id] || (b.name && !unique[b.id].name)) {
            unique[b.id] = b;
          }
        });
        return Object.values(unique)
          .filter(b => b.deleted !== true)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      });
    });

    // Transactions
    const unsubTrans = onSnapshot(query(collection(db, `users/${user.uid}/bankTransactions`), orderBy('createdAt', 'desc')), (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(t => t.deleted !== true));
    });

    // Config
    const unsubConfig = onSnapshot(doc(db, `users/${user.uid}/config`, 'bankSettings'), (snap) => {
      if (snap.exists()) setConfig(prev => ({ ...prev, ...snap.data() }));
    });

    return () => { unsubBanks(); unsubBanka(); unsubTrans(); unsubConfig(); };
  }, [user]);

  const calculateBalance = (bankId) => {
    return transactions
      .filter(t => t.bankId === bankId)
      .reduce((sum, t) => {
        let val = t.amount;
        if (typeof val === 'string') {
          val = parseFloat(val.replace(/\./g, '').replace(',', '.'));
        }
        return sum + (val || 0);
      }, 0);
  };

  const totalBalance = banks.reduce((sum, bank) => sum + calculateBalance(bank.id), 0);

  const handleUpdateLayout = async (layout) => {
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, viewLayout: layout }, { merge: true });
  };

  const filteredTransactions = transactions.filter(t => {
    if (selectedBankId === 'all') return true;
    return t.bankId === selectedBankId;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (!config.sortConfig) return (b.order || 0) - (a.order || 0);
    const { propId, direction } = config.sortConfig;
    
    let valA = a[propId];
    let valB = b[propId];

    // Special handling for data types
    if (propId === 'date') {
      valA = new Date(valA || '1970-01-01');
      valB = new Date(valB || '1970-01-01');
    } else if (propId === 'amount' || propId === 'amountKK') {
      valA = parseFloat(valA || 0);
      valB = parseFloat(valB || 0);
    } else if (propId === 'bankId') {
      valA = getBankInfo(valA).name || '';
      valB = getBankInfo(valB).name || '';
    } else {
      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!selectedBankId || !title || (!amount && !amountKK)) return;
    await addDoc(collection(db, `users/${user.uid}/bankTransactions`), {
      bankId: selectedBankId, 
      title, 
      quickActions: selectedQuickActions, 
      type: selectedType, 
      amount, 
      amountKK,
      receiptUrl, 
      date, 
      createdAt: new Date(), 
      deleted: false
    });
    setTitle(''); setSelectedQuickActions([]); setSelectedType(''); setAmount(''); setAmountKK(''); setReceiptUrl('');
    setShowTransactionModal(false);
  };

  const handleAddBank = async (e) => {
    e.preventDefault();
    if (!newBankName) return;
    const maxOrder = banks.reduce((max, b) => Math.max(max, b.order || 0), 0);
    await addDoc(collection(db, `users/${user.uid}/banks`), {
      name: newBankName, logo: newBankLogo, createdAt: new Date(), deleted: false, order: maxOrder + 1
    });
    setNewBankName(''); setNewBankLogo(''); setShowBankModal(false);
  };

  const handleEditClick = (bank) => {
    setEditingBank(bank);
    setEditBankName(bank.name);
    setEditBankLogo(bank.logo || '');
    setShowEditModal(true);
  };

  const handleUpdateBank = async (e) => {
    e.preventDefault();
    if (!editingBank || !editBankName) return;
    const collectionName = editingBank.source || 'banks';
    await updateDoc(doc(db, `users/${user.uid}/${collectionName}`, editingBank.id), {
      name: editBankName,
      logo: editBankLogo
    });
    setShowEditModal(false);
    setEditingBank(null);
  };

  const handleDeleteTransaction = async (id) => {
    if (window.confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
      await updateDoc(doc(db, `users/${user.uid}/bankTransactions`, id), { deleted: true });
    }
  };

  const handleDeleteBank = async (id) => {
    if (window.confirm('Bu bankayı silmek istediğinize emin misiniz?')) {
      const bank = banks.find(b => b.id === id);
      const collectionName = bank?.source || 'banks';
      await updateDoc(doc(db, `users/${user.uid}/${collectionName}`, id), { deleted: true });
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`${selectedIds.length} işlemi silmek istediğinize emin misiniz?`)) {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.update(doc(db, `users/${user.uid}/bankTransactions`, id), { deleted: true });
      });
      await batch.commit();
      setSelectedIds([]);
    }
  };

  const handleBulkUpdateDate = async (newDate) => {
    if (!newDate) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id => {
      batch.update(doc(db, `users/${user.uid}/bankTransactions`, id), { date: newDate });
    });
    await batch.commit();
  };

  const handleBulkUpdateBank = async (bankId) => {
    const batch = writeBatch(db);
    selectedIds.forEach(id => {
      batch.update(doc(db, `users/${user.uid}/bankTransactions`, id), { bankId });
    });
    await batch.commit();
  };

  const handleTransactionDragEnd = async (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = transactions.findIndex(t => t.id === active.id);
      const newIndex = transactions.findIndex(t => t.id === over.id);
      const updatedTransactions = arrayMove(transactions, oldIndex, newIndex);
      
      setTransactions(updatedTransactions);

      const batch = writeBatch(db);
      updatedTransactions.forEach((t, index) => {
        batch.update(doc(db, `users/${user.uid}/bankTransactions`, t.id), { order: index });
      });
      await batch.commit();
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = banks.findIndex((bank) => bank.id === active.id);
      const newIndex = banks.findIndex((bank) => bank.id === over.id);
      
      const newBanks = arrayMove(banks, oldIndex, newIndex);
      setBanks(newBanks);

      // Update Firestore in batch
      const batch = writeBatch(db);
      newBanks.forEach((bank, index) => {
        // Use the source property to determine which collection to update
        const collectionName = bank.source || 'banks';
        const bankRef = doc(db, `users/${user.uid}/${collectionName}`, bank.id);
        batch.update(bankRef, { order: index });
      });
      await batch.commit();
    }
  };

  const handleAutoSort = async (type) => {
    let sortedBanks = [...banks];
    if (type === 'name') {
      sortedBanks.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    } else if (type === 'date') {
      sortedBanks.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA; // Newest first
      });
    }

    // Update Firestore in batch
    const batch = writeBatch(db);
    sortedBanks.forEach((bank, index) => {
      const collectionName = bank.source || 'banks';
      const bankRef = doc(db, `users/${user.uid}/${collectionName}`, bank.id);
      batch.update(bankRef, { order: index });
    });
    await batch.commit();
  };

  const normalizeTags = (tags) => {
    if (!tags) return [];
    return tags.map(tag => typeof tag === 'string' ? { name: tag, color: 'Gray' } : tag);
  };

  const updateTag = async (type, name, color, mode = 'add') => {
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    let updatedList = normalizeTags(config[type] || []);
    if (mode === 'add') {
      const existing = updatedList.find(i => i.name === name);
      if (existing) existing.color = color; else updatedList.push({ name, color });
    } else {
      updatedList = updatedList.filter(item => item.name !== name);
    }
    await setDoc(configRef, { ...config, [type]: updatedList }, { merge: true });
  };

  const handleReorderTags = async (type, oldIndex, newIndex) => {
    const updatedList = arrayMove(normalizeTags(config[type] || []), oldIndex, newIndex);
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, [type]: updatedList }, { merge: true });
  };

  const handleUpdateTag = async (type, oldName, newName, newColor) => {
    const list = normalizeTags(config[type] || []);
    const updatedList = list.map(t => t.name === oldName ? { ...t, name: newName, color: newColor } : t);
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, [type]: updatedList }, { merge: true });
  };

  const handleDeleteTag = async (type, tagName) => {
    // 1. Check usages in transactions
    const usages = transactions.filter(t => {
      const targetName = tagName.trim().toLowerCase();
      if (type === 'quickActions') {
        return Array.isArray(t.quickActions) && t.quickActions.some(a => a.trim().toLowerCase() === targetName);
      } else if (type === 'types') {
        return t.type && t.type.trim().toLowerCase() === targetName;
      }
      return false;
    });

    const confirmMsg = usages.length > 0 
      ? `Bu etiket ${usages.length} işlemde kullanılıyor. Silerseniz bu işlemlerden de kaldırılacaktır. Devam etmek istiyor musunuz?`
      : 'Bu etiketi silmek istediğinize emin misiniz?';

    if (window.confirm(confirmMsg)) {
      // 2. Remove tag from config
      const list = normalizeTags(config[type] || []);
      const updatedList = list.filter(t => t.name !== tagName);
      const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
      await setDoc(configRef, { ...config, [type]: updatedList }, { merge: true });

      // 3. Clean up transactions if needed
      if (usages.length > 0) {
        const batch = writeBatch(db);
        usages.forEach(t => {
          const transRef = doc(db, `users/${user.uid}/bankTransactions`, t.id);
          if (type === 'quickActions') {
            const newActions = (t.quickActions || []).filter(a => a !== tagName);
            batch.update(transRef, { quickActions: newActions });
          } else if (type === 'types') {
            batch.update(transRef, { type: '' });
          }
        });
        await batch.commit();
      }
    }
  };

  const handleUpdatePropertyVisibility = async (propId, isVisible) => {
    const updatedVisibility = { ...(config.propertyVisibility || {}), [propId]: isVisible };
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, propertyVisibility: updatedVisibility }, { merge: true });
  };

  const handleUpdatePropertyLabel = async (propId, newLabel) => {
    const updatedLabels = { ...(config.propertyLabels || {}), [propId]: newLabel };
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, propertyLabels: updatedLabels }, { merge: true });
  };

  const handleUpdatePropertyIcon = async (propId, iconName) => {
    const updatedIcons = { ...(config.propertyIcons || {}), [propId]: iconName };
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, propertyIcons: updatedIcons }, { merge: true });
  };

  const handleToggleWrap = async (propId) => {
    const updatedWrap = { ...(config.propertyWrap || {}), [propId]: !config.propertyWrap?.[propId] };
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, propertyWrap: updatedWrap }, { merge: true });
  };

  const handleSort = async (propId, direction) => {
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, sortConfig: { propId, direction } }, { merge: true });
  };

  const handleUpdatePropertyOrder = async (oldIndex, newIndex) => {
    const order = config.propertyOrder || PROPERTIES.map(p => p.id);
    const updatedOrder = arrayMove(order, oldIndex, newIndex);
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, propertyOrder: updatedOrder }, { merge: true });
  };

  const toggleAllProperties = async (visible) => {
    const updatedVisibility = PROPERTIES.reduce((acc, p) => ({ ...acc, [p.id]: visible }), {});
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, propertyVisibility: updatedVisibility }, { merge: true });
  };

  const getBankInfo = (id) => banks.find(b => b.id === id) || {};
  const getTagStyle = (type, name) => {
    const tags = normalizeTags(config[type] || []);
    const tag = tags.find(i => i.name === name);
    const color = COLORS.find(c => c.name === tag?.color) || COLORS[0];
    return { backgroundColor: color.bg, color: color.text };
  };

  const renderCell = (propId, t) => {
    const bank = getBankInfo(t.bankId);
    const displayDate = t.date ? t.date.split('-').reverse().join('/') : '';
    const isWrapped = config.propertyWrap?.[propId] !== false; // Default to true
    
    const cellStyle = isWrapped ? {} : { 
      whiteSpace: 'nowrap', 
      overflow: 'hidden', 
      textOverflow: 'ellipsis', 
      maxWidth: propId === 'title' ? '300px' : '200px' 
    };

    switch (propId) {
      case 'date': return <td key={propId} className="text-muted small" style={cellStyle}>{displayDate}</td>;
      case 'title': return (
        <td key={propId} className="fw-bold" style={cellStyle}>
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <span className={!isWrapped ? 'text-truncate' : ''}>{t.title}</span>
          </div>
        </td>
      );
      case 'quickActions': return (
        <td key={propId} style={cellStyle}>
          <div className={`d-flex gap-1 ${isWrapped ? 'flex-wrap' : 'overflow-hidden'}`}>
            {t.quickActions?.map((a, i) => (
              <span key={i} className="notion-tag m-0 text-nowrap" style={getTagStyle('quickActions', a)}>{a}</span>
            ))}
          </div>
        </td>
      );
      case 'type': return <td key={propId} style={cellStyle}><span className="notion-tag m-0" style={getTagStyle('types', t.type)}>{t.type}</span></td>;
      case 'amount': return (
        <td key={propId} className="fw-medium" style={cellStyle}>
          {formatCurrency(t.amount)}
        </td>
      );
      case 'amountKK': return (
        <td key={propId} className="fw-medium text-muted" style={cellStyle}>
          {t.amountKK ? formatCurrency(t.amountKK) : '-'}
        </td>
      );
      case 'receiptUrl': return (
        <td key={propId} style={cellStyle}>
          {t.receiptUrl && (
            <a href={t.receiptUrl} target="_blank" rel="noreferrer" className="text-muted text-decoration-none small d-inline-block text-truncate" style={{ maxWidth: '120px' }}>
              {t.receiptUrl.replace('https://', '').substring(0, 20)}...
            </a>
          )}
        </td>
      );
      case 'bankId': return (
        <td key={propId} style={cellStyle}>
          <div className="d-flex align-items-center gap-2 small">
            {bank.logo ? (
              <img src={bank.logo} alt="" width="18" height="18" className="object-fit-contain rounded-circle" />
            ) : (
              <Landmark size={14} className="text-muted" />
            )}
            <span className={!isWrapped ? 'text-truncate' : ''}>{bank.name}</span>
          </div>
        </td>
      );
      default: return <td key={propId} style={cellStyle}></td>;
    }
  };

  const formatCurrency = (value) => {
    let num = value;
    if (typeof num === 'string') {
      num = parseFloat(num.replace(/\./g, '').replace(',', '.'));
    }
    if (isNaN(num)) return '0,00';
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  return (
    <div className="pb-5">
      <div className="mb-4">
        <h1 className="fw-bold mb-4">Banka</h1>
        
        {/* Gallery/Table Switcher Header */}
        <div className="d-flex align-items-center justify-content-between mb-4" style={{ position: 'relative', zIndex: 1000 }}>
          <div className="d-flex align-items-center gap-1">
            <Button 
              variant="light" 
              size="sm" 
              onClick={() => handleUpdateLayout('gallery_basic')}
              className={`d-flex align-items-center gap-2 rounded-pill px-3 py-1 fw-medium small border-0 ${viewLayout === 'gallery_basic' ? 'bg-white shadow-sm' : 'bg-transparent text-muted'}`}
            >
              <LayoutGrid size={16} /> Galeri Basit
            </Button>
            <Button 
              variant="light" 
              size="sm" 
              onClick={() => handleUpdateLayout('table')}
              className={`d-flex align-items-center gap-2 rounded-pill px-3 py-1 fw-medium small border-0 ${viewLayout === 'table' ? 'bg-white shadow-sm' : 'bg-transparent text-muted'}`}
            >
              <ListIcon size={16} /> Tablo
            </Button>
            <Button 
              variant="light" 
              size="sm" 
              onClick={() => handleUpdateLayout('gallery_advanced')}
              className={`d-flex align-items-center gap-2 rounded-pill px-3 py-1 fw-medium small border-0 ${viewLayout === 'gallery_advanced' ? 'bg-white shadow-sm' : 'bg-transparent text-muted'}`}
            >
              <LayoutGrid size={16} /> Galeri Gelişmiş
            </Button>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-3 text-muted opacity-75">
              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret" style={{ cursor: 'pointer' }}>
                  <ArrowUpDown size={18} />
                </Dropdown.Toggle>
                <Dropdown.Menu className="glass-card border-0 shadow-lg p-2" style={{ width: '220px' }}>
                  <div className="px-3 py-1 mb-1 small fw-bold text-muted opacity-50" style={{ fontSize: '10px' }}>SIRALAMA SEÇENEKLERİ</div>
                  <Dropdown.Item onClick={() => handleAutoSort('name')} className="rounded-2 d-flex align-items-center gap-2">
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '25px', height: '25px', minWidth: '25px', minHeight: '25px' }}><Type size={15} /></div> İsme Göre (A-Z)
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleAutoSort('date')} className="rounded-2 d-flex align-items-center gap-2">
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '25px', height: '25px', minWidth: '25px', minHeight: '25px' }}><Calendar size={15} /></div> Eklenme Tarihi
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              
              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret" style={{ cursor: 'pointer' }}>
                  <SlidersHorizontal size={20} />
                </Dropdown.Toggle>
                <Dropdown.Menu className="glass-card border-0 shadow-lg p-2" style={{ width: '220px' }}>
                  <div className="px-3 py-1 mb-1 small fw-bold text-muted opacity-50" style={{ fontSize: '10px' }}>VIEW OPTIONS</div>
                  <Dropdown.Item onClick={() => handleUpdateLayout('gallery_basic')} className={`rounded-2 d-flex align-items-center gap-2 ${viewLayout === 'gallery_basic' ? 'bg-light' : ''}`}>
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '25px', height: '25px', minWidth: '25px', minHeight: '25px' }}><LayoutGrid size={15} /></div> Galeri Basit
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleUpdateLayout('table')} className={`rounded-2 d-flex align-items-center gap-2 ${viewLayout === 'table' ? 'bg-light' : ''}`}>
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '25px', height: '25px', minWidth: '25px', minHeight: '25px' }}><ListIcon size={15} /></div> Tablo
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleUpdateLayout('gallery_advanced')} className={`rounded-2 d-flex align-items-center gap-2 ${viewLayout === 'gallery_advanced' ? 'bg-light' : ''}`}>
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '25px', height: '25px', minWidth: '25px', minHeight: '25px' }}><LayoutGrid size={15} /></div> Galeri Gelişmiş
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setShowBankModal(true)}
              className="d-flex align-items-center gap-1 rounded-pill px-3 shadow-sm"
            >
              New <ChevronDown size={14} />
            </Button>
          </div>
        </div>

        {/* Banks Listing with Drag and Drop */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={banks.map(b => b.id)}
              strategy={viewLayout === 'table' ? verticalListSortingStrategy : rectSortingStrategy}
            >
              {viewLayout === 'table' ? (
                <div className="glass-card border-0 overflow-hidden mb-5 shadow-sm">
                  <Table responsive hover className="notion-table mb-0 border-top">
                    <thead>
                      <tr className="bg-light bg-opacity-10 text-muted smaller">
                        <th className="fw-medium ps-4 py-2"><Type size={14} className="me-2" /> Banka Adları</th>
                        <th className="fw-medium py-2"><Wallet size={14} className="me-2" /> Tutar</th>
                        <th className="py-2"><Plus size={14} /></th>
                        <th className="py-2 text-end pe-4"><MoreHorizontal size={14} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {banks.map(bank => (
                        <SortableBankItem 
                          key={bank.id} 
                          bank={bank} 
                          balance={calculateBalance(bank.id)} 
                          viewLayout="table"
                          handleDeleteBank={handleDeleteBank}
                          onEditClick={handleEditClick}
                        />
                      ))}
                      <tr className="align-middle text-muted opacity-50 border-top">
                         <td className="ps-4 py-3" style={{ fontSize: '15px' }}>
                            {banks.length} banka
                         </td>
                         <td className="fw-bold" style={{ fontSize: '15px' }}>
                            {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(totalBalance)}
                         </td>
                         <td></td>
                         <td></td>
                      </tr>
                    </tbody>
                  </Table>
                </div>
              ) : (
                <Row className="g-3 mb-5 row-cols-lg-6 row-cols-md-3 row-cols-2">
                  {banks.map(bank => (
                    <SortableBankItem 
                      key={bank.id} 
                      bank={bank} 
                      balance={calculateBalance(bank.id)} 
                      viewLayout={viewLayout}
                      handleDeleteBank={handleDeleteBank}
                      onEditClick={handleEditClick}
                    />
                  ))}
                  
                  {/* New Bank Placeholder */}
                  <Col>
                    <div 
                      className="h-100 glass-card border-0 d-flex flex-column justify-content-center p-2 text-muted opacity-50 border-dashed"
                      style={{ border: '1px dashed rgba(0,0,0,0.1)', cursor: 'pointer', minHeight: viewLayout === 'gallery_advanced' ? '180px' : '85px' }}
                      onClick={() => setShowBankModal(true)}
                    >
                      <div className="d-flex align-items-center gap-2 mb-1 justify-content-center">
                        <Plus size={14} /> <span style={{ fontSize: '16px' }}>Yeni Banka ekle</span>
                      </div>
                      <div className="text-center" style={{ fontSize: '15px' }}>
                        {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(totalBalance)} TL
                      </div>
                    </div>
                  </Col>
                </Row>
              )}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <hr className="my-5 opacity-5" />

      {/* Transactions Section */}
      <div className="d-flex justify-content-between align-items-center mb-4" style={{ position: 'relative', zIndex: 1000 }}>
        <h1 className="fw-bold m-0">Banka İşlemleri</h1>
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-3 text-muted opacity-75">
            <Dropdown align="end" className="d-inline">
              <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret" style={{ cursor: 'pointer' }}>
                <ListFilter size={18} />
              </Dropdown.Toggle>
              <Dropdown.Menu className="glass-card border-0 shadow-lg p-2" style={{ width: '220px' }}>
                <div className="px-3 py-1 mb-1 small fw-bold text-muted opacity-50" style={{ fontSize: '10px' }}>FİLTRELEME SEÇENEKLERİ</div>
                <Dropdown.Item className="rounded-2">Banka Filtrele</Dropdown.Item>
                <Dropdown.Item className="rounded-2">Tarih Filtrele</Dropdown.Item>
                <Dropdown.Item className="rounded-2">Etiket Filtrele</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>

            <Dropdown align="end" className="d-inline">
              <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret" style={{ cursor: 'pointer' }}>
                <ArrowUpDown size={18} />
              </Dropdown.Toggle>
              <Dropdown.Menu className="glass-card border-0 shadow-lg p-2" style={{ width: '220px' }}>
                <div className="px-3 py-1 mb-1 small fw-bold text-muted opacity-50" style={{ fontSize: '10px' }}>SIRALAMA SEÇENEKLERİ</div>
                <Dropdown.Item className="rounded-2 d-flex align-items-center gap-2">
                  Tarihe Göre (Yeni-Eski)
                </Dropdown.Item>
                <Dropdown.Item className="rounded-2 d-flex align-items-center gap-2">
                  Tarihe Göre (Eski-Yeni)
                </Dropdown.Item>
                <Dropdown.Item className="rounded-2 d-flex align-items-center gap-2">
                  Tutara Göre
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            <Dropdown align="end" className="d-inline" autoClose="outside" onToggle={(isOpen) => !isOpen && setSettingsView('main')}>
              <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret" style={{ cursor: 'pointer' }}>
                <SlidersHorizontal size={20} />
              </Dropdown.Toggle>
              <Dropdown.Menu className="glass-card border-0 shadow-lg p-0 overflow-hidden" style={{ width: '280px', zIndex: 10001 }}>
                {settingsView === 'main' ? (
                  <div className="p-2">
                    <Dropdown.Item onClick={() => setSettingsView('visibility')} className="rounded-2 d-flex align-items-center justify-content-between py-2">
                      <div className="d-flex align-items-center gap-2">
                        <Eye size={18} className="text-muted" />
                        <span>Property visibility</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 text-muted opacity-50">
                        <span>{Object.values(config.propertyVisibility || {}).filter(v => v).length}</span>
                        <ChevronRight size={14} />
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item className="rounded-2 d-flex align-items-center justify-content-between py-2">
                      <div className="d-flex align-items-center gap-2">
                        <ListFilter size={18} className="text-muted" />
                        <span>Filter</span>
                      </div>
                      <ChevronRight size={14} className="text-muted opacity-50" />
                    </Dropdown.Item>
                    <Dropdown.Item className="rounded-2 d-flex align-items-center justify-content-between py-2">
                      <div className="d-flex align-items-center gap-2">
                        <ArrowUpDown size={18} className="text-muted" />
                        <span>Sort</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 text-muted opacity-50">
                        <span>Date</span>
                        <ChevronRight size={14} />
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item className="rounded-2 d-flex align-items-center justify-content-between py-2">
                      <div className="d-flex align-items-center gap-2">
                        <Rows size={18} className="text-muted" />
                        <span>Group</span>
                      </div>
                      <ChevronRight size={14} className="text-muted opacity-50" />
                    </Dropdown.Item>
                    <Dropdown.Item className="rounded-2 d-flex align-items-center justify-content-between py-2">
                      <div className="d-flex align-items-center gap-2">
                        <PaintRoller size={18} className="text-muted" />
                        <span>Conditional color</span>
                      </div>
                      <ChevronRight size={14} className="text-muted opacity-50" />
                    </Dropdown.Item>
                    
                    <div className="dropdown-divider mx-2 opacity-10"></div>
                    
                    <div className="px-3 py-1 mt-2 mb-1 small fw-bold text-muted opacity-50" style={{ fontSize: '10px' }}>İŞLEM SEÇENEKLERİ</div>
                    <Dropdown.Item onClick={() => setShowTagModal(true)} className="rounded-2 d-flex align-items-center gap-2">
                      <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '25px', height: '25px', minWidth: '25px', minHeight: '25px' }}><Settings size={15} /></div> Etiketleri Yönet
                    </Dropdown.Item>
                  </div>
                ) : (
                  <div className="d-flex flex-column" style={{ maxHeight: '450px' }}>
                    <div className="p-2 d-flex align-items-center gap-2 border-bottom">
                      <div className="cursor-pointer p-1 hover-bg-light rounded" onClick={() => setSettingsView('main')}>
                        <X size={16} />
                      </div>
                      <span className="fw-bold flex-grow-1" style={{ fontSize: '14px' }}>Property visibility</span>
                    </div>
                    <div className="p-2">
                      <div className="overflow-auto" style={{ maxHeight: '400px' }}>
                        <DndContext 
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => {
                            const { active, over } = e;
                            if (active && over && active.id !== over.id) {
                              const order = config.propertyOrder || PROPERTIES.map(p => p.id);
                              const oldIdx = order.indexOf(active.id);
                              const newIdx = order.indexOf(over.id);
                              handleUpdatePropertyOrder(oldIdx, newIdx);
                            }
                          }}
                        >
                          <SortableContext 
                            items={config.propertyOrder || PROPERTIES.map(p => p.id)} 
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="d-flex align-items-center justify-content-between px-2 py-1 mb-1">
                              <span className="x-small fw-bold text-muted opacity-50">Properties</span>
                              <div className="d-flex gap-2">
                                <span className="x-small text-primary cursor-pointer fw-medium" onClick={() => toggleAllProperties(true)}>Show all</span>
                                <span className="x-small text-primary cursor-pointer fw-medium" onClick={() => toggleAllProperties(false)}>Hide all</span>
                              </div>
                            </div>
                            {(config.propertyOrder || PROPERTIES.map(p => p.id)).map(id => (
                              <SortablePropertyItem 
                                key={id} 
                                prop={PROPERTIES.find(p => p.id === id)} 
                                icon={getPropertyIcon(id, config)}
                                isVisible={config.propertyVisibility?.[id] !== false}
                                toggleVisibility={(id) => handleUpdatePropertyVisibility(id, !(config.propertyVisibility?.[id] !== false))}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      </div>
                    </div>
                  </div>
                )}
              </Dropdown.Menu>
            </Dropdown>
          </div>
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => setShowTransactionModal(true)}
            className="d-flex align-items-center gap-1 rounded-pill px-3 shadow-sm"
          >
            New <ChevronDown size={14} />
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="position-sticky top-0 mb-2" style={{ zIndex: 2000 }}>
          <div className="glass-card border shadow-lg rounded-3 p-1 d-flex align-items-center gap-1 bg-white" style={{ height: '40px', width: 'fit-content' }}>
            <div className="px-3 border-end text-primary fw-medium small">{selectedIds.length} selected</div>
            <div className="d-flex align-items-center gap-1 px-1">
              {/* Date Update */}
              <Dropdown autoClose="outside" className="d-inline">
                <Dropdown.Toggle as="div" className="text-dark text-decoration-none small py-1 px-2 hover-bg-light rounded-2 d-flex align-items-center gap-2 opacity-75 cursor-pointer">
                  <Calendar size={14} /> Date
                </Dropdown.Toggle>
                <Dropdown.Menu className="glass-card border-0 shadow-lg p-2">
                  <Form.Control 
                    type="date" 
                    size="sm" 
                    onChange={(e) => handleBulkUpdateDate(e.target.value)} 
                  />
                </Dropdown.Menu>
              </Dropdown>

              {/* Bank Update */}
              <Dropdown autoClose="outside" className="d-inline">
                <Dropdown.Toggle as="div" className="text-dark text-decoration-none small py-1 px-2 hover-bg-light rounded-2 d-flex align-items-center gap-2 opacity-75 cursor-pointer">
                  <Landmark size={14} /> Bankalar
                </Dropdown.Toggle>
                <Dropdown.Menu className="glass-card border-0 shadow-lg p-1" style={{ minWidth: '150px' }}>
                  {banks.map(bank => (
                    <Dropdown.Item 
                      key={bank.id} 
                      className="rounded-2 py-2 d-flex align-items-center gap-2"
                      onClick={() => handleBulkUpdateBank(bank.id)}
                    >
                      {bank.logo && <img src={bank.logo} alt="" width="16" height="16" className="rounded-circle" />}
                      {bank.name}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>

              <div className="border-start ms-1 ps-1 d-flex align-items-center gap-1">
                <Button variant="link" className="text-danger p-2 hover-bg-light rounded-2" onClick={handleBulkDelete}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleTransactionDragEnd}
      >
        <Card className="glass-card border-0 shadow-sm" style={{ overflow: 'visible' }}>
          <Table hover className="notion-table mb-0 border-top-0" style={{ overflow: 'visible' }}>
            <thead style={{ position: 'relative', zIndex: 10 }}>
              <tr>
              <th style={{ width: '1px', whiteSpace: 'nowrap' }} className="ps-2">
                <Form.Check 
                  ref={selectAllRef}
                  type="checkbox" 
                  className="notion-checkbox custom-checkbox-sm" 
                  checked={selectedIds.length === transactions.length && transactions.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(transactions.map(t => t.id));
                    else setSelectedIds([]);
                  }}
                />
              </th>
              {(config.propertyOrder || PROPERTIES.map(p => p.id))
                .filter(id => config.propertyVisibility?.[id] !== false)
                .map(id => {
                  const p = PROPERTIES.find(item => item.id === id);
                  const label = config.propertyLabels?.[id] || p.label;
                  const currentIcon = getPropertyIcon(id, config);
                  return (
                    <th key={id} style={id === 'title' ? { width: '25%' } : {}}>
                      <Dropdown autoClose="outside">
                        <Dropdown.Toggle as="div" className="d-flex align-items-center gap-2 cursor-pointer dropdown-no-caret hover-bg-light rounded px-2 py-1" style={{ marginLeft: '-8px' }}>
                          <span className="text-muted d-flex align-items-center">{currentIcon}</span>
                          <span className="text-nowrap">{label}</span>
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="glass-card border-0 shadow-lg p-2" style={{ width: '240px' }}>
                          <div className="px-1 py-1 mb-2 d-flex flex-column gap-2">
                            <div className="d-flex align-items-center gap-2">
                              <Dropdown autoClose="outside" className="d-inline">
                                <Dropdown.Toggle as="div" className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0 cursor-pointer hover-bg-secondary hover-text-white transition-all" style={{ width: '28px', height: '28px' }}>
                                  {currentIcon}
                                </Dropdown.Toggle>
                                <Dropdown.Menu className="glass-card border-0 shadow-lg p-2" style={{ width: '180px' }}>
                                  <div className="x-small fw-bold text-muted mb-2 px-2">CHOOSE ICON</div>
                                  <div className="d-flex flex-wrap gap-1 justify-content-center">
                                    {ICON_LIST.map(item => (
                                      <div 
                                        key={item.name} 
                                        className={`rounded d-flex align-items-center justify-content-center cursor-pointer hover-bg-light p-1 ${config.propertyIcons?.[id] === item.name ? 'bg-primary text-white' : ''}`}
                                        style={{ width: '30px', height: '30px' }}
                                        onClick={() => handleUpdatePropertyIcon(id, item.name)}
                                      >
                                        {item.icon}
                                      </div>
                                    ))}
                                  </div>
                                </Dropdown.Menu>
                              </Dropdown>
                              <div className="position-relative flex-grow-1">
                                <Form.Control 
                                  size="sm" 
                                  value={label} 
                                  onChange={(e) => handleUpdatePropertyLabel(id, e.target.value)}
                                  className="border-primary-focus bg-light"
                                  style={{ fontSize: '14px', paddingRight: '25px' }}
                                />
                                <div className="position-absolute end-0 top-50 translate-middle-y pe-2 opacity-50">
                                  <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white" style={{ width: '14px', height: '14px', fontSize: '9px' }}>i</div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="dropdown-divider opacity-10"></div>
                          <Dropdown.Item 
                            className={`rounded-2 d-flex align-items-center gap-2 py-2 small ${config.sortConfig?.propId === id && config.sortConfig?.direction === 'asc' ? 'bg-light text-primary fw-medium' : ''}`}
                            onClick={() => handleSort(id, 'asc')}
                          >
                            <ArrowUp size={14} /> Sort ascending
                          </Dropdown.Item>
                          <Dropdown.Item 
                            className={`rounded-2 d-flex align-items-center gap-2 py-2 small ${config.sortConfig?.propId === id && config.sortConfig?.direction === 'desc' ? 'bg-light text-primary fw-medium' : ''}`}
                            onClick={() => handleSort(id, 'desc')}
                          >
                            <ArrowDown size={14} /> Sort descending
                          </Dropdown.Item>
                          <div className="dropdown-divider opacity-10"></div>
                          <Dropdown.Item 
                            className="rounded-2 d-flex align-items-center justify-content-between py-2 small"
                            onClick={() => handleToggleWrap(id)}
                          >
                            <div className="d-flex align-items-center gap-2">
                              <WrapText size={14} className="text-muted" /> Wrap content
                            </div>
                            {config.propertyWrap?.[id] !== false ? (
                              <Eye size={14} className="text-primary" />
                            ) : (
                              <EyeOff size={14} className="text-muted opacity-50" />
                            )}
                          </Dropdown.Item>
                          <Dropdown.Item 
                            className="rounded-2 d-flex align-items-center gap-2 py-2 small"
                            onClick={() => handleUpdatePropertyVisibility(id, false)}
                          >
                            <Eye size={14} className="text-muted" /> Hide in view
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </th>
                  );
                })
              }
            </tr>
          </thead>
            <SortableContext items={sortedTransactions.map(t => t.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {sortedTransactions.map(t => (
                  <SortableTransactionRow 
                    key={t.id} 
                    t={t} 
                    config={config} 
                    selectedIds={selectedIds}
                    renderCell={renderCell}
                    onSelect={(id, checked) => {
                      if (checked) setSelectedIds([...selectedIds, id]);
                      else setSelectedIds(selectedIds.filter(sid => sid !== id));
                    }}
                  />
                ))}
              </tbody>
            </SortableContext>
          </Table>
        </Card>
      </DndContext>

      {/* Transaction Modal */}
      <Modal show={showTransactionModal} onHide={() => setShowTransactionModal(false)} size="lg" className="glass-card-modal notion-modal">
        <Modal.Body className="p-5">
          <Form onSubmit={handleAddTransaction}>
            <Form.Control 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="New page" 
              className="border-0 bg-transparent h1 fw-bold mb-4 p-0 notion-title-input" 
              style={{ fontSize: '40px', color: '#37352f', opacity: title ? 1 : 0.2 }}
            />
            
            <div className="notion-properties" style={{ fontSize: '14px' }}>
              {/* Date */}
              <div className="py-1 d-flex align-items-center mb-2 notion-property-row">
                <div className="d-flex align-items-center gap-2 notion-label-col">
                  <Calendar size={14} className="text-muted" />
                  <span className="text-muted">Date</span>
                </div>
                <div className="flex-grow-1 notion-value-col">
                  <Form.Control 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)} 
                    className="border-0 bg-transparent p-0"
                    style={{ fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Hızlı İşlemler */}
              <div className="py-1 d-flex align-items-center mb-2 notion-property-row">
                <div className="d-flex align-items-center gap-2 notion-label-col">
                  <List size={14} className="text-muted" />
                  <span className="text-muted">Hızlı İşlemler</span>
                </div>
                <div className="flex-grow-1 notion-value-col">
                  <Dropdown className="d-block w-100" autoClose="outside">
                    <Dropdown.Toggle as="div" className="p-0 border-0 bg-transparent w-100 text-start dropdown-no-caret" style={{ cursor: 'text' }}>
                      <div className="d-flex flex-wrap align-items-center gap-1">
                        {selectedQuickActions.map((a, i) => (
                          <span 
                            key={i} 
                            className="notion-tag m-0 gap-2 d-inline-flex align-items-center" 
                            style={getTagStyle('quickActions', a)}
                          >
                            {a}
                            <X 
                              size={12} 
                              className="text-muted opacity-50" 
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedQuickActions(prev => prev.filter(x => x !== a));
                              }}
                            />
                          </span>
                        ))}
                        <div className="d-flex align-items-center flex-grow-1 position-relative">
                          <Form.Control 
                            size="sm"
                            placeholder={selectedQuickActions.length === 0 ? "Empty" : ""}
                            className="border-0 bg-transparent p-0 flex-grow-1"
                            style={{ fontSize: '14px', minWidth: '60px', boxShadow: 'none' }}
                            value={tagSearch}
                            onChange={e => setTagSearch(e.target.value)}
                            autoComplete="off"
                          />
                          {tagSearch && !normalizeTags(config.quickActions).some(t => t.name.toLowerCase() === tagSearch.toLowerCase()) && (
                            <div 
                              className="p-1 hover-bg-light rounded cursor-pointer ms-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTag('quickActions', tagSearch, 'Gray');
                                setSelectedQuickActions(prev => [...prev, tagSearch]);
                                setTagSearch('');
                              }}
                            >
                              <Plus size={14} className="text-primary" />
                            </div>
                          )}
                        </div>
                      </div>
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="glass-card border-0 shadow-lg p-2 notion-dropdown-menu" style={{ width: '280px' }}>
                      <div className="p-2 pt-0">

                        <div className="text-muted x-small mb-2 ps-1" style={{ fontSize: '12px' }}>Select an option or create one</div>
                        <div className="notion-options-list">
                          <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => {
                              const { active, over } = e;
                              if (active.id !== over.id) {
                                const list = normalizeTags(config.quickActions);
                                const oldIdx = list.findIndex(t => t.name === active.id);
                                const newIdx = list.findIndex(t => t.name === over.id);
                                handleReorderTags('quickActions', oldIdx, newIdx);
                              }
                            }}
                          >
                            <SortableContext items={normalizeTags(config.quickActions).map(t => t.name)} strategy={verticalListSortingStrategy}>
                              {normalizeTags(config.quickActions)
                                .filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                                .map((tag, i) => (
                                  <SortableTagItem 
                                    key={tag.name} 
                                    tag={tag} 
                                    type="quickActions"
                                    isSelected={selectedQuickActions.includes(tag.name)}
                                    onClick={() => setSelectedQuickActions(prev => prev.includes(tag.name) ? prev.filter(a => a !== tag.name) : [...prev, tag.name])}
                                    getTagStyle={getTagStyle}
                                    onUpdate={(oldName, newName, newColor) => handleUpdateTag('quickActions', oldName, newName, newColor)}
                                    onDelete={(tagName) => handleDeleteTag('quickActions', tagName)}
                                  />
                                ))}
                            </SortableContext>
                          </DndContext>
                        </div>
                      </div>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>

              {/* İşlem Türü */}
              <div className="py-1 d-flex align-items-center mb-2 notion-property-row">
                <div className="d-flex align-items-center gap-2 notion-label-col">
                  <CircleDot size={14} className="text-muted" />
                  <span className="text-muted">İşlem Türü</span>
                </div>
                <div className="flex-grow-1 notion-value-col">
                  <Dropdown className="d-block w-100">
                    <Dropdown.Toggle as="div" className="p-0 border-0 bg-transparent w-100 text-start dropdown-no-caret" style={{ cursor: 'text' }}>
                      <div className="d-flex align-items-center gap-1 w-100">
                        {selectedType && (
                          <span 
                            className="notion-tag m-0 gap-2 d-inline-flex align-items-center" 
                            style={getTagStyle('types', selectedType)}
                          >
                            {selectedType}
                            <X 
                              size={12} 
                              className="text-muted opacity-50" 
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedType('');
                              }}
                            />
                          </span>
                        )}
                        <div className="d-flex align-items-center flex-grow-1 position-relative">
                          <Form.Control 
                            size="sm"
                            placeholder={!selectedType ? "Empty" : ""}
                            className="border-0 bg-transparent p-0 flex-grow-1"
                            style={{ fontSize: '14px', minWidth: '60px', boxShadow: 'none' }}
                            value={typeSearch}
                            onChange={e => setTypeSearch(e.target.value)}
                            autoComplete="off"
                          />
                          {typeSearch && !normalizeTags(config.types).some(t => t.name.toLowerCase() === typeSearch.toLowerCase()) && (
                            <div 
                              className="p-1 hover-bg-light rounded cursor-pointer ms-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTag('types', typeSearch, 'Gray');
                                setSelectedType(typeSearch);
                                setTypeSearch('');
                              }}
                            >
                              <Plus size={14} className="text-primary" />
                            </div>
                          )}
                        </div>
                      </div>
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="glass-card border-0 shadow-lg p-2 notion-dropdown-menu" style={{ width: '280px' }}>
                      <div className="p-2 pt-0">

                        <div className="text-muted x-small mb-2 ps-1" style={{ fontSize: '12px' }}>Select an option or create one</div>
                        <div className="notion-options-list">
                          <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => {
                              const { active, over } = e;
                              if (active.id !== over.id) {
                                const list = normalizeTags(config.types);
                                const oldIdx = list.findIndex(t => t.name === active.id);
                                const newIdx = list.findIndex(t => t.name === over.id);
                                handleReorderTags('types', oldIdx, newIdx);
                              }
                            }}
                          >
                            <SortableContext items={normalizeTags(config.types).map(t => t.name)} strategy={verticalListSortingStrategy}>
                              {normalizeTags(config.types)
                                .filter(t => t.name.toLowerCase().includes(typeSearch.toLowerCase()))
                                .map((tag, i) => (
                                  <SortableTagItem 
                                    key={tag.name} 
                                    tag={tag} 
                                    type="types"
                                    isSelected={selectedType === tag.name}
                                    onClick={() => setSelectedType(prev => prev === tag.name ? '' : tag.name)}
                                    getTagStyle={getTagStyle}
                                    onUpdate={(oldName, newName, newColor) => handleUpdateTag('types', oldName, newName, newColor)}
                                    onDelete={(tagName) => handleDeleteTag('types', tagName)}
                                  />
                                ))}
                            </SortableContext>
                          </DndContext>
                        </div>
                      </div>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>

              {/* Tutar */}
              <div className="py-1 d-flex align-items-center mb-2 notion-property-row">
                <div className="d-flex align-items-center gap-2 notion-label-col">
                  <Banknote size={14} className="text-muted" />
                  <span className="text-muted">Tutar</span>
                </div>
                <div className="flex-grow-1 notion-value-col">
                  <Form.Control 
                    type="text" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value.replace(/[^0-9,]/g, ''))} 
                    placeholder="Empty" 
                    className="border-0 bg-transparent p-0"
                    style={{ fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Tutar KK */}
              <div className="py-1 d-flex align-items-center mb-2 notion-property-row">
                <div className="d-flex align-items-center gap-2 notion-label-col">
                  <CreditCard size={14} className="text-muted" />
                  <span className="text-muted">Tutar KK</span>
                </div>
                <div className="flex-grow-1 notion-value-col">
                  <Form.Control 
                    type="text" 
                    value={amountKK} 
                    onChange={e => setAmountKK(e.target.value.replace(/[^0-9,]/g, ''))} 
                    placeholder="Empty" 
                    className="border-0 bg-transparent p-0"
                    style={{ fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Dekont */}
              <div className="py-1 d-flex align-items-center mb-2 notion-property-row">
                <div className="d-flex align-items-center gap-2 notion-label-col">
                  <Link2 size={14} className="text-muted" />
                  <span className="text-muted">Dekont</span>
                </div>
                <div className="flex-grow-1 notion-value-col">
                  <Form.Control 
                    type="text" 
                    value={receiptUrl} 
                    onChange={e => setReceiptUrl(e.target.value)} 
                    placeholder="Empty" 
                    className="border-0 bg-transparent p-0"
                    style={{ fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Bankalar db. */}
              <div className="py-1 d-flex align-items-center mb-3 notion-property-row">
                <div className="d-flex align-items-center gap-2 notion-label-col">
                  <Landmark size={14} className="text-muted" />
                  <span className="text-muted">Bankalar db.</span>
                </div>
                <div className="flex-grow-1 notion-value-col">
                  <Dropdown className="d-block w-100">
                    <Dropdown.Toggle as="div" className="p-0 border-0 bg-transparent w-100 text-start dropdown-no-caret" style={{ cursor: 'pointer' }}>
                      {selectedBankId ? (
                        <div className="d-flex align-items-center gap-2">
                          {getBankInfo(selectedBankId).logo && <img src={getBankInfo(selectedBankId).logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
                          <span>{getBankInfo(selectedBankId).name}</span>
                        </div>
                      ) : (
                        <span className="text-muted opacity-50">Empty</span>
                      )}
                    </Dropdown.Toggle>
                    <Dropdown.Menu className="glass-card border-0 shadow-lg p-2 notion-dropdown-menu" style={{ width: '280px' }}>
                      <div className="p-2 pt-0">
                        <Form.Control 
                          size="sm" 
                          placeholder="Search for a bank..." 
                          className="border-0 bg-light mb-2" 
                          style={{ fontSize: '14px' }} 
                          value={bankSearch}
                          onChange={e => setBankSearch(e.target.value)}
                        />
                        <div className="notion-options-list">
                          {banks
                            .filter(b => b.name.toLowerCase().includes(bankSearch.toLowerCase()))
                            .map((bank, i) => (
                              <div 
                                key={i} 
                                className="d-flex align-items-center justify-content-between p-1 px-2 rounded-1 notion-option-item" 
                                style={{ cursor: 'pointer', fontSize: '14px' }}
                                onClick={() => setSelectedBankId(bank.id)}
                              >
                                <div className="d-flex align-items-center gap-2">
                                  {bank.logo ? <img src={bank.logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} /> : <Landmark size={14} className="text-muted opacity-25" />}
                                  <span>{bank.name}</span>
                                </div>
                                {selectedBankId === bank.id && <Check size={14} className="text-primary" />}
                              </div>
                            ))}
                        </div>
                      </div>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>
            </div>

            <hr className="mb-4 opacity-5" />
            
            <div className="d-flex justify-content-end">
              <Button variant="primary" type="submit" className="rounded-pill px-4 fw-bold shadow-sm">Kaydet</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* New Bank Modal */}
      <Modal show={showBankModal} onHide={() => setShowBankModal(false)} className="glass-card-modal">
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Banka Ekle</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleAddBank}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Banka Adı</Form.Label>
              <Form.Control type="text" value={newBankName} onChange={e => setNewBankName(e.target.value)} placeholder="Örn: Akbank" className="border-0 bg-light" required />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold">Logo</Form.Label>
              <Form.Control type="file" accept="image/*" onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setNewBankLogo(reader.result);
                  reader.readAsDataURL(file);
                }
              }} className="border-0 bg-light" />
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100 rounded-pill py-2 fw-bold">Bankayı Kaydet</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Edit Bank Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} className="glass-card-modal">
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Bankayı Düzenle</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handleUpdateBank}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Banka Adı</Form.Label>
              <Form.Control type="text" value={editBankName} onChange={e => setEditBankName(e.target.value)} placeholder="Örn: Akbank" className="border-0 bg-light" required />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label className="small fw-bold">Logo</Form.Label>
              <Form.Control type="file" accept="image/*" onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setEditBankLogo(reader.result);
                  reader.readAsDataURL(file);
                }
              }} className="border-0 bg-light" />
              {editBankLogo && (
                <div className="mt-2 text-center">
                  <img src={editBankLogo} alt="Preview" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                </div>
              )}
            </Form.Group>
            <Button variant="primary" type="submit" className="w-100 rounded-pill py-2 fw-bold">Değişiklikleri Kaydet</Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Tag Management Modal */}
      <Modal show={showTagModal} onHide={() => setShowTagModal(false)} className="glass-card-modal">
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Etiketleri Yönet</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Hızlı İşlemler</h6>
            <div className="d-flex flex-wrap gap-2 mb-2">
              {normalizeTags(config.quickActions).map((tag, i) => (
                <Dropdown key={i}>
                  <Dropdown.Toggle as="div" className="notion-tag" style={getTagStyle('quickActions', tag.name)}>{tag.name}</Dropdown.Toggle>
                  <Dropdown.Menu className="glass-card border-0 shadow">
                    <div className="p-2 d-flex flex-wrap gap-1" style={{ width: '120px' }}>
                      {COLORS.map(c => <div key={c.name} onClick={() => updateTag('quickActions', tag.name, c.name)} style={{ width: '20px', height: '20px', backgroundColor: c.bg, borderRadius: '4px', cursor: 'pointer', border: '1px solid #ddd' }} title={c.name} />)}
                    </div>
                    <Dropdown.Divider />
                    <Dropdown.Item className="text-danger small" onClick={() => updateTag('quickActions', tag.name, null, 'remove')}>Sil</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ))}
            </div>
            <div className="d-flex gap-2">
              <Form.Control size="sm" placeholder="Yeni ekle..." value={activeTagType === 'quickActions' ? newTagName : ''} onChange={e => setNewTagName(e.target.value)} onFocus={() => setActiveTagType('quickActions')} />
              <Button size="sm" onClick={() => { updateTag('quickActions', newTagName, 'Gray'); setNewTagName(''); }}><Plus size={14} /></Button>
            </div>
          </div>
          <hr className="my-4 opacity-5" />
          <div>
            <h6 className="fw-bold mb-3">İşlem Türleri</h6>
            <div className="d-flex flex-wrap gap-2 mb-2">
              {normalizeTags(config.types).map((tag, i) => (
                <Dropdown key={i}>
                  <Dropdown.Toggle as="div" className="notion-tag" style={getTagStyle('types', tag.name)}>{tag.name}</Dropdown.Toggle>
                  <Dropdown.Menu className="glass-card border-0 shadow">
                    <div className="p-2 d-flex flex-wrap gap-1" style={{ width: '120px' }}>
                      {COLORS.map(c => <div key={c.name} onClick={() => updateTag('types', tag.name, c.name)} style={{ width: '20px', height: '20px', backgroundColor: c.bg, borderRadius: '4px', cursor: 'pointer', border: '1px solid #ddd' }} title={c.name} />)}
                    </div>
                    <Dropdown.Divider />
                    <Dropdown.Item className="text-danger small" onClick={() => updateTag('types', tag.name, null, 'remove')}>Sil</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ))}
            </div>
            <div className="d-flex gap-2">
              <Form.Control size="sm" placeholder="Yeni ekle..." value={activeTagType === 'types' ? newTagName : ''} onChange={e => setNewTagName(e.target.value)} onFocus={() => setActiveTagType('types')} />
              <Button size="sm" onClick={() => { updateTag('types', newTagName, 'Gray'); setNewTagName(''); }}><Plus size={14} /></Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default BankTransactionsPage;
