import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  updateDoc, 
  doc, 
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { Table, Button, Badge } from 'react-bootstrap';
import { RotateCcw, Trash2, Calendar, Landmark, TrendingUp, Link2, Plus, Type, Banknote, List, CircleDot } from 'lucide-react';

const COLORS = [
  { name: 'Gray', bg: '#f1f1ef', text: '#37352f' },
  { name: 'Brown', bg: '#f4eeee', text: '#44331b' },
  { name: 'Orange', bg: '#fbede7', text: '#d9730d' },
  { name: 'Yellow', bg: '#fff9e3', text: '#cb912f' },
  { name: 'Green', bg: '#edf3ec', text: '#448361' },
  { name: 'Blue', bg: '#e7f3f8', text: '#337ea9' },
  { name: 'Purple', bg: '#f5f0f7', text: '#9065b0' },
  { name: 'Pink', bg: '#f9f0f5', text: '#c14c8a' },
  { name: 'Red', bg: '#fdebec', text: '#d44c47' },
];

const TrashPage = () => {
  const { user } = useAuth();
  const [bankItems, setBankItems] = useState([]);
  const [financeItems, setFinanceItems] = useState([]);

  const [bankLimit, setBankLimit] = useState(10);
  const [bankInfinite, setBankInfinite] = useState(false);
  const [financeLimit, setFinanceLimit] = useState(10);
  const [financeInfinite, setFinanceInfinite] = useState(false);

  const { 
    banks, 
    institutions, 
    stocks, 
    quickActionTags: quickActions, 
    typeTags: transactionTypes 
  } = useData();

  useEffect(() => {
    if (!user) return;

    // Fetch deleted bank transactions
    const qTrans = query(collection(db, `users/${user.uid}/bankTransactions`), where('deleted', '==', true));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const transItems = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        collection: 'bankTransactions', 
        type: 'Banka İşlemi', 
        ...doc.data() 
      })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setBankItems(transItems);
    });

    // Fetch deleted finance transactions
    const qFin = query(collection(db, `users/${user.uid}/financeTransactions`), where('deleted', '==', true));
    const unsubFin = onSnapshot(qFin, (snapshot) => {
      const finItems = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        collection: 'financeTransactions', 
        type: 'Finans İşlemi', 
        ...doc.data() 
      })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setFinanceItems(finItems);
    });

    return () => {
      unsubTrans();
      unsubFin();
    };
  }, [user]);


  const getBankInfo = (id) => banks.find(b => b.id === id) || {};
  const getInstitutionInfo = (id) => institutions.find(i => i.id === id) || {};
  const getStockInfo = (id) => stocks.find(s => s.id === id) || {};

  const resolveTag = (tagList, idOrName) => {
    if (!idOrName) return null;
    const byId = tagList.find(t => t.id === idOrName);
    if (byId) return byId;
    return tagList.find(t => t.name?.toLowerCase() === idOrName?.toLowerCase()) || null;
  };

  const getTagStyle = (tag) => {
    const color = COLORS.find(c => c.name === tag?.color) || COLORS[0];
    return { 
      backgroundColor: color.bg, 
      color: color.text,
      fontSize: '11px',
      padding: '2px 8px',
      borderRadius: '4px',
      fontWeight: '500',
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap'
    };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const [y, m, d] = dateStr.split('-');
      return `${d}.${m}.${y}`;
    } catch (e) { return dateStr; }
  };

  const handleRestore = async (item) => {
    try {
      const ref = doc(db, `users/${user.uid}/${item.collection}`, item.id);
      await updateDoc(ref, { deleted: false });
    } catch (error) {
      console.error("Restore error:", error);
    }
  };

  const handlePermanentDelete = async (item) => {
    if (window.confirm('Bu öğeyi kalıcı olarak silmek istediğinize emin misiniz?')) {
      try {
        const ref = doc(db, `users/${user.uid}/${item.collection}`, item.id);
        await deleteDoc(ref);
      } catch (error) {
        console.error("Permanent delete error:", error);
      }
    }
  };

  const handleEmptyBankTrash = async () => {
    if (bankItems.length === 0) return;
    if (window.confirm('Banka çöp kutusundaki tüm öğeleri kalıcı olarak silmek istediğinize emin misiniz?')) {
      try {
        const batch = writeBatch(db);
        bankItems.forEach(item => {
          const ref = doc(db, `users/${user.uid}/${item.collection}`, item.id);
          batch.delete(ref);
        });
        await batch.commit();
      } catch (error) {
        console.error("Empty bank trash error:", error);
      }
    }
  };

  const handleEmptyFinanceTrash = async () => {
    if (financeItems.length === 0) return;
    if (window.confirm('Finans çöp kutusundaki tüm öğeleri kalıcı olarak silmek istediğinize emin misiniz?')) {
      try {
        const batch = writeBatch(db);
        financeItems.forEach(item => {
          const ref = doc(db, `users/${user.uid}/${item.collection}`, item.id);
          batch.delete(ref);
        });
        await batch.commit();
      } catch (error) {
        console.error("Empty finance trash error:", error);
      }
    }
  };

  const renderLimitControl = (limit, setLimit, setInfinite, isInfinite, totalCount) => (
    <div className="d-flex align-items-center gap-4 mt-2 mobile-scroll-x" style={{ flexWrap: 'nowrap', display: 'flex', width: '100%' }}>
      {limit < totalCount && (
        <div className="d-flex align-items-center gap-2 py-2 px-3 hover-bg-light cursor-pointer text-muted small rounded-2"
          style={{ width: 'fit-content', flexShrink: 0 }}
          onClick={() => setLimit(prev => prev + 20)}>
          <Plus size={14} className="opacity-50" />
          <span>Daha fazla göster</span>
        </div>
      )}

      <div className="d-flex align-items-center gap-2 text-muted x-small border-start ps-4" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' }}>
        <span className="opacity-50 fw-bold text-nowrap" style={{ fontSize: '11px' }}>GÖRÜNÜM LİMİTİ:</span>
        <div className="d-flex align-items-center gap-1">
          {[10, 20, 50, 100, 500].map(v => (
            <span
              key={v}
              className={`cursor-pointer hover-text-primary px-2 py-1 rounded transition-all ${limit === v && !isInfinite ? 'bg-light-primary text-primary fw-bold' : ''}`}
              style={{ fontSize: '11px', minWidth: '28px', textAlign: 'center', display: 'inline-block' }}
              onClick={() => {
                setInfinite(false);
                setLimit(v);
              }}
            >
              {v}
            </span>
          ))}
          <span
            className={`cursor-pointer hover-text-primary px-2 py-1 rounded transition-all ${isInfinite ? 'bg-light-primary text-primary fw-bold' : ''}`}
            style={{ fontSize: '11px', whiteSpace: 'nowrap', display: 'inline-block' }}
            onClick={() => {
              setInfinite(true);
              setLimit(100);
            }}
          >
            Hepsini Gör
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="d-flex flex-column gap-5">
      <style>{`
        .x-small { font-size: 11px; }
        .transition-all { transition: all 0.2s ease-in-out; }
        .hover-bg-light:hover { background-color: rgba(0, 0, 0, 0.03); }
        [data-theme="dark"] .hover-bg-light:hover { background-color: rgba(255, 255, 255, 0.05) !important; }
        .bg-light-primary { background-color: rgba(62, 100, 255, 0.1); }
        [data-theme="dark"] .bg-light-primary { background-color: rgba(62, 100, 255, 0.2); }
        .notion-table th { font-size: 11px; text-transform: uppercase; color: #999; font-weight: 700; letter-spacing: 0.5px; border-bottom: 1px solid rgba(0,0,0,0.05); padding: 12px 8px; }
        [data-theme="dark"] .notion-table th { border-bottom-color: rgba(255,255,255,0.05); }
        .notion-table td { padding: 12px 8px; border-bottom: 1px solid rgba(0,0,0,0.03); }
        [data-theme="dark"] .notion-table td { border-bottom-color: rgba(255,255,255,0.02); }
      `}</style>
      {/* Banka İşlemleri Table */}
      <div className="bg-white shadow-lg border rounded-4 p-md-4 p-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
          <h2 className="mb-0 d-flex align-items-center gap-2 fs-20 fw-bold">
            <Landmark className="text-primary" size={24} /> Banka İşlemleri (Silinenler)
          </h2>
          {bankItems.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleEmptyBankTrash} className="d-flex align-items-center gap-2 rounded-pill px-3 shadow-sm border-0">
              <Trash2 size={16} /> Banka Çöpünü Boşalt
            </Button>
          )}
        </div>
        <Table responsive hover className="notion-table">
          <thead>
            <tr>
              <th className="ps-0"><Calendar size={14} className="me-2" /> Tarih</th>
              <th><Type size={14} className="me-2" /> İşlem Adı</th>
              <th><Landmark size={14} className="me-2" /> Banka</th>
              <th><List size={14} className="me-2" /> Hızlı İşlemler</th>
              <th><CircleDot size={14} className="me-2" /> İşlem Türü</th>
              <th><Banknote size={14} className="me-2" /> Tutar</th>
              <th><Link2 size={14} className="me-2" /> Dekont</th>
              <th className="text-end">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {(bankInfinite ? bankItems : bankItems.slice(0, bankLimit)).map(item => {
              const bank = getBankInfo(item.bankId);
              return (
                <tr key={item.id} className="align-middle">
                  <td className="ps-0 text-muted small">{formatDate(item.date)}</td>
                  <td className="fw-medium">{item.title}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {bank.logo ? <img src={bank.logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} /> : <Landmark size={14} className="text-muted" />}
                      <span className="small">{bank.name || 'Bilinmiyor'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-1">
                      {Array.isArray(item.quickActions) ? item.quickActions.map(qaId => {
                        const tag = resolveTag(quickActions, qaId);
                        return tag ? <span key={qaId} style={getTagStyle(tag)}>{tag.name}</span> : null;
                      }) : '-'}
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const tag = resolveTag(transactionTypes, item.type);
                      return tag ? <span style={getTagStyle(tag)}>{tag.name}</span> : <Badge bg="light" className="text-dark border">Diğer</Badge>;
                    })()}
                  </td>
                  <td className="fw-bold">{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(item.amount)} TL</td>
                  <td>
                    {item.receiptUrl ? (
                      <a href={item.receiptUrl} target="_blank" rel="noreferrer" className="text-primary">
                        <Link2 size={16} />
                      </a>
                    ) : '-'}
                  </td>
                  <td className="text-end">
                    <Button variant="link" className="text-success p-1 me-2" onClick={() => handleRestore(item)} title="Geri Yükle">
                      <RotateCcw size={18} />
                    </Button>
                    <Button variant="link" className="text-danger p-1" onClick={() => handlePermanentDelete(item)} title="Kalıcı Olarak Sil">
                      <Trash2 size={18} />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {bankItems.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-5 text-muted">Banka çöp kutusu boş.</td>
              </tr>
            )}
          </tbody>
        </Table>
        {bankItems.length > 0 && renderLimitControl(bankLimit, setBankLimit, setBankInfinite, bankInfinite, bankItems.length)}
      </div>

      {/* Finans İşlemleri Table */}
      <div className="bg-white shadow-lg border rounded-4 p-md-4 p-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
          <h2 className="mb-0 d-flex align-items-center gap-2 fs-20 fw-bold">
            <TrendingUp className="text-success" size={24} /> Finans İşlemleri (Silinenler)
          </h2>
          {financeItems.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleEmptyFinanceTrash} className="d-flex align-items-center gap-2 rounded-pill px-3 shadow-sm border-0">
              <Trash2 size={16} /> Finans Çöpünü Boşalt
            </Button>
          )}
        </div>
        <Table responsive hover className="notion-table">
          <thead>
            <tr>
              <th className="ps-0"><Calendar size={14} className="me-2" /> Tarih</th>
              <th><Landmark size={14} className="me-2" /> Aracı Kurum</th>
              <th><TrendingUp size={14} className="me-2" /> Hisse</th>
              <th><List size={14} className="me-2" /> Tür</th>
              <th><List size={14} className="me-2" /> Adet</th>
              <th><Banknote size={14} className="me-2" /> Fiyat</th>
              <th className="text-end">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {(financeInfinite ? financeItems : financeItems.slice(0, financeLimit)).map(item => {
              const inst = getInstitutionInfo(item.institutionId);
              const stock = getStockInfo(item.stockId);
              return (
                <tr key={item.id} className="align-middle">
                  <td className="ps-0 text-muted small">{formatDate(item.date)}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {inst.logo ? <img src={inst.logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} /> : <Landmark size={14} className="text-muted" />}
                      <span className="small">{inst.name || 'Bilinmiyor'}</span>
                    </div>
                  </td>
                  <td className="fw-bold">{stock.name || item.stockId}</td>
                  <td>
                    <Badge bg={item.type === 'ALIŞ' ? 'success' : 'danger'} className="bg-opacity-10 text-dark border">
                      {item.type}
                    </Badge>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(item.price)} TL</td>
                  <td className="text-end">
                    <Button variant="link" className="text-success p-1 me-2" onClick={() => handleRestore(item)} title="Geri Yükle">
                      <RotateCcw size={18} />
                    </Button>
                    <Button variant="link" className="text-danger p-1" onClick={() => handlePermanentDelete(item)} title="Kalıcı Olarak Sil">
                      <Trash2 size={18} />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {financeItems.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-5 text-muted">Finans çöp kutusu boş.</td>
              </tr>
            )}
          </tbody>
        </Table>
        {financeItems.length > 0 && renderLimitControl(financeLimit, setFinanceLimit, setFinanceInfinite, financeInfinite, financeItems.length)}
      </div>
    </div>
  );
};

export default TrashPage;
