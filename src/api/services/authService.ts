import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import "dotenv/config";
import { prisma } from "../../db/client.js";
import type { UserRole } from "../../generated/prisma/client.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "15m") as string;
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required.");
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: number;   // user id
  role: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string; // raw — send to client, never store raw in DB
  expiresIn: number;    // seconds
}

// ── Password helpers ──────────────────────────────────────────────────────────

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
}

/** Returns expiry in seconds for the access token (derived from JWT_EXPIRES_IN). */
export function accessTokenExpiresIn(): number {
  const match = JWT_EXPIRES_IN.match(/^(\d+)(m|h|d|s)$/);
  if (!match) return 900;
  const [, num, unit] = match;
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return Number(num) * (multipliers[unit as string] ?? 60);
}

// ── Refresh token helpers ─────────────────────────────────────────────────────

/** Generate a cryptographically random raw refresh token. */
function generateRawToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

/** Hash the raw token with SHA-256 before storing in DB. */
function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Create and persist a refresh token for a given user. Returns the raw token to send to the client. */
export async function createRefreshToken(userId: number): Promise<string> {
  const raw = generateRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000);

  await prisma.refreshToken.create({
    data: { tokenHash, userId, expiresAt },
  });

  return raw;
}

/** Validate a raw refresh token. Returns the DB record if valid. Throws on invalid/expired/revoked. */
export async function validateRefreshToken(raw: string) {
  const tokenHash = hashToken(raw);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!record) throw new Error("INVALID_REFRESH_TOKEN");
  if (record.revokedAt) throw new Error("INVALID_REFRESH_TOKEN");
  if (record.expiresAt < new Date()) throw new Error("REFRESH_TOKEN_EXPIRED");

  return record;
}

/** Revoke a single refresh token by its raw value. */
export async function revokeRefreshToken(raw: string): Promise<void> {
  const tokenHash = hashToken(raw);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoke all refresh tokens for a user (logout-all-devices). */
export async function revokeAllUserTokens(userId: number): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Issue a complete token pair (access + refresh) for a user. */
export async function issueTokenPair(
  userId: number,
  role: UserRole
): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: userId, role });
  const refreshToken = await createRefreshToken(userId);
  return { accessToken, refreshToken, expiresIn: accessTokenExpiresIn() };
}
