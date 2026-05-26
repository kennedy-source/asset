export type SessionClaims = {
  id?: number;
  email?: string;
  role?: string;
  name?: string;
  exp?: number;
};

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(`${normalized}${padding}`);
}

export function parseTokenClaims(token: string): SessionClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = decodeBase64Url(parts[1]);
    return JSON.parse(json) as SessionClaims;
  } catch {
    return null;
  }
}

export function getValidSessionToken(): string | null {
  const token = localStorage.getItem("pajoy_token");
  if (!token) return null;
  const claims = parseTokenClaims(token);
  if (!claims?.exp) return null;
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp <= now) {
    localStorage.removeItem("pajoy_token");
    return null;
  }
  return token;
}

export function getCurrentRole(): string | null {
  const token = localStorage.getItem("pajoy_token");
  if (!token) return null;
  const claims = parseTokenClaims(token);
  return claims?.role ?? null;
}
