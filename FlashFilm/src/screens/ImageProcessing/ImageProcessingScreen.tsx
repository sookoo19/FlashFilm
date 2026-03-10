// React Navigation の「この画面が受け取る props の型」を使うために読み込みます
import { type NativeStackScreenProps } from '@react-navigation/native-stack';

// 画面上部のステータスバーの色を設定するために読み込みます
import { StatusBar } from 'expo-status-bar';

// React の機能を読み込みます
import {
  // 関数をメモ化して、毎回作り直さないようにするために使います
  useCallback,
  // 画面表示後や state が変わった時に処理を動かすために使います
  useEffect,
  // 計算結果をメモして、不要な再計算を減らすために使います
  useMemo,
  // 画面の状態を保存するために使います
  useState,
  // コンポーネントの型を表すための型です
  type ComponentType,
  // JSX の要素型を表すための型です
  type ReactElement,
} from 'react';

// React Native の基本UI部品を読み込みます
import {
  // エラーメッセージをポップアップ表示するために使います
  Alert,
  // 画像を表示するために使います
  Image,
  // ボタンのように押せるUI部品です
  Pressable,
  // スタイルを書くために使います
  StyleSheet,
  // 文字を表示するために使います
  Text,
  // ネイティブの ViewManager 登録状況を確認するために使います
  UIManager,
  // フィルターコンポーネントへ渡す style 型です
  type StyleProp,
  // フィルターコンポーネントへ渡す style 型です
  type ViewStyle,
  // レイアウト用の箱です
  View,
} from 'react-native';

// 明るさなどを調整する小さなUI部品を読み込みます
import AdjustmentSlider from '../../components/AdjustmentSlider';

import {
  DEFAULT_AI_EDIT_RECIPE,
  type AiEditRecipe,
} from '../../types/aiEditRecipe';

import { saveDatasetSample } from '../../services/storage/datasetStorage';

// 画像編集に関する型や定数を読み込みます
import {
  // 明るさ・コントラスト・彩度の範囲定義です
  ADJUSTMENT_RANGES,
  // スライダーの増減幅です
  ADJUSTMENT_STEP,
  // 初期状態の編集値です
  DEFAULT_ADJUSTMENTS,
  // 調整項目のキー型です（brightness など）
  type AdjustmentKey,
  // 調整値全体の型です
  type AdjustmentState,
} from '../../types/imageProcessing';

// アプリ全体の画面遷移の型を読み込みます
import type { RootStackParamList } from '../../types/navigation';

// この画面が受け取る props の型を作ります
type ImageProcessingScreenProps = NativeStackScreenProps<
  // アプリ全体の画面一覧とパラメータ型
  RootStackParamList,
  // このファイルの画面名
  'ImageProcessing'
>;

// フィルター適用後に返ってくるイベントの型です
type FilterExtractEvent = {
  // nativeEvent の中に結果が入ります
  nativeEvent: {
    // 加工後画像の一時ファイルURIです
    uri?: string;
    // 加工に失敗した時のエラー文字列です
    error?: string;
  };
};

// フィルター処理でエラーが起きた時のイベント型です
type FilterErrorEvent = {
  nativeEvent: {
    message?: string;
  };
};

// フィルターコンポーネントに渡す共通propsの型です
type BaseFilterProps = {
  // 加工したい元画像です
  image: ReactElement;
  // フィルター描画領域のスタイルです
  style?: StyleProp<ViewStyle>;
  // true の時、加工後画像を一時ファイルとして取り出せます
  extractImageEnabled?: boolean;
  // 画像の取り出し完了時に呼ばれる関数です
  onExtractImage?: (event: FilterExtractEvent) => void;
  // フィルター処理でエラーになった時に呼ばれる関数です
  onFilteringError?: (event: FilterErrorEvent) => void;
};

// `ColorMatrix` 用の props 型です
type ColorMatrixFilterProps = BaseFilterProps & {
  // 色変換に使う行列です
  matrix: number[];
};

