import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontSize, ColorPalette } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import { TripRecord, PointsLedgerEntry } from '@/types';
import { getTrips } from '@/services/tripService';
import { getLedger } from '@/services/ledgerService';
import { getHomeState } from '@/services/homeService';
import { eventBus, Events } from '@/services/eventBus';
import { useTranslation } from '@/i18n';

interface WeeklyBucket {
  weekLabel: string;
  shortLabel: string;
  trips: number;
  completed: number;
  walkMeters: number;
  transitMeters: number;
  pointsEarned: number;
  pointsSpent: number;
  activeDays: Set<string>;
}

interface OverallStats {
  totalTrips: number;
  completionRate: number;
  totalWalkKm: number;
  totalTransitKm: number;
  avgTripsPerDay: number;
  streak: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  activeDays: number;
  firstTripDate: string;
}

interface BarDatum {
  label: string;
  value: number;
  max: number;
  color: string;
}

const ChartCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.chartSubtitle}>{subtitle}</Text>
      <View>{children}</View>
    </View>
  );
};

const BarChart = ({
  data, styles, formatVal,
}: {
  data: BarDatum[];
  styles: ReturnType<typeof makeStyles>;
  formatVal?: (v: number) => string;
}) => (
  <View style={styles.barChart}>
    {data.map((d, i) => (
      <View key={i} style={styles.barRow}>
        <Text style={styles.barLabel}>{d.label}</Text>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, {
            width: `${Math.max((d.value / d.max) * 100, d.value > 0 ? 2 : 0)}%`,
            backgroundColor: d.color,
          }]} />
        </View>
        <Text style={styles.barVal}>{formatVal ? formatVal(d.value) : d.value}</Text>
      </View>
    ))}
  </View>
);

