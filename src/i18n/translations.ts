import type { Language } from '@/types';

export interface Translations {
  tabs: {
    home: string;
    map: string;
    activity: string;
    shop: string;
    stats: string;
    profile: string;
  };
  common: {
    save: string;
    cancel: string;
    edit: string;
    reset: string;
    pts: string;
    km: string;
    days: string;
    done: string;
    active: string;
    stopped: string;
    completed: string;
  };
  home: {
    greeting: string;
    totalPoints: string;
    dayStreak: string;
    dailyGoal: string;
    goalReached: string;
    today: string;
    streak: string;
    badges: string;
    xp: string;
    hunger: string;
    energy: string;
    weeklyChallenges: string;
    completed: string;
    resetTitle: string;
    resetMsg: string;
    moods: { happy: string; content: string; neutral: string; sad: string; hungry: string };
  };
  map: {
    searchPlaceholder: string;
    walk: string;
    transit: string;
    planRoute: string;
    startNavigation: string;
    stop: string;
    progress: string;
    bonus: string;
    totalPts: string;
    routeSteps: string;
    departs: string;
    then: string;
    routeCompleted: string;
    planningWalk: string;
    planningTransit: string;
    refreshingRoute: string;
    locationNeeded: string;
    locationNeededMsg: string;
    destinationNeeded: string;
    destinationNeededMsg: string;
    routeError: string;
    noTransitRoute: string;
    noWalkRoute: string;
    devFinish: string;
    walkTo: string;
    walkLabel: string;
    takeLine: string;
    toward: string;
    now: string;
    completeTitle: string;
    pointsEarned: string;
    distanceLabel: string;
    completionBonusLabel: string;
    continueBtn: string;
  };
  activity: {
    title: string;
    trips: string;
    ledger: string;
    badgesTab: string;
    challenges: string;
    badgeProgressSuffix: string;
    distance: string;
    walking: string;
    points: string;
    noTrips: string;
    noLedger: string;
    noBadges: string;
    noChallenges: string;
    earned: string;
    inProgress: string;
    verifiedOnChain: string;
    doneStatus: string;
    stoppedStatus: string;
    activeStatus: string;
    walk: string;
    transit: string;
    mixed: string;
    rewardPts: string;
    ledgerKinds: {
      route_progress: string;
      route_completion: string;
      challenge_reward: string;
      daily_streak: string;
      spend_pack: string;
      duplicate_refund: string;
      unknown: string;
    };
  };
  shop: {
    title: string;
    shopTab: string;
    collectionTab: string;
    balance: string;
    openPack: string;
    opening: string;
    packReveal: string;
    youGot: string;
    alreadyOwned: string;
    equip: string;
    remove: string;
    equipped: string;
    bonusInfo: string;
    noPacks: string;
    noSkins: string;
    currentlyEquipped: string;
    dropRates: string;
    multipliers: string;
    rarity: {
      common: string;
      uncommon: string;
      rare: string;
      epic: string;
      legendary: string;
    };
    subtitle: string;
    packLabels: { basic: string; premium: string; legendary: string };
    packDescs: { basic: string; premium: string; legendary: string };
    notEnoughMsg: (price: number, label: string) => string;
    openErrorTitle: string;
    openError: string;
    notEnoughPts: string;
    bonusInfoTitle: string;
    bonusInfoSub: string;
    pointsBonus: string;
    noSkinEquipped: string;
    openPacks: string;
    tapToOpen: string;
    pointsOnTrips: (pct: number) => string;
    moreItems: (n: number) => string;
    duplicateRefundMsg: (pts: number) => string;
    continueBtn: string;
  };
  analytics: {
    title: string;
    tripsLabel: string;
    completion: string;
    streak: string;
    walkDist: string;
    transitDist: string;
    earned: string;
    spent: string;
    net: string;
    activeDays: string;
    tripsPerDay: string;
    firstTrip: string;
    thisWeek: string;
    lastWeek: string;
    twoWeeksAgo: string;
    distanceSplit: string;
    pointsOverview: string;
    weeklyPoints: string;
    earnedVsSpent: string;
    activeDaysTitle: string;
    metrics: string;
    never: string;
    noData: string;
    subtitle: string;
    weeklyTripsSub: string;
    walkDistTitle: string;
    transitDistTitle: string;
    metersPerWeek: string;
    activeDaysSub: string;
    completionSub: string;
  };
  profile: {
    title: string;
    subtitle: string;
    progression: string;
    points: string;
    streak: string;
    petLevel: string;
    trips: string;
    done: string;
    net: string;
    petCare: string;
    feed: string;
    play: string;
    train: string;
    hunger: string;
    energy: string;
    fun: string;
    xp: string;
    levelPerks: string;
    active: string;
    reachLv: string;
    toUnlock: string;
    mobilitySummary: string;
    walkDist: string;
    transitDist: string;
    totalDist: string;
    tripPts: string;
    bonuses: string;
    walkPct: string;
    blockchain: string;
    gasless: string;
    viewWallet: string;
    viewContract: string;
    settings: string;
    appearance: string;
    language: string;
    otpServer: string;
    devMode: string;
    replayTutorial: string;
    moreTapsHint: (n: number) => string;
    themeAuto: string;
    themeLight: string;
    themeDark: string;
    langEn: string;
    langHu: string;
    devAccess: string;
    devAccessSub: string;
    incorrectPassphrase: string;
    unlock: string;
    notEnoughPoints: string;
    trainCostMsg: (cost: number) => string;
    trained: string;
    xpEarned: (xp: number) => string;
    otpSaved: string;
    otpSavedMsg: string;
    resetProgress: string;
    resetConfirmMsg: string;
    resetConfirmBtn: string;
    walletImported: string;
    walletImportedMsg: (addr: string) => string;
    invalidKey: string;
    invalidKeyMsg: string;
    walletDevTools: string;
    walletDevHint: string;
    hidePrivateKey: string;
    showPrivateKey: string;
    privateKeyWarning: string;
    importByKey: string;
    privateKeyPlaceholder: string;
    importing: string;
    importWallet: string;
    passphrasePlaceholder: string;
    perks: Record<string, { label: string; description: string }>;
  };
  badgeTemplates: Record<string, { name: string; description: string }>;
  challengeTemplates: Record<string, { name: string; description: string }>;
}

