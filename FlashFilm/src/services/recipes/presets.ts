// レシピの型と、初期状態のレシピを読み込む
import {
  // 1つの編集レシピの型
  AiEditRecipe,
  // 最初の基準になるレシピ
  DEFAULT_AI_EDIT_RECIPE,
  // 使えるプリセットIDの型
  FlashPresetId,
} from '../../types/aiEditRecipe';

// アプリで最初に使うプリセットIDを決める
// 今は flash_base だけなので、これが標準になる
export const DEFAULT_FLASH_PRESET_ID: FlashPresetId = 'flash_base';

// すべてのプリセットをまとめて持つオブジェクト
export const FLASH_PRESETS: Readonly<
  // キーはプリセットID、値は編集レシピ
  Record<FlashPresetId, Readonly<AiEditRecipe>>
> = {
  // 最小構成なので、今は flash_base だけを登録する
  flash_base: {
    // DEFAULT_AI_EDIT_RECIPE の中身をコピーして使う
    ...DEFAULT_AI_EDIT_RECIPE,
  },
};

// プリセットIDを受け取って、そのレシピを返す関数
export const getPresetById = (presetId: FlashPresetId): AiEditRecipe => {
  return {
    // 登録されているプリセットをそのまま返さず、
    // コピーして返すことで、元データの破壊を防ぐ
    ...FLASH_PRESETS[presetId],
  };
};

// 標準のプリセットを返す関数
export const getDefaultPreset = (): AiEditRecipe => {
  // 既定のプリセットIDを使って、上の共通関数から取得する
  return getPresetById(DEFAULT_FLASH_PRESET_ID);
};
