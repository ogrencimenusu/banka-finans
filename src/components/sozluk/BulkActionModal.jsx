import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, ProgressBar } from 'react-bootstrap';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';

const downloadCSV = (data, filename) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
      cell = cell.replace(/"/g, '""');
      if (cell.search(/("|,|\n)/g) >= 0) {
        cell = `"${cell}"`;
      }
      return cell;
    }).join(','))
  ].join('\n');

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const BulkActionModal = ({ 
  show, 
  onHide, 
  selectedWords, 
  words, 
  customLists,
  onActionComplete,
  onPractice
}) => {
  const { user } = useAuth();
  const [bulkActionType, setBulkActionType] = useState(null);
  const [bulkActionStatus, setBulkActionStatus] = useState('idle'); // 'idle', 'processing', 'completed'
  const [bulkProgress, setBulkProgress] = useState(0);

  // Status settings
  const [bulkStatusValue, setBulkStatusValue] = useState('Öğrendi');
  
  // Practice settings
  const [bulkPracticeTypes, setBulkPracticeTypes] = useState({ mcq: true, written: true, tf: true, flashcard: false });
  const [bulkPracticeFormat, setBulkPracticeFormat] = useState('mixed');
  const [bulkPracticeShuffle, setBulkPracticeShuffle] = useState(true);

  // Date settings
  const [bulkDateValue, setBulkDateValue] = useState(new Date().toISOString().split('T')[0]);

  // List settings
  const [bulkListId, setBulkListId] = useState('');
  const [bulkListAction, setBulkListAction] = useState('add');

  useEffect(() => {
    if (show) {
      setBulkActionType(null);
      setBulkActionStatus('idle');
      setBulkProgress(0);
      setBulkListId('');
      setBulkListAction('add');
    }
  }, [show]);

  // Export settings
  const [bulkExportFields, setBulkExportFields] = useState({
    term: true, pronunciation: true, shortMeanings: true, generalDefinition: true,
    learningStatus: true, learningStage: true, isStarred: true, createdAt: true,
    synonyms: true, antonyms: true, meanings: true, examples: true,
    collocations: true, idioms: true, wordFamily: true, grammar: true, tips: true
  });

  const applyBulkAction = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (bulkActionStatus === 'processing' || !bulkActionType || !user) return;

    if (bulkActionType === 'delete') {
      const result = await Swal.fire({
        title: 'Emin misiniz?',
        text: `${selectedWords.length} kelimeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Evet, Sil!',
        cancelButtonText: 'İptal'
      });

      if (result.isConfirmed) {
        setBulkActionStatus('processing');
        setBulkProgress(0);
        try {
          for (let i = 0; i < selectedWords.length; i++) {
            await deleteDoc(doc(db, `users/${user.uid}/words`, selectedWords[i]));
            setBulkProgress(((i + 1) / selectedWords.length) * 100);
          }
          setBulkProgress(100);
          setBulkActionStatus('completed');
          setTimeout(() => {
            onActionComplete();
          }, 1500);
        } catch (error) {
          setBulkActionStatus('idle');
          Swal.fire({ icon: 'error', title: 'Hata', text: 'Toplu silme sırasında hata oluştu.', confirmButtonText: 'Tamam' });
        }
      }
      return;
    }

    if (bulkActionType === 'export') {
      const selectedFields = Object.keys(bulkExportFields).filter(k => bulkExportFields[k]);
      if (selectedFields.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Uyarı', text: 'Lütfen dışarı aktarılacak en az bir alan seçin.' });
        return;
      }
      setBulkActionStatus('processing');
      setBulkProgress(0);
      try {
        const wordsToExport = words.filter(w => selectedWords.includes(w.id));
        const exportData = wordsToExport.map(word => {
          const row = {};
          selectedFields.forEach(field => {
            let value = word[field];
            if (field === 'createdAt' && value) {
              const d = value.toDate ? value.toDate() : new Date(value);
              row[field] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            } else if (field === 'isStarred') {
              row[field] = value ? 'Yıldızlı' : 'Yıldızsız';
            } else if (field === 'meanings' && Array.isArray(value)) {
              row[field] = value.map(m => `${m.context ? `[${m.context}] ` : ''}${m.definition}`).join('; ');
            } else if (field === 'examples') {
               row[field] = Array.isArray(word.meanings) ? word.meanings.flatMap(m => m.examples?.map(ex => ex.en) || []).join('; ') : '';
            } else if (Array.isArray(value)) {
              row[field] = value.join('; ');
            } else {
              row[field] = value || '';
            }
          });
          return row;
        });

        for (let p = 0; p <= 100; p += 25) {
          setBulkProgress(p);
          await new Promise(r => setTimeout(r, 100));
        }

        const dateStr = new Date().toISOString().split('T')[0];
        downloadCSV(exportData, `sozluk_export_${dateStr}.csv`);
        
        setBulkActionStatus('completed');
        setTimeout(() => {
          onActionComplete();
        }, 1000);
      } catch (error) {
        setBulkActionStatus('idle');
        Swal.fire({ icon: 'error', title: 'Hata', text: 'Dışarı aktarma sırasında bir hata oluştu.' });
      }
      return;
    }

    if (bulkActionType === 'practice') {
      const wordsToPractice = words.filter(w => selectedWords.includes(w.id));
      const config = {
        questionCount: selectedWords.length,
        questionTypes: bulkPracticeTypes,
        questionFormat: bulkPracticeFormat,
        shuffle: bulkPracticeShuffle,
        onlyStarred: false,
        learningStatus: null,
        forcedWords: wordsToPractice
      };
      if(onPractice) {
        onPractice(config, wordsToPractice);
      }
      onActionComplete();
      return;
    }

    if (bulkActionType === 'list') {
      if (!bulkListId) {
        Swal.fire({ icon: 'warning', title: 'Uyarı', text: 'Lütfen bir liste seçin.' });
        return;
      }
      setBulkActionStatus('processing');
      setBulkProgress(0);
      try {
        const listDocRef = doc(db, `users/${user.uid}/customLists`, bulkListId);
        const listDoc = await getDoc(listDocRef);
        if (listDoc.exists()) {
          const currentWordIds = listDoc.data().wordIds || [];
          
          if (bulkListAction === 'add') {
            const idsToAdd = selectedWords.filter(id => !currentWordIds.includes(id));
            if (idsToAdd.length > 0) {
              for (let i = 0; i < idsToAdd.length; i++) {
                await updateDoc(listDocRef, { wordIds: arrayUnion(idsToAdd[i]) });
                await updateDoc(doc(db, `users/${user.uid}/words`, idsToAdd[i]), { listIds: arrayUnion(bulkListId) });
                setBulkProgress(((i + 1) / idsToAdd.length) * 100);
              }
            } else {
              setBulkProgress(100);
            }
          } else if (bulkListAction === 'remove') {
            const idsToRemove = selectedWords.filter(id => currentWordIds.includes(id));
            if (idsToRemove.length > 0) {
              for (let i = 0; i < idsToRemove.length; i++) {
                await updateDoc(listDocRef, { wordIds: arrayRemove(idsToRemove[i]) });
                await updateDoc(doc(db, `users/${user.uid}/words`, idsToRemove[i]), { listIds: arrayRemove(bulkListId) });
                setBulkProgress(((i + 1) / idsToRemove.length) * 100);
              }
            } else {
              setBulkProgress(100);
            }
          }
        }
        setBulkActionStatus('completed');
        setTimeout(() => onActionComplete(), 1000);
      } catch (error) {
        setBulkActionStatus('idle');
        Swal.fire({ icon: 'error', title: 'Hata', text: 'İşlem sırasında hata oluştu.' });
      }
      return;
    }

    // Default updates for status, star, reset, date
    setBulkActionStatus('processing');
    setBulkProgress(0);
    try {
      for (let i = 0; i < selectedWords.length; i++) {
        const updates = {};
        if (bulkActionType === 'status') {
          updates.learningStatus = bulkStatusValue;
          if (bulkStatusValue === 'Öğrendi') updates.learningStage = 10;
          if (bulkStatusValue === 'Yeni') updates.learningStage = 0;
          if (bulkStatusValue === 'Öğreniyor') updates.learningStage = 1;
        } else if (bulkActionType === 'star') {
          const word = words.find(w => w.id === selectedWords[i]);
          updates.isStarred = word ? !word.isStarred : true; // Toggle or set
        } else if (bulkActionType === 'reset_learning') {
          updates.learningStage = 0;
          updates.learningStatus = 'Yeni';
          updates.nextReview = null;
          updates.box = 1;
        } else if (bulkActionType === 'date') {
          updates.createdAt = new Date(bulkDateValue);
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, `users/${user.uid}/words`, selectedWords[i]), updates);
        }
        setBulkProgress(((i + 1) / selectedWords.length) * 100);
      }
      setBulkProgress(100);
      setBulkActionStatus('completed');
      setTimeout(() => onActionComplete(), 1000);
    } catch (error) {
      setBulkActionStatus('idle');
      Swal.fire({ icon: 'error', title: 'Hata', text: 'Toplu güncelleme sırasında hata oluştu.' });
    }
  };

  const getActionTitle = () => {
    switch (bulkActionType) {
      case 'status': return 'Öğrenme Durumunu Değiştir';
      case 'practice': return 'Özel Test Çöz';
      case 'star': return 'Yıldız Durumunu Değiştir (Aç/Kapat)';
      case 'reset_learning': return 'Öğrenme İlerlemesini Sıfırla';
      case 'list': return 'Özel Listeye Ekle';
      case 'date': return 'Eklenme Tarihini Değiştir';
      case 'export': return 'Dışarı Aktar (CSV/Excel)';
      case 'delete': return 'Kalıcı Olarak Sil';
      default: return 'Bir İşlem Seçin';
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Form onSubmit={applyBulkAction}>
        <Modal.Header closeButton className="border-bottom border-opacity-10">
          <Modal.Title className="fs-5 fw-bold">
            <i className="bi bi-gear-fill text-primary me-2"></i>
            Toplu İşlem <span className="text-primary">({selectedWords.length} Seçili)</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 pt-4">

          <p className="fw-medium text-muted small text-uppercase letter-spacing-1 mb-2">İşlem Türü</p>
          <div className="d-flex gap-2 mb-4 overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            {[
              { key: 'status', icon: 'bi-mortarboard', label: 'Öğrenme' },
              { key: 'practice', icon: 'bi-controller', label: 'Test Çöz' },
              { key: 'star', icon: 'bi-star', label: 'Yıldız' },
              { key: 'reset_learning', icon: 'bi-arrow-counterclockwise', label: 'Sıfırla' },
              { key: 'list', icon: 'bi-collection-play', label: 'Listeye Ekle' },
              { key: 'date', icon: 'bi-calendar', label: 'Tarih' },
              { key: 'export', icon: 'bi-file-earmark-arrow-down', label: 'Dışarı Aktar' },
              { key: 'delete', icon: 'bi-trash', label: 'Sil', danger: true },
            ].map(({ key, icon, label, danger }) => (
              <button
                key={key}
                type="button"
                className={`btn btn-sm flex-grow-1 rounded-3 py-2 d-flex flex-column align-items-center gap-1 border ${bulkActionType === key
                  ? (danger ? 'btn-danger border-danger' : 'btn-primary border-primary')
                  : (danger ? 'btn-outline-danger' : 'border-secondary border-opacity-25 bg-body text-body')
                  }`}
                style={{ minWidth: '85px', flexShrink: 0 }}
                onClick={() => setBulkActionType(key)}
              >
                <i className={`bi ${icon} fs-5`}></i>
                <span className="small fw-medium">{label}</span>
              </button>
            ))}
          </div>

          {bulkActionType === 'practice' && (
            <div className="d-flex flex-column gap-4">
              <div>
                <p className="fw-medium text-muted small text-uppercase letter-spacing-1 mb-2">Soru Tipleri</p>
                <div className="d-flex flex-wrap gap-2">
                  {[
                    { key: 'mcq', label: 'Çoktan Seçmeli' },
                    { key: 'written', label: 'Yazılı' },
                    { key: 'tf', label: 'Doğru/Yanlış' },
                    { key: 'flashcard', label: 'Flashcard' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 py-2 fw-medium ${bulkPracticeTypes[key] ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setBulkPracticeTypes(prev => ({ ...prev, [key]: !prev[key] }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="fw-medium text-muted small text-uppercase letter-spacing-1 mb-2">Soru Formatı</p>
                <div className="d-flex gap-2">
                  {[
                    { key: 'mixed', label: 'Karışık' },
                    { key: 'term', label: 'Yabancı Dil → Türkçe' },
                    { key: 'definition', label: 'Türkçe → Yabancı Dil' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`btn btn-sm rounded-pill px-3 py-2 fw-medium flex-grow-1 ${bulkPracticeFormat === key ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => setBulkPracticeFormat(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Form.Check 
                  type="switch"
                  id="shuffle-switch"
                  label="Soruları Karıştır"
                  checked={bulkPracticeShuffle}
                  onChange={(e) => setBulkPracticeShuffle(e.target.checked)}
                  className="fw-medium text-dark"
                />
              </div>
            </div>
          )}

          {bulkActionType === 'status' && (
            <div>
              <p className="fw-medium text-muted small text-uppercase letter-spacing-1 mb-2">Yeni Durum Seçin</p>
              <div className="d-flex gap-2">
                {[
                  { val: 'Yeni', label: 'Yeni Öğrenilecekler', icon: 'bi-box', color: 'info' },
                  { val: 'Öğreniyor', label: 'Öğrenme Aşamasında', icon: 'bi-hourglass-split', color: 'warning' },
                  { val: 'Öğrendi', label: 'Öğrenildi', icon: 'bi-check-circle', color: 'success' },
                ].map(({ val, label, icon, color }) => (
                  <button
                    key={val}
                    type="button"
                    className={`btn btn-sm rounded-3 py-3 flex-grow-1 d-flex flex-column align-items-center gap-2 border ${bulkStatusValue === val ? `btn-${color} border-${color}` : `btn-outline-${color}`}`}
                    onClick={() => setBulkStatusValue(val)}
                  >
                    <i className={`bi ${icon} fs-4`}></i>
                    <span className="fw-bold">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {bulkActionType === 'list' && (
            <div>
              <div className="d-flex gap-2 mb-3">
                <Button 
                  variant={bulkListAction === 'add' ? 'primary' : 'outline-primary'} 
                  size="sm" 
                  className="rounded-pill flex-grow-1"
                  onClick={() => setBulkListAction('add')}
                >
                  Listeye Ekle
                </Button>
                <Button 
                  variant={bulkListAction === 'remove' ? 'danger' : 'outline-danger'} 
                  size="sm" 
                  className="rounded-pill flex-grow-1"
                  onClick={() => setBulkListAction('remove')}
                >
                  Listeden Çıkar
                </Button>
              </div>

              <p className="fw-medium text-muted small text-uppercase letter-spacing-1 mb-2">Liste Seçin</p>
              {customLists && customLists.length > 0 ? (
                <Form.Select 
                  value={bulkListId} 
                  onChange={(e) => setBulkListId(e.target.value)} 
                  className="bg-light border-0 py-2 fw-medium shadow-none"
                >
                  <option value="">Seçiniz...</option>
                  {customLists.map(list => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </Form.Select>
              ) : (
                <div className="alert alert-secondary border-0 small fw-medium">
                  Henüz özel listeniz bulunmuyor. Öncelikle "Listelerim" sayfasından liste oluşturun.
                </div>
              )}
            </div>
          )}

          {bulkActionType === 'date' && (
            <div>
              <p className="fw-medium text-muted small text-uppercase letter-spacing-1 mb-2">Yeni Eklenme Tarihi</p>
              <Form.Control 
                type="date" 
                value={bulkDateValue} 
                onChange={(e) => setBulkDateValue(e.target.value)} 
                className="bg-light border-0 py-2 shadow-none w-auto"
              />
            </div>
          )}

          {bulkActionType === 'star' && (
            <div className="alert alert-primary bg-primary bg-opacity-10 border-0 fw-medium">
              <i className="bi bi-info-circle-fill me-2"></i>
              Seçili kelimelerin yıldız durumu <strong>tersine çevrilecektir</strong> (Yıldızlıysa yıldıza alınacak, değilse yıldızlı yapılacak).
            </div>
          )}

          {bulkActionType === 'reset_learning' && (
            <div className="alert alert-warning bg-warning bg-opacity-10 border-0 fw-medium text-dark">
              <i className="bi bi-exclamation-triangle-fill me-2 text-warning"></i>
              Seçili kelimelerin öğrenme aşamaları ve istatistikleri <strong>tamamen sıfırlanacaktır</strong>.
            </div>
          )}

          {bulkActionType === 'export' && (
            <div>
              <p className="fw-medium text-muted small text-uppercase letter-spacing-1 mb-2">Dışa Aktarılacak Alanlar</p>
              <div className="d-flex flex-wrap gap-2">
                {[
                  { key: 'term', label: 'Kelime' },
                  { key: 'pronunciation', label: 'Okunuş' },
                  { key: 'shortMeanings', label: 'Kısa Anlamlar' },
                  { key: 'generalDefinition', label: 'Genel Tanım' },
                  { key: 'learningStatus', label: 'Öğrenme Durumu' },
                  { key: 'learningStage', label: 'Öğrenme Aşaması' },
                  { key: 'isStarred', label: 'Yıldız' },
                  { key: 'createdAt', label: 'Eklenme Tarihi' },
                  { key: 'synonyms', label: 'Eş Anlamlılar' },
                  { key: 'antonyms', label: 'Zıt Anlamlılar' },
                  { key: 'meanings', label: 'Anlamlar' },
                  { key: 'examples', label: 'Örnek Cümleler' },
                  { key: 'collocations', label: 'Dizimler' },
                  { key: 'idioms', label: 'Deyimler' },
                  { key: 'wordFamily', label: 'Kelime Ailesi' },
                  { key: 'grammar', label: 'Gramer' },
                  { key: 'tips', label: 'İpuçları' },
                ].map(({ key, label }) => (
                  <Form.Check
                    key={key}
                    type="checkbox"
                    id={`export-${key}`}
                    label={label}
                    checked={bulkExportFields[key]}
                    onChange={(e) => setBulkExportFields(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="small fw-medium"
                  />
                ))}
              </div>
            </div>
          )}

          {bulkActionType === 'delete' && (
            <div className="alert alert-danger bg-danger bg-opacity-10 border-0 fw-medium">
              <i className="bi bi-shield-x me-2 fs-5"></i>
              <p className="mb-0 d-inline">Seçili <strong>{selectedWords.length}</strong> kelime veritabanından kalıcı olarak silinecek. Bu işlem geri alınamaz.</p>
            </div>
          )}

          {bulkActionStatus !== 'idle' && (
            <div className="mt-4 text-center">
              <ProgressBar 
                now={bulkProgress} 
                variant={bulkActionType === 'delete' ? 'danger' : 'primary'} 
                className="mb-2 rounded-pill bg-light"
                style={{ height: '10px' }}
              />
              <p className="small fw-bold text-muted mb-0">
                {bulkActionStatus === 'processing' ? 'İşleniyor...' : 'Tamamlandı!'} 
                ({Math.round(bulkProgress)}%)
              </p>
            </div>
          )}

        </Modal.Body>
        <Modal.Footer className="border-top border-opacity-10 bg-light bg-opacity-50">
          <Button variant="outline-secondary" className="fw-bold px-4" onClick={onHide} disabled={bulkActionStatus === 'processing'}>
            İptal
          </Button>
          <Button 
            variant={bulkActionType === 'delete' ? 'danger' : 'primary'} 
            type="submit" 
            className="fw-bold px-4 d-flex align-items-center gap-2"
            disabled={!bulkActionType || bulkActionStatus !== 'idle'}
          >
            {bulkActionStatus === 'processing' && <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>}
            {getActionTitle()}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default BulkActionModal;
