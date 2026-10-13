'use client';

import {
  useCallback,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FolderOpen,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import SkeletonRow from '@/components/ui/SkeletonRow';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  useEstadisticas,
  useSiniestros,
} from '@/hooks/useSiniestros';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ABIERTO', label: 'Abierto' },
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'CERRADO', label: 'Cerrado' },
];

function formatGtq(amount: number): string {
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Fecha inválida';

  return date.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ExpedientesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useEstadisticas();
  const {
    data: siniestros,
    isLoading: tableLoading,
    isError: tableError,
    refetch: refetchSiniestros,
  } = useSiniestros({
    page,
    limit: PAGE_SIZE,
    estado: estado || undefined,
  });

  const handleSearch = useCallback(() => {
    setSearch(searchInput.trim());
    setPage(1);
  }, [searchInput]);

  const handleEstadoChange = useCallback((value: string) => {
    setEstado(value);
    setPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    void refetchStats();
    void refetchSiniestros();
  }, [refetchSiniestros, refetchStats]);

  const filteredData = siniestros?.data.filter((siniestro) => {
    if (!search) return true;
    const query = search.toLocaleLowerCase('es-GT');
    return (
      siniestro.numeroReclamo.toLocaleLowerCase('es-GT').includes(query) ||
      `${siniestro.cliente.nombre} ${siniestro.cliente.apellido}`
        .toLocaleLowerCase('es-GT')
        .includes(query) ||
      siniestro.vehiculo.placa.toLocaleLowerCase('es-GT').includes(query)
    );
  }) ?? [];

  const metricCards = [
    {
      label: 'Total Siniestros',
      value: statsLoading ? '...' : (stats?.total ?? 0),
      icon: FolderOpen,
      color: 'bg-brand-primary',
    },
    {
      label: 'Pendientes',
      value: statsLoading ? '...' : (stats?.abiertos ?? 0),
      icon: Clock,
      color: 'bg-brand-accent',
    },
    {
      label: 'En Proceso',
      value: statsLoading ? '...' : (stats?.enProceso ?? 0),
      icon: Activity,
      color: 'bg-brand-secondary',
    },
    {
      label: 'Cerrados',
      value: statsLoading ? '...' : (stats?.cerrados ?? 0),
      icon: CheckCircle,
      color: 'bg-green-500',
    },
  ];

  const lastPage = siniestros?.lastPage ?? 1;
  const firstVisiblePage = Math.max(
    1,
    Math.min(page - 2, lastPage - 4),
  );
  const visiblePages = Array.from(
    { length: Math.min(5, lastPage) },
    (_, index) => firstVisiblePage + index,
  );

  return (
    <AppLayout breadcrumb={['Expedientes']}>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-text md:text-2xl">
              Expedientes y Siniestros
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Gestión de reclamos vehiculares
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/expedientes/nuevo/cliente')}
            className="flex shrink-0 items-center gap-2 self-start rounded-lg bg-brand-secondary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Nuevo Siniestro
          </button>
        </div>

        {statsError && (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            No se pudieron cargar las estadísticas.{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => void refetchStats()}
            >
              Reintentar
            </button>
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 md:gap-4">
          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-card bg-white p-4 shadow-card md:p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg md:h-10 md:w-10',
                      card.color,
                    )}
                  >
                    <Icon className="h-4 w-4 text-white md:h-5 md:w-5" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-brand-text md:text-3xl">
                  {String(card.value)}
                </p>
                <p className="mt-1 text-xs text-gray-500 md:text-sm">
                  {card.label}
                </p>
              </div>
            );
          })}
        </div>

        {!statsLoading && stats && (
          <div className="flex items-center gap-4 rounded-card bg-white p-4 shadow-card">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10">
              <TrendingUp className="h-5 w-5 text-brand-primary" />
            </div>
            <div>
              <p className="text-xs text-gray-500">
                Total de presupuestos
              </p>
              <p className="text-lg font-bold text-brand-primary">
                {formatGtq(stats.totalGtq)}
              </p>
            </div>
          </div>
        )}

        <section
          aria-label="Tabla de expedientes"
          className="overflow-hidden rounded-card bg-white shadow-card"
        >
          <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                aria-label="Buscar expedientes"
                placeholder="Buscar por reclamo, cliente o placa..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch();
                }}
                className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-secondary/20"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Buscar
            </button>
            <select
              aria-label="Filtrar por estado"
              value={estado}
              onChange={(event) => handleEstadoChange(event.target.value)}
              className="min-w-[160px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-brand-text outline-none focus:border-brand-secondary"
            >
              {ESTADO_OPTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refrescar expedientes"
              title="Refrescar"
              className="shrink-0 rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {tableError && (
            <p
              className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              No se pudieron cargar los expedientes.{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => void refetchSiniestros()}
              >
                Reintentar
              </button>
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {[
                    'No. Reclamo',
                    'Cliente',
                    'Vehículo',
                    'Fecha',
                    'Ajustador',
                    'Estado',
                    'Total GTQ',
                    'Acciones',
                  ].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tableLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <SkeletonRow key={index} />
                  ))
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <FolderOpen className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                      <p className="text-sm">No hay expedientes registrados</p>
                      <button
                        type="button"
                        onClick={() => router.push('/expedientes/nuevo/cliente')}
                        className="mt-3 text-sm font-medium text-brand-secondary hover:underline"
                      >
                        + Crear primer siniestro
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((siniestro) => (
                    <tr
                      key={siniestro.idSiniestro}
                      className="transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-brand-primary">
                          {siniestro.numeroReclamo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-brand-text">
                          {siniestro.cliente.nombre} {siniestro.cliente.apellido}
                        </p>
                        {siniestro.cliente.telefono && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            {siniestro.cliente.telefono}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-brand-text">
                          {siniestro.vehiculo.marca.nombreMarca}{' '}
                          {siniestro.vehiculo.modelo.nombreModelo}{' '}
                          {siniestro.vehiculo.anio}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-gray-400">
                          {siniestro.vehiculo.placa}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {formatDate(siniestro.fechaSiniestro)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-brand-text">
                          {siniestro.usuario.nombre} {siniestro.usuario.apellido}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge estado={siniestro.estado} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {siniestro.presupuesto ? (
                          <span className="text-sm font-semibold text-brand-text">
                            {formatGtq(siniestro.presupuesto.totalGtq)}
                          </span>
                        ) : (
                          <span className="text-xs italic text-gray-400">
                            Sin presupuesto
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          aria-label={`Ver expediente ${siniestro.numeroReclamo}`}
                          onClick={() =>
                            router.push(`/expedientes/${siniestro.idSiniestro}`)
                          }
                          className="rounded-lg p-1.5 text-brand-secondary transition-colors hover:bg-brand-secondary/10"
                          title="Ver expediente"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {siniestros && siniestros.lastPage > 1 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row">
              <p className="order-2 text-sm text-gray-500 sm:order-1">
                Mostrando {((page - 1) * PAGE_SIZE) + 1}–
                {Math.min(page * PAGE_SIZE, siniestros.total)} de{' '}
                {siniestros.total} expedientes
              </p>
              <div className="order-1 flex items-center gap-2 sm:order-2">
                <button
                  type="button"
                  aria-label="Página anterior"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                {visiblePages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    aria-current={page === pageNumber ? 'page' : undefined}
                    aria-label={`Página ${pageNumber}`}
                    onClick={() => setPage(pageNumber)}
                    className={cn(
                      'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
                      page === pageNumber
                        ? 'bg-brand-secondary text-white'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  type="button"
                  aria-label="Página siguiente"
                  onClick={() =>
                    setPage((current) => Math.min(lastPage, current + 1))
                  }
                  disabled={page === lastPage}
                  className="rounded-lg border border-gray-200 p-2 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