const en: Translations = {
  tabs: {
    home: 'Home',
    map: 'Map',
    activity: 'Activity',
    shop: 'Shop',
    stats: 'Stats',
    profile: 'Profile',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    reset: 'Reset',
    pts: 'pts',
    km: 'km',
    days: 'days',
    done: 'Done',
    active: 'Active',
    stopped: 'Stopped',
    completed: 'Completed',
  },
  home: {
    greeting: 'Good day!',
    totalPoints: 'points',
    dayStreak: 'day streak',
    dailyGoal: 'Daily Goal',
    goalReached: 'Goal reached! Keep going 🎉',
    today: 'Today',
    streak: 'Streak',
    badges: 'Badges',
    xp: 'XP',
    hunger: 'Hunger',
    energy: 'Energy',
    weeklyChallenges: 'Weekly Challenges',
    completed: 'Completed ✓',
    resetTitle: 'Reset All Data?',
    resetMsg: 'This will clear all progress.',
    moods: { happy: 'Happy', content: 'Content', neutral: 'Neutral', sad: 'Sad', hungry: 'Hungry' },
  },
  map: {
    searchPlaceholder: 'Tap map or a place to set destination',
    walk: 'Walk',
    transit: 'Transit',
    planRoute: 'Plan Route',
    startNavigation: 'Start Navigation →',
    stop: '■ Stop',
    progress: 'progress',
    bonus: 'bonus',
    totalPts: 'total pts',
    routeSteps: 'Route steps',
    departs: 'Departs',
    then: 'Then:',
    routeCompleted: 'Route completed! Points awarded 🎉',
    planningWalk: 'Planning walking route...',
    planningTransit: 'Planning transit route...',
    refreshingRoute: 'Refreshing route…',
    locationNeeded: 'Location needed',
    locationNeededMsg: 'Could not determine your location.',
    destinationNeeded: 'Destination needed',
    destinationNeededMsg: 'Tap the map to pick a destination.',
    routeError: 'Route Error',
    noTransitRoute: 'No transit route found. Try another destination or switch to Walk only.',
    noWalkRoute: 'Could not plan a walking route. Check OTP server URL in Profile.',
    devFinish: 'DEV: Finish',
    walkTo: 'Walk to',
    walkLabel: 'Walk',
    takeLine: 'Take',
    toward: 'toward',
    now: 'NOW',
    completeTitle: 'Great Job!',
    pointsEarned: 'points earned',
    distanceLabel: 'distance',
    completionBonusLabel: 'completion bonus',
    continueBtn: 'Continue',
  },
  activity: {
    title: 'Activity',
    trips: 'Trips',
    ledger: 'Ledger',
    badgesTab: 'Badges',
    challenges: 'Challenges',
    badgeProgressSuffix: 'earned',
    distance: 'Distance',
    walking: 'Walking',
    points: 'Points',
    noTrips: 'No trips yet. Head to the Map to start one!',
    noLedger: 'No ledger entries yet.',
    noBadges: 'No badges unlocked yet.',
    noChallenges: 'No challenges this week.',
    earned: 'earned',
    inProgress: 'In Progress',
    verifiedOnChain: '⛓ Verified on-chain',
    doneStatus: 'Done',
    stoppedStatus: 'Stopped',
    activeStatus: 'Active',
    walk: 'walk',
    transit: 'transit',
    mixed: 'mixed',
    rewardPts: 'pts',
    ledgerKinds: {
      route_progress: 'route progress',
      route_completion: 'route completion',
      challenge_reward: 'challenge reward',
      daily_streak: 'daily streak',
      spend_pack: 'pack purchase',
      duplicate_refund: 'duplicate refund',
      unknown: 'activity',
    },
  },
  shop: {
    title: 'Shop',
    shopTab: 'Shop',
    collectionTab: 'Collection',
    balance: 'Balance',
    openPack: 'Open Pack',
    opening: 'Opening...',
    packReveal: 'Pack Reveal',
    youGot: 'You got:',
    alreadyOwned: 'Already owned — refunded',
    equip: 'Equip',
    remove: 'Remove',
    equipped: 'Equipped',
    bonusInfo: 'Bonus Info',
    noPacks: 'No packs in your inventory.',
    noSkins: 'No skins in your collection.',
    currentlyEquipped: 'Currently Equipped',
    dropRates: 'Drop Rates',
    multipliers: 'Multipliers',
    rarity: {
      common: 'Common',
      uncommon: 'Uncommon',
      rare: 'Rare',
      epic: 'Epic',
      legendary: 'Legendary',
    },
    subtitle: 'Collect skins, boost your points',
    packLabels: { basic: 'Basic Pack', premium: 'Premium Pack', legendary: 'Legendary Pack' },
    packDescs: { basic: 'Great for beginners', premium: 'Higher rare chances', legendary: 'Best odds for top skins' },
    notEnoughMsg: (price, label) => `You need ${price} pts to open a ${label}.`,
    openErrorTitle: 'Error',
    openError: 'Could not open pack. Try again.',
    notEnoughPts: 'Not enough pts',
    bonusInfoTitle: 'Skin Point Bonuses',
    bonusInfoSub: 'Equipped skins boost points earned on every trip.',
    pointsBonus: 'points',
    noSkinEquipped: 'No skin equipped — tap one below to equip it.',
    openPacks: 'Open packs',
    tapToOpen: 'Tap to open',
    pointsOnTrips: (pct) => `+${pct}% points on trips`,
    moreItems: (n) => `+${n} more item${n > 1 ? 's' : ''}`,
    duplicateRefundMsg: (pts) => `↩ +${pts} pts duplicate refund`,
    continueBtn: 'Continue',
  },
  analytics: {
    title: 'Analytics',
    tripsLabel: 'Trips',
    completion: 'Completion',
    streak: 'Streak',
    walkDist: 'Walk',
    transitDist: 'Transit',
    earned: 'Earned',
    spent: 'Spent',
    net: 'Net',
    activeDays: 'Active days',
    tripsPerDay: 'Trips per day',
    firstTrip: 'First trip',
    thisWeek: 'This wk',
    lastWeek: 'Last wk',
    twoWeeksAgo: '2w ago',
    distanceSplit: 'Distance Split',
    pointsOverview: 'Points Overview',
    weeklyPoints: 'Weekly Points',
    earnedVsSpent: 'Earned vs Spent',
    activeDaysTitle: 'Active Days',
    metrics: 'Metrics',
    never: 'Never',
    noData: 'No data yet',
    subtitle: 'Your mobility insights',
    weeklyTripsSub: 'Last 6 weeks',
    walkDistTitle: 'Walking Distance',
    transitDistTitle: 'Transit Distance',
    metersPerWeek: 'Meters per week',
    activeDaysSub: 'Days active per week (out of 7)',
    completionSub: '% of trips finished per week',
  },
  badgeTemplates: {
    firstSteps: { name: 'First Steps', description: 'Complete your first trip' },
    gettingAround: { name: 'Getting Around', description: 'Complete 5 trips' },
    regularCommuter: { name: 'Regular Commuter', description: 'Complete 10 trips' },
    routeMaster: { name: 'Route Master', description: 'Complete 25 trips' },
    roadWarrior: { name: 'Road Warrior', description: 'Complete 50 trips' },
    shortWalk: { name: 'Short Walk', description: 'Walk 1 km total' },
    urbanHiker: { name: 'Urban Hiker', description: 'Walk 10 km total' },
    marathonWalker: { name: 'Marathon Walker', description: 'Walk 42 km total' },
    centuryClub: { name: 'Century Club', description: 'Walk 100 km total' },
    transitExplorer: { name: 'Transit Explorer', description: 'Travel 50 km by public transit' },
    twoDayStreak: { name: 'Two-Day Streak', description: 'Use the app 2 days in a row' },
    weekWarrior: { name: 'Week Warrior', description: 'Maintain a 7-day streak' },
    fortnightForce: { name: 'Fortnight Force', description: 'Maintain a 14-day streak' },
    monthlyDevotion: { name: 'Monthly Devotion', description: 'Maintain a 30-day streak' },
    pennySaver: { name: 'Penny Saver', description: 'Earn 100 points total' },
    pointCollector: { name: 'Point Collector', description: 'Earn 500 points total' },
    thousandaire: { name: 'Thousandaire', description: 'Earn 1,000 points total' },
    pointMogul: { name: 'Point Mogul', description: 'Earn 5,000 points total' },
  },
  challengeTemplates: {
    commuter: { name: 'Commuter', description: 'Complete 3 trips this week' },
    frequentRider: { name: 'Frequent Rider', description: 'Complete 5 trips this week' },
    dailyDriver: { name: 'Daily Driver', description: 'Complete 7 trips this week' },
    walkAKilometer: { name: 'Walk a Kilometer', description: 'Walk 1 km this week' },
    urbanWalker: { name: 'Urban Walker', description: 'Walk 5 km this week' },
    longStrider: { name: 'Long Strider', description: 'Walk 10 km this week' },
    busRider: { name: 'Bus Rider', description: 'Travel 5 km by transit this week' },
    transitFan: { name: 'Transit Fan', description: 'Travel 15 km by transit this week' },
    goTheDistance: { name: 'Go the Distance', description: 'Travel 10 km total this week' },
    explorer: { name: 'Explorer', description: 'Travel 20 km total this week' },
    pointChaser: { name: 'Point Chaser', description: 'Earn 200 points this week' },
    bigEarner: { name: 'Big Earner', description: 'Earn 500 points this week' },
  },
  profile: {
    title: 'Profile',
    subtitle: 'Your journey & settings',
    progression: 'Progression',
    points: 'Points',
    streak: 'Streak',
    petLevel: 'Pet Lv',
    trips: 'Trips',
    done: 'Done',
    net: 'Net',
    petCare: 'Pet Care',
    feed: 'Feed',
    play: 'Play',
    train: 'Train',
    hunger: 'Hunger',
    energy: 'Energy',
    fun: 'Fun',
    xp: 'XP',
    levelPerks: 'Level Perks',
    perks: {
      streakShield: {
        label: 'Streak Shield',
        description: 'Miss 1 day per week without losing your streak.',
      },
      tripBonus: {
        label: 'Trip Bonus',
        description: '+10 pts added to every route completion bonus.',
      },
      powerTraining: {
        label: 'Power Training',
        description: 'Train gives double XP.',
      },
      pointSurge: {
        label: 'Point Surge',
        description: '+5% bonus on top of all trip points.',
      },
    },
    active: 'Active',
    reachLv: 'Reach Lv',
    toUnlock: 'to unlock',
    mobilitySummary: 'Mobility Summary',
    walkDist: 'Walk',
    transitDist: 'Transit',
    totalDist: 'Total',
    tripPts: 'Trip pts',
    bonuses: 'Bonuses',
    walkPct: 'Walk %',
    blockchain: 'Blockchain Wallet',
    gasless: 'Gasless',
    viewWallet: 'View wallet on PolygonScan',
    viewContract: 'View smart contract on PolygonScan',
    settings: 'Settings',
    appearance: 'Appearance',
    language: 'Language',
    otpServer: 'OTP Server',
    devMode: 'Developer Mode',
    replayTutorial: 'Replay Tutorial',
    moreTapsHint: (n) => `${n} more tap${n !== 1 ? 's' : ''} for developer options`,
    themeAuto: 'Auto',
    themeLight: 'Light',
    themeDark: 'Dark',
    langEn: 'English',
    langHu: 'Magyar',
    devAccess: '🔐 Developer Access',
    devAccessSub: 'Enter the passphrase to unlock developer options.',
    incorrectPassphrase: 'Incorrect passphrase. Try again.',
    unlock: 'Unlock',
    notEnoughPoints: 'Not enough points',
    trainCostMsg: (cost) => `Training costs ${cost} pts.`,
    trained: 'Trained!',
    xpEarned: (xp) => `+${xp} XP earned.`,
    otpSaved: 'Saved',
    otpSavedMsg: 'OTP server URL updated.',
    resetProgress: 'Reset All Progress',
    resetConfirmMsg: 'This will permanently delete all points, trips, badges, challenges, pet progress, and inventory. Settings and wallet are kept.\n\nThis cannot be undone.',
    resetConfirmBtn: 'Reset Everything',
    walletImported: 'Wallet Imported',
    walletImportedMsg: (addr) => `Now using:\n${addr}`,
    invalidKey: 'Invalid Key',
    invalidKeyMsg: 'The private key is not valid. Make sure it starts with 0x and is 66 characters.',
    walletDevTools: 'Wallet Dev Tools',
    walletDevHint: 'Use these to fund the app wallet or switch to an already-funded wallet.',
    hidePrivateKey: 'Hide Private Key',
    showPrivateKey: 'Show Private Key',
    privateKeyWarning: 'Copy this key and fund the address in MetaMask or a faucet. Never share it with anyone.',
    importByKey: 'Import wallet by private key:',
    privateKeyPlaceholder: '0x... (private key)',
    importing: 'Importing...',
    importWallet: 'Import Wallet',
    passphrasePlaceholder: 'Passphrase',
  },
};

