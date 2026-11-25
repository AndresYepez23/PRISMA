import { DatabaseSync } from 'node:sqlite';

// Execute the real UPSERT against SQLite, the SQL engine used by D1.
export function rateDB(t) {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE ai_rate_limits(scope TEXT, window_start INTEGER, request_count INTEGER, PRIMARY KEY(scope,window_start))');
  t?.after(() => db.close());
  return { prepare(sql) { return { bind(...args) { return {
    async first() { return db.prepare(sql).get(...args) || null; },
    async run() { return db.prepare(sql).run(...args); }
  }; } }; } };
}
