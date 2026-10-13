'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Edit2, Trash2, Download, Search, Package,
  CheckCircle2, AlertTriangle, Upload, ShieldCheck,
  Eye, RefreshCw, Car, XCircle,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import AdminModal from '@/components/admin/AdminModal';
import AdminTable from '@/components/admin/AdminTable';
import { cn } from '@/lib/utils';
import { getStoredUser } from '@/lib/auth-storage';

interface Repuesto {
  idRepuesto: number;
  anioDesde: number;
  anioHasta: number;
  costoGtq: number;
  proveedor: string | null;
  fechaVigencia: string;
  estado: boolean;
  catalogoPieza: { idPiezaCatalogo: number; nombrePieza: string; categoria?: string };
  marca: { idMarca: number; nombreMarca: string };
  modelo: { idModelo: number; nombreModelo: string };
}

interface CatalogoPieza {
  idPiezaCatalogo: number;
  nombrePieza: string;
  categoria?: string;
}

interface Marca {
  idMarca: number;
  nombreMarca: string;
}

interface Modelo {
  idModelo: number;
  nombreModelo: string;
}

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const ANIOS = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i);

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('auth_token') ?? '';
}

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...authHeaders(), ...(init?.headers ?? {}) } });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(json.message) ? json.message.join('; ') : (json.message ?? `Error ${res.status}`);
    throw new Error(msg);
  }
  return json as T;
}

function isVigente(fechaVigencia: string): boolean {
  return new Date(fechaVigencia) >= new Date();
}

