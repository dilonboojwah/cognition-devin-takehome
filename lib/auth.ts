import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_ROLE } from "@/lib/roles";

/**
 * The whole codebase reads the user through getCurrentUser(). Nothing else
 * knows whether the identity came from the dev switcher or from Entra ID.
 */

const VIEW_AS_COOKIE = "view-as";

export function isSsoEnabled(): boolean {
  return Boolean(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER &&
      process.env.AUTH_SECRET,
  );
}

function devCookieSecret(): string {
  return process.env.AUTH_SECRET ?? "dev-mode-view-as-signing-key";
}

function sign(value: string): string {
  return createHmac("sha256", devCookieSecret()).update(value).digest("hex");
}

export function signViewAsCookie(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

function readViewAsCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null;
  const userId = raw.slice(0, separator);
  const signature = Buffer.from(raw.slice(separator + 1));
  const expected = Buffer.from(sign(userId));
  if (signature.length !== expected.length) return null;
  return timingSafeEqual(signature, expected) ? userId : null;
}

export const VIEW_AS_COOKIE_NAME = VIEW_AS_COOKIE;

async function getDevUser(): Promise<User | null> {
  const jar = await cookies();
  const userId = readViewAsCookie(jar.get(VIEW_AS_COOKIE)?.value);
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) return user;
  }
  // No cookie: land on the least-privileged persona so the permission model
  // is the first thing a visitor sees.
  return (
    (await prisma.user.findFirst({ where: { role: DEFAULT_ROLE } })) ??
    prisma.user.findFirst({ orderBy: { email: "asc" } })
  );
}

async function getSsoUser(): Promise<User | null> {
  const { auth } = await import("@/lib/auth-sso");
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const assignment = await prisma.roleAssignment.findUnique({ where: { email } });
  return prisma.user.create({
    data: {
      email,
      name: session.user?.name ?? email,
      role: assignment?.role ?? DEFAULT_ROLE,
    },
  });
}

/** The current user, or null when SSO mode is on and nobody is signed in. */
export async function getCurrentUser(): Promise<User | null> {
  return isSsoEnabled() ? getSsoUser() : getDevUser();
}

/** Use in pages and server actions. Sends an SSO visitor to sign in. */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    if (isSsoEnabled()) redirect("/api/auth/signin");
    throw new Error("No users in the database. Run `npm run db:setup`.");
  }
  return user;
}

/** Seeded users offered by the dev switcher. Empty in SSO mode. */
export async function listSwitchableUsers(): Promise<User[]> {
  if (isSsoEnabled()) return [];
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}
