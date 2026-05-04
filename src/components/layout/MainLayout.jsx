import React, { useState } from 'react';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="d-flex">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <main className={`main-content ${isCollapsed ? 'collapsed' : ''} flex-grow-1`}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
