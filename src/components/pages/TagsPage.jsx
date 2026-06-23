import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { db } from '../../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  Calendar as CalendarIcon, 
  Type, 
  AlignLeft, 
  Check, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Repeat, 
  Undo, 
  Redo, 
  Tag as TagIcon, 
  Sparkles, 
  Upload, 
  Link2,
  FolderOpen,
  Table as TableIcon,
  SlidersHorizontal,
  Settings,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Quote,
  List,
  ListOrdered,
  ExternalLink,
  Clipboard,
  Copy,
  Pilcrow,
  Search,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { Modal, Button, Form, Table, Dropdown } from 'react-bootstrap';
import './TagsPage.css';




const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
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

const NOTE_COLORS = {
  blue: '#3498db',
  red: '#ff4d4d',
  green: '#2ecc71',
  yellow: '#f1c40f'
};

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

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
};

const stripHtml = (html) => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

// Generates a deterministic gradient based on tag name
const getTagGradientClass = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % 10;
  return `tag-default-gradient-${index}`;
};

// Tag Card Component
function SortableTagCard({
  tag,
  isSelected,
  onClick,
  renderTagCover,
  tagNoteCounts,
  handleEditTagCover,
  scale,
  lastNoteTimeText
}) {
  const scaleStyle = `scale(${scale})`;
  const style = {
    transform: scaleStyle,
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const count = tagNoteCounts[tag.name] || 0;

  return (
    <div
      style={style}
      className={`tag-card glass-card ${isSelected ? 'active' : ''}`}
      onClick={onClick}
    >
      {/* Cover Image */}
      <div className="tag-card-cover-container">
        {renderTagCover(tag)}
        {lastNoteTimeText && (
          <div 
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 10,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              padding: '3px 8px',
              borderRadius: '20px',
              fontSize: '10px',
              fontWeight: '600',
              textTransform: 'lowercase',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
              pointerEvents: 'none',
              letterSpacing: '0.3px'
            }}
          >
            {lastNoteTimeText}
          </div>
        )}
      </div>

      {/* Info Overlay floating on top of cover */}
      <div className="tag-card-info-overlay">
        <span className="tag-card-badge mb-1" style={getTagStyleByColor(tag.color || 'Blue')}>
          {tag.name}
        </span>
        <span className="tag-card-notes-count">{count} Not</span>
      </div>
      
      {/* Controls in top-right */}
      <div className="tag-card-controls" onClick={(e) => e.stopPropagation()}>
        <button 
          type="button" 
          className="tag-card-btn"
          onClick={(e) => handleEditTagCover(tag, e)}
          title="Görseli Düzenle"
        >
          <Edit2 size={14} />
        </button>
      </div>
    </div>
  );
}

// Tag Row Component
function SortableTagRow({
  tag,
  isSelected,
  onClick,
  coverFitMode,
  activeNotes,
  handleEditTagCover,
  handleDeleteGlobalTag,
  tagNoteCounts,
  lastNoteTimeText
}) {
  const count = tagNoteCounts[tag.name] || 0;

  return (
    <tr 
      className={isSelected ? 'active' : ''}
      onClick={onClick}
    >
      <td>
        {/* Cover Thumb */}
        <div className="d-flex align-items-center gap-2">
          {(tag.imageUrl && !tag.useCollage) ? (
            <div 
              className="tag-table-cover-thumb" 
              style={{ backgroundImage: `url(${tag.imageUrl})`, backgroundSize: coverFitMode }}
            />
          ) : (
            (() => {
              const firstNoteImg = activeNotes.find(n => n.tags?.includes(tag.name) && n.imageUrl)?.imageUrl;
              if (firstNoteImg) {
                return (
                  <div 
                    className="tag-table-cover-thumb" 
                    style={{ backgroundImage: `url(${firstNoteImg})`, backgroundSize: 'cover' }}
                  />
                );
              }
              return (
                <div 
                  className={`tag-table-cover-thumb ${getTagGradientClass(tag.name)}`}
                />
              );
            })()
          )}
        </div>
      </td>
      <td>
        <div className="d-flex flex-column gap-1">
          <span className="tag-card-badge" style={getTagStyleByColor(tag.color || 'Blue')}>
            {tag.name}
          </span>
          {lastNoteTimeText && (
            <span className="text-muted x-small text-lowercase" style={{ fontSize: '10px', opacity: 0.8 }}>
              en son: {lastNoteTimeText.toLowerCase()}
            </span>
          )}
        </div>
      </td>
      <td>
        <span className="text-muted fw-semibold fs-13">{tag.color || 'Blue'}</span>
      </td>
      <td>
        <span className="fw-bold fs-14">{count} Not</span>
      </td>
      <td className="text-end" onClick={(e) => e.stopPropagation()}>
        <div className="d-inline-flex gap-1">
          <button 
            type="button" 
            className="action-btn-circle edit" 
            onClick={(e) => handleEditTagCover(tag, e)}
            title="Görseli/Rengi Düzenle"
          >
            <Edit2 size={14} />
          </button>
          {tag.id && (
            <button 
              type="button" 
              className="action-btn-circle delete" 
              onClick={() => handleDeleteGlobalTag(tag.name, tag.id)}
              title="Etiketi Sil"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// Settings Tag Item Component
function SortableSettingsTagItem({
  tag,
  isHidden,
  toggleTagVisibility,
  handleDeleteGlobalTag,
  tagNoteCounts
}) {
  return (
    <div 
      className="settings-tags-list-item d-flex align-items-center justify-content-between p-2 rounded border mb-2"
    >
      <div className="d-flex align-items-center gap-2">
        {/* Tag badge & Note count */}
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span style={getTagStyleByColor(tag.color || 'Blue')} className="fw-bold">
            {tag.name}
          </span>
          <span className="text-muted small">({tagNoteCounts[tag.name] || 0} not)</span>
        </div>
      </div>

      <div className="d-flex align-items-center gap-3">
        {/* Hide / Show switch */}
        <Form.Check 
          type="switch" 
          id={`tag-visibility-${tag.name.replace(/\s+/g, '-')}`}
          checked={!isHidden}
          onChange={() => toggleTagVisibility(tag.name)}
          label={!isHidden ? "Göster" : "Gizle"}
          className="fs-12 text-muted mb-0"
          style={{ cursor: 'pointer' }}
        />
        
        {/* Delete Tag */}
        <Button 
          variant="link" 
          className="text-danger p-1 opacity-70 hover-opacity-100" 
          onClick={() => handleDeleteGlobalTag(tag.name, tag.id)}
          title="Etiketi Sil"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

export default function TagsPage() {
  const { user } = useAuth();
  const { notes, noteTags: globalNoteTags, notesConfig } = useData();

  // Selected tag name state with localStorage persistence and toggle support
  const [activeTagName, setActiveTagName] = useState(() => {
    const saved = localStorage.getItem('selected_tag_name');
    if (saved === 'null' || saved === '') return null;
    return saved;
  });

  const selectActiveTag = (name) => {
    setActiveTagName(prev => {
      const next = prev === name ? null : name;
      if (next === null) {
        localStorage.setItem('selected_tag_name', 'null');
      } else {
        localStorage.setItem('selected_tag_name', next);
      }
      return next;
    });
  };

  // Layout mode state
  const [layoutMode, setLayoutMode] = useState(() => {
    return localStorage.getItem('tags_layout_mode') || 'gallery';
  });

  const changeLayoutMode = (mode) => {
    setLayoutMode(mode);
    localStorage.setItem('tags_layout_mode', mode);
  };

  // Cover image display style (object-fit: cover, contain, fill)
  const [coverFitMode, setCoverFitMode] = useState(() => {
    return localStorage.getItem('tags_cover_fit_mode') || 'cover';
  });

  // Hidden tags configuration
  const [hiddenTags, setHiddenTags] = useState([]);

  // Modals state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Tag editing state
  const [editingTag, setEditingTag] = useState(null);
  const [tagNameInput, setTagNameInput] = useState('');
  const [tagColorInput, setTagColorInput] = useState('Blue');
  const [tagImageUrl, setTagImageUrl] = useState('');
  const [tagUseCollageInput, setTagUseCollageInput] = useState(false);

  // Note editing state
  const [editingNote, setEditingNote] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteTags, setNoteTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [noteColor, setNoteColor] = useState('blue');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [showSimilarNotes, setShowSimilarNotes] = useState(false);
  const [noteImageUrl, setNoteImageUrl] = useState('');

  // Expanded note modal state
  const [isExpanded, setIsExpanded] = useState(false);

  // Note search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Note list pagination states
  const [limitCount, setLimitCount] = useState(10);

  // Table sorting & column settings states
  const [columnVisibility, setColumnVisibility] = useState(() => {
    const saved = localStorage.getItem('tags_column_visibility');
    return saved ? JSON.parse(saved) : { date: true, title: true, preview: true, tags: true, actions: true };
  });

  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem('tags_column_order');
    return saved ? JSON.parse(saved) : ['date', 'title', 'preview', 'tags', 'actions'];
  });

  const [sortConfig, setSortConfig] = useState(() => {
    const saved = localStorage.getItem('tags_sort_config');
    return saved ? JSON.parse(saved) : { key: 'date', direction: 'desc' };
  });

  const [draggedColumnIdx, setDraggedColumnIdx] = useState(null);

  // Formatting state (floating formatting toolbar)
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

  // Drag-and-drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragType, setDragType] = useState(null); // 'card' or 'settings-list'

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const isSavingRef = useRef(false);

  // Refs
  const contentInputRef = useRef(null);
  const dateInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const linkEditorShowRef = useRef(false);
  const containerRef = useRef(null);
  const lastActiveTagRef = useRef(activeTagName);
  const hasInitialScrolledRef = useRef(false);
  const noteFileInputRef = useRef(null);

  useEffect(() => {
    linkEditorShowRef.current = linkEditor.show;
  }, [linkEditor.show]);



  // Load hiddenTags from global config
  useEffect(() => {
    if (notesConfig) {
      if (notesConfig.hiddenTags) {
        setHiddenTags(notesConfig.hiddenTags);
      }
    }
  }, [notesConfig]);

  // Extract all unique tags used in active notes
  const activeNotes = useMemo(() => {
    return [...notes]
      .filter(n => n.deleted !== true)
      .sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
  }, [notes]);

  const lastNoteTimeText = useMemo(() => {
    if (!activeNotes || activeNotes.length === 0) return null;
    const latestNote = activeNotes[0];

    let date;
    if (latestNote.date) {
      const [y, m, d] = latestNote.date.split('-').map(Number);
      date = new Date(y, m - 1, d);
    } else if (latestNote.createdAt) {
      const createdAt = latestNote.createdAt;
      if (typeof createdAt.toDate === 'function') {
        date = createdAt.toDate();
      } else if (createdAt.seconds) {
        date = new Date(createdAt.seconds * 1000);
      } else {
        date = new Date(createdAt);
      }
    }

    if (!date || isNaN(date.getTime())) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = today - compareDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Bugün';
    } else if (diffDays === 1) {
      return 'Dün';
    } else if (diffDays > 1) {
      return `${diffDays} gün önce`;
    }
    return 'Az önce';
  }, [activeNotes]);

  const allTagNames = useMemo(() => {
    const tagsSet = new Set();
    activeNotes.forEach(note => {
      note.tags?.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [activeNotes]);

  // Combine Firestore managed tags with discovered unmanaged tags
  const tagsList = useMemo(() => {
    const combined = [...globalNoteTags];
    allTagNames.forEach(tagName => {
      if (!combined.find(t => t.name === tagName)) {
        combined.push({ name: tagName, color: 'Blue', isUnmanaged: true });
      }
    });
    return combined;
  }, [globalNoteTags, allTagNames]);

  // Sort tags based on the recency of the last added note
  const sortedTags = useMemo(() => {
    const getTagLatestNoteIndex = (tagName) => {
      const idx = activeNotes.findIndex(note => Array.isArray(note.tags) && note.tags.includes(tagName));
      return idx === -1 ? Infinity : idx;
    };

    return [...tagsList].sort((a, b) => {
      const idxA = getTagLatestNoteIndex(a.name);
      const idxB = getTagLatestNoteIndex(b.name);
      
      if (idxA !== idxB) {
        return idxA - idxB;
      }
      
      const nameA = a?.name || '';
      const nameB = b?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [tagsList, activeNotes]);

  // Filter out hidden tags
  const visibleTags = useMemo(() => {
    return sortedTags.filter(tag => !hiddenTags.includes(tag.name));
  }, [sortedTags, hiddenTags]);

  const tagLastNoteTimes = useMemo(() => {
    const map = {};
    visibleTags.forEach(tag => {
      const latestNote = activeNotes.find(note => Array.isArray(note.tags) && note.tags.includes(tag.name));
      if (!latestNote) {
        map[tag.name] = null;
        return;
      }

      let date;
      if (latestNote.date) {
        const [y, m, d] = latestNote.date.split('-').map(Number);
        date = new Date(y, m - 1, d);
      } else if (latestNote.createdAt) {
        const createdAt = latestNote.createdAt;
        if (typeof createdAt.toDate === 'function') {
          date = createdAt.toDate();
        } else if (createdAt.seconds) {
          date = new Date(createdAt.seconds * 1000);
        } else {
          date = new Date(createdAt);
        }
      }

      if (!date || isNaN(date.getTime())) {
        map[tag.name] = null;
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      const diffTime = today - compareDate;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        map[tag.name] = 'Bugün';
      } else if (diffDays === 1) {
        map[tag.name] = 'Dün';
      } else if (diffDays > 1) {
        map[tag.name] = `${diffDays} gün önce`;
      } else {
        map[tag.name] = 'Az önce';
      }
    });
    return map;
  }, [visibleTags, activeNotes]);

  // Extract recent unique images used in active notes
  const recentImages = useMemo(() => {
    const images = [];
    const seen = new Set();
    notes.forEach(note => {
      if (note.imageUrl && !seen.has(note.imageUrl) && !note.deleted) {
        seen.add(note.imageUrl);
        images.push(note.imageUrl);
      }
    });
    return images.slice(0, 15);
  }, [notes]);

  // Reset the initial scroll flag on layout mode changes
  useEffect(() => {
    if (layoutMode === 'gallery') {
      hasInitialScrolledRef.current = false;
    }
  }, [layoutMode]);

  // Scroll active tag card into view when activeTagName changes, on mount, or when tags load
  useEffect(() => {
    if (layoutMode === 'gallery' && containerRef.current) {
      const shouldScroll = !hasInitialScrolledRef.current || (activeTagName !== lastActiveTagRef.current);
      
      if (shouldScroll) {
        const timer = setTimeout(() => {
          const container = containerRef.current;
          if (!container) return;
          
          if (activeTagName) {
            const activeElement = container.querySelector('.tag-card.active');
            if (activeElement) {
              const containerRect = container.getBoundingClientRect();
              const elemRect = activeElement.getBoundingClientRect();
              
              // Center the active card in the container
              const containerWidth = containerRect.width;
              const elemWidth = elemRect.width;
              const scrollOffset = container.scrollLeft + (elemRect.left - containerRect.left) - (containerWidth / 2) + (elemWidth / 2);
              
              container.scrollTo({
                left: Math.max(0, scrollOffset),
                behavior: 'smooth'
              });
              
              if (visibleTags.length > 0) {
                hasInitialScrolledRef.current = true;
              }
            }
          } else {
            // Scroll to the beginning if no active tag is selected
            container.scrollTo({
              left: 0,
              behavior: 'smooth'
            });
            if (visibleTags.length > 0) {
              hasInitialScrolledRef.current = true;
            }
          }
        }, 150);
        
        lastActiveTagRef.current = activeTagName;
        return () => clearTimeout(timer);
      }
    }
  }, [activeTagName, visibleTags, layoutMode]);

  const scrollPrev = () => {
    if (visibleTags.length === 0) return;
    const activeIdx = visibleTags.findIndex(t => t.name === activeTagName);
    let prevIdx = visibleTags.length - 1;
    if (activeIdx !== -1) {
      prevIdx = (activeIdx - 1 + visibleTags.length) % visibleTags.length;
    }
    const prevTag = visibleTags[prevIdx];
    if (prevTag) {
      setActiveTagName(prevTag.name);
      localStorage.setItem('selected_tag_name', prevTag.name);
    }
  };

  const scrollNext = () => {
    if (visibleTags.length === 0) return;
    const activeIdx = visibleTags.findIndex(t => t.name === activeTagName);
    let nextIdx = 0;
    if (activeIdx !== -1) {
      nextIdx = (activeIdx + 1) % visibleTags.length;
    }
    const nextTag = visibleTags[nextIdx];
    if (nextTag) {
      setActiveTagName(nextTag.name);
      localStorage.setItem('selected_tag_name', nextTag.name);
    }
  };

  // Persistent Active Tag initialization and validation
  useEffect(() => {
    if (visibleTags.length > 0) {
      const savedSelection = localStorage.getItem('selected_tag_name');
      const currentActiveExists = activeTagName && visibleTags.find(t => t.name === activeTagName);

      if (!currentActiveExists) {
        if (savedSelection !== 'null' && savedSelection !== null && visibleTags.find(t => t.name === savedSelection)) {
          setActiveTagName(savedSelection);
        } else if (savedSelection === 'null') {
          setActiveTagName(null);
        } else {
          selectActiveTag(visibleTags[0].name);
        }
      }
    } else {
      setActiveTagName(null);
    }
  }, [visibleTags, activeTagName]);

  // Count notes for each tag
  const tagNoteCounts = useMemo(() => {
    const counts = {};
    activeNotes.forEach(note => {
      note.tags?.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [activeNotes]);

  // Reset pagination limit and search query when the active tag changes
  useEffect(() => {
    setLimitCount(10);
    setSearchQuery('');
  }, [activeTagName]);

  // Get notes for the active selected tag
  const selectedTagNotes = useMemo(() => {
    if (!activeTagName) return [];
    
    // 1. Filter by active tag
    let filtered = activeNotes.filter(n => n.tags?.includes(activeTagName));

    // 2. Filter by search query (case-insensitive in title and text)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(n => {
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const textMatch = stripHtml(n.text || '').toLowerCase().includes(q);
        return titleMatch || textMatch;
      });
    }

    // 3. Sort notes dynamically
    filtered.sort((a, b) => {
      let valA = a[sortConfig.key] || '';
      let valB = b[sortConfig.key] || '';

      if (sortConfig.key === 'title') {
        valA = valA.toString().toLocaleLowerCase('tr-TR');
        valB = valB.toString().toLocaleLowerCase('tr-TR');
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [activeTagName, activeNotes, searchQuery, sortConfig]);

  // Paginated notes for table display
  const paginatedNotes = useMemo(() => {
    return selectedTagNotes.slice(0, limitCount);
  }, [selectedTagNotes, limitCount]);

  // Tag suggestions in note editor
  const tagSuggestions = useMemo(() => {
    const input = tagInput.trim().toLowerCase();
    return allTagNames.filter(tag => 
      (!input || tag.toLowerCase().includes(input)) && 
      !noteTags.includes(tag)
    );
  }, [tagInput, allTagNames, noteTags]);

  // Title suggestions in note editor (similar notes)
  const similarNotes = useMemo(() => {
    if (!noteTitle || noteTitle.trim().length < 1) return [];
    return notes.filter(n => 
      n.id !== editingNote?.id && 
      n.title?.toLowerCase().includes(noteTitle.toLowerCase())
    ).slice(0, 5);
  }, [noteTitle, notes, editingNote]);

  // Visibility toggle
  const toggleTagVisibility = async (tagName) => {
    const nextHidden = hiddenTags.includes(tagName)
      ? hiddenTags.filter(t => t !== tagName)
      : [...hiddenTags, tagName];

    setHiddenTags(nextHidden);
    if (user) {
      await setDoc(doc(db, `users/${user.uid}/config`, 'notesSettings'), {
        hiddenTags: nextHidden
      }, { merge: true }).catch(err => console.error('Error toggling tag visibility:', err));
    }
  };



  // Drag-and-drop Column Reordering handlers
  const handleColumnDragStart = (e, idx) => {
    setDraggedColumnIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e) => {
    e.preventDefault();
  };

  const handleColumnDrop = (e, targetIdx) => {
    e.preventDefault();
    if (draggedColumnIdx === null || draggedColumnIdx === targetIdx) return;

    const nextOrder = [...columnOrder];
    const [draggedCol] = nextOrder.splice(draggedColumnIdx, 1);
    nextOrder.splice(targetIdx, 0, draggedCol);

    setColumnOrder(nextOrder);
    localStorage.setItem('tags_column_order', JSON.stringify(nextOrder));
    setDraggedColumnIdx(null);
  };

  // Note Modal Auto-Save Logic
  const handleAutoSave = async () => {
    if (!user || !selectedDate || isSavingRef.current) return;
    
    // Prevent saving if empty and new
    if (!editingNote && !noteTitle.trim() && !noteText.trim() && noteTags.length === 0 && !noteImageUrl) return;

    // Verify change before saving
    const dateStr = selectedDate.toISOString().split('T')[0];
    if (editingNote) {
      const isTitleSame = noteTitle === (editingNote.title || '');
      const isTextSame = noteText === (editingNote.text || '');
      const isTagsSame = JSON.stringify(noteTags) === JSON.stringify(editingNote.tags || []);
      const isDateSame = dateStr === (editingNote.date || '');
      const isColorSame = noteColor === (editingNote.color || 'blue');
      const isImageSame = noteImageUrl === (editingNote.imageUrl || '');
      
      if (isTitleSame && isTextSame && isTagsSame && isDateSame && isColorSame && isImageSame) return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    const noteData = {
      title: noteTitle,
      text: noteText,
      tags: noteTags,
      color: noteColor,
      date: dateStr,
      imageUrl: noteImageUrl,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingNote?.id) {
        await updateDoc(doc(db, `users/${user.uid}/notes`, editingNote.id), noteData);
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
      setTimeout(() => setShowSaveIndicator(false), 1500);
    } catch (err) {
      console.error('Error auto-saving note:', err);
      setIsSaving(false);
      isSavingRef.current = false;
    }
  };

  useEffect(() => {
    if (!showNoteModal) return;
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 1500);
    return () => clearTimeout(timer);
  }, [noteTitle, noteText, noteTags, selectedDate, noteColor, noteImageUrl, editingNote, showNoteModal]);

  // Sync contentEditable text on open
  useEffect(() => {
    if (showNoteModal && contentInputRef.current) {
      if (contentInputRef.current.innerHTML !== noteText) {
        contentInputRef.current.innerHTML = noteText || '';
      }
    }
  }, [showNoteModal, editingNote]);

  // Note Action Handlers
  const handleEditNote = (note, e) => {
    if (e) e.stopPropagation();
    setEditingNote(note);
    setSelectedDate(note.date ? new Date(note.date) : new Date());
    setNoteTitle(note.title || '');
    setNoteText(note.text || '');
    setNoteTags(note.tags || []);
    setNoteColor(note.color || 'blue');
    setNoteImageUrl(note.imageUrl || '');
    setShowSimilarNotes(false);
    setShowNoteModal(true);
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setSelectedDate(new Date());
    setNoteTitle('');
    setNoteText('');
    setNoteTags(activeTagName ? [activeTagName] : []);
    setNoteColor('blue');
    setNoteImageUrl('');
    setShowSimilarNotes(false);
    setShowNoteModal(true);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (contentInputRef.current) {
        contentInputRef.current.focus();
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(contentInputRef.current);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };

  const handleDeleteNote = async (noteId, e) => {
    if (e) e.stopPropagation();
    if (!user) return;
    if (!window.confirm('Bu notu silmek istediğinize emin misiniz?')) return;

    try {
      if (editingNote && editingNote.id === noteId) {
        setShowNoteModal(false);
      }
      await updateDoc(doc(db, `users/${user.uid}/notes`, noteId), { deleted: true });
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  // Tag Cover Modal Action Handlers
  const handleCreateTag = () => {
    setEditingTag({ isNew: true });
    setTagNameInput('');
    setTagColorInput('Blue');
    setTagImageUrl('');
    setTagUseCollageInput(false);
    setShowTagModal(true);
  };

  const handleEditTagCover = (tag, e) => {
    if (e) e.stopPropagation();
    setEditingTag(tag);
    setTagNameInput(tag.name);
    setTagColorInput(tag.color || 'Blue');
    setTagImageUrl(tag.imageUrl || '');
    setTagUseCollageInput(tag.useCollage || false);
    setShowTagModal(true);
  };

  const handleSaveTagProperties = async () => {
    if (!user) return;
    try {
      // Find the minimum order index in sortedTags
      const minOrder = sortedTags.reduce((min, t) => {
        const o = t.order ?? 999;
        return o < min ? o : min;
      }, 0);
      const newOrder = minOrder - 1;

      const tagData = {
        name: tagNameInput,
        color: tagColorInput,
        imageUrl: tagImageUrl,
        useCollage: tagUseCollageInput,
        updatedAt: serverTimestamp()
      };

      if (editingTag?.id) {
        // Managed Tag: Update doc
        await updateDoc(doc(db, `users/${user.uid}/noteTags`, editingTag.id), tagData);

        // Update tag name in notes if name changed
        if (editingTag.name !== tagNameInput) {
          const notesToUpdate = notes.filter(n => n.tags?.includes(editingTag.name));
          for (const note of notesToUpdate) {
            const newTags = note.tags.map(t => t === editingTag.name ? tagNameInput : t);
            await updateDoc(doc(db, `users/${user.uid}/notes`, note.id), { tags: newTags });
          }
          if (activeTagName === editingTag.name) {
            selectActiveTag(tagNameInput);
          }
        }
      } else {
        // Unmanaged Tag OR Brand New Tag
        const isBrandNew = editingTag?.isNew;
        const newTagDoc = {
          ...tagData,
          order: newOrder,
          createdAt: serverTimestamp()
        };

        await addDoc(collection(db, `users/${user.uid}/noteTags`), newTagDoc);

        // Update tag name in notes if name changed
        if (!isBrandNew && editingTag?.name && editingTag.name !== tagNameInput) {
          const notesToUpdate = notes.filter(n => n.tags?.includes(editingTag.name));
          for (const note of notesToUpdate) {
            const newTags = note.tags.map(t => t === editingTag.name ? tagNameInput : t);
            await updateDoc(doc(db, `users/${user.uid}/notes`, note.id), { tags: newTags });
          }
          if (activeTagName === editingTag.name) {
            selectActiveTag(tagNameInput);
          }
        }
      }
      setShowTagModal(false);
    } catch (err) {
      console.error('Error saving tag properties:', err);
    }
  };

  // Global delete tag
  const handleDeleteGlobalTag = async (tagName, tagId) => {
    if (!user) return;
    if (!window.confirm(`'${tagName}' etiketini silmek istediğinize emin misiniz? Bu işlem etiketi tüm notlardan kaldıracaktır.`)) return;

    try {
      if (tagId) {
        await deleteDoc(doc(db, `users/${user.uid}/noteTags`, tagId));
      }
      
      const notesToUpdate = notes.filter(n => n.tags?.includes(tagName));
      for (const note of notesToUpdate) {
        const newTags = note.tags.filter(t => t !== tagName);
        await updateDoc(doc(db, `users/${user.uid}/notes`, note.id), { tags: newTags });
      }

      if (activeTagName === tagName) {
        setActiveTagName(null);
      }
    } catch (err) {
      console.error('Error deleting global tag:', err);
    }
  };

  // Image upload compression base64
  const handleImageUploadChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setTagImageUrl(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Note image upload compression base64
  const handleNoteImageUploadChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setNoteImageUrl(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Note editor tags methods
  const addTag = (tagToAdd) => {
    const t = tagToAdd || tagInput.trim();
    if (t && !noteTags.includes(t)) {
      setNoteTags([...noteTags, t]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const removeTag = (tagToRemove) => {
    setNoteTags(noteTags.filter(t => t !== tagToRemove));
  };

  // Content Selection Style Formatting Toolbar methods
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

  const handleEditorClick = (e) => {
    const anchor = e.target.closest('a');
    if (anchor) {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = anchor.getBoundingClientRect();
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
      parent.insertBefore(element.firstChild, parent); // Wait, this parent.insertBefore should insert before element
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
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    if (element) {
      element.setAttribute('href', url);
      element.textContent = text;
    } else {
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
    requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !selection.toString().trim()) {
        setFloatingToolbar(prev => (prev.show ? { ...prev, show: false } : prev));
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      if (contentInputRef.current && !contentInputRef.current.contains(range.commonAncestorContainer)) {
        setFloatingToolbar(prev => (prev.show ? { ...prev, show: false } : prev));
        return;
      }

      let x = rect.left + rect.width / 2 + window.scrollX;
      let y = rect.top + window.scrollY;

      if (window.innerWidth < 768) {
        y -= 6;
      } else {
        y -= 12;
      }

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

  // Add selectionchange listener
  useEffect(() => {
    if (showNoteModal) {
      document.addEventListener('selectionchange', handleTextSelection);
      return () => document.removeEventListener('selectionchange', handleTextSelection);
    } else {
      setLinkEditor({ show: false, text: '', url: '', range: null, element: null });
      setFloatingToolbar({ show: false, x: 0, y: 0 });
      setLinkPopup({ show: false, x: 0, y: 0, url: '', element: null });
    }
  }, [showNoteModal]);

  // Global click-outside listener
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

  const renderTagCover = (tag) => {
    if (tag.imageUrl && !tag.useCollage) {
      return (
        <img 
          src={tag.imageUrl} 
          alt={tag.name} 
          className="tag-card-cover" 
          style={{ objectFit: coverFitMode }}
        />
      );
    }

    const notesWithImages = activeNotes
      .filter(n => n.tags?.includes(tag.name) && n.imageUrl)
      .sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA);
      });

    const noteImages = Array.from(
      new Set(
        notesWithImages.map(n => n.imageUrl)
      )
    );

    if (noteImages.length === 0) {
      return <div className={`tag-card-cover ${getTagGradientClass(tag.name)}`} />;
    }

    const imagesToShow = noteImages.slice(0, 9); // Limit to max 9 images
    const count = imagesToShow.length;

    if (count === 1) {
      return (
        <img 
          src={imagesToShow[0]} 
          alt={tag.name} 
          className="tag-card-cover" 
          style={{ objectFit: coverFitMode }}
        />
      );
    }

    // Determine sizes for multiple images (preserving 2:3 movie poster ratio)
    const posterWidth = count === 2 ? '90px' : '65px';
    const posterHeight = count === 2 ? '130px' : '95px';

    return (
      <div 
        className="tag-card-cover"
        style={{ 
          position: 'relative',
          height: '100%', 
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Blurred background using the first note's image */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${imagesToShow[0]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(15px) brightness(0.35)',
            transform: 'scale(1.15)',
            zIndex: 1
          }}
        />

        {/* Mini posters container */}
        <div 
          style={{
            position: 'relative',
            display: 'flex',
            flexWrap: 'wrap',
            gap: count === 2 ? '16px' : '10px',
            justifyContent: 'center',
            alignItems: 'center',
            alignContent: 'center',
            padding: '12px',
            height: '100%',
            width: '100%',
            zIndex: 2
          }}
        >
          {imagesToShow.map((imgUrl, i) => (
            <div 
              key={i} 
              style={{ 
                width: posterWidth, 
                height: posterHeight, 
                backgroundImage: `url(${imgUrl})`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center', 
                backgroundRepeat: 'no-repeat',
                borderRadius: '0',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.45)',
                transition: 'transform 0.2s ease'
              }} 
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container pt-3 pb-5">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="fw-bold h2 mb-1 d-flex align-items-center gap-2">
            <FolderOpen className="text-primary" size={28} />
            Etiketler
          </h1>
          <p className="text-muted small mb-0">Notlarınızı etiketlerine göre görsel bir biçimde inceleyin ve yönetin.</p>
          {lastNoteTimeText && (
            <span className="text-muted x-small mt-1 d-block text-lowercase" style={{ fontSize: '11px', opacity: 0.8 }}>
              en son yeni not: {lastNoteTimeText.toLowerCase()}
            </span>
          )}
        </div>

        {/* Action Button Panel */}
        <div className="d-flex align-items-center gap-2">
          {/* Cover Fit Settings Dropdown */}
          <Dropdown align="end">
            <Dropdown.Toggle as="div" className="p-0 border-0 bg-transparent shadow-none dropdown-no-caret">
              <Button variant="light" size="sm" className="action-btn-circle" title="Kapak Ayarları">
                <SlidersHorizontal size={16} />
              </Button>
            </Dropdown.Toggle>
            <Dropdown.Menu className="glass-card shadow-lg border-0 p-3 mt-2 animate-fade-in" style={{ minWidth: '200px' }}>
              <h6 className="fw-bold fs-11 text-muted uppercase-tracking mb-3">GÖRSEL AYARLARI</h6>
              <Form.Group className="mb-0">
                <Form.Label className="x-small fw-bold opacity-75 mb-2">Görsel Boyutlandırma</Form.Label>
                <div className="d-flex flex-column gap-1">
                  {[
                    { id: 'cover', label: 'Doldur (Cover)' },
                    { id: 'contain', label: 'Sığdır (Contain)' },
                    { id: 'fill', label: 'Uzat (Fill)' }
                  ].map((mode) => (
                    <div 
                      key={mode.id}
                      className={`p-2 rounded cursor-pointer fs-12 transition-all d-flex align-items-center justify-content-between ${coverFitMode === mode.id ? 'bg-primary bg-opacity-10 text-primary fw-bold' : 'hover-bg-light text-muted'}`}
                      onClick={() => {
                        setCoverFitMode(mode.id);
                        localStorage.setItem('tags_cover_fit_mode', mode.id);
                      }}
                    >
                      {mode.label}
                      {coverFitMode === mode.id && <Check size={12} />}
                    </div>
                  ))}
                </div>
              </Form.Group>
            </Dropdown.Menu>
          </Dropdown>

          {/* Visibility and Sort Settings Button */}
          <Button 
            variant="light" 
            size="sm" 
            className="action-btn-circle" 
            title="Etiket Ayarları"
            onClick={() => setShowSettingsModal(true)}
          >
            <Settings size={16} />
          </Button>

          {/* New Tag Button */}
          <Button 
            variant="primary" 
            size="sm" 
            className="action-btn-circle" 
            title="Yeni Etiket Ekle"
            onClick={handleCreateTag}
            style={{ color: 'white' }}
          >
            <Plus size={16} />
          </Button>
        </div>
      </div>

      {/* Gallery vs Table Layout Toggles */}
      <div className="view-tabs-container d-flex align-items-center justify-content-between">
        <div className="d-flex">
          <button 
            className={`view-tab-btn ${layoutMode === 'gallery' ? 'active' : ''}`}
            onClick={() => changeLayoutMode('gallery')}
          >
            <FolderOpen size={16} /> Galeri
          </button>
          <button 
            className={`view-tab-btn ${layoutMode === 'table' ? 'active' : ''}`}
            onClick={() => changeLayoutMode('table')}
          >
            <TableIcon size={16} /> Tablo
          </button>
        </div>

        {layoutMode === 'gallery' && (
          <div className="d-flex align-items-center gap-2 pe-2 pb-1">
            <Button 
              variant="light" 
              size="sm" 
              className="action-btn-circle" 
              onClick={scrollPrev}
              title="Geri"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button 
              variant="light" 
              size="sm" 
              className="action-btn-circle" 
              onClick={scrollNext}
              title="İleri"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      </div>

      {/* Tags List Section (Gallery Cards or Table Rows) */}
      {layoutMode === 'table' ? (
        /* Table Layout for Tags */
        <div className="tags-list-table-container glass-card p-3 mb-4">
          <div className="table-responsive">
            <Table className="tags-list-table border-0 align-middle">
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>Kapak</th>
                  <th style={{ width: '35%' }}>Etiket Adı</th>
                  <th style={{ width: '25%' }}>Renk</th>
                  <th style={{ width: '20%' }}>Not Sayısı</th>
                  <th style={{ width: '10%' }} className="text-end">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {visibleTags.map((tag) => (
                  <SortableTagRow
                    key={tag.name}
                    tag={tag}
                    isSelected={activeTagName === tag.name}
                    onClick={() => selectActiveTag(tag.name)}
                    coverFitMode={coverFitMode}
                    activeNotes={activeNotes}
                    handleEditTagCover={handleEditTagCover}
                    handleDeleteGlobalTag={handleDeleteGlobalTag}
                    tagNoteCounts={tagNoteCounts}
                    lastNoteTimeText={tagLastNoteTimes[tag.name]}
                  />
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      ) : (
        /* Gallery Layout for Tags - Premium Overlay Design */
        <div ref={containerRef} className="tags-gallery-grid">
          {(() => {
            const activeIdx = visibleTags.findIndex(t => t.name === activeTagName);
            return visibleTags.map((tag, idx) => {
              let scale = 0.85;
              if (activeIdx !== -1) {
                const diff = Math.abs(idx - activeIdx);
                if (diff === 0) scale = 1.0;
                else if (diff === 1) scale = 0.9;
              } else {
                scale = 0.95;
              }
              return (
                <SortableTagCard
                  key={tag.name}
                  tag={tag}
                  isSelected={activeTagName === tag.name}
                  onClick={() => selectActiveTag(tag.name)}
                  renderTagCover={renderTagCover}
                  tagNoteCounts={tagNoteCounts}
                  handleEditTagCover={handleEditTagCover}
                  scale={scale}
                  lastNoteTimeText={tagLastNoteTimes[tag.name]}
                />
              );
            });
          })()}
        </div>
      )}

      {/* Selected Tag Details Section */}
      {activeTagName && (
        <div className="tag-detail-section glass-card p-0 py-4 animate-fade-in">
          <div className="d-flex align-items-center justify-content-between mb-4 px-4 flex-wrap gap-3">
            <h3 className="fw-bold h4 mb-0 d-flex align-items-center gap-2 text-dark">
              <span 
                className="px-3 py-1.5 rounded-3 fs-15 shadow-sm"
                style={getTagStyleByColor(tagsList.find(t => t.name === activeTagName)?.color || 'Blue')}
              >
                {activeTagName}
              </span>
              <span className="text-muted fw-normal fs-15">etiketli notlar</span>
            </h3>

            <div className="d-flex align-items-center gap-2 flex-wrap ms-auto">
              <Button 
                variant="primary" 
                size="sm" 
                className="rounded-pill px-3 fw-bold text-white d-flex align-items-center gap-1.5 shadow-sm"
                onClick={handleCreateNote}
              >
                <Plus size={16} /> Yeni Not Ekle
              </Button>

              {/* Search Input */}
              <div className="position-relative search-input-container">
                <input
                  type="text"
                  placeholder="Notlarda ara..."
                  className="form-control form-control-sm rounded-pill ps-4 search-input-styled"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '180px', paddingLeft: '32px', fontSize: '13px' }}
                />
                <Search size={14} className="position-absolute text-muted" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.7 }} />
                {searchQuery && (
                  <X 
                    size={14} 
                    className="position-absolute text-muted cursor-pointer hover-text-danger" 
                    style={{ right: '12px', top: '50%', transform: 'translateY(-50%)' }}
                    onClick={() => setSearchQuery('')}
                  />
                )}
              </div>

              {/* Table Column Control & Sort Dropdown */}
              <Dropdown align="end" autoClose="outside">
                <Dropdown.Toggle as="div" className="btn btn-outline-secondary btn-sm rounded-pill p-2 d-flex align-items-center justify-content-center cursor-pointer dropdown-no-caret" style={{ width: '32px', height: '32px', border: '1px solid var(--glass-border)', display: 'inline-flex', padding: 0 }}>
                  <SlidersHorizontal size={14} />
                </Dropdown.Toggle>
                
                <Dropdown.Menu className="glass-card shadow-lg border-0 p-3 mt-2" style={{ minWidth: '260px', zIndex: 1050 }}>
                  <div className="small fw-bold text-muted mb-2 px-1 text-uppercase">Görünüm ve Sıralama</div>
                  
                  {/* Sorting Section */}
                  <div className="mb-3">
                    <div className="x-small fw-bold text-muted opacity-75 mb-2 px-1">SIRALAMA</div>
                    <div className="d-flex flex-column gap-1 bg-light bg-opacity-50 p-1.5 rounded-3">
                      {[
                        { label: 'Tarih: En Yeni', key: 'date', direction: 'desc' },
                        { label: 'Tarih: En Eski', key: 'date', direction: 'asc' },
                        { label: 'Başlık: A-Z', key: 'title', direction: 'asc' },
                        { label: 'Başlık: Z-A', key: 'title', direction: 'desc' }
                      ].map(opt => {
                        const isSelected = sortConfig.key === opt.key && sortConfig.direction === opt.direction;
                        return (
                          <div
                            key={opt.label}
                            className={`dropdown-item small rounded-2 py-1.5 px-2.5 d-flex align-items-center justify-content-between cursor-pointer ${isSelected ? 'bg-primary bg-opacity-10 text-primary fw-bold' : 'text-muted'}`}
                            onClick={() => {
                              const newSort = { key: opt.key, direction: opt.direction };
                              setSortConfig(newSort);
                              localStorage.setItem('tags_sort_config', JSON.stringify(newSort));
                            }}
                          >
                            <span>{opt.label}</span>
                            {isSelected && <Check size={12} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Column Visibility Section */}
                  <div className="mb-2">
                    <div className="x-small fw-bold text-muted opacity-75 mb-2 px-1">SÜTUNLARI GÖSTER/GİZLE</div>
                    <div className="d-flex flex-column gap-1.5 p-1">
                      {columnOrder.map((colId, index) => {
                        const labelMap = {
                          date: 'Tarih',
                          title: 'Başlık',
                          preview: 'İçerik Önizleme',
                          tags: 'Etiketler',
                          actions: 'İşlem'
                        };
                        const isVisible = columnVisibility[colId];
                        return (
                          <div
                            key={colId}
                            draggable="true"
                            onDragStart={(e) => handleColumnDragStart(e, index)}
                            onDragOver={handleColumnDragOver}
                            onDrop={(e) => handleColumnDrop(e, index)}
                            className={`d-flex align-items-center justify-content-between p-2 rounded hover-bg-light cursor-pointer ${draggedColumnIdx === index ? 'opacity-50 bg-light border-dashed' : ''}`}
                            style={{ transition: 'all 0.15s ease' }}
                          >
                            <div className="d-flex align-items-center gap-2">
                              <GripVertical size={12} className="text-muted opacity-50 cursor-grab" />
                              <span className="fs-12 fw-medium text-dark">{labelMap[colId]}</span>
                            </div>
                            <Form.Check
                              type="switch"
                              id={`col-switch-${colId}`}
                              checked={isVisible}
                              onChange={(e) => {
                                const nextVis = { ...columnVisibility, [colId]: e.target.checked };
                                setColumnVisibility(nextVis);
                                localStorage.setItem('tags_column_visibility', JSON.stringify(nextVis));
                              }}
                              className="custom-switch-sm m-0"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>

          {/* Notes Table */}
          <div className="table-responsive">
            {selectedTagNotes.length > 0 ? (
              <>
                <Table className="tags-notes-table border-0 align-middle">
                  <thead>
                    <tr>
                      {columnOrder.map(colId => {
                        if (colId === 'date' && columnVisibility.date) return <th key="date" style={{ width: '15%' }}>Tarih</th>;
                        if (colId === 'title' && columnVisibility.title) return <th key="title" style={{ width: '30%' }}>Başlık</th>;
                        if (colId === 'preview' && columnVisibility.preview) return <th key="preview" style={{ width: '35%' }}>İçerik Önizleme</th>;
                        if (colId === 'tags' && columnVisibility.tags) return <th key="tags" style={{ width: '12%' }}>Etiketler</th>;
                        if (colId === 'actions' && columnVisibility.actions) return <th key="actions" style={{ width: '8%' }} className="text-end">İşlem</th>;
                        return null;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedNotes.map((note) => (
                      <tr key={note.id}>
                        {columnOrder.map(colId => {
                          if (colId === 'date' && columnVisibility.date) {
                            return (
                              <td key="date" className="text-muted fw-semibold fs-13">
                                {formatDisplayDate(note.date)}
                              </td>
                            );
                          }
                          if (colId === 'title' && columnVisibility.title) {
                            return (
                              <td key="title">
                                <div className="d-flex align-items-center gap-2">
                                  <span 
                                    className="note-color-dot" 
                                    style={{ backgroundColor: NOTE_COLORS[note.color || 'blue'] }}
                                  />
                                  {note.imageUrl && (
                                    <img 
                                      src={note.imageUrl} 
                                      alt="" 
                                      className="note-table-cover-thumb"
                                    />
                                  )}
                                  <a 
                                    href="#" 
                                    className="note-table-title-link text-truncate"
                                    style={{ maxWidth: '240px' }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleEditNote(note);
                                    }}
                                  >
                                    {note.title || 'Başlıksız Not'}
                                  </a>
                                </div>
                              </td>
                            );
                          }
                          if (colId === 'preview' && columnVisibility.preview) {
                            return (
                              <td key="preview" className="text-muted text-truncate" style={{ maxWidth: '300px' }}>
                                {stripHtml(note.text) || <em className="opacity-50">İçerik boş...</em>}
                              </td>
                            );
                          }
                          if (colId === 'tags' && columnVisibility.tags) {
                            return (
                              <td key="tags">
                                <div className="d-flex flex-wrap gap-1">
                                  {note.tags?.map((t, idx) => {
                                    const globalTag = globalNoteTags.find(gt => gt.name === t);
                                    const isActive = t === activeTagName;
                                    return (
                                      <span 
                                        key={idx} 
                                        className="cursor-pointer"
                                        style={getTagStyleByColor(globalTag?.color || 'Blue')}
                                        onClick={() => selectActiveTag(t)}
                                        title={isActive ? "Şu an seçili - Kaldırmak için tıklayın" : "Bu etikete git"}
                                      >
                                        {t}
                                        {isActive && <span className="ms-1 text-primary" style={{ fontSize: '8px' }}>●</span>}
                                      </span>
                                    );
                                  })}
                                </div>
                              </td>
                            );
                          }
                          if (colId === 'actions' && columnVisibility.actions) {
                            return (
                              <td key="actions" className="text-end">
                                <div className="d-inline-flex gap-1">
                                  <button 
                                    type="button" 
                                    className="action-btn-circle edit" 
                                    onClick={(e) => handleEditNote(note, e)}
                                    title="Düzenle"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button 
                                    type="button" 
                                    className="action-btn-circle delete" 
                                    onClick={(e) => handleDeleteNote(note.id, e)}
                                    title="Sil"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            );
                          }
                          return null;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </Table>

                {/* Pagination Controls */}
                {selectedTagNotes.length > 0 && (
                  <div className="d-flex align-items-center gap-4 mt-3 pt-3 border-top px-4 mobile-scroll-x">
                    {limitCount < selectedTagNotes.length && (
                      <div className="d-flex align-items-center gap-2 py-1 px-3 hover-bg-light cursor-pointer text-muted small rounded-2"
                        style={{ width: 'fit-content' }}
                        onClick={() => setLimitCount(prev => prev + 10)}>
                        <Plus size={14} className="opacity-50" />
                        <span>Daha fazla göster</span>
                      </div>
                    )}

                    <div className={`d-flex align-items-center gap-2 text-muted x-small ${limitCount < selectedTagNotes.length ? 'border-start ps-4' : ''}`}>
                      <span className="opacity-50 fw-bold">GÖRÜNÜM LİMİTİ:</span>
                      {[20, 50, 100].map(v => (
                        <span
                          key={v}
                          className={`cursor-pointer hover-text-primary px-2 py-1 rounded ${limitCount === v ? 'bg-light-primary text-primary fw-bold' : ''}`}
                          onClick={() => {
                            setLimitCount(v);
                          }}
                        >
                          {v}
                        </span>
                      ))}
                      <span
                        className={`cursor-pointer hover-text-primary px-2 py-1 rounded ${limitCount >= selectedTagNotes.length ? 'bg-light-primary text-primary fw-bold' : ''}`}
                        onClick={() => {
                          setLimitCount(selectedTagNotes.length);
                        }}
                      >
                        Hepsini Gör ({selectedTagNotes.length})
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-5 text-muted small italic">
                {activeNotes.some(n => n.tags?.includes(activeTagName)) 
                  ? "Aradığınız kriterlere uygun not bulunamadı."
                  : "Bu etikete ait kayıtlı bir not bulunamadı. Hemen yukarıdaki düğmeden ekleyebilirsiniz!"
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* Note Editor Modal */}
      <Modal 
        show={showNoteModal} 
        onHide={() => {
          setShowNoteModal(false);
          setIsExpanded(false);
          setShowSimilarNotes(false);
          setShowTagSuggestions(false);
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

            {editingNote && (
              <Button 
                variant="link" 
                className="text-danger p-0 d-flex align-items-center justify-content-center opacity-75 hover-opacity-100" 
                onClick={(e) => handleDeleteNote(editingNote.id, e)} 
                style={{ width: '32px', height: '32px' }}
              >
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

            <Button variant="link" className="text-muted p-0 d-flex align-items-center justify-content-center" onClick={() => setShowNoteModal(false)} style={{ width: '32px', height: '32px' }}>
              <X size={24} />
            </Button>
          </div>
        </div>

        <Modal.Body className="pt-4">
          {/* Note Title and Color Dot Picker */}
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
            <div className="position-relative w-100" style={{ zIndex: showSimilarNotes ? 101 : 1 }}>
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
                        <span className="text-muted x-small opacity-75">{formatDisplayDate(note.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Form.Group>

          {/* Tags */}
          <Form.Group className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <TagIcon size={14} className="text-muted" />
              <Form.Label className="text-muted small fw-bold mb-0 uppercase-tracking">ETİKETLER</Form.Label>
            </div>
            <div 
              className="tags-input-container glass-card p-2 d-flex flex-wrap gap-2 align-items-center position-relative"
              style={{ zIndex: showTagSuggestions ? 100 : 1 }}
            >
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
                
                {tagSuggestions.length > 0 && showTagSuggestions && (
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
                    {tagSuggestions.map((tagName, idx) => {
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

          {/* Görsel Ekleme */}
          <Form.Group className="mb-4">
            <Form.Label className="text-muted small fw-bold mb-2 uppercase-tracking d-block">NOT GÖRSELİ (URL VEYA DOSYA)</Form.Label>
            <div className="glass-card p-3 d-flex align-items-stretch gap-3">
              {/* Left side: Image preview or placeholder */}
              <div 
                className="border overflow-hidden shadow-sm flex-shrink-0 position-relative" 
                style={{ 
                  width: '100px', 
                  height: '145px', 
                  backgroundColor: 'var(--glass-bg, #f8f9fa)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}
              >
                {noteImageUrl ? (
                  <img 
                    src={noteImageUrl} 
                    alt="" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div className="text-muted text-center p-2" style={{ fontSize: '10px' }}>
                    <Plus size={16} className="opacity-50 mb-1" />
                    <div>Görsel Yok</div>
                  </div>
                )}
              </div>

              {/* Right side: URL Input & File Upload Button */}
              <div className="d-flex flex-column justify-content-between flex-grow-1 py-1">
                <div className="w-100">
                  <div className="d-flex align-items-center justify-content-between mb-1.5">
                    <Form.Label className="small fw-bold text-muted mb-0">SON EKLENEN GÖRSELLER</Form.Label>
                    {noteImageUrl && (
                      <Button 
                        variant="link" 
                        className="text-danger p-0 text-decoration-none x-small fw-bold border-0"
                        onClick={() => setNoteImageUrl('')}
                        style={{ fontSize: '11px' }}
                      >
                        Görseli Kaldır
                      </Button>
                    )}
                  </div>
                  {recentImages.length > 0 ? (
                    <div 
                      className="d-flex align-items-center gap-2 overflow-x-auto py-1.5 px-0.5" 
                      style={{ 
                        maxWidth: '100%',
                        whiteSpace: 'nowrap',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                      }}
                    >
                      {recentImages.map((imgUrl, idx) => {
                        const isSelected = noteImageUrl === imgUrl;
                        return (
                          <div
                            key={idx}
                            onClick={() => setNoteImageUrl(imgUrl)}
                            style={{
                              width: '45px',
                              height: '65px',
                              flexShrink: 0,
                              backgroundImage: `url(${imgUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              borderRadius: '6px',
                              border: isSelected ? '2.5px solid var(--bs-primary, #0d6efd)' : '1px solid rgba(0,0,0,0.12)',
                              boxShadow: isSelected ? '0 2px 6px rgba(13, 110, 253, 0.4)' : 'none',
                              cursor: 'pointer',
                              transform: isSelected ? 'scale(1.05)' : 'none',
                              transition: 'all 0.2s ease',
                              position: 'relative'
                            }}
                            className="hover-scale-img"
                            title="Görseli Seç"
                          >
                            {isSelected && (
                              <div 
                                style={{
                                  position: 'absolute',
                                  top: '2px',
                                  right: '2px',
                                  background: 'var(--bs-primary, #0d6efd)',
                                  color: 'white',
                                  borderRadius: '50%',
                                  width: '12px',
                                  height: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '8px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }}
                              >
                                ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-muted x-small py-2 px-1 italic">
                      Henüz eklenmiş görsel bulunmuyor.
                    </div>
                  )}
                </div>

                <div className="w-100">
                  <input 
                    type="file" 
                    ref={noteFileInputRef} 
                    onChange={handleNoteImageUploadChange} 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                  />
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    className="d-flex align-items-center justify-content-center gap-2 fs-13 border w-100 py-2"
                    onClick={() => noteFileInputRef.current?.click()}
                  >
                    <Upload size={14} /> Bilgisayardan Görsel Seç (Base64)
                  </Button>
                </div>
              </div>
            </div>
          </Form.Group>

          {/* Content Editable Area (Formatting toolbar is floating portal style) */}
          <Form.Group className="mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
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
                </button>
                <button 
                  type="button" 
                  className="btn btn-link p-1 text-muted hover-text-primary border-0 shadow-none transition-all d-flex align-items-center gap-1" 
                  onClick={handleRedo} 
                  title="İleri Al"
                >
                  <Redo size={14} />
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
                if (linkEditorShowRef.current) return;
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

      {/* Tag Image and Info Modal */}
      <Modal 
        show={showTagModal} 
        onHide={() => setShowTagModal(false)} 
        centered
        className="notion-modal"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold h5 text-dark">Etiket Özellikleri</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted">ETİKET ADI</Form.Label>
              <Form.Control 
                type="text" 
                value={tagNameInput}
                onChange={(e) => setTagNameInput(e.target.value)}
                className="bg-light border-0"
              />
            </Form.Group>

            {/* Custom Tag Color Picker Dots */}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted">ETİKET RENGİ</Form.Label>
              <div className="tag-color-selector">
                {COLORS.map(c => (
                  <div 
                    key={c.name}
                    onClick={() => setTagColorInput(c.name)}
                    className={`tag-color-dot-btn ${tagColorInput === c.name ? 'active' : ''}`}
                    style={{ 
                      backgroundColor: c.bg,
                      border: tagColorInput === c.name ? `2.5px solid ${c.text}` : '1px solid rgba(0,0,0,0.1)'
                    }}
                    title={c.name}
                  >
                    {tagColorInput === c.name && <Check size={12} style={{ color: c.text }} />}
                  </div>
                ))}
              </div>
            </Form.Group>

            {/* Collage vs Custom Cover Switch */}
            <Form.Group className="mb-3">
              <Form.Check 
                type="switch" 
                id="tag-use-collage-switch"
                label={tagUseCollageInput ? "Notlardaki görselleri kapak kolajı olarak kullan" : "Ekli kapak görselini kullan"}
                checked={tagUseCollageInput}
                onChange={(e) => setTagUseCollageInput(e.target.checked)}
                className="fw-bold small text-muted"
                style={{ cursor: 'pointer' }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted mb-2">KAPAK GÖRSELİ (URL VEYA DOSYA)</Form.Label>
              <div className="glass-card p-3 d-flex align-items-stretch gap-3">
                {/* Left side: Image preview or placeholder */}
                <div 
                  className="border overflow-hidden shadow-sm flex-shrink-0 position-relative" 
                  style={{ 
                    width: '100px', 
                    height: '145px', 
                    backgroundColor: 'var(--glass-bg, #f8f9fa)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}
                >
                  {tagImageUrl ? (
                    <img 
                      src={tagImageUrl} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: coverFitMode }} 
                    />
                  ) : (
                    <div className="text-muted text-center p-2" style={{ fontSize: '10px' }}>
                      <Upload size={16} className="opacity-50 mb-1" />
                      <div>Görsel Yok</div>
                    </div>
                  )}
                </div>

                {/* Right side: URL Input & File Upload Button */}
                <div className="d-flex flex-column justify-content-between flex-grow-1 py-1">
                  <div className="w-100">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <Form.Label className="small fw-bold text-muted mb-0">GÖRSEL ADRESİ (URL)</Form.Label>
                      {tagImageUrl && (
                        <Button 
                          variant="link" 
                          className="text-danger p-0 text-decoration-none x-small fw-bold border-0"
                          onClick={() => setTagImageUrl('')}
                        >
                          Görseli Kaldır
                        </Button>
                      )}
                    </div>
                    <div className="input-group">
                      <span className="input-group-text bg-light border-0"><Link2 size={14} className="text-muted" /></span>
                      <Form.Control 
                        type="text" 
                        placeholder="Görsel adresi yapıştırın..."
                        value={tagImageUrl.startsWith('data:') ? '' : tagImageUrl}
                        onChange={(e) => setTagImageUrl(e.target.value)}
                        className="bg-light border-0 fs-13"
                      />
                    </div>
                  </div>

                  <div className="w-100">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageUploadChange} 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                    />
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      className="d-flex align-items-center justify-content-center gap-2 fs-13 border w-100 py-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={14} /> Bilgisayardan Görsel Seç (Base64)
                    </Button>
                  </div>
                </div>
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="light" size="sm" className="rounded-pill px-3" onClick={() => setShowTagModal(false)}>İptal</Button>
          <Button variant="primary" size="sm" className="rounded-pill px-3 text-white fw-bold" onClick={handleSaveTagProperties}>Kaydet</Button>
        </Modal.Footer>
      </Modal>

      {/* Settings Modal */}
      <Modal 
        show={showSettingsModal} 
        onHide={() => setShowSettingsModal(false)} 
        centered
        className="notion-modal"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold h5 text-dark">Etiket Ayarları</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '450px', overflowY: 'auto' }}>
          <p className="text-muted small mb-3">Etiketlerin görünürlüklerini değiştirebilir veya silebilirsiniz. Etiketler, en son not eklenme zamanına göre otomatik olarak sıralanır.</p>
          <div className="d-flex flex-column gap-1">
            {sortedTags.map((tag) => (
              <SortableSettingsTagItem
                key={tag.name}
                tag={tag}
                isHidden={hiddenTags.includes(tag.name)}
                toggleTagVisibility={toggleTagVisibility}
                handleDeleteGlobalTag={handleDeleteGlobalTag}
                tagNoteCounts={tagNoteCounts}
              />
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="primary" size="sm" className="rounded-pill px-4 text-white fw-bold" onClick={() => setShowSettingsModal(false)}>Kapat</Button>
        </Modal.Footer>
      </Modal>

      {/* Floating Formatting Toolbar Portal */}
      {floatingToolbar.show && createPortal(
        <div 
          className="floating-format-toolbar glass-card shadow-lg animate-scale-in"
          style={{ 
            position: 'absolute',
            top: `${floatingToolbar.y}px`,
            left: `${floatingToolbar.x}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 11000,
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

      {/* Link Popup Tooltip Portal */}
      {linkPopup.show && createPortal(
        <div 
          className="link-preview-popup glass-card shadow animate-scale-in"
          style={{ 
            position: 'absolute',
            top: `${linkPopup.y}px`,
            left: `${linkPopup.x}px`,
            transform: 'translateX(-50%)',
            zIndex: 11050,
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
    </div>
  );
}
