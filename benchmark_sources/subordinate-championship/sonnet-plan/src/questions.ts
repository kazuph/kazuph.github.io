export interface Question {
  text: string;
  choices: [string, string, string, string];
  /** 正解の選択肢の番号（0〜3） */
  answer: number;
}

export const QUESTIONS: Question[] = [
  { text: "日本でいちばん高い山はどれ？", choices: ["富士山", "北岳", "槍ヶ岳", "御嶽山"], answer: 0 },
  { text: "日本の首都はどこ？", choices: ["大阪", "京都", "東京", "名古屋"], answer: 2 },
  { text: "水が氷になる温度は、1気圧のとき何℃？", choices: ["-10℃", "0℃", "4℃", "10℃"], answer: 1 },
  { text: "太陽系でいちばん大きい惑星は？", choices: ["地球", "土星", "海王星", "木星"], answer: 3 },
  { text: "「吾輩は猫である」を書いた作家は？", choices: ["芥川龍之介", "太宰治", "夏目漱石", "森鷗外"], answer: 2 },
  { text: "一年は何か月？", choices: ["10か月", "11か月", "12か月", "13か月"], answer: 2 },
  { text: "江戸幕府を開いた人物は？", choices: ["織田信長", "豊臣秀吉", "徳川家康", "源頼朝"], answer: 2 },
  { text: "日本でいちばん面積が大きい湖は？", choices: ["霞ヶ浦", "琵琶湖", "浜名湖", "サロマ湖"], answer: 1 },
  { text: "光の三原色に含まれない色はどれ？", choices: ["赤", "緑", "青", "黄"], answer: 3 },
  { text: "寿司のネタ「マグロ」は、どんな生き物？", choices: ["魚", "貝", "イカの仲間", "エビの仲間"], answer: 0 },
  { text: "サッカーの試合で、1チームが同時にピッチに立つのは何人？", choices: ["9人", "10人", "11人", "12人"], answer: 2 },
  { text: "オリンピックのシンボル「五輪マーク」の輪はいくつ？", choices: ["3つ", "4つ", "5つ", "6つ"], answer: 2 },
  { text: "ピアノの鍵盤の色は、主に何色と何色？", choices: ["白と黒", "赤と青", "白と茶", "黒と金"], answer: 0 },
  { text: "日本の通貨の単位は？", choices: ["ドル", "ウォン", "元", "円"], answer: 3 },
  { text: "地球が太陽のまわりを1周するのにかかる期間は？", choices: ["1日", "1週間", "1か月", "1年"], answer: 3 },
  { text: "ひらがなの「あ」の次に来る文字は？", choices: ["う", "い", "え", "お"], answer: 1 },
];
