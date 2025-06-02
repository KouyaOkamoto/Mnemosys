import React, { useState } from 'react';
import { useNews } from '../hooks/useNews';
import { useTag } from '../hooks/useTag';
import './AddNews.css';

interface AddNewsProps {
  onNavigateToHome: () => void;
  onNavigateToDetail: (newsId: number) => void;
}

export const AddNews: React.FC<AddNewsProps> = ({ onNavigateToHome, onNavigateToDetail }) => {
  const { createNews, loading: newsLoading, error: newsError } = useNews();
  const { addTag, loading: tagLoading } = useTag();
  
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    favorite: false
  });
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddTag = () => {
    const trimmedTag = currentTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      setSubmitError('タイトルを入力してください。');
      return false;
    }
    if (!formData.url.trim()) {
      setSubmitError('URLを入力してください。');
      return false;
    }
    
    // URL形式の簡単なバリデーション
    try {
      new URL(formData.url);
    } catch {
      setSubmitError('正しいURL形式で入力してください。');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 記事を作成
      const newNews = await createNews({
        title: formData.title.trim(),
        url: formData.url.trim(),
        favorite: formData.favorite,
        is_deleted: false
      });
      
      if (!newNews) {
        throw new Error('記事の作成に失敗しました。');
      }
      
      // タグを追加
      for (const tag of tags) {
        await addTag(0, tag);
      }
      
      setSuccessMessage('記事が正常に追加されました！');
      
      // フォームをリセット
      setFormData({
        title: '',
        url: '',
        favorite: false
      });
      setTags([]);
      setCurrentTag('');
      
      // 3秒後に詳細画面に遷移
      setTimeout(() => {
        onNavigateToDetail(0);
      }, 1500);
      
    } catch (error) {
      console.error('記事追加エラー:', error);
      setSubmitError(error instanceof Error ? error.message : '記事の追加に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      title: '',
      url: '',
      favorite: false
    });
    setTags([]);
    setCurrentTag('');
    setSubmitError(null);
    setSuccessMessage(null);
  };

  const loading = newsLoading || tagLoading || isSubmitting;

  return (
    <div className="add-news">
      <div className="add-news-header">
        <h1>新しい記事を追加</h1>
        <p className="add-news-subtitle">Web記事の情報を登録して管理しましょう</p>
      </div>

      <div className="add-news-content">
        <form onSubmit={handleSubmit} className="add-news-form">
          {/* タイトル入力 */}
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              タイトル <span className="required">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              className="form-input"
              placeholder="記事のタイトルを入力してください"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* URL入力 */}
          <div className="form-group">
            <label htmlFor="url" className="form-label">
              URL <span className="required">*</span>
            </label>
            <input
              type="url"
              id="url"
              name="url"
              className="form-input"
              placeholder="https://example.com/article"
              value={formData.url}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* お気に入り */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="favorite"
                checked={formData.favorite}
                onChange={handleInputChange}
              />
              <span className="checkbox-text">お気に入りに追加</span>
            </label>
          </div>

          {/* タグ追加 */}
          <div className="form-group">
            <label htmlFor="tags" className="form-label">
              タグ
            </label>
            <div className="tag-input-group">
              <input
                type="text"
                id="tags"
                className="form-input"
                placeholder="タグを入力してEnterキーで追加"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button
                type="button"
                className="add-tag-btn"
                onClick={handleAddTag}
                disabled={!currentTag.trim()}
              >
                追加
              </button>
            </div>
            
            {/* 追加されたタグ一覧 */}
            {tags.length > 0 && (
              <div className="tags-list">
                {tags.map((tag, index) => (
                  <span key={index} className="tag-item">
                    {tag}
                    <button
                      type="button"
                      className="tag-remove-btn"
                      onClick={() => handleRemoveTag(tag)}
                      title="タグを削除"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* エラー・成功メッセージ */}
          {submitError && (
            <div className="message error-message">
              {submitError}
            </div>
          )}
          
          {newsError && (
            <div className="message error-message">
              エラー: {newsError.message}
            </div>
          )}
          
          {successMessage && (
            <div className="message success-message">
              {successMessage}
            </div>
          )}

          {/* フォームアクション */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              disabled={loading}
            >
              リセット
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !formData.title.trim() || !formData.url.trim()}
            >
              {loading ? '追加中...' : '記事を追加'}
            </button>
          </div>
        </form>

        {/* プレビューエリア */}
        <div className="preview-section">
          <h3>プレビュー</h3>
          <div className="preview-card">
            <div className="preview-header">
              <h4 className="preview-title">
                {formData.title || 'タイトルが入力されていません'}
              </h4>
              <span className="preview-favorite">
                {formData.favorite ? '★' : '☆'}
              </span>
            </div>
            
            <div className="preview-url">
              {formData.url ? (
                <a 
                  href={formData.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="preview-link"
                >
                  🔗 {formData.url}
                </a>
              ) : (
                <span className="preview-placeholder">URLが入力されていません</span>
              )}
            </div>
            
            {tags.length > 0 && (
              <div className="preview-tags">
                <span className="preview-tags-label">タグ:</span>
                {tags.map((tag, index) => (
                  <span key={index} className="preview-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="add-news-navigation">
        <button
          type="button"
          className="nav-btn"
          onClick={onNavigateToHome}
        >
          ← ホームに戻る
        </button>
      </div>
    </div>
  );
};