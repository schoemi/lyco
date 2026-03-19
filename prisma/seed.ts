import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DEFAULT_FONT = "'Inter', system-ui, sans-serif";

const lightConfig = JSON.stringify({
  appName: "Lyco",
  colors: {
    primary: "#7c3aed",
    accent: null,
    border: "#e5e7eb",
    pageBg: "#f9fafb",
    cardBg: "#ffffff",
    tabActiveBg: "#7c3aed",
    tabInactiveBg: "#f3f4f6",
    controlBg: "#f3f4f6",
    success: "#22c55e",
    warning: "#f97316",
    error: "#ef4444",
    primaryButton: "#7c3aed",
    secondaryButton: "#3b82f6",
    newSongButton: "#7c3aed",
    translationToggle: "#3b82f6",
    info: "#eab308",
    neutral: "#6b7280",
    headlineColor: "#111827",
    copyColor: "#374151",
    labelColor: "#4b5563",
    linkColor: "#7c3aed",
    mutedColor: "#6b7280",
    buttonTextColor: "#ffffff",
  },
  typography: {
    headlineFont: DEFAULT_FONT,
    headlineWeight: "700",
    copyFont: DEFAULT_FONT,
    copyWeight: "400",
    labelFont: DEFAULT_FONT,
    labelWeight: "500",
    songLineFont: DEFAULT_FONT,
    songLineWeight: "400",
    songLineSize: "16px",
    translationLineFont: DEFAULT_FONT,
    translationLineWeight: "400",
    translationLineSize: "14px",
  },
  karaoke: {
    activeLineColor: "#ffffff",
    readLineColor: "rgba(255,255,255,0.4)",
    unreadLineColor: "rgba(255,255,255,0.2)",
    activeLineSize: "28px",
    readLineSize: "20px",
    unreadLineSize: "18px",
    bgFrom: "#312e81",
    bgVia: "#581c87",
    bgTo: "#0f172a",
  },
});

const darkConfig = JSON.stringify({
  appName: "Lyco",
  colors: {
    primary: "#a78bfa",
    accent: null,
    border: "#374151",
    pageBg: "#111827",
    cardBg: "#1f2937",
    tabActiveBg: "#a78bfa",
    tabInactiveBg: "#374151",
    controlBg: "#374151",
    success: "#4ade80",
    warning: "#fb923c",
    error: "#f87171",
    primaryButton: "#a78bfa",
    secondaryButton: "#60a5fa",
    newSongButton: "#a78bfa",
    translationToggle: "#60a5fa",
    info: "#facc15",
    neutral: "#9ca3af",
    headlineColor: "#f9fafb",
    copyColor: "#e5e7eb",
    labelColor: "#d1d5db",
    linkColor: "#a78bfa",
    mutedColor: "#9ca3af",
    buttonTextColor: "#ffffff",
  },
  typography: {
    headlineFont: DEFAULT_FONT,
    headlineWeight: "700",
    copyFont: DEFAULT_FONT,
    copyWeight: "400",
    labelFont: DEFAULT_FONT,
    labelWeight: "500",
    songLineFont: DEFAULT_FONT,
    songLineWeight: "400",
    songLineSize: "16px",
    translationLineFont: DEFAULT_FONT,
    translationLineWeight: "400",
    translationLineSize: "14px",
  },
  karaoke: {
    activeLineColor: "#ffffff",
    readLineColor: "rgba(255,255,255,0.5)",
    unreadLineColor: "rgba(255,255,255,0.3)",
    activeLineSize: "28px",
    readLineSize: "20px",
    unreadLineSize: "18px",
    bgFrom: "#1e1b4b",
    bgVia: "#3b0764",
    bgTo: "#020617",
  },
});

async function main() {
  // Upsert default theme – idempotent so seed can run multiple times
  const existing = await prisma.theme.findFirst({ where: { isDefault: true } });

  if (!existing) {
    await prisma.theme.create({
      data: {
        name: "Standard",
        lightConfig,
        darkConfig,
        isDefault: true,
      },
    });
    console.log("✅ Standard-Theme erstellt (isDefault: true)");
  } else {
    console.log("ℹ️  Standard-Theme existiert bereits:", existing.name);
  }
}

main()
  .catch((e) => {
    console.error("Seed-Fehler:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
