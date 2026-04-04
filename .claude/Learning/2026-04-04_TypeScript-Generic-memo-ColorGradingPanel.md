# TypeScript Generic・memo と ColorGradingPanel 実装

**日付**: 2026-04-04
**会話の概要**: `AdjustmentSlider` を generic 化して複数の key 型に対応させ、`ColorGradingPanel.tsx` を新規実装した。途中でいくつかの TypeScript エラーを踏んで修正した。

---

## 今日学んだ概念

### TypeScript Generic（型引数）
- **何か**: 関数やコンポーネントが「どんな型でも受け取れる」ようにする仕組み。型を変数のように扱える
- **なぜ必要か**: `AdjustmentSlider` はもともと `AdjustmentKey`（`'brightness'` など）専用だったが、`ColorGradingPanel` では `'hue' | 'saturation' | 'luminance'` を渡したかった。Generic にすることで1つのコンポーネントを使い回せる
- **例え**: 「どんなサイズの荷物でも入る箱」。型が変わっても同じ形の箱（コンポーネント）を使える

### Generic のデフォルト型引数 `= SomeType`
- **何か**: Generic の型引数に省略時のデフォルトを指定できる書き方。例: `<K extends string = AdjustmentKey>`
- **なぜ必要か**: 呼び出し側が型を明示しなくても動くようにする便宜
- **注意**: `memo()` に渡す関数の中でデフォルト型引数を書くと TypeScript がエラーを出すことがある（後述）

### `memo()` と Generic の相性問題
- **何か**: React の `memo(fn)` は関数をラップするが、Generic 型引数の情報が失われやすい
- **なぜ問題か**: TypeScript が「この関数は実装ではなく型宣言だ」と解釈し、デフォルト型引数（`= AdjustmentKey`）を「初期化子」と見なしてエラーにする
- **解決策**: 関数を先に定義してから `memo()` に渡し、`as typeof` でキャスト

### アロー関数と名前付き関数の構文の違い
- **アロー関数**: `(引数) => { 処理 }` — `function` キーワードなし
- **名前付き関数式**: `function name(引数) { 処理 }` — `=>` なし
- **混在させるとエラー**: `function name(引数) => { 処理 }` は無効な構文

### JSX の prop にアロー関数を渡すときの括弧
- `onChange={(_k, v) => onChange(key, v)}` — 正しい書き方
- `onChange={(_k, v => onChange(key, v))}` — 誤り（`_k` が引数リストから切り離される）

---

## 書いたコード

### AdjustmentSlider の Generic 化

```tsx
// 型定義を Generic に変更
type AdjustmentSliderProps<K extends string = AdjustmentKey> = {
  adjustmentKey: K;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (key: K, nextValue: number) => void;
  disabled?: boolean;
};

// 関数を先に定義
function AdjustmentSliderBase<K extends string>({
  adjustmentKey,
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
}: AdjustmentSliderProps<K>) {
  // ... コンポーネント本体
}

// 後から memo でラップ。as typeof で Generic を保持
const AdjustmentSlider = memo(AdjustmentSliderBase) as typeof AdjustmentSliderBase;
```

**ポイント解説:**
- `K extends string`: K は string のサブタイプ（= 文字列リテラルの union など）に限定
- `memo(...) as typeof AdjustmentSliderBase`: `memo` の戻り値は Generic 情報を失うため、元の関数の型にキャストして復元する
- 関数を外に出してから `memo` に渡すのがポイント。`memo(function<K>(){})` と書くと構文エラーになる

---

### ColorGradingPanel の構造

```tsx
// ─── ToneRangeSelector ── シャドウ / ミッドトーン / ハイライト の切り替えチップ
const ToneRangeSelector = memo(function ToneRangeSelector({
  selected,
  onSelect,
}: ToneRangeSelectorProps) {
  return (
    <View style={styles.selectorRow}>
      {TONE_RANGES.map(range => (
        <Pressable
          key={range}
          style={[
            styles.selectorChip,
            selected === range ? styles.selectorChipSelected : null,
          ]}
          onPress={() => onSelect(range)}
          accessibilityRole='radio'
          accessibilityState={{ checked: selected === range }}
        >
          <Text ...>{TONE_LABELS[range]}</Text>
        </Pressable>
      ))}
    </View>
  );
});

// ─── ToneGradeSliders ── 色相 / 彩度 / 輝度 スライダー
const ToneGradeSliders = memo(function ToneGradeSliders({
  state,
  onChange,
}: ToneGradeSlidersProps) {
  return (
    <View style={styles.slidersContainer}>
      {(Object.keys(TONE_GRADE_RANGES) as (keyof ToneGradeState)[]).map(key => (
        <AdjustmentSlider
          key={key}
          adjustmentKey={key}
          label={TONE_GRADE_RANGES[key].label}
          value={state[key]}
          min={TONE_GRADE_RANGES[key].min}
          max={TONE_GRADE_RANGES[key].max}
          step={1}
          onChange={(_k, v) => onChange(key, v)}
        />
      ))}
    </View>
  );
});

// ─── ColorGradingPanel ── 本体。selectedRange を内部 state で管理
const ColorGradingPanel = memo(function ColorGradingPanel({
  colorGrading,
  onColorGradingChange,
}: ColorGradingPanelProps) {
  const [selectedRange, setSelectedRange] = useState<ToneRange>('shadows');

  function handleSliderChange(key: keyof ToneGradeState, value: number) {
    onColorGradingChange({
      ...colorGrading,
      [selectedRange]: {
        ...colorGrading[selectedRange],
        [key]: value,
      },
    });
  }

  return (
    <View style={styles.container}>
      <ToneRangeSelector selected={selectedRange} onSelect={setSelectedRange} />
      <ToneGradeSliders
        state={colorGrading[selectedRange]}
        onChange={handleSliderChange}
      />
    </View>
  );
});
```

**ポイント解説:**
- `selectedRange` は `ColorGradingPanel` の内部 state。Screen 側は「どのトーンを編集中か」を知る必要がないため、パネル内に閉じ込める
- `handleSliderChange` はスプレッド構文でイミュータブルに state を更新。`[selectedRange]` で動的なキーを指定
- `onChange={(_k, v) => onChange(key, v)}`: `AdjustmentSlider` のコールバックは `(key, value)` の2引数。`_k` は第1引数（未使用）で、`key` は外側の `.map(key => ...)` から受け取った値を使う
- `Object.keys(TONE_GRADE_RANGES) as (keyof ToneGradeState)[]`: `Object.keys` の戻り値は `string[]` なので、型アサーション（`as`）で `keyof ToneGradeState` に絞る

---

## なぜそう書くか（設計の理由）

- **`ToneRangeSelector` と `ToneGradeSliders` を分離した理由**: `memo` で再レンダリングを最小化するため。スライダーは重いコンポーネントなので、チップの選択状態が変わっても `ToneGradeSliders` は再レンダリングされない（`state` と `onChange` が変わらない限り）
- **`onColorGradingChange` で `ColorGradingState` 丸ごと返す理由**: Screen 側が「どのキーが変わったか」を気にせず、受け取った state をそのままセットできる。イミュータブルな更新パターンと相性が良い
- **`selectedRange` を Panel 内に閉じた理由**: Screen から見ると「グレーディングパネルを使って state を更新する」だけで十分。Panel 内部のナビゲーション（どのトーンを見ているか）は Screen の関心事ではない

---

## 次回への課題・疑問点

- [ ] Step 4-3: `ColorMixerPanel.tsx` の実装（8色チップ選択 + H/S/L スライダー）
- [ ] Step 5: `ImageProcessingScreen.tsx` へのタブバー・パネル統合
- [ ] `memo` + Generic のキャストパターン（`as typeof`）を他のコンポーネントでも使えるか確認
- [ ] `_k`（アンダースコアプレフィックス）の ESLint ルールとの関係を調べる
