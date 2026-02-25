import type { CapturedPhoto } from './camera';

export type RootStackParamList = {
  Camera: undefined;
  ImageProcessing: {
    photo: CapturedPhoto;
  };
};
