import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  CameraView,
  type CameraCapturedPicture,
  type FlashMode,
  useCameraPermissions,
} from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { type NativeStackNavigationProp } from '@react-navigation/native-stack';
import type CameraViewClass from 'expo-camera/build/CameraView';

import type { CapturedPhoto } from '../../types/camera';
import type { RootStackParamList } from '../../types/navigation.ts';

type CameraScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Camera'
>;

const FLASH_MODE: FlashMode = 'on';

const CameraScreen = () => {
  const navigation = useNavigation<CameraScreenNavigationProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [preview, setPreview] = useState<CameraCapturedPicture | null>(null);
  const cameraRef = useRef<CameraViewClass | null>(null);

  useEffect(() => {
    if (permission === null) {
      requestPermission().catch(() => {
        // no-op; UI will show blocked state
      });
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size='large' />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera access is required</Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant permission</Text>
        </Pressable>
      </View>
    );
  }

  const handleTakePicture = async () => {
    if (!cameraRef.current || isCapturing) {
      return;
    }
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      setPreview(photo);
    } catch (error) {
      console.error('Failed to capture photo', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUsePhoto = () => {
    if (!preview) return;
    const captured: CapturedPhoto = { uri: preview.uri };
    navigation.navigate('ImageProcessing', { photo: captured });
    setPreview(null);
  };

  const handleRetake = () => {
    setPreview(null);
  };

  return (
    <View style={styles.container}>
      {preview ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: preview.uri }} style={styles.preview} />
          <View style={styles.previewActions}>
            <Pressable style={styles.secondaryButton} onPress={handleRetake}>
              <Text style={styles.secondaryButtonText}>Retake</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleUsePhoto}>
              <Text style={styles.primaryButtonText}>Use photo</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            mode='picture'
            flash={FLASH_MODE}
            onCameraReady={() => setIsReady(true)}
          />
          <View style={styles.controls}>
            <Text style={styles.flashText}>Flash locked ON</Text>
            <Pressable
              style={[
                styles.captureButton,
                !isReady && styles.captureButtonDisabled,
              ]}
              onPress={handleTakePicture}
              disabled={!isReady || isCapturing}
            >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controls: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#0f0f0f',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#222',
  },
  flashText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 14,
    letterSpacing: 0.4,
  },
  captureButton: {
    alignSelf: 'center',
    width: 160,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    letterSpacing: 0.2,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0f0f0f',
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  permissionButtonText: {
    color: '#111',
    fontSize: 14,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  preview: {
    flex: 1,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#0f0f0f',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
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
  secondaryButtonText: {
    color: '#f0f0f0',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default CameraScreen;
