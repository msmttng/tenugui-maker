/**
 * 手ぬぐい工房 (Tenugui Studio) - マスターデータ定義
 * 日本の伝統色、伝統家紋・スタンプ、デザインテンプレート定義
 */

window.TenuguiData = {
  // 日本の伝統色パレット (手ぬぐい・注染・本染めで人気の28色)
  traditionalColors: [
    // 白・生成系
    { name: '晒白 (さらししろ)', hex: '#FFFFFF', cat: 'white' },
    { name: '生成り (きなり)', hex: '#F8F4E6', cat: 'white' },
    { name: '胡粉色 (ごふん)', hex: '#FFFFFC', cat: 'white' },
    { name: '練色 (ねりいろ)', hex: '#EDE4CD', cat: 'white' },

    // 藍・青系
    { name: '濃藍 (こいあい)', hex: '#0F2350', cat: 'blue' },
    { name: '紺藍 (こんあい)', hex: '#165E83', cat: 'blue' },
    { name: '藍色 (あいいろ)', hex: '#1E50A2', cat: 'blue' },
    { name: '納戸色 (なんど)', hex: '#008899', cat: 'blue' },
    { name: '浅葱色 (あさぎ)', hex: '#00A3AF', cat: 'blue' },
    { name: '露草色 (つゆくさ)', hex: '#38A1DB', cat: 'blue' },
    { name: '甕覗 (かめのぞき)', hex: '#A2D7DD', cat: 'blue' },

    // 茜・赤・紫系
    { name: '茜色 (あかね)', hex: '#B7282E', cat: 'red' },
    { name: '朱色 (しゅいろ)', hex: '#C93A40', cat: 'red' },
    { name: '臙脂 (えんじ)', hex: '#9B1E23', cat: 'red' },
    { name: '蘇芳 (すおう)', hex: '#8E354A', cat: 'red' },
    { name: '珊瑚色 (さんご)', hex: '#F5B199', cat: 'red' },
    { name: '桜色 (さくらいろ)', hex: '#FEF4F4', cat: 'red' },
    { name: '江戸紫 (えどむらさき)', hex: '#745399', cat: 'red' },
    { name: '古代紫 (こだいむらさき)', hex: '#895B8A', cat: 'red' },

    // 緑・黄・茶系
    { name: '常磐緑 (ときわみどり)', hex: '#028760', cat: 'green' },
    { name: '抹茶色 (まっちゃ)', hex: '#69821B', cat: 'green' },
    { name: '若竹色 (わかたけ)', hex: '#68BE8D', cat: 'green' },
    { name: '山吹色 (やまぶき)', hex: '#F8B500', cat: 'green' },
    { name: '鬱金色 (うこん)', hex: '#FABF14', cat: 'green' },
    { name: '芥子色 (からし)', hex: '#D0AF4C', cat: 'green' },
    { name: '焦茶 (こげちゃ)', hex: '#6F4B3E', cat: 'green' },

    // 墨・黒系
    { name: '墨色 (すみいろ)', hex: '#2B2B2B', cat: 'dark' },
    { name: '消炭色 (けしずみ)', hex: '#524E4D', cat: 'dark' },
    { name: '銀鼠 (ぎんねず)', hex: '#9EA1A3', cat: 'dark' },
    { name: '漆黒 (しっこく)', hex: '#0D0015', cat: 'dark' }
  ],

  // 伝統和柄パターン一覧
  patterns: [
    { id: 'none', name: '無地 (柄なし)' },
    { id: 'mameshibori', name: '豆絞り (水玉)' },
    { id: 'seigaiha', name: '青海波 (波文様)' },
    { id: 'asanoha', name: '麻の葉' },
    { id: 'ichimatsu', name: '市松模様' },
    { id: 'shippo', name: '七宝つなぎ' },
    { id: 'yagasuri', name: '矢絣 (やがすり)' },
    { id: 'uroko', name: '鱗文様 (厄除け)' },
    { id: 'kagome', name: '籠目 (魔除け)' },
    { id: 'sakura', name: '桜散らし' },
    { id: 'take', name: '竹縞・よろけ縞' },
    { id: 'kanoko', name: '鹿の子絞り風' }
  ],

  // サンプルロゴ・シンボルマーク (ベクター描画定義)
  sampleLogos: [
    { id: 'fuji-sun', name: '富士山と朝日', category: 'logo' },
    { id: 'wave-circle', name: '荒波丸紋', category: 'logo' },
    { id: 'crane-circle', name: '鶴丸（縁起）', category: 'logo' },
    { id: 'gourd', name: '六瓢箪（無病息災）', category: 'logo' },
    { id: 'daruma', name: '必勝だるま', category: 'logo' },
    { id: 'fan', name: '末広がり扇', category: 'logo' },
    { id: 'lantern', name: '祭提灯', category: 'logo' },
    { id: 'bamboo-circle', name: '丸に竹笹', category: 'logo' },
    { id: 'carp', name: '跳ね鯉（滝登り）', category: 'logo' }
  ],

  // 伝統家紋スタンプ
  kamonStamps: [
    { id: 'kamon-ume', name: '丸に梅鉢' },
    { id: 'kamon-katabami', name: '丸に剣片喰' },
    { id: 'kamon-mitsudomoe', name: '左三つ巴' },
    { id: 'kamon-kiri', name: '五七の桐' },
    { id: 'kamon-tachibana', name: '丸に橘' },
    { id: 'kamon-mokko', name: '丸に木瓜' },
    { id: 'kamon-kikyo', name: '丸に桔梗' },
    { id: 'kamon-genji', name: '源氏車' },
    { id: 'kamon-sasa', name: '丸に九枚笹' }
  ],

  // 飾り枠・帯・縁起フレーム
  frameStamps: [
    { id: 'frame-senjafuda', name: '千社札枠 (縦)' },
    { id: 'frame-kaku', name: '二重角枠 (横)' },
    { id: 'frame-circle-thick', name: '太丸紋枠' },
    { id: 'frame-mokko', name: '木瓜額縁枠' },
    { id: 'frame-kumadori', name: '歌舞伎隈取ライン' },
    { id: 'frame-rope', name: '注連縄・ねじり鉢巻線' }
  ],

  // すぐ使えるデザインテンプレート（雛形）
  templates: [
    {
      id: 'matsuri-classic',
      name: '① 粋な豆絞り・祭礼名入れ手ぬぐい',
      desc: '紺藍の豆絞りに、白抜きの千社札で大きく名入れした王道デザイン',
      previewBg: '#165E83',
      previewFg: '#FFFFFF',
      previewLabel: '粋・豆絞り',
      state: {
        orientation: 'horizontal',
        bgColor: '#165E83',
        patternId: 'mameshibori',
        patternColor: '#FFFFFF',
        patternScale: 95,
        patternOpacity: 100,
        patternArea: 'full',
        items: [
          {
            type: 'text',
            text: '江戸祭禮',
            isVertical: true,
            fontFamily: "'Reggae One', sans-serif",
            fontSize: 130,
            letterSpacing: 10,
            color: '#165E83',
            outlineEnabled: false,
            outlineColor: '#FFFFFF',
            outlineWidth: 6,
            boxStyle: 'senjafuda',
            xRatio: 0.80,
            yRatio: 0.50,
            scale: 100,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 180
          },
          {
            type: 'stamp',
            stampId: 'kamon-mitsudomoe',
            name: '左三つ巴',
            color: '#FFFFFF',
            xRatio: 0.22,
            yRatio: 0.50,
            scale: 180,
            rotation: 0,
            opacity: 95,
            repeatMode: 'none',
            repeatGap: 180
          },
          {
            type: 'rakkan',
            text: '祭禮',
            rakkanStyle: 'square-haku',
            color: '#C93A40',
            xRatio: 0.86,
            yRatio: 0.80,
            scale: 95,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 180
          }
        ]
      }
    },
    {
      id: 'shop-novelty',
      name: '② 周年記念・店舗ノベルティ（両端和柄＋中央ロゴ）',
      desc: '生成り生地の両端に青海波をあしらい、中央にロゴと屋号を上品に配置',
      previewBg: '#F8F4E6',
      previewFg: '#165E83',
      previewLabel: '記念・粗品',
      state: {
        orientation: 'horizontal',
        bgColor: '#F8F4E6',
        patternId: 'seigaiha',
        patternColor: '#165E83',
        patternScale: 90,
        patternOpacity: 85,
        patternArea: 'ends',
        items: [
          {
            type: 'stamp',
            stampId: 'fuji-sun',
            name: '富士山と朝日',
            color: '#165E83',
            xRatio: 0.50,
            yRatio: 0.42,
            scale: 150,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 180
          },
          {
            type: 'text',
            text: '創業拾周年記念',
            isVertical: false,
            fontFamily: "'Shippori Mincho B1', serif",
            fontSize: 54,
            letterSpacing: 12,
            color: '#165E83',
            outlineEnabled: false,
            outlineColor: '#FFFFFF',
            outlineWidth: 6,
            boxStyle: 'none',
            xRatio: 0.50,
            yRatio: 0.78,
            scale: 100,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 180
          },
          {
            type: 'rakkan',
            text: '感謝',
            rakkanStyle: 'round-haku',
            color: '#C93A40',
            xRatio: 0.68,
            yRatio: 0.42,
            scale: 90,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 180
          }
        ]
      }
    },
    {
      id: 'kendo-budo',
      name: '③ 剣道・武道用 面手ぬぐい（座右の銘・四字熟語）',
      desc: '力強い毛筆書体で四字熟語と団体名を入れた定番の面タオル仕様',
      previewBg: '#FFFFFF',
      previewFg: '#0F2350',
      previewLabel: '平常心・武道',
      state: {
        orientation: 'horizontal',
        bgColor: '#FFFFFF',
        patternId: 'take',
        patternColor: '#0F2350',
        patternScale: 100,
        patternOpacity: 20,
        patternArea: 'left',
        items: [
          {
            type: 'text',
            text: '百折不撓',
            isVertical: false,
            fontFamily: "'Yuji Syuku', serif",
            fontSize: 165,
            letterSpacing: 18,
            color: '#0F2350',
            outlineEnabled: false,
            outlineColor: '#FFFFFF',
            outlineWidth: 6,
            boxStyle: 'none',
            xRatio: 0.52,
            yRatio: 0.48,
            scale: 100,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 180
          },
          {
            type: 'text',
            text: '青雲館道場',
            isVertical: true,
            fontFamily: "'Yuji Syuku', serif",
            fontSize: 48,
            letterSpacing: 6,
            color: '#0F2350',
            outlineEnabled: false,
            outlineColor: '#FFFFFF',
            outlineWidth: 6,
            boxStyle: 'none',
            xRatio: 0.88,
            yRatio: 0.52,
            scale: 100,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 180
          },
          {
            type: 'rakkan',
            text: '必勝',
            rakkanStyle: 'square-shu',
            color: '#C93A40',
            xRatio: 0.83,
            yRatio: 0.76,
            scale: 85,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 180
          }
        ]
      }
    },
    {
      id: 'komon-scatter',
      name: '④ 和モダン小紋・ロゴ散らし総柄手ぬぐい',
      desc: '麻の葉やシンボルマークを市松状にリピート配置したおしゃれな総柄',
      previewBg: '#9B1E23',
      previewFg: '#F8F4E6',
      previewLabel: '総柄・小紋',
      state: {
        orientation: 'horizontal',
        bgColor: '#9B1E23',
        patternId: 'asanoha',
        patternColor: '#F8F4E6',
        patternScale: 110,
        patternOpacity: 25,
        patternArea: 'full',
        items: [
          {
            type: 'stamp',
            stampId: 'crane-circle',
            name: '鶴丸（リピート散らし）',
            color: '#F8F4E6',
            xRatio: 0.50,
            yRatio: 0.50,
            scale: 90,
            rotation: 0,
            opacity: 90,
            repeatMode: 'brick',
            repeatGap: 220
          },
          {
            type: 'text',
            text: '菓匠 鶴屋',
            isVertical: true,
            fontFamily: "'Zen Old Mincho', serif",
            fontSize: 78,
            letterSpacing: 8,
            color: '#9B1E23',
            outlineEnabled: false,
            outlineColor: '#FFFFFF',
            outlineWidth: 6,
            boxStyle: 'white-pad',
            xRatio: 0.84,
            yRatio: 0.55,
            scale: 100,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 180
          }
        ]
      }
    },
    {
      id: 'kakejiku-vertical',
      name: '⑤ 縦掛けタペストリー・暖簾風デザイン',
      desc: '縦向きに飾り枠と縁起図案・屋号を配したインテリア・店頭向け',
      previewBg: '#008899',
      previewFg: '#FFFFFF',
      previewLabel: '縦掛け・暖簾',
      state: {
        orientation: 'vertical',
        bgColor: '#008899',
        patternId: 'shippo',
        patternColor: '#FFFFFF',
        patternScale: 100,
        patternOpacity: 30,
        patternArea: 'border',
        items: [
          {
            type: 'stamp',
            stampId: 'wave-circle',
            name: '荒波丸紋',
            color: '#FFFFFF',
            xRatio: 0.50,
            yRatio: 0.26,
            scale: 175,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 180
          },
          {
            type: 'text',
            text: '商売繁盛',
            isVertical: true,
            fontFamily: "'Yuji Syuku', serif",
            fontSize: 135,
            letterSpacing: 14,
            color: '#FFFFFF',
            outlineEnabled: false,
            outlineColor: '#008899',
            outlineWidth: 6,
            boxStyle: 'none',
            xRatio: 0.50,
            yRatio: 0.65,
            scale: 100,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 180
          },
          {
            type: 'rakkan',
            text: '千客万来',
            rakkanStyle: 'square-haku',
            color: '#C93A40',
            xRatio: 0.72,
            yRatio: 0.86,
            scale: 100,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 180
          }
        ]
      }
    }
  ]
};