const AnalyticsScreen = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [weeklyData, setWeeklyData] = useState<WeeklyBucket[]>([]);
  const [overall, setOverall] = useState<OverallStats>({
    totalTrips: 0, completionRate: 0, totalWalkKm: 0, totalTransitKm: 0,
    avgTripsPerDay: 0, streak: 0, totalPointsEarned: 0, totalPointsSpent: 0,
    activeDays: 0, firstTripDate: '',
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [trips, ledger, home] = await Promise.all([getTrips(), getLedger(), getHomeState()]);
    computeAnalytics(trips, ledger, home.streak);
  }, []);

  const computeAnalytics = (trips: TripRecord[], ledger: PointsLedgerEntry[], streak: number) => {
    const now = new Date();
    const buckets: WeeklyBucket[] = [];
    for (let w = 7; w >= 0; w--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - w * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      const mo = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
      buckets.push({
        weekLabel: `${mo(weekStart)}-${mo(weekEnd)}`,
        shortLabel: w === 0 ? t.analytics.thisWeek : w === 1 ? t.analytics.lastWeek : `${w} ${t.analytics.twoWeeksAgo}`,
        trips: 0, completed: 0, walkMeters: 0, transitMeters: 0,
        pointsEarned: 0, pointsSpent: 0, activeDays: new Set(),
      });
    }

    for (const trip of trips) {
      const tripDate = new Date(trip.startedAt);
      const dayKey = trip.startedAt.slice(0, 10);
      for (let w = 0; w < buckets.length; w++) {
        const offset = (buckets.length - 1 - w);
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - offset * 7);
        weekEnd.setHours(23, 59, 59, 999);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        if (tripDate >= weekStart && tripDate <= weekEnd) {
          buckets[w].trips++;
          if (trip.status === 'completed') buckets[w].completed++;
          if (trip.mode === 'walk') buckets[w].walkMeters += trip.progressMeters;
          else buckets[w].transitMeters += trip.progressMeters;
          buckets[w].activeDays.add(dayKey);
          break;
        }
      }
    }

    for (const entry of ledger) {
      const entryDate = new Date(entry.createdAt);
      for (let w = 0; w < buckets.length; w++) {
        const offset = (buckets.length - 1 - w);
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - offset * 7);
        weekEnd.setHours(23, 59, 59, 999);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);
        if (entryDate >= weekStart && entryDate <= weekEnd) {
          if (entry.deltaPoints >= 0) buckets[w].pointsEarned += entry.deltaPoints;
          else buckets[w].pointsSpent += Math.abs(entry.deltaPoints);
          break;
        }
      }
    }

    setWeeklyData(buckets);

    const completedTrips = trips.filter((t) => t.status === 'completed').length;
    const allDays = new Set(trips.map((t) => t.startedAt.slice(0, 10)));
    const totalEarned = ledger.filter((e) => e.deltaPoints > 0).reduce((s, e) => s + e.deltaPoints, 0);
    const totalSpent = ledger.filter((e) => e.deltaPoints < 0).reduce((s, e) => s + Math.abs(e.deltaPoints), 0);
    const walkKm = trips.filter((t) => t.mode === 'walk').reduce((s, t) => s + t.progressMeters, 0) / 1000;
    const transitKm = trips.filter((t) => t.mode !== 'walk').reduce((s, t) => s + t.progressMeters, 0) / 1000;
    const firstDate = [...trips].sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0]?.startedAt.slice(0, 10) ?? '—';

    setOverall({
      totalTrips: trips.length,
      completionRate: trips.length > 0 ? Math.round((completedTrips / trips.length) * 100) : 0,
      totalWalkKm: Math.round(walkKm * 10) / 10,
      totalTransitKm: Math.round(transitKm * 10) / 10,
      avgTripsPerDay: allDays.size > 0 ? Math.round((trips.length / allDays.size) * 10) / 10 : 0,
      streak,
      totalPointsEarned: totalEarned,
      totalPointsSpent: totalSpent,
      activeDays: allDays.size,
      firstTripDate: firstDate,
    });
  };

  useEffect(() => {
    loadData();
    const unsubs = [
      eventBus.on(Events.TRIP_SAVED, loadData),
      eventBus.on(Events.LEDGER_UPDATED, loadData),
    ];
    return () => unsubs.forEach((u) => u());
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const maxTrips = Math.max(1, ...weeklyData.map((w) => w.trips));
  const maxWalk = Math.max(1, ...weeklyData.map((w) => w.walkMeters));
  const maxTransit = Math.max(1, ...weeklyData.map((w) => w.transitMeters));
  const maxEarned = Math.max(1, ...weeklyData.map((w) => w.pointsEarned));
  const maxSpent = Math.max(1, ...weeklyData.map((w) => w.pointsSpent));
  const maxPts = Math.max(maxEarned, maxSpent);
  const chartData = weeklyData.slice(-6);
  const totalDist = overall.totalWalkKm + overall.totalTransitKm;
  const walkPct = totalDist > 0 ? overall.totalWalkKm / totalDist : 0;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.pageTitle}>{t.analytics.title}</Text>
        <Text style={styles.pageSubtitle}>{t.analytics.subtitle}</Text>

        <View style={styles.heroRow}>
          <View style={[styles.heroCell, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[styles.heroVal, { color: colors.primary }]}>{overall.totalTrips}</Text>
            <Text style={styles.heroLbl}>{t.analytics.tripsLabel}</Text>
          </View>
          <View style={[styles.heroCell, { backgroundColor: colors.success + '18' }]}>
            <Text style={[styles.heroVal, { color: colors.success }]}>{overall.completionRate}%</Text>
            <Text style={styles.heroLbl}>{t.analytics.completion}</Text>
          </View>
          <View style={[styles.heroCell, { backgroundColor: colors.accent + '18' }]}>
            <Text style={[styles.heroVal, { color: colors.accent }]}>{overall.streak}d</Text>
            <Text style={styles.heroLbl}>{t.analytics.streak}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.analytics.distanceSplit}</Text>
          <View style={styles.distRow}>
            <View style={styles.distBlock}>
              <Text style={[styles.distVal, { color: colors.walkRoute }]}>{overall.totalWalkKm} km</Text>
              <Text style={styles.distLbl}>{t.analytics.walkDist}</Text>
            </View>
            <View style={styles.distDivider} />
            <View style={styles.distBlock}>
              <Text style={[styles.distVal, { color: colors.transitRoute }]}>{overall.totalTransitKm} km</Text>
              <Text style={styles.distLbl}>{t.analytics.transitDist}</Text>
            </View>
            <View style={styles.distDivider} />
            <View style={styles.distBlock}>
              <Text style={[styles.distVal, { color: colors.text }]}>
                {Math.round(totalDist * 10) / 10} km
              </Text>
              <Text style={styles.distLbl}>{t.profile.totalDist}</Text>
            </View>
          </View>
          {totalDist > 0 && (
            <View style={styles.splitBar}>
              <View style={[styles.splitFillWalk, { flex: walkPct }]} />
              <View style={[styles.splitFillTransit, { flex: 1 - walkPct }]} />
            </View>
          )}
          <View style={styles.splitLegend}>
            <View style={styles.legendDot}>
              <View style={[styles.dot, { backgroundColor: colors.walkRoute }]} />
              <Text style={styles.legendLabel}>
                {t.analytics.walkDist} {totalDist > 0 ? Math.round(walkPct * 100) : 0}%
              </Text>
            </View>
            <View style={styles.legendDot}>
              <View style={[styles.dot, { backgroundColor: colors.transitRoute }]} />
              <Text style={styles.legendLabel}>
                {t.analytics.transitDist} {totalDist > 0 ? Math.round((1 - walkPct) * 100) : 0}%
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.analytics.pointsOverview}</Text>
          <View style={styles.ptsRow}>
            <View style={styles.ptsBlock}>
              <Text style={[styles.ptsVal, { color: colors.success }]}>+{overall.totalPointsEarned}</Text>
              <Text style={styles.ptsLbl}>{t.analytics.earned}</Text>
            </View>
            <View style={styles.ptsDivider} />
            <View style={styles.ptsBlock}>
              <Text style={[styles.ptsVal, { color: colors.error }]}>-{overall.totalPointsSpent}</Text>
              <Text style={styles.ptsLbl}>{t.analytics.spent}</Text>
            </View>
            <View style={styles.ptsDivider} />
            <View style={styles.ptsBlock}>
              <Text style={[styles.ptsVal, { color: colors.primary }]}>
                {overall.totalPointsEarned - overall.totalPointsSpent}
              </Text>
              <Text style={styles.ptsLbl}>{t.analytics.net}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metricsStrip}>
          {[
            { label: t.analytics.activeDays, value: overall.activeDays.toString(), color: colors.info },
            { label: t.analytics.tripsPerDay, value: overall.avgTripsPerDay.toString(), color: colors.accent },
            { label: t.analytics.firstTrip, value: overall.firstTripDate, color: colors.textSecondary },
          ].map((m) => (
            <View key={m.label} style={styles.metricChip}>
              <Text style={[styles.metricChipVal, { color: m.color }]}>{m.value}</Text>
              <Text style={styles.metricChipLbl}>{m.label}</Text>
            </View>
          ))}
        </View>

        <ChartCard title={t.analytics.weeklyPoints} subtitle={t.analytics.weeklyTripsSub}>
          <BarChart
            data={chartData.map((w) => ({ label: w.shortLabel, value: w.trips, max: maxTrips, color: colors.primary }))}
            styles={styles}
          />
        </ChartCard>

        <ChartCard title={t.analytics.walkDistTitle} subtitle={t.analytics.metersPerWeek}>
          <BarChart
            data={chartData.map((w) => ({ label: w.shortLabel, value: Math.round(w.walkMeters), max: maxWalk, color: colors.walkRoute }))}
            styles={styles}
            formatVal={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`}
          />
        </ChartCard>

        <ChartCard title={t.analytics.transitDistTitle} subtitle={t.analytics.metersPerWeek}>
          <BarChart
            data={chartData.map((w) => ({ label: w.shortLabel, value: Math.round(w.transitMeters), max: maxTransit, color: colors.transitRoute }))}
            styles={styles}
            formatVal={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`}
          />
        </ChartCard>

        <ChartCard title={t.analytics.pointsOverview} subtitle={t.analytics.earnedVsSpent}>
          <View style={styles.groupedChart}>
            {chartData.map((w, i) => {
              const earnPct = maxPts > 0 ? w.pointsEarned / maxPts : 0;
              const spentPct = maxPts > 0 ? w.pointsSpent / maxPts : 0;
              return (
                <View key={i} style={styles.groupedCol}>
                  <View style={styles.groupedBars}>
                    <View style={[styles.groupedBar, { height: `${Math.max(earnPct * 100, 2)}%`, backgroundColor: colors.success }]} />
                    <View style={[styles.groupedBar, { height: `${Math.max(spentPct * 100, 2)}%`, backgroundColor: colors.error }]} />
                  </View>
                  <Text style={styles.chartXLabel}>{w.shortLabel}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.splitLegend}>
            <View style={styles.legendDot}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={styles.legendLabel}>{t.analytics.earned}</Text>
            </View>
            <View style={styles.legendDot}>
              <View style={[styles.dot, { backgroundColor: colors.error }]} />
              <Text style={styles.legendLabel}>{t.analytics.spent}</Text>
            </View>
          </View>
        </ChartCard>

        <ChartCard title={t.analytics.activeDaysTitle} subtitle={t.analytics.activeDaysSub}>
          {chartData.map((w, i) => (
            <View key={i} style={styles.heatRow}>
              <Text style={styles.heatLabel}>{w.shortLabel}</Text>
              <View style={styles.heatDots}>
                {Array.from({ length: 7 }, (_, d) => (
                  <View
                    key={d}
                    style={[styles.heatDot, {
                      backgroundColor: d < w.activeDays.size ? colors.info : colors.divider,
                    }]}
                  />
                ))}
              </View>
              <Text style={styles.heatVal}>{w.activeDays.size}/7</Text>
            </View>
          ))}
        </ChartCard>

        <ChartCard title={t.analytics.completion} subtitle={t.analytics.completionSub}>
          <BarChart
            data={chartData.map((w) => {
              const rate = w.trips > 0 ? Math.round((w.completed / w.trips) * 100) : 0;
              return { label: w.shortLabel, value: rate, max: 100, color: colors.success };
            })}
            styles={styles}
            formatVal={(v) => `${v}%`}
          />
        </ChartCard>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 20 },

    pageTitle: { fontSize: 28, fontWeight: '900', color: c.text, marginTop: 16, letterSpacing: -0.5 },
    pageSubtitle: { fontSize: FontSize.sm, color: c.textSecondary, marginBottom: 16, marginTop: 2 },

    heroRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    heroCell: { flex: 1, borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
    heroVal: { fontSize: 24, fontWeight: '900' },
    heroLbl: { fontSize: 11, color: c.textSecondary, marginTop: 2, fontWeight: '500' },

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
      marginBottom: 12,
    },
    distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    distBlock: { flex: 1, alignItems: 'center' },
    distDivider: { width: 1, height: 32, backgroundColor: c.divider },
    distVal: { fontSize: FontSize.lg, fontWeight: '800' },
    distLbl: { fontSize: 11, color: c.textSecondary, marginTop: 2 },
    splitBar: {
      flexDirection: 'row',
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
      gap: 2,
      marginBottom: 8,
    },
    splitFillWalk: { backgroundColor: c.walkRoute, borderRadius: 5 },
    splitFillTransit: { backgroundColor: c.transitRoute, borderRadius: 5 },
    splitLegend: { flexDirection: 'row', gap: 16, marginTop: 4 },
    legendDot: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { fontSize: FontSize.xs, color: c.textSecondary, fontWeight: '500' },

    ptsRow: { flexDirection: 'row', alignItems: 'center' },
    ptsBlock: { flex: 1, alignItems: 'center' },
    ptsDivider: { width: 1, height: 32, backgroundColor: c.divider },
    ptsVal: { fontSize: FontSize.xl, fontWeight: '800' },
    ptsLbl: { fontSize: 11, color: c.textSecondary, marginTop: 2 },

    metricsStrip: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    metricChip: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
    },
    metricChipVal: { fontSize: FontSize.md, fontWeight: '800' },
    metricChipLbl: { fontSize: 10, color: c.textSecondary, marginTop: 2, fontWeight: '500' },

    chartCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
    },
    chartTitle: { fontSize: FontSize.md, fontWeight: '800', color: c.text },
    chartSubtitle: { fontSize: FontSize.xs, color: c.textSecondary, marginTop: 1, marginBottom: 14 },

    barChart: { gap: 8 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    barLabel: { width: 56, fontSize: 11, color: c.textSecondary, fontWeight: '500' },
    barTrack: { flex: 1, height: 10, backgroundColor: c.divider, borderRadius: 5, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 5 },
    barVal: { width: 38, fontSize: 11, color: c.text, fontWeight: '700', textAlign: 'right' },

    groupedChart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      height: 100,
      gap: 6,
      marginBottom: 8,
    },
    groupedCol: { flex: 1, alignItems: 'center' },
    groupedBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 2, width: '100%' },
    groupedBar: { flex: 1, borderRadius: 4, minHeight: 3 },
    chartXLabel: { fontSize: 9, color: c.textSecondary, marginTop: 4, fontWeight: '500' },

    heatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    heatLabel: { width: 56, fontSize: 11, color: c.textSecondary, fontWeight: '500' },
    heatDots: { flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'center' },
    heatDot: { width: 12, height: 12, borderRadius: 3 },
    heatVal: { width: 28, fontSize: 11, color: c.text, fontWeight: '700', textAlign: 'right' },
  });

export default AnalyticsScreen;
