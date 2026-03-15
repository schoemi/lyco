import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lyco - Songtext Lernen",
  description: "Songtext-Lern-Webanwendung",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
