export type PresetKey = 'original' | 'aden' | 'clarendon';

export type AdjustmentKey = 'brightness' | 'contrast' | 'saturation';

export type AdjustmentState = Record<AdjustmentKey, number>;

export const DEFAULT_ADJUSTMENTS: AdjustmentState = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
};

export const ADJUSTMENT_STEP = 0.1;

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
    min: 0,
    max: 2,
  },
  contrast: {
    label: 'コントラスト',
    min: 0,
    max: 2,
  },
  saturation: {
    label: '彩度',
    min: 0,
    max: 2,
  },
};
