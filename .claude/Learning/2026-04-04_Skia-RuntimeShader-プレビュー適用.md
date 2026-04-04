# Skia RuntimeShader をプレビューに適用する

**日付**: 2026-04-04  
**会話の概要**: ColorGrading・ColorMixer のシェーダーがオフスクリーン保存には適用済みだったが、リアルタイムプレビューの Canvas には未適用だった。`<Group layer={paint}>` + `Skia.ImageFilter.MakeRuntimeShader` を使って Canvas 上でもシェーダーを適用する方法を学んだ。

---

## 今日学んだ概念

### ImageFilter（イメージフィルター）
- **何か**: 描画済みのピクセルに後から処理をかける仕組み
- **なぜ必要か**: シェーダーは「色を塗る」ためのものだが、ImageFilter は「すでに描かれた絵に加工する」ためのもの。ColorGrading のように「画像を受け取って加工して返す」処理は ImageFilter として使う
- **例え**: 写真をプリントした後に「現像フィルター」をかけるイメージ。描画→加工の順番が保たれる

### `<Group layer={paint}>` パターン
- **何か**: React Native Skia の `<Group>` に `layer` prop でペイントを渡すと、group 内の子要素を一度オフスクリーンに描画してから、そのペイントを通して合成する
- **なぜ必要か**: 子要素全体にまとめてフィルターをかけたい場合に使う。個々の要素に `<Paint>` をつける必要がなくなる
- **例え**: トレーシングペーパーに子要素を全部描いてから、そのシートごと「色補正フィルター越し」に貼り付けるイメージ

### `SkRuntimeShaderBuilder`
- **何か**: RuntimeEffect（コンパイル済みシェーダー）に uniform 変数を注入するための「組み立て台」
- **なぜ必要か**: ImageFilter として使う場合、`makeShaderWithChildren` ではなく builder 経由で uniforms をセットし、`ImageFilter.MakeRuntimeShader` に渡す必要がある
- **例え**: シェーダーが「料理レシピ」で、builder は「材料（uniform）を揃えて調理台に並べる作業」。`MakeRuntimeShader` が「調理開始」にあたる

### `Shader` と `RuntimeShader` の使い分け
| | `<Shader>` | `<Group layer={paint}>` + RuntimeShader |
|---|---|---|
| 用途 | 形（Rect, Circle など）を塗る | 描画済みピクセルに後処理をかける |
| 入力 | なし（座標から色を生成） | 子要素の描画結果（`uniform shader image`） |
| 使用例 | grain ノイズオーバーレイ | ColorGrading、ColorMixer |

---

## 書いたコード

### skiaFilter.ts — effect をモジュールスコープでエクスポート

```typescript
// ファイル末尾に追加
export const colorGradingEffect =
  Skia.RuntimeEffect.Make(COLOR_GRADING_SHADER_SRC) ?? null;
export const colorMixerEffect =
  Skia.RuntimeEffect.Make(COLOR_MIXER_SHADER_SRC) ?? null;
```

**ポイント解説:**
- モジュールスコープに置くことで、アプリ起動時に1回だけコンパイルされる。レンダーのたびにコンパイルすると重いのでここに置く
- `?? null` は「コンパイル失敗時は null にする」安全策。失敗しても画面がクラッシュしない

---

### ImageProcessingScreen.tsx — colorGradingPaint の useMemo

```typescript
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
```

**ポイント解説:**
- `Skia.RuntimeShaderBuilder(effect)` — effect を受け取り、uniform をセットできる builder を作る
- `builder.setUniform('sh_h', [sh.hue])` — 第2引数が配列なのは、SkSL の float 型も `number[]` で渡す仕様のため
- `Skia.ImageFilter.MakeRuntimeShader(builder, 'image', null)` の引数:
  - 第1引数: uniforms がセットされた builder
  - 第2引数: `'image'` — シェーダー内の `uniform shader image` の変数名と一致させる
  - 第3引数: `null` — 「この Group の子要素の描画結果を image として渡す」という意味
- `return undefined` にすることで `<Group layer={undefined}>` = フィルターなしとして安全に fallback できる

---

### ImageProcessingScreen.tsx — colorMixerPaint の useMemo

```typescript
const colorMixerPaint = useMemo(() => {
  if (!colorMixerEffect) return undefined;
  const builder = Skia.RuntimeShaderBuilder(colorMixerEffect);
  COLOR_CHANNELS.forEach((ch, i) => {
    builder.setUniform(`ch_${i * 3}`,     [colorMixer[ch].hue]);
    builder.setUniform(`ch_${i * 3 + 1}`, [colorMixer[ch].saturation]);
    builder.setUniform(`ch_${i * 3 + 2}`, [colorMixer[ch].luminance]);
  });
  const paint = Skia.Paint();
  paint.setImageFilter(
    Skia.ImageFilter.MakeRuntimeShader(builder, 'image', null)
  );
  return paint;
}, [colorMixer]);
```

