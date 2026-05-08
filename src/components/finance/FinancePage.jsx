import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Button, Form, Card, Row, Col, Table, Modal, Collapse } from 'react-bootstrap';
import { Trash2, Plus, Image as ImageIcon, TrendingUp, Landmark, Settings, Edit2, X, ChevronDown, ChevronRight } from 'lucide-react';

const FinancePage = () => {
  const { user } = useAuth();
  
  const [institutions, setInstitutions] = useState([]);
  const [instName, setInstName] = useState('');
  const [instLogo, setInstLogo] = useState('');

  const [stocks, setStocks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stockName, setStockName] = useState('');
  const [stockPrice, setStockPrice] = useState('');
  const [showZeroStocks, setShowZeroStocks] = useState(false);

  // Editing States
  const [editingInst, setEditingInst] = useState(null);
  const [editingStock, setEditingStock] = useState(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [showEditInstModal, setShowEditInstModal] = useState(false);
  const [showEditStockModal, setShowEditStockModal] = useState(false);

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

  useEffect(() => {
    if (!user) return;

    const unsubInst = onSnapshot(query(collection(db, `users/${user.uid}/institutions`)), (snapshot) => {
      setInstitutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(i => i.deleted !== true));
    });

    const unsubStocks = onSnapshot(query(collection(db, `users/${user.uid}/stocks`)), (snapshot) => {
      setStocks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(s => s.deleted !== true));
    });

    const unsubTrans = onSnapshot(query(collection(db, `users/${user.uid}/financeTransactions`)), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(t => t.deleted !== true));
    });

    return () => { unsubInst(); unsubStocks(); unsubTrans(); };
  }, [user]);

  const handleAddInstitution = async (e) => {
    e.preventDefault();
    if (!instName) return;
    await addDoc(collection(db, `users/${user.uid}/institutions`), {
      name: instName, logo: instLogo, createdAt: new Date(), deleted: false
    });
    setInstName(''); setInstLogo('');
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!stockName || !stockPrice) return;
    await addDoc(collection(db, `users/${user.uid}/stocks`), {
      name: stockName.toUpperCase(), currentPrice: stockPrice, createdAt: new Date(), deleted: false
    });
    setStockName(''); setStockPrice('');
  };

  const handleDeleteInstitution = async (id) => {
    if (window.confirm('Bu kurumu silmek istediğinize emin misiniz?')) {
      await updateDoc(doc(db, `users/${user.uid}/institutions`, id), { deleted: true });
    }
  };

  const handleDeleteStock = async (id) => {
    if (window.confirm('Bu hisseyi silmek istediğinize emin misiniz?')) {
      await updateDoc(doc(db, `users/${user.uid}/stocks`, id), { deleted: true });
    }
  };

  const handleEditInst = (inst) => {
    setEditingInst(inst);
    setEditName(inst.name);
    setEditLogo(inst.logo || '');
    setShowEditInstModal(true);
  };

  const handleUpdateInst = async () => {
    if (!editName) return;
    await updateDoc(doc(db, `users/${user.uid}/institutions`, editingInst.id), {
      name: editName,
      logo: editLogo
    });
    setShowEditInstModal(false);
  };

  const handleEditStock = (stock) => {
    setEditingStock(stock);
    setEditName(stock.name);
    setEditValue(stock.currentPrice || '');
    setShowEditStockModal(true);
  };

  const handleUpdateStock = async () => {
    if (!editName || !editValue) return;

    const parsePrice = (p) => {
      if (!p) return 0;
      if (typeof p === 'number') return p;
      const str = p.toString().trim();
      if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
      return parseFloat(str) || 0;
    };

    const oldPriceStr = editingStock.currentPrice || '0';
    const oldPrice = parsePrice(oldPriceStr);
    const newPrice = parsePrice(editValue);
    
    let dailyChange = 0;
    if (oldPrice > 0) {
      dailyChange = ((newPrice - oldPrice) / oldPrice) * 100;
    }

    await updateDoc(doc(db, `users/${user.uid}/stocks`, editingStock.id), {
      name: editName.toUpperCase(),
      currentPrice: editValue,
      previousPrice: oldPriceStr,
      dailyChange: dailyChange,
      updatedAt: new Date()
    });
    setShowEditStockModal(false);
  };

  return (
    <div className="pb-5">
      <h2 className="mb-4 d-flex align-items-center gap-2 m-0">
        <Settings className="text-primary" /> Finans Tanımları
      </h2>

      <Row>
        <Col lg={6} className="mb-4">
          <Card className="bg-white shadow-lg border rounded-3 border-0 h-100 overflow-hidden">
            <Card.Header className="bg-transparent border-bottom p-3 d-flex align-items-center gap-2">
              <Landmark size={20} className="text-primary" /> <strong className="small text-uppercase">Aracı Kurumlar</strong>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="p-3 bg-white bg-opacity-10 border-bottom">
                <Form onSubmit={handleAddInstitution}>
                  <Row className="g-2">
                    <Col md={12} className="mb-2">
                      <Form.Control className="border-0 bg-light" value={instName} onChange={(e) => setInstName(e.target.value)} placeholder="Kurum Adı" required />
                    </Col>
                    <Col md={9}>
                      <Form.Control className="border-0 bg-light" type="file" size="sm" accept="image/*" onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setInstLogo(reader.result);
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </Col>
                    <Col md={3}>
                      <Button variant="primary" size="sm" type="submit" className="w-100 rounded-pill">Ekle</Button>
                    </Col>
                  </Row>
                </Form>
              </div>
              <Table responsive hover className="notion-table mb-0">
                <tbody>
                  {institutions.map(inst => (
                    <tr key={inst.id}>
                      <td width="40" className="ps-3">
                        <div className="bg-white rounded p-1 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px' }}>
                          {inst.logo ? <img src={inst.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={14} className="text-muted" />}
                        </div>
                      </td>
                      <td className="fw-medium">{inst.name}</td>
                      <td className="text-end pe-3">
                        <div className="d-flex align-items-center justify-content-end gap-2">
                          <Button variant="link" size="sm" className="text-muted p-1" onClick={() => handleEditInst(inst)}><Edit2 size={14} /></Button>
                          <Button variant="link" size="sm" className="text-danger p-1" onClick={() => handleDeleteInstitution(inst.id)}><Trash2 size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} className="mb-4">
          <Card className="bg-white shadow-lg border rounded-3 border-0 h-100 overflow-hidden">
            <Card.Header className="bg-transparent border-bottom p-3 d-flex align-items-center gap-2">
              <TrendingUp size={20} className="text-success" /> <strong className="small text-uppercase">Hisseler</strong>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="p-3 bg-white bg-opacity-10 border-bottom">
                <Form onSubmit={handleAddStock}>
                  <Row className="g-2">
                    <Col md={6}>
                      <Form.Control className="border-0 bg-light" value={stockName} onChange={(e) => setStockName(e.target.value)} placeholder="Hisse Kodu" required />
                    </Col>
                    <Col md={4}>
                      <Form.Control className="border-0 bg-light" value={stockPrice} onChange={(e) => setStockPrice(e.target.value.replace(/[^0-9,]/g, ''))} placeholder="Fiyat" required />
                    </Col>
                    <Col md={2}>
                      <Button variant="success" size="sm" type="submit" className="w-100 rounded-pill">Ekle</Button>
                    </Col>
                  </Row>
                </Form>
              </div>
              <Table responsive hover className="notion-table mb-0">
                <thead>
                  <tr>
                    <th className="ps-3">Hisse</th>
                    <th className="text-end">Fiyat</th>
                    <th className="text-end">Günlük %</th>
                    <th className="text-end pe-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const parseP = (p) => {
                      if (!p) return 0;
                      if (typeof p === 'number') return p;
                      const str = p.toString().trim();
                      if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
                      return parseFloat(str) || 0;
                    };

                    const stocksWithQty = stocks.map(stock => {
                      const qty = transactions
                        .filter(t => t.stockId === stock.id)
                        .reduce((sum, t) => sum + (t.type === 'ALIŞ' ? (parseFloat(t.quantity) || 0) : -(parseFloat(t.quantity) || 0)), 0);
                      return { ...stock, qty };
                    });

                    const activeStocks = stocksWithQty.filter(s => s.qty > 0).sort((a, b) => parseP(b.currentPrice) - parseP(a.currentPrice));
                    const zeroStocks = stocksWithQty.filter(s => s.qty <= 0).sort((a, b) => parseP(b.currentPrice) - parseP(a.currentPrice));

                    const renderStockRow = (stock) => (
                      <tr key={stock.id} className="align-middle">
                        <td className="ps-3">
                          <div className="fw-bold text-success">{stock.name}</div>
                          {(stock.updatedAt || stock.createdAt) && (
                            <div className="text-muted" style={{ fontSize: '10px', opacity: 0.7 }}>
                              {formatDate(stock.updatedAt || stock.createdAt)}
                            </div>
                          )}
                        </td>
                        <td className="text-end">
                          <div className="fw-bold">{stock.currentPrice} TL</div>
                          {stock.previousPrice && (
                            <div className="text-muted" style={{ fontSize: '10px', opacity: 0.7 }}>
                              Eski: {stock.previousPrice} TL
                            </div>
                          )}
                        </td>
                        <td className="text-end">
                          <div className={`fw-bold x-small d-inline-flex align-items-center gap-1 px-2 py-1 rounded-pill ${stock.dailyChange > 0 ? 'bg-success bg-opacity-10 text-success' : stock.dailyChange < 0 ? 'bg-danger bg-opacity-10 text-danger' : 'bg-light text-muted'}`}>
                            {stock.dailyChange > 0 ? '▲' : stock.dailyChange < 0 ? '▼' : ''}
                            {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(stock.dailyChange || 0)}%
                          </div>
                        </td>
                        <td className="text-end pe-3">
                          <div className="d-flex align-items-center justify-content-end gap-1">
                            <Button variant="link" size="sm" className="text-muted p-1 hover-bg-light rounded-circle" onClick={() => handleEditStock(stock)}><Edit2 size={13} /></Button>
                            <Button variant="link" size="sm" className="text-danger p-1 hover-bg-light rounded-circle" onClick={() => handleDeleteStock(stock.id)}><Trash2 size={13} /></Button>
                          </div>
                        </td>
                      </tr>
                    );

                    return (
                      <>
                        {activeStocks.map(renderStockRow)}
                        {zeroStocks.length > 0 && (
                          <>
                            <tr 
                              className="bg-light bg-opacity-50 cursor-pointer" 
                              onClick={() => setShowZeroStocks(!showZeroStocks)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td colSpan={4} className="py-2 ps-3 small fw-bold text-muted d-flex align-items-center gap-2">
                                {showZeroStocks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                0 Adet Olan Hisseler ({zeroStocks.length})
                              </td>
                            </tr>
                            {showZeroStocks && zeroStocks.map(renderStockRow)}
                          </>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Institution Edit Modal */}
      <Modal show={showEditInstModal} onHide={() => setShowEditInstModal(false)} centered className="glass-card">
        <Modal.Header closeButton className="border-0"><Modal.Title className="fw-bold">Kurum Düzenle</Modal.Title></Modal.Header>
        <Modal.Body className="p-4">
          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold opacity-50">KURUM ADI</Form.Label>
            <Form.Control className="border-0 bg-light" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold opacity-50">LOGO</Form.Label>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-white rounded p-2 shadow-sm border" style={{ width: '48px', height: '48px' }}>
                {editLogo ? <img src={editLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={24} className="text-muted" />}
              </div>
              <Form.Control className="border-0 bg-light" type="file" size="sm" accept="image/*" onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setEditLogo(reader.result);
                  reader.readAsDataURL(file);
                }
              }} />
            </div>
          </Form.Group>
          <Button variant="primary" className="w-100 rounded-pill mt-3 py-2 fw-bold" onClick={handleUpdateInst}>Değişiklikleri Kaydet</Button>
        </Modal.Body>
      </Modal>

      {/* Stock Edit Modal */}
      <Modal show={showEditStockModal} onHide={() => setShowEditStockModal(false)} centered className="glass-card">
        <Modal.Header closeButton className="border-0"><Modal.Title className="fw-bold">Hisse Düzenle</Modal.Title></Modal.Header>
        <Modal.Body className="p-4">
          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold opacity-50">HİSSE KODU</Form.Label>
            <Form.Control className="border-0 bg-light" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-bold opacity-50">GÜNCEL FİYAT</Form.Label>
            <Form.Control className="border-0 bg-light" value={editValue} onChange={(e) => setEditValue(e.target.value.replace(/[^0-9,.]/g, ''))} />
          </Form.Group>
          <Button variant="success" className="w-100 rounded-pill mt-3 py-2 fw-bold" onClick={handleUpdateStock}>Değişiklikleri Kaydet</Button>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default FinancePage;
