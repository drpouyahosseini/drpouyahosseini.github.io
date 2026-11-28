// One audio element for the entire in-tab visit. Page views only replace its controls.
(() => {
  const audio = document.querySelector('#player');
  const mini = document.querySelector('.mini-player');
  if (!audio || !mini) return;
  const library = [...document.querySelectorAll('.track')].map(link => ({
    url: link.href, title: link.firstElementChild.textContent.trim(),
    cover: new URL(link.dataset.cover, location.href).href, peaks: link.dataset.peaks
  }));
  if (!library.length) return;
  const miniButton = mini.querySelector('button');
  const miniShuffle = document.createElement('button');
  miniShuffle.type = 'button'; miniShuffle.className = 'mini-shuffle';
  miniShuffle.textContent = 'Shuffle';
  mini.append(miniShuffle);
  let current = 0, queue = [], shuffle = true, started = false, observer, view = null;
  let error = '', visible = false;
  try { shuffle = sessionStorage.getItem('recording-shuffle') !== 'off'; } catch {}
  // Relocate once, before any playback, and never detach or change src during navigation.
  audio.removeAttribute('controls');
  audio.hidden = true;
  document.body.append(audio, mini);
  audio.id = 'persistent-recording-audio';
  // iOS uses device volume; don't display a nonfunctional software slider.
  let supportsVolume = false;
  try {
    const original = audio.volume;
    audio.volume = original === 0.5 ? 0.6 : 0.5;
    supportsVolume = audio.volume !== original;
    audio.volume = original;
  } catch {}
  function time(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    return Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  }
  function refill() {
    queue = library.map((_, i) => i).filter(i => i !== current);
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
  }
  function nextIndex() {
    if (!shuffle) return (current + 1) % library.length;
    if (!queue.length) refill();
    return queue.shift() ?? current;
  }
  function refreshShuffle() {
    for (const button of [miniShuffle, view?.shuffle]) {
      if (!button) continue;
      button.setAttribute('aria-pressed', String(shuffle));
      button.setAttribute('aria-label', 'Shuffle ' + (shuffle ? 'on' : 'off'));
      button.textContent = 'Shuffle ' + (shuffle ? 'on' : 'off');
    }
  }
  function toggleShuffle() {
    shuffle = !shuffle; refill();
    try { sessionStorage.setItem('recording-shuffle', shuffle ? 'on' : 'off'); } catch {}
    refreshShuffle();
  }
  function renderProgress() {
    if (!view) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const fraction = duration ? audio.currentTime / duration : 0;
    view.seek.disabled = !duration;
    view.seek.max = duration || 1;
    view.seek.value = audio.currentTime || 0;
    view.seek.setAttribute('aria-valuetext', time(audio.currentTime) + ' of ' + time(duration));
    view.time.textContent = time(audio.currentTime) + ' / ' + time(duration);
    view.bars.forEach((bar, i) => bar.classList.toggle('elapsed', i < Math.round(view.bars.length * fraction)));
  }
  function renderPlayback() {
    const playing = !audio.paused && !audio.ended;
    const song = library[current];
    if (view) {
      view.state.textContent = playing ? 'Now playing' : started ? 'Paused' : 'Selected track';
      view.play.textContent = playing ? 'Pause' : 'Play';
      view.play.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + song.title);
      view.links.forEach(link => link.classList.toggle('playing', playing && link.href === song.url));
      view.message.textContent = error; view.message.hidden = !error;
      view.volume.value = audio.volume;
    }
    mini.hidden = !started || visible;
    document.body.classList.toggle('with-mini', !mini.hidden);
    mini.querySelector('img').src = song.cover;
    mini.querySelector('strong').textContent = song.title;
    mini.querySelector('small').textContent = error ? 'Playback unavailable' : playing ? 'Now playing' : 'Paused';
    miniButton.textContent = playing ? 'Ⅱ' : '▶';
    miniButton.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + song.title);
    refreshShuffle();
  }
  function renderTrack() {
    const song = library[current];
    audio.setAttribute('aria-label', song.title);
    if (view) {
      view.cover.src = song.cover; view.cover.alt = song.title + ' cover artwork';
      view.caption.textContent = song.title;
      if (view.note) view.note.hidden = song.title !== 'Esfahan Waltz';
      view.links.forEach(link => {
        if (link.href === song.url) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
      view.bars = song.peaks.split(',').map(value => {
        const bar = document.createElement('i');
        bar.style.height = Math.max(4, Number(value)) + '%'; return bar;
      });
      view.waveform.replaceChildren(...view.bars);
    }
    renderPlayback(); renderProgress();
  }
  async function play(index = current, manual = false) {
    error = '';
    if (manual) {
      // A new manual selection starts a fresh shuffle cycle.
      if (index !== current) { current = index; refill(); }
    } else current = index;
    if (audio.src !== library[current].url) audio.src = library[current].url;
    else if (audio.error) audio.load();
    renderTrack();
    try { await audio.play(); }
    catch (e) {
      if (e.name !== 'AbortError' && current === index) {
        error = 'Playback could not start. Press Play or select another recording.';
        started = true; renderPlayback();
      }
    }
  }
  function toggle() { if (audio.paused || audio.ended) play(); else audio.pause(); }
  function mount() {
    observer?.disconnect(); view = null; visible = false;
    const room = document.querySelector('#recordings');
    const native = room?.querySelector('#player');
    const previous = room?.querySelector('.recording-controls');
    if (!room) { renderPlayback(); return; }
    const controls = document.createElement('div');
    controls.className = 'recording-controls';
    controls.innerHTML = '<div class="recording-control-row"><button type="button" class="button primary recording-play">Play</button><button type="button" class="button shuffle-toggle" aria-pressed="true">Shuffle on</button></div><input class="recording-seek" type="range" min="0" max="1" value="0" step="0.1" aria-label="Seek recording"><div class="recording-control-row"><span class="recording-time">0:00 / 0:00</span><label class="recording-volume">Volume <input type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume"></label></div>';
    if (native) native.replaceWith(controls);
    else if (previous) previous.replaceWith(controls);
    else room.querySelector('#play-message').before(controls);
    view = { controls, play: controls.querySelector('.recording-play'), shuffle: controls.querySelector('.shuffle-toggle'),
      seek: controls.querySelector('.recording-seek'), time: controls.querySelector('.recording-time'),
      volume: controls.querySelector('.recording-volume input'), links: [...room.querySelectorAll('.track')],
      state: room.querySelector('#play-state'), cover: room.querySelector('#track-cover'),
      caption: room.querySelector('#current-track'), waveform: room.querySelector('.waveform'),
      note: room.querySelector('#esfahan-note'), message: room.querySelector('#play-message'), bars: [] };
    view.volume.closest('label').hidden = !supportsVolume;
    view.play.addEventListener('click', toggle);
    view.shuffle.addEventListener('click', toggleShuffle);
    view.seek.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(view.seek.value); });
    view.volume.addEventListener('input', () => { audio.volume = Number(view.volume.value); });
    for (const link of view.links) link.addEventListener('click', e => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const index = library.findIndex(song => song.url === link.href);
      if (index < 0) return;
      e.preventDefault();
      if (index === current && !audio.paused && !audio.ended) audio.pause();
      else play(index, true);
    });
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; renderPlayback(); });
      observer.observe(controls);
    }
    renderTrack();
  }
  refill();
  audio.addEventListener('play', () => { started = true; error = ''; renderPlayback(); });
  audio.addEventListener('pause', renderPlayback);
  audio.addEventListener('ended', () => { if (audio.ended) play(nextIndex()); });
  audio.addEventListener('error', () => { error = 'Playback unavailable. Select another recording or try again.'; renderPlayback(); });
  for (const name of ['timeupdate', 'durationchange', 'loadedmetadata', 'seeking']) audio.addEventListener(name, renderProgress);
  audio.addEventListener('volumechange', renderPlayback);
  miniButton.addEventListener('click', toggle);
  miniShuffle.addEventListener('click', toggleShuffle);
  mini.querySelector('a').href = new URL('music.html#recordings', location.href).href;
  window.portfolioRecording = { audio, mini, mount };
  mount();
})();
