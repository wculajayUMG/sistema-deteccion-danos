import AppLayout from '@/components/layout/AppLayout';

export default function NuevoSiniestroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout
      breadcrumb={[
        'Expedientes',
        'Nuevo Siniestro',
      ]}
    >
      {children}
    </AppLayout>
  );
}
