import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Spinner } from 'react-bootstrap';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
import { useSozluk } from './context/SozlukContext';
import { Check, FolderPlus } from 'lucide-react';
import { Dropdown } from 'react-bootstrap';
import { parseTemplate, reconstructRawTemplate } from './utils/templateUtils'; // I will create this

const EditWordModal = ({ show, onHide, word, onSave }) => {
  const { user } = useAuth();
  const { customLists } = useSozluk();
  const [termText, setTermText] = useState('');
  const [loading, setLoading] = useState(false);
  const [learningStatus, setLearningStatus] = useState('Yeni');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [initialListIds, setInitialListIds] = useState([]);

  useEffect(() => {
    if (show && word) {
      setTermText(word.raw || reconstructRawTemplate(word));
      
      const currentStage = word.learningStage || 0;
      setLearningStatus(currentStage === 0 ? 'Yeni' : (currentStage >= 10 ? 'Öğrendi' : 'Öğreniyor'));
      
      if (word.createdAt) {
        const dateObj = word.createdAt.toDate ? word.createdAt.toDate() : new Date(word.createdAt);
        if (!isNaN(dateObj.getTime())) {
          const tzOffset = dateObj.getTimezoneOffset() * 60000;
          const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().split('T')[0];
          setSelectedDate(localISOTime);
        } else {
          setSelectedDate(new Date().toISOString().split('T')[0]);
        }
      } else {
        setSelectedDate(new Date().toISOString().split('T')[0]);
      }

      const initialIds = word.listIds || [];
      setSelectedListIds(initialIds);
      setInitialListIds(initialIds);
    }
  }, [show, word]);

  const handleUpdate = async () => {
    if (!termText.trim() || !word) return;
    setLoading(true);
    try {
      const updatedData = parseTemplate(termText);
      if (!updatedData.term || updatedData.term === 'Bilinmeyen Kelime') {
        throw new Error('Geçersiz kelime formatı.');
      }
      updatedData.raw = termText;
      updatedData.learningStage = learningStatus === 'Yeni' ? 0 : (learningStatus === 'Öğreniyor' ? 1 : 10);
      updatedData.listIds = selectedListIds;

      if (selectedDate) {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        if (!isNaN(dateObj.getTime())) {
          updatedData.createdAt = dateObj;
        }
      }
      
      await updateDoc(doc(db, `users/${user.uid}/words`, word.id), updatedData);
      
      // Update customLists wordIds
      const listsToAdd = selectedListIds.filter(id => !initialListIds.includes(id));
      const listsToRemove = initialListIds.filter(id => !selectedListIds.includes(id));

      if (listsToAdd.length > 0) {
        await Promise.all(listsToAdd.map(listId => 
          updateDoc(doc(db, `users/${user.uid}/customLists`, listId), {
            wordIds: arrayUnion(word.id)
          })
        ));
      }
      if (listsToRemove.length > 0) {
        await Promise.all(listsToRemove.map(listId => 
          updateDoc(doc(db, `users/${user.uid}/customLists`, listId), {
            wordIds: arrayRemove(word.id)
          })
        ));
      }
      
      if (onSave) onSave();
      onHide();
      Swal.fire({ icon: 'success', title: 'Başarılı', text: 'Kelime güncellendi.', timer: 1500, showConfirmButton: false });
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'Hata', text: 'Güncelleme sırasında hata oluştu: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-5 fw-bold text-primary">
          <i className="bi bi-pencil-square me-2"></i> Kelimeyi Düzenle
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <div className="alert alert-info border-0 small mb-4">
          Kelime verilerini doğrudan AI şablonu formatında düzenleyebilirsiniz. Değişiklikleriniz otomatik olarak çözümlenip kaydedilecektir.
        </div>
        
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

        <Form.Group>
          <label className="form-label fw-semibold text-muted mb-2">Şablon İçeriği</label>
          <Form.Control
            as="textarea"
            rows={12}
            className="font-monospace bg-light border-0 shadow-none"
            style={{ fontSize: '13px' }}
            value={termText}
            onChange={(e) => setTermText(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer className="border-0 bg-light rounded-bottom-4">
        <Button variant="outline-secondary" className="rounded-pill px-4" onClick={onHide} disabled={loading}>
          İptal
        </Button>
        <Button variant="primary" className="rounded-pill px-4" onClick={handleUpdate} disabled={loading || !termText.trim()}>
          {loading ? <Spinner size="sm" /> : 'Güncelle'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditWordModal;
