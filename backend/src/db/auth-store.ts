import crypto from 'node:crypto';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '../../../src/db/index.ts';
import {
  adminChallenges,
  appConfig,
  authAuditLogs,
  authSessions,
  authUsers
} from '../../../src/db/schema.ts';

export enum RbacRole {
  ADMIN = 'ADMIN',
  FACULTY = 'FACULTY',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT'
}

export interface AuthUserRecord {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role: RbacRole;
  isSuperAdmin: boolean;
  status: 'Active' | 'Inactive' | 'Suspended';
  totpEnabled: boolean;
  totpSecret: string;
  failedAttempts: number;
  lockedUntil: number | null;
  lastLogin: string | null;
  createdAt: string;
  createdBy: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  name: string;
  role: RbacRole;
  isSuperAdmin: boolean;
  jti: string;
  iat: number;
  exp: number;
}

export interface SafeUserView {
  id: string;
  name: string;
  username: string;
  email: string;
  role: RbacRole;
  isSuperAdmin: boolean;
  status: string;
  totpEnabled: boolean;
  lastLogin: string | null;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const SESSION_TTL_SECONDS = 30 * 60;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const RESET_TTL_MS = 10 * 60 * 1000;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

let cachedSecret: string | null = null;
let initPromise: Promise<void> | null = null;

function mapAuthUserRow(row: typeof authUsers.$inferSelect): AuthUserRecord {
  const upperRole = row.role.toUpperCase();
  const role =
    upperRole === RbacRole.ADMIN
      ? RbacRole.ADMIN
      : upperRole === RbacRole.FACULTY
        ? RbacRole.FACULTY
        : upperRole === RbacRole.PARENT
          ? RbacRole.PARENT
          : RbacRole.STUDENT;

  const status =
    row.status === 'Inactive' || row.status === 'Suspended' ? row.status : 'Active';

  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    passwordHash: row.passwordHash,
    role,
    isSuperAdmin: Boolean(row.isSuperAdmin),
    status,
    totpEnabled: Boolean(row.totpEnabled),
    totpSecret: row.totpSecret,
    failedAttempts: row.failedAttempts,
    lockedUntil: row.lockedUntil ?? null,
    lastLogin: row.lastLogin ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy
  };
}

async function resolveJwtSecretFromCloudSql(): Promise<string> {
  if (cachedSecret) {
    return cachedSecret;
  }
  const envSecret = process.env['JWT_SECRET']?.trim();
  if (envSecret && envSecret.length >= 16) {
    cachedSecret = envSecret;
    return cachedSecret;
  }

  const existing = await db
    .select({ value: appConfig.value })
    .from(appConfig)
    .where(eq(appConfig.key, 'jwt_secret'))
    .limit(1);

  if (existing[0]?.value && existing[0].value.length >= 32) {
    cachedSecret = existing[0].value;
    return cachedSecret;
  }

  const generated = crypto.randomBytes(48).toString('hex');
  await db
    .insert(appConfig)
    .values({ key: 'jwt_secret', value: generated })
    .onConflictDoNothing({ target: appConfig.key });

  const stored = await db
    .select({ value: appConfig.value })
    .from(appConfig)
    .where(eq(appConfig.key, 'jwt_secret'))
    .limit(1);

  cachedSecret = stored[0]?.value || generated;
  return cachedSecret;
}

export function getJwtSecret(): string {
  if (cachedSecret) {
    return cachedSecret;
  }
  const envSecret = process.env['JWT_SECRET']?.trim();
  if (envSecret && envSecret.length >= 16) {
    cachedSecret = envSecret;
    return cachedSecret;
  }
  cachedSecret = crypto.randomBytes(48).toString('hex');
  return cachedSecret;
}

