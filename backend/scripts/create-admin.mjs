#!/usr/bin/env node
import 'dotenv/config';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { Pool } from 'pg';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function generateBase32Secret(length = 20) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += BASE32_ALPHABET[bytes[i] % 32];
  }
  return out;
}

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function validateStrongPassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character.';
  return null;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      args[key] = val;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let email = args.email || '';
  let name = args.name || 'System Administrator';
  let username = args.username || '';
  let password = args.password || '';
  const isSuperAdmin = args.super !== 'false';

  if (!email || !password) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!email) email = (await rl.question('Admin Email: ')).trim();
    if (!name || args.name === undefined) {
      const enteredName = (await rl.question(`Full Name [${name}]: `)).trim();
      if (enteredName) name = enteredName;
    }
    if (!password) password = await rl.question('Strong Password (min 8 chars, upper/lower/digit/symbol): ');
    rl.close();
  }

  email = email.trim().toLowerCase();
  if (!email.includes('@')) {
    console.error('Error: Valid email address is required.');
    process.exit(1);
  }
  const strengthErr = validateStrongPassword(password);
  if (strengthErr) {
    console.error(`Error: ${strengthErr}`);
    process.exit(1);
  }

  username = (username || email.split('@')[0]).replace(/[^a-z0-9_]/gi, '_').toLowerCase();

  const pool = new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER || process.env.SQL_ADMIN_USER,
    password: process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD,
    database: process.env.SQL_DB_NAME
  });

  try {
    const existingRes = await pool.query(
      'SELECT id, totp_secret FROM auth_users WHERE lower(email) = $1 LIMIT 1',
      [email]
    );
    const existing = existingRes.rows[0];
    const passwordHash = hashPassword(password);
    const totpSecret = (existing && existing.totp_secret) || generateBase32Secret();

    if (existing) {
      await pool.query(
        `UPDATE auth_users
         SET name = $1, password_hash = $2, role = 'ADMIN', is_super_admin = $3, status = 'Active',
             totp_enabled = TRUE, totp_secret = $4, failed_attempts = 0, locked_until = NULL
         WHERE id = $5`,
        [name, passwordHash, isSuperAdmin, totpSecret, existing.id]
      );
      console.log(`Updated existing ADMIN account in Cloud SQL: ${email}`);
    } else {
      const id = `usr-adm-${crypto.randomUUID().slice(0, 8)}`;
      await pool.query(
        `INSERT INTO auth_users (
          id, name, username, email, password_hash, role, is_super_admin,
          status, totp_enabled, totp_secret, failed_attempts, locked_until,
          last_login, created_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, 'ADMIN', $6, 'Active', TRUE, $7, 0, NULL, NULL, $8, 'cli-provisioner')`,
        [id, name, username, email, passwordHash, isSuperAdmin, totpSecret, new Date().toISOString()]
      );
      console.log(`Created ADMIN account in Cloud SQL: ${email}`);
    }

    const issuer = encodeURIComponent(process.env.ADMIN_TOTP_ISSUER || 'EduERP');
    const otpauthUri = `otpauth://totp/${issuer}:${encodeURIComponent(email)}?secret=${totpSecret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    console.log(`Authenticator Secret (Base32): ${totpSecret}`);
    console.log(`Authenticator URI: ${otpauthUri}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
