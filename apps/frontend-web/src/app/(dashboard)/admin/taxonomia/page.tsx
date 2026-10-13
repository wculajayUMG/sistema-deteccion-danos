'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ChevronRight, Car, Factory, List, LayoutGrid, PlusCircle, Layers, XCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import AdminModal from '@/components/admin/AdminModal';
import { cn } from '@/lib/utils';
import { getStoredUser } from '@/lib/auth-storage';

interface Marca {
  idMarca: number;
  nombreMarca: string;
  estado: boolean;
}

interface Modelo {
  idModelo: number;
  nombreModelo: string;
  linea: string | null;
  estado: boolean;
}

type ViewMode = 'list' | 'cards';

const MOCK_LINEAS = [
  { nombre: 'Doble Cabina 4x4', anios: '2019–2024', motor: '2.8L Diesel / 204 HP', rig: 'Pickup', repuestos: 32 },
  { nombre: 'Cabina Simple 4x2', anios: '2018–2023', motor: '2.4L Gasolina / 150 HP', rig: 'Pickup', repuestos: 18 },
  { nombre: 'Extra Cab 4x4', anios: '2020–2024', motor: '2.8L Diesel / 204 HP', rig: 'Pickup', repuestos: 24 },
];

const RIG_OPTIONS = ['Pickup', 'SUV', 'Sedán', 'Van', 'Camión'];

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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

