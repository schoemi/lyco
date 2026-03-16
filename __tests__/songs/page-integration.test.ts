/**
 * Integration tests for page wiring:
 * - Dashboard page (src/app/(main)/dashboard/page.tsx)
 * - Song Detail page (src/app/(main)/songs/[id]/page.tsx)
 *
 * Since the project uses node environment (no jsdom/RTL), we validate
 * the page source files for required patterns: component imports,
 * state management, button wiring, and component prop passing.
 *
 * Validates: Requirements 13.1, 13.3, 2.1, 3.1
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// --- Load page sources ---

const DASHBOARD_PATH = path.resolve(
  process.cwd(),
  "src/app/(main)/dashboard/page.tsx"
);
const SONG_DETAIL_PATH = path.resolve(
  process.cwd(),
  "src/app/(main)/songs/[id]/page.tsx"
);

const dashboardSource = fs.readFileSync(DASHBOARD_PATH, "utf-8");
const songDetailSource = fs.readFileSync(SONG_DETAIL_PATH, "utf-8");

// ============================================================
// Dashboard — SongCreateDialog integration (Req 13.1, 13.3)
// ============================================================

describe("Dashboard — SongCreateDialog integration (Req 13.1, 13.3)", () => {
  it("imports SongCreateDialog component", () => {
    expect(dashboardSource).toContain("import SongCreateDialog");
    expect(dashboardSource).toContain("song-create-dialog");
  });

  it("has createDialogOpen state", () => {
    expect(dashboardSource).toContain("createDialogOpen");
    expect(dashboardSource).toContain("setCreateDialogOpen");
  });

  it('has "+ Neuer Song" button that opens the dialog (Req 13.1)', () => {
    expect(dashboardSource).toContain("+ Neuer Song");
    expect(dashboardSource).toContain("setCreateDialogOpen(true)");
  });

  it('has "+ Neuer Song" button in empty state too (Req 13.2)', () => {
    // The empty state block also has a "+ Neuer Song" button
    const matches = dashboardSource.match(/\+ Neuer Song/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it("renders SongCreateDialog with open/onClose/onCreated props", () => {
    expect(dashboardSource).toContain("<SongCreateDialog");
    expect(dashboardSource).toContain("open={createDialogOpen}");
    expect(dashboardSource).toContain("onClose={");
    expect(dashboardSource).toContain("onCreated={handleSongCreated}");
  });

  it("handleSongCreated adds song to data.allSongs", () => {
    expect(dashboardSource).toContain("handleSongCreated");
    expect(dashboardSource).toContain("data.allSongs");
    expect(dashboardSource).toContain("[...data.allSongs, song]");
  });
});

// ============================================================
// Song Detail — Edit/Delete/StropheEditor integration (Req 2.1, 3.1)
// ============================================================

describe("Song Detail — Component imports", () => {
  it("imports SongEditForm", () => {
    expect(songDetailSource).toContain("import SongEditForm");
    expect(songDetailSource).toContain("song-edit-form");
  });

  it("imports SongDeleteDialog", () => {
    expect(songDetailSource).toContain("import SongDeleteDialog");
    expect(songDetailSource).toContain("song-delete-dialog");
  });

  it("imports StropheEditor", () => {
    expect(songDetailSource).toContain("import StropheEditor");
    expect(songDetailSource).toContain("strophe-editor");
  });
});

describe("Song Detail — State management", () => {
  it("has editing state", () => {
    expect(songDetailSource).toContain("editing");
    expect(songDetailSource).toContain("setEditing");
    expect(songDetailSource).toContain("useState(false)");
  });

  it("has deleteDialogOpen state", () => {
    expect(songDetailSource).toContain("deleteDialogOpen");
    expect(songDetailSource).toContain("setDeleteDialogOpen");
  });
});

describe("Song Detail — Edit button wiring (Req 2.1)", () => {
  it('has "Bearbeiten" button', () => {
    expect(songDetailSource).toContain("Bearbeiten");
  });

  it("Bearbeiten button sets editing to true", () => {
    expect(songDetailSource).toContain("setEditing(true)");
  });

  it("renders SongEditForm when editing is true", () => {
    expect(songDetailSource).toContain("<SongEditForm");
    expect(songDetailSource).toMatch(/editing\s*\?/);
  });
});

describe("Song Detail — Delete button wiring (Req 3.1)", () => {
  it('has "Löschen" button', () => {
    expect(songDetailSource).toContain("Löschen");
  });

  it("Löschen button opens delete dialog", () => {
    expect(songDetailSource).toContain("setDeleteDialogOpen(true)");
  });

  it("renders SongDeleteDialog with open/song/onClose/onDeleted props", () => {
    expect(songDetailSource).toContain("<SongDeleteDialog");
    expect(songDetailSource).toContain("open={deleteDialogOpen}");
    expect(songDetailSource).toContain("song={song}");
    expect(songDetailSource).toContain("onClose={");
    expect(songDetailSource).toContain("onDeleted={");
  });

  it('onDeleted redirects to dashboard via router.push("/dashboard")', () => {
    expect(songDetailSource).toContain('router.push("/dashboard")');
  });
});

describe("Song Detail — StropheEditor wiring", () => {
  it("renders StropheEditor with songId/strophen/onStrophenChanged props", () => {
    expect(songDetailSource).toContain("<StropheEditor");
    expect(songDetailSource).toContain("songId={");
    expect(songDetailSource).toContain("strophen={song.strophen}");
    expect(songDetailSource).toContain("onStrophenChanged={");
  });
});
