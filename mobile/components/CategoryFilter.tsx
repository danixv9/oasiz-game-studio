import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  ScrollView,
  Pressable,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
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

export type CatalogFilterKey = GameCategory | 'favorites';

interface CategoryFilterProps {
  selected: CatalogFilterKey;
  onSelect: (category: CatalogFilterKey) => void;
  favoritesEnabled?: boolean;
}

export function CategoryFilter({
  selected,
  onSelect,
  favoritesEnabled = true,
}: CategoryFilterProps) {
  const filters = useMemo(() => {
    if (!favoritesEnabled) return CATEGORIES as { key: CatalogFilterKey; label: string }[];

    const base = CATEGORIES.filter((c) => c.key !== 'all');
    return [
      { key: 'all' as const, label: 'All Games' },
      { key: 'favorites' as const, label: 'Favorites' },
      ...base,
    ];
  }, [favoritesEnabled]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {filters.map((cat, index) => (
        <CategoryPill
          key={cat.key}
          label={cat.label}
          isSelected={selected === cat.key}
          onPress={() => onSelect(cat.key)}
          index={index}
          icon={cat.key === 'favorites' ? (selected === 'favorites' ? 'heart' : 'heart-outline') : undefined}
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
  icon?: keyof typeof Ionicons.glyphMap;
}

function CategoryPill({ label, isSelected, onPress, index, icon }: CategoryPillProps) {
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
            <View style={styles.pillRow}>
              {icon && <Ionicons name={icon} size={14} color="#fff" />}
              <Text style={[styles.pillText, styles.pillTextSelected]}>{label}</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.pill, styles.pillInactive]}>
            <View style={styles.pillRow}>
              {icon && <Ionicons name={icon} size={14} color={Colors.textSecondary} />}
              <Text style={styles.pillText}>{label}</Text>
            </View>
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
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