export default function TaxonomiaPage() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [loadingMarcas, setLoadingMarcas] = useState(true);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [rol, setRol] = useState('');
  const esSoloLectura = rol === 'PERITO';
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<Marca | null>(null);
  const [modeloSeleccionado, setModeloSeleccionado] = useState<Modelo | null>(null);
  const [modal, setModal] = useState<null | 'marca' | 'modelo'>(null);
  const [editObj, setEditObj] = useState<Marca | Modelo | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [formMarca, setFormMarca] = useState({ nombreMarca: '', estado: true });
  const [formModelo, setFormModelo] = useState({ nombreModelo: '', linea: '', estado: true });
  const [modalAgregarLinea, setModalAgregarLinea] = useState(false);
  const [formLinea, setFormLinea] = useState({ nombre: '', anioDesde: 2020, anioHasta: 2026, rig: 'Pickup' });

  const cargarMarcas = useCallback(async () => {
    setLoadingMarcas(true);
    try {
      const data = await apiFetch<Marca[]>(`${BASE}/api/v1/catalogos/marcas`);
      setMarcas(data);
    } catch (e) {
      setApiError((e as Error).message);
    } finally {
      setLoadingMarcas(false);
    }
  }, []);

  const cargarModelos = useCallback(async (idMarca: number) => {
    setLoadingModelos(true);
    try {
      const data = await apiFetch<Modelo[]>(`${BASE}/api/v1/catalogos/marcas/${idMarca}/modelos`);
      setModelos(data);
    } catch (e) {
      setApiError((e as Error).message);
      setModelos([]);
    } finally {
      setLoadingModelos(false);
    }
  }, []);

  useEffect(() => {
    void cargarMarcas();
  }, [cargarMarcas]);

  useEffect(() => { setRol(getStoredUser()?.rol ?? ''); }, []);

  const seleccionarMarca = (marca: Marca) => {
    setMarcaSeleccionada(marca);
    setModeloSeleccionado(null);
    setModelos([]);
    void cargarModelos(marca.idMarca);
  };

  async function withLoading(fn: () => Promise<void>) {
    setLoading(true);
    setApiError(null);
    try { await fn(); } catch (e) { setApiError((e as Error).message); } finally { setLoading(false); }
  }

  const guardarMarca = () => withLoading(async () => {
    if (editObj) {
      await apiFetch(`${BASE}/api/v1/admin/marcas/${(editObj as Marca).idMarca}`, {
        method: 'PATCH',
        body: JSON.stringify({ nombreMarca: formMarca.nombreMarca }),
      });
    } else {
      await apiFetch(`${BASE}/api/v1/admin/marcas`, {
        method: 'POST',
        body: JSON.stringify({ nombreMarca: formMarca.nombreMarca }),
      });
    }
    setModal(null);
    setEditObj(null);
    await cargarMarcas();
  });

  const eliminarMarca = (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar marca ${nombre}?`)) return;
    void withLoading(async () => {
      await apiFetch(`${BASE}/api/v1/admin/marcas/${id}`, { method: 'DELETE' });
      setMarcas((prev) => prev.filter((m) => m.idMarca !== id));
      if (marcaSeleccionada?.idMarca === id) {
        setMarcaSeleccionada(null);
        setModeloSeleccionado(null);
        setModelos([]);
      }
    });
  };

  const guardarModelo = () => withLoading(async () => {
    if (!marcaSeleccionada) return;
    if (editObj) {
      await apiFetch(`${BASE}/api/v1/admin/modelos/${(editObj as Modelo).idModelo}`, {
        method: 'PATCH',
        body: JSON.stringify({ nombreModelo: formModelo.nombreModelo, linea: formModelo.linea || undefined }),
      });
    } else {
      await apiFetch(`${BASE}/api/v1/admin/modelos`, {
        method: 'POST',
        body: JSON.stringify({ idMarca: marcaSeleccionada.idMarca, nombreModelo: formModelo.nombreModelo, linea: formModelo.linea || undefined }),
      });
    }
    setModal(null);
    setEditObj(null);
    await cargarModelos(marcaSeleccionada.idMarca);
  });

  const eliminarModelo = (id: number, nombre: string) => {
    if (!confirm(`¿Eliminar modelo ${nombre}?`)) return;
    void withLoading(async () => {
      await apiFetch(`${BASE}/api/v1/admin/modelos/${id}`, { method: 'DELETE' });
      setModelos((prev) => prev.filter((m) => m.idModelo !== id));
      if (modeloSeleccionado?.idModelo === id) setModeloSeleccionado(null);
    });
  };

  const totalLineas = modelos.filter((m) => m.linea).length;

  return (
    <AppLayout breadcrumb={['Administración', 'Taxonomía de Vehículos']}>
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
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Gestión de Marcas, Modelos y Líneas de Vehículos</h1>
                <p className="text-sm text-slate-500 mt-0.5">Los ajustadores seleccionan desde este catálogo al registrar un siniestro.</p>
              </div>
            </div>
            {/* View toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', viewMode === 'list' ? 'bg-white shadow-sm text-[#003399]' : 'text-slate-500 hover:text-slate-700')}
              >
                <List className="w-3.5 h-3.5" />
                Vista Árbol
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', viewMode === 'cards' ? 'bg-white shadow-sm text-[#003399]' : 'text-slate-500 hover:text-slate-700')}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Vista Tarjetas
              </button>
            </div>
          </div>

          {/* KPI badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#003399]/10 border border-[#003399]/20 text-xs font-semibold text-[#003399]">
              <Factory className="w-3.5 h-3.5" />
              {marcas.length} marcas registradas
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00B5E2]/10 border border-[#00B5E2]/20 text-xs font-semibold text-[#00B5E2]">
              <Car className="w-3.5 h-3.5" />
              {marcaSeleccionada ? `${modelos.length} modelos — ${marcaSeleccionada.nombreMarca}` : `${marcas.length > 0 ? '—' : '0'} modelos activos`}
            </span>
            {totalLineas > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-xs font-semibold text-purple-700">
                <List className="w-3.5 h-3.5" />
                {totalLineas} líneas configuradas
              </span>
            )}
            {modeloSeleccionado && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700">
                <Layers className="w-3.5 h-3.5" />
                {MOCK_LINEAS.length} líneas — {modeloSeleccionado.nombreModelo}
              </span>
            )}
          </div>
        </div>

        {/* 3-panel layout */}
        <div className="flex flex-col lg:flex-row gap-4 items-start">

          {/* Panel 1 — Marcas (25%) */}
          <div className="w-full lg:w-[25%] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 bg-[#003399]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Factory className="w-4 h-4" />
                  1. Marcas
                </h3>
                <p className="text-xs text-white/60 mt-0.5">{marcas.length} · A-Z</p>
              </div>
              {!esSoloLectura && (
                <button
                  onClick={() => { setEditObj(null); setFormMarca({ nombreMarca: '', estado: true }); setModal('marca'); }}
                  disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-50 max-h-[520px] overflow-y-auto">
              {loadingMarcas ? (
                <div className="p-8 text-center text-sm text-slate-400 animate-pulse">Cargando...</div>
              ) : marcas.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">Sin marcas</div>
              ) : (
                [...marcas].sort((a, b) => a.nombreMarca.localeCompare(b.nombreMarca)).map((m) => (
                  <div
                    key={m.idMarca}
                    onClick={() => seleccionarMarca(m)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 cursor-pointer transition-all',
                      marcaSeleccionada?.idMarca === m.idMarca
                        ? 'bg-[#00B5E2]/8 border-l-4 border-l-[#00B5E2]'
                        : 'hover:bg-slate-50 border-l-4 border-l-transparent',
                    )}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs font-bold', marcaSeleccionada?.idMarca === m.idMarca ? 'bg-[#00B5E2] text-white' : 'bg-slate-100 text-slate-600')}>
                        {m.nombreMarca.charAt(0)}
                      </div>
                      <span className={cn('text-xs font-semibold truncate', marcaSeleccionada?.idMarca === m.idMarca ? 'text-[#003399]' : 'text-slate-800')}>
                        {m.nombreMarca}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 ml-1 shrink-0">
                      <ChevronRight className={cn('w-3.5 h-3.5', marcaSeleccionada?.idMarca === m.idMarca ? 'text-[#00B5E2]' : 'text-slate-300')} />
                      {!esSoloLectura && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditObj(m); setFormMarca({ nombreMarca: m.nombreMarca, estado: m.estado }); setModal('marca'); }}
                            disabled={loading}
                            className="p-1 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors disabled:opacity-50"
                            title="Editar"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); eliminarMarca(m.idMarca, m.nombreMarca); }}
                            disabled={loading}
                            className="p-1 rounded-lg hover:bg-red-50 text-red-400 transition-colors disabled:opacity-50"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel 2 — Modelos (35%) */}
          <div className="w-full lg:w-[35%] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 bg-[#003399]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  2. {marcaSeleccionada ? `Modelos de ${marcaSeleccionada.nombreMarca}` : 'Modelos'}
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  {marcaSeleccionada ? `${modelos.length} modelos` : 'Selecciona una marca'}
                </p>
              </div>
              {marcaSeleccionada && !esSoloLectura && (
                <button
                  onClick={() => { setEditObj(null); setFormModelo({ nombreModelo: '', linea: '', estado: true }); setModal('modelo'); }}
                  disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              )}
            </div>

            <div className={cn('max-h-[520px] overflow-y-auto', viewMode === 'cards' && marcaSeleccionada ? 'p-4 grid grid-cols-1 gap-3' : 'divide-y divide-slate-50')}>
              {!marcaSeleccionada ? (
                <div className="p-8 text-center text-sm text-slate-400">← Seleccione una marca para ver sus modelos</div>
              ) : loadingModelos ? (
                <div className="p-8 text-center text-sm text-slate-400 animate-pulse">Cargando modelos...</div>
              ) : modelos.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">Sin modelos para esta marca</div>
              ) : viewMode === 'cards' ? (
                modelos.map((mod) => (
                  <div
                    key={mod.idModelo}
                    onClick={() => setModeloSeleccionado(mod)}
                    className={cn(
                      'p-4 rounded-xl border transition-colors cursor-pointer',
                      modeloSeleccionado?.idModelo === mod.idModelo
                        ? 'border-[#00B5E2] bg-[#00B5E2]/5'
                        : 'border-slate-200 hover:border-[#00B5E2]/40 bg-slate-50/50',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800">{mod.nombreModelo}</p>
                        {mod.linea && <p className="text-xs text-slate-500 mt-1 truncate">{mod.linea}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          {!mod.estado && <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">Inactivo</span>}
                          {mod.linea && <span className="text-[10px] bg-[#00B5E2]/10 text-[#00B5E2] px-2 py-0.5 rounded-full border border-[#00B5E2]/20 font-medium">Con línea</span>}
                        </div>
                      </div>
                      {!esSoloLectura && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditObj(mod); setFormModelo({ nombreModelo: mod.nombreModelo, linea: mod.linea ?? '', estado: mod.estado }); setModal('modelo'); }}
                            disabled={loading}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 disabled:opacity-50"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); eliminarModelo(mod.idModelo, mod.nombreModelo); }}
                            disabled={loading}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 disabled:opacity-50"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                modelos.map((mod) => (
                  <div
                    key={mod.idModelo}
                    onClick={() => setModeloSeleccionado(mod)}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 cursor-pointer transition-all border-l-4',
                      modeloSeleccionado?.idModelo === mod.idModelo
                        ? 'bg-[#00B5E2]/8 border-l-[#00B5E2]'
                        : 'hover:bg-slate-50 border-l-transparent',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-semibold truncate', modeloSeleccionado?.idModelo === mod.idModelo ? 'text-[#003399]' : 'text-slate-800')}>{mod.nombreModelo}</p>
                      {mod.linea && <p className="text-xs text-slate-400 truncate mt-0.5">{mod.linea}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {!mod.estado && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">Inactivo</span>}
                      <ChevronRight className={cn('w-3.5 h-3.5', modeloSeleccionado?.idModelo === mod.idModelo ? 'text-[#00B5E2]' : 'text-slate-300')} />
                      {!esSoloLectura && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditObj(mod); setFormModelo({ nombreModelo: mod.nombreModelo, linea: mod.linea ?? '', estado: mod.estado }); setModal('modelo'); }}
                            disabled={loading}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 disabled:opacity-50"
                            title="Editar"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); eliminarModelo(mod.idModelo, mod.nombreModelo); }}
                            disabled={loading}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 disabled:opacity-50"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {marcaSeleccionada && (
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
                <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0"></span>
                  Los modelos se cruzan con el Catálogo de Repuestos por Marca + Modelo + Año.
                </p>
              </div>
            )}
          </div>

          {/* Panel 3 — Líneas (40%) */}
          <div className="w-full lg:w-[40%] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 bg-[#003399]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  3. {modeloSeleccionado ? `Líneas de ${modeloSeleccionado.nombreModelo}` : 'Líneas'}
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  {modeloSeleccionado ? `${MOCK_LINEAS.length} líneas configuradas` : 'Selecciona un modelo'}
                </p>
              </div>
              {modeloSeleccionado && !esSoloLectura && (
                <button
                  onClick={() => { setFormLinea({ nombre: '', anioDesde: 2020, anioHasta: 2026, rig: 'Pickup' }); setModalAgregarLinea(true); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold text-white transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  + Agregar Línea
                </button>
              )}
            </div>

            <div className="max-h-[520px] overflow-y-auto">
              {!modeloSeleccionado ? (
                <div className="p-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Layers className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400">Selecciona un modelo para ver sus líneas</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {MOCK_LINEAS.map((linea) => (
                    <div key={linea.nombre} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-[#00B5E2]/40 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-bold text-slate-800">{linea.nombre}</p>
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0 font-mono">
                          Año: {linea.anios}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{linea.motor}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold bg-[#003399]/10 text-[#003399] border border-[#003399]/20 px-2 py-0.5 rounded-full">
                          3D Rig: {linea.rig}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {linea.repuestos} repuestos vinculados
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Modal Marca */}
      <AdminModal open={modal === 'marca'} title={editObj ? 'Editar Marca' : 'Nueva Marca de Vehículo'} onClose={() => setModal(null)} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nombre de la Marca *</label>
            <input type="text" value={formMarca.nombreMarca} onChange={(e) => setFormMarca((f) => ({ ...f, nombreMarca: e.target.value }))} placeholder="ej. Toyota, Hyundai, Kia..." className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] focus:ring-2 focus:ring-[#00B5E2]/10" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="estadoMarca" checked={formMarca.estado} onChange={(e) => setFormMarca((f) => ({ ...f, estado: e.target.checked }))} className="w-4 h-4 accent-[#00B5E2]" />
            <label htmlFor="estadoMarca" className="text-sm text-slate-600 cursor-pointer">{formMarca.estado ? 'Activa para valuaciones GTQ' : 'Inactiva'}</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(null)} disabled={loading} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors">Cancelar</button>
            <button
              onClick={() => void guardarMarca()}
              disabled={loading || !formMarca.nombreMarca.trim()}
              className="flex-1 px-4 py-2.5 bg-[#003399] text-white rounded-lg text-sm font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar Marca'}
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Modal Modelo */}
      <AdminModal open={modal === 'modelo'} title={editObj ? 'Editar Modelo' : `Nuevo Modelo — ${marcaSeleccionada?.nombreMarca ?? ''}`} onClose={() => setModal(null)} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nombre del Modelo *</label>
            <input type="text" value={formModelo.nombreModelo} onChange={(e) => setFormModelo((f) => ({ ...f, nombreModelo: e.target.value }))} placeholder="ej. Corolla, Accent, Sportage..." className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] focus:ring-2 focus:ring-[#00B5E2]/10" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Línea / Versión</label>
            <input type="text" value={formModelo.linea} onChange={(e) => setFormModelo((f) => ({ ...f, linea: e.target.value }))} placeholder="ej. 2.4L Diesel 4x4 SR5, SE, GL (opcional)" className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] focus:ring-2 focus:ring-[#00B5E2]/10" />
            <p className="text-[11px] text-slate-400 mt-1">Se usa para mapeo 3D y cruce con Catálogo de Repuestos.</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="estadoModelo" checked={formModelo.estado} onChange={(e) => setFormModelo((f) => ({ ...f, estado: e.target.checked }))} className="w-4 h-4 accent-[#00B5E2]" />
            <label htmlFor="estadoModelo" className="text-sm text-slate-600 cursor-pointer">{formModelo.estado ? 'Activo' : 'Inactivo'}</label>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-700 flex items-start gap-2">
            <Car className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Al guardar, la línea se cruza automáticamente con el Catálogo de Repuestos según Marca + Modelo + Rango de Años.</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(null)} disabled={loading} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors">Cancelar</button>
            <button
              onClick={() => void guardarModelo()}
              disabled={loading || !formModelo.nombreModelo.trim()}
              className="flex-1 px-4 py-2.5 bg-[#003399] text-white rounded-lg text-sm font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : 'Guardar Modelo'}
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Modal Agregar Línea */}
      <AdminModal open={modalAgregarLinea} title={`Agregar Línea — ${modeloSeleccionado?.nombreModelo ?? ''}`} onClose={() => setModalAgregarLinea(false)} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nombre de línea *</label>
            <input
              type="text"
              value={formLinea.nombre}
              onChange={(e) => setFormLinea((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="ej. Doble Cabina 4x4, SR5, GL..."
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] focus:ring-2 focus:ring-[#00B5E2]/10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Año Desde *</label>
              <input
                type="number"
                min={1990}
                max={2030}
                value={formLinea.anioDesde}
                onChange={(e) => setFormLinea((f) => ({ ...f, anioDesde: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Año Hasta *</label>
              <input
                type="number"
                min={formLinea.anioDesde}
                max={2030}
                value={formLinea.anioHasta}
                onChange={(e) => setFormLinea((f) => ({ ...f, anioHasta: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Tipo de Rig 3D *</label>
            <select
              value={formLinea.rig}
              onChange={(e) => setFormLinea((f) => ({ ...f, rig: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#00B5E2] bg-white"
            >
              {RIG_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalAgregarLinea(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
            <button
              onClick={() => {
                if (!formLinea.nombre.trim()) return;
                console.log('[LÍNEA] Guardar:', { modelo: modeloSeleccionado?.nombreModelo, ...formLinea });
                setModalAgregarLinea(false);
              }}
              disabled={!formLinea.nombre.trim()}
              className="flex-1 px-4 py-2.5 bg-[#003399] text-white rounded-lg text-sm font-semibold hover:bg-[#002580] disabled:opacity-50 transition-colors"
            >
              Guardar Línea
            </button>
          </div>
        </div>
      </AdminModal>

    </AppLayout>
  );
}
