import type { Meta, StoryObj } from "@storybook/react-vite";
import { SurahBrowser } from "./SurahBrowser";

const meta = {
  title: "Components/SurahBrowser",
  component: SurahBrowser,
  args: { lang: "id", tab: "surah", query: "", descending: false },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-5xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SurahBrowser>;
export default meta;
type Story = StoryObj<typeof meta>;

export const BySurah: Story = {};
export const ByJuz: Story = { args: { tab: "juz" } };
export const ByRevelationOrder: Story = { args: { tab: "order" } };
export const Descending: Story = { args: { descending: true } };
export const Filtered: Story = { args: { query: "an-" } };
export const NoResult: Story = { args: { query: "zzzz" } };
export const English: Story = { args: { lang: "en", tab: "order" } };
