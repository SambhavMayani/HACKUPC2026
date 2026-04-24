import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creative Intelligence",
  description: "AI-assisted demo data generator for mobile ad creative analysis.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
