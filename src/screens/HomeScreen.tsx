import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { Flame, Smile, Meh, Frown, Utensils, Gamepad2, Dumbbell, Pencil, Zap, Check, Lock, Astroid } from 'lucide-react-native';
import { WolfImages, WolfByMood, SkinImages } from '@/assets/images';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontSize, ColorPalette } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import { HomeState, DEFAULT_HOME_STATE, PetState, DEFAULT_PET_STATE, Challenge } from '@/types';
import { getHomeState, addPoints } from '@/services/homeService';
import {
  getPetState, feedPet, playWithPet, trainPet, updatePetName,
  PET_MOOD_MULTIPLIERS, LEVEL_PERKS, getNextPerk,
  TRAIN_COST_POINTS, PLAY_ENERGY_COST,
} from '@/services/petService';
import { getSettings } from '@/services/settingsService';
import { useTranslation } from '@/i18n';
import { getLoadout } from '@/services/inventoryService';
import { getUnlockedCount, getTotalCount } from '@/services/badgeService';
import { getCurrentWeekChallenges } from '@/services/challengeService';
import { eventBus, Events } from '@/services/eventBus';

type LucideIcon = React.ComponentType<{ size?: number; color?: string }>;
const MOOD_ICONS: Record<string, LucideIcon> = {
  happy: Smile,
  content: Smile,
  neutral: Meh,
  sad: Frown,
  hungry: Frown,
};

const MOOD_COLORS: Record<string, string> = {
  happy: '#22c55e',
  content: '#84cc16',
  neutral: '#94a3b8',
  sad: '#f59e0b',
  hungry: '#ef4444',
};

const DAILY_GOAL = 200;

