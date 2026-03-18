import type { Meta, StoryObj } from "@storybook/react";
import { EinzelzeileAnzeige } from "./einzelzeile-anzeige";

const meta: Meta<typeof EinzelzeileAnzeige> = {
  title: "Karaoke/EinzelzeileAnzeige",
  component: EinzelzeileAnzeige,
  tags: ["autodocs"],
  parameters: {
    backgrounds: { default: "dark", values: [{ name: "dark", value: "#1e1b4b" }] },
  },
};
export default meta;

type Story = StoryObj<typeof EinzelzeileAnzeige>;

export const Default: Story = {
  args: {
    activeLine: {
      zeileId: "z1",
      text: "Don't wanna be an American idiot",
      stropheId: "s1",
      stropheName: "Strophe 1",
      globalIndex: 0,
      indexInStrophe: 0,
      stropheLineCount: 4,
    },
  },
};
