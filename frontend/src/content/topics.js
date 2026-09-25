// Book spreads and matching monitor screens. All original, kid-friendly text.
// Each spread is two pages; the monitor shows a matching screen for whatever
// spread is open. Rendered into canvas textures by drawPage.js / drawMonitor.js,
// so everything here is legible in a circled screenshot sent to the tutor.

export const TOPICS = [
  {
    id: 'solar',
    subject: 'Science · Space',
    color: '#4c3bcf',
    left: {
      title: 'Our Solar System',
      blocks: [
        { type: 'p', text: 'The Solar System is our neighborhood in space. At its center is the Sun, a giant ball of hot, glowing gas. Eight planets travel around the Sun in paths called orbits.' },
        { type: 'p', text: 'The four inner planets (Mercury, Venus, Earth and Mars) are small and rocky. The four outer planets (Jupiter, Saturn, Uranus and Neptune) are huge giants made mostly of gas and ice.' },
        { type: 'p', text: 'Gravity is the invisible pull that keeps every planet moving in its orbit instead of flying off into space. Earth takes about 365 days, one year, to travel all the way around the Sun.' },
        { type: 'note', text: 'Did you know? More than one million Earths could fit inside the Sun!' },
      ],
    },
    right: {
      title: 'Planets in Orbit',
      blocks: [
        { type: 'diagram', kind: 'solar', height: 470 },
        { type: 'h', text: 'Check your understanding' },
        { type: 'list', items: [
          'Why don’t the planets fly away from the Sun?',
          'Which four planets are the gas and ice giants?',
          'How long does Earth take to orbit the Sun?',
        ] },
      ],
    },
    monitor: {
      app: 'SpaceQuest · Planet Explorer',
      kind: 'table',
      heading: 'Compare the inner planets',
      columns: ['Planet', 'Distance from Sun', 'Length of a day', 'Moons'],
      rows: [
        ['Mercury', '58 million km', '59 Earth days', '0'],
        ['Venus', '108 million km', '243 Earth days', '0'],
        ['Earth', '150 million km', '24 hours', '1'],
        ['Mars', '228 million km', '24.6 hours', '2'],
      ],
      question: 'Quiz: Venus is closer to the Sun than Earth, but a day on Venus is much longer. Why might that be?',
    },
  },
  {
    id: 'photosynthesis',
    subject: 'Science · Life',
    color: '#1f8a4c',
    left: {
      title: 'How Plants Make Food',
      blocks: [
        { type: 'p', text: 'Plants can’t go to the store for a snack, so they make their own food! This process is called photosynthesis, which means “putting together with light.”' },
        { type: 'p', text: 'Leaves are full of a green material called chlorophyll. Chlorophyll soaks up energy from sunlight. The plant pulls water up from the soil through its roots, and takes in carbon dioxide from the air through tiny holes in its leaves called stomata.' },
        { type: 'p', text: 'Using the Sun’s energy, the plant turns the water and carbon dioxide into glucose, a kind of sugar it uses for energy. Oxygen is left over, and the plant releases it into the air for us to breathe.' },
        { type: 'equation', text: 'carbon dioxide + water  →(sunlight)→  glucose + oxygen' },
      ],
    },
    right: {
      title: 'Inside a Leaf',
      blocks: [
        { type: 'diagram', kind: 'leaf', height: 480 },
        { type: 'h', text: 'Try it!' },
        { type: 'list', items: [
          'What gas do plants take in from the air?',
          'What gas do plants give off?',
          'Why are most leaves green?',
        ] },
      ],
    },
    monitor: {
      app: 'Lab Notebook · Experiment 4',
      kind: 'lab',
      heading: 'Bubbles from a water plant under a lamp',
      steps: [
        'Put a water plant in a jar of water.',
        'Shine a lamp on it from different distances.',
        'Count the oxygen bubbles for one minute.',
      ],
      columns: ['Lamp distance', 'Bubbles per minute'],
      rows: [['10 cm', '32'], ['20 cm', '18'], ['40 cm', '7'], ['No lamp', '1']],
      question: 'What pattern do you notice? Explain it using the word “photosynthesis.”',
    },
  },
  {
    id: 'fractions',
    subject: 'Math · Fractions',
    color: '#c2410c',
    left: {
      title: 'Adding Fractions',
      blocks: [
        { type: 'p', text: 'A fraction names part of a whole. The bottom number, the denominator, tells how many equal parts the whole is split into. The top number, the numerator, tells how many of those parts you have.' },
        { type: 'p', text: 'When the denominators are the same, just add the numerators and keep the denominator:' },
        { type: 'equation', text: '1/5 + 2/5 = 3/5' },
        { type: 'p', text: 'When the denominators are different, first rewrite the fractions so they have a common denominator. Then add.' },
        { type: 'equation', text: '1/2 + 1/4  =  2/4 + 1/4  =  3/4' },
        { type: 'note', text: 'Tip: 1/2 and 2/4 are equivalent fractions. They name the same amount!' },
      ],
    },
    right: {
      title: 'Practice',
      blocks: [
        { type: 'diagram', kind: 'fractions', height: 360 },
        { type: 'h', text: 'Solve these' },
        { type: 'list', items: [
          '1/3 + 1/3 = ?',
          '1/2 + 1/8 = ?',
          '3/4 + 1/8 = ?',
          '2/5 + 1/10 = ?',
        ] },
      ],
    },
    monitor: {
      app: 'MathPractice · Word Problems',
      kind: 'problem',
      heading: 'Problem 4 of 10',
      body: 'Maya ate 3/8 of a pizza. Leo ate 1/4 of the same pizza. What fraction of the pizza did they eat altogether?',
      hint: 'Hint: can you write 1/4 using eighths?',
      answer: 'Your answer:  ____ / ____',
      question: 'Streak: 3 correct in a row!',
    },
  },
  {
    id: 'water',
    subject: 'Science · Earth',
    color: '#0369a1',
    left: {
      title: 'The Water Cycle',
      blocks: [
        { type: 'p', text: 'The water you drink today might once have been part of a cloud, an ocean, or even a dinosaur’s puddle! Earth’s water moves around and around in the water cycle.' },
        { type: 'p', text: 'Evaporation: the Sun warms water in oceans and lakes, turning it into an invisible gas called water vapor that rises into the sky.' },
        { type: 'p', text: 'Condensation: high up, the air is cold. Water vapor cools and turns back into tiny droplets that gather together as clouds.' },
        { type: 'p', text: 'Precipitation: when the droplets get too heavy, they fall as rain, snow, sleet or hail.' },
        { type: 'p', text: 'Collection: the water gathers in oceans, lakes, rivers and underground, ready to start the cycle again.' },
      ],
    },
    right: {
      title: 'Round and Round',
      blocks: [
        { type: 'diagram', kind: 'water', height: 480 },
        { type: 'h', text: 'Think about it' },
        { type: 'list', items: [
          'What makes water evaporate?',
          'Why do clouds form high in the sky?',
          'Is the water cycle ever finished? Why?',
        ] },
      ],
    },
    monitor: {
      app: 'SkyCast · Weather',
      kind: 'weather',
      heading: 'Rochester, NY · Tomorrow',
      forecast: [
        ['Morning', 'Cloudy', '14°C'],
        ['Afternoon', 'Rain', '12°C'],
        ['Evening', 'Showers', '10°C'],
      ],
      stats: ['Humidity 87%', 'Chance of rain 80%', 'Wind 12 km/h'],
      question: 'Why does high humidity make rain more likely?',
    },
  },
  {
    id: 'story',
    subject: 'Reading · Story',
    color: '#9d174d',
    left: {
      title: 'Pip and the Lighthouse',
      blocks: [
        { type: 'p', text: 'Pip was the smallest robot on Gull Island, and her only job was to keep the lighthouse lamp shining. Every night she climbed the one hundred and twelve steps, polished the glass, and watched the beam sweep across the dark sea.' },
        { type: 'p', text: 'One stormy evening, the power flickered and went out. Pip’s battery was low, and the wind howled so loudly that she could barely hear her own gears. Far out on the horizon, she spotted the tiny lights of a fishing boat, rocking in the waves.' },
        { type: 'p', text: 'Pip thought about hiding in her charging dock. Instead, she opened her chest panel, connected her last bit of power to the lamp, and turned the crank by hand. The beacon blinked back to life.' },
        { type: 'p', text: 'By morning the boat was safe in the harbor, and the fishers left a brand-new battery at the lighthouse door, tied with a bright red ribbon.' },
      ],
    },
    right: {
      title: 'Words to Know',
      blocks: [
        { type: 'diagram', kind: 'lighthouse', height: 430 },
        { type: 'vocab', items: [
          ['beacon', 'a bright light used as a signal or warning'],
          ['horizon', 'the line where the sky seems to meet the sea'],
          ['courage', 'being brave even when you feel afraid'],
        ] },
        { type: 'h', text: 'Discuss' },
        { type: 'list', items: ['Why did Pip give up her own power for the lamp?'] },
      ],
    },
    monitor: {
      app: 'Docs · Reading Response',
      kind: 'doc',
      heading: 'Assignment: Pip and the Lighthouse',
      body: 'Write one paragraph (5–7 sentences) answering: What would you have done if you were Pip? Use at least two words from the “Words to Know” box.',
      rubric: ['Answers the question clearly', 'Uses 2+ vocabulary words', 'Gives a reason from the story', 'Checks spelling and punctuation'],
      question: 'Due Friday · 0 / 150 words',
    },
  },
];
