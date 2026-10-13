import { Injectable } from '@nestjs/common';

interface DictamenData {
  numeroReclamo: string;
  fechaGeneracion: string;
  fechaAprobacion: string | null;
  cliente: {
    nombre: string;
    apellido: string;
    dpi: string | null;
    telefono: string | null;
  };
  vehiculo: {
    marca: string;
    modelo: string;
    anio: number;
    placa: string;
    color: string | null;
  };
  ajustador: {
    nombre: string;
    apellido: string;
  };
  lineas: Array<{
    descripcion: string;
    accionTecnica: string;
    severidad: string;
    costoRepuestoGtq: number;
    costoManoObraGtq: number;
    subtotalGtq: number;
    modificadoManualmente: boolean;
  }>;
  totalGtq: number;
  estado: string;
  observaciones: string | null;
}

@Injectable()
export class PdfService {
  async generarDictamen(data: DictamenData): Promise<Buffer> {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      const subtotalRepuestos = data.lineas.reduce(
        (sum, l) => sum + l.costoRepuestoGtq,
        0,
      );
      const subtotalManoObra = data.lineas.reduce(
        (sum, l) => sum + l.costoManoObraGtq,
        0,
      );

      const formatGtq = (n: number) =>
        new Intl.NumberFormat('es-GT', {
          style: 'currency',
          currency: 'GTQ',
          minimumFractionDigits: 2,
        }).format(n ?? 0);

      const formatDate = (d: string | null) =>
        d
          ? new Date(d).toLocaleDateString('es-GT', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : '—';

      const ACCION_LABEL: Record<string, string> = {
        GOLPE_PEQUEÑO: 'Golpe Pequeño',
        GOLPE_MEDIANO: 'Golpe Mediano',
        GOLPE_GRANDE: 'Golpe Grande',
        CAMBIO_PIEZA: 'Cambio de Pieza',
      };

      const lineasHtml = data.lineas
        .map(
          (l, i) => `
          <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
            <td>${i + 1}</td>
            <td>
              <strong>${l.descripcion}</strong>
              <br>
              <small style="color:#666">
                ${l.severidad} · ${ACCION_LABEL[l.accionTecnica] ?? l.accionTecnica}
                ${l.modificadoManualmente ? ' · ⚠ Ajuste manual' : ''}
              </small>
            </td>
            <td class="right">
              ${l.costoRepuestoGtq > 0 ? formatGtq(l.costoRepuestoGtq) : '—'}
            </td>
            <td class="right">${formatGtq(l.costoManoObraGtq)}</td>
            <td class="right bold">${formatGtq(l.subtotalGtq)}</td>
          </tr>
        `,
        )
        .join('');

      const aprobadoWatermark =
        data.estado === 'APROBADO'
          ? `<div class="watermark">APROBADO</div>`
          : '';

      const statusBg = data.estado === 'APROBADO' ? '#dcfce7' : '#dbeafe';
      const statusColor = data.estado === 'APROBADO' ? '#166534' : '#1d4ed8';

      const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Dictamen Pericial — ${data.numeroReclamo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #1a1a2e;
      padding: 30px;
      position: relative;
    }
    .watermark {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 80px;
      font-weight: 900;
      color: rgba(0, 181, 226, 0.08);
      pointer-events: none;
      z-index: 0;
      letter-spacing: 10px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #003399;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .logo-section { display: flex; align-items: center; gap: 12px; }
    .logo-box {
      width: 50px; height: 50px;
      background: #003399; border-radius: 8px;
      display: flex; align-items: center;
      justify-content: center;
      color: white; font-weight: 900; font-size: 14px;
    }
    .company-name { font-size: 18px; font-weight: 900; color: #003399; }
    .company-sub { font-size: 10px; color: #666; margin-top: 2px; }
    .doc-info { text-align: right; }
    .doc-title { font-size: 14px; font-weight: 700; color: #003399; }
    .reclamo {
      font-size: 20px; font-weight: 900;
      font-family: monospace; color: #003399; margin-top: 4px;
    }
    .doc-date { font-size: 10px; color: #666; margin-top: 4px; }
    .status-badge {
      display: inline-block;
      padding: 3px 10px; border-radius: 20px;
      font-size: 10px; font-weight: 700; margin-top: 6px;
      background: ${statusBg}; color: ${statusColor};
    }
    .info-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 15px; margin-bottom: 20px;
    }
    .info-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px; padding: 12px;
    }
    .info-card-title {
      font-size: 9px; font-weight: 700; color: #003399;
      text-transform: uppercase; letter-spacing: 0.5px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px; margin-bottom: 8px;
    }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .info-label { color: #9ca3af; font-size: 10px; }
    .info-value { font-weight: 600; font-size: 10px; text-align: right; }
    .section-title {
      font-size: 12px; font-weight: 700; color: #003399;
      margin-bottom: 10px; padding-bottom: 5px;
      border-bottom: 2px solid #e5e7eb;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th {
      background: #003399; color: white;
      padding: 8px; text-align: left;
      font-size: 10px; font-weight: 600;
    }
    th.right { text-align: right; }
    td { padding: 7px 8px; font-size: 10px; border-bottom: 1px solid #f3f4f6; }
    td.right { text-align: right; }
    td.bold { font-weight: 700; }
    tr.even { background: #f9fafb; }
    tr.odd { background: white; }
    tr.subtotales td {
      background: #f3f4f6; font-weight: 600;
      color: #374151; border-top: 2px solid #e5e7eb;
    }
    .total-box {
      border: 2px solid #003399; border-radius: 10px;
      padding: 16px; text-align: center;
      margin: 15px auto; max-width: 300px;
      position: relative; overflow: hidden;
    }
    .total-box::before {
      content: ''; position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 5px; background: #00B5E2;
    }
    .total-label {
      font-size: 9px; font-weight: 700; color: #6b7280;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .total-amount { font-size: 28px; font-weight: 900; color: #003399; margin: 5px 0; }
    .total-sub { font-size: 9px; color: #9ca3af; }
    .observaciones-box {
      border: 1px solid #e5e7eb; border-radius: 8px;
      padding: 12px; margin-bottom: 20px; background: #f9fafb;
    }
    .obs-title {
      font-size: 9px; font-weight: 700; color: #003399;
      text-transform: uppercase; margin-bottom: 6px;
    }
    .obs-text { font-size: 10px; color: #374151; line-height: 1.5; }
    .footer {
      margin-top: 30px; border-top: 1px solid #e5e7eb;
      padding-top: 15px;
      display: flex; justify-content: space-between; align-items: flex-end;
    }
    .signature-box { text-align: center; width: 180px; }
    .signature-line {
      border-top: 1px solid #374151;
      padding-top: 6px; font-size: 10px; font-weight: 600;
    }
    .signature-role { font-size: 9px; color: #6b7280; margin-top: 2px; }
    .footer-note {
      font-size: 9px; color: #9ca3af;
      text-align: center; margin-top: 15px;
    }
    .audit-notice {
      font-size: 9px; color: #6b7280;
      background: #f9fafb; border: 1px solid #e5e7eb;
      border-radius: 6px; padding: 8px; margin-top: 10px;
    }
  </style>
</head>
<body>
  ${aprobadoWatermark}

  <div class="header">
    <div class="logo-section">
      <div class="logo-box">SER</div>
      <div>
        <div class="company-name">SEGUROS EL ROBLE</div>
        <div class="company-sub">Departamento de Siniestros Vehiculares</div>
        <div class="company-sub">Sistema IA de Detección de Daños</div>
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-title">DICTAMEN PERICIAL</div>
      <div class="reclamo">${data.numeroReclamo}</div>
      <div class="doc-date">
        Generado: ${formatDate(data.fechaGeneracion)}
        ${data.fechaAprobacion ? `<br>Aprobado: ${formatDate(data.fechaAprobacion)}` : ''}
      </div>
      <div><span class="status-badge">${data.estado}</span></div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-card">
      <div class="info-card-title">Información del Cliente</div>
      <div class="info-row">
        <span class="info-label">Nombre</span>
        <span class="info-value">${data.cliente.nombre} ${data.cliente.apellido}</span>
      </div>
      <div class="info-row">
        <span class="info-label">DPI</span>
        <span class="info-value">${data.cliente.dpi ?? '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Teléfono</span>
        <span class="info-value">${data.cliente.telefono ?? '—'}</span>
      </div>
    </div>

    <div class="info-card">
      <div class="info-card-title">Información del Vehículo</div>
      <div class="info-row">
        <span class="info-label">Vehículo</span>
        <span class="info-value">${data.vehiculo.marca} ${data.vehiculo.modelo} ${data.vehiculo.anio}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Placa</span>
        <span class="info-value" style="font-family:monospace;font-weight:900">${data.vehiculo.placa}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Color</span>
        <span class="info-value">${data.vehiculo.color ?? '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Ajustador</span>
        <span class="info-value">${data.ajustador.nombre} ${data.ajustador.apellido}</span>
      </div>
    </div>
  </div>

  <div class="section-title">Desglose de Daños y Costos</div>
  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Pieza / Descripción</th>
        <th class="right" style="width:100px">Repuesto GTQ</th>
        <th class="right" style="width:100px">Mano Obra GTQ</th>
        <th class="right" style="width:100px">Subtotal GTQ</th>
      </tr>
    </thead>
    <tbody>
      ${lineasHtml}
      <tr class="subtotales">
        <td colspan="2" style="text-align:right;padding-right:8px">Subtotales:</td>
        <td class="right">${formatGtq(subtotalRepuestos)}</td>
        <td class="right">${formatGtq(subtotalManoObra)}</td>
        <td class="right">${formatGtq(data.totalGtq)}</td>
      </tr>
    </tbody>
  </table>

  <div class="total-box">
    <div class="total-label">Total Estimado de Reparación</div>
    <div class="total-amount">${formatGtq(data.totalGtq)}</div>
    <div class="total-sub">Quetzales (GTQ) — ${data.estado}</div>
  </div>

  ${
    data.observaciones
      ? `<div class="observaciones-box">
           <div class="obs-title">Observaciones del Perito</div>
           <div class="obs-text">${data.observaciones}</div>
         </div>`
      : ''
  }

  <div class="audit-notice">
    🔒 Este dictamen fue generado por el Sistema IA de Detección de Daños Vehiculares
    de Seguros El Roble. Todas las modificaciones manuales quedan registradas en el
    Audit Trail del sistema con usuario, fecha, hora e IP de origen.
  </div>

  <div class="footer">
    <div class="signature-box">
      <div class="signature-line">${data.ajustador.nombre} ${data.ajustador.apellido}</div>
      <div class="signature-role">Perito Evaluador</div>
    </div>
    <div style="text-align:center">
      <div style="font-size:9px;color:#9ca3af">Seguros El Roble • Sistema IA v1.0.0</div>
      <div style="font-size:9px;color:#9ca3af;margin-top:2px">
        ${data.numeroReclamo} • ${formatDate(data.fechaGeneracion)}
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Seguros El Roble</div>
      <div class="signature-role">Departamento de Siniestros</div>
    </div>
  </div>

  <div class="footer-note">
    Este documento es generado automáticamente por el sistema.
    Para verificar su autenticidad comuníquese con Seguros El Roble.
  </div>
</body>
</html>`;

      await page.setContent(html, { waitUntil: 'load' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
        printBackground: true,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }
}
