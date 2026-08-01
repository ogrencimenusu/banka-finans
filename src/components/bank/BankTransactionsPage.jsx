import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { updateBankTransactionSummary, resyncAllBankSummaries, parseAmt } from '../../utils/accountSummaryHelper';
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
  EyeOff,
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
  Layers,
  Sigma
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

const PROPERTIES = [
  { id: 'date', label: 'Date', icon: <Calendar size={14} /> },
  { id: 'title', label: 'İşlem Adı', icon: <Type size={14} /> },
  { id: 'quickActions', label: 'Hızlı İşlemler', icon: <List size={14} /> },
  { id: 'type', label: 'İşlem Türü', icon: <CircleDot size={14} /> },
  { id: 'amount', label: 'Tutar', icon: <Banknote size={14} /> },
  { id: 'receiptUrl', label: 'Dekont', icon: <Link2 size={14} /> },
  { id: 'bankId', label: 'Bankalar', icon: <Landmark size={14} /> },
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

const SortableGroupItem = ({ id, label, icon, visible, onToggle }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="d-flex align-items-center gap-2 py-2 px-1 hover-bg-light rounded group border-0 bg-transparent">
      <div {...attributes} {...listeners} className="cursor-grab text-muted opacity-25 group-hover-opacity-100 transition-all">
        <GripVertical size={14} />
      </div>
      <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0" onClick={onToggle} style={{ cursor: 'pointer' }}>
         <span className={`small text-truncate ${!visible ? 'opacity-50 text-decoration-line-through' : ''}`}>{label}</span>
      </div>
      <div className="ms-auto" onClick={onToggle} style={{ cursor: 'pointer' }}>
        {visible ? <Eye size={14} className="text-primary" /> : <EyeOff size={14} className="text-muted opacity-50" />}
      </div>
    </div>
  );
};

const SortablePropertyItem = ({ prop, isVisible, toggleVisibility, icon }) => {
  if (!prop) return null;
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
        {isVisible ? <Eye size={16} /> : <Eye size={16} className="text-muted opacity-25" />}
      </div>
    </div>
  );
};

