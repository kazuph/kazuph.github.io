export interface Question {
  q: string;
  choices: string[];
  answer: number; // index of correct choice
}

// 内蔵問題（外部API不使用）。10問固定・順番固定で出題し、テストを決定的にする。
export const QUESTIONS: Question[] = [
  { q: "富士山の標高はどれが一番近い？", choices: ["3,776m", "3,466m", "3,776km", "4,776m"], answer: 0 },
  { q: "日本の首都はどこ？", choices: ["大阪", "京都", "東京", "名古屋"], answer: 2 },
  { q: "水の化学式はどれ？", choices: ["CO2", "H2O", "O2", "NaCl"], answer: 1 },
  { q: "一年で一番日が短い日を何という？", choices: ["春分", "夏至", "秋分", "冬至"], answer: 3 },
  { q: "日本で一番大きな都道府県は？（面積）", choices: ["岩手県", "北海道", "長野県", "新潟県"], answer: 1 },
  { q: "信号機の「進め」の色は？", choices: ["赤", "青（緑）", "黄", "白"], answer: 1 },
  { q: "1週間は何日？", choices: ["5日", "6日", "7日", "8日"], answer: 2 },
  { q: "太陽系で一番大きな惑星は？", choices: ["地球", "火星", "木星", "土星"], answer: 2 },
  { q: "ひらがな「あ」の次は？", choices: ["い", "う", "え", "お"], answer: 0 },
  { q: "1000mは何km？", choices: ["0.1km", "1km", "10km", "100km"], answer: 1 },
];
