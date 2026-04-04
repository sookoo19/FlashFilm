import {
  BlendMode,
  FilterMode,
  ImageFormat,
  MipmapMode,
  Skia,
  TileMode,
} from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';

import { COLOR_CHANNELS } from '../../types/imageProcessing';
import type {
  AdjustmentState,
  ColorGradingState,
  ColorMixerState,
} from '../../types/imageProcessing';

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

// カラーグレーディング（シャドウ/ミッドトーン/ハイライト）シェーダー
const COLOR_GRADING_SHADER_SRC = `
  uniform shader image;
  uniform float sh_h; uniform float sh_s; uniform float sh_l;
  uniform float mi_h; uniform float mi_s; uniform float mi_l;
  uniform float hi_h; uniform float hi_s; uniform float hi_l;

  float3 hue2rgb(float h) {
    h = mod(h, 360.0) / 60.0;
    return clamp(float3(
      abs(h - 3.0) - 1.0,
      2.0 - abs(h - 2.0),
      2.0 - abs(h - 4.0)
    ), 0.0, 1.0);
  }

  half4 main(float2 coord) {
    half4 c = image.eval(coord);
    float lum = dot(float3(c.rgb), float3(0.299, 0.587, 0.114));
    float sw = smoothstep(0.5, 0.0, lum);
    float hw = smoothstep(0.5, 1.0, lum);
    float mw = max(0.0, 1.0 - sw - hw);

    float3 rgb = float3(c.rgb);
    rgb = mix(rgb, mix(float3(lum), hue2rgb(sh_h)*0.5+0.25, sh_s/100.0), sw*(sh_s/100.0));
    rgb += (sh_l / 100.0) * sw;
    rgb = mix(rgb, mix(float3(lum), hue2rgb(mi_h)*0.5+0.25, mi_s/100.0), mw*(mi_s/100.0));
    rgb += (mi_l / 100.0) * mw;
    rgb = mix(rgb, mix(float3(lum), hue2rgb(hi_h)*0.5+0.25, hi_s/100.0), hw*(hi_s/100.0));
    rgb += (hi_l / 100.0) * hw;
    return half4(clamp(rgb, 0.0, 1.0), c.a);
  }
`;

// カラーミキサー（8色チャンネル × H/S/L）シェーダー
// ch_0〜ch_23: [red_h, red_s, red_l, orange_h, ...] の順
// SkSL では配列をループ添字で参照できないため8チャンネルを手動展開
const COLOR_MIXER_SHADER_SRC = `
  uniform shader image;
  uniform float ch_0;  uniform float ch_1;  uniform float ch_2;
  uniform float ch_3;  uniform float ch_4;  uniform float ch_5;
  uniform float ch_6;  uniform float ch_7;  uniform float ch_8;
  uniform float ch_9;  uniform float ch_10; uniform float ch_11;
  uniform float ch_12; uniform float ch_13; uniform float ch_14;
  uniform float ch_15; uniform float ch_16; uniform float ch_17;
  uniform float ch_18; uniform float ch_19; uniform float ch_20;
  uniform float ch_21; uniform float ch_22; uniform float ch_23;

  float3 rgb2hsl(float3 c) {
    float mx = max(c.r, max(c.g, c.b));
    float mn = min(c.r, min(c.g, c.b));
    float d  = mx - mn;
    float l  = (mx + mn) * 0.5;
    float s  = d < 0.0001 ? 0.0 : d / (1.0 - abs(2.0*l - 1.0));
    float h  = 0.0;
    if (d > 0.0001) {
      if (mx == c.r)      h = mod((c.g - c.b) / d, 6.0) * 60.0;
      else if (mx == c.g) h = ((c.b - c.r) / d + 2.0) * 60.0;
      else                h = ((c.r - c.g) / d + 4.0) * 60.0;
    }
    return float3(h, s, l);
  }

  float3 hsl2rgb(float3 hsl) {
    float h = hsl.x; float s = hsl.y; float l = hsl.z;
    float c = (1.0 - abs(2.0*l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h / 60.0, 2.0) - 1.0));
    float m = l - c * 0.5;
    float3 rgb;
    if      (h < 60.0)  rgb = float3(c, x, 0);
    else if (h < 120.0) rgb = float3(x, c, 0);
    else if (h < 180.0) rgb = float3(0, c, x);
    else if (h < 240.0) rgb = float3(0, x, c);
    else if (h < 300.0) rgb = float3(x, 0, c);
    else                rgb = float3(c, 0, x);
    return rgb + m;
  }

  float bell(float hueDiff) {
    float d = abs(mod(hueDiff + 180.0, 360.0) - 180.0);
    return max(0.0, 1.0 - d / 30.0);
  }

  half4 main(float2 coord) {
    half4 px  = image.eval(coord);
    float3 hsl = rgb2hsl(float3(px.rgb));
    float h = hsl.x;

    float dh = 0.0; float ds = 0.0; float dl = 0.0;
    float w0=bell(h-0.0);   dh+=w0*ch_0;  ds+=w0*ch_1;  dl+=w0*ch_2;
    float w1=bell(h-30.0);  dh+=w1*ch_3;  ds+=w1*ch_4;  dl+=w1*ch_5;
    float w2=bell(h-60.0);  dh+=w2*ch_6;  ds+=w2*ch_7;  dl+=w2*ch_8;
    float w3=bell(h-120.0); dh+=w3*ch_9;  ds+=w3*ch_10; dl+=w3*ch_11;
    float w4=bell(h-180.0); dh+=w4*ch_12; ds+=w4*ch_13; dl+=w4*ch_14;
    float w5=bell(h-210.0); dh+=w5*ch_15; ds+=w5*ch_16; dl+=w5*ch_17;
    float w6=bell(h-270.0); dh+=w6*ch_18; ds+=w6*ch_19; dl+=w6*ch_20;
    float w7=bell(h-300.0); dh+=w7*ch_21; ds+=w7*ch_22; dl+=w7*ch_23;

    float3 shifted = float3(
      mod(hsl.x + dh, 360.0),
      clamp(hsl.y + ds / 100.0, 0.0, 1.0),
      clamp(hsl.z + dl / 100.0, 0.0, 1.0)
    );
    return half4(hsl2rgb(shifted), px.a);
  }
`;

