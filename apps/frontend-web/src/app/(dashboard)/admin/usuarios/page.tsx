'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Edit2, KeyRound, UserPlus, Download, Search,
  ShieldCheck, Users, UserX, Clock,
  Lock, LockOpen, Shuffle, Info, Gavel, AlertTriangle, XCircle,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import AdminModal from '@/components/admin/AdminModal';
import AdminTable from '@/components/admin/AdminTable';
import { cn } from '@/lib/utils';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('auth_token') ?? '';
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  };
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts?.headers ?? {}) },
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json() as { message?: string | string[] };
      if (Array.isArray(body.message)) msg = body.message.join(', ');
      else if (body.message) msg = body.message;
    } catch { /* noop */ }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

interface RolObj { idRol: number; nombreRol: string }
interface Usuario {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string | RolObj;
  estado: boolean;
  createdAt: string;
}

function getRolStr(rol: string | RolObj): string {
  if (typeof rol === 'string') return rol;
  return rol.nombreRol;
}

const ROL_OPTIONS = [
  { value: 'PERITO', label: 'Perito / Auditor' },
  { value: 'AJUSTADOR', label: 'Ajustador' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'ADMINISTRADOR_TI', label: 'Administrador TI' },
];

const ROL_BADGE: Record<string, string> = {
  ADMINISTRADOR_TI: 'bg-[#003399]/10 text-[#003399] border border-[#003399]/20',
  SUPERVISOR: 'bg-purple-50 text-purple-700 border border-purple-200',
  PERITO: 'bg-[#00B5E2]/10 text-[#00B5E2] border border-[#00B5E2]/20',
  AJUSTADOR: 'bg-teal-50 text-teal-700 border border-teal-200',
};
const ROL_LABEL: Record<string, string> = {
  ADMINISTRADOR_TI: 'ADMINISTRADOR TI',
  SUPERVISOR: 'SUPERVISOR',
  PERITO: 'PERITO',
  AJUSTADOR: 'AJUSTADOR',
};
const ESTADO_BADGE = {
  activo: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  inactivo: 'bg-amber-50 text-amber-700 border border-amber-200',
};
const MOTIVOS_BLOQUEO = [
  'Sospecha de acceso indebido o múltiples reintentos',
  'Investigación interna de siniestros',
  'Solicitud formal de RR. HH.',
  'Pérdida de dispositivo móvil',
];

