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
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body>
        <ThemeHydrator />
        {children}
      </body>
    </html>
  );
}
