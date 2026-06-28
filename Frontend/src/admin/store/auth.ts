const ACCESS_TOKEN_KEY = 'admin_accessToken';
const REFRESH_TOKEN_KEY = 'admin_refreshToken';

export function getAdminAccessToken() { return localStorage.getItem(ACCESS_TOKEN_KEY); }
export function getAdminRefreshToken() { return localStorage.getItem(REFRESH_TOKEN_KEY); }
export function setAdminAuth(accessToken: string, refreshToken?: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}
export function clearAdminAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
