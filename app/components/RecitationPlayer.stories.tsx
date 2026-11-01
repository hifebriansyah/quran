import type { Meta, StoryObj } from "@storybook/react-vite";
import { RecitationPlayer } from "./RecitationPlayer";

const meta = {
  title: "Components/RecitationPlayer",
  component: RecitationPlayer,
  parameters: { layout: "fullscreen" },
  args: {
    lang: "id",
    n: 2,
    ayat: 7,
    paused: false,
    at: 3,
    length: 8,
    onPrev: () => {},
    onNext: () => {},
    onPause: () => {},
    onSeek: () => {},
    onClose: () => {},
  },
  decorators: [
    (Story) => (
      <div className="h-40">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecitationPlayer>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playing: Story = {};
export const Paused: Story = { args: { paused: true } };
export const FirstVerse: Story = { args: { n: 1, at: 0, length: 0 } };
