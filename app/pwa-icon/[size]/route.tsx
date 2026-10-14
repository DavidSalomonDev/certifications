import { ImageResponse } from "next/og";

// Iconos grandes para el manifest de la PWA (/pwa-icon/192 y /pwa-icon/512).
// Mismo diseño que app/icon.tsx y app/apple-icon.tsx. Sin bordes redondeados ni
// márgenes transparentes para que sirva también como icono "maskable".
const SIZES = [192, 512];

export const dynamicParams = false;

export function generateStaticParams() {
  return SIZES.map((size) => ({ size: String(size) }));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const size = Number((await params).size);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(size * 0.5),
          background: "#2563eb",
        }}
      >
        🎓
      </div>
    ),
    { width: size, height: size },
  );
}
