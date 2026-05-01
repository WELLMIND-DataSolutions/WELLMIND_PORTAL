import React from 'react';
import Sidebar from './Sidebar';

const PageWrapper = ({ pageId, pageLabel, description, onNavigate, children }) => {
  return (
    <div className="page-layout">
      <Sidebar activeNav={pageId} onNavigate={onNavigate} />
      <main className="main-content">
        <header className="page-header">
          <div className="page-header-left">
            <div className="breadcrumb">
              <span
                className="breadcrumb-link"
                onClick={() => onNavigate && onNavigate('dashboard')}
              >
                Dashboard
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="breadcrumb-current">{pageLabel}</span>
            </div>
            <h1>{pageLabel}</h1>
            <p>{description}</p>
          </div>
          <div className="page-header-right">
            <div className="header-date">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            
          </div>
        </header>
        {children}
      </main>
    </div>
  );
};

export default PageWrapper;