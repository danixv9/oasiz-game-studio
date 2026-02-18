import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GameCard } from '@/components/GameCard';
import { FeaturedGame } from '@/components/FeaturedGame';
import { CategoryFilter, type CatalogFilterKey } from '@/components/CategoryFilter';
import { Colors } from '@/constants/colors';
import {
  GAMES,
  getFeaturedGames,
  getGamesByCategory,
  type GameCategory,
} from '@/lib/games';
import { getAllHighScores, getFavorites, toggleFavorite } from '@/lib/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<CatalogFilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const featured = useMemo(() => getFeaturedGames(), []);
  const games = useMemo(() => {
    if (category === 'favorites') {
      return GAMES.filter((g) => favorites.has(g.id));
    }
    return getGamesByCategory(category as GameCategory);
  }, [category, favorites]);

  const loadScores = useCallback(async () => {
    const scores = await getAllHighScores();
    setHighScores(scores);
  }, []);

  const loadFavorites = useCallback(async () => {
    const favs = await getFavorites();
    setFavorites(new Set(favs));
  }, []);

  useEffect(() => {
    loadScores();
    loadFavorites();
  }, [loadScores, loadFavorites]);

  // Rotate featured game
  useEffect(() => {
    if (featured.length <= 1) return;
    const timer = setInterval(() => {
      setFeaturedIndex((i) => (i + 1) % featured.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [featured.length]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadScores();
    await loadFavorites();
    setRefreshing(false);
  }, [loadScores, loadFavorites]);

  const onToggleFavorite = useCallback(async (gameId: string) => {
    const added = await toggleFavorite(gameId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (added) next.add(gameId);
      else next.delete(gameId);
      return next;
    });
  }, []);

  const currentFeatured = featured[featuredIndex];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.purple}
            progressBackgroundColor={Colors.surface}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          style={styles.header}
        >
          <View>
            <Text style={styles.brand}>OASIZ</Text>
            <Text style={styles.subtitle}>Arcade</Text>
          </View>
          <View style={styles.gameCount}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gameCountBadge}
            >
              <Text style={styles.gameCountText}>
                {GAMES.length} games
              </Text>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Featured Game */}
        {currentFeatured && (
          <View style={styles.featuredSection}>
            <FeaturedGame
              key={currentFeatured.id}
              game={currentFeatured}
            />
            {/* Featured dots */}
            {featured.length > 1 && (
              <View style={styles.dots}>
                {featured.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === featuredIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Category Filter */}
        <CategoryFilter selected={category} onSelect={setCategory} />

        {/* Section title */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.sectionHeader}
        >
          <Text style={styles.sectionTitle}>
            {category === 'all'
              ? 'All Games'
              : category === 'favorites'
                ? 'Favorites'
                : category.charAt(0).toUpperCase() + category.slice(1)}
          </Text>
          <Text style={styles.sectionCount}>{games.length}</Text>
        </Animated.View>

        {/* Game Grid */}
        <View style={styles.grid}>
          {category === 'favorites' && games.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptyText}>
                Tap the heart on any game card to save it here.
              </Text>
            </View>
          )}
          {games.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              index={index}
              highScore={highScores[game.id]}
              isFavorite={favorites.has(game.id)}
              onToggleFavorite={() => onToggleFavorite(game.id)}
            />
          ))}
          {/* Spacer for odd number of games */}
          {games.length % 2 === 1 && <View style={styles.gridSpacer} />}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 48 - CARD_GAP) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  brand: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.purple,
    letterSpacing: 2,
    marginTop: -2,
  },
  gameCount: {
    alignItems: 'flex-end',
  },
  gameCountBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  gameCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  featuredSection: {
    marginTop: 12,
    marginBottom: 4,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
    opacity: 0.4,
  },
  dotActive: {
    backgroundColor: Colors.purple,
    opacity: 1,
    width: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 18,
    gap: CARD_GAP,
    paddingTop: 8,
  },
  gridSpacer: {
    width: CARD_WIDTH,
  },
  emptyState: {
    width: '100%',
    paddingHorizontal: 8,
    paddingVertical: 16,
    marginTop: 6,
    marginBottom: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.glass,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
