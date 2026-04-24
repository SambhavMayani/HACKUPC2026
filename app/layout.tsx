import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creative Intelligence",
  description: "Smadex creative intelligence copilot for mobile advertisers.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
