export type PresetKey = 'original' | 'aden' | 'clarendon';

export type AdjustmentKey =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'temperature'
  | 'tint'
  | 'grain'
  | 'shadow'
  | 'highlight'
  | 'midtone';

export type AdjustmentState = Record<AdjustmentKey, number>;

export const DEFAULT_ADJUSTMENTS: AdjustmentState = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  grain: 0,
  shadow: 0,
  highlight: 0,
  midtone: 0,
};

export const ADJUSTMENT_STEP = 0.05;

export const ADJUSTMENT_RANGES: Record<
  AdjustmentKey,
  {
    label: string;
    min: number;
    max: number;
  }
> = {
  brightness: {
    label: '明るさ',
    min: -1,
    max: 1,
  },
  contrast: {
    label: 'コントラスト',
    min: -1,
    max: 1,
  },
  saturation: {
    label: '彩度',
    min: -1,
    max: 1,
  },
  temperature: {
    label: '色温度',
    min: -1,
    max: 1,
  },
  tint: {
    label: '色かぶり',
    min: -1,
    max: 1,
  },
  grain: {
    label: '粒子',
    min: 0,
    max: 1,
  },
  shadow: {
    label: 'シャドー',
    min: 0,
    max: 1,
  },
  highlight: {
    label: 'ハイライト',
    min: 0,
    max: 1,
  },
  midtone: {
    label: 'ミッドトーン',
    min: 0,
    max: 1,
  },
};
