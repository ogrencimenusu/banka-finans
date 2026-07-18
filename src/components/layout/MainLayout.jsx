import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const MainLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // If it's a mobile device, always start collapsed
    if (window.innerWidth < 992) return true;
    // Otherwise check local storage
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return false; // default expanded on desktop
  });
  const location = useLocation();

  useEffect(() => {
    let prevWidth = window.innerWidth;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      // Breakpoint crossed from desktop to mobile
      if (prevWidth >= 992 && currentWidth < 992) {
        setIsCollapsed(true);
      }
      // Breakpoint crossed from mobile to desktop
      else if (prevWidth < 992 && currentWidth >= 992) {
        setIsCollapsed(false);
      }
      prevWidth = currentWidth;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save state to localStorage whenever it changes (only on desktop)
  useEffect(() => {
    if (window.innerWidth >= 992) {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
    }
  }, [isCollapsed]);

  useEffect(() => {
    // Mobil görünümde sidebar açıkken arka plan kaydırmasını tamamen engelle
    if (window.innerWidth < 992) {
      if (!isCollapsed) {
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100dvh';
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.height = '100dvh';
      } else {
        document.body.style.overflow = '';
        document.body.style.height = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.height = '';
      }
    }

    // Sidebar durumunu global olarak CSS'e bildir (Modal vb. portallar için)
    document.documentElement.setAttribute('data-sidebar-collapsed', isCollapsed);
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    };
  }, [isCollapsed]);

  useEffect(() => {
    const titles = {
      '/': 'Dashboard',
      '/bank-transactions': 'Banka İşlemleri',
      '/finance': 'Finans İşlemleri',
      '/notes': 'Notlar',
      '/tags': 'Etiketler',
      '/trash': 'Çöp Kutusu',
      '/login': 'Giriş Yap'
    };

    const currentTitle = titles[location.pathname] || 'Banka-Finans';
    document.title = `${currentTitle} | Banka-Finans`;
  }, [location.pathname]);

  return (
    <div className="d-flex">
      {/* Mobile Sticky Header - always visible on mobile */}
      <div 
        className="position-fixed w-100 d-lg-none bg-white bg-opacity-75" 
        style={{ 
          top: 0, 
          left: 0, 
          zIndex: 10000, 
          height: '56px', 
          display: 'flex', 
          alignItems: 'center', 
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0,0,0,0.05)'
        }}
      >
        {isCollapsed && (
          <button
            className="btn btn-link text-dark d-flex align-items-center"
            style={{ padding: '0 16px' }}
            onClick={() => setIsCollapsed(false)}
          >
            <Menu size={24} />
          </button>
        )}
        <div id="mobile-header-actions" className="ms-auto d-flex align-items-center gap-3 pe-3"></div>
      </div>


      {!isCollapsed && window.innerWidth < 992 && (
        <div 
          className="mobile-backdrop" 
          onClick={() => setIsCollapsed(true)} 
        />
      )}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <main className={`main-content ${isCollapsed ? 'collapsed' : ''} ${location.pathname === '/bank-transactions' ? 'bank-page' : ''} ${location.pathname === '/finance' ? 'finance-page' : ''} flex-grow-1`}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
