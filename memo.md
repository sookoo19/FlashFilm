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

## これからすること

STEP3用の収集ルールを決める
STEP4用の簡易編集UIを作る
まず 30〜50枚 で試す
問題なければ本番収集
input / target / meta / recipe を揃える
ひとことで言うと
STEP3 = 元写真を集める
STEP4 = 理想の正解画像を作る
STEP5 = その正解を再現する編集レシピを確定する

STEP3で集めるのは、加工前のスマホで撮ったフラッシュ写真で合っています。
これは AIの入力になる before / input 画像 です。

STEP3: 加工前の写真を集める
STEP4: その写真を理想の雰囲気に手編集して after / target を作る
STEP5: before -> after を再現するレシピを決める
STEP3 の収集ルール案

1. 収集対象
   スマホで撮影
   フラッシュあり
   撮影直後のオリジナル画像
   人物中心
   暗所 / 室内 / イベント系
   未加工
2. 収集対象にしてよいもの
   カメラロールの 元画像
   HEIC / JPEG の撮影直後データ
   スマホ標準カメラの通常処理込みの写真
   これは問題ありません
   スマホ写真は完全な無処理ではないためです
3. 除外するもの
   Lightroom / VSCO / SNOW などで編集後の画像
   Instagram / LINE / TikTok などから保存し直した画像
   スクリーンショット
   極端なブレ、真っ黒、撮影失敗
   連写でほぼ同じ写真が大量にあるもの
   フラッシュなし写真
   分布ルール
   枚数より 偏りを減らすこと が重要です。

バランスを取りたい項目
1人 / 2人以上 / 集合
顔の近距離 / 中距離 / やや遠距離
肌色のバリエーション
背景の明るさ
室内の色味
暖色照明
白色照明
ミックス光
縦写真 / 横写真
iPhone / Android
両方対応したい場合のみ
枚数の目安
まず最初
30〜50枚で試す
本番
300〜500枚
保存時のルール
できれば残したいもの
input.jpg または input.heic
iso
exposureTime
whiteBalance
flashFired
学習入力には不要でも、監査用として残す価値あり
deviceModel
sessionId
なぜ sessionId が必要か
後で train / val / test を分けるとき、
同じ日に同じ場所で撮った似た写真が別セットに混ざるのを防ぐため です。

実務的なルール
1セッションあたり
似た写真は 3〜5枚程度まで
同じ構図ばかり集めない
収集の考え方
AIが本番で受け取る写真に近いもの を集める
つまり、アプリの想定入力そのものを集めるのが正解です
