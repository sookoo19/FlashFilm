import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  // useState initializer so Animated.Value is stable without accessing .current in render
  const [decrementScale] = useState(() => new Animated.Value(1));
  const [incrementScale] = useState(() => new Animated.Value(1));

  const pressIn = (anim: Animated.Value) =>
    Animated.spring(anim, {
      toValue: 0.85,
      speed: 60,
      bounciness: 0,
      useNativeDriver: true,
    }).start();

  const pressOut = (anim: Animated.Value) =>
    Animated.spring(anim, {
      toValue: 1,
      speed: 18,
      bounciness: 6,
      useNativeDriver: true,
    }).start();

  const handleDecrement = () => {
    if (isDecrementDisabled) return;
    const nextValue = Math.max(min, value - step);
    onChange(toFixedValue(nextValue));
  };

  const handleIncrement = () => {
    if (isIncrementDisabled) return;
    const nextValue = Math.min(max, value + step);
    onChange(toFixedValue(nextValue));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.valueArea}>
        <AnimatedPressable
          style={[
            styles.adjustButton,
            isDecrementDisabled && styles.adjustButtonDisabled,
            { transform: [{ scale: decrementScale }] },
          ]}
          onPress={handleDecrement}
          onPressIn={() => !isDecrementDisabled && pressIn(decrementScale)}
          onPressOut={() => pressOut(decrementScale)}
          disabled={isDecrementDisabled}
          accessibilityLabel={`${label}を減らす`}
          accessibilityRole='button'
          accessibilityState={{ disabled: isDecrementDisabled }}
        >
          <Text style={styles.adjustButtonText}>-</Text>
        </AnimatedPressable>

        <Text style={styles.valueText}>{value.toFixed(2)}</Text>

        <AnimatedPressable
          style={[
            styles.adjustButton,
            isIncrementDisabled && styles.adjustButtonDisabled,
            { transform: [{ scale: incrementScale }] },
          ]}
          onPress={handleIncrement}
          onPressIn={() => !isIncrementDisabled && pressIn(incrementScale)}
          onPressOut={() => pressOut(incrementScale)}
          disabled={isIncrementDisabled}
          accessibilityLabel={`${label}を増やす`}
          accessibilityRole='button'
          accessibilityState={{ disabled: isIncrementDisabled }}
        >
          <Text style={styles.adjustButtonText}>+</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    color: '#f0f0f0',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  valueArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
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
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 18,
  },
  valueText: {
    color: '#cccccc',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    minWidth: 48,
    textAlign: 'center',
  },
});

export default AdjustmentSlider;
