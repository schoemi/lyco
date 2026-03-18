import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { EingabeBereich } from "./eingabe-bereich";

const meta: Meta<typeof EingabeBereich> = {
  title: "ZeileFuerZeile/EingabeBereich",
  component: EingabeBereich,
  tags: ["autodocs"],
  args: {
    onEingabeChange: fn(),
    onAbsenden: fn(),
    onWeiter: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof EingabeBereich>;

export const Eingabe: Story = {
  args: {
    eingabe: "",
    status: "eingabe",
    fehlversuche: 0,
    disabled: false,
    istLetzteZeile: false,
  },
};

export const Korrekt: Story = {
  args: {
    eingabe: "Don't wanna be an American idiot",
    status: "korrekt",
    fehlversuche: 0,
    disabled: false,
    istLetzteZeile: false,
  },
};

export const Loesung: Story = {
  args: {
    eingabe: "",
    status: "loesung",
    fehlversuche: 3,
    disabled: false,
    istLetzteZeile: false,
  },
};

export const LetzteZeile: Story = {
  args: {
    eingabe: "text",
    status: "korrekt",
    fehlversuche: 0,
    disabled: false,
    istLetzteZeile: true,
  },
};