const hu: Translations = {
  tabs: {
    home: 'Főoldal',
    map: 'Térkép',
    activity: 'Napló',
    shop: 'Bolt',
    stats: 'Statisztika',
    profile: 'Profil',
  },
  common: {
    save: 'Mentés',
    cancel: 'Mégse',
    edit: 'Szerkesztés',
    reset: 'Visszaállítás',
    pts: 'pt',
    km: 'km',
    days: 'nap',
    done: 'Kész',
    active: 'Aktív',
    stopped: 'Megállítva',
    completed: 'Teljesítve',
  },
  home: {
    greeting: 'Jó napot!',
    totalPoints: 'pont',
    dayStreak: 'napos sorozat',
    dailyGoal: 'Napi Cél',
    goalReached: 'Cél elérve! Hajrá! 🎉',
    today: 'Ma',
    streak: 'Sorozat',
    badges: 'Kitűzők',
    xp: 'XP',
    hunger: 'Éhség',
    energy: 'Energia',
    weeklyChallenges: 'Heti Kihívások',
    completed: 'Teljesítve ✓',
    resetTitle: 'Összes adat törlése?',
    resetMsg: 'Ez törli az összes haladást.',
    moods: { happy: 'Boldog', content: 'Elégedett', neutral: 'Semleges', sad: 'Szomorú', hungry: 'Éhes' },
  },
  map: {
    searchPlaceholder: 'Koppints a térképre vagy egy helyre a cél kiválasztásához',
    walk: 'Gyalog',
    transit: 'Tömegközlekedés',
    planRoute: 'Útvonal Tervezése',
    startNavigation: 'Navigáció Indítása →',
    stop: '■ Megállítás',
    progress: 'haladás',
    bonus: 'bónusz',
    totalPts: 'összes pt',
    routeSteps: 'Útvonal lépései',
    departs: 'Indul',
    then: 'Majd:',
    routeCompleted: 'Útvonal teljesítve! Pontok jóváírva 🎉',
    planningWalk: 'Gyalogos útvonal tervezése...',
    planningTransit: 'Tömegközlekedési útvonal tervezése...',
    refreshingRoute: 'Útvonal frissítése…',
    locationNeeded: 'Helymeghatározás szükséges',
    locationNeededMsg: 'Nem sikerült meghatározni a helyzeted.',
    destinationNeeded: 'Célállomás szükséges',
    destinationNeededMsg: 'Koppints a térképre a célállomás kiválasztásához.',
    routeError: 'Útvonalhiba',
    noTransitRoute: 'Nem található tömegközlekedési útvonal. Próbálj más célállomást, vagy válts gyalogos módra.',
    noWalkRoute: 'Nem sikerült gyalogos útvonalat tervezni. Ellenőrizd az OTP szerver URL-t a Profilban.',
    devFinish: 'FEJL: Befejezés',
    walkTo: 'Gyalog ide:',
    walkLabel: 'Gyalogolj',
    takeLine: 'Szállj fel:',
    toward: 'irányába',
    now: 'MOST',
    completeTitle: 'Szuper!',
    pointsEarned: 'pont megszerzett',
    distanceLabel: 'távolság',
    completionBonusLabel: 'befejezési bónusz',
    continueBtn: 'Tovább',
  },
  activity: {
    title: 'Tevékenység',
    trips: 'Utak',
    ledger: 'Napló',
    badgesTab: 'Kitűzők',
    challenges: 'Kihívások',
    badgeProgressSuffix: 'megszerezve',
    distance: 'Távolság',
    walking: 'Gyalog',
    points: 'Pontok',
    noTrips: 'Még nincs út. Menj a Térképre, hogy elindulj!',
    noLedger: 'Még nincs napló bejegyzés.',
    noBadges: 'Még nem oldottál fel kitűzőt.',
    noChallenges: 'Ezen a héten nincs kihívás.',
    earned: 'szerzett',
    inProgress: 'Folyamatban',
    verifiedOnChain: '⛓ Láncon ellenőrzött',
    doneStatus: 'Kész',
    stoppedStatus: 'Megállítva',
    activeStatus: 'Aktív',
    walk: 'gyalog',
    transit: 'tömegközl.',
    mixed: 'vegyes',
    rewardPts: 'pt',
    ledgerKinds: {
      route_progress: 'út előrehaladás',
      route_completion: 'út teljesítés',
      challenge_reward: 'kihívás jutalom',
      daily_streak: 'napi sorozat',
      spend_pack: 'csomagvásárlás',
      duplicate_refund: 'duplikátum visszatérítés',
      unknown: 'tevékenység',
    },
  },
  shop: {
    title: 'Bolt',
    shopTab: 'Bolt',
    collectionTab: 'Gyűjtemény',
    balance: 'Egyenleg',
    openPack: 'Csomag Nyitás',
    opening: 'Nyitás...',
    packReveal: 'Csomag Felfedése',
    youGot: 'Kaptad:',
    alreadyOwned: 'Már megvolt — visszatérítve',
    equip: 'Felszerel',
    remove: 'Levesz',
    equipped: 'Felszerelve',
    bonusInfo: 'Bónusz Info',
    noPacks: 'Nincs csomag a leltárban.',
    noSkins: 'Nincs skin a gyűjteményben.',
    currentlyEquipped: 'Jelenleg Felszerelve',
    dropRates: 'Esési Arányok',
    multipliers: 'Szorzók',
    rarity: {
      common: 'Közönséges',
      uncommon: 'Ritkaság',
      rare: 'Ritka',
      epic: 'Epikus',
      legendary: 'Legendás',
    },
    subtitle: 'Gyűjts skineket, növeld a pontjaid',
    packLabels: { basic: 'Alap Csomag', premium: 'Prémium Csomag', legendary: 'Legendás Csomag' },
    packDescs: { basic: 'Kezdőknek ideális', premium: 'Magasabb ritka esélyek', legendary: 'Legjobb esélyek a top skinekre' },
    notEnoughMsg: (price, label) => `${price} pont szükséges egy ${label} megnyitásához.`,
    openErrorTitle: 'Hiba',
    openError: 'Nem sikerült megnyitni a csomagot. Próbáld újra.',
    notEnoughPts: 'Nincs elég pont',
    bonusInfoTitle: 'Skin Pont Bónuszok',
    bonusInfoSub: 'A felszerelt skinek növelik az utakon szerzett pontokat.',
    pointsBonus: 'pont',
    noSkinEquipped: 'Nincs felszerelt skin — koppints egyre alább a felszereléshez.',
    openPacks: 'Csomagok nyitása',
    tapToOpen: 'Koppints a nyitáshoz',
    pointsOnTrips: (pct) => `+${pct}% pont az utakon`,
    moreItems: (n) => `+${n} további tárgy`,
    duplicateRefundMsg: (pts) => `↩ +${pts} pt duplikátum visszatérítés`,
    continueBtn: 'Tovább',
  },
  analytics: {
    title: 'Elemzés',
    tripsLabel: 'Utak',
    completion: 'Teljesítés',
    streak: 'Sorozat',
    walkDist: 'Gyalog',
    transitDist: 'Tömegközl.',
    earned: 'Szerzett',
    spent: 'Elköltött',
    net: 'Nettó',
    activeDays: 'Aktív napok',
    tripsPerDay: 'Utak/nap',
    firstTrip: 'Első út',
    thisWeek: 'E hét',
    lastWeek: 'Múlt hét',
    twoWeeksAgo: '2 hete',
    distanceSplit: 'Távolság Megoszlás',
    pointsOverview: 'Pontok Áttekintése',
    weeklyPoints: 'Heti Pontok',
    earnedVsSpent: 'Szerzett vs Elköltött',
    activeDaysTitle: 'Aktív Napok',
    metrics: 'Mutatók',
    never: 'Soha',
    noData: 'Még nincs adat',
    subtitle: 'Mobilitási statisztikáid',
    weeklyTripsSub: 'Utolsó 6 hét',
    walkDistTitle: 'Gyaloglási Távolság',
    transitDistTitle: 'Tömegközlekedési Távolság',
    metersPerWeek: 'Méter hetente',
    activeDaysSub: 'Aktív napok hetente (7-ből)',
    completionSub: 'Befejezett utak aránya hetente',
  },
  badgeTemplates: {
    firstSteps: { name: 'Első Lépések', description: 'Teljesítsd az első utadat' },
    gettingAround: { name: 'Közlekedésben', description: 'Teljesíts 5 utat' },
    regularCommuter: { name: 'Rendszeres Ingázó', description: 'Teljesíts 10 utat' },
    routeMaster: { name: 'Útvonal Mester', description: 'Teljesíts 25 utat' },
    roadWarrior: { name: 'Út Harcosa', description: 'Teljesíts 50 utat' },
    shortWalk: { name: 'Rövid Séta', description: 'Sétálj összesen 1 km-t' },
    urbanHiker: { name: 'Városi Túrázó', description: 'Sétálj összesen 10 km-t' },
    marathonWalker: { name: 'Maratoni Gyalogos', description: 'Sétálj összesen 42 km-t' },
    centuryClub: { name: 'Száz Kilométer Klub', description: 'Sétálj összesen 100 km-t' },
    transitExplorer: { name: 'Tömegközlekedési Felfedező', description: 'Utazz 50 km-t tömegközlekedéssel' },
    twoDayStreak: { name: 'Kétnapos Sorozat', description: 'Használd az appot 2 nap egymás után' },
    weekWarrior: { name: 'Heti Harcos', description: 'Tarts 7 napos sorozatot' },
    fortnightForce: { name: 'Kéthetes Erő', description: 'Tarts 14 napos sorozatot' },
    monthlyDevotion: { name: 'Havi Kitartás', description: 'Tarts 30 napos sorozatot' },
    pennySaver: { name: 'Fillérspóroló', description: 'Szerezz összesen 100 pontot' },
    pointCollector: { name: 'Pontgyűjtő', description: 'Szerezz összesen 500 pontot' },
    thousandaire: { name: 'Ezres', description: 'Szerezz összesen 1 000 pontot' },
    pointMogul: { name: 'Pontmágnás', description: 'Szerezz összesen 5 000 pontot' },
  },
  challengeTemplates: {
    commuter: { name: 'Ingázó', description: 'Teljesíts 3 utat ezen a héten' },
    frequentRider: { name: 'Gyakori Utas', description: 'Teljesíts 5 utat ezen a héten' },
    dailyDriver: { name: 'Napi Vezető', description: 'Teljesíts 7 utat ezen a héten' },
    walkAKilometer: { name: 'Sétálj egy kilométert', description: 'Sétálj 1 km-t ezen a héten' },
    urbanWalker: { name: 'Városi Sétáló', description: 'Sétálj 5 km-t ezen a héten' },
    longStrider: { name: 'Hosszú Lépő', description: 'Sétálj 10 km-t ezen a héten' },
    busRider: { name: 'Busz Utas', description: 'Utazz 5 km-t tömegközlekedéssel ezen a héten' },
    transitFan: { name: 'Tömegközlekedés Rajongó', description: 'Utazz 15 km-t tömegközlekedéssel ezen a héten' },
    goTheDistance: { name: 'Tedd meg a távolságot', description: 'Utazz 10 km-t összesen ezen a héten' },
    explorer: { name: 'Felfedező', description: 'Utazz 20 km-t összesen ezen a héten' },
    pointChaser: { name: 'Pont Hajszoló', description: 'Szerezz 200 pontot ezen a héten' },
    bigEarner: { name: 'Nagy Kereső', description: 'Szerezz 500 pontot ezen a héten' },
  },
  profile: {
    title: 'Profil',
    subtitle: 'Az utazásod és beállítások',
    progression: 'Fejlődés',
    points: 'Pontok',
    streak: 'Sorozat',
    petLevel: 'Kisállat Szint',
    trips: 'Utak',
    done: 'Kész',
    net: 'Nettó',
    petCare: 'Kisállat Gondozás',
    feed: 'Etetés',
    play: 'Játék',
    train: 'Edzés',
    hunger: 'Éhség',
    energy: 'Energia',
    fun: 'Szórakozás',
    xp: 'XP',
    levelPerks: 'Szint Előnyök',
    perks: {
      streakShield: {
        label: 'Sorozat Pajzs',
        description: 'Hetente 1 nap kihagyható a sorozat elvesztése nélkül.',
      },
      tripBonus: {
        label: 'Út Bónusz',
        description: '+10 pont hozzáadva minden út befejezési bónuszhoz.',
      },
      powerTraining: {
        label: 'Erő Edzés',
        description: 'Az edzés dupla XP-t ad.',
      },
      pointSurge: {
        label: 'Pont Lendület',
        description: '+5% bónusz az összes út pontokra.',
      },
    },
    active: 'Aktív',
    reachLv: 'Érd el a(z)',
    toUnlock: 'szintet az oldáshoz',
    mobilitySummary: 'Mobilitás Összefoglaló',
    walkDist: 'Gyalog',
    transitDist: 'Tömegközl.',
    totalDist: 'Összesen',
    tripPts: 'Út pontok',
    bonuses: 'Bónuszok',
    walkPct: 'Gyalog %',
    blockchain: 'Blokklánc Tárca',
    gasless: 'Díjmentes',
    viewWallet: 'Tárca megtekintése PolygonScan-en',
    viewContract: 'Okosszerződés megtekintése PolygonScan-en',
    settings: 'Beállítások',
    appearance: 'Megjelenés',
    language: 'Nyelv',
    otpServer: 'OTP Szerver',
    devMode: 'Fejlesztői Mód',
    replayTutorial: 'Bemutató Újrajátszása',
    moreTapsHint: (n) => `Még ${n} koppintás a fejlesztői beállításokhoz`,
    themeAuto: 'Auto',
    themeLight: 'Világos',
    themeDark: 'Sötét',
    langEn: 'English',
    langHu: 'Magyar',
    devAccess: '🔐 Fejlesztői Hozzáférés',
    devAccessSub: 'Add meg a jelszót a fejlesztői opciók feloldásához.',
    incorrectPassphrase: 'Helytelen jelszó. Próbáld újra.',
    unlock: 'Feloldás',
    notEnoughPoints: 'Nincs elég pont',
    trainCostMsg: (cost) => `Az edzés ${cost} pontba kerül.`,
    trained: 'Edzés kész!',
    xpEarned: (xp) => `+${xp} XP szereztél.`,
    otpSaved: 'Mentve',
    otpSavedMsg: 'OTP szerver URL frissítve.',
    resetProgress: 'Minden haladás visszaállítása',
    resetConfirmMsg: 'Ez véglegesen törli az összes pontot, utat, kitűzőt, kihívást, kisállat-haladást és leltárt. A beállítások és a tárca megmarad.\n\nEz nem vonható vissza.',
    resetConfirmBtn: 'Mindent visszaállít',
    walletImported: 'Tárca importálva',
    walletImportedMsg: (addr) => `Most ezt használja:\n${addr}`,
    invalidKey: 'Érvénytelen kulcs',
    invalidKeyMsg: 'A privát kulcs nem érvényes. Győződj meg róla, hogy 0x-szel kezdődik és 66 karakter hosszú.',
    walletDevTools: 'Tárca fejlesztői eszközök',
    walletDevHint: 'Ezekkel feltöltheted az app tárcáját, vagy átvált egy már feltöltött tárcára.',
    hidePrivateKey: 'Privát kulcs elrejtése',
    showPrivateKey: 'Privát kulcs megjelenítése',
    privateKeyWarning: 'Másold ki ezt a kulcsot, és töltsd fel a címet MetaMask-ban vagy egy csapon. Soha ne oszd meg senkivel.',
    importByKey: 'Tárca importálása privát kulccsal:',
    privateKeyPlaceholder: '0x... (privát kulcs)',
    importing: 'Importálás...',
    importWallet: 'Tárca importálása',
    passphrasePlaceholder: 'Jelszó',
  },
};

export const translations: Record<Language, Translations> = { en, hu };
