export interface Question {
  id: number;
  text: string;
  choices: [string, string, string, string];
  /** choices 内の正解の添字（サーバー内だけで使い、出題中は絶対にクライアントへ送らない） */
  answer: number;
}

export const QUESTIONS: Question[] = [
  { id: 1, text: "日本で一番高い山はどれ？", choices: ["富士山", "北岳", "槍ヶ岳", "御嶽山"], answer: 0 },
  { id: 2, text: "日本の首都はどこ？", choices: ["大阪", "京都", "東京", "名古屋"], answer: 2 },
  { id: 3, text: "一年は何か月？", choices: ["10か月", "11か月", "12か月", "13か月"], answer: 2 },
  { id: 4, text: "「吾輩は猫である」を書いた作家は？", choices: ["芥川龍之介", "夏目漱石", "太宰治", "森鷗外"], answer: 1 },
  { id: 5, text: "太陽系で一番大きい惑星は？", choices: ["地球", "土星", "木星", "海王星"], answer: 2 },
  { id: 6, text: "水の化学式はどれ？", choices: ["CO2", "H2O", "O2", "NaCl"], answer: 1 },
  { id: 7, text: "日本で一番面積が大きい都道府県は？", choices: ["北海道", "岩手県", "長野県", "福島県"], answer: 0 },
  { id: 8, text: "オリンピックの五輪の色に含まれないのはどれ？", choices: ["青", "黄", "緑", "紫"], answer: 3 },
  { id: 9, text: "将棋で「王将」を取られたら何になる？", choices: ["負け", "引き分け", "持ち越し", "反則勝ち"], answer: 0 },
  { id: 10, text: "「ドレミ」の「ミ」の次の音は？", choices: ["ソ", "ラ", "ファ", "シ"], answer: 2 },
  { id: 11, text: "源氏物語の作者とされるのは？", choices: ["清少納言", "紫式部", "和泉式部", "小野小町"], answer: 1 },
  { id: 12, text: "1年のうち日本で最も昼が長い日はどれ？", choices: ["春分の日", "夏至", "秋分の日", "冬至"], answer: 1 },
  { id: 13, text: "世界で一番長い川として知られるのは？", choices: ["アマゾン川", "長江", "ナイル川", "ミシシッピ川"], answer: 2 },
  { id: 14, text: "人間の体で一番大きい臓器は？", choices: ["肝臓", "皮膚", "肺", "小腸"], answer: 1 },
  { id: 15, text: "江戸幕府を開いたのは誰？", choices: ["織田信長", "豊臣秀吉", "徳川家康", "足利尊氏"], answer: 2 },
  { id: 16, text: "三角形の内角の和は何度？", choices: ["90度", "180度", "270度", "360度"], answer: 1 },
  { id: 17, text: "「いろは歌」の最初の文字は？", choices: ["い", "ろ", "は", "あ"], answer: 0 },
  { id: 18, text: "寿司に欠かせない調味料「ガリ」の正体は？", choices: ["大根", "しょうが", "にんにく", "わさび"], answer: 1 },
  { id: 19, text: "地球から見て月が地球を一周する周期はおよそ？", choices: ["約1日", "約7日", "約27日", "約365日"], answer: 2 },
  { id: 20, text: "サッカーで1チームがフィールドに出る人数は（GK含む）？", choices: ["9人", "10人", "11人", "12人"], answer: 2 },
];

export const QUESTIONS_PER_GAME = 10;
