import * as MediaLibrary from 'expo-media-library';

const uniqueUris = (uris: string[]) => {
  return [...new Set(uris.filter(uri => uri.length > 0))];
};

export const requestMediaLibraryPermission = async (): Promise<boolean> => {
  const current = await MediaLibrary.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await MediaLibrary.requestPermissionsAsync();
  return requested.granted;
};

export const saveImageUrisToLibrary = async (
  uris: string[]
): Promise<number> => {
  const targets = uniqueUris(uris);

  for (const uri of targets) {
    await MediaLibrary.saveToLibraryAsync(uri);
  }

  return targets.length;
};
