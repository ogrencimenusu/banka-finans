import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Button, Form, Card, Row, Col, Table } from 'react-bootstrap';
import { Trash2, Plus, Image as ImageIcon, TrendingUp, Landmark, Settings } from 'lucide-react';

const FinancePage = () => {
  const { user } = useAuth();
  
  const [institutions, setInstitutions] = useState([]);
  const [instName, setInstName] = useState('');
  const [instLogo, setInstLogo] = useState('');

  const [stocks, setStocks] = useState([]);
  const [stockName, setStockName] = useState('');
  const [stockPrice, setStockPrice] = useState('');

  useEffect(() => {
    if (!user) return;

    const unsubInst = onSnapshot(query(collection(db, `users/${user.uid}/institutions`)), (snapshot) => {
      setInstitutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubStocks = onSnapshot(query(collection(db, `users/${user.uid}/stocks`)), (snapshot) => {
      setStocks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubInst(); unsubStocks(); };
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

  return (
    <div className="pb-5">
      <h2 className="mb-4 d-flex align-items-center gap-2 m-0">
        <Settings className="text-primary" /> Finans Tanımları
      </h2>

      <Row>
        <Col lg={6} className="mb-4">
          <Card className="glass-card border-0 h-100 overflow-hidden">
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
              <Table hover className="notion-table mb-0">
                <tbody>
                  {institutions.map(inst => (
                    <tr key={inst.id}>
                      <td width="40" className="ps-3">
                        <div className="bg-white rounded p-1 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px' }}>
                          {inst.logo ? <img src={inst.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImageIcon size={14} className="text-muted" />}
                        </div>
                      </td>
                      <td className="fw-medium">{inst.name}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} className="mb-4">
          <Card className="glass-card border-0 h-100 overflow-hidden">
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
              <Table hover className="notion-table mb-0">
                <thead>
                  <tr>
                    <th className="ps-3">Hisse</th>
                    <th className="text-end pe-3">Fiyat</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map(stock => (
                    <tr key={stock.id}>
                      <td className="ps-3 fw-bold text-success">{stock.name}</td>
                      <td className="text-end pe-3 fw-medium">{stock.currentPrice} TL</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FinancePage;
