export type PresetKey = 'original' | 'aden' | 'clarendon';

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
    label: '露出 (EV)',
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
