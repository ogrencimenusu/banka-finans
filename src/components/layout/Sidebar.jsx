import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ChevronLeft,
  ChevronRight,
  Landmark,
  PieChart,
  Trash2,
  LogOut,
  User,
  LayoutDashboard,
  Wallet,
  Settings,
  RefreshCw,
  Menu
} from 'lucide-react';
import logo from '../../assets/logo.svg';
import logoIcon from '../../assets/logo-icon.svg';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleClearCache = async () => {
    if (window.confirm('Tüm önbellek, Firestore verileri ve yerel veriler temizlenecek. Devam edilsin mi? Bu işlem sonrası sayfa yenilenecektir.')) {
      try {
        localStorage.clear();
        sessionStorage.clear();
        if (db?._delegate?._persistence) {
          await db._delegate._persistence.clear();
        }
        window.location.reload();
      } catch (err) {
        console.error('Clear cache error:', err);
        window.location.reload();
      }
    }
  };

  const menuItems = [
    { name: 'Anasayfa', path: '/', icon: LayoutDashboard },
    { name: 'Banka İşlemleri', path: '/bank-transactions', icon: Wallet },
    { name: 'Finans', path: '/finance-setup', icon: Settings },
    { name: 'Finans İşlemleri', path: '/finance', icon: PieChart },
    { name: 'Son Silinenler', path: '/trash', icon: Trash2 },
  ];

  return (
    <div className={`glass-sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ width: isCollapsed ? '80px' : '260px' }}>
      {/* Toggle Button */}
      <button
        className="btn btn-link text-dark position-absolute sidebar-toggle-btn d-none d-lg-flex"
        style={{ 
          right: '12px', 
          top: '12px', 
          zIndex: 1001, 
          background: 'rgba(0,0,0,0.03)', 
          borderRadius: '8px', 
          padding: '6px',
          transition: 'all 0.2s'
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>

      {/* Logo */}
      <div className="p-4 mb-2">
        <div className="d-flex align-items-center justify-content-center overflow-hidden">
          {!isCollapsed ? (
            <img src={logo} alt="Logo" style={{ height: '70px' }} />
          ) : (
            <img src={logoIcon} alt="Icon" style={{ height: '32px' }} />
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="flex-grow-1 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`d-flex align-items-center gap-3 p-2 mb-1 text-decoration-none rounded transition-all ${isActive ? 'bg-primary text-white shadow-sm' : 'text-dark hover-bg-light'}`}
              title={isCollapsed ? item.name : ''}
              style={{ transition: 'all 0.2s' }}
            >
              <Icon size={20} />
              {!isCollapsed && <span style={{ fontSize: '15px', fontWeight: 500 }}>{item.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* User Info & Logout */}
      <div className="p-3 border-top bg-white bg-opacity-25">
        <div className="d-flex align-items-center gap-2 mb-3 overflow-hidden">
          <div className="bg-white rounded-circle p-1 shadow-sm">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" width="32" className="rounded-circle" />
            ) : (
              <User size={24} className="text-muted" />
            )}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="text-truncate fw-bold small">{user?.displayName}</div>
              <div className="text-truncate text-muted smaller" style={{ fontSize: '11px' }}>{user?.email}</div>
            </div>
          )}
        </div>
        <div className="d-flex gap-1">
          <button
            onClick={handleLogout}
            className={`btn btn-outline-danger btn-sm d-flex align-items-center justify-content-center gap-2 ${isCollapsed ? 'w-100' : 'flex-grow-1'}`}
            title={isCollapsed ? "Çıkış Yap" : ""}
          >
            <LogOut size={16} />
            {!isCollapsed && <span>Çıkış Yap</span>}
          </button>
          {!isCollapsed && (
            <button
              onClick={handleClearCache}
              className="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center"
              style={{ width: '32px' }}
              title="Önbelleği Temizle"
            >
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
