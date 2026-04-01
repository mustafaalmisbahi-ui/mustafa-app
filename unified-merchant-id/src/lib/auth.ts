import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  SESSION_DURATION_MS,
  MAX_LOGIN_ATTEMPTS,
  LOGIN_LOCK_DURATION_MS,
} from "@/lib/constants";

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function createSession(
  adminUserId: string,
): Promise<{ rawToken: string }> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  await prisma.session.create({
    data: {
      adminUserId,
      tokenHash,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  });

  return { rawToken };
}

export async function setSessionCookie(rawToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function readSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
}

export async function deleteSessionByRawToken(rawToken: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { tokenHash: hashToken(rawToken) },
  });
}

export async function destroySession(): Promise<void> {
  const token = await readSessionToken();
  if (token) {
    await deleteSessionByRawToken(token);
  }

  await clearSessionCookie();
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { adminUser: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.adminUser;
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/login");
  }
  return admin;
}

export async function requireAdminSession() {
  return requireAdmin();
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function verifyAdminPassword(
  username: string,
  password: string,
): Promise<{ success: boolean; userId?: string }> {
  const user = await prisma.adminUser.findUnique({ where: { username } });
  if (!user) {
    return { success: false };
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return { success: false };
  }

  return { success: true, userId: user.id };
}

export function safeStringEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

type AttemptState = {
  count: number;
  firstAt: number;
  lockedUntil?: number;
};

const attemptStore = new Map<string, AttemptState>();

function getAttemptKey(username: string) {
  return `login:${username.toLowerCase().trim()}`;
}

export function getLoginLockStatus(username: string) {
  const key = getAttemptKey(username);
  const state = attemptStore.get(key);
  if (!state) return { locked: false as const };
  if (!state.lockedUntil) return { locked: false as const };
  if (state.lockedUntil <= Date.now()) {
    attemptStore.delete(key);
    return { locked: false as const };
  }
  return {
    locked: true as const,
    remainingMs: state.lockedUntil - Date.now(),
  };
}

export function recordFailedLogin(username: string) {
  const key = getAttemptKey(username);
  const now = Date.now();
  const state = attemptStore.get(key);

  if (!state || now - state.firstAt > LOGIN_LOCK_DURATION_MS) {
    attemptStore.set(key, { count: 1, firstAt: now });
    return;
  }

  const nextCount = state.count + 1;
  if (nextCount >= MAX_LOGIN_ATTEMPTS) {
    attemptStore.set(key, {
      count: nextCount,
      firstAt: state.firstAt,
      lockedUntil: now + LOGIN_LOCK_DURATION_MS,
    });
    return;
  }

  attemptStore.set(key, { ...state, count: nextCount });
}

export function clearLoginAttempts(username: string) {
  attemptStore.delete(getAttemptKey(username));
}
