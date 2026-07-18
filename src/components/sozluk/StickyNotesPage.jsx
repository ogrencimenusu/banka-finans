import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Dropdown, Offcanvas, Badge } from 'react-bootstrap';
import DOMPurify from 'dompurify';
import nlp from 'compromise';
import RichTextEditor from './RichTextEditor';
import WordDetailModal from './WordDetailModal';
import { db } from '../../firebase';
import { playAudio } from './utils/audio';
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useSozluk } from './context/SozlukContext';
const parseDate = (val) => {
  if (!val) return null;
  
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  
  if (typeof val.toDate === 'function') {
    try {
      const d = val.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {}
  }
  
  if (val && typeof val === 'object' && typeof val.seconds === 'number') {
    try {
      const d = new Date(val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1000000));
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {}
  }
  
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
};

// NEW: Memoized Note Item for high performance list rendering
const NoteItem = React.memo(({ 
    note, 
    editingNoteId, 
    setEditingNoteId,
    setInlineEditingText,
    setInlineEditingTitle,
    setInlineEditingSelectedWords,
    expandedManualNotes,
    setExpandedManualNotes,
    searchQuery,
    renderHighlightedText,
    highlightWordsInHtml,
    getWordStatus,
    handleWordClickInternal,
    handleToggleNoteCompletion,
    handleDeleteNote,
    saveCurrentNote,
    justUpdatedNoteId,
    theme,
    words,
    wordSearchTerm,
    setWordSearchTerm,
    inlineEditingText,
    inlineEditingTitle,
    inlineEditingSelectedWords,
    showTitleDropdown,
    setShowTitleDropdown,
    titleSearchTerm,
    setTitleSearchTerm,
    filteredTitles,
    handleAddWordsToDictionary
}) => {
    const noteDate = parseDate(note.createdAt);
    const isValidDate = noteDate instanceof Date && !isNaN(noteDate.getTime());
    const isEditing = editingNoteId === note.id;

    return (
        <div
          id={`note-${note.id}`}
          className={`card border-0 shadow-sm rounded-4 p-4 mb-3 transition-all ${justUpdatedNoteId === note.id ? 'just-updated' : ''}`}
        >
          <div className="w-100 min-w-0">
            {note.wordTerm && (
              <div className="mb-3 d-flex align-items-center gap-2">
                {(note.wordTerm === 'Manuel Not' || note.wordTerm === 'MANUEL NOT' || !note.wordTerm) 
                  ? <span className="badge bg-light text-muted border px-2 py-1 rounded-pill fw-medium" style={{ fontSize: '0.75rem' }}><i className="bi bi-journal-text me-1"></i>Manuel Not</span> 
                  : (
                    <button 
                      className="btn btn-sm rounded-pill d-inline-flex align-items-center gap-2 fw-semibold px-3 py-2 transition-all"
                      style={{ backgroundColor: '#f0f5ff', color: '#0d6efd', border: '1px solid #ddecff' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ddecff'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f0f5ff'; }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWordClickInternal(note.wordTerm);
                      }}
                      title="Kelime detaylarını gör"
                    >
                      <i className="bi bi-link-45deg fs-5"></i>
                      <span>İlişkili Kelime: <strong className="ms-1 fw-bold">{renderHighlightedText(note.wordTerm, searchQuery)}</strong></span>
                    </button>
                  )}
              </div>
            )}

            {isEditing ? (
              <div className="mb-2">
                {/* Title Edit Input */}
                <Dropdown 
                  show={showTitleDropdown === note.id} 
                  onToggle={(isOpen, meta) => {
                    if (meta && meta.source === 'rootClose') {
                      setShowTitleDropdown(null);
                    }
                  }}
                  className="w-100 mb-3"
                >
                  <div className="d-flex bg-light rounded-pill align-items-center pe-2">
                    <Form.Control
                      type="text"
                      value={inlineEditingTitle}
                      onChange={(e) => setInlineEditingTitle(e.target.value)}
                      onClick={() => setShowTitleDropdown(note.id)}
                      placeholder="Not Başlığı (İsteğe bağlı)..."
                      className="border-0 shadow-none bg-transparent px-3 py-2 fw-bold text-body flex-grow-1"
                    />
                    {inlineEditingTitle && (
                      <Button 
                        variant="link" 
                        className="border-0 shadow-none text-muted p-1 text-decoration-none d-flex align-items-center justify-content-center"
                        onClick={() => { setInlineEditingTitle(''); setShowTitleDropdown(note.id); }}
                      >
                        <i className="bi bi-x-circle-fill opacity-50 hover-opacity-100"></i>
                      </Button>
                    )}
                    <Dropdown.Toggle 
                      variant="link" 
                      className="border-0 shadow-none text-muted p-2 text-decoration-none"
                      onClick={() => setShowTitleDropdown(showTitleDropdown === note.id ? null : note.id)}
                    >
                    </Dropdown.Toggle>
                  </div>
                  <Dropdown.Menu className="w-100 p-2 shadow-lg border-0 mt-1 rounded-3" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <div className="px-1 pb-2 mb-2 border-bottom border-opacity-10">
                      <Form.Control
                        type="text"
                        size="sm"
                        placeholder="Kayıtlı başlıklarda ara..."
                        value={titleSearchTerm}
                        onChange={(e) => setTitleSearchTerm(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    </div>
                    {filteredTitles.length === 0 ? (
                      <div className="text-muted small text-center p-2 fst-italic">Kayıtlı başlık bulunamadı.</div>
                    ) : (
                      filteredTitles.map((t, i) => (
                        <Dropdown.Item 
                          key={i} 
                          className="small rounded-2 py-2 text-truncate"
                          onClick={() => {
                            setInlineEditingTitle(t);
                            setShowTitleDropdown(null);
                          }}
                        >
                          {t}
                        </Dropdown.Item>
                      ))
                    )}
                  </Dropdown.Menu>
                </Dropdown>
                <RichTextEditor
                  value={inlineEditingText}
                  onChange={setInlineEditingText}
                  className="mb-2"
                  highlightTags={inlineEditingSelectedWords}
                  onAddWord={(word) => {
                    if (!inlineEditingSelectedWords.includes(word)) {
                      const newWords = [...inlineEditingSelectedWords, word];
                      setInlineEditingSelectedWords(newWords);
                      // Apply highlight to editor immediately
                      const exists = words.some(w => w.term.toLowerCase() === word.toLowerCase());
                      const color = exists ? '#716619' : '#711919';
                      const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                      const regex = new RegExp(`(?<!<[^>]*)\\b(${escapedWord})\\b(?![^<]*>)`, 'gi');
                      setInlineEditingText(prev => prev.replace(regex, `<mark style="background-color: ${color}; color: white; padding: 0 2px; border-radius: 2px;">${word}</mark>`));
                    }
                  }}
                  onBlur={(e) => {}}
                />
                
                {/* Word Selection Field */}
                <div className="mb-2 p-3 bg-body-tertiary rounded-3 border border-opacity-10">
                  <div className="small fw-bold text-primary mb-2 d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-search text-primary"></i> Sözlükten Kelime Ekle
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-primary p-0 text-decoration-none"
                        title="Üstü çizili kelimeleri tara ve ekle"
                        onClick={() => {
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = inlineEditingText;
                          const strikeElements = tempDiv.querySelectorAll('s, strike, del, [style*="line-through"]');
                          const strikeWords = Array.from(strikeElements)
                            .map(el => el.innerText.trim())
                            .filter(w => w.length > 0);
                          
                          if (strikeWords.length > 0) {
                            const newWords = [...new Set([...inlineEditingSelectedWords, ...strikeWords])];
                            setInlineEditingSelectedWords(newWords);
                            
                            // Re-apply all highlights efficiently
                            setInlineEditingText(prev => highlightWordsInHtml(prev, newWords));
                          }
                        }}
                      >
                        <i className="bi bi-type-strikethrough fs-5"></i>
                      </Button>
                      {inlineEditingSelectedWords.length > 0 && (
                        <div className="d-flex align-items-center gap-3">
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="text-danger p-0 text-decoration-none small"
                            onClick={() => {
                              setInlineEditingSelectedWords([]);
                              setInlineEditingText(prev => {
                                const tempDiv = document.createElement('div');
                                tempDiv.innerHTML = prev;
                                const marks = tempDiv.querySelectorAll('mark');
                                marks.forEach(mark => {
                                  const text = document.createTextNode(mark.textContent);
                                  mark.parentNode.replaceChild(text, mark);
                                });
                                return tempDiv.innerHTML;
                              });
                            }}
                          >
                            <i className="bi bi-trash-fill me-1"></i>Tümünü Temizle
                          </Button>

                          {inlineEditingSelectedWords.some(w => getWordStatus(w) === 'none') && (
                            <Button
                              variant="link"
                              size="sm"
                              className="text-primary p-0 text-decoration-none small d-flex align-items-center gap-1 fw-semibold"
                              onClick={() => {
                                const redWords = inlineEditingSelectedWords.filter(w => getWordStatus(w) === 'none');
                                handleAddWordsToDictionary(redWords);
                              }}
                            >
                              <i className="bi bi-plus-circle-fill"></i>Kırmızıları Sözlüğe Ekle
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Search Input */}
                  <div className="position-relative mb-3">
                    <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted small"></i>
                    <Form.Control
                      type="text"
                      size="sm"
                      placeholder="Kelime ara..."
                      value={wordSearchTerm}
                      onChange={(e) => setWordSearchTerm(e.target.value)}
                      className="bg-body border-0 shadow-none ps-5 pe-4 py-2 rounded-pill small border border-opacity-10"
                    />
                  </div>
                  </div>
                </div>
            ) : (
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    setEditingNoteId(note.id);
                    let textToEdit = note.text || '';
                    if (!textToEdit.includes('<br') && !textToEdit.includes('<div') && !textToEdit.includes('<p')) {
                      textToEdit = textToEdit.replace(/\n/g, '<br>');
                    }
                    setInlineEditingText(textToEdit);
                    setInlineEditingTitle(note.title || '');
                    setInlineEditingSelectedWords(note.selectedWords || []);
                    if (!expandedManualNotes.includes(note.id)) {
                      setExpandedManualNotes(prev => [...prev, note.id]);
                    }
                  }}
                >
                  {note.title && (
                    <div className={`h6 fw-bold mb-2 ${note.isCompleted ? 'opacity-50 text-secondary' : 'text-body-emphasis'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.1rem', letterSpacing: '-0.3px' }}>
                      {renderHighlightedText(note.title, searchQuery)}
                    </div>
                  )}

                  <div
                    className={`mb-2 p-1 ${(!note.wordId || note.wordTerm === 'Manuel Not' || note.wordTerm === 'MANUEL NOT') && !expandedManualNotes.includes(note.id) ? 'line-clamp-5' : ''}`}
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: '0.96rem',
                      lineHeight: '1.6',
                      color: 'var(--bs-body-color)'
                    }}
                    dangerouslySetInnerHTML={{ __html: highlightWordsInHtml(note.text, note.selectedWords) }}
                  />

                  {/* Show More Button */}
                  {(!note.wordId || note.wordTerm === 'Manuel Not' || note.wordTerm === 'MANUEL NOT') && (
                    <div className="d-flex flex-column align-items-start mt-2 mb-2">
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="text-primary text-decoration-none p-0 fw-semibold d-flex align-items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedManualNotes(prev => prev.includes(note.id) ? prev.filter(id => id !== note.id) : [...prev, note.id]);
                        }}
                      >
                        {expandedManualNotes.includes(note.id) ? <><i className="bi bi-chevron-up"></i> Daha Az Gör</> : <><i className="bi bi-chevron-down"></i> Devamını Gör</>}
                      </Button>
                    </div>
                  )}
                </div>
            )}

            {/* Pill Buttons (Tags) visible in both Edit and View modes */}
            {(!note.wordId || note.wordTerm === 'Manuel Not' || note.wordTerm === 'MANUEL NOT') && (
              <div className="d-flex flex-column align-items-start mt-2 mb-2 px-1">
                {(() => {
                  const wordsToDisplay = isEditing ? inlineEditingSelectedWords : note.selectedWords;
                  if (!wordsToDisplay || wordsToDisplay.length === 0) return null;

                  return (
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {wordsToDisplay.map((w, i) => {
                        const status = getWordStatus(w);
                        let btnClass = 'btn-outline-danger';
                        if (status === 'exact' || status === 'root') btnClass = 'btn-outline-success';

                        return (
                          <button 
                            type="button"
                            key={i} 
                            className={`btn btn-sm rounded-pill px-3 py-1 fw-medium ${btnClass} d-flex align-items-center`} 
                            style={{ 
                              cursor: status !== 'none' ? 'pointer' : 'default',
                              textTransform: 'uppercase',
                              fontSize: '0.75rem',
                              letterSpacing: '0.5px'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (status !== 'none' && !isEditing) handleWordClickInternal(w);
                            }}
                          >
                            <i className="bi bi-tag-fill me-1 opacity-75"></i>{w}
                            {isEditing && (
                              <i 
                                className="bi bi-x-circle-fill ms-2 cursor-pointer hover-opacity-100" 
                                style={{ fontSize: '0.8rem' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newSelected = inlineEditingSelectedWords.filter(sw => sw !== w);
                                  setInlineEditingSelectedWords(newSelected);
                                  setInlineEditingText(prev => {
                                    const escapedWord = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                    const regex = new RegExp(`<mark[^>]*>(${escapedWord})</mark>`, 'gi');
                                    return prev.replace(regex, '$1');
                                  });
                                }}
                              ></i>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top border-opacity-10" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
              <span className="sticky-note-list-date d-flex align-items-center gap-1 text-muted" style={{ fontSize: '0.75rem' }}>
                <i className="bi bi-calendar3"></i>
                {isValidDate ? noteDate.toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
              <div className="d-flex gap-2 align-items-center">
                {isEditing && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary px-3 rounded-pill shadow-sm d-flex align-items-center gap-1"
                      onClick={(e) => {
                        e.preventDefault();
                        saveCurrentNote();
                        setEditingNoteId(null);
                      }}
                    >
                      <i className="bi bi-check-lg"></i>
                      <span>Kaydet</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary px-3 rounded-pill d-flex align-items-center gap-1"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        // Optimized Text Scan
                        const plainText = inlineEditingText.replace(/<[^>]*>/g, ' ');
                        const doc = nlp(plainText);
                        const textWords = doc.terms().json().map(t => t.text.toLowerCase().replace(/[.,!?;:]/g, ''));
                        
                        const foundWords = [...new Set(textWords)].filter(tw => tw && tw.length > 2 && getWordStatus(tw) !== 'none');
                        
                        if (foundWords.length > 0) {
                          const newWords = [...new Set([...inlineEditingSelectedWords, ...foundWords])];
                          setInlineEditingSelectedWords(newWords);
                          setInlineEditingText(prev => highlightWordsInHtml(prev, newWords));
                        }
                      }}
                    >
                      <i className="bi bi-search"></i> <span>Tara</span>
                    </button>
                  </>
                )}
                {!note.wordId && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary px-3 rounded-pill d-flex align-items-center gap-1"
                    onClick={(e) => { 
                      e.preventDefault(); 
                      saveCurrentNote();
                      handleToggleNoteCompletion(note.id, note.isCompleted); 
                      setEditingNoteId(null);
                    }}
                  >
                    <i className={`bi ${note.isCompleted ? 'bi-arrow-counterclockwise' : 'bi-check2-circle'}`}></i>
                    <span>{note.isCompleted ? 'Geri Al' : 'Tamamlandı'}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger px-3 rounded-pill d-flex align-items-center gap-1"
                  onClick={(e) => { e.preventDefault(); handleDeleteNote(note.id); }}
                >
                  <i className="bi bi-trash3"></i>
                  <span>Sil</span>
                </button>
              </div>
            </div>
          </div>
        </div>
    );
});

const StickyNotesPage = ({ navigateTo, onWordClick }) => {
  const { user } = useAuth();
  const { words, stickyNotes } = useSozluk();

  const [manualNoteText, setManualNoteText] = useState('');
  const [manualNoteTitle, setManualNoteTitle] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [inlineEditingText, setInlineEditingText] = useState('');
  const [inlineEditingTitle, setInlineEditingTitle] = useState('');
  const [inlineEditingSelectedWords, setInlineEditingSelectedWords] = useState([]);
  const [localSelectedWord, setLocalSelectedWord] = useState(null);

  const handleToggleStar = async (e, word) => {
    if (e) e.stopPropagation();
    try {
      await updateDoc(doc(db, `users/${user.uid}/words`, word.id), {
        isStarred: !word.isStarred
      });
    } catch (error) {
      console.error("Yıldız güncellenemedi:", error);
    }
  };

  // Theme based on our new project. We can assume light theme or get it from some Context.
  const theme = 'light'; 

  const handleAddNote = async (wordId, wordTerm, text, title = '') => {
    if (!text || !text.trim() || !user) return;
    try {
      const noteId = `note_${Date.now()}`;
      await setDoc(doc(db, `users/${user.uid}/stickyNotes`, noteId), {
        wordId: wordId || null,
        wordTerm: wordTerm || 'Manuel Not',
        text,
        title: title || '',
        isCompleted: false,
        createdAt: serverTimestamp(),
      });
      setManualNoteTitle('');
      setManualNoteText('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm("Bu notu silmek istediğinize emin misiniz?")) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/stickyNotes`, noteId));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleToggleNoteCompletion = async (noteId, currentStatus) => {
    try {
      await updateDoc(doc(db, `users/${user.uid}/stickyNotes`, noteId), {
        isCompleted: !currentStatus
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateNote = async (noteId, text, title = '', selectedWords = []) => {
    if (!text || !text.trim() || !user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/stickyNotes`, noteId), {
        text,
        title: title || '',
        selectedWords: selectedWords || []
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddWordsToDictionary = async (wordsToAdd) => {
    if (!user || !wordsToAdd || wordsToAdd.length === 0) return;
    try {
      const promises = wordsToAdd.map(w => 
        addDoc(collection(db, `users/${user.uid}/words`), {
          term: w,
          learningStage: 0,
          createdAt: serverTimestamp(),
          listIds: []
        })
      );
      await Promise.all(promises);
    } catch (e) {
      console.error("Error adding words to dictionary:", e);
    }
  };
  const handleWordClickInternal = useCallback((wordText) => {
    if (!onWordClick || !wordText || !words) return;
    const wt = wordText.toLowerCase();
    
    let found = words.find(w => w.term.toLowerCase() === wt);
    if (!found) {
      found = words.find(w => 
        (w.variants && w.variants.some(v => v.toLowerCase() === wt)) ||
        nlp(wt).nouns().toSingular().text().toLowerCase() === w.term.toLowerCase() ||
        nlp(wt).verbs().toInfinitive().text().toLowerCase() === w.term.toLowerCase()
      );
    }
    
    if (found) {
      setLocalSelectedWord(found);
    }
  }, [onWordClick, words]);

  // ULTRA OPTIMIZATION: Pre-calculate a map of all words, variants and their roots
  // This avoids calling NLP inside loops/renders
  const wordStatusMap = useMemo(() => {
    if (!words) return new Map();
    const map = new Map(); // term -> 'exact' | 'root'
    
    words.forEach(w => {
        const termLower = w.term.toLowerCase();
        map.set(termLower, 'exact');
        
        // Add variants
        if (w.variants) {
            w.variants.forEach(v => {
                const vLower = v.toLowerCase();
                if (!map.has(vLower)) map.set(vLower, 'root');
            });
        }
        
        // Add root forms if possible (basic ones)
        if (w.rootWord) {
            const rLower = w.rootWord.toLowerCase();
            if (!map.has(rLower)) map.set(rLower, 'root');
        }
    });
    return map;
  }, [words]);

  // Fast lookup function using the map
  const getWordStatus = useCallback((wordText) => {
    if (!wordText) return 'none';
    const wt = wordText.toLowerCase();
    
    const status = wordStatusMap.get(wt);
    if (status) return status;
    
    // Fallback for plural/verb forms only if not in map
    // We limit this to very short logic to stay fast
    const singular = nlp(wt).nouns().toSingular().text().toLowerCase();
    if (wordStatusMap.get(singular) === 'exact') return 'root';
    
    const infinitive = nlp(wt).verbs().toInfinitive().text().toLowerCase();
    if (wordStatusMap.get(infinitive) === 'exact') return 'root';

    return 'none';
  }, [wordStatusMap]);

  const [justUpdatedNoteId, setJustUpdatedNoteId] = useState(null);
  const [wordSearchTerm, setWordSearchTerm] = useState('');
  const [expandedManualNotes, setExpandedManualNotes] = useState([]);
  const [expandedDates, setExpandedDates] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved'
  const [visibleCount, setVisibleCount] = useState(5);
  const [expandedLinkedGroups, setExpandedLinkedGroups] = useState([]);
  const [showTitleDropdown, setShowTitleDropdown] = useState(null); // null, 'new', or note.id
  const [titleSearchTerm, setTitleSearchTerm] = useState('');
  const [showMobileTitles, setShowMobileTitles] = useState(false);

  const uniqueTitles = useMemo(() => {
    const titleToLatestDate = {};
    stickyNotes.forEach(n => {
      const t = n.title;
      if (t && t.trim() !== '') {
        const date = parseDate(n.createdAt);
        const time = date ? date.getTime() : 0;
        if (!titleToLatestDate[t] || titleToLatestDate[t] < time) {
          titleToLatestDate[t] = time;
        }
      }
    });
    const titles = Object.keys(titleToLatestDate);
    titles.sort((a, b) => titleToLatestDate[b] - titleToLatestDate[a]);
    return titles;
  }, [stickyNotes]);

  const filteredTitles = useMemo(() => {
    if (!titleSearchTerm) return uniqueTitles;
    return uniqueTitles.filter(t => t.toLowerCase().includes(titleSearchTerm.toLowerCase()));
  }, [uniqueTitles, titleSearchTerm]);

  const toggleLinkedGroup = (dateLabel) => {
    setExpandedLinkedGroups(prev =>
      prev.includes(dateLabel)
        ? prev.filter(d => d !== dateLabel)
        : [...prev, dateLabel]
    );
  };

  const handleToggleExpand = (dateLabel) => {
    setExpandedDates(prev =>
      prev.includes(dateLabel)
        ? prev.filter(d => d !== dateLabel)
        : [...prev, dateLabel]
    );
  };

  const autoSaveTimerRef = useRef(null);
  const observerTarget = useRef(null);
  const hasFocusedTextarea = useRef(false);

  // Reset focus tracker when edit mode changes
  useEffect(() => {
    if (!editingNoteId) {
      hasFocusedTextarea.current = false;
    }
  }, [editingNoteId]);

  const filteredNotes = useMemo(() => {
    let result = stickyNotes;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = stickyNotes.filter(n =>
        (n.title && n.title.toLowerCase().includes(query)) ||
        (n.text && n.text.toLowerCase().includes(query)) ||
        (n.wordTerm && n.wordTerm.toLowerCase().includes(query))
      );
    }
    return [...result].sort((a, b) => {
      const aDate = parseDate(a.createdAt);
      const bDate = parseDate(b.createdAt);
      const aVal = aDate ? aDate.getTime() : 0;
      const bVal = bDate ? bDate.getTime() : 0;
      return bVal - aVal;
    });
  }, [stickyNotes, searchQuery]);

  const groupNotesArray = (notesArray) => {
    const groups = {};
    const sortedNotes = [...notesArray].sort((a, b) => {
      const aDate = parseDate(a.createdAt);
      const bDate = parseDate(b.createdAt);
      const aVal = aDate ? aDate.getTime() : 0;
      const bVal = bDate ? bDate.getTime() : 0;
      return bVal - aVal;
    });

    sortedNotes.forEach(note => {
      const dateObj = parseDate(note.createdAt) || new Date();
      const opts = { day: 'numeric', month: 'long', year: 'numeric' };
      const dateStr = dateObj.toLocaleDateString('tr-TR', opts);

      const today = new Date().toLocaleDateString('tr-TR', opts);
      const yesterdayObj = new Date();
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      const yesterday = yesterdayObj.toLocaleDateString('tr-TR', opts);

      let key = dateStr;
      if (dateStr === today) key = "Bugün";
      else if (dateStr === yesterday) key = "Dün";

      if (!groups[key]) groups[key] = [];
      groups[key].push(note);
    });

    return groups;
  };

  const allGroupedNotes = useMemo(() => groupNotesArray(filteredNotes), [filteredNotes]);
  const groupedNotes = useMemo(() => groupNotesArray(filteredNotes.slice(0, visibleCount)), [filteredNotes, visibleCount]);

  // Reset pagination when searching
  useEffect(() => {
    setVisibleCount(5);
  }, [searchQuery]);

  // Infinite scroll observer
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && visibleCount < filteredNotes.length) {
          setVisibleCount(prev => prev + 5);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [visibleCount, filteredNotes.length]);

  const saveCurrentNote = useCallback(() => {
    if (editingNoteId && inlineEditingText && inlineEditingText.trim()) {
      handleUpdateNote(editingNoteId, inlineEditingText, inlineEditingTitle, inlineEditingSelectedWords);
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      setSaveStatus('saved');
    }
  }, [editingNoteId, inlineEditingText, inlineEditingTitle, inlineEditingSelectedWords, handleUpdateNote]);

  // Auto-save logic
  useEffect(() => {
    if (!editingNoteId) {
      setSaveStatus('idle');
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Don't save if text is empty
    if (!inlineEditingText || !inlineEditingText.trim()) return;

    // IMPORTANT: Check if content is actually different from the original note 
    // to prevent infinite save loops when App re-renders.
    const currentNote = stickyNotes.find(n => n.id === editingNoteId);
    if (currentNote) {
      const isSameText = currentNote.text === inlineEditingText;
      const isSameTitle = (currentNote.title || '') === (inlineEditingTitle || '');
      const isSameWords = JSON.stringify(currentNote.selectedWords || []) === JSON.stringify(inlineEditingSelectedWords || []);
      
      if (isSameText && isSameTitle && isSameWords) {
        setSaveStatus('idle');
        return;
      }
    }

    // Set status to saving
    setSaveStatus('saving');

    // Set new timer for auto-save
    autoSaveTimerRef.current = setTimeout(() => {
      saveCurrentNote();
      setJustUpdatedNoteId(editingNoteId);
      setTimeout(() => setJustUpdatedNoteId(null), 2000);
    }, 1000); // 1 second debounce

    return () => {
      // We don't clear the timeout here if we want it to finish, 
      // but usually we should save immediately on close.
    };
  }, [inlineEditingText, inlineEditingTitle, inlineEditingSelectedWords, editingNoteId, saveCurrentNote]);

  const renderHighlightedText = (text, query) => {
    if (!query || !text) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} style={{ backgroundColor: '#f59e0b', color: 'white', borderRadius: '3px', padding: '0 2px' }}>{part}</mark>
        : part
    );
  };

  const getWordStatusOld = useCallback((wordText) => {
    if (!wordText || !words) return 'none';
    const wt = wordText.toLowerCase();
    
    // 1. Check exact match
    const isExact = words.some(w => w.term.toLowerCase() === wt);
    if (isExact) return 'exact';
    
    // 2. Check root/variant match
    const isRootMatch = words.some(w => 
      (w.variants && w.variants.some(v => v.toLowerCase() === wt)) ||
      nlp(wt).nouns().toSingular().text().toLowerCase() === w.term.toLowerCase() ||
      nlp(wt).verbs().toInfinitive().text().toLowerCase() === w.term.toLowerCase()
    );
    if (isRootMatch) return 'root';
    
    return 'none';
  }, [words]);

  const highlightWordsInHtml = useCallback((html, selectedWords) => {
    if (!selectedWords || selectedWords.length === 0 || !html) return html;
    
    let sanitized = DOMPurify.sanitize(html);
    // Optimization: Use a single regex for all words instead of multiple passes
    const escapedWords = selectedWords
        .filter(w => w && w.length > 1)
        .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .sort((a, b) => b.length - a.length); // Longest first to avoid partial matches
    
    if (escapedWords.length === 0) return sanitized;

    const regex = new RegExp(`(?<!<[^>]*)\\b(${escapedWords.join('|')})\\b(?![^<]*>)`, 'gi');
    
    return sanitized.replace(regex, (match) => {
      const status = getWordStatus(match);
      let color = '#711919'; // Default Red
      if (status === 'exact') color = '#0d6efd'; // Blue
      else if (status === 'root') color = '#e83e8c'; // Pink
      
      return `<mark style="background-color: ${color}; color: white; padding: 0 2px; border-radius: 2px;">${match}</mark>`;
    });
  }, [getWordStatus]);

  const scrollToNote = (id) => {
    const performScroll = (noteId) => {
      const element = document.getElementById(`note-${noteId}`);
      if (element) {
        const offset = 100; // Account for sticky header
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Briefly highlight the jumped note
        element.classList.add('jump-highlight');
        setTimeout(() => element.classList.remove('jump-highlight'), 2000);
      }
    };

    const existingElement = document.getElementById(`note-${id}`);
    if (existingElement) {
      performScroll(id);
    } else {
      // Find the index of the note and increase visibleCount if needed
      const noteIndex = filteredNotes.findIndex(n => n.id === id);
      if (noteIndex !== -1) {
        setVisibleCount(Math.max(visibleCount, noteIndex + 1));
        // Wait for React to render the newly visible items
        setTimeout(() => performScroll(id), 100);
      }
    }
  };

  return (
    <div className="premium-notes-wrapper animate-fade-in py-2">

        {/* Mobile Sidebar Toggle Button */}
        <div className="d-md-none">
          <button 
            className="mobile-nav-toggle-btn"
            onClick={() => setShowMobileTitles(true)}
            title="Not Başlıklarını Aç"
            style={{ top: '150px' }}
          >
            <i className="bi bi-list-ul"></i>
          </button>
        </div>

        <Row className="g-4 position-relative">
          {/* Sol Kolon: Başlık Listesi Sidebar - Desktop'ta solda */}
          <Col md={5} lg={4} className="order-2 order-md-1 d-none d-md-block align-self-start" style={{ position: 'sticky', top: '20px', zIndex: 10 }}>
            <Card className="border-0 premium-notes-card">
              <Card.Header className="bg-transparent border-0 pt-4 pb-2 px-4">
                <h5 className="fw-bold m-0 d-flex align-items-center gap-2 text-primary" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  <i className="bi bi-list-ul"></i> Not Başlıkları
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                {Object.keys(allGroupedNotes).length === 0 ? (
                  <div className="text-muted text-center p-4">Not bulunamadı.</div>
                ) : (
                  <div className="d-flex flex-column gap-3 p-4 pt-1" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', overflowX: 'hidden' }}>
                    {Object.entries(allGroupedNotes).map(([dateLabel, items], idx) => (
                      <div key={idx}>
                        <div className="small fw-bold text-muted mb-2 ps-2" style={{ letterSpacing: '0.5px' }}>{dateLabel}</div>
                        <div className="d-flex flex-column gap-2">
                          {(() => {
                            const linkedItems = items.filter(n => n.wordTerm && n.wordTerm !== 'Manuel Not' && n.wordTerm !== 'MANUEL NOT');
                            const manualItems = items.filter(n => !n.wordTerm || n.wordTerm === 'Manuel Not' || n.wordTerm === 'MANUEL NOT');
                            const isLinkedExpanded = expandedLinkedGroups.includes(dateLabel);

                            return (
                              <>
                                {linkedItems.length > 0 && (
                                  <Button 
                                    variant="light" 
                                    size="sm" 
                                    className="w-100 rounded-3 mb-2 py-2 d-flex align-items-center justify-content-between px-3 text-primary border"
                                    onClick={() => toggleLinkedGroup(dateLabel)}
                                  >
                                    <span className="fw-bold small"><i className="bi bi-link-45deg me-1"></i> {linkedItems.length} ilişkili not</span>
                                    <i className={`bi ${isLinkedExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} small`}></i>
                                  </Button>
                                )}
                                
                                {isLinkedExpanded && linkedItems.map((note, i) => (
                                  <div
                                    key={note.id}
                                    className="bg-white p-2 px-3 rounded-pill shadow-sm d-flex align-items-center gap-2 mb-2 transition-all"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => scrollToNote(note.id)}
                                  >
                                    <div className="fw-medium small flex-grow-1 text-truncate text-body-secondary">
                                      {i + 1}. <span className="text-dark">{note.wordTerm}</span>
                                    </div>
                                    {note.title && (
                                      <div className="small text-primary text-truncate ms-2" style={{ maxWidth: '40%' }}>
                                        {note.title}
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {manualItems.slice(0, expandedDates.includes(dateLabel) ? manualItems.length : 4).map((note, i) => (
                                  <div
                                    key={note.id}
                                    className="bg-white p-2 px-3 rounded-pill shadow-sm d-flex align-items-center gap-2 mb-2 transition-all"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => scrollToNote(note.id)}
                                  >
                                    <div className={`fw-medium small flex-grow-1 text-truncate ${note.isCompleted ? 'text-success opacity-75' : 'text-body'}`}>
                                      {i + 1}. {note.title || (note.text ? note.text.replace(/<[^>]*>/g, '').substring(0, 30) + '...' : 'Başlıksız Not')}
                                    </div>
                                    {note.isCompleted && <i className="bi bi-check-circle-fill text-success opacity-50 ms-2"></i>}
                                  </div>
                                ))}
                                
                                {manualItems.length > 4 && (
                                  <div className="text-center mt-1">
                                    <span
                                      className="text-primary small fw-medium"
                                      style={{ cursor: 'pointer' }}
                                      onClick={() => handleToggleExpand(dateLabel)}
                                    >
                                      {expandedDates.includes(dateLabel) ? (
                                        <><i className="bi bi-chevron-up"></i> Daha az göster</>
                                      ) : (
                                        <>({manualItems.length - 4} adet not daha) <i className="bi bi-chevron-down"></i></>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

        {/* Sağ Kolon: Form ve Liste */}
        <Col xs={12} md={7} lg={8} className="order-1 order-md-2">
          {/* Yeni Not Ekleme Alanı */}
          <Card className="border-0 shadow-sm rounded-4 mb-4">
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-3 text-primary d-flex align-items-center gap-2">
                <i className="bi bi-pencil-square"></i> Hızlı Not Ekle
              </h6>
              <div className="d-flex flex-column gap-3">
                <div className="position-relative w-100">
                  <Dropdown 
                    show={showTitleDropdown === 'new'} 
                    onToggle={(isOpen, meta) => {
                      if (meta && meta.source === 'rootClose') {
                        setShowTitleDropdown(null);
                      }
                    }}
                    className="w-100"
                  >
                    <div className="position-relative">
                      <Form.Control
                        type="text"
                        placeholder="Not Başlığı (İsteğe bağlı)..."
                        value={manualNoteTitle}
                        onChange={(e) => setManualNoteTitle(e.target.value)}
                        onClick={() => setShowTitleDropdown('new')}
                        className="form-control bg-light rounded-3 px-3 py-2 fw-medium text-dark border-0 shadow-none mb-3"
                      />
                      {manualNoteTitle && (
                        <Button 
                          variant="link" 
                          className="position-absolute top-50 end-0 translate-middle-y border-0 shadow-none text-muted p-2 text-decoration-none d-flex align-items-center justify-content-center"
                          onClick={() => { setManualNoteTitle(''); setShowTitleDropdown('new'); }}
                        >
                          <i className="bi bi-x-circle-fill opacity-50 hover-opacity-100"></i>
                        </Button>
                      )}
                    </div>
                    <Dropdown.Menu className="w-100 p-2 shadow-lg border-0 mt-1 rounded-3" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      <div className="px-1 pb-2 mb-2 border-bottom border-opacity-10">
                        <Form.Control
                          type="text"
                          size="sm"
                          placeholder="Kayıtlı başlıklarda ara..."
                          value={titleSearchTerm}
                          onChange={(e) => setTitleSearchTerm(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      {filteredTitles.length === 0 ? (
                        <div className="text-muted small text-center p-2 fst-italic">Kayıtlı başlık bulunamadı.</div>
                      ) : (
                        filteredTitles.map((t, i) => (
                          <Dropdown.Item 
                            key={i} 
                            className="small rounded-2 py-2 text-truncate"
                            onClick={() => {
                              setManualNoteTitle(t);
                              setShowTitleDropdown(null);
                            }}
                          >
                            {t}
                          </Dropdown.Item>
                        ))
                      )}
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
                
                <div className="w-100">
                  <RichTextEditor
                    placeholder="Kelime bağlamı olmadan genel bir not ekleyin..."
                    value={manualNoteText}
                    onChange={setManualNoteText}
                  />
                  <div className="d-flex justify-content-end mt-3">
                    <Button
                      variant="primary"
                      className="rounded-pill px-4 py-2 fw-medium shadow-sm d-flex align-items-center justify-content-center gap-2"
                      onClick={() => handleAddNote(null, null, manualNoteText, manualNoteTitle)}
                      disabled={!manualNoteText || !manualNoteText.trim() || manualNoteText === '<br>'}
                    >
                      <i className="bi bi-plus-lg"></i> Not Ekle
                    </Button>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Not Listesi */}
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body className="p-0">
              <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between p-4 border-bottom border-opacity-10 gap-3">
                <h6 className="fw-bold m-0 text-primary d-flex align-items-center gap-2">
                  <i className="bi bi-card-text"></i> Kaydedilen Notlar
                </h6>
                
                <div className="d-flex align-items-center gap-3">
                  <div className="position-relative">
                    <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                    <Form.Control
                      type="text"
                      placeholder="Notlarda ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="form-control bg-light border-0 shadow-none ps-5 pe-4 py-2 rounded-pill small border"
                      style={{ width: '250px', fontSize: '0.9rem', borderColor: 'var(--bs-border-color)' }}
                    />
                  </div>
                  <span className="badge bg-warning bg-opacity-10 text-warning rounded-pill px-3 py-2 fw-bold border border-warning border-opacity-25" style={{ fontSize: '0.8rem' }}>
                    {filteredNotes.length} Not
                  </span>
                </div>
              </div>

              <div className="p-4">
                {filteredNotes.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <i className="bi bi-pin-angle fs-1 opacity-25 mb-3 d-block"></i>
                    {searchQuery ? 'Arama sonucu bulunamadı.' : 'Henüz hiç sticky note eklemediniz.'}<br />
                    {!searchQuery && 'Kelimeleri seçerek detayından not ekleyebilirsiniz.'}
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-5">
                    {Object.entries(groupedNotes).map(([dateLabel, items], groupIdx) => (
                      <div key={groupIdx} className="sticky-notes-date-group">
                        <div className="small fw-bold text-muted mb-3 ps-2 d-flex align-items-center gap-2" style={{ letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                          <i className="bi bi-calendar-event opacity-50"></i> {dateLabel}
                        </div>
                        <div className="d-flex flex-column gap-3">
                          {items.map((note) => (
                              <NoteItem
                                key={note.id}
                                note={note}
                                editingNoteId={editingNoteId}
                                setEditingNoteId={setEditingNoteId}
                                setInlineEditingText={setInlineEditingText}
                                setInlineEditingTitle={setInlineEditingTitle}
                                setInlineEditingSelectedWords={setInlineEditingSelectedWords}
                                expandedManualNotes={expandedManualNotes}
                                setExpandedManualNotes={setExpandedManualNotes}
                                searchQuery={searchQuery}
                                renderHighlightedText={renderHighlightedText}
                                highlightWordsInHtml={highlightWordsInHtml}
                                getWordStatus={getWordStatus}
                                handleWordClickInternal={handleWordClickInternal}
                                handleToggleNoteCompletion={handleToggleNoteCompletion}
                                handleDeleteNote={handleDeleteNote}
                                saveCurrentNote={saveCurrentNote}
                                justUpdatedNoteId={justUpdatedNoteId}
                                theme={theme}
                                words={words}
                                wordSearchTerm={wordSearchTerm}
                                setWordSearchTerm={setWordSearchTerm}
                                inlineEditingText={inlineEditingText}
                                inlineEditingTitle={inlineEditingTitle}
                                inlineEditingSelectedWords={inlineEditingSelectedWords}
                                showTitleDropdown={showTitleDropdown}
                                setShowTitleDropdown={setShowTitleDropdown}
                                titleSearchTerm={titleSearchTerm}
                                setTitleSearchTerm={setTitleSearchTerm}
                                filteredTitles={filteredTitles}
                                handleAddWordsToDictionary={handleAddWordsToDictionary}
                              />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Intersection observer target */}
                {filteredNotes.length > visibleCount && (
                  <div ref={observerTarget} className="text-center py-4">
                    <Spinner animation="border" size="sm" variant="primary" className="opacity-50" />
                    <span className="ms-2 text-muted small">Daha eski notlar yükleniyor...</span>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      {/* MOBILE TITLES SIDEBAR (Offcanvas) */}
      <Offcanvas 
        show={showMobileTitles} 
        onHide={() => setShowMobileTitles(false)} 
        placement="start"
        className="bg-body-tertiary border-end border-opacity-10"
        style={{ width: '280px' }}
      >
        <Offcanvas.Header closeButton className="border-bottom border-opacity-10 pb-3">
          <Offcanvas.Header closeButton className="d-none"></Offcanvas.Header> {/* Fix for multiple close buttons if any */}
          <Offcanvas.Title className="d-flex align-items-center gap-2">
            <i className="bi bi-list-ul text-primary fs-4"></i>
            <span className="fw-bold">Not Başlıkları</span>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0">
          <div className="p-4 pt-3">
            {Object.keys(allGroupedNotes).length === 0 ? (
              <div className="text-muted text-center p-4">Not bulunamadı.</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {Object.entries(allGroupedNotes).map(([dateLabel, items], idx) => (
                  <div key={idx}>
                    <div className="small fw-bold text-muted mb-2 ps-2" style={{ letterSpacing: '0.5px' }}>{dateLabel}</div>
                    <div className="d-flex flex-column gap-2">
                      {(() => {
                        const linkedItems = items.filter(n => n.wordTerm && n.wordTerm !== 'Manuel Not' && n.wordTerm !== 'MANUEL NOT');
                        const manualItems = items.filter(n => !n.wordTerm || n.wordTerm === 'Manuel Not' || n.wordTerm === 'MANUEL NOT');
                        const isLinkedExpanded = expandedLinkedGroups.includes(dateLabel);

                        return (
                          <>
                            {linkedItems.length > 0 && (
                              <Button 
                                variant="primary" 
                                size="sm" 
                                className="w-100 rounded-4 mb-2 py-2 d-flex align-items-center justify-content-between px-3 shadow-sm border-0"
                                onClick={() => toggleLinkedGroup(dateLabel)}
                                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                              >
                                <span className="fw-bold small"><i className="bi bi-link-45deg me-1"></i> {linkedItems.length}</span>
                                <i className={`bi ${isLinkedExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} small`}></i>
                              </Button>
                            )}
                            
                            {isLinkedExpanded && linkedItems.map((note, i) => (
                              <div
                                key={`mob-link-${note.id}`}
                                className="bg-body shadow-sm p-3 rounded-4 d-flex align-items-center gap-3 interactive-card mb-1 border-start border-4 border-primary"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  scrollToNote(note.id);
                                  setShowMobileTitles(false);
                                }}
                              >
                                <div className="fw-bold fs-6 flex-grow-1 text-truncate">
                                  {note.wordTerm}
                                </div>
                              </div>
                            ))}

                            {manualItems.slice(0, expandedDates.includes(dateLabel) ? manualItems.length : 4).map((note, i) => (
                              <div
                                key={`mob-man-${note.id}`}
                                className="bg-body shadow-sm p-3 rounded-4 d-flex align-items-center gap-3 interactive-card mb-1"
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  scrollToNote(note.id);
                                  setShowMobileTitles(false);
                                }}
                              >
                                <div className={`fw-bold fs-6 flex-grow-1 text-truncate ${note.isCompleted ? 'text-success opacity-75' : ''}`}
                                     style={!note.isCompleted ? { color: '#f59e0b' } : {}}>
                                  {note.title || (note.text ? note.text.substring(0, 30) + '...' : 'Başlıksız Not')}
                                </div>
                              </div>
                            ))}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {localSelectedWord && (
        <WordDetailModal
          show={!!localSelectedWord}
          onHide={() => setLocalSelectedWord(null)}
          word={localSelectedWord}
          stickyNotes={stickyNotes}
          onDelete={() => {}} 
          onUpdate={() => {}} 
          onToggleStar={(w) => handleToggleStar(null, w)}
          allWords={words}
          onNext={() => {}}
          onPrev={() => {}}
          customLists={[]}
          onAddWordsToList={() => {}}
          onRemoveWordFromList={() => {}}
          onSpeak={playAudio}
        />
      )}
    </div>
  );
};

export default StickyNotesPage;
