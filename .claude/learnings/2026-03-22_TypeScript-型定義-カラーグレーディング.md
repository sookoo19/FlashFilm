# TypeScript 型定義 — カラーグレーディング & カラーミキサー

**日付**: 2026-03-22
**会話の概要**: FlashFilm の写真編集画面にカラーグレーディング（シャドウ/ミッドトーン/ハイライト別の色調整）とカラーミキサー（8色チャンネル別調整）を追加する実装の Step 1 として、`imageProcessing.ts` に TypeScript の型定義と初期値定数を追記した。

---

## 今日学んだ概念

### ユニオン型（Union Type）
- **何か**: 「この型は A か B か C のどれか」と複数の候補を `|` でつなぐ書き方
- **なぜ必要か**: 文字列をそのまま使うと typo しても気づけない。型で候補を絞ることで、間違った値を書いたときにエラーが出る
- **例え**: メニューの選択肢を「好きなものを文字で書いて」から「チェックボックスで選ばせる」に変えるイメージ

```typescript
// 悪い例: どんな文字列でも渡せてしまう
type ToneRange = string;

// 良い例: 3択しか通らない
type ToneRange = 'shadows' | 'midtones' | 'highlights';
```

---

### Record<K, V> 型
- **何か**: キーの型 `K` と値の型 `V` を指定してオブジェクト型を作る TypeScript のユーティリティ型
- **なぜ必要か**: 「このオブジェクトは必ず全キーを持つ」を型で保証できる。キーが増えたとき、値を書き忘れるとエラーが出る
- **例え**: 「全スタッフ（K）それぞれに出欠（V）を記入するシート」— 一人でも空欄があるとエラーになる

```typescript
// ToneRange の全キーに ToneGradeState が必ず存在することを保証
type ColorGradingState = Record<ToneRange, ToneGradeState>;

// つまりこれと同じ意味:
type ColorGradingState = {
  shadows:    ToneGradeState;
  midtones:   ToneGradeState;
  highlights: ToneGradeState;
};
```

---

### `as const`（const アサーション）
- **何か**: オブジェクトや配列を「変更不可の完全に固定された値」として TypeScript に認識させる書き方
- **なぜ必要か**: 通常、`{ min: 0, max: 360 }` は `min: number` 型になる。`as const` をつけると `min: 0`（リテラル型）になり、より厳密になる。また `readonly` になるので誤って書き換えることも防げる
- **例え**: 「メモに書いた設定値」→「石に刻んだ設定値」に変えるイメージ

```typescript
export const TONE_GRADE_RANGES = {
  hue:        { label: '色相', min: 0,    max: 360 },
  saturation: { label: '彩度', min: 0,    max: 100 },
  luminance:  { label: '輝度', min: -100, max: 100 },
} as const;
// as const がないと min/max は number 型
// as const があると min は 0, -100 などのリテラル型になる
```

---

### `Object.fromEntries()` と型アサーション
- **何か**: `[key, value]` のペア配列からオブジェクトを作る JavaScript のメソッド。型アサーション（`as ColorMixerState`）で TypeScript に「この型として扱って」と伝える
- **なぜ必要か**: 8チャンネル分の初期値オブジェクトを手動で書くと長くなる。`map()` で自動生成できる
- **例え**: 「8人分の出席シートを手書きで作る」→「名簿リストをコピーして一括作成する」

```typescript
export const DEFAULT_COLOR_MIXER: ColorMixerState = Object.fromEntries(
  COLOR_CHANNELS.map(c => [c, { ...DEFAULT_CHANNEL_MIX }])
) as ColorMixerState;

// やっていること:
// 1. COLOR_CHANNELS = ['red', 'orange', ...] を map で回す
// 2. 各要素を ['red', { hue:0, saturation:0, luminance:0 }] というペアにする
// 3. Object.fromEntries でそのペア配列をオブジェクトに変換する
// 4. TypeScript は型推論が難しいので as ColorMixerState で型を教える
```

---

### スプレッド構文 `{ ...obj }` によるシャローコピー
- **何か**: オブジェクトの中身を展開して新しいオブジェクトを作る書き方
- **なぜ必要か**: `DEFAULT_TONE_GRADE` をそのまま3箇所に代入すると、同じオブジェクトを参照してしまい、一方を変えると全部変わる（参照の罠）。コピーすることで独立した状態を保てる

```typescript
export const DEFAULT_COLOR_GRADING: ColorGradingState = {
  shadows:    { ...DEFAULT_TONE_GRADE },  // コピーを作る
  midtones:   { ...DEFAULT_TONE_GRADE },  // コピーを作る
  highlights: { ...DEFAULT_TONE_GRADE },  // コピーを作る
};
// { ...DEFAULT_TONE_GRADE } がないと、
// 3つが同じオブジェクトを指してしまい、
// shadows.hue を変えると midtones.hue も変わってしまう
```

