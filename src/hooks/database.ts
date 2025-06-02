import { useState, useEffect, useRef } from 'react';
import { PGlite } from '@electric-sql/pglite';

// グローバルなデータベースインスタンス
let globalDb: PGlite | null = null;
let initializationPromise: Promise<PGlite> | null = null;

// データベースの初期化を管理する関数
const initializeDatabase = async (): Promise<PGlite> => {
    // すでに初期化済みの場合は既存のインスタンスを返す
    if (globalDb) {
        console.log('Returning existing database instance');
        return globalDb;
    }

    // 初期化中の場合は、その Promise を返す
    if (initializationPromise) {
        console.log('Waiting for ongoing initialization');
        return initializationPromise;
    }

    // 新規初期化
    initializationPromise = (async () => {
        try {
            console.log('Starting database initialization...');
            
            const db = new PGlite('idb://mnemosys-db', {
                // デバッグモードを有効化
                debug: 1
            });

            // データベースの初期化を待つ
            await db.waitReady;
            console.log('Database ready');

            // テーブル作成
            await db.exec(`
                CREATE TABLE IF NOT EXISTS news (
                    news_id SERIAL PRIMARY KEY,
                    title TEXT NOT NULL,
                    favorite BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    update_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    url TEXT NOT NULL,
                    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
                );

                CREATE TABLE IF NOT EXISTS record (
                    record_id SERIAL PRIMARY KEY,
                    news_id INTEGER NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    summary TEXT NOT NULL,
                    memo TEXT,
                    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                    CONSTRAINT record_news_FK FOREIGN KEY (news_id) REFERENCES news(news_id)
                );

                CREATE TABLE IF NOT EXISTS tag (
                    news_id INTEGER NOT NULL,
                    news_tag VARCHAR(64) NOT NULL,
                    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                    CONSTRAINT tag_news_FK FOREIGN KEY (news_id) REFERENCES news(news_id),
                    CONSTRAINT tag_PKC PRIMARY KEY (news_id, news_tag)
                );

                CREATE TABLE IF NOT EXISTS question (
                    question_id SERIAL PRIMARY KEY,
                    record_id INTEGER NOT NULL,
                    question VARCHAR(256) NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                    CONSTRAINT question_record_FK FOREIGN KEY (record_id) REFERENCES record(record_id)
                );

                CREATE TABLE IF NOT EXISTS learning (
                    learning_id SERIAL PRIMARY KEY,
                    record_id INTEGER NOT NULL,
                    learning VARCHAR(256) NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
                    CONSTRAINT learning_record_FK FOREIGN KEY (record_id) REFERENCES record(record_id)
                );

                -- インデックス作成
                CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at);
                CREATE INDEX IF NOT EXISTS idx_news_is_deleted ON news(is_deleted);
                CREATE INDEX IF NOT EXISTS idx_record_news_id ON record(news_id);
                CREATE INDEX IF NOT EXISTS idx_tag_news_id ON tag(news_id);
                CREATE INDEX IF NOT EXISTS idx_question_record_id ON question(record_id);
                CREATE INDEX IF NOT EXISTS idx_learning_record_id ON learning(record_id);
            `);

            console.log('Tables created successfully');

            // デバッグ: テーブルの確認
            const tables = await db.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `);
            console.log('Available tables:', tables.rows);

            // デバッグ: newsテーブルの構造確認
            const newsColumns = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'news'
            `);
            console.log('News table columns:', newsColumns.rows);

            globalDb = db;
            return db;
        } catch (error) {
            console.error('Database initialization failed:', error);
            initializationPromise = null;
            throw error;
        }
    })();

    return initializationPromise;
};

export const useDatabase = () => {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const dbRef = useRef<PGlite | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                const db = await initializeDatabase();
                dbRef.current = db;
                setIsReady(true);
                console.log('useDatabase: Database is ready');
            } catch (err) {
                console.error('useDatabase: Initialization error:', err);
                setError(err as Error);
            }
        };

        init();
    }, []);

    return { db: dbRef.current, isReady, error };
};