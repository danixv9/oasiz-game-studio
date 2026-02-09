import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getGameById, getGameUrl } from '@/lib/games';
import { BRIDGE_SCRIPT, parseBridgeMessage } from '@/lib/bridge';
import { saveHighScore, incrementPlayCount } from '@/lib/storage';
import { Colors } from '@/constants/colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const HAPTIC_MAP: Record<string, () => Promise<void>> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = getGameById(id);
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);
  const [showBackButton, setShowBackButton] = useState(true);

  const backButtonOpacity = useSharedValue(1);
  const backScale = useSharedValue(1);

  // Track play count
  useEffect(() => {
    if (game) incrementPlayCount(game.id);
  }, [game]);

  // Auto-hide back button after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      backButtonOpacity.value = withTiming(0.3, { duration: 800 });
    }, 4000);
    return () => clearTimeout(timer);
  }, [backButtonOpacity]);

  const handleMessage = useCallback(
    async (event: WebViewMessageEvent) => {
      const msg = parseBridgeMessage(event.nativeEvent.data);
      if (!msg || !game) return;

      switch (msg.type) {
        case 'HAPTIC': {
          const type = (msg.payload.type as string) || 'medium';
          const hapticFn = HAPTIC_MAP[type];
          if (hapticFn) hapticFn();
          break;
        }
        case 'SUBMIT_SCORE': {
          const score = msg.payload.score as number;
          if (typeof score === 'number') {
            const isNewHigh = await saveHighScore(game.id, score);
            if (isNewHigh) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
          break;
        }
        case 'SHARE_ROOM': {
          const code = msg.payload.code as string;
          if (code) {
            Share.share({
              message: `Join my game of ${game.title}! Room code: ${code}`,
            });
          }
          break;
        }
        case 'GAME_READY':
          setLoading(false);
          break;
        case 'GAME_OVER':
          // Could show interstitial, prompt replay, etc.
          break;
      }
    },
    [game]
  );

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  const handleBackPressIn = useCallback(() => {
    backScale.value = withSpring(0.85, { damping: 15 });
    backButtonOpacity.value = withTiming(1, { duration: 100 });
  }, [backScale, backButtonOpacity]);

  const handleBackPressOut = useCallback(() => {
    backScale.value = withSpring(1, { damping: 12 });
  }, [backScale]);

  const handleTouchStart = useCallback(() => {
    // Briefly show back button on any touch
    backButtonOpacity.value = withTiming(1, { duration: 150 });
    const timer = setTimeout(() => {
      backButtonOpacity.value = withTiming(0.3, { duration: 800 });
    }, 2000);
    return () => clearTimeout(timer);
  }, [backButtonOpacity]);

  const backAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backButtonOpacity.value,
    transform: [{ scale: backScale.value }],
  }));

  if (!game) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Game not found</Text>
        <Pressable onPress={handleBack}>
          <Text style={styles.errorLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const gameUrl = getGameUrl(game);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Game WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: gameUrl }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={BRIDGE_SCRIPT}
        onMessage={handleMessage}
        onLoadEnd={() => setLoading(false)}
        onTouchStart={handleTouchStart}
        // Performance
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        // Prevent zoom and bouncing
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        // Remove all chrome
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        // iOS: prevent data detectors
        dataDetectorTypes="none"
        // Android: hardware acceleration
        androidLayerType="hardware"
        // Disable text selection
        textInteractionEnabled={false}
      />

      {/* Loading overlay */}
      {loading && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(300)}
          style={styles.loadingOverlay}
        >
          <LinearGradient
            colors={[game.gradient[0], game.gradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.loadingGradient}
          >
            <Text style={styles.loadingIcon}>{game.icon}</Text>
            <Text style={styles.loadingTitle}>{game.title}</Text>
            <ActivityIndicator
              size="small"
              color="rgba(255,255,255,0.8)"
              style={styles.loadingSpinner}
            />
          </LinearGradient>
        </Animated.View>
      )}

      {/* Back button */}
      <AnimatedPressable
        style={[
          styles.backButton,
          { top: Math.max(insets.top + 8, 16) },
          backAnimatedStyle,
        ]}
        onPress={handleBack}
        onPressIn={handleBackPressIn}
        onPressOut={handleBackPressOut}
        hitSlop={16}
      >
        <View style={styles.backButtonInner}>
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </View>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 24,
  },
  loadingSpinner: {
    marginTop: 8,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 20,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorLink: {
    color: Colors.purple,
    fontSize: 16,
    fontWeight: '600',
  },
});
