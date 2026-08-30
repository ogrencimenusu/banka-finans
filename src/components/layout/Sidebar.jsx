import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { clearIndexedDbPersistence } from 'firebase/firestore';
import { db } from '../../firebase';
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
  NotebookPen,
  X,
  Tag,
  BookOpen,
  CreditCard
} from 'lucide-react';
import logo from '../../assets/logo.svg';
import logoIcon from '../../assets/logo-icon.svg';
import { useStreak } from '../sozluk/hooks/useStreak';

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { streakCount, isGoalReached, remaining } = useStreak();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleClearCache = async () => {
    if (window.confirm('Tüm önbellek, çerezler ve yerel veriler temizlenecek. Bu işlem sonrası sayfa tamamen sıfırlanacaktır. Devam edilsin mi?')) {
      try {
        // 0. Firestore IndexedDB Persistence Clear
        try {
          await clearIndexedDbPersistence(db);
        } catch (e) {
          console.warn("Firestore cache clear notice:", e);
        }

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
    { name: 'Kredi Kartları', path: '/credit-cards', icon: CreditCard },
    { name: 'Finans İşlemleri', path: '/finance', icon: PieChart },
    { name: 'Notlar', path: '/notes', icon: Calendar },
    { name: 'Etiketler', path: '/tags', icon: Tag },
    { name: 'Sözlük', path: '/sozluk', icon: BookOpen },
    { name: 'Son Silinenler', path: '/trash', icon: Trash2 },
  ];

  return (
    <div className={`glass-sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ width: isCollapsed ? '80px' : '260px' }}>
      {/* Sidebar Header */}
      <div className={`sidebar-header d-flex align-items-center ${isCollapsed ? 'justify-content-center p-2' : 'justify-content-between p-3'} position-relative`} style={{ minHeight: '90px' }}>
        {/* Logo Container */}
        <div className={`d-flex align-items-center justify-content-center transition-all ${isCollapsed ? 'w-100' : ''}`}>
          {!isCollapsed ? (
            <div className="logo-glow-wrapper">
              <img src={logo} alt="Logo" className="sidebar-logo-full" style={{ height: '52px', transition: 'all 0.3s' }} />
            </div>
          ) : (
            <div className="logo-glow-wrapper collapsed">
              <img src={logoIcon} alt="Icon" className="sidebar-logo-collapsed" style={{ height: '32px', transition: 'all 0.3s' }} />
            </div>
          )}
        </div>

        {/* Premium Toggle / Close Button */}
        <button
          className="sidebar-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Menüyü Genişlet" : "Menüyü Daralt"}
        >
          <span className="d-lg-none d-flex align-items-center justify-content-center">
            <X size={18} />
          </span>
          <span className="d-none d-lg-flex align-items-center justify-content-center">
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </span>
        </button>
      </div>

      {/* Menu */}
      <div className="flex-grow-1 px-3 py-3 sidebar-menu-container" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-menu-item ${isActive ? 'active' : ''} ${isCollapsed ? 'collapsed' : ''} d-flex justify-content-between align-items-center`}
              title={isCollapsed ? item.name : ''}
              style={{ textDecoration: 'none' }}
            >
              <div className="d-flex align-items-center flex-grow-1" style={{ minWidth: 0 }}>
                <div className="menu-icon-wrapper flex-shrink-0">
                  <Icon size={20} className="menu-icon" />
                </div>
                {!isCollapsed && <span className="menu-text text-truncate">{item.name}</span>}
              </div>
              
              {!isCollapsed && item.name === 'Sözlük' && (
                <div 
                  className="flex-shrink-0 d-flex align-items-center justify-content-center px-2 py-1 rounded-pill text-body-secondary"
                  style={{ fontSize: '11px', fontWeight: 'bold', border: isGoalReached ? '1px dashed var(--bs-danger)' : '1px dashed var(--bs-secondary)' }}
                  title={isGoalReached ? "Günlük Hedef Tamamlandı!" : "Günlük Hedef: 100 Soru"}
                >
                  {isGoalReached ? (
                    <>
                      <i className="bi bi-fire text-danger me-1"></i>
                      {streakCount}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-fire opacity-50 me-1"></i>
                      {remaining}
                    </>
                  )}
                </div>
              )}
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
                <span className="text-muted smaller opacity-50 fw-normal ms-2" style={{ fontSize: '11px' }}>v2.0.6</span>
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
