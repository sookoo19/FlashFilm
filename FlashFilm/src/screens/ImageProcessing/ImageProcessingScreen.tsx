import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Canvas,
  ColorMatrix,
  Group,
  Image as SkiaImage,
  Rect,
  Shader,
  Skia,
  useImage,
} from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

import AdjustmentSlider from '../../components/AdjustmentSlider';
import ColorGradingPanel from '../../components/ColorGradingPanel';
import ColorMixerPanel from '../../components/ColorMixerPanel';
import EditorTabBar, { type EditorTab } from '../../components/EditorTabBar';
import {
  buildColorMatrix,
  colorGradingEffect,
  colorMixerEffect,
  renderFilteredImageToBase64,
} from '../../services/image/skiaFilter';
import { saveDatasetSample } from '../../services/storage/datasetStorage';
import {
  DEFAULT_AI_EDIT_RECIPE,
  type AiCapturedMetadata,
  type AiEditRecipe,
} from '../../types/aiEditRecipe';
import {
  ADJUSTMENT_RANGES,
  ADJUSTMENT_STEP,
  COLOR_CHANNELS,
  DEFAULT_ADJUSTMENTS,
  DEFAULT_COLOR_GRADING,
  DEFAULT_COLOR_MIXER,
  type AdjustmentKey,
  type AdjustmentState,
  type ColorGradingState,
  type ColorMixerState,
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

// ボタンアニメーション helper — モジュールスコープに置くことでレンダーごとの再生成を防ぐ
const animatePressIn = (anim: Animated.Value) =>
  Animated.spring(anim, {
    toValue: 0.96,
    speed: 60,
    bounciness: 0,
    useNativeDriver: true,
  }).start();

const animatePressOut = (anim: Animated.Value) =>
  Animated.spring(anim, {
    toValue: 1,
    speed: 20,
    bounciness: 4,
    useNativeDriver: true,
  }).start();

// プレビュー領域: ボタン・注釈エリアを除いた残りの高さを計算するための定数
const BOTTOM_CONTROLS_HEIGHT = 120;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

const ImageProcessingScreen = ({ route, navigation }: Props) => {
  const { photo } = route.params;

  const [isSaving, setIsSaving] = useState(false);
  const [adjustments, setAdjustments] =
    useState<AdjustmentState>(DEFAULT_ADJUSTMENTS);

  const [activeTab, setActiveTab] = useState<EditorTab>('basic');
  const [colorGrading, setColorGrading] = useState<ColorGradingState>(
    DEFAULT_COLOR_GRADING
  );
  const [colorMixer, setColorMixer] =
    useState<ColorMixerState>(DEFAULT_COLOR_MIXER);

  // Editor panel entrance: slides up + fades in on mount
  // useState initializer keeps Animated.Value stable without .current in render
  const [panelTranslateY] = useState(() => new Animated.Value(24));
  const [panelOpacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.parallel([
      Animated.timing(panelOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(panelTranslateY, {
        toValue: 0,
        speed: 14,
        bounciness: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save/Retake button press scale
  const [saveScale] = useState(() => new Animated.Value(1));
  const [retakeScale] = useState(() => new Animated.Value(1));

  // Skia がネイティブで画像を読み込む
  // file:// URI に対応している（expo-camera の出力 URI をそのまま渡せる）
  const skImage = useImage(photo.uri);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // プレビュー領域: ボタン・注釈エリアを除いた残りの 60%
  const previewHeight = (windowHeight - BOTTOM_CONTROLS_HEIGHT) * 0.6;

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

  // 全スライダーが初期値かどうか（colorGrading/colorMixer も含む）
  const hasAdjustmentChanged = useMemo(
    () =>
      ADJUSTMENT_KEYS.some(k => adjustments[k] !== DEFAULT_ADJUSTMENTS[k]) ||
      JSON.stringify(colorGrading) !== JSON.stringify(DEFAULT_COLOR_GRADING) ||
      JSON.stringify(colorMixer) !== JSON.stringify(DEFAULT_COLOR_MIXER),
    [adjustments, colorGrading, colorMixer]
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

  // カラーグレーディング用イメージフィルター（shadows/midtones/highlights が変わった時だけ再生成）
  const colorGradingPaint = useMemo(() => {
    if (!colorGradingEffect) return undefined;
    const { shadows: sh, midtones: mi, highlights: hi } = colorGrading;
    const builder = Skia.RuntimeShaderBuilder(colorGradingEffect);
    builder.setUniform('sh_h', [sh.hue]);
    builder.setUniform('sh_s', [sh.saturation]);
    builder.setUniform('sh_l', [sh.luminance]);
    builder.setUniform('mi_h', [mi.hue]);
    builder.setUniform('mi_s', [mi.saturation]);
    builder.setUniform('mi_l', [mi.luminance]);
    builder.setUniform('hi_h', [hi.hue]);
    builder.setUniform('hi_s', [hi.saturation]);
    builder.setUniform('hi_l', [hi.luminance]);
    const paint = Skia.Paint();
    paint.setImageFilter(
      Skia.ImageFilter.MakeRuntimeShader(builder, 'image', null)
    );
    return paint;
  }, [colorGrading]);

  // カラーミキサー用イメージフィルター（8チャンネル分のユニフォームを一括セット）
  const colorMixerPaint = useMemo(() => {
    if (!colorMixerEffect) return undefined;
    const builder = Skia.RuntimeShaderBuilder(colorMixerEffect);
    COLOR_CHANNELS.forEach((ch, i) => {
      builder.setUniform(`ch_${i * 3}`, [colorMixer[ch].hue]);
      builder.setUniform(`ch_${i * 3 + 1}`, [colorMixer[ch].saturation]);
      builder.setUniform(`ch_${i * 3 + 2}`, [colorMixer[ch].luminance]);
    });
    const paint = Skia.Paint();
    paint.setImageFilter(
      Skia.ImageFilter.MakeRuntimeShader(builder, 'image', null)
    );
    return paint;
  }, [colorMixer]);

  const handleChangeAdjustment = useCallback(
    (key: AdjustmentKey, nextValue: number) => {
      const { min, max } = ADJUSTMENT_RANGES[key];
      const clamped = Number(clamp(nextValue, min, max).toFixed(2));
      // setAdjustments の updater 形式で現在値を参照するため依存配列は空でよい
      setAdjustments(prev => ({ ...prev, [key]: clamped }));
    },
    [ADJUSTMENT_RANGES]
  );

  const handleRetake = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleColorGradingChange = useCallback((next: ColorGradingState) => {
    setColorGrading(next);
  }, []);

  const handleColorMixerChange = useCallback((next: ColorMixerState) => {
    setColorMixer(next);
  }, []);

  const handleConfirm = async () => {
    if (isSaving) return;
    if (hasAdjustmentChanged && !skImage) {
      Alert.alert(
        '処理中です',
        '画像の読み込みが完了してから保存してください。'
      );
      return;
    }
    setIsSaving(true);

    try {
      let targetBase64: string | null = null;

      if (hasAdjustmentChanged) {
        // オフスクリーンレンダリングで調整済み画像を生成する
        // Canvas コンポーネントへの参照は不要で、同期的に完結する
        targetBase64 = renderFilteredImageToBase64(
          skImage!,
          adjustments,
          colorGrading,
          colorMixer
        );
      }

      const exif = photo.exif ?? null;
      const metadata: AiCapturedMetadata | null = exif
        ? {
            iso:
              typeof exif['ISOSpeedRatings'] === 'number'
                ? exif['ISOSpeedRatings']
                : Array.isArray(exif['ISOSpeedRatings'])
                  ? (exif['ISOSpeedRatings'] as number[])[0] ?? null
                  : null,
            exposureTime:
              typeof exif['ExposureTime'] === 'number'
                ? exif['ExposureTime']
                : null,
            whiteBalance:
              exif['WhiteBalance'] === 0 ? 'auto' : exif['WhiteBalance'] === 1 ? 'custom' : null,
            flashFired:
              typeof exif['Flash'] === 'number'
                ? (exif['Flash'] & 0x1) === 1
                : null,
          }
        : null;

      const recipe: AiEditRecipe = {
        ...DEFAULT_AI_EDIT_RECIPE,
        brightness: adjustments.brightness,
        contrast: adjustments.contrast,
        saturation: adjustments.saturation,
        temperature: adjustments.temperature,
        tint: adjustments.tint,
        grain: adjustments.grain,
        colorGrading,
        colorMixer,
        metadata,
      };

      let saved;
      if (targetBase64 !== null) {
        // 調整済み画像はキャッシュに書き出してから渡す
        const tempPath = `${FileSystem.cacheDirectory}filtered_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(tempPath, targetBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        saved = await saveDatasetSample({ sourceUri: photo.uri, targetUri: tempPath, recipe });
      } else {
        saved = await saveDatasetSample({ sourceUri: photo.uri, targetUri: photo.uri, recipe });
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

  // インラインオブジェクトを避けるためにメモ化
  const canvasStyle = useMemo(
    () => ({ width: windowWidth, height: previewHeight }),
    [windowWidth, previewHeight]
  );

  const editorPanelHeight = (windowHeight - BOTTOM_CONTROLS_HEIGHT) * 0.4;

  return (
    <View style={styles.container}>
      {/* プレビューエリア: Skia Canvas で描画 */}
      <View style={[styles.previewHolder, { height: previewHeight }]}>
        <Canvas style={canvasStyle}>
          {skImage && (
            <>
              {/* colorMixer が最外層、colorGrading がその内側、SkiaImage が最内層 */}
              {/* 適用順: ColorMatrix → colorGrading → colorMixer（保存パスと一致） */}
              <Group layer={colorMixerPaint}>
                <Group layer={colorGradingPaint}>
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
                </Group>
              </Group>

              {/* グレインは colorGrading/colorMixer の外側で Overlay ブレンド */}
              {adjustments.grain > 0 && grainEffect !== null && (
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

      {/* 編集パネル — slides up + fades in on mount */}
      <Animated.View
        style={[
          styles.editorPanel,
          { height: editorPanelHeight },
          {
            opacity: panelOpacity,
            transform: [{ translateY: panelTranslateY }],
          },
        ]}
      >
        <EditorTabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          disabled={isSaving}
        />

        {activeTab === 'basic' && (
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
                  adjustmentKey={key}
                  label={range.label}
                  value={adjustments[key]}
                  min={range.min}
                  max={range.max}
                  step={ADJUSTMENT_STEP}
                  onChange={handleChangeAdjustment}
                  disabled={isSaving}
                />
              );
            })}
          </ScrollView>
        )}

        {activeTab === 'grading' && (
          <ColorGradingPanel
            colorGrading={colorGrading}
            onColorGradingChange={handleColorGradingChange}
          />
        )}

        {activeTab === 'mixer' && (
          <ColorMixerPanel
            colorMixer={colorMixer}
            onColorMixerChange={handleColorMixerChange}
          />
        )}
      </Animated.View>

      {/* アクションボタン */}
      <View style={styles.actions}>
        <AnimatedPressable
          style={[
            styles.secondaryButton,
            isSaving && styles.buttonDisabled,
            { transform: [{ scale: retakeScale }] },
          ]}
          onPress={handleRetake}
          onPressIn={() => animatePressIn(retakeScale)}
          onPressOut={() => animatePressOut(retakeScale)}
          disabled={isSaving}
        >
          <Text style={styles.secondaryText}>Retake</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={[
            styles.primaryButton,
            isSaving && styles.buttonDisabled,
            { transform: [{ scale: saveScale }] },
          ]}
          onPress={handleConfirm}
          onPressIn={() => !isSaving && animatePressIn(saveScale)}
          onPressOut={() => animatePressOut(saveScale)}
          disabled={isSaving}
        >
          <Text style={styles.primaryText}>
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </AnimatedPressable>
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
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    color: '#f0f0f0',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  adjustmentList: {
    marginTop: 16,
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
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1f1f1f',
    borderRadius: 10,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3a',
  },
  secondaryText: {
    color: '#f0f0f0',
    fontSize: 16,
    fontWeight: '600',
  },
  placeholderNote: {
    color: '#888888',
    paddingHorizontal: 24,
    paddingBottom: 16,
    fontSize: 13,
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ImageProcessingScreen;
