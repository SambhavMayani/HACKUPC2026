import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADtonomy",
  description: "Explainable creative performance dashboard for mobile advertisers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
