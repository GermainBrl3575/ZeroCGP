// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zero CGT — Optimisation de portefeuille",
  description:
    "Optimisez votre portefeuille financier avec l'algorithme de Markowitz. Zéro compromis sur vos rendements.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
