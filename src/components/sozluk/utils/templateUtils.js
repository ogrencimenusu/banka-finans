export const parseTemplate = (text) => {
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

  // 1. Extract term from WORD: line
  const wordMatch = text.match(/WORD:\s*([^\n\r]+)/i);
  if (wordMatch) {
    data.term = wordMatch[1].trim();
  }

  // 2. Extract sections
  const sections = {};
  const sectionRegex = /\[SECTION:\s*([^\]]+)\]([\s\S]*?)\[SECTION_END\]/g;
  let match;
  while ((match = sectionRegex.exec(text)) !== null) {
    const sectionName = match[1].trim().toUpperCase();
    const sectionContent = match[2];
    sections[sectionName] = sectionContent;
  }

  // Helper to parse key-value lines
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

  // Helper
  const splitByCommaOutsideParentheses = (text) => {
    if (!text) return [];
    const result = [];
    let current = '';
    let inParen = false;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '(') inParen = true;
      if (text[i] === ')') inParen = false;
      if (text[i] === ',' && !inParen) {
        result.push(current.trim());
        current = '';
      } else {
        current += text[i];
      }
    }
    if (current.trim()) result.push(current.trim());
    return result;
  };

  // 3. Process DIL_BILGISI
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

  // 4. Process ANLAMLAR
  const anlamlarItems = [];
  if (sections['ANLAMLAR']) {
    const itemRegex = /^ITEM:\s*(.*)$/gm;
    let itemMatch;
    while ((itemMatch = itemRegex.exec(sections['ANLAMLAR'])) !== null) {
      anlamlarItems.push(itemMatch[1].trim());
    }
    data.shortMeanings = anlamlarItems.join(', ');
  }

  // 5. Process ORNEKLER
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

  // Populate meanings using ANLAMLAR items and map examples to the first meaning
  data.meanings = anlamlarItems.map((def, idx) => ({
    definition: def,
    context: `Anlam ${idx + 1}`,
    examples: idx === 0 ? examplesList.map(ex => ({ en: ex.enText, tr: ex.trText })) : []
  }));

  // 6. Process ES_ANLAMLAR
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

  // 7. Process ZIT_ANLAMLAR
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

  // 8. Process KALIPLAR
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

  // 9. Process KARISTIRMA
  if (sections['KARISTIRMA']) {
    const karistirmaKV = parseKV(sections['KARISTIRMA']);
    if (karistirmaKV['CONFUSABLE'] && karistirmaKV['CONFUSABLE'] !== 'N/A') {
      data.tips.push(`Karıştırılabilir: ${karistirmaKV['CONFUSABLE']}`);
      if (karistirmaKV['NOTE'] && karistirmaKV['NOTE'] !== 'N/A') {
        data.tips.push(`Açıklama: ${karistirmaKV['NOTE']}`);
      }
    }
  }

  // 10. Process IPCUCU
  if (sections['IPCUCU']) {
    const ipcucu = sections['IPCUCU'].trim();
    if (ipcucu) {
      data.tips.push(`İpucu: ${ipcucu}`);
    }
  }

  // 11. Process TABLO
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

  // Fallback term if not matched
  if (!data.term) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    const cleanFirstLine = lines[0]?.replace(/^[\*\-•]\s*/, '').trim();
    data.term = cleanFirstLine?.substring(0, 30) || 'Bilinmeyen Kelime';
  }

  return data;
};

