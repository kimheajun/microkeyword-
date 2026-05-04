import pg from "pg";
import crypto from "crypto";
import { readFileSync } from "fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

function encrypt(plain) {
  const key = crypto.createHash("sha256").update(env.KEY_ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

const ACCESS_LICENSE = "01000000006db701cdddf7f3b6cf6b017c1bc696ca8f5e5fc19ead88b81cb4ed2d38fb5c9f";
const SECRET_KEY = "AQAAAABttwHN3ffzts9rAXwbxpbKLIfzWXIJYiPj/Gj+XhX3lg==";
const CUSTOMER_ID = "4274328";
const ADMIN_EMAIL = "fifa825918@gmail.com";

const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const u = await pool.query("SELECT id, email, graduate_code FROM users WHERE email = $1", [ADMIN_EMAIL]);
if (u.rows.length === 0) {
  console.log(`❌ ${ADMIN_EMAIL} 가입 안 됨`);
  process.exit(1);
}
const user = u.rows[0];
console.log("✓ 사용자:", user.id, user.email, user.graduate_code);

await pool.query(
  `INSERT INTO user_keys (user_id, naver_access_license_enc, naver_secret_key_enc, naver_customer_id, verified_at)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (user_id) DO UPDATE SET
     naver_access_license_enc = EXCLUDED.naver_access_license_enc,
     naver_secret_key_enc = EXCLUDED.naver_secret_key_enc,
     naver_customer_id = EXCLUDED.naver_customer_id,
     verified_at = EXCLUDED.verified_at`,
  [user.id, encrypt(ACCESS_LICENSE), encrypt(SECRET_KEY), CUSTOMER_ID, Date.now()]
);
console.log("✓ 키 3개 등록 완료");

const k = await pool.query("SELECT naver_customer_id, verified_at FROM user_keys WHERE user_id = $1", [user.id]);
const row = k.rows[0];
console.log("✓ 검증:", row.naver_customer_id, "verified_at:", new Date(Number(row.verified_at)).toLocaleString());

await pool.end();
