// Shift activities for the five neighbouring shops. Each activity is a short
// three-round mini-game: two are timing challenges, three are matching
// challenges. The UI owns the animation; this module owns the content and
// scoring rules so the shops share one framework and stay easy to extend.

export const SHOP_ACTIVITIES = {
  bakery: {
    type: 'timing',
    title: 'Pull a fresh batch',
    description:
      'Watch the oven timer and pull the tray while the crust is in the golden band.',
    rounds: 3,
    pay: 16,
    rep: 0.05,
    dailyLimit: 3,
    actionLabel: 'Pull the tray',
    stationLabel: 'Bakery oven',
    timing: {
      speed: 0.72,
      zone: 0.18,
      perfect: 0.03,
      good: 0.075,
      meterLabel: 'Bake time',
      zoneLabel: 'golden crust',
      flavors: [
        'First tray of the morning. The oven is already humming.',
        'Second batch: the shop smells like butter and caramel.',
        'Last tray before the lunch rush. Keep your eyes on it.'
      ],
      success: 'A tray of perfect golden loaves.',
      great: 'The whole tray is perfectly baked — Nora looks impressed.',
      miss: 'A little too long: the crust is dark, but still sellable.'
    }
  },
  cafe: {
    type: 'timing',
    title: 'Pull an espresso shot',
    description: 'Stop the pour at the crema line before the shot turns bitter.',
    rounds: 3,
    pay: 12,
    rep: 0.04,
    dailyLimit: 4,
    actionLabel: 'Stop the pour',
    stationLabel: 'Espresso bar',
    timing: {
      speed: 1.05,
      zone: 0.13,
      perfect: 0.025,
      good: 0.06,
      meterLabel: 'Pour',
      zoneLabel: 'crema',
      flavors: [
        'The grinder is dialled in. The first shot is yours.',
        'Second cup: the queue at the counter is growing.',
        'Last shot of the shift. Miles is wiping down the machine.'
      ],
      success: 'A glossy shot with a warm crema.',
      great: 'That is a perfect shot — syrupy and sweet.',
      miss: 'The shot runs long and turns bitter, but it still gets served.'
    }
  },
  pharmacy: {
    type: 'choice',
    title: 'Take a prescription request',
    description: 'Listen to each customer and pick the right over-the-counter remedy.',
    rounds: 3,
    pay: 20,
    rep: 0.06,
    dailyLimit: 3,
    actionLabel: 'Hand it over',
    stationLabel: 'Prescription desk',
    cases: [
      {
        prompt: 'Customer: “My hay fever is terrible today. I can barely stop sneezing.”',
        options: ['Antihistamine tablets', 'Cough syrup', 'Heat pads', 'Sleeping tablets'],
        answer: 0,
        success: 'Antihistamines — the right choice for hay fever.',
        failure: 'That is not the usual hay-fever remedy.'
      },
      {
        prompt: 'Customer: “I have a splitting headache and a long meeting ahead.”',
        options: ['Pain relief tablets', 'Bandages', 'Antacid', 'Vitamin C'],
        answer: 0,
        success: 'Pain relief — sensible and fast.',
        failure: 'The customer needed a pain reliever.'
      },
      {
        prompt: 'Customer: “I burned my hand on the oven. It is still stinging.”',
        options: ['Burn gel and dressing', 'Sleeping tablets', 'Cough syrup', 'Sunscreen'],
        answer: 0,
        success: 'Burn gel and a clean dressing — exactly right.',
        failure: 'A burn needs cooling gel and a dressing.'
      },
      {
        prompt: 'Customer: “I keep coughing at night and cannot sleep.”',
        options: ['Cough syrup', 'Eye drops', 'Bandages', 'Vitamin D'],
        answer: 0,
        success: 'The right cough syrup for a night-time cough.',
        failure: 'The customer needed a cough remedy.'
      },
      {
        prompt: 'Customer: “My stomach is upset after lunch.”',
        options: ['Antacid tablets', 'Muscle rub', 'Allergy pills', 'Ear drops'],
        answer: 0,
        success: 'Antacid — a good call for an upset stomach.',
        failure: 'An upset stomach calls for an antacid.'
      }
    ]
  },
  clothing: {
    type: 'choice',
    title: 'Style a customer',
    description: 'Read the request and choose the item that actually fits the brief.',
    rounds: 3,
    pay: 24,
    rep: 0.06,
    dailyLimit: 3,
    actionLabel: 'Bring the outfit',
    stationLabel: 'Tailor table',
    cases: [
      {
        prompt: 'Customer: “I need something waterproof for a rainy commute — medium.”',
        options: [
          'Rain jacket — M',
          'Linen shirt — S',
          'Wool scarf — one size',
          'Canvas tote — one size'
        ],
        answer: 0,
        success: 'A proper rain jacket in medium. They leave dry and happy.',
        failure: 'That will not keep a commuter dry.'
      },
      {
        prompt: 'Customer: “I have a job interview tomorrow. Something smart, large.”',
        options: ['Navy blazer — L', 'Beach shorts — L', 'Running socks — M', 'Rain poncho — L'],
        answer: 0,
        success: 'The navy blazer is just right for an interview.',
        failure: 'An interview calls for something smart.'
      },
      {
        prompt: 'Customer: “Something warm for a winter walk — small.”',
        options: [
          'Knitted jumper — S',
          'Cotton T-shirt — S',
          'Sandals — 38',
          'Silk scarf — one size'
        ],
        answer: 0,
        success: 'The knitted jumper will keep them warm.',
        failure: 'That is not warm enough for a winter walk.'
      },
      {
        prompt: 'Customer: “A birthday gift for my sister, under $30.”',
        options: [
          'Silk scarf — one size',
          'Leather boots — $120',
          'Designer handbag — $180',
          'Cashmere coat — $240'
        ],
        answer: 0,
        success: 'The silk scarf is a thoughtful gift and fits the budget.',
        failure: 'That is well over the customer’s budget.'
      },
      {
        prompt: 'Customer: “I need comfortable shoes for a long museum day — size 42.”',
        options: ['Cushioned trainers — 42', 'Formal loafers — 42', 'Beach flip-flops — 42', 'Silk scarf — one size'],
        answer: 0,
        success: 'Cushioned trainers are the sensible pick.',
        failure: 'A long walk needs comfortable shoes.'
      }
    ]
  },
  electronics: {
    type: 'choice',
    title: 'Diagnose a repair',
    description: 'Match the customer’s problem to the repair that will actually fix it.',
    rounds: 3,
    pay: 28,
    rep: 0.07,
    dailyLimit: 3,
    actionLabel: 'Start the repair',
    stationLabel: 'Repair bench',
    cases: [
      {
        prompt: 'Customer: “My phone only charges if I wiggle the cable.”',
        options: ['Replace the charging port', 'Replace the screen', 'Update the wallpaper', 'Buy a new ringtone'],
        answer: 0,
        success: 'A worn charging port is the classic cause. Fixed.',
        failure: 'That will not help a loose charging connection.'
      },
      {
        prompt: 'Customer: “My laptop fans roar and it shuts down mid-game.”',
        options: [
          'Clean the fans and renew thermal paste',
          'Replace the keyboard',
          'Add more stickers',
          'Turn the brightness up'
        ],
        answer: 0,
        success: 'A clean fan and fresh paste solve the overheating.',
        failure: 'That will not bring the temperatures down.'
      },
      {
        prompt: 'Customer: “The TV picture flickers whenever the console moves.”',
        options: [
          'Replace the HDMI cable',
          'Buy a new remote',
          'Re-pair the speakers',
          'Clean the screen'
        ],
        answer: 0,
        success: 'A new HDMI cable stops the flicker.',
        failure: 'A flickering picture points at the video connection.'
      },
      {
        prompt: 'Customer: “My earbuds only play in the left ear.”',
        options: [
          'Clean and re-seat the right earbud',
          'Replace the charging case',
          'Reset the phone wallpaper',
          'Buy a longer cable'
        ],
        answer: 0,
        success: 'Cleaning the contacts brings the right earbud back.',
        failure: 'The right earbud is the part that needs attention.'
      },
      {
        prompt: 'Customer: “There is a bright vertical line down my monitor.”',
        options: [
          'Replace the display panel',
          'Replace the mouse',
          'Change the wallpaper',
          'Adjust the volume'
        ],
        answer: 0,
        success: 'The panel is failing; a replacement fixes the line.',
        failure: 'A vertical line comes from the display panel itself.'
      }
    ]
  }
};

export function activityFor(businessId) {
  return SHOP_ACTIVITIES[businessId] || null;
}

export function shuffleIndices(count) {
  const out = Array.from({ length: count }, (_, i) => i);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function activityRound(config, roundIndex, order) {
  if (!config) return null;
  if (config.type === 'timing') {
    const timing = config.timing;
    const flavors = timing.flavors || [];
    const center = 0.34 + Math.random() * 0.38;
    return {
      kind: 'timing',
      roundIndex,
      flavor: flavors[roundIndex % flavors.length] || '',
      center,
      zone: timing.zone,
      speed: timing.speed,
      perfect: timing.perfect,
      good: timing.good,
      meterLabel: timing.meterLabel,
      zoneLabel: timing.zoneLabel
    };
  }

  const cases = config.cases || [];
  if (!cases.length) return null;
  const caseIndex = order && order.length ? order[roundIndex % order.length] : roundIndex % cases.length;
  const source = cases[caseIndex];
  const options = source.options.map((label, index) => ({
    label,
    correct: index === source.answer
  }));
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return {
    kind: 'choice',
    roundIndex,
    prompt: source.prompt,
    options,
    success: source.success,
    failure: source.failure
  };
}
