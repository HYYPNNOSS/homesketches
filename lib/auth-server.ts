/**
 * Accounts on Neon Postgres, used by app/api/auth/* (server only).
 * Compatible with the former NestJS API: same `users` table, bcrypt hashes,
 * HS256 JWT { sub, email } signed with JWT_SECRET, so existing accounts and
 * signed-in sessions keep working.
 */
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

export type PublicUser = { id: string; name: string; email: string };
type UserRow = PublicUser & { passwordHash: string };

export class HttpError extends Error {
  constructor(public status: number, message: string | string[]) {
    super(Array.isArray(message) ? message.join(". ") : message);
    this.messages = Array.isArray(message) ? message : [message];
  }
  messages: string[];
}

let client: ReturnType<typeof neon> | null = null;
function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new HttpError(503, "Accounts are not configured. Set DATABASE_URL.");
  client ??= neon(url);
  return client;
}

function secret(): Uint8Array {
  const value = process.env.JWT_SECRET;
  if (!value) throw new HttpError(503, "Accounts are not configured. Set JWT_SECRET.");
  return new TextEncoder().encode(value);
}

const pub = (u: PublicUser): PublicUser => ({ id: u.id, name: u.name, email: u.email });

// ── Validation (same rules as the old DTOs) ────────────────────────────────
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function readEmail(v: unknown): string {
  const email = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) throw new HttpError(400, "email must be an email");
  return email;
}
export function readPassword(v: unknown, checkMax = true): string {
  if (typeof v !== "string" || v.length < 8) throw new HttpError(400, "password must be longer than or equal to 8 characters");
  if (checkMax && v.length > 128) throw new HttpError(400, "password must be shorter than or equal to 128 characters");
  return v;
}
export function readName(v: unknown): string {
  const name = typeof v === "string" ? v.trim() : "";
  if (name.length < 2) throw new HttpError(400, "name must be longer than or equal to 2 characters");
  if (name.length > 80) throw new HttpError(400, "name must be shorter than or equal to 80 characters");
  return name;
}

// ── Tokens ──────────────────────────────────────────────────────────────────
export async function issueToken(user: PublicUser) {
  const accessToken = await new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
    .sign(secret());
  return { accessToken, user: pub(user) };
}

export async function requireUserId(req: NextRequest): Promise<string> {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, "Unauthorized");
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") throw new Error("no subject");
    return payload.sub;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(401, "Unauthorized");
  }
}

// ── Users ───────────────────────────────────────────────────────────────────
// Used when the email doesn't exist, so a failed login takes as long either way.
const DUMMY_HASH = "$2b$12$uKJMQIsyvR7X41t.Vu0zse.iQq/pm3Yr3qXAGs8Lyzy1TzG9HtvUy";

export async function register(name: string, email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  const rows = await sql()`
    insert into users (id, name, email, "passwordHash", "createdAt")
    values (${crypto.randomUUID()}, ${name}, ${email}, ${passwordHash}, now())
    on conflict (email) do nothing
    returning id, name, email` as PublicUser[];
  if (!rows.length) throw new HttpError(409, "An account with this email already exists");
  return issueToken(rows[0]);
}

export async function login(email: string, password: string) {
  const rows = await sql()`select id, name, email, "passwordHash" from users where email = ${email} limit 1` as UserRow[];
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Email or password is incorrect");
  return issueToken(user);
}

export async function getProfile(id: string): Promise<PublicUser> {
  const rows = await sql()`select id, name, email from users where id = ${id} limit 1` as PublicUser[];
  if (!rows.length) throw new HttpError(401, "User no longer exists");
  return pub(rows[0]);
}

export async function updateName(id: string, name: string): Promise<PublicUser> {
  const rows = await sql()`update users set name = ${name} where id = ${id} returning id, name, email` as PublicUser[];
  if (!rows.length) throw new HttpError(401, "User no longer exists");
  return pub(rows[0]);
}

// ── Route helpers ───────────────────────────────────────────────────────────
const ERROR_NAMES: Record<number, string> = { 400: "Bad Request", 401: "Unauthorized", 409: "Conflict", 429: "Too Many Requests", 503: "Service Unavailable" };

/** Wraps a handler; errors use the old NestJS shape { message, error, statusCode }. */
export async function handle(fn: () => Promise<unknown>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof HttpError) {
      const message = e.status === 400 ? e.messages : e.message;
      return NextResponse.json({ message, error: ERROR_NAMES[e.status] ?? "Error", statusCode: e.status }, { status: e.status, headers: { "Cache-Control": "no-store" } });
    }
    console.error("[auth]", e);
    return NextResponse.json({ message: "The account service is unavailable. Please try again.", error: "Service Unavailable", statusCode: 503 }, { status: 503 });
  }
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Send a JSON body.");
  return body as Record<string, unknown>;
}

// Simple per-IP limit for login/register attempts (per server instance).
const attempts = new Map<string, number[]>();
export function limitAttempts(req: NextRequest, max = 10, windowMs = 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "local";
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter(t => now - t < windowMs);
  recent.push(now);
  attempts.set(ip, recent);
  if (attempts.size > 10_000) attempts.clear();
  if (recent.length > max) throw new HttpError(429, "Too many attempts. Wait a minute and try again.");
}
