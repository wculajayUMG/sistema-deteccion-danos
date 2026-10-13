'use client';
import { useState, useEffect, useCallback } from 'react';
import { Edit2, Trash2, Download, Search, Settings2, AlertTriangle, Activity, XCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import AdminModal from '@/components/admin/AdminModal';
import AdminTable from '@/components/admin/AdminTable';
import { cn } from '@/lib/utils';
import { getStoredUser } from '@/lib/auth-storage';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('auth_token') ?? '';
}
function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}
async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...authHeaders(), ...(opts?.headers ?? {}) } });
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

interface CatalogoPieza { idPiezaCatalogo: number; nombrePieza: string; categoria: string }
interface Baremo {
  idBaremo: number;
  tipoGolpe: string;
  costoManoObraGtq: number;
  fechaVigencia: string;
  estado: boolean;
  catalogoPieza: CatalogoPieza;
}

const TIPO_GOLPE_OPTIONS = [
  { value: 'GOLPE_PEQUEÑO', label: 'Golpe Pequeño', hint: '< 5 cm² sin deformación' },
  { value: 'GOLPE_MEDIANO', label: 'Golpe Mediano', hint: '5–20 cm² o afección simple' },
  { value: 'GOLPE_GRANDE', label: 'Golpe Grande', hint: '> 20 cm² o compromiso estructural' },
];
const TIPO_GOLPE_BADGE: Record<string, string> = {
  GOLPE_PEQUEÑO: 'bg-blue-50 text-blue-700 border border-blue-200',
  GOLPE_MEDIANO: 'bg-[#00B5E2]/10 text-[#00B5E2] border border-[#00B5E2]/30',
  GOLPE_GRANDE: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
};
const TIPO_GOLPE_LABEL: Record<string, string> = {
  GOLPE_PEQUEÑO: 'GOLPE PEQUEÑO', GOLPE_MEDIANO: 'GOLPE MEDIANO', GOLPE_GRANDE: 'GOLPE GRANDE',
};
const CATEGORIA_BADGE: Record<string, string> = {
  Carrocería: 'bg-[#003399]/10 text-[#003399]',
  Cristales: 'bg-slate-100 text-slate-600',
  Mecánica: 'bg-orange-50 text-orange-700',
  Pintura: 'bg-purple-50 text-purple-700',
  Eléctrico: 'bg-yellow-50 text-yellow-700',
};

