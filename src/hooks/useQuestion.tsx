import { useState, useCallback } from 'react';
import { useDatabase } from './useDatabase';
import { type Question } from '../types/Question';

export const useQuestion = () => {
    const { db, isReady } = useDatabase();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const createQuestion = useCallback(async (question: Omit<Question, 'question_id' | 'created_at'>) => {
        if (!db || !isReady) return null;
        
        setLoading(true);
        try {
            const result = await db.query(
                `INSERT INTO question (record_id, question, is_deleted) 
                VALUES ($1, $2, $3) 
                RETURNING *`,
                [question.record_id, question.question, false] // is_deletedのデフォルト値を修正
            );
            return result.rows[0];
        } catch (err) {
            setError(err as Error);
            return null;
        } finally {
            setLoading(false);
        }
    }, [db, isReady]);

    const getQuestionsByRecordId = useCallback(async (recordId: number) => {
        if (!db || !isReady) return [];
        
        setLoading(true);
        try {
            const result = await db.query(
                `SELECT * FROM question 
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

    const getQuestionById = useCallback(async (questionId: number) => {
        if (!db || !isReady) return null;
        
        setLoading(true);
        try {
            const result = await db.query(
                'SELECT * FROM question WHERE question_id = $1',
                [questionId]
            );
            return result.rows[0] || null;
        } catch (err) {
            setError(err as Error);
            return null;
        } finally {
            setLoading(false);
        }
    }, [db, isReady]);

    const updateQuestion = useCallback(async (questionId: number, updates: Partial<Question>) => {
        if (!db || !isReady) return false;
        
        setLoading(true);
        try {
            const fields = Object.keys(updates).filter(key => !['question_id', 'record_id', 'created_at'].includes(key));
            const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
            const values = [questionId, ...fields.map(field => updates[field as keyof Question])];
            
            await db.query(
                `UPDATE question SET ${setClause} WHERE question_id = $1`,
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

    const deleteQuestion = useCallback(async (questionId: number, hardDelete = false) => {
        if (!db || !isReady) return false;
        
        setLoading(true);
        try {
            if (hardDelete) {
                await db.query('DELETE FROM question WHERE question_id = $1', [questionId]);
            } else {
                await db.query(
                    'UPDATE question SET is_deleted = TRUE WHERE question_id = $1',
                    [questionId]
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
        createQuestion,
        getQuestionsByRecordId,
        getQuestionById,
        updateQuestion,
        deleteQuestion,
        loading,
        error
    };
};