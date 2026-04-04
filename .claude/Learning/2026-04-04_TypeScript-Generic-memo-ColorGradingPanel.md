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

- [x] Step 4-3: `ColorMixerPanel.tsx` の実装（8色チップ選択 + H/S/L スライダー）← 完了
- [ ] Step 5: `ImageProcessingScreen.tsx` へのタブバー・パネル統合
- [ ] `memo` + Generic のキャストパターン（`as typeof`）を他のコンポーネントでも使えるか確認
- [ ] `_k`（アンダースコアプレフィックス）の ESLint ルールとの関係を調べる

---

## 追記：ColorMixerPanel 実装・セルフレビュー・useCallback（2026-04-04）

**会話の概要**: `ColorMixerPanel.tsx` を新規実装し、3つのレビュアーによるセルフレビューを実施。指摘に基づいて修正を行い、`useCallback` の依存配列を誤った位置に書くという構文エラーも踏んで修正した。

---

## 今日学んだ概念（追記）

### `&&` vs `? null` ── React Native スタイル配列のルール

- **何か**: スタイル配列の中で条件付きスタイルを渡すとき、`&& styles.xxx` と書くか `? styles.xxx : null` と書くかの違い
- **なぜ必要か**: `condition && styles.xxx` は `condition` が `false` のとき `false` を配列に残す。React Native は `false` を無視するが、`0` や `""` のような falsy 値は `<View>` の子にレンダーしようとしてクラッシュする。ルールとして `? null` に統一しておくと安全
- **例え**: 「false は無視できるが、0 はテキストとして画面に出ようとする」。条件チェックで弾かないと予期しないものが表示される

```tsx
// NG（false が配列に残る）
style={[styles.chip, isSelected && styles.chipSelected]}

// OK（null は安全に無視される）
style={[styles.chip, isSelected ? styles.chipSelected : null]}
```

---

### `useCallback` ── 関数参照を安定させて `memo` を有効にする

- **何か**: `useCallback(fn, [deps])` は、依存配列の値が変わらない限り同じ関数参照を返すフック
- **なぜ必要か**: `memo` でラップされた子コンポーネントは「props が前回と同じ参照なら再レンダーをスキップ」する。しかし親が再レンダーされると、コンポーネント内の `function` 宣言は毎回新しいオブジェクトとして生成される。結果、`memo` が「props が変わった」と判断して子を再レンダーしてしまう
- **例え**: 毎回新しい封筒に同じ手紙を入れて届けると、受け取った人は「新しい手紙が来た」と思って読み直してしまう。`useCallback` は「同じ封筒を使い回す」仕組み

```tsx
// 修正前：レンダーごとに新しい関数が生成される
function handleSliderChange(key: keyof ToneGradeState, value: number) {
  onColorGradingChange({ ... });
}

// 修正後：依存配列の値が変わらない限り同じ参照を再利用
const handleSliderChange = useCallback(
  (key: keyof ToneGradeState, value: number) => {
    onColorGradingChange({
      ...colorGrading,
      [selectedRange]: {
        ...colorGrading[selectedRange],
        [key]: value,
      },
    });
  },
  [colorGrading, selectedRange, onColorGradingChange]
);
```

**依存配列のルール:**
- 関数の中で参照している外側の変数をすべて列挙する
- `colorGrading`・`selectedRange`・`onColorGradingChange` の3つが該当
- 依存配列に漏れがあると、古い値をクロージャで参照し続けるバグになる

---

## 踏んだ構文エラー：useCallback の依存配列を memo の外に書いてしまった

```tsx
// 誤り：memo の閉じ括弧の後に依存配列を書いてしまった
const ColorGradingPanel = memo(function ColorGradingPanel({ ... }) {
  const handleSliderChange = useCallback(
    (key, value) => { ... },
    [colorGrading, selectedRange, onColorGradingChange]
  );
  return ( ... );
},[colorGrading, selectedRange, onColorGradingChange]); // ← これが誤り
```

- **なぜ間違いか**: `memo(fn)` は第2引数として「props の比較関数」を受け取る。依存配列（`[...]`）を渡すと「配列を比較関数として使おうとしている」とTypeScriptに解釈され、型エラーになる
- **正しい位置**: `useCallback(fn, [deps])` の `[deps]` は `useCallback` の第2引数。`memo(...)` の外には何も書かない

```tsx
// 正しい構造
const ColorGradingPanel = memo(function ColorGradingPanel({ ... }) {
  const handleSliderChange = useCallback(
    (key, value) => { ... },
    [colorGrading, selectedRange, onColorGradingChange]  // ← useCallback の第2引数
  );
  return ( ... );
});  // ← memo の閉じ括弧はシンプルに });
```

---

## セルフレビューで学んだこと

### 3つのレビュアーを並列起動してまとめて確認する
- `reviewer`（品質・セキュリティ・パフォーマンス）
- `simplify-reviewer`（可読性・一貫性・保守性）
- `vercel-react-native-skills`（React Native ガイドライン照合）

### 全員一致の指摘は優先度最高
- 未使用インポート `import { Color } from '@shopify/react-native-skia'` は3人全員が指摘 → 即削除

### レビュアーの指摘をすべて受け入れない判断も重要
| 指摘 | 対応 | 理由 |
|---|---|---|
| デザイントークン化 | 非対応 | `tokens.ts` の存在未確認＆既存コンポーネントがリテラル使用で統一 |
| `onChange` インライン関数 | 非対応 | `ColorGradingPanel.tsx` と同パターン。1ファイルだけ変えると不一致 |
| `CHANNEL_BACKGROUND_COLORS` 事前計算 | 非対応 | 過剰最適化 |

### StyleSheet に切り出せるものは切り出す
選択テキストカラーのように「動的でない部分」はインラインオブジェクトではなく `StyleSheet` に定義することで：
- パフォーマンスが上がる（StyleSheet は最適化される）
- `ColorGradingPanel.tsx` の `selectorLabelSelected` と対称的な構造になる

---

## 次回への課題・疑問点（更新）

- [ ] Step 5: `ImageProcessingScreen.tsx` へのタブバー・パネル統合
- [ ] `useCallback` の依存配列に不足があるとどんなバグが起きるか体験してみたい
- [ ] `onChange` インライン関数の問題（`ColorGradingPanel` + `ColorMixerPanel` 両方）をまとめてリファクタリングするタスクを立てる