function generarPasswordAleatoria(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function exportCSV(usuarios: Usuario[]) {
  const header = 'ID,Nombre,Apellido,Email,Rol,Estado,Registrado';
  const rows = usuarios.map((u) =>
    [u.idUsuario, u.nombre, u.apellido, u.correo, getRolStr(u.rol), u.estado ? 'Activo' : 'Inactivo', u.createdAt].join(','),
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'usuarios.csv';
  a.click();
  URL.revokeObjectURL(url);
}

type TabConsola = 'password' | 'bloqueo' | 'baja';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modales principales
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPwd, setModalPwd] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);

  // Modales de fila
  const [modalBloqueoFila, setModalBloqueoFila] = useState(false);
  const [modalBajaFila, setModalBajaFila] = useState(false);
  const [usuarioFila, setUsuarioFila] = useState<Usuario | null>(null);
  const [motivoFilaBloqueo, setMotivoFilaBloqueo] = useState(MOTIVOS_BLOQUEO[0]);
  const [certificadoFila, setCertificadoFila] = useState(false);
  const [confirmadoBajaFila, setConfirmadoBajaFila] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  // Formularios
  const [form, setForm] = useState({ nombre: '', apellido: '', correo: '', nombreRol: 'AJUSTADOR', password: '', estado: true });
  const [formPwd, setFormPwd] = useState({ password: '', confirmar: '' });

  // Consola
  const [tabConsola, setTabConsola] = useState<TabConsola>('password');
  const [consolaPwdUsuario, setConsolaPwdUsuario] = useState('');
  const [consolaPwdVal, setConsolaPwdVal] = useState('');
  const [consolaBloqueoUsuario, setConsolaBloqueoUsuario] = useState('');
  const [consolaBloqueoMotivo, setConsolaBloqueoMotivo] = useState(MOTIVOS_BLOQUEO[0]);
  const [consolaBloqueoCertificado, setConsolaBloqueoCertificado] = useState(false);
  const [consolaBajaUsuario, setConsolaBajaUsuario] = useState('');
  const [consolaBajaConfirmado, setConsolaBajaConfirmado] = useState(false);

  // ── carga inicial ─────────────────────────────────────────────────────────

  const cargarUsuarios = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await apiFetch<Usuario[]>('/api/v1/admin/usuarios');
      setUsuarios(data);
    } catch (e) {
      setApiError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void cargarUsuarios(); }, [cargarUsuarios]);

  async function withLoading(fn: () => Promise<void>) {
    setLoading(true);
    setApiError(null);
    try { await fn(); }
    catch (e) { setApiError((e as Error).message); }
    finally { setLoading(false); }
  }

  // ── acciones ──────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditando(null);
    setForm({ nombre: '', apellido: '', correo: '', nombreRol: 'AJUSTADOR', password: '', estado: true });
    setModalOpen(true);
  };
  const openEdit = (u: Usuario) => {
    setEditando(u);
    setForm({ nombre: u.nombre, apellido: u.apellido, correo: u.correo, nombreRol: getRolStr(u.rol), password: '', estado: u.estado });
    setModalOpen(true);
  };
  const openResetPwd = (u: Usuario) => { setEditando(u); setFormPwd({ password: '', confirmar: '' }); setModalPwd(true); };
  const openBloqueoFila = (u: Usuario) => { setUsuarioFila(u); setMotivoFilaBloqueo(MOTIVOS_BLOQUEO[0]); setCertificadoFila(false); setModalBloqueoFila(true); };

  async function desbloquearUsuario(id: number) {
    await withLoading(async () => {
      await apiFetch(`/api/v1/admin/usuarios/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: true }),
      });
      setUsuarios((prev) => prev.map((u) => u.idUsuario === id ? { ...u, estado: true } : u));
    });
  }
  const openBajaFila = (u: Usuario) => { setUsuarioFila(u); setConfirmadoBajaFila(false); setModalBajaFila(true); };

  async function guardarUsuario() {
    await withLoading(async () => {
      if (editando) {
        const { password: _pw, ...patch } = form;
        await apiFetch(`/api/v1/admin/usuarios/${editando.idUsuario}`, { method: 'PATCH', body: JSON.stringify(patch) });
      } else {
        const { estado: _est, ...createBody } = form;
        await apiFetch('/api/v1/admin/usuarios', { method: 'POST', body: JSON.stringify(createBody) });
      }
      setModalOpen(false);
      setEditando(null);
      await cargarUsuarios();
    });
  }

  async function guardarPassword() {
    if (!editando) return;
    await withLoading(async () => {
      await apiFetch(`/api/v1/admin/usuarios/${editando.idUsuario}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ nuevaContrasena: formPwd.password }),
      });
      setModalPwd(false);
      setFormPwd({ password: '', confirmar: '' });
      alert(`✓ Contraseña actualizada para ${editando.nombre} ${editando.apellido}.`);
    });
  }

  async function bloquearUsuario(id: number, motivo: string) {
    await withLoading(async () => {
      await apiFetch(`/api/v1/admin/usuarios/${id}/bloquear`, {
        method: 'PATCH',
        body: JSON.stringify({ motivo }),
      });
      setUsuarios((prev) => prev.map((u) => u.idUsuario === id ? { ...u, estado: false } : u));
    });
  }

  async function desactivarUsuario(id: number) {
    await withLoading(async () => {
      await apiFetch(`/api/v1/admin/usuarios/${id}/desactivar`, { method: 'PATCH' });
      setUsuarios((prev) => prev.filter((u) => u.idUsuario !== id));
    });
  }

  async function resetearPasswordConsola() {
    if (!consolaPwdUsuario || !consolaPwdVal) { setApiError('Seleccione un usuario y genere una contraseña.'); return; }
    const u = usuarios.find((x) => String(x.idUsuario) === consolaPwdUsuario);
    await withLoading(async () => {
      await apiFetch(`/api/v1/admin/usuarios/${consolaPwdUsuario}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ nuevaContrasena: consolaPwdVal }),
      });
      alert(`✓ Contraseña temporal enviada a ${u?.correo ?? 'usuario'}.`);
      setConsolaPwdUsuario('');
      setConsolaPwdVal('');
    });
  }

  async function bloquearConsola() {
    if (!consolaBloqueoUsuario) { setApiError('Seleccione un usuario.'); return; }
    if (!consolaBloqueoCertificado) { setApiError('Debe certificar la justificación reglamentaria.'); return; }
    const u = usuarios.find((x) => String(x.idUsuario) === consolaBloqueoUsuario);
    await withLoading(async () => {
      await apiFetch(`/api/v1/admin/usuarios/${consolaBloqueoUsuario}/bloquear`, {
        method: 'PATCH',
        body: JSON.stringify({ motivo: consolaBloqueoMotivo }),
      });
      setUsuarios((prev) => prev.map((x) => x.idUsuario === Number(consolaBloqueoUsuario) ? { ...x, estado: false } : x));
      alert(`🔒 Acceso bloqueado para ${u?.nombre} ${u?.apellido}.`);
      setConsolaBloqueoUsuario('');
      setConsolaBloqueoCertificado(false);
    });
  }

  async function desactivarConsola() {
    if (!consolaBajaUsuario) { setApiError('Seleccione un usuario.'); return; }
    if (!consolaBajaConfirmado) { setApiError('Debe confirmar que entiende las consecuencias.'); return; }
    const u = usuarios.find((x) => String(x.idUsuario) === consolaBajaUsuario);
    await withLoading(async () => {
      await apiFetch(`/api/v1/admin/usuarios/${consolaBajaUsuario}/desactivar`, { method: 'PATCH' });
      setUsuarios((prev) => prev.filter((x) => x.idUsuario !== Number(consolaBajaUsuario)));
      alert(`🚫 Cuenta desactivada: ${u?.nombre} ${u?.apellido}.`);
      setConsolaBajaUsuario('');
      setConsolaBajaConfirmado(false);
    });
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const activos = usuarios.filter((u) => u.estado).length;
  const inactivos = usuarios.filter((u) => !u.estado).length;
  const rolesUnicos = new Set(usuarios.map((u) => getRolStr(u.rol))).size;

  const filtered = usuarios.filter((u) => {
    const q = busqueda.toLowerCase();
    const matchSearch = !busqueda || u.nombre.toLowerCase().includes(q) || u.apellido.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q);
    const matchRol = !filtroRol || getRolStr(u.rol) === filtroRol;
    const matchEstado = !filtroEstado || (filtroEstado === 'activo' ? u.estado : !u.estado);
    return matchSearch && matchRol && matchEstado;
  });

  const columns = [
    {
      key: 'usuario', header: 'Avatar & Nombre Completo',
      render: (u: Usuario) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#003399]/10 flex items-center justify-center shrink-0 border border-[#003399]/20">
            <span className="text-xs font-bold text-[#003399]">{u.nombre.charAt(0)}{u.apellido.charAt(0)}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{u.nombre} {u.apellido}</p>
            <p className="text-[11px] text-slate-400 font-mono">#EMP-{String(u.idUsuario).padStart(3, '0')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email', header: 'Correo Electrónico',
      render: (u: Usuario) => <span className="text-xs text-slate-500 font-mono">{u.correo}</span>,
    },
    {
      key: 'rol', header: 'Rol Asignado',
      render: (u: Usuario) => (
        <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide', ROL_BADGE[getRolStr(u.rol)] ?? 'bg-gray-100 text-gray-600 border border-gray-200')}>
          {ROL_LABEL[getRolStr(u.rol)] ?? getRolStr(u.rol)}
        </span>
      ),
    },
    {
      key: 'registrado', header: 'Registrado',
      render: (u: Usuario) => <span className="text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString('es-GT')}</span>,
    },
    {
      key: 'estado', header: 'Estado', align: 'center' as const,
      render: (u: Usuario) => (
        <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide', u.estado ? ESTADO_BADGE.activo : ESTADO_BADGE.inactivo)}>
          {u.estado ? 'ACTIVO' : 'INACTIVO'}
        </span>
      ),
    },
    {
      key: 'acciones', header: 'Acciones',
      render: (u: Usuario) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(u)} disabled={loading} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors disabled:opacity-50" title="Editar">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => openResetPwd(u)} disabled={loading} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors disabled:opacity-50" title="Cambiar contraseña">
            <KeyRound className="w-3.5 h-3.5" />
          </button>
          {u.estado ? (
            <button
              onClick={() => openBloqueoFila(u)}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50"
              title="Bloquear usuario"
              style={{ color: '#ea580c' }}
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => void desbloquearUsuario(u.idUsuario)}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
              title="Desbloquear usuario"
              style={{ color: '#16a34a' }}
            >
              <LockOpen className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => openBajaFila(u)} disabled={loading} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50" title="Baja definitiva">
            <UserX className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout breadcrumb={['Administración', 'Gestión de Usuarios']}>
      <div className="space-y-5">

        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#003399] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-slate-800">Gestión de Usuarios del Sistema</h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700 tracking-wide">
                    <ShieldCheck className="w-3 h-3" />SOLO ADMINISTRADOR
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">Administre accesos, roles y estados de los colaboradores.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => exportCSV(filtered)} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors">
                <Download className="w-3.5 h-3.5" />Exportar Lista
              </button>
              <button onClick={openAdd} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-[#003399] text-white rounded-lg text-xs font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors">
                <UserPlus className="w-3.5 h-3.5" />+ Agregar Usuario
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />{activos} usuarios activos
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#003399]/10 border border-[#003399]/20 text-xs font-semibold text-[#003399]">
              <Users className="w-3.5 h-3.5" />{rolesUnicos} roles configurados
            </span>
            {inactivos > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                <UserX className="w-3.5 h-3.5" />{inactivos} inactivo{inactivos !== 1 ? 's' : ''}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-500">
              <Clock className="w-3.5 h-3.5" />{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Banner de error API */}
        {apiError && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <XCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="flex-1">{apiError}</span>
            <button onClick={() => setApiError(null)} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Buscar por nombre, apellido o email..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] focus:ring-2 focus:ring-[#00B5E2]/10" />
            </div>
            <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] bg-white">
              <option value="">Todos los roles</option>
              {ROL_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] bg-white">
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-sm text-slate-500">
              Mostrando <span className="font-semibold text-slate-700">{filtered.length}</span> de <span className="font-semibold text-slate-700">{usuarios.length}</span> usuarios
            </p>
          </div>
          <AdminTable columns={columns} data={filtered} isLoading={isLoading} emptyText="No hay usuarios que coincidan con los filtros" keyExtractor={(u) => u.idUsuario} />
        </div>

        {/* Módulos de Seguridad Administrativa */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <ShieldCheck className="w-4 h-4 text-[#003399]" />
            <h2 className="text-sm font-bold text-slate-700">Módulos de Seguridad Administrativa</h2>
          </div>
          <div className="flex gap-1 p-3 border-b border-slate-100">
            {(
              [
                { id: 'password', label: 'Emisión de Contraseña Temporal', icon: KeyRound },
                { id: 'bloqueo', label: 'Bloqueo Preventivo de Acceso', icon: Lock },
                { id: 'baja', label: 'Baja Definitiva de Colaborador', icon: UserX },
              ] as { id: TabConsola; label: string; icon: React.ElementType }[]
            ).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTabConsola(id)} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-1 justify-center', tabConsola === id ? (id === 'password' ? 'bg-[#003399] text-white shadow-sm' : 'bg-red-600 text-white shadow-sm') : 'text-slate-500 hover:bg-slate-100 border border-slate-200')}>
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{id === 'password' ? 'Reset Clave' : id === 'bloqueo' ? 'Bloquear' : 'Desactivar'}</span>
              </button>
            ))}
          </div>

          {/* Tab A */}
          {tabConsola === 'password' && (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-2">
                <KeyRound className="w-4 h-4 text-[#003399] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Emisión de Contraseña Temporal de Emergencia</p>
                  <p className="text-xs text-slate-500 mt-0.5">Genera y envía una clave provisional al usuario seleccionado.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Usuario Objetivo</label>
                  <select value={consolaPwdUsuario} onChange={(e) => setConsolaPwdUsuario(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] bg-white">
                    <option value="">Seleccione un usuario...</option>
                    {usuarios.map((u) => <option key={u.idUsuario} value={String(u.idUsuario)}>{u.nombre} {u.apellido} — {getRolStr(u.rol)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Contraseña Temporal</label>
                  <div className="flex gap-2">
                    <input type="text" value={consolaPwdVal} onChange={(e) => setConsolaPwdVal(e.target.value)} placeholder="Generada automáticamente" className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] font-mono" />
                    <button onClick={() => setConsolaPwdVal(generarPasswordAleatoria())} className="px-3 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors" title="Generar aleatoria">
                      <Shuffle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">Envío automático por SMS y correo corporativo cifrado. El usuario deberá cambiar la contraseña en el primer inicio de sesión.</p>
              </div>
              <button onClick={() => void resetearPasswordConsola()} disabled={loading || !consolaPwdUsuario || !consolaPwdVal} className="flex items-center gap-2 px-5 py-2.5 bg-[#003399] text-white rounded-lg text-sm font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors">
                <KeyRound className="w-4 h-4" />{loading ? 'Enviando...' : 'Resetear y Notificar al Usuario'}
              </button>
            </div>
          )}

          {/* Tab B */}
          {tabConsola === 'bloqueo' && (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Bloqueo Preventivo de Acceso</p>
                  <p className="text-xs text-slate-500 mt-0.5">Bloquea inmediatamente el acceso de un usuario al sistema.</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Usuario a Bloquear</label>
                <select value={consolaBloqueoUsuario} onChange={(e) => setConsolaBloqueoUsuario(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-red-400 bg-white">
                  <option value="">Seleccione un usuario...</option>
                  {usuarios.filter((u) => u.estado).map((u) => <option key={u.idUsuario} value={String(u.idUsuario)}>{u.nombre} {u.apellido} — {getRolStr(u.rol)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                {MOTIVOS_BLOQUEO.map((motivo) => (
                  <label key={motivo} className="flex items-start gap-2.5 cursor-pointer">
                    <input type="radio" name="motivoBloqueo" value={motivo} checked={consolaBloqueoMotivo === motivo} onChange={() => setConsolaBloqueoMotivo(motivo)} className="mt-0.5 accent-red-600" />
                    <span className="text-sm text-slate-700">{motivo}</span>
                  </label>
                ))}
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                <input type="checkbox" checked={consolaBloqueoCertificado} onChange={(e) => setConsolaBloqueoCertificado(e.target.checked)} className="mt-0.5 accent-red-600" />
                <span className="text-sm text-slate-700 font-medium">Certifico la justificación reglamentaria para este bloqueo.</span>
              </label>
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Gavel className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Nota de auditoría: esta acción queda registrada en el log del sistema.</p>
              </div>
              <button onClick={() => void bloquearConsola()} disabled={loading || !consolaBloqueoUsuario || !consolaBloqueoCertificado} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                <Lock className="w-4 h-4" />{loading ? 'Bloqueando...' : 'Confirmar Bloqueo Inmediato'}
              </button>
            </div>
          )}

          {/* Tab C */}
          {tabConsola === 'baja' && (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-2">
                <UserX className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Baja Definitiva y Desactivación de Colaborador</p>
                  <p className="text-xs text-slate-500 mt-0.5">Revoca todos los accesos y desactiva la cuenta permanentemente.</p>
                </div>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">Esta acción es irreversible. El usuario perderá todos los accesos y sus sesiones activas serán terminadas.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Seleccionar Usuario a Desactivar</label>
                <select value={consolaBajaUsuario} onChange={(e) => setConsolaBajaUsuario(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-red-200 rounded-lg outline-none focus:border-red-400 bg-white">
                  <option value="">Seleccione un usuario...</option>
                  {usuarios.map((u) => <option key={u.idUsuario} value={String(u.idUsuario)}>{u.nombre} {u.apellido} — #EMP-{String(u.idUsuario).padStart(3, '0')} — {getRolStr(u.rol)}</option>)}
                </select>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors">
                <input type="checkbox" checked={consolaBajaConfirmado} onChange={(e) => setConsolaBajaConfirmado(e.target.checked)} className="mt-0.5 accent-red-600" />
                <span className="text-sm text-red-800 font-medium">Entiendo que esta acción revocará todos los accesos del colaborador de manera permanente.</span>
              </label>
              <button onClick={() => void desactivarConsola()} disabled={loading || !consolaBajaUsuario || !consolaBajaConfirmado} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors">
                <UserX className="w-4 h-4" />{loading ? 'Desactivando...' : 'Ejecutar Desactivación de Cuenta'}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Modal crear/editar */}
      <AdminModal open={modalOpen} title={editando ? `Editar — ${editando.nombre} ${editando.apellido}` : 'Nuevo Usuario del Sistema'} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nombre *</label>
              <input type="text" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Apellido *</label>
              <input type="text" value={form.apellido} onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))} placeholder="Apellido" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Correo Corporativo *</label>
            <input type="email" value={form.correo} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))} placeholder="usuario@seguroselroble.com.gt" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Rol Asignado *</label>
            <select value={form.nombreRol} onChange={(e) => setForm((f) => ({ ...f, nombreRol: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] bg-white">
              {ROL_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {!editando && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Contraseña Temporal *</label>
              <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2]" />
            </div>
          )}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Se enviará notificación por correo corporativo con las credenciales de acceso al portal.</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">Cancelar</button>
            <button onClick={() => void guardarUsuario()} disabled={loading} className="flex-1 px-4 py-2.5 bg-[#003399] text-white rounded-lg text-sm font-semibold hover:bg-[#002580] disabled:opacity-50">
              {loading ? 'Guardando...' : editando ? 'Actualizar Usuario' : 'Crear Usuario'}
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Modal cambiar contraseña */}
      <AdminModal open={modalPwd} title={`Resetear Contraseña — ${editando?.nombre ?? ''}`} onClose={() => setModalPwd(false)} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nueva Contraseña *</label>
            <input type="password" value={formPwd.password} onChange={(e) => setFormPwd((f) => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Confirmar Contraseña *</label>
            <input type="password" value={formPwd.confirmar} onChange={(e) => setFormPwd((f) => ({ ...f, confirmar: e.target.value }))} placeholder="Repita la contraseña" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2]" />
          </div>
          {formPwd.confirmar && formPwd.password !== formPwd.confirmar && (
            <p className="text-xs text-red-500">Las contraseñas no coinciden</p>
          )}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            ⚠️ La nueva contraseña se enviará por correo cifrado al usuario objetivo.
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalPwd(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">Cancelar</button>
            <button onClick={() => void guardarPassword()} disabled={loading || !formPwd.password || formPwd.password !== formPwd.confirmar} className="flex-1 px-4 py-2.5 bg-[#003399] text-white rounded-lg text-sm font-semibold hover:bg-[#002580] disabled:opacity-50">
              {loading ? 'Enviando...' : 'Resetear y Notificar'}
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Modal Bloqueo desde fila */}
      <AdminModal open={modalBloqueoFila} title={`Bloqueo Preventivo — ${usuarioFila?.nombre ?? ''} ${usuarioFila?.apellido ?? ''}`} onClose={() => setModalBloqueoFila(false)} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Seleccione el motivo para bloquear a <span className="font-semibold text-slate-800">{usuarioFila?.nombre} {usuarioFila?.apellido}</span>.</p>
          <div className="space-y-2">
            {MOTIVOS_BLOQUEO.map((motivo) => (
              <label key={motivo} className="flex items-start gap-2.5 cursor-pointer">
                <input type="radio" name="motivoFilaBloqueo" value={motivo} checked={motivoFilaBloqueo === motivo} onChange={() => setMotivoFilaBloqueo(motivo)} className="mt-0.5 accent-red-600" />
                <span className="text-sm text-slate-700">{motivo}</span>
              </label>
            ))}
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
            <input type="checkbox" checked={certificadoFila} onChange={(e) => setCertificadoFila(e.target.checked)} className="mt-0.5 accent-red-600" />
            <span className="text-sm text-slate-700 font-medium">Certifico la justificación reglamentaria.</span>
          </label>
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <Gavel className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">Acción registrada en log de auditoría con fecha/hora y motivo.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalBloqueoFila(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">Cancelar</button>
            <button
              disabled={!certificadoFila || loading}
              onClick={() => {
                if (!usuarioFila) return;
                void bloquearUsuario(usuarioFila.idUsuario, motivoFilaBloqueo).then(() => {
                  setModalBloqueoFila(false);
                  alert(`🔒 Acceso bloqueado para ${usuarioFila.nombre} ${usuarioFila.apellido}.`);
                });
              }}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5" />{loading ? 'Bloqueando...' : 'Confirmar Bloqueo'}
              </span>
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Modal Baja desde fila */}
      <AdminModal open={modalBajaFila} title={`Baja Definitiva — ${usuarioFila?.nombre ?? ''} ${usuarioFila?.apellido ?? ''}`} onClose={() => setModalBajaFila(false)} size="sm">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">Esta acción es irreversible. Se revocarán todos los accesos de <span className="font-bold">{usuarioFila?.nombre} {usuarioFila?.apellido}</span> permanentemente.</p>
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50">
            <input type="checkbox" checked={confirmadoBajaFila} onChange={(e) => setConfirmadoBajaFila(e.target.checked)} className="mt-0.5 accent-red-600" />
            <span className="text-sm text-red-800 font-medium">Entiendo que esta acción revocará todos los accesos de manera permanente.</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalBajaFila(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50">Cancelar</button>
            <button
              disabled={!confirmadoBajaFila || loading}
              onClick={() => {
                if (!usuarioFila) return;
                void desactivarUsuario(usuarioFila.idUsuario).then(() => {
                  setModalBajaFila(false);
                  alert(`🚫 Cuenta desactivada: ${usuarioFila.nombre} ${usuarioFila.apellido}.`);
                });
              }}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                <UserX className="w-3.5 h-3.5" />{loading ? 'Desactivando...' : 'Ejecutar Desactivación'}
              </span>
            </button>
          </div>
        </div>
      </AdminModal>

    </AppLayout>
  );
}
