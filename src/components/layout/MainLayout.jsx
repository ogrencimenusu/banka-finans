import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const MainLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 992);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 992) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.height = '';
    };
  }, [isCollapsed]);

  return (
    <div className="d-flex">
      {/* Mobile Sticky Header - only visible when sidebar is collapsed on mobile */}
      {isCollapsed && (
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
          <button
            className="btn btn-link text-dark d-flex align-items-center"
            style={{ padding: '0 16px' }}
            onClick={() => setIsCollapsed(false)}
          >
            <Menu size={24} />
          </button>
        </div>
      )}

      {!isCollapsed && window.innerWidth < 992 && (
        <div 
          className="mobile-backdrop" 
          onClick={() => setIsCollapsed(true)} 
        />
      )}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <main className={`main-content ${isCollapsed ? 'collapsed' : ''} flex-grow-1`}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
