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
