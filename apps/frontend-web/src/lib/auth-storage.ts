export interface AuthUser {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
}

export function storeAccessToken(
  token: string,
  persist = true,
): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('auth_token', token);

  const maxAge = persist ? 28800 : 0;
  document.cookie =
    `auth_token=${token}; path=/; ` +
    `max-age=${maxAge}; SameSite=Strict`;
}

export function storeUser(user: AuthUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_user', JSON.stringify(user));
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('auth_user');
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; }
  catch { return null; }
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  document.cookie =
    'auth_token=; path=/; max-age=0';
}
