"use client";

import {
  BadgeCheck,
  Eye,
  EyeOff,
  KeyRound,
  Keyboard,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { storeAccessToken, storeUser } from "@/lib/auth-storage";

type LoginResult = {
  accessToken: string;
  usuario: {
    idUsuario: number;
    nombre: string;
    apellido: string;
    correo: string;
    rol: string;
  };
};

function isLoginResult(value: unknown): value is LoginResult {
  return Boolean(
    value &&
    typeof value === "object" &&
    "accessToken" in value &&
    typeof value.accessToken === "string" &&
    "usuario" in value &&
    value.usuario &&
    typeof value.usuario === "object" &&
    "idUsuario" in value.usuario &&
    typeof value.usuario.idUsuario === "number" &&
    "nombre" in value.usuario &&
    typeof value.usuario.nombre === "string" &&
    "apellido" in value.usuario &&
    typeof value.usuario.apellido === "string" &&
    "correo" in value.usuario &&
    typeof value.usuario.correo === "string" &&
    "rol" in value.usuario &&
    typeof value.usuario.rol === "string",
  );
}

async function getErrorMessage(response: Response): Promise<string> {
  const payload: unknown = await response.json();
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = payload.message;
    if (typeof message === "string") return message;
    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === "string")
    ) {
      return message.join(". ");
    }
  }
  return `No se pudo iniciar sesión (HTTP ${response.status}).`;
}

export default function LoginPage() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const correo = String(formData.get("corporateEmail") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const rememberWorkstation = formData.get("rememberWorkstation") === "on";
    setMessage("");
    setIsSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const response = await fetch(
        `${apiUrl.replace(/\/+$/, "")}/api/v1/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo, password }),
        },
      );
      if (!response.ok) {
        setMessage(await getErrorMessage(response));
        return;
      }

      const result: unknown = await response.json();
      if (!isLoginResult(result)) {
        throw new Error(
          "El servidor devolvió una respuesta de inicio de sesión inválida.",
        );
      }
      storeAccessToken(result.accessToken, rememberWorkstation);
      storeUser(result.usuario);
      router.push("/expedientes");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible conectar con el servicio de autenticación.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell grid min-h-screen place-items-center bg-brand-primary px-6 py-10">
      <section
        aria-labelledby="login-heading"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-brand-white shadow-2xl"
      >
        <div aria-hidden="true" className="h-2 w-full bg-brand-primary" />

        <div className="space-y-6 p-8 sm:p-10">
          <header className="flex flex-col items-center space-y-4 text-center">
            <div className="flex items-center gap-3.5">
              <div
                aria-hidden="true"
                className="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand-primary text-brand-white shadow-md"
              >
                <ShieldCheck className="size-9" strokeWidth={2.2} />
              </div>
              <div className="text-left">
                <p className="font-display text-xl font-bold leading-tight tracking-wide text-brand-primary">
                  Seguros El Roble
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-muted">
                  Asegura lo que mas quieres
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-brand-neutral px-3 py-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-brand-secondary"
              />
              <span className="text-xs font-medium text-brand-slate">
                TLS 1.3 <span aria-hidden="true">•</span> Conexión Segura
              </span>
            </div>

            <div className="pt-1">
              <h1
                className="font-display text-2xl font-bold tracking-tight text-brand-slate"
                id="login-heading"
              >
                Portal de Inspección IA
              </h1>
              <p className="mt-1 text-sm text-brand-muted">
                Ingrese sus credenciales autorizadas
              </p>
            </div>
          </header>

          <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium text-brand-slate"
                htmlFor="corporateEmail"
              >
                Usuario / Correo Corporativo
              </label>
              <div className="relative flex items-center">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 size-5 text-brand-muted"
                />
                <input
                  autoComplete="username"
                  className="w-full rounded-lg border border-brand-border/80 bg-brand-neutral py-2.5 pl-11 pr-4 text-sm text-brand-slate shadow-sm outline-none transition placeholder:text-brand-muted/70 focus:border-brand-secondary focus:bg-brand-white focus:ring-4 focus:ring-brand-secondary/15"
                  id="corporateEmail"
                  name="corporateEmail"
                  placeholder="usuario@seguroselroble.com.gt"
                  required
                  type="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <label
                  className="block text-sm font-medium text-brand-slate"
                  htmlFor="password"
                >
                  Contraseña
                </label>
                <span
                  className={`inline-flex items-center gap-1 text-xs ${capsLockOn ? "font-semibold text-amber-700" : "text-brand-muted"}`}
                  role="status"
                >
                  <Keyboard aria-hidden="true" className="size-3.5" />
                  {capsLockOn ? "Bloq Mayús Activo" : "Teclado Protegido"}
                </span>
              </div>
              <div className="relative flex items-center">
                <KeyRound
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 size-5 text-brand-muted"
                />
                <input
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-brand-border/80 bg-brand-neutral py-2.5 pl-11 pr-12 font-mono text-sm text-brand-slate shadow-sm outline-none transition placeholder:text-brand-muted/70 focus:border-brand-secondary focus:bg-brand-white focus:ring-4 focus:ring-brand-secondary/15"
                  id="password"
                  name="password"
                  onKeyUp={(event) =>
                    setCapsLockOn(event.getModifierState("CapsLock"))
                  }
                  placeholder="••••••••••••••••"
                  required
                  type={passwordVisible ? "text" : "password"}
                />
                <button
                  aria-label={
                    passwordVisible
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  className="absolute right-2.5 rounded-md p-1 text-brand-muted transition hover:text-brand-slate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  type="button"
                >
                  {passwordVisible ? (
                    <EyeOff aria-hidden="true" className="size-5" />
                  ) : (
                    <Eye aria-hidden="true" className="size-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1">
              <label className="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm font-medium text-brand-slate">
                <input
                  className="size-4 cursor-pointer rounded accent-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
                  defaultChecked
                  id="rememberWorkstation"
                  name="rememberWorkstation"
                  type="checkbox"
                />
                <span>Recordarme en esta estación</span>
              </label>
              <button
                className="text-sm font-semibold text-brand-secondary transition hover:text-brand-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
                onClick={() =>
                  setMessage(
                    "Para recuperar el acceso, contacte al administrador de su organización.",
                  )
                }
                type="button"
              >
                ¿Olvidó sus credenciales?
              </button>
            </div>

            {message && (
              <p
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                role="alert"
              >
                {message}
              </p>
            )}

            <div className="pt-2">
              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-secondary px-4 py-3 font-display text-sm font-semibold text-brand-white shadow-md transition hover:bg-[#009ec7] hover:shadow-lg active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                disabled={isSubmitting}
                type="submit"
              >
                <LogIn aria-hidden="true" className="size-5" />
                {isSubmitting ? "Validando..." : "Iniciar Sesión"}
              </button>
            </div>
          </form>

          <footer className="flex items-center justify-center gap-2 border-t border-brand-border/70 pt-4 text-xs text-brand-muted">
            <BadgeCheck aria-hidden="true" className="size-4" />
            Acceso protegido para personal autorizado
          </footer>
        </div>
      </section>
    </main>
  );
}
