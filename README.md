# Lectura Aumentada — Panel docente

Dashboard web en Next.js para administrar la experiencia docente de Lectura Aumentada. Consume la misma API que la aplicación Android y mantiene su lenguaje visual: rojo `#E53734`, azul de acciones, fondo cálido, superficies blancas y esquinas amplias.

## Módulos

- Inicio de sesión exclusivo para usuarios con rol `teacher`.
- Resumen general de estudiantes, temáticas, tarjetas y modelos 3D.
- Estudiantes con avance total, progreso por temática, tarjetas dominadas y acceso al plan individual.
- Temáticas: crear, editar, ordenar y eliminar.
- Tarjetas: filtrar por estudiante/temática, crear, editar, archivar, cargar pronunciación y asociar contenido AR.
- Planes de estudio Doman: generar, reemplazar, revisar historial y eliminar.
- Modelos 3D: cargar o reemplazar los modelos GLB asociados a Hiro y Kanji.

## Ejecución local

Requiere Node.js 20.9 o posterior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

La URL del backend ya tiene como valor predeterminado la API desplegada. Para usar otra instancia, cambia `BACKEND_BASE_URL`.

## Archivos subidos

En desarrollo, los archivos se guardan bajo `public/uploads`. Para que los modelos y audios sean persistentes en producción, configura `BLOB_READ_WRITE_TOKEN`; el panel utilizará Vercel Blob y registrará la URL pública en el backend.

La carga directa de modelos acepta GLB 2.0 de hasta 25 MB. El flujo por URL permite registrar un GLB público existente. Los únicos marcadores físicos soportados por el runtime móvil actual son Hiro y Kanji.

## Validación

```bash
npm run lint
npm run build
```

Estos son exactamente los dos comandos que corre el CI. `next build` ejecuta el type-check del proyecto, así que no hay un paso de TypeScript aparte.

## Integración continua

`.github/workflows/ci.yml` corre en cada push a `main` y en cada pull request contra `main`: instala con `npm ci`, pasa el lint y compila.

El workflow **no despliega**, igual que el CI del backend. El despliegue lo hace Vercel por su cuenta (ver abajo). Eso implica algo que conviene tener presente: **un CI en rojo no bloquea el despliegue**. El CI es la señal para no mergear; si se mergea igual, Vercel va a desplegar. Si en algún momento se necesita que el deploy quede bloqueado por los tests, hay que mover el despliegue a Actions con `vercel build` y `vercel deploy --prebuilt`, y cargar `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` como secrets del repositorio.

El CI no define `BACKEND_BASE_URL` a propósito: `src/lib/backend.ts` tiene un valor por defecto y la compilación no debe depender de que un backend concreto esté levantado.

## Despliegue en Vercel

El proyecto se despliega con la integración nativa de Vercel con Git, sin workflow de despliegue en el repositorio:

- cada push a `main` genera un despliegue de producción;
- cada pull request genera un despliegue de *preview* con su propia URL.

Configuración del proyecto en Vercel:

| Ajuste | Valor |
|---|---|
| Framework preset | Next.js |
| Build command | `npm run build` (valor por defecto) |
| Install command | `npm install` (valor por defecto) |
| Output directory | valor por defecto de Next.js |
| Production branch | `main` |

Variables de entorno a definir en el proyecto de Vercel (ver [`.env.example`](./.env.example)):

| Variable | Para qué | Entornos |
|---|---|---|
| `BACKEND_BASE_URL` | URL base de la API del backend. Si se omite, se usa el valor por defecto del código. | Production, Preview |
| `BLOB_READ_WRITE_TOKEN` | Requerida para que las cargas de GLB y audio persistan. Sin ella, los archivos se escriben en `public/uploads` y se pierden en cada despliegue. | Production, Preview |

Este proyecto no necesita `vercel.json`: Next.js se detecta sin configuración. El `vercel.json` del backend existe solo porque ese repositorio expone un entry serverless propio.
