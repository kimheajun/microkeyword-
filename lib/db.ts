/**
 * Postgres 클라이언트 (Neon)
 *  - DATABASE_URL 환경변수로 연결
 *  - 첫 호출 시 스키마 자동 마이그레이션
 *  - 모든 호출 async
 */

import { Pool } from "pg";

let _pool: Pool | null = null;
let _migrated = false;

function makePool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 환경변수 없음 (Neon connection string)");
  return new Pool({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export function getPool(): Pool {
  if (!_pool) _pool = makePool();
  return _pool;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  graduate_code TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_keys (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  naver_access_license_enc TEXT,
  naver_secret_key_enc TEXT,
  naver_customer_id TEXT,
  verified_at BIGINT
);

CREATE TABLE IF NOT EXISTS analyze_cache (
  cache_key TEXT PRIMARY KEY,
  result_json TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_log (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  action TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_cache_created ON analyze_cache(created_at);
`;

export async function ensureMigrated() {
  if (_migrated) return;
  const pool = getPool();
  await pool.query(SCHEMA_SQL);
  _migrated = true;
}

// 편의 함수: 단일 row 조회
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  await ensureMigrated();
  const r = await getPool().query(sql, params);
  return (r.rows[0] as T) ?? null;
}

// 편의 함수: 다중 row 조회
export async function queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  await ensureMigrated();
  const r = await getPool().query(sql, params);
  return r.rows as T[];
}

// 편의 함수: 실행 (반환값 필요 없을 때)
export async function exec(sql: string, params: any[] = []): Promise<void> {
  await ensureMigrated();
  await getPool().query(sql, params);
}

// 편의 함수: INSERT...RETURNING
export async function execReturning<T = any>(sql: string, params: any[] = []): Promise<T> {
  await ensureMigrated();
  const r = await getPool().query(sql, params);
  return r.rows[0] as T;
}

// 사용자 모델 헬퍼
export interface User {
  id: number;
  email: string;
  password_hash: string;
  graduate_code: string;
  created_at: number;
}

export interface UserKeys {
  user_id: number;
  naver_access_license_enc: string | null;
  naver_secret_key_enc: string | null;
  naver_customer_id: string | null;
  verified_at: number | null;
}
