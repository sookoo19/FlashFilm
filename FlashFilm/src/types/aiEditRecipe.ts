import {
  ColorGradingState,
  ColorMixerState,
  DEFAULT_COLOR_GRADING,
  DEFAULT_COLOR_MIXER,
} from './imageProcessing';
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
  colorGrading: ColorGradingState;
  colorMixer: ColorMixerState;
  metadata: AiCapturedMetadata | null;
};

export const DEFAULT_AI_EDIT_RECIPE: Readonly<AiEditRecipe> = {
  version: 3,
  presetId: 'flash_base',
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  grain: 0,
  colorGrading: DEFAULT_COLOR_GRADING,
  colorMixer: DEFAULT_COLOR_MIXER,
  metadata: null,
};
