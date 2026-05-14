import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
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
  Menu,
  Sun,
  Moon,
  Monitor,
  Calendar,
  NotebookPen
} from 'lucide-react';
import logo from '../../assets/logo.svg';
import logoIcon from '../../assets/logo-icon.svg';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleClearCache = async () => {
    if (window.confirm('Tüm önbellek, çerezler ve yerel veriler temizlenecek. Bu işlem sonrası sayfa tamamen sıfırlanacaktır. Devam edilsin mi?')) {
      try {
        // 1. Local & Session Storage
        localStorage.clear();
        sessionStorage.clear();

        // 2. Cache Storage (Browser Cache)
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map(name => caches.delete(name)));
        }

        // 3. Cookies
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        }

        // 4. Service Workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
        }

        // 5. Hard Reload
        window.location.href = window.location.origin + '?clear=' + Date.now();
      } catch (err) {
        console.error('Clear cache error:', err);
        window.location.reload();
      }
    }
  };

  const menuItems = [
    { name: 'Anasayfa', path: '/', icon: LayoutDashboard },
    { name: 'Banka İşlemleri', path: '/bank-transactions', icon: Wallet },
    { name: 'Finans İşlemleri', path: '/finance', icon: PieChart },
    { name: 'Notlar', path: '/notes', icon: Calendar },
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
      <div className="p-3 border-top bg-theme-light">
        <div className="d-flex align-items-center gap-2 mb-3 overflow-hidden">
          <div className="rounded-circle p-1 shadow-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" width="32" className="rounded-circle" />
            ) : (
              <User size={24} className="text-muted" />
            )}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="fw-bold small d-flex align-items-center justify-content-between w-100">
                <span className="text-truncate">{user?.displayName}</span>
                <span className="text-muted smaller opacity-50 fw-normal ms-2" style={{ fontSize: '11px' }}>v1.0.5</span>
              </div>
              <div className="text-truncate text-muted smaller" style={{ fontSize: '11px' }}>{user?.email}</div>
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <div className={`d-flex gap-1 mb-3 ${isCollapsed ? 'flex-column' : 'bg-light p-1 rounded-3'}`}>
          <button
            onClick={() => setTheme('light')}
            className={`btn btn-sm d-flex align-items-center justify-content-center border-0 ${theme === 'light' ? 'bg-theme-card shadow-sm text-primary' : 'text-muted'}`}
            style={{ flex: 1, padding: '6px' }}
            title="Açık Tema"
          >
            <Sun size={16} />
            {!isCollapsed && <span className="ms-2 fw-medium" style={{ fontSize: '12px' }}>Açık</span>}
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`btn btn-sm d-flex align-items-center justify-content-center border-0 ${theme === 'dark' ? 'bg-theme-card shadow-sm text-primary' : 'text-muted'}`}
            style={{ flex: 1, padding: '6px' }}
            title="Koyu Tema"
          >
            <Moon size={16} />
            {!isCollapsed && <span className="ms-2 fw-medium" style={{ fontSize: '12px' }}>Koyu</span>}
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`btn btn-sm d-flex align-items-center justify-content-center border-0 ${theme === 'system' ? 'bg-theme-card shadow-sm text-primary' : 'text-muted'}`}
            style={{ flex: 1, padding: '6px' }}
            title="Sistem Teması"
          >
            <Monitor size={16} />
            {!isCollapsed && <span className="ms-2 fw-medium" style={{ fontSize: '12px' }}>Sistem</span>}
          </button>
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
