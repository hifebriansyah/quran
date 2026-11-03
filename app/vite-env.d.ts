/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** public address of the R2 bucket with the verse pictures (see app/lib/images.ts) */
  readonly VITE_IMAGE_BASE?: string;
  /** where the shalat page reads its prayer-time files; default: shalat_schedule/ in the same bucket (see app/lib/shalat.ts) */
  readonly VITE_SHALAT_BASE?: string;
  /** one value per build (scripts/build-id.ts); not set in Storybook */
  readonly VITE_BUILD_ID?: string;
}
