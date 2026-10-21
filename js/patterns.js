/**
 * 手ぬぐい工房 (Tenugui Studio) - 和柄パターン・家紋・落款・布地テクスチャ描画エンジン
 * Canvas 2D で高解像度スケーラブルに描画します。
 */

window.TenuguiPatterns = {
  /**
   * 伝統和柄パターンタイルを生成して CanvasPattern を返す
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} patternId
   * @param {string} colorHex
   * @param {number} scaleRatio (1.0 = 標準サイズ)
   */
  createPattern(ctx, patternId, colorHex, scaleRatio = 1.0) {
    if (!patternId || patternId === 'none') return null;

    const tile = document.createElement('canvas');
    const s = Math.max(0.25, scaleRatio);
    const tCtx = tile.getContext('2d');

    switch (patternId) {
      case 'haneda-naka':
      case 'haneda-naka-h': {
        // 羽田仲 角字繋ぎ（ズレ完全修正済みの216u噛み合わせ格子）
        const w = Math.round(160 * s);
        const h = Math.round(160 * s);
        tile.width = w;
        tile.height = h;
        const ang = patternId === 'haneda-naka' ? -30.15 : 0;
        this.drawHanedaNakaDirect(tCtx, colorHex, s * 0.45, 0, 0, w, h, ang);
        break;
      }

      case 'daisho-arare': {
        // 大小あられ（江戸小紋三役：大きな粒と極小の粒を粋なリズムで散らす文様）
        const size = Math.round(92 * s);
        tile.width = size;
        tile.height = size;
        tCtx.fillStyle = colorHex;

        // 大あられ（主粒）・中あられ・小あられ（微細粒）のシームレス配置座標 [xRatio, yRatio, radiusRatio]
        const dots = [
          // 大あられ (4粒・互い違い配置)
          [0.18, 0.20, 0.088],
          [0.68, 0.14, 0.082],
          [0.42, 0.62, 0.090],
          [0.86, 0.72, 0.084],
          // 中あられ (5粒)
          [0.44, 0.24, 0.052],
          [0.14, 0.56, 0.050],
          [0.72, 0.44, 0.054],
          [0.22, 0.86, 0.052],
          [0.58, 0.88, 0.048],
          // 小あられ (細かい霰粒・隙間を埋める粋な点描)
          [0.06, 0.08, 0.025], [0.33, 0.07, 0.024], [0.52, 0.06, 0.026], [0.88, 0.06, 0.025],
          [0.05, 0.36, 0.026], [0.31, 0.36, 0.025], [0.57, 0.37, 0.024], [0.86, 0.32, 0.026], [0.95, 0.48, 0.024],
          [0.28, 0.49, 0.025], [0.56, 0.51, 0.026], [0.85, 0.53, 0.024],
          [0.06, 0.74, 0.025], [0.26, 0.70, 0.024], [0.62, 0.72, 0.026],
          [0.08, 0.93, 0.024], [0.39, 0.82, 0.025], [0.43, 0.95, 0.024], [0.74, 0.92, 0.026], [0.94, 0.91, 0.025]
        ];

        // タイル境界をまたぐ粒も欠けないよう周囲ラップ描画
        dots.forEach(([rx, ry, rr]) => {
          const cx = rx * size;
          const cy = ry * size;
          const r = Math.max(0.9, rr * size);
          for (let ox of [-size, 0, size]) {
            for (let oy of [-size, 0, size]) {
              const px = cx + ox;
              const py = cy + oy;
              if (px + r >= 0 && px - r <= size && py + r >= 0 && py - r <= size) {
                tCtx.beginPath();
                tCtx.arc(px, py, r, 0, Math.PI * 2);
                tCtx.fill();
              }
            }
          }
        });
        break;
      }

      case 'mameshibori': {
        // 豆絞り（少しゆらぎのある染め水玉）
        const size = Math.round(52 * s);
        tile.width = size;
        tile.height = size;
        tCtx.fillStyle = colorHex;
        const r = size * 0.24;
        // 中央と四隅に配置して互い違いにする
        const pts = [
          [size * 0.25, size * 0.25],
          [size * 0.75, size * 0.75]
        ];
        pts.forEach(([cx, cy]) => {
          tCtx.beginPath();
          tCtx.arc(cx, cy, r, 0, Math.PI * 2);
          tCtx.fill();
        });
        break;
      }

      case 'ichimatsu': {
        // 市松模様
        const size = Math.round(64 * s);
        tile.width = size;
        tile.height = size;
        const half = size / 2;
        tCtx.fillStyle = colorHex;
        tCtx.fillRect(0, 0, half, half);
        tCtx.fillRect(half, half, half, half);
        break;
      }

      case 'seigaiha': {
        // 青海波（同心円アーチの重なり）
        const w = Math.round(88 * s);
        const h = Math.round(44 * s);
        tile.width = w;
        tile.height = h;
        tCtx.strokeStyle = colorHex;
        tCtx.lineWidth = Math.max(1.5, 2.8 * s);

        const drawWaveUnit = (cx, cy) => {
          const maxR = w / 2;
          // 後ろの波を隠すためではなく線画で粋に表現（手ぬぐい染め風）
          for (let i = 4; i >= 1; i--) {
            const r = (maxR * i) / 4;
            tCtx.beginPath();
            tCtx.arc(cx, cy, r, Math.PI, 0, false);
            tCtx.stroke();
          }
        };

        drawWaveUnit(w / 2, h);
        drawWaveUnit(0, h / 2);
        drawWaveUnit(w, h / 2);
        drawWaveUnit(w / 2, 0);
        drawWaveUnit(0, h * 1.5);
        drawWaveUnit(w, h * 1.5);
        break;
      }

      case 'asanoha': {
        // 麻の葉文様
        const w = Math.round(76 * s);
        const h = Math.round(76 * Math.sqrt(3) * 0.5 * s);
        tile.width = w;
        tile.height = h * 2;
        const th = tile.height;
        tCtx.strokeStyle = colorHex;
        tCtx.lineWidth = Math.max(1.2, 2.0 * s);
        tCtx.lineJoin = 'round';

        const drawHexStar = (cx, cy, r) => {
          const pts = [];
          for (let i = 0; i < 6; i++) {
            const ang = (Math.PI / 3) * i;
            pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
          }
          // 外周六角形と中心線
          tCtx.beginPath();
          for (let i = 0; i < 6; i++) {
            const p1 = pts[i];
            const p2 = pts[(i + 1) % 6];
            tCtx.moveTo(p1[0], p1[1]);
            tCtx.lineTo(p2[0], p2[1]);
            tCtx.moveTo(cx, cy);
            tCtx.lineTo(p1[0], p1[1]);
            // 麻の葉の内側ひし形ライン
            const mx = (cx + p1[0] + p2[0]) / 3;
            const my = (cy + p1[1] + p2[1]) / 3;
            tCtx.moveTo(cx, cy);
            tCtx.lineTo(mx, my);
            tCtx.lineTo(p1[0], p1[1]);
            tCtx.moveTo(mx, my);
            tCtx.lineTo(p2[0], p2[1]);
          }
          tCtx.stroke();
        };

        const r = w / 2;
        drawHexStar(0, 0, r);
        drawHexStar(w, 0, r);
        drawHexStar(w / 2, th / 2, r);
        drawHexStar(0, th, r);
        drawHexStar(w, th, r);
        break;
      }

      case 'shippo': {
        // 七宝つなぎ
        const size = Math.round(64 * s);
        tile.width = size;
        tile.height = size;
        const r = size / 2;
        tCtx.strokeStyle = colorHex;
        tCtx.lineWidth = Math.max(1.5, 2.5 * s);

        const centers = [
          [0, 0],
          [size, 0],
          [0, size],
          [size, size],
          [r, r]
        ];
        centers.forEach(([cx, cy]) => {
          tCtx.beginPath();
          tCtx.arc(cx, cy, r, 0, Math.PI * 2);
          tCtx.stroke();
        });
        break;
      }

      case 'yagasuri': {
        // 矢絣（やがすり）
        const w = Math.round(68 * s);
        const h = Math.round(84 * s);
        tile.width = w;
        tile.height = h;
        tCtx.fillStyle = colorHex;
        tCtx.strokeStyle = colorHex;
        tCtx.lineWidth = Math.max(1.5, 2.2 * s);

        const halfW = w / 2;
        const slant = h * 0.22;

        // 縦の仕切り線
        tCtx.beginPath();
        tCtx.moveTo(0, 0); tCtx.lineTo(0, h);
        tCtx.moveTo(halfW, 0); tCtx.lineTo(halfW, h);
        tCtx.stroke();

        // 左列の矢羽（上向き）
        const drawFeather = (x0, xMid, x1, yTop, dir) => {
          tCtx.beginPath();
          tCtx.moveTo(x0, yTop + dir * slant);
          tCtx.lineTo(xMid, yTop);
          tCtx.lineTo(x1, yTop + dir * slant);
          tCtx.lineTo(x1, yTop + dir * slant + h * 0.42);
          tCtx.lineTo(xMid, yTop + h * 0.42);
          tCtx.lineTo(x0, yTop + dir * slant + h * 0.42);
          tCtx.closePath();
          tCtx.fill();
        };

        drawFeather(0, halfW * 0.5, halfW, h * 0.08, 1);
        drawFeather(halfW, halfW * 1.5, w, h * 0.52, -1);
        break;
      }

      case 'uroko': {
        // 鱗（うろこ）文様
        const w = Math.round(64 * s);
        const h = Math.round(56 * s);
        tile.width = w;
        tile.height = h * 2;
        tCtx.fillStyle = colorHex;

        const drawTri = (x, y) => {
          tCtx.beginPath();
          tCtx.moveTo(x + w / 2, y);
          tCtx.lineTo(x + w, y + h);
          tCtx.lineTo(x, y + h);
          tCtx.closePath();
          tCtx.fill();
        };
        drawTri(0, 0);
        drawTri(-w / 2, h);
        drawTri(w / 2, h);
        break;
      }

      case 'kagome': {
        // 籠目（かごめ・六芒星格子）
        const w = Math.round(64 * s);
        const h = Math.round(64 * Math.sqrt(3) * 0.5 * s);
        tile.width = w;
        tile.height = h;
        tCtx.strokeStyle = colorHex;
        tCtx.lineWidth = Math.max(1.5, 2.2 * s);

        tCtx.beginPath();
        // 横線
        tCtx.moveTo(0, h * 0.25); tCtx.lineTo(w, h * 0.25);
        tCtx.moveTo(0, h * 0.75); tCtx.lineTo(w, h * 0.75);
        // 斜め線
        tCtx.moveTo(0, 0); tCtx.lineTo(w, h * 2);
        tCtx.moveTo(-w * 0.5, 0); tCtx.lineTo(w * 0.5, h * 2);
        tCtx.moveTo(w * 0.5, 0); tCtx.lineTo(w * 1.5, h * 2);
        tCtx.moveTo(w, 0); tCtx.lineTo(0, h * 2);
        tCtx.moveTo(w * 0.5, 0); tCtx.lineTo(-w * 0.5, h * 2);
        tCtx.moveTo(w * 1.5, 0); tCtx.lineTo(w * 0.5, h * 2);
        tCtx.stroke();
        break;
      }

      case 'sakura': {
        // 桜散らし
        const size = Math.round(96 * s);
        tile.width = size;
        tile.height = size;
        tCtx.fillStyle = colorHex;

        const drawSakura = (cx, cy, r, rot) => {
          tCtx.save();
          tCtx.translate(cx, cy);
          tCtx.rotate(rot);
          for (let i = 0; i < 5; i++) {
            tCtx.save();
            tCtx.rotate((Math.PI * 2 * i) / 5);
            tCtx.beginPath();
            tCtx.moveTo(0, 0);
            tCtx.bezierCurveTo(-r * 0.55, -r * 0.4, -r * 0.5, -r * 1.1, -r * 0.15, -r * 1.25);
            tCtx.lineTo(0, -r * 1.0);
            tCtx.lineTo(r * 0.15, -r * 1.25);
            tCtx.bezierCurveTo(r * 0.5, -r * 1.1, r * 0.55, -r * 0.4, 0, 0);
            tCtx.fill();
            tCtx.restore();
          }
          tCtx.restore();
        };

        drawSakura(size * 0.28, size * 0.3, 13 * s, 0.2);
        drawSakura(size * 0.76, size * 0.74, 11 * s, -0.4);
        break;
      }

      case 'take': {
        // よろけ縞・竹縞
        const w = Math.round(56 * s);
        const h = Math.round(90 * s);
        tile.width = w;
        tile.height = h;
        tCtx.strokeStyle = colorHex;
        tCtx.lineWidth = Math.max(2, 4.5 * s);

        [w * 0.25, w * 0.75].forEach((x, idx) => {
          const amp = 5 * s * (idx === 0 ? 1 : -1);
          tCtx.beginPath();
          tCtx.moveTo(x, 0);
          tCtx.bezierCurveTo(x + amp, h * 0.33, x - amp, h * 0.66, x, h);
          tCtx.stroke();
        });
        break;
      }

      case 'kanoko': {
        // 鹿の子絞り風
        const size = Math.round(48 * s);
        tile.width = size;
        tile.height = size;
        tCtx.strokeStyle = colorHex;
        tCtx.fillStyle = colorHex;
        tCtx.lineWidth = Math.max(1.5, 2.4 * s);

        const drawKanokoUnit = (cx, cy) => {
          const r = size * 0.26;
          tCtx.beginPath();
          tCtx.roundRect ? tCtx.roundRect(cx - r, cy - r, r * 2, r * 2, r * 0.45) : tCtx.rect(cx - r, cy - r, r * 2, r * 2);
          tCtx.stroke();
          tCtx.beginPath();
          tCtx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
          tCtx.fill();
        };
        drawKanokoUnit(size * 0.25, size * 0.25);
        drawKanokoUnit(size * 0.75, size * 0.75);
        break;
      }
    }

    return ctx.createPattern(tile, 'repeat');
  },

  /**
   * サンプルロゴ・伝統家紋・飾り枠のベクター描画（中心 (0,0)、基準サイズ半径100）
   */
  drawStampVector(ctx, stampId, colorHex) {
    ctx.save();
    ctx.fillStyle = colorHex;
    ctx.strokeStyle = colorHex;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawOuterRing = (r = 92, lineW = 12) => {
      ctx.save();
      ctx.lineWidth = lineW;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    switch (stampId) {
      // --- サンプルロゴ ---
      case 'fuji-sun': {
        // 赤富士・朝日丸紋
        ctx.beginPath();
        ctx.arc(0, -18, 48, 0, Math.PI * 2);
        ctx.lineWidth = 6;
        ctx.stroke();

        // 富士山シルエット
        ctx.beginPath();
        ctx.moveTo(-88, 65);
        ctx.quadraticCurveTo(-36, 40, -16, -15);
        ctx.lineTo(16, -15);
        ctx.quadraticCurveTo(36, 40, 88, 65);
        ctx.closePath();
        ctx.fill();

        // 雪冠（抜き風ライン）
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-24, 8);
        ctx.lineTo(-10, -2);
        ctx.lineTo(0, 10);
        ctx.lineTo(10, -2);
        ctx.lineTo(24, 8);
        ctx.stroke();
        ctx.restore();

        // 裾野の雲海二本線
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-70, 80); ctx.lineTo(70, 80);
        ctx.moveTo(-45, 94); ctx.lineTo(45, 94);
        ctx.stroke();
        break;
      }

      case 'wave-circle': {
        // 荒波丸紋
        drawOuterRing(90, 10);
        ctx.lineWidth = 8;
        for (let row = -1; row <= 2; row++) {
          const y = row * 32 + 10;
          ctx.beginPath();
          ctx.arc(-40, y, 28, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(16, y, 28, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        }
        break;
      }

      case 'crane-circle': {
        // 鶴丸（縁起紋）
        drawOuterRing(92, 9);
        // 広げた翼の優美な弧
        for (let side of [-1, 1]) {
          ctx.save();
          ctx.scale(side, 1);
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.lineWidth = 6 - i * 0.6;
            ctx.arc(10, 10, 72 - i * 11, -Math.PI * 0.78, Math.PI * 0.25);
            ctx.stroke();
          }
          ctx.restore();
        }
        // 鶴の首と頭
        ctx.beginPath();
        ctx.arc(0, -45, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(0, 45);
        ctx.lineTo(0, -68);
        ctx.stroke();
        break;
      }

      case 'gourd': {
        // 六瓢箪（ひょうたん）
        ctx.beginPath();
        ctx.arc(0, -34, 30, 0, Math.PI * 2);
        ctx.arc(0, 28, 48, 0, Math.PI * 2);
        ctx.fill();
        // 口と紐
        ctx.fillRect(-10, -78, 20, 18);
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(18, -58, 18, -Math.PI * 0.8, Math.PI * 0.5);
        ctx.stroke();
        break;
      }

      case 'daruma': {
        // 必勝だるま
        ctx.beginPath();
        ctx.ellipse(0, 8, 72, 82, 0, 0, Math.PI * 2);
        ctx.fill();
        // 顔くり抜き
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.ellipse(0, -18, 48, 34, 0, 0, Math.PI * 2);
        ctx.fill();
        // お腹の金筋
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(0, 35, 36, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        ctx.restore();
        // 目と眉・髭
        ctx.beginPath();
        ctx.arc(-20, -18, 9, 0, Math.PI * 2);
        ctx.arc(20, -18, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-36, -32); ctx.quadraticCurveTo(-20, -42, -8, -30);
        ctx.moveTo(36, -32); ctx.quadraticCurveTo(20, -42, 8, -30);
        ctx.stroke();
        break;
      }

      case 'fan': {
        // 末広がり扇（扇子）
        ctx.beginPath();
        ctx.moveTo(0, 55);
        ctx.arc(0, 55, 125, -Math.PI * 0.82, -Math.PI * 0.18);
        ctx.closePath();
        ctx.fill();
        // 扇の骨（抜き）
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(0, 55);
        ctx.arc(0, 55, 48, -Math.PI * 0.85, -Math.PI * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // 骨ライン
        ctx.lineWidth = 4;
        for (let i = -3; i <= 3; i++) {
          const ang = -Math.PI * 0.5 + i * 0.14;
          ctx.beginPath();
          ctx.moveTo(0, 55);
          ctx.lineTo(Math.cos(ang) * 52, 55 + Math.sin(ang) * 52);
          ctx.stroke();
        }
        break;
      }

      case 'lantern': {
        // 祭提灯
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.ellipse(0, 0, 56, 70, 0, 0, Math.PI * 2);
        ctx.stroke();
        // 上下の黒枠
        ctx.fillRect(-34, -84, 68, 16);
        ctx.fillRect(-30, 68, 60, 16);
        // 提灯の横ひだ
        ctx.lineWidth = 3;
        [-38, -14, 14, 38].forEach(y => {
          const hw = Math.sqrt(Math.max(0, 1 - (y * y) / (70 * 70))) * 56;
          ctx.beginPath();
          ctx.moveTo(-hw, y);
          ctx.lineTo(hw, y);
          ctx.stroke();
        });
        break;
      }

      case 'bamboo-circle':
      case 'kamon-sasa': {
        // 丸に竹笹
        drawOuterRing(90, 10);
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate((i - 1) * 0.7);
          ctx.beginPath();
          ctx.ellipse(0, -32, 13, 44, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        break;
      }

      case 'carp': {
        // 跳ね鯉・波紋
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 20, 65, 0, Math.PI * 1.4);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 20, 42, Math.PI * 0.2, Math.PI * 1.2);
        ctx.stroke();
        // 鯉の流線ボディ
        ctx.beginPath();
        ctx.moveTo(-20, -65);
        ctx.quadraticCurveTo(55, -55, 45, 15);
        ctx.quadraticCurveTo(35, 55, -20, 40);
        ctx.quadraticCurveTo(15, 5, 10, -35);
        ctx.closePath();
        ctx.fill();
        break;
      }

      // --- 伝統家紋 ---
      case 'kamon-ume': {
        // 丸に梅鉢
        drawOuterRing(92, 10);
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 5; i++) {
          const ang = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const cx = Math.cos(ang) * 44;
          const cy = Math.sin(ang) * 44;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(cx, cy);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, 22, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'kamon-katabami': {
        // 丸に剣片喰
        drawOuterRing(92, 10);
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate((Math.PI * 2 * i) / 3);
          // 剣
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-10, -45);
          ctx.lineTo(0, -76);
          ctx.lineTo(10, -45);
          ctx.closePath();
          ctx.fill();
          // ハート葉
          ctx.rotate(Math.PI / 3);
          ctx.beginPath();
          ctx.arc(-18, -38, 22, 0, Math.PI * 2);
          ctx.arc(18, -38, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        break;
      }

      case 'kamon-mitsudomoe': {
        // 左三つ巴
        drawOuterRing(92, 10);
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate((Math.PI * 2 * i) / 3);
          ctx.beginPath();
          ctx.arc(0, -34, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.arc(0, 0, 48, -Math.PI * 0.5, Math.PI * 0.15);
          ctx.stroke();
          ctx.restore();
        }
        break;
      }

      case 'kamon-kiri': {
        // 五七の桐風
        // 3枚の葉
        [-42, 0, 42].forEach((x, idx) => {
          const y = idx === 1 ? 18 : 28;
          ctx.beginPath();
          ctx.ellipse(x, y, 22, 32, 0, 0, Math.PI * 2);
          ctx.fill();
        });
        // 花房
        [-38, 0, 38].forEach((x, idx) => {
          const h = idx === 1 ? 68 : 48;
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, -h);
          ctx.stroke();
          for (let d = 0; d < (idx === 1 ? 4 : 3); d++) {
            ctx.beginPath();
            ctx.arc(x, -20 - d * 15, 8, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        break;
      }

      case 'kamon-tachibana': {
        // 丸に橘
        drawOuterRing(92, 10);
        ctx.beginPath();
        ctx.arc(0, -10, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(-34, 30, 26, 14, -0.4, 0, Math.PI * 2);
        ctx.ellipse(34, 30, 26, 14, 0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'kamon-mokko': {
        // 丸に木瓜
        drawOuterRing(92, 10);
        ctx.lineWidth = 10;
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.rotate((Math.PI / 2) * i);
          ctx.beginPath();
          ctx.arc(0, -34, 32, Math.PI * 0.85, Math.PI * 2.15);
          ctx.stroke();
          ctx.restore();
        }
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'kamon-kikyo': {
        // 丸に桔梗
        drawOuterRing(92, 10);
        for (let i = 0; i < 5; i++) {
          ctx.save();
          ctx.rotate((Math.PI * 2 * i) / 5);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-28, -32, 0, -72);
          ctx.quadraticCurveTo(28, -32, 0, 0);
          ctx.fill();
          ctx.restore();
        }
        break;
      }

      case 'kamon-genji': {
        // 源氏車
        drawOuterRing(86, 12);
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 7;
        for (let i = 0; i < 8; i++) {
          const ang = (Math.PI * 2 * i) / 8;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(ang) * 86, Math.sin(ang) * 86);
          ctx.stroke();
        }
        break;
      }

      // --- 飾り枠・フレーム ---
      case 'frame-senjafuda': {
        // 千社札枠 (縦長二重枠)
        ctx.lineWidth = 10;
        ctx.strokeRect(-55, -110, 110, 220);
        ctx.lineWidth = 3;
        ctx.strokeRect(-44, -99, 88, 198);
        break;
      }

      case 'frame-kaku': {
        // 二重角枠 (横長)
        ctx.lineWidth = 10;
        ctx.strokeRect(-120, -60, 240, 120);
        ctx.lineWidth = 3;
        ctx.strokeRect(-108, -48, 216, 96);
        break;
      }

      case 'frame-circle-thick': {
        // 太丸紋枠
        drawOuterRing(86, 18);
        drawOuterRing(66, 3);
        break;
      }

      case 'frame-mokko': {
        // 木瓜額縁枠
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-110, -65, 220, 130, 28) : ctx.rect(-110, -65, 220, 130);
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(-98, -53, 196, 106, 20) : ctx.rect(-98, -53, 196, 106);
        ctx.stroke();
        break;
      }

      case 'frame-kumadori': {
        // 歌舞伎・一本帯ライン
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.moveTo(-140, -14); ctx.lineTo(140, -14);
        ctx.stroke();
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-140, 12); ctx.lineTo(140, 12);
        ctx.stroke();
        break;
      }

      case 'frame-rope': {
        // ねじり鉢巻・注連縄ライン
        ctx.lineWidth = 10;
        for (let x = -120; x <= 100; x += 28) {
          ctx.beginPath();
          ctx.moveTo(x, -12);
          ctx.lineTo(x + 22, 12);
          ctx.stroke();
        }
        break;
      }
    }

    ctx.restore();
  },

  /**
   * 落款（朱印スタンプ）の描画（中心 (0,0)、基準サイズ 110x110）
   */
  drawRakkan(ctx, text, styleId, colorHex = '#C93A40') {
    ctx.save();
    const chars = Array.from(text || '印');
    const isHaku = styleId.includes('haku'); // 白文（塗りつぶし＋白抜き文字）
    const isRound = styleId.includes('round');
    const isGourd = styleId.includes('gourd');

    ctx.fillStyle = colorHex;
    ctx.strokeStyle = colorHex;
    const r = 52;

    if (isGourd) {
      // ひょうたん印
      ctx.beginPath();
      ctx.arc(0, -24, 24, 0, Math.PI * 2);
      ctx.arc(0, 20, 34, 0, Math.PI * 2);
      ctx.fill();
    } else if (isRound) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      if (isHaku) {
        ctx.fill();
      } else {
        ctx.lineWidth = 7;
        ctx.stroke();
      }
    } else {
      // 角印（少し角丸で手彫り感）
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-r, -r, r * 2, r * 2, 8);
      } else {
        ctx.rect(-r, -r, r * 2, r * 2);
      }
      if (isHaku) {
        ctx.fill();
      } else {
        ctx.lineWidth = 7;
        ctx.stroke();
      }
    }

    // 印面の文字描画
    ctx.fillStyle = isHaku ? '#FFFFFF' : colorHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 38px 'Yuji Syuku', 'Noto Serif JP', serif`;

    if (chars.length === 1) {
      ctx.font = `700 62px 'Yuji Syuku', serif`;
      ctx.fillText(chars[0], 0, 2);
    } else if (chars.length === 2) {
      ctx.font = `700 40px 'Yuji Syuku', serif`;
      ctx.fillText(chars[0], 0, -21);
      ctx.fillText(chars[1], 0, 23);
    } else if (chars.length === 3) {
      ctx.font = `700 34px 'Yuji Syuku', serif`;
      ctx.fillText(chars[0], 20, -20);
      ctx.fillText(chars[1], 20, 20);
      ctx.fillText(chars[2], -20, 0);
    } else {
      // 4文字以上：右上→右下→左上→左下（伝統的な篆刻順）
      ctx.font = `700 34px 'Yuji Syuku', serif`;
      ctx.fillText(chars[0] || '', 21, -21);
      ctx.fillText(chars[1] || '', 21, 21);
      ctx.fillText(chars[2] || '', -21, -21);
      ctx.fillText(chars[3] || '', -21, 21);
    }

    ctx.restore();
  },

  /**
   * 岡生地・総理(文)生地の織り目テクスチャオーバーレイを生成
   */
  createFabricWeavePattern(ctx, weaveType = 'oka') {
    if (weaveType === 'none') return null;
    const t = document.createElement('canvas');
    const step = weaveType === 'bun' ? 6 : 4;
    t.width = step * 2;
    t.height = step * 2;
    const tc = t.getContext('2d');

    const alpha = weaveType === 'bun' ? 0.055 : 0.032;
    tc.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    tc.fillRect(0, 0, step, 1);
    tc.fillRect(step, step, step, 1);
    tc.fillStyle = `rgba(255, 255, 255, ${alpha * 1.2})`;
    tc.fillRect(0, 1, 1, step);
    tc.fillRect(step, step + 1, 1, step);

    return ctx.createPattern(t, 'repeat');
  },

  /**
   * 江戸角字「羽田仲」入れ子連続文様を直接ベクター精度で領域内に描画（継ぎ目ゼロ・ズレ完全修正版）
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} colorHex
   * @param {number} scaleRatio (1.0 = 標準サイズ)
   * @param {number} rx 描画領域X
   * @param {number} ry 描画領域Y
   * @param {number} rw 描画領域W
   * @param {number} rh 描画領域H
   * @param {number} angleDeg 回転角度 (-30.15 または 0)
   */
  drawHanedaNakaDirect(ctx, colorHex, scaleRatio, rx, ry, rw, rh, angleDeg = -30.15) {
    const H_ROW = 216;
    const DX_ROW = 216;
    const PX = 681;
    const RECTS = [
      // 1. 「田」と左隣「羽」を貫く上辺横棒
      [-216, 0, 447, 15],
      // 2. 「田」下辺横棒・左縦棒・中縦棒・右縦棒・中央浮き横棒
      [0, 216, 231, 15],
      [0, 0, 15, 231],
      [108, 0, 15, 231],
      [216, 0, 15, 231],
      [43.5, 108, 144, 15],
      // 3. 「仲」の「亻」（にんべん）— 田の右壁(231)に隙間なく直結
      [231, 78, 61, 15],
      [277, 0, 15, 93],
      [256, 78, 15, 153],
      // 4. 「仲」の「中」
      [321, 18, 144, 15],
      [321, 169, 144, 15],
      [321, 18, 15, 166],
      [450, 18, 15, 166],
      [385.5, 0, 15, 231],
      // 5. 「羽」（田の左側 x: -216..0 の領域、線幅15均一・左右高さ完全揃い）
      [-129, 0, 15, 216],
      [-216, 59, 58, 15],
      [-216, 150, 58, 15],
      [-86, 59, 58, 15],
      [-86, 150, 58, 15]
    ];

    const uScale = 0.25 * Math.max(0.2, scaleRatio);
    const rad = (angleDeg * Math.PI) / 180;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rx, ry, rw, rh);
    ctx.clip();

    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    ctx.translate(cx, cy);
    ctx.rotate(rad);
    ctx.scale(uScale, uScale);
    ctx.fillStyle = colorHex;

    const diag = Math.hypot(rw, rh) / uScale;
    const rowMin = Math.floor(-diag / H_ROW) - 2;
    const rowMax = Math.ceil(diag / H_ROW) + 2;

    for (let r = rowMin; r <= rowMax; r++) {
      const y0 = r * H_ROW;
      const xShift = r * DX_ROW;
      const kMin = Math.floor((-diag - xShift) / PX) - 1;
      const kMax = Math.ceil((diag - xShift) / PX) + 1;

      for (let k = kMin; k <= kMax; k++) {
        const x0 = xShift + k * PX;
        for (let i = 0; i < RECTS.length; i++) {
          const rc = RECTS[i];
          ctx.fillRect(x0 + rc[0] - 0.15, y0 + rc[1] - 0.15, rc[2] + 0.3, rc[3] + 0.3);
        }
      }
    }

    ctx.restore();
  }
};
