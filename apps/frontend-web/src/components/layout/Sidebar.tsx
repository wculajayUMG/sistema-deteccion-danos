'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getStoredUser } from '@/lib/auth-storage';
import {
  FolderOpen, Car,
  Settings, Wrench, Truck, Shield,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const MENU_INSPECCION = [
  { label: 'Expedientes y Siniestros', href: '/expedientes', icon: FolderOpen, roles: ['ADMINISTRADOR_TI', 'SUPERVISOR', 'PERITO', 'AJUSTADOR'] },
  { label: 'Nueva Inspección', href: '/expedientes/nuevo/cliente', icon: Car, roles: ['ADMINISTRADOR_TI', 'SUPERVISOR', 'AJUSTADOR'] },
];

const MENU_CATALOGOS = [
  { label: 'Precio y Tarifas', href: '/admin/baremos', icon: Settings, roles: ['ADMINISTRADOR_TI', 'SUPERVISOR', 'PERITO'] },
  { label: 'Catálogo de Repuestos', href: '/admin/repuestos', icon: Wrench, roles: ['ADMINISTRADOR_TI', 'SUPERVISOR', 'PERITO'] },
  { label: 'Agregar Vehículos', href: '/admin/taxonomia', icon: Truck, roles: ['ADMINISTRADOR_TI', 'SUPERVISOR', 'PERITO'] },
  { label: 'Gestión de Usuarios', href: '/admin/usuarios', icon: Shield, roles: ['ADMINISTRADOR_TI'] },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar(
  { mobileOpen, onMobileClose }: SidebarProps
) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [rol, setRol] = useState('');

  useEffect(() => {
    setRol(getStoredUser()?.rol ?? '');
  }, []);

  // Cerrar sidebar móvil al cambiar de ruta
  useEffect(() => {
    onMobileClose();
  }, [pathname, onMobileClose]);

  const inspeccionItems = MENU_INSPECCION.filter((item) => !rol || item.roles.includes(rol));
  const catalogosItems = MENU_CATALOGOS.filter((item) => !rol || item.roles.includes(rol));
  const grupos = [
    ...(inspeccionItems.length > 0 ? [{ section: 'INSPECCIÓN Y SINIESTROS', items: inspeccionItems }] : []),
    ...(catalogosItems.length > 0 ? [{ section: 'CATÁLOGOS Y ADMINISTRACIÓN', items: catalogosItems }] : []),
  ];

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5',
        'border-b border-white/10',
        collapsed && 'justify-center px-2'
      )}>
        <div className="w-9 h-9 rounded-lg shrink-0
          bg-brand-secondary flex items-center
          justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm
              leading-tight truncate">
              SEGUROS EL ROBLE
            </p>
            <p className="text-xs text-white/60
              leading-tight">
              Sistema IA
            </p>
          </div>
        )}
        {/* Botón cerrar en móvil */}
        <button
          onClick={onMobileClose}
          className="md:hidden p-1 rounded-lg
            hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto
        py-4 space-y-6 px-2">
        {grupos.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="text-white/40 text-[10px]
                font-semibold tracking-wider
                px-2 mb-2 uppercase">
                {group.section}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed
                        ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3',
                        'px-3 py-2.5 rounded-lg',
                        'text-sm font-medium',
                        'transition-colors duration-150',
                        active
                          ? 'bg-brand-secondary text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0"/>
                      {!collapsed && (
                        <span className="truncate">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3
          border-t border-white/10">
          <p className="text-white/30 text-xs">
            El Roble v1.0.0
          </p>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* MÓVIL: Overlay + drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={onMobileClose}
        >
          <div className="absolute inset-0
            bg-black/50 backdrop-blur-sm" />
        </div>
      )}

      <aside className={cn(
        // Móvil: posición fija, fuera de pantalla
        // por defecto, entra al abrir
        'fixed inset-y-0 left-0 z-50',
        'flex flex-col h-full w-72',
        'bg-brand-primary text-white',
        'transition-transform duration-300',
        'md:relative md:translate-x-0',
        mobileOpen
          ? 'translate-x-0'
          : '-translate-x-full',
        // Desktop: sidebar normal colapsable
        'md:flex md:h-screen md:shrink-0',
        collapsed ? 'md:w-16' : 'md:w-64'
      )}>
        <NavContent />

        {/* Botón colapsar — solo desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-3
            top-20 w-6 h-6 rounded-full
            bg-brand-primary border border-white/20
            items-center justify-center
            hover:bg-brand-secondary
            transition-colors z-10"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3
                text-white" />
            : <ChevronLeft className="w-3 h-3
                text-white" />
          }
        </button>
      </aside>
    </>
  );
}
