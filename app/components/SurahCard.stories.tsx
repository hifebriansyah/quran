import type { Meta, StoryObj } from "@storybook/react-vite";
import { surahByNo } from "~/lib/surahs";
import { SurahCard } from "./SurahCard";

const meta = {
  title: "Components/SurahCard",
  component: SurahCard,
  args: { surah: surahByNo(96)!, lang: "id" },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SurahCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Indonesian: Story = {};
export const English: Story = { args: { lang: "en" } };
export const LongMeaning: Story = { args: { surah: surahByNo(102)! } };
