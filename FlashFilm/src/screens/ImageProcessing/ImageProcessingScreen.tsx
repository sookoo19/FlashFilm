import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  NativeModules,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Aden,
  Clarendon,
  ColorMatrix,
  brightness as toBrightnessMatrix,
  concatColorMatrices,
  contrast as toContrastMatrix,
  saturate as toSaturateMatrix,
} from 'react-native-image-filter-kit';

import AdjustmentSlider from '../../components/AdjustmentSlider';
import PresetSelector from '../../components/PresetSelector';
import { PRESET_OPTIONS } from '../../constants/presets';
import {
  requestMediaLibraryPermission,
  saveImageUrisToLibrary,
} from '../../services/storage/imageStorage';
import {
  ADJUSTMENT_RANGES,
  ADJUSTMENT_STEP,
  DEFAULT_ADJUSTMENTS,
  type AdjustmentKey,
  type AdjustmentState,
  type PresetKey,
} from '../../types/imageProcessing';
import type { RootStackParamList } from '../../types/navigation';

type ImageProcessingScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ImageProcessing'
>;

type FilterExtractEvent = {
  nativeEvent: {
    uri?: string;
    error?: string;
  };
};

const adjustmentKeys: readonly AdjustmentKey[] = [
  'brightness',
  'contrast',
  'saturation',
];

const isImageFilterKitAvailable =
  NativeModules.IFKExtractedImagesCache != null &&
  NativeModules.IFKImageFilterManager != null;

const ImageProcessingScreen = ({
  route,
  navigation,
}: ImageProcessingScreenProps) => {
  const { photo } = route.params;

  const [isSaving, setIsSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('aden');
  const [adjustments, setAdjustments] =
    useState<AdjustmentState>(DEFAULT_ADJUSTMENTS);
  const [filteredUri, setFilteredUri] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const canUseFilter = isImageFilterKitAvailable;

  const hasAdjustmentChanged = useMemo(
    () =>
      adjustmentKeys.some(key => adjustments[key] !== DEFAULT_ADJUSTMENTS[key]),
    [adjustments]
  );

  const shouldApplyEffect =
    canUseFilter && (selectedPreset !== 'original' || hasAdjustmentChanged);

  useEffect(() => {
    if (!shouldApplyEffect) {
      setIsExtracting(false);
      setFilteredUri(null);
      return;
    }

    setIsExtracting(true);
    setFilteredUri(null);
  }, [adjustments, selectedPreset, shouldApplyEffect]);

  const handleRetake = () => {
    navigation.goBack();
  };

  const handleExtracted = useCallback((event: FilterExtractEvent) => {
    const { uri, error } = event.nativeEvent;

    if (error) {
      console.warn('Filter extract error', error);
      setIsExtracting(false);
      return;
    }

    if (uri) {
      setFilteredUri(uri);
      setIsExtracting(false);
    }
  }, []);

  const handleSelectPreset = (preset: PresetKey) => {
    setSelectedPreset(preset);
  };

  const handleChangeAdjustment = (key: AdjustmentKey, nextValue: number) => {
    const { min, max } = ADJUSTMENT_RANGES[key];
    const clamped = Math.max(min, Math.min(max, nextValue));

    setAdjustments(prev => ({
      ...prev,
      [key]: Number(clamped.toFixed(2)),
    }));
  };

  const previewContent = useMemo(() => {
    const baseImage = (
      <Image source={{ uri: photo.uri }} style={styles.preview} />
    );

    if (!shouldApplyEffect) {
      return baseImage;
    }

    const withPreset =
      selectedPreset === 'aden' ? (
        <Aden image={baseImage} />
      ) : selectedPreset === 'clarendon' ? (
        <Clarendon image={baseImage} />
      ) : (
        baseImage
      );

    const adjustmentMatrix = concatColorMatrices([
      toBrightnessMatrix(adjustments.brightness),
      toContrastMatrix(adjustments.contrast),
      toSaturateMatrix(adjustments.saturation),
    ]);

    return (
      <ColorMatrix
        matrix={adjustmentMatrix}
        extractImageEnabled
        onExtractImage={handleExtracted}
        image={withPreset}
      />
    );
  }, [
    adjustments.brightness,
    adjustments.contrast,
    adjustments.saturation,
    handleExtracted,
    photo.uri,
    selectedPreset,
    shouldApplyEffect,
  ]);

  const handleConfirm = async () => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      const granted = await requestMediaLibraryPermission();

      if (!granted) {
        Alert.alert(
          '保存できません',
          '写真を保存するにはフォトライブラリへのアクセス許可が必要です。'
        );
        return;
      }

      if (shouldApplyEffect && (isExtracting || !filteredUri)) {
        Alert.alert('処理中です', '編集が完了してから保存してください。');
        return;
      }

      const targets = [photo.uri];

      if (shouldApplyEffect && filteredUri) {
        targets.push(filteredUri);
      }

      await saveImageUrisToLibrary(targets);

      navigation.popToTop();
    } catch (error) {
      console.error('Failed to save photo', error);
      Alert.alert('保存に失敗しました', 'もう一度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.previewHolder}>{previewContent}</View>

      {canUseFilter ? (
        <View style={styles.editorPanel}>
          <Text style={styles.sectionTitle}>プリセット</Text>
          <PresetSelector
            presets={PRESET_OPTIONS}
            selectedPreset={selectedPreset}
            onSelectPreset={handleSelectPreset}
            disabled={isSaving}
          />

          <View style={styles.adjustmentArea}>
            <Text style={styles.sectionTitle}>編集</Text>
            {adjustmentKeys.map(key => {
              const range = ADJUSTMENT_RANGES[key];

              return (
                <AdjustmentSlider
                  key={key}
                  label={range.label}
                  value={adjustments[key]}
                  min={range.min}
                  max={range.max}
                  step={ADJUSTMENT_STEP}
                  onChange={nextValue => handleChangeAdjustment(key, nextValue)}
                  disabled={isSaving}
                />
              );
            })}
          </View>
        </View>
      ) : (
        <Text style={styles.filterUnavailableNote}>
          フィルター機能はこのビルドでは利用できないため、元画像のみ保存します。
        </Text>
      )}

      {shouldApplyEffect && (isExtracting || !filteredUri) && (
        <Text style={styles.filterNote}>編集画像を生成しています…</Text>
      )}

      <View style={styles.actions}>
        <Pressable
          style={[styles.secondaryButton, isSaving && styles.buttonDisabled]}
          onPress={handleRetake}
          disabled={isSaving}
        >
          <Text style={styles.secondaryText}>Retake</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={isSaving}
        >
          <Text style={styles.primaryText}>
            {isSaving ? 'Saving...' : 'Continue'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.placeholderNote}>
        {shouldApplyEffect
          ? '保存時に元画像と編集後画像を保存します。'
          : '編集中の変更がないため、元画像のみ保存します。'}
      </Text>

      <StatusBar style='light' />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  previewHolder: { flex: 1 },
  preview: { flex: 1 },
  editorPanel: {
    backgroundColor: '#0f0f0f',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 14,
  },
  sectionTitle: {
    color: '#f0f0f0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  adjustmentArea: {
    marginTop: 14,
  },
  filterNote: {
    color: '#bbb',
    paddingHorizontal: 24,
    paddingBottom: 8,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  filterUnavailableNote: {
    color: '#bbb',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    fontSize: 12,
    letterSpacing: 0.2,
    backgroundColor: '#0f0f0f',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#0f0f0f',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#222',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#111', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1f1f1f',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3a',
  },
  secondaryText: { color: '#f0f0f0', fontSize: 15, fontWeight: '700' },
  placeholderNote: {
    color: '#999',
    paddingHorizontal: 24,
    paddingBottom: 20,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ImageProcessingScreen;
