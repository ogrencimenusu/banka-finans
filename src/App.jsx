import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import BankTransactionsPage from './components/bank/BankTransactionsPage';
import FinancePage from './components/finance/FinancePage';
import FinanceTransactionsPage from './components/finance/FinanceTransactionsPage';
import 'bootstrap/dist/css/bootstrap.min.css';

import MainLayout from './components/layout/MainLayout';
import TrashPage from './components/pages/TrashPage';

const Dashboard = () => (
  <div className="text-center py-5 glass-card p-5">
    <h1 className="display-4 fw-bold mb-4">Hoş Geldiniz</h1>
    <p className="lead text-muted">Banka ve Finans işlemlerinizi yönetmek için soldaki menüyü kullanabilirsiniz.</p>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Yükleniyor...</div>;
  if (!user) return <Navigate to="/login" />;
  
  return children;
};

function App() {
  return (
    <AuthProvider>
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
                    <Route path="/finance-setup" element={<FinancePage />} />
                    <Route path="/finance" element={<FinanceTransactionsPage />} />
                    <Route path="/trash" element={<TrashPage />} />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
