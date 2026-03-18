import type { Meta, StoryObj } from "@storybook/react";
import { SpacedRepetitionWidget } from "./spaced-repetition-widget";

const meta: Meta<typeof SpacedRepetitionWidget> = {
  title: "SpacedRepetition/SpacedRepetitionWidget",
  component: SpacedRepetitionWidget,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof SpacedRepetitionWidget>;

export const MitFaelligen: Story = { args: { faelligeAnzahl: 5 } };
export const EineFaellig: Story = { args: { faelligeAnzahl: 1 } };
export const KeineFaellig: Story = { args: { faelligeAnzahl: 0 } };
