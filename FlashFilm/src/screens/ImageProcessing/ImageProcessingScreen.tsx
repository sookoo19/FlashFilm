// 画面遷移（Stack）の props 型を作るための型を読み込みます
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Aden } from 'react-native-image-filter-kit';
// 端末のフォトライブラリに保存するための Expo API を読み込みます
import * as MediaLibrary from 'expo-media-library';
// ステータスバー（上の時計など）の見た目を変えるために読み込みます
import { StatusBar } from 'expo-status-bar';
// 画面の状態（state）や副作用を扱うために useState/useEffect を読み込みます
import { useCallback, useEffect, useState } from 'react';
// 画面部品（アラート・画像・ボタン等）を読み込みます
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

// アプリ内の「画面名」と「渡せるデータ」の型一覧を読み込みます
import type { RootStackParamList } from '../../types/navigation';

// この画面が受け取る props（route と navigation）の型を作ります
type ImageProcessingScreenProps = NativeStackScreenProps<
  // 画面一覧の型（どの画面に何を渡せるか）
  RootStackParamList,
  // このファイルの画面名（ImageProcessing）
  'ImageProcessing'
>;

// 画像加工（今はプレビュー＆保存）画面の本体です
const ImageProcessingScreen = ({
  // route には「前の画面から渡されたデータ」が入ります
  route,
  // navigation には「戻る・進む」などの操作が入ります
  navigation,
}: ImageProcessingScreenProps) => {
  // 前の画面から渡された photo（写真情報）を取り出します
  const { photo } = route.params;

  // 保存中かどうかを覚える state です（連打防止に使います）
  const [isSaving, setIsSaving] = useState(false);

  // フォトライブラリ権限の状態と、権限をお願いする関数を取得します
  const [mediaPermission, requestMediaPermission] =
    MediaLibrary.usePermissions();

  // フィルターのオン/オフと抽出結果を管理します
  const [isFilterOn, setIsFilterOn] = useState(true);
  const [filteredUri, setFilteredUri] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    if (isFilterOn) {
      setIsExtracting(true);
      setFilteredUri(null);
    } else {
      setIsExtracting(false);
    }
  }, [isFilterOn]);

  // 「撮り直し」ボタンを押したときの処理です
  const handleRetake = () => {
    // 1つ前の画面（カメラ）に戻ります
    navigation.goBack();
  };

  const handleFilterToggle = () => {
    setIsFilterOn(prev => !prev);
  };

  const handleExtracted = useCallback(
    (event: { nativeEvent: { uri?: string; error?: string } }) => {
      const { uri, error } = event.nativeEvent;
      if (error) {
        console.warn('Filter extract error', error);
      }
      if (uri) {
        setFilteredUri(uri);
      }
      setIsExtracting(false);
    },
    []
  );

  // 「Continue」ボタンを押したときの処理です（保存するので async）
  const handleConfirm = async () => {
    // すでに保存中なら、何もしません（連打防止）
    if (isSaving) return;

    // ここから保存処理を安全に進めます
    try {
      // 保存中にします（ボタンを押せなくするため）
      setIsSaving(true);

      // すでに許可があればそれを使い、なければ権限をリクエストします
      const granted =
        mediaPermission?.granted ?? (await requestMediaPermission()).granted;

      // 権限が取れなかった場合の処理です
      if (!granted) {
        // ユーザーに「許可が必要」だと伝えます
        Alert.alert(
          '保存できません',
          '写真を保存するにはフォトライブラリへのアクセス許可が必要です。'
        );
        // ここで保存処理を止めます
        return;
      }

      if (isFilterOn && (isExtracting || !filteredUri)) {
        Alert.alert(
          '処理中です',
          'フィルター適用が完了してから保存してください。'
        );
        return;
      }

      const targets = [photo.uri];
      if (isFilterOn && filteredUri) {
        targets.push(filteredUri);
      }

      for (const uri of targets) {
        await MediaLibrary.saveToLibraryAsync(uri);
      }

      // 保存できたら、最初の画面（Camera）まで戻ります
      navigation.popToTop();
    } catch (error) {
      // 失敗した原因を開発者向けにログへ出します
      console.error('Failed to save photo', error);
      // ユーザー向けに「失敗した」と表示します
      Alert.alert('保存に失敗しました', 'もう一度お試しください。');
    } finally {
      // 成功でも失敗でも、最後に保存中フラグを戻します
      setIsSaving(false);
    }
  };

  // 画面に表示する UI（見た目）を返します
  return (
    // 画面全体の入れ物です
    <View style={styles.container}>
      <View style={styles.previewHolder}>
        {isFilterOn ? (
          <Aden
            image={<Image source={{ uri: photo.uri }} style={styles.preview} />}
            extractImageEnabled
            onExtractImage={handleExtracted}
          />
        ) : (
          <Image source={{ uri: photo.uri }} style={styles.preview} />
        )}
      </View>

      <View style={styles.filterToggle}>
        <Text style={styles.filterLabel}>プリセット: Aden</Text>
        <Pressable
          style={styles.filterSwitch}
          onPress={handleFilterToggle}
          disabled={isSaving}
        >
          <Text style={styles.filterSwitchText}>
            {isFilterOn ? 'ON（元+フィルター保存）' : 'OFF（元のみ保存）'}
          </Text>
        </Pressable>
      </View>

      {isFilterOn && (isExtracting || !filteredUri) && (
        <Text style={styles.filterNote}>フィルター適用中です…</Text>
      )}

      {/* ボタンを置くエリアです */}
      <View style={styles.actions}>
        {/* 「撮り直し」ボタンです */}
        <Pressable
          // 保存中なら見た目を少し薄くします
          style={[styles.secondaryButton, isSaving && styles.buttonDisabled]}
          // 押されたら 1つ前の画面へ戻ります
          onPress={handleRetake}
          // 保存中は押せないようにします
          disabled={isSaving}
        >
          {/* ボタンの文字です */}
          <Text style={styles.secondaryText}>Retake</Text>
        </Pressable>

        {/* 「保存して次へ」ボタンです（今は保存してトップへ戻ります） */}
        <Pressable
          // 保存中なら見た目を少し薄くします
          style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
          // 押されたら保存処理をします
          onPress={handleConfirm}
          // 保存中は押せないようにします
          disabled={isSaving}
        >
          {/* 保存中は文言を切り替えます */}
          <Text style={styles.primaryText}>
            {isSaving ? 'Saving...' : 'Continue'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.placeholderNote}>
        {isFilterOn
          ? 'フィルターON: 元画像とフィルター適用後の2枚を保存します。'
          : 'フィルターOFF: 元画像のみ保存します。'}
      </Text>

      {/* 黒背景なので、ステータスバー文字を明るくします */}
      <StatusBar style='light' />
    </View>
  );
};

