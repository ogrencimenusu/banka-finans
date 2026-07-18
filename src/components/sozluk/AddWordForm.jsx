import React, { useState, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Save, ArrowLeft, Wand2, Check, Clock, ChevronDown, ChevronUp, Clipboard, FolderPlus } from 'lucide-react';
import { useSozluk } from './context/SozlukContext';
import { Dropdown } from 'react-bootstrap';

const splitByCommaOutsideParentheses = (str) => {
  const result = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth = Math.max(0, depth - 1);
      current += char;
    } else if (char === ',' && depth === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    result.push(current.trim());
  }
  return result;
};

const parseTemplate = (text) => {
  const data = {
    term: '',
    language: 'English',
    specialNote: '',
    pronunciation: '',
    shortMeanings: '',
    generalDefinition: '',
    cefrLevel: '',
    meanings: [],
    synonyms: [],
    antonyms: [],
    collocations: [],
    idioms: [],
    wordFamily: [],
    tips: [],
    grammar: [],
    variants: [],
    templateName: '',
    raw: text
  };

  const wordMatch = text.match(/WORD:\s*([^\n\r]+)/i);
  if (wordMatch) {
    data.term = wordMatch[1].trim();
  }

  const sections = {};
  const sectionRegex = /\[SECTION:\s*([^\]]+)\]([\s\S]*?)\[SECTION_END\]/g;
  let match;
  while ((match = sectionRegex.exec(text)) !== null) {
    const sectionName = match[1].trim().toUpperCase();
    const sectionContent = match[2];
    sections[sectionName] = sectionContent;
  }

  const parseKV = (str) => {
    const res = {};
    if (!str) return res;
    const kvRegex = /^([^:\n]+):\s*(.*)$/gm;
    let m;
    while ((m = kvRegex.exec(str)) !== null) {
      res[m[1].trim().toUpperCase()] = m[2].trim();
    }
    return res;
  };

  if (sections['DIL_BILGISI']) {
    const dbData = parseKV(sections['DIL_BILGISI']);
    data.rootWord = dbData['BASE_FORM'] || '';
    data.language = dbData['LANGUAGE'] || 'English';
    data.specialNote = dbData['SPECIAL_NOTE'] || '';
    data.cefrLevel = dbData['LEVEL'] || dbData['CEFR'] || '';
    
    const pronIpa = dbData['PRON_IPA'] || '';
    const pronTr = dbData['PRON_TR'] || '';
    if (pronIpa && pronTr) {
      data.pronunciation = `${pronIpa} (${pronTr})`;
    } else {
      data.pronunciation = pronIpa || pronTr || '';
    }

    if (dbData['WORD_TYPE']) data.grammar.push(`Türü: ${dbData['WORD_TYPE']}`);
    if (dbData['ZELEME_DURUMU']) data.grammar.push(`Zaman/Çekim: ${dbData['ZELEME_DURUMU']}`);
    if (dbData['TONE']) data.grammar.push(`Ton: ${dbData['TONE']}`);
    if (dbData['CONJUGATION'] && dbData['CONJUGATION'] !== 'N/A') {
      data.grammar.push(`Çekimler: ${dbData['CONJUGATION']}`);
    }
  }

  const anlamlarItems = [];
  if (sections['ANLAMLAR']) {
    const itemRegex = /^ITEM:\s*(.*)$/gm;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(sections['ANLAMLAR'])) !== null) {
      anlamlarItems.push(itemMatch[1].trim());
    }
    data.shortMeanings = anlamlarItems.join(', ');
  }

  const examplesList = [];
  if (sections['ORNEKLER']) {
    const lines = sections['ORNEKLER'].split('\n').map(l => l.trim()).filter(l => l);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isTarget = line.toUpperCase().startsWith('ITEM_TARGET:');
      const isEn = line.toUpperCase().startsWith('ITEM_EN:');
      if (isTarget || isEn) {
        const startIdx = isTarget ? 12 : 8;
        const enText = line.substring(startIdx).trim();
        let trText = '';
        if (i + 1 < lines.length && lines[i + 1].toUpperCase().startsWith('ITEM_TR:')) {
          trText = lines[i + 1].substring(8).trim();
          i++;
        }
        examplesList.push({ enText, trText });
      }
    }
  }

  data.meanings = anlamlarItems.map((def, idx) => ({
    definition: def,
    context: `Anlam ${idx + 1}`,
    examples: idx === 0 ? examplesList.map(ex => ({ en: ex.enText, tr: ex.trText })) : []
  }));

  if (sections['ES_ANLAMLAR']) {
    const esItems = [];
    const esMatchRegex = /^ITEM:\s*(.*)$/gm;
    let esMatch;
    while ((esMatch = esMatchRegex.exec(sections['ES_ANLAMLAR'])) !== null) {
      esItems.push(esMatch[1].trim());
    }
    data.synonyms = esItems.map(item => {
      const parts = item.split('|').map(p => p.trim());
      return { en: parts[0], tr: parts[1] || '' };
    });
  }

  if (sections['ZIT_ANLAMLAR']) {
    const zitItems = [];
    const zitMatchRegex = /^ITEM:\s*(.*)$/gm;
    let zitMatch;
    while ((zitMatch = zitMatchRegex.exec(sections['ZIT_ANLAMLAR'])) !== null) {
      zitItems.push(zitMatch[1].trim());
    }
    data.antonyms = zitItems.map(item => {
      const parts = item.split('|').map(p => p.trim());
      return { en: parts[0], tr: parts[1] || '' };
    });
  }

  if (sections['KALIPLAR']) {
    const kalipItems = [];
    const kalipMatchRegex = /^ITEM:\s*(.*)$/gm;
    let kalipMatch;
    while ((kalipMatch = kalipMatchRegex.exec(sections['KALIPLAR'])) !== null) {
      kalipItems.push(kalipMatch[1].trim());
    }
    data.collocations = kalipItems.map(item => {
      const parts = item.split('|').map(p => p.trim());
      return { en: parts[0], tr: parts[1] || '' };
    });
  }

  if (sections['KARISTIRMA']) {
    const karistirmaKV = parseKV(sections['KARISTIRMA']);
    if (karistirmaKV['CONFUSABLE'] && karistirmaKV['CONFUSABLE'] !== 'N/A') {
      data.tips.push(`Karıştırılabilir: ${karistirmaKV['CONFUSABLE']}`);
      if (karistirmaKV['NOTE'] && karistirmaKV['NOTE'] !== 'N/A') {
        data.tips.push(`Açıklama: ${karistirmaKV['NOTE']}`);
      }
    }
  }

  if (sections['IPCUCU']) {
    const ipcucu = sections['IPCUCU'].trim();
    if (ipcucu) {
      data.tips.push(`İpucu: ${ipcucu}`);
    }
  }

  if (sections['TABLO']) {
    const tablo = sections['TABLO'].trim();
    if (tablo) {
      const parts = tablo.split('|').map(p => p.trim());
      if (parts.length >= 5) {
        const otherForms = splitByCommaOutsideParentheses(parts[4]);
        data.wordFamily = otherForms;
      }
    }
  }

  if (!data.term) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const cleanFirstLine = lines[0]?.replace(/^[\*\-•]\s*/, '').trim();
    data.term = cleanFirstLine?.substring(0, 30) || 'Bilinmeyen Kelime';
  }

  return data;
};

