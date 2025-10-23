import * as SQLite from 'expo-sqlite';

/**
 * Database initialization and schema management
 */

const DATABASE_NAME = 'alarms.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Get or initialize the database connection
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await initializeDatabase(db);
  return db;
}

/**
 * Initialize database schema
 */
async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY NOT NULL,
      time TEXT NOT NULL,
      label TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      repeatDays TEXT NOT NULL,
      notificationId TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_alarms_enabled ON alarms(enabled);
    CREATE INDEX IF NOT EXISTS idx_alarms_time ON alarms(time);
    CREATE INDEX IF NOT EXISTS idx_alarms_label ON alarms(label);
  `);
}

/**
 * Close the database connection (useful for testing)
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}

/**
 * Clear all data (useful for testing)
 */
export async function clearDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync('DELETE FROM alarms;');
}
