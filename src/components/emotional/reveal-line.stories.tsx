import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { RevealLine } from "./reveal-line";

const meta: Meta<typeof RevealLine> = {
  title: "Emotional/RevealLine",
  component: RevealLine,
  tags: ["autodocs"],
  args: { onReveal: fn() },
};
export default meta;

type Story = StoryObj<typeof RevealLine>;

export const Normal: Story = {
  args: {
    zeile: {
      id: "z1",
      text: "In the car, I just can't wait",
      uebersetzung: "Im Auto, ich kann es kaum erwarten",
      orderIndex: 0,
      istKommentar: false,
      startTakt: null,
      endTakt: null,
      markups: [],
    },
    isRevealed: false,
  },
};

export const Aufgedeckt: Story = {
  args: {
    zeile: {
      id: "z1",
      text: "In the car, I just can't wait",
      uebersetzung: "Im Auto, ich kann es kaum erwarten",
      orderIndex: 0,
      istKommentar: false,
      startTakt: null,
      endTakt: null,
      markups: [],
    },
    isRevealed: true,
  },
};

export const Kommentar: Story = {
  args: {
    zeile: {
      id: "z2",
      text: "(Spoken softly)",
      uebersetzung: null,
      orderIndex: 1,
      istKommentar: true,
      startTakt: null,
      endTakt: null,
      markups: [],
    },
    isRevealed: false,
  },
};

export const KommentarAufgedeckt: Story = {
  args: {
    zeile: {
      id: "z3",
      text: "(Stage direction: whisper)",
      uebersetzung: "(Bühnenanweisung: flüstern)",
      orderIndex: 2,
      istKommentar: true,
      startTakt: null,
      endTakt: null,
      markups: [],
    },
    isRevealed: true,
  },
};

export const OhneUebersetzung: Story = {
  args: {
    zeile: {
      id: "z4",
      text: "La la la la la",
      uebersetzung: null,
      orderIndex: 3,
      istKommentar: false,
      startTakt: null,
      endTakt: null,
      markups: [],
    },
    isRevealed: true,
  },
};
