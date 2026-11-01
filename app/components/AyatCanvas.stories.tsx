import type { Meta, StoryObj } from "@storybook/react-vite";
import arabicMd from "../../data/arabic.md?raw";
import englishMd from "../../data/english.md?raw";
import indonesiaMd from "../../data/indonesia.md?raw";
import { AyatCanvas } from "./AyatCanvas";

// The sample verses come straight from data/*.md (nothing is typed here): 96:1, and 2:282, the longest verse.
const line = (md: string, ref: string) =>
  md
    .split("\n")
    .find((l) => l.startsWith(`${ref} `))!
    .slice(ref.length + 1);
const verse = (s: number, a: number) => {
  const arabic = line(arabicMd, `${s}:${a}`);
  // Tanzil's file puts the bismillah (4 words) in front of verse 1 (see app/lib/quran.server.ts)
  return a === 1 && s !== 1 && s !== 9 ? arabic.split(" ").slice(4).join(" ") : arabic;
};

const meta = {
  title: "Components/AyatCanvas",
  component: AyatCanvas,
  args: { arabic: verse(96, 1), text: line(indonesiaMd, "96:1"), n: 1, reference: "Al-'Alaq 96:1" },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AyatCanvas>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Indonesian: Story = {};
export const English: Story = { args: { text: line(englishMd, "96:1") } };
export const LongestVerse: Story = {
  args: { arabic: verse(2, 282), text: line(englishMd, "2:282"), n: 282, reference: "Al-Baqarah 2:282" },
};