const TransactionRow = React.memo(({ t, config, selectedIds, onSelect, renderCell, isWrapped, isEditing, tableId = 'LIST_MAIN' }) => {
  const isSelected = selectedIds.includes(t.id);

  const style = {
    zIndex: isEditing ? 1000 : 'auto',
    position: 'relative',
  };

  return (
    <tr style={style} className={`align-middle group`}>
      <td className="ps-2">
        <div
          className={`d-flex align-items-center gap-2 ${isSelected ? 'opacity-100' : 'group-hover-visible'}`}
          style={{ width: '50px' }}
        >
          <div className="text-muted opacity-25" style={{ width: '14px' }}>
          </div>
          <Form.Check
            type="checkbox"
            className="notion-checkbox custom-checkbox-sm"
            checked={isSelected}
            onChange={(e) => onSelect(t.id, e.target.checked)}
          />
        </div>
      </td>
      {(Array.isArray(config.propertyOrder) ? config.propertyOrder : PROPERTIES.map(p => p.id))
        .filter(id => PROPERTIES.some(p => p.id === id))
        .filter(id => config.propertyVisibility?.[id] !== false)
        .map(id => renderCell(id, t, tableId))}
    </tr>
  );
});

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
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (isEditing && ref.current) {
      const timer = setTimeout(() => {
        try { ref.current.showPicker(); } catch (e) { }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  return (
    <div className="position-relative">
      <div
        className={`text-dark text-decoration-none py-1 px-2 hover-bg-light rounded-2 d-flex flex-column align-items-center justify-content-center cursor-pointer transition-all ${value ? 'text-primary' : ' '}`}
        style={{ minWidth: '80px', minHeight: '40px' }}
        onClick={() => {
          setDraft(value || '');
          setIsEditing(true);
        }}
      >
        <div className="d-flex align-items-center gap-1 opacity-50 w-100 justify-content-center" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          <Calendar size={10} /> Tarih
          {value && (
            <X
              size={10}
              className="ms-1 hover-text-danger transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            />
          )}
        </div>
        {value && (
          <div className="d-flex align-items-center gap-1 fw-bold mt-0.5" style={{ fontSize: '12px' }}>
            {new Date(value).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
        )}

        {isEditing && (
          <div className="position-absolute top-0 start-0 w-100 h-100 bg-white border shadow-sm rounded-2 px-1 d-flex align-items-center" style={{ zIndex: 100 }}>
            <Form.Control
              ref={ref}
              type="date"
              value={draft}
              className="border-0 bg-transparent p-0 small w-100"
              style={{ boxShadow: 'none', fontSize: '12px' }}
              onChange={e => {
                const val = e.target.value;
                setDraft(val);
                if (val) {
                  onSave(val);
                  setIsEditing(false);
                }
              }}
              onBlur={() => {
                if (draft) onSave(draft);
                setIsEditing(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (draft) onSave(draft);
                  setIsEditing(false);
                }
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const BulkTitleInput = ({ value, onSave, onClear }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.focus();
    }
  }, [isEditing]);

  const hasValue = value !== undefined;

  return (
    <div className="position-relative">
      <div
        className={`text-dark text-decoration-none py-1 px-2 hover-bg-light rounded-2 d-flex flex-column align-items-center justify-content-center cursor-pointer transition-all ${hasValue ? 'text-primary' : ' '}`}
        style={{ minWidth: '90px', minHeight: '40px' }}
        onClick={() => {
          setDraft(value || '');
          setIsEditing(true);
        }}
      >
        <div className="d-flex align-items-center gap-1 opacity-50 w-100 justify-content-center" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          <Type size={10} /> İşlem Adı
          {hasValue && (
            <X
              size={10}
              className="ms-1 hover-text-danger transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            />
          )}
        </div>
        {hasValue && (
          <div className="d-flex align-items-center gap-1 fw-bold mt-0.5" style={{ fontSize: '12px', fontStyle: value === '' ? 'italic' : 'normal', opacity: value === '' ? 0.6 : 1 }}>
            {value === '' ? '(Boş bırak)' : value}
          </div>
        )}

        {isEditing && (
          <div className="position-absolute top-0 start-0 w-100 h-100 bg-white border shadow-sm rounded-2 px-1 d-flex align-items-center" style={{ zIndex: 100, minWidth: '150px' }}>
            <Form.Control
              ref={ref}
              type="text"
              value={draft}
              placeholder="İşlem adı..."
              className="border-0 bg-transparent p-0 small w-100"
              style={{ boxShadow: 'none', fontSize: '12px' }}
              onChange={e => setDraft(e.target.value)}
              onBlur={() => {
                onSave(draft);
                setIsEditing(false);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onSave(draft);
                  setIsEditing(false);
                }
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const OverlayCell = ({ isEditing, display, input }) => (
  <div style={{ position: 'relative', minHeight: '1.2em' }}>
    <span style={{ visibility: isEditing ? 'hidden' : 'visible' }}>{display}</span>
    {isEditing && (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
        {input}
      </div>
    )}
  </div>
);

const LocalTextInput = ({ value, onSave, onCancel, suggestions = [], ...props }) => {
  const [draft, setDraft] = React.useState(value || '');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    setDraft(value || '');
  }, [value]);

  const filteredSuggestions = React.useMemo(() => {
    if (!draft || !showSuggestions || !suggestions.length) return [];
    return suggestions
      .filter(s => s.toLowerCase().includes(draft.toLowerCase()) && s !== draft)
      .slice(0, 10);
  }, [draft, suggestions, showSuggestions]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      if (filteredSuggestions.length > 0) {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
      }
    } else if (e.key === 'ArrowUp') {
      if (filteredSuggestions.length > 0) {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
      }
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        e.preventDefault();
        const selected = filteredSuggestions[selectedIndex];
        setDraft(selected);
        setShowSuggestions(false);
        onSave(selected);
      } else {
        onSave(draft);
      }
    } else if (e.key === 'Escape') {
      if (showSuggestions && filteredSuggestions.length > 0) {
        setShowSuggestions(false);
      } else {
        onCancel && onCancel();
      }
    }
  };

  return (
    <div className="w-100">
      <Form.Control
        ref={inputRef}
        {...props}
        value={draft}
        onChange={e => {
          setDraft(e.target.value);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        }}
        onBlur={() => {
          setTimeout(() => {
            setShowSuggestions(false);
            onSave(draft);
          }, 200);
        }}
        onKeyDown={handleKeyDown}
      />
      <Overlay
        target={inputRef.current}
        show={showSuggestions && filteredSuggestions.length > 0}
        placement="bottom-start"
        rootClose
        onHide={() => setShowSuggestions(false)}
        popperConfig={{ strategy: 'fixed',
          modifiers: [
            { name: 'offset', options: { offset: [0, 4] } },
            { name: 'preventOverflow', options: { boundary: 'viewport' } },
            { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }
          ]
        }}
      >
        {({ placement, arrowProps, show: _show, popper, hasDoneInitialMeasure, ...props }) => (
          <div
            {...props}
            className="glass-card border-0 shadow-lg p-1 overflow-auto"
            style={{
              ...props.style,
              zIndex: 20000,
              maxHeight: '200px',
              minWidth: inputRef.current?.offsetWidth || '100%',
              overflowX: 'hidden',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-main)'
            }}
          >
            {filteredSuggestions.map((s, i) => (
              <div
                key={s}
                className={`p-1 px-2 rounded-1 cursor-pointer notion-option-item fs-13 ${i === selectedIndex ? 'bg-primary text-white' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDraft(s);
                  setShowSuggestions(false);
                  onSave(s);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </Overlay>
    </div>
  );
};

const ImportModal = ({ show, onHide, onImport }) => {
  const [text, setText] = React.useState('');

  const handleProcess = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<table>${text}</table>`, 'text/html');
    const rows = doc.querySelectorAll('tr');

    const results = Array.from(rows).map(row => {
      const tds = row.querySelectorAll('td');
      if (tds.length < 6) return null;

      const dateStr = tds[0].innerText.trim();
      const [d, m, y] = dateStr.split('.');
      const formattedDate = `${y}-${m}-${d}`;

      const amountStr = tds[1].innerText.trim()
        .replace('₺', '')
        .replace(/\./g, ''); // Sadece noktaları kaldır, virgül kalsın

      const bankName = tds[2].innerText.trim();
      const typeName = tds[3].innerText.trim();
      const receiptUrl = tds[4].querySelector('a')?.href || '';
      const title = tds[5].innerText.trim();

      return { date: formattedDate, amount: amountStr, bankName, typeName, receiptUrl, title };
    }).filter(Boolean);

    onImport(results);
    setText('');
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" className="glass-card">
      <Modal.Header closeButton className="border-0">
        <Modal.Title className="fw-bold">HTML Import</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Form.Control
          as="textarea"
          rows={10}
          className="glass-card p-3"
          placeholder="Paste <tr>...</tr> rows here..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <Button className="mt-3 w-100 rounded-pill py-2 fw-bold" onClick={handleProcess}>
          Import Transactions
        </Button>
      </Modal.Body>
    </Modal>
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
  } = useSortable({ id: tag.id || tag.name, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1001 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSave = (e) => {
    if (e) e.stopPropagation();
    if (editValue && (editValue !== tag.name || editColor !== (tag.color || 'Default'))) {
      onUpdate(tag.id || tag.name, editValue, editColor);
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
              className="border-0 bg-theme-light py-0 px-1 shadow-sm"
              style={{ fontSize: '14px', height: '24px' }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="notion-tag m-0" style={getTagStyle(type, tag.id || tag.name)}>{tag.name}</span>
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
                onClick={(e) => { e.stopPropagation(); if (window.confirm('Bu etiketi silmek istediğinize emin misiniz?')) onDelete(tag.id || tag.name); }}
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
          <div className="text-muted x-small mb-1 ps-1 fs-11">Select Color</div>
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
            <span className="fw-bold fs-16">{bank.name}</span>
          </div>
        </td>
        <td className="fw-medium fs-15">
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
        <Card className="glass-card border shadow-sm h-100 p-0 group position-relative overflow-hidden" style={{ borderRadius: '12px' }}>
          <div className="d-flex align-items-center justify-content-center border-bottom overflow-hidden p-0 position-relative" style={{ height: '120px', backgroundColor: 'var(--card-bg)' }}>
            {bank.logo ? (
              <img src={bank.logo} alt="" style={{ width: '100%', height: '100%', minWidth: '100%', objectFit: 'cover' }} />
            ) : (
              <Landmark size={40} className="text-muted opacity-25" />
            )}
            <div className="position-absolute top-0 end-0 p-1 d-flex gap-1 group-hover-visible gallery-actions">
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
            <div className="fw-bold mb-0 fs-16">{bank.name}</div>
            <div className="text-muted fs-15">{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(balance)}</div>
          </div>
        </Card>
      </Col>
    );
  }

  // Default: gallery_basic
  return (
    <Col ref={setNodeRef} style={style} {...attributes} className={viewLayout === 'gallery_basic' ? 'bank-card-col-simple' : ''}>
      <Card className="glass-card border shadow-sm p-3 position-relative group" style={{ borderRadius: '12px' }}>
        <div className="d-flex align-items-center mb-2">
          <div className="d-flex align-items-center gap-2">
            <div className="rounded shadow-sm overflow-hidden" style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 !important', backgroundColor: 'var(--card-bg)' }}>
              {bank.logo ? <img src={bank.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Landmark size={14} className="text-muted" />}
            </div>
            <span className="fw-bold fs-16">{bank.name}</span>
          </div>
          <div className="position-absolute d-flex align-items-center gap-1 group-hover-visible gallery-actions">
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
        <div className="fw-medium text-muted fs-15">
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
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [groupLimits, setGroupLimits] = useState({});
  const [groupInfinite, setGroupInfinite] = useState({});
  const [groupConfigs, setGroupConfigs] = useState({});
  const [groupSettings, setGroupSettings] = useState({});
  const [editTarget, setEditTarget] = useState(null);

  const toggleGroupVisibility = async (groupId) => {
    const currentGroupBy = config.groupBy;
    if (!currentGroupBy) return;
    const settings = groupSettings[currentGroupBy] || {};
    const visibility = { ...(settings.visibility || {}), [groupId]: settings.visibility?.[groupId] === false };
    const newSettings = { ...groupSettings, [currentGroupBy]: { ...settings, visibility } };
    setGroupSettings(newSettings);
    await setDoc(doc(db, `users/${user.uid}/groupSettings`, 'bankGroups'), newSettings);
  };

  const handleToggleGroupCollapse = async (groupId) => {
    const newCollapsed = { ...collapsedGroups, [groupId]: !collapsedGroups[groupId] };
    setCollapsedGroups(newCollapsed);
    
    if (user && config.groupBy) {
      const currentGroupBy = config.groupBy;
      const settings = groupSettings[currentGroupBy] || {};
      const newSettings = { 
        ...groupSettings, 
        [currentGroupBy]: { 
          ...settings, 
          collapsedGroups: newCollapsed 
        } 
      };
      setGroupSettings(newSettings);
      await setDoc(doc(db, `users/${user.uid}/groupSettings`, 'bankGroups'), newSettings);
    }
  };

  const handleGroupOrderDragEnd = async (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const currentGroupBy = config.groupBy;
      if (!currentGroupBy) return;
      const settings = groupSettings[currentGroupBy] || {};
      
      // We need the full list of groups to establish the base order
      const allGroupsMap = {};
      transactions.filter(t => !t.deleted).forEach(t => {
        let key = 'Empty';
        if (currentGroupBy === 'bankId') key = t.bankId || 'Empty';
        else if (currentGroupBy === 'type') key = t.type || 'Empty';
        else if (currentGroupBy === 'quickActions') key = (Array.isArray(t.quickActions) && t.quickActions.length > 0) ? t.quickActions[0] : 'Empty';
        if (!allGroupsMap[key]) allGroupsMap[key] = key;
      });
      const allGroupIds = Object.keys(allGroupsMap);
      let currentOrder = settings.order ? [...settings.order] : [...allGroupIds];
      
      // Ensure all current group IDs are in the order array
      allGroupIds.forEach(id => {
        if (!currentOrder.includes(id)) {
          currentOrder.push(id);
        }
      });
      
      const oldIndex = currentOrder.indexOf(active.id);
      const newIndex = currentOrder.indexOf(over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
        const newSettings = { ...groupSettings, [currentGroupBy]: { ...settings, order: newOrder } };
        setGroupSettings(newSettings);
        await setDoc(doc(db, `users/${user.uid}/groupSettings`, 'bankGroups'), newSettings);
      }
    }
  };

  const handleUpdateGroupFilter = async (groupId, propId, operator, value) => {
    let newConfigs = { ...groupConfigs };
    const current = newConfigs[groupId] || {};
    let filters = [...(current.filters || [])];
    const idx = filters.findIndex(f => f.propId === propId);

    if (idx !== -1) {
      if (operator === null) {
        filters.splice(idx, 1);
      } else {
        let newValue = value;
        if (['bankId', 'type', 'quickActions'].includes(propId) && !['is_empty', 'is_not_empty'].includes(operator)) {
          const currentValues = (filters[idx].value || '').split(',').filter(v => v);
          if (currentValues.includes(value)) {
            newValue = currentValues.filter(v => v !== value).join(',');
          } else {
            newValue = [...currentValues, value].join(',');
          }
        }
        
        if (!newValue && ['bankId', 'type', 'quickActions'].includes(propId) && !['is_empty', 'is_not_empty'].includes(operator)) {
           filters.splice(idx, 1);
        } else {
           filters[idx] = { propId, operator, value: newValue };
        }
      }
    } else {
      if (operator !== null) filters.push({ propId, operator, value });
    }
    
    newConfigs[groupId] = { ...current, filters };
    setGroupConfigs(newConfigs);
    
    if (user) {
      await setDoc(doc(db, `users/${user.uid}/config`, 'bankGroupConfigs'), newConfigs, { merge: true });
    }
  };

  const handleGroupSort = async (groupId, propId, direction) => {
    const newConfigs = {
      ...groupConfigs,
      [groupId]: {
        ...(groupConfigs[groupId] || {}),
        sortConfig: propId ? { propId, direction } : null
      }
    };
    setGroupConfigs(newConfigs);
    if (user) {
      await setDoc(doc(db, `users/${user.uid}/config`, 'bankGroupConfigs'), newConfigs, { merge: true });
    }
  };

  const handleClearGroupFilters = async (groupId) => {
    const newConfigs = {
      ...groupConfigs,
      [groupId]: {
        ...(groupConfigs[groupId] || {}),
        filters: []
      }
    };
    setGroupConfigs(newConfigs);
    if (user) {
      await setDoc(doc(db, `users/${user.uid}/config`, 'bankGroupConfigs'), newConfigs, { merge: true });
    }
  };

  const getTagStyleByColor = (colorName) => {
    const colorObj = COLORS.find(c => c.name === colorName) || COLORS[0];
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      // For dark mode: semi-transparent background from the original color, and lightened text
      return { 
        backgroundColor: `${colorObj.text}33`, // ~20% opacity
        color: colorObj.text,
        border: `1px solid ${colorObj.text}66`, // ~40% opacity border
        filter: 'brightness(1.5) saturate(1.2)'
      };
    }
    return { backgroundColor: colorObj.bg, color: colorObj.text };
  };
  const [activeDragId, setActiveDragId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isInfiniteScroll, setIsInfiniteScroll] = useState(false);
  const [bulkHistory, setBulkHistory] = useState([]);
  const [stagedChanges, setStagedChanges] = useState({});
  const [bulkProgress, setBulkProgress] = useState(0);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const observerRef = useRef();
  const lastElementRef = useRef();
  const [quickActionTags, setQuickActionTags] = useState([]);
  const [typeTags, setTypeTags] = useState([]);
  const [config, setConfig] = useState({
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

  const [selectedBankId, setSelectedBankId] = useState('all'); // For filtering
  const [formBankId, setFormBankId] = useState(''); // For the add transaction form
  // Inline cell editing
  const [editingCell, setEditingCell] = useState(null); // { transId, propId }
  const [cellDraft, setCellDraft] = useState(null); // draft value for the active cell
  const [searchTerm, setSearchTerm] = useState('');
  const [title, setTitle] = useState('');
  const [selectedQuickActions, setSelectedQuickActions] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [amount, setAmount] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [limitCount, setLimitCount] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [isGlobalSelected, setIsGlobalSelected] = useState(false);

  const uniqueTitles = useMemo(() => {
    const titles = transactions.map(t => t.title).filter(Boolean);
    return [...new Set(titles)].sort((a, b) => (a || '').localeCompare(b || '', 'tr'));
  }, [transactions]);

  const getBankInfo = (id) => banks.find(b => b.id === id) || {};

  const displayDateFormatted = (dateString, formatStr) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    switch (formatStr) {
      case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
      case 'DD.MM.YYYY': return `${day}.${month}.${year}`;
      case 'DD MMMM YYYY': {
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
      }
      case 'DD MMM YYYY': {
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      default: return `${day}/${month}/${year}`;
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeTagType, setActiveTagType] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [typeSearch, setTypeSearch] = useState('');
  const [bankSearch, setBankSearch] = useState('');
  const [showCalculateSubmenu, setShowCalculateSubmenu] = useState(false);
  const [showDateFormatSubmenu, setShowDateFormatSubmenu] = useState(false);
  const [showVisibilitySubmenu, setShowVisibilitySubmenu] = useState(false);

  const { 
    summaryOverview,
    banks: globalBanks, 
    bankTransactions: globalTransactions,
    bankConfig,
    quickActionTags: globalQATags,
    typeTags: globalTypeTags,
    bankBulkHistory,
    bankGroupSettings,
    bankGroupConfigs: globalGroupConfigs
  } = useData();

  // Sync from Global Context
  useEffect(() => {
    setBanks(globalBanks.filter(b => b.deleted !== true).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));
  }, [globalBanks]);

  useEffect(() => {
    const activeTrans = globalTransactions.filter(t => t.deleted !== true);
    setTransactions(activeTrans);
    setTotalCount(activeTrans.length);
    setHasMore(false);
  }, [globalTransactions]);

  useEffect(() => {
    if (bankConfig) {
      const data = { ...bankConfig };
      if (data.filters && !Array.isArray(data.filters)) data.filters = [];
      if (data.propertyOrder && !Array.isArray(data.propertyOrder)) {
        delete data.propertyOrder;
      } else if (Array.isArray(data.propertyOrder)) {
        data.propertyOrder = data.propertyOrder.filter(id => PROPERTIES.some(p => p.id === id));
      }
      setConfig(prev => ({ ...prev, ...data }));
    }
  }, [bankConfig]);

  useEffect(() => { setQuickActionTags(globalQATags); }, [globalQATags]);
  useEffect(() => { setTypeTags(globalTypeTags); }, [globalTypeTags]);
  useEffect(() => { setBulkHistory(bankBulkHistory); }, [bankBulkHistory]);
  useEffect(() => { setGroupSettings(bankGroupSettings); }, [bankGroupSettings]);
  useEffect(() => { setGroupConfigs(globalGroupConfigs); }, [globalGroupConfigs]);

  useEffect(() => {
    if (config.groupBy && groupSettings[config.groupBy]?.collapsedGroups) {
      setCollapsedGroups(groupSettings[config.groupBy].collapsedGroups);
    } else {
      setCollapsedGroups({});
    }
  }, [config.groupBy, groupSettings]);


  const applyFilters = (data, filters) => {
    return data.filter(t => {
      if (selectedBankId !== 'all' && t.bankId !== selectedBankId) return false;

      const activeFilters = Array.isArray(filters) ? filters : [];
      for (const f of activeFilters) {
        const filterValueRaw = (f.value || '');
        if (!filterValueRaw && !['is_empty', 'is_not_empty'].includes(f.operator)) continue;

        const val = t[f.propId];
        const filterValLower = filterValueRaw.toLowerCase();
        const stringVal = (val || '').toString().toLowerCase();

        if (['bankId', 'type', 'quickActions'].includes(f.propId) && !['is_empty', 'is_not_empty'].includes(f.operator)) {
          const selectedIds = filterValueRaw.split(',').filter(v => v);
          const transactionValues = Array.isArray(val) ? val : [val];
          const hasOverlap = transactionValues.some(v => selectedIds.includes(v));
          if (f.operator === 'contains' && !hasOverlap) return false;
          if (f.operator === 'does_not_contain' && hasOverlap) return false;
          continue;
        }

        switch (f.operator) {
          case 'contains': if (!stringVal.includes(filterValLower)) return false; break;
          case 'does_not_contain': if (stringVal.includes(filterValLower)) return false; break;
          case 'is': if (stringVal !== filterValLower) return false; break;
          case 'is_not': if (stringVal === filterValLower) return false; break;
          case 'starts_with': if (!stringVal.startsWith(filterValLower)) return false; break;
          case 'ends_with': if (!stringVal.endsWith(filterValLower)) return false; break;
          case 'is_empty':
            if (Array.isArray(val)) { if (val.length > 0) return false; }
            else if (val) return false;
            break;
          case 'is_not_empty':
            if (Array.isArray(val)) { if (val.length === 0) return false; }
            else if (!val) return false;
            break;
          case 'between': {
            if (f.propId === 'date') {
              const [start, end] = filterValueRaw.split(',');
              if (start && val < start) return false;
              if (end && val > end) return false;
            }
            break;
          }
          default: break;
        }
      }
      return true;
    });
  };

  const applySort = (data, sortConfig) => {
    return [...data].sort((a, b) => {
      if (!sortConfig) {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        if (timeB !== timeA) return timeB - timeA;
        return (a.order || 0) - (b.order || 0);
      }
      const { propId, direction } = sortConfig;
      let valA = a[propId];
      let valB = b[propId];

      if (propId === 'date') {
        valA = valA || '0000-00-00';
        valB = valB || '0000-00-00';
      } else if (propId === 'amount') {
        const parseAmt = (v) => typeof v === 'string' ? parseFloat(v.replace(/\./g, '').replace(',', '.')) : (v || 0);
        valA = parseAmt(valA);
        valB = parseAmt(valB);
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
  };

  const getCalculatedValue = (propId, data) => {
    const calcType = config.columnCalculations?.[propId];
    if (!calcType || calcType === 'none') return null;

    const parseAmt = (v) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const parsed = parseFloat(v.replace(/\./g, '').replace(',', '.'));
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    const values = data.map(t => {
      if (propId === 'amount') return parseAmt(t[propId]);
      return t[propId];
    }).filter(v => v !== undefined && v !== null && v !== '');

    const numValues = values.filter(v => typeof v === 'number');

    switch (calcType) {
      case 'sum': return numValues.reduce((a, b) => a + b, 0);
      case 'avg': return numValues.length ? numValues.reduce((a, b) => a + b, 0) / numValues.length : 0;
      case 'min': return numValues.length ? Math.min(...numValues) : 0;
      case 'max': return numValues.length ? Math.max(...numValues) : 0;
      case 'count_all': return data.length;
      case 'count_values': return values.length;
      case 'count_unique': return new Set(values).size;
      case 'count_empty': return data.length - values.length;
      case 'count_not_empty': return values.length;
      default: return null;
    }
  };

  const renderCalculatedValue = (propId, value) => {
    if (value === null) return null;
    const calcType = config.columnCalculations?.[propId];
    const prefix = calcType.toUpperCase().replace(/_/g, ' ');

    if (propId === 'amount') {
      const formatted = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
      return <div className="text-end x-small text-muted fw-bold text-nowrap"><span className="opacity-50">{prefix}</span> {formatted} TL</div>;
    }

    return <div className="text-end x-small text-muted fw-bold text-nowrap"><span className="opacity-50">{prefix}</span> {value}</div>;
  };

  const filteredTransactions = useMemo(() => applyFilters(transactions, config.filters), [transactions, config.filters, selectedBankId, banks]);
  const sortedTransactions = useMemo(() => applySort(filteredTransactions, config.sortConfig), [filteredTransactions, config.sortConfig]);

  const visibleTransactions = useMemo(() => sortedTransactions.slice(0, limitCount), [sortedTransactions, limitCount]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!isInfiniteScroll) return; // Only if enabled

    const options = { root: null, rootMargin: '20px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && limitCount < sortedTransactions.length) {
        setLimitCount(prev => Math.min(prev + 100, sortedTransactions.length));
      }
    }, options);

    if (lastElementRef.current) observer.observe(lastElementRef.current);
    return () => observer.disconnect();
  }, [sortedTransactions.length, limitCount]);

  // Automatically sync summaries if missing any bank IDs in summaryOverview
  useEffect(() => {
    if (user?.uid && globalBanks.length > 0 && globalTransactions.length > 0) {
      const overviewBalances = summaryOverview?.bankBalances || {};
      const missingAnyBank = globalBanks.some(b => b.id && overviewBalances[b.id] === undefined);
      if (!summaryOverview || missingAnyBank) {
        resyncAllBankSummaries(user.uid, globalBanks, globalTransactions);
      }
    }
  }, [user?.uid, globalBanks, globalTransactions, summaryOverview]);

  const bankBalances = useMemo(() => {
    const balances = {};
    transactions.forEach(t => {
      if (t.deleted === true || t.type === 'Eyv0oZlOuCPWJbmRkv0h') return;

      const bId = t.bankId;
      if (!bId) return;

      const amt = parseAmt(t.amount);
      balances[bId] = (balances[bId] || 0) + amt;
    });
    return balances;
  }, [transactions]);

  const calculateBalance = (bankId) => bankBalances[bankId] || 0;
  const totalBalance = useMemo(() => {
    return banks
      .filter(bank => bank.visible !== false && bank.visible !== 'false')
      .reduce((acc, bank) => acc + (bankBalances[bank.id] || 0), 0);
  }, [bankBalances, banks]);

  const handleUpdateLayout = async (layout) => {
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, viewLayout: layout }, { merge: true });
  };



  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!formBankId || !title || !amount) return;

    let finalQuickActions = [...selectedQuickActions]; // array of IDs
    let finalType = selectedType; // ID

    // If user typed a new quick action in the search box but didn't click +
    if (tagSearch.trim()) {
      const newTagName = tagSearch.trim();
      const existing = quickActionTags.find(t => t.name.toLowerCase() === newTagName.toLowerCase());
      if (existing) {
        if (!finalQuickActions.includes(existing.id)) finalQuickActions.push(existing.id);
      } else {
        const newDoc = await addDoc(collection(db, `users/${user.uid}/quickActions`), {
          name: newTagName, color: 'Gray', order: quickActionTags.length, createdAt: new Date()
        });
        finalQuickActions.push(newDoc.id);
      }
      setTagSearch('');
    }

    // If user typed a new type in the search box but didn't click +
    if (typeSearch.trim()) {
      const newTypeName = typeSearch.trim();
      const existing = typeTags.find(t => t.name.toLowerCase() === newTypeName.toLowerCase());
      if (existing) {
        finalType = existing.id;
      } else {
        const newDoc = await addDoc(collection(db, `users/${user.uid}/transactionTypes`), {
          name: newTypeName, color: 'Gray', order: typeTags.length, createdAt: new Date()
        });
        finalType = newDoc.id;
      }
      setTypeSearch('');
    }

    await addDoc(collection(db, `users/${user.uid}/bankTransactions`), {
      bankId: formBankId,
      title,
      quickActions: finalQuickActions,
      type: finalType,
      amount,
      receiptUrl,
      date,
      createdAt: new Date(),
      deleted: false
    });
    
    const numAmt = parseAmt(amount);
    if (numAmt) {
      updateBankTransactionSummary(user.uid, formBankId, numAmt);
    }
    
    setTitle(''); setSelectedQuickActions([]); setSelectedType(''); setAmount(''); setReceiptUrl(''); setFormBankId('');
    setShowTransactionModal(false);
  };

  const getValuesFromFilters = (filters) => {
    const values = { bankId: '', type: '', quickActions: [] };
    if (!Array.isArray(filters)) return values;

    filters.forEach(f => {
      if (f.operator === 'is' || f.operator === 'contains') {
        const ids = (f.value || '').split(',').filter(v => v);
        if (ids.length === 1) {
          if (f.propId === 'bankId') values.bankId = ids[0];
          if (f.propId === 'type') values.type = ids[0];
          if (f.propId === 'quickActions') values.quickActions = [ids[0]];
        }
      }
    });
    return values;
  };

  const handleQuickNewTransaction = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const filterValues = getValuesFromFilters(config.filters);

    await addDoc(collection(db, `users/${user.uid}/bankTransactions`), {
      bankId: filterValues.bankId,
      title: '',
      quickActions: filterValues.quickActions,
      type: filterValues.type,
      amount: '',
      receiptUrl: '',
      date: today,
      createdAt: new Date(),
      deleted: false
    });
  };

  const handleQuickNewInGroup = async (group) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const filterValues = getValuesFromFilters(config.filters);

    const newDoc = {
      bankId: filterValues.bankId,
      title: '',
      quickActions: filterValues.quickActions,
      type: filterValues.type,
      amount: '',
      receiptUrl: '',
      date: today,
      createdAt: new Date(),
      deleted: false
    };

    if (config.groupBy === 'bankId') {
      newDoc.bankId = group.id !== 'Empty' ? group.id : '';
    } else if (config.groupBy === 'type') {
      newDoc.type = group.id !== 'Empty' ? group.id : '';
    } else if (config.groupBy === 'quickActions') {
      newDoc.quickActions = group.id !== 'Empty' ? [group.id] : [];
    }

    await addDoc(collection(db, `users/${user.uid}/bankTransactions`), newDoc);
  };

  const updateConfig = async (newConfig) => {
    if (!user) return;
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, ...newConfig }, { merge: true });
  };

  const handleUpdateFilter = (propId, operator, value) => {
    const currentFilters = Array.isArray(config.filters) ? config.filters : [];
    const newFilters = [...currentFilters];
    const existing = newFilters.findIndex(f => f.propId === propId);

    if (existing !== -1) {
      if (value === null) {
        newFilters.splice(existing, 1);
      } else {
        let newValue = value;
        if (['bankId', 'type', 'quickActions'].includes(propId)) {
          const currentValues = (newFilters[existing].value || '').split(',').filter(v => v);
          if (currentValues.includes(value)) {
            newValue = currentValues.filter(v => v !== value).join(',');
          } else {
            newValue = [...currentValues, value].join(',');
          }
        }

        if (!newValue && ['bankId', 'type', 'quickActions'].includes(propId)) {
          newFilters.splice(existing, 1);
        } else {
          newFilters[existing] = { ...newFilters[existing], operator, value: newValue };
        }
      }
    } else {
      newFilters.push({ propId, operator, value });
    }
    updateConfig({ filters: newFilters });
  };

  const handleBulkImport = async (parsedData) => {
    const batch = writeBatch(db);

    const normalize = (s) => (s || '').toLocaleLowerCase('tr-TR').trim()
      .replace(/i̇/g, 'i')
      .replace(/ı/g, 'i');

    // Mevcut banka ve etiketlerin kopyalarını alalım (döngü içinde yeni oluşturulanları takip etmek için)
    let currentBanks = [...banks];
    let currentTypes = [...typeTags];

    for (const item of parsedData) {
      // --- Banka Eşleştirme/Oluşturma ---
      let bankId = '';
      const normalizedItemBank = normalize(item.bankName);
      const matchedBank = currentBanks.find(b => {
        const nb = normalize(b.name);
        return nb.includes(normalizedItemBank) || normalizedItemBank.includes(nb);
      });

      if (matchedBank) {
        bankId = matchedBank.id;
      } else if (item.bankName) {
        // Banka bulunamadı, yeni oluştur
        const newBankRef = await addDoc(collection(db, `users/${user.uid}/banks`), {
          name: item.bankName,
          logo: '',
          createdAt: new Date(),
          deleted: false,
          order: currentBanks.length
        });
        bankId = newBankRef.id;
        currentBanks.push({ id: bankId, name: item.bankName });
      } else {
        bankId = banks[0]?.id || '';
      }

      // --- İşlem Türü Eşleştirme/Oluşturma ---
      let typeId = '';
      const normalizedItemType = normalize(item.typeName);
      const matchedType = currentTypes.find(t => normalize(t.name) === normalizedItemType);

      if (matchedType) {
        typeId = matchedType.id;
      } else if (item.typeName) {
        const newDoc = await addDoc(collection(db, `users/${user.uid}/transactionTypes`), {
          name: item.typeName, color: 'Gray', order: currentTypes.length, createdAt: new Date()
        });
        typeId = newDoc.id;
        currentTypes.push({ id: typeId, name: item.typeName, color: 'Gray' });
      }

      const amountValue = item.amount; // Virgüllü string formatını koru

      const docRef = doc(collection(db, `users/${user.uid}/bankTransactions`));
      batch.set(docRef, {
        bankId,
        title: item.title,
        quickActions: [],
        type: typeId,
        amount: amountValue,
        receiptUrl: item.receiptUrl,
        date: item.date,
        createdAt: new Date(),
        deleted: false
      });
    }

    await batch.commit();
    if (user?.uid) {
      setTimeout(() => {
        resyncAllBankSummaries(user.uid, globalBanks, globalTransactions);
      }, 500);
    }
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
      const targetTrans = transactions.find(t => t.id === id);
      await updateDoc(doc(db, `users/${user.uid}/bankTransactions`, id), { deleted: true });
      if (targetTrans?.bankId) {
        const amt = parseAmt(targetTrans.amount);
        if (amt) {
          updateBankTransactionSummary(user.uid, targetTrans.bankId, -amt);
        }
      }
    }
  };

  const saveCell = async (transId, propId, value) => {
    let finalValue = value;
    const targetTrans = transactions.find(t => t.id === transId);

    if (propId === 'amount') {
      const cleanValue = value.toString().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
      finalValue = parseFloat(cleanValue) || 0;
    }

    await updateDoc(doc(db, `users/${user.uid}/bankTransactions`, transId), { [propId]: finalValue });

    if (targetTrans && user?.uid) {
      if (propId === 'amount') {
        const oldAmt = parseAmt(targetTrans.amount);
        const newAmt = parseAmt(finalValue);
        const delta = newAmt - oldAmt;
        if (delta !== 0 && targetTrans.bankId) {
          updateBankTransactionSummary(user.uid, targetTrans.bankId, delta);
        }
      } else if (propId === 'bankId' && targetTrans.bankId !== finalValue) {
        const amt = parseAmt(targetTrans.amount);
        if (amt) {
          if (targetTrans.bankId) {
            updateBankTransactionSummary(user.uid, targetTrans.bankId, -amt);
          }
          if (finalValue) {
            updateBankTransactionSummary(user.uid, finalValue, amt);
          }
        }
      }
    }

    setEditingCell(prev => {
      if (prev && prev.transId === transId && prev.propId === propId) {
        setCellDraft(null);
        return null;
      }
      return prev;
    });
  };

  const handleDeleteBank = async (id) => {
    if (window.confirm('Bu bankayı silmek istediğinize emin misiniz?')) {
      const bank = banks.find(b => b.id === id);
      const collectionName = bank?.source || 'banks';
      await updateDoc(doc(db, `users/${user.uid}/${collectionName}`, id), { deleted: true });
    }
  };

  const executeBulkAction = async (actionFn) => {
    let idsToProcess = selectedIds;
    if (isGlobalSelected) {
      let q;
      const baseColl = collection(db, `users/${user.uid}/bankTransactions`);
      if (config.sortConfig?.propId) {
        q = query(baseColl, orderBy(config.sortConfig.propId, config.sortConfig.direction));
      } else {
        q = query(baseColl, orderBy('createdAt', 'desc'));
      }
      const snap = await getDocs(q);
      idsToProcess = snap.docs.map(d => d.id);
    }

    const chunks = [];
    for (let i = 0; i < idsToProcess.length; i += 500) {
      chunks.push(idsToProcess.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(id => actionFn(batch, id));
      await batch.commit();
    }

    setSelectedIds([]);
    setIsGlobalSelected(false);
  };

  const handleBulkSave = async () => {
    if (Object.keys(stagedChanges).length === 0) return;
    setIsBulkProcessing(true);
    setBulkProgress(0);

    const idsToProcess = selectedIds;
    const total = idsToProcess.length;
    const batch = writeBatch(db);
    const affectedData = [];

    // Process in chunks of 500 for Firestore limits
    for (let i = 0; i < total; i++) {
      const id = idsToProcess[i];
      const t = transactions.find(item => item.id === id);
      if (t) {
        const changes = {};
        const entry = { id, prev: {}, current: {} };

        Object.keys(stagedChanges).forEach(key => {
          entry.prev[key] = t[key] || null;
          entry.current[key] = stagedChanges[key];
          changes[key] = stagedChanges[key];
        });

        affectedData.push(entry);
        batch.update(doc(db, `users/${user.uid}/bankTransactions`, id), changes);
      }

      // Update progress visually (simplified)
      if (i % 10 === 0 || i === total - 1) {
        setBulkProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    try {
      await batch.commit();

      // Save to history
      await addDoc(collection(db, `users/${user.uid}/bulkHistory`), {
        timestamp: serverTimestamp(),
        type: 'BULK_UPDATE',
        count: total,
        fields: Object.keys(stagedChanges),
        affectedData
      });

      setStagedChanges({});
      // REMOVED: setSelectedIds([]); // Don't clear selection as requested
      toast.success('Değişiklikler kaydedildi.');
    } catch (error) {
      console.error(error);
      toast.error('Kaydetme hatası.');
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress(0);
    }
  };

  const handleDeleteBulkHistory = async (id) => {
    if (!window.confirm('Bu işlem geçmişini silmek istediğinize emin misiniz?')) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/bulkHistory`, id));
      toast.success('İşlem geçmişi silindi.');
    } catch (error) {
      console.error(error);
      toast.error('Silme hatası.');
    }
  };

  const handleClearBulkHistory = async () => {
    if (bulkHistory.length === 0) return;
    if (!window.confirm('Tüm toplu işlem geçmişini temizlemek istediğinize emin misiniz?')) return;
    try {
      const batch = writeBatch(db);
      bulkHistory.forEach(item => {
        batch.delete(doc(db, `users/${user.uid}/bulkHistory`, item.id));
      });
      await batch.commit();
      toast.success('Tüm geçmiş temizlendi.');
    } catch (error) {
      console.error(error);
      toast.error('Temizleme hatası.');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`${selectedIds.length} işlemi silmek istediğinize emin misiniz?`)) return;
    setIsBulkProcessing(true);
    setBulkProgress(0);

    const batch = writeBatch(db);
    const affectedData = [];
    const total = selectedIds.length;

    selectedIds.forEach((id, i) => {
      const t = transactions.find(item => item.id === id);
      if (t) {
        affectedData.push({ id, ...t });
        batch.update(doc(db, `users/${user.uid}/bankTransactions`, id), { deleted: true });
      }
      if (i % 10 === 0) setBulkProgress(Math.round(((i + 1) / total) * 100));
    });

    try {
      await batch.commit();
      await addDoc(collection(db, `users/${user.uid}/bulkHistory`), { timestamp: serverTimestamp(), type: 'DELETE', count: total, affectedData });
      setSelectedIds([]);
      toast.success('İşlemler silindi.');
    } catch (error) {
      console.error(error);
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress(0);
    }
  };

  const handleUndoBulkAction = async (historyItem) => {
    if (!window.confirm('Bu toplu işlemi geri almak istediğinize emin misiniz?')) return;
    setIsBulkProcessing(true);
    setBulkProgress(0);
    const batch = writeBatch(db);
    const total = historyItem.affectedData.length;

    try {
      if (historyItem.type === 'DELETE') {
        historyItem.affectedData.forEach((item, i) => {
          batch.update(doc(db, `users/${user.uid}/bankTransactions`, item.id), { deleted: false });
          if (i % 10 === 0) setBulkProgress(Math.round(((i + 1) / total) * 100));
        });
      } else {
        historyItem.affectedData.forEach((item, i) => {
          // item.prev is an object { date: '...', bankId: '...' }
          batch.update(doc(db, `users/${user.uid}/bankTransactions`, item.id), item.prev);
          if (i % 10 === 0) setBulkProgress(Math.round(((i + 1) / total) * 100));
        });
      }

      await batch.commit();
      await deleteDoc(doc(db, `users/${user.uid}/bulkHistory`, historyItem.id));
      toast.success('İşlem başarıyla geri alındı.');
    } catch (error) {
      console.error(error);
      toast.error('Geri alma işlemi başarısız oldu.');
    } finally {
      setIsBulkProcessing(false);
      setBulkProgress(0);
    }
  };

  const handleTransactionDragEnd = async (event) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const isMultiDrag = selectedIds.length > 1 && selectedIds.includes(active.id);
      let newVisualOrder;

      if (!isMultiDrag) {
        const oldIndex = sortedTransactions.findIndex(t => t.id === active.id);
        const newIndex = sortedTransactions.findIndex(t => t.id === over.id);
        newVisualOrder = arrayMove(sortedTransactions, oldIndex, newIndex);
      } else {
        if (selectedIds.includes(over.id)) return; // Do nothing if dropped within selection

        const sortedSelectedItems = sortedTransactions.filter(t => selectedIds.includes(t.id));
        const remainingTransactions = sortedTransactions.filter(t => !selectedIds.includes(t.id));

        let dropIndex = remainingTransactions.findIndex(t => t.id === over.id);
        if (dropIndex === -1) return;

        const activeOriginalIndex = sortedTransactions.findIndex(t => t.id === active.id);
        const overOriginalIndex = sortedTransactions.findIndex(t => t.id === over.id);

        if (activeOriginalIndex < overOriginalIndex) {
          dropIndex += 1;
        }

        newVisualOrder = [
          ...remainingTransactions.slice(0, dropIndex),
          ...sortedSelectedItems,
          ...remainingTransactions.slice(dropIndex)
        ];
      }

      const newTransactions = [...transactions];
      const batch = writeBatch(db);

      newVisualOrder.forEach((t, index) => {
        const tIndex = newTransactions.findIndex(tx => tx.id === t.id);
        if (tIndex !== -1) {
          newTransactions[tIndex] = { ...newTransactions[tIndex], order: index };
        }
        batch.update(doc(db, `users/${user.uid}/bankTransactions`, t.id), { order: index });
      });

      setTransactions(newTransactions);
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
      sortedBanks.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
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

  // ── Tag helpers ────────────────────────────────────────────────────────────
  // Resolve a stored value (may be an ID or a legacy name string) to a tag object
  const resolveTag = (tagList, idOrName) => {
    if (!idOrName) return null;
    // Try by ID first
    const byId = tagList.find(t => t.id === idOrName);
    if (byId) return byId;
    // Fallback: legacy name-based match
    return tagList.find(t => t.name?.toLowerCase() === idOrName?.toLowerCase()) || null;
  };

  const getTagStyleById = (tagList, idOrName) => {
    const tag = resolveTag(tagList, idOrName);
    const color = COLORS.find(c => c.name === tag?.color) || COLORS[0];
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      return { 
        backgroundColor: `${color.text}33`, 
        color: color.text, 
        border: `1px solid ${color.text}66`,
        filter: 'brightness(1.5) saturate(1.2)'
      };
    }
    return { backgroundColor: color.bg, color: color.text };
  };

  // ── Tag CRUD (collection-based) ────────────────────────────────────────────
  const handleAddTag = async (collectionName, tagList, name, color = 'Gray') => {
    const existing = tagList.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing.id;
    const newDoc = await addDoc(collection(db, `users/${user.uid}/${collectionName}`), {
      name, color, order: tagList.length, createdAt: new Date()
    });
    return newDoc.id;
  };

  const handleReorderTags = async (collectionName, tagList, oldIndex, newIndex) => {
    const reordered = arrayMove(tagList, oldIndex, newIndex);
    const batch = writeBatch(db);
    reordered.forEach((tag, i) => {
      batch.update(doc(db, `users/${user.uid}/${collectionName}`, tag.id), { order: i });
    });
    await batch.commit();
  };

  const handleUpdateTag = async (collectionName, tagId, newName, newColor) => {
    await updateDoc(doc(db, `users/${user.uid}/${collectionName}`, tagId), { name: newName, color: newColor });
  };

  const handleDeleteTag = async (collectionName, tagList, tagId) => {
    // Determine which transaction field to check
    const field = collectionName === 'quickActions' ? 'quickActions' : 'type';
    const usages = transactions.filter(t => {
      if (field === 'quickActions') return Array.isArray(t.quickActions) && t.quickActions.includes(tagId);
      return t.type === tagId;
    });

    const confirmMsg = usages.length > 0
      ? `Bu etiket ${usages.length} işlemde kullanılıyor. Silerseniz bu işlemlerden de kaldırılacaktır. Devam etmek istiyor musunuz?`
      : 'Bu etiketi silmek istediğinize emin misiniz?';

    if (!window.confirm(confirmMsg)) return;

    await deleteDoc(doc(db, `users/${user.uid}/${collectionName}`, tagId));

    if (usages.length > 0) {
      const batch = writeBatch(db);
      usages.forEach(t => {
        const transRef = doc(db, `users/${user.uid}/bankTransactions`, t.id);
        if (field === 'quickActions') {
          batch.update(transRef, { quickActions: (t.quickActions || []).filter(a => a !== tagId) });
        } else {
          batch.update(transRef, { type: '' });
        }
      });
      await batch.commit();
    }
  };

  const handleUpdatePropertyVisibility = async (propId, isVisible) => {
    const updatedVisibility = { ...(config.propertyVisibility || {}), [propId]: isVisible };
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, propertyVisibility: updatedVisibility }, { merge: true });
  };

  const handleToggleBankVisibility = async (bank, isVisible) => {
    const collectionName = bank.source || 'banks';
    await updateDoc(doc(db, `users/${user.uid}/${collectionName}`, bank.id), { visible: isVisible });
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
    const sortConfig = propId ? { propId, direction } : null;
    await setDoc(configRef, { ...config, sortConfig }, { merge: true });
  };

  const handleUpdatePropertyOrder = async (oldIndex, newIndex) => {
    const order = Array.isArray(config.propertyOrder) ? config.propertyOrder : PROPERTIES.map(p => p.id);
    const updatedOrder = arrayMove(order, oldIndex, newIndex);
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, propertyOrder: updatedOrder }, { merge: true });
  };

  const toggleAllProperties = async (visible) => {
    const updatedVisibility = PROPERTIES.reduce((acc, p) => ({ ...acc, [p.id]: visible }), {});
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, propertyVisibility: updatedVisibility }, { merge: true });
  };

  const handleUpdateDateFormat = async (format) => {
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, dateFormat: format }, { merge: true });
  };

  const handleUpdateGroupBy = async (propId) => {
    const configRef = doc(db, `users/${user.uid}/config`, 'bankSettings');
    await setDoc(configRef, { ...config, groupBy: propId }, { merge: true });
  };

  const groupedTransactions = useMemo(() => {
    if (!config.groupBy) return null;
    const groups = {};
    transactions.filter(t => !t.deleted).forEach(t => {
      let key = 'Empty';
      let label = 'Değer Yok';
      let icon = null;
      let color = 'Gray';

      if (config.groupBy === 'bankId') {
        key = t.bankId || 'Empty';
        const bank = getBankInfo(key);
        label = bank.name || 'Bilinmeyen Banka';
        icon = bank.logo ? <img src={bank.logo} alt="" width="16" height="16" className="rounded-circle me-2" /> : <Landmark size={14} className="me-2 text-muted" />;
      } else if (config.groupBy === 'type') {
        key = t.type || 'Empty';
        const tag = resolveTag(typeTags, key);
        label = tag?.name || 'Türsüz';
        color = tag?.color || 'Gray';
      } else if (config.groupBy === 'quickActions') {
        const ids = Array.isArray(t.quickActions) ? t.quickActions : [];
        key = ids.length > 0 ? ids[0] : 'Empty';
        const tag = resolveTag(quickActionTags, key);
        label = tag?.name || 'İşlemsiz';
        color = tag?.color || 'Gray';
      }

      if (!groups[key]) groups[key] = { id: key, label, icon, color, items: [] };
      groups[key].items.push(t);
    });
    const groupsList = Object.values(groups);
    const settings = groupSettings[config.groupBy] || {};
    const order = settings.order || [];
    const visibility = settings.visibility || {};

    groupsList.sort((a, b) => {
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a.label || '').localeCompare(b.label || '');
    });

    return groupsList.filter(g => visibility[g.id] !== false);
  }, [transactions, config.groupBy, banks, typeTags, quickActionTags, groupSettings]);



  const allGroupsForSettings = useMemo(() => {
    if (!config.groupBy) return [];
    const groups = {};
    transactions.filter(t => !t.deleted).forEach(t => {
      let key = 'Empty';
      let label = 'Değer Yok';
      let icon = null;
      let color = 'Gray';

      if (config.groupBy === 'bankId') {
        key = t.bankId || 'Empty';
        const bank = getBankInfo(key);
        label = bank.name || 'Bilinmeyen Banka';
        icon = bank.logo ? <img src={bank.logo} alt="" width="16" height="16" className="rounded-circle me-2" /> : <Landmark size={14} className="me-2 text-muted" />;
      } else if (config.groupBy === 'type') {
        key = t.type || 'Empty';
        const tag = resolveTag(typeTags, key);
        label = tag?.name || 'Türsüz';
        color = tag?.color || 'Gray';
      } else if (config.groupBy === 'quickActions') {
        const ids = Array.isArray(t.quickActions) ? t.quickActions : [];
        key = ids.length > 0 ? ids[0] : 'Empty';
        const tag = resolveTag(quickActionTags, key);
        label = tag?.name || 'İşlemsiz';
        color = tag?.color || 'Gray';
      }

      if (!groups[key]) groups[key] = { id: key, label, icon, color, items: [] };
      groups[key].items.push(t);
    });
    const groupsList = Object.values(groups);
    const settings = groupSettings[config.groupBy] || {};
    const order = settings.order || [];
    
    groupsList.sort((a, b) => {
      const idxA = order.indexOf(a.id);
      const idxB = order.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a.label || '').localeCompare(b.label || '');
    });
    return groupsList;
  }, [transactions, config.groupBy, banks, typeTags, quickActionTags, groupSettings]);

  const handleSelect = React.useCallback((id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  }, []);

  const renderCell = React.useCallback((propId, t, tableId = 'LIST_MAIN') => {
    const bank = getBankInfo(t.bankId);
    const displayDate = displayDateFormatted(t.date, config.dateFormat);
    const isWrapped = config.propertyWrap?.[propId] !== false;
    const isEditing = editingCell?.transId === t.id && editingCell?.propId === propId && editingCell?.tableId === tableId;

    const cellStyle = isWrapped ? {} : {
      whiteSpace: 'nowrap', overflow: isEditing ? 'visible' : 'hidden', textOverflow: 'ellipsis',
      maxWidth: propId === 'title' ? '300px' : '200px'
    };

    const startEdit = (e) => {
      e.stopPropagation();
      setEditTarget(e.currentTarget);
      // Auto-save previous cell if exists
      if (editingCell && cellDraft !== null) {
        saveCell(editingCell.transId, editingCell.propId, cellDraft);
      }
      setEditingCell({ transId: t.id, propId, tableId });
      setSearchTerm('');
      let initialValue = t[propId] ?? '';
      if (typeof initialValue === 'number' && propId === 'amount') {
        initialValue = initialValue.toString().replace('.', ',');
      }
      setCellDraft(initialValue);
    };

    // key is intentionally NOT in this object — must be passed directly on <td>
    const tdClass = `cell-editable${isEditing ? ' cell-editing' : ''}`;
    const tdClick = isEditing ? undefined : startEdit;

    switch (propId) {
      case 'date':
        return (
          <td key={`${tableId}_${propId}`} style={{ ...cellStyle, position: 'relative' }} className={tdClass} onClick={tdClick}>
            {isEditing ? (
              <DateCellInput
                value={t.date}
                onSave={(v) => { saveCell(t.id, 'date', v); setEditingCell(null); }}
                onCancel={() => setEditingCell(null)}
              />
            ) : (
              <span className="text-muted small">{displayDate || <span className="opacity-25">Empty</span>}</span>
            )}
          </td>
        );

      case 'title':
        return (
          <td key={`${tableId}_${propId}`} style={cellStyle} className={tdClass} onClick={tdClick}>
            <OverlayCell
              isEditing={isEditing}
              display={<span className={`fw-bold${!isWrapped ? ' text-truncate' : ''}`}>{t.title || <span className="opacity-25">Empty</span>}</span>}
              input={
                <LocalTextInput
                  value={cellDraft || ''}
                  autoFocus
                  suggestions={uniqueTitles}
                  className="border-0 bg-transparent p-0 fw-bold cell-text-input"
                  onSave={(val) => saveCell(t.id, 'title', val)}
                  onCancel={() => setEditingCell(null)}
                />
              }
            />
          </td>
        );

      case 'quickActions': {
        const currentIds = Array.isArray(t.quickActions) ? t.quickActions : [];
        const draftIds = isEditing ? (Array.isArray(cellDraft) ? cellDraft : currentIds) : currentIds;
        return (
          <td key={`${tableId}_${propId}`} style={{ ...cellStyle, position: 'relative', zIndex: isEditing ? 1000 : 1 }} className={tdClass} onClick={tdClick}>
            {isEditing ? (
              <>
                <div className={`d-flex gap-1 ${isWrapped ? 'flex-wrap' : 'overflow-hidden'}`} style={{ cursor: 'default' }}>
                  {draftIds.map((idOrName, i) => {
                    const tag = resolveTag(quickActionTags, idOrName);
                    return tag ? (
                      <span key={i} className="notion-tag m-0 text-nowrap d-inline-flex align-items-center gap-1" style={getTagStyleById(quickActionTags, idOrName)}>
                        {tag.name}
                        <X size={10} style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setCellDraft(draftIds.filter(x => x !== idOrName)); }} />
                      </span>
                    ) : null;
                  })}
                  {draftIds.length === 0 && <span className="text-muted opacity-25 fs-14">Empty</span>}
                </div>
                <Overlay
                  target={editTarget}
                  show={isEditing}
                  placement="bottom-start"
                  rootClose
                  onHide={() => { saveCell(t.id, 'quickActions', draftIds); setEditingCell(null); }}
                  popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'offset', options: { offset: [0, 4] } }, { name: 'preventOverflow', options: { boundary: 'viewport' } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }}
                >
                  {({ placement, arrowProps, show: _show, popper, hasDoneInitialMeasure, ...props }) => (
                    <div {...props} className="glass-card border-0 shadow-lg p-2 overflow-auto" style={{ ...props.style, zIndex: 20000, minWidth: '220px', maxHeight: '300px', overflowX: 'hidden', backgroundColor: 'var(--card-bg)' }}>
                      {quickActionTags.map(tag => (
                        <div key={tag.id}
                          className="d-flex align-items-center gap-2 p-1 px-2 rounded-1 cursor-pointer notion-option-item fs-14"
                          onClick={e => { e.stopPropagation(); setCellDraft(draftIds.includes(tag.id) ? draftIds.filter(x => x !== tag.id) : [tag.id, ...draftIds]); }}
                        >
                          <span className="notion-tag m-0" style={getTagStyleById(quickActionTags, tag.id)}>{tag.name}</span>
                          {draftIds.includes(tag.id) && <Check size={12} className="text-primary ms-auto" />}
                        </div>
                      ))}
                    </div>
                  )}
                </Overlay>
              </>
            ) : (
              <div className={`d-flex gap-1 ${isWrapped ? 'flex-wrap' : 'overflow-hidden'}`}>
                {currentIds.map((idOrName, i) => {
                  const tag = resolveTag(quickActionTags, idOrName);
                  return tag ? (
                    <span key={i} className="notion-tag m-0 text-nowrap" style={getTagStyleById(quickActionTags, idOrName)}>{tag.name}</span>
                  ) : null;
                })}
                {currentIds.length === 0 && <span className="text-muted opacity-25 fs-14">Empty</span>}
              </div>
            )}
          </td>
        );
      }

      case 'type': {
        const typeTag = resolveTag(typeTags, t.type);
        const draftTypeId = isEditing ? cellDraft : t.type;
        return (
          <td key={`${tableId}_${propId}`} style={{ ...cellStyle, position: 'relative', zIndex: isEditing ? 1000 : 1 }} className={tdClass} onClick={tdClick}>
            {isEditing ? (
              <>
                <div className="p-0 border-0 bg-transparent" style={{ cursor: 'default' }}>
                  {draftTypeId ? (() => {
                    const tag = resolveTag(typeTags, draftTypeId);
                    return tag ? <span className="notion-tag m-0 d-inline-flex align-items-center gap-1" style={getTagStyleById(typeTags, draftTypeId)}>
                      {tag.name} <X size={10} style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setCellDraft(''); }} />
                    </span> : null;
                  })() : <span className="text-muted opacity-25 fs-14">Empty</span>}
                </div>
                <Overlay
                  target={editTarget}
                  show={isEditing}
                  placement="bottom-start"
                  rootClose
                  onHide={() => { saveCell(t.id, 'type', draftTypeId); setEditingCell(null); }}
                  popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'offset', options: { offset: [0, 4] } }, { name: 'preventOverflow', options: { boundary: 'viewport' } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }}
                >
                  {({ placement, arrowProps, show: _show, popper, hasDoneInitialMeasure, ...props }) => (
                    <div {...props} className="glass-card border-0 shadow-lg p-2 overflow-auto" style={{ ...props.style, zIndex: 20000, minWidth: '200px', maxHeight: '300px', overflowX: 'hidden', backgroundColor: 'var(--card-bg)' }}>
                      {typeTags.map(tag => (
                        <div key={tag.id}
                          className="d-flex align-items-center gap-2 p-1 px-2 rounded-1 cursor-pointer notion-option-item fs-14"
                          onClick={e => { e.stopPropagation(); setCellDraft(draftTypeId === tag.id ? '' : tag.id); }}
                        >
                          <span className="notion-tag m-0" style={getTagStyleById(typeTags, tag.id)}>{tag.name}</span>
                          {draftTypeId === tag.id && <Check size={12} className="text-primary ms-auto" />}
                        </div>
                      ))}
                    </div>
                  )}
                </Overlay>
              </>
            ) : (
              typeTag
                ? <span className="notion-tag m-0" style={getTagStyleById(typeTags, t.type)}>{typeTag.name}</span>
                : <span className="text-muted opacity-25 fs-14">Empty</span>
            )}
          </td>
        );
      }

      case 'amount':
        return (
          <td key={`${tableId}_${propId}`} style={cellStyle} className={tdClass} onClick={tdClick}>
            <OverlayCell
              isEditing={isEditing}
              display={<span className="fw-medium">{t.amount ? formatCurrency(t.amount) : <span className="text-muted opacity-25">Empty</span>}</span>}
              input={
                <LocalTextInput
                  inputMode="text"
                  value={cellDraft ?? ''}
                  autoFocus
                  className="border-0 bg-transparent p-0 fw-medium cell-text-input"
                  onSave={(val) => saveCell(t.id, 'amount', val)}
                  onCancel={() => setEditingCell(null)}
                />
              }
            />
          </td>
        );


      case 'receiptUrl':
        return (
          <td key={`${tableId}_${propId}`} style={cellStyle} className={tdClass} onClick={tdClick}>
            <OverlayCell
              isEditing={isEditing}
              display={
                <div className="d-flex align-items-center justify-content-between w-100 cell-hover-actions">
                  {t.receiptUrl ? (
                    <a href={t.receiptUrl} target="_blank" rel="noreferrer" className="text-muted text-decoration-none small text-truncate d-inline-block flex-grow-1 pe-2" style={{ maxWidth: '100px' }}
                      onClick={e => e.stopPropagation()}>
                      {t.receiptUrl.replace(/^https?:\/\//, '').substring(0, 15)}...
                    </a>
                  ) : (
                    <span className="text-muted opacity-25 fs-14 flex-grow-1 pe-2">Empty</span>
                  )}
                  <div className="d-flex align-items-center gap-1 group-hover-visible bg-theme-light rounded-pill ps-1">
                    <div
                      className="cursor-pointer text-muted p-1 hover-bg-light rounded d-flex align-items-center"
                      title="Panodan Yapıştır"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) saveCell(t.id, 'receiptUrl', text);
                        } catch (err) { console.error('Failed to read clipboard', err); }
                      }}
                    >
                      <Clipboard size={14} />
                    </div>
                    {t.receiptUrl && (
                      <div
                        className="cursor-pointer text-muted p-1 hover-bg-light rounded d-flex align-items-center"
                        title="Kopyala"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(t.receiptUrl);
                        }}
                      >
                        <Copy size={14} />
                      </div>
                    )}
                    {t.receiptUrl && (
                      <div
                        className="cursor-pointer text-danger p-1 hover-bg-light rounded d-flex align-items-center"
                        title="Temizle"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveCell(t.id, 'receiptUrl', '');
                        }}
                      >
                        <Trash2 size={14} />
                      </div>
                    )}
                  </div>
                </div>
              }
              input={
                <LocalTextInput
                  type="url"
                  value={cellDraft ?? ''}
                  autoFocus
                  placeholder="https://..."
                  className="border-0 bg-transparent p-0 cell-text-input"
                  onSave={(val) => saveCell(t.id, 'receiptUrl', val)}
                  onCancel={() => setEditingCell(null)}
                />
              }
            />
          </td>
        );

      case 'bankId': {
        const draftBankId = isEditing ? cellDraft : t.bankId;
        const draftBank = getBankInfo(draftBankId);
        return (
          <td key={`${tableId}_${propId}`} style={{ ...cellStyle, position: 'relative', zIndex: isEditing ? 1000 : 1 }} className={tdClass} onClick={tdClick}>
            {isEditing ? (
              <>
                <div className="d-flex align-items-center gap-2 small" style={{ cursor: 'default' }}>
                  {draftBank.logo ? <img src={draftBank.logo} alt="" width="16" height="16" className="object-fit-contain" /> : <Landmark size={14} className="text-muted" />}
                  <span>{draftBank.name || <span className="text-muted opacity-50">Empty</span>}</span>
                </div>
                <Overlay
                  target={editTarget}
                  show={isEditing}
                  placement="bottom-end"
                  rootClose
                  onHide={() => { saveCell(t.id, 'bankId', draftBankId); setEditingCell(null); }}
                  popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'offset', options: { offset: [0, 4] } }, { name: 'preventOverflow', options: { boundary: 'viewport' } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }}
                >
                  {({ placement, arrowProps, show: _show, popper, hasDoneInitialMeasure, ...props }) => (
                    <div {...props} className="glass-card border-0 shadow-lg p-2 overflow-auto" style={{ ...props.style, zIndex: 20000, minWidth: '200px', maxHeight: '300px', backgroundColor: 'var(--card-bg)' }}>
                      {banks.map(b => (
                        <div key={b.id}
                          className="d-flex align-items-center gap-2 p-1 px-2 rounded-1 cursor-pointer notion-option-item fs-14"
                          onClick={e => { e.stopPropagation(); setCellDraft(b.id); }}
                        >
                          {b.logo ? <img src={b.logo} alt="" width="14" height="14" className="object-fit-contain" /> : <Landmark size={12} className="text-muted" />}
                          <span>{b.name}</span>
                          {draftBankId === b.id && <Check size={12} className="text-primary ms-auto" />}
                        </div>
                      ))}
                    </div>
                  )}
                </Overlay>
              </>
            ) : (
              <div className="d-flex align-items-center gap-2 small">
                {bank.logo ? <img src={bank.logo} alt="" width="18" height="18" className="object-fit-contain rounded-circle" /> : <Landmark size={14} className="text-muted" />}
                <span className={!isWrapped ? 'text-truncate' : ''}>{bank.name || <span className="text-muted opacity-25">Empty</span>}</span>
              </div>
            )}
          </td>
        );
      }

      default: return <td key={`${tableId}_${propId}`} style={cellStyle}></td>;
    }
  }, [editingCell, cellDraft, searchTerm, config, editTarget, typeTags, quickActionTags, banks, uniqueTitles]);



  return (
    <div className="pb-5">
      <style>{`
        [data-theme="dark"] .notion-option-item:hover { background-color: rgba(255, 255, 255, 0.05) !important; }
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
          background: var(--card-bg) !important;
          color: var(--text-main) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
          border-radius: 8px !important;
          min-width: 180px !important;
          z-index: 10002 !important;
          padding: 8px !important;
        }
        .transition-all { transition: all 0.2s ease-in-out; }
        [data-theme="dark"] .hover-bg-light:hover { background-color: rgba(255, 255, 255, 0.05) !important; }
        .hover-bg-light:hover { background-color: rgba(0, 0, 0, 0.03); }
        .x-small { font-size: 11px; }
        @media (max-width: 991px) {
          .bank-card-col-simple {
            max-width: 150px !important;
            width: 150px !important;
            flex: 0 0 150px !important;
          }
          .section-title { font-size: 23px !important; }
        }
      `}</style>
      <div className="mb-md-4 mb-1">
        {/* Mobile Header: Title + Switcher */}
        <div className="d-md-none mb-4">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h1 className="fw-bold m-0 section-title">Banka</h1>
            <div className="d-flex align-items-center gap-2">
              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret" style={{ cursor: 'pointer' }}>
                  <ArrowUpDown size={18} className="text-muted" />
                </Dropdown.Toggle>
                <Dropdown.Menu popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '220px' }}>
                  <div className="px-3 py-1 mb-1 small fw-bold text-muted opacity-50 fs-10">SIRALAMA SEÇENEKLERİ</div>
                  <Dropdown.Item onClick={() => handleAutoSort('name')} className="rounded-2 d-flex align-items-center gap-2">
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0 icon-box-sm"><Type size={15} /></div> İsme Göre (A-Z)
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleAutoSort('date')} className="rounded-2 d-flex align-items-center gap-2">
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0 icon-box-sm"><Calendar size={15} /></div> Eklenme Tarihi
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret" style={{ cursor: 'pointer' }}>
                  <SlidersHorizontal size={20} className="text-muted" />
                </Dropdown.Toggle>
                <Dropdown.Menu popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'computeStyles', options: { adaptive: false } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '220px' }}>
                  <div className="px-3 py-1 mb-1 small fw-bold text-muted opacity-50 fs-10">BANKA VISIBILITY</div>
                  <div className="overflow-auto mb-2" style={{ maxHeight: '200px' }}>
                    {banks.map(bank => (
                      <div key={bank.id} className="d-flex align-items-center justify-content-between px-3 py-1 hover-bg-light rounded-2">
                        <div className="d-flex align-items-center gap-2 overflow-hidden">
                          {bank.logo ? <img src={bank.logo} alt="" width="14" height="14" className="object-fit-contain" /> : <Landmark size={12} className="text-muted" />}
                          <span className="text-truncate" style={{ fontSize: '13px' }}>{bank.name}</span>
                        </div>
                        <div className="cursor-pointer d-flex align-items-center ps-2" onClick={(e) => { e.stopPropagation(); handleToggleBankVisibility(bank, !(bank.visible !== false)); }}>
                          {bank.visible !== false ? <Eye size={14} className="text-dark" /> : <EyeOff size={14} className="text-muted opacity-25" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </Dropdown.Menu>
              </Dropdown>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowBankModal(true)}
                className="d-flex align-items-center gap-1 rounded-pill px-3 shadow-sm ms-2"
              >
                New <ChevronDown size={14} />
              </Button>
            </div>
          </div>
          <div className="d-flex align-items-center gap-1 mobile-scroll-x">
            <Button
              variant="light"
              size="sm"
              onClick={() => handleUpdateLayout('gallery_basic')}
              className={`d-flex align-items-center gap-2 rounded-pill px-3 py-1 fw-medium small border-0 ${viewLayout === 'gallery_basic' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted'}`}
            >
              <LayoutGrid size={16} /> Galeri Basit
            </Button>
            <Button
              variant="light"
              size="sm"
              onClick={() => handleUpdateLayout('table')}
              className={`d-flex align-items-center gap-2 rounded-pill px-3 py-1 fw-medium small border-0 ${viewLayout === 'table' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted'}`}
            >
              <ListIcon size={16} /> Tablo
            </Button>
            <Button
              variant="light"
              size="sm"
              onClick={() => handleUpdateLayout('gallery_advanced')}
              className={`d-flex align-items-center gap-2 rounded-pill px-3 py-1 fw-medium small border-0 ${viewLayout === 'gallery_advanced' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted'}`}
            >
              <LayoutGrid size={16} /> Galeri Gelişmiş
            </Button>
          </div>
        </div>

        <h1 className="fw-bold mb-4 d-none d-md-block">Banka</h1>

        {/* Gallery/Table Switcher Header */}
        <div className="d-none d-md-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-4 gap-3" style={{ position: 'relative', zIndex: '1100 !important' }}>
          <div className="d-flex align-items-center gap-1 mobile-scroll-x">
            <Button
              variant="light"
              size="sm"
              onClick={() => handleUpdateLayout('gallery_basic')}
              className={`d-flex align-items-center gap-2 rounded-pill px-3 py-1 fw-medium small border-0 ${viewLayout === 'gallery_basic' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted'}`}
            >
              <LayoutGrid size={16} /> Galeri Basit
            </Button>
            <Button
              variant="light"
              size="sm"
              onClick={() => handleUpdateLayout('table')}
              className={`d-flex align-items-center gap-2 rounded-pill px-3 py-1 fw-medium small border-0 ${viewLayout === 'table' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted'}`}
            >
              <ListIcon size={16} /> Tablo
            </Button>
            <Button
              variant="light"
              size="sm"
              onClick={() => handleUpdateLayout('gallery_advanced')}
              className={`d-flex align-items-center gap-2 rounded-pill px-3 py-1 fw-medium small border-0 ${viewLayout === 'gallery_advanced' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-muted'}`}
            >
              <LayoutGrid size={16} /> Galeri Gelişmiş
            </Button>
          </div>

          <div className="d-flex align-items-center gap-3 w-md-auto ms-md-auto justify-content-end">
            <div className="d-flex align-items-center gap-3 text-muted">
              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret" style={{ cursor: 'pointer' }}>
                  <ArrowUpDown size={18} />
                </Dropdown.Toggle>
                <Dropdown.Menu popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'computeStyles', options: { adaptive: false } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '220px' }}>
                  <div className="px-3 py-1 mb-1 small fw-bold text-muted opacity-50 fs-10">SIRALAMA SEÇENEKLERİ</div>
                  <Dropdown.Item onClick={() => handleAutoSort('name')} className="rounded-2 d-flex align-items-center gap-2">
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0 icon-box-sm"><Type size={15} /></div> İsme Göre (A-Z)
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleAutoSort('date')} className="rounded-2 d-flex align-items-center gap-2">
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0 icon-box-sm"><Calendar size={15} /></div> Eklenme Tarihi
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>

              <Dropdown align="end" className="d-inline">
                <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret" style={{ cursor: 'pointer' }}>
                  <SlidersHorizontal size={20} />
                </Dropdown.Toggle>
                <Dropdown.Menu popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'computeStyles', options: { adaptive: false } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '220px' }}>
                  <div className="px-3 py-1 mb-1 small fw-bold text-muted opacity-50 fs-10">BANKA VISIBILITY</div>
                  <div className="overflow-auto mb-2" style={{ maxHeight: '200px' }}>
                    {banks.map(bank => (
                      <div key={bank.id} className="d-flex align-items-center justify-content-between px-3 py-1 hover-bg-light rounded-2">
                        <div className="d-flex align-items-center gap-2 overflow-hidden">
                          {bank.logo ? <img src={bank.logo} alt="" width="14" height="14" className="object-fit-contain" /> : <Landmark size={12} className="text-muted" />}
                          <span className="text-truncate" style={{ fontSize: '13px' }}>{bank.name}</span>
                        </div>
                        <div className="cursor-pointer d-flex align-items-center ps-2" onClick={(e) => { e.stopPropagation(); handleToggleBankVisibility(bank, !(bank.visible !== false)); }}>
                          {bank.visible !== false ? <Eye size={14} className="text-dark" /> : <EyeOff size={14} className="text-muted opacity-25" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="dropdown-divider mx-2 opacity-10"></div>

                  <div className="px-3 py-1 mb-1 small fw-bold text-muted opacity-50 fs-10">VIEW OPTIONS</div>
                  <Dropdown.Item onClick={() => handleUpdateLayout('gallery_basic')} className={`rounded-2 d-flex align-items-center gap-2 ${viewLayout === 'gallery_basic' ? 'bg-light' : ''}`}>
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0 icon-box-sm"><LayoutGrid size={15} /></div> Galeri Basit
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleUpdateLayout('table')} className={`rounded-2 d-flex align-items-center gap-2 ${viewLayout === 'table' ? 'bg-light' : ''}`}>
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0 icon-box-sm"><ListIcon size={15} /></div> Tablo
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleUpdateLayout('gallery_advanced')} className={`rounded-2 d-flex align-items-center gap-2 ${viewLayout === 'gallery_advanced' ? 'bg-light' : ''}`}>
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0 icon-box-sm"><LayoutGrid size={15} /></div> Galeri Gelişmiş
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
        <div style={{ position: 'relative', zIndex: 5 }}>
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
                <div className="glass-card border shadow-sm overflow-hidden mb-md-5 mb-0" style={{ borderRadius: '12px' }}>
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
                      {banks.filter(bank => bank.visible !== false).map(bank => (
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
                        <td className="ps-4 py-3 fs-15">
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
                <Row className="g-3 mb-md-5 mb-0 row-cols-lg-6 row-cols-md-3 row-cols-2 flex-md-wrap flex-nowrap mobile-scroll-cards pb-2">
                  {banks.filter(bank => bank.visible !== false).map(bank => (
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
                  <Col className={viewLayout === 'gallery_basic' ? 'bank-card-col-simple' : ''}>
                    <div
                      className="h-100 glass-card border border-dashed shadow-sm d-flex flex-column justify-content-center p-2 text-muted opacity-50"
                      style={{ border: '1px dashed rgba(0,0,0,0.1)', cursor: 'pointer', borderRadius: '12px', minHeight: viewLayout === 'gallery_advanced' ? '180px' : '85px' }}
                      onClick={() => setShowBankModal(true)}
                    >
                      <div className="d-flex align-items-center gap-2 mb-1 justify-content-center">
                        <Plus size={14} /> <span style={{ fontSize: '16px' }}>Yeni Banka ekle</span>
                      </div>
                      <div className="text-center fs-15">
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

      <hr className="my-md-5 my-4 opacity-5" />

      {/* Transactions Section */}
      <div className="d-flex align-items-center justify-content-between mb-4 gap-3" style={{ position: 'relative', zIndex: 20 }}>
        <h1 className="fw-bold m-0 section-title">Banka İşlemleri</h1>
        <div className="d-flex align-items-center gap-3 w-auto" style={{ overflow: 'visible !important' }}>
          <div className="d-flex align-items-center gap-3 text-muted  ">

            <Dropdown align="end" className="d-inline" autoClose="outside" onToggle={(isOpen) => !isOpen && setSettingsView('main')}>
              <Dropdown.Toggle as="div" className="p-1 dropdown-no-caret cursor-pointer hover-text-primary transition-all">
                <SlidersHorizontal size={20} />
              </Dropdown.Toggle>
              <Dropdown.Menu rootCloseEvent="mousedown" popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'computeStyles', options: { adaptive: false } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '300px', zIndex: 10001 }}>
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
                      <div className="px-1 py-1">
                        <div className="bg-light bg-opacity-50 rounded-3 p-2 d-flex flex-column gap-2 overflow-auto" style={{ maxHeight: '350px' }}>
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <span className="fs-11 fw-bold text-muted opacity-50">SÜTUNLAR</span>
                          <div className="d-flex gap-2">
                            <span className="fs-10 text-primary cursor-pointer fw-bold hover-underline" onClick={(e) => { e.stopPropagation(); toggleAllProperties(true); }}>Tümünü Aç</span>
                            <span className="fs-10 text-primary cursor-pointer fw-bold hover-underline" onClick={(e) => { e.stopPropagation(); toggleAllProperties(false); }}>Kapat</span>
                          </div>
                        </div>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(e) => {
                            const { active, over } = e;
                            if (active && over && active.id !== over.id) {
                              const order = Array.isArray(config.propertyOrder) ? config.propertyOrder : PROPERTIES.map(p => p.id);
                              const oldIdx = order.indexOf(active.id);
                              const newIdx = order.indexOf(over.id);
                              handleUpdatePropertyOrder(oldIdx, newIdx);
                            }
                          }}
                        >
                          <SortableContext
                            items={Array.isArray(config.propertyOrder) ? config.propertyOrder : PROPERTIES.map(p => p.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="d-flex flex-column gap-1">
                              {(Array.isArray(config.propertyOrder) ? config.propertyOrder : PROPERTIES.map(p => p.id))
                                .map(id => {
                                  const prop = PROPERTIES.find(p => p.id === id);
                                  if (!prop) return null;
                                  return (
                                    <SortablePropertyItem
                                      key={id}
                                      prop={prop}
                                      icon={getPropertyIcon(id, config)}
                                      isVisible={config.propertyVisibility?.[id] !== false}
                                      toggleVisibility={(id) => handleUpdatePropertyVisibility(id, !(config.propertyVisibility?.[id] !== false))}
                                    />
                                  );
                                })}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </div>
                    </div>
                  </Collapse>
                </div>

                  <div className="dropdown-divider mx-2 opacity-10"></div>

                  <div className="px-3 py-2 mb-1 small fw-bold text-muted opacity-50 fs-10">İŞLEM SEÇENEKLERİ</div>
                  <Dropdown.Item onClick={() => setShowTagModal(true)} className="rounded-2 d-flex align-items-center gap-2 py-2 small">
                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '28px', height: '28px' }}><Settings size={16} className="text-muted" /></div> 
                    <span>Etiketleri Yönet</span>
                  </Dropdown.Item>
                </div>
              </Dropdown.Menu>
            </Dropdown>
          </div>
          <Button
            variant="light"
            size="sm"
            onClick={() => setShowImportModal(true)}
            className="d-flex align-items-center gap-2 rounded-pill px-3 shadow-sm border glass-card"
          >
            <Upload size={14} /> <span className="d-none d-md-inline">Import</span>
          </Button>
          <div className="d-flex align-items-center shadow-sm rounded-pill overflow-hidden" style={{ background: '#0d6efd' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleQuickNewTransaction}
              className="border-0 px-3 h-100 rounded-0 border-end"
              style={{ borderColor: 'rgba(255,255,255,0.2) !important' }}
            >
              New
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowTransactionModal(true)}
              className="border-0 px-2 h-100 rounded-0 d-flex align-items-center"
            >
              <ChevronDown size={14} />
            </Button>
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="position-sticky top-0 mb-2" style={{ zIndex: 2000 }}>
          <div className="glass-card p-1 d-flex align-items-center flex-wrap gap-1" style={{ minHeight: '48px', height: 'auto', width: 'fit-content', maxWidth: '100%' }}>
            <div className="px-3 border-end text-primary fw-medium small d-flex align-items-center gap-2">
              {selectedIds.length} selected
              <div
                className="hover-bg-secondary rounded p-0 d-flex align-items-center justify-content-center opacity-50 hover-opacity-100 transition-all cursor-pointer"
                style={{ width: '16px', height: '16px' }}
                onClick={() => setSelectedIds([])}
              >
                <X size={12} />
              </div>
            </div>
            <div className="d-flex align-items-center gap-1 px-1 mobile-scroll-x">
              {/* Date Update */}
              <BulkDateInput
                value={stagedChanges.date}
                onSave={(val) => setStagedChanges(prev => ({ ...prev, date: val }))}
                onClear={() => setStagedChanges(prev => {
                  const newState = { ...prev };
                  delete newState.date;
                  return newState;
                })}
              />

              {/* Title Update */}
              <BulkTitleInput
                value={stagedChanges.title}
                onSave={(val) => setStagedChanges(prev => ({ ...prev, title: val }))}
                onClear={() => setStagedChanges(prev => {
                  const newState = { ...prev };
                  delete newState.title;
                  return newState;
                })}
              />

              {/* Bank Update */}
              <Dropdown autoClose="outside" className="d-inline">
                <Dropdown.Toggle as="button" type="button" className={`btn btn-link text-dark text-decoration-none py-1 px-2 hover-bg-light rounded-2 d-flex flex-column align-items-center justify-content-center cursor-pointer dropdown-no-caret ${stagedChanges.bankId ? 'text-primary' : ' '}`} style={{ minWidth: '80px', minHeight: '40px' }}>
                  <div className="d-flex align-items-center gap-1 opacity-50 w-100 justify-content-center" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    <Landmark size={10} /> Bankalar
                    {stagedChanges.bankId && (
                      <X
                        size={10}
                        className="ms-1 hover-text-danger transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedChanges(prev => {
                            const newState = { ...prev };
                            delete newState.bankId;
                            return newState;
                          });
                        }}
                      />
                    )}
                  </div>
                  {stagedChanges.bankId && (
                    <div className="d-flex align-items-center gap-1 fw-bold mt-0.5" style={{ fontSize: '12px' }}>
                      {getBankInfo(stagedChanges.bankId).logo && <img src={getBankInfo(stagedChanges.bankId).logo} alt="" width="12" height="12" className="rounded-circle" />}
                      {getBankInfo(stagedChanges.bankId).name}
                    </div>
                  )}
                </Dropdown.Toggle>
                <Dropdown.Menu rootCloseEvent="mousedown" popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-1" style={{ minWidth: '180px' }}>
                  {banks.map(bank => (
                    <Dropdown.Item
                      key={bank.id}
                      className="d-flex align-items-center gap-2 p-1 px-2 rounded-1 cursor-pointer notion-option-item fs-14 border-0 bg-transparent"
                      onClick={() => setStagedChanges(prev => ({ ...prev, bankId: bank.id }))}
                    >
                      {bank.logo && <img src={bank.logo} alt="" width="16" height="16" className="rounded-circle" />}
                      <span className="flex-grow-1">{bank.name}</span>
                      {stagedChanges.bankId === bank.id && <Check size={12} className="text-primary ms-auto" />}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>

              {/* Type Update */}
              <Dropdown autoClose="outside" className="d-inline">
                <Dropdown.Toggle as="button" type="button" className={`btn btn-link text-dark text-decoration-none py-1 px-2 hover-bg-light rounded-2 d-flex flex-column align-items-center justify-content-center cursor-pointer dropdown-no-caret ${stagedChanges.type ? 'text-primary' : ' '}`} style={{ minWidth: '90px', minHeight: '40px' }}>
                  <div className="d-flex align-items-center gap-1 opacity-50 w-100 justify-content-center" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    <Tag size={10} /> İşlem Türü
                    {stagedChanges.type && (
                      <X
                        size={10}
                        className="ms-1 hover-text-danger transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedChanges(prev => {
                            const newState = { ...prev };
                            delete newState.type;
                            return newState;
                          });
                        }}
                      />
                    )}
                  </div>
                  {stagedChanges.type && (
                    <div className="d-flex align-items-center gap-1 fw-bold mt-0.5" style={{ fontSize: '12px' }}>
                      <span className="px-2 py-0 rounded-1" style={{ backgroundColor: (COLORS.find(c => c.name === typeTags.find(t => t.id === stagedChanges.type)?.color) || COLORS[0]).bg, color: (COLORS.find(c => c.name === typeTags.find(t => t.id === stagedChanges.type)?.color) || COLORS[0]).text, fontSize: '10px' }}>
                        {typeTags.find(t => t.id === stagedChanges.type)?.name}
                      </span>
                    </div>
                  )}
                </Dropdown.Toggle>
                <Dropdown.Menu rootCloseEvent="mousedown" popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-1 overflow-auto" style={{ minWidth: '180px', maxHeight: '300px', overflowX: 'hidden' }}>
                  {typeTags.map(tag => (
                    <Dropdown.Item
                      key={tag.id}
                      className="d-flex align-items-center gap-2 p-1 px-2 rounded-1 cursor-pointer notion-option-item fs-14 border-0 bg-transparent"
                      onClick={() => setStagedChanges(prev => ({ ...prev, type: tag.id }))}
                    >
                      <span className="notion-tag m-0" style={getTagStyleById(typeTags, tag.id)}>{tag.name}</span>
                      {stagedChanges.type === tag.id && <Check size={12} className="text-primary ms-auto" />}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>

              {/* Quick Actions Update */}
              <Dropdown autoClose="outside" className="d-inline">
                <Dropdown.Toggle as="button" type="button" className={`btn btn-link text-dark text-decoration-none py-1 px-2 hover-bg-light rounded-2 d-flex flex-column align-items-center justify-content-center cursor-pointer dropdown-no-caret ${stagedChanges.quickActions?.length > 0 ? 'text-primary' : ' '}`} style={{ minWidth: '100px', minHeight: '40px' }}>
                  <div className="d-flex align-items-center gap-1 opacity-50 w-100 justify-content-center" style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    <Zap size={10} /> Hızlı İşlemler
                    {stagedChanges.quickActions?.length > 0 && (
                      <X
                        size={10}
                        className="ms-1 hover-text-danger transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStagedChanges(prev => {
                            const newState = { ...prev };
                            delete newState.quickActions;
                            return newState;
                          });
                        }}
                      />
                    )}
                  </div>
                  {stagedChanges.quickActions?.length > 0 && (
                    <div className="d-flex flex-wrap align-items-center justify-content-center gap-1 fw-bold mt-0.5 px-1" style={{ fontSize: '12px' }}>
                      {stagedChanges.quickActions.map(tagId => {
                        const tag = quickActionTags.find(t => t.id === tagId);
                        return tag ? (
                          <span key={tagId} className="px-1.5 py-0 rounded-1" style={{ backgroundColor: (COLORS.find(c => c.name === tag.color) || COLORS[0]).bg, color: (COLORS.find(c => c.name === tag.color) || COLORS[0]).text, fontSize: '9px' }}>
                            {tag.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </Dropdown.Toggle>
                <Dropdown.Menu rootCloseEvent="mousedown" popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-1 overflow-auto" style={{ minWidth: '200px', maxHeight: '300px', overflowX: 'hidden' }}>
                  {quickActionTags.map(tag => {
                    const isSelected = stagedChanges.quickActions?.includes(tag.id);
                    return (
                      <Dropdown.Item
                        key={tag.id}
                        className="d-flex align-items-center gap-2 p-1 px-2 rounded-1 cursor-pointer notion-option-item fs-14 border-0 bg-transparent"
                        onClick={() => {
                          setStagedChanges(prev => {
                            const current = prev.quickActions || [];
                            const next = current.includes(tag.id)
                              ? current.filter(id => id !== tag.id)
                              : [...current, tag.id];
                            return { ...prev, quickActions: next };
                          });
                        }}
                      >
                        <span className="notion-tag m-0" style={getTagStyleById(quickActionTags, tag.id)}>{tag.name}</span>
                        {isSelected && <Check size={12} className="text-primary ms-auto" />}
                      </Dropdown.Item>
                    );
                  })}
                </Dropdown.Menu>
              </Dropdown>

              <div className="border-start ms-1 ps-1 d-flex align-items-center gap-1">
                {Object.keys(stagedChanges).length > 0 && (
                  <div className="d-flex align-items-center gap-1 me-1">
                    <Button
                      variant="primary"
                      size="sm"
                      className="position-relative overflow-hidden rounded-pill px-3 fw-bold d-flex align-items-center gap-2 shadow-sm border-0 transition-all"
                      disabled={isBulkProcessing}
                      onClick={handleBulkSave}
                      style={{
                        minWidth: '90px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #006fee 0%, #005bc4 100%)',
                        fontSize: '13px'
                      }}
                    >
                      <div
                        className="position-absolute top-0 start-0 h-100 transition-all duration-300"
                        style={{
                          width: `${bulkProgress}%`,
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          zIndex: 0
                        }}
                      />
                      <span className="position-relative" style={{ zIndex: 1 }}>
                        {isBulkProcessing ? `%${bulkProgress}` : 'Kaydet'}
                      </span>
                    </Button>
                    <Button
                      variant="light"
                      size="sm"
                      className="rounded-circle d-flex align-items-center justify-content-center p-0 shadow-sm border"
                      style={{ width: '28px', height: '28px' }}
                      onClick={() => setStagedChanges({})}
                      disabled={isBulkProcessing}
                      title="Temizle"
                    >
                      <X size={14} className="text-muted" />
                    </Button>
                  </div>
                )}

                <Button variant="link" className="text-danger p-2 hover-bg-light rounded-2" onClick={handleBulkDelete} disabled={isBulkProcessing}>
                  <Trash2 size={16} />
                </Button>

                {/* Bulk History (Undo) */}
                <Dropdown align="end">
                  <Dropdown.Toggle as="button" type="button" className="btn btn-link text-muted p-2 hover-bg-light rounded-2 cursor-pointer transition-all dropdown-no-caret border-0">
                    <RotateCcw size={16} />
                  </Dropdown.Toggle>
                  <Dropdown.Menu popperConfig={{ placement: 'bottom-end', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ minWidth: '350px' }}>
                    <div className="d-flex align-items-center justify-content-between px-2 border-bottom pb-1 mb-2">
                      <div className="x-small fw-bold text-muted">TOPLU İŞLEM GEÇMİŞİ</div>
                      {bulkHistory.length > 0 && (
                        <div
                          className="x-small text-danger fw-bold cursor-pointer hover-  transition-all"
                          style={{ fontSize: '10px', letterSpacing: '0.02em' }}
                          onClick={(e) => { e.stopPropagation(); handleClearBulkHistory(); }}
                        >
                          TÜMÜNÜ SİL
                        </div>
                      )}
                    </div>
                    {bulkHistory.length === 0 && <div className="text-center py-3 text-muted small">Geçmiş işlem bulunamadı</div>}
                    {bulkHistory.map(item => (
                      <div key={item.id} className="p-2 border-bottom last-border-0 hover-bg-light rounded-2 d-flex align-items-center justify-content-between gap-3 mb-1">
                        <div className="d-flex flex-column gap-1">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-theme-light fw-bold" style={{ fontSize: '10px' }}>{item.count} İşlem</span>
                            <span className="text-muted" style={{ fontSize: '11px' }}>
                              {item.timestamp?.toDate().toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="small fw-medium">
                            {item.type === 'DELETE' && '🗑️ Toplu Silme'}
                            {item.type === 'BULK_UPDATE' && (
                              <div className="d-flex flex-column">
                                <span className="fw-bold">✏️ Toplu Güncelleme</span>
                                <div className="x-small text-muted mt-1 ps-1" style={{ fontSize: '11px', borderLeft: '2px solid #eee' }}>
                                  {item.fields.map(field => {
                                    const val = item.affectedData?.[0]?.current?.[field];
                                    const label = PROPERTIES.find(p => p.id === field)?.label || field;
                                    let displayVal = val;
                                    if (field === 'bankId') displayVal = getBankInfo(val)?.name || val;
                                    if (field === 'type') displayVal = resolveTag(typeTags, val)?.name || val;
                                    if (field === 'quickActions') {
                                      const ids = Array.isArray(val) ? val : [];
                                      displayVal = ids.map(id => resolveTag(quickActionTags, id)?.name || id).join(', ');
                                    }
                                    if (field === 'date' && val) displayVal = displayDateFormatted(val, config.dateFormat);

                                    return <div key={field} className="text-truncate" style={{ maxWidth: '200px' }}>
                                      <span className=" ">{label}:</span> <span className="fw-bold">{displayVal || 'Boş'}</span>
                                    </div>;
                                  })}
                                </div>
                              </div>
                            )}
                            {item.type === 'UPDATE_BANK' && '🏦 Banka Değişikliği'}
                            {item.type === 'UPDATE_DATE' && '📅 Tarih Değişikliği'}
                            {item.type === 'UPDATE_TYPE' && '🏷️ Tür Değişikliği'}
                            {item.type === 'UPDATE_QUICK_ACTIONS' && '⚡ Hızlı İşlem Değişikliği'}
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="px-2 py-0.5 rounded-pill transition-all shadow-sm border-0"
                            style={{ fontSize: '11px', fontWeight: 600, height: '24px' }}
                            disabled={isBulkProcessing}
                            onClick={() => handleUndoBulkAction(item)}
                          >
                            Geri Al
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="px-2 py-1 x-small fw-bold rounded-pill transition-all d-flex align-items-center justify-content-center"
                            onClick={() => handleDeleteBulkHistory(item.id)}
                            style={{ width: '28px', height: '28px' }}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>
          </div>
        </div>
      )}

        <Card className="glass-card border shadow-sm" style={{ overflow: 'visible', borderRadius: '12px', position: 'relative', zIndex: 15 }}>
          <Table responsive hover className="notion-table mb-0 border-top-0" style={{ overflow: 'visible', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead className="sticky-top" style={{ zIndex: 1010, top: 0 }}>
              {config.filters?.length > 0 && (
                <tr className="border-bottom" style={{ position: 'relative', zIndex: 10 }}>
                  <th colSpan={100} className="py-2 px-3 border-bottom font-normal">
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <div className="text-muted x-small fw-bold d-flex align-items-center gap-1 opacity-50 pe-2 border-end">
                        <Filter size={12} /> FILTERS
                      </div>
                      {config.filters.map(f => {
                        const p = PROPERTIES.find(item => item.id === f.propId);
                        const label = config.propertyLabels?.[f.propId] || p?.label;
                        return (
                          <div key={f.propId} className="glass-card border rounded-pill px-2 py-1 d-flex align-items-center gap-2 shadow-sm" style={{ fontSize: '12px', fontWeight: 400 }}>
                            <span className="text-muted">{label}</span>
                            <Dropdown autoClose="outside">
                              <Dropdown.Toggle as="span" className="fw-bold cursor-pointer hover-text-primary">
                                {f.operator.replace(/_/g, ' ')}
                              </Dropdown.Toggle>
                              <Dropdown.Menu rootCloseEvent="mousedown" className="glass-card border-0 shadow-lg p-1" style={{ zIndex: 10005 }}>
                                {(() => {
                                  if (['type', 'quickActions', 'bankId'].includes(f.propId)) return ['contains', 'does_not_contain', 'is_empty', 'is_not_empty'];
                                  if (f.propId === 'date') return ['is', 'between', 'is_empty', 'is_not_empty'];
                                  return ['is', 'is_not', 'contains', 'does_not_contain', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'];
                                })().map(op => (
                                  <Dropdown.Item key={op} className="small rounded-2" onClick={() => handleUpdateFilter(f.propId, op, f.value)}>
                                    {op.replace(/_/g, ' ')}
                                  </Dropdown.Item>
                                ))}
                              </Dropdown.Menu>
                            </Dropdown>
                            {!['is_empty', 'is_not_empty'].includes(f.operator) && (
                              ['type', 'quickActions', 'bankId'].includes(f.propId) ? (
                                <Dropdown>
                                  <Dropdown.Toggle as="span" className="fw-medium cursor-pointer hover-text-primary text-truncate d-inline-flex align-items-center" style={{ maxWidth: '120px' }}>
                                    {(() => {
                                      if (!f.value) return 'Seçiniz...';
                                      const ids = f.value.split(',').filter(v => v);
                                      if (ids.length > 1) return `${ids.length} Seçili`;
                                      if (f.propId === 'bankId') return getBankInfo(ids[0]).name || 'Bilinmiyor';
                                      if (f.propId === 'type') return typeTags.find(t => t.id === ids[0])?.name || 'Bilinmiyor';
                                      if (f.propId === 'quickActions') return quickActionTags.find(t => t.id === ids[0])?.name || 'Bilinmiyor';
                                      return f.value;
                                    })()}
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu className="glass-card border-0 shadow-lg p-1 overflow-auto" style={{ maxHeight: '300px', minWidth: '150px', zIndex: 10005 }}>
                                    {(f.propId === 'bankId'
                                      ? [...banks].sort((a, b) => (a.order || 0) - (b.order || 0))
                                      : f.propId === 'type'
                                        ? [...typeTags].sort((a, b) => (a.order || 0) - (b.order || 0))
                                        : [...quickActionTags].sort((a, b) => (a.order || 0) - (b.order || 0))
                                    ).map(item => {
                                      const colorObj = COLORS.find(c => c.name === item.color) || COLORS[0];
                                      const isSelected = (f.value || '').split(',').includes(item.id);
                                      return (
                                        <Dropdown.Item
                                          key={item.id}
                                          className="small rounded-2 py-2 mb-1"
                                          onClick={(e) => { e.stopPropagation(); handleUpdateFilter(f.propId, f.operator, item.id); }}
                                        >
                                          <div className="d-flex align-items-center justify-content-between">
                                            <div className="d-flex align-items-center">
                                              {f.propId === 'bankId' && item.logo && (
                                                <img src={item.logo} alt="" width="14" height="14" className="me-2 rounded-circle" style={{ objectFit: 'contain' }} />
                                              )}
                                              <span className={f.propId !== 'bankId' ? "notion-tag m-0 text-nowrap" : ""} style={f.propId !== 'bankId' ? { ...getTagStyleByColor(item.color), fontSize: '11px' } : {}}>
                                                {item.name}
                                              </span>
                                            </div>
                                            {isSelected && <Check size={14} className="text-primary" />}
                                          </div>
                                        </Dropdown.Item>
                                      );
                                    })}
                                  </Dropdown.Menu>
                                </Dropdown>
                              ) : f.propId === 'date' ? (
                                f.operator === 'between' ? (
                                  <div className="d-flex align-items-center gap-1">
                                    <LocalTextInput
                                      type="date"
                                      size="sm"
                                      className="border-0 bg-transparent p-0 fw-medium"
                                      style={{ width: '90px', fontSize: '11px' }}
                                      value={(f.value || '').split(',')[0] || ''}
                                      onSave={val => {
                                        const parts = (f.value || '').split(',');
                                        handleUpdateFilter(f.propId, f.operator, `${val},${parts[1] || ''}`);
                                      }}
                                    />
                                    <span className="text-muted opacity-50" style={{ fontSize: '10px' }}>-</span>
                                    <LocalTextInput
                                      type="date"
                                      size="sm"
                                      className="border-0 bg-transparent p-0 fw-medium"
                                      style={{ width: '90px', fontSize: '11px' }}
                                      value={(f.value || '').split(',')[1] || ''}
                                      onSave={val => {
                                        const parts = (f.value || '').split(',');
                                        handleUpdateFilter(f.propId, f.operator, `${parts[0] || ''},${val}`);
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <LocalTextInput
                                    type="date"
                                    size="sm"
                                    className="border-0 bg-transparent p-0 fw-medium"
                                    style={{ width: '100px', fontSize: '12px' }}
                                    value={f.value || ''}
                                    onSave={val => handleUpdateFilter(f.propId, f.operator, val)}
                                  />
                                )
                              ) : (
                                <LocalTextInput
                                  size="sm"
                                  className="border-0 bg-transparent p-0 fw-medium"
                                  style={{ width: '100px', fontSize: '12px' }}
                                  value={f.value}
                                  onSave={val => handleUpdateFilter(f.propId, f.operator, val)}
                                  onCancel={() => {}}
                                  placeholder="Değer girin..."
                                />
                              )
                            )}
                            <X size={14} className="text-muted cursor-pointer hover-text-danger" onClick={() => handleUpdateFilter(f.propId, null, null)} />
                          </div>
                        );
                      })}
                      <Button variant="link" size="sm" className="text-muted p-0 x-small text-decoration-none ms-auto" onClick={() => updateConfig({ filters: [] })}>Clear all</Button>
                    </div>
                  </th>
                </tr>
              )}
              <tr style={{ position: 'relative', zIndex: 5 }}>
                <th style={{ width: '1px', whiteSpace: 'nowrap', backgroundColor: 'inherit' }} className="ps-2">
                  <Form.Check
                    ref={selectAllRef}
                    type="checkbox"
                    className="notion-checkbox custom-checkbox-sm"
                    checked={selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredTransactions.map(t => t.id));
                      } else {
                        setSelectedIds([]);
                      }
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
                        <Dropdown autoClose="outside" onToggle={(isOpen) => { if (!isOpen) { setShowCalculateSubmenu(false); setShowDateFormatSubmenu(false); } }}>
                          <Dropdown.Toggle as="div" className="btn btn-link p-2 text-decoration-none border-0 d-flex align-items-center gap-2 cursor-pointer dropdown-no-caret hover-bg-light rounded flex-grow-1" style={{ marginLeft: '-8px' }}>
                            <span className="text-muted d-flex align-items-center">{currentIcon}</span>
                            <span className="text-nowrap fw-bold text-dark fs-13">{label}</span>
                            <div className="ms-auto d-flex align-items-center gap-2">
                              {config.sortConfig?.propId === id && (
                                <div className="d-flex align-items-center gap-1">
                                  <span
                                    className="text-primary d-flex align-items-center cursor-pointer hover-bg-secondary rounded p-0 justify-content-center"
                                    style={{ width: '16px', height: '16px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSort(id, config.sortConfig.direction === 'asc' ? 'desc' : 'asc');
                                    }}
                                  >
                                    {config.sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                  </span>
                                  <div
                                    className="hover-bg-secondary rounded p-0 d-flex align-items-center justify-content-center opacity-50 hover-opacity-100 transition-all"
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSort(null, null);
                                    }}
                                  >
                                    <X size={10} />
                                  </div>
                                </div>
                              )}
                              <ChevronDown size={14} className="text-muted opacity-50" />
                            </div>
                          </Dropdown.Toggle>
                          <Dropdown.Menu rootCloseEvent="mousedown" popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '260px', zIndex: 10005 }}>
                            <div className="px-1 py-1 d-flex flex-column gap-1">
                              <Dropdown.Item className="rounded-2 d-flex align-items-center gap-2 py-2 small" onClick={() => handleUpdateFilter(id, 'contains', '')}>
                                <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><Filter size={14} className="text-muted" /></div> 
                                <span>Filter</span>
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
                                        ...(id === 'amount' ? [
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

                              {/* Icon & Label Update */}
                              <div className="px-2 py-1">
                                <div className="d-flex align-items-center gap-2 mb-2">
                                  <Dropdown autoClose="outside" className="d-inline">
                                    <Dropdown.Toggle as="div" className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0 cursor-pointer hover-bg-secondary hover-text-white transition-all shadow-sm" style={{ width: '32px', height: '32px' }}>
                                      {currentIcon}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu rootCloseEvent="mousedown" popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'computeStyles', options: { adaptive: false } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '180px' }}>
                                      <div className="x-small fw-bold text-muted mb-2 px-2">CHOOSE ICON</div>
                                      <div className="d-flex flex-wrap gap-1 justify-content-center">
                                        {ICON_LIST.map(item => (
                                          <div
                                            key={item.name}
                                            className={`rounded d-flex align-items-center justify-content-center cursor-pointer hover-bg-light p-1 ${config.propertyIcons?.[id] === item.name ? 'bg-primary text-white shadow-sm' : ''}`}
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
                                      className="border-0 bg-light rounded-2"
                                      style={{ fontSize: '13px', paddingRight: '25px', height: '32px' }}
                                    />
                                    <div className="position-absolute end-0 top-50 translate-middle-y pe-2 opacity-30">
                                      <Edit2 size={12} />
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="dropdown-divider opacity-10 mx-1"></div>

                              <Dropdown.Item
                                className={`rounded-2 d-flex align-items-center gap-2 py-2 small ${config.sortConfig?.propId === id && config.sortConfig?.direction === 'asc' ? 'bg-light text-primary fw-bold' : ''}`}
                                onClick={() => handleSort(id, 'asc')}
                              >
                                <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><ArrowUp size={14} className="text-muted" /></div> 
                                <span>Sort ascending</span>
                                {config.sortConfig?.propId === id && config.sortConfig?.direction === 'asc' && <Check size={12} className="ms-auto" />}
                              </Dropdown.Item>
                              <Dropdown.Item
                                className={`rounded-2 d-flex align-items-center gap-2 py-2 small ${config.sortConfig?.propId === id && config.sortConfig?.direction === 'desc' ? 'bg-light text-primary fw-bold' : ''}`}
                                onClick={() => handleSort(id, 'desc')}
                              >
                                <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><ArrowDown size={14} className="text-muted" /></div> 
                                <span>Sort descending</span>
                                {config.sortConfig?.propId === id && config.sortConfig?.direction === 'desc' && <Check size={12} className="ms-auto" />}
                              </Dropdown.Item>

                              <div className="dropdown-divider opacity-10 mx-1"></div>

                              <Dropdown.Item
                                className="rounded-2 d-flex align-items-center justify-content-between py-2 small"
                                onClick={() => handleToggleWrap(id)}
                              >
                                <div className="d-flex align-items-center gap-2">
                                  <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><WrapText size={14} className="text-muted" /></div> 
                                  <span>Wrap content</span>
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
                                <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><EyeOff size={14} className="text-muted" /></div> 
                                <span>Hide in view</span>
                              </Dropdown.Item>

                              {['quickActions', 'type', 'bankId'].includes(id) && (
                                <>
                                  <div className="dropdown-divider opacity-10 mx-1"></div>
                                  <Dropdown.Item
                                    className={`rounded-2 d-flex align-items-center gap-2 py-2 small ${config.groupBy === id ? 'bg-light text-primary fw-bold' : ''}`}
                                    onClick={() => handleUpdateGroupBy(config.groupBy === id ? null : id)}
                                  >
                                    <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><Layers size={14} className={config.groupBy === id ? 'text-primary' : 'text-muted'} /></div> 
                                    <span>Gruplandır: {label}</span>
                                    {config.groupBy === id && <Check size={12} className="ms-auto" />}
                                  </Dropdown.Item>
                                </>
                              )}

                              {id === 'date' && (
                                <>
                                  <div className="dropdown-divider opacity-10 mx-1"></div>
                                  <div className="px-1 py-1">
                                    <div 
                                      className="dropdown-item rounded-2 d-flex align-items-center justify-content-between py-2 small cursor-pointer"
                                      onClick={(e) => { e.stopPropagation(); setShowDateFormatSubmenu(!showDateFormatSubmenu); }}
                                    >
                                      <div className="d-flex align-items-center gap-2">
                                        <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><Calendar size={14} className="text-muted" /></div>
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
                                              className={`rounded-2 py-1.5 px-2 small cursor-pointer hover-bg-light d-flex align-items-center justify-content-between ${(config.dateFormat === fmt.value || (!config.dateFormat && fmt.value === 'DD/MM/YYYY')) ? 'bg-light text-primary fw-bold' : 'text-muted'}`}
                                              onClick={(e) => { e.stopPropagation(); handleUpdateDateFormat(fmt.value); }}
                                            >
                                              <span>{fmt.label}</span>
                                              {(config.dateFormat === fmt.value || (!config.dateFormat && fmt.value === 'DD/MM/YYYY')) && <Check size={12} />}
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
                  })
                }
              </tr>
            </thead>
              <tbody>
                {visibleTransactions.map((t, index) => (
                  <TransactionRow
                    key={`LIST_MAIN_${t.id}`}
                    t={t}
                    config={config}
                    selectedIds={selectedIds}
                    isEditing={editingCell?.transId === t.id && editingCell?.tableId === 'LIST_MAIN'}
                    renderCell={renderCell}
                    onSelect={handleSelect}
                    tableId="LIST_MAIN"
                  />
                ))}
                {/* Sentinel for Infinite Scroll */}
                <tr ref={lastElementRef} style={{ height: '10px' }}>
                  <td colSpan="100%" className="border-0"></td>
                </tr>
              </tbody>
            {Object.keys(config.columnCalculations || {}).some(k => config.columnCalculations[k] !== 'none') && (
              <tfoot className="border-top bg-opacity-10 position-sticky bottom-0" style={{ zIndex: 10, backgroundColor: 'var(--card-bg)' }}>
                <tr>
                  <td style={{ width: '1px' }} className="border-bottom-0"></td>
                  {(config.propertyOrder || PROPERTIES.map(p => p.id))
                    .filter(id => config.propertyVisibility?.[id] !== false)
                    .map(id => (
                      <td key={id} className="py-2 px-2 border-start border-light border-opacity-10 border-bottom-0">
                        {renderCalculatedValue(id, getCalculatedValue(id, filteredTransactions))}
                      </td>
                    ))}
                </tr>
              </tfoot>
            )}

            {selectedIds.length === transactions.length && transactions.length > 0 && !isGlobalSelected && totalCount > transactions.length && (
              <div className="bg-light-primary text-center py-2 small border-bottom border-top">
                Sayfadaki {transactions.length} işlemin tümü seçildi. <span className="text-primary fw-bold cursor-pointer" onClick={() => setIsGlobalSelected(true)}>Tüm {totalCount} işlemi seç</span>
              </div>
            )}

            {isGlobalSelected && (
              <div className="bg-light-primary text-center py-2 small border-bottom border-top">
                Tüm {totalCount} işlem seçildi. <span className="text-primary fw-bold cursor-pointer" onClick={() => { setIsGlobalSelected(false); setSelectedIds([]); }}>Seçimi temizle</span>
              </div>
            )}
          </Table>
        </Card>

        {limitCount < sortedTransactions.length && (
          <div className="d-flex align-items-center gap-4 mt-2 mobile-scroll-x">
            <div className="d-flex align-items-center gap-2 py-2 px-3 hover-bg-light cursor-pointer text-muted small rounded-2"
              style={{ width: 'fit-content' }}
              onClick={() => setLimitCount(prev => prev + 100)}>
              <Plus size={14} className="opacity-50" />
              <span>Daha fazla göster</span>
            </div>

            <div className="d-flex align-items-center gap-2 text-muted x-small border-start ps-4">
              <span className="opacity-50 fw-bold">GÖRÜNÜM LİMİTİ:</span>
              {[20, 50, 100, 500].map(v => (
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
                  setLimitCount(100); // Start with 100 when view all is clicked
                }}
              >
                Hepsini Gör ({sortedTransactions.length})
              </span>
            </div>
          </div>
        )}

      <hr className="my-md-5 my-4 opacity-5" />

      {config.groupBy && (
        <div className="mt-5 pb-5">
          <div className="d-flex align-items-center justify-content-between mb-4 gap-3">
            <h1 className="fw-bold m-0 section-title">Banka Grup İşlemleri</h1>
            <Dropdown autoClose="outside">
              <Dropdown.Toggle as="div" className="cursor-pointer text-muted hover-text-primary p-2 rounded-circle hover-bg-light transition-all d-flex align-items-center justify-content-center">
                <Settings size={20} />
              </Dropdown.Toggle>
              <Dropdown.Menu rootCloseEvent="mousedown" popperConfig={{ strategy: 'fixed', modifiers: [{ name: 'computeStyles', options: { adaptive: false } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-3" style={{ width: '280px' }}>
                <div className="x-small fw-bold text-muted mb-3 px-1">GRUP AYARLARI</div>
                <div className="group-settings-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupOrderDragEnd}>
                    <SortableContext items={allGroupsForSettings.map(g => g.id)} strategy={verticalListSortingStrategy}>
                      {allGroupsForSettings.map(group => (
                        <SortableGroupItem
                          key={group.id}
                          id={group.id}
                          label={group.label}
                          icon={group.icon}
                          visible={(groupSettings[config.groupBy]?.visibility?.[group.id]) !== false}
                          onToggle={() => toggleGroupVisibility(group.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
                {allGroupsForSettings.length === 0 && (
                  <div className="text-center py-4 text-muted small opacity-50 italic">
                    Görüntülenecek grup yok
                  </div>
                )}
              </Dropdown.Menu>
            </Dropdown>
          </div>
          {groupedTransactions.map(group => {
            const isCollapsed = collapsedGroups[group.id];
            const localConfig = groupConfigs[group.id] || {};
            const localFilters = localConfig.filters || [];
            const localSort = localConfig.sortConfig || null;

            const groupSpecificFiltered = applyFilters(group.items, localFilters);
            const groupSpecificSorted = applySort(groupSpecificFiltered, localSort);

            const currentLimit = groupLimits[group.id] || 5;
            const itemsToShow = groupInfinite[group.id] ? groupSpecificSorted : groupSpecificSorted.slice(0, currentLimit);

            return (
              <div key={group.id} className="mb-4">
                <div 
                  className="d-flex align-items-center gap-2 mb-2 cursor-pointer hover-bg-light p-1 rounded transition-all"
                  onClick={() => handleToggleGroupCollapse(group.id)}
                  style={{ width: 'fit-content' }}
                >
                  <div className="d-flex align-items-center opacity-50">
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </div>
                  <div className="d-flex align-items-center">
                    {group.icon}
                    <span className="notion-tag m-0 fs-14 fw-bold" style={getTagStyleByColor(group.color)}>
                      {group.label}
                    </span>
                    <span className="ms-2 text-muted x-small opacity-50 fw-normal">
                      {groupSpecificSorted.length}
                      {config.columnCalculations?.amount === 'sum' && (
                        <span className="ms-1 fw-bold text-dark opacity-100">
                          · Toplam: {formatCurrency(getCalculatedValue('amount', groupSpecificSorted))} TL
                        </span>
                      )}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      className="ms-3 rounded-circle d-flex align-items-center justify-content-center p-0 shadow-sm border-0 transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickNewInGroup(group);
                      }}
                      style={{ width: '20px', height: '20px', background: 'linear-gradient(135deg, #006fee 0%, #005bc4 100%)', opacity: 0.8 }}
                      title="Bu gruba yeni işlem ekle"
                    >
                      <Plus size={12} className="text-white" />
                    </Button>
                  </div>
                </div>
                {!isCollapsed && (
                  <>
                    <Card className="glass-card border shadow-sm rounded-3 overflow-visible mb-3" style={{ position: 'relative', zIndex: 15 }}>
                      <Table responsive hover className="notion-table mb-0 border-top-0" style={{ overflow: 'visible', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead className="sticky-top" style={{ zIndex: 1010, top: 0 }}>
                          {localFilters.length > 0 && (
                            <tr className="border-bottom" style={{ position: 'relative', zIndex: 10 }}>
                              <th colSpan={100} className="py-2 px-3 border-bottom font-normal">
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                  <div className="text-muted x-small fw-bold d-flex align-items-center gap-1 opacity-50 pe-2 border-end">
                                    <Filter size={12} /> FILTERS
                                  </div>
                                  {localFilters.map(f => {
                                    const p = PROPERTIES.find(item => item.id === f.propId);
                                    const label = config.propertyLabels?.[f.propId] || p?.label;
                                    return (
                                      <div key={f.propId} className="glass-card border rounded-pill px-2 py-1 d-flex align-items-center gap-2 shadow-sm" style={{ fontSize: '12px', fontWeight: 400 }}>
                                        <span className="text-muted">{label}</span>
                                        <Dropdown>
                                          <Dropdown.Toggle as="span" className="fw-bold cursor-pointer hover-text-primary">
                                            {f.operator.replace(/_/g, ' ')}
                                          </Dropdown.Toggle>
                                          <Dropdown.Menu popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-1" style={{ zIndex: 9999 }}>
                                            {(() => {
                                              if (['type', 'quickActions', 'bankId'].includes(f.propId)) return ['contains', 'does_not_contain', 'is_empty', 'is_not_empty'];
                                              if (f.propId === 'date') return ['is', 'between', 'is_empty', 'is_not_empty'];
                                              return ['is', 'is_not', 'contains', 'does_not_contain', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'];
                                            })().map(op => (
                                              <Dropdown.Item key={op} className="small rounded-2" onClick={() => handleUpdateGroupFilter(group.id, f.propId, op, f.value)}>
                                                {op.replace(/_/g, ' ')}
                                              </Dropdown.Item>
                                            ))}
                                          </Dropdown.Menu>
                                        </Dropdown>
                                        {!['is_empty', 'is_not_empty'].includes(f.operator) && (
                                          ['type', 'quickActions', 'bankId'].includes(f.propId) ? (
                                            <Dropdown>
                                              <Dropdown.Toggle as="span" className="fw-medium cursor-pointer hover-text-primary text-truncate d-inline-flex align-items-center" style={{ maxWidth: '120px' }}>
                                                {(() => {
                                                  if (!f.value) return 'Seçiniz...';
                                                  const ids = f.value.split(',').filter(v => v);
                                                  if (ids.length > 1) return `${ids.length} Seçili`;
                                                  if (f.propId === 'bankId') return getBankInfo(ids[0]).name || 'Bilinmiyor';
                                                  if (f.propId === 'type') return typeTags.find(t => t.id === ids[0])?.name || 'Bilinmiyor';
                                                  if (f.propId === 'quickActions') return quickActionTags.find(t => t.id === ids[0])?.name || 'Bilinmiyor';
                                                  return f.value;
                                                })()}
                                              </Dropdown.Toggle>
                                              <Dropdown.Menu popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-1 overflow-auto" style={{ maxHeight: '300px', minWidth: '150px', zIndex: 9999 }}>
                                                {(f.propId === 'bankId'
                                                  ? [...banks].sort((a, b) => (a.order || 0) - (b.order || 0))
                                                  : f.propId === 'type'
                                                    ? [...typeTags].sort((a, b) => (a.order || 0) - (b.order || 0))
                                                    : [...quickActionTags].sort((a, b) => (a.order || 0) - (b.order || 0))
                                                ).map(item => {
                                                  const colorObj = COLORS.find(c => c.name === item.color) || COLORS[0];
                                                  const isSelected = (f.value || '').split(',').includes(item.id);
                                                  return (
                                                    <Dropdown.Item
                                                      key={item.id}
                                                      className="small rounded-2 py-2 mb-1"
                                                      onClick={(e) => { e.stopPropagation(); handleUpdateGroupFilter(group.id, f.propId, f.operator, item.id); }}
                                                    >
                                                      <div className="d-flex align-items-center justify-content-between">
                                                        <div className="d-flex align-items-center">
                                                          {f.propId === 'bankId' && item.logo && (
                                                            <img src={item.logo} alt="" width="14" height="14" className="me-2 rounded-circle" style={{ objectFit: 'contain' }} />
                                                          )}
                                                          <span className={f.propId !== 'bankId' ? "notion-tag m-0 text-nowrap" : ""} style={f.propId !== 'bankId' ? { ...getTagStyleByColor(item.color), fontSize: '11px' } : {}}>
                                                            {item.name}
                                                          </span>
                                                        </div>
                                                        {isSelected && <Check size={14} className="text-primary" />}
                                                      </div>
                                                    </Dropdown.Item>
                                                  );
                                                })}
                                              </Dropdown.Menu>
                                            </Dropdown>
                                          ) : f.propId === 'date' ? (
                                            f.operator === 'between' ? (
                                              <div className="d-flex align-items-center gap-1">
                                                <LocalTextInput
                                                  type="date"
                                                  size="sm"
                                                  className="border-0 bg-transparent p-0 fw-medium"
                                                  style={{ width: '90px', fontSize: '11px' }}
                                                  value={(f.value || '').split(',')[0] || ''}
                                                  onSave={val => {
                                                    const parts = (f.value || '').split(',');
                                                    handleUpdateGroupFilter(group.id, f.propId, f.operator, `${val},${parts[1] || ''}`);
                                                  }}
                                                />
                                                <span className="text-muted opacity-50" style={{ fontSize: '10px' }}>-</span>
                                                <LocalTextInput
                                                  type="date"
                                                  size="sm"
                                                  className="border-0 bg-transparent p-0 fw-medium"
                                                  style={{ width: '90px', fontSize: '11px' }}
                                                  value={(f.value || '').split(',')[1] || ''}
                                                  onSave={val => {
                                                    const parts = (f.value || '').split(',');
                                                    handleUpdateGroupFilter(group.id, f.propId, f.operator, `${parts[0] || ''},${val}`);
                                                  }}
                                                />
                                              </div>
                                            ) : (
                                              <LocalTextInput
                                                type="date"
                                                size="sm"
                                                className="border-0 bg-transparent p-0 fw-medium"
                                                style={{ width: '100px', fontSize: '12px' }}
                                                value={f.value || ''}
                                                onSave={val => handleUpdateGroupFilter(group.id, f.propId, f.operator, val)}
                                              />
                                            )
                                          ) : (
                                            <LocalTextInput
                                              size="sm"
                                              className="border-0 bg-transparent p-0 fw-medium"
                                              style={{ width: '100px', fontSize: '12px' }}
                                              value={f.value}
                                              onSave={val => handleUpdateGroupFilter(group.id, f.propId, f.operator, val)}
                                              onCancel={() => {}}
                                              placeholder="Değer girin..."
                                            />
                                          )
                                        )}
                                        <X size={14} className="text-muted cursor-pointer hover-text-danger" onClick={() => handleUpdateGroupFilter(group.id, f.propId, null, null)} />
                                      </div>
                                    );
                                  })}
                                  <Button variant="link" size="sm" className="text-muted p-0 x-small text-decoration-none ms-auto" onClick={() => handleClearGroupFilters(group.id)}>Clear all</Button>
                                </div>
                              </th>
                            </tr>
                          )}
                          <tr style={{ position: 'relative', zIndex: 5 }}>
                            <th style={{ width: '1px', whiteSpace: 'nowrap', backgroundColor: 'inherit' }} className="ps-2">
                              <Form.Check
                                type="checkbox"
                                className="notion-checkbox custom-checkbox-sm"
                                checked={groupSpecificSorted.length > 0 && groupSpecificSorted.every(t => selectedIds.includes(t.id))}
                                onChange={(e) => {
                                  const groupIds = groupSpecificSorted.map(t => t.id);
                                  if (e.target.checked) {
                                    setSelectedIds(prev => [...new Set([...prev, ...groupIds])]);
                                  } else {
                                    setSelectedIds(prev => prev.filter(id => !groupIds.includes(id)));
                                  }
                                }}
                              />
                            </th>
                            {(config.propertyOrder || PROPERTIES.map(p => p.id))
                              .filter(id => config.propertyVisibility?.[id] !== false)
                              .map(id => {
                                const p = PROPERTIES.find(item => item.id === id);
                                const label = config.propertyLabels?.[id] || p.label;
                                const currentIcon = getPropertyIcon(id, config);
                                const isGroupFiltered = localFilters.some(f => f.propId === id);
                                const isGroupSorted = localSort?.propId === id;
                                                                  return (
                                  <th key={id} style={id === 'title' ? { width: '25%' } : {}}>
                                    <Dropdown autoClose="outside" onToggle={(isOpen) => { if (!isOpen) { setShowCalculateSubmenu(false); setShowDateFormatSubmenu(false); } }}>
                                      <Dropdown.Toggle as="div" className="btn btn-link p-2 text-decoration-none border-0 d-flex align-items-center gap-2 cursor-pointer dropdown-no-caret hover-bg-light rounded flex-grow-1" style={{ marginLeft: '-8px' }}>
                                        <span className={`d-flex align-items-center ${isGroupFiltered ? 'text-primary' : 'text-muted'}`}>{currentIcon}</span>
                                        <span className={`text-nowrap fw-bold fs-13 ${isGroupFiltered ? 'text-primary' : 'text-dark'}`}>{label}</span>
                                        <div className="ms-auto d-flex align-items-center gap-2">
                                          {isGroupSorted && (
                                            <div className="d-flex align-items-center gap-1">
                                              <span
                                                className="text-primary d-flex align-items-center cursor-pointer hover-bg-secondary rounded p-0 justify-content-center"
                                                style={{ width: '16px', height: '16px' }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleGroupSort(group.id, id, localSort.direction === 'asc' ? 'desc' : 'asc');
                                                }}
                                              >
                                                {localSort.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                              </span>
                                              <div
                                                className="hover-bg-secondary rounded p-0 d-flex align-items-center justify-content-center opacity-50 hover-opacity-100 transition-all"
                                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleGroupSort(group.id, null, null);
                                                }}
                                              >
                                                <X size={10} />
                                              </div>
                                            </div>
                                          )}
                                          <ChevronDown size={14} className="text-muted opacity-50" />
                                        </div>
                                      </Dropdown.Toggle>
                                      <Dropdown.Menu rootCloseEvent="mousedown" popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2" style={{ width: '260px', zIndex: 10005 }}>
                                        <div className="px-1 py-1 d-flex flex-column gap-1">
                                          <Dropdown.Item className="rounded-2 d-flex align-items-center gap-2 py-2 small" onClick={() => handleUpdateGroupFilter(group.id, id, 'contains', '')}>
                                            <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><Filter size={14} className="text-muted" /></div> 
                                            <span>Filter</span>
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
                                                    ...(id === 'amount' ? [
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
                                        <div className="dropdown-divider opacity-10"></div>
                                        <Dropdown.Item
                                          className={`rounded-2 d-flex align-items-center gap-2 py-2 small ${isGroupSorted && localSort.direction === 'asc' ? 'bg-light text-primary fw-medium' : ''}`}
                                          onClick={() => handleGroupSort(group.id, id, 'asc')}
                                        >
                                          <ArrowUp size={14} /> Sort ascending
                                        </Dropdown.Item>
                                        <Dropdown.Item
                                          className={`rounded-2 d-flex align-items-center gap-2 py-2 small ${isGroupSorted && localSort.direction === 'desc' ? 'bg-light text-primary fw-medium' : ''}`}
                                          onClick={() => handleGroupSort(group.id, id, 'desc')}
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
                                        <div className="dropdown-divider opacity-10 mx-1"></div>
                                        <Dropdown.Item
                                          className="rounded-2 d-flex align-items-center gap-2 py-2 small"
                                          onClick={() => handleUpdatePropertyVisibility(id, false)}
                                        >
                                          <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><EyeOff size={14} className="text-muted" /></div> 
                                          <span>Hide in view</span>
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
                                                  <div className="rounded d-flex align-items-center justify-content-center bg-light flex-shrink-0" style={{ width: '24px', height: '24px' }}><Calendar size={14} className="text-muted" /></div>
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
                                                        className={`rounded-2 py-1.5 px-2 small cursor-pointer hover-bg-light d-flex align-items-center justify-content-between ${(config.dateFormat === fmt.value || (!config.dateFormat && fmt.value === 'DD/MM/YYYY')) ? 'bg-light text-primary fw-bold' : 'text-muted'}`}
                                                        onClick={(e) => { e.stopPropagation(); handleUpdateDateFormat(fmt.value); }}
                                                      >
                                                        <span>{fmt.label}</span>
                                                        {(config.dateFormat === fmt.value || (!config.dateFormat && fmt.value === 'DD/MM/YYYY')) && <Check size={12} />}
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
                        <tbody>
                          {itemsToShow.map((t, index) => (
                            <TransactionRow
                              key={`LIST_GROUP_${group.id}_${t.id}`}
                              t={t}
                              config={config}
                              selectedIds={selectedIds}
                              isEditing={editingCell?.transId === t.id && editingCell?.tableId === `LIST_GROUP_${group.id}`}
                              renderCell={renderCell}
                              onSelect={handleSelect}
                              tableId={`LIST_GROUP_${group.id}`}
                            />
                          ))}
                        </tbody>
                        {Object.keys(config.columnCalculations || {}).some(k => config.columnCalculations[k] !== 'none') && (
                          <tfoot className="border-top bg-opacity-10 position-sticky bottom-0" style={{ zIndex: 10, backgroundColor: 'var(--card-bg)' }}>
                            <tr>
                              <td style={{ width: '1px' }} className="border-bottom-0"></td>
                              {(config.propertyOrder || PROPERTIES.map(p => p.id))
                                .filter(id => config.propertyVisibility?.[id] !== false)
                                .map(id => (
                                  <td key={id} className="py-2 px-2 border-start border-light border-opacity-10 border-bottom-0">
                                    {renderCalculatedValue(id, getCalculatedValue(id, groupSpecificSorted))}
                                  </td>
                                ))}
                            </tr>
                          </tfoot>
                        )}
                      </Table>
                    </Card>

                    <div className="d-flex align-items-center gap-4 mt-2 mb-5 mobile-scroll-x">
                      {!groupInfinite[group.id] && currentLimit < groupSpecificSorted.length && (
                        <div className="d-flex align-items-center gap-2 py-2 px-3 hover-bg-light cursor-pointer text-muted small rounded-2"
                          style={{ width: 'fit-content' }}
                          onClick={() => {
                            setGroupLimits(prev => ({ ...prev, [group.id]: (prev[group.id] || 5) + 5 }));
                            setGroupInfinite(prev => ({ ...prev, [group.id]: false }));
                          }}>
                          <Plus size={14} className="opacity-50" />
                          <span>Daha fazla göster</span>
                        </div>
                      )}

                      <div className="d-flex align-items-center gap-2 text-muted x-small border-start ps-4">
                        <span className="opacity-50 fw-bold">GÖRÜNÜM LİMİTİ:</span>
                        {[5, 10, 20, 50, 100].map(v => (
                          <span
                            key={v}
                            className={`cursor-pointer hover-text-primary px-2 py-1 rounded ${currentLimit === v && !groupInfinite[group.id] ? 'bg-light-primary text-primary fw-bold' : ''}`}
                            onClick={() => {
                              setGroupLimits(prev => ({ ...prev, [group.id]: v }));
                              setGroupInfinite(prev => ({ ...prev, [group.id]: false }));
                            }}
                          >
                            {v}
                          </span>
                        ))}
                        <span
                          className={`cursor-pointer hover-text-primary px-2 py-1 rounded ${groupInfinite[group.id] ? 'bg-light-primary text-primary fw-bold' : ''}`}
                          onClick={() => {
                            setGroupInfinite(prev => ({ ...prev, [group.id]: true }));
                          }}
                        >
                          Hepsini Gör ({groupSpecificSorted.length})
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction Modal */}
      <Modal show={showTransactionModal} onHide={() => setShowTransactionModal(false)} size="lg" className="shadow-lg notion-modal">
        <Modal.Body className="p-5">
          <Form onSubmit={handleAddTransaction}>
            <Form.Control
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="New page"
              className="border-0 bg-transparent h1 fw-bold mb-4 p-0 notion-title-input"
              style={{ fontSize: '40px', color: 'var(--text-main)', opacity: title ? 1 : 0.2 }}
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
                    style={{ fontSize: '14px', width: 'fit-content' }}
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
                        {selectedQuickActions.map((tagId, i) => {
                          const tag = resolveTag(quickActionTags, tagId);
                          return tag ? (
                            <span key={i} className="notion-tag m-0 gap-2 d-inline-flex align-items-center" style={getTagStyleById(quickActionTags, tagId)}>
                              {tag.name}
                              <X size={12} className="text-muted opacity-50" style={{ cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); setSelectedQuickActions(prev => prev.filter(x => x !== tagId)); }}
                              />
                            </span>
                          ) : null;
                        })}
                        <div className="d-flex align-items-center flex-grow-1 position-relative">
                          <Form.Control
                            size="sm"
                            placeholder={selectedQuickActions.length === 0 ? "Empty" : ""}
                            className="border-0 bg-transparent p-0 flex-grow-1 fs-14"
                            style={{ minWidth: '60px', boxShadow: 'none' }}
                            value={tagSearch}
                            onChange={e => setTagSearch(e.target.value)}
                            autoComplete="off"
                          />
                          {tagSearch && !quickActionTags.some(t => t.name.toLowerCase() === tagSearch.toLowerCase()) && (
                            <div className="p-1 hover-bg-light rounded cursor-pointer ms-1"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const newId = await handleAddTag('quickActions', quickActionTags, tagSearch, 'Gray');
                                setSelectedQuickActions(prev => [...prev, newId]);
                                setTagSearch('');
                              }}
                            >
                              <Plus size={14} className="text-primary" />
                            </div>
                          )}
                        </div>
                      </div>
                    </Dropdown.Toggle>
                    <Dropdown.Menu rootCloseEvent="mousedown" popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2 notion-dropdown-menu overflow-auto" style={{ width: '280px', maxHeight: '300px', overflowX: 'hidden' }}>
                      <div className="p-2 pt-0">
                        <div className="text-muted x-small mb-2 ps-1 fs-12">Select an option or create one</div>
                        <div className="notion-options-list">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => {
                              const { active, over } = e;
                              if (active.id !== over.id) {
                                const oldIdx = quickActionTags.findIndex(t => t.id === active.id);
                                const newIdx = quickActionTags.findIndex(t => t.id === over.id);
                                handleReorderTags('quickActions', quickActionTags, oldIdx, newIdx);
                              }
                            }}
                          >
                            <SortableContext items={quickActionTags.map(t => t.id)} strategy={verticalListSortingStrategy}>
                              {quickActionTags
                                .filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                                .map((tag) => (
                                  <SortableTagItem
                                    key={tag.id}
                                    tag={tag}
                                    type="quickActions"
                                    isSelected={selectedQuickActions.includes(tag.id)}
                                    onClick={() => setSelectedQuickActions(prev => prev.includes(tag.id) ? prev.filter(a => a !== tag.id) : [...prev, tag.id])}
                                    getTagStyle={(_, idOrName) => getTagStyleById(quickActionTags, idOrName)}
                                    onUpdate={(oldName, newName, newColor) => handleUpdateTag('quickActions', tag.id, newName, newColor)}
                                    onDelete={() => handleDeleteTag('quickActions', quickActionTags, tag.id)}
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
                        {selectedType && (() => {
                          const tag = resolveTag(typeTags, selectedType);
                          return tag ? (
                            <span className="notion-tag m-0 gap-2 d-inline-flex align-items-center" style={getTagStyleById(typeTags, selectedType)}>
                              {tag.name}
                              <X size={12} className="text-muted opacity-50" style={{ cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); setSelectedType(''); }}
                              />
                            </span>
                          ) : null;
                        })()}
                        <div className="d-flex align-items-center flex-grow-1 position-relative">
                          <Form.Control
                            size="sm"
                            placeholder={!selectedType ? "Empty" : ""}
                            className="border-0 bg-transparent p-0 flex-grow-1 fs-14"
                            style={{ minWidth: '60px', boxShadow: 'none' }}
                            value={typeSearch}
                            onChange={e => setTypeSearch(e.target.value)}
                            autoComplete="off"
                          />
                          {typeSearch && !typeTags.some(t => t.name.toLowerCase() === typeSearch.toLowerCase()) && (
                            <div className="p-1 hover-bg-light rounded cursor-pointer ms-1"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const newId = await handleAddTag('transactionTypes', typeTags, typeSearch, 'Gray');
                                setSelectedType(newId);
                                setTypeSearch('');
                              }}
                            >
                              <Plus size={14} className="text-primary" />
                            </div>
                          )}
                        </div>
                      </div>
                    </Dropdown.Toggle>
                    <Dropdown.Menu popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2 notion-dropdown-menu overflow-auto" style={{ width: '280px', maxHeight: '300px', overflowX: 'hidden' }}>
                      <div className="p-2 pt-0">
                        <div className="text-muted x-small mb-2 ps-1 fs-12">Select an option or create one</div>
                        <div className="notion-options-list">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => {
                              const { active, over } = e;
                              if (active.id !== over.id) {
                                const oldIdx = typeTags.findIndex(t => t.id === active.id);
                                const newIdx = typeTags.findIndex(t => t.id === over.id);
                                handleReorderTags('transactionTypes', typeTags, oldIdx, newIdx);
                              }
                            }}
                          >
                            <SortableContext items={typeTags.map(t => t.id)} strategy={verticalListSortingStrategy}>
                              {typeTags
                                .filter(t => t.name.toLowerCase().includes(typeSearch.toLowerCase()))
                                .map((tag) => (
                                  <SortableTagItem
                                    key={tag.id}
                                    tag={tag}
                                    type="types"
                                    isSelected={selectedType === tag.id}
                                    onClick={() => setSelectedType(prev => prev === tag.id ? '' : tag.id)}
                                    getTagStyle={(_, idOrName) => getTagStyleById(typeTags, idOrName)}
                                    onUpdate={(oldName, newName, newColor) => handleUpdateTag('transactionTypes', tag.id, newName, newColor)}
                                    onDelete={() => handleDeleteTag('transactionTypes', typeTags, tag.id)}
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
                      {formBankId ? (
                        <div className="d-flex align-items-center gap-2">
                          {getBankInfo(formBankId).logo && <img src={getBankInfo(formBankId).logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
                          <span>{getBankInfo(formBankId).name}</span>
                        </div>
                      ) : (
                        <span className="text-muted opacity-50">Empty</span>
                      )}
                    </Dropdown.Toggle>
                    <Dropdown.Menu popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow-lg p-2 notion-dropdown-menu" style={{ width: '280px' }}>
                      <div className="p-2 pt-0">
                        <Form.Control
                          size="sm"
                          placeholder="Search for a bank..."
                          className="border-0 bg-theme-light mb-2 fs-14"
                          value={bankSearch}
                          onChange={e => setBankSearch(e.target.value)}
                        />
                        <div className="notion-options-list">
                          {banks
                            .filter(b => b?.name?.toLowerCase().includes(bankSearch.toLowerCase()))
                            .map((bank, i) => (
                              <div
                                key={i}
                                className="d-flex align-items-center justify-content-between p-1 px-2 rounded-1 notion-option-item cursor-pointer fs-14"
                                onClick={() => setFormBankId(bank.id)}
                              >
                                <div className="d-flex align-items-center gap-2">
                                  {bank.logo ? <img src={bank.logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} /> : <Landmark size={14} className="text-muted opacity-25" />}
                                  <span>{bank.name}</span>
                                </div>
                                {formBankId === bank.id && <Check size={14} className="text-primary" />}
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
      <Modal show={showBankModal} onHide={() => setShowBankModal(false)} className="shadow-lg">
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
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} className="shadow-lg">
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
      <Modal show={showTagModal} onHide={() => setShowTagModal(false)} className="shadow-lg">
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Etiketleri Yönet</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Hızlı İşlemler</h6>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {quickActionTags.map((tag) => (
                <Dropdown key={tag.id}>
                  <Dropdown.Toggle as="div" className="notion-tag cursor-pointer" style={getTagStyleById(quickActionTags, tag.id)}>{tag.name}</Dropdown.Toggle>
                  <Dropdown.Menu popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow">
                    <div className="p-2 d-flex flex-wrap gap-1" style={{ width: '120px' }}>
                      {COLORS.map(c => (
                        <div key={c.name} onClick={() => handleUpdateTag('quickActions', tag.id, tag.name, c.name)}
                          style={{ width: '20px', height: '20px', backgroundColor: c.bg, borderRadius: '4px', cursor: 'pointer', border: '1px solid #ddd' }} title={c.name} />
                      ))}
                    </div>
                    <Dropdown.Divider />
                    <Dropdown.Item className="text-danger small" onClick={() => handleDeleteTag('quickActions', quickActionTags, tag.id)}>Sil</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ))}
            </div>
            <div className="d-flex gap-2">
              <Form.Control size="sm" placeholder="Yeni ekle..." value={activeTagType === 'quickActions' ? newTagName : ''} onChange={e => setNewTagName(e.target.value)} onFocus={() => setActiveTagType('quickActions')} />
              <Button size="sm" onClick={async () => { if (newTagName.trim()) { await handleAddTag('quickActions', quickActionTags, newTagName.trim(), 'Gray'); setNewTagName(''); } }}><Plus size={14} /></Button>
            </div>
          </div>
          <hr className="my-4 opacity-5" />
          <div>
            <h6 className="fw-bold mb-3">İşlem Türleri</h6>
            <div className="d-flex flex-wrap gap-2 mb-3">
              {typeTags.map((tag) => (
                <Dropdown key={tag.id}>
                  <Dropdown.Toggle as="div" className="notion-tag cursor-pointer" style={getTagStyleById(typeTags, tag.id)}>{tag.name}</Dropdown.Toggle>
                  <Dropdown.Menu popperConfig={{ placement: 'bottom-start', modifiers: [{ name: 'offset', options: { offset: [0, 5] } }, { name: 'flip', options: { fallbackPlacements: ['top-start', 'bottom-start'] } }] }} className="glass-card border-0 shadow">
                    <div className="p-2 d-flex flex-wrap gap-1" style={{ width: '120px' }}>
                      {COLORS.map(c => (
                        <div key={c.name} onClick={() => handleUpdateTag('transactionTypes', tag.id, tag.name, c.name)}
                          style={{ width: '20px', height: '20px', backgroundColor: c.bg, borderRadius: '4px', cursor: 'pointer', border: '1px solid #ddd' }} title={c.name} />
                      ))}
                    </div>
                    <Dropdown.Divider />
                    <Dropdown.Item className="text-danger small" onClick={() => handleDeleteTag('transactionTypes', typeTags, tag.id)}>Sil</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              ))}
            </div>
            <div className="d-flex gap-2">
              <Form.Control size="sm" placeholder="Yeni ekle..." value={activeTagType === 'types' ? newTagName : ''} onChange={e => setNewTagName(e.target.value)} onFocus={() => setActiveTagType('types')} />
              <Button size="sm" onClick={async () => { if (newTagName.trim()) { await handleAddTag('transactionTypes', typeTags, newTagName.trim(), 'Gray'); setNewTagName(''); } }}><Plus size={14} /></Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <ImportModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        onImport={handleBulkImport}
      />
    </div>
  );
};

export default BankTransactionsPage;
