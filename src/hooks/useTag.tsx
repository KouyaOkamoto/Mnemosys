import { useState, useCallback } from 'react';
import { useDatabase } from './useDatabase';
import type { Tag } from '../types/Tag';

export const useTag = () => {
  const { db, isReady } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addTag = useCallback(async (newsId: number, tag: string) => {
    if (!db || !isReady) return false;
    
    setLoading(true);
    try {
      await db.query(
        'INSERT INTO tag (news_id, news_tag, is_deleted) VALUES ($1, $2, FALSE)',
        [newsId, tag]
      );
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  const removeTag = useCallback(async (newsId: number, tag: string) => {
    if (!db || !isReady) return false;
    
    setLoading(true);
    try {
      await db.query(
        'UPDATE tag SET is_deleted = TRUE WHERE news_id = $1 AND news_tag = $2',
        [newsId, tag]
      );
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  const getTagsByNewsId = useCallback(async (newsId: number) => {
    if (!db || !isReady) return [];
    
    setLoading(true);
    try {
      const result = await db.query(
        'SELECT news_tag FROM tag WHERE news_id = $1 AND is_deleted = FALSE',
        [newsId]
      );
      return result.rows.map(row => (row as Tag).news_tag);
    } catch (err) {
      setError(err as Error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  const getNewsByTag = useCallback(async (tag: string) => {
    if (!db || !isReady) return [];
    
    setLoading(true);
    try {
      const result = await db.query(
        `SELECT n.* FROM news n 
         INNER JOIN tag t ON n.news_id = t.news_id 
         WHERE t.news_tag = $1 AND t.is_deleted = FALSE AND n.is_deleted = FALSE`,
        [tag]
      );
      return result.rows;
    } catch (err) {
      setError(err as Error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  const getAllTags = useCallback(async () : Promise<[string, number] | [] | unknown> => {
    if (!db || !isReady) return [];
    
    setLoading(true);
    try {
      const result = await db.query(
        `SELECT news_tag, COUNT(*) as count 
         FROM tag 
         WHERE is_deleted = FALSE 
         GROUP BY news_tag 
         ORDER BY count DESC`
      );
      return result.rows;
    } catch (err) {
      setError(err as Error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  return {
    addTag,
    removeTag,
    getTagsByNewsId,
    getNewsByTag,
    getAllTags,
    loading,
    error
  };
};