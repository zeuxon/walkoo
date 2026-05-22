import React, { useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, FontSize, BorderRadius, ColorPalette } from '@/theme';
import { useTheme } from '@/theme/ThemeContext';
import { WolfImages } from '@/assets/images';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingPage {
  image: ImageSourcePropType;
  title: string;
  description: string;
}

const PAGES: OnboardingPage[] = [
  {
    image: WolfImages.wave,
    title: 'Welcome to Walkoo!',
    description:
      'Meet your companion wolf! Together you will explore the city on foot and by public transport while earning rewards along the way.',
  },
  {
    image: WolfImages.talk,
    title: 'Plan your route',
    description:
      'Tap anywhere on the map to pick a destination. Walkoo plans walking and transit routes using real city data.',
  },
  {
    image: WolfImages.happy,
    title: 'Earn points',
    description:
      'Walk the route and earn points for every meter of progress. Complete the full route for a bonus reward!',
  },
  {
    image: WolfImages.standing,
    title: 'Care for your wolf',
    description:
      'Your wolf levels up as you explore. Feed it, play with it, and watch its mood change based on your activity.',
  },
  {
    image: WolfImages.logo,
    title: 'Ready to walk?',
    description:
      'Start your sustainable mobility journey now. Every step counts!',
  },
];

interface Props {
  onComplete: () => void;
}

const OnboardingScreen = ({ onComplete }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      onComplete();
    }
  }, [currentIndex, onComplete]);

  const renderItem = useCallback(
    ({ item }: { item: OnboardingPage }) => (
      <View style={styles.page}>
        <View style={styles.imageContainer}>
          <Image source={item.image} style={styles.image} resizeMode="contain" />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    ),
    [styles],
  );

  const isLastPage = currentIndex === PAGES.length - 1;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.skipContainer}>
        {!isLastPage && (
          <TouchableOpacity onPress={onComplete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        keyExtractor={(_, i) => i.toString()}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={goNext} activeOpacity={0.8}>
          <Text style={styles.nextButtonText}>
            {isLastPage ? "Let's go!" : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (c: ColorPalette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    skipContainer: {
      alignItems: 'flex-end',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      minHeight: 36,
    },
    skipText: {
      fontSize: FontSize.lg,
      color: c.textSecondary,
      fontWeight: '600',
    },
    page: {
      width: SCREEN_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xl,
    },
    imageContainer: {
      width: SCREEN_WIDTH * 0.6,
      height: SCREEN_WIDTH * 0.6,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xl,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    title: {
      fontSize: FontSize.xxl,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
      marginBottom: Spacing.md,
    },
    description: {
      fontSize: FontSize.lg,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: Spacing.md,
    },
    footer: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xl,
      alignItems: 'center',
      gap: Spacing.lg,
    },
    dots: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    dotActive: {
      backgroundColor: c.primary,
      width: 28,
      borderRadius: 5,
    },
    dotInactive: {
      backgroundColor: c.divider,
    },
    nextButton: {
      backgroundColor: c.primary,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xxl,
      width: '100%',
      alignItems: 'center',
    },
    nextButtonText: {
      color: c.textOnPrimary,
      fontSize: FontSize.xl,
      fontWeight: '700',
    },
  });

export default OnboardingScreen;
