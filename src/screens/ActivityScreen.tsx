import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Map, List, Award, Zap, Footprints, Flag, Flame, Gift, Undo2, Circle, Lock, Astroid, Check, Trophy } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontSize, ColorPalette } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import { TripRecord, PointsLedgerEntry, Badge, Challenge } from '@/types';
import { getRecentTrips, getTripStats } from '@/services/tripService';
import { getRecentEntries } from '@/services/ledgerService';
import { getBadges, getTotalCount } from '@/services/badgeService';
import { getCurrentWeekChallenges } from '@/services/challengeService';
import { getExplorerTxUrl } from '@/blockchain';
import { eventBus, Events } from '@/services/eventBus';
import { useTranslation } from '@/i18n';

type TabKey = 'trips' | 'ledger' | 'badges' | 'challenges';
type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const MODE_COLORS: Record<string, string> = {
  walk: '#4CAF50',
  transit: '#2196F3',
  mixed: '#9C27B0',
};

const getLedgerIcon = (kind: string, positive: boolean) => {
  const color = positive ? '#22c55e' : '#ef4444';
  const size = 18;
  switch (kind) {
    case 'route_progress': return <Footprints size={size} color={color} />;
    case 'route_completion': return <Flag size={size} color={color} />;
    case 'challenge_reward': return <Trophy size={size} color={color} />;
    case 'daily_streak': return <Flame size={size} color={color} />;
    case 'spend_pack': return <Gift size={size} color={color} />;
    case 'duplicate_refund': return <Undo2 size={size} color={color} />;
    default: return <Circle size={size} color={color} />;
  }
};

