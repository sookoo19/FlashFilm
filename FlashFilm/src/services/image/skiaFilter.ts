import { BlendMode, ImageFormat, Skia } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';

import type { AdjustmentState } from '../../types/imageProcessing';

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

// 4×5カラーマトリクス（20要素）の行列積
// [row * 5 + col]は「2次元 → 1次元」に変換してるだけ
// Skia は 0〜1 の色空間を使用。bias列（index 4,9,14,19）も 0〜1 で指定する
const mulMatrix = (a: number[], b: number[]): number[] => {
  if (__DEV__ && (a.length !== 20 || b.length !== 20)) {
    throw new Error(`mulMatrix: 配列長が不正です (${a.length}, ${b.length})`);
  }
  const out = new Array<number>(20).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[row * 5 + k] * b[k * 5 + col];
      }
      out[row * 5 + col] = sum;
    }
    // bias列 (col=4)
    let bias = a[row * 5 + 4];
    for (let k = 0; k < 4; k++) {
      bias += a[row * 5 + k] * b[k * 5 + 4];
    }
    out[row * 5 + 4] = bias;
  }
  return out;
};

// 露出マトリクス: 1ユニット = 1/3 EV として RGB を乗算
// Math.pow(2, …)は2の何乗か計算
// （2^1 = 2倍は変化が大きすぎるため、2^(stops/3) に緩和）
const brightnessMatrix = (stops: number): number[] => {
  const s = Math.pow(2, clamp(stops, -5, 5) / 3);
  // prettier-ignore
  return [
    s, 0, 0, 0, 0,
    0, s, 0, 0, 0,
    0, 0, s, 0, 0,
    0, 0, 0, 1, 0,
  ];
};

// コントラストマトリクス: 0.5 グレーを基点にスケール
// s の下限を 0.05 にすることでスライダー最小値でも完全な黒つぶれを防ぐ
const contrastMatrix = (amount: number): number[] => {
  const s = Math.max(0.05, 1 + amount / 100);
  const t = 0.5 * (1 - s); // Skia の 0〜1 空間での bias
  // prettier-ignore
  return [
    s, 0, 0, 0, t,
    0, s, 0, 0, t,
    0, 0, s, 0, t,
    0, 0, 0, 1, 0,
  ];
};

// 彩度マトリクス: sRGB 輝度重み使用
const saturationMatrix = (amount: number): number[] => {
  const s = Math.max(0, 1 + amount / 100);
  const lr = 0.213;
  const lg = 0.715;
  const lb = 0.072;
  const dr = (1 - s) * lr;
  const dg = (1 - s) * lg;
  const db = (1 - s) * lb;
  // prettier-ignore
  return [
    dr + s, dg,     db,     0, 0,
    dr,     dg + s, db,     0, 0,
    dr,     dg,     db + s, 0, 0,
    0,      0,      0,      1, 0,
  ];
};

// 色温度・色かぶりマトリクス: RGB チャンネルをスケール
const temperatureTintMatrix = (temperature: number, tint: number): number[] => {
  const tf = clamp(temperature, -100, 100) / 100;
  const pf = clamp(tint, -150, 150) / 150;
  const rs = Math.max(0.1, 1 + tf * 0.9 + pf * 0.25);
  const gs = Math.max(0.1, 1 - Math.abs(pf) * 0.45 + tf * 0.05);
  const bs = Math.max(0.1, 1 - tf * 0.9 - pf * 0.25);
  // prettier-ignore
  return [
    rs, 0,  0,  0, 0,
    0,  gs, 0,  0, 0,
    0,  0,  bs, 0, 0,
    0,  0,  0,  1, 0,
  ];
};

// AdjustmentState から Skia 用カラーマトリクスを生成する
// 適用順: brightness → contrast → saturation → temperature+tint
export const buildColorMatrix = (adj: AdjustmentState): number[] => {
  const B = brightnessMatrix(adj.brightness);
  const C = contrastMatrix(adj.contrast);
  const S = saturationMatrix(adj.saturation);
  const T = temperatureTintMatrix(adj.temperature, adj.tint);
  const BC = mulMatrix(C, B);
  const BCS = mulMatrix(S, BC);
  return mulMatrix(T, BCS);
};

// グレインを重ねるための RuntimeShader ソース（クロスプラットフォーム）
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

// SkImage に調整値を適用した JPEG base64 を返す（オフスクリーンレンダリング）
// Canvas コンポーネントに依存しないため保存時に利用する
export const renderFilteredImageToBase64 = (
  skImage: SkImage,
  adj: AdjustmentState
): string => {
  const w = skImage.width();
  const h = skImage.height();

  // Surface 1: カラーマトリクス適用
  const colorSurface = Skia.Surface.Make(w, h);
  if (!colorSurface) {
    throw new Error('Skia.Surface.Make が失敗しました');
  }
  const colorCanvas = colorSurface.getCanvas();
  const colorPaint = Skia.Paint();
  colorPaint.setColorFilter(Skia.ColorFilter.MakeMatrix(buildColorMatrix(adj)));
  colorCanvas.drawImage(skImage, 0, 0, colorPaint);
  const colorImage = colorSurface.makeImageSnapshot();
  colorSurface.dispose();

  // グレインなしの場合はそのまま JPEG エンコード
  if (adj.grain <= 0) {
    return colorImage.encodeToBase64(ImageFormat.JPEG, 92);
  }

  // Surface 2: グレインを Overlay ブレンドで重ねる
  const grainEffect = Skia.RuntimeEffect.Make(GRAIN_SHADER_SRC);
  if (!grainEffect) {
    return colorImage.encodeToBase64(ImageFormat.JPEG, 92);
  }

  const grainSurface = Skia.Surface.Make(w, h);
  if (!grainSurface) {
    return colorImage.encodeToBase64(ImageFormat.JPEG, 92);
  }

  const grainCanvas = grainSurface.getCanvas();
  grainCanvas.drawImage(colorImage, 0, 0);

  const grainPaint = Skia.Paint();
  // uniforms の順番はシェーダーの宣言順に合わせる: grainAmount, seed
  // seed は保存ごとにランダム化してフィルム風の多様なノイズパターンを生成する
  grainPaint.setShader(
    grainEffect.makeShader([adj.grain / 100, Math.random()])
  );
  grainPaint.setBlendMode(BlendMode.Overlay);
  // react-native-skia の SkRect は {x, y, width, height} オブジェクト
  grainCanvas.drawRect({ x: 0, y: 0, width: w, height: h }, grainPaint);

  const result = grainSurface
    .makeImageSnapshot()
    .encodeToBase64(ImageFormat.JPEG, 92);
  grainSurface.dispose();
  return result;
};
