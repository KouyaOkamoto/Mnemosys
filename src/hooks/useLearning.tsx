import { useState, useCallback } from 'react';
import { useDatabase } from './useDatabase';
import { type Learning } from '../types/Learning';

export const useLearning = () => {
    const { db, isReady } = useDatabase();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const createLearning = useCallback(async (learning: Omit<Learning, 'learning_id' | 'created_at'>) => {
        if (!db || !isReady) return null;
        
        setLoading(true);
        try {
            const result = await db.query(
                `INSERT INTO learning (record_id, learning, is_deleted) 
                VALUES ($1, $2, $3) 
                RETURNING *`,
                [learning.record_id, learning.learning, false] // is_deletedのデフォルト値を修正
            );
            return result.rows[0];
        } catch (err) {
            setError(err as Error);
            return null;
        } finally {
            setLoading(false);
        }
    }, [db, isReady]);

    const getLearningsByRecordId = useCallback(async (recordId: number) => {
        if (!db || !isReady) return [];
        
        setLoading(true);
        try {
            const result = await db.query(
                `SELECT * FROM learning 
                WHERE record_id = $1 AND is_deleted = FALSE 
                ORDER BY created_at DESC`,
                [recordId]
            );
            return result.rows;
        } catch (err) {
            setError(err as Error);
            return [];
        } finally {
            setLoading(false);
        }
    }, [db, isReady]);

    const getLearningById = useCallback(async (learningId: number) => {
        if (!db || !isReady) return null;
        
        setLoading(true);
        try {
            const result = await db.query(
                'SELECT * FROM learning WHERE learning_id = $1',
                [learningId]
            );
            return result.rows[0] || null;
        } catch (err) {
            setError(err as Error);
            return null;
        } finally {
            setLoading(false);
        }
    }, [db, isReady]);

    const updateLearning = useCallback(async (learningId: number, updates: Partial<Learning>) => {
        if (!db || !isReady) return false;
        
        setLoading(true);
        try {
            const fields = Object.keys(updates).filter(key => !['learning_id', 'record_id', 'created_at'].includes(key));
            const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
            const values = [learningId, ...fields.map(field => updates[field as keyof Learning])];
            
            await db.query(
                `UPDATE learning SET ${setClause} WHERE learning_id = $1`,
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

    const deleteLearning = useCallback(async (learningId: number, hardDelete = false) => {
        if (!db || !isReady) return false;
        
        setLoading(true);
        try {
            if (hardDelete) {
                await db.query('DELETE FROM learning WHERE learning_id = $1', [learningId]);
            } else {
                await db.query(
                    'UPDATE learning SET is_deleted = TRUE WHERE learning_id = $1',
                    [learningId]
                );
            }
            return true;
        } catch (err) {
            setError(err as Error);
            return false;
        } finally {
            setLoading(false);
        }
    }, [db, isReady]);

    return {
        createLearning,
        getLearningsByRecordId,
        getLearningById,
        updateLearning,
        deleteLearning,
        loading,
        error
    };
};