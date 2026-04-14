/**
 * Unit-Test für Persistent-Storage-Warnung
 * (src/components/stage/preflight-check.tsx)
 *
 * Testet:
 * - Warnung wird angezeigt wenn navigator.storage.persist() abgelehnt wird (Req 3.5)
 * - Warnung enthält Hinweis auf Cache-Löschrisiko (Req 3.5)
 * - usePreflightCheck setzt persistWarning=true bei Ablehnung (Req 3.4, 3.5)
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const COMPONENT_PATH = path.resolve(
  process.cwd(),
  "src/components/stage/preflight-check.tsx",
);
const HOOK_PATH = path.resolve(
  process.cwd(),
  "src/lib/stage/use-preflight-check.ts",
);

const componentSource = fs.readFileSync(COMPONENT_PATH, "utf-8");
const hookSource = fs.readFileSync(HOOK_PATH, "utf-8");

describe("Persistent-Storage-Warnung — Komponente (Req 3.5)", () => {
  it("renders persist warning when persistWarning is true (Req 3.5)", () => {
    expect(componentSource).toContain("persistWarning");
    expect(componentSource).toContain("{persistWarning && (");
  });

  it("warning has role=alert for screen readers (Req 3.5)", () => {
    expect(componentSource).toContain('role="alert"');
  });

  it("warning has aria-live=assertive (Req 3.5)", () => {
    expect(componentSource).toContain('aria-live="assertive"');
  });

  it("warning has data-testid for test selection (Req 3.5)", () => {
    expect(componentSource).toContain('data-testid="persist-warning"');
  });

  it("warning text mentions cache deletion risk (Req 3.5)", () => {
    expect(componentSource).toContain("Cache");
    expect(componentSource).toContain("gelöscht");
  });

  it("warning text mentions storage space (Req 3.5)", () => {
    expect(componentSource).toContain("Speicher");
  });
});

describe("Persistent-Storage-Warnung — Hook (Req 3.4, 3.5)", () => {
  it("hook calls navigator.storage.persist() (Req 3.4)", () => {
    expect(hookSource).toContain("navigator.storage.persist");
  });

  it("hook sets persistWarning=true when persist() returns false (Req 3.5)", () => {
    expect(hookSource).toContain("setPersistWarning(true)");
  });

  it("hook sets persistWarning=true when persist() throws (Req 3.5)", () => {
    // The catch block also sets persistWarning
    expect(hookSource).toContain("setPersistWarning(true)");
    // Verify there's a try/catch around the persist call
    expect(hookSource).toMatch(/try\s*\{[\s\S]*?navigator\.storage\.persist[\s\S]*?\}\s*catch/);
  });

  it("hook checks for navigator.storage availability before calling persist() (Req 3.4)", () => {
    expect(hookSource).toContain("navigator.storage?.persist");
  });

  it("hook checks typeof navigator before accessing storage (Req 3.4)", () => {
    expect(hookSource).toContain('typeof navigator !== "undefined"');
  });

  it("hook initializes persistWarning as false", () => {
    expect(hookSource).toContain("useState(false)");
  });

  it("hook exports persistWarning in return value", () => {
    expect(hookSource).toContain("persistWarning");
    // Verify it's in the return object
    expect(hookSource).toMatch(/return\s*\{[\s\S]*?persistWarning[\s\S]*?\}/);
  });
});
