import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lyco Stage",
    short_name: "Lyco Stage",
    description: "Bühnen-Prompter für Live-Auftritte",
    display: "standalone",
    theme_color: "#000000",
    background_color: "#000000",
    start_url: "/stage",
    scope: "/stage",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
