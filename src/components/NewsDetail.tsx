import React, { useState, useEffect } from 'react';
import { useNews } from '../hooks/useNews';
import { useRecord } from '../hooks/useRecord';
import { useTag } from '../hooks/useTag';
import { useQuestion } from '../hooks/useQuestion';
import { useLearning } from '../hooks/useLearning';
import { type News } from '../types/News';
import { type Record } from '../types/Record';
import { type Question } from '../types/Question';
import { type Learning } from '../types/Learning';
import './NewsDetail.css';

interface NewsDetailProps {
  newsId: number;
  onNavigateToHome: () => void;
}

export const NewsDetail: React.FC<NewsDetailProps> = ({ newsId, onNavigateToHome }) => {
  const { getNewsById, toggleFavorite } = useNews();
  const { createRecord, getRecordsByNewsId, updateRecord, deleteRecord } = useRecord();
  const { getTagsByNewsId, addTag, removeTag } = useTag();
  const { createQuestion, getQuestionsByRecordId, deleteQuestion } = useQuestion();
  const { createLearning, getLearningsByRecordId, deleteLearning } = useLearning();

  const [news, setNews] = useState<News | null>(null);
  const [records, setRecords] = useState<Record[] | unknown>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 新規記録フォーム
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({
    summary: '',
    memo: ''
  });

  // 編集中の記録
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [editingRecord, setEditingRecord] = useState({
    summary: '',
    memo: ''
  });

  // タグ管理
  const [newTag, setNewTag] = useState('');

  // 質問・学習管理
  const [recordQuestions, setRecordQuestions] = useState<{[key: number]: Question[]}>({});
  const [recordLearnings, setRecordLearnings] = useState<{[key: number]: Learning[]}>({});
  const [newQuestion, setNewQuestion] = useState<{[key: number]: string}>({});
  const [newLearning, setNewLearning] = useState<{[key: number]: string}>({});

  useEffect(() => {
    loadData();
  }, [newsId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [newsData, recordsData, tagsData] = await Promise.all([
        getNewsById(newsId),
        getRecordsByNewsId(newsId),
        getTagsByNewsId(newsId)
      ]);

      if (!newsData) {
        throw new Error('記事が見つかりませんでした');
      }

      setNews(newsData);
      setRecords(recordsData);
      setTags(tagsData);

      // 各記録の質問と学習を取得
      const questionsMap: {[key: number]: Question[]} = {};
      const learningsMap: {[key: number]: Learning[]} = {};

      for (const record of recordsData as [Record]) {
        const [questions, learnings] = await Promise.all([
          getQuestionsByRecordId(record.record_id),
          getLearningsByRecordId(record.record_id)
        ]);
        questionsMap[record.record_id] = questions as [Question];
        learningsMap[record.record_id] = learnings as [Learning];
      }

      setRecordQuestions(questionsMap);
      setRecordLearnings(learningsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!news) return;
    
    const success = await toggleFavorite(news.news_id);
    if (success) {
      setNews(prev => prev ? { ...prev, favorite: !prev.favorite } : null);
    }
  };

  const handleAddRecord = async () => {
    if (!news || !newRecord.summary.trim()) return;

    const record = await createRecord({
      news_id: news.news_id,
      summary: newRecord.summary.trim(),
      memo: newRecord.memo.trim() || undefined,
      is_deleted: false
    });

    if (record) {
      setRecords((prev: any) => [record, ...prev]);
      setNewRecord({ summary: '', memo: '' });
      setShowAddRecord(false);
      setRecordQuestions(prev => ({ ...prev, [(record as Record).record_id]: [] }));
      setRecordLearnings(prev => ({ ...prev, [(record as Record).record_id]: [] }));
    }
  };

  const handleEditRecord = (record: Record) => {
    setEditingRecordId(record.record_id);
    setEditingRecord({
      summary: record.summary,
      memo: record.memo || ''
    });
  };

  const handleUpdateRecord = async () => {
    if (!editingRecordId || !editingRecord.summary.trim()) return;

    const success = await updateRecord(editingRecordId, {
      summary: editingRecord.summary.trim(),
      memo: editingRecord.memo.trim() || undefined
    });

    if (success) {
      setRecords((prev: { record_id: number; }[]) =>
        prev.map((record: { record_id: number; }) =>
          record.record_id === editingRecordId
            ? { ...record, summary: editingRecord.summary, memo: editingRecord.memo || undefined }
            : record
        )
      );
      setEditingRecordId(null);
      setEditingRecord({ summary: '', memo: '' });
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm('この記録を削除してもよろしいですか？')) return;

    const success = await deleteRecord(recordId);
    if (success) {
      setRecords((prev: any[]) => prev.filter((record: { record_id: number; }) => record.record_id !== recordId));
      setRecordQuestions(prev => {
        const newState = { ...prev };
        delete newState[recordId];
        return newState;
      });
      setRecordLearnings(prev => {
        const newState = { ...prev };
        delete newState[recordId];
        return newState;
      });
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return;

    const success = await addTag(newsId, newTag.trim());
    if (success) {
      setTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = async (tag: string) => {
    const success = await removeTag(newsId, tag);
    if (success) {
      setTags(prev => prev.filter(t => t !== tag));
    }
  };

  const handleAddQuestion = async (recordId: number) => {
    const questionText = newQuestion[recordId]?.trim();
    if (!questionText) return;

    const question = await createQuestion({
      record_id: recordId,
      question: questionText,
      is_deleted: false
    });

    if (question) {
      setRecordQuestions(prev => ({
        ...prev,
        [recordId]: [question, ...(prev[recordId] || [])] as Question[]
      }));
      setNewQuestion(prev => ({ ...prev, [recordId]: '' }));
    }
  };

  const handleAddLearning = async (recordId: number) => {
    const learningText = newLearning[recordId]?.trim();
    if (!learningText) return;

    const learning = await createLearning({
      record_id: recordId,
      learning: learningText,
      is_deleted: false
    });

    if (learning) {
      setRecordLearnings(prev => ({
        ...prev,
        [recordId]: [learning, ...(prev[recordId] || [])] as Learning[]
      }));
      setNewLearning(prev => ({ ...prev, [recordId]: '' }));
    }
  };

  const handleDeleteQuestion = async (questionId: number, recordId: number) => {
    const success = await deleteQuestion(questionId);
    if (success) {
      setRecordQuestions(prev => ({
        ...prev,
        [recordId]: prev[recordId]?.filter(q => q.question_id !== questionId) || []
      }));
    }
  };

  const handleDeleteLearning = async (learningId: number, recordId: number) => {
    const success = await deleteLearning(learningId);
    if (success) {
      setRecordLearnings(prev => ({
        ...prev,
        [recordId]: prev[recordId]?.filter(l => l.learning_id !== learningId) || []
      }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="news-detail">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="news-detail">
        <div className="error">
          {error || '記事が見つかりませんでした'}
        </div>
        <button className="nav-btn" onClick={onNavigateToHome}>
          ← ホームに戻る
        </button>
      </div>
    );
  }

  return (
    <div className="news-detail">
      {/* ヘッダー */}
      <div className="news-detail-header">
        <div className="header-content">
          <div className="header-main">
            <h1 className="news-title">{news.title}</h1>
            <button
              className={`favorite-btn ${news.favorite ? 'active' : ''}`}
              onClick={handleToggleFavorite}
              title={news.favorite ? 'お気に入りから削除' : 'お気に入りに追加'}
            >
              {news.favorite ? '★' : '☆'}
            </button>
          </div>
          
          <div className="header-meta">
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
            <div className="news-dates">
              <span>登録: {formatDate(news.created_at)}</span>
              {news.update_at !== news.created_at && (
                <span>更新: {formatDate(news.update_at)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* タグ管理 */}
      <div className="tags-section">
        <h3>タグ</h3>
        <div className="tags-content">
          <div className="tags-list">
            {tags.map(tag => (
              <span key={tag} className="tag-item">
                {tag}
                <button
                  className="tag-remove-btn"
                  onClick={() => handleRemoveTag(tag)}
                  title="タグを削除"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="tag-add">
            <input
              type="text"
              className="tag-input"
              placeholder="新しいタグ"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <button
              className="add-tag-btn"
              onClick={handleAddTag}
              disabled={!newTag.trim()}
            >
              追加
            </button>
          </div>
        </div>
      </div>

      {/* 記録一覧 */}
      <div className="records-section">
        <div className="records-header">
          <h3>記録・メモ</h3>
          <button
            className="add-record-btn"
            onClick={() => setShowAddRecord(!showAddRecord)}
          >
            {showAddRecord ? 'キャンセル' : '+ 新規記録'}
          </button>
        </div>

        {/* 新規記録フォーム */}
        {showAddRecord && (
          <div className="add-record-form">
            <div className="form-group">
              <label>要約 *</label>
              <textarea
                className="form-textarea"
                placeholder="記事の要約を入力してください"
                value={newRecord.summary}
                onChange={(e) => setNewRecord(prev => ({ ...prev, summary: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>メモ</label>
              <textarea
                className="form-textarea"
                placeholder="個人的なメモがあれば入力してください"
                value={newRecord.memo}
                onChange={(e) => setNewRecord(prev => ({ ...prev, memo: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddRecord(false);
                  setNewRecord({ summary: '', memo: '' });
                }}
              >
                キャンセル
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddRecord}
                disabled={!newRecord.summary.trim()}
              >
                記録を追加
              </button>
            </div>
          </div>
        )}

        {/* 記録リスト */}
        <div className="records-list">
          {(records as Record[]).length === 0 ? (
            <div className="no-records">
              <p>まだ記録がありません。</p>
              <p>「+ 新規記録」ボタンから最初の記録を追加してください。</p>
            </div>
          ) : (
            (records as Record[]).map(record => (
              <div key={record.record_id} className="record-card">
                {editingRecordId === record.record_id ? (
                  /* 編集モード */
                  <div className="record-edit-form">
                    <div className="form-group">
                      <label>要約</label>
                      <textarea
                        className="form-textarea"
                        value={editingRecord.summary}
                        onChange={(e) => setEditingRecord(prev => ({ ...prev, summary: e.target.value }))}
                        rows={4}
                      />
                    </div>
                    <div className="form-group">
                      <label>メモ</label>
                      <textarea
                        className="form-textarea"
                        value={editingRecord.memo}
                        onChange={(e) => setEditingRecord(prev => ({ ...prev, memo: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    <div className="form-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditingRecordId(null);
                          setEditingRecord({ summary: '', memo: '' });
                        }}
                      >
                        キャンセル
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleUpdateRecord}
                        disabled={!editingRecord.summary.trim()}
                      >
                        更新
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 表示モード */
                  <>
                    <div className="record-header">
                      <span className="record-date">
                        {formatDate(record.created_at)}
                      </span>
                      <div className="record-actions">
                        <button
                          className="edit-btn"
                          onClick={() => handleEditRecord(record)}
                        >
                          編集
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteRecord(record.record_id)}
                        >
                          削除
                        </button>
                      </div>
                    </div>

                    <div className="record-content">
                      <div className="summary-section">
                        <h4>要約</h4>
                        <p className="summary-text">{record.summary}</p>
                      </div>
                      
                      {record.memo && (
                        <div className="memo-section">
                          <h4>メモ</h4>
                          <p className="memo-text">{record.memo}</p>
                        </div>
                      )}
                    </div>

                    {/* 質問・疑問点 */}
                    <div className="questions-section">
                      <h4>質問・疑問点</h4>
                      <div className="questions-list">
                        {recordQuestions[record.record_id]?.map(question => (
                          <div key={question.question_id} className="question-item">
                            <span className="question-text">❓ {question.question}</span>
                            <button
                              className="delete-item-btn"
                              onClick={() => handleDeleteQuestion(question.question_id, record.record_id)}
                              title="質問を削除"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="add-question">
                        <input
                          type="text"
                          className="question-input"
                          placeholder="新しい質問や疑問点を入力"
                          value={newQuestion[record.record_id] || ''}
                          onChange={(e) => setNewQuestion(prev => ({ ...prev, [record.record_id]: e.target.value }))}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddQuestion(record.record_id)}
                        />
                        <button
                          className="add-question-btn"
                          onClick={() => handleAddQuestion(record.record_id)}
                          disabled={!newQuestion[record.record_id]?.trim()}
                        >
                          追加
                        </button>
                      </div>
                    </div>

                    {/* 学んだこと */}
                    <div className="learnings-section">
                      <h4>学んだこと</h4>
                      <div className="learnings-list">
                        {recordLearnings[record.record_id]?.map(learning => (
                          <div key={learning.learning_id} className="learning-item">
                            <span className="learning-text">💡 {learning.learning}</span>
                            <button
                              className="delete-item-btn"
                              onClick={() => handleDeleteLearning(learning.learning_id, record.record_id)}
                              title="学習項目を削除"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="add-learning">
                        <input
                          type="text"
                          className="learning-input"
                          placeholder="新しい学習項目を入力"
                          value={newLearning[record.record_id] || ''}
                          onChange={(e) => setNewLearning(prev => ({ ...prev, [record.record_id]: e.target.value }))}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddLearning(record.record_id)}
                        />
                        <button
                          className="add-learning-btn"
                          onClick={() => handleAddLearning(record.record_id)}
                          disabled={!newLearning[record.record_id]?.trim()}
                        >
                          追加
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="news-detail-navigation">
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