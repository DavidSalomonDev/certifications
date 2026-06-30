import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon generado en código: cuadrado azul (mismo blue-600 de la UI) con un
// birrete, representando certificación/estudio. Next.js lo sirve en /icon.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          background: "#2563eb",
          borderRadius: 7,
        }}
      >
        🎓
      </div>
    ),
    { ...size },
  );
}
