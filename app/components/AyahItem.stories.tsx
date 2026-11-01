import type { Meta, StoryObj } from "@storybook/react-vite";
import arabicMd from "../../data/arabic.md?raw";
import englishMd from "../../data/english.md?raw";
import indonesiaMd from "../../data/indonesia.md?raw";
import latinIdMd from "../../data/latin-id.md?raw";
import latinMd from "../../data/latin.md?raw";
import { AyahItem } from "./AyahItem";

// The sample verses come straight from data/*.md (nothing is typed here): surah 96 verse 1, and surah 2 verse 255.
const line = (md: string, ref: string) =>
  md
    .split("\n")
    .find((l) => l.startsWith(`${ref} `))!
    .slice(ref.length + 1);
const verse = (s: number, a: number, latinFile = latinIdMd) => {
  const ref = `${s}:${a}`;
  const arabic = line(arabicMd, ref);
  return {
    n: a,
    // Tanzil's file puts the bismillah (4 words) in front of verse 1 (see app/lib/quran.server.ts)
    arabic: a === 1 && s !== 1 && s !== 9 ? arabic.split(" ").slice(4).join(" ") : arabic,
    latin: line(latinFile, ref),
  };
};

const meta = {
  title: "Components/AyahItem",
  component: AyahItem,
  args: { lang: "id", ...verse(96, 1), text: line(indonesiaMd, "96:1") },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-3xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AyahItem>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Indonesian: Story = {};
export const WithImageLink: Story = { args: { imageHref: "/id/al-alaq/1" } };
export const English: Story = { args: { lang: "en", ...verse(96, 1, latinMd), text: line(englishMd, "96:1") } };
export const LongVerse: Story = { args: { ...verse(2, 255), text: line(indonesiaMd, "2:255") } };
