import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontSize, ColorPalette } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import {
  HomeState, DEFAULT_HOME_STATE,
  InventoryItem, EquippedLoadout, DEFAULT_LOADOUT,
  PackType, ItemRarity,
} from '@/types';
import { getHomeState } from '@/services/homeService';
import {
  openPack, getInventory, getLoadout, equipItem, unequipSkin,
  PACK_PRICES, SKIN_CATALOG, SKIN_MULTIPLIERS, getDropRates,
} from '@/services/inventoryService';
import { eventBus, Events } from '@/services/eventBus';
import { SkinImages } from '@/assets/images';
import { useTranslation } from '@/i18n';
import { Box, Gift, Sparkles, Store, PawPrint, Lock } from 'lucide-react-native';

const N_SPARKLES = 16;
const SPARKLE_R = 130;

const RARITY_GLOW: Record<string, string> = {
  common: '#9E9E9E',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f97316',
};

const topRarityColor = (items: InventoryItem[]): string => {
  for (const r of ['legendary', 'epic', 'rare', 'uncommon', 'common']) {
    if (items.some(i => i.rarity === r)) return RARITY_GLOW[r];
  }
  return RARITY_GLOW.common;
};

interface RevealState {
  packType: PackType;
  packColor: string;
  packLabel: string;
  items: InventoryItem[];
  refund: number;
}


