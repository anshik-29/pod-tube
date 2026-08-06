import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PodNow - Video Podcast Recording",
  description: "Beginner-friendly video podcast recording app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
