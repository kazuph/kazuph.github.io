(() => {
  'use strict';
  // Game design values are documented in CONCEPT.md; scoring is one point per correct answer.
  const RULES = Object.freeze({ duration: 30000, penalty: 3000, flipEvery: 5, correctDelay: 150, wrongDelay: 650, countdown: 3 });
  const COLORS = Object.freeze([
    { name: 'アカ', hex: '#c9344b' }, { name: 'アオ', hex: '#235ce0' },
    { name: 'ミドリ', hex: '#178047' }, { name: 'ムラサキ', hex: '#8640bf' }
  ]);
  const $ = id => document.getElementById(id);
  const date = new Date();
  const today = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const requested = new URLSearchParams(location.search).get('day');
  const day = /^\d{8}$/.test(requested || '') ? requested : today;
  const displayDate = `${day.slice(0, 4)}.${day.slice(4, 6)}.${day.slice(6, 8)}`;
  const storageKey = 'yomumake.v1.best';
  let best = 0;
  try { best = Math.max(0, Number(localStorage.getItem(storageKey)) || 0); } catch { /* Private browsing can disable persistence. The game remains playable. */ }
  let state = 'home', score = 0, combo = 0, maxCombo = 0, history = [], question = null;
  let endAt = 0, frame = 0, transition = 0, countTimer = 0, locked = false, random;
  let resultText = '';
  const buttons = [...document.querySelectorAll('[data-answer]')];

  function seeded(seed) {
    let value = seed >>> 0;
    return () => { value += 0x6D2B79F5; let t = value; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function mode() { return Math.floor(score / RULES.flipEvery) % 2 === 0 ? 'ink' : 'read'; }
  function show(name) {
    for (const id of ['home', 'play', 'result']) $(id).hidden = id !== name;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function updateBest() { $('home-best').textContent = best ? `自己ベスト ${best}問` : '自己ベスト —'; $('play-best').textContent = best || '—'; }
  function clearTimers() { cancelAnimationFrame(frame); clearTimeout(transition); clearTimeout(countTimer); }
  function makeQuestion() {
    const ink = Math.floor(random() * COLORS.length);
    const meaning = (ink + 1 + Math.floor(random() * (COLORS.length - 1))) % COLORS.length;
    question = { ink, meaning, mode: mode() };
    $('word').textContent = COLORS[meaning].name;
    $('word').style.color = COLORS[ink].hex;
    $('question-number').textContent = `QUESTION ${String(history.length + 1).padStart(2, '0')}`;
    const read = question.mode === 'read';
    $('rule-banner').classList.toggle('read-mode', read);
    $('rule-prefix').textContent = read ? '今度は、読んで！' : '読まないで！';
    $('rule').textContent = read ? '書いてある「色」を答える' : '文字の「色」を答える';
    $('rule-count').textContent = `あと${RULES.flipEvery - score % RULES.flipEvery}正解で反転`;
    $('feedback').textContent = '';
    $('question-card').classList.remove('error');
    buttons.forEach(button => { button.disabled = false; button.classList.remove('chosen-right', 'chosen-wrong'); });
    locked = false;
  }
  function drawTime(remaining) {
    const tenths = Math.ceil(Math.max(0, remaining) / 100);
    $('timer').innerHTML = `${Math.floor(tenths / 10)}<span>.${tenths % 10}</span>`;
    $('time-fill').style.transform = `scaleX(${Math.max(0, remaining) / RULES.duration})`;
    $('play').classList.toggle('low-time', remaining <= RULES.penalty * 2);
  }
  function tick() {
    if (state !== 'playing') return;
    const remaining = endAt - performance.now();
    drawTime(remaining);
    if (remaining <= 0) { finish(); return; }
    frame = requestAnimationFrame(tick);
  }
  function start() {
    clearTimers(); state = 'countdown'; score = 0; combo = 0; maxCombo = 0; history = [];
    random = seeded(Number(day));
    $('score').textContent = '0'; $('combo').textContent = '落ち着いて、まず1問。';
    $('copy-status').textContent = ''; $('copy-area').hidden = true;
    $('rule-banner').classList.remove('flip');
    show('play'); drawTime(RULES.duration); makeQuestion();
    locked = true; buttons.forEach(button => button.disabled = true);
    $('countdown').hidden = false;
    let count = RULES.countdown;
    $('count-number').textContent = count;
    function countdown() {
      count -= 1;
      if (count > 0) { $('count-number').textContent = count; countTimer = setTimeout(countdown, 1000); return; }
      $('countdown').hidden = true; state = 'playing'; locked = false;
      buttons.forEach(button => button.disabled = false);
      endAt = performance.now() + RULES.duration; tick();
    }
    countTimer = setTimeout(countdown, 1000);
  }
  function answer(index) {
    if (state !== 'playing' || locked) return;
    if (performance.now() >= endAt) { finish(); return; }
    locked = true;
    const correctIndex = question.mode === 'ink' ? question.ink : question.meaning;
    const correct = index === correctIndex;
    const oldMode = mode();
    history.push(correct);
    buttons.forEach(button => button.disabled = true);
    buttons[index].classList.add(correct ? 'chosen-right' : 'chosen-wrong');
    if (correct) {
      score++; combo++; maxCombo = Math.max(maxCombo, combo);
      $('score').textContent = score;
      $('feedback').textContent = '正解！';
      $('combo').textContent = `${combo}連続正解${combo >= RULES.flipEvery ? '。いい集中。' : '！'}`;
    } else {
      combo = 0; endAt -= RULES.penalty;
      buttons[correctIndex].classList.add('chosen-right');
      $('feedback').textContent = `正解は「${COLORS[correctIndex].name}」 / −3秒`;
      $('combo').textContent = '脳がつられた。次、取り返そう。';
      $('question-card').classList.add('error');
      drawTime(endAt - performance.now());
    }
    if (performance.now() >= endAt) { finish(); return; }
    const flipped = oldMode !== mode();
    transition = setTimeout(() => {
      if (state !== 'playing') return;
      makeQuestion();
      if (flipped) { $('rule-banner').classList.remove('flip'); void $('rule-banner').offsetWidth; $('rule-banner').classList.add('flip'); $('feedback').textContent = 'ルール反転！'; }
    }, correct ? RULES.correctDelay : RULES.wrongDelay);
  }
  function finish() {
    if (state !== 'playing') return;
    state = 'result'; clearTimers(); locked = true; drawTime(0);
    const previousBest = best;
    best = Math.max(best, score);
    let saved = true;
    try { localStorage.setItem(storageKey, String(best)); } catch { saved = false; }
    updateBest();
    const flips = Math.floor(score / RULES.flipEvery);
    const ranks = ['脳、起動中。', '文字の引力に勝った。', 'その脳、切り替え上手。', '脳内に別回線がある。', '読む前に、見えている。'];
    const rank = ranks[Math.min(flips, ranks.length - 1)];
    $('rank').textContent = rank;
    $('final-score').textContent = score;
    $('result-date').textContent = displayDate;
    $('result-comment').textContent = score === 0 ? 'わかっていても、読んでしまう。次はまず1問。' : `「見る」と「読む」を${flips}回切り替えた。あなたの指は、脳に勝てた？`;
    $('accuracy').textContent = history.length ? `${Math.round(score / history.length * 100)}%` : '—';
    $('max-combo').textContent = `${maxCombo}問`;
    $('switches').textContent = `${flips}回`;
    $('result-grid').replaceChildren(...history.slice(-40).map(correct => { const cell = document.createElement('span'); cell.className = correct ? '' : 'miss'; cell.textContent = correct ? '✓' : '×'; cell.setAttribute('aria-label', correct ? '正解' : '不正解'); return cell; }));
    $('record').textContent = `${score > previousBest ? '自己ベスト更新！ ' : '自己ベスト '}${best}問${saved ? '' : '（この画面内のみ・保存不可）'}`;
    $('record').classList.toggle('new-record', score > previousBest);
    const grid = history.slice(-20).map(correct => correct ? '🟩' : '🟥').join('');
    const url = new URL(location.href); url.search = ''; url.searchParams.set('day', day); url.hash = '';
    const publicUrl = /^https?:$/.test(url.protocol) && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ? `\n${url.href}` : '';
    resultText = `読んだら負け。 ${displayDate}\n30秒で${score}問正解 / 反転${flips}回\n${rank}\n${grid}\n私の${score}問、超えられる？\n#読んだら負け #脳内バグ${publicUrl}`;
    $('share-x').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(resultText)}`;
    $('share-text').value = resultText;
    show('result'); $('retry').focus({ preventScroll: true });
  }
  function home() { clearTimers(); state = 'home'; show('home'); $('start').focus({ preventScroll: true }); }
  document.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', () => {
    const correct = Number(button.dataset.demo) === 2;
    $('demo-feedback').textContent = correct ? '正解！「アオ」だけど、色はミドリ。本番へどうぞ。' : 'つられた！文字は「アオ」、でも色は「ミドリ」。';
    $('demo-feedback').classList.toggle('correct', correct);
    document.querySelectorAll('[data-demo]').forEach(b => b.classList.remove('chosen-right', 'chosen-wrong'));
    button.classList.add(correct ? 'chosen-right' : 'chosen-wrong');
  }));
  buttons.forEach(button => button.addEventListener('click', () => answer(Number(button.dataset.answer))));
  document.addEventListener('keydown', event => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (state === 'playing' && /^[1-4]$/.test(event.key)) { event.preventDefault(); answer(Number(event.key) - 1); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && state === 'playing' && performance.now() >= endAt) finish(); });
  $('start').addEventListener('click', start); $('retry').addEventListener('click', start);
  $('back').addEventListener('click', home); $('quit').addEventListener('click', home);
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(resultText); $('copy-status').textContent = 'コピーしました。友だちに挑戦状をどうぞ。'; }
    catch { $('copy-area').hidden = false; $('share-text').focus(); $('share-text').select(); $('copy-status').textContent = '選択した文章をコピーしてください。'; }
  });
  $('edition').textContent = `DAILY ${displayDate}`;
  $('game-label').textContent = day === today ? 'TODAY’S CHALLENGE' : `CHALLENGE ${displayDate}`;
  updateBest();
})();
