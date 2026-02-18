import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
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
import { buildInjectedScript, parseBridgeMessage } from '@/lib/bridge';
import { getSettings, saveHighScore, incrementPlayCount, type AppSettings } from '@/lib/storage';
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
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [injectedScript, setInjectedScript] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gameOver, setGameOver] = useState<{ score?: number } | null>(null);

  const backButtonOpacity = useSharedValue(1);
  const backScale = useSharedValue(1);

  // Track play count
  useEffect(() => {
    if (game) incrementPlayCount(game.id);
  }, [game]);

  useEffect(() => {
    (async () => {
      const settings = await getSettings();
      setAppSettings(settings);
      setInjectedScript(
        buildInjectedScript({
          music: settings.musicEnabled,
          fx: settings.soundEnabled,
          haptics: settings.hapticsEnabled,
        })
      );
    })();
  }, []);

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
          if (appSettings && !appSettings.hapticsEnabled) break;
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
          setLoading(false);
          setGameOver({
            score: typeof msg.payload.score === 'number' ? (msg.payload.score as number) : undefined,
          });
          break;
      }
    },
    [game, appSettings]
  );

  const handleBack = useCallback(() => {
    if (appSettings?.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [appSettings]);

  const handleBackPressIn = useCallback(() => {
    if (appSettings?.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    backScale.value = withSpring(0.85, { damping: 15 });
    backButtonOpacity.value = withTiming(1, { duration: 100 });
  }, [backScale, backButtonOpacity, appSettings]);

  const handleBackPressOut = useCallback(() => {
    backScale.value = withSpring(1, { damping: 12 });
  }, [backScale]);

  const handleRetry = useCallback(() => {
    if (appSettings?.hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLoadError(null);
    setGameOver(null);
    setLoading(true);
    webViewRef.current?.reload();
  }, [appSettings]);

  const handlePlayAgain = useCallback(() => {
    if (appSettings?.hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setGameOver(null);
    setLoading(true);
    webViewRef.current?.reload();
  }, [appSettings]);

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
      {injectedScript && (
        <WebView
          ref={webViewRef}
          source={{ uri: gameUrl }}
          style={styles.webview}
          injectedJavaScriptBeforeContentLoaded={injectedScript}
          onMessage={handleMessage}
          onLoadEnd={() => setLoading(false)}
          onError={(e) => {
            setLoading(false);
            setLoadError(String(e.nativeEvent?.description || 'Failed to load game'));
          }}
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
      )}

      {/* Loading overlay */}
      {(loading || !injectedScript) && (
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
            <Text style={styles.loadingHint}>
              {Platform.OS === 'ios' ? 'Tap to focus' : 'Loading...'}
            </Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Error overlay */}
      {!!loadError && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(300)}
          style={styles.errorOverlay}
        >
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={26} color="#fff" />
            <Text style={styles.errorTitle}>Game failed to load</Text>
            <Text style={styles.errorMessage} numberOfLines={4}>
              {loadError}
            </Text>
            <View style={styles.errorActions}>
              <Pressable onPress={handleRetry} style={styles.primaryBtn}>
                <Ionicons name="refresh" size={16} color="#0B0B1E" />
                <Text style={styles.primaryBtnText}>Retry</Text>
              </Pressable>
              <Pressable onPress={handleBack} style={styles.secondaryBtn}>
                <Ionicons name="arrow-back" size={16} color="#fff" />
                <Text style={styles.secondaryBtnText}>Back</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Game over overlay */}
      {!!gameOver && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(300)}
          style={styles.gameOverOverlay}
        >
          <LinearGradient
            colors={[game.gradient[0], game.gradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gameOverGradient}
          >
            <View style={styles.gameOverCard}>
              <Text style={styles.gameOverTitle}>Game Over</Text>
              {typeof gameOver.score === 'number' && (
                <View style={styles.gameOverScoreRow}>
                  <Text style={styles.gameOverScoreLabel}>Score</Text>
                  <Text style={styles.gameOverScoreValue}>
                    {Math.max(0, Math.floor(gameOver.score)).toLocaleString()}
                  </Text>
                </View>
              )}
              <View style={styles.gameOverActions}>
                <Pressable onPress={handlePlayAgain} style={styles.primaryBtn}>
                  <Ionicons name="play" size={16} color="#0B0B1E" />
                  <Text style={styles.primaryBtnText}>Play Again</Text>
                </Pressable>
                <Pressable onPress={handleBack} style={styles.secondaryBtn}>
                  <Ionicons name="grid-outline" size={16} color="#fff" />
                  <Text style={styles.secondaryBtnText}>Arcade</Text>
                </Pressable>
              </View>
            </View>
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
  loadingHint: {
    marginTop: 16,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
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
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 18,
  },
  errorCard: {
    width: '100%',
    borderRadius: 20,
    padding: 18,
    backgroundColor: 'rgba(20,20,30,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  errorTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  errorActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: {
    color: '#0B0B1E',
    fontWeight: '900',
    fontSize: 14,
  },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  secondaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 25,
  },
  gameOverGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  gameOverCard: {
    width: '100%',
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  gameOverTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  gameOverScoreRow: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  gameOverScoreLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
  },
  gameOverScoreValue: {
    marginTop: 6,
    fontSize: 28,
    color: '#fff',
    fontWeight: '900',
  },
  gameOverActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
});
