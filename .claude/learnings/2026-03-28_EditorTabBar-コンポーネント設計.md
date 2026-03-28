# EditorTabBar コンポーネント設計

**日付**: 2026-03-28
**会話の概要**: カラーグレーディング & ミキサー機能のStep 4として、`EditorTabBar.tsx` を新規作成した。`PresetSelector.tsx` の構造を参考にしながら、タブ切り替えコンポーネントを設計した。

---

## 今日学んだ概念

### `memo` による再レンダー抑制
- **何か**: `React.memo` でラップされたコンポーネントは、propsが変化しなければ再レンダーをスキップする高階コンポーネント（HOC）
- **なぜ必要か**: タブバーは親の画面が状態更新するたびに巻き込まれて描画しなおされる。`memo` を使うことで不要な描画を防ぎパフォーマンスを守る
- **例え**: 黒板に書いた内容が変わっていないのに消して書き直す手間を省く感覚

### `useState(() => new Animated.Value(...))` のイニシャライザ書法
- **何か**: `useState` の初期値に関数を渡すと、その関数はマウント時に一度だけ実行される（遅延初期化）
- **なぜ必要か**: `new Animated.Value(...)` をレンダー式に直接書くと、レンダーのたびに新しいインスタンスが生成されてしまい、アニメーションが壊れる
- **例え**: 工場の機械（Animated.Value）は最初に一台だけ作ればよい。毎回ラインを止めて新しい機械を作るのは非効率

### `Animated.spring` によるアンダーライン表示
- **何か**: バネ物理モデルで値を 0 ↔ 1 の間でアニメーションさせる
- **なぜ必要か**: `timing` はリニアな動きで機械的に見えるが、`spring` はバネのように自然に減衰する動きになり、UI に生き生きとした印象を与える
- **例え**: 鉄の棒（timing）と輪ゴム（spring）の伸び縮みの違い

### `Record<K, V>` 型での定数マッピング
- **何か**: TypeScript の `Record<KeyType, ValueType>` は、キーと値の型を厳密に指定したオブジェクト型
- **なぜ必要か**: `TAB_LABELS` を `Record<EditorTab, string>` にすることで、`EditorTab` の全タブに対してラベルが定義されているかどうかをコンパイル時にチェックできる。タブを追加し忘れたときにエラーで気づける
- **例え**: 全員分の席次表（Record）を作ると、誰かが抜けていたら一目でわかる

### 型のエクスポート戦略
- **何か**: `EditorTab` 型を `EditorTabBar.tsx` の中で定義し、`export type EditorTab = ...` でエクスポートする
- **なぜ必要か**: タブの型は「タブバーコンポーネントが所有するもの」なので、そのファイルからエクスポートするのが自然。Screen 側では `import type { EditorTab } from '../components/EditorTabBar'` と書いて参照する
- **例え**: メニュー表（型定義）はレストラン（コンポーネント）が持っていて、客（Screen）はそれを借りて注文する

---

## 書いたコード

### EditorTabBar.tsx（全体）

```tsx
import { memo, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

export type EditorTab = 'basic' | 'grading' | 'mixer';

type TabItemProps = {
  tab: EditorTab;
  label: string;
  isSelected: boolean;
  onSelect: (tab: EditorTab) => void;
  disabled: boolean;
};

const TAB_LABELS: Record<EditorTab, string> = {
  basic: '基本',
  grading: 'グレーディング',
  mixer: 'ミキサー',
};

const TabItem = memo(({ tab, label, isSelected, onSelect, disabled }: TabItemProps) => {
  const [indicatorAnim] = useState(() => new Animated.Value(isSelected ? 1 : 0));

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: isSelected ? 1 : 0,
      speed: 22,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  }, [isSelected, indicatorAnim]);

  return (
    <Pressable
      style={[styles.tabButton, isSelected && styles.tabButtonSelected, disabled && styles.disabled]}
      onPress={() => onSelect(tab)}
      disabled={disabled}
      accessibilityRole='tab'
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={[styles.tabLabel, isSelected && styles.tabLabelSelected]}>{label}</Text>
      <Animated.View
        style={[styles.indicator, { opacity: indicatorAnim, transform: [{ scaleX: indicatorAnim }] }]}
      />
    </Pressable>
  );
});

type EditorTabBarProps = {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  disabled?: boolean;
};

const EditorTabBar = memo(({ activeTab, onTabChange, disabled = false }: EditorTabBarProps) => (
  <View style={styles.container}>
    {(Object.keys(TAB_LABELS) as EditorTab[]).map(tab => (
      <TabItem
        key={tab}
        tab={tab}
        label={TAB_LABELS[tab]}
        isSelected={tab === activeTab}
        onSelect={onTabChange}
        disabled={disabled}
      />
    ))}
  </View>
));

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3a',
    backgroundColor: '#1b1b1b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonSelected: {
    borderColor: '#f0f0f0',
    backgroundColor: '#2a2a2a',
  },
  tabLabel: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '500',
  },
  tabLabelSelected: {
    color: '#f0f0f0',
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    borderRadius: 2,
    backgroundColor: '#f0f0f0',
  },
  disabled: {
    opacity: 0.6,
  },
});

export default EditorTabBar;
```

**ポイント解説:**

