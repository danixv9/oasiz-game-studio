import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import type { Game } from '@/lib/games';
import { Colors } from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = 180;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FeaturedGameProps {
  game: Game;
}

export function FeaturedGame({ game }: FeaturedGameProps) {
  const scale = useSharedValue(1);
  const iconBounce = useSharedValue(0);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    // Subtle floating animation on the icon
    iconBounce.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Shimmer effect across the card
    shimmer.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, [iconBounce, shimmer]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconBounce.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -CARD_WIDTH + shimmer.value * CARD_WIDTH * 2 },
      { rotate: '25deg' },
    ],
    opacity: 0.07,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { damping: 15 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/game/${game.id}`);
  }, [game.id]);

  return (
    <Animated.View entering={FadeInDown.duration(500).springify().damping(14)}>
      <AnimatedPressable
        style={[styles.card, pressStyle]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <LinearGradient
          colors={[game.gradient[0], game.gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Shimmer sweep */}
          <Animated.View style={[styles.shimmer, shimmerStyle]} />

          {/* Decorative elements */}
          <View style={[styles.decorCircle, styles.decorLarge]} />
          <View style={[styles.decorCircle, styles.decorSmall]} />

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.textContent}>
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>FEATURED</Text>
              </View>
              <Text style={styles.title}>{game.title}</Text>
              <Text style={styles.description} numberOfLines={2}>
                {game.description}
              </Text>
              <View style={styles.playButton}>
                <Text style={styles.playButtonText}>PLAY NOW</Text>
              </View>
            </View>
            <Animated.View style={[styles.iconContainer, iconStyle]}>
              <Text style={styles.icon}>{game.icon}</Text>
            </Animated.View>
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
    borderRadius: 24,
    overflow: 'hidden',
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  gradient: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: -50,
    width: 60,
    height: CARD_HEIGHT + 100,
    backgroundColor: '#fff',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorLarge: {
    width: 200,
    height: 200,
    top: -60,
    right: -40,
  },
  decorSmall: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -20,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  textContent: {
    flex: 1,
    marginRight: 16,
  },
  featuredBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  featuredBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 17,
    marginBottom: 12,
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  iconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
  },
});
