import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

import type { AiEditRecipe } from '../../types/aiEditRecipe';

type SaveDatasetSampleInput = {
  targetUri: string;
  recipe: AiEditRecipe;
  sampleId?: string;
};

export type SaveDatasetSampleResult = {
  sampleId: string;
  targetPath: string;
  recipePath: string;
};

type SaveToCollectorInput = {
  sampleId: string;
  targetBase64: string;
  recipe: AiEditRecipe;
};

const STEP4_COLLECTOR_PORT = 43110;
const READ_RETRY_COUNT = 5;
const READ_RETRY_DELAY_MS = 150;
const URI_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//;

const createSampleId = (): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');

  return `sample-${timestamp}-${random}`;
};

const wait = (milliseconds: number): Promise<void> => {
  return new Promise(resolve => {
    globalThis.setTimeout(resolve, milliseconds);
  });
};

const normalizeUri = (uri: string): string => {
  const trimmedUri = uri.trim();

  if (trimmedUri.length === 0) {
    return trimmedUri;
  }

  if (URI_SCHEME_PATTERN.test(trimmedUri)) {
    return trimmedUri;
  }

  if (trimmedUri.startsWith('/')) {
    return `file://${trimmedUri}`;
  }

  return trimmedUri;
};

const getCollectorBaseUrl = (): string => {
  const maybeProcess = globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };

  const configuredUrl =
    maybeProcess.process?.env?.EXPO_PUBLIC_STEP4_COLLECTOR_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${STEP4_COLLECTOR_PORT}`;
  }

  return `http://127.0.0.1:${STEP4_COLLECTOR_PORT}`;
};

const resolveReadableUri = async (targetUri: string): Promise<string> => {
  const candidates = [...new Set([targetUri, normalizeUri(targetUri)])].filter(
    candidate => candidate.length > 0
  );

  for (const candidate of candidates) {
    for (let attempt = 0; attempt < READ_RETRY_COUNT; attempt += 1) {
      try {
        const info = await FileSystem.getInfoAsync(candidate);

        if (info.exists) {
          return candidate;
        }
      } catch {
        // 次の再試行へ進みます。
      }

      await wait(READ_RETRY_DELAY_MS);
    }
  }

  throw new Error(`編集画像を読み取れませんでした: ${targetUri}`);
};

const readTargetAsBase64 = async (targetUri: string): Promise<string> => {
  const readableUri = await resolveReadableUri(targetUri);

  return FileSystem.readAsStringAsync(readableUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
};

const saveToCollector = async ({
  sampleId,
  targetBase64,
  recipe,
}: SaveToCollectorInput): Promise<SaveDatasetSampleResult> => {
  const response = await globalThis.fetch(
    `${getCollectorBaseUrl()}/api/step4/save`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sampleId,
        targetBase64,
        recipe,
      }),
    }
  );

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      responseText ||
        '開発用保存サーバーへ接続できません。npm run step4:collector を起動してください。'
    );
  }

  return (await response.json()) as SaveDatasetSampleResult;
};

const saveToAppSandbox = async ({
  targetUri,
  recipe,
  sampleId,
}: SaveDatasetSampleInput): Promise<SaveDatasetSampleResult> => {
  if (!FileSystem.documentDirectory) {
    throw new Error('Document directory is not available.');
  }

  const resolvedSampleId = sampleId ?? createSampleId();
  const sampleDir = `${FileSystem.documentDirectory}step4/${resolvedSampleId}/`;

  await FileSystem.makeDirectoryAsync(sampleDir, { intermediates: true });

  const targetPath = `${sampleDir}target.jpg`;
  const recipePath = `${sampleDir}recipe.json`;

  await FileSystem.copyAsync({
    from: normalizeUri(targetUri),
    to: targetPath,
  });

  await FileSystem.writeAsStringAsync(
    recipePath,
    JSON.stringify(recipe, null, 2),
    {
      encoding: FileSystem.EncodingType.UTF8,
    }
  );

  return {
    sampleId: resolvedSampleId,
    targetPath,
    recipePath,
  };
};

export const saveDatasetSample = async ({
  targetUri,
  recipe,
  sampleId,
}: SaveDatasetSampleInput): Promise<SaveDatasetSampleResult> => {
  const resolvedSampleId = sampleId ?? createSampleId();

  if (__DEV__) {
    const targetBase64 = await readTargetAsBase64(targetUri);

    return saveToCollector({
      sampleId: resolvedSampleId,
      targetBase64,
      recipe,
    });
  }

  return saveToAppSandbox({
    targetUri,
    recipe,
    sampleId: resolvedSampleId,
  });
};
