import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import BankTransactionsPage from './components/bank/BankTransactionsPage';
import FinanceTransactionsPage from './components/finance/FinanceTransactionsPage';
import 'bootstrap/dist/css/bootstrap.min.css';

import MainLayout from './components/layout/MainLayout';
import TrashPage from './components/pages/TrashPage';
import NotesPage from './components/pages/NotesPage';
import { LayoutDashboard, Wallet, PieChart, Settings, ArrowRight, Landmark, Calendar, Clock, StickyNote, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';

import { DataProvider, useData } from './context/DataContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { 
    banks: globalBanks, 
    bankTransactions: globalTransactions,
    institutions: globalInstitutions,
    stocks: globalStocks,
    financeTransactions: globalFinanceTransactions,
    notes: globalNotes,
    holidays: globalHolidays
  } = useData();
  
  // Local derived states for UI
  const banks = React.useMemo(() => {
    return globalBanks
      .filter(b => b.deleted !== true && b.visible !== false && b.visible !== 'false')
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [globalBanks]);

  const transactions = React.useMemo(() => {
    return globalTransactions.filter(t => t.deleted !== true);
  }, [globalTransactions]);

  const institutions = React.useMemo(() => {
    return globalInstitutions
      .filter(i => i.deleted !== true && i.visible !== false && i.visible !== 'false')
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [globalInstitutions]);

  const stocks = globalStocks.filter(s => s.deleted !== true);
  const financeTransactions = globalFinanceTransactions.filter(t => t.deleted !== true);

  const formatCurrency = (num) => {

    if (isNaN(num)) return '0,00';
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const bankBalances = banks.map(bank => {
    const bankTransactions = transactions.filter(t => t.bankId === bank.id);
    const balance = bankTransactions.reduce((sum, t) => {
      // Don't include credit card transactions (ID: Eyv0oZlOuCPWJbmRkv0h) in bank totals
      if (t.type === 'Eyv0oZlOuCPWJbmRkv0h') return sum;

      let amt = t.amount;
      if (typeof amt === 'string') {
        // Turkish format: dot is thousands separator, comma is decimal
        amt = parseFloat(amt.replace(/\./g, '').replace(',', '.'));
      }
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0);
    return { ...bank, balance };
  });

  const totalBalance = bankBalances.reduce((sum, b) => sum + b.balance, 0);
  const visibleBankBalances = bankBalances.filter(b => b.visible !== false && b.visible !== 'false');

  // Finance Calculations (Lot-based FIFO)
  const parseNum = (val) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const str = val.toString().trim();
    if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    return parseFloat(str) || 0;
  };

  const institutionStats = React.useMemo(() => {
    const buyLots = {};
    const stats = {};
    institutions.forEach(inst => {
      stats[inst.id] = { realizedGross: 0, realizedNet: 0, unrealizedGross: 0, unrealizedNet: 0, totalInvestment: 0, currentValue: 0, dailyGain: 0 };
    });

    const getStockInfo = (id) => stocks.find(s => s.id === id) || {};

    const sortedTrans = [...financeTransactions].sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
    });

    const intermediateResults = [];
    sortedTrans.forEach(t => {
      const q = parseNum(t.quantity);
      const p = parseNum(t.price);
      const tr = parseNum(t.taxRate);
      const sId = t.stockId || 'MISSING';
      const instId = t.institutionId || 'MISSING';
      const key = `${sId}_${instId}`;

      if (t.type === 'ALIŞ') {
        if (!buyLots[key]) buyLots[key] = [];
        buyLots[key].push({ remaining: q, price: p, taxRate: tr, date: t.date });
        intermediateResults.push({ ...t, quantity: q, price: p, taxRate: tr, calculatedRemaining: q });
      } else {
        let remainingToSell = q;
        let taxDeduction = 0;
        let grossProfit = 0;
        const lots = buyLots[key] || [];
        for (const lot of lots) {
          if (remainingToSell <= 0) break;
          if (lot.remaining <= 0) continue;
          const sellAmount = Math.min(lot.remaining, remainingToSell);
          const profit = (p - lot.price) * sellAmount;
          grossProfit += profit;
          if (profit > 0 && lot.taxRate > 0) taxDeduction += Math.round(profit * (lot.taxRate / 100) * 100) / 100;
          lot.remaining -= sellAmount;
          remainingToSell -= sellAmount;
        }
        intermediateResults.push({ ...t, quantity: q, price: p, taxRate: tr, grossProfit, totalProfit: grossProfit - taxDeduction });
      }
    });

    intermediateResults.forEach(t => {
      const instId = t.institutionId;
      if (!stats[instId]) return;

      if (t.type === 'SATIŞ') {
        stats[instId].realizedGross += (t.grossProfit || 0);
        stats[instId].realizedNet += (t.totalProfit || 0);
      }
    });

    // Unrealized & Current Value
    Object.keys(buyLots).forEach(key => {
      const [sId, instId] = key.split('_');
      const sInfo = getStockInfo(sId);
      const currentPrice = parseNum(sInfo.currentPrice) || 0;
      const dChange = parseFloat(sInfo.dailyChange) || 0;
      
      buyLots[key].forEach(lot => {
        if (lot.remaining > 0) {
          const cost = lot.price * lot.remaining;
          const currentVal = currentPrice * lot.remaining;
          const uGross = currentVal - cost;
          let uTax = 0;
          if (uGross > 0 && lot.taxRate > 0) uTax = Math.round(uGross * (lot.taxRate / 100) * 100) / 100;
          
          if (stats[instId]) {
            stats[instId].unrealizedGross += uGross;
            stats[instId].unrealizedNet += (uGross - uTax);
            stats[instId].totalInvestment += cost;
            stats[instId].currentValue += currentVal;
            stats[instId].dailyGain += currentVal * (dChange / (100 + dChange));
          }
        }
      });
    });

    return stats;
  }, [institutions, stocks, financeTransactions]);

  const totalFinanceValue = Object.values(institutionStats).reduce((sum, s) => sum + s.totalInvestment + s.unrealizedNet, 0);
  const totalFinanceProfit = Object.values(institutionStats).reduce((sum, s) => sum + s.totalProfit, 0);
  
  // Date-based notes and holidays
  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const todayStr = formatDate(new Date());
  const tomorrowStr = formatDate(new Date(Date.now() + 86400000));

  const todayItems = [
    ...(globalNotes?.filter(n => n.date === todayStr) || []).map(n => ({ ...n, type: 'note' })),
    ...(globalHolidays?.filter(h => h.date === todayStr) || []).map(h => ({ ...h, type: 'holiday' }))
  ];

  const tomorrowItems = [
    ...(globalNotes?.filter(n => n.date === tomorrowStr) || []).map(n => ({ ...n, type: 'note' })),
    ...(globalHolidays?.filter(h => h.date === tomorrowStr) || []).map(h => ({ ...h, type: 'holiday' }))
  ];

  return (
    <div className="container pt-3 pb-5">

      {/* Notes & Upcoming Section */}
      <div>
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h2 className="fw-bold h3 mb-0 d-flex align-items-center gap-2">
            <StickyNote size={24} className="text-warning" />
            Günün Notları
          </h2>
          <Link to="/notes" className="btn btn-sm btn-light rounded-pill px-3 border shadow-sm small fw-bold text-muted d-flex align-items-center gap-1">
            Tüm Notlar <ChevronRight size={14} />
          </Link>
        </div>
        
        <div className="row g-4">
          {/* Today */}
          <div className="col-12 col-md-6">
            <div className="glass-card p-4 h-100 border-0 shadow-sm" style={{ background: 'rgba(255, 255, 255, 0.5)' }}>
              <div className="d-flex align-items-center gap-2 mb-3 text-dark">
                <Calendar size={18} className="text-primary" />
                <span className="fw-bold">Bugün</span>
                <span className="text-muted small">({new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })})</span>
              </div>
              {todayItems.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {todayItems.map((item, idx) => (
                    <Link 
                      key={idx} 
                      to={item.type === 'note' ? "/notes" : "#"} 
                      state={item.type === 'note' ? { openNoteId: item.id } : null}
                      className={`text-decoration-none transition-all ${item.type === 'note' ? 'hover-translate-x' : 'cursor-default'}`}
                      onClick={(e) => item.type === 'holiday' && e.preventDefault()}
                    >
                      <div className={`p-3 rounded-3 border-start border-4 ${item.type === 'holiday' ? 'bg-danger bg-opacity-5 border-danger' : 'bg-white bg-opacity-60 border-primary'} shadow-sm h-100`}>
                        <div className="fw-bold small mb-1 text-dark">{item.title}</div>
                        {item.text && <div className="text-muted x-small text-truncate-2" dangerouslySetInnerHTML={{ __html: item.text }} />}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-muted small italic py-2">Bugün için bir not bulunmuyor.</div>
              )}
            </div>
          </div>

          {/* Tomorrow */}
          <div className="col-12 col-md-6">
            <div className="glass-card p-4 h-100 border-0 shadow-sm" style={{ background: 'rgba(255, 255, 255, 0.5)' }}>
              <div className="d-flex align-items-center gap-2 mb-3 text-dark">
                <Clock size={18} className="text-success" />
                <span className="fw-bold">Yarın</span>
                <span className="text-muted small">({new Date(Date.now() + 86400000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })})</span>
              </div>
              {tomorrowItems.length > 0 ? (
                <div className="d-flex flex-column gap-2">
                  {tomorrowItems.map((item, idx) => (
                    <Link 
                      key={idx} 
                      to={item.type === 'note' ? "/notes" : "#"} 
                      state={item.type === 'note' ? { openNoteId: item.id } : null}
                      className={`text-decoration-none transition-all ${item.type === 'note' ? 'hover-translate-x' : 'cursor-default'}`}
                      onClick={(e) => item.type === 'holiday' && e.preventDefault()}
                    >
                      <div className={`p-3 rounded-3 border-start border-4 ${item.type === 'holiday' ? 'bg-danger bg-opacity-5 border-danger' : 'bg-white bg-opacity-60 border-success'} shadow-sm h-100`}>
                        <div className="fw-bold small mb-1 text-dark">{item.title}</div>
                        {item.text && <div className="text-muted x-small text-truncate-2" dangerouslySetInnerHTML={{ __html: item.text }} />}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-muted small italic py-2">Yarın için bir not bulunmuyor.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bank Summary */}
      <div className="mt-5 pt-4">
        <div className="d-flex align-items-start justify-content-between mb-4 gap-2">
          <div className="d-flex flex-column gap-1">
            <h2 className="fw-bold h4 mb-0 d-flex align-items-center gap-2">
              <Landmark size={20} className="text-primary" />
              Hesap Özetleri
            </h2>
            <div className="bg-primary bg-opacity-10 text-primary px-3 py-1 rounded-pill fw-bold" style={{ fontSize: '11px', width: 'fit-content' }}>
              Toplam: {formatCurrency(totalBalance)} ₺
            </div>
          </div>
          <Link to="/bank-transactions" className="btn btn-primary btn-sm rounded-pill px-3 fw-bold d-flex align-items-center gap-1 mt-1">
            İncele <ArrowRight size={14} />
          </Link>
        </div>

        <div className="row g-3">
          {visibleBankBalances.length > 0 ? (
            visibleBankBalances.map((bank) => (
              <div key={bank.id} className="col-6 col-sm-6 col-md-4 col-lg-3">
                <div className="glass-card p-3 h-100 border-0 shadow-sm transition-all hover-translate-y d-flex flex-column gap-2 bg-white bg-opacity-40">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="bg-white rounded-circle p-1 shadow-sm d-flex align-items-center justify-content-center border" style={{ width: '40px', height: '40px' }}>
                      {bank.logo ? (
                        <img src={bank.logo} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                      ) : (
                        <Landmark size={18} className="text-muted" />
                      )}
                    </div>
                    <div className="text-muted d-none d-sm-block" style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>
                      Bakiye
                    </div>
                  </div>
                  <div>
                    <div className="fw-bold text-dark text-truncate mb-1" style={{ fontSize: '14px' }}>
                      {bank.name}
                    </div>
                    <div className={`fw-bold h4 mb-0 ${bank.balance < 0 ? 'text-danger' : 'text-primary'}`} style={{ letterSpacing: '-0.03em' }}>
                      {formatCurrency(bank.balance)} <span style={{ fontSize: '14px' }}>₺</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12 text-center py-5 text-muted small italic">
              Henüz eklenmiş veya görünür bir banka bulunmuyor.
            </div>
          )}
        </div>
      </div>

      {/* Finance Summary */}
      <div className="mt-5 pt-4">
        <div className="d-flex align-items-start justify-content-between mb-4 gap-2">
          <div className="d-flex flex-column gap-1">
            <h2 className="fw-bold h4 mb-0 d-flex align-items-center gap-2">
              <PieChart size={20} className="text-success" />
              Finans Özetleri
            </h2>
            <div className="bg-success bg-opacity-10 text-success px-3 py-1 rounded-pill fw-bold" style={{ fontSize: '11px', width: 'fit-content' }}>
              Portföy: {formatCurrency(totalFinanceValue)} ₺
            </div>
          </div>
          <Link to="/finance" className="btn btn-success btn-sm rounded-pill px-3 fw-bold d-flex align-items-center gap-1 mt-1">
            İncele <ArrowRight size={14} />
          </Link>
        </div>

        <div className="row g-3">
          {institutions.filter(i => i.visible !== false).length > 0 ? (
            institutions.filter(i => i.visible !== false).map((inst) => {
              const s = institutionStats[inst.id] || { realizedGross: 0, realizedNet: 0, unrealizedGross: 0, unrealizedNet: 0, totalInvestment: 0, currentValue: 0, dailyGain: 0 };
              return (
                <div key={inst.id} className="col-12 col-md-6 col-lg-4">
                  <div className="glass-card p-3 h-100 border-0 shadow-sm transition-all hover-translate-y d-flex flex-column bg-white bg-opacity-40" style={{ borderRadius: '20px' }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div className="rounded-circle bg-white d-flex align-items-center justify-content-center overflow-hidden border shadow-sm" style={{ width: '32px', height: '32px' }}>
                        {inst.logo ? <img src={inst.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Landmark size={16} className="text-muted" />}
                      </div>
                      <span className="fw-bold fs-16 text-dark text-truncate">{inst.name}</span>
                    </div>

                    <div className="mt-2 pt-2 border-top border-light border-opacity-10">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="x-small text-muted fw-medium text-nowrap">Brüt Kar/Zarar:</span>
                        <span className={`x-small fw-bold text-nowrap ms-2 ${s.unrealizedGross >= 0 ? 'text-success' : 'text-danger'}`}>
                          {s.unrealizedGross > 0 ? '+' : ''}{formatCurrency(s.unrealizedGross)} TL
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="x-small text-muted fw-medium text-nowrap">Stopaj Kesintisi:</span>
                        <span className="x-small fw-bold text-danger text-nowrap ms-2">
                          -{formatCurrency(s.unrealizedGross - s.unrealizedNet)} TL
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="x-small text-muted fw-medium text-nowrap">Net Kar/Zarar:</span>
                        <div className="text-end text-nowrap ms-2">
                          <div className={`x-small fw-bold ${s.unrealizedNet >= 0 ? 'text-success' : 'text-danger'}`}>
                            {s.unrealizedNet > 0 ? '+' : ''}{formatCurrency(s.unrealizedNet)} TL
                          </div>
                          <div className={`fw-bold ${s.unrealizedNet >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '9px', opacity: 0.7, marginTop: '-2px' }}>
                            ({s.unrealizedNet > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s.totalInvestment > 0 ? (s.unrealizedNet / s.totalInvestment * 100) : 0)}%)
                          </div>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-start mb-1" style={{ border: '1px solid rgba(0,0,0,0.05)', borderLeft: 0, borderRight: 0, marginLeft: '-15px', marginRight: '-15px', padding: '3px 15px' }}>
                        <span className="x-small text-muted fw-medium text-nowrap">Günlük Kazanç:</span>
                        <div className="text-end text-nowrap ms-2">
                          <div className={`x-small fw-bold ${s.dailyGain >= 0 ? 'text-success' : 'text-danger'}`}>
                            {s.dailyGain > 0 ? '+' : ''}{formatCurrency(s.dailyGain)} TL
                          </div>
                          <div className={`fw-bold ${s.dailyGain >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '9px', opacity: 0.7, marginTop: '-2px' }}>
                            ({s.dailyGain > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(s.currentValue > 0 ? (s.dailyGain / (s.currentValue - s.dailyGain) * 100) : 0)}%)
                          </div>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-light border-opacity-10">
                        <span className="x-small text-muted fw-bold text-nowrap">PORTFÖY DEĞERİ:</span>
                        <span className="x-small fw-bold text-dark text-nowrap ms-2">{formatCurrency(s.totalInvestment)} TL</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="x-small text-muted fw-bold text-nowrap">BRÜT DEĞER:</span>
                        <span className={`x-small fw-bold text-nowrap ms-2 ${s.totalInvestment + s.unrealizedGross >= s.totalInvestment ? 'text-success' : 'text-danger'}`}>
                          {formatCurrency(s.totalInvestment + s.unrealizedGross)} TL
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="x-small text-muted fw-bold text-nowrap">NET DEĞER:</span>
                        <span className={`x-small fw-bold text-nowrap ms-2 ${s.totalInvestment + s.unrealizedNet >= s.totalInvestment ? 'text-success' : 'text-danger'}`}>
                          {formatCurrency(s.totalInvestment + s.unrealizedNet)} TL
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-12 text-center py-5 text-muted small italic">
              Henüz eklenmiş bir finans kurumu bulunmuyor.
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          opacity: 0;
        }
        .dashboard-nav-card {
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        [data-theme="dark"] .dashboard-nav-card {
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          background: rgba(255, 255, 255, 0.03) !important;
        }
        .dashboard-nav-card:hover, .hover-translate-y:hover {
          transform: translateY(-8px);
          background: rgba(255, 255, 255, 0.85) !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1) !important;
        }
        [data-theme="dark"] .dashboard-nav-card:hover, [data-theme="dark"] .hover-translate-y:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important;
        }
        .dashboard-nav-card:hover .icon-box {
          transform: scale(1.1) rotate(5deg);
        }
        .dashboard-nav-card:hover .arrow-icon {
          transform: translateX(5px);
        }
        .shadow-hover {
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        .hover-translate-y {
          transition: all 0.3s ease !important;
        }
        .hover-translate-x:hover {
          transform: translateX(5px);
        }
        .cursor-default {
          cursor: default !important;
        }
        .x-small {
          font-size: 11px !important;
        }
        .text-truncate-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .fs-15 {
          font-size: 15px !important;
        }
        .fs-16 {
          font-size: 16px !important;
        }
        .fs-18 {
          font-size: 18px !important;
        }
      `}} />
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Yükleniyor...</div>;
  if (!user) return <Navigate to="/login" />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/bank-transactions" element={<BankTransactionsPage />} />
                      <Route path="/finance" element={<FinanceTransactionsPage />} />
                      <Route path="/notes" element={<NotesPage />} />
                      <Route path="/trash" element={<TrashPage />} />
                    </Routes>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