const ActivityScreen = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
    { key: 'trips', label: t.activity.trips, icon: Map },
    { key: 'ledger', label: t.activity.ledger, icon: List },
    { key: 'badges', label: t.activity.badgesTab, icon: Award },
    { key: 'challenges', label: t.activity.challenges, icon: Zap },
  ];

  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [ledger, setLedger] = useState<PointsLedgerEntry[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState({
    totalTrips: 0, completedTrips: 0, totalDistanceMeters: 0,
    walkDistanceMeters: 0, transitDistanceMeters: 0,
    totalPointsFromTrips: 0, totalBonusPoints: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>('trips');

  const ledgerKindLabel = useCallback((kind: string) => {
    const key = kind as keyof typeof t.activity.ledgerKinds;
    return t.activity.ledgerKinds[key] ?? t.activity.ledgerKinds.unknown;
  }, [t.activity.ledgerKinds]);

  const tripModeLabel = useCallback((mode: string) => {
    if (mode === 'walk' || mode === 'transit' || mode === 'mixed') {
      return t.activity[mode];
    }
    return mode;
  }, [t.activity]);

  const loadData = useCallback(async () => {
    const [tr, le, s, b, ch] = await Promise.all([
      getRecentTrips(30), getRecentEntries(30), getTripStats(), getBadges(), getCurrentWeekChallenges(),
    ]);
    setTrips(tr); setLedger(le); setStats(s); setBadges(b); setChallenges(ch);
  }, []);

  useEffect(() => {
    loadData();
    const unsubs = [
      eventBus.on(Events.TRIP_SAVED, loadData),
      eventBus.on(Events.LEDGER_UPDATED, loadData),
      eventBus.on(Events.BADGES_CHANGED, loadData),
      eventBus.on(Events.CHALLENGES_CHANGED, loadData),
      eventBus.on(Events.SETTINGS_CHANGED, loadData),
    ];
    return () => unsubs.forEach((u) => u());
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const fmt = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const unlockedBadges = badges.filter((b) => b.unlockedAt);
  const lockedBadges = badges.filter((b) => !b.unlockedAt);
  const totalBadges = getTotalCount();
  const badgePct = totalBadges > 0 ? unlockedBadges.length / totalBadges : 0;
  const totalPoints = stats.totalPointsFromTrips + stats.totalBonusPoints;

  const openTx = (txHash: string) => Linking.openURL(getExplorerTxUrl(txHash)).catch(() => {});

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.pageTitle}>{t.activity.title}</Text>

        <View style={styles.statsStrip}>
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{stats.completedTrips}</Text>
            <Text style={styles.statLbl}>{t.activity.trips}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: colors.accent }]}>{fmt(stats.totalDistanceMeters)}</Text>
            <Text style={styles.statLbl}>{t.activity.distance}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: colors.info }]}>{fmt(stats.walkDistanceMeters)}</Text>
            <Text style={styles.statLbl}>{t.activity.walking}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={[styles.statVal, { color: colors.success }]}>{totalPoints}</Text>
            <Text style={styles.statLbl}>{t.activity.points}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
          {TABS.map((tabItem) => {
            const active = tab === tabItem.key;
            return (
              <TouchableOpacity
                key={tabItem.key}
                style={[styles.tabPill, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}
                onPress={() => setTab(tabItem.key)}
              >
                <tabItem.icon size={15} color={active ? '#fff' : colors.textSecondary} strokeWidth={1.5} />
                <Text style={[styles.tabLabel, { color: active ? '#fff' : colors.textSecondary }]}>{tabItem.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {tab === 'trips' && (
          trips.length === 0
            ? <Text style={styles.empty}>{t.activity.noTrips}</Text>
            : trips.map((trip) => {
                const done = trip.status === 'completed';
                const stopped = trip.status === 'stopped';
                const progressPct = trip.routeLengthMeters > 0
                  ? Math.min(trip.progressMeters / trip.routeLengthMeters, 1)
                  : 0;
                const modeColor = MODE_COLORS[trip.mode] ?? colors.primary;
                return (
                  <View key={trip.id} style={styles.tripCard}>
                    <View style={[styles.tripAccent, { backgroundColor: modeColor }]} />
                    <View style={styles.tripBody}>
                      <View style={styles.tripHeaderRow}>
                        <View style={[styles.modePill, { backgroundColor: modeColor + '22' }]}>
                          <Text style={[styles.modePillText, { color: modeColor }]}>{tripModeLabel(trip.mode)}</Text>
                        </View>
                        <Text style={styles.tripTime}>{fmtTime(trip.startedAt)}</Text>
                        <View style={[styles.statusBadge, {
                          backgroundColor: done ? colors.success + '22' : stopped ? colors.textSecondary + '22' : colors.accent + '22',
                        }]}>
                          <Text style={[styles.statusBadgeText, {
                            color: done ? colors.success : stopped ? colors.textSecondary : colors.accent,
                          }]}>
                            {done ? t.activity.doneStatus : stopped ? t.activity.stoppedStatus : t.activity.activeStatus}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.tripRoute} numberOfLines={1}>
                        {trip.originLabel} → {trip.destinationLabel}
                      </Text>
                      <View style={styles.thinTrack}>
                        <View style={[styles.thinFill, {
                          width: `${progressPct * 100}%`,
                          backgroundColor: done ? colors.success : modeColor,
                        }]} />
                      </View>
                      <View style={styles.tripFooterRow}>
                        <Text style={styles.tripMeta}>
                          {fmt(trip.progressMeters)} / {fmt(trip.routeLengthMeters)}
                        </Text>
                        <Text style={[styles.tripPoints, { color: modeColor }]}>
                          +{trip.pointsAwarded}{trip.completionBonusAwarded > 0 ? ` (+${trip.completionBonusAwarded})` : ''} {t.common.pts}
                        </Text>
                      </View>
                      {trip.txHash && (
                        <TouchableOpacity onPress={() => openTx(trip.txHash!)}>
                          <Text style={styles.txLink}>{t.activity.verifiedOnChain}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
        )}

        {tab === 'ledger' && (
          ledger.length === 0
            ? <Text style={styles.empty}>{t.activity.noLedger}</Text>
            : ledger.map((entry) => {
                const positive = entry.deltaPoints >= 0;
                return (
                  <View key={entry.id} style={styles.ledgerRow}>
                    <View style={[styles.ledgerIcon, { backgroundColor: positive ? colors.success + '18' : colors.error + '18' }]}>
                      {getLedgerIcon(entry.kind, positive)}
                    </View>
                    <View style={styles.ledgerBody}>
                      <Text style={styles.ledgerKind}>{ledgerKindLabel(entry.kind)}</Text>
                      <Text style={styles.ledgerTime}>{fmtTime(entry.createdAt)}</Text>
                    </View>
                    <Text style={[styles.ledgerDelta, { color: positive ? colors.success : colors.error }]}>
                      {positive ? '+' : ''}{entry.deltaPoints}
                    </Text>
                  </View>
                );
              })
        )}

        {tab === 'badges' && (
          <>
            <View style={styles.badgeProgressCard}>
              <View style={styles.badgeProgressHeader}>
                <Text style={styles.badgeProgressTitle}>{unlockedBadges.length} / {totalBadges} {t.activity.badgeProgressSuffix}</Text>
                <Text style={styles.badgeProgressPct}>{Math.round(badgePct * 100)}%</Text>
              </View>
              <View style={styles.goalTrack}>
                <View style={[styles.goalFill, { width: `${badgePct * 100}%`, backgroundColor: colors.accent }]} />
              </View>
            </View>

            {unlockedBadges.map((badge) => (
              <View key={badge.id} style={styles.badgeCard}>
                <View style={[styles.badgeIconBox, { backgroundColor: colors.accent + '22' }]}>
                  <Text style={styles.badgeIconEmoji}>{badge.icon}</Text>
                </View>
                <View style={styles.badgeInfo}>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDesc}>{badge.description}</Text>
                  {badge.txHash && (
                    <TouchableOpacity onPress={() => openTx(badge.txHash!)}>
                      <Text style={styles.txLink}>{t.activity.verifiedOnChain}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Check size={20} color={colors.success} />
              </View>
            ))}

            {lockedBadges.map((badge) => (
              <View key={badge.id} style={[styles.badgeCard, styles.badgeCardLocked]}>
                <View style={[styles.badgeIconBox, { backgroundColor: colors.divider }]}>
                  <Lock size={22} color={colors.textLight} />
                </View>
                <View style={styles.badgeInfo}>
                  <Text style={[styles.badgeName, { color: colors.textSecondary }]}>{badge.name}</Text>
                  <Text style={styles.badgeDesc}>{badge.description}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {tab === 'challenges' && (
          challenges.length === 0
            ? <Text style={styles.empty}>{t.activity.noChallenges}</Text>
            : challenges.map((ch) => {
                const pct = ch.target > 0 ? Math.min(ch.progress / ch.target, 1) : 0;
                const done = ch.status === 'completed';
                const accentColor = done ? colors.success : colors.accent;
                return (
                  <View key={ch.id} style={styles.challengeCard}>
                    <View style={[styles.challengeAccent, { backgroundColor: accentColor }]} />
                    <View style={styles.challengeBody}>
                      <View style={styles.challengeTopRow}>
                        <View style={[styles.challengeIconBox, { backgroundColor: accentColor + '22' }]}>
                          {done
                            ? <Check size={16} color={colors.success} />
                            : <Astroid size={16} color={colors.accent} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.challengeName}>{ch.name}</Text>
                          <Text style={styles.challengeDesc}>{ch.description}</Text>
                        </View>
                        <View style={[styles.rewardPill, { backgroundColor: accentColor + '22' }]}>
                          <Text style={[styles.rewardPillText, { color: accentColor }]}>+{ch.rewardPoints}</Text>
                        </View>
                      </View>
                      <View style={styles.thinTrack}>
                        <View style={[styles.thinFill, { width: `${pct * 100}%`, backgroundColor: accentColor }]} />
                      </View>
                      <View style={styles.challengeFooter}>
                        <Text style={styles.challengeProgress}>
                          {done ? t.common.completed : `${Number(ch.progress.toFixed(2))} / ${ch.target}`}
                        </Text>
                        {ch.txHash && (
                          <TouchableOpacity onPress={() => openTx(ch.txHash!)}>
                            <Text style={styles.txLink}>{t.activity.verifiedOnChain}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
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
    pageTitle: {
      fontSize: 28,
      fontWeight: '900',
      color: c.text,
      marginTop: 16,
      marginBottom: 16,
      letterSpacing: -0.5,
    },

    statsStrip: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 20,
      paddingVertical: 16,
      marginBottom: 14,
    },
    statCell: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: c.divider, marginVertical: 4 },
    statVal: { fontSize: FontSize.lg, fontWeight: '800' },
    statLbl: { fontSize: 11, color: c.textSecondary, marginTop: 2, fontWeight: '500' },

    tabScroll: { flexGrow: 0, marginBottom: 14 },
    tabScrollContent: { gap: 8 },
    tabPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    tabLabel: { fontSize: FontSize.sm, fontWeight: '600', color: c.textSecondary },

    tripCard: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 16,
      marginBottom: 10,
      overflow: 'hidden',
    },
    tripAccent: { width: 4 },
    tripBody: { flex: 1, padding: 14 },
    tripHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    modePill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    modePillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    tripTime: { flex: 1, fontSize: 11, color: c.textSecondary },
    statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
    statusBadgeText: { fontSize: 10, fontWeight: '700' },
    tripRoute: { fontSize: FontSize.md, fontWeight: '700', color: c.text, marginBottom: 8 },
    thinTrack: {
      height: 5,
      backgroundColor: c.divider,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 8,
    },
    thinFill: { height: '100%', borderRadius: 3 },
    tripFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tripMeta: { fontSize: FontSize.xs, color: c.textSecondary },
    tripPoints: { fontSize: FontSize.sm, fontWeight: '700' },

    ledgerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 14,
      marginBottom: 8,
      padding: 12,
      gap: 12,
    },
    ledgerIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ledgerBody: { flex: 1 },
    ledgerKind: {
      fontSize: FontSize.sm,
      fontWeight: '700',
      color: c.text,
      textTransform: 'capitalize',
    },
    ledgerTime: { fontSize: 10, color: c.textLight, marginTop: 2 },
    ledgerDelta: { fontSize: FontSize.lg, fontWeight: '800', minWidth: 48, textAlign: 'right' },

    badgeProgressCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
    },
    badgeProgressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 10,
    },
    badgeProgressTitle: { fontSize: FontSize.md, fontWeight: '700', color: c.text },
    badgeProgressPct: { fontSize: FontSize.lg, fontWeight: '800', color: c.accent },
    goalTrack: { height: 10, backgroundColor: c.divider, borderRadius: 5, overflow: 'hidden' },
    goalFill: { height: '100%', borderRadius: 5 },
    badgeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 16,
      marginBottom: 8,
      padding: 14,
      gap: 12,
    },
    badgeCardLocked: { opacity: 0.5 },
    badgeIconBox: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeIconEmoji: { fontSize: 24 },
    badgeInfo: { flex: 1 },
    badgeName: { fontSize: FontSize.md, fontWeight: '700', color: c.text },
    badgeDesc: { fontSize: FontSize.xs, color: c.textSecondary, marginTop: 2 },

    challengeCard: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 16,
      marginBottom: 10,
      overflow: 'hidden',
    },
    challengeAccent: { width: 4 },
    challengeBody: { flex: 1, padding: 14 },
    challengeTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    challengeIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    challengeName: { fontSize: FontSize.sm, fontWeight: '700', color: c.text },
    challengeDesc: { fontSize: FontSize.xs, color: c.textSecondary, marginTop: 1 },
    rewardPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
    rewardPillText: { fontSize: FontSize.xs, fontWeight: '800' },
    challengeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    challengeProgress: { fontSize: FontSize.xs, color: c.textSecondary },
    txLink: { fontSize: FontSize.xs, color: c.info },

    empty: {
      textAlign: 'center',
      color: c.textSecondary,
      fontSize: FontSize.md,
      marginTop: 40,
      lineHeight: 22,
    },
  });

export default ActivityScreen;