function exportCSV(baremos: Baremo[]) {
  const header = 'ID,Pieza,Categoría,Tipo Golpe,Costo MO GTQ,Fecha Vigencia,Estado';
  const rows = baremos.map((b) =>
    [b.idBaremo, b.catalogoPieza.nombrePieza, b.catalogoPieza.categoria, b.tipoGolpe,
     Number(b.costoManoObraGtq).toFixed(2), b.fechaVigencia.split('T')[0], b.estado ? 'Activo' : 'Inactivo'].join(','),
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'baremos.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function BaremosPage() {
  const [baremos, setBaremos] = useState<Baremo[]>([]);
  const [piezas, setPiezas] = useState<CatalogoPieza[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Baremo | null>(null);
  const [modalDesactivar, setModalDesactivar] = useState(false);
  const [baremoSeleccionado, setBaremoSeleccionado] = useState<Baremo | null>(null);

  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState({
    idPiezaCatalogo: 0, tipoGolpe: 'GOLPE_PEQUEÑO', costoManoObraGtq: 0, fechaVigencia: '', estado: true,
  });
  const [rol, setRol] = useState('');
  const esSoloLectura = rol === 'PERITO';

  // ── carga inicial ─────────────────────────────────────────────────────────

  const cargarBaremos = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await apiFetch<Baremo[]>('/api/v1/admin/baremos');
      setBaremos(data);
    } catch (e) {
      setApiError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarBaremos();
    apiFetch<CatalogoPieza[]>('/api/v1/catalogos/piezas').then(setPiezas).catch(() => { /* catálogo opcional */ });
  }, [cargarBaremos]);

  useEffect(() => { setRol(getStoredUser()?.rol ?? ''); }, []);

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
    setForm({ idPiezaCatalogo: piezas[0]?.idPiezaCatalogo ?? 0, tipoGolpe: 'GOLPE_PEQUEÑO', costoManoObraGtq: 0, fechaVigencia: new Date().toISOString().split('T')[0], estado: true });
    setModalOpen(true);
  };
  const openEdit = (b: Baremo) => {
    setEditando(b);
    setForm({ idPiezaCatalogo: b.catalogoPieza.idPiezaCatalogo, tipoGolpe: b.tipoGolpe, costoManoObraGtq: Number(b.costoManoObraGtq), fechaVigencia: b.fechaVigencia.split('T')[0], estado: b.estado });
    setModalOpen(true);
  };

  async function guardarBaremo() {
    await withLoading(async () => {
      if (editando) {
        await apiFetch(`/api/v1/admin/baremos/${editando.idBaremo}`, { method: 'PATCH', body: JSON.stringify(form) });
      } else {
        await apiFetch('/api/v1/admin/baremos', { method: 'POST', body: JSON.stringify(form) });
      }
      setModalOpen(false);
      setEditando(null);
      await cargarBaremos();
    });
  }

  async function eliminarBaremo(id: number) {
    await withLoading(async () => {
      await apiFetch(`/api/v1/admin/baremos/${id}`, { method: 'DELETE' });
      setBaremos((prev) => prev.filter((b) => b.idBaremo !== id));
    });
  }

  async function toggleEstado(id: number, nuevoEstado: boolean) {
    await withLoading(async () => {
      await apiFetch(`/api/v1/admin/baremos/${id}`, { method: 'PATCH', body: JSON.stringify({ estado: nuevoEstado }) });
      setBaremos((prev) => prev.map((b) => b.idBaremo === id ? { ...b, estado: nuevoEstado } : b));
    });
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const categorias = [...new Set(baremos.map((b) => b.catalogoPieza.categoria).filter(Boolean))];
  const activas = baremos.filter((b) => b.estado).length;

  const filtered = baremos.filter((b) => {
    const matchBusqueda = !busqueda || b.catalogoPieza.nombrePieza.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = !filtroCategoria || b.catalogoPieza.categoria === filtroCategoria;
    const matchTipo = !filtroTipo || b.tipoGolpe === filtroTipo;
    const matchEstado = filtroEstado === '' ? true : filtroEstado === 'activo' ? b.estado : !b.estado;
    return matchBusqueda && matchCategoria && matchTipo && matchEstado;
  });

  const columns = [
    {
      key: 'num', header: '#',
      render: (b: Baremo) => <span className="text-xs font-mono text-slate-400">#{b.idBaremo}</span>,
    },
    {
      key: 'pieza', header: 'Pieza / Componente',
      render: (b: Baremo) => (
        <div>
          <p className="text-sm font-semibold text-slate-800">{b.catalogoPieza.nombrePieza}</p>
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 inline-block', CATEGORIA_BADGE[b.catalogoPieza.categoria] ?? 'bg-slate-100 text-slate-600')}>
            {b.catalogoPieza.categoria}
          </span>
        </div>
      ),
    },
    {
      key: 'tipo', header: 'Tipo de Golpe',
      render: (b: Baremo) => (
        <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide', TIPO_GOLPE_BADGE[b.tipoGolpe] ?? 'bg-gray-100')}>
          {TIPO_GOLPE_LABEL[b.tipoGolpe] ?? b.tipoGolpe.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'costo', header: 'Costo Mano de Obra (Q)', align: 'right' as const,
      render: (b: Baremo) => (
        <span className="text-sm font-bold text-slate-800 font-mono">
          <span className="text-slate-400 font-normal">Q </span>{Number(b.costoManoObraGtq).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'vigencia', header: 'Fecha Vigencia',
      render: (b: Baremo) => <span className="text-xs text-slate-500">{new Date(b.fechaVigencia).toLocaleDateString('es-GT')}</span>,
    },
    {
      key: 'estado', header: 'Estado', align: 'center' as const,
      render: (b: Baremo) => (
        <button
          disabled={esSoloLectura || loading}
          onClick={() => {
            if (b.estado) {
              setBaremoSeleccionado(b);
              setModalDesactivar(true);
            } else {
              void toggleEstado(b.idBaremo, true);
            }
          }}
          title={esSoloLectura ? 'No tienes permisos para modificar' : b.estado ? 'Desactivar' : 'Activar'}
        >
          <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide', b.estado ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200')}>
            {b.estado ? 'ACTIVO' : 'INACTIVO'}
          </span>
        </button>
      ),
    },
    {
      key: 'acciones', header: 'Acciones',
      render: (b: Baremo) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(b)}
            disabled={esSoloLectura || loading}
            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors disabled:opacity-50"
            title={esSoloLectura ? 'No tienes permisos para modificar' : 'Editar'}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {!esSoloLectura && (
            <button
              onClick={() => { if (confirm('¿Eliminar esta tarifa definitivamente?')) void eliminarBaremo(b.idBaremo); }}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppLayout breadcrumb={['Administración', 'Baremos de Tarifas']}>
      <div className="space-y-5">

        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#003399] flex items-center justify-center shrink-0">
                <Settings2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Gestión de Tarifas de Mano de Obra</h1>
                <p className="text-sm text-slate-500 mt-0.5">Administre los costos de mano de obra por pieza y tipo de golpe.</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    Redis: CONECTADO
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00B5E2]/10 border border-[#00B5E2]/20 text-xs font-semibold text-[#00B5E2]">
                    <Activity className="w-3.5 h-3.5" />{activas} tarifas activas
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => exportCSV(filtered)} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors">
                <Download className="w-3.5 h-3.5" />Exportar CSV
              </button>
              {!esSoloLectura && (
                <button onClick={openAdd} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-[#003399] text-white rounded-lg text-xs font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors">
                  + Agregar Nueva Tarifa
                </button>
              )}
            </div>
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
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Buscar por pieza..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] focus:ring-2 focus:ring-[#00B5E2]/10" />
            </div>
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] bg-white">
              <option value="">Categoría: Todas</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white">
              <option value="">Tipo de Golpe: Todos</option>
              {TIPO_GOLPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none bg-white">
              <option value="">Estado: Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-sm text-slate-500">
              Mostrando <span className="font-semibold text-slate-700">{filtered.length}</span> de <span className="font-semibold text-slate-700">{baremos.length}</span> tarifas
            </p>
          </div>
          <AdminTable columns={columns} data={filtered} isLoading={isLoading} emptyText="No hay tarifas registradas" keyExtractor={(b) => b.idBaremo} />
        </div>

      </div>

      {/* Modal Confirmar Desactivación */}
      <AdminModal open={modalDesactivar} title="¿Desactivar Tarifa?" onClose={() => setModalDesactivar(false)} size="sm">
        {baremoSeleccionado && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-1">ID Baremo</p>
                <p className="text-sm font-bold text-slate-700 font-mono">#{baremoSeleccionado.idBaremo}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-1">Componente</p>
                <p className="text-xs font-semibold text-slate-700 leading-tight">{baremoSeleccionado.catalogoPieza.nombrePieza}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-1">Severidad</p>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', TIPO_GOLPE_BADGE[baremoSeleccionado.tipoGolpe] ?? 'bg-gray-100')}>
                  {TIPO_GOLPE_LABEL[baremoSeleccionado.tipoGolpe] ?? baremoSeleccionado.tipoGolpe}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700">Esta acción purgará la entrada de caché Redis asociada. El motor de cálculo recalculará los costos en la próxima solicitud.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModalDesactivar(false)} disabled={loading} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button
                disabled={loading}
                onClick={() => {
                  void toggleEstado(baremoSeleccionado.idBaremo, false).then(() => {
                    setModalDesactivar(false);
                    setBaremoSeleccionado(null);
                  });
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Desactivando...' : 'Confirmar Desactivación'}
              </button>
            </div>
          </div>
        )}
      </AdminModal>

      {/* Modal crear/editar */}
      <AdminModal open={modalOpen} title={editando ? 'Editar Tarifa de Mano de Obra' : 'Nueva Tarifa de Mano de Obra'} onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Pieza / Componente *</label>
            <select value={form.idPiezaCatalogo} onChange={(e) => setForm((f) => ({ ...f, idPiezaCatalogo: Number(e.target.value) }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] bg-white">
              {piezas.map((p) => <option key={p.idPiezaCatalogo} value={p.idPiezaCatalogo}>{p.nombrePieza}{p.categoria ? ` (${p.categoria})` : ''}</option>)}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">El Cambio de Pieza se gestiona en Catálogo de Repuestos.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Categoría</label>
            <select value={piezas.find((p) => p.idPiezaCatalogo === form.idPiezaCatalogo)?.categoria ?? ''} disabled className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500">
              <option>{piezas.find((p) => p.idPiezaCatalogo === form.idPiezaCatalogo)?.categoria ?? 'Auto-asignada'}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Tipo de Golpe *</label>
            <select value={form.tipoGolpe} onChange={(e) => setForm((f) => ({ ...f, tipoGolpe: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] bg-white">
              {TIPO_GOLPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label} — {t.hint}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Costo Mano de Obra (GTQ) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-mono">Q</span>
              <input type="number" min={0} step={0.01} value={form.costoManoObraGtq} onChange={(e) => setForm((f) => ({ ...f, costoManoObraGtq: Number(e.target.value) }))} className="w-full pl-7 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2]" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Monto neto sin IVA de mano de obra sugerida.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Fecha de Vigencia *</label>
            <input type="date" value={form.fechaVigencia} onChange={(e) => setForm((f) => ({ ...f, fechaVigencia: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2]" />
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-700">Aviso de Invalidación de Caché</p>
              <p className="text-xs text-amber-600 mt-0.5">Al guardar, el sistema purgará el caché Redis y actualizará los baremos en tiempo real para todos los valuadores.</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={() => void guardarBaremo()} disabled={loading} className="flex-1 px-4 py-2.5 bg-[#003399] text-white rounded-lg text-sm font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors">
              {loading ? 'Guardando...' : 'Guardar Tarifa'}
            </button>
          </div>
        </div>
      </AdminModal>

    </AppLayout>
  );
}
