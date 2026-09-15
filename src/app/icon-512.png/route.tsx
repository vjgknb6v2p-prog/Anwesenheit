import { ImageResponse } from "next/og";

export const runtime = "edge";

const SIZE = 512;

// Siehe src/app/icon-192.png/route.tsx — identisches Motiv in größerer
// Auflösung (auch als "maskable" Icon im Manifest referenziert, daher der
// zusätzliche Randabstand durch den kleineren Kreis-Durchmesser).
export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2563eb",
      }}
    >
      <div
        style={{
          width: SIZE * 0.42,
          height: SIZE * 0.42,
          borderRadius: "50%",
          background: "#ffffff",
        }}
      />
    </div>,
    { width: SIZE, height: SIZE },
  );
}