async function bootstrapEnvAdmin(): Promise<void> {
  const email = process.env['ADMIN_BOOTSTRAP_EMAIL']?.trim().toLowerCase();
  const password = process.env['ADMIN_BOOTSTRAP_PASSWORD'];
  const name = process.env['ADMIN_BOOTSTRAP_NAME']?.trim() || 'System Administrator';
  if (!email || !password) {
    return;
  }

  const existing = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(sql`lower(${authUsers.email}) = ${email}`)
    .limit(1);

  if (existing.length > 0) {
    return;
  }

  const username = email.split('@')[0].replace(/[^a-z0-9_]/gi, '_').toLowerCase() || 'admin_eduerp';
  const totpSecret = process.env['ADMIN_TOTP_SECRET']?.trim().toUpperCase() || generateBase32Secret();

  await db
    .insert(authUsers)
    .values({
      id: `usr-adm-${crypto.randomUUID().slice(0, 8)}`,
      name,
      username,
      email,
      passwordHash: hashPassword(password),
      role: RbacRole.ADMIN,
      isSuperAdmin: true,
      status: 'Active',
      totpEnabled: true,
      totpSecret,
      failedAttempts: 0,
      lockedUntil: null,
      lastLogin: null,
      createdAt: new Date().toISOString(),
      createdBy: 'env-bootstrap'
    })
    .onConflictDoNothing();
}

export async function ensureAuthReady(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await resolveJwtSecretFromCloudSql();
      await bootstrapEnvAdmin();
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
}

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(plain: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) {
    return false;
  }
  const expectedBuf = Buffer.from(hashHex, 'hex');
  const actualBuf = crypto.scryptSync(plain, salt, 64);
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function validateStrongPassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one digit.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}

export function generateBase32Secret(length = 20): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += BASE32_ALPHABET[bytes[i] % 32];
  }
  return out;
}

function base32ToBuffer(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const ch of clean) {
    const val = BASE32_ALPHABET.indexOf(ch);
    if (val >= 0) {
      bits += val.toString(2).padStart(5, '0');
    }
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpCode(secret: string, counterOffset = 0): string {
  const key = base32ToBuffer(secret);
  const step = Math.floor(Date.now() / 1000 / 30) + counterOffset;
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotpCode(secret: string, code: string): boolean {
  const sanitized = code.trim();
  if (!/^\d{6}$/.test(sanitized) || !secret) {
    return false;
  }
  for (const offset of [-1, 0, 1]) {
    const expected = generateTotpCode(secret, offset);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sanitized))) {
      return true;
    }
  }
  return false;
}