const StatBar = ({
  label, value, color, colors, styles,
}: {
  label: string; value: number; color: string; colors: ColorPalette; styles: ReturnType<typeof makeStyles>;
}) => (
  <View style={styles.statBarRow}>
    <Text style={[styles.statBarLabel, { color: colors.textSecondary }]}>{label}</Text>
    <View style={[styles.thinTrack, { flex: 1 }]}>
      <View style={[styles.thinFill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
    <Text style={[styles.statBarValue, { color: colors.textSecondary }]}>{value}</Text>
  </View>
);

const HomeScreen = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [home, setHome] = useState<HomeState>(DEFAULT_HOME_STATE);
  const [pet, setPet] = useState<PetState>(DEFAULT_PET_STATE);
  const [devMode, setDevMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [badgeCount, setBadgeCount] = useState({ unlocked: 0, total: 0 });
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [equippedSkinId, setEquippedSkinId] = useState<string | null>(null);
  const [petNameInput, setPetNameInput] = useState('');
  const [editingPetName, setEditingPetName] = useState(false);

  const loadData = useCallback(async () => {
    const [h, p, s, unlocked, ch, lo] = await Promise.all([
      getHomeState(),
      getPetState(),
      getSettings(),
      getUnlockedCount(),
      getCurrentWeekChallenges(),
      getLoadout(),
    ]);
    setHome(h);
    setPet(p);
    setDevMode(s.developerMode);
    setBadgeCount({ unlocked, total: getTotalCount() });
    setChallenges(ch);
    setEquippedSkinId(lo.skin);
    setPetNameInput(p.name);
  }, []);

  const handleFeedPet = async () => { await feedPet(); await loadData(); };
  const handlePlayPet = async () => { await playWithPet(); await loadData(); };
  const handleTrain = async () => {
    const result = await trainPet();
    if (!result) {
      Alert.alert(t.profile.notEnoughPoints, t.profile.trainCostMsg(TRAIN_COST_POINTS));
      return;
    }
    await loadData();
    Alert.alert(t.profile.trained, t.profile.xpEarned(result.xpGained));
  };
  const handleSavePetName = async () => {
    if (petNameInput.trim()) {
      await updatePetName(petNameInput.trim());
      setEditingPetName(false);
    }
  };

  useEffect(() => {
    loadData();
    const subs = [
      eventBus.on(Events.HOME_STATE_CHANGED, loadData),
      eventBus.on(Events.PET_STATE_CHANGED, loadData),
      eventBus.on(Events.BADGES_CHANGED, loadData),
      eventBus.on(Events.CHALLENGES_CHANGED, loadData),
      eventBus.on(Events.INVENTORY_CHANGED, loadData),
      eventBus.on(Events.SETTINGS_CHANGED, loadData),
    ];
    return () => subs.forEach((u) => u());
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleDevReset = () => {
    Alert.alert(t.home.resetTitle, t.home.resetMsg, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.reset,
        style: 'destructive',
        onPress: async () => {
          const { clearAll } = await import('@/services/storage');
          await clearAll();
          await loadData();
        },
      },
    ]);
  };

  const dailyPct = Math.min(home.todayPoints / DAILY_GOAL, 1);
  const xpPct = pet.xpToNextLevel > 0 ? pet.xp / pet.xpToNextLevel : 0;
  const petImage = (equippedSkinId && SkinImages[equippedSkinId])
    ? SkinImages[equippedSkinId]
    : (WolfByMood[pet.mood] ?? WolfImages.standing);
  const moodMult = PET_MOOD_MULTIPLIERS[pet.mood];
  const MoodIcon = MOOD_ICONS[pet.mood] ?? Meh;
  const moodColor = MOOD_COLORS[pet.mood] ?? colors.textSecondary;
  const nextPerk = getNextPerk(pet.level);
  const nextPerkT = nextPerk
    ? (t.profile.perks && t.profile.perks[nextPerk.id]) || { label: nextPerk.id, description: '' }
    : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroBlob} />

          <View style={styles.heroTopRow}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroGreeting}>{t.home.greeting}</Text>
              <Text style={styles.heroPoints}>{home.totalPoints.toLocaleString()}</Text>
              <Text style={styles.heroPointsLabel}>{t.home.totalPoints}</Text>
              <View style={styles.streakChip}>
                <Flame size={14} color={colors.accent} />
                <Text style={styles.streakChipText}>{home.streak} {t.home.dayStreak}</Text>
              </View>
            </View>
            <View style={styles.heroRight}>
              <Image source={petImage} style={styles.heroPetImage} resizeMode="contain" />
              <View style={[styles.moodBadge, { backgroundColor: moodMult >= 1 ? colors.primary + 'DD' : colors.error + 'DD' }]}>
                <MoodIcon size={12} color="#fff" />
                <Text style={styles.moodBadgeText}>
                  {moodMult >= 1 ? `+${Math.round((moodMult - 1) * 100)}%` : `${Math.round((moodMult - 1) * 100)}%`}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.heroPetNameRow}>
            {editingPetName ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <TextInput
                  style={[styles.inlineInput, { flex: 1 }]}
                  value={petNameInput}
                  onChangeText={setPetNameInput}
                  onSubmitEditing={handleSavePetName}
                />
                <TouchableOpacity onPress={handleSavePetName}>
                  <Text style={styles.linkText}>{t.common.save}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingPetName(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.petName}>{pet.name}</Text>
                <Pencil size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <View style={[styles.moodChip, { backgroundColor: moodColor + '22', borderColor: moodColor + '55' }]}>
              <View style={[styles.moodDot, { backgroundColor: moodColor }]} />
              <Text style={[styles.moodChipText, { color: moodColor }]}>
                {((t.home.moods as Record<string, string>)[pet.mood] ?? pet.mood).toUpperCase()} · ×{PET_MOOD_MULTIPLIERS[pet.mood].toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={{ marginTop: 2 }}>
            <View style={styles.barRowHeader}>
              <Text style={styles.barLabel}>{t.home.xp}  Lv. {pet.level}</Text>
              <Text style={styles.barValue}>{pet.xp} / {pet.xpToNextLevel}</Text>
            </View>
            <View style={styles.thinTrack}>
              <View style={[styles.thinFill, { width: `${xpPct * 100}%`, backgroundColor: colors.accent }]} />
            </View>
          </View>

          <View style={{ marginTop: 8, gap: 6 }}>
            <StatBar label={t.profile.hunger} value={pet.hunger}
              color={pet.hunger < 30 ? colors.error : pet.hunger < 60 ? colors.warning : colors.success}
              colors={colors} styles={styles} />
            <StatBar label={t.profile.energy} value={pet.energy}
              color={pet.energy < 30 ? colors.error : pet.energy < 60 ? colors.warning : colors.info}
              colors={colors} styles={styles} />
            <StatBar label={t.profile.fun} value={pet.fun}
              color={pet.fun < 30 ? colors.error : pet.fun < 60 ? colors.warning : '#a855f7'}
              colors={colors} styles={styles} />
          </View>

          <View style={{ flexDirection: 'row', marginTop: 14, gap: 8 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.success + '22', borderColor: colors.success + '55' }]}
              onPress={handleFeedPet}
            >
              <Utensils size={20} color={colors.success} />
              <Text style={[styles.actionBtnLabel, { color: colors.success }]}>{t.profile.feed}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.info + '22', borderColor: colors.info + '55' }]}
              onPress={handlePlayPet}
            >
              <Gamepad2 size={20} color={colors.info} />
              <Text style={[styles.actionBtnLabel, { color: colors.info }]}>{t.profile.play}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={[styles.actionBtnCost, { color: colors.info }]}>-{PLAY_ENERGY_COST}</Text>
                <Zap size={10} color={colors.info} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.accent + '22', borderColor: colors.accent + '55' }]}
              onPress={handleTrain}
            >
              <Dumbbell size={20} color={colors.accent} />
              <Text style={[styles.actionBtnLabel, { color: colors.accent }]}>{t.profile.train}</Text>
              <Text style={[styles.actionBtnCost, { color: colors.accent }]}>{TRAIN_COST_POINTS} {t.common.pts}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={styles.subSectionTitle}>{t.profile.levelPerks}</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {LEVEL_PERKS.map((perk) => {
                const unlocked = pet.level >= perk.requiredLevel;
                const perkT = (t.profile.perks && t.profile.perks[perk.id]) || { label: perk.id, description: '' };
                return (
                  <View key={perk.requiredLevel} style={[styles.perkRow, !unlocked && { opacity: 0.4 }]}>
                    <View style={[styles.perkIconBox, { backgroundColor: unlocked ? colors.primary + '22' : colors.divider }]}>
                      {unlocked
                        ? <Check size={16} color={colors.primary} />
                        : <Text style={styles.perkIconText}>{perk.requiredLevel}</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.perkLabel, !unlocked && { color: colors.textSecondary }]}>{perkT.label}</Text>
                      <Text style={styles.perkDesc}>{perkT.description}</Text>
                    </View>
                    {unlocked && (
                      <View style={[styles.perkBadge, { backgroundColor: colors.success + '22' }]}>
                        <Text style={[styles.perkBadgeText, { color: colors.success }]}>{t.profile.active}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
            {nextPerk && nextPerkT && (
              <View style={[styles.nextPerkHint, { backgroundColor: colors.primary + '11', borderColor: colors.primary + '33' }]}>
                <Lock size={12} color={colors.primary} />
                <Text style={[styles.nextPerkText, { color: colors.primary, flex: 1 }]}>
                  {t.profile.reachLv} {nextPerk.requiredLevel} {t.profile.toUnlock} {nextPerkT.label}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.goalHeader}>
            <Text style={styles.sectionTitle}>{t.home.dailyGoal}</Text>
            <Text>
              <Text style={styles.goalCurrent}>{home.todayPoints}</Text>
              <Text style={styles.goalSep}> / {DAILY_GOAL} {t.common.pts}</Text>
            </Text>
          </View>
          <View style={styles.goalTrack}>
            <View style={[styles.goalFill, { width: `${dailyPct * 100}%` }]} />
            {dailyPct > 0.08 && (
              <Text style={styles.goalPct}>{Math.round(dailyPct * 100)}%</Text>
            )}
          </View>
          {dailyPct >= 1 && (
            <Text style={styles.goalDone}>{t.home.goalReached}</Text>
          )}
        </View>

        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[styles.chipValue, { color: colors.primary }]}>{home.todayPoints}</Text>
            <Text style={styles.chipLabel}>{t.home.today}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.accent + '18' }]}>
            <Text style={[styles.chipValue, { color: colors.accent }]}>{home.streak}</Text>
            <Text style={styles.chipLabel}>{t.home.streak}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.info + '18' }]}>
            <Text style={[styles.chipValue, { color: colors.info }]}>{badgeCount.unlocked}/{badgeCount.total}</Text>
            <Text style={styles.chipLabel}>{t.home.badges}</Text>
          </View>
        </View>

        {challenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.home.weeklyChallenges}</Text>
            {challenges.map((ch) => {
              const pct = ch.target > 0 ? Math.min(ch.progress / ch.target, 1) : 0;
              const done = ch.status === 'completed';
              return (
                <View key={ch.id} style={[styles.challengeCard, done && styles.challengeCardDone]}>
                  <View style={[styles.challengeAccent, { backgroundColor: done ? colors.success : colors.accent }]} />
                  <View style={styles.challengeBody}>
                    <View style={styles.challengeTopRow}>
                      <Astroid size={16} color={done ? colors.success : colors.accent} />
                      <Text style={[styles.challengeName, done && { color: colors.success }]} numberOfLines={1}>
                        {ch.name}
                      </Text>
                      <Text style={[styles.challengeReward, { color: done ? colors.success : colors.accent }]}>
                        +{ch.rewardPoints} {t.common.pts}
                      </Text>
                    </View>
                    {!done && (
                      <View style={styles.thinTrack}>
                        <View style={[styles.thinFill, { width: `${pct * 100}%`, backgroundColor: colors.accent }]} />
                      </View>
                    )}
                    <Text style={styles.challengeProgress}>
                      {done ? t.home.completed : `${ch.progress} / ${ch.target}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {devMode && (
          <View style={styles.devCard}>
            <Text style={styles.devTitle}>DEV</Text>
            <View style={styles.devRow}>
              <TouchableOpacity style={styles.devBtn} onPress={() => addPoints(50)}>
                <Text style={styles.devBtnText}>+50 pts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.devBtn, { backgroundColor: colors.error + '30', borderColor: colors.error }]} onPress={handleDevReset}>
                <Text style={[styles.devBtnText, { color: colors.error }]}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 20 },

    hero: {
      backgroundColor: c.card,
      borderRadius: 24,
      marginTop: 16,
      marginBottom: 16,
      padding: 20,
      overflow: 'hidden',
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    heroPetNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    heroBlob: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: c.primary + '18',
    },
    heroLeft: { flex: 1, paddingRight: 8 },
    heroGreeting: {
      fontSize: FontSize.sm,
      color: c.textSecondary,
      fontWeight: '500',
      marginBottom: 2,
    },
    heroPoints: {
      fontSize: 40,
      fontWeight: '900',
      color: c.text,
      letterSpacing: -1,
      lineHeight: 44,
    },
    heroPointsLabel: {
      fontSize: FontSize.sm,
      color: c.textSecondary,
      marginBottom: 12,
    },
    streakChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.accent + '22',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    streakChipText: { fontSize: FontSize.sm, fontWeight: '700', color: c.accent },
    heroRight: { alignItems: 'center', width: 120 },
    heroPetImage: { width: 110, height: 110, resizeMode: 'contain' },
    moodBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 4,
    },
    moodBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

    section: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: FontSize.sm,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
    },

    goalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 10,
    },
    goalCurrent: { fontSize: FontSize.xl, fontWeight: '800', color: c.text },
    goalSep: { fontSize: FontSize.sm, color: c.textSecondary },
    goalTrack: {
      height: 18,
      backgroundColor: c.divider,
      borderRadius: 9,
      overflow: 'hidden',
      justifyContent: 'center',
    },
    goalFill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: c.primary,
      borderRadius: 9,
    },
    goalPct: {
      fontSize: 10,
      fontWeight: '800',
      color: '#fff',
      paddingLeft: 8,
      zIndex: 1,
    },
    goalDone: {
      fontSize: FontSize.sm,
      color: c.success,
      fontWeight: '600',
      marginTop: 8,
      textAlign: 'center',
    },

    chipRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    chip: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
    chipValue: { fontSize: FontSize.lg, fontWeight: '800' },
    chipLabel: { fontSize: 11, color: c.textSecondary, marginTop: 2, fontWeight: '500' },

    petName: { fontSize: FontSize.lg, fontWeight: '800', color: c.text },
    moodChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 6,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 20,
      borderWidth: 1,
      alignSelf: 'flex-start',
    },
    moodDot: { width: 6, height: 6, borderRadius: 3 },
    moodChipText: { fontSize: FontSize.xs, fontWeight: '700' },
    barRowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    barLabel: { fontSize: FontSize.xs, fontWeight: '600', color: c.textSecondary },
    barValue: { fontSize: FontSize.xs, color: c.textSecondary },
    subSectionTitle: {
      fontSize: FontSize.xs,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    statBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    statBarLabel: { width: 56, fontSize: FontSize.xs, fontWeight: '600' },
    statBarValue: { width: 26, fontSize: FontSize.xs, textAlign: 'right' },
    actionBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1,
      gap: 2,
    },
    actionBtnLabel: { fontSize: FontSize.sm, fontWeight: '700' },
    actionBtnCost: { fontSize: FontSize.xs, opacity: 0.8 },
    perkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    perkIconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    perkIconText: { fontSize: FontSize.xs, fontWeight: '800', color: c.primary },
    perkLabel: { fontSize: FontSize.sm, fontWeight: '700', color: c.text },
    perkDesc: { fontSize: FontSize.xs, color: c.textSecondary, marginTop: 1 },
    perkBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    perkBadgeText: { fontSize: FontSize.xs, fontWeight: '700' },
    nextPerkHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    nextPerkText: { fontSize: FontSize.xs, fontWeight: '600' },
    inlineInput: {
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      fontSize: FontSize.lg,
      fontWeight: '700',
      color: c.text,
      paddingVertical: 2,
    },
    linkText: { fontSize: FontSize.sm, color: c.info },

    thinTrack: { height: 6, backgroundColor: c.divider, borderRadius: 3, overflow: 'hidden' },
    thinFill: { height: '100%', borderRadius: 3 },

    challengeCard: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
    },
    challengeCardDone: { opacity: 0.75 },
    challengeAccent: { width: 4 },
    challengeBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
    challengeTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
    challengeName: { flex: 1, fontSize: FontSize.sm, fontWeight: '700', color: c.text },
    challengeReward: { fontSize: FontSize.sm, fontWeight: '700' },
    challengeProgress: { fontSize: 11, color: c.textSecondary, marginTop: 4 },

    devCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.warning + '60',
      borderStyle: 'dashed',
      padding: 12,
      marginBottom: 12,
    },
    devTitle: { fontSize: 11, fontWeight: '800', color: c.warning, marginBottom: 8, letterSpacing: 1 },
    devRow: { flexDirection: 'row', gap: 8 },
    devBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.warning,
      backgroundColor: c.warning + '20',
      alignItems: 'center',
    },
    devBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: c.warning },
  });

export default HomeScreen;
