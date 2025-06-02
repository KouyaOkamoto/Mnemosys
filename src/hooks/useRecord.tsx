import { useState, useCallback } from 'react';
import { useDatabase } from './useDatabase';
import { type Record } from '../types/Record';

export const useRecord = () => {
  const { db, isReady } = useDatabase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createRecord = useCallback(async (record: Omit<Record, 'record_id' | 'created_at'>) => {
    if (!db || !isReady) return null;
    
    setLoading(true);
    try {
      const result = await db.query(
        `INSERT INTO record (news_id, summary, memo, is_deleted) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [record.news_id, record.summary, record.memo || null, false]
      );
      return result.rows[0];
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  const getRecordsByNewsId = useCallback(async (newsId: number) : Promise<[Record] | [] | unknown> => {
    if (!db || !isReady) return [];
    
    setLoading(true);
    try {
      const result = await db.query(
        'SELECT * FROM record WHERE news_id = $1 AND is_deleted = FALSE ORDER BY created_at DESC',
        [newsId]
      );
      return result.rows;
    } catch (err) {
      setError(err as Error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  const updateRecord = useCallback(async (recordId: number, updates: Partial<Record>) => {
    if (!db || !isReady) return false;
    
    setLoading(true);
    try {
      const fields = Object.keys(updates).filter(key => !['record_id', 'news_id', 'created_at'].includes(key));
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      const values = [recordId, ...fields.map(field => updates[field as keyof Record])];
      
      await db.query(
        `UPDATE record SET ${setClause} WHERE record_id = $1`,
        values
      );
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  const deleteRecord = useCallback(async (recordId: number, hardDelete = false) => {
    if (!db || !isReady) return false;
    
    setLoading(true);
    try {
      if (hardDelete) {
        await db.query('BEGIN');
        await db.query('DELETE FROM question WHERE record_id = $1', [recordId]);
        await db.query('DELETE FROM learning WHERE record_id = $1', [recordId]);
        await db.query('DELETE FROM record WHERE record_id = $1', [recordId]);
        await db.query('COMMIT');
      } else {
        await db.query(
          'UPDATE record SET is_deleted = TRUE WHERE record_id = $1',
          [recordId]
        );
      }
      return true;
    } catch (err) {
      await db?.query('ROLLBACK');
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [db, isReady]);

  return {
    createRecord,
    getRecordsByNewsId,
    updateRecord,
    deleteRecord,
    loading,
    error
  };
};