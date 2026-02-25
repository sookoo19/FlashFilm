import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../types/navigation';

type ImageProcessingScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ImageProcessing'
>;

const ImageProcessingScreen = ({
  route,
  navigation,
}: ImageProcessingScreenProps) => {
  const { photo } = route.params;

  const handleRetake = () => {
    navigation.goBack();
  };

  const handleConfirm = () => {
    navigation.popToTop();
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri: photo.uri }} style={styles.preview} />
      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={handleRetake}>
          <Text style={styles.secondaryText}>Retake</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={handleConfirm}>
          <Text style={styles.primaryText}>Continue</Text>
        </Pressable>
      </View>
      <Text style={styles.placeholderNote}>
        Processing UI will live here (filters, save/share) in the next step.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  preview: {
    flex: 1,
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
  primaryText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1f1f1f',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3a',
  },
  secondaryText: {
    color: '#f0f0f0',
    fontSize: 15,
    fontWeight: '700',
  },
  placeholderNote: {
    color: '#999',
    paddingHorizontal: 24,
    paddingBottom: 20,
    fontSize: 12,
    letterSpacing: 0.2,
  },
});

export default ImageProcessingScreen;
