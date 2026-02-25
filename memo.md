# setup

## Expo + TypeScriptプロジェクト初期化

npx create-expo-app@latest FlashFilm --template expo-template-blank-typescript

## 必要な依存関係のインストール

cd FlashFilm
npx expo install expo-camera expo-media-library expo-sharing
npm install react-native-image-filter-kit
npm install @react-native-async-storage/async-storage

# To run your project, navigate to the directory and run one of the following npm commands.

- npx expo start --tunnel
- npm run android
- npm run ios
- npm run web

# fix format

- npm run lint
- npm run format

# 推奨構造

FlashFilm/
├── src/
│ ├── screens/
│ │ ├── CameraScreen.tsx
│ │ ├── ImageProcessingScreen.tsx
│ │ └── SettingsScreen.tsx
│ ├── components/
│ │ ├── FlashButton.tsx
│ │ ├── PresetSelector.tsx
│ │ └── AdjustmentSlider.tsx
│ ├── services/
│ │ ├── api/
│ │ │ └── filmProcessing.ts
│ │ ├── storage/
│ │ │ └── imageStorage.ts
│ │ └── camera/
│ │ └── cameraService.ts
│ ├── types/
│ │ └── index.ts
│ ├── utils/
│ │ └── imageUtils.ts
│ └── constants/
│ └── presets.ts
└── server/
├── main.py
├── models/
│ └── film_processor.py
└── requirements.txt

## copilot用プロンプト

💎 Copilot Pro 用 コード解説プロンプト集
1️⃣ 基本的なコード解説（初心者向け）
このコードを初心者向けに詳しく解説してください。

1. このファイル全体の役割
2. 各関数や変数の意味
3. どういう順序で処理が進むのか
4. なぜこの書き方を選んだのか
5. 改善点や注意点があれば教えてください

2️⃣ 関数単位の深掘り解説
この関数だけを初心者向けに詳細に解説してください。

- 引数の意味
- 戻り値の意味
- 内部処理の手順
- この関数を使う上での注意点

3️⃣ コード改善・リファクタリング提案付き
このコードを初心者向けに解説してください。
さらに以下も行ってください：

- コードの可読性を上げる改善点
- 無駄な処理や最適化できる箇所
- セキュリティ上注意すべき点
- 実務向けのベストプラクティスの提案

4️⃣ コメント付きコード生成＋解説
このコードを理解しやすいようにコメントを追加して再生成してください。

- コメントは1行ごとに説明
- 初心者でも理解できる簡単な言葉で
- 関数や変数の意味も説明

5️⃣ 学習向けステップ解説
このコードをステップごとに解説してください。

- 各処理を順番に追って説明
- なぜその処理が必要か理由も教えて
- 初心者が間違いやすいポイントも補足
