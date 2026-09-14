import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CheckIn – Internats-Ausgangsverwaltung",
  description:
    "Digitale Ausgangsverwaltung für Internate: aus- und einchecken, Übersicht für Mitarbeiter und Admins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}