// `react-native-image-filter-kit` を動的読み込みするための型です
type ImageFilterKitModule = {
  // プリセットフィルター `Aden`
  Aden: ComponentType<BaseFilterProps>;
  // プリセットフィルター `Clarendon`
  Clarendon: ComponentType<BaseFilterProps>;
  // 色行列を使って明るさなどを一括調整するコンポーネント
  ColorMatrix: ComponentType<ColorMatrixFilterProps>;
  // 明るさの変換行列を作る関数
  brightness: (amount?: number) => number[];
  // コントラストの変換行列を作る関数
  contrast: (amount?: number) => number[];
  // 彩度の変換行列を作る関数
  saturate: (amount?: number) => number[];
  // 複数の色変換行列を1つにまとめる関数
  concatColorMatrices: (matrices: number[][]) => number[];
};

// 調整する項目の順番を固定する配列です
const adjustmentKeys: readonly AdjustmentKey[] = [
  // 明るさ
  'brightness',
  // コントラスト
  'contrast',
  // 彩度
  'saturation',
  // 色温度
  'temperature',
  // 色かぶり
  'tint',
  // 粒子
  'grain',
  // シャドー
  'shadow',
  // ハイライト
  'highlight',
  // ミッドトーン
  'midtone',
];

const toTemperatureTintMatrix = (
  temperature: number,
  tint: number
): number[] => {
  const redScale = Math.max(0, 1 + temperature * 0.12 + tint * 0.06);
  const greenScale = Math.max(0, 1 - Math.abs(tint) * 0.04);
  const blueScale = Math.max(0, 1 - temperature * 0.12 - tint * 0.06);

  return [
    redScale,
    0,
    0,
    0,
    0,
    0,
    greenScale,
    0,
    0,
    0,
    0,
    0,
    blueScale,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ];
};

const toToneBalanceMatrix = (
  shadow: number,
  highlight: number,
  midtone: number,
  grain: number
): number[] => {
  const redScale = Math.max(0, 1 + highlight * 0.1 - shadow * 0.05);
  const greenScale = Math.max(0, 1 + midtone * 0.04 - grain * 0.03);
  const blueScale = Math.max(0, 1 + shadow * 0.12 - highlight * 0.04);
  const contrastLike = Math.max(0.85, 1 + grain * 0.06 + midtone * 0.03);

  return [
    redScale * contrastLike,
    0,
    0,
    0,
    0,
    0,
    greenScale * contrastLike,
    0,
    0,
    0,
    0,
    0,
    blueScale * contrastLike,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ];
};

// `IFKImageFilter` の ViewManager が登録されているか確認します
const hasIfkViewManager = (() => {
  // RN バージョン差分に対応するため optional で呼びます
  const config = UIManager.getViewManagerConfig?.('IFKImageFilter');

  // 新しめの RN では getViewManagerConfig で取得できます
  if (config != null) {
    return true;
  }

  // 古い実装向けに UIManager 直下もフォールバック確認します
  const legacyUIManager = UIManager as unknown as Record<string, unknown>;
  return legacyUIManager.IFKImageFilter != null;
})();

// ネイティブのフィルター機能が使えるかを確認します
const isImageFilterKitAvailable = hasIfkViewManager;

// `react-native-image-filter-kit` を安全に読み込む関数です
const loadImageFilterKit = (): ImageFilterKitModule | null => {
  // ネイティブモジュールが無いなら使えないので null を返します
  if (!isImageFilterKitAvailable) {
    return null;
  }

  try {
    // ライブラリを動的に読み込みます
    // Expo Go などで静的importすると落ちる可能性があるため、この形にしています
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-image-filter-kit') as ImageFilterKitModule;
  } catch (error) {
    // 読み込み失敗時は警告だけ出して、アプリ自体は落とさないようにします
    console.warn(
      'react-native-image-filter-kit の読み込みに失敗したため、フィルターを無効化します。',
      error
    );
    // 使えないので null を返します
    return null;
  }
};

// 画面の外で一度だけ読み込みます
const imageFilterKit = loadImageFilterKit();

// ここから画面コンポーネント本体です
const ImageProcessingScreen = ({
  // 前画面から渡されるデータ
  route,
  // 画面遷移用の操作
  navigation,
}: ImageProcessingScreenProps) => {
  // 前画面から渡された撮影画像を取り出します
  const { photo } = route.params;

  // 今保存中かどうかを覚えておく state です
  const [isSaving, setIsSaving] = useState(false);

  // 明るさ・コントラスト・彩度の現在値です
  const [adjustments, setAdjustments] =
    useState<AdjustmentState>(DEFAULT_ADJUSTMENTS);

  // 加工後に抽出された画像URIを保存しておく state です
  const [filteredUri, setFilteredUri] = useState<string | null>(null);

  // 今まさに編集画像を生成中かどうかの state です
  const [isExtracting, setIsExtracting] = useState(false);

  // フィルター機能が使えるかどうかです
  const canUseFilter = imageFilterKit !== null;

  // 調整値が初期値から変わっているかを調べます
  const hasAdjustmentChanged = useMemo(
    () =>
      // adjustmentKeys のどれか1つでも初期値と違えば true
      adjustmentKeys.some(key => adjustments[key] !== DEFAULT_ADJUSTMENTS[key]),
    // adjustments が変わった時だけ再計算します
    [adjustments]
  );

  // 実際に画像へ効果を適用すべきかを判定します
  const shouldApplyEffect =
    // 調整値が変わっている時だけ true
    hasAdjustmentChanged;

  // フィルター条件が変わった時に、抽出状態を更新します
  useEffect(() => {
    // 効果を適用しないなら、抽出状態をリセットします
    if (!shouldApplyEffect) {
      // 処理中ではない
      setIsExtracting(false);
      // 抽出済み画像も不要なので消す
      setFilteredUri(null);
      return;
    }

    // 効果を適用するなら、新しい編集画像をこれから作る状態にします
    setIsExtracting(true);
    // 以前の抽出結果は古いので消します
    setFilteredUri(null);
  }, [adjustments, shouldApplyEffect]);

  // 「撮り直し」ボタンを押した時の処理です
  const handleRetake = () => {
    // 1つ前の画面へ戻ります
    navigation.goBack();
  };

  // 加工後画像の抽出が終わった時の処理です
  const handleExtracted = useCallback((event: FilterExtractEvent) => {
    // イベントから URI とエラーを取り出します
    const { uri, error } = event.nativeEvent;

    // エラーがある場合です
    if (error) {
      // 開発者向けにログを出します
      console.warn('Filter extract error', error);
      // 処理中フラグを下げます
      setIsExtracting(false);
      // ここで終了します
      return;
    }

    // URI が取れていれば成功です
    if (uri) {
      // 保存用に加工後画像URIを覚えます
      setFilteredUri(uri);
      // 処理中フラグを下げます
      setIsExtracting(false);
    }
  }, []);

  // フィルター描画側のエラーを受け取る処理です
  const handleFilteringError = useCallback((event: FilterErrorEvent) => {
    // ネイティブ側のエラーメッセージを取り出します
    const message = event.nativeEvent.message ?? 'Unknown filter error';

    // 開発者向けログを残します
    console.warn('Filter rendering error', message);

    // 抽出待ち状態を解除します
    setIsExtracting(false);
  }, []);

  // 調整値変更時の処理です
  const handleChangeAdjustment = (key: AdjustmentKey, nextValue: number) => {
    // その項目の最小値・最大値を取得します
    const { min, max } = ADJUSTMENT_RANGES[key];

    // 値が範囲を超えないように丸めます
    const clamped = Math.max(min, Math.min(max, nextValue));

    // 調整値を更新します
    setAdjustments(prev => ({
      // 以前の値を引き継ぎつつ
      ...prev,
      // 該当キーだけ上書きします
      [key]: Number(clamped.toFixed(2)),
    }));
  };

  // 画面に表示するプレビュー画像を組み立てます
  const previewContent = useMemo(() => {
    // まず元画像を作ります
    const baseImage = (
      <Image source={{ uri: photo.uri }} style={styles.preview} />
    );

    // フィルターを使わない場合は元画像をそのまま返します
    if (!shouldApplyEffect || !imageFilterKit) {
      return baseImage;
    }

    // 動的に読み込んだライブラリから必要な機能を取り出します
    const {
      ColorMatrix,
      brightness: toBrightnessMatrix,
      contrast: toContrastMatrix,
      saturate: toSaturateMatrix,
      concatColorMatrices,
    } = imageFilterKit;

    // 明るさ・コントラスト・彩度の行列を1つにまとめます
    const adjustmentMatrix = concatColorMatrices([
      toBrightnessMatrix(adjustments.brightness + 1),
      toContrastMatrix(adjustments.contrast + 1),
      toSaturateMatrix(adjustments.saturation + 1),
      toTemperatureTintMatrix(adjustments.temperature, adjustments.tint),
      toToneBalanceMatrix(
        adjustments.shadow,
        adjustments.highlight,
        adjustments.midtone,
        adjustments.grain
      ),
    ]);

    // プリセット後の画像にさらに色調整をかけます
    return (
      <ColorMatrix
        // 合成した色変換行列を渡します
        matrix={adjustmentMatrix}
        // フィルター描画領域のサイズを維持します
        style={styles.preview}
        // 編集後画像を一時ファイルとして取り出せるようにします
        extractImageEnabled
        // フィルター描画エラー時の処理です
        onFilteringError={handleFilteringError}
        // 取り出し完了時に呼ぶ関数です
        onExtractImage={handleExtracted}
        // 実際に加工する画像です
        image={baseImage}
      />
    );
  }, [
    // 明るさが変わったら再計算
    adjustments.brightness,
    // コントラストが変わったら再計算
    adjustments.contrast,
    // 彩度が変わったら再計算
    adjustments.saturation,
    // 色温度が変わったら再計算
    adjustments.temperature,
    // 色かぶりが変わったら再計算
    adjustments.tint,
    // 粒子が変わったら再計算
    adjustments.grain,
    // シャドーが変わったら再計算
    adjustments.shadow,
    // ハイライトが変わったら再計算
    adjustments.highlight,
    // ミッドトーンが変わったら再計算
    adjustments.midtone,
    // 抽出完了処理が変わったら再計算
    handleExtracted,
    // 描画エラー処理が変わったら再計算
    handleFilteringError,
    // 元画像URIが変わったら再計算
    photo.uri,
    // フィルター適用有無が変わったら再計算
    shouldApplyEffect,
  ]);

  // 「保存して進む」ボタンの処理です
  const handleConfirm = async () => {
    // すでに保存中なら何もしません
    if (isSaving) {
      return;
    }

    try {
      // 保存中にします
      setIsSaving(true);

      if (shouldApplyEffect && !canUseFilter) {
        Alert.alert(
          '保存できません',
          'このビルドでは編集画像を生成できないため、target.jpg を保存できません。'
        );
        return;
      }

      // 編集画像が必要なのに、まだ生成できていない場合は止めます
      if (shouldApplyEffect && (isExtracting || !filteredUri)) {
        Alert.alert('処理中です', '編集が完了してから保存してください。');
        return;
      }

      const recipe: AiEditRecipe = {
        ...DEFAULT_AI_EDIT_RECIPE,
        brightness: adjustments.brightness,
        contrast: adjustments.contrast,
        saturation: adjustments.saturation,
        temperature: Math.round(adjustments.temperature * 1000),
        tint: Math.round(adjustments.tint * 100),
        grain: adjustments.grain,
        shadowStrength: adjustments.shadow,
        highlightStrength: adjustments.highlight,
        midtoneStrength: adjustments.midtone,
      };

      const targetUri = shouldApplyEffect ? filteredUri! : photo.uri;

      const saved = await saveDatasetSample({
        targetUri,
        recipe,
      });

      Alert.alert(
        '保存しました',
        `recipe.json と target.jpg を保存しました。\n保存先: ${saved.sampleId}`
      );

      // 保存できたら先頭画面まで戻ります
      navigation.popToTop();
    } catch (error) {
      // 開発者向けログです
      console.error('Failed to save photo', error);
      // ユーザー向けメッセージです
      Alert.alert(
        '保存に失敗しました',
        error instanceof Error ? error.message : 'もう一度お試しください。'
      );
    } finally {
      // 最後に保存中フラグを元に戻します
      setIsSaving(false);
    }
  };

  // ここから実際の画面UIを返します
  return (
    // 画面全体の外枠です
    <View style={styles.container}>
      {/* 上側の画像プレビューエリアです */}
      <View style={styles.previewHolder}>{previewContent}</View>

      <View style={styles.editorPanel}>
        <Text style={styles.sectionTitle}>編集</Text>

        <View style={styles.adjustmentArea}>
          {adjustmentKeys.map(key => {
            const range = ADJUSTMENT_RANGES[key];

            return (
              <AdjustmentSlider
                key={key}
                label={range.label}
                value={adjustments[key]}
                min={range.min}
                max={range.max}
                step={ADJUSTMENT_STEP}
                onChange={nextValue => handleChangeAdjustment(key, nextValue)}
                disabled={isSaving}
              />
            );
          })}
        </View>
      </View>

      {!canUseFilter && (
        <Text style={styles.filterUnavailableNote}>
          このビルドでは編集プレビューを生成できないため、変更を加えて保存するには
          Dev Client / Run Build が必要です。
        </Text>
      )}

      {/* 編集画像をまだ生成中の時に表示するメッセージです */}
      {shouldApplyEffect && (isExtracting || !filteredUri) && (
        <Text style={styles.filterNote}>編集画像を生成しています…</Text>
      )}

      {/* 下側のボタンエリアです */}
      <View style={styles.actions}>
        {/* 撮り直しボタンです */}
        <Pressable
          // 保存中は少し薄く見せます
          style={[styles.secondaryButton, isSaving && styles.buttonDisabled]}
          // 押した時の処理
          onPress={handleRetake}
          // 保存中は押せません
          disabled={isSaving}
        >
          {/* ボタン文字です */}
          <Text style={styles.secondaryText}>Retake</Text>
        </Pressable>

        {/* 保存して進むボタンです */}
        <Pressable
          // 保存中は少し薄く見せます
          style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
          // 押した時の処理
          onPress={handleConfirm}
          // 保存中は押せません
          disabled={isSaving}
        >
          {/* 保存中は文字を切り替えます */}
          <Text style={styles.primaryText}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>

      {/* 今の保存内容を説明するメッセージです */}
      <Text style={styles.placeholderNote}>
        {shouldApplyEffect
          ? '保存時に target.jpg と recipe.json を作成します。'
          : '変更がないため、target.jpg は元画像として保存されます。'}
      </Text>

      {/* 黒背景なので、文字を見やすい light にします */}
      <StatusBar style='light' />
    </View>
  );
};

