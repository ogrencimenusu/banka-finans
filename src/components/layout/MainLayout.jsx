import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="d-flex">
      {!isCollapsed && (
        <div 
          className="mobile-backdrop d-md-none" 
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
