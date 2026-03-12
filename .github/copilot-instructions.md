# FlashFilm AI コーディングガイド

## 出力ガイド/ 学習重視の対話方針

- このリポジトリでは、ユーザーは写経しながら学習して開発を進める。Copilot は原則としてコードを直接実装・編集せず、学習を支援する説明役として振る舞う。
- まず現在の対象ファイルや既存コードをユーザーと一緒に確認し、その後に変更箇所を順番に案内する。
- 各変更箇所ごとに、以下の順番で案内する。
  1. どこを変更するか
  2. 変更後のコード
  3. なぜその変更が必要か
- 一度に全体をまとめて実装するのではなく、1 箇所ずつ段階的に進める。複数ファイルにまたがる場合も同様に、変更単位ごとに区切って説明する。
- ユーザーが明示的に「実装して」と依頼しない限り、ファイル編集・コード生成の適用・自動修正は行わない。
- コードを提示する際は、既存構造にどう接続されるか、関連する型や定数、呼び出し元まで含めて説明し、ユーザーが手で写経できる粒度に分ける。

## 概要 / アーキテクチャ

- Expo + React Native + TypeScript の単一アプリ構成。エントリは `FlashFilm/index.ts`、アプリ全体のナビゲーション定義は `FlashFilm/App.tsx`。
- 画面遷移は React Navigation の Native Stack を使用し、現在の主要画面は `Camera` と `ImageProcessing` の 2 つ。
- 主要な実装は `FlashFilm/src/` 配下にあり、`screens/`, `components/`, `services/`, `types/`, `constants/` へ役割別に整理されている。

## 現在の主要機能

- `src/screens/Camera/CameraScreen.tsx`
  - `expo-camera` を使った撮影画面。
  - カメラ権限の取得、前面/背面の切り替え、固定フラッシュ ON、ピンチズーム、撮影後プレビュー、撮り直し、編集画面への遷移を持つ。
  - 開発時 (`__DEV__`) は `src/services/camera/devDefaultPhoto.ts` 経由で既定画像を読み込み、撮影せずに編集画面へ進める。
- `src/screens/ImageProcessing/ImageProcessingScreen.tsx`
  - 撮影画像に対して明るさ、コントラスト、彩度、色温度、色かぶり、グレインを調整する編集画面。
  - `react-native-image-filter-kit` は動的読み込みで扱い、ネイティブ ViewManager が無いビルドでは編集プレビューを無効化する。
  - グレインは iOS の `IosCIPhotoGrain` を前提としており、非対応端末では `grain = 0` に戻さないと保存できない。
  - 調整値変更後は 3 秒デバウンスして加工画像を生成し、保存時に `target.jpg` と `recipe.json` を出力する。

## 保存 / データ収集フロー

- 保存処理の中心は `src/services/storage/datasetStorage.ts`。
- `__DEV__` では `npm run step4:collector` で起動するローカル収集サーバー (`scripts/step4-collector-server.mjs`) に `target.jpg` と `recipe.json` 相当のデータを送る。
- 開発ビルド以外ではアプリの sandbox 配下へ `step4/<sampleId>/target.jpg` と `recipe.json` を保存する。
- メディアライブラリ保存用の共通処理は `src/services/storage/mediaLibraryStorage.ts` に切り出されている。保存系ロジックを追加する場合は `services/storage/` を優先して再利用する。

## 型 / 定数の配置

- ナビゲーション型は `src/types/navigation.ts` の `RootStackParamList` を基準に管理する。
- 撮影結果の型は `src/types/camera.ts` の `CapturedPhoto` を使う。
- 編集値の範囲と初期値は `src/types/imageProcessing.ts` にあり、UI と保存ロジックで共通利用する。
- AI 編集レシピの型は `src/types/aiEditRecipe.ts` にあり、保存する `recipe.json` の基準になる。

## UI 実装の指針

- 画面固有の UI は `src/screens/*`、再利用 UI は `src/components/*` に配置する。
- 既存 UI は黒基調のカメラアプリ風デザインで、`StyleSheet.create` を使った明示的なスタイル定義を採用している。
- 調整 UI は `src/components/AdjustmentSlider.tsx` のような小さな部品へ切り出す。新しい調整項目を追加する場合は、まず `src/types/imageProcessing.ts` に型・範囲・初期値を追加してから画面へ配線する。

## 実装上の注意

- TypeScript は `strict: true`。型の回避ではなく、型定義の追加や分岐による絞り込みで対応する。
- `react-native-image-filter-kit` は静的 import せず、既存実装と同様に安全な動的読み込みパターンを維持する。
- カメラ・保存・収集サーバー連携のような端末機能や外部 I/O は `src/services/` に寄せ、画面コンポーネントへ直書きしすぎない。
- 既存コードは学習用に近い粒度の日本語コメントが多い。新規コードも必要な箇所では同程度の分かりやすさを優先する。

## 主要コマンド

- 起動: `cd FlashFilm && npm run start`
- iOS / Android / Web: `npm run ios` / `npm run android` / `npm run web`
- 開発用収集サーバー: `npm run step4:collector`
- 静的チェック: `npm run lint` / `npm run type-check`
- フォーマット: `npm run format`
