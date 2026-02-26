// React の「状態」や「画面表示後の処理」や「参照」を使うために読み込みます
import { useEffect, useRef, useState } from 'react';

// React Native の基本UI部品と、スタイル機能を読み込みます
import {
  ActivityIndicator, // くるくる（読み込み中表示）
  Image, // 画像表示
  Pressable, // 押せる部品（ボタン向け）
  StyleSheet, // スタイルをまとめて定義
  Text, // 文字表示
  View, // レイアウト用の箱
} from 'react-native';

// Expo Camera のカメラ表示と、型（TypeScript）と、権限フックを読み込みます
import {
  CameraView, // カメラ映像を表示するコンポーネント
  type CameraCapturedPicture, // 撮影した写真データの型
  type FlashMode, // フラッシュ設定の型
  useCameraPermissions, // カメラ権限を確認・要求するためのフック
} from 'expo-camera';

// 画面遷移（ナビゲーション）を使うために読み込みます
import { useNavigation } from '@react-navigation/native';

// Stackナビゲーションの「型付きのナビゲーション」型を読み込みます
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';

// CameraView の ref（参照）用のクラス型を読み込みます（撮影メソッドを呼ぶため）
import type CameraViewClass from 'expo-camera/build/CameraView';

// 撮影した写真のアプリ内で使う型（例: uriだけ持つ）を読み込みます
import type { CapturedPhoto } from '../../types/camera';

// 画面名と、画面に渡すパラメータの型を読み込みます
import type { RootStackParamList } from '../../types/navigation.ts';

// この画面（Camera）からのナビゲーション型を作ります（型安全にするため）
type CameraScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList, // アプリ全体の画面とパラメータの一覧
  'Camera' // 今回の画面名（Camera）
>;

// フラッシュの固定設定を作ります（この例では常にON）
const FLASH_MODE: FlashMode = 'on';

