import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Switch,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '@/constants/colors';
import { GAMES } from '@/lib/games';
import {
  getSettings,
  saveSettings,
  getAllHighScores,
  getPlayCounts,
  type AppSettings,
} from '@/lib/storage';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<AppSettings>({
    hapticsEnabled: true,
    soundEnabled: true,
    musicEnabled: true,
  });
  const [totalPlays, setTotalPlays] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setSettings(s);

      const plays = await getPlayCounts();
      setTotalPlays(Object.values(plays).reduce((a, b) => a + b, 0));

      const scores = await getAllHighScores();
      setTotalScore(Object.values(scores).reduce((a, b) => a + b, 0));
    })();
  }, []);

  const updateSetting = useCallback(
    (key: keyof AppSettings, value: boolean) => {
      const updated = { ...settings, [key]: value };
      setSettings(updated);
      saveSettings(updated);
      if (key === 'hapticsEnabled' && value) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    [settings]
  );

  const appVersion =
    Constants.expoConfig?.version || Constants.manifest2?.extra?.expoClient?.version || '1.0.0';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          style={styles.header}
        >
          <Text style={styles.title}>Settings</Text>
        </Animated.View>

        {/* Stats Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statsCard}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{GAMES.length}</Text>
                <Text style={styles.statLabel}>Games</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalPlays.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Plays</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalScore.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Score</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Preferences */}
        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.section}>
            <SettingRow
              icon="hand-left-outline"
              label="Haptic Feedback"
              description="Vibrations during gameplay"
              value={settings.hapticsEnabled}
              onToggle={(v) => updateSetting('hapticsEnabled', v)}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="volume-medium-outline"
              label="Sound Effects"
              description="In-game sound effects"
              value={settings.soundEnabled}
              onToggle={(v) => updateSetting('soundEnabled', v)}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="musical-notes-outline"
              label="Music"
              description="Background music"
              value={settings.musicEnabled}
              onToggle={(v) => updateSetting('musicEnabled', v)}
            />
          </View>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInDown.delay(300).duration(400).springify()}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.section}>
            <InfoRow icon="information-circle-outline" label="Version" value={appVersion} />
            <View style={styles.separator} />
            <InfoRow
              icon="logo-github"
              label="Source"
              value="Open Source"
              onPress={() => Linking.openURL('https://github.com/oasiz-ai')}
            />
            <View style={styles.separator} />
            <InfoRow
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              value=""
              onPress={() => Linking.openURL('https://oasiz.ai/privacy')}
            />
          </View>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(400)}
          style={styles.footer}
        >
          <Text style={styles.footerText}>Made with love by Oasiz</Text>
          <Text style={styles.footerSubtext}>
            {Platform.OS === 'ios' ? 'iOS' : 'Android'} v{appVersion}
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  description,
  value,
  onToggle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={22} color={Colors.purple} />
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.surface, true: Colors.purpleDark }}
        thumbColor={value ? Colors.purple : Colors.textMuted}
        ios_backgroundColor={Colors.surface}
      />
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={22} color={Colors.purple} />
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {value ? (
        <Text style={styles.infoValue}>{value}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      )}
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  statsCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  section: {
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  settingDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginLeft: 52,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    opacity: 0.5,
    marginTop: 4,
  },
});
