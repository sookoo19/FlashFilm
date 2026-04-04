import { memo, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

export type EditorTab = 'basic' | 'grading' | 'mixer';

type TabItemProps = {
  tab: EditorTab;
  label: string;
  isSelected: boolean;
  onSelect: (tab: EditorTab) => void;
  disabled: boolean;
};

const TAB_LABELS: Record<EditorTab, string> = {
  basic: '基本',
  grading: 'グレーディング',
  mixer: 'ミキサー',
};

const TabItem = memo(function TabItem({
  tab,
  label,
  isSelected,
  onSelect,
  disabled,
}: TabItemProps) {
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
  }, [isSelected]);

  return (
    <Pressable
      style={[
        styles.tabButton,
        isSelected ? styles.tabButtonSelected : null,
        disabled ? styles.disabled : null,
      ]}
      onPress={() => onSelect(tab)}
      disabled={disabled}
      accessibilityRole='tab'
      accessibilityState={{ selected: isSelected }}
    >
      <Text
        style={[styles.tabLabel, isSelected ? styles.tabLabelSelected : null]}
      >
        {label}
      </Text>
      <Animated.View
        style={[
          styles.indicator,
          { opacity: indicatorAnim, transform: [{ scaleX: indicatorAnim }] },
        ]}
      />
    </Pressable>
  );
});

type EditorTabBarProps = {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  disabled?: boolean;
};

const EditorTabBar = memo(function EditorTabBar({
  activeTab,
  onTabChange,
  disabled = false,
}: EditorTabBarProps) {
  return (
    <View style={styles.container}>
      {(Object.keys(TAB_LABELS) as EditorTab[]).map(tab => (
        <TabItem
          key={tab}
          tab={tab}
          label={TAB_LABELS[tab]}
          isSelected={tab === activeTab}
          onSelect={onTabChange}
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
  tabButton: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#3a3a3a',
    backgroundColor: '#1b1b1b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonSelected: {
    borderColor: '#f0f0f0',
    backgroundColor: '#2a2a2a',
  },
  tabLabel: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '500',
  },
  tabLabelSelected: {
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

export default EditorTabBar;