const AddWordForm = ({ onSave }) => {
  const { user } = useAuth();
  const { words, customLists } = useSozluk();
  const [templateText, setTemplateText] = useState('');
  const [loading, setLoading] = useState(false);
  const [learningStatus, setLearningStatus] = useState('Yeni');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [expandedDates, setExpandedDates] = useState([]);

  const parsedWords = useMemo(() => {
    if (!templateText.trim()) return [];
    const lines = templateText.split('\n');
    const blocks = [];
    let currentBlock = [];
    for (const line of lines) {
      const cleanLine = line.replace(/^[\*\-•]\s*/, '').replace(/\*/g, '').trim().toLowerCase();
      if (cleanLine.startsWith('kelime:') || cleanLine.startsWith('word:')) {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock.join('\n'));
          currentBlock = [];
        }
      }
      currentBlock.push(line);
    }
    if (currentBlock.length > 0) blocks.push(currentBlock.join('\n'));
    return blocks.map(block => parseTemplate(block)).filter(w => w.term && w.term !== 'Bilinmeyen Kelime');
  }, [templateText]);

  const groupedWords = useMemo(() => {
    const groups = {};
    const sortedWords = [...(words || [])].sort((a, b) => {
      const aVal = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0;
      const bVal = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0;
      return bVal - aVal;
    });

    sortedWords.forEach(word => {
      const dateObj = word.createdAt ? (word.createdAt.toDate ? word.createdAt.toDate() : new Date(word.createdAt)) : new Date();
      if (isNaN(dateObj.getTime())) return;
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
      groups[key].push(word);
    });

    return groups;
  }, [words]);

  const handleToggleExpand = (dateLabel) => {
    setExpandedDates(prev => 
      prev.includes(dateLabel) 
        ? prev.filter(d => d !== dateLabel) 
        : [...prev, dateLabel]
    );
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (parsedWords.length === 0) return;
    
    setLoading(true);
    try {
      let createdAtTimestamp = serverTimestamp();
      if (selectedDate) {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        if (!isNaN(dateObj.getTime())) {
          createdAtTimestamp = dateObj;
        }
      }

      const promises = parsedWords.map(parsedData => 
        addDoc(collection(db, `users/${user.uid}/words`), {
          ...parsedData,
          learningStage: learningStatus === 'Yeni' ? 0 : (learningStatus === 'Öğreniyor' ? 1 : 10),
          createdAt: createdAtTimestamp,
          listIds: selectedListIds
        })
      );
      
      const docs = await Promise.all(promises);
      const newWordIds = docs.map(d => d.id);

      if (selectedListIds.length > 0 && newWordIds.length > 0) {
        const listPromises = selectedListIds.map(listId => 
          updateDoc(doc(db, `users/${user.uid}/customLists`, listId), {
            wordIds: arrayUnion(...newWordIds)
          })
        );
        await Promise.all(listPromises);
      }
      
      setTemplateText('');
      if (onSave) onSave();
    } catch (error) {
      console.error("Hata:", error);
      alert("Kelimeler eklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTemplateText(prev => prev ? prev + '\n' + text : text);
    } catch (err) {
      console.error('Panodan okuma başarısız: ', err);
    }
  };

  return (
    <div className="animate-fade-in row g-4 py-2">
      {/* Sol Kolon: Son Eklenenler */}
      <div className="col-12 col-lg-4 order-2 order-lg-1">
        <div className="bg-light rounded-4 p-4 h-100 shadow-sm border-0">
          <h5 className="fw-bold mb-4 d-flex align-items-center gap-2 text-primary">
            <Clock size={20} /> Son Eklenenler
          </h5>
          
          {Object.keys(groupedWords).length === 0 ? (
            <div className="text-muted text-center p-4">Henüz kelime eklenmemiş.</div>
          ) : (
            <div className="d-flex flex-column gap-3 pe-2" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
              {Object.entries(groupedWords).map(([dateLabel, items], idx) => (
                <div key={idx}>
                  <div className="small fw-bold text-muted mb-2 ps-2" style={{ letterSpacing: '0.5px' }}>{dateLabel}</div>
                  <div className="d-flex flex-column gap-2">
                    {items.slice(0, expandedDates.includes(dateLabel) ? items.length : 4).map((w, i) => (
                      <div 
                        key={w.id} 
                        className="bg-white shadow-sm p-3 rounded-4 d-flex align-items-center gap-3" 
                      >
                        <div className="text-primary fw-bold flex-grow-1" style={{ fontSize: '14px' }}>{i + 1}. {w.term}</div>
                        {w.shortMeanings && <span className="badge bg-secondary bg-opacity-10 text-dark rounded-pill text-truncate" style={{ maxWidth: '120px' }}>{w.shortMeanings}</span>}
                      </div>
                    ))}
                    {items.length > 4 && (
                      <div className="text-center mt-2">
                        <span 
                          className="text-primary small fw-medium text-decoration-none" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleToggleExpand(dateLabel)}
                        >
                          {expandedDates.includes(dateLabel) ? (
                            <><ChevronUp size={14} className="me-1" /> Daha az göster</>
                          ) : (
                            <>({items.length - 4} adet kelime daha) <ChevronDown size={14} className="ms-1" /></>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sağ Kolon: Form */}
      <div className="col-12 col-lg-8 order-1 order-lg-2">
        <div className="bg-white rounded-4 p-4 p-md-5 h-100 shadow-sm border-0 d-flex flex-column">
          
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <label className="form-label fw-semibold text-muted mb-2">Öğrenme Durumu</label>
              <select 
                className="form-select bg-light border-0 px-3 py-2 rounded-3 shadow-none w-100"
                value={learningStatus}
                onChange={e => setLearningStatus(e.target.value)}
              >
                <option value="Yeni">Yeni</option>
                <option value="Öğreniyor">Öğreniyor</option>
                <option value="Öğrendi">Öğrendi</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold text-muted mb-2">Eklenme Tarihi</label>
              <input 
                type="date"
                className="form-control bg-light border-0 px-3 py-2 rounded-3 shadow-none w-100"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold text-muted mb-2">Özel Listeler</label>
            <Dropdown className="w-100">
              <Dropdown.Toggle 
                variant="light"
                className="btn border-0 px-3 py-2 rounded-3 w-100 text-start d-flex align-items-center justify-content-between text-muted" 
              >
                <div className="d-flex align-items-center gap-2 text-dark">
                  <FolderPlus size={18} className="text-primary" />
                  <span className="fw-medium">{selectedListIds.length > 0 ? `${selectedListIds.length} Liste Seçili` : 'Listelere Ekle'}</span>
                </div>
              </Dropdown.Toggle>

              <Dropdown.Menu className="w-100 shadow-sm border-0 mt-1 rounded-3">
                {(customLists || []).map(list => {
                  const isSelected = selectedListIds.includes(list.id);
                  return (
                    <Dropdown.Item 
                      key={list.id}
                      className={`py-2 d-flex align-items-center gap-2 ${isSelected ? 'bg-primary bg-opacity-10 text-primary fw-bold' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (isSelected) {
                          setSelectedListIds(prev => prev.filter(id => id !== list.id));
                        } else {
                          setSelectedListIds(prev => [...prev, list.id]);
                        }
                      }}
                    >
                      <FolderPlus size={16} className={isSelected ? 'text-primary' : 'text-muted'} />
                      {list.name}
                      {isSelected && <Check size={16} className="ms-auto" />}
                    </Dropdown.Item>
                  );
                })}
                {(!customLists || customLists.length === 0) && (
                  <Dropdown.Item disabled className="text-muted small">Henüz liste yok</Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown>
          </div>

          <div className="flex-grow-1 mb-4 d-flex flex-column">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label fw-semibold text-muted mb-0">Şablonu Buraya Yapıştırın</label>
              <button 
                className="btn btn-outline-primary btn-sm rounded-pill px-3 shadow-sm fw-medium d-flex align-items-center gap-1 bg-white"
                onClick={handlePaste}
                type="button"
              >
                <Clipboard size={14} /> Yapıştır
              </button>
            </div>
            
            <textarea 
              className="form-control rounded-4 bg-light border-0 p-3 flex-grow-1" 
              placeholder="WORD: ...&#10;[SECTION: DIL_BILGISI]...&#10;&#10;WORD: ...&#10;[SECTION: DIL_BILGISI]..." 
              value={templateText}
              onChange={e => setTemplateText(e.target.value)}
              style={{ fontFamily: 'monospace', fontSize: '13px', resize: 'vertical', minHeight: '200px' }}
              required
            ></textarea>
          </div>

          <div className="d-flex justify-content-end gap-3 pt-2 border-top">
            <button type="button" className="btn btn-light rounded-pill px-4 fw-medium" onClick={onSave}>
              Vazgeç
            </button>
            <button 
              type="button" 
              className="btn btn-primary rounded-pill px-5 fw-bold d-flex align-items-center gap-2"
              onClick={handleSubmit}
              disabled={loading || parsedWords.length === 0}
            >
              {loading ? (
                'Kaydediliyor...'
              ) : (
                <>
                  <Check size={18} /> {parsedWords.length > 0 ? `Kaydet` : 'Kaydet'}
                </>
              )}
            </button>
          </div>
          
          {parsedWords.length > 0 && (
            <div className="mt-4 pt-4 border-top">
              <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-primary">
                <Check size={18} />
                Sistem Çıktısı ({parsedWords.length} kelime)
              </h6>
              <div className="d-flex flex-column gap-3">
                {parsedWords.map((word, idx) => {
                  const isDuplicate = words.some(w => w.term.toLowerCase() === word.term.toLowerCase());
                  return (
                    <div key={idx} className={`rounded-4 p-3 shadow-sm ${isDuplicate ? 'bg-danger bg-opacity-10 border border-danger border-opacity-25' : 'bg-light border-0'}`}>
                      <div className={`fw-bold mb-2 d-flex align-items-center gap-2 ${isDuplicate ? 'text-danger' : 'text-primary'}`}>
                        {word.term}
                        {isDuplicate && <span className="badge bg-danger rounded-pill px-2 py-1" style={{ fontSize: '10px' }}>Tekrar Eden Kelime</span>}
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        <span className={`badge ${word.pronunciation ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>pronunciation {word.pronunciation ? '✓' : '×'}</span>
                        <span className={`badge ${word.shortMeanings ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>shortMeanings {word.shortMeanings ? '✓' : '×'}</span>
                        <span className={`badge ${word.meanings?.length > 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>meanings {word.meanings?.length > 0 ? '✓' : '×'}</span>
                        <span className={`badge ${word.grammar?.length > 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>grammar {word.grammar?.length > 0 ? '✓' : '×'}</span>
                        <span className={`badge ${word.synonyms?.length > 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-light text-muted'}`}>synonyms {word.synonyms?.length > 0 ? '✓' : '-'}</span>
                        <span className={`badge ${word.collocations?.length > 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-light text-muted'}`}>collocations {word.collocations?.length > 0 ? '✓' : '-'}</span>
                        <span className={`badge ${word.wordFamily?.length > 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-light text-muted'}`}>word family {word.wordFamily?.length > 0 ? '✓' : '-'}</span>
                        <span className={`badge ${word.tips?.length > 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-light text-muted'}`}>tips {word.tips?.length > 0 ? '✓' : '-'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AddWordForm;
