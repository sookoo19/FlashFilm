// Expo のアセット機能を使って、同梱画像を端末で使える URI に変換します。
import { Asset } from 'expo-asset';

// 画像アセットのサイズ解決に使います。
import { Image } from 'react-native';

// 画面遷移に渡す写真データの型です。
import type { CapturedPhoto } from '../../types/camera';

// 開発時に使う既定画像です。
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DEV_DEFAULT_PHOTO_MODULE = require('../../../assets/dev-default-photo.jpg');

// undefined や 0 を避けてサイズ値を決める補助関数です。
const pickDimension = (
  first?: number | null,
  second?: number | null
): number => {
  if (typeof first === 'number' && first > 0) {
    return first;
  }

  if (typeof second === 'number' && second > 0) {
    return second;
  }

  return 0;
};

// 開発用既定画像を、撮影結果と同じ CapturedPhoto 形式で返します。
export const getDevDefaultCapturedPhoto = async (): Promise<CapturedPhoto> => {
  // Metro バンドル画像を Asset として取得します。
  const asset = Asset.fromModule(DEV_DEFAULT_PHOTO_MODULE);

  // 端末ファイル URI が無ければダウンロードして localUri を作ります。
  if (!asset.localUri) {
    await asset.downloadAsync();
  }

  // width / height は resolveAssetSource から解決します。
  const resolved = Image.resolveAssetSource(DEV_DEFAULT_PHOTO_MODULE);

  // 保存処理で使える URI を優先順で選びます。
  const uri = asset.localUri ?? resolved.uri ?? asset.uri;

  // どの URI も取得できない場合はエラーにします。
  if (!uri) {
    throw new Error('開発用既定画像の URI を解決できませんでした。');
  }

  return {
    uri,
    width: pickDimension(resolved.width, asset.width),
    height: pickDimension(resolved.height, asset.height),
  };
};