// 画面の見た目（スタイル）をまとめて定義します
const styles = StyleSheet.create({
  // 画面全体のスタイルです
  container: { flex: 1, backgroundColor: '#000' },
  previewHolder: { flex: 1 },
  // 画像プレビューのスタイルです
  preview: { flex: 1 },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0f0f0f',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  filterLabel: {
    color: '#f0f0f0',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  filterSwitch: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1f1f1f',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3a',
  },
  filterSwitchText: {
    color: '#f0f0f0',
    fontSize: 13,
    fontWeight: '700',
  },
  filterNote: {
    color: '#bbb',
    paddingHorizontal: 24,
    paddingBottom: 8,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  // ボタンエリアのスタイルです
  actions: {
    // ボタンを横並びにします
    flexDirection: 'row',
    // ボタン間のすき間です
    gap: 12,
    // 左右の余白です
    paddingHorizontal: 24,
    // 上下の余白です
    paddingVertical: 16,
    // 背景を少し明るい黒にします
    backgroundColor: '#0f0f0f',
    // 上に細い線を引きます
    borderTopWidth: StyleSheet.hairlineWidth,
    // 線の色です
    borderTopColor: '#222',
  },
  // 右側（Continue）のボタンのスタイルです
  primaryButton: {
    // 横幅を半分ずつ使えるようにします
    flex: 1,
    // 明るい背景色です
    backgroundColor: '#f0f0f0',
    // 角を丸くします
    borderRadius: 10,
    // 上下の余白です
    paddingVertical: 14,
    // 中身を中央にします
    alignItems: 'center',
  },
  // 右側ボタンの文字のスタイルです
  primaryText: { color: '#111', fontSize: 15, fontWeight: '700' },
  // 左側（Retake）のボタンのスタイルです
  secondaryButton: {
    // 横幅を半分ずつ使えるようにします
    flex: 1,
    // 暗い背景色です
    backgroundColor: '#1f1f1f',
    // 角を丸くします
    borderRadius: 10,
    // 上下の余白です
    paddingVertical: 14,
    // 中身を中央にします
    alignItems: 'center',
    // 枠線を付けます
    borderWidth: StyleSheet.hairlineWidth,
    // 枠線の色です
    borderColor: '#3a3a3a',
  },
  // 左側ボタンの文字のスタイルです
  secondaryText: { color: '#f0f0f0', fontSize: 15, fontWeight: '700' },
  // 画面下の説明文のスタイルです
  placeholderNote: {
    // 文字色です
    color: '#999',
    // 左右の余白です
    paddingHorizontal: 24,
    // 下の余白です
    paddingBottom: 20,
    // 文字サイズです
    fontSize: 12,
    // 文字の間隔です
    letterSpacing: 0.2,
  },
  // 保存中にボタンを薄く見せるスタイルです
  buttonDisabled: {
    // 半透明にします
    opacity: 0.6,
  },
});

// 他のファイルからこの画面を使えるように公開します
export default ImageProcessingScreen;
