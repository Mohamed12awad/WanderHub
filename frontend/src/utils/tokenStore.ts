// In-memory access-token store. The short-lived access token is deliberately
// NOT persisted to localStorage (which is XSS-readable). It lives only in this
// module variable; on a full page reload it is restored by calling /auth/refresh
// with the httpOnly refresh cookie. The refresh token itself is never visible
// to JS.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
