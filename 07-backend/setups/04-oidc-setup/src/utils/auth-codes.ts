import crypto from "node:crypto";

interface AuthCodeEntry {
  userId: string;
  clientId: string;
  redirectUri: string;
  expiresAt: number;
}

const CODE_TTL_MS = 60_000;

const codes = new Map<string, AuthCodeEntry>();

export function createAuthCode(
  userId: string,
  clientId: string,
  redirectUri: string,
): string {
  const code = crypto.randomBytes(24).toString("hex");
  codes.set(code, {
    userId,
    clientId,
    redirectUri,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
  return code;
}

export function consumeAuthCode(
  code: string,
  clientId: string,
): { userId: string } | null {
  const entry = codes.get(code);
  if (!entry) return null;

  codes.delete(code);

  if (entry.expiresAt < Date.now()) return null;
  if (entry.clientId !== clientId) return null;

  return { userId: entry.userId };
}
