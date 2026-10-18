// TASK.md fixes gameplay values. REVEAL_MS is presentation time between questions.
export const RULES = Object.freeze({ capacity: 4, answerMs: 10_000, questionMs: 20_000, correct: 10, wrong: -5 });
export const REVEAL_MS = 3000;
export const QUESTIONS = [
  { text: '日本で最も高い山は？', choices: ['富士山', '北岳', '槍ヶ岳', '白山'], answer: 0, category: '地理' },
  { text: '水の化学式は？', choices: ['CO₂', 'H₂O', 'O₂', 'NaCl'], answer: 1, category: '科学' },
  { text: '「吾輩は猫である」の作者は？', choices: ['芥川龍之介', '太宰治', '夏目漱石', '宮沢賢治'], answer: 2, category: '文学' },
  { text: '1年のうち、日数が最も少ない月は？', choices: ['1月', '4月', '6月', '2月'], answer: 3, category: '暮らし' },
  { text: '正三角形の1つの内角は何度？', choices: ['60度', '90度', '45度', '120度'], answer: 0, category: '数学' },
  { text: '太陽系で「赤い惑星」と呼ばれるのは？', choices: ['金星', '火星', '木星', '土星'], answer: 1, category: '宇宙' },
  { text: '日本の都道府県はいくつ？', choices: ['45', '46', '47', '48'], answer: 2, category: '地理' },
  { text: '春の次に来る季節は？', choices: ['冬', '秋', '春', '夏'], answer: 3, category: '自然' },
  { text: '二進数で使う数字の組み合わせは？', choices: ['0と1', '1と2', '0と9', '2と8'], answer: 0, category: '情報' },
  { text: '光合成で植物が主に取り込む気体は？', choices: ['酸素', '二酸化炭素', '窒素', '水素'], answer: 1, category: '生物' }
];
export function createGame(code) {
  return { code, players: [], phase: 'lobby', index: -1, locked: [], holder: null, questionEnd: null, answerEnd: null, revealEnd: null, revision: 0, notice: '' };
}
export function join(game, name, id, token) {
  if (game.phase !== 'lobby') throw new Error('この部屋はすでに対戦中です。');
  if (game.players.length >= RULES.capacity) throw new Error('この部屋は満員です（定員4人）。');
  game.players.push({ id, token, name, score: 0 });
  game.revision++;
}
function nextQuestion(game, now) {
  game.index++;
  game.holder = null; game.answerEnd = null; game.revealEnd = null; game.locked = [];
  game.phase = game.index === QUESTIONS.length ? 'results' : 'question';
  game.questionEnd = game.phase === 'results' ? null : now + RULES.questionMs;
  game.notice = '';
}
function reveal(game, now, notice) {
  game.phase = 'reveal'; game.revealEnd = now + REVEAL_MS; game.holder = null; game.answerEnd = null; game.notice = notice;
}
function failed(game, now, notice) {
  game.locked.push(game.holder); game.holder = null; game.answerEnd = null; game.phase = 'question'; game.notice = notice;
  if (game.locked.length === game.players.length) reveal(game, now, '全員の回答が終わりました。');
}
export function advance(game, now) {
  let changed = false;
  if (['question', 'answering'].includes(game.phase) && now >= game.questionEnd) {
    reveal(game, now, '20秒の制限時間になりました。'); changed = true;
  } else if (game.phase === 'answering' && now >= game.answerEnd) {
    // No choice was submitted: lose this question's right, without a wrong-answer penalty.
    failed(game, now, '回答時間が切れました。残りの人で早押し！'); changed = true;
  } else if (game.phase === 'reveal' && now >= game.revealEnd) {
    nextQuestion(game, now); changed = true;
  }
  if (changed) game.revision++;
  return changed;
}
export function act(game, playerId, command, now) {
  advance(game, now);
  const player = game.players.find(p => p.id === playerId);
  if (!player) throw new Error('プレイヤーを確認できません。');
  if (command.type === 'start') {
    if (playerId !== game.players[0].id) throw new Error('開始できるのはホストだけです。');
    if (game.phase !== 'lobby') throw new Error('ゲームはすでに開始しています。');
    if (game.players.length < 2) throw new Error('開始には2〜4人の参加が必要です。');
    nextQuestion(game, now);
  } else {
    if (command.question !== game.index) throw new Error('この問題への操作は締め切られました。');
    if (command.type === 'buzz') {
      if (game.phase !== 'question' || game.locked.includes(playerId)) throw new Error('今は早押しできません。');
      game.phase = 'answering'; game.holder = playerId;
      game.answerEnd = Math.min(now + RULES.answerMs, game.questionEnd);
      game.notice = `${player.name}さんが回答中です。`;
    } else if (command.type === 'answer') {
      if (game.phase !== 'answering' || game.holder !== playerId) throw new Error('あなたに回答権がありません。');
      if (!Number.isInteger(command.choice) || command.choice < 0 || command.choice >= 4) throw new Error('4つの選択肢から選んでください。');
      if (command.choice === QUESTIONS[game.index].answer) {
        player.score += RULES.correct;
        reveal(game, now, `${player.name}さん、正解！ +10点`);
      } else {
        player.score += RULES.wrong;
        failed(game, now, `${player.name}さん、不正解 −5点。残りの人で早押し！`);
      }
    } else throw new Error('未対応の操作です。');
  }
  game.revision++;
}
export function deadline(game) {
  if (game.phase === 'reveal') return game.revealEnd;
  if (game.phase === 'answering') return Math.min(game.questionEnd, game.answerEnd);
  return game.phase === 'question' ? game.questionEnd : null;
}
export function snapshot(game, now) {
  const question = QUESTIONS[game.index];
  const ranked = [...game.players].sort((a,b) => b.score - a.score);
  return { ...game, serverNow: now,
    players: game.players.map(({ token, ...p }) => ({ ...p, rank: ranked.findIndex(x => x.score === p.score) + 1 })),
    question: question ? { text: question.text, choices: question.choices, category: question.category,
      ...(game.phase === 'reveal' ? { answer: question.answer } : {}) } : null,
    total: QUESTIONS.length
  };
}
