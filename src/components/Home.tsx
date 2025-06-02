import React, { useState, useEffect } from 'react';
import { useNews } from '../hooks/useNews';
import { useTag } from '../hooks/useTag';
import { type News } from '../types/News';
import './Home.css';

interface HomeProps {
  onNavigateToDetail: (newsId: number) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigateToDetail }) => {
  const { 
    getNewsList, 
    toggleFavorite, 
    loading: newsLoading, 
    error: newsError, 
    debugCheckData,
    isReady: newsReady 
  } = useNews();
  const { getAllTags, getNewsByTag, loading: tagLoading } = useTag();
  
  const [newsList, setNewsList] = useState<News[]>([]);
  const [filteredNews, setFilteredNews] = useState<News[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<Array<{news_tag: string, count: number}>>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // データベースの準備ができたらデータを読み込む
  useEffect(() => {
    console.log('Home: Database ready status changed:', newsReady);
    if (newsReady && !dataLoaded) {
      console.log('Home: Database is ready, loading data...');
      loadData();
    }
  }, [newsReady, dataLoaded]);

  // フィルタリング処理
  useEffect(() => {
    console.log('Filter effect triggered:', { 
      newsListLength: newsList.length, 
      searchTerm, 
      selectedTag, 
      showFavoritesOnly 
    });
    filterNews();
  }, [newsList, searchTerm, selectedTag, showFavoritesOnly]);

  const loadData = async () => {
    console.log('loadData called');
    try {
      // デバッグデータチェック
      if (debugCheckData) {
        await debugCheckData();
      }
      
      console.log('Fetching news list...');
      const newsData = await getNewsList();
      console.log('News data received:', newsData);
      console.log('News data length:', newsData.length);
      
      setNewsList(newsData as News[]);
      
      console.log('Fetching tags...');
      const tagsData = await getAllTags();
      console.log('Tags data received:', tagsData);
      setAvailableTags(tagsData as []);
      
      setDataLoaded(true);
    } catch (error) {
      console.error('データの読み込みに失敗しました:', error);
      setDataLoaded(true);
    }
  };

  const filterNews = async () => {
    console.log('filterNews called');
    let filtered = [...newsList];
    console.log('Initial filtered count:', filtered.length);

    // お気に入りフィルタ
    if (showFavoritesOnly) {
      filtered = filtered.filter(news => news.favorite);
      console.log('After favorite filter:', filtered.length);
    }

    // タグフィルタ
    if (selectedTag) {
      const taggedNews = await getNewsByTag(selectedTag);
      const taggedNewsIds = taggedNews.map(news => (news as News).news_id);
      filtered = filtered.filter(news => taggedNewsIds.includes(news.news_id));
      console.log('After tag filter:', filtered.length);
    }

    // 検索フィルタ
    if (searchTerm) {
      filtered = filtered.filter(news =>
        news.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        news.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('After search filter:', filtered.length);
    }

    setFilteredNews(filtered);
    console.log('Final filtered news:', filtered);
  };

  const handleToggleFavorite = async (newsId: number) => {
    console.log('Toggle favorite for news:', newsId);
    const success = await toggleFavorite(newsId);
    if (success) {
      setNewsList(prev =>
        prev.map(news =>
          news.news_id === newsId
            ? { ...news, favorite: !news.favorite }
            : news
        )
      );
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedTag('');
    setShowFavoritesOnly(false);
  };

  // ページが表示されたときにデータを再読み込み
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && newsReady && dataLoaded) {
        console.log('Page became visible, reloading data...');
        loadData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [newsReady, dataLoaded]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateTitle = (title: string, maxLength: number = 50) => {
    return title.length > maxLength ? title.substring(0, maxLength) + '...' : title;
  };

  const loading = newsLoading || tagLoading;

  // デバッグ用のレンダリング情報
  console.log('Rendering Home component:', {
    loading,
    newsError,
    dataLoaded,
    newsReady,
    newsListLength: newsList.length,
    filteredNewsLength: filteredNews.length
  });

  // データベースの準備中
  if (!newsReady) {
    return (
      <div className="home">
        <div className="home-header">
          <h1>記事一覧</h1>
          <p className="home-subtitle">登録された記事を検索・閲覧できます</p>
        </div>
        <div className="loading">データベースを準備しています...</div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="home-header">
        <h1>記事一覧</h1>
        <p className="home-subtitle">登録された記事を検索・閲覧できます</p>
      </div>

      {/* 検索・フィルタエリア */}
      <div className="search-section">
        <div className="search-controls">
          <div className="search-input-group">
            <input
              type="text"
              className="search-input"
              placeholder="記事タイトルやURLで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-controls">
            <select
              className="tag-select"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
            >
              <option value="">すべてのタグ</option>
              {availableTags.map(tag => (
                <option key={tag.news_tag} value={tag.news_tag}>
                  {tag.news_tag} ({tag.count})
                </option>
              ))}
            </select>

            <label className="favorite-checkbox">
              <input
                type="checkbox"
                checked={showFavoritesOnly}
                onChange={(e) => setShowFavoritesOnly(e.target.checked)}
              />
              <span className="checkbox-label">お気に入りのみ</span>
            </label>

            <button 
              className="clear-filters-btn"
              onClick={handleClearFilters}
            >
              フィルタクリア
            </button>
          </div>
        </div>
      </div>

      {/* 結果表示 */}
      <div className="results-section">
        <div className="results-header">
          <span className="results-count">
            {filteredNews.length} 件の記事が見つかりました
            {loading && ' (読み込み中...)'}
          </span>
        </div>

        {loading && !dataLoaded ? (
          <div className="loading">読み込み中...</div>
        ) : newsError ? (
          <div className="error">エラーが発生しました: {newsError.message}</div>
        ) : filteredNews.length === 0 ? (
          <div className="no-results">
            <p>条件に一致する記事が見つかりませんでした。</p>
            <p>検索条件を変更するか、新しい記事を追加してください。</p>
            {newsList.length === 0 && (
              <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>
                データベースに記事が登録されていません。
              </p>
            )}
          </div>
        ) : (
          <div className="news-grid">
            {filteredNews.map((news) => {
              console.log('Rendering news item:', news);
              return (
                <div key={news.news_id} className="news-card">
                  <div className="news-card-header">
                    <h3 
                      className="news-title"
                      onClick={() => onNavigateToDetail(news.news_id)}
                    >
                      {truncateTitle(news.title)}
                    </h3>
                    <button
                      className={`favorite-btn ${news.favorite ? 'active' : ''}`}
                      onClick={() => handleToggleFavorite(news.news_id)}
                      title={news.favorite ? 'お気に入りから削除' : 'お気に入りに追加'}
                    >
                      {news.favorite ? '★' : '☆'}
                    </button>
                  </div>

                  <div className="news-meta">
                    <span className="news-date">
                      登録: {formatDate(news.created_at)}
                    </span>
                    {news.update_at !== news.created_at && (
                      <span className="news-updated">
                        更新: {formatDate(news.update_at)}
                      </span>
                    )}
                  </div>

                  <div className="news-url">
                    <a 
                      href={news.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="news-link"
                    >
                      🔗 元記事を開く
                    </a>
                  </div>

                  <div className="news-actions">
                    <button
                      className="detail-btn"
                      onClick={() => onNavigateToDetail(news.news_id)}
                    >
                      詳細を見る
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* デバッグ用ボタン */}
      {/* <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>デバッグツール</h3>
        <button 
          onClick={async () => {
            console.log('=== Manual Debug Check ===');
            await debugCheckData?.();
            await loadData();
          }}
          style={{ 
            padding: '0.5rem 1rem', 
            marginRight: '0.5rem',
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          データベース状態を確認
        </button>
        <button 
          onClick={() => {
            setDataLoaded(false);
            setTimeout(() => {
              if (newsReady) {
                loadData();
              }
            }, 100);
          }}
          style={{ 
            padding: '0.5rem 1rem', 
            background: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          データを再読み込み
        </button>
      </div> */}
    </div>
  );
};