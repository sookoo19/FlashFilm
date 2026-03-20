import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Canvas,
  ColorMatrix,
  Image as SkiaImage,
  Rect,
  Shader,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import AdjustmentSlider from '../../components/AdjustmentSlider';
import {
  buildColorMatrix,
  renderFilteredImageToBase64,
} from '../../services/image/skiaFilter';
import { saveDatasetSample } from '../../services/storage/datasetStorage';
import {
  DEFAULT_AI_EDIT_RECIPE,
  type AiEditRecipe,
} from '../../types/aiEditRecipe';
import {
  ADJUSTMENT_RANGES,
  ADJUSTMENT_STEP,
  DEFAULT_ADJUSTMENTS,
  type AdjustmentKey,
  type AdjustmentState,
} from '../../types/imageProcessing';
import type { RootStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ImageProcessing'>;

// 調整項目の表示順
const ADJUSTMENT_KEYS: readonly AdjustmentKey[] = [
  'brightness',
  'contrast',
  'saturation',
  'temperature',
  'tint',
  'grain',
];

// グレインオーバーレイ用 RuntimeShader（プレビュー用）
// グレイの乱数ノイズを生成し Overlay ブレンドで重ねることでフィルム粒状感を再現する
const GRAIN_SHADER_SRC = `
  uniform float grainAmount;
  uniform float seed;

  half4 main(float2 coord) {
    float2 uv = coord * 0.003;
    float n = fract(sin(dot(uv + seed, float2(127.1, 311.7))) * 43758.5453);
    float g = 0.5 + (n - 0.5) * grainAmount;
    return half4(g, g, g, 1.0);
  }
`;

// モジュールスコープで一度だけコンパイルする
const grainEffect = Skia.RuntimeEffect.Make(GRAIN_SHADER_SRC) ?? null;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const ImageProcessingScreen = ({ route, navigation }: Props) => {
  const { photo } = route.params;

  const [isSaving, setIsSaving] = useState(false);
  const [adjustments, setAdjustments] =
    useState<AdjustmentState>(DEFAULT_ADJUSTMENTS);

  // Skia がネイティブで画像を読み込む
  // file:// URI に対応している（expo-camera の出力 URI をそのまま渡せる）
  const skImage = useImage(photo.uri);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // プレビュー領域は画面の 60% の高さ（編集パネルに残り 40% を確保）
  const previewHeight = windowHeight * 0.6;

  // 元画像のアスペクト比を維持してプレビューサイズを決める
  const { previewWidth, previewTop, previewLeft } = useMemo(() => {
    if (!skImage) {
      return { previewWidth: windowWidth, previewTop: 0, previewLeft: 0 };
    }
    const imgRatio = skImage.width() / skImage.height();
    const areaRatio = windowWidth / previewHeight;
    let pw: number;
    let ph: number;
    if (imgRatio > areaRatio) {
      pw = windowWidth;
      ph = windowWidth / imgRatio;
    } else {
      ph = previewHeight;
      pw = previewHeight * imgRatio;
    }
    return {
      previewWidth: pw,
      previewTop: (previewHeight - ph) / 2,
      previewLeft: (windowWidth - pw) / 2,
    };
  }, [skImage, windowWidth, previewHeight]);

  // 全スライダーが初期値かどうか
  const hasAdjustmentChanged = useMemo(
    () => ADJUSTMENT_KEYS.some(k => adjustments[k] !== DEFAULT_ADJUSTMENTS[k]),
    [adjustments]
  );

  // Skia ColorMatrix（プレビュー Canvas に渡す）
  const colorMatrix = useMemo(
    () => buildColorMatrix(adjustments),
    // 各値が変わった時だけ再計算
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      adjustments.brightness,
      adjustments.contrast,
      adjustments.saturation,
      adjustments.temperature,
      adjustments.tint,
    ]
  );

  // グレインシェーダーのユニフォーム（grain 値が変わった時だけ更新）
  const grainUniforms = useMemo(
    () => ({ grainAmount: adjustments.grain / 100, seed: 0.42 }),
    [adjustments.grain]
  );

  const handleChangeAdjustment = useCallback(
    (key: AdjustmentKey, nextValue: number) => {
      const { min, max } = ADJUSTMENT_RANGES[key];
      const clamped = Number(clamp(nextValue, min, max).toFixed(2));
      setAdjustments(prev => ({ ...prev, [key]: clamped }));
    },
    []
  );

  const handleRetake = () => {
    navigation.goBack();
  };

  const handleConfirm = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      let targetBase64: string | null = null;

      if (hasAdjustmentChanged) {
        if (!skImage) {
          Alert.alert(
            '処理中です',
            '画像の読み込みが完了してから保存してください。'
          );
          return;
        }
        // オフスクリーンレンダリングで調整済み画像を生成する
        // Canvas コンポーネントへの参照は不要で、同期的に完結する
        targetBase64 = renderFilteredImageToBase64(skImage, adjustments);
      }

      const recipe: AiEditRecipe = {
        ...DEFAULT_AI_EDIT_RECIPE,
        brightness: adjustments.brightness,
        contrast: adjustments.contrast,
        saturation: adjustments.saturation,
        temperature: adjustments.temperature,
        tint: adjustments.tint,
        grain: adjustments.grain,
      };

      let saved;
      if (targetBase64 !== null) {
        // 調整済み画像はキャッシュに書き出してから渡す
        const tempPath = `${FileSystem.cacheDirectory}filtered_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(tempPath, targetBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        saved = await saveDatasetSample({ targetUri: tempPath, recipe });
      } else {
        saved = await saveDatasetSample({ targetUri: photo.uri, recipe });
      }

      Alert.alert(
        '保存しました',
        `recipe.json と target.jpg を保存しました。\n保存先: ${saved.sampleId}`
      );
      navigation.popToTop();
    } catch (error) {
      console.error('Failed to save photo', error);
      Alert.alert(
        '保存に失敗しました',
        error instanceof Error ? error.message : 'もう一度お試しください。'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const editorPanelHeight = windowHeight * 0.4;

  return (
    <View style={styles.container}>
      {/* プレビューエリア: Skia Canvas で描画 */}
      <View style={[styles.previewHolder, { height: previewHeight }]}>
        <Canvas style={{ width: windowWidth, height: previewHeight }}>
          {skImage && (
            <>
              {/* カラーフィルターを Image の子要素として宣言する */}
              <SkiaImage
                image={skImage}
                x={previewLeft}
                y={previewTop}
                width={previewWidth}
                height={previewHeight - previewTop * 2}
                fit='contain'
              >
                <ColorMatrix matrix={colorMatrix} />
              </SkiaImage>

              {/* グレイン: Overlay ブレンドのノイズシェーダーを重ねる */}
              {adjustments.grain > 0 && grainEffect && (
                <Rect
                  x={previewLeft}
                  y={previewTop}
                  width={previewWidth}
                  height={previewHeight - previewTop * 2}
                  blendMode='overlay'
                >
                  <Shader source={grainEffect} uniforms={grainUniforms} />
                </Rect>
              )}
            </>
          )}
        </Canvas>
      </View>

      {/* 編集パネル */}
      <View style={[styles.editorPanel, { height: editorPanelHeight }]}>
        <Text style={styles.sectionTitle}>編集</Text>

        <ScrollView
          style={styles.adjustmentList}
          contentContainerStyle={styles.adjustmentListContent}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          {ADJUSTMENT_KEYS.map(key => {
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
        </ScrollView>
      </View>

      {/* アクションボタン */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.secondaryButton, isSaving && styles.buttonDisabled]}
          onPress={handleRetake}
          disabled={isSaving}
        >
          <Text style={styles.secondaryText}>Retake</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={isSaving}
        >
          <Text style={styles.primaryText}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.placeholderNote}>
        {hasAdjustmentChanged
          ? '保存時に target.jpg と recipe.json を作成します。'
          : '変更がないため、target.jpg は元画像として保存されます。'}
      </Text>

      <StatusBar style='light' />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewHolder: {
    backgroundColor: '#000',
  },
  editorPanel: {
    backgroundColor: '#0f0f0f',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 14,
  },
  sectionTitle: {
    color: '#f0f0f0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  adjustmentList: {
    marginTop: 14,
    flex: 1,
    minHeight: 0,
  },
  adjustmentListContent: {
    paddingBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#0f0f0f',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#222',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1f1f1f',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3a',
  },
  secondaryText: {
    color: '#f0f0f0',
    fontSize: 15,
    fontWeight: '700',
  },
  placeholderNote: {
    color: '#999',
    paddingHorizontal: 24,
    paddingBottom: 20,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ImageProcessingScreen;