export function buildTotpUri(email: string, secret: string): string {
  const issuer = encodeURIComponent(process.env['ADMIN_TOTP_ISSUER']?.trim() || 'EduERP');
  const account = encodeURIComponent(email);
  return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

function hashOtp(challengeId: string, otp: string): string {
  return crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${challengeId}:${otp.trim()}`)
    .digest('hex');
}

function toBase64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_TTL_SECONDS
  };
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(fullPayload));
  const sig = toBase64Url(
    crypto.createHmac('sha256', getJwtSecret()).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token: string): { valid: true; payload: JwtPayload } | { valid: false; reason: 'EXPIRED' | 'INVALID' } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'INVALID' };
  }
  const [header, body, sig] = parts;
  const expectedSig = toBase64Url(
    crypto.createHmac('sha256', getJwtSecret()).update(`${header}.${body}`).digest()
  );
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'INVALID' };
  }
  try {
    const parsed = JSON.parse(fromBase64Url(body)) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!parsed.exp || parsed.exp <= now) {
      return { valid: false, reason: 'EXPIRED' };
    }
    if (!parsed.sub || !parsed.role || !parsed.jti) {
      return { valid: false, reason: 'INVALID' };
    }
    return { valid: true, payload: parsed };
  } catch {
    return { valid: false, reason: 'INVALID' };
  }
}

export function signChallengeToken(challengeId: string, userId: string, purpose: 'LOGIN_2FA' | 'PASSWORD_RESET'): string {
  const exp = Date.now() + (purpose === 'LOGIN_2FA' ? CHALLENGE_TTL_MS : RESET_TTL_MS);
  const body = toBase64Url(JSON.stringify({ cid: challengeId, uid: userId, purpose, exp }));
  const sig = toBase64Url(
    crypto.createHmac('sha256', getJwtSecret()).update(`chl.${body}`).digest()
  );
  return `${body}.${sig}`;
}

export function verifyChallengeToken(
  token: string,
  expectedPurpose: 'LOGIN_2FA' | 'PASSWORD_RESET'
): { cid: string; uid: string; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expectedSig = toBase64Url(
    crypto.createHmac('sha256', getJwtSecret()).update(`chl.${body}`).digest()
  );
  if (sig.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return null;
  }
  try {
    const parsed = JSON.parse(fromBase64Url(body)) as { cid: string; uid: string; purpose: string; exp: number };
    if (parsed.purpose !== expectedPurpose || !parsed.exp || parsed.exp <= Date.now()) {
      return null;
    }
    return { cid: parsed.cid, uid: parsed.uid, exp: parsed.exp };
  } catch {
    return null;
  }
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

export function toSafeUser(u: AuthUserRecord): SafeUserView {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    role: u.role,
    isSuperAdmin: u.isSuperAdmin,
    status: u.status,
    totpEnabled: u.totpEnabled,
    lastLogin: u.lastLogin
  };
}

export async function findAuthUserByEmail(email: string): Promise<AuthUserRecord | null> {
  await ensureAuthReady();
  const cleanEmail = email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(authUsers)
    .where(sql`lower(${authUsers.email}) = ${cleanEmail}`)
    .limit(1);
  return rows[0] ? mapAuthUserRow(rows[0]) : null;
}

export async function findActiveAdminByEmail(email: string): Promise<AuthUserRecord | null> {
  await ensureAuthReady();
  const cleanEmail = email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(authUsers)
    .where(
      and(
        sql`lower(${authUsers.email}) = ${cleanEmail}`,
        eq(authUsers.role, RbacRole.ADMIN),
        eq(authUsers.status, 'Active')
      )
    )
    .limit(1);
  return rows[0] ? mapAuthUserRow(rows[0]) : null;
}

export async function findAuthUserById(id: string): Promise<AuthUserRecord | null> {
  await ensureAuthReady();
  const rows = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.id, id))
    .limit(1);
  return rows[0] ? mapAuthUserRow(rows[0]) : null;
}

export async function findAuthUserByUsername(username: string): Promise<AuthUserRecord | null> {
  await ensureAuthReady();
  const clean = username.trim().toLowerCase();
  const rows = await db
    .select()
    .from(authUsers)
    .where(sql`lower(${authUsers.username}) = ${clean}`)
    .limit(1);
  return rows[0] ? mapAuthUserRow(rows[0]) : null;
}

export async function insertPublicAuthUser(input: {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role: RbacRole;
  createdAt: string;
}): Promise<void> {
  await ensureAuthReady();
  await db.insert(authUsers).values({
    id: input.id,
    name: input.name,
    username: input.username,
    email: input.email,
    passwordHash: input.passwordHash,
    role: input.role,
    isSuperAdmin: false,
    status: 'Active',
    totpEnabled: false,
    totpSecret: '',
    failedAttempts: 0,
    lockedUntil: null,
    lastLogin: null,
    createdAt: input.createdAt,
    createdBy: 'public-register'
  });
}

export async function resetAdminFailedAttempts(userId: string): Promise<void> {
  await ensureAuthReady();
  await db
    .update(authUsers)
    .set({ failedAttempts: 0, lockedUntil: null })
    .where(eq(authUsers.id, userId));
}

export async function updateAdminPassword(userId: string, passwordHash: string): Promise<void> {
  await ensureAuthReady();
  await db
    .update(authUsers)
    .set({ passwordHash, failedAttempts: 0, lockedUntil: null })
    .where(eq(authUsers.id, userId));
}

export async function findChallengeByIdAndUser(
  challengeId: string,
  userId: string
): Promise<{ used: boolean; expiresAt: number } | null> {
  await ensureAuthReady();
  const rows = await db
    .select({ used: adminChallenges.used, expiresAt: adminChallenges.expiresAt })
    .from(adminChallenges)
    .where(and(eq(adminChallenges.id, challengeId), eq(adminChallenges.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findLatestActivePasswordResetChallenge(
  userId: string
): Promise<{ id: string } | null> {
  await ensureAuthReady();
  const rows = await db
    .select({ id: adminChallenges.id })
    .from(adminChallenges)
    .where(
      and(
        eq(adminChallenges.userId, userId),
        eq(adminChallenges.purpose, 'PASSWORD_RESET'),
        eq(adminChallenges.used, false)
      )
    )
    .orderBy(desc(adminChallenges.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function markChallengeUsed(challengeId: string): Promise<void> {
  await ensureAuthReady();
  await db
    .update(adminChallenges)
    .set({ used: true })
    .where(eq(adminChallenges.id, challengeId));
}

export async function listAuthUsers(): Promise<SafeUserView[]> {
  await ensureAuthReady();
  const rows = await db
    .select()
    .from(authUsers)
    .orderBy(desc(authUsers.createdAt));
  return rows.map((row) => toSafeUser(mapAuthUserRow(row)));
}

export async function listAuthAuditLogs(limitCount = 100) {
  await ensureAuthReady();
  return db
    .select({
      id: authAuditLogs.id,
      user_id: authAuditLogs.userId,
      email: authAuditLogs.email,
      role: authAuditLogs.role,
      event: authAuditLogs.event,
      status: authAuditLogs.status,
      ip: authAuditLogs.ip,
      details: authAuditLogs.details,
      created_at: authAuditLogs.createdAt
    })
    .from(authAuditLogs)
    .orderBy(desc(authAuditLogs.createdAt))
    .limit(limitCount);
}

export async function logAudit(entry: {
  userId?: string;
  email?: string;
  role?: string;
  event: string;
  status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  ip?: string;
  details?: string;
}): Promise<void> {
  try {
    await ensureAuthReady();
    await db.insert(authAuditLogs).values({
      id: `aud-${crypto.randomUUID().slice(0, 10)}`,
      userId: entry.userId ?? null,
      email: entry.email ?? null,
      role: entry.role ?? null,
      event: entry.event,
      status: entry.status,
      ip: entry.ip ?? '127.0.0.1',
      details: entry.details ?? '',
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to persist auth audit log to Cloud SQL:', err);
  }
}

function dispatchOtpToServerLog(email: string, otp: string, purpose: 'LOGIN_2FA' | 'PASSWORD_RESET'): void {
  console.info(`[${new Date().toISOString()}] [EduERP Mailer] purpose=${purpose} to=${email} otp=${otp}`);
}

export async function issueOtpChallenge(
  user: AuthUserRecord,
  purpose: 'LOGIN_2FA' | 'PASSWORD_RESET'
): Promise<{ challengeId: string; challengeToken: string; expiresInSeconds: number }> {
  await ensureAuthReady();
  const ttlMs = purpose === 'LOGIN_2FA' ? CHALLENGE_TTL_MS : RESET_TTL_MS;
  const challengeId = `chl-${crypto.randomUUID()}`;
  const otp = String(crypto.randomInt(100000, 999999));
  const otpHash = hashOtp(challengeId, otp);

  // Invalidate prior unused challenges for the same user & purpose
  await db
    .update(adminChallenges)
    .set({ used: true })
    .where(
      and(
        eq(adminChallenges.userId, user.id),
        eq(adminChallenges.purpose, purpose),
        eq(adminChallenges.used, false)
      )
    );

  await db.insert(adminChallenges).values({
    id: challengeId,
    userId: user.id,
    purpose,
    otpHash,
    expiresAt: Date.now() + ttlMs,
    attempts: 0,
    used: false,
    createdAt: new Date().toISOString()
  });

  dispatchOtpToServerLog(user.email, otp, purpose);
  const challengeToken = signChallengeToken(challengeId, user.id, purpose);

  return {
    challengeId,
    challengeToken,
    expiresInSeconds: Math.floor(ttlMs / 1000)
  };
}

export async function verifyOtpChallengeCode(
  challengeId: string,
  userId: string,
  purpose: 'LOGIN_2FA' | 'PASSWORD_RESET',
  code: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  await ensureAuthReady();
  const rows = await db
    .select()
    .from(adminChallenges)
    .where(
      and(
        eq(adminChallenges.id, challengeId),
        eq(adminChallenges.userId, userId),
        eq(adminChallenges.purpose, purpose)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row || row.used) {
    return { ok: false, message: 'Verification challenge is invalid or has already been used.' };
  }
  if (row.expiresAt <= Date.now()) {
    await markChallengeUsed(challengeId);
    return { ok: false, message: 'Verification code has expired. Please request a new one.' };
  }
  if (row.attempts >= MAX_FAILED_ATTEMPTS) {
    await markChallengeUsed(challengeId);
    return { ok: false, message: 'Too many invalid verification attempts. Please start again.' };
  }

  const candidateHash = hashOtp(challengeId, code);
  const valid =
    candidateHash.length === row.otpHash.length &&
    crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(row.otpHash));

  if (!valid) {
    await db
      .update(adminChallenges)
      .set({ attempts: sql`${adminChallenges.attempts} + 1` })
      .where(eq(adminChallenges.id, challengeId));
    return { ok: false, message: 'Invalid 6-digit verification code.' };
  }

  await markChallengeUsed(challengeId);
  return { ok: true };
}

export async function createSession(
  user: AuthUserRecord,
  userAgent = ''
): Promise<{ token: string; expiresAt: number; jti: string }> {
  await ensureAuthReady();
  const jti = `ses-${crypto.randomUUID()}`;
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const nowIso = new Date().toISOString();

  await db.insert(authSessions).values({
    id: jti,
    userId: user.id,
    role: user.role,
    expiresAt,
    revoked: false,
    createdAt: nowIso,
    userAgent: userAgent.slice(0, 200)
  });

  await db
    .update(authUsers)
    .set({ lastLogin: nowIso, failedAttempts: 0, lockedUntil: null })
    .where(eq(authUsers.id, user.id));

  const token = signJwt({
    sub: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    jti
  });

  return { token, expiresAt, jti };
}

export async function isSessionActive(jti: string, userId: string): Promise<boolean> {
  await ensureAuthReady();
  const rows = await db
    .select({ revoked: authSessions.revoked, expiresAt: authSessions.expiresAt })
    .from(authSessions)
    .where(and(eq(authSessions.id, jti), eq(authSessions.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row || row.revoked) return false;
  return row.expiresAt > Date.now();
}

export async function revokeSession(jti: string): Promise<void> {
  await ensureAuthReady();
  await db
    .update(authSessions)
    .set({ revoked: true })
    .where(eq(authSessions.id, jti));
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await ensureAuthReady();
  await db
    .update(authSessions)
    .set({ revoked: true })
    .where(eq(authSessions.userId, userId));
}

export async function recordFailedAdminAttempt(
  user: AuthUserRecord
): Promise<{ locked: boolean; remaining: number }> {
  await ensureAuthReady();
  const nextAttempts = user.failedAttempts + 1;
  if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_MS;
    await db
      .update(authUsers)
      .set({ failedAttempts: nextAttempts, lockedUntil })
      .where(eq(authUsers.id, user.id));
    return { locked: true, remaining: 0 };
  }
  await db
    .update(authUsers)
    .set({ failedAttempts: nextAttempts })
    .where(eq(authUsers.id, user.id));
  return { locked: false, remaining: MAX_FAILED_ATTEMPTS - nextAttempts };
}

export async function createAdminUserInDb(input: {
  name: string;
  email: string;
  username: string;
  password: string;
  isSuperAdmin?: boolean;
  createdBy?: string;
}): Promise<{ ok: true; user: SafeUserView; totpSecret: string; totpUri: string } | { ok: false; error: string }> {
  await ensureAuthReady();
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanUsername = input.username.trim().toLowerCase();
  const cleanName = input.name.trim();

  if (!cleanEmail || !cleanUsername || !cleanName) {
    return { ok: false, error: 'Name, email, and username are required.' };
  }

  const strengthErr = validateStrongPassword(input.password);
  if (strengthErr) {
    return { ok: false, error: strengthErr };
  }

  const dup = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(
      or(
        sql`lower(${authUsers.email}) = ${cleanEmail}`,
        sql`lower(${authUsers.username}) = ${cleanUsername}`
      )
    )
    .limit(1);

  if (dup.length > 0) {
    return { ok: false, error: 'An account with this email or username already exists.' };
  }

  const totpSecret = generateBase32Secret();
  const id = `usr-adm-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const isSuper = Boolean(input.isSuperAdmin);

  const inserted = await db
    .insert(authUsers)
    .values({
      id,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: hashPassword(input.password),
      role: RbacRole.ADMIN,
      isSuperAdmin: isSuper,
      status: 'Active',
      totpEnabled: true,
      totpSecret,
      failedAttempts: 0,
      lockedUntil: null,
      lastLogin: null,
      createdAt: now,
      createdBy: input.createdBy || 'admin'
    })
    .returning();

  return {
    ok: true,
    user: toSafeUser(mapAuthUserRow(inserted[0])),
    totpSecret,
    totpUri: buildTotpUri(cleanEmail, totpSecret)
  };
}
