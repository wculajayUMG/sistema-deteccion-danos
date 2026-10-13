# Sistema Web IA — Seguros El Roble

## Autor: Willy Estuardo Culajay Asturias (2026)

## Stack Tecnológico

- Frontend: Next.js 15 App Router + TypeScript + Tailwind CSS
- Backend: NestJS + TypeORM + PostgreSQL 15
- IA: FastAPI + YOLOv8 (puerto 8000)
- Cache: Redis 7
- Storage: Cloudflare R2
- Auth: JWT RS256

## Estructura del Monorepo

- apps/frontend-web/ → Next.js (puerto 3000)
- apps/backend-api/ → NestJS (puerto 3001)
- apps/ai-service/ → FastAPI + YOLOv8 (puerto 8000)
- docker/ → docker-compose.yml

## Paleta de Colores Institucional

- Primary: #003399
- Secondary: #00B5E2
- Accent: #FFC700
- Background: #F4F6F9

## Clasificación de Daños — Modelo 36 Clases (Oct 2026)

### Clases de daño (4)

- golpe_pequeno → accion: reparar y pintar → LEVE
- golpe_mediano → accion: enderezar y pintar → MODERADO
- golpe_grande → accion: enderezar y pintar → GRAVE
- ruptura_cambio → accion: reemplazar → GRAVE

### Clases de pieza (32)

aro_delantero_der, aro_delantero_izq, aro_trasero_der, aro_trasero_izq, capo,
faro_delantero_der, faro_delantero_izq, faro_trasero_der, faro_trasero_izq,
guardabarro_delantero_der, guardabarro_delantero_izq, guardabarro_trasero_der,
guardabarro_trasero_izq, manija_der, manija_izq, moldura_der, moldura_izq,
parachoque_delantero, parachoque_trasero, persiana, pilar_a_der, pilar_a_izq,
pilar_b_der, pilar_b_izq, puerta_delantera_der, puerta_delantera_izq,
puerta_trasera_der, puerta_trasera_izq, techo, tapa_baul,
vidrio_delantero, vidrio_trasero

### Co-detection filter

- Solo pares daño+pieza (euclidean distance < 0.3 normalizado)
- Confidence: 0.35 / IOU: 0.45 / imgsz: 640
- Model: apps/ai-service/weights/best.pt (YOLOv8n, 100 epochs, mAP50=0.977)

## Base de Datos PostgreSQL

- Host: localhost:5432 / DB: seguros_elroble_ia / User: postgres / Pass: postgres
- 17 entidades TypeORM — DATABASE_SYNC=true (desactivar en producción)

## Comandos de Desarrollo

- Backend: cd apps/backend-api && npm run start:dev
- Frontend: cd apps/frontend-web && npm run dev
- AI: cd apps/ai-service && .\venv\Scripts\activate && uvicorn app.main:app --reload --port 8000
- Seed: cd apps/backend-api && npm run seed
- Docker: cd docker && docker-compose up -d postgres redis

Nota venv: PowerShell → .\venv\Scripts\activate | Git Bash → source venv/Scripts/activate

## Estado Actual (Octubre 2026)

- ✅ Layout base, navegación, dashboard de expedientes
- ✅ Flujo nuevo siniestro completo
- ✅ Captura de fotografías y resultados de IA
- ✅ Presupuesto y PDF dictamen con marca de agua APROBADO
- ✅ Admin: Usuarios, Baremos, Repuestos, Taxonomía — todos conectados a API
- ✅ RBAC por roles, auth token unificado (key: auth_token)
- ✅ Modelo YOLOv8 custom entrenado: Google Colab T4, 100 epochs, mAP50=0.977
- ✅ best.pt en apps/ai-service/weights/
- ✅ 36 clases configuradas en config.py, severity.py, schemas.py
- ✅ Co-detection filter implementado en yolo_service.py
- ✅ Bounding boxes sobre imagen en resultados IA (BoundingBoxOverlay.tsx, letterbox fix)
- ✅ Cámara guiada con silueta por zona (CamaraGuiada.tsx)
- ✅ Flujo inspección para expedientes existentes: /[id]/inspeccion y /[id]/fotografias
- ✅ VehiculoSVG con mapeo pieza→zona (onZonasChange prop)
- ✅ Enums accion-tecnica y severity normalizados en backend NestJS
- ⏳ Botón "Reportar detección incorrecta" (active learning) — PENDIENTE
- ⏳ Reentrenamiento con fotos reales de producción — PENDIENTE