const ShopScreen = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const PACK_META: Record<PackType, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
    basic: { label: t.shop.packLabels.basic, icon: <Box size={28} color="#9E9E9E" />, desc: t.shop.packDescs.basic,color: '#9E9E9E' },
    premium: { label: t.shop.packLabels.premium, icon: <Gift size={28} color="#2196F3" />, desc: t.shop.packDescs.premium, color: '#2196F3' },
    legendary: { label: t.shop.packLabels.legendary, icon: <Sparkles size={28} color="#FF9800" />, desc: t.shop.packDescs.legendary, color: '#FF9800' },
  };

  const RARITY_LABEL: Record<ItemRarity, string> = {
    common: t.shop.rarity.common,
    uncommon: t.shop.rarity.uncommon,
    rare: t.shop.rarity.rare,
    epic: t.shop.rarity.epic,
    legendary: t.shop.rarity.legendary,
  };

  const RC: Record<ItemRarity, string> = {
    common: colors.rarityCommon,
    uncommon: colors.rarityUncommon,
    rare: colors.rarityRare,
    epic: colors.rarityEpic,
    legendary: colors.rarityLegendary,
  };

  const [home, setHome] = useState<HomeState>(DEFAULT_HOME_STATE);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loadout, setLoadout] = useState<EquippedLoadout>(DEFAULT_LOADOUT);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'shop' | 'collection'>('shop');
  const [revealState, setRevealState] = useState<RevealState | null>(null);

  const loadData = useCallback(async () => {
    const [h, inv, lo] = await Promise.all([getHomeState(), getInventory(), getLoadout()]);
    setHome(h);
    setInventory(inv);
    setLoadout(lo);
  }, []);

  useEffect(() => {
    loadData();
    const unsubs = [
      eventBus.on(Events.HOME_STATE_CHANGED, loadData),
      eventBus.on(Events.INVENTORY_CHANGED, loadData),
    ];
    return () => unsubs.forEach((u) => u());
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleOpenPack = async (packType: PackType) => {
    const meta = PACK_META[packType];
    const price = PACK_PRICES[packType];
    if (home.totalPoints < price) {
      Alert.alert(t.profile.notEnoughPoints, t.shop.notEnoughMsg(price, meta.label));
      return;
    }
    const result = await openPack(packType);
    if (!result) { Alert.alert(t.shop.openErrorTitle, t.shop.openError); return; }
    await loadData();
    setRevealState({ packType, packColor: meta.color, packLabel: meta.label, items: result.items, refund: result.duplicateRefund });
  };

  const handleEquip = async (item: InventoryItem) => {
    if (loadout.skin === item.itemId) await unequipSkin();
    else await equipItem(item.itemId);
    await loadData();
  };

  const dropRates = getDropRates();
  const ownedCount = inventory.length;
  const catalogWithOwned = SKIN_CATALOG.map((s) => ({
    ...s,
    owned: inventory.find((i) => i.itemId === s.itemId),
  }));
  const activeSkin = loadout.skin ? SKIN_CATALOG.find((s) => s.itemId === loadout.skin) : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.pageTitle}>{t.shop.title}</Text>
            <Text style={styles.pageSubtitle}>{t.shop.subtitle}</Text>
          </View>
          <View style={styles.balanceChip}>
            <Text style={styles.balanceChipVal}>{home.totalPoints.toLocaleString()}</Text>
            <Text style={styles.balanceChipLabel}>{t.common.pts}</Text>
          </View>
        </View>

        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segment, { backgroundColor: tab === 'shop' ? colors.primary : 'transparent', elevation: tab === 'shop' ? 3 : 0 }]}
            onPress={() => setTab('shop')}
          >
            <Store size={16} color={tab === 'shop' ? colors.textOnPrimary : colors.textSecondary} />
            <Text style={[styles.segmentText, { color: tab === 'shop' ? colors.textOnPrimary : colors.textSecondary }]}>{t.shop.shopTab}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, { backgroundColor: tab === 'collection' ? colors.primary : 'transparent', elevation: tab === 'collection' ? 3 : 0 }]}
            onPress={() => setTab('collection')}
          >
            <PawPrint size={16} color={tab === 'collection' ? colors.textOnPrimary : colors.textSecondary} />
            <Text style={[styles.segmentText, { color: tab === 'collection' ? colors.textOnPrimary : colors.textSecondary }]}>
              {t.shop.collectionTab} {ownedCount}/{SKIN_CATALOG.length}
            </Text>
          </TouchableOpacity>
        </View>

        {tab === 'shop' && (
          <>
            {(['basic', 'premium', 'legendary'] as PackType[]).map((pt) => {
              const meta = PACK_META[pt];
              const canAfford = home.totalPoints >= PACK_PRICES[pt];
              const rates = dropRates[pt];
              return (
                <View key={pt} style={styles.packCard}>
                  <View style={[styles.packTopBar, { backgroundColor: meta.color }]} />
                  <View style={styles.packInner}>
                    <View style={styles.packTitleRow}>
                      <View style={styles.packEmoji}>{meta.icon}</View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.packName}>{meta.label}</Text>
                        <Text style={styles.packDesc}>{meta.desc}</Text>
                      </View>
                      <View style={[styles.packPriceBox, { backgroundColor: meta.color + '18' }]}>
                        <Text style={[styles.packPriceVal, { color: meta.color }]}>{PACK_PRICES[pt]}</Text>
                        <Text style={[styles.packPriceLbl, { color: meta.color }]}>pts</Text>
                      </View>
                    </View>

                    <View style={styles.rateBar}>
                      {(Object.entries(rates) as [ItemRarity, number][]).map(([rarity, rate]) => (
                        <View
                          key={rarity}
                          style={[styles.rateSegment, { flex: rate, backgroundColor: RC[rarity] }]}
                        />
                      ))}
                    </View>
                    <View style={styles.rateLegend}>
                      {(Object.entries(rates) as [ItemRarity, number][]).map(([rarity, rate]) => (
                        <Text key={rarity} style={[styles.rateLegendText, { color: RC[rarity] }]}>
                          {RARITY_LABEL[rarity][0]} {Math.round(rate * 100)}%
                        </Text>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={[styles.openBtn, { backgroundColor: canAfford ? meta.color : colors.textLight }]}
                      onPress={() => handleOpenPack(pt)}
                      disabled={!canAfford}
                    >
                      <Text style={styles.openBtnText}>
                        {canAfford ? `${t.shop.openPack} | ${PACK_PRICES[pt]} ${t.common.pts}` : t.shop.notEnoughPts}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>{t.shop.bonusInfoTitle}</Text>
              <Text style={styles.infoSub}>{t.shop.bonusInfoSub}</Text>
              <View style={styles.bonusGrid}>
                {(Object.entries(SKIN_MULTIPLIERS) as [ItemRarity, number][]).map(([rarity, mult]) => (
                  <View key={rarity} style={[styles.bonusChip, { backgroundColor: RC[rarity] + '18' }]}>
                    <Text style={[styles.bonusChipPct, { color: RC[rarity] }]}>+{Math.round((mult - 1) * 100)}%</Text>
                    <Text style={styles.bonusChipLabel}>{RARITY_LABEL[rarity]}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {tab === 'collection' && (
          <>
            {activeSkin ? (
              <View style={[styles.equippedBanner, { borderColor: RC[activeSkin.rarity] + '80' }]}>
                <Image source={SkinImages[activeSkin.itemId]} style={styles.equippedBannerImg} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.equippedBannerHint}>{t.shop.currentlyEquipped}</Text>
                  <Text style={styles.equippedBannerName}>{activeSkin.name}</Text>
                  <View style={styles.equippedBannerRow}>
                    <View style={[styles.rarityPill, { backgroundColor: RC[activeSkin.rarity] + '22' }]}>
                      <Text style={[styles.rarityPillText, { color: RC[activeSkin.rarity] }]}>{RARITY_LABEL[activeSkin.rarity]}</Text>
                    </View>
                    <Text style={[styles.equippedBannerBonus, { color: RC[activeSkin.rarity] }]}>
                      +{Math.round((SKIN_MULTIPLIERS[activeSkin.rarity] - 1) * 100)}% {t.shop.pointsBonus}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleEquip({ ...activeSkin, category: 'skin', iconKey: activeSkin.itemId, quantity: 1, ownedAt: '' })}
                >
                  <Text style={styles.removeBtnText}>{t.shop.remove}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noSkinBanner}>
                <Text style={styles.noSkinText}>{t.shop.noSkinEquipped}</Text>
              </View>
            )}

            <View style={styles.grid}>
              {catalogWithOwned.map(({ itemId, name, rarity, owned }) => {
                const isEquipped = loadout.skin === itemId;
                const img = SkinImages[itemId];
                const rarityColor = RC[rarity];
                return (
                  <View
                    key={itemId}
                    style={[
                      styles.skinCard,
                      { borderColor: isEquipped ? rarityColor : owned ? rarityColor + '50' : colors.border },
                      isEquipped && { backgroundColor: rarityColor + '10' },
                    ]}
                  >
                    <View style={styles.skinImgWrap}>
                      {img
                        ? <Image source={img} style={[styles.skinImg, !owned && styles.skinImgLocked]} />
                        : <View style={[styles.skinImgPlaceholder, { backgroundColor: rarityColor + '20' }]}>
                            <PawPrint size={36} color={rarityColor} />
                          </View>
                      }
                      <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
                      {isEquipped && (
                        <View style={[styles.equippedBadge, { backgroundColor: rarityColor }]}>
                          <Text style={styles.equippedBadgeText}>ON</Text>
                        </View>
                      )}
                      {!owned && (
                        <View style={styles.lockOverlay}>
                          <Lock size={22} color="#fff" />
                        </View>
                      )}
                    </View>

                    <View style={styles.skinInfo}>
                      <Text style={[styles.skinName, !owned && { color: colors.textSecondary }]} numberOfLines={1}>{name}</Text>
                      <Text style={[styles.skinMult, { color: rarityColor }]}>+{Math.round((SKIN_MULTIPLIERS[rarity] - 1) * 100)}%</Text>
                    </View>

                    {owned ? (
                      <TouchableOpacity
                        style={[styles.skinBtn, { backgroundColor: isEquipped ? colors.textLight + '40' : rarityColor }]}
                        onPress={() => handleEquip(owned)}
                      >
                        <Text style={[styles.skinBtnText, isEquipped && { color: colors.textSecondary }]}>
                          {isEquipped ? t.shop.remove : t.shop.equip}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.skinBtnLocked}>
                        <Text style={styles.skinBtnLockedText}>{t.shop.openPacks}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <PackRevealModal
        revealState={revealState}
        onDismiss={() => { setRevealState(null); loadData(); }}
      />
    </SafeAreaView>
  );
};


const PackRevealModal = ({
  revealState,
  onDismiss,
}: {
  revealState: RevealState | null;
  onDismiss: () => void;
}) => {
  const { t } = useTranslation();
  const visible = revealState !== null;

  type Phase = 'entering' | 'ready' | 'opening' | 'revealed';
  const [phase, setPhase] = useState<Phase>('entering');

  const backdrop = useRef(new Animated.Value(0)).current;
  const packScale = useRef(new Animated.Value(0.2)).current;
  const packOpacity = useRef(new Animated.Value(0)).current;
  const packTransY = useRef(new Animated.Value(80)).current;
  const packRotate = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const burstScale = useRef(new Animated.Value(0.1)).current;
  const burstOpacity = useRef(new Animated.Value(0)).current;
  const skinScale = useRef(new Animated.Value(0)).current;
  const skinOpacity = useRef(new Animated.Value(0)).current;
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const infoTransY = useRef(new Animated.Value(24)).current;
  const tapOpacity = useRef(new Animated.Value(0)).current;

  const sparkles = useRef(
    Array.from({ length: N_SPARKLES }, (_, i) => {
      const a = (i / N_SPARKLES) * Math.PI * 2;
      return {
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        op: new Animated.Value(0),
        tx: Math.cos(a) * SPARKLE_R,
        ty: Math.sin(a) * SPARKLE_R,
      };
    })
  ).current;

  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);
  const tapLoop = useRef<Animated.CompositeAnimation | null>(null);

  const reset = useCallback(() => {
    backdrop.setValue(0);
    packScale.setValue(0.2);
    packOpacity.setValue(0);
    packTransY.setValue(80);
    packRotate.setValue(0);
    glowScale.setValue(0.8);
    glowOpacity.setValue(0);
    burstScale.setValue(0.1);
    burstOpacity.setValue(0);
    skinScale.setValue(0);
    skinOpacity.setValue(0);
    infoOpacity.setValue(0);
    infoTransY.setValue(24);
    tapOpacity.setValue(0);
    sparkles.forEach(s => { s.x.setValue(0); s.y.setValue(0); s.op.setValue(0); });
  }, []);

  useEffect(() => {
    if (!visible) { glowLoop.current?.stop(); tapLoop.current?.stop(); return; }
    reset();
    setPhase('entering');

    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0.9, duration: 300, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(80),
        Animated.parallel([
          Animated.spring(packScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
          Animated.timing(packOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(packTransY, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(250),
        Animated.timing(glowOpacity, { toValue: 0.5, duration: 500, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setPhase('ready');
      glowLoop.current = Animated.loop(Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.25, duration: 950, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 0.82, duration: 950, useNativeDriver: true }),
      ]));
      glowLoop.current.start();
      tapLoop.current = Animated.loop(Animated.sequence([
        Animated.timing(tapOpacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(tapOpacity, { toValue: 0.2, duration: 650, useNativeDriver: true }),
      ]));
      tapLoop.current.start();
    });
  }, [visible]);

  const handleTap = useCallback(() => {
    if (phase !== 'ready' || !revealState) return;
    setPhase('opening');
    glowLoop.current?.stop();
    tapLoop.current?.stop();
    tapOpacity.setValue(0);

    Animated.sequence([
      Animated.timing(packRotate, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(packRotate, { toValue: 12, duration: 55, useNativeDriver: true }),
      Animated.timing(packRotate, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(packRotate, { toValue: 12, duration: 55, useNativeDriver: true }),
      Animated.timing(packRotate, { toValue: 0, duration: 55, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(packScale, { toValue: 2, duration: 260, useNativeDriver: true }),
        Animated.timing(packOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(burstScale, { toValue: 5, duration: 700, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(burstOpacity, { toValue: 0.9, duration: 80, useNativeDriver: true }),
          Animated.timing(burstOpacity, { toValue: 0, duration: 560, useNativeDriver: true }),
        ]),
        ...sparkles.map(s => Animated.parallel([
          Animated.timing(s.op, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(s.x, { toValue: s.tx, duration: 680, useNativeDriver: true }),
          Animated.timing(s.y, { toValue: s.ty, duration: 680, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(200),
            Animated.timing(s.op, { toValue: 0, duration: 480, useNativeDriver: true }),
          ]),
        ])),
      ]),
    ]).start();

    setTimeout(() => {
      setPhase('revealed');
      Animated.parallel([
        Animated.spring(skinScale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }),
        Animated.timing(skinOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.6, duration: 500, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(350),
          Animated.parallel([
            Animated.timing(infoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(infoTransY, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]),
        ]),
      ]).start(() => {
        glowLoop.current = Animated.loop(Animated.sequence([
          Animated.timing(glowScale, { toValue: 1.35, duration: 1300, useNativeDriver: true }),
          Animated.timing(glowScale, { toValue: 0.95, duration: 1300, useNativeDriver: true }),
        ]));
        glowLoop.current.start();
      });
    }, 750);
  }, [phase, revealState]);

  if (!visible || !revealState) return null;

  const { packType, packColor, packLabel, items, refund } = revealState;
  const mainItem = items[0] ?? null;
  const mainImg = mainItem ? SkinImages[mainItem.iconKey] : null;
  const glowColor = topRarityColor(items);

  const rotateDeg = packRotate.interpolate({
    inputRange: [-12, 0, 12],
    outputRange: ['-12deg', '0deg', '12deg'],
  });

  return (
    <Modal visible transparent animationType="none" onRequestClose={phase === 'revealed' ? onDismiss : undefined}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: backdrop }]} />

      <View style={ms.overlay}>
        <Animated.View pointerEvents="none" style={[ms.burstCircle, {
          backgroundColor: glowColor, opacity: burstOpacity, transform: [{ scale: burstScale }],
        }]} />

        <Animated.View pointerEvents="none" style={[ms.glowCircle, {
          backgroundColor: phase === 'revealed' ? glowColor : packColor,
          opacity: glowOpacity,
          transform: [{ scale: glowScale }],
        }]} />

        {sparkles.map((s, i) => (
          <Animated.View key={i} pointerEvents="none" style={[ms.sparkle, {
            width: i % 3 === 0 ? 10 : 6,
            height: i % 3 === 0 ? 10 : 6,
            backgroundColor: i % 2 === 0 ? glowColor : '#fff',
            opacity: s.op,
            transform: [{ translateX: s.x }, { translateY: s.y }],
          }]} />
        ))}

        {phase !== 'revealed' && (
          <Animated.View style={{
            opacity: packOpacity,
            transform: [{ scale: packScale }, { translateY: packTransY }, { rotate: rotateDeg }],
          }}>
            <TouchableOpacity
              onPress={handleTap}
              disabled={phase !== 'ready'}
              activeOpacity={0.9}
              style={[ms.packBox, { borderColor: packColor }]}
            >
              <View style={[ms.packInner, { borderColor: packColor + '30' }]}>
                {packType === 'basic' && <Box size={88} color={packColor} />}
                {packType === 'premium' && <Gift size={88} color={packColor} />}
                {packType === 'legendary' && <Sparkles size={88} color={packColor} />}
                <Text style={[ms.packLabel, { color: packColor }]}>{packLabel}</Text>
                <Animated.Text style={[ms.tapHint, { color: packColor, opacity: tapOpacity }]}>
                  {t.shop.tapToOpen}
                </Animated.Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {phase === 'revealed' && (
          <Animated.View style={{ alignItems: 'center', opacity: skinOpacity, transform: [{ scale: skinScale }] }}>
            {mainImg
              ? <Image source={mainImg} style={ms.skinImg} resizeMode="contain" />
              : <PawPrint size={130} color={glowColor} />
            }
          </Animated.View>
        )}

        {phase === 'revealed' && mainItem && (
          <Animated.View style={[ms.infoPanel, { opacity: infoOpacity, transform: [{ translateY: infoTransY }] }]}>
            <View style={[ms.rarityBadge, { backgroundColor: glowColor }]}>
              <Text style={ms.rarityBadgeText}>{mainItem.rarity.toUpperCase()}</Text>
            </View>
            <Text style={ms.skinName}>{mainItem.name}</Text>
            <Text style={[ms.bonusText, { color: glowColor }]}>
              {t.shop.pointsOnTrips(Math.round((SKIN_MULTIPLIERS[mainItem.rarity] - 1) * 100))}
            </Text>
            {items.length > 1 && (
              <Text style={ms.extraText}>{t.shop.moreItems(items.length - 1)}</Text>
            )}
            {refund > 0 && (
              <Text style={ms.refundRevealText}>{t.shop.duplicateRefundMsg(refund)}</Text>
            )}
            <TouchableOpacity onPress={onDismiss} style={[ms.continueBtn, { backgroundColor: glowColor }]}>
              <Text style={ms.continueBtnText}>{t.shop.continueBtn}</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};

const ms = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  burstCircle: { position: 'absolute', width: 140, height: 140, borderRadius: 70 },
  glowCircle: { position: 'absolute', width: 260, height: 260, borderRadius: 130 },
  sparkle: { position: 'absolute', borderRadius: 5 },
  packBox: {
    borderRadius: 28,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  packInner: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  packLabel: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  tapHint: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  skinImg: { width: 210, height: 210 },
  infoPanel: { alignItems: 'center', marginTop: 20, paddingHorizontal: 24, width: '100%' },
  rarityBadge: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 6, marginBottom: 10 },
  rarityBadgeText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 2 },
  skinName: { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  bonusText: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  extraText: { color: '#aaa', fontSize: 13, marginTop: 4 },
  refundRevealText:{ color: '#22c55e', fontSize: 13, fontWeight: '700', marginTop: 4 },
  continueBtn: { marginTop: 22, borderRadius: 16, paddingHorizontal: 52, paddingVertical: 16 },
  continueBtnText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
});


const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    scroll: { paddingHorizontal: 20 },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 16,
    },
    pageTitle: { fontSize: 28, fontWeight: '900', color: c.text, letterSpacing: -0.5 },
    pageSubtitle: { fontSize: FontSize.sm, color: c.textSecondary, marginTop: 2 },
    balanceChip: { alignItems: 'center', backgroundColor: c.primary + '18', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
    balanceChipVal: { fontSize: FontSize.xl, fontWeight: '900', color: c.primary },
    balanceChipLabel: { fontSize: 10, color: c.primary, fontWeight: '600', marginTop: 1 },

    segmented: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 4,
      marginBottom: 16,
      gap: 4,
    },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingVertical: 10,
      borderRadius: 12,
    },
    segmentText: { fontSize: FontSize.sm, fontWeight: '700', color: c.textSecondary },

    packCard: {
      backgroundColor: c.card,
      borderRadius: 20,
      marginBottom: 12,
      overflow: 'hidden',
    },
    packTopBar: { height: 4 },
    packInner: { padding: 16 },
    packTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    packEmoji: { width: 36, height: 36, alignItems: 'center' as const, justifyContent: 'center' as const },
    packName: { fontSize: FontSize.lg, fontWeight: '800', color: c.text },
    packDesc: { fontSize: FontSize.xs, color: c.textSecondary, marginTop: 2 },
    packPriceBox: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
    packPriceVal: { fontSize: FontSize.lg, fontWeight: '900' },
    packPriceLbl: { fontSize: 10, fontWeight: '600' },

    rateBar: {
      flexDirection: 'row',
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 6,
      gap: 2,
    },
    rateSegment: { borderRadius: 4 },
    rateLegend: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    rateLegendText: { fontSize: 10, fontWeight: '700' },

    openBtn: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
    openBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

    infoCard: { backgroundColor: c.card, borderRadius: 20, padding: 16, marginBottom: 12 },
    infoTitle: { fontSize: FontSize.md, fontWeight: '800', color: c.text, marginBottom: 4 },
    infoSub: { fontSize: FontSize.xs, color: c.textSecondary, marginBottom: 12 },
    bonusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    bonusChip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, alignItems: 'center', minWidth: '18%' },
    bonusChipPct: { fontSize: FontSize.sm, fontWeight: '900' },
    bonusChipLabel: { fontSize: 9, color: c.textSecondary, marginTop: 1, fontWeight: '600' },

    equippedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 20,
      marginBottom: 14,
      padding: 14,
      gap: 12,
      borderWidth: 2,
    },
    equippedBannerImg: { width: 80, height: 80, resizeMode: 'contain', borderRadius: 12 },
    equippedBannerHint: { fontSize: 10, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
    equippedBannerName: { fontSize: FontSize.lg, fontWeight: '800', color: c.text, marginTop: 2 },
    equippedBannerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    equippedBannerBonus: { fontSize: FontSize.xs, fontWeight: '700' },
    rarityPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    rarityPillText: { fontSize: 11, fontWeight: '800' },
    removeBtn: { borderRadius: 10, borderWidth: 1, borderColor: c.border, paddingHorizontal: 10, paddingVertical: 6 },
    removeBtnText: { fontSize: FontSize.xs, fontWeight: '600', color: c.textSecondary },

    noSkinBanner: { backgroundColor: c.card, borderRadius: 16, padding: 14, marginBottom: 14, alignItems: 'center' },
    noSkinText: { fontSize: FontSize.sm, color: c.textSecondary, fontWeight: '500' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    skinCard: {
      width: '47.5%',
      backgroundColor: c.card,
      borderRadius: 18,
      borderWidth: 2,
      overflow: 'hidden',
    },
    skinImgWrap: {
      width: '100%',
      height: 120,
      position: 'relative',
      backgroundColor: c.surface,
    },
    skinImg: { width: '100%', height: '100%', resizeMode: 'contain' },
    skinImgLocked: { opacity: 0.25 },
    skinImgPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
    rarityDot: {
      position: 'absolute',
      top: 8,
      left: 8,
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    equippedBadge: { position: 'absolute', top: 7, right: 7, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    equippedBadgeText: { color: '#fff', fontWeight: '900', fontSize: 10 },
    lockOverlay: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background + '88',
    },
    skinInfo: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4 },
    skinName: { fontSize: FontSize.sm, fontWeight: '700', color: c.text },
    skinMult: { fontSize: FontSize.xs, fontWeight: '800', marginTop: 1 },
    skinBtn: { marginHorizontal: 10, marginBottom: 10, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    skinBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.sm },
    skinBtnLocked: { marginHorizontal: 10, marginBottom: 10, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: c.divider },
    skinBtnLockedText:{ color: c.textSecondary, fontWeight: '600', fontSize: FontSize.sm },
  });

export default ShopScreen;