export const reconstructRawTemplate = (w) => {
  if (!w) return '';
  const lines = [];
  lines.push(`WORD: ${w.term}`);
  
  lines.push('\n[SECTION: DIL_BILGISI]');
  lines.push(`LANGUAGE: ${w.language || 'English'}`);
  lines.push(`BASE_FORM: ${w.rootWord || ''}`);
  
  let cefr = w.cefrLevel || '';
  let pronTr = '';
  let pronIpa = w.pronunciation || '';
  if (w.pronunciation && w.pronunciation.includes('(')) {
    const match = w.pronunciation.match(/^(.*?)\s*\(([^)]+)\)$/);
    if (match) {
      pronIpa = match[1].trim();
      pronTr = match[2].trim();
    }
  }
  
  let wordType = 'N/A';
  let tone = 'N/A';
  let statusStr = 'Yalın';
  let conj = 'N/A';
  
  if (w.grammar && Array.isArray(w.grammar)) {
    w.grammar.forEach(g => {
      if (g.startsWith('Türü:')) wordType = g.substring(5).trim();
      else if (g.startsWith('Zaman/Çekim:')) statusStr = g.substring(12).trim();
      else if (g.startsWith('Ton:')) tone = g.substring(4).trim();
      else if (g.startsWith('Çekimler:')) conj = g.substring(9).trim();
    });
  }
  
  lines.push(`ZELEME_DURUMU: ${statusStr}`);
  lines.push(`WORD_TYPE: ${wordType}`);
  lines.push(`LEVEL: ${cefr}`);
  lines.push(`PRON_IPA: ${pronIpa}`);
  lines.push(`PRON_TR: ${pronTr}`);
  lines.push(`TONE: ${tone}`);
  lines.push(`CONJUGATION: ${conj}`);
  lines.push(`SPECIAL_NOTE: ${w.specialNote || 'N/A'}`);
  lines.push('[SECTION_END]');

  lines.push('\n[SECTION: ANLAMLAR]');
  if (w.shortMeanings) {
    w.shortMeanings.split(',').forEach(m => {
      lines.push(`ITEM: ${m.trim()}`);
    });
  } else if (w.meanings && w.meanings.length > 0) {
    w.meanings.forEach(m => {
      lines.push(`ITEM: ${m.definition}`);
    });
  }
  lines.push('[SECTION_END]');

  lines.push('\n[SECTION: ORNEKLER]');
  if (w.meanings && w.meanings.length > 0) {
    w.meanings.forEach(m => {
      if (m.examples && m.examples.length > 0) {
        m.examples.forEach(ex => {
          let engPart = '';
          let trPart = '';
          if (ex) {
            if (typeof ex === 'object' && ex.en) {
              engPart = ex.en;
              trPart = ex.tr || '';
            } else if (typeof ex === 'string') {
              engPart = ex;
              const trimmedEx = ex.trim();
              if (trimmedEx.endsWith(')')) {
                let balance = 0;
                let openParenIdx = -1;
                for (let i = trimmedEx.length - 1; i >= 0; i--) {
                  if (trimmedEx[i] === ')') balance++;
                  else if (trimmedEx[i] === '(') {
                    balance--;
                    if (balance === 0) {
                      openParenIdx = i;
                      break;
                    }
                  }
                }
                if (openParenIdx !== -1) {
                  engPart = trimmedEx.substring(0, openParenIdx).trim();
                  trPart = trimmedEx.substring(openParenIdx + 1, trimmedEx.length - 1).trim();
                }
              }
            }
          }
          
          lines.push(`ITEM_TARGET: ${engPart}`);
          lines.push(`ITEM_TR: ${trPart}`);
        });
      }
    });
  }
  lines.push('[SECTION_END]');

  lines.push('\n[SECTION: ES_ANLAMLAR]');
  if (w.synonyms) {
    if (Array.isArray(w.synonyms)) {
      w.synonyms.forEach(s => {
        if (s && s.en) {
          lines.push(`ITEM: ${s.en} | ${s.tr || ''}`);
        }
      });
    } else if (typeof w.synonyms === 'string') {
      const sep = w.synonyms.includes(',,') ? ',,' : ',';
      w.synonyms.split(sep).forEach(s => {
        lines.push(`ITEM: ${s.trim()}`);
      });
    }
  }
  lines.push('[SECTION_END]');

  lines.push('\n[SECTION: ZIT_ANLAMLAR]');
  if (w.antonyms) {
    if (Array.isArray(w.antonyms)) {
      w.antonyms.forEach(a => {
        if (a && a.en) {
          lines.push(`ITEM: ${a.en} | ${a.tr || ''}`);
        }
      });
    } else if (typeof w.antonyms === 'string') {
      const sep = w.antonyms.includes(',,') ? ',,' : ',';
      w.antonyms.split(sep).forEach(a => {
        lines.push(`ITEM: ${a.trim()}`);
      });
    }
  }
  lines.push('[SECTION_END]');

  lines.push('\n[SECTION: KALIPLAR]');
  if (w.collocations && Array.isArray(w.collocations)) {
    w.collocations.forEach(c => {
      if (c) {
        if (typeof c === 'object' && c.en) {
          lines.push(`ITEM: ${c.en} | ${c.tr || ''}`);
        } else if (typeof c === 'string') {
          lines.push(`ITEM: ${c}`);
        }
      }
    });
  }
  lines.push('[SECTION_END]');

  lines.push('\n[SECTION: KARISTIRMA]');
  let confusable = 'N/A';
  let confNote = 'N/A';
  if (w.tips && Array.isArray(w.tips)) {
    w.tips.forEach(t => {
      if (t.startsWith('Karıştırılabilir:')) confusable = t.substring(17).trim();
      else if (t.startsWith('Açıklama:')) confNote = t.substring(9).trim();
    });
  }
  lines.push(`CONFUSABLE: ${confusable}`);
  lines.push(`NOTE: ${confNote}`);
  lines.push('[SECTION_END]');

  lines.push('\n[SECTION: IPCUCU]');
  let tipText = '';
  if (w.tips && Array.isArray(w.tips)) {
    w.tips.forEach(t => {
      if (t.startsWith('İpucu:')) tipText = t.substring(6).trim();
    });
  }
  lines.push(tipText);
  lines.push('[SECTION_END]');

  lines.push('\n[SECTION: TABLO]');
  const tabloCefr = w.cefrLevel || '';
  const tabloType = wordType;
  const tabloShortMeanings = w.shortMeanings || '';
  const tabloFamily = w.wordFamily && Array.isArray(w.wordFamily) ? w.wordFamily.join(', ') : '';
  lines.push(`${w.rootWord || w.term} | ${tabloType} | ${tabloCefr} | ${tabloShortMeanings.split(',').slice(0, 2).join(', ')} | ${tabloFamily}`);
  lines.push('[SECTION_END]');
  lines.push('\n[WORD_END]');

  return lines.join('\n');
};
