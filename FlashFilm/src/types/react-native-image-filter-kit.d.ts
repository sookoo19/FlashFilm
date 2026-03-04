import * as React from 'react';

export type ExtractImageEvent = {
  nativeEvent: {
    uri?: string;
    error?: string;
  };
};

type Size = {
  width: number;
  height: number;
};

type FilterProps = {
  image: React.ReactNode;
  onExtractImage?: (event: ExtractImageEvent) => void;
  extractImageEnabled?: boolean;
  resizeCanvasTo?: Size;
};

declare module 'react-native-image-filter-kit' {
  export class Aden extends React.Component<FilterProps> {}
}
