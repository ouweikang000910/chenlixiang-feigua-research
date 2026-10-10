(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.getElementById('motion-toggle');
  const musicButton = document.getElementById('music-toggle');
  const audio = document.getElementById('travel-audio');
  const volume = document.getElementById('music-volume');
  const status = document.getElementById('music-status');
  const progress = document.querySelector('.reading-progress');
  const activeAnimations = new Set();
  let userPaused = false;
  try { userPaused = localStorage.getItem('travel-motion-paused') === 'true'; } catch (_) {}
  const motionOn = () => !userPaused && !reduced.matches;
  const animate = (target, frames, options) => {
    if (!motionOn() || typeof target.animate !== 'function') return;
    const animation = target.animate(frames, options);
    activeAnimations.add(animation);
    animation.finished.then(() => activeAnimations.delete(animation)).catch(() => activeAnimations.delete(animation));
  };
  function updateMotion() {
    const enabled = motionOn();
    root.dataset.motion = enabled ? 'on' : 'off';
    motionButton.setAttribute('aria-pressed', String(enabled));
    motionButton.querySelector('.control-label').textContent = enabled ? '暂停动效' : '开启动效';
    motionButton.querySelector('.motion-icon').textContent = enabled ? 'Ⅱ' : '▷';
    motionButton.disabled = reduced.matches;
    motionButton.title = reduced.matches ? '已遵循系统的减少动态效果设置' : enabled ? '暂停页面动画' : '开启页面动画';
    if (!enabled) activeAnimations.forEach(animation => animation.cancel());
    document.dispatchEvent(new CustomEvent('travel-motion-change',{detail:{enabled}}));
  }
  motionButton.addEventListener('click', () => {
    userPaused = !userPaused;
    try { localStorage.setItem('travel-motion-paused', String(userPaused)); } catch (_) {}
    updateMotion();
  });
  reduced.addEventListener('change', updateMotion);
  updateMotion();

  const targets = document.querySelectorAll('.portals-header,.portal,.section-head,.later-heading,.later-metrics,.audience-facts,.content-notes,.works-heading,.work-card,.plan-step,.source-list>div,.interlude-inner');
  targets.forEach(target => {
    target.setAttribute('data-reveal', '');
    if (target.matches('.portal,.work-card,.plan-step,.source-list>div')) {
      const siblings = Array.from(target.parentElement.children);
      target.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(target), 3) * 75}ms`);
    }
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    }), { threshold: .08, rootMargin: '0px 0px -25px 0px' });
    targets.forEach(target => observer.observe(target));
    root.classList.add('motion-ready');
    document.addEventListener('focusin', event => event.target.closest('[data-reveal]')?.classList.add('is-revealed'));

    const bars = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animate(entry.target, [{transform:'scaleX(0)',transformOrigin:'left'},{transform:'scaleX(1)',transformOrigin:'left'}], {duration:1000,easing:'cubic-bezier(.16,1,.3,1)'});
      bars.unobserve(entry.target);
    }), { threshold: .45 });
    document.querySelectorAll('.gender-f,.gender-m,.bar').forEach(bar => bars.observe(bar));
  }

  // The source text remains the exact final value; only its entrance is animated.
  document.querySelectorAll('.hero .big-number,.hero .summary .stat').forEach((number, index) => {
    animate(number, [{opacity:.1,transform:'translate3d(0,15px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}], {duration:900,delay:250+index*90,easing:'cubic-bezier(.16,1,.3,1)'});
  });
  let scrollPending = false;
  const updateProgress = () => {
    const distance = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${distance > 0 ? Math.max(0, Math.min(1, scrollY / distance)) : 0})`;
    scrollPending = false;
  };
  addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateProgress); }
  }, { passive:true });
  addEventListener('resize', updateProgress);
  updateProgress();
  document.addEventListener('visibilitychange', () => { root.dataset.pageHidden = String(document.hidden); });

  let targetVolume = .22;
  try {
    const remembered = Number(localStorage.getItem('travel-music-volume'));
    if (localStorage.getItem('travel-music-volume') !== null && Number.isFinite(remembered)) targetVolume = Math.max(0,Math.min(1,remembered));
  } catch (_) {}
  volume.value = Math.round(targetVolume * 100);
  audio.volume = targetVolume;
  const volumeOutput = document.getElementById('music-volume-value');
  volumeOutput.textContent = `${volume.value}%`;
  let fadeFrame = 0;
  function fadeIn() {
    cancelAnimationFrame(fadeFrame);
    const started = performance.now();
    const step = now => {
      audio.volume = targetVolume * Math.min(1,(now-started)/850);
      if (now-started < 850 && !audio.paused) fadeFrame = requestAnimationFrame(step);
    };
    fadeFrame = requestAnimationFrame(step);
  }
  function updateMusic() {
    const playing = !audio.paused;
    musicButton.setAttribute('aria-pressed', String(playing));
    musicButton.querySelector('.control-label').textContent = playing ? '暂停音乐' : '开启音乐';
    document.querySelector('.experience-controls').classList.toggle('music-is-playing',playing);
  }
  musicButton.addEventListener('click', async () => {
    status.textContent = '';
    if (!audio.paused) { cancelAnimationFrame(fadeFrame); audio.pause(); return; }
    musicButton.disabled = true;
    musicButton.querySelector('.control-label').textContent = '加载音乐';
    audio.volume = 0;
    try { await audio.play(); fadeIn(); }
    catch (_) { status.textContent = '音乐暂时未能播放，请稍后再次点击。'; updateMusic(); }
    finally { musicButton.disabled = false; }
  });
  audio.addEventListener('play',updateMusic);
  audio.addEventListener('pause',updateMusic);
  audio.addEventListener('error',() => {
    status.textContent = '音乐暂时未能加载，请稍后重试。';
    updateMusic();
  });
  volume.addEventListener('input', () => {
    cancelAnimationFrame(fadeFrame);
    targetVolume = Number(volume.value)/100;
    audio.volume = targetVolume;
    volumeOutput.textContent = `${volume.value}%`;
    try { localStorage.setItem('travel-music-volume',String(targetVolume)); } catch (_) {}
  });
  document.addEventListener('click', event => {
    const info = document.querySelector('.music-info');
    if (!info.contains(event.target)) info.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') document.querySelector('.music-info').open = false;
  });
  updateMusic();
})();
