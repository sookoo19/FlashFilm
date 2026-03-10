export const FLASH_PRESET_IDS = ['flash_base'] as const;

export type FlashPresetId = (typeof FLASH_PRESET_IDS)[number];

export type WhiteBalanceMode =
  | 'auto'
  | 'daylight'
  | 'cloudy'
  | 'shade'
  | 'incandescent'
  | 'fluorescent'
  | 'custom'
  | 'unknown';

export type AiCapturedMetadata = {
  iso?: number | null;
  exposureTime?: number | null;
  whiteBalance?: WhiteBalanceMode | null;
  flashFired?: boolean | null;
};

export type AiModelMetadata = Pick<
  AiCapturedMetadata,
  'iso' | 'exposureTime' | 'whiteBalance'
>;

export type AiMetadataAudit = Pick<AiCapturedMetadata, 'flashFired'>;

export type AiEditRecipe = {
  version: number;
  presetId: FlashPresetId;
  brightness: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  grain: number;
  shadowHue: number;
  shadowStrength: number;
  highlightHue: number;
  highlightStrength: number;
  balance: number;
  midtoneHue: number;
  midtoneStrength: number;
};

export const DEFAULT_AI_EDIT_RECIPE: Readonly<AiEditRecipe> = {
  version: 1,
  presetId: 'flash_base',
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  grain: 0,
  shadowHue: 220,
  shadowStrength: 0,
  highlightHue: 40,
  highlightStrength: 0,
  balance: 0,
  midtoneHue: 0,
  midtoneStrength: 0,
};
