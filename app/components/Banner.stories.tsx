import type { Meta, StoryObj } from "@storybook/react-vite";
import { Link } from "react-router";
import { Icon } from "./Icon";
import { Banner } from "./Banner";

const meta = { title: "Components/Banner", component: Banner } satisfies Meta<typeof Banner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithTitle: Story = {
  args: {
    className: "pt-12 pb-10",
    children: (
      <>
        <h1 className="text-3xl font-bold tracking-tight">Al-Qur'an</h1>
        <p className="mt-2 text-sm leading-relaxed text-banner-ink/80">Teks Arab dari Tanzil.net (CC BY 3.0).</p>
      </>
    ),
  },
};

export const BackButtonOnly: Story = {
  args: {
    className: "pt-12 pb-5",
    children: (
      <Link
        to="/id/al-alaq#ayat-1"
        className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold hover:bg-banner-ink/10"
      >
        <Icon name="arrowLeft" />
        Ke ayat Al-'Alaq 1
      </Link>
    ),
  },
};
