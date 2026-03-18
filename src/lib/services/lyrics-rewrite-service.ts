import { prisma } from "@/lib/prisma";
import { parseSongtext } from "@/lib/import/songtext-parser";
import type { SongDetail } from "@/types/song";
import { getSongDetail } from "./song-service";

interface RewriteResult {
  song: SongDetail;
  matched: boolean;
  resetProgress: boolean;
}

/**
 * Rewrites the lyrics of an existing song from raw text.
 * 
 * Strategy:
 * 1. Parse the new text into strophes/lines
 * 2. Try intelligent line-level matching to preserve strophe IDs (and thus progress)
 * 3. If matching fails (structure changed too much), do a full rebuild and reset progress
 */
export async function rewriteLyrics(
  userId: string,
  songId: string,
  rawText: string
): Promise<RewriteResult> {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: {
      strophen: {
        orderBy: { orderIndex: "asc" },
        include: {
          zeilen: { orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });

  if (!song) throw new Error("Song nicht gefunden");
  if (song.userId !== userId) throw new Error("Zugriff verweigert");

  const parsed = parseSongtext(rawText);
  if (parsed.strophen.length === 0) {
    throw new Error("Der Text enthält keine gültigen Zeilen");
  }

  // Try intelligent matching first
  const matchResult = tryMatch(song.strophen, parsed.strophen);

  if (matchResult.success) {
    await applyMatchedUpdate(songId, matchResult.plan);
    return {
      song: await getSongDetail(userId, songId),
      matched: true,
      resetProgress: false,
    };
  }

  // Matching failed — full rebuild with progress reset
  await fullRebuild(songId, parsed.strophen);
  return {
    song: await getSongDetail(userId, songId),
    matched: false,
    resetProgress: true,
  };
}

// --- Types for matching ---

interface ParsedStrophe {
  name: string;
  zeilen: string[];
}

interface ExistingStrophe {
  id: string;
  name: string;
  orderIndex: number;
  zeilen: { id: string; text: string; uebersetzung: string | null; orderIndex: number }[];
}

interface StropheUpdatePlan {
  existingId: string;
  newName: string;
  newOrderIndex: number;
  zeilen: ZeileUpdatePlan[];
}

interface ZeileUpdatePlan {
  existingId: string | null; // null = new line
  text: string;
  uebersetzung: string | null;
  newOrderIndex: number;
}

interface MatchResult {
  success: boolean;
  plan: StropheUpdatePlan[];
}

/**
 * Tries to match new parsed strophes against existing ones.
 * 
 * Matching rules:
 * - Same number of strophes → match by position
 * - For each matched strophe pair, match lines by normalized text equality
 * - If >50% of all lines across the song can be matched, consider it a success
 * - Unmatched lines get new IDs (translations on those lines are lost)
 */
function tryMatch(
  existing: ExistingStrophe[],
  parsed: ParsedStrophe[]
): MatchResult {
  // Different strophe count → can't match reliably
  if (existing.length !== parsed.length) {
    return { success: false, plan: [] };
  }

  const plan: StropheUpdatePlan[] = [];
  let totalExistingLines = 0;
  let matchedLines = 0;

  for (let si = 0; si < existing.length; si++) {
    const oldStrophe = existing[si];
    const newStrophe = parsed[si];

    totalExistingLines += oldStrophe.zeilen.length;

    const zeilenPlan = matchZeilen(oldStrophe.zeilen, newStrophe.zeilen);
    matchedLines += zeilenPlan.filter((z) => z.existingId !== null).length;

    plan.push({
      existingId: oldStrophe.id,
      newName: newStrophe.name,
      newOrderIndex: si,
      zeilen: zeilenPlan,
    });
  }

  // Need >50% of original lines to match for it to count
  const totalNewLines = parsed.reduce((sum, s) => sum + s.zeilen.length, 0);
  const totalLines = Math.max(totalExistingLines, totalNewLines, 1);
  const matchRatio = matchedLines / totalLines;

  return {
    success: matchRatio > 0.5,
    plan,
  };
}

/**
 * Match new lines against existing lines using normalized text comparison.
 * Uses a greedy forward scan: for each new line, find the first unmatched
 * existing line with the same normalized text.
 */
function matchZeilen(
  existing: { id: string; text: string; uebersetzung: string | null; orderIndex: number }[],
  newLines: string[]
): ZeileUpdatePlan[] {
  const used = new Set<number>();
  const result: ZeileUpdatePlan[] = [];

  for (let ni = 0; ni < newLines.length; ni++) {
    const normNew = normalize(newLines[ni]);
    let matched = false;

    for (let ei = 0; ei < existing.length; ei++) {
      if (used.has(ei)) continue;
      if (normalize(existing[ei].text) === normNew) {
        used.add(ei);
        result.push({
          existingId: existing[ei].id,
          text: newLines[ni],
          uebersetzung: existing[ei].uebersetzung,
          newOrderIndex: ni,
        });
        matched = true;
        break;
      }
    }

    if (!matched) {
      result.push({
        existingId: null,
        text: newLines[ni],
        uebersetzung: null,
        newOrderIndex: ni,
      });
    }
  }

  return result;
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

// --- Database operations ---

/**
 * Apply matched update: update existing strophes/lines in place,
 * delete removed lines, add new lines. Preserves strophe IDs → progress stays.
 */
async function applyMatchedUpdate(
  songId: string,
  plan: StropheUpdatePlan[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const sp of plan) {
      // Update strophe name/order
      await tx.strophe.update({
        where: { id: sp.existingId },
        data: { name: sp.newName, orderIndex: sp.newOrderIndex },
      });

      // Collect existing line IDs that are still matched
      const keptIds = new Set(
        sp.zeilen.filter((z) => z.existingId !== null).map((z) => z.existingId!)
      );

      // Delete lines that are no longer present
      await tx.zeile.deleteMany({
        where: {
          stropheId: sp.existingId,
          id: { notIn: Array.from(keptIds) },
        },
      });

      // Update matched lines and create new ones
      for (const zp of sp.zeilen) {
        if (zp.existingId) {
          await tx.zeile.update({
            where: { id: zp.existingId },
            data: {
              text: zp.text,
              uebersetzung: zp.uebersetzung,
              orderIndex: zp.newOrderIndex,
            },
          });
        } else {
          await tx.zeile.create({
            data: {
              text: zp.text,
              uebersetzung: null,
              orderIndex: zp.newOrderIndex,
              stropheId: sp.existingId,
            },
          });
        }
      }
    }
  });
}

/**
 * Full rebuild: delete all strophes (cascades to lines, progress, markups, etc.)
 * and recreate from parsed text.
 */
async function fullRebuild(
  songId: string,
  strophen: ParsedStrophe[]
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Delete all existing strophes (cascades to zeilen, fortschritte, notizen, etc.)
    await tx.strophe.deleteMany({ where: { songId } });

    // Create new strophes with lines
    for (let si = 0; si < strophen.length; si++) {
      const s = strophen[si];
      const created = await tx.strophe.create({
        data: {
          name: s.name,
          orderIndex: si,
          songId,
        },
      });

      for (let zi = 0; zi < s.zeilen.length; zi++) {
        await tx.zeile.create({
          data: {
            text: s.zeilen[zi],
            uebersetzung: null,
            orderIndex: zi,
            stropheId: created.id,
          },
        });
      }
    }
  });
}

// songToRawText is in src/lib/import/song-to-raw-text.ts (client-safe)