// ここが「カメラ画面」コンポーネント本体です
const CameraScreen = () => {
  // 画面遷移を行うための navigation を取得します（型付き）
  const navigation = useNavigation<CameraScreenNavigationProp>();

  // カメラ権限の状態(permission)と、権限を要求する関数(requestPermission)を取得します
  const [permission, requestPermission] = useCameraPermissions();

  // カメラが使える状態になったかを持つ状態です（準備できるまで撮影ボタンを無効化するため）
  const [isReady, setIsReady] = useState(false);

  // 撮影中かどうかを持つ状態です（連打防止のため）
  const [isCapturing, setIsCapturing] = useState(false);

  // 撮った写真のプレビュー用データを持つ状態です（nullならまだ撮っていない）
  const [preview, setPreview] = useState<CameraCapturedPicture | null>(null);

  // CameraView への参照（ref）を持ちます（takePictureAsyncを呼ぶため）
  const cameraRef = useRef<CameraViewClass | null>(null);

  // 画面が表示された後や、permissionが変わった時に実行する処理です
  useEffect(() => {
    // permission が null のときは、まだ権限状態が確定していない可能性があります
    if (permission === null) {
      // 権限を要求します（失敗しても画面側でブロック状態のUIを出すのでここでは握りつぶします）
      requestPermission().catch(() => {
        // 何もしない（UIで状態を見せるだけ）
      });
    }
    // permission と requestPermission が変わったら、この処理をやり直します
  }, [permission, requestPermission]);

  // permission がまだ取得できていない時は、読み込み中表示にします
  if (!permission) {
    // くるくる表示だけの画面を返します
    return (
      // 真ん中に寄せるためのコンテナです
      <View style={styles.permissionContainer}>
        {/* 読み込み中のくるくる */}
        <ActivityIndicator size='large' />
      </View>
    );
  }

  // permission はあるが、権限が許可されていない場合の表示です
  if (!permission.granted) {
    // 権限が必要だよ、という画面を返します
    return (
      // 背景や余白を整えたコンテナです
      <View style={styles.permissionContainer}>
        {/* ユーザーに権限が必要なことを伝える文章 */}
        <Text style={styles.permissionTitle}>Camera access is required</Text>

        {/* 権限をリクエストするボタン */}
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          {/* ボタンの文字 */}
          <Text style={styles.permissionButtonText}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  // 写真を撮る処理です（非同期なのでasync）
  const handleTakePicture = async () => {
    // カメラ参照がない、または撮影中なら何もしません(連打や未準備での撮影を防ぐ)
    if (!cameraRef.current || isCapturing) {
      return;
    }

    try {
      // 撮影中にします（ボタンを無効にするため）
      setIsCapturing(true);

      // 実際に撮影します（quality: 1 は高画質寄り）
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });

      // 撮影した写真をプレビューとして保存します（これでUIがプレビューに切り替わります）
      setPreview(photo);
    } catch (error) {
      // 撮影に失敗した場合はログを出します
      console.error('Failed to capture photo', error);
    } finally {
      // 成功でも失敗でも、撮影中フラグを戻します
      setIsCapturing(false);
    }
  };

  // 撮った写真を「使う」処理です（次の画面へ渡します）
  const handleUsePhoto = () => {
    // プレビューがないなら何もしません
    if (!preview) return;

    // 次画面に渡すために、アプリ内の型に変換します（ここではuriだけ）
    const captured: CapturedPhoto = { uri: preview.uri };

    // 画像加工画面へ遷移して、写真データを渡します
    navigation.navigate('ImageProcessing', { photo: captured });

    // プレビューを消して、次回撮影に備えます（画面が戻ってきた場合など）
    setPreview(null);
  };

  // 取り直し（プレビューを消してカメラに戻す）処理です
  const handleRetake = () => {
    // プレビュー状態を消します（これでカメラ表示に戻ります）
    setPreview(null);
  };

  // 画面の見た目を返します
  return (
    // 画面全体のコンテナです
    <View style={styles.container}>
      {/* もし preview があるなら「写真プレビュー画面」を表示します */}
      {preview ? (
        // プレビュー表示の大枠です
        <View style={styles.previewContainer}>
          {/* 撮った写真を全画面表示します */}
          <Image source={{ uri: preview.uri }} style={styles.preview} />

          {/* ボタンエリアです */}
          <View style={styles.previewActions}>
            {/* 取り直しボタン */}
            <Pressable style={styles.secondaryButton} onPress={handleRetake}>
              <Text style={styles.secondaryButtonText}>Retake</Text>
            </Pressable>

            {/* この写真を使うボタン */}
            <Pressable style={styles.primaryButton} onPress={handleUsePhoto}>
              <Text style={styles.primaryButtonText}>Use photo</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        // preview がないなら「カメラ画面」を表示します
        <>
          {/* カメラ映像を表示する部分です */}
          <CameraView
            ref={cameraRef} // 撮影のために ref を渡します
            style={styles.camera} // カメラ表示を画面いっぱいにします
            mode='picture' // 静止画モードにします
            flash={FLASH_MODE} // フラッシュ設定を固定で渡します
            onCameraReady={() => setIsReady(true)} // 準備できたら撮影可能にします
          />

          {/* 下側の操作エリアです */}
          <View style={styles.controls}>
            {/* フラッシュ状態の説明文です */}
            <Text style={styles.flashText}>Flash locked ON</Text>

            {/* 撮影ボタン（押せる部品） */}
            <Pressable
              style={[
                styles.captureButton, // 通常のボタンスタイル
                !isReady && styles.captureButtonDisabled, // 準備中は薄くする
              ]}
              onPress={handleTakePicture} // 押したら撮影する
              disabled={!isReady || isCapturing} // 準備中や撮影中は押せない
            >
              {/* 撮影中はくるくる、そうでなければ文字を出します */}
              {isCapturing ? (
                <ActivityIndicator color='#111' />
              ) : (
                <Text style={styles.captureText}>Capture</Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
};

// 画面で使うスタイル（見た目）をまとめて定義します
const styles = StyleSheet.create({
  // 画面全体の見た目です
  container: {
    flex: 1, // 画面いっぱいに広げます
    backgroundColor: '#000', // 背景を黒にします
  },

  // カメラ表示部分の見た目です
  camera: {
    flex: 1, // 上側を画面いっぱいにします
  },

  // 下側の操作エリアの見た目です
  controls: {
    paddingHorizontal: 24, // 左右の余白
    paddingVertical: 16, // 上下の余白
    backgroundColor: '#0f0f0f', // 背景を少し明るい黒にします
    borderTopWidth: StyleSheet.hairlineWidth, // 上に細い線を引きます
    borderTopColor: '#222', // 線の色
  },

  // フラッシュ説明文の見た目です
  flashText: {
    color: '#fff', // 文字色を白にします
    textAlign: 'center', // 真ん中揃え
    marginBottom: 12, // 下に余白
    fontSize: 14, // 文字サイズ
    letterSpacing: 0.4, // 文字の間隔
  },

  // 撮影ボタンの見た目です
  captureButton: {
    alignSelf: 'center', // 横方向で中央に寄せます
    width: 160, // ボタンの幅
    paddingVertical: 14, // 上下の余白
    borderRadius: 999, // 丸いボタンにします
    backgroundColor: '#f0f0f0', // 背景を明るい色にします
    alignItems: 'center', // 中の要素を横方向で中央
    justifyContent: 'center', // 中の要素を縦方向で中央
  },

  // 撮影できない時のボタン見た目です
  captureButtonDisabled: {
    opacity: 0.5, // 半透明にします
  },

  // 撮影ボタンの文字の見た目です
  captureText: {
    fontSize: 16, // 文字サイズ
    fontWeight: '600', // 文字の太さ
    color: '#111', // 文字色（黒に近い）
    letterSpacing: 0.2, // 文字の間隔
  },

  // 権限関連画面のコンテナ見た目です
  permissionContainer: {
    flex: 1, // 画面いっぱい
    alignItems: 'center', // 横方向中央
    justifyContent: 'center', // 縦方向中央
    padding: 24, // 余白
    backgroundColor: '#0f0f0f', // 背景色
  },

  // 権限画面のタイトル文字の見た目です
  permissionTitle: {
    color: '#fff', // 白文字
    fontSize: 16, // 文字サイズ
    marginBottom: 16, // 下の余白
    textAlign: 'center', // 中央揃え
  },

  // 権限を許可するボタンの見た目です
  permissionButton: {
    paddingHorizontal: 20, // 左右の余白
    paddingVertical: 12, // 上下の余白
    borderRadius: 8, // 角丸
    backgroundColor: '#f0f0f0', // 背景色
  },

  // 権限ボタンの文字の見た目です
  permissionButtonText: {
    color: '#111', // 文字色
    fontSize: 14, // 文字サイズ
    fontWeight: '600', // 太さ
  },

  // プレビュー画面の全体見た目です
  previewContainer: {
    flex: 1, // 画面いっぱい
    backgroundColor: '#000', // 背景を黒
  },

  // プレビュー画像の見た目です
  preview: {
    flex: 1, // 画像を可能な限り広げます
  },

  // プレビュー画面のボタンエリアの見た目です
  previewActions: {
    flexDirection: 'row', // 横並び
    justifyContent: 'space-between', // 両端に広げます
    paddingHorizontal: 24, // 左右の余白
    paddingVertical: 16, // 上下の余白
    backgroundColor: '#0f0f0f', // 背景色
    gap: 12, // ボタン間の間隔
  },

  // 「使う」ボタンの見た目です
  primaryButton: {
    flex: 1, // 横幅を半分ずつ使えるようにします
    backgroundColor: '#f0f0f0', // 背景色
    borderRadius: 10, // 角丸
    paddingVertical: 14, // 上下余白
    alignItems: 'center', // 中央揃え
  },

  // 「使う」ボタンの文字の見た目です
  primaryButtonText: {
    color: '#111', // 文字色
    fontSize: 15, // 文字サイズ
    fontWeight: '700', // 太め
  },

  // 「取り直し」ボタンの見た目です
  secondaryButton: {
    flex: 1, // 横幅を半分ずつ
    backgroundColor: '#1f1f1f', // 背景色（暗め）
    borderRadius: 10, // 角丸
    paddingVertical: 14, // 上下余白
    alignItems: 'center', // 中央揃え
    borderWidth: StyleSheet.hairlineWidth, // 枠線の太さ
    borderColor: '#3a3a3a', // 枠線の色
  },

  // 「取り直し」ボタンの文字の見た目です
  secondaryButtonText: {
    color: '#f0f0f0', // 文字色
    fontSize: 15, // 文字サイズ
    fontWeight: '700', // 太め
  },
});

// 他のファイルからこの画面を使えるように export します
export default CameraScreen;
