// Expo のメディアライブラリ（端末の写真保存先）を操作する機能を読み込みます。
import * as MediaLibrary from 'expo-media-library';

// 受け取った URI 配列から、空文字を除外して重複を取り除く関数です。
const uniqueUris = (uris: string[]) => {
  // uris.filter(...) で空文字を除外し、Set で重複を消して、配列に戻して返します。
  return [...new Set(uris.filter(uri => uri.length > 0))];
};

// 写真ライブラリへのアクセス権限を確認し、必要ならリクエストする関数です。
export const ensureMediaLibraryPermission = async (): Promise<boolean> => {
  // 現在の権限状態を取得します。
  const current = await MediaLibrary.getPermissionsAsync();
  // すでに許可されているなら true を返します。
  if (current.granted) {
    // ここで処理を終了します。
    return true;
  }

  // まだ許可がない場合は、ユーザーに権限ダイアログを表示して要求します。
  const requested = await MediaLibrary.requestPermissionsAsync();
  // 要求後の結果（許可されたかどうか）を返します。
  return requested.granted;
};

// 複数の画像 URI をメディアライブラリへ保存し、保存した件数を返す関数です。
export const saveImagesToMediaLibrary = async (
  // 保存したい画像 URI の配列です。
  uris: string[]
): Promise<number> => {
  // 空文字と重複を取り除いた保存対象リストを作ります。
  const targets = uniqueUris(uris);

  // 保存対象の URI を1件ずつ順番に処理します。
  for (const uri of targets) {
    // 1件分の画像を端末の写真ライブラリへ保存します。
    await MediaLibrary.saveToLibraryAsync(uri);
  }

  // 実際に保存処理を行った件数を返します。
  return targets.length;
};
