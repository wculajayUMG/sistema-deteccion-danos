export interface AuthUser {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
}

export function saveAuth(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem("elroble.accessToken", token);
  window.localStorage.setItem("auth_user", JSON.stringify(user));
  document.cookie = `auth_token=${token}; path=/; max-age=28800; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    window.localStorage.getItem("elroble.accessToken") ??
    window.sessionStorage.getItem("elroble.accessToken") ??
    null
  );
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem("auth_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function logout(): void {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem("elroble.accessToken");
  window.sessionStorage.removeItem("elroble.accessToken");
  window.localStorage.removeItem("auth_user");
  document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
  window.location.href = "/login";
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
