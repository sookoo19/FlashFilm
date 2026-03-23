export type PresetKey = 'original' | 'aden' | 'clarendon';

// ─── Adjustment ───────────────────────────────────────────────────────────
export type AdjustmentKey =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'temperature'
  | 'tint'
  | 'grain';

export type AdjustmentState = Record<AdjustmentKey, number>;

export const DEFAULT_ADJUSTMENTS: AdjustmentState = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  grain: 0,
};

export const ADJUSTMENT_STEP = 1;

export const ADJUSTMENT_RANGES: Record<
  AdjustmentKey,
  {
    label: string;
    min: number;
    max: number;
  }
> = {
  brightness: {
    label: '露出',
    min: -5,
    max: 5,
  },
  contrast: {
    label: 'コントラスト',
    min: -100,
    max: 100,
  },
  saturation: {
    label: '彩度',
    min: -100,
    max: 100,
  },
  temperature: {
    label: '色温度',
    min: -100,
    max: 100,
  },
  tint: {
    label: '色かぶり',
    min: -150,
    max: 150,
  },
  grain: {
    label: 'グレイン',
    min: 0,
    max: 100,
  },
};

// ─── Color Grading ───────────────────────────────────────────────────────────
export type ToneRange = 'shadows' | 'midtones' | 'highlights';
export type ToneGradeState = {
  hue: number;
  saturation: number;
  luminance: number;
};
export type ColorGradingState = Record<ToneRange, ToneGradeState>;

export const DEFAULT_TONE_GRADE: ToneGradeState = {
  hue: 0,
  saturation: 0,
  luminance: 0,
};
export const DEFAULT_COLOR_GRADING: ColorGradingState = {
  shadows: { ...DEFAULT_TONE_GRADE },
  midtones: { ...DEFAULT_TONE_GRADE },
  highlights: { ...DEFAULT_TONE_GRADE },
};
export const TONE_GRADE_RANGES = {
  hue: { label: '色相', min: 0, max: 360 },
  saturation: { label: '彩度', min: 0, max: 100 },
  luminance: { label: '輝度', min: -100, max: 100 },
} as const;

// ─── Color Mixer ─────────────────────────────────────────────────────────────
export type ColorChannel =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'aqua'
  | 'blue'
  | 'purple'
  | 'magenta';
export type ChannelMixState = {
  hue: number;
  saturation: number;
  luminance: number;
};
export type ColorMixerState = Record<ColorChannel, ChannelMixState>;

export const DEFAULT_CHANNEL_MIX: ChannelMixState = {
  hue: 0,
  saturation: 0,
  luminance: 0,
};
export const COLOR_CHANNELS: readonly ColorChannel[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'aqua',
  'blue',
  'purple',
  'magenta',
];
export const COLOR_CHANNEL_LABELS: Record<ColorChannel, string> = {
  red: 'レッド',
  orange: 'オレンジ',
  yellow: 'イエロー',
  green: 'グリーン',
  aqua: 'アクア',
  blue: 'ブルー',
  purple: 'パープル',
  magenta: 'マゼンタ',
};
export const DEFAULT_COLOR_MIXER: ColorMixerState = Object.fromEntries(
  COLOR_CHANNELS.map(c => [c, { ...DEFAULT_CHANNEL_MIX }])
) as ColorMixerState;
export const MIX_RANGES = {
  hue: { label: '色相', min: -100, max: 100 },
  saturation: { label: '彩度', min: -100, max: 100 },
  luminance: { label: '輝度', min: -100, max: 100 },
} as const;
