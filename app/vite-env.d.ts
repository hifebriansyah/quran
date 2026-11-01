/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** public address of the R2 bucket with the verse pictures (see app/lib/images.ts) */
  readonly VITE_IMAGE_BASE?: string;
  /** one value per build (scripts/build-id.ts); not set in Storybook */
  readonly VITE_BUILD_ID?: string;
}
