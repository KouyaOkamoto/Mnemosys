import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { PGlite } from '@electric-sql/pglite';

interface DatabaseContextType {
  db: PGlite | null;
  isReady: boolean;
  error: Error | null;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

let globalDb: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<PGlite | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const initDatabase = async () => {
      if (globalDb) {
        setDb(globalDb);
        setIsReady(true);
        return;
      }

      if (initPromise) {
        try {
          const database = await initPromise;
          setDb(database);
          setIsReady(true);
        } catch (err) {
          setError(err as Error);
        }
        return;
      }

      initPromise = (async () => {
        try {
          console.log('Initializing database...');
          
          const database = new PGlite('idb://mnemosys-db', {
            debug: 1
          });

          await database.waitReady;
          console.log('Database connected');

          // テーブル作成
          await database.exec(`
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
          
          // 確認クエリ
          await database.query('SELECT 1');
          
          globalDb = database;
          return database;
        } catch (error) {
          console.error('Database initialization failed:', error);
          throw error;
        }
      })();

      try {
        const database = await initPromise;
        setDb(database);
        setIsReady(true);
        console.log('Database is ready for use');
      } catch (err) {
        setError(err as Error);
        setIsReady(false);
      }
    };

    initDatabase();
  }, []);

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <DatabaseContext.Provider value={{ db, isReady, error, refreshTrigger, triggerRefresh }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabaseContext = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabaseContext must be used within DatabaseProvider');
  }
  return context;
};