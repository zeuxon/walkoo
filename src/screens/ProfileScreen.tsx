import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Switch,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { WolfImages } from '@/assets/images';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontSize, ColorPalette } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import {
  HomeState,
  DEFAULT_HOME_STATE,
  PetState,
  DEFAULT_PET_STATE,
  UserSettings,
  DEFAULT_SETTINGS,
  ThemeMode,
} from '@/types';
import { getHomeState, resetHomeState } from '@/services/homeService';
import { getPetState, resetPetState } from '@/services/petService';
import { getSettings, updateSettings } from '@/services/settingsService';
import { useTranslation } from '@/i18n';
import { getTripStats, clearTrips } from '@/services/tripService';
import { getTotalFromLedger, clearLedger } from '@/services/ledgerService';
import { eventBus, Events } from '@/services/eventBus';
import { saveJSON, StorageKeys } from '@/services/storage';
import { resetBadges } from '@/services/badgeService';
import { resetChallenges } from '@/services/challengeService';
import {
  Star, Flame, PawPrint, Map, CheckCircle, Receipt,
  Footprints, Bus, MapPin,
  Trophy, Gift, Wallet, Zap, ExternalLink, FileText,
  Wrench, Key, Globe, Medal,
  Sun, Moon, Smartphone, SquareArrowRightEnter,
  RotateCcw,
} from 'lucide-react-native';
import {
  isBlockchainConfigured,
  getOnChainStats,
  getSmartAccountAddress,
  clearSmartAccountCache,
  getExplorerAddressUrl,
  importWallet,
  getWalletPrivateKey,
  CONTRACT_ADDRESS,
  EXPLORER_URL,
} from '@/blockchain';
import type { OnChainStats } from '@/blockchain';

type LucideIcon = React.ComponentType<{ size?: number; color?: string }>;

const THEME_OPTIONS: { value: ThemeMode; icon: LucideIcon }[] = [
  { value: 'system', icon: Smartphone },
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
];

const StatChip = ({
  icon, label, value, color, colors,
}: {
  icon: React.ReactNode; label: string; value: string; color: string; colors: ColorPalette;
}) => {
  const s = useMemo(() => StyleSheet.create({
    chip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: 12,
      backgroundColor: color + '18',
      borderWidth: 1,
      borderColor: color + '40',
    },
    val: { fontSize: FontSize.md, fontWeight: '800', color },
    lbl: { fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 },
  }), [color, colors]);

  return (
    <View style={s.chip}>
      <View style={{ marginBottom: 2 }}>{icon}</View>
      <Text style={s.val}>{value}</Text>
      <Text style={s.lbl}>{label}</Text>
    </View>
  );
};