**ポイント解説:**
- ColorMixer のシェーダーは `ch_0`〜`ch_23` の 24 個の uniform を持つ。`COLOR_CHANNELS.forEach` でループして `ch_${i * 3}` 形式の名前を動的に組み立てている
- `i * 3` の理由: 各チャンネルが hue / saturation / luminance の3つを持つため、インデックスが 0, 3, 6, 9… と3ずつ増える

---

### Canvas JSX — Group でラップ

```tsx
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

{/* グレインは Groups の外側で Overlay ブレンド */}
{adjustments.grain > 0 && grainEffect !== null && (
  <Rect ... blendMode='overlay'>
    <Shader source={grainEffect} uniforms={grainUniforms} />
  </Rect>
)}
```

**ポイント解説:**
- **内側から外側へ**: SkiaImage（ColorMatrix）→ colorGrading → colorMixer の順で適用される。ネストが深いほど先に処理される
- **grain はグループ外**: grain は最後に Overlay ブレンドで重ねる仕様。colorGrading/colorMixer の後に乗せるためグループ外に置く
- この適用順は `renderFilteredImageToBase64`（保存パス）と一致させることが重要。プレビューと保存結果がズレないようにするため

---

## なぜそう書くか（設計の理由）

- **なぜ `<RuntimeShader>` コンポーネントではなく `Group layer` を使ったか**:  
  `imageFilters/RuntimeShader.tsx` は存在するが、ドキュメントが少なく JSX での子要素との連携が不明瞭だった。一方 `Group layer + Skia.ImageFilter.MakeRuntimeShader` は型定義から API が明確に読み取れた。型定義を読んで設計判断するのも重要なスキル。

- **なぜ effect をモジュールスコープに置いてエクスポートするか**:  
  `Skia.RuntimeEffect.Make` はシェーダーコードのコンパイルを行う重い処理。コンポーネント内や `useMemo` 内に置くとレンダーや再マウント時に再実行されてしまう。モジュールスコープに置けばアプリ起動時の1回だけになる。

- **なぜ `useMemo` の依存配列を `[colorGrading]` / `[colorMixer]` にするか**:  
  これらの state が変わった時だけ `SkPaint` を再生成すればよく、他の state（brightness など）が変わっても無駄に再生成しない。パフォーマンスの最適化。

---

---

## `skiaFilter.ts` の内部構造

このファイルは「画像フィルター処理の全責任を担うサービス層」。プレビュー用の effect エクスポートと、保存用のオフスクリーンレンダリング関数の2つを提供する。

### ファイル全体の構成

```
skiaFilter.ts
│
├── [ユーティリティ]
│   └── clamp() — 数値を min〜max に丸める共通処理
│
├── [ColorMatrix 生成レイヤー]（基本調整用）
│   ├── mulMatrix()         — 4×5 行列の積を計算
│   ├── brightnessMatrix()  — 露出（EV）変換行列
│   ├── contrastMatrix()    — コントラスト変換行列
│   ├── saturationMatrix()  — 彩度変換行列
│   ├── temperatureTintMatrix() — 色温度・色かぶり変換行列
│   └── buildColorMatrix()  ★export — 上4つを合成した最終行列を返す
│
├── [シェーダーソース文字列]（SkSL で書いた GPU プログラム）
│   ├── COLOR_GRADING_SHADER_SRC — shadows/midtones/highlights グレーディング
│   ├── COLOR_MIXER_SHADER_SRC  — 8色チャンネル HSL シフト
│   └── GRAIN_SHADER_SRC        — フィルムグレイン（保存用・高品位版）
│
├── [モジュールスコープ effect]（起動時1回だけコンパイル）
│   ├── colorGradingEffect  ★export
│   └── colorMixerEffect    ★export
│
└── [オフスクリーンレンダリング]
    └── renderFilteredImageToBase64()  ★export — 保存時に呼ぶ
```

---

### ColorMatrix レイヤーの仕組み

ColorMatrix は 4行×5列（= 20要素）の行列で、RGBA の各チャンネルを線形変換する。

```
[ R' ]   [ r1 r2 r3 r4 | r5 ]   [ R ]
[ G' ] = [ g1 g2 g3 g4 | g5 ] × [ G ]
[ B' ]   [ b1 b2 b3 b4 | b5 ]   [ B ]
[ A' ]   [ a1 a2 a3 a4 | a5 ]   [ A ]
                                  [ 1 ]   ← bias 列（定数加算）
```

- 最後の列（index 4, 9, 14, 19）が **bias**（定数加算）。コントラストで「0.5 グレーを中心にスケール」するときに使う
- `mulMatrix(a, b)` で複数の行列を掛け合わせることで、brightness → contrast → saturation → temperature+tint を1回の行列演算で済ませる

**なぜ行列を合成するか**: 行列を4枚重ねて計算するより、事前に1枚に合成しておく方が GPU の処理が速い。

