import { ImageResponse } from "next/og";

export const runtime = "edge";

const SIZE = 192;

// Bewusst rein geometrisch (kein Text/Icon-Font) — ImageResponse (next/og,
// satori-basiert) müsste sonst eine Schriftart laden; ein einfacher
// Punkt auf farbigem Grund braucht das nicht und passt zum
// Status-Punkt-Motiv der App (siehe StatusBadge). #2563eb: fixe
// Hex-Näherung an --status-info, siehe src/app/manifest.ts.
//
// Cache-Control lang gesetzt: der Inhalt ist rein statisch (ändert sich nie
// zur Laufzeit) — ohne diesen Header rendert next/og das Bild bei jeder
// Anfrage per Satori neu, was gemessen (Windows-Lasttest, siehe
// docs/decisions.md) spürbar zur pro-Navigation-Latenz beitrug.
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
    {
      width: SIZE,
      height: SIZE,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
