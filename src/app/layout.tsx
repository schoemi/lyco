import type { Metadata } from "next";
import "./globals.css";
import { getThemeConfig } from "@/lib/services/theme-service";
import { themeToCssVars, cssVarsToStyleObject } from "@/lib/theme/serializer";
import ThemeHydrator from "@/components/ThemeHydrator";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const theme = await getThemeConfig();
  return {
    title: `${theme.appName} - Songtext Lernen`,
    description: "Songtext-Lern-Webanwendung",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getThemeConfig();
  const cssVars = themeToCssVars(theme);
  const styleObj = cssVarsToStyleObject(cssVars);

  return (
    <html lang="de" style={styleObj} data-app-name={theme.appName}>
      <head />
      <body>
        <ThemeHydrator />
        {children}
      </body>
    </html>
  );
}
