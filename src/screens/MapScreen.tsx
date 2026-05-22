import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  ScrollView,
  Animated,
  Modal,
} from 'react-native';
import { WolfImages } from '@/assets/images';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontSize, ColorPalette } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import { LatLng, PlannedRoute, NavigationState, DEFAULT_NAV_STATE, TripMode } from '@/types';
import * as Location from 'expo-location';
import { planRoute } from '@/services/otpService';
import { getCurrentLocation, startWatching, stopWatching, findClosestPointOnRoute } from '@/services/locationService';
import { createTrip, updateTrip } from '@/services/tripService';
import {
  awardRouteProgress,
  awardRouteCompletion,
  awardRemainingProgress,
  calculateProgressPoints,
  calculateCompletionBonus,
} from '@/services/rewardService';
import { checkLocationUpdate, resetCheatState } from '@/services/antiCheat';
import { getSettings } from '@/services/settingsService';
import { useTranslation } from '@/i18n';
import { eventBus, Events } from '@/services/eventBus';
import { Footprints, Bus, Train, MapPin, AlertTriangle, Check, X, ChevronUp, ChevronDown } from 'lucide-react-native';

const DEFAULT_REGION = {
  latitude: 47.4979,
  longitude: 19.0402,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type PlanMode = 'walk' | 'transit';

interface RoutePointsEstimate {
  progressPoints: number;
  completionBonus: number;
  totalPoints: number;
}

const formatClockTime = (epochMs?: number): string | null => {
  if (!epochMs) return null;
  const d = new Date(epochMs);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const getLegIndexByProgress = (legs: PlannedRoute['legs'], progressMeters: number): number => {
  if (!Array.isArray(legs) || legs.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < legs.length; i++) {
    sum += typeof legs[i].distanceMeters === 'number' ? legs[i].distanceMeters : 0;
    if (progressMeters <= sum) return i;
  }
  return legs.length - 1;
};

const describeLegAction = (
  leg: PlannedRoute['legs'][number] | null | undefined,
  t: { walkTo: string; walkLabel: string; takeLine: string; toward: string },
): string => {
  if (!leg) return '';
  const mode = (leg.mode ?? '').toUpperCase();
  if (mode === 'WALK') return leg.to?.name ? `${t.walkTo} ${leg.to.name}` : t.walkLabel;
  const line = leg.routeShortName ? `${leg.mode} ${leg.routeShortName}` : `${leg.mode}`;
  const dest = leg.headsign ?? leg.to?.name;
  return dest ? `${t.takeLine} ${line} ${t.toward} ${dest}` : `${t.takeLine} ${line}`;
};

const LegIcon = ({ mode, size = 14, color = '#fff' }: { mode: string; size?: number; color?: string }) => {
  const m = (mode ?? '').toUpperCase();
  if (m === 'WALK') return <Footprints size={size} color={color} />;
  if (m === 'BUS') return <Bus size={size} color={color} />;
  return <Train size={size} color={color} />;
};

interface CompletionResult {
  totalEarned: number;
  bonus: number;
  distanceKm: number;
  destinationLabel: string;
}

const N_COMPLETION_SPARKLES = 16;
const COMPLETION_SPARKLE_R = 150;

const RouteCompletionModal = ({
  result,
  colors,
  texts,
  onDismiss,
}: {
  result: CompletionResult;
  colors: ColorPalette;
  texts: { title: string; pointsEarned: string; distanceLabel: string; bonusLabel: string; continueBtn: string };
  onDismiss: () => void;
}) => {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0.4)).current;
  const pointsAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const wolfBounce = useRef(new Animated.Value(1)).current;

  const sparkleTargets = useMemo(
    () => Array.from({ length: N_COMPLETION_SPARKLES }, (_, i) => {
      const angle = (i / N_COMPLETION_SPARKLES) * 2 * Math.PI - Math.PI / 2;
      return { x: Math.cos(angle) * COMPLETION_SPARKLE_R, y: Math.sin(angle) * COMPLETION_SPARKLE_R };
    }),
    [],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(sparkleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(250),
        Animated.spring(pointsAnim, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ]),
    ]).start();

    const bounceTimer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(wolfBounce, { toValue: 1.08, duration: 550, useNativeDriver: true }),
          Animated.timing(wolfBounce, { toValue: 0.97, duration: 400, useNativeDriver: true }),
          Animated.timing(wolfBounce, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      ).start();
    }, 700);
    return () => clearTimeout(bounceTimer);
  }, []);

  const ms = completionModalStyles(colors);

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent>
      <Animated.View style={[ms.backdrop, { opacity: backdropAnim }]}>
        <Animated.View style={[ms.card, { transform: [{ scale: cardAnim }] }]}>
          <View style={ms.sparkleAnchor} pointerEvents="none">
            {sparkleTargets.map((target, i) => (
              <Animated.View
                key={i}
                style={[
                  ms.sparkle,
                  {
                    backgroundColor: i % 3 === 0 ? colors.accent : i % 3 === 1 ? colors.primary : '#FFD700',
                    transform: [
                      { translateX: sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, target.x] }) },
                      { translateY: sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, target.y] }) },
                    ],
                    opacity: sparkleAnim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }),
                  },
                ]}
              />
            ))}
          </View>

          <Animated.Image
            source={WolfImages.happy}
            style={[ms.wolf, { transform: [{ scale: wolfBounce }] }]}
            resizeMode="contain"
          />

          <Text style={ms.title}>{texts.title}</Text>
          <Text style={ms.subtitle} numberOfLines={1}>{result.destinationLabel}</Text>

          <Animated.View style={[ms.pointsBadge, { transform: [{ scale: pointsAnim }] }]}>
            <Text style={ms.pointsValue}>+{result.totalEarned}</Text>
            <Text style={ms.pointsLabel}>{texts.pointsEarned}</Text>
          </Animated.View>

          <View style={ms.statsRow}>
            <View style={ms.stat}>
              <Text style={[ms.statVal, { color: colors.primary }]}>{result.distanceKm.toFixed(1)} km</Text>
              <Text style={ms.statLabel}>{texts.distanceLabel}</Text>
            </View>
            <View style={ms.statDivider} />
            <View style={ms.stat}>
              <Text style={[ms.statVal, { color: colors.accent }]}>+{result.bonus}</Text>
              <Text style={ms.statLabel}>{texts.bonusLabel}</Text>
            </View>
          </View>

          <TouchableOpacity style={[ms.continueBtn, { backgroundColor: colors.primary }]} onPress={onDismiss}>
            <Text style={ms.continueBtnText}>{texts.continueBtn}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const MapScreen = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const mapRef = useRef<MapView>(null);
  const navStateRef  = useRef<NavigationState>(DEFAULT_NAV_STATE);
  const completingRef = useRef(false);

  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [destInput, setDestInput] = useState('');
  const [route, setRoute] = useState<PlannedRoute | null>(null);
  const [planMode, setPlanMode] = useState<PlanMode>('transit');
  const [navState, setNavState] = useState<NavigationState>(DEFAULT_NAV_STATE);
  const [loading, setLoading] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusWarn, setStatusWarn] = useState(false);
  const [showFullRoute, setShowFullRoute] = useState(false);
  const [routeEstimate, setRouteEstimate] = useState<RoutePointsEstimate | null>(null);
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);
  const [livePoints, setLivePoints] = useState(0);

  navStateRef.current = navState;

  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) setUserLocation(loc);
      const settings = await getSettings();
      setDevMode(settings.developerMode);
    })();

    const onSettingsChanged = async () => {
      const settings = await getSettings();
      setDevMode(settings.developerMode);
    };
    eventBus.on(Events.SETTINGS_CHANGED, onSettingsChanged);
    return () => { eventBus.off(Events.SETTINGS_CHANGED, onSettingsChanged); };
  }, []);

  const reverseGeocode = async (coord: LatLng): Promise<string> => {
    try {
      const results = await Location.reverseGeocodeAsync(coord);
      if (results.length > 0) {
        const r = results[0];
        if (r.name && !/^\d+$/.test(r.name) && r.name !== r.streetNumber) return r.name;
        if (r.street) return r.streetNumber ? `${r.street} ${r.streetNumber}` : r.street;
        return r.district ?? r.city ?? `${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)}`;
      }
    } catch {}
    return `${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)}`;
  };

  const handleMapPress = useCallback(async (e: { nativeEvent: { coordinate: LatLng } }) => {
    if (navState.isNavigating) return;
    const coord = e.nativeEvent.coordinate;
    setDestination(coord);
    setDestInput('Loading...');
    setRoute(null);
    setRouteEstimate(null);
    const label = await reverseGeocode(coord);
    setDestInput(label);
  }, [navState.isNavigating]);

  const handlePoiClick = useCallback((e: { nativeEvent: { coordinate: LatLng; placeId: string; name: string } }) => {
    if (navState.isNavigating) return;
    const { coordinate, name } = e.nativeEvent;
    setDestination(coordinate);
    setDestInput(name || `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`);
    setRoute(null);
    setRouteEstimate(null);
  }, [navState.isNavigating]);

  const handlePlanRoute = useCallback(async () => {
    if (!userLocation) { Alert.alert(t.map.locationNeeded, t.map.locationNeededMsg); return; }
    if (!destination) { Alert.alert(t.map.destinationNeeded, t.map.destinationNeededMsg); return; }
    setLoading(true);
    setStatusMsg(planMode === 'walk' ? t.map.planningWalk : t.map.planningTransit);
    const planned = await planRoute(userLocation, destination, { wantsTransit: planMode === 'transit' });
    setLoading(false);
    if (!planned) {
      setStatusMsg(''); setStatusWarn(false);
      setRouteEstimate(null);
      Alert.alert(t.map.routeError, planMode === 'transit' ? t.map.noTransitRoute : t.map.noWalkRoute);
      return;
    }
    setRoute(planned);
    const progressPoints = planned.legs.reduce((sum, leg) => {
      const legMode: TripMode = (leg.mode ?? '').toUpperCase() === 'WALK' ? 'walk' : 'transit';
      return sum + calculateProgressPoints(leg.distanceMeters ?? 0, legMode);
    }, 0);
    const completionBonus = calculateCompletionBonus(planned.totalDistanceMeters ?? 0);
    setRouteEstimate({ progressPoints, completionBonus, totalPoints: progressPoints + completionBonus });
    setStatusMsg(''); setStatusWarn(false);
    const fullPolyline = Array.isArray(planned.polyline) ? planned.polyline : [];
    if (mapRef.current && fullPolyline.length > 0) {
      mapRef.current.fitToCoordinates(fullPolyline, {
        edgePadding: { top: 80, right: 40, bottom: 340, left: 40 },
        animated: true,
      });
    }
  }, [userLocation, destination, planMode]);

  const handleStartNavigation = useCallback(async () => {
    if (!route || !userLocation || !destination) return;
    setLoading(true);
    setStatusMsg(t.map.refreshingRoute);
    const freshRoute = await planRoute(userLocation, destination, { wantsTransit: planMode === 'transit' });
    setLoading(false);
    setStatusMsg(''); setStatusWarn(false);
    const activeRoute = freshRoute ?? route;
    if (freshRoute) setRoute(freshRoute);

    const routeLegs = Array.isArray(activeRoute.legs) ? activeRoute.legs : [];
    const hasWalk = routeLegs.some((l) => l.mode === 'WALK');
    const hasTransit = routeLegs.some((l) => l.mode !== 'WALK');
    const mode: TripMode = hasWalk && hasTransit ? 'mixed' : hasWalk ? 'walk' : 'transit';
    const originLabel = await reverseGeocode(userLocation);
    const trip = await createTrip({
      mode,
      originLabel,
      destinationLabel: destInput || 'Selected Point',
      originCoords: userLocation,
      destinationCoords: destination,
      routeLengthMeters: route.totalDistanceMeters,
    });
    const newNavState: NavigationState = {
      isNavigating: true,
      route,
      currentLegIndex: 0,
      progressMeters: 0,
      startedAt: new Date().toISOString(),
      tripId: trip.id,
    };
    completingRef.current = false;
    navStateRef.current = newNavState;
    setNavState(newNavState);
    setLivePoints(0);
    setShowFullRoute(false);
    setRouteEstimate(null);
    resetCheatState();
    setStatusMsg(''); setStatusWarn(false);
    await startWatching(async (pos, accuracy) => {
      const current = navStateRef.current;
      if (!current.isNavigating || !current.route || !current.tripId) return;
      const polyline = Array.isArray(current.route.polyline) ? current.route.polyline : [];
      if (polyline.length === 0) return;
      const currentLeg = Array.isArray(current.route.legs) ? current.route.legs[current.currentLegIndex] : undefined;
      const check = checkLocationUpdate(pos, accuracy, polyline, currentLeg?.mode ?? 'WALK');
      if (!check.valid) { setStatusMsg(check.reason ?? ''); setStatusWarn(true); return; }
      setUserLocation(pos);
      const closest = findClosestPointOnRoute(pos, polyline);
      const nextLegIndex = getLegIndexByProgress(current.route.legs, closest.progressMeters);
      const liveLeg = Array.isArray(current.route.legs) ? current.route.legs[nextLegIndex] : undefined;
      if (closest.progressMeters > current.progressMeters) {
        const legMode = liveLeg?.mode === 'WALK' ? 'walk' : 'transit';
        const earned = await awardRouteProgress(current.tripId, closest.progressMeters, current.progressMeters, legMode as TripMode);
        if (earned > 0) setLivePoints((prev) => prev + earned);
        const updatedNav: NavigationState = { ...current, progressMeters: closest.progressMeters, currentLegIndex: nextLegIndex };
        navStateRef.current = updatedNav;
        setNavState(updatedNav);
        setStatusMsg(''); setStatusWarn(false);
        if (closest.progressMeters >= current.route.totalDistanceMeters * 0.95) {
          await handleCompleteRoute(current.tripId, current.route.totalDistanceMeters, legMode as TripMode);
        }
      }
    });
    eventBus.emit(Events.NAVIGATION_STATE_CHANGED, newNavState);
  }, [route, userLocation, destination, destInput]);

  const handleCompleteRoute = async (tripId: string, routeLength: number, mode: TripMode) => {
    if (completingRef.current) return;
    completingRef.current = true;
    await stopWatching();
    navStateRef.current = DEFAULT_NAV_STATE;
    const result = await awardRouteCompletion(tripId, routeLength, mode);
    setNavState(DEFAULT_NAV_STATE);
    setShowFullRoute(false);
    setRouteEstimate(null);
    setStatusMsg(''); setStatusWarn(false);
    eventBus.emit(Events.NAVIGATION_STATE_CHANGED, DEFAULT_NAV_STATE);
    setCompletionResult({
      totalEarned: result.totalEarned,
      bonus: result.bonus,
      distanceKm: routeLength / 1000,
      destinationLabel: destInput || 'Destination',
    });
  };

  const handleDismissCompletion = useCallback(() => {
    setCompletionResult(null);
    setRoute(null);
    setDestination(null);
    setDestInput('');
    setRouteEstimate(null);
    setStatusMsg(''); setStatusWarn(false);
  }, []);

  const handleStopNavigation = useCallback(async () => {
    await stopWatching();
    if (navState.tripId) await updateTrip(navState.tripId, { status: 'stopped', endedAt: new Date().toISOString() });
    setNavState(DEFAULT_NAV_STATE);
    setLivePoints(0);
    setShowFullRoute(false);
    setRouteEstimate(null);
    setStatusMsg(''); setStatusWarn(false);
    resetCheatState();
    eventBus.emit(Events.NAVIGATION_STATE_CHANGED, DEFAULT_NAV_STATE);
  }, [navState.tripId]);

  const handleDevFinish = useCallback(async () => {
    if (!navState.tripId || !navState.route) return;
    if (completingRef.current) return;
    completingRef.current = true;
    await stopWatching();
    navStateRef.current = DEFAULT_NAV_STATE;
    const legs = Array.isArray(navState.route.legs) ? navState.route.legs : [];
    const hasWalk = legs.some((l) => l.mode === 'WALK');
    const hasTransit = legs.some((l) => l.mode !== 'WALK');
    const mode: TripMode = hasWalk && hasTransit ? 'mixed' : hasWalk ? 'walk' : 'transit';
    await awardRemainingProgress(navState.tripId, legs, navState.progressMeters);
    const result = await awardRouteCompletion(navState.tripId, navState.route.totalDistanceMeters, mode);
    setNavState(DEFAULT_NAV_STATE);
    setShowFullRoute(false);
    setRouteEstimate(null);
    resetCheatState();
    eventBus.emit(Events.NAVIGATION_STATE_CHANGED, DEFAULT_NAV_STATE);
    setCompletionResult({
      totalEarned: result.totalEarned,
      bonus: result.bonus,
      distanceKm: navState.route.totalDistanceMeters / 1000,
      destinationLabel: destInput || 'Destination',
    });
  }, [navState, destInput]);

  const currentLeg = navState.isNavigating && navState.route ? navState.route.legs[navState.currentLegIndex] : null;
  const nextLeg = navState.isNavigating && navState.route ? navState.route.legs[navState.currentLegIndex + 1] : null;
  const progressPct = navState.isNavigating && navState.route
    ? Math.min(navState.progressMeters / navState.route.totalDistanceMeters, 1)
    : 0;

  const renderRouteSteps = (legs: PlannedRoute['legs'], activeLegIndex?: number) => (
    <ScrollView style={styles.stepsScroll} contentContainerStyle={styles.stepsScrollContent} nestedScrollEnabled showsVerticalScrollIndicator={false}>
      {legs.map((leg, idx) => {
        const isDone = activeLegIndex !== undefined && idx < activeLegIndex;
        const isActive = activeLegIndex === idx;
        const isTransit = (leg.mode ?? '').toUpperCase() !== 'WALK';
        const dotColor = isDone ? colors.textLight : isTransit ? colors.transitRoute : colors.walkRoute;
        const departure = formatClockTime(leg.startTimeMs);
        return (
          <View key={`step-${idx}`} style={styles.stepRow}>
            <View style={styles.stepDotCol}>
              {idx > 0 && <View style={[styles.stepConnector, { backgroundColor: isDone ? colors.textLight + '60' : colors.divider }]} />}
              <View style={[styles.stepDot, { backgroundColor: dotColor, borderColor: isActive ? dotColor : 'transparent' }]}>
                <LegIcon mode={leg.mode} size={14} color="#fff" />
              </View>
              {idx < legs.length - 1 && <View style={[styles.stepConnectorBelow, { backgroundColor: isDone ? colors.textLight + '60' : colors.divider }]} />}
            </View>
            <View style={[styles.stepBody, isActive && { backgroundColor: colors.primary + '12', borderRadius: 10 }]}>
              <Text style={[styles.stepTitle, isDone && styles.stepDone, isActive && { color: colors.primary }]} numberOfLines={2}>
                {describeLegAction(leg, t.map)}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.stepMeta, isDone && styles.stepDone]}>
                  {(leg.distanceMeters / 1000).toFixed(1)} km
                  {isTransit && departure ? ` · ${departure}` : ''}
                  {isDone ? ' ·' : ''}
                </Text>
                {isDone && <Check size={11} color={colors.textLight} />}
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={DEFAULT_REGION}
          showsUserLocation
          showsMyLocationButton
          onPress={handleMapPress}
          onPoiClick={handlePoiClick}
        >
          {destination && <Marker coordinate={destination} pinColor={colors.accent} />}
          {route && route.legs.map((leg, i) => (
            <Polyline
              key={i}
              coordinates={Array.isArray(leg.polyline) ? leg.polyline : []}
              strokeColor={leg.mode === 'WALK' ? colors.walkRoute : colors.transitRoute}
              strokeWidth={5}
            />
          ))}
        </MapView>

        {navState.isNavigating && currentLeg && (
          <View style={styles.navCard}>
            <View style={styles.navProgressTrack}>
              <View style={[styles.navProgressFill, { width: `${progressPct * 100}%` }]} />
            </View>
            <View style={styles.navCardInner}>
              <Image
                source={currentLeg.mode === 'WALK' ? WolfImages.talk : WolfImages.talk2}
                style={styles.navWolf}
                resizeMode="contain"
              />
              <View style={styles.navTextCol}>
                <View style={styles.navNowRow}>
                  <View style={[styles.navModePill, { backgroundColor: currentLeg.mode === 'WALK' ? colors.walkRoute + '22' : colors.transitRoute + '22', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                    <LegIcon mode={currentLeg.mode} size={13} color={currentLeg.mode === 'WALK' ? colors.walkRoute : colors.transitRoute} />
                    <Text style={[styles.navModePillText, { color: currentLeg.mode === 'WALK' ? colors.walkRoute : colors.transitRoute }]}>
                      {t.map.now}
                    </Text>
                  </View>
                  <Text style={styles.navProgress}>
                    {(navState.progressMeters / 1000).toFixed(2)} / {(navState.route!.totalDistanceMeters / 1000).toFixed(1)} km
                  </Text>
                </View>
                <Text style={styles.navAction} numberOfLines={2}>
                  {describeLegAction(currentLeg, t.map)}
                </Text>
                {currentLeg.startTimeMs && (
                  <Text style={styles.navSub}>{t.map.departs} {formatClockTime(currentLeg.startTimeMs)}</Text>
                )}
                {nextLeg && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <Text style={styles.navNext}>{t.map.then}</Text>
                    <LegIcon mode={nextLeg.mode} size={12} color={colors.textSecondary} />
                    <Text style={styles.navNext} numberOfLines={1}>{describeLegAction(nextLeg, t.map)}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomPanel}>
          {statusMsg ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
              {statusWarn && <AlertTriangle size={14} color={colors.warning} />}
              <Text style={[styles.statusText, statusWarn && { color: colors.warning, marginBottom: 0 }]}>{statusMsg}</Text>
            </View>
          ) : null}

          {!navState.isNavigating && (
            <>
              <View style={styles.searchBar}>
                <MapPin size={18} color={colors.textLight} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t.map.searchPlaceholder}
                  placeholderTextColor={colors.textLight}
                  value={destInput}
                  onChangeText={(text) => {
                    setDestInput(text);
                    const parts = text.split(',').map((s) => parseFloat(s.trim()));
                    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                      setDestination({ latitude: parts[0], longitude: parts[1] });
                    }
                  }}
                />
                {destInput.length > 0 && (
                  <TouchableOpacity onPress={() => { setDestInput(''); setDestination(null); setRoute(null); setRouteEstimate(null); }}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TouchableOpacity
                  style={[styles.segment, planMode === 'walk' && styles.segmentActive]}
                  onPress={() => setPlanMode('walk')}
                >
                  <Footprints size={15} color={planMode === 'walk' ? colors.text : colors.textSecondary} />
                  <Text style={[styles.segmentText, planMode === 'walk' && styles.segmentTextActive]}>
                    {t.map.walk}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segment, planMode === 'transit' && styles.segmentActive]}
                  onPress={() => setPlanMode('transit')}
                >
                  <Bus size={15} color={planMode === 'transit' ? colors.text : colors.textSecondary} />
                  <Text style={[styles.segmentText, planMode === 'transit' && styles.segmentTextActive]}>
                    {t.map.transit}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.planBtn} onPress={handlePlanRoute} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.planBtnText}>{t.map.planRoute}</Text>
                }
              </TouchableOpacity>

              {routeEstimate && (
                <View style={styles.estimateRow}>
                  <View style={[styles.estimateChip, { backgroundColor: colors.primary + '18' }]}>
                    <Text style={[styles.estimateChipVal, { color: colors.primary }]}>+{routeEstimate.progressPoints}</Text>
                    <Text style={styles.estimateChipLabel}>{t.map.progress}</Text>
                  </View>
                  <View style={[styles.estimateChip, { backgroundColor: colors.accent + '18' }]}>
                    <Text style={[styles.estimateChipVal, { color: colors.accent }]}>+{routeEstimate.completionBonus}</Text>
                    <Text style={styles.estimateChipLabel}>{t.map.bonus}</Text>
                  </View>
                  <View style={[styles.estimateChip, { backgroundColor: colors.success + '18' }]}>
                    <Text style={[styles.estimateChipVal, { color: colors.success }]}>+{routeEstimate.totalPoints}</Text>
                    <Text style={styles.estimateChipLabel}>{t.map.totalPts}</Text>
                  </View>
                </View>
              )}

              {route && (
                <TouchableOpacity style={styles.startBtn} onPress={handleStartNavigation}>
                  <Text style={styles.startBtnText}>{t.map.startNavigation}</Text>
                </TouchableOpacity>
              )}

              {route && Array.isArray(route.legs) && route.legs.length > 0 && (
                <View style={styles.stepsCard}>
                  <TouchableOpacity style={styles.stepsToggle} onPress={() => setShowFullRoute((p) => !p)}>
                    <Text style={styles.stepsToggleText}>{t.map.routeSteps}</Text>
                    {showFullRoute ? <ChevronUp size={14} color={colors.textSecondary} /> : <ChevronDown size={14} color={colors.textSecondary} />}
                  </TouchableOpacity>
                  {showFullRoute && renderRouteSteps(route.legs)}
                </View>
              )}
            </>
          )}

          {navState.isNavigating && (
            <>
              <View style={styles.livePointsChip}>
                <Text style={styles.livePointsValue}>+{livePoints}</Text>
                <Text style={styles.livePointsLabel}>{t.map.pointsEarned}</Text>
              </View>

              <View style={styles.navBtnRow}>
                <TouchableOpacity style={styles.stopBtn} onPress={handleStopNavigation}>
                  <Text style={styles.stopBtnText}>{t.map.stop}</Text>
                </TouchableOpacity>
                {devMode && (
                  <TouchableOpacity style={styles.devFinishBtn} onPress={handleDevFinish}>
                    <Text style={styles.devFinishBtnText}>{t.map.devFinish}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {navState.route && Array.isArray(navState.route.legs) && navState.route.legs.length > 0 && (
                <View style={styles.stepsCard}>
                  <TouchableOpacity style={styles.stepsToggle} onPress={() => setShowFullRoute((p) => !p)}>
                    <Text style={styles.stepsToggleText}>{t.map.routeSteps}</Text>
                    {showFullRoute ? <ChevronUp size={14} color={colors.textSecondary} /> : <ChevronDown size={14} color={colors.textSecondary} />}
                  </TouchableOpacity>
                  {showFullRoute && renderRouteSteps(navState.route.legs, navState.currentLegIndex)}
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {completionResult && (
        <RouteCompletionModal
          result={completionResult}
          colors={colors}
          texts={{
            title: t.map.completeTitle,
            pointsEarned: t.map.pointsEarned,
            distanceLabel: t.map.distanceLabel,
            bonusLabel: t.map.completionBonusLabel,
            continueBtn: t.map.continueBtn,
          }}
          onDismiss={handleDismissCompletion}
        />
      )}
    </SafeAreaView>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    container: { flex: 1 },
    map: { flex: 1 },

    navCard: {
      position: 'absolute',
      top: 12,
      left: 16,
      right: 16,
      backgroundColor: c.card,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    navProgressTrack: { height: 4, backgroundColor: c.divider },
    navProgressFill: { height: '100%', backgroundColor: c.primary, borderRadius: 2 },
    navCardInner: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },
    navWolf: { width: 48, height: 48, marginTop: 2 },
    navTextCol:{ flex: 1 },
    navNowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    navModePill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    navModePillText: { fontSize: 11, fontWeight: '800' },
    navProgress: { fontSize: 11, color: c.textSecondary, fontWeight: '500' },
    navAction: { fontSize: FontSize.md, fontWeight: '700', color: c.text, marginBottom: 2 },
    navSub:{ fontSize: FontSize.xs, color: c.textSecondary },
    navNext: { fontSize: FontSize.xs, color: c.textSecondary, marginTop: 6, borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 6 },

    bottomPanel: {
      backgroundColor: c.card,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 6,
      maxHeight: '55%',
    },
    statusText: { fontSize: FontSize.sm, color: c.textSecondary, textAlign: 'center', marginBottom: 8 },

    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    searchInput: { flex: 1, fontSize: FontSize.md, color: c.text },

    segment: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    segmentActive: { backgroundColor: c.accent, borderColor: c.accentDark },
    segmentText: { fontSize: FontSize.sm, color: c.textSecondary, shadowColor: '#000', shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
    segmentTextActive: { color: c.text },

    planBtn: { backgroundColor: c.primary, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
    planBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

    estimateRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    estimateChip: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    estimateChipVal: { fontSize: FontSize.md, fontWeight: '800' },
    estimateChipLabel:{ fontSize: 10, color: c.textSecondary, marginTop: 1, fontWeight: '500' },

    startBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 10 },
    startBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

    stepsCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 4,
    },
    stepsToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
    stepsToggleText: { fontSize: FontSize.sm, fontWeight: '700', color: c.text },
    stepsScroll: { maxHeight: 180, paddingHorizontal: 12 },
    stepsScrollContent:{ paddingBottom: 16 },

    stepRow: { flexDirection: 'row', alignItems: 'stretch', minHeight: 48 },
    stepDotCol: { width: 32, alignItems: 'center' },
    stepConnector: { width: 2, height: 8, borderRadius: 1 },
    stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' },
    stepConnectorBelow:{ flex: 1, width: 2, borderRadius: 1, minHeight: 8 },
    stepBody: { flex: 1, paddingLeft: 8, paddingVertical: 4, justifyContent: 'center' },
    stepTitle: { fontSize: FontSize.sm, fontWeight: '600', color: c.text },
    stepMeta: { fontSize: FontSize.xs, color: c.textSecondary, marginTop: 1 },
    stepDone: { color: c.textLight },

    navBtnRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    stopBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1.5, borderColor: c.error, backgroundColor: c.error + '12' },
    stopBtnText: { color: c.error, fontWeight: '800', fontSize: FontSize.md },
    devFinishBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', backgroundColor: c.warning + '22', borderWidth: 1.5, borderColor: c.warning },
    devFinishBtnText:{ color: c.warning, fontWeight: '800', fontSize: FontSize.sm },

    livePointsChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.primary + '18',
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: c.primary + '40',
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    livePointsValue: { fontSize: FontSize.md, fontWeight: '900', color: c.primary },
    livePointsLabel: { fontSize: FontSize.sm, color: c.textSecondary, fontWeight: '600' },
  });

const completionModalStyles = (c: ColorPalette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: c.card,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    width: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  sparkleAnchor: { position: 'absolute', top: '40%', left: '50%' },
  sparkle: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  wolf: { width: 120, height: 120, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '900', color: c.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: c.textSecondary, marginBottom: 20, maxWidth: '90%' },
  pointsBadge: {
    backgroundColor: c.primary + '18',
    borderRadius: 20,
    paddingHorizontal: 36,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: c.primary + '40',
    width: '100%',
  },
  pointsValue: { fontSize: 44, fontWeight: '900', color: c.primary },
  pointsLabel: { fontSize: 13, color: c.textSecondary, fontWeight: '600', marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: c.divider },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, color: c.textSecondary, marginTop: 2, fontWeight: '500' },
  continueBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', width: '100%' },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

export default MapScreen;
