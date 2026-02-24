# setup

## Expo + TypeScriptプロジェクト初期化

npx create-expo-app@latest FlashFilm --template expo-template-blank-typescript

## 必要な依存関係のインストール

cd FlashFilm
npx expo install expo-camera expo-media-library expo-sharing
npm install react-native-image-filter-kit
npm install @react-native-async-storage/async-storage

# To run your project, navigate to the directory and run one of the following npm commands.

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
