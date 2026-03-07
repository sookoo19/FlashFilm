import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PresetOption } from '../constants/presets';
import type { PresetKey } from '../types/imageProcessing';

type PresetSelectorProps = {
  presets: readonly PresetOption[];
  selectedPreset: PresetKey;
  onSelectPreset: (preset: PresetKey) => void;
  disabled?: boolean;
};

const PresetSelector = ({
  presets,
  selectedPreset,
  onSelectPreset,
  disabled = false,
}: PresetSelectorProps) => {
  return (
    <View style={styles.container}>
      {presets.map(preset => {
        const isSelected = preset.key === selectedPreset;

        return (
          <Pressable
            key={preset.key}
            style={[
              styles.presetButton,
              isSelected && styles.presetButtonSelected,
              disabled && styles.disabled,
            ]}
            onPress={() => onSelectPreset(preset.key)}
            disabled={disabled}
          >
            <Text
              style={[
                styles.presetLabel,
                isSelected && styles.presetLabelSelected,
              ]}
            >
              {preset.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  presetButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3a',
    backgroundColor: '#1b1b1b',
    paddingVertical: 10,
    alignItems: 'center',
  },
  presetButtonSelected: {
    borderColor: '#f0f0f0',
    backgroundColor: '#2a2a2a',
  },
  presetLabel: {
    color: '#b5b5b5',
    fontSize: 13,
    fontWeight: '600',
  },
  presetLabelSelected: {
    color: '#f0f0f0',
  },
  disabled: {
    opacity: 0.6,
  },
});

export default PresetSelector;
