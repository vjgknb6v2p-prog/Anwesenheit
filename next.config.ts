import type { NextConfig } from "next";

/**
 * PROMPT.md Abschnitt 9 (Phase 7): "Security-Header (CSP, HSTS,
 * X-Frame-Options)." `headers()` ist Next.js-Routing-Konfiguration (kein
 * Webpack-Plugin) und funktioniert daher unverändert mit `next build
 * --turbopack` (siehe docs/decisions.md zur next-pwa/Turbopack-
 * Inkompatibilität — dieselbe Einschränkung gilt hier nicht).
 *
 * `script-src`/`style-src` brauchen `'unsafe-inline'`: der Anti-Flash-
 * Theme-Init-Score in `src/app/layout.tsx` muss vor der Hydration inline
 * laufen, und React setzt `style`-Props (u. a. Live-Übersicht, Bottom-Nav
 * `safe-area-inset`) als echte Inline-`style`-Attribute. Eine Nonce-
 * basierte CSP wäre strenger, erfordert aber pro Request generierte und
 * durchgereichte Nonces (Middleware + Layout) — für den Umfang dieser Phase
 * bewusst zurückgestellt, alle anderen Direktiven sind eng gefasst.
 */
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP_DIRECTIVES },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
