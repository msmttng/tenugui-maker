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
    { name: '羽田納戸 (千代掛け)', hex: '#046E7E', cat: 'blue' },
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
    { id: 'haneda-naka', name: '羽田仲 角字 (斜め総柄)' },
    { id: 'haneda-naka-h', name: '羽田仲 角字 (水平総柄)' },
    { id: 'daisho-arare', name: '大小あられ (江戸小紋)' },
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
    },
    {
      id: 'edo-komon-arare',
      name: '⑥ 江戸小紋「大小あられ」粋な白抜き手ぬぐい',
      desc: '伝統の江戸小紋三役「大小あられ」を全面に染め、千社札で屋号を入れた格調高い一枚',
      previewBg: '#165E83',
      previewFg: '#FFFFFF',
      previewLabel: '大小あられ',
      state: {
        orientation: 'horizontal',
        bgColor: '#165E83',
        patternId: 'daisho-arare',
        patternColor: '#FFFFFF',
        patternScale: 100,
        patternOpacity: 95,
        patternArea: 'full',
        items: [
          {
            type: 'text',
            text: '粋な江戸小紋',
            isVertical: true,
            fontFamily: "'Yuji Syuku', serif",
            fontSize: 105,
            letterSpacing: 8,
            color: '#165E83',
            outlineEnabled: false,
            outlineColor: '#FFFFFF',
            outlineWidth: 6,
            boxStyle: 'senjafuda',
            xRatio: 0.82,
            yRatio: 0.50,
            scale: 100,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 180
          },
          {
            type: 'rakkan',
            text: '江戸染',
            rakkanStyle: 'square-haku',
            color: '#C93A40',
            xRatio: 0.88,
            yRatio: 0.82,
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
      id: 'haneda-naka-allover',
      name: '⑦ 羽田仲「江戸角字」全面総柄手ぬぐい（ズレ完全修正版）',
      desc: '千代掛けデザインの「羽・田・仲」江戸角字斜め総柄を、微細なズレ・隙間を完全修正して全面に配置した手ぬぐい',
      previewBg: '#046E7E',
      previewFg: '#FFFFFF',
      previewLabel: '羽田仲・総柄',
      state: {
        orientation: 'horizontal',
        bgColor: '#046E7E',
        patternId: 'haneda-naka',
        patternColor: '#FFFFFF',
        patternScale: 100,
        patternOpacity: 100,
        patternArea: 'full',
        items: []
      }
    },
    {
      id: 'haneda-naka-crest',
      name: '⑧ 羽田仲「江戸角字」総柄＋丸紋『仲はねだ』入り手ぬぐい',
      desc: 'ズレ修正済みの「羽田仲」斜め総柄に、元データの『仲はねだ』丸紋を右下に配したデザイン',
      previewBg: '#046E7E',
      previewFg: '#FFFFFF',
      previewLabel: '羽田仲＋丸紋',
      state: {
        orientation: 'horizontal',
        bgColor: '#046E7E',
        patternId: 'haneda-naka',
        patternColor: '#FFFFFF',
        patternScale: 100,
        patternOpacity: 100,
        patternArea: 'full',
        items: [
          {
            type: 'image',
            name: '丸紋「仲はねだ」',
            dataUrl: 'NAKAHANEDA_EMBLEM',
            removeWhiteBg: false,
            whiteThreshold: 235,
            monochrome: false,
            color: '#FFFFFF',
            xRatio: 0.84,
            yRatio: 0.62,
            scale: 80,
            rotation: 0,
            opacity: 100,
            repeatMode: 'none',
            repeatGap: 220
          }
        ]
      }
    }
  ],
  nakahanedaEmblemDataUrl: "data:image/png;base64,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"
};
