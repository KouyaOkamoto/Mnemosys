import { useState, useCallback, useEffect } from 'react';
import { useDatabase } from './useDatabase';
import { type News } from '../types/News';

export const useNews = () => {
  const { db, isReady } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // データベースの準備状態をログ出力
  useEffect(() => {
    console.log('useNews: Database state changed', { db: !!db, isReady });
  }, [db, isReady]);

  // Web記事の新規登録
  const createNews = useCallback(async (news: Omit<News, 'news_id' | 'created_at' | 'update_at'>) => {
    console.log('createNews called:', { news, db: !!db, isReady });
    
    if (!db || !isReady) {
      console.warn('Database not ready in createNews');
      return null;
    }
    
    setLoading(true);
    try {
      console.log('Executing INSERT query...');
      const result = await db.query(
        `INSERT INTO news (title, url, favorite, is_deleted) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [news.title, news.url, news.favorite || false, false]
      );
      console.log('INSERT result:', result);
      console.log('Created news:', result.rows[0]);
      
      // デバッグ: 作成直後にデータを確認
      const checkResult = await db.query(
        'SELECT * FROM news WHERE news_id = $1',
        [(result.rows[0] as News).news_id]
      );
      console.log('Verification query result:', checkResult.rows);
      
      return result.rows[0];
    } catch (err) {
      console.error('Create news error:', err);
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  // Web記事の全取得（修正版）
  const getNewsList = useCallback(async (includeDeleted = false) => {
    console.log('getNewsList called:', { db: !!db, isReady, includeDeleted });
    
    // データベースが準備できていない場合は空配列を返す（エラーではない）
    if (!db || !isReady) {
      console.log('Database not ready yet, returning empty array');
      return [];
    }
    
    setLoading(true);
    try {
      // トランザクションを使用してデータの一貫性を保証
      await db.query('BEGIN');
      
      const query = includeDeleted 
        ? 'SELECT * FROM news ORDER BY created_at DESC'
        : 'SELECT * FROM news WHERE is_deleted = FALSE ORDER BY created_at DESC';
      
      console.log('Executing query:', query);
      const result = await db.query(query);
      
      await db.query('COMMIT');
      
      console.log('Query result:', result);
      console.log('Rows returned:', result.rows.length);
      console.log('First few rows:', result.rows.slice(0, 3));
      
      return result.rows || [];
    } catch (err) {
      await db.query('ROLLBACK').catch(() => {});
      console.error('Get news list error:', err);
      setError(err as Error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  // Web記事をnews_idから取得
  const getNewsById = useCallback(async (newsId: number): Promise<News | null> => {
    console.log('getNewsById called:', { newsId, db: !!db, isReady });
    
    if (!db || !isReady) {
      console.warn('Database not ready in getNewsById');
      return null;
    }
    
    setLoading(true);
    try {
      const result = await db.query(
        'SELECT * FROM news WHERE news_id = $1',
        [newsId]
      );
      console.log('getNewsById result:', result.rows[0]);
      return result.rows[0] as News || null;
    } catch (err) {
      console.error('Get news by id error:', err);
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  // Web記事の更新
  const updateNews = useCallback(async (newsId: number, updates: Partial<News>) => {
    console.log('updateNews called:', { newsId, updates, db: !!db, isReady });
    
    if (!db || !isReady) {
      console.warn('Database not ready in updateNews');
      return false;
    }
    
    setLoading(true);
    try {
      // 動的にUPDATE文を構築
      const fields = Object.keys(updates).filter(key => key !== 'news_id');
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const values = [newsId, ...fields.map(field => updates[field as keyof News])];
      
      const query = `UPDATE news SET ${setClause}, update_at = CURRENT_TIMESTAMP WHERE news_id = $1`;
      console.log('Update query:', query);
      console.log('Update values:', values);
      
      await db.query(query, values);
      console.log('Update successful');
      return true;
    } catch (err) {
      console.error('Update news error:', err);
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  // Web記事の削除
  const deleteNews = useCallback(async (newsId: number, hardDelete = false) => {
    console.log('deleteNews called:', { newsId, hardDelete, db: !!db, isReady });
    
    if (!db || !isReady) {
      console.warn('Database not ready in deleteNews');
      return false;
    }
    
    setLoading(true);
    try {
      if (hardDelete) {
        // 関連するレコードも削除する必要がある
        await db.query('BEGIN');
        await db.query('DELETE FROM tag WHERE news_id = $1', [newsId]);
        await db.query('DELETE FROM question WHERE record_id IN (SELECT record_id FROM record WHERE news_id = $1)', [newsId]);
        await db.query('DELETE FROM learning WHERE record_id IN (SELECT record_id FROM record WHERE news_id = $1)', [newsId]);
        await db.query('DELETE FROM record WHERE news_id = $1', [newsId]);
        await db.query('DELETE FROM news WHERE news_id = $1', [newsId]);
        await db.query('COMMIT');
        console.log('Hard delete successful');
      } else {
        // ソフトデリート
        await db.query(
          'UPDATE news SET is_deleted = TRUE WHERE news_id = $1',
          [newsId]
        );
        console.log('Soft delete successful');
      }
      return true;
    } catch (err) {
      await db?.query('ROLLBACK').catch(() => {});
      console.error('Delete news error:', err);
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  // お気に入り登録
  const toggleFavorite = useCallback(async (newsId: number) => {
    console.log('toggleFavorite called:', { newsId, db: !!db, isReady });
    
    if (!db || !isReady) {
      console.warn('Database not ready in toggleFavorite');
      return false;
    }
    
    setLoading(true);
    try {
      await db.query(
        'UPDATE news SET favorite = NOT favorite WHERE news_id = $1',
        [newsId]
      );
      console.log('Toggle favorite successful');
      return true;
    } catch (err) {
      console.error('Toggle favorite error:', err);
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  // デバッグ用の関数を追加
  const debugCheckData = useCallback(async () => {
    console.log('=== Debug Check Data ===');
    if (!db || !isReady) {
      console.warn('Database not ready for debug');
      return;
    }
    
    try {
      // テーブルの存在確認
      const tables = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      console.log('Available tables:', tables.rows);
      
      // newsテーブルの全データ
      const allNews = await db.query('SELECT * FROM news');
      console.log('All news data:', allNews.rows);
      
      // newsテーブルの構造
      const newsStructure = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'news'
        ORDER BY ordinal_position
      `);
      console.log('News table structure:', newsStructure.rows);
      
    } catch (err) {
      console.error('Debug check error:', err);
    }
  }, [db, isReady]);

  return {
    createNews,
    getNewsList,
    getNewsById,
    updateNews,
    deleteNews,
    toggleFavorite,
    loading,
    error,
    debugCheckData,
    isReady  // isReadyを公開
  };
};