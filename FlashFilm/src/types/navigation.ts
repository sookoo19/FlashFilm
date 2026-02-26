import type { CapturedPhoto } from './camera';

export type RootStackParamList = {
  ImageProcessing: {
    photo: CapturedPhoto;
  };
  Camera: undefined;
};
