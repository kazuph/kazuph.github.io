export const QUESTIONS = [
  { prompt: "日本でいちばん面積が大きい都道府県は？", choices: ["岩手県", "北海道", "長野県", "福島県"], answer: 1 },
  { prompt: "地球の大気で最も多い気体は？", choices: ["酸素", "二酸化炭素", "窒素", "水素"], answer: 2 },
  { prompt: "『吾輩は猫である』を書いた作家は？", choices: ["芥川龍之介", "夏目漱石", "太宰治", "森鴎外"], answer: 1 },
  { prompt: "1円玉の主な材料は？", choices: ["アルミニウム", "銅", "ニッケル", "亜鉛"], answer: 0 },
  { prompt: "太陽系で最も大きい惑星は？", choices: ["土星", "地球", "木星", "海王星"], answer: 2 },
  { prompt: "日本の国鳥として知られている鳥は？", choices: ["ツル", "キジ", "カワセミ", "ウグイス"], answer: 1 },
  { prompt: "水が氷になる温度は、標準気圧で何度？", choices: ["0℃", "−10℃", "4℃", "100℃"], answer: 0 },
  { prompt: "五大栄養素に含まれないものは？", choices: ["脂質", "ビタミン", "食物繊維", "炭水化物"], answer: 2 },
  { prompt: "『走れメロス』の作者は？", choices: ["太宰治", "宮沢賢治", "川端康成", "中島敦"], answer: 0 },
  { prompt: "日本で最も長い川は？", choices: ["利根川", "信濃川", "石狩川", "天竜川"], answer: 1 }
] as const;

export type Question = (typeof QUESTIONS)[number];