const ProfileScreen = () => {
  const { colors } = useTheme();
  const { t, language, setLanguage } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [home, setHome] = useState<HomeState>(DEFAULT_HOME_STATE);
  const [pet, setPet] = useState<PetState>(DEFAULT_PET_STATE);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [tripStats, setTripStats] = useState({
    totalTrips: 0,
    completedTrips: 0,
    totalDistanceMeters: 0,
    walkDistanceMeters: 0,
    transitDistanceMeters: 0,
    totalPointsFromTrips: 0,
    totalBonusPoints: 0,
  });
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [editingOtp, setEditingOtp] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [smartAccountAddr, setSmartAccountAddr] = useState<string | null>(null);
  const [onChainStats, setOnChainStats] = useState<OnChainStats | null>(null);

  const DEV_TAP_TARGET = 7;
  const DEV_PASSPHRASE = 'walkoo2026';
  const [devTapCount, setDevTapCount] = useState(0);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [passphraseError, setPassphraseError] = useState(false);
  const tapResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [importKeyInput, setImportKeyInput] = useState('');
  const [importingWallet, setImportingWallet] = useState(false);

  const handleSettingsTitleTap = () => {
    if (settings.developerMode) return;
    const next = devTapCount + 1;
    setDevTapCount(next);
    if (tapResetTimer.current) clearTimeout(tapResetTimer.current);
    if (next >= DEV_TAP_TARGET) {
      setDevTapCount(0);
      setPassphraseInput('');
      setPassphraseError(false);
      setShowPassphraseModal(true);
    } else {
      tapResetTimer.current = setTimeout(() => setDevTapCount(0), 3000);
    }
  };

  const handleRevealPrivateKey = async () => {
    if (showPrivateKey) {
      setShowPrivateKey(false);
      setPrivateKey(null);
      return;
    }
    const pk = await getWalletPrivateKey();
    setPrivateKey(pk);
    setShowPrivateKey(true);
  };

  const handleResetProgress = () => {
    Alert.alert(
      t.profile.resetProgress,
      t.profile.resetConfirmMsg,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.profile.resetConfirmBtn,
          style: 'destructive',
          onPress: async () => {
            await Promise.all([
              resetHomeState(),
              clearTrips(),
              clearLedger(),
              resetPetState(),
              resetBadges(),
              resetChallenges(),
              saveJSON(StorageKeys.DAILY_STATS, []),
              saveJSON(StorageKeys.PACK_HISTORY, []),
            ]);
            await loadData();
            eventBus.emit(Events.INVENTORY_CHANGED);
          },
        },
      ],
    );
  };

  const handleImportWallet = async () => {
    if (!importKeyInput.trim()) return;
    setImportingWallet(true);
    const addr = await importWallet(importKeyInput.trim());
    clearSmartAccountCache();
    setImportingWallet(false);
    if (addr) {
      setImportKeyInput('');
      setShowPrivateKey(false);
      setPrivateKey(null);
      await loadData();
      Alert.alert(t.profile.walletImported, t.profile.walletImportedMsg(addr));
    } else {
      Alert.alert(t.profile.invalidKey, t.profile.invalidKeyMsg);
    }
  };

  const handlePassphraseSubmit = async () => {
    if (passphraseInput === DEV_PASSPHRASE) {
      await updateSettings({ developerMode: true });
      setShowPassphraseModal(false);
      setPassphraseInput('');
    } else {
      setPassphraseError(true);
      setPassphraseInput('');
    }
  };

  const loadData = useCallback(async () => {
    const [h, p, s, ts, lt] = await Promise.all([
      getHomeState(),
      getPetState(),
      getSettings(),
      getTripStats(),
      getTotalFromLedger(),
    ]);
    setHome(h);
    setPet(p);
    setSettings(s);
    setTripStats(ts);
    setLedgerTotal(lt);
    setOtpInput(s.otpUrl);

    if (isBlockchainConfigured()) {
      getSmartAccountAddress().then((saAddr) => {
        if (saAddr) {
          setSmartAccountAddr(saAddr);
          getOnChainStats(saAddr).then((st) => { if (st) setOnChainStats(st); }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubs = [
      eventBus.on(Events.HOME_STATE_CHANGED, loadData),
      eventBus.on(Events.PET_STATE_CHANGED, loadData),
      eventBus.on(Events.SETTINGS_CHANGED, loadData),
    ];
    return () => unsubs.forEach((u) => u());
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSaveOtp = async () => {
    await updateSettings({ otpUrl: otpInput.trim() });
    setEditingOtp(false);
    Alert.alert(t.profile.otpSaved, t.profile.otpSavedMsg);
  };

  const handleToggleDevMode = async (val: boolean) => {
    await updateSettings({ developerMode: val });
  };

  const handleSetTheme = async (mode: ThemeMode) => {
    await updateSettings({ theme: mode });
  };

  const formatDistance = (m: number) =>
    m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;

  const completionRate =
    tripStats.totalTrips > 0
      ? Math.round((tripStats.completedTrips / tripStats.totalTrips) * 100)
      : 0;

  const shortAddr = smartAccountAddr
    ? `${smartAccountAddr.slice(0, 6)}...${smartAccountAddr.slice(-4)}`
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <Image source={WolfImages.wave} style={styles.headerWolf} resizeMode="contain" />
          <View>
            <Text style={styles.screenTitle}>{t.profile.title}</Text>
            <Text style={styles.screenSub}>{t.profile.subtitle}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.profile.progression}</Text>
          <View style={styles.chipRow}>
            <StatChip icon={<Star size={16} color={colors.primary} />} label={t.profile.points} value={home.totalPoints.toString()} color={colors.primary} colors={colors} />
            <StatChip icon={<Flame size={16} color="#f97316" />} label={t.profile.streak} value={`${home.streak}d`} color="#f97316" colors={colors} />
            <StatChip icon={<PawPrint size={16} color={colors.accent} />} label={t.profile.petLevel} value={pet.level.toString()} color={colors.accent} colors={colors} />
          </View>
          <View style={[styles.chipRow, { marginTop: 8 }]}>
            <StatChip icon={<Map size={16} color={colors.info} />} label={t.profile.trips} value={tripStats.totalTrips.toString()} color={colors.info} colors={colors} />
            <StatChip icon={<CheckCircle size={16} color={colors.success} />} label={t.profile.done} value={`${completionRate}%`} color={colors.success} colors={colors} />
            <StatChip icon={<Receipt size={16} color={colors.textSecondary} />} label={t.profile.net} value={ledgerTotal.toString()} color={colors.textSecondary} colors={colors} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t.profile.mobilitySummary}</Text>
          <View style={styles.chipRow}>
            <StatChip icon={<Footprints size={16} color={colors.success} />} label={t.profile.walkDist} value={formatDistance(tripStats.walkDistanceMeters)} color={colors.success} colors={colors} />
            <StatChip icon={<Bus size={16} color={colors.info} />} label={t.profile.transitDist} value={formatDistance(tripStats.transitDistanceMeters)} color={colors.info} colors={colors} />
            <StatChip icon={<MapPin size={16} color={colors.primary} />} label={t.profile.totalDist} value={formatDistance(tripStats.totalDistanceMeters)} color={colors.primary} colors={colors} />
          </View>
          <View style={[styles.chipRow, { marginTop: 8 }]}>
            <StatChip icon={<Trophy size={16} color={colors.accent} />} label={t.profile.tripPts} value={tripStats.totalPointsFromTrips.toString()} color={colors.accent} colors={colors} />
            <StatChip icon={<Gift size={16} color="#a855f7" />} label={t.profile.bonuses} value={tripStats.totalBonusPoints.toString()} color="#a855f7" colors={colors} />
            <StatChip icon={<Footprints size={16} color={colors.success} />} label={t.profile.walkPct} value={
              tripStats.totalDistanceMeters > 0
                ? `${Math.round((tripStats.walkDistanceMeters / tripStats.totalDistanceMeters) * 100)}%`
                : '0%'
            } color={colors.success} colors={colors} />
          </View>
        </View>

        {settings.developerMode && isBlockchainConfigured() && smartAccountAddr && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t.profile.blockchain}</Text>
            <View style={styles.chipRow}>
              <View style={[styles.addrChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}>
                <Wallet size={14} color={colors.primary} />
                <Text style={[styles.addrChipText, { color: colors.primary }]} numberOfLines={1}>
                  {shortAddr}
                </Text>
              </View>
              <View style={[styles.balanceChip, { backgroundColor: '#22c55e' + '15', borderColor: '#22c55e' + '40' }]}>
                <Zap size={14} color="#22c55e" />
                <Text style={[styles.balanceChipText, { color: '#22c55e' }]}>
                  {t.profile.gasless}
                </Text>
              </View>
            </View>

            {onChainStats && (
              <View style={[styles.chipRow, { marginTop: 8 }]}>
                <StatChip icon={<Map size={16} color={colors.info} />} label={t.profile.trips} value={onChainStats.totalTrips.toString()} color={colors.info} colors={colors} />
                <StatChip icon={<Medal size={16} color="#f59e0b" />} label={t.activity.badgesTab} value={onChainStats.totalBadges.toString()} color="#f59e0b" colors={colors} />
                <StatChip icon={<Zap size={16} color={colors.success} />} label={t.activity.challenges} value={onChainStats.totalChallenges.toString()} color={colors.success} colors={colors} />
              </View>
            )}

            <View style={{ marginTop: 12, gap: 8 }}>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Linking.openURL(getExplorerAddressUrl(smartAccountAddr)).catch(() => {})}
              >
                <ExternalLink size={16} color={colors.info} />
                <Text style={[styles.linkRowText, { color: colors.info }]}>{t.profile.viewWallet}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Linking.openURL(`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`).catch(() => {})}
              >
                <FileText size={16} color={colors.info} />
                <Text style={[styles.linkRowText, { color: colors.info }]}>{t.profile.viewContract}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <TouchableOpacity onPress={handleSettingsTitleTap} activeOpacity={1}>
            <Text style={styles.sectionTitle}>{t.profile.settings}</Text>
          </TouchableOpacity>
          {!settings.developerMode && devTapCount >= 3 && (
            <View style={[styles.tapHintBox, { backgroundColor: colors.primary + '11', borderColor: colors.primary + '33' }]}>
              <Text style={[styles.tapHintText, { color: colors.primary }]}>
                {t.profile.moreTapsHint(DEV_TAP_TARGET - devTapCount)}
              </Text>
            </View>
          )}

          <Text style={styles.settingLabel}>{t.profile.appearance}</Text>
          <View style={styles.segmentedRow}>
            {THEME_OPTIONS.map(({ value, icon: Icon }) => {
              const active = (settings.theme ?? 'system') === value;
              const label = value === 'system' ? t.profile.themeAuto : value === 'light' ? t.profile.themeLight : t.profile.themeDark;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.segmentBtn,
                    { borderColor: active ? colors.primary : colors.border },
                    active && { backgroundColor: colors.primary + '20' },
                  ]}
                  onPress={() => handleSetTheme(value)}
                >
                  <Icon size={18} color={active ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.segmentLabel, { color: active ? colors.primary : colors.textSecondary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.settingLabel, { marginTop: 16 }]}>{t.profile.language}</Text>
          <View style={styles.segmentedRow}>
            {(['en', 'hu'] as const).map((lang) => {
              const active = language === lang;
              const label = lang === 'en' ? t.profile.langEn : t.profile.langHu;
              return (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.segmentBtn,
                    { borderColor: active ? colors.accent : colors.border },
                    active && { backgroundColor: colors.accent + '20' },
                  ]}
                  onPress={() => setLanguage(lang)}
                >
                  <Text style={styles.flagEmoji}>{lang === 'en' ? '🇬🇧' : '🇭🇺'}</Text>
                  <Text style={[styles.segmentLabel, { color: active ? colors.accent : colors.textSecondary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.settingLabel, { marginTop: 16 }]}>{t.profile.otpServer}</Text>
          {editingOtp ? (
            <View>
              <TextInput
                style={[styles.textInput, { borderColor: colors.border, color: colors.text }]}
                value={otpInput}
                onChangeText={setOtpInput}
                autoCapitalize="none"
                placeholder="http://10.0.2.2:9000 or Netbird IP"
                placeholderTextColor={colors.textLight}
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.solidBtn, { backgroundColor: colors.primary, flex: 1 }]}
                  onPress={handleSaveOtp}
                >
                  <Text style={styles.solidBtnText}>{t.common.save}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: colors.border, flex: 1 }]}
                  onPress={() => { setEditingOtp(false); setOtpInput(settings.otpUrl); }}
                >
                  <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>{t.common.cancel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.otpRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setEditingOtp(true)}
            >
              <Globe size={16} color={colors.textSecondary} />
              <Text style={[styles.otpRowText, { color: colors.textSecondary }]} numberOfLines={1}>
                {settings.otpUrl}
              </Text>
              <Text style={[styles.otpRowEdit, { color: colors.info }]}>{t.common.edit}</Text>
            </TouchableOpacity>
          )}

          {settings.developerMode && (
            <View style={[styles.devSection, { backgroundColor: colors.error + '0D', borderColor: colors.error + '30' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Wrench size={18} color={colors.error} />
                  <Text style={[styles.settingLabel, { marginTop: 0, color: colors.error }]}>{t.profile.devMode}</Text>
                </View>
                <Switch
                  value={settings.developerMode}
                  onValueChange={handleToggleDevMode}
                  trackColor={{ true: colors.error + '80', false: colors.border }}
                  thumbColor={settings.developerMode ? colors.error : colors.textLight}
                />
              </View>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: colors.error, marginTop: 12 }]}
                onPress={() => eventBus.emit(Events.REPLAY_ONBOARDING)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <RotateCcw size={14} color={colors.error} />
                  <Text style={[styles.outlineBtnText, { color: colors.error, paddingLeft: 6 }]}>
                    {t.profile.replayTutorial}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.solidBtn, { backgroundColor: colors.error, marginTop: 8 }]}
                onPress={handleResetProgress}
              >
                <Text style={styles.solidBtnText}>{t.profile.resetProgress}</Text>
              </TouchableOpacity>

              <View style={[styles.devWalletBox, { backgroundColor: colors.warning + '0D', borderColor: colors.warning + '40' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Key size={16} color={colors.warning} />
                  <Text style={[styles.devWalletTitle, { color: colors.warning }]}>{t.profile.walletDevTools}</Text>
                </View>
                <Text style={[styles.devWalletHint, { color: colors.textSecondary }]}>
                  {t.profile.walletDevHint}
                </Text>

                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: colors.warning, marginTop: 10 }]}
                  onPress={handleRevealPrivateKey}
                >
                  <Text style={[styles.outlineBtnText, { color: colors.warning }]}>
                    {showPrivateKey ? t.profile.hidePrivateKey : t.profile.showPrivateKey}
                  </Text>
                </TouchableOpacity>
                {showPrivateKey && privateKey && (
                  <View style={[styles.keyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.keyText, { color: colors.text }]} selectable>{privateKey}</Text>
                    <Text style={[styles.keyHint, { color: colors.warning }]}>
                      {t.profile.privateKeyWarning}
                    </Text>
                  </View>
                )}

                <Text style={[styles.devWalletLabel, { color: colors.textSecondary }]}>{t.profile.importByKey}</Text>
                <TextInput
                  style={[styles.textInput, { borderColor: colors.border, color: colors.text, marginTop: 4 }]}
                  placeholder={t.profile.privateKeyPlaceholder}
                  placeholderTextColor={colors.textLight}
                  value={importKeyInput}
                  onChangeText={setImportKeyInput}
                  autoCapitalize="none"
                  secureTextEntry={false}
                />
                <TouchableOpacity
                  style={[styles.solidBtn, { backgroundColor: importingWallet ? colors.textLight : colors.warning, marginTop: 8 }]}
                  onPress={handleImportWallet}
                  disabled={importingWallet || !importKeyInput.trim()}
                >
                  {importingWallet ? (
                    <Text style={styles.solidBtnText}>{t.profile.importing}</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <SquareArrowRightEnter size={16} color="#fff" />
                      <Text style={[styles.solidBtnText, { marginLeft: 6 }]}>{t.profile.importWallet}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showPassphraseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPassphraseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t.profile.devAccess}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {t.profile.devAccessSub}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { borderColor: passphraseError ? colors.error : colors.border, color: colors.text },
              ]}
              placeholder={t.profile.passphrasePlaceholder}
              placeholderTextColor={colors.textLight}
              secureTextEntry
              value={passphraseInput}
              onChangeText={(v) => { setPassphraseInput(v); setPassphraseError(false); }}
              onSubmitEditing={handlePassphraseSubmit}
              autoFocus
            />
            {passphraseError && (
              <Text style={[styles.errorText, { color: colors.error }]}>{t.profile.incorrectPassphrase}</Text>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: colors.border, flex: 1 }]}
                onPress={() => { setShowPassphraseModal(false); setPassphraseInput(''); setPassphraseError(false); }}
              >
                <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.solidBtn, { backgroundColor: colors.primary, flex: 1 }]}
                onPress={handlePassphraseSubmit}
              >
                <Text style={styles.solidBtnText}>{t.profile.unlock}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 12,
    },
    headerWolf: { width: 52, height: 52 },
    screenTitle: { fontSize: FontSize.xxl, fontWeight: '900', color: c.text },
    screenSub: { fontSize: FontSize.sm, color: c.textSecondary, marginTop: 1 },

    card: {
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 18,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    sectionTitle: {
      fontSize: FontSize.sm,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 14,
    },

    chipRow: { flexDirection: 'row', gap: 8 },

    addrChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1,
    },
    addrChipText: { fontSize: FontSize.sm, fontWeight: '700', flex: 1 },
    balanceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1 },
    balanceChipText:{ fontSize: FontSize.sm, fontWeight: '700' },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    linkRowText: { fontSize: FontSize.sm, fontWeight: '600' },

    settingLabel: { fontSize: FontSize.sm, fontWeight: '700', color: c.text, marginBottom: 8 },
    segmentedRow: { flexDirection: 'row', gap: 8 },
    segmentBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      gap: 2,
    },
    segmentLabel: { fontSize: FontSize.xs, fontWeight: '600' },
    flagEmoji: { fontSize: 16 },

    otpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    otpRowText: { flex: 1, fontSize: FontSize.sm },
    otpRowEdit: { fontSize: FontSize.sm, fontWeight: '700' },

    textInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 14,
      fontSize: FontSize.md,
      marginTop: 4,
    },

    solidBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    solidBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
    outlineBtn: { paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
    outlineBtnText: { fontWeight: '700', fontSize: FontSize.sm },

    devSection: { marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 14 },

    tapHintBox: { borderRadius: 10, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 12 },
    tapHintText: { fontSize: FontSize.xs, fontWeight: '600' },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalBox: {
      borderRadius: 20,
      padding: 24,
      width: '100%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 10,
    },
    modalTitle: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: 6 },
    modalSubtitle: { fontSize: FontSize.sm, marginBottom: 8 },
    errorText: { fontSize: FontSize.sm, marginTop: 6 },

    devWalletBox: { marginTop: 14, borderRadius: 12, borderWidth: 1, padding: 14 },
    devWalletTitle: { fontSize: FontSize.sm, fontWeight: '800', marginBottom: 4 },
    devWalletHint: { fontSize: FontSize.xs, marginBottom: 2 },
    keyBox: { marginTop: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
    keyText: { fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
    keyHint: { fontSize: FontSize.xs, marginTop: 6, fontWeight: '600' },
    devWalletLabel: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 12 },
  });

export default ProfileScreen;
