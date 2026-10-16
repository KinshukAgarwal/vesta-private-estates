import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const grotesk = Archivo({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-grotesk",
});

export const metadata: Metadata = {
  title: "Vesta — Private Estates",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={grotesk.variable}>
      <body>{children}</body>
    </html>
  );
}
