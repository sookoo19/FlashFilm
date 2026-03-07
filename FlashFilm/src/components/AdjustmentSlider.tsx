import { Pressable, StyleSheet, Text, View } from 'react-native';

type AdjustmentSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (nextValue: number) => void;
  disabled?: boolean;
};

const toFixedValue = (value: number) => Number(value.toFixed(2));

const AdjustmentSlider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
}: AdjustmentSliderProps) => {
  const isDecrementDisabled = disabled || value <= min;
  const isIncrementDisabled = disabled || value >= max;

  const handleDecrement = () => {
    const nextValue = Math.max(min, value - step);
    onChange(toFixedValue(nextValue));
  };

  const handleIncrement = () => {
    const nextValue = Math.min(max, value + step);
    onChange(toFixedValue(nextValue));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.valueArea}>
        <Pressable
          style={[
            styles.adjustButton,
            isDecrementDisabled && styles.adjustButtonDisabled,
          ]}
          onPress={handleDecrement}
          disabled={isDecrementDisabled}
        >
          <Text style={styles.adjustButtonText}>-</Text>
        </Pressable>

        <Text style={styles.valueText}>{value.toFixed(2)}</Text>

        <Pressable
          style={[
            styles.adjustButton,
            isIncrementDisabled && styles.adjustButtonDisabled,
          ]}
          onPress={handleIncrement}
          disabled={isIncrementDisabled}
        >
          <Text style={styles.adjustButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  label: {
    color: '#f0f0f0',
    fontSize: 13,
    fontWeight: '600',
  },
  valueArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3a',
    backgroundColor: '#1f1f1f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonDisabled: {
    opacity: 0.5,
  },
  adjustButtonText: {
    color: '#f0f0f0',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  valueText: {
    color: '#bbb',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    minWidth: 42,
    textAlign: 'center',
  },
});

export default AdjustmentSlider;