// グレインを重ねるための RuntimeShader ソース（クロスプラットフォーム）
const GRAIN_SHADER_SRC = `
  uniform float grainAmount;
  uniform float seed;
  uniform float2 resolution;

  half4 main(float2 coord) {
    float2 uv = coord / resolution;
    float n = fract(sin(dot(uv + seed, float2(127.1, 311.7))) * 43758.5453);
    float g = 0.5 + (n - 0.5) * grainAmount;
    return half4(g, g, g, 1.0);
  }
`;

// カラーグレーディング・カラーミキサー RuntimeEffectをモジュールスコープでコンパイル;
// プレビューと保存で同じ effect インスタンスを共有する
export const colorGradingEffect =
  Skia.RuntimeEffect.Make(COLOR_GRADING_SHADER_SRC) ?? null;
export const colorMixerEffect =
  Skia.RuntimeEffect.Make(COLOR_MIXER_SHADER_SRC) ?? null;

// SkImage に調整値を適用した JPEG base64 を返す（オフスクリーンレンダリング）
// Canvas コンポーネントに依存しないため保存時に利用する
// 適用順: カラーマトリクス → カラーグレーディング → カラーミキサー → グレイン
export const renderFilteredImageToBase64 = (
  skImage: SkImage,
  adj: AdjustmentState,
  colorGrading?: ColorGradingState,
  colorMixer?: ColorMixerState
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
  let currentImage = colorSurface.makeImageSnapshot();
  colorSurface.dispose();

  // Surface 2: カラーグレーディング（省略時はスキップ）
  if (colorGrading) {
    const { shadows: sh, midtones: mi, highlights: hi } = colorGrading;
    const gradEffect = Skia.RuntimeEffect.Make(COLOR_GRADING_SHADER_SRC);
    if (gradEffect) {
      const gradSurface = Skia.Surface.Make(w, h);
      if (gradSurface) {
        const imgShader = currentImage.makeShaderOptions(
          TileMode.Clamp,
          TileMode.Clamp,
          FilterMode.Linear,
          MipmapMode.None
        );
        const gradPaint = Skia.Paint();
        gradPaint.setShader(
          gradEffect.makeShaderWithChildren(
            [
              sh.hue,
              sh.saturation,
              sh.luminance,
              mi.hue,
              mi.saturation,
              mi.luminance,
              hi.hue,
              hi.saturation,
              hi.luminance,
            ],
            [imgShader]
          )
        );
        const gradCanvas = gradSurface.getCanvas();
        gradCanvas.drawRect({ x: 0, y: 0, width: w, height: h }, gradPaint);
        currentImage = gradSurface.makeImageSnapshot();
        gradSurface.dispose();
      }
    }
  }

  // Surface 3: カラーミキサー（省略時はスキップ）
  if (colorMixer) {
    const uniforms = COLOR_CHANNELS.flatMap(ch => [
      colorMixer[ch].hue,
      colorMixer[ch].saturation,
      colorMixer[ch].luminance,
    ]);
    const mixEffect = Skia.RuntimeEffect.Make(COLOR_MIXER_SHADER_SRC);
    if (mixEffect) {
      const mixSurface = Skia.Surface.Make(w, h);
      if (mixSurface) {
        const imgShader = currentImage.makeShaderOptions(
          TileMode.Clamp,
          TileMode.Clamp,
          FilterMode.Linear,
          MipmapMode.None
        );
        const mixPaint = Skia.Paint();
        mixPaint.setShader(
          mixEffect.makeShaderWithChildren(uniforms, [imgShader])
        );
        const mixCanvas = mixSurface.getCanvas();
        mixCanvas.drawRect({ x: 0, y: 0, width: w, height: h }, mixPaint);
        currentImage = mixSurface.makeImageSnapshot();
        mixSurface.dispose();
      }
    }
  }

  // グレインなしの場合はそのまま JPEG エンコード
  if (adj.grain <= 0) {
    return currentImage.encodeToBase64(ImageFormat.JPEG, 92);
  }

  // Surface 4: グレインを Overlay ブレンドで重ねる
  const grainEffect = Skia.RuntimeEffect.Make(GRAIN_SHADER_SRC);
  if (!grainEffect) {
    return currentImage.encodeToBase64(ImageFormat.JPEG, 92);
  }

  const grainSurface = Skia.Surface.Make(w, h);
  if (!grainSurface) {
    return currentImage.encodeToBase64(ImageFormat.JPEG, 92);
  }

  const grainCanvas = grainSurface.getCanvas();
  grainCanvas.drawImage(currentImage, 0, 0);

  const grainPaint = Skia.Paint();
  // uniforms の順番はシェーダーの宣言順に合わせる: grainAmount, seed, resolution(x, y)
  // grainAmount は 1.5乗カーブで人間の感覚に寄せる
  // seed は保存ごとにランダム化してフィルム風の多様なノイズパターンを生成する
  // resolution を渡すことでどの解像度でも同じ視覚的グレイン密度になる
  const grainAmount = Math.pow(adj.grain / 100, 1.5);
  grainPaint.setShader(
    grainEffect.makeShader([grainAmount, Math.random(), w, h])
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