---

## 書いたコード

### カラーグレーディング型定義

```typescript
// ─── Color Grading ───────────────────────────────────────────────────────────
export type ToneRange = 'shadows' | 'midtones' | 'highlights';
export type ToneGradeState = { hue: number; saturation: number; luminance: number };
export type ColorGradingState = Record<ToneRange, ToneGradeState>;

export const DEFAULT_TONE_GRADE: ToneGradeState = { hue: 0, saturation: 0, luminance: 0 };
export const DEFAULT_COLOR_GRADING: ColorGradingState = {
  shadows:    { ...DEFAULT_TONE_GRADE },
  midtones:   { ...DEFAULT_TONE_GRADE },
  highlights: { ...DEFAULT_TONE_GRADE },
};
export const TONE_GRADE_RANGES = {
  hue:        { label: '色相', min: 0,    max: 360 },
  saturation: { label: '彩度', min: 0,    max: 100 },
  luminance:  { label: '輝度', min: -100, max: 100 },
} as const;
```

**ポイント解説:**
- `ToneGradeState`: 1つのトーン帯域（例: シャドウ）が持つ H/S/L の3値をまとめた型
- `ColorGradingState`: `Record` でシャドウ・ミッドトーン・ハイライトの3つ全てに `ToneGradeState` を強制
- `TONE_GRADE_RANGES`: `hue` だけ `0〜360`（色相環）、他は `0〜100` と範囲が異なることに注意

---

### カラーミキサー型定義

```typescript
// ─── Color Mixer ─────────────────────────────────────────────────────────────
export type ColorChannel = 'red' | 'orange' | 'yellow' | 'green' | 'aqua' | 'blue' | 'purple' | 'magenta';
export type ChannelMixState = { hue: number; saturation: number; luminance: number };
export type ColorMixerState = Record<ColorChannel, ChannelMixState>;

export const DEFAULT_CHANNEL_MIX: ChannelMixState = { hue: 0, saturation: 0, luminance: 0 };
export const COLOR_CHANNELS: readonly ColorChannel[] = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'];
export const COLOR_CHANNEL_LABELS: Record<ColorChannel, string> = {
  red:     'レッド',
  orange:  'オレンジ',
  yellow:  'イエロー',
  green:   'グリーン',
  aqua:    'アクア',
  blue:    'ブルー',
  purple:  'パープル',
  magenta: 'マゼンタ',
};
export const DEFAULT_COLOR_MIXER: ColorMixerState = Object.fromEntries(
  COLOR_CHANNELS.map(c => [c, { ...DEFAULT_CHANNEL_MIX }])
) as ColorMixerState;
export const MIX_RANGES = {
  hue:        { label: '色相', min: -100, max: 100 },
  saturation: { label: '彩度', min: -100, max: 100 },
  luminance:  { label: '輝度', min: -100, max: 100 },
} as const;
```

**ポイント解説:**
- `readonly ColorChannel[]`: この配列自体を書き換えられないようにする（`push` などが型エラーになる）
- `COLOR_CHANNEL_LABELS`: UI のチップや見出しに表示する日本語ラベル。`Record` で全8色の記載漏れを防ぐ
- `MIX_RANGES`: グレーディングと違い、ミキサーは hue も `-100〜100`（色相のシフト量）

---

## なぜそう書くか（設計の理由）

- **型を先に作る理由**: シェーダー（GPU コード）・UI コンポーネント・保存データ（レシピJSON）の3箇所でこのデータ構造を共有する。型を一箇所で定義しておくと、どこかで形が変わったときにコンパイルエラーで全箇所まとめて気づける

- **`DEFAULT_*` 定数を用意する理由**: リセットボタン実装・初期 state 生成・`spread` によるコピー元として使い回せる。毎回 `{ hue: 0, saturation: 0, luminance: 0 }` と書くよりミスが少ない

- **グレーディングとミキサーで別の型にする理由**: 見た目は似ているが意味が違う（トーン帯域 vs 色チャンネル）。同じ型を流用すると、後でどちらか一方の仕様が変わったときに影響範囲が広がる

---

## 次回への課題・疑問点

- [ ] Step 2: `aiEditRecipe.ts` に `colorGrading` と `colorMixer` フィールドを追加する
- [ ] Step 3: `skiaFilter.ts` にカラーグレーディング用・ミキサー用の GLSL シェーダーを実装する
- [ ] `Object.fromEntries()` の型推論がなぜ難しいのか、もう少し深掘りしたい（なぜ `as ColorMixerState` が必要なのか）
- [ ] `as const` のリテラル型が実際にどこで役立つか、スライダーの min/max を使う実装を通して確認したい
