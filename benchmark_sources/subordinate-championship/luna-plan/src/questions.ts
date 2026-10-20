export type QuizQuestion = {
  prompt: string;
  choices: [string, string, string, string];
  answer: number;
};

export const QUESTIONS: QuizQuestion[] = [
  {
    prompt: '日本でいちばん高い山は？',
    choices: ['富士山', '北岳', '奥穂高岳', '槍ヶ岳'],
    answer: 0,
  },
  { prompt: '水の化学式は？', choices: ['CO₂', 'H₂O', 'O₂', 'NaCl'], answer: 1 },
  { prompt: '日本の都道府県の数は？', choices: ['45', '46', '47', '48'], answer: 2 },
  { prompt: '光の三原色に含まれない色は？', choices: ['赤', '緑', '青', '黄'], answer: 3 },
  { prompt: '地球の衛星は？', choices: ['火星', '月', '金星', '太陽'], answer: 1 },
  { prompt: '1年は平年で何日？', choices: ['364日', '365日', '366日', '360日'], answer: 1 },
  {
    prompt: '「吾輩は猫である」の作者は？',
    choices: ['夏目漱石', '芥川龍之介', '太宰治', '森鴎外'],
    answer: 0,
  },
  {
    prompt: '日本で最も面積が大きい都道府県は？',
    choices: ['岩手県', '長野県', '北海道', '福島県'],
    answer: 2,
  },
  { prompt: '三角形の内角の和は？', choices: ['90度', '180度', '270度', '360度'], answer: 1 },
  { prompt: 'パンダの主な食べ物は？', choices: ['笹や竹', '木の実', '魚', '昆虫'], answer: 0 },
  {
    prompt: '地球が太陽のまわりを1周する時間は？',
    choices: ['約1日', '約1か月', '約1年', '約10年'],
    answer: 2,
  },
  {
    prompt: '日本の硬貨で、穴が開いているものは？',
    choices: ['1円と5円', '5円と50円', '10円と100円', '50円と500円'],
    answer: 1,
  },
];
