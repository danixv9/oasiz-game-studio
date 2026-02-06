import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  ScrollView,
  Pressable,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInRight,
} from 'react-native-reanimated';
import { Colors, Gradients } from '@/constants/colors';
import type { GameCategory } from '@/lib/games';
import { CATEGORIES } from '@/lib/games';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CategoryFilterProps {
  selected: GameCategory;
  onSelect: (category: GameCategory) => void;
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((cat, index) => (
        <CategoryPill
          key={cat.key}
          label={cat.label}
          isSelected={selected === cat.key}
          onPress={() => onSelect(cat.key)}
          index={index}
        />
      ))}
    </ScrollView>
  );
}

interface CategoryPillProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}

function CategoryPill({ label, isSelected, onPress, index }: CategoryPillProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    onPress();
  }, [onPress]);

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 50).duration(300).springify()}
    >
      <AnimatedPressable
        style={animatedStyle}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        {isSelected ? (
          <LinearGradient
            colors={[...Gradients.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.pill}
          >
            <Text style={[styles.pillText, styles.pillTextSelected]}>
              {label}
            </Text>
          </LinearGradient>
        ) : (
          <View style={[styles.pill, styles.pillInactive]}>
            <Text style={styles.pillText}>{label}</Text>
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  pillInactive: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pillTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
});