## Archivos Modificados en Oct 2026

AI Service: config.py — severity.py — schemas.py — yolo_service.py — detect.py
Backend: accion-tecnica.enum.ts — detecciones.service.ts — presupuestos.service.ts
Frontend: siniestro.ts — BoundingBoxOverlay.tsx — TablaDetecciones.tsx
CamaraGuiada.tsx (NUEVO) — VehiculoSVG.tsx — nuevo-siniestro-store.ts
expedientes/[id]/page.tsx
expedientes/[id]/inspeccion/page.tsx (NUEVO)
expedientes/[id]/fotografias/page.tsx (NUEVO)
expedientes/[id]/resultados/page.tsx
expedientes/nuevo/resultados/page.tsx
expedientes/nuevo/fotografias/page.tsx

## Rutas Frontend

- /login
- /expedientes — /expedientes/nuevo/cliente — /expedientes/nuevo/vehiculo
- /expedientes/nuevo/fotografias — /expedientes/nuevo/resultados
- /expedientes/[id] — /expedientes/[id]/inspeccion — /expedientes/[id]/fotografias
- /expedientes/[id]/resultados — /expedientes/[id]/presupuesto
- /admin/baremos — /admin/repuestos — /admin/taxonomia — /admin/usuarios

## Rutas API Backend (puerto 3001)

- POST /api/v1/auth/login
- GET /api/v1/siniestros
- POST /api/v1/siniestros
- GET /api/v1/siniestros/:id
- POST /api/v1/siniestros/:id/fotografias
- GET /api/v1/catalogos/marcas
- GET /api/v1/catalogos/marcas/:id/modelos
- POST /api/v1/detecciones/procesar
- GET /api/v1/presupuestos/siniestro/:id
- POST /api/v1/presupuestos/generar/:id
- PATCH /api/v1/presupuestos/:id/lineas/:idLinea
- POST /api/v1/presupuestos/:id/aprobar
- GET /api/v1/presupuestos/:id/pdf
- GET /api/v1/expedientes/:id/presupuesto

## AI Service (puerto 8000)

- GET /health
- POST /api/v1/detect
- Modelo: weights/best.pt (YOLOv8n custom 36 clases) — Fallback: yolov8n.pt

## Notas Técnicas

- Token JWT en localStorage key: auth_token (NO usar 'token' ni 'elroble.accessToken')
- MCP de Stitch en C:\Users\Willy\.claude.json
- Modales Admin usan fetch nativo sin react-query
- AdminCatalogos tiene @Roles por método, no a nivel de clase
- bbox se guarda como columna JSON en la entidad Deteccion
- BoundingBoxOverlay: ResizeObserver sobre <img> (no el contenedor) evita canvas height=0
- Letterboxing: calcular offset de barras negras antes de dibujar bboxes
- Co-detection: total_detecciones=0 es respuesta válida, no error
- Diseños Google Stitch ID: 7158500076189206802

## Credenciales de Prueba

- Admin: admin@seguroselroble.com.gt / Admin@2026!Roble — JWT RS256, expira en 8h

## Matriz de Permisos RBAC

| Pantalla         | ADMIN_TI | SUPERVISOR | PERITO  | AJUSTADOR |
| ---------------- | :------: | :--------: | :-----: | :-------: |
| Expedientes      |    ✅    |     ✅     |   ❌    |    ✅     |
| Nueva Inspección |    ✅    |     ✅     |   ❌    |    ✅     |
| Info Cliente     |    ✅    |     ✅     |   ❌    |    ❌     |
| Liquidación      |    ✅    |     ✅     |   ✅    |    ❌     |
| Baremos          |   CRUD   |    CRUD    | lectura |    ❌     |
| Repuestos        |   CRUD   |    CRUD    | lectura |    ❌     |
| Taxonomía        |   CRUD   |    CRUD    | lectura |    ❌     |
| Usuarios         |   CRUD   |     ❌     |   ❌    |    ❌     |
