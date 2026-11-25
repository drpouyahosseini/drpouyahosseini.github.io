const player = document.querySelector('#player');
const tracks = [...document.querySelectorAll('.track')];
const waveform = document.querySelector('.waveform');
const caption = document.querySelector('#current-track');
const cover = document.querySelector('#track-cover');
const state = document.querySelector('#play-state');
const message = document.querySelector('#play-message');
let remainingTracks = new Set(tracks);
let currentTrack;
let bars = [];

function renderProgress() {
  const fraction = Number.isFinite(player.duration) && player.duration > 0
    ? player.currentTime / player.duration : 0;
  const playedBars = Math.round(bars.length * fraction);
  bars.forEach((bar, index) => bar.classList.toggle('elapsed', index < playedBars));
}

function renderPlayback() {
  const playing = !player.paused && !player.ended;
  currentTrack.classList.toggle('playing', playing);
  state.textContent = playing ? ui('Now playing', 'Wird gespielt', 'در حال پخش') : player.currentTime && !player.ended ? ui('Paused', 'Pausiert', 'مکث') : ui('Selected track', 'Ausgewähltes Stück', 'قطعهٔ انتخاب\u200cشده');
}

function selectTrack(track) {
  if (currentTrack) {
    currentTrack.removeAttribute('aria-current');
    currentTrack.classList.remove('playing');
  }
  currentTrack = track;
  remainingTracks.delete(track);
  track.setAttribute('aria-current', 'true');
  const title = track.firstElementChild.textContent;
  cover.src = track.dataset.cover;
  cover.alt = ui(title + ' cover artwork', 'Cover von ' + title, 'جلد «' + title + '»');
  caption.textContent = title;
  document.querySelector('#esfahan-note').hidden = !track.href.endsWith('/esfahan-waltz.mp3');
  player.setAttribute('aria-label', title);
  message.hidden = true;
  message.textContent = '';
  bars = track.dataset.peaks.split(',').map(value => {
    const bar = document.createElement('i');
    bar.style.height = Math.max(4, Number(value)) + '%';
    return bar;
  });
  waveform.replaceChildren(...bars);
  renderPlayback();
  renderProgress();
}

function reportPlaybackError() {
  message.textContent = ui('Playback could not start. Try the audio controls or choose another track.', 'Die Wiedergabe konnte nicht gestartet werden. Verwenden Sie die Audiosteuerung oder wählen Sie ein anderes Stück.', 'پخش آغاز نشد. از کنترل\u200cهای پخش استفاده کنید یا قطعهٔ دیگری را انتخاب کنید.');
  message.hidden = false;
}

async function playTrack(track) {
  if (currentTrack !== track) {
    player.src = track.href;
    selectTrack(track);
  } else if (player.error) {
    player.load();
  }
  try {
    await player.play();
  } catch (error) {
    if (error.name !== 'AbortError' && currentTrack === track) reportPlaybackError();
  }
}

for (const track of tracks) {
  track.addEventListener('click', async event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (currentTrack === track && !player.paused) {
      player.pause();
      return;
    }
    await playTrack(track);
  });
}
selectTrack(tracks[0]);
player.addEventListener('play', () => {
  message.hidden = true;
  renderPlayback();
});
player.addEventListener('pause', renderPlayback);
player.addEventListener('ended', () => {
  if (!player.ended) return;
  if (!remainingTracks.size) remainingTracks = new Set(tracks);
  const candidates = [...remainingTracks].filter(track => track !== currentTrack);
  const next = candidates[Math.floor(Math.random() * candidates.length)] || currentTrack;
  playTrack(next);
});
player.addEventListener('error', reportPlaybackError);
player.addEventListener('timeupdate', renderProgress);


const mini = document.querySelector('.mini-player');
const miniButton = mini.querySelector('button');
let hasPlayed = false;
let fullPlayerVisible = false;
function refreshMini() {
  mini.hidden = !hasPlayed || fullPlayerVisible || player.ended;
  document.body.classList.toggle('with-mini', !mini.hidden);
  mini.querySelector('img').src = cover.src;
  mini.querySelector('strong').textContent = caption.textContent;
  mini.querySelector('small').textContent = player.paused ? ui('Paused', 'Pausiert', 'مکث') : ui('Now playing', 'Wird gespielt', 'در حال پخش');
  miniButton.textContent = player.paused ? '▶' : 'Ⅱ';
  miniButton.setAttribute('aria-label', (player.paused ? ui('Play ', 'Abspielen: ', 'پخش ') : ui('Pause ', 'Pausieren: ', 'مکث ')) + caption.textContent);
}
new IntersectionObserver(([entry]) => {
  fullPlayerVisible = entry.isIntersecting;
  refreshMini();
}).observe(player);
player.addEventListener('play', () => { hasPlayed = true; refreshMini(); });
for (const eventName of ['pause', 'ended', 'loadedmetadata']) player.addEventListener(eventName, refreshMini);
miniButton.addEventListener('click', () => {
  if (player.paused) player.play().catch(reportPlaybackError);
  else player.pause();
});
