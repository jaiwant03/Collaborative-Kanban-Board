import React from 'react';
import Navbar from './Navbar';

function Layout({ children }) {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout__main" id="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