// ここから画面で使うスタイルをまとめて定義します
const styles = StyleSheet.create({
  // 画面全体のスタイルです
  container: {
    // 画面いっぱいに広げます
    flex: 1,
    // 背景色を黒にします
    backgroundColor: '#000',
  },

  // 画像プレビューの外側の箱です
  previewHolder: {
    // 上側の広い領域を使います
    flex: 1,
  },

  // 画像そのもののスタイルです
  preview: {
    // 領域いっぱいに広げます
    flex: 1,
  },

  // プリセットや編集UIを入れるパネルです
  editorPanel: {
    // 少し明るい黒にします
    backgroundColor: '#0f0f0f',
    // 下に細い線を引きます
    borderBottomWidth: StyleSheet.hairlineWidth,
    // 線の色です
    borderBottomColor: '#222',
    // 左右の余白です
    paddingHorizontal: 24,
    // 上の余白です
    paddingTop: 12,
    // 下の余白です
    paddingBottom: 14,
  },

  // 「プリセット」「編集」などの見出し文字です
  sectionTitle: {
    // 文字色を明るくします
    color: '#f0f0f0',
    // 文字サイズです
    fontSize: 13,
    // 少し太字にします
    fontWeight: '700',
    // 文字間隔です
    letterSpacing: 0.2,
  },

  // 編集スライダー群の上余白です
  adjustmentArea: {
    // 上に少し余白を入れます
    marginTop: 14,
  },

  // 「生成中です…」の説明文です
  filterNote: {
    // 少し控えめな色にします
    color: '#bbb',
    // 左右の余白です
    paddingHorizontal: 24,
    // 下の余白です
    paddingBottom: 8,
    // 文字サイズです
    fontSize: 12,
    // 文字間隔です
    letterSpacing: 0.2,
  },

  // フィルター機能が使えない時の説明文です
  filterUnavailableNote: {
    // 文字色です
    color: '#bbb',
    // 左右の余白です
    paddingHorizontal: 24,
    // 上の余白です
    paddingTop: 12,
    // 下の余白です
    paddingBottom: 8,
    // 文字サイズです
    fontSize: 12,
    // 文字間隔です
    letterSpacing: 0.2,
    // 背景色です
    backgroundColor: '#0f0f0f',
    // 下に線を引きます
    borderBottomWidth: StyleSheet.hairlineWidth,
    // 線の色です
    borderBottomColor: '#222',
  },

  // 下側のボタンエリアです
  actions: {
    // ボタンを横並びにします
    flexDirection: 'row',
    // ボタン同士のすき間です
    gap: 12,
    // 左右の余白です
    paddingHorizontal: 24,
    // 上下の余白です
    paddingVertical: 16,
    // 背景色です
    backgroundColor: '#0f0f0f',
    // 上に線を引きます
    borderTopWidth: StyleSheet.hairlineWidth,
    // 線の色です
    borderTopColor: '#222',
  },

  // 右側の主ボタンです
  primaryButton: {
    // 幅を均等に使います
    flex: 1,
    // 明るい背景色です
    backgroundColor: '#f0f0f0',
    // 角を丸くします
    borderRadius: 10,
    // 上下の余白です
    paddingVertical: 14,
    // 中身を中央にします
    alignItems: 'center',
  },

  // 主ボタンの文字です
  primaryText: {
    // 文字色です
    color: '#111',
    // 文字サイズです
    fontSize: 15,
    // 太字です
    fontWeight: '700',
  },

  // 左側の補助ボタンです
  secondaryButton: {
    // 幅を均等に使います
    flex: 1,
    // 暗めの背景色です
    backgroundColor: '#1f1f1f',
    // 角を丸くします
    borderRadius: 10,
    // 上下の余白です
    paddingVertical: 14,
    // 中身を中央にします
    alignItems: 'center',
    // 細い枠線です
    borderWidth: StyleSheet.hairlineWidth,
    // 枠線の色です
    borderColor: '#3a3a3a',
  },

  // 補助ボタンの文字です
  secondaryText: {
    // 文字色です
    color: '#f0f0f0',
    // 文字サイズです
    fontSize: 15,
    // 太字です
    fontWeight: '700',
  },

  // 画面下の説明文です
  placeholderNote: {
    // 控えめな文字色です
    color: '#999',
    // 左右の余白です
    paddingHorizontal: 24,
    // 下の余白です
    paddingBottom: 20,
    // 文字サイズです
    fontSize: 12,
    // 文字間隔です
    letterSpacing: 0.2,
  },

  // ボタンを無効化した時の見た目です
  buttonDisabled: {
    // 少し薄くします
    opacity: 0.6,
  },
});

// 他ファイルからこの画面を使えるように公開します
export default ImageProcessingScreen;
