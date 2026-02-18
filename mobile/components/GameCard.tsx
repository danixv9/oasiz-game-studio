import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  FadeInDown,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import type { Game } from '@/lib/games';
import { Colors } from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 48 - CARD_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.25;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface GameCardProps {
  game: Game;
  index: number;
  highScore?: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function GameCard({
  game,
  index,
  highScore,
  isFavorite = false,
  onToggleFavorite,
}: GameCardProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressed.value, [0, 1], [0, 0.6]),
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    pressed.value = withTiming(1, { duration: 150 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [scale, pressed]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    pressed.value = withTiming(0, { duration: 200 });
  }, [scale, pressed]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/game/${game.id}`);
  }, [game.id]);

  const handleFavoritePress = useCallback(
    (e: any) => {
      if (typeof e?.stopPropagation === 'function') e.stopPropagation();
      Haptics.selectionAsync();
      onToggleFavorite?.();
    },
    [onToggleFavorite],
  );

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60)
        .duration(400)
        .springify()
        .damping(14)}
    >
      <AnimatedPressable
        style={[styles.card, animatedStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        {/* Gradient background */}
        <LinearGradient
          colors={[game.gradient[0], game.gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Inner glow on press */}
          <Animated.View style={[styles.pressGlow, glowStyle]} />

          {/* Glass overlay for depth */}
          <View style={styles.glassOverlay} />

          {/* Decorative circles */}
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />

          {/* Badges */}
          {game.isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}

          {game.isMultiplayer && (
            <View style={[styles.newBadge, styles.multiBadge]}>
              <Text style={styles.newBadgeText}>MULTI</Text>
            </View>
          )}

          {/* Game icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{game.icon}</Text>
          </View>

          {/* Game info */}
          <View style={styles.infoContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {game.title}
              </Text>
              <Pressable
                onPress={handleFavoritePress}
                hitSlop={10}
                style={[styles.favoriteBtn, isFavorite && styles.favoriteBtnOn]}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={16}
                  color={isFavorite ? '#fff' : 'rgba(255, 255, 255, 0.9)'}
                />
              </Pressable>
            </View>
            {highScore !== undefined && highScore > 0 && (
              <Text style={styles.score}>Best: {highScore.toLocaleString()}</Text>
            )}
          </View>
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  gradient: {
    flex: 1,
    justifyContent: 'flex-end',
    position: 'relative',
    overflow: 'hidden',
  },
  pressGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  decorCircle1: {
    width: CARD_WIDTH * 0.8,
    height: CARD_WIDTH * 0.8,
    top: -CARD_WIDTH * 0.3,
    right: -CARD_WIDTH * 0.2,
  },
  decorCircle2: {
    width: CARD_WIDTH * 0.5,
    height: CARD_WIDTH * 0.5,
    bottom: -CARD_WIDTH * 0.15,
    left: -CARD_WIDTH * 0.15,
  },
  iconContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
  },
  icon: {
    fontSize: 52,
  },
  infoContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  favoriteBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  favoriteBtnOn: {
    backgroundColor: 'rgba(236, 72, 153, 0.35)',
    borderColor: 'rgba(236, 72, 153, 0.55)',
  },
  score: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  newBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Colors.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 10,
  },
  multiBadge: {
    backgroundColor: Colors.cyan,
    right: undefined,
    left: 10,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