- `(Object.keys(TAB_LABELS) as EditorTab[])`: `Object.keys` は `string[]` を返すため、`EditorTab[]` に型アサーションが必要。`TAB_LABELS` が `Record<EditorTab, string>` なのでキーは必ず `EditorTab` のいずれかであることが保証されている
- `opacity: indicatorAnim, transform: [{ scaleX: indicatorAnim }]`: 0→1 のアニメーションで「透明になりながら横に縮む」効果を同時に実現。1つの `Animated.Value` を2つのスタイルに使いまわしている
- `bounciness: 0`: バネのバウンスをゼロにすることでオーバーシュートなしのスムーズなスライドになる（ `bounciness > 0` だとぴょんと飛び出す）
- `accessibilityRole='tab'` / `accessibilityState={{ selected: isSelected }}`: スクリーンリーダーがタブとして認識できるよう明示。「選択中」の状態も伝わる

---

## なぜそう書くか（設計の理由）

- **`PresetSelector.tsx` をベースに作成**: 既存パターンを踏襲することでコードベース全体の一貫性を保てる。新しい概念を持ち込まず、読者（チームや将来の自分）が理解しやすい
- **`fontSize: 13`（PresetSelectorの15より小さく）**: タブ名「グレーディング」が6文字と長いため、幅が小さいボタンでも収まるように調整
- **`TAB_LABELS` を分離**: タブの表示名をコンポーネントロジックと分けることで、ラベルの多言語化や変更が1か所でできる
- **`TabItem` を別コンポーネントに分離**: 各タブが自分のアニメーション状態（`indicatorAnim`）を持てるようにするため。一つのコンポーネントで全タブを管理しようとすると、アニメーション状態の配列管理が複雑になる

---

## 次回への課題・疑問点

- [ ] `ColorGradingPanel.tsx` の作成：シャドウ/ミッドトーン/ハイライトの3セクション + `AdjustmentSlider` 再利用
- [ ] `ColorMixerPanel.tsx` の作成：8色チップ選択 + H/S/L スライダー
- [ ] `AdjustmentSlider` の `onChange` の型が `(key: AdjustmentKey, value: number) => void` になっているが、`ColorGradingPanel` では別の型になる。どう対応するか確認する
- [ ] Step 5 で `ImageProcessingScreen.tsx` に統合するとき、既存の `PresetSelector` との縦方向の並び順をどう調整するか

---

## 追記：セルフレビューで学んだこと（2026-03-28）

**会話の概要**: `EditorTabBar.tsx` を 5 つのレビュアー（reviewer, simplify-reviewer, vercel-react-native-skills, vercel-composition-patterns, vercel-react-best-practices）でセルフレビューし、4 箇所を修正した。

---

### `&&` より三項演算子を使う理由（React Native CRITICAL ルール）

- **何か**: スタイル配列の中で `condition && styles.xxx` と書くと、`condition` が `false` のとき `false` がそのまま配列に入る
- **なぜ問題か**: React Native はスタイル配列に `false` が入っても無視してくれるが、数値（`0`）や空文字（`""`）は falsy でありながらテキストとして描画しようとしてクラッシュする。また明示性が低い
- **正しい書き方**:
  ```tsx
  // NG
  style={[styles.base, isSelected && styles.selected]}

  // OK
  style={[styles.base, isSelected ? styles.selected : null]}
  ```

### `useEffect` の依存配列は必要最小限に

- **何か**: `useEffect` の第2引数（依存配列）に書いた値が変わるたびに effect が再実行される
- **なぜ `indicatorAnim` を除外したか**: `indicatorAnim` は `useState(() => new Animated.Value(...))` で一度だけ作られ、以降は同じオブジェクト参照を保ち続ける。「変化しない値」を依存配列に入れても effect の発動タイミングは変わらないが、コードを読む人が「この値が変わると effect が動く」と誤解する
  ```tsx
  // 修正前（不要な依存）
  }, [isSelected, indicatorAnim]);

  // 修正後（isSelected だけで十分）
  }, [isSelected]);
  ```

### 共通定数はインポートして使いまわす（重複定義を避ける）

- **何か**: `skiaFilter.ts` 内でチャンネル配列 `['red', 'orange', ...]` をローカルに再宣言していた
- **なぜ問題か**: `imageProcessing.ts` にすでに `COLOR_CHANNELS` として同じ内容が定義されている。2箇所に同じ情報があると、片方を更新しても片方が古いままになるバグが起きる（Single Source of Truth の違反）
- **修正**: `import { COLOR_CHANNELS } from '../../types/imageProcessing'` してローカル定義を削除

### レビュー指摘をすべて受け入れなくていい理由

- **composition-patterns** は「Compound Components + Context に置き換えるべき」と指摘したが、対応しなかった。理由：プロジェクト全体が同じ props 渡しパターン（`PresetSelector.tsx`）で統一されており、1ファイルだけ設計を変えると一貫性が崩れる
- **react-native-skills** は「Reanimated shared value を使うべき」と指摘したが、対応しなかった。理由：プロジェクト全体が `react-native` の `Animated` API で統一されており、移行はプロジェクト全体の判断が必要
- **教訓**: レビュアーの指摘は「技術的に正しいか」「プロジェクトのコンテキストと合致するか」の両方で判断する。ガイドラインに違反していても、既存の設計パターンとの一貫性を優先すべき場面がある
