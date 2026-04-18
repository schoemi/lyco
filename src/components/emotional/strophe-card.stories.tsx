import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { StropheCard } from "./strophe-card";
import type { StropheDetail } from "@/types/song";

const baseZeilen = [
  { id: "z1", text: "In the car, I just can't wait", uebersetzung: "Im Auto, ich kann es kaum erwarten", orderIndex: 0, istKommentar: false, markups: [] },
  { id: "z2", text: "To pick you up on our very first date", uebersetzung: "Dich abzuholen zu unserem ersten Date", orderIndex: 1, istKommentar: false, markups: [] },
  { id: "z3", text: "Is it cool if I hold your hand?", uebersetzung: "Ist es okay, wenn ich deine Hand halte?", orderIndex: 2, istKommentar: false, markups: [] },
];

const kommentarZeilen = [
  ...baseZeilen,
  { id: "z4", text: "(Spoken softly)", uebersetzung: null, orderIndex: 3, istKommentar: true, markups: [] },
  { id: "z5", text: "I'm just scared of what you think", uebersetzung: "Ich habe nur Angst vor dem, was du denkst", orderIndex: 4, istKommentar: false, markups: [] },
];

const normalStrophe: StropheDetail = {
  id: "s1",
  name: "Verse 1",
  orderIndex: 0,
  progress: 0,
  notiz: null,
  analyse: null,
  istInstrumental: false,
  zeilen: baseZeilen,
  markups: [],
};

const instrumentalStrophe: StropheDetail = {
  id: "s2",
  name: "Instrumental Break",
  orderIndex: 1,
  progress: 0,
  notiz: null,
  analyse: null,
  istInstrumental: true,
  zeilen: [
    { id: "z-inst", text: "Instrumental Break – 4 Takte", uebersetzung: null, orderIndex: 0, istKommentar: false, markups: [] },
  ],
  markups: [],
};

const stropheMitKommentar: StropheDetail = {
  id: "s3",
  name: "Verse 2",
  orderIndex: 2,
  progress: 0,
  notiz: null,
  analyse: null,
  istInstrumental: false,
  zeilen: kommentarZeilen,
  markups: [],
};

const meta: Meta<typeof StropheCard> = {
  title: "Emotional/StropheCard",
  component: StropheCard,
  tags: ["autodocs"],
  args: {
    revealedLines: new Set<string>(),
    onRevealLine: fn(),
    onRevealAll: fn(),
    onHideAll: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof StropheCard>;

export const Normal: Story = {
  args: { strophe: normalStrophe },
};

export const Instrumental: Story = {
  args: { strophe: instrumentalStrophe },
};

export const MitKommentar: Story = {
  args: { strophe: stropheMitKommentar },
};

export const ZweiSpaltenMitKommentar: Story = {
  args: {
    strophe: stropheMitKommentar,
    twoColumnTranslation: true,
  },
};

export const NurTextMitKommentar: Story = {
  args: {
    strophe: stropheMitKommentar,
    hideRevealLines: true,
  },
};

export const AllesAufgedeckt: Story = {
  args: {
    strophe: normalStrophe,
    revealedLines: new Set(["z1", "z2", "z3"]),
  },
};
