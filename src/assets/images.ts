const WolfImages = {
  happy: require('../../resources/images/wolf_happy.png'),
  standing: require('../../resources/images/wolf_standing.png'),
  neutral: require('../../resources/images/wolf_neutral.png'),
  talk: require('../../resources/images/wolf_talk.png'),
  talk2: require('../../resources/images/wolf_talk2.png'),
  wave: require('../../resources/images/wolf_wave.png'),
  logo: require('../../resources/images/app_logo.png'),
  logoHead: require('../../resources/images/app_logo2.png'),
};

const WolfByMood: Record<string, ReturnType<typeof require>> = {
  happy: WolfImages.happy,
  content: WolfImages.standing,
  neutral: WolfImages.neutral,
  sad: WolfImages.neutral,
  hungry: WolfImages.talk2,
};

const SkinImages: Record<string, ReturnType<typeof require>> = {
  skin_golden: require('../../resources/images/skin_golden.png'),
  skin_arctic: require('../../resources/images/skin_arctic.png'),
  skin_forest: require('../../resources/images/skin_forest.png'),
  skin_cherry: require('../../resources/images/skin_cherry.png'),
  skin_midnight: require('../../resources/images/skin_midnight.png'),
  skin_sunset: require('../../resources/images/skin_sunset.png'),
  skin_shadow: require('../../resources/images/skin_shadow.png'),
  skin_galaxy: require('../../resources/images/skin_galaxy.png'),
};

export { WolfImages, WolfByMood, SkinImages };
