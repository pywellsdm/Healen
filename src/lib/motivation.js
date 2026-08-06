// Motivation content library — multiple tones for different user preferences

export const MOTIVATION_TONES = {
  gentle: {
    relapse: [
      "You stumbled, but you didn't fall. The fact that you're here reporting this means you haven't given up. That's courage.",
      "Every champion was once a contender who refused to give up. This moment doesn't define you — your response to it does.",
      "A relapse is not a reset of your identity. It's data. You learned something about yourself today. Use it.",
      "Be kind to yourself right now. The shame you feel is proof you care. That care is your superpower.",
      "You are not your worst moment. You are the person who keeps trying. Start again — wiser this time.",
    ],
    daily: [
      "Today is a victory you'll only understand in hindsight. Keep going.",
      "Your future self is watching this moment with gratitude.",
      "Healing isn't linear, but it's always forward. You're moving.",
      "You're not giving something up. You're getting yourself back.",
      "One day at a time. And today, you won.",
    ],
    panic: [
      "This urge will pass in 90 seconds if you let it. Breathe. You're stronger than a chemical signal.",
      "You are not your urges. You are the one observing them. Stay in the observer's seat.",
      "The urge feels permanent, but it's temporary. You've survived 100% of your worst urges.",
      "Walk away from the screen. Your brain is begging for a hit — don't feed the loop.",
      "This is the moment that builds the man. Stay.",
    ],
    sleep: [
      "Your body is ready for rest. The rest of the world can wait until morning.",
      "Tonight isn't about doing anything. It's about letting go. Be still.",
      "You don't have to quiet every thought. Just pick one slow breath, then the next.",
      "The bed is for sleeping, not for thinking. Give your mind permission to clock out.",
      "Drifting off isn't a skill you force. It's a place you return to, gently.",
    ],
  },
  tough: {
    relapse: [
      "Get up. Now. You lost a battle, not the war. Feeling sorry for yourself is how you lose again. Learn and move.",
      "Every relapse is a lesson you paid for with your streak. What did you learn? Write it down. Then get back to work.",
      "Disappointed? Good. Use it. Channel it into the longest streak you've ever had. Starting now.",
      "You failed today. Fine. But you're here. That means you're not a quitter. Prove it tomorrow.",
      "Stop beating yourself up and start beating the addiction. Anger at yourself is fuel — use it.",
    ],
    daily: [
      "Discipline is choosing what you want most over what you want now. Choose wisely today.",
      "Nobody is coming to save you. This is on you. And you're capable.",
      "The man you want to be is built in moments like this. Don't blink.",
      "Motivation is temporary. Discipline is forever. Show up.",
      "Win the morning. Win the day. Win your life.",
    ],
    panic: [
      "You're really going to throw away your streak for 5 seconds of dopamine? Close it. Now.",
      "Your brain is lying to you. The urge is not a command. You are not a dog. Think.",
      "Get up. Move. Do 20 push-ups. Cold water on your face. Break the pattern. Now.",
      "This is a test. Every time you resist, you get stronger. Every time you give in, you get weaker. Choose strength.",
      "The version of you that gives in is not who you want to be. Be the man who walks away.",
    ],
    sleep: [
      "Put the phone down. Nothing on that screen matters more than tonight's rest.",
      "You're not 'failing to sleep' — you're feeding the racing thoughts. Cut them off. Close your eyes.",
      "Rest is a performance enhancer. Every hour you bank tonight makes tomorrow sharper.",
      "Lying awake and scrolling is still using. Choose the boring, dark room. Let it win.",
      "Discipline doesn't clock out at bedtime. Shut it down properly.",
    ],
  },
  spiritual: [
    "Your body is a temple. You are reclaiming it. Every day clean is an act of devotion to your higher self.",
    "The urge is a passing cloud. You are the sky. Let it drift by.",
    "You were made for more than this. Remember who you are.",
    "Breathe. This moment is sacred. You choosing yourself is a prayer answered.",
    "The universe rewards those who master themselves. You are becoming that person.",
  ],
  scientific: [
    "Your dopamine receptors are healing right now. Day by day, your brain is returning to baseline.",
    "The prefrontal cortex — your decision-making center — gets stronger with every urge you resist.",
    "At 90 days, your brain rewires significantly. You're literally building a new neural pathway.",
    "Every resisted urge weakens the old neural pathway. You're pruning the habit at the source.",
    "Your testosterone, energy, and focus are all recovering. The data is on your side.",
  ],
};

export function getMotivation(tone, type = "daily") {
  const pool = MOTIVATION_TONES[tone]?.[type] || MOTIVATION_TONES.gentle[type] || MOTIVATION_TONES.gentle.daily;
  return pool[Math.floor(Math.random() * pool.length)];
}

export const TRIGGER_LABELS = {
  boredom: "I was bored",
  stress: "I was stressed",
  loneliness: "I felt lonely",
  social_media: "Social media triggered me",
  late_night: "It was late at night",
  habit: "It was just habit",
  emotional: "Emotional overwhelm",
  physical: "Physical urge",
  other: "Something else",
};

export const MOOD_LABELS = {
  great: "Feeling Great",
  good: "Feeling Good",
  okay: "Okay",
  struggling: "Struggling",
  hard: "Having a Hard Time",
};

export const MOOD_EMOJI = {
  great: "🟢",
  good: "🟩",
  okay: "🟡",
  struggling: "🟠",
  hard: "🔴",
};