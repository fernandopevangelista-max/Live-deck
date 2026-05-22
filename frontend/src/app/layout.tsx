import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiveDeck Studio",
  description: "Create interactive HTML presentations from data using AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
