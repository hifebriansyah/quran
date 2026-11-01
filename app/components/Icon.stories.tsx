import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "./Icon";

const NAMES = [
  "search",
  "sun",
  "moon",
  "copy",
  "share",
  "chevronLeft",
  "chevronRight",
  "chevronUp",
  "chevronDown",
  "grid",
  "clock",
  "mapPin",
  "refresh",
] as const;

const meta = { title: "Components/Icon", component: Icon } satisfies Meta<typeof Icon>;
export default meta;

export const All: StoryObj = {
  render: () => (
    <div className="flex flex-wrap gap-5 text-3xl text-accent">
      {NAMES.map((n) => (
        <span key={n} title={n}>
          <Icon name={n} />
        </span>
      ))}
    </div>
  ),
};
