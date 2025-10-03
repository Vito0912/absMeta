import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { getSkipCacheFlag } from '../utils/requestContext'

export class DatabaseManager {
  private db: Database.Database

  constructor(dbPath: string = './data/cache.db') {
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    this.db = new Database(dbPath)
    this.initTables()
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS search_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_id TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        params_hash TEXT NOT NULL,
        response TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(provider_id, title, author, params_hash)
      );

      CREATE TABLE IF NOT EXISTS book_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_id TEXT NOT NULL,
        book_id TEXT NOT NULL,
        metadata TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(provider_id, book_id)
      );

      CREATE INDEX IF NOT EXISTS idx_search_cache_lookup 
        ON search_cache(provider_id, title, author, params_hash);

      CREATE INDEX IF NOT EXISTS idx_book_cache_lookup 
        ON book_cache(provider_id, book_id);
    `)
  }

  public getSearchCache(providerId: string, title: string, author: string | null, paramsHash: string): string | null {
    if (getSkipCacheFlag()) return null
    const stmt = this.db.prepare(`
      SELECT response FROM search_cache 
      WHERE provider_id = ? AND title = ? AND author IS ? AND params_hash = ?
    `)
    const row = stmt.get(providerId, title, author, paramsHash) as { response: string } | undefined
    return row?.response ?? null
  }

  public setSearchCache(
    providerId: string,
    title: string,
    author: string | null,
    paramsHash: string,
    response: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO search_cache (provider_id, title, author, params_hash, response, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    stmt.run(providerId, title, author, paramsHash, response, Date.now())
  }

  public getBookCache(providerId: string, bookId: string): string | null {
    if (getSkipCacheFlag()) return null
    const stmt = this.db.prepare(`
      SELECT metadata FROM book_cache 
      WHERE provider_id = ? AND book_id = ?
    `)
    const row = stmt.get(providerId, bookId) as { metadata: string } | undefined
    return row?.metadata ?? null
  }

  public setBookCache(providerId: string, bookId: string, metadata: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO book_cache (provider_id, book_id, metadata, created_at)
      VALUES (?, ?, ?, ?)
    `)
    stmt.run(providerId, bookId, metadata, Date.now())
  }

  public clearCache(providerId?: string): void {
    if (providerId) {
      this.db.prepare('DELETE FROM search_cache WHERE provider_id = ?').run(providerId)
      this.db.prepare('DELETE FROM book_cache WHERE provider_id = ?').run(providerId)
    } else {
      this.db.exec('DELETE FROM search_cache')
      this.db.exec('DELETE FROM book_cache')
    }
  }

  public close(): void {
    this.db.close()
  }
}

export const dbManager = new DatabaseManager()
