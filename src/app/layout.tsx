import type { Metadata } from "next";
import "./globals.css";
import { getThemeConfig } from "@/lib/services/theme-service";
import { themeToCssVars, cssVarsToStyleObject } from "@/lib/theme/serializer";

export const metadata: Metadata = {
  title: "Lyco - Songtext Lernen",
  description: "Songtext-Lern-Webanwendung",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getThemeConfig();
  const cssVars = themeToCssVars(theme);
  const styleObj = cssVarsToStyleObject(cssVars);

  return (
    <html lang="de" style={styleObj}>
      <body>{children}</body>
    </html>
  );
}
