export type Question = { text: string; choices: string[]; correct: number };
export const questions: Question[] = [
  { text: '日本で一番高い山は？', choices: ['富士山', '北岳', '槍ヶ岳', '阿蘇山'], correct: 0 },
  { text: '太陽に最も近い惑星は？', choices: ['金星', '火星', '水星', '地球'], correct: 2 },
  { text: '一年で最も昼が長い日は？', choices: ['春分', '夏至', '秋分', '冬至'], correct: 1 },
  { text: 'ピアノの白鍵と黒鍵を合わせた数は？', choices: ['66', '77', '88', '99'], correct: 2 },
  { text: '水の化学式は？', choices: ['CO₂', 'O₂', 'H₂O', 'NaCl'], correct: 2 },
  { text: '「吾輩は猫である」の作者は？', choices: ['夏目漱石', '宮沢賢治', '芥川龍之介', '太宰治'], correct: 0 },
  { text: '世界で最も面積が大きい海洋は？', choices: ['大西洋', '太平洋', 'インド洋', '北極海'], correct: 1 },
  { text: '虹を日本で一般的に数えると何色？', choices: ['5色', '6色', '7色', '8色'], correct: 2 },
  { text: '三角形の内角の和は？', choices: ['90度', '180度', '270度', '360度'], correct: 1 },
  { text: '北海道の道庁所在地は？', choices: ['旭川市', '函館市', '札幌市', '釧路市'], correct: 2 },
  { text: 'オリンピックのシンボルの輪はいくつ？', choices: ['4つ', '5つ', '6つ', '7つ'], correct: 1 },
  { text: '植物が光を使って養分を作る働きは？', choices: ['発酵', '蒸散', '光合成', '呼吸'], correct: 2 },
];
