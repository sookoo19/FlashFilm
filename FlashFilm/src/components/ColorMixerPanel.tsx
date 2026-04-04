import { memo, useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AdjustmentSlider from './AdjustmentSlider';
import {
  ChannelMixState,
  ColorChannel,
  COLOR_CHANNELS,
  COLOR_CHANNEL_LABELS,
  ColorMixerState,
  MIX_RANGES,
} from '../types/imageProcessing';

// ─── 定数 ─────────────────────────────────────────────
const CHANNEL_COLORS: Record<ColorChannel, string> = {
  red: '#ff3b30',
  orange: '#ff9500',
  yellow: '#ffcc00',
  green: '#34c759',
  aqua: '#32ade6',
  blue: '#007aff',
  purple: '#af52de',
  magenta: '#ff2d55',
};

// ─── ChannelChipBar ────────────────────────────────
type ChannelChipBarProps = {
  selected: ColorChannel;
  onSelect: (channel: ColorChannel) => void;
};

const ChannelChipBar = memo(function ChannelChipBar({
  selected,
  onSelect,
}: ChannelChipBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {COLOR_CHANNELS.map(channel => {
        const isSelected = channel === selected;
        return (
          <Pressable
            key={channel}
            style={[
              styles.chip,
              isSelected
                ? {
                    borderColor: CHANNEL_COLORS[channel],
                    backgroundColor: CHANNEL_COLORS[channel] + '33',
                  }
                : null,
            ]}
            onPress={() => onSelect(channel)}
            accessibilityRole='radio'
            accessibilityState={{ checked: isSelected }}
          >
            <View
              style={[
                styles.chipDot,
                { backgroundColor: CHANNEL_COLORS[channel] },
              ]}
            />
            <Text
              style={[
                styles.chipLabel,
                isSelected ? styles.chipLabelSelected : null,
              ]}
            >
              {COLOR_CHANNEL_LABELS[channel]}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

// ─── ChannelSliders ────────────────────────────────
type ChannelSlidersProps = {
  state: ChannelMixState;
  onChange: (key: keyof ChannelMixState, value: number) => void;
};

const ChannelSliders = memo(function ChannelSliders({
  state,
  onChange,
}: ChannelSlidersProps) {
  return (
    <View style={styles.slidersContainer}>
      {(Object.keys(MIX_RANGES) as (keyof ChannelMixState)[]).map(key => (
        <AdjustmentSlider
          key={key}
          adjustmentKey={key}
          label={MIX_RANGES[key].label}
          value={state[key]}
          min={MIX_RANGES[key].min}
          max={MIX_RANGES[key].max}
          step={1}
          onChange={(_k, v) => onChange(key, v)}
        />
      ))}
    </View>
  );
});

// ─── ColorMixerPanel ────────────────────────────────
type ColorMixerPanelProps = {
  colorMixer: ColorMixerState;
  onColorMixerChange: (next: ColorMixerState) => void;
};

const ColorMixerPanel = memo(function ColorMixerPanel({
  colorMixer,
  onColorMixerChange,
}: ColorMixerPanelProps) {
  const [selectedChannel, setSelectedChannel] = useState<ColorChannel>('red');
  const handleSliderChange = useCallback(
    (key: keyof ChannelMixState, value: number) => {
      onColorMixerChange({
        ...colorMixer,
        [selectedChannel]: {
          ...colorMixer[selectedChannel],
          [key]: value,
        },
      });
    },
    [colorMixer, selectedChannel, onColorMixerChange]
  );
  return (
    <View style={styles.container}>
      <ChannelChipBar
        selected={selectedChannel}
        onSelect={setSelectedChannel}
      />
      <ChannelSliders
        state={colorMixer[selectedChannel]}
        onChange={handleSliderChange}
      />
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3a',
    backgroundColor: '#1b1b1b',
  },
  chipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  chipLabel: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '500',
  },
  chipLabelSelected: {
    color: '#f0f0f0',
  },
  slidersContainer: {
    gap: 4,
  },
});

export default ColorMixerPanel;
