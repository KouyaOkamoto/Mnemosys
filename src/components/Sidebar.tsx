import React from 'react';
import './Sidebar.css';

interface SidebarProps {
  currentPage: 'home' | 'add-news' | 'news-detail';
  onNavigate: (page: 'home' | 'add-news') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Mnemosys</h2>
        <p className="sidebar-subtitle">記事管理システム</p>
      </div>
      
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
          onClick={() => onNavigate('home')}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-text">ホーム</span>
        </button>
        
        <button
          className={`nav-item ${currentPage === 'add-news' ? 'active' : ''}`}
          onClick={() => onNavigate('add-news')}
        >
          <span className="nav-icon">➕</span>
          <span className="nav-text">記事追加</span>
        </button>
      </nav>
      
      <div className="sidebar-footer">
        <p className="footer-text">© 2025 Mnemosys</p>
      </div>
    </div>
  );
};