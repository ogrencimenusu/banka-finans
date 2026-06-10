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

  // Note editing state
  const [editingNote, setEditingNote] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [noteTags, setNoteTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [noteColor, setNoteColor] = useState('blue');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

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
    return notes.filter(n => n.deleted !== true);
  }, [notes]);

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

  // Sort tags based on order index
  const sortedTags = useMemo(() => {
    return [...tagsList].sort((a, b) => {
      const orderA = a?.order ?? 999;
      const orderB = b?.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      const nameA = a?.name || '';
      const nameB = b?.name || '';
      return nameA.localeCompare(nameB);
    });
  }, [tagsList]);

  // Filter out hidden tags
  const visibleTags = useMemo(() => {
    return sortedTags.filter(tag => !hiddenTags.includes(tag.name));
  }, [sortedTags, hiddenTags]);

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
              
              // Scroll active card to the left of the container (leaving some padding)
              const scrollOffset = container.scrollLeft + (elemRect.left - containerRect.left) - 24;
              
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

  // Drag-and-drop Reordering handlers
  const handleDragStart = (e, idx, type) => {
    setDraggedIndex(idx);
    setDragType(type);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetIdx, type) => {
    e.preventDefault();
    if (draggedIndex === null || dragType !== type || draggedIndex === targetIdx) return;

    const listToReorder = type === 'card' ? visibleTags : sortedTags;
    const items = [...listToReorder];
    const [draggedItem] = items.splice(draggedIndex, 1);
    items.splice(targetIdx, 0, draggedItem);

    setDraggedIndex(null);

    // Save order fields to Firestore
    if (user) {
      try {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.id) {
            await updateDoc(doc(db, `users/${user.uid}/noteTags`, item.id), { order: i });
          } else {
            // Convert unmanaged tag to managed tag to save its order
            await addDoc(collection(db, `users/${user.uid}/noteTags`), {
              name: item.name,
              color: item.color || 'Blue',
              order: i,
              createdAt: serverTimestamp()
            });
          }
        }
      } catch (err) {
        console.error('Error saving tag order:', err);
      }
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
    if (!editingNote && !noteTitle.trim() && !noteText.trim() && noteTags.length === 0) return;

    // Verify change before saving
    const dateStr = selectedDate.toISOString().split('T')[0];
    if (editingNote) {
      const isTitleSame = noteTitle === (editingNote.title || '');
      const isTextSame = noteText === (editingNote.text || '');
      const isTagsSame = JSON.stringify(noteTags) === JSON.stringify(editingNote.tags || []);
      const isDateSame = dateStr === (editingNote.date || '');
      const isColorSame = noteColor === (editingNote.color || 'blue');
      
      if (isTitleSame && isTextSame && isTagsSame && isDateSame && isColorSame) return;
    }

    isSavingRef.current = true;
    setIsSaving(true);

    const noteData = {
      title: noteTitle,
      text: noteText,
      tags: noteTags,
      color: noteColor,
      date: dateStr,
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
  }, [noteTitle, noteText, noteTags, selectedDate, noteColor, editingNote, showNoteModal]);

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
    setShowNoteModal(true);
  };

  const handleCreateNote = () => {
    setEditingNote(null);
    setSelectedDate(new Date());
    setNoteTitle('');
    setNoteText('');
    setNoteTags(activeTagName ? [activeTagName] : []);
    setNoteColor('blue');
    setShowNoteModal(true);
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
  const handleEditTagCover = (tag, e) => {
    if (e) e.stopPropagation();
    setEditingTag(tag);
    setTagNameInput(tag.name);
    setTagColorInput(tag.color || 'Blue');
    setTagImageUrl(tag.imageUrl || '');
    setShowTagModal(true);
  };

  const handleSaveTagProperties = async () => {
    if (!user) return;
    try {
      const tagData = {
        name: tagNameInput,
        color: tagColorInput,
        imageUrl: tagImageUrl,
        updatedAt: serverTimestamp()
      };

      if (editingTag.id) {
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
        // Unmanaged Tag: Create doc in Firestore
        await addDoc(collection(db, `users/${user.uid}/noteTags`), {
          ...tagData,
          createdAt: serverTimestamp()
        });

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
        </div>
      </div>

      {/* Gallery vs Table Layout Toggles */}
      <div className="view-tabs-container">
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
                {visibleTags.map((tag, idx) => {
                  const count = tagNoteCounts[tag.name] || 0;
                  const isSelected = activeTagName === tag.name;

                  return (
                    <tr 
                      key={tag.name} 
                      className={`${isSelected ? 'active' : ''} ${draggedIndex === idx && dragType === 'card' ? 'dragging' : ''}`}
                      onClick={() => selectActiveTag(tag.name)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, idx, 'card')}
                    >
                      <td>
                        {/* Drag Handle & Thumb */}
                        <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <div 
                            style={{ cursor: 'grab' }}
                            draggable="true"
                            onDragStart={(e) => handleDragStart(e, idx, 'card')}
                            className="text-muted opacity-40 hover-opacity-100"
                          >
                            <GripVertical size={16} />
                          </div>
                          {tag.imageUrl ? (
                            <div 
                              className="tag-table-cover-thumb" 
                              style={{ backgroundImage: `url(${tag.imageUrl})`, backgroundSize: coverFitMode }}
                            />
                          ) : (
                            <div 
                              className={`tag-table-cover-thumb ${getTagGradientClass(tag.name)}`}
                            />
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="tag-card-badge" style={getTagStyleByColor(tag.color || 'Blue')}>
                          {tag.name}
                        </span>
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
                })}
              </tbody>
            </Table>
          </div>
        </div>
      ) : (
        /* Gallery Layout for Tags - Premium Overlay Design */
        <div ref={containerRef} className="tags-gallery-grid">
          {visibleTags.map((tag, idx) => {
            const count = tagNoteCounts[tag.name] || 0;
            const isSelected = activeTagName === tag.name;

            return (
              <div 
                key={tag.name} 
                className={`tag-card glass-card ${isSelected ? 'active' : ''} ${draggedIndex === idx && dragType === 'card' ? 'dragging' : ''}`}
                onClick={() => selectActiveTag(tag.name)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, idx, 'card')}
              >
                {/* Cover Image */}
                <div className="tag-card-cover-container">
                  {tag.imageUrl ? (
                    <img 
                      src={tag.imageUrl} 
                      alt={tag.name} 
                      className="tag-card-cover" 
                      style={{ objectFit: coverFitMode }}
                    />
                  ) : (
                    <div className={`tag-card-cover ${getTagGradientClass(tag.name)}`} />
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
                  <div 
                    className="tag-card-btn" 
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, idx, 'card')}
                    title="Sürükleyip Sırala"
                    style={{ cursor: 'grab' }}
                  >
                    <GripVertical size={14} />
                  </div>
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
          })}
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
            <Form.Control 
              type="text"
              placeholder="Not başlığı girin..."
              className="notion-title-input border-0 bg-transparent p-0 fs-20 fw-bold w-100"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />
          </Form.Group>

          {/* Tags */}
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

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold text-muted d-flex align-items-center justify-content-between">
                <span>KAPAK GÖRSELİ (URL VEYA DOSYA)</span>
                {tagImageUrl && (
                  <Button 
                    variant="link" 
                    className="text-danger p-0 text-decoration-none x-small fw-bold"
                    onClick={() => setTagImageUrl('')}
                  >
                    Görseli Kaldır
                  </Button>
                )}
              </Form.Label>
              
              {/* Image URL input */}
              <div className="input-group mb-2">
                <span className="input-group-text bg-light border-0"><Link2 size={14} className="text-muted" /></span>
                <Form.Control 
                  type="text" 
                  placeholder="Görsel adresi girin (Unsplash, vb.)..."
                  value={tagImageUrl.startsWith('data:') ? '' : tagImageUrl}
                  onChange={(e) => setTagImageUrl(e.target.value)}
                  className="bg-light border-0 fs-13"
                />
              </div>

              {/* Local File Upload */}
              <div className="d-grid mb-3">
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
                  className="d-flex align-items-center justify-content-center gap-2 fs-13"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={14} /> Bilgisayardan Görsel Seç (Base64)
                </Button>
              </div>

              {/* Cover Preview */}
              {tagImageUrl && (
                <div 
                  className="rounded-3 border overflow-hidden mb-3" 
                  style={{ height: '100px', backgroundImage: `url(${tagImageUrl})`, backgroundSize: coverFitMode, backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} 
                />
              )}
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
          <p className="text-muted small mb-3">Etiketleri sürükleyerek sıralayabilir ve görünürlüklerini değiştirebilirsiniz.</p>
          <div className="d-flex flex-column gap-1">
            {sortedTags.map((tag, idx) => {
              const isHidden = hiddenTags.includes(tag.name);
              return (
                <div 
                  key={tag.name} 
                  className={`settings-tags-list-item d-flex align-items-center justify-content-between p-2 rounded border mb-2 ${draggedIndex === idx && dragType === 'settings-list' ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx, 'settings-list')}
                >
                  <div className="d-flex align-items-center gap-2">
                    {/* Drag Handle */}
                    <div 
                      style={{ cursor: 'grab' }}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, idx, 'settings-list')}
                      className="text-muted opacity-50 hover-opacity-100 p-1"
                    >
                      <GripVertical size={16} />
                    </div>
                    
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
                      id={`tag-visibility-${idx}`}
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
            })}
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