export default function RepuestosPage() {
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [piezas, setPiezas] = useState<CatalogoPieza[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Repuesto | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroMarca, setFiltroMarca] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [form, setForm] = useState({
    idPiezaCatalogo: 0, idMarca: 0, idModelo: 0,
    anioDesde: 2020, anioHasta: 2026,
    costoGtq: 0, proveedor: '', fechaVigencia: '', estado: true,
  });
  const [modalCompatibilidad, setModalCompatibilidad] = useState(false);
  const [repuestoSeleccionado, setRepuestoSeleccionado] = useState<Repuesto | null>(null);
  const [rol, setRol] = useState('');
  const esSoloLectura = rol === 'PERITO';

  const fechaAuditoria = new Date().toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const cargarRepuestos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<Repuesto[]>(`${BASE}/api/v1/admin/repuestos`);
      setRepuestos(data);
    } catch (e) {
      setApiError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarRepuestos();
    apiFetch<CatalogoPieza[]>(`${BASE}/api/v1/catalogos/piezas`).then(setPiezas).catch(() => {});
    apiFetch<Marca[]>(`${BASE}/api/v1/catalogos/marcas`).then(setMarcas).catch(() => {});
  }, [cargarRepuestos]);

  useEffect(() => { setRol(getStoredUser()?.rol ?? ''); }, []);

  useEffect(() => {
    if (!form.idMarca) { setModelos([]); return; }
    apiFetch<Modelo[]>(`${BASE}/api/v1/catalogos/marcas/${form.idMarca}/modelos`).then(setModelos).catch(() => setModelos([]));
  }, [form.idMarca]);

  async function withLoading(fn: () => Promise<void>) {
    setLoading(true);
    setApiError(null);
    try { await fn(); } catch (e) { setApiError((e as Error).message); } finally { setLoading(false); }
  }

  const openAdd = () => {
    setEditando(null);
    setForm({ idPiezaCatalogo: 0, idMarca: 0, idModelo: 0, anioDesde: 2020, anioHasta: 2026, costoGtq: 0, proveedor: '', fechaVigencia: new Date().toISOString().split('T')[0], estado: true });
    setModalOpen(true);
  };

  const openEdit = (r: Repuesto) => {
    setEditando(r);
    setForm({ idPiezaCatalogo: r.catalogoPieza.idPiezaCatalogo, idMarca: r.marca.idMarca, idModelo: r.modelo.idModelo, anioDesde: r.anioDesde, anioHasta: r.anioHasta, costoGtq: Number(r.costoGtq), proveedor: r.proveedor ?? '', fechaVigencia: r.fechaVigencia.split('T')[0], estado: r.estado });
    setModalOpen(true);
  };

  const guardarRepuesto = () => withLoading(async () => {
    if (editando) {
      await apiFetch(`${BASE}/api/v1/admin/repuestos/${editando.idRepuesto}`, { method: 'PATCH', body: JSON.stringify(form) });
    } else {
      await apiFetch(`${BASE}/api/v1/admin/repuestos`, { method: 'POST', body: JSON.stringify(form) });
    }
    setModalOpen(false);
    await cargarRepuestos();
  });

  const eliminarRepuesto = (id: number) => {
    if (!confirm('¿Eliminar este repuesto?')) return;
    void withLoading(async () => {
      await apiFetch(`${BASE}/api/v1/admin/repuestos/${id}`, { method: 'DELETE' });
      setRepuestos((prev) => prev.filter((r) => r.idRepuesto !== id));
    });
  };

  const toggleEstado = (id: number, nuevoEstado: boolean) => withLoading(async () => {
    await apiFetch(`${BASE}/api/v1/admin/repuestos/${id}`, { method: 'PATCH', body: JSON.stringify({ estado: nuevoEstado }) });
    setRepuestos((prev) => prev.map((r) => r.idRepuesto === id ? { ...r, estado: nuevoEstado } : r));
  });

  const renovarVigencia = (id: number) => withLoading(async () => {
    const fechaVigencia = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await apiFetch(`${BASE}/api/v1/admin/repuestos/${id}`, { method: 'PATCH', body: JSON.stringify({ fechaVigencia }) });
    setRepuestos((prev) => prev.map((r) => r.idRepuesto === id ? { ...r, fechaVigencia } : r));
  });

  const filtered = repuestos.filter((r) => {
    const q = busqueda.toLowerCase();
    const matchSearch = !busqueda || r.catalogoPieza.nombrePieza.toLowerCase().includes(q) || r.marca.nombreMarca.toLowerCase().includes(q) || r.modelo.nombreModelo.toLowerCase().includes(q) || (r.proveedor ?? '').toLowerCase().includes(q);
    const matchMarca = !filtroMarca || String(r.marca.idMarca) === filtroMarca;
    const matchEstado = !filtroEstado || (filtroEstado === 'activo' ? r.estado && isVigente(r.fechaVigencia) : filtroEstado === 'vencido' ? !isVigente(r.fechaVigencia) : !r.estado);
    return matchSearch && matchMarca && matchEstado;
  });

  const activos = repuestos.filter((r) => r.estado && isVigente(r.fechaVigencia)).length;
  const sinPrecioVigente = repuestos.filter((r) => r.estado && !isVigente(r.fechaVigencia)).length;

  const columns = [
    {
      key: 'sku',
      header: 'Código SKU',
      render: (r: Repuesto) => (
        <span className="text-[11px] font-mono font-semibold text-[#003399] bg-[#003399]/5 px-2 py-1 rounded">
          SKU-{String(r.idRepuesto).padStart(3, '0')}
        </span>
      ),
    },
    {
      key: 'pieza',
      header: 'Pieza / Componente',
      render: (r: Repuesto) => (
        <div>
          <p className="text-sm font-semibold text-slate-800">{r.catalogoPieza.nombrePieza}</p>
          {r.catalogoPieza.categoria && (
            <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">{r.catalogoPieza.categoria}</span>
          )}
        </div>
      ),
    },
    {
      key: 'compatibilidad',
      header: 'Compatibilidad Vehicular',
      render: (r: Repuesto) => (
        <div>
          <p className="text-sm font-medium text-slate-700">{r.marca.nombreMarca} {r.modelo.nombreModelo}</p>
          <p className="text-xs text-slate-400 font-mono">{r.anioDesde}–{r.anioHasta}</p>
        </div>
      ),
    },
    {
      key: 'proveedor',
      header: 'Proveedor Homologado',
      render: (r: Repuesto) => (
        <span className="text-xs text-slate-600">{r.proveedor ?? '—'}</span>
      ),
    },
    {
      key: 'precio',
      header: 'Precio Sugerido (Q)',
      align: 'right' as const,
      render: (r: Repuesto) => (
        <span className="text-sm font-bold text-slate-800 font-mono">
          <span className="text-slate-400 font-normal">Q </span>{Number(r.costoGtq).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'vigencia',
      header: 'Vigencia',
      render: (r: Repuesto) => (
        <span className="text-xs text-slate-500">{new Date(r.fechaVigencia).toLocaleDateString('es-GT')}</span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      align: 'center' as const,
      render: (r: Repuesto) => {
        const vigente = isVigente(r.fechaVigencia);
        if (!r.estado) return (
          <button
            onClick={() => void toggleEstado(r.idRepuesto, true)}
            disabled={esSoloLectura || loading}
            title={esSoloLectura ? 'No tienes permisos para modificar' : undefined}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            INACTIVO
          </button>
        );
        if (!vigente) return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />
            VENCIDA
          </span>
        );
        return (
          <button
            onClick={() => void toggleEstado(r.idRepuesto, false)}
            disabled={esSoloLectura || loading}
            title={esSoloLectura ? 'No tienes permisos para modificar' : undefined}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
          >
            ACTIVO
          </button>
        );
      },
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (r: Repuesto) => {
        const vencida = r.estado && !isVigente(r.fechaVigencia);
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => openEdit(r)}
              disabled={esSoloLectura || loading}
              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors disabled:opacity-50"
              title={esSoloLectura ? 'No tienes permisos para modificar' : 'Editar'}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {!esSoloLectura && (
              <button
                onClick={() => eliminarRepuesto(r.idRepuesto)}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                title="Eliminar"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => { setRepuestoSeleccionado(r); setModalCompatibilidad(true); }}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-[#003399]/10 text-[#003399] transition-colors disabled:opacity-50"
              title="Matriz de Compatibilidad"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            {vencida && !esSoloLectura && (
              <button
                onClick={() => void renovarVigencia(r.idRepuesto)}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500 transition-colors disabled:opacity-50"
                title="Renovar tarifa vencida"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <AppLayout breadcrumb={['Administración', 'Catálogo de Repuestos']}>
      <div className="space-y-5">
        {/* Error banner */}
        {apiError && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <XCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{apiError}</span>
            <button onClick={() => setApiError(null)} className="text-red-400 hover:text-red-600 font-bold leading-none">✕</button>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#003399] flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold text-slate-800">Catálogo de Precios de Repuestos</h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700 tracking-wide">
                    <ShieldCheck className="w-3 h-3" />
                    SOLO ADMINISTRADOR Y SUPERVISOR
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-0.5">Gestione precios de repuestos por pieza, marca, modelo y rango de años.</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <button disabled={loading} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50" title="Importar CSV/Excel">
                <Upload className="w-3.5 h-3.5" />
                Importar CSV
              </button>
              <button disabled={loading} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50">
                <Download className="w-3.5 h-3.5" />
                Exportar
              </button>
              {!esSoloLectura && (
                <button onClick={openAdd} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-[#003399] text-white rounded-lg text-xs font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors">
                  + Agregar Repuesto
                </button>
              )}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-[#003399]/10 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-[#003399]" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800 font-mono">{repuestos.length.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500">repuestos registrados</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-700 font-mono">{activos}</p>
                <p className="text-[11px] text-emerald-600">activos con vigencia</p>
              </div>
            </div>
            <div className={cn('flex items-center gap-3 p-3 rounded-xl border', sinPrecioVigente > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200')}>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', sinPrecioVigente > 0 ? 'bg-amber-100' : 'bg-slate-100')}>
                <AlertTriangle className={cn('w-4 h-4', sinPrecioVigente > 0 ? 'text-amber-600' : 'text-slate-400')} />
              </div>
              <div>
                <p className={cn('text-lg font-bold font-mono', sinPrecioVigente > 0 ? 'text-amber-700' : 'text-slate-600')}>{sinPrecioVigente}</p>
                <p className={cn('text-[11px]', sinPrecioVigente > 0 ? 'text-amber-600' : 'text-slate-500')}>sin precio vigente</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Buscar por pieza, marca, modelo o proveedor..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] focus:ring-2 focus:ring-[#00B5E2]/10" />
            </div>
            <select value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] bg-white">
              <option value="">Marca: Todas</option>
              {marcas.map((m) => <option key={m.idMarca} value={String(m.idMarca)}>{m.nombreMarca}</option>)}
            </select>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white">
              <option value="">Estado tarifario: Todos</option>
              <option value="activo">Activos con vigencia</option>
              <option value="vencido">Sin precio vigente</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
            <span className="font-semibold text-slate-600">Columnas requeridas para importación CSV: </span>
            SKU, Nombre Pieza, Marca, Modelo, Año Desde, Año Hasta, Costo GTQ, Proveedor
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-sm text-slate-500">
              Mostrando <span className="font-semibold text-slate-700">{filtered.length}</span> de <span className="font-semibold text-slate-700">{repuestos.length}</span> repuestos
            </p>
          </div>
          <AdminTable
            columns={columns}
            data={filtered}
            isLoading={isLoading}
            emptyText="No hay repuestos registrados. Agregue repuestos para que el sistema calcule costos automáticamente."
            keyExtractor={(r) => r.idRepuesto}
          />
        </div>
      </div>

      {/* Modal Matriz de Compatibilidad */}
      <AdminModal
        open={modalCompatibilidad}
        title="Matriz de Compatibilidad Vehicular"
        onClose={() => setModalCompatibilidad(false)}
      >
        {repuestoSeleccionado && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-sm font-bold text-slate-800">{repuestoSeleccionado.catalogoPieza.nombrePieza}</p>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">SKU-{String(repuestoSeleccionado.idRepuesto).padStart(3, '0')}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-sm font-bold text-emerald-700 font-mono shrink-0">
                Q {Number(repuestoSeleccionado.costoGtq).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Modelos Vinculados</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { modelo: 'Toyota Hilux', badge: 'Principal', badgeColor: 'bg-[#003399]/10 text-[#003399] border-[#003399]/20', anios: '2019–2024' },
                  { modelo: 'Toyota 4Runner', badge: 'Certificado', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', anios: '2020–2024' },
                  { modelo: 'Lexus GX', badge: 'Chasis Compartido', badgeColor: 'bg-slate-100 text-slate-600 border-slate-200', anios: '2021–2024' },
                ].map(({ modelo, badge, badgeColor, anios }) => (
                  <div key={modelo} className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#00B5E2]/40 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-[#003399]/10 flex items-center justify-center shrink-0">
                        <Car className="w-4 h-4 text-[#003399]" />
                      </div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{modelo}</p>
                    </div>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold border', badgeColor)}>{badge}</span>
                    <p className="text-[11px] text-slate-400 font-mono mt-1.5">Años: {anios}</p>
                  </div>
                ))}
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg text-xs font-semibold hover:border-[#003399]/40 hover:text-[#003399] transition-colors">
              + Agregar Compatibilidad
            </button>

            <p className="text-[11px] text-slate-400 text-center border-t border-slate-100 pt-3">
              Última auditoría: <span className="font-semibold text-slate-500">{fechaAuditoria}</span>
            </p>

            <button
              onClick={() => setModalCompatibilidad(false)}
              className="w-full px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        )}
      </AdminModal>

      {/* Modal Crear/Editar */}
      <AdminModal open={modalOpen} title={editando ? 'Editar Repuesto' : 'Nuevo Repuesto en Catálogo'} onClose={() => setModalOpen(false)} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Pieza / Componente *</label>
            <select value={form.idPiezaCatalogo} onChange={(e) => setForm((f) => ({ ...f, idPiezaCatalogo: Number(e.target.value) }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] bg-white">
              <option value={0}>Seleccione pieza</option>
              {piezas.map((p) => <option key={p.idPiezaCatalogo} value={p.idPiezaCatalogo}>{p.nombrePieza}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Marca Vehículo *</label>
            <select value={form.idMarca} onChange={(e) => setForm((f) => ({ ...f, idMarca: Number(e.target.value), idModelo: 0 }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] bg-white">
              <option value={0}>Seleccione marca</option>
              {marcas.map((m) => <option key={m.idMarca} value={m.idMarca}>{m.nombreMarca}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Modelo Vehículo *</label>
            <select value={form.idModelo} onChange={(e) => setForm((f) => ({ ...f, idModelo: Number(e.target.value) }))} disabled={!form.idMarca} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] bg-white disabled:bg-slate-50">
              <option value={0}>{!form.idMarca ? 'Seleccione marca primero' : 'Seleccione modelo'}</option>
              {modelos.map((m) => <option key={m.idModelo} value={m.idModelo}>{m.nombreModelo}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Año Desde *</label>
            <select value={form.anioDesde} onChange={(e) => setForm((f) => ({ ...f, anioDesde: Number(e.target.value) }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-white">
              {ANIOS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Año Hasta *</label>
            <select value={form.anioHasta} onChange={(e) => setForm((f) => ({ ...f, anioHasta: Number(e.target.value) }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none bg-white">
              {ANIOS.filter((a) => a >= form.anioDesde).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Precio Sugerido Homologado (GTQ) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono">Q</span>
              <input type="number" min={0} step={0.01} value={form.costoGtq} onChange={(e) => setForm((f) => ({ ...f, costoGtq: Number(e.target.value) }))} className="w-full pl-7 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2]" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Proveedor Asignado</label>
            <input type="text" value={form.proveedor} onChange={(e) => setForm((f) => ({ ...f, proveedor: e.target.value }))} placeholder="Nombre del proveedor" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Fecha Límite Vigencia *</label>
            <input type="date" value={form.fechaVigencia} onChange={(e) => setForm((f) => ({ ...f, fechaVigencia: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2]" />
          </div>
          {form.idMarca > 0 && form.idModelo > 0 && (
            <div className="sm:col-span-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Este repuesto aplicará a: {marcas.find((m) => m.idMarca === form.idMarca)?.nombreMarca} {modelos.find((m) => m.idModelo === form.idModelo)?.nombreModelo} — Años {form.anioDesde} a {form.anioHasta}
              </p>
            </div>
          )}
          <div className="sm:col-span-2 flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} disabled={loading} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors">Cancelar</button>
            <button
              onClick={() => void guardarRepuesto()}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#003399] text-white rounded-lg text-sm font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar Repuesto'}
            </button>
          </div>
        </div>
      </AdminModal>
    </AppLayout>
  );
}
