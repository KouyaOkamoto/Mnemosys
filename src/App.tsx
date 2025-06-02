import { useState } from 'react';
import { DatabaseProvider, useDatabaseContext } from './contexts/DatabaseContext';
import { Sidebar } from './components/Sidebar';
import { Home } from './components/Home';
import { AddNews } from './components/AddNews';
import { NewsDetail } from './components/NewsDetail';
import './App.css';

type PageType = 'home' | 'add-news' | 'news-detail';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [selectedNewsId, setSelectedNewsId] = useState<number | null>(null);
  const { isReady, error } = useDatabaseContext();

  const handleNavigate = (page: PageType) => {
    setCurrentPage(page);
    if (page !== 'news-detail') {
      setSelectedNewsId(null);
    }
  };

  const handleNavigateToDetail = (newsId: number) => {
    setSelectedNewsId(newsId);
    setCurrentPage('news-detail');
  };

  const renderContent = () => {
    // データベースが準備できていない場合はローディング表示
    if (!isReady) {
      return (
        <div className="content-loading">
          <div className="loading-message">
            <h2>データベースを初期化中...</h2>
            <p>しばらくお待ちください</p>
          </div>
        </div>
      );
    }

    // データベースエラーの場合
    if (error) {
      return (
        <div className="content-error">
          <div className="error-message">
            <h2>エラーが発生しました</h2>
            <p>{error.message}</p>
            <button onClick={() => window.location.reload()}>
              ページをリロード
            </button>
          </div>
        </div>
      );
    }

    // 通常のコンテンツレンダリング
    switch (currentPage) {
      case 'home':
        return <Home onNavigateToDetail={handleNavigateToDetail} />;
      case 'add-news':
        return (
          <AddNews
            onNavigateToHome={() => handleNavigate('home')}
            onNavigateToDetail={handleNavigateToDetail}
          />
        );
      case 'news-detail':
        return selectedNewsId ? (
          <NewsDetail
            newsId={selectedNewsId}
            onNavigateToHome={() => handleNavigate('home')}
          />
        ) : (
          <Home onNavigateToDetail={handleNavigateToDetail} />
        );
      default:
        return <Home onNavigateToDetail={handleNavigateToDetail} />;
    }
  };

  return (
    <div className="app">
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => handleNavigate(page as PageType)}
      />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

function App() {
  return (
    <DatabaseProvider>
      <AppContent />
    </DatabaseProvider>
  );
}

export default App;