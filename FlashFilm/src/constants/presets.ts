import type { PresetKey } from '../types/imageProcessing';

export type PresetOption = {
  key: PresetKey;
  label: string;
};

export const PRESET_OPTIONS: readonly PresetOption[] = [
  {
    key: 'original',
    label: 'Original',
  },
  {
    key: 'aden',
    label: 'Aden',
  },
  {
    key: 'clarendon',
    label: 'Clarendon',
  },
];
