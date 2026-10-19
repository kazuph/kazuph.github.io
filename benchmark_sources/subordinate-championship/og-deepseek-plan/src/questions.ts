/**
 * アプリに内蔵した日本語の4択問題。
 * 外部APIには一切アクセスしない。ゲームごとにこの中から10問を選ぶ。
 */
export interface Question {
  id: number;
  text: string;
  choices: readonly [string, string, string, string];
  correctIndex: number;
}

export const QUESTIONS: readonly Question[] = [
  {
    id: 1,
    text: '日本でいちばん高い山はどれ？',
    choices: ['富士山', '高尾山', '阿蘇山', '槍ヶ岳'],
    correctIndex: 0,
  },
  {
    id: 2,
    text: 'うるう年を除くと、1年は何日？',
    choices: ['360日', '364日', '365日', '366日'],
    correctIndex: 2,
  },
  {
    id: 3,
    text: '1気圧のもとで、水が沸騰する温度は？',
    choices: ['90℃', '100℃', '110℃', '120℃'],
    correctIndex: 1,
  },
  {
    id: 4,
    text: '太陽系でいちばん大きい惑星はどれ？',
    choices: ['火星', '地球', '土星', '木星'],
    correctIndex: 3,
  },
  {
    id: 5,
    text: '漢字「林」の画数は？',
    choices: ['6画', '7画', '8画', '9画'],
    correctIndex: 2,
  },
  {
    id: 6,
    text: '富士山の山頂がある都道府県の組み合わせは？',
    choices: [
      '長野県と山梨県',
      '静岡県と山梨県',
      '静岡県と神奈川県',
      '岐阜県と長野県',
    ],
    correctIndex: 1,
  },
  {
    id: 7,
    text: 'ノーベル賞に存在しない部門はどれ？',
    choices: ['物理学賞', '数学賞', '文学賞', '平和賞'],
    correctIndex: 1,
  },
  {
    id: 8,
    text: '1週間は何日？',
    choices: ['5日', '6日', '7日', '8日'],
    correctIndex: 2,
  },
  {
    id: 9,
    text: '日本の首都はどこ？',
    choices: ['大阪', '京都', '東京', '名古屋'],
    correctIndex: 2,
  },
  {
    id: 10,
    text: '地球のまわりを回っている衛星はどれ？',
    choices: ['火星', '月', '太陽', '木星'],
    correctIndex: 1,
  },
  {
    id: 11,
    text: '三角形の3つの内角を足すと何度？',
    choices: ['90度', '180度', '270度', '360度'],
    correctIndex: 1,
  },
  {
    id: 12,
    text: '英語の「apple」が意味する果物は？',
    choices: ['みかん', 'ぶどう', 'もも', 'りんご'],
    correctIndex: 3,
  },
  {
    id: 13,
    text: '「源氏物語」の作者はだれ？',
    choices: ['清少納言', '紫式部', '樋口一葉', '与謝野晶子'],
    correctIndex: 1,
  },
  {
    id: 14,
    text: '東京タワーの高さはおよそ何メートル？',
    choices: ['250m', '300m', '333m', '400m'],
    correctIndex: 2,
  },
  {
    id: 15,
    text: 'サッカーで、1チームが同時に出す選手の人数は？',
    choices: ['9人', '10人', '11人', '12人'],
    correctIndex: 2,
  },
  {
    id: 16,
    text: '徳川家康が開いた幕府はどれ？',
    choices: ['鎌倉幕府', '室町幕府', '江戸幕府', '明治政府'],
    correctIndex: 2,
  },
];