---

### COLOR_GRADING_SHADER_SRC の処理フロー

```glsl
half4 main(float2 coord) {
  half4 c = image.eval(coord);           // 1. 入力ピクセルを取得
  float lum = dot(...);                  // 2. 輝度を計算（0〜1）

  float sw = smoothstep(0.5, 0.0, lum); // 3. シャドウ重み（暗いほど1に近い）
  float hw = smoothstep(0.5, 1.0, lum); // 4. ハイライト重み（明るいほど1に近い）
  float mw = max(0.0, 1.0 - sw - hw);   // 5. ミッドトーン重み（残り）

  // 6. 各トーンレンジに hue/saturation/luminance を適用
  rgb = mix(rgb, hue2rgb(sh_h) * 0.5 + 0.25, sw * (sh_s / 100.0));
  rgb += (sh_l / 100.0) * sw;
  // midtones, highlights も同様...
}
```

- `smoothstep(0.5, 0.0, lum)` — lum が 0.5→0.0 に近づくほど 0→1 を返す。つまり暗いピクセルほど「シャドウ」として扱う
- `sw + hw + mw ≈ 1.0` になるよう設計されており、3つのレンジが重なって自然なグラデーションになる

---

### COLOR_MIXER_SHADER_SRC の処理フロー

```glsl
half4 main(float2 coord) {
  float3 hsl = rgb2hsl(px.rgb);  // 1. RGB → HSL 変換
  float h = hsl.x;               // 2. 色相（0〜360度）を取り出す

  // 3. 各色チャンネルの「影響度（ベル重み）」を計算して累積
  float dh = 0.0; float ds = 0.0; float dl = 0.0;
  float w0 = bell(h - 0.0);    // Red (0°) との近さ
  dh += w0 * ch_0;  ds += w0 * ch_1;  dl += w0 * ch_2;
  // ... 8チャンネル分

  // 4. 累積した差分で HSL をシフトして RGB に戻す
  return half4(hsl2rgb(shifted), px.a);
}
```

- `bell(hueDiff)` — 色相の距離が 30° 以内なら影響あり、離れるほど 0 に近づく「釣り鐘型の重み関数」
- **なぜ `ch_0`〜`ch_23` を手動展開しているか**: SkSL（Skia のシェーダー言語）では配列を動的インデックスで参照できないため、`ch_0`, `ch_3`, `ch_6`... と個別の uniform 変数に展開している

---

### renderFilteredImageToBase64 の Surface チェーン

保存時の処理は「Surface を4枚バケツリレーする」パターン。

```
skImage
  │
  ▼ Surface 1（ColorMatrix）
  colorCanvas.drawImage(skImage, 0, 0, colorPaint)
  currentImage = colorSurface.makeImageSnapshot()
  colorSurface.dispose()  ← 使い終わったら即解放
  │
  ▼ Surface 2（ColorGrading）※変更がある場合のみ
  imgShader = currentImage.makeShaderOptions(...)
  gradPaint.setShader(gradEffect.makeShaderWithChildren([uniforms], [imgShader]))
  gradCanvas.drawRect(...)
  currentImage = gradSurface.makeImageSnapshot()
  │
  ▼ Surface 3（ColorMixer）※変更がある場合のみ
  （同様のパターン）
  │
  ▼ Surface 4（Grain Overlay）※grain > 0 の場合のみ
  grainCanvas.drawImage(currentImage, 0, 0)  ← 下地を描く
  grainPaint.setBlendMode(BlendMode.Overlay)  ← Overlay ブレンドで乗せる
  grainCanvas.drawRect(...)
  │
  ▼ encodeToBase64(JPEG, 92)  → 文字列を返す
```

**重要なポイント:**
- `dispose()` を毎 Surface 後に呼ぶ理由: Skia の Surface はネイティブメモリを持つ。解放しないとメモリリークになる
- `makeShaderWithChildren([uniforms], [imgShader])` の構造:
  - 第1引数: flat な数値配列（uniform の値を順番に並べる）
  - 第2引数: 子シェーダーの配列（`uniform shader image` に対応）
- プレビューの `Group layer` とは異なり、ここでは `gradEffect.makeShaderWithChildren` を使っている。どちらも同じシェーダーソースを使うが、呼び出し方（API）が違う

---

## 次回への課題・疑問点

- [ ] 実機で動かして ColorGrading / ColorMixer のプレビュー反映を目視確認する
- [ ] `<Group layer={undefined}>` のとき Skia はどう振る舞うか？（フィルターなし = 素通りか確認）
- [ ] `Skia.ImageFilter.MakeRuntimeShader` の第3引数に `null` 以外（前段の ImageFilter）を渡す使い方を調べる（複数フィルターをチェーンする別パターン）
- [ ] 現在のプレビューは grain シェーダーが簡易版（resolution uniform なし）、保存は高品位版。将来的に統一するか検討
