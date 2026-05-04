import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  updateDoc, 
  doc, 
  deleteDoc 
} from 'firebase/firestore';
import { Table, Button, Badge } from 'react-bootstrap';
import { RotateCcw, Trash2 } from 'lucide-react';

const TrashPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Fetch deleted bank transactions
    const qTrans = query(collection(db, `users/${user.uid}/bankTransactions`), where('deleted', '==', true));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      const transItems = snapshot.docs.map(doc => ({ id: doc.id, collection: 'bankTransactions', type: 'Banka İşlemi', ...doc.data() }));
      setItems(prev => [...prev.filter(i => i.collection !== 'bankTransactions'), ...transItems]);
    });

    // Fetch deleted finance transactions
    const qFin = query(collection(db, `users/${user.uid}/financeTransactions`), where('deleted', '==', true));
    const unsubFin = onSnapshot(qFin, (snapshot) => {
      const finItems = snapshot.docs.map(doc => ({ id: doc.id, collection: 'financeTransactions', type: 'Finans İşlemi', ...doc.data() }));
      setItems(prev => [...prev.filter(i => i.collection !== 'financeTransactions'), ...finItems]);
    });

    return () => {
      unsubTrans();
      unsubFin();
    };
  }, [user]);

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

  return (
    <div className="glass-card p-4">
      <h2 className="mb-4 d-flex align-items-center gap-2">
        <Trash2 className="text-danger" /> Son Silinenler
      </h2>
      <Table responsive hover className="notion-table">
        <thead>
          <tr>
            <th>Tür</th>
            <th>İşlem Adı / Hisse</th>
            <th>Tutar / Adet</th>
            <th className="text-end">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td><Badge bg="secondary">{item.type}</Badge></td>
              <td>{item.title || item.stockId}</td>
              <td>{item.amount || item.quantity}</td>
              <td className="text-end">
                <Button variant="link" className="text-success p-1 me-2" onClick={() => handleRestore(item)} title="Geri Yükle">
                  <RotateCcw size={18} />
                </Button>
                <Button variant="link" className="text-danger p-1" onClick={() => handlePermanentDelete(item)} title="Kalıcı Olarak Sil">
                  <Trash2 size={18} />
                </Button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan="4" className="text-center py-5 text-muted">Çöp kutusu boş.</td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default TrashPage;
