import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc,
  writeBatch,
  doc
} from 'firebase/firestore';
import { Button, Form, Card, Row, Col, Table, Badge } from 'react-bootstrap';
import { Trash2, Plus, ArrowUpRight, ArrowDownLeft, PieChart, Filter, ArrowUpDown, Download } from 'lucide-react';

const FinanceTransactionsPage = () => {
  const { user } = useAuth();
  const [institutions, setInstitutions] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Form State
  const [instId, setInstId] = useState('');
  const [stockId, setStockId] = useState('');
  const [type, setType] = useState('ALIŞ');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxRate, setTaxRate] = useState('0');

  useEffect(() => {
    if (!user) return;

    onSnapshot(query(collection(db, `users/${user.uid}/institutions`)), (snap) => {
      setInstitutions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(query(collection(db, `users/${user.uid}/stocks`)), (snap) => {
      setStocks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    onSnapshot(query(collection(db, `users/${user.uid}/financeTransactions`), orderBy('date', 'desc')), (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.deleted !== true));
    });
  }, [user]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!instId || !stockId || !quantity || !price || !date) return;

    const qty = parseFloat(quantity.replace(',', '.'));
    const prc = parseFloat(price.replace(',', '.'));
    const tax = parseFloat(taxRate.replace(',', '.')) || 0;

    try {
      if (type === 'SATIŞ') {
        const buyQuery = query(
          collection(db, `users/${user.uid}/financeTransactions`),
          where('stockId', '==', stockId),
          where('type', '==', 'ALIŞ'),
          where('remainingQuantity', '>', 0),
          orderBy('date', 'asc')
        );
        const buyDocsSnap = await getDocs(buyQuery);
        const buyDocs = buyDocsSnap.docs.filter(d => d.data().deleted !== true);
        
        let totalAvailable = 0;
        buyDocs.forEach(d => totalAvailable += d.data().remainingQuantity);

        if (totalAvailable < qty) {
          alert(`Yetersiz adet! Mevcut: ${totalAvailable}`);
          return;
        }

        const batch = writeBatch(db);
        let remainingToSell = qty;

        for (const buyDoc of buyDocs) {
          const buyData = buyDoc.data();
          const availableInThisDoc = buyData.remainingQuantity;
          if (remainingToSell <= 0) break;
          if (availableInThisDoc <= remainingToSell) {
            batch.update(buyDoc.ref, { remainingQuantity: 0 });
            remainingToSell -= availableInThisDoc;
          } else {
            batch.update(buyDoc.ref, { remainingQuantity: availableInThisDoc - remainingToSell });
            remainingToSell = 0;
          }
        }

        const sellRef = doc(collection(db, `users/${user.uid}/financeTransactions`));
        batch.set(sellRef, {
          institutionId: instId, stockId, type: 'SATIŞ', quantity: qty, price: price, date, taxRate: taxRate, createdAt: new Date(), deleted: false
        });
        await batch.commit();
      } else {
        await addDoc(collection(db, `users/${user.uid}/financeTransactions`), {
          institutionId: instId, stockId, type: 'ALIŞ', quantity: qty, remainingQuantity: qty, price: price, date, taxRate: taxRate, createdAt: new Date(), deleted: false
        });
      }
      setQuantity(''); setPrice(''); setTaxRate('0');
    } catch (error) {
      console.error("Transaction error:", error);
      alert("İşlem sırasında hata oluştu.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
      await updateDoc(doc(db, `users/${user.uid}/financeTransactions`, id), { deleted: true });
    }
  };

  const getInstName = (id) => institutions.find(i => i.id === id)?.name || '-';
  const getStockName = (id) => stocks.find(s => s.id === id)?.name || '-';

  return (
    <div className="pb-5">
      <h2 className="mb-4 d-flex align-items-center gap-2 m-0">
        <PieChart className="text-primary" /> Finans İşlemleri
      </h2>

      <Card className="mb-4 bg-white shadow-lg border rounded-3 border-0">
        <Card.Body>
          <Form onSubmit={handleAddTransaction}>
            <Row className="g-3">
              <Col md={3}>
                <Form.Label className="small fw-bold">Kurum</Form.Label>
                <Form.Select className="border-0 bg-light" value={instId} onChange={e => setInstId(e.target.value)} required>
                  <option value="">Seçiniz...</option>
                  {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label className="small fw-bold">Hisse</Form.Label>
                <Form.Select className="border-0 bg-light" value={stockId} onChange={e => setStockId(e.target.value)} required>
                  <option value="">Seçiniz...</option>
                  {stocks.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label className="small fw-bold">Tür</Form.Label>
                <Form.Select className="border-0 bg-light" value={type} onChange={e => setType(e.target.value)}>
                  <option value="ALIŞ">ALIŞ</option>
                  <option value="SATIŞ">SATIŞ</option>
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label className="small fw-bold">Adet</Form.Label>
                <Form.Control className="border-0 bg-light" type="text" value={quantity} onChange={e => setQuantity(e.target.value.replace(/[^0-9,]/g, ''))} required />
              </Col>
              <Col md={2}>
                <Form.Label className="small fw-bold">Fiyat</Form.Label>
                <Form.Control className="border-0 bg-light" type="text" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9,]/g, ''))} required />
              </Col>
              <Col md={3}>
                <Form.Label className="small fw-bold">Tarih</Form.Label>
                <Form.Control className="border-0 bg-light" type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </Col>
              <Col md={3}>
                <Form.Label className="small fw-bold">Stopaj Oranı (%)</Form.Label>
                <Form.Control className="border-0 bg-light" type="text" value={taxRate} onChange={e => setTaxRate(e.target.value.replace(/[^0-9,]/g, ''))} />
              </Col>
              <Col md={6} className="d-flex align-items-end">
                <Button variant={type === 'ALIŞ' ? "success" : "danger"} type="submit" className="w-100 rounded-pill">
                  {type} Kaydet
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <Card className="bg-white shadow-lg border rounded-3 border-0 overflow-hidden">
        <div className="p-3 d-flex justify-content-between border-bottom">
          <div className="d-flex gap-3 small fw-medium text-muted">
            <span className="d-flex align-items-center gap-1"><Filter size={14} /> Filtrele</span>
            <span className="d-flex align-items-center gap-1"><ArrowUpDown size={14} /> Sırala</span>
          </div>
          <Download size={16} className="text-muted" />
        </div>
        <Table responsive hover className="notion-table mb-0">
          <thead>
            <tr>
              <th><i className="bi bi-calendar3 me-2"></i>Date</th>
              <th><i className="bi bi-bank me-2"></i>Kurum</th>
              <th><i className="bi bi-graph-up me-2"></i>Hisse</th>
              <th><i className="bi bi-arrow-left-right me-2"></i>Tür</th>
              <th className="text-end"><i className="bi bi-123 me-2"></i>Adet</th>
              <th className="text-end"><i className="bi bi-cash me-2"></i>Fiyat</th>
              <th className="text-end"><i className="bi bi-percent me-2"></i>Stopaj</th>
              <th className="text-end">Kalan Adet</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id} className="align-middle">
                <td className="text-muted small">{t.date}</td>
                <td className="fw-medium">{getInstName(t.institutionId)}</td>
                <td className="fw-bold text-primary">{getStockName(t.stockId)}</td>
                <td>
                  <Badge bg={t.type === 'ALIŞ' ? "success" : "danger"} className="rounded-pill px-2">
                    {t.type === 'ALIŞ' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />} {t.type}
                  </Badge>
                </td>
                <td className="text-end fw-medium">{t.quantity}</td>
                <td className="text-end">{t.price} TL</td>
                <td className="text-end text-muted">%{t.taxRate}</td>
                <td className="text-end">
                  {t.type === 'ALIŞ' ? (
                    <Badge bg={t.remainingQuantity === 0 ? "secondary" : "info"} className="rounded-pill px-2">
                      {t.remainingQuantity}
                    </Badge>
                  ) : '-'}
                </td>
                <td className="text-end">
                  <Button variant="link" className="text-danger p-1 opacity-25 hover-opacity-100" onClick={() => handleDelete(t.id)}>
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default FinanceTransactionsPage;
