# React Native ベストプラクティス適用 & セルフレビューループ

**日付**: 2026-03-26
**会話の概要**: Vercel の React Native ガイドラインを参照して4ファイルの問題点を洗い出し、全修正を実施。その後 5 種類のレビュアーを並列起動するセルフレビューを 2 回まわし、指摘を自動修正した。

---

## 今日学んだ概念

### `React.memo` — 不要な再レンダーを防ぐ

- **何か**: コンポーネントを `memo(...)` でラップすると、props が変わらない限り再レンダーをスキップする高階コンポーネント
- **なぜ必要か**: リスト内の子コンポーネント（`AdjustmentSlider`、`PresetItem`）は親の state が変わるたびに再レンダーされる。memo がないと全スライダーが毎回再描画される
- **使い方**:
  ```tsx
  const AdjustmentSlider = memo(({ label, value, onChange }: Props) => {
    // ...
  });
  ```
- **注意点**: props に毎回新しいオブジェクト・関数が渡されると memo が効かない。`useCallback` や安定した参照と組み合わせて初めて意味がある

---

### モジュールスコープのアニメーションヘルパー

- **何か**: `Animated.spring(...)` などのヘルパー関数をコンポーネントの外（モジュールスコープ）に定義する
- **なぜ必要か**: コンポーネント内に書くとレンダーのたびに関数が再生成される。モジュールスコープなら一度だけ生成され、参照が安定する
- **例**:
  ```ts
  // モジュールスコープ（コンポーネントの外）
  const animatePressIn = (anim: Animated.Value) =>
    Animated.spring(anim, { toValue: 0.96, speed: 60, bounciness: 0, useNativeDriver: true }).start();

  // コンポーネント内
  <Pressable onPressIn={() => animatePressIn(myScale)} />
  ```
- **例え**: 毎回レシピを書き直すのではなく、手帳に一度書いたレシピを参照する感覚

---

### `useCallback` の依存配列と `ADJUSTMENT_RANGES`

- **何か**: `useCallback` の第2引数（依存配列）には、コールバック内で参照する変数を列挙する
- **今回のケース**: `ADJUSTMENT_RANGES` はモジュールスコープの定数なので値は変わらない。しかし ESLint の `react-hooks/exhaustive-deps` ルールは「使っている変数は全部書け」と警告する
- **判断**: `eslint-disable-line` コメントで黙らせるより、正直に依存配列に追加する方がコードの意図が明確
  ```tsx
  const handleChangeAdjustment = useCallback(
    (key: AdjustmentKey, nextValue: number) => {
      const { min, max } = ADJUSTMENT_RANGES[key]; // モジュール定数を参照
      // ...
    },
    [ADJUSTMENT_RANGES] // 変わらないが、参照していることを明示する
  );
  ```
- **モジュール定数を deps に入れても再生成されない理由**: React は deps を `Object.is` で比較する。モジュール定数は参照が変わらないので「変化なし」と判定される

---

### `useCallback` で `navigation` 依存

- **何か**: ナビゲーション関数を呼ぶだけのハンドラも、`useCallback` でラップして `navigation` を deps に入れるとよい
- **なぜ**: `navigation` オブジェクトが変わったとき（ネスト構造での再マウント等）にハンドラが古い参照を持ち続けるのを防ぐ
  ```tsx
  const handleRetake = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  ```

---

### `handleConfirm` のガード順序 — 早期 return は state 変更の前に

- **問題**: `setIsSaving(true)` → `try { if (!skImage) { Alert...; return; }` の構造だと、Alert を出して `return` しても `finally` が動いて `setIsSaving(false)` になる（動作は合っているが、意図が読みにくい）
- **修正**: state を変える前に全ガードを並べる
  ```tsx
  const handleConfirm = async () => {
    if (isSaving) return;
    if (hasAdjustmentChanged && !skImage) {   // ← state 変更の前にガード
      Alert.alert('処理中です', '...');
      return;
    }
    setIsSaving(true);                        // ← ここから先は確実に保存処理
    try { ... }
  };
  ```
- **原則**: 「早期リターンは副作用（setState）より前に置く」。コードの意図が上から順に読める

---

### `grainEffect !== null` — 明示的な null チェック

- **何か**: `grainEffect && (...)` は nullish/falsy チェック。`grainEffect !== null && (...)` は意図を明示した null チェック
- **なぜ prefer か**: `grainEffect` は `SkRuntimeEffect | null` 型。`grainEffect &&` は `0` や `""` でも false になるが、この型では実際には null か SkRuntimeEffect しかない。`!== null` で「null 以外なら使う」という意図が伝わる

---

### セルフレビューループの仕組み

- **やったこと**: 5 種類のレビュアーを並列で起動し、結果を受けて修正する 2 サイクルのループ
  ```
  /self-review → reviewer + simplify-reviewer + 3つのスキル型 → fix-review-comments → 修正
  ```
- **スキル型レビュアーの動き**: `.claude/skills/vercel-react-native-skills/AGENTS.md` などの大きなガイドラインファイルを読み込み、diff と照合して違反を報告する general-purpose エージェント
- **適用しなかった指摘の判断基準**:
  - hooks のルール違反になるもの（`pinchGesture` の `useMemo`）→ **スキップ**
  - ライブラリが未インストール（Reanimated、expo-image）→ **スキップ**
  - 大規模リファクタが必要（カスタム hooks 抽出）→ **スキップ**
  - 動作に影響しない LOW 優先度（`indicatorAnim` を deps から除去）→ **現状維持**

---

### `pinchGesture` に `useMemo` を使えない理由

- `useMemo` は React の hooks なので、コンポーネントのトップレベル（early return より前）に置かなければならない
- `CameraScreen` では `permission` のチェックによる早期 return がコンポーネントの途中にあり、その後に `pinchGesture` が定義されている
- この場所に `useMemo` を書くと「hooks は条件分岐より後に呼べない」というルール違反になる
- 解決するには early return を別コンポーネントに切り出すリファクタが必要

---

## 修正ファイルと変更一覧

| ファイル | 変更内容 |
|---|---|
| `AdjustmentSlider.tsx` | `memo` でラップ、`animatePressIn/Out` をモジュールスコープへ、`adjustmentKey` prop 追加 |
| `PresetSelector.tsx` | `PresetItem` + `PresetSelector` を `memo` でラップ、props を primitive に分解 |
| `CameraScreen.tsx` | キャプチャボタンの `animatePressIn/Out` をモジュールスコープへ、`zoomRef` を同期更新 |
| `ImageProcessingScreen.tsx` | `BOTTOM_CONTROLS_HEIGHT` をモジュールスコープへ、`animatePressIn/Out` をモジュールスコープへ、`canvasStyle` を `useMemo` 化、`handleRetake` を `useCallback` 化、`handleConfirm` のガード順修正、`grainEffect !== null` 明示 |
| `.claude/commands/self-review.md` | 3 つのスキル型レビュアー（vercel-react-native-skills 等）を追加 |
