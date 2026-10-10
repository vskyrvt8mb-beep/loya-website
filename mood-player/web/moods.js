// Настроения: по каким запросам искать плейлисты Apple Music и какие жанры
// из твоей библиотеки подходят. Можно смело править под себя.
const MOODS = {
  game: {
    label: '🎮 Игра',
    terms: ['gaming', 'phonk', 'pure workout', 'drum and bass', 'rock workout', 'beast mode'],
    genres: ['electronic', 'dance', 'hip-hop', 'rap', 'rock', 'metal', 'phonk', 'house', 'techno', 'dubstep', 'drum'],
  },
  focus: {
    label: '🧠 Фокус',
    terms: ['deep focus', 'lo-fi beats', 'instrumental focus', 'ambient', 'synthwave'],
    genres: ['ambient', 'electronic', 'soundtrack', 'classical', 'instrumental', 'new age', 'lo-fi', 'jazz'],
  },
  chill: {
    label: '😌 Чилл',
    terms: ['pure chill', 'chill vibes', 'indie chill', 'chill r&b', 'lofi chill'],
    genres: ['r&b', 'soul', 'alternative', 'indie', 'electronic', 'pop', 'jazz'],
  },
  energy: {
    label: '⚡ Энергия',
    terms: ['pump up', 'pure workout', 'hip-hop workout', 'hits'],
    genres: ['hip-hop', 'rap', 'dance', 'electronic', 'rock', 'metal', 'pop'],
  },
  happy: {
    label: '😄 Весело',
    terms: ['feel good', 'happy hits', 'good vibes', 'summer hits'],
    genres: ['pop', 'dance', 'k-pop', 'latin', 'funk', 'disco'],
  },
  sad: {
    label: '🌧 Грусть',
    terms: ['sad songs', 'melancholy', 'heartbreak', 'rainy day'],
    genres: ['alternative', 'singer/songwriter', 'indie', 'pop', 'r&b'],
  },
  night: {
    label: '🌙 Ночь',
    terms: ['late night', 'night drive', 'synthwave', 'dark pop'],
    genres: ['electronic', 'alternative', 'r&b', 'hip-hop', 'synth'],
  },
};

// «Авто»: если запущена игра — игровое, иначе по времени суток.
function autoMood(game) {
  if (game) return 'game';
  const h = new Date().getHours();
  if (h < 6) return 'night';
  if (h < 11) return 'happy';
  if (h < 18) return 'focus';
  if (h < 22) return 'chill';
  return 'night';
}
