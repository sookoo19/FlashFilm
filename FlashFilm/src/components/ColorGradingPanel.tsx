import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AdjustmentSlider from './AdjustmentSlider';
import {
  ColorGradingState,
  TONE_GRADE_RANGES,
  ToneGradeState,
  ToneRange,
} from '../types/imageProcessing';

// ─── 定数 ─────────────────────────────────────────────
const TONE_LABELS: Record<ToneRange, string> = {
  shadows: 'シャドウ',
  midtones: 'ミッドトーン',
  highlights: 'ハイライト',
};
const TONE_RANGES: readonly ToneRange[] = ['shadows', 'midtones', 'highlights'];

// ─── ToneRangeSelector ────────────────────────────────
type ToneRangeSelectorProps = {
  selected: ToneRange;
  onSelect: (range: ToneRange) => void;
};

const ToneRangeSelector = memo(function ToneRangeSelector({
  selected,
  onSelect,
}: ToneRangeSelectorProps) {
  return (
    <View style={styles.selectorRow}>
      {TONE_RANGES.map(range => (
        <Pressable
          key={range}
          style={[
            styles.selectorChip,
            selected === range ? styles.selectorChipSelected : null,
          ]}
          onPress={() => onSelect(range)}
          accessibilityRole='radio'
          accessibilityState={{ checked: selected === range }}
        >
          <Text
            style={[
              styles.selectorLabel,
              selected === range ? styles.selectorLabelSelected : null,
            ]}
          >
            {TONE_LABELS[range]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
});

// ─── ToneGradeSliders  スライダーを持つので重いのでmemo化────────────────────────────────
type ToneGradeSlidersProps = {
  state: ToneGradeState;
  onChange: (key: keyof ToneGradeState, value: number) => void;
};

const ToneGradeSliders = memo(function ToneGradeSliders({
  state,
  onChange,
}: ToneGradeSlidersProps) {
  return (
    <View style={styles.slidersContainer}>
      {(Object.keys(TONE_GRADE_RANGES) as (keyof ToneGradeState)[]).map(key => (
        <AdjustmentSlider
          key={key}
          adjustmentKey={key}
          label={TONE_GRADE_RANGES[key].label}
          value={state[key]}
          min={TONE_GRADE_RANGES[key].min}
          max={TONE_GRADE_RANGES[key].max}
          step={1}
          onChange={(k, v) => onChange(key, v)}
        />
      ))}
    </View>
  );
});

// ─── ColorGradingPanel ────────────────────────────────
type ColorGradingPanelProps = {
  colorGrading: ColorGradingState;
  onColorGradingChange: (next: ColorGradingState) => void;
};

const ColorGradingPanel = memo(function ColorGradingPanel({
  colorGrading,
  onColorGradingChange,
}: ColorGradingPanelProps) {
  const [selectedRange, setSelectedRange] = useState<ToneRange>('shadows');

  function handleSliderChange(key: keyof ToneGradeState, value: number) {
    onColorGradingChange({
      ...colorGrading,
      [selectedRange]: {
        ...colorGrading[selectedRange],
        [key]: value,
      },
    });
  }
  return (
    <View style={styles.container}>
      <ToneRangeSelector selected={selectedRange} onSelect={setSelectedRange} />
      <ToneGradeSliders
        state={colorGrading[selectedRange]}
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
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorChip: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3a',
    backgroundColor: '#1b1b1b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorChipSelected: {
    borderColor: '#f0f0f0',
    backgroundColor: '#2a2a2a',
  },
  selectorLabel: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '500',
  },
  selectorLabelSelected: {
    color: '#f0f0f0',
    fontWeight: '600',
  },
  slidersContainer: {
    gap: 4,
  },
});

export default ColorGradingPanel;
