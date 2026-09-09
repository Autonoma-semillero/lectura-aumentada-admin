import { put } from "@vercel/blob";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAuthorizedTeacherToken } from "@/lib/backend";

const MAX_MODEL_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await getAuthorizedTeacherToken())) {
    return NextResponse.json({ message: "Sesión docente no válida." }, { status: 403 });
  }

  const formData = await request.formData();
  const model = formData.get("file");
  if (!(model instanceof File)) {
    return NextResponse.json({ message: "Selecciona un archivo GLB." }, { status: 400 });
  }
  if (model.size === 0 || model.size > MAX_MODEL_BYTES) {
    return NextResponse.json(
      { message: "El modelo debe pesar menos de 25 MB." },
      { status: 413 },
    );
  }
  if (!model.name.toLowerCase().endsWith(".glb")) {
    return NextResponse.json(
      { message: "Por ahora la carga directa admite archivos GLB." },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await model.arrayBuffer());
  const isGlb =
    bytes.length >= 12 &&
    bytes[0] === 0x67 &&
    bytes[1] === 0x6c &&
    bytes[2] === 0x54 &&
    bytes[3] === 0x46 &&
    new DataView(bytes.buffer).getUint32(4, true) === 2;
  if (!isGlb) {
    return NextResponse.json(
      { message: "El archivo no es un modelo GLB 2.0 válido." },
      { status: 400 },
    );
  }

  const safeName = model.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storageName = `${crypto.randomUUID()}-${safeName}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`models/${storageName}`, Buffer.from(bytes), {
      access: "public",
      contentType: "model/gltf-binary",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ url: blob.url, size_bytes: model.size });
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "Configura el almacenamiento de modelos antes de cargar archivos." },
      { status: 503 },
    );
  }

  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "models");
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(path.join(uploadDirectory, storageName), bytes);
  return NextResponse.json({
    url: `${new URL(request.url).origin}/uploads/models/${storageName}`,
    size_bytes: model.size,
  });
}
