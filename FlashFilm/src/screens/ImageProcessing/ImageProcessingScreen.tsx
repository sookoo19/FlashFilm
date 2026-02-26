// React Native の画面で使う基本パーツ（画像・ボタン・文字・レイアウト）と、スタイル機能を読み込みます
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

// React Navigation の「この画面が受け取る props の型」を作るための型を読み込みます
import { type NativeStackScreenProps } from '@react-navigation/native-stack';

// アプリ内の「画面名」と「画面に渡すデータ」の型（一覧）を読み込みます
import type { RootStackParamList } from '../../types/navigation';

// この画面（ImageProcessing）が受け取る props の型を作ります（型安全にするため）
type ImageProcessingScreenProps = NativeStackScreenProps<
  // アプリ全体の画面定義（どの画面がどんな params を持つか）
  RootStackParamList,
  // 今回の画面名（ImageProcessing）
  'ImageProcessing'
>;

// 画像加工画面コンポーネント本体です（画面として表示されます）
const ImageProcessingScreen = ({
  // route には「前の画面から渡されたデータ（params）」が入ります
  route,
  // navigation には「画面を戻る・進む」などの操作が入ります
  navigation,
}: ImageProcessingScreenProps) => {
  // route.params から、渡されてきた photo（撮った写真情報）を取り出します（省略記法）
  const { photo } = route.params;

  // 「取り直し」ボタンを押したときの処理です
  const handleRetake = () => {
    // 1つ前の画面（カメラ画面）へ戻ります
    navigation.goBack();
  };

  // 「次へ」ボタンを押したときの処理です
  const handleConfirm = () => {
    // スタックの一番上（最初の画面）まで一気に戻ります
    navigation.popToTop();
  };

  // 画面に表示するUI（見た目）を返します
  return (
    // 画面全体の入れ物です（黒背景、全画面）
    <View style={styles.container}>
      {/* 渡された写真を表示します（uri は画像の場所を表す文字列です） */}
      <Image source={{ uri: photo.uri }} style={styles.preview} />
      {/* ボタンを並べるエリアです */}
      <View style={styles.actions}>
        {/* 取り直しボタン（押せる部品）です */}
        <Pressable style={styles.secondaryButton} onPress={handleRetake}>
          {/* ボタンの文字です */}
          <Text style={styles.secondaryText}>Retake</Text>
        </Pressable>
        {/* 次へ進むボタン（押せる部品）です */}
        <Pressable style={styles.primaryButton} onPress={handleConfirm}>
          {/* ボタンの文字です */}
          <Text style={styles.primaryText}>Continue</Text>
        </Pressable>
      </View>
      {/* いまは仮の説明文です（今後ここに加工UIを作る想定） */}
      <Text style={styles.placeholderNote}>
        Processing UI will live here (filters, save/share) in the next step.
      </Text>
    </View>
  );
};

// この画面で使う見た目（スタイル）をまとめて定義します
const styles = StyleSheet.create({
  // 画面全体のコンテナ（入れ物）のスタイルです
  container: {
    // 画面いっぱいに広げます
    flex: 1,
    // 背景色を黒にします
    backgroundColor: '#000',
  },
  // 写真プレビュー（画像）のスタイルです
  preview: {
    // 余っている領域を埋めるように広げます
    flex: 1,
  },
  // 下部のボタン並びエリアのスタイルです
  actions: {
    // ボタンを横並びにします
    flexDirection: 'row',
    // ボタン同士の間隔です
    gap: 12,
    // 左右の余白です
    paddingHorizontal: 24,
    // 上下の余白です
    paddingVertical: 16,
    // 少し明るい黒の背景にします
    backgroundColor: '#0f0f0f',
    // 上に細い境界線を引きます
    borderTopWidth: StyleSheet.hairlineWidth,
    // 境界線の色です
    borderTopColor: '#222',
  },
  // 右側（Continue）ボタンの見た目です
  primaryButton: {
    // 横幅を均等にするため、スペースを分け合います
    flex: 1,
    // 明るい背景色です
    backgroundColor: '#f0f0f0',
    // 角を丸くします
    borderRadius: 10,
    // ボタン内の上下の余白です
    paddingVertical: 14,
    // 中の要素を横方向で中央に揃えます
    alignItems: 'center',
  },
  // 右側ボタンの文字の見た目です
  primaryText: {
    // 文字色です
    color: '#111',
    // 文字サイズです
    fontSize: 15,
    // 太字にします
    fontWeight: '700',
  },
  // 左側（Retake）ボタンの見た目です
  secondaryButton: {
    // 横幅を均等にするため、スペースを分け合います
    flex: 1,
    // 暗い背景色です
    backgroundColor: '#1f1f1f',
    // 角を丸くします
    borderRadius: 10,
    // ボタン内の上下の余白です
    paddingVertical: 14,
    // 中の要素を横方向で中央に揃えます
    alignItems: 'center',
    // 枠線の太さです（とても細い線）
    borderWidth: StyleSheet.hairlineWidth,
    // 枠線の色です
    borderColor: '#3a3a3a',
  },
  // 左側ボタンの文字の見た目です
  secondaryText: {
    // 文字色です
    color: '#f0f0f0',
    // 文字サイズです
    fontSize: 15,
    // 太字にします
    fontWeight: '700',
  },
  // 画面下の説明文（仮テキスト）のスタイルです
  placeholderNote: {
    // 文字色（薄いグレー）です
    color: '#999',
    // 左右の余白です
    paddingHorizontal: 24,
    // 下側の余白です
    paddingBottom: 20,
    // 文字サイズです
    fontSize: 12,
    // 文字の間隔です
    letterSpacing: 0.2,
  },
});

// 他のファイルからこの画面コンポーネントを使えるように公開します
export default ImageProcessingScreen;
