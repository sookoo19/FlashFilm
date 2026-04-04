import { memo, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PresetOption } from '../constants/presets';
import type { PresetKey } from '../types/imageProcessing';

type PresetSelectorProps = {
  presets: readonly PresetOption[];
  selectedPreset: PresetKey;
  onSelectPreset: (preset: PresetKey) => void;
  disabled?: boolean;
};

type PresetItemProps = {
  presetKey: PresetKey;
  label: string;
  isSelected: boolean;
  onSelect: (key: PresetKey) => void;
  disabled: boolean;
};

const PresetItem = memo(({
  presetKey,
  label,
  isSelected,
  onSelect,
  disabled,
}: PresetItemProps) => {
  // useState initializer keeps the Animated.Value stable without .current in render
  const [indicatorAnim] = useState(
    () => new Animated.Value(isSelected ? 1 : 0)
  );

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: isSelected ? 1 : 0,
      speed: 22,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  }, [isSelected, indicatorAnim]);

  return (
    <Pressable
      style={[
        styles.presetButton,
        isSelected && styles.presetButtonSelected,
        disabled && styles.disabled,
      ]}
      onPress={() => onSelect(presetKey)}
      disabled={disabled}
      accessibilityRole='tab'
      accessibilityState={{ selected: isSelected }}
    >
      <Text
        style={[styles.presetLabel, isSelected && styles.presetLabelSelected]}
      >
        {label}
      </Text>
      {/* Indicator bar — springs in when selected, springs out when deselected */}
      <Animated.View
        style={[
          styles.indicator,
          { opacity: indicatorAnim, transform: [{ scaleX: indicatorAnim }] },
        ]}
      />
    </Pressable>
  );
});

const PresetSelector = memo(({
  presets,
  selectedPreset,
  onSelectPreset,
  disabled = false,
}: PresetSelectorProps) => {
  return (
    <View style={styles.container}>
      {presets.map(preset => (
        <PresetItem
          key={preset.key}
          presetKey={preset.key}
          label={preset.label}
          isSelected={preset.key === selectedPreset}
          onSelect={onSelectPreset}
          disabled={disabled}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  presetButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3a',
    backgroundColor: '#1b1b1b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetButtonSelected: {
    borderColor: '#f0f0f0',
    backgroundColor: '#2a2a2a',
  },
  presetLabel: {
    color: '#888888',
    fontSize: 15,
    fontWeight: '500',
  },
  presetLabelSelected: {
    color: '#f0f0f0',
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    borderRadius: 2,
    backgroundColor: '#f0f0f0',
  },
  disabled: {
    opacity: 0.6,
  },
});

export default PresetSelector;
