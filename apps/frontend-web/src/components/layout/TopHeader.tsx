'use client';
import { Bell, ChevronDown, LogOut, Menu } from
  'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

interface Props {
  breadcrumb?: string[];
  onMenuToggle?: () => void;
}

const ROL_LABEL: Record<string, string> = {
  AJUSTADOR:        'Ajustador de Campo',
  PERITO:           'Perito / Auditor',
  SUPERVISOR:       'Supervisor',
  ADMINISTRADOR_TI: 'Administrador TI',
};

export default function TopHeader(
  { breadcrumb = [], onMenuToggle }: Props
) {
  const router = useRouter();
  const { user, clearAuth, initFromStorage } =
    useAuthStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const initials = user
    ? `${user.nombre[0]}${user.apellido[0]}`
        .toUpperCase()
    : 'U';

  return (
    <header className="h-16 bg-white shrink-0
      border-b border-gray-100 shadow-card
      flex items-center justify-between
      px-4 md:px-6">

      <div className="flex items-center gap-3">
        {/* Hamburger — solo móvil y tablet */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg
            hover:bg-gray-50 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5
            text-gray-600" />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2
          text-sm text-gray-500">
          <span className="text-brand-primary
            font-medium hidden sm:block">
            Seguros El Roble
          </span>
          {breadcrumb.map((c, i) => (
            <span key={i} className="flex
              items-center gap-2">
              <span className="hidden sm:block">
                /
              </span>
              <span className={
                i === breadcrumb.length - 1
                  ? 'text-brand-text font-medium'
                  : 'text-gray-400 hidden sm:block'
              }>
                {c}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2
        md:gap-4">

        <button className="relative p-2 rounded-lg
          hover:bg-gray-50 transition-colors">
          <Bell className="w-5 h-5
            text-gray-500" />
          <span className="absolute top-1 right-1
            w-4 h-4 bg-brand-accent text-white
            text-[10px] font-bold rounded-full
            flex items-center justify-center">
            3
          </span>
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2
              md:gap-3 hover:bg-gray-50
              rounded-lg px-2 md:px-3 py-2
              transition-colors"
          >
            <div className="w-8 h-8 rounded-full
              bg-brand-primary text-white text-sm
              font-semibold flex items-center
              justify-center shrink-0">
              {initials}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-semibold
                text-brand-text leading-tight">
                {user
                  ? `${user.nombre} ${user.apellido}`
                  : 'Usuario'}
              </p>
              <p className="text-xs text-gray-400
                leading-tight">
                {user
                  ? (ROL_LABEL[user.rol] ?? user.rol)
                  : ''}
              </p>
            </div>
            <ChevronDown className="w-4 h-4
              text-gray-400 hidden md:block" />
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0
                top-full mt-1 w-48 bg-white
                rounded-lg shadow-lg
                border border-gray-100 z-20 py-1">
                <div className="px-3 py-2
                  border-b border-gray-100">
                  <p className="text-xs font-medium
                    text-brand-text">
                    {user
                      ? `${user.nombre} ${user.apellido}`
                      : ''}
                  </p>
                  <p className="text-xs text-gray-400
                    truncate">
                    {user?.correo}
                  </p>
                  <span className="inline-block mt-1
                    px-2 py-0.5 rounded-full text-[10px]
                    font-medium bg-brand-primary/10
                    text-brand-primary">
                    {user
                      ? (ROL_LABEL[user.rol] ?? user.rol)
                      : ''}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center
                    gap-2 px-3 py-2 text-sm
                    text-red-500 hover:bg-red-50
                    transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
