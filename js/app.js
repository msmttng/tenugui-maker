/**
 * 手ぬぐい工房 (Tenugui Studio) - メインアプリケーションロジック
 * キャンバス編集、ロゴ透過・単色化、縦書き組版、シミュレーション、高解像度入稿出力
 */

(function () {
  'use strict';

  // 内部作業キャンバスの基準解像度: 1mm = 2px (例: 900x350mm + 塗り足し各10mm => 920x370mm => 1840x740px)
  const PX_PER_MM = 2;
  const BLEED_MM = 10; // 四方 +10mm 塗り足し
  const SAFE_MM = 15;  // 内側 -15mm 安全領域

  // アプリケーション状態
  const state = {
    longMm: 900,
    shortMm: 350,
    orientation: 'horizontal', // 'horizontal' | 'vertical'
    bgColor: '#F8F4E6',
    patternId: 'seigaiha',
    patternColor: '#165E83',
    patternScale: 90,
    patternOpacity: 85,
    patternArea: 'ends',
    fabricWeave: 'oka',
    showGuides: true,
    showTexture: true,
    showFoldLines: false,
    zoom: 1.0,
    items: [],
    selectedId: null
  };

  // Undo / Redo 履歴スタック
  const history = {
    past: [],
    future: [],
    maxSteps: 40
  };

  // 画像キャッシュ (item.id -> { rawImg, processedCanvas, cacheKey })
  const imageCache = new Map();

  // DOM要素参照
  const canvas = document.getElementById('tenuguiCanvas');
  const ctx = canvas.getContext('2d');
  const canvasWrapper = document.getElementById('canvasWrapper');
  const canvasViewport = document.getElementById('canvasViewport');

  // ドラッグ操作用ステート
  let dragState = {
    mode: null, // 'move' | 'scale-rotate'
    targetId: null,
    startMouseX: 0,
    startMouseY: 0,
    initialX: 0,
    initialY: 0,
    initialScale: 100,
    initialRotation: 0,
    initialDist: 1,
    initialAngle: 0,
    hasMoved: false
  };

  // =========================================================================
  // 1. 初期化処理
  // =========================================================================
  function init() {
    renderSidebarTemplates();
    renderColorSwatches('all');
    renderPatternSwatches();
    renderStampGrids();
    bindEvents();

    // 初期テンプレート（② 周年記念・両端青海波＋中央富士ロゴ）をロード
    applyTemplate(window.TenuguiData.templates[1]);
    fitCanvasToViewport();

    // Webフォント読み込み完了後に再描画
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => renderCanvas());
    }
  }

  function generateId() {
    return 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  // 現在の実寸サイズ (mm) と キャンバスピクセル寸法を取得
  function getDimensions() {
    const trimW_mm = state.orientation === 'horizontal' ? state.longMm : state.shortMm;
    const trimH_mm = state.orientation === 'horizontal' ? state.shortMm : state.longMm;
    const totalW_mm = trimW_mm + BLEED_MM * 2;
    const totalH_mm = trimH_mm + BLEED_MM * 2;

    return {
      trimW_mm,
      trimH_mm,
      totalW_mm,
      totalH_mm,
      bleedPx: BLEED_MM * PX_PER_MM,
      safePx: SAFE_MM * PX_PER_MM,
      trimW_px: trimW_mm * PX_PER_MM,
      trimH_px: trimH_mm * PX_PER_MM,
      totalW_px: totalW_mm * PX_PER_MM,
      totalH_px: totalH_mm * PX_PER_MM
    };
  }

  // =========================================================================
  // 2. 履歴管理 (Undo / Redo)
  // =========================================================================
  function serializeState() {
    return JSON.stringify({
      longMm: state.longMm,
      shortMm: state.shortMm,
      orientation: state.orientation,
      bgColor: state.bgColor,
      patternId: state.patternId,
      patternColor: state.patternColor,
      patternScale: state.patternScale,
      patternOpacity: state.patternOpacity,
      patternArea: state.patternArea,
      fabricWeave: state.fabricWeave,
      items: state.items
    });
  }

  function pushHistory() {
    const snap = serializeState();
    if (history.past.length > 0 && history.past[history.past.length - 1] === snap) return;
    history.past.push(snap);
    if (history.past.length > history.maxSteps) history.past.shift();
    history.future = [];
    updateHistoryButtons();
  }

  function restoreSerializedState(jsonStr) {
    const data = JSON.parse(jsonStr);
    Object.assign(state, data);
    // 画像要素があれば再ロード確認
    state.items.forEach(item => {
      if (item.type === 'image' && item.dataUrl && !imageCache.has(item.id)) {
        loadImageToCache(item);
      }
    });
    syncUIFromState();
    updateCanvasSize();
    renderCanvas();
  }

  function undo() {
    if (history.past.length <= 1) return;
    const current = history.past.pop();
    history.future.push(current);
    const prev = history.past[history.past.length - 1];
    restoreSerializedState(prev);
    updateHistoryButtons();
  }

  function redo() {
    if (history.future.length === 0) return;
    const next = history.future.pop();
    history.past.push(next);
    restoreSerializedState(next);
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    document.getElementById('undoBtn').disabled = history.past.length <= 1;
    document.getElementById('redoBtn').disabled = history.future.length === 0;
  }

  // =========================================================================
  // 3. 左サイドバー UI 生成
  // =========================================================================
  function renderSidebarTemplates() {
    const grid = document.getElementById('templateGrid');
    grid.innerHTML = '';
    window.TenuguiData.templates.forEach(tpl => {
      const card = document.createElement('div');
      card.className = 'template-card';
      card.innerHTML = `
        <div class="template-preview" style="background:${tpl.previewBg}; color:${tpl.previewFg};">
          <span>${tpl.previewLabel}</span>
        </div>
        <div class="template-info">
          <h4>${tpl.name}</h4>
          <p>${tpl.desc}</p>
        </div>
      `;
      card.addEventListener('click', () => {
        applyTemplate(tpl);
      });
      grid.appendChild(card);
    });
  }

  function applyTemplate(tpl) {
    const dimBefore = state.orientation;
    state.orientation = tpl.state.orientation || 'horizontal';
    state.bgColor = tpl.state.bgColor;
    state.patternId = tpl.state.patternId;
    state.patternColor = tpl.state.patternColor;
    state.patternScale = tpl.state.patternScale;
    state.patternOpacity = tpl.state.patternOpacity;
    state.patternArea = tpl.state.patternArea;

    updateCanvasSize();
    const dim = getDimensions();

    state.items = tpl.state.items.map(raw => {
      const cloned = JSON.parse(JSON.stringify(raw));
      cloned.id = generateId();
      cloned.x = Math.round(dim.bleedPx + dim.trimW_px * (raw.xRatio ?? 0.5));
      cloned.y = Math.round(dim.bleedPx + dim.trimH_px * (raw.yRatio ?? 0.5));
      return cloned;
    });

    state.selectedId = state.items.length > 0 ? state.items[state.items.length - 1].id : null;
    pushHistory();
    syncUIFromState();
    if (dimBefore !== state.orientation) {
      fitCanvasToViewport();
    } else {
      renderCanvas();
    }
  }

  function renderColorSwatches(categoryFilter = 'all') {
    const bgGrid = document.getElementById('bgTraditionalPalette');
    const patGrid = document.getElementById('patternTraditionalPalette');
    const itemGrid = document.getElementById('itemTraditionalPalette');

    bgGrid.innerHTML = '';
    const colors = window.TenuguiData.traditionalColors.filter(
      c => categoryFilter === 'all' || c.cat === categoryFilter
    );

    colors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'color-swatch';
      sw.style.backgroundColor = c.hex;
      sw.title = `${c.name} (${c.hex})`;
      sw.innerHTML = `<span>${c.name.split(' ')[0]}</span>`;
      sw.addEventListener('click', () => {
        setBgColor(c.hex, c.name);
        pushHistory();
      });
      bgGrid.appendChild(sw);
    });

    // ミニパレット（柄色・要素色用は初回のみ全色描画）
    if (patGrid.children.length === 0) {
      window.TenuguiData.traditionalColors.forEach(c => {
        const sw1 = document.createElement('div');
        sw1.className = 'color-swatch';
        sw1.style.backgroundColor = c.hex;
        sw1.title = `${c.name} (${c.hex})`;
        sw1.addEventListener('click', () => {
          state.patternColor = c.hex;
          document.getElementById('patternColorInput').value = c.hex;
          document.getElementById('patternColorHex').value = c.hex;
          pushHistory();
          renderCanvas();
        });
        patGrid.appendChild(sw1);

        const sw2 = document.createElement('div');
        sw2.className = 'color-swatch';
        sw2.style.backgroundColor = c.hex;
        sw2.title = `${c.name} (${c.hex})`;
        sw2.addEventListener('click', () => {
          updateSelectedItemProp('color', c.hex, true);
        });
        itemGrid.appendChild(sw2);
      });
    }
  }

  function renderPatternSwatches() {
    const grid = document.getElementById('patternGrid');
    grid.innerHTML = '';
    window.TenuguiData.patterns.forEach(pat => {
      const card = document.createElement('div');
      card.className = 'pattern-card';
      card.dataset.patId = pat.id;

      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.className = 'pattern-thumb';
      thumbCanvas.width = 96;
      thumbCanvas.height = 44;
      const tCtx = thumbCanvas.getContext('2d');
      tCtx.fillStyle = '#F8F4E6';
      tCtx.fillRect(0, 0, 96, 44);
      if (pat.id !== 'none') {
        const p = window.TenuguiPatterns.createPattern(tCtx, pat.id, '#165E83', 0.45);
        if (p) {
          tCtx.fillStyle = p;
          tCtx.fillRect(0, 0, 96, 44);
        }
      }

      const label = document.createElement('span');
      label.textContent = pat.name;
      card.appendChild(thumbCanvas);
      card.appendChild(label);

      card.addEventListener('click', () => {
        state.patternId = pat.id;
        syncUIFromState();
        pushHistory();
        renderCanvas();
      });
      grid.appendChild(card);
    });
  }

  function renderStampGrids() {
    const createStampCard = (itemDef, container) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stamp-btn';

      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const cCtx = c.getContext('2d');
      cCtx.translate(32, 32);
      cCtx.scale(0.24, 0.24);
      window.TenuguiPatterns.drawStampVector(cCtx, itemDef.id, '#165E83');

      const span = document.createElement('span');
      span.textContent = itemDef.name;
      btn.appendChild(c);
      btn.appendChild(span);

      btn.addEventListener('click', () => {
        addStampItem(itemDef.id, itemDef.name);
      });
      container.appendChild(btn);
    };

    const sampleLogoGrid = document.getElementById('sampleLogoGrid');
    window.TenuguiData.sampleLogos.forEach(s => createStampCard(s, sampleLogoGrid));

    const kamonGrid = document.getElementById('kamonGrid');
    window.TenuguiData.kamonStamps.forEach(s => createStampCard(s, kamonGrid));

    const frameGrid = document.getElementById('frameGrid');
    window.TenuguiData.frameStamps.forEach(s => createStampCard(s, frameGrid));
  }

  // =========================================================================
  // 4. 要素追加・画像処理 (白背景透過・単色シルエット化)
  // =========================================================================
  function getDefaultContrastColor() {
    // 地色が濃い色なら白、明るい色なら紺藍を初期色にする
    const hex = state.bgColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 240;
    const g = parseInt(hex.substring(2, 4), 16) || 240;
    const b = parseInt(hex.substring(4, 6), 16) || 240;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    return luma < 140 ? '#FFFFFF' : '#165E83';
  }

  function addTextItem(text, isVertical = true, fontSize = 110) {
    const dim = getDimensions();
    const newItem = {
      id: generateId(),
      type: 'text',
      text: text || '手ぬぐい工房',
      isVertical,
      fontFamily: "'Yuji Syuku', serif",
      fontSize,
      letterSpacing: 8,
      color: getDefaultContrastColor(),
      outlineEnabled: false,
      outlineColor: '#FFFFFF',
      outlineWidth: 8,
      boxStyle: 'none',
      x: Math.round(dim.totalW_px / 2 + (Math.random() * 40 - 20)),
      y: Math.round(dim.totalH_px / 2 + (Math.random() * 40 - 20)),
      scale: 100,
      rotation: 0,
      opacity: 100,
      repeatMode: 'none',
      repeatGap: 180
    };
    state.items.push(newItem);
    state.selectedId = newItem.id;
    pushHistory();
    syncUIFromState();
    renderCanvas();
  }

  function addStampItem(stampId, name) {
    const dim = getDimensions();
    const newItem = {
      id: generateId(),
      type: 'stamp',
      stampId,
      name,
      color: getDefaultContrastColor(),
      x: Math.round(dim.totalW_px / 2 + (Math.random() * 40 - 20)),
      y: Math.round(dim.totalH_px / 2 + (Math.random() * 40 - 20)),
      scale: 130,
      rotation: 0,
      opacity: 100,
      repeatMode: 'none',
      repeatGap: 200
    };
    state.items.push(newItem);
    state.selectedId = newItem.id;
    pushHistory();
    syncUIFromState();
    renderCanvas();
  }

  function addRakkanItem() {
    const text = document.getElementById('rakkanTextInput').value.trim() || '印';
    const rakkanStyle = document.getElementById('rakkanStyleSelect').value;
    const dim = getDimensions();
    const newItem = {
      id: generateId(),
      type: 'rakkan',
      text,
      rakkanStyle,
      color: '#C93A40',
      x: Math.round(dim.bleedPx + dim.trimW_px * 0.82),
      y: Math.round(dim.bleedPx + dim.trimH_px * 0.75),
      scale: 100,
      rotation: 0,
      opacity: 100,
      repeatMode: 'none',
      repeatGap: 180
    };
    state.items.push(newItem);
    state.selectedId = newItem.id;
    pushHistory();
    syncUIFromState();
    renderCanvas();
  }

  function handleLogoFileUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      const dim = getDimensions();
      const newItem = {
        id: generateId(),
        type: 'image',
        name: file.name.replace(/\.[^/.]+$/, ''),
        dataUrl,
        removeWhiteBg: true,
        whiteThreshold: 235,
        monochrome: false,
        color: getDefaultContrastColor(),
        x: Math.round(dim.totalW_px / 2),
        y: Math.round(dim.totalH_px / 2),
        scale: 100,
        rotation: 0,
        opacity: 100,
        repeatMode: 'none',
        repeatGap: 220
      };
      state.items.push(newItem);
      state.selectedId = newItem.id;
      loadImageToCache(newItem, () => {
        pushHistory();
        syncUIFromState();
        renderCanvas();
      });
    };
    reader.readAsDataURL(file);
  }

  function loadImageToCache(item, callback) {
    const img = new Image();
    img.onload = () => {
      // 大きすぎる画像は最大800pxに正規化して高速処理
      const maxDim = 800;
      let w = img.naturalWidth || 300;
      let h = img.naturalHeight || 300;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      item.baseWidth = w;
      item.baseHeight = h;
      imageCache.set(item.id, { rawImg: img, w, h, processedCanvas: null, cacheKey: '' });
      if (callback) callback();
      else renderCanvas();
    };
    img.src = item.dataUrl;
  }

  /**
   * アップロード画像の「白背景透過」および「単色染めシルエット化」処理済みキャンバスを返す
   */
  function getProcessedImageCanvas(item) {
    const entry = imageCache.get(item.id);
    if (!entry || !entry.rawImg) return null;

    const key = `${item.removeWhiteBg}_${item.whiteThreshold}_${item.monochrome}_${item.color}`;
    if (entry.processedCanvas && entry.cacheKey === key) {
      return entry.processedCanvas;
    }

    const { rawImg, w, h } = entry;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const oCtx = off.getContext('2d');
    oCtx.drawImage(rawImg, 0, 0, w, h);

    if (item.removeWhiteBg || item.monochrome) {
      const imgData = oCtx.getImageData(0, 0, w, h);
      const d = imgData.data;
      const thresh = item.whiteThreshold ?? 235;

      // 単色化ターゲットRGB
      const hex = (item.color || '#165E83').replace('#', '');
      const tr = parseInt(hex.substring(0, 2), 16) || 22;
      const tg = parseInt(hex.substring(2, 4), 16) || 94;
      const tb = parseInt(hex.substring(4, 6), 16) || 131;

      for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        let a = d[i + 3];
        if (a === 0) continue;

        const brightness = (r + g + b) / 3;
        if (item.removeWhiteBg && brightness >= thresh) {
          // 境界を滑らかにフェードアウト
          const soft = Math.max(0, (255 - brightness) / Math.max(1, 255 - thresh));
          a = Math.round(a * soft * 0.25);
          d[i + 3] = a;
        }

        if (item.monochrome && d[i + 3] > 10) {
          d[i] = tr;
          d[i + 1] = tg;
          d[i + 2] = tb;
        }
      }
      oCtx.putImageData(imgData, 0, 0);
    }

    entry.processedCanvas = off;
    entry.cacheKey = key;
    return off;
  }

  // =========================================================================
  // 5. キャンバス描画エンジン (プレビュー＆高解像度出力共通)
  // =========================================================================
  function updateCanvasSize() {
    const dim = getDimensions();
    canvas.width = dim.totalW_px;
    canvas.height = dim.totalH_px;

    canvasWrapper.style.width = `${Math.round(dim.totalW_px * state.zoom * 0.5)}px`;
    canvasWrapper.style.height = `${Math.round(dim.totalH_px * state.zoom * 0.5)}px`;

    document.getElementById('specDimensionBadge').textContent =
      `実寸: ${dim.trimW_mm} × ${dim.trimH_mm} mm (塗り足し込: ${dim.totalW_mm} × ${dim.totalH_mm} mm)`;
  }

  function fitCanvasToViewport() {
    const dim = getDimensions();
    const rect = canvasViewport.getBoundingClientRect();
    const availW = Math.max(300, rect.width - 64);
    const availH = Math.max(200, rect.height - 64);

    const baseDispW = dim.totalW_px * 0.5;
    const baseDispH = dim.totalH_px * 0.5;
    const scale = Math.min(availW / baseDispW, availH / baseDispH, 1.4);

    state.zoom = Math.round(scale * 100) / 100;
    document.getElementById('zoomLevelText').textContent = `${Math.round(state.zoom * 100)}%`;
    updateCanvasSize();
    renderCanvas();
  }

  /**
   * 任意のコンテキスト・スケール倍率に手ぬぐいデザインを描画する
   * @param {CanvasRenderingContext2D} targetCtx
   * @param {Object} options { scaleFactor, includeBleed, showGuides, showTexture, showSelection, showTrimMarks }
   */
  function drawTenuguiScene(targetCtx, options = {}) {
    const {
      scaleFactor = 1.0,
      includeBleed = true,
      showGuides = false,
      showTexture = false,
      showFoldLines = false,
      showSelection = false,
      showTrimMarks = false
    } = options;

    const dim = getDimensions();
    targetCtx.save();
    targetCtx.scale(scaleFactor, scaleFactor);

    // 塗り足しを含めない（仕上がり実寸のみ）場合は bleedPx 分オフセット
    if (!includeBleed) {
      targetCtx.translate(-dim.bleedPx, -dim.bleedPx);
    }

    const W = dim.totalW_px;
    const H = dim.totalH_px;
    const bPx = dim.bleedPx;
    const trimW = dim.trimW_px;
    const trimH = dim.trimH_px;

    // 1. 地色（ベースカラー）塗りつぶし
    targetCtx.fillStyle = state.bgColor;
    targetCtx.fillRect(0, 0, W, H);

    // 2. 伝統和柄パターン描画
    if (state.patternId && state.patternId !== 'none') {
      const pat = window.TenuguiPatterns.createPattern(
        targetCtx,
        state.patternId,
        state.patternColor,
        state.patternScale / 100
      );
      if (pat) {
        targetCtx.save();
        targetCtx.globalAlpha = (state.patternOpacity ?? 100) / 100;
        targetCtx.fillStyle = pat;

        const area = state.patternArea || 'full';
        if (area === 'full') {
          targetCtx.fillRect(0, 0, W, H);
        } else if (area === 'ends') {
          if (state.orientation === 'horizontal') {
            const endW = bPx + trimW * 0.20;
            targetCtx.fillRect(0, 0, endW, H);
            targetCtx.fillRect(W - endW, 0, endW, H);
          } else {
            const endH = bPx + trimH * 0.20;
            targetCtx.fillRect(0, 0, W, endH);
            targetCtx.fillRect(0, H - endH, W, endH);
          }
        } else if (area === 'left') {
          if (state.orientation === 'horizontal') {
            targetCtx.fillRect(0, 0, bPx + trimW * 0.24, H);
          } else {
            targetCtx.fillRect(0, 0, W, bPx + trimH * 0.24);
          }
        } else if (area === 'right') {
          if (state.orientation === 'horizontal') {
            const endW = bPx + trimW * 0.24;
            targetCtx.fillRect(W - endW, 0, endW, H);
          } else {
            const endH = bPx + trimH * 0.24;
            targetCtx.fillRect(0, H - endH, W, endH);
          }
        } else if (area === 'border') {
          const frameThick = Math.min(trimW, trimH) * 0.16 + bPx;
          targetCtx.beginPath();
          targetCtx.rect(0, 0, W, H);
          targetCtx.rect(frameThick, frameThick, W - frameThick * 2, H - frameThick * 2);
          targetCtx.fill('evenodd');
        } else if (area === 'band-h') {
          if (state.orientation === 'horizontal') {
            const bandH = trimH * 0.34;
            targetCtx.fillRect(0, (H - bandH) / 2, W, bandH);
          } else {
            const bandW = trimW * 0.34;
            targetCtx.fillRect((W - bandW) / 2, 0, bandW, H);
          }
        }
        targetCtx.restore();
      }
    }

    // 3. 各レイヤーアイテムの描画
    state.items.forEach(item => {
      drawItemWithRepeat(targetCtx, item, W, H);
    });

    // 4. 布地の織り目テクスチャ＆切りっぱなし端フリンジ（プレビュー用）
    if (showTexture && state.fabricWeave !== 'none') {
      const weavePat = window.TenuguiPatterns.createFabricWeavePattern(targetCtx, state.fabricWeave);
      if (weavePat) {
        targetCtx.save();
        targetCtx.fillStyle = weavePat;
        targetCtx.fillRect(0, 0, W, H);
        targetCtx.restore();
      }
      // 手ぬぐい特有の左右端「切りっぱなし糸」の微細表現
      targetCtx.save();
      targetCtx.strokeStyle = 'rgba(0,0,0,0.12)';
      targetCtx.lineWidth = 1;
      if (state.orientation === 'horizontal') {
        for (let y = bPx; y < bPx + trimH; y += 5) {
          targetCtx.beginPath();
          targetCtx.moveTo(bPx, y);
          targetCtx.lineTo(bPx + 7, y + (y % 2 === 0 ? 1 : -1));
          targetCtx.moveTo(bPx + trimW, y);
          targetCtx.lineTo(bPx + trimW - 7, y + (y % 2 === 0 ? 1 : -1));
          targetCtx.stroke();
        }
      }
      targetCtx.restore();
    }

    // 5. 折り目シミュレーションライン (4つ折り/8つ折り確認)
    if (showFoldLines) {
      targetCtx.save();
      targetCtx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
      targetCtx.lineWidth = 1.5;
      targetCtx.setLineDash([8, 6]);
      // 縦横4分割ライン
      for (let i = 1; i <= 3; i++) {
        const fx = bPx + (trimW * i) / 4;
        targetCtx.beginPath();
        targetCtx.moveTo(fx, bPx);
        targetCtx.lineTo(fx, bPx + trimH);
        targetCtx.stroke();
      }
      const fy = bPx + trimH / 2;
      targetCtx.beginPath();
      targetCtx.moveTo(bPx, fy);
      targetCtx.lineTo(bPx + trimW, fy);
      targetCtx.stroke();

      // 右下1/8区画（畳んだ時に表面になりやすいゾーン）ラベル
      targetCtx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      targetCtx.font = '700 13px sans-serif';
      targetCtx.fillText('★四つ折り・八つ折り表面エリア', bPx + trimW * 0.76, bPx + trimH * 0.94);
      targetCtx.restore();
    }

    // 6. 入稿用トンボ（トリムマーク）描画
    if (showTrimMarks) {
      drawTrimMarks(targetCtx, bPx, trimW, trimH);
    }

    // 7. 画面編集用ガイド線（塗り足し・仕上がり断裁線・安全枠）
    if (showGuides) {
      targetCtx.save();
      // 塗り足し外周（赤破線）
      targetCtx.strokeStyle = '#ef4444';
      targetCtx.lineWidth = 2;
      targetCtx.setLineDash([6, 4]);
      targetCtx.strokeRect(1, 1, W - 2, H - 2);

      // 仕上がり断裁線（青実線）
      targetCtx.strokeStyle = '#0284c7';
      targetCtx.lineWidth = 2;
      targetCtx.setLineDash([]);
      targetCtx.strokeRect(bPx, bPx, trimW, trimH);

      // 内側安全領域（緑点線）
      const sPx = dim.safePx;
      targetCtx.strokeStyle = '#16a34a';
      targetCtx.lineWidth = 1.5;
      targetCtx.setLineDash([3, 4]);
      targetCtx.strokeRect(bPx + sPx, bPx + sPx, trimW - sPx * 2, trimH - sPx * 2);
      targetCtx.restore();
    }

    // 8. 選択中アイテムのバウンディングボックス＆操作ハンドル
    if (showSelection && state.selectedId) {
      const sel = state.items.find(it => it.id === state.selectedId);
      if (sel) {
        drawSelectionGizmo(targetCtx, sel);
      }
    }

    targetCtx.restore();
  }

  function drawTrimMarks(targetCtx, bPx, trimW, trimH) {
    targetCtx.save();
    targetCtx.strokeStyle = '#000000';
    targetCtx.lineWidth = 1.2;
    const len = bPx * 0.85;
    const corners = [
      [bPx, bPx, -1, -1],
      [bPx + trimW, bPx, 1, -1],
      [bPx, bPx + trimH, -1, 1],
      [bPx + trimW, bPx + trimH, 1, 1]
    ];
    corners.forEach(([cx, cy, dx, dy]) => {
      targetCtx.beginPath();
      targetCtx.moveTo(cx + dx * 4, cy);
      targetCtx.lineTo(cx + dx * len, cy);
      targetCtx.moveTo(cx, cy + dy * 4);
      targetCtx.lineTo(cx, cy + dy * len);
      targetCtx.stroke();
    });
    targetCtx.restore();
  }

  function drawItemWithRepeat(targetCtx, item, canvasW, canvasH) {
    const mode = item.repeatMode || 'none';
    if (mode === 'none') {
      drawSingleItem(targetCtx, item, item.x, item.y);
      return;
    }

    const gap = Math.max(60, item.repeatGap || 180);
    if (mode === 'row') {
      for (let x = gap * 0.5; x < canvasW; x += gap) {
        drawSingleItem(targetCtx, item, x, item.y);
      }
    } else if (mode === 'grid' || mode === 'brick') {
      let rowIdx = 0;
      for (let y = gap * 0.5; y < canvasH + gap * 0.5; y += gap * 0.85) {
        const offsetX = mode === 'brick' && rowIdx % 2 === 1 ? gap * 0.5 : 0;
        for (let x = gap * 0.4 + offsetX; x < canvasW + gap * 0.5; x += gap) {
          drawSingleItem(targetCtx, item, x, y);
        }
        rowIdx++;
      }
    }
  }

  /**
   * アイテムのローカルバウンディングサイズ (未スケール時 width, height) を計測
   */
  function getItemBaseSize(item) {
    if (item.type === 'text') {
      const lines = (item.text || '').split('\n');
      const fs = item.fontSize || 80;
      const ls = item.letterSpacing || 0;
      const maxChars = Math.max(...lines.map(l => Array.from(l).length), 1);

      if (item.isVertical) {
        const w = lines.length * (fs * 1.25) + 28;
        const h = maxChars * (fs + ls) + 28;
        return { w, h };
      } else {
        ctx.save();
        ctx.font = `700 ${fs}px ${item.fontFamily}`;
        let maxW = 40;
        lines.forEach(line => {
          const chars = Array.from(line);
          const m = ctx.measureText(line).width + Math.max(0, chars.length - 1) * ls;
          if (m > maxW) maxW = m;
        });
        ctx.restore();
        const h = lines.length * (fs * 1.25) + 24;
        return { w: maxW + 28, h };
      }
    } else if (item.type === 'stamp') {
      if (item.stampId && item.stampId.startsWith('frame-')) {
        return { w: 260, h: 240 };
      }
      return { w: 200, h: 200 };
    } else if (item.type === 'rakkan') {
      return { w: 116, h: 116 };
    } else if (item.type === 'image') {
      return { w: item.baseWidth || 240, h: item.baseHeight || 240 };
    }
    return { w: 120, h: 120 };
  }

  function drawSingleItem(targetCtx, item, posX, posY) {
    targetCtx.save();
    targetCtx.translate(posX, posY);
    targetCtx.rotate(((item.rotation || 0) * Math.PI) / 180);
    const sc = (item.scale || 100) / 100;
    targetCtx.scale(sc, sc);
    targetCtx.globalAlpha = (item.opacity ?? 100) / 100;

    if (item.type === 'text') {
      drawTextElement(targetCtx, item);
    } else if (item.type === 'stamp') {
      window.TenuguiPatterns.drawStampVector(targetCtx, item.stampId, item.color || '#165E83');
    } else if (item.type === 'rakkan') {
      window.TenuguiPatterns.drawRakkan(targetCtx, item.text, item.rakkanStyle, item.color || '#C93A40');
    } else if (item.type === 'image') {
      const proc = getProcessedImageCanvas(item);
      if (proc) {
        targetCtx.drawImage(proc, -proc.width / 2, -proc.height / 2, proc.width, proc.height);
      }
    }

    targetCtx.restore();
  }

  /**
   * 縦書き・横書き・千社札枠・袋文字対応のテキスト組版描画
   */
  function drawTextElement(targetCtx, item) {
    const { w, h } = getItemBaseSize(item);
    const fs = item.fontSize || 80;
    const ls = item.letterSpacing || 0;
    const lines = (item.text || '').split('\n');

    // 1. 座布団・千社札背景ボックスの描画
    if (item.boxStyle === 'white-pad') {
      targetCtx.fillStyle = state.bgColor;
      targetCtx.fillRect(-w / 2 - 12, -h / 2 - 12, w + 24, h + 24);
    } else if (item.boxStyle === 'senjafuda') {
      const padX = 24;
      const padY = 26;
      const bw = w + padX * 2;
      const bh = h + padY * 2;
      targetCtx.fillStyle = '#FFFFFF';
      targetCtx.fillRect(-bw / 2, -bh / 2, bw, bh);
      targetCtx.strokeStyle = item.color || '#165E83';
      targetCtx.lineWidth = 8;
      targetCtx.strokeRect(-bw / 2 + 6, -bh / 2 + 6, bw - 12, bh - 12);
      targetCtx.lineWidth = 2.5;
      targetCtx.strokeRect(-bw / 2 + 15, -bh / 2 + 15, bw - 30, bh - 30);
    } else if (item.boxStyle === 'circle-crest') {
      const rad = Math.max(w, h) * 0.62;
      targetCtx.fillStyle = '#FFFFFF';
      targetCtx.beginPath();
      targetCtx.arc(0, 0, rad, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.strokeStyle = item.color || '#165E83';
      targetCtx.lineWidth = 8;
      targetCtx.stroke();
    }

    // 2. 文字本体の描画
    targetCtx.font = `700 ${fs}px ${item.fontFamily}`;
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
    targetCtx.fillStyle = item.color || '#165E83';

    if (item.outlineEnabled) {
      targetCtx.strokeStyle = item.outlineColor || '#FFFFFF';
      targetCtx.lineWidth = item.outlineWidth || 8;
      targetCtx.lineJoin = 'round';
    }

    if (item.isVertical) {
      // 縦書き組版（右列から左列へ配置、長音符「ー」等は90度回転）
      const colStep = fs * 1.25;
      const totalColsW = (lines.length - 1) * colStep;

      lines.forEach((line, colIdx) => {
        const chars = Array.from(line);
        const colX = totalColsW / 2 - colIdx * colStep;
        const totalCharsH = (chars.length - 1) * (fs + ls);

        chars.forEach((ch, rowIdx) => {
          const charY = -totalCharsH / 2 + rowIdx * (fs + ls);
          targetCtx.save();
          targetCtx.translate(colX, charY);

          // 縦書き時に回転させる記号
          if ('ー〜～()（）「」『』【】[]－-'.includes(ch)) {
            targetCtx.rotate(Math.PI / 2);
          } else if ('、。'.includes(ch)) {
            targetCtx.translate(fs * 0.32, -fs * 0.32);
          }

          if (item.outlineEnabled) targetCtx.strokeText(ch, 0, 0);
          targetCtx.fillText(ch, 0, 0);
          targetCtx.restore();
        });
      });
    } else {
      // 横書き組版（字間対応）
      const rowStep = fs * 1.25;
      const totalRowsH = (lines.length - 1) * rowStep;

      lines.forEach((line, rowIdx) => {
        const chars = Array.from(line);
        const rowY = -totalRowsH / 2 + rowIdx * rowStep;

        if (ls === 0) {
          if (item.outlineEnabled) targetCtx.strokeText(line, 0, rowY);
          targetCtx.fillText(line, 0, rowY);
        } else {
          // 1文字ずつ字間を空けて描画
          const widths = chars.map(c => targetCtx.measureText(c).width);
          const totalW = widths.reduce((a, b) => a + b, 0) + Math.max(0, chars.length - 1) * ls;
          let curX = -totalW / 2;
          chars.forEach((ch, i) => {
            const cw = widths[i];
            const cx = curX + cw / 2;
            if (item.outlineEnabled) targetCtx.strokeText(ch, cx, rowY);
            targetCtx.fillText(ch, cx, rowY);
            curX += cw + ls;
          });
        }
      });
    }
  }

  function drawSelectionGizmo(targetCtx, item) {
    const { w, h } = getItemBaseSize(item);
    const sc = (item.scale || 100) / 100;
    const hw = (w * sc) / 2 + 10;
    const hh = (h * sc) / 2 + 10;

    targetCtx.save();
    targetCtx.translate(item.x, item.y);
    targetCtx.rotate(((item.rotation || 0) * Math.PI) / 180);

    targetCtx.strokeStyle = '#0284c7';
    targetCtx.lineWidth = 2.5;
    targetCtx.setLineDash([6, 4]);
    targetCtx.strokeRect(-hw, -hh, hw * 2, hh * 2);

    // 四隅のリサイズ・回転ハンドル（右下をメイン操作ノブとして強調）
    targetCtx.setLineDash([]);
    targetCtx.fillStyle = '#ffffff';
    const corners = [
      [-hw, -hh],
      [hw, -hh],
      [-hw, hh],
      [hw, hh]
    ];
    corners.forEach(([cx, cy], idx) => {
      targetCtx.beginPath();
      targetCtx.arc(cx, cy, idx === 3 ? 10 : 6, 0, Math.PI * 2);
      targetCtx.fillStyle = idx === 3 ? '#0284c7' : '#ffffff';
      targetCtx.fill();
      targetCtx.stroke();
    });

    targetCtx.restore();
  }

  function renderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTenuguiScene(ctx, {
      scaleFactor: 1.0,
      includeBleed: true,
      showGuides: state.showGuides,
      showTexture: state.showTexture,
      showFoldLines: state.showFoldLines,
      showSelection: true,
      showTrimMarks: false
    });
    updateUsedColorsBadge();
  }

  // 使用色数カウント（本染め・注染の版数目安）
  function updateUsedColorsBadge() {
    const colorSet = new Set();
    colorSet.add(state.bgColor.toUpperCase());
    if (state.patternId && state.patternId !== 'none') {
      colorSet.add(state.patternColor.toUpperCase());
    }
    let hasFullColorImage = false;
    state.items.forEach(it => {
      if (it.type === 'image' && !it.monochrome) {
        hasFullColorImage = true;
      } else if (it.color) {
        colorSet.add(it.color.toUpperCase());
      }
      if (it.type === 'text' && it.outlineEnabled && it.outlineColor) {
        colorSet.add(it.outlineColor.toUpperCase());
      }
    });

    const badge = document.getElementById('usedColorsBadge');
    if (hasFullColorImage) {
      badge.textContent = `使用色: フルカラー画像あり (インクジェット向き)`;
      badge.style.background = '#fef3c7';
      badge.style.color = '#92400e';
    } else {
      const dyeCount = Math.max(1, colorSet.size - 1); // 生地色を除いた染め色数目安
      badge.textContent = `構成色数: 全${colorSet.size}色 (染め版目安: ${dyeCount}色)`;
      badge.style.background = '#dcfce7';
      badge.style.color = '#166534';
    }
  }

  // =========================================================================
  // 6. マウス操作（選択・ドラッグ移動・右下ハンドルで拡縮＆回転）
  // =========================================================================
  function getCanvasMouseCoords(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY
    };
  }

  function isPointInItem(px, py, item) {
    const { w, h } = getItemBaseSize(item);
    const sc = (item.scale || 100) / 100;
    const hw = (w * sc) / 2 + 12;
    const hh = (h * sc) / 2 + 12;

    const dx = px - item.x;
    const dy = py - item.y;
    const rad = (-(item.rotation || 0) * Math.PI) / 180;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

    // 右下ハンドル判定
    const distHandle = Math.hypot(lx - hw, ly - hh);
    if (distHandle <= 20) {
      return 'handle';
    }
    if (lx >= -hw && lx <= hw && ly >= -hh && ly <= hh) {
      return 'body';
    }
    return null;
  }

  function onCanvasMouseDown(evt) {
    const pt = getCanvasMouseCoords(evt);

    // まず現在選択中アイテムのハンドルをクリックしたか判定
    if (state.selectedId) {
      const sel = state.items.find(it => it.id === state.selectedId);
      if (sel && isPointInItem(pt.x, pt.y, sel) === 'handle') {
        dragState = {
          mode: 'scale-rotate',
          targetId: sel.id,
          startMouseX: pt.x,
          startMouseY: pt.y,
          initialX: sel.x,
          initialY: sel.y,
          initialScale: sel.scale || 100,
          initialRotation: sel.rotation || 0,
          initialDist: Math.max(10, Math.hypot(pt.x - sel.x, pt.y - sel.y)),
          initialAngle: Math.atan2(pt.y - sel.y, pt.x - sel.x),
          hasMoved: false
        };
        return;
      }
    }

    // 上のレイヤーから順にヒット判定
    let hitItem = null;
    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      if (isPointInItem(pt.x, pt.y, it)) {
        hitItem = it;
        break;
      }
    }

    if (hitItem) {
      state.selectedId = hitItem.id;
      dragState = {
        mode: 'move',
        targetId: hitItem.id,
        startMouseX: pt.x,
        startMouseY: pt.y,
        initialX: hitItem.x,
        initialY: hitItem.y,
        hasMoved: false
      };
      syncUIFromState();
      renderCanvas();
    } else {
      state.selectedId = null;
      syncUIFromState();
      renderCanvas();
    }
  }

  function onCanvasMouseMove(evt) {
    const pt = getCanvasMouseCoords(evt);

    if (!dragState.mode) {
      // ホバーカーソル変更
      let cursor = 'default';
      for (let i = state.items.length - 1; i >= 0; i--) {
        const hit = isPointInItem(pt.x, pt.y, state.items[i]);
        if (hit === 'handle') {
          cursor = 'nwse-resize';
          break;
        } else if (hit === 'body') {
          cursor = 'move';
          break;
        }
      }
      canvas.style.cursor = cursor;
      return;
    }

    const item = state.items.find(it => it.id === dragState.targetId);
    if (!item) return;

    dragState.hasMoved = true;

    if (dragState.mode === 'move') {
      item.x = Math.round(dragState.initialX + (pt.x - dragState.startMouseX));
      item.y = Math.round(dragState.initialY + (pt.y - dragState.startMouseY));
      renderCanvas();
    } else if (dragState.mode === 'scale-rotate') {
      const curDist = Math.max(10, Math.hypot(pt.x - item.x, pt.y - item.y));
      const newScale = Math.min(400, Math.max(10, Math.round(dragState.initialScale * (curDist / dragState.initialDist))));
      item.scale = newScale;

      const curAngle = Math.atan2(pt.y - item.y, pt.x - item.x);
      let degDiff = ((curAngle - dragState.initialAngle) * 180) / Math.PI;
      let newRot = Math.round(dragState.initialRotation + degDiff);
      if (newRot > 180) newRot -= 360;
      if (newRot < -180) newRot += 360;
      item.rotation = newRot;

      syncInspectorValues(item);
      renderCanvas();
    }
  }

  function onCanvasMouseUp() {
    if (dragState.mode && dragState.hasMoved) {
      pushHistory();
    }
    dragState.mode = null;
  }

  // =========================================================================
  // 7. UIとStateの双方向同期（インスペクター・レイヤーパネル）
  // =========================================================================
  function setBgColor(hex, jpName) {
    state.bgColor = hex.toUpperCase();
    document.getElementById('bgColorInput').value = state.bgColor;
    document.getElementById('bgColorHex').value = state.bgColor;
    if (jpName) {
      document.getElementById('bgColorName').textContent = jpName;
    } else {
      const found = window.TenuguiData.traditionalColors.find(c => c.hex.toUpperCase() === state.bgColor);
      document.getElementById('bgColorName').textContent = found ? found.name : 'カスタム色';
    }
    renderCanvas();
  }

  function syncUIFromState() {
    // 向きボタン
    document.getElementById('orientHorizontalBtn').classList.toggle('active', state.orientation === 'horizontal');
    document.getElementById('orientVerticalBtn').classList.toggle('active', state.orientation === 'vertical');

    // 地色と和柄
    setBgColor(state.bgColor);
    document.querySelectorAll('.pattern-card').forEach(c => {
      c.classList.toggle('active', c.dataset.patId === state.patternId);
    });
    document.getElementById('patternColorInput').value = state.patternColor;
    document.getElementById('patternColorHex').value = state.patternColor;
    document.getElementById('patternScaleInput').value = state.patternScale;
    document.getElementById('patternScaleVal').textContent = `${state.patternScale}%`;
    document.getElementById('patternOpacityInput').value = state.patternOpacity;
    document.getElementById('patternOpacityVal').textContent = `${state.patternOpacity}%`;
    document.getElementById('patternAreaSelect').value = state.patternArea;

    // 選択アイテムインスペクター更新
    const sel = state.items.find(it => it.id === state.selectedId);
    const noSelMsg = document.getElementById('noSelectionMessage');
    const commonInsp = document.getElementById('commonInspector');
    const textGroup = document.getElementById('textInspectorGroup');
    const logoGroup = document.getElementById('logoInspectorGroup');
    const colorGroup = document.getElementById('colorInspectorGroup');

    if (!sel) {
      noSelMsg.classList.remove('hidden');
      commonInsp.classList.add('hidden');
    } else {
      noSelMsg.classList.add('hidden');
      commonInsp.classList.remove('hidden');

      textGroup.classList.toggle('hidden', sel.type !== 'text');
      logoGroup.classList.toggle('hidden', sel.type !== 'image');

      // フルカラー画像で単色化OFFのときだけカラーピッカーを隠す
      const showColor = !(sel.type === 'image' && !sel.monochrome);
      colorGroup.classList.toggle('hidden', !showColor);

      syncInspectorValues(sel);
    }

    renderLayerList();
  }

  function syncInspectorValues(sel) {
    if (!sel) return;
    if (sel.type === 'text') {
      document.getElementById('propTextContent').value = sel.text || '';
      document.getElementById('propFontFamily').value = sel.fontFamily;
      document.getElementById('propTextVertBtn').classList.toggle('active', !!sel.isVertical);
      document.getElementById('propTextHorizBtn').classList.toggle('active', !sel.isVertical);
      document.getElementById('propFontSize').value = sel.fontSize || 80;
      document.getElementById('propFontSizeVal').textContent = sel.fontSize || 80;
      document.getElementById('propLetterSpacing').value = sel.letterSpacing || 0;
      document.getElementById('propLetterSpacingVal').textContent = sel.letterSpacing || 0;
      document.getElementById('propTextOutlineToggle').checked = !!sel.outlineEnabled;
      document.getElementById('propTextOutlineColor').value = sel.outlineColor || '#ffffff';
      document.getElementById('propTextOutlineWidth').value = sel.outlineWidth || 8;
      document.getElementById('propTextBoxStyle').value = sel.boxStyle || 'none';
    }

    if (sel.type === 'image') {
      document.getElementById('propLogoRemoveBg').checked = !!sel.removeWhiteBg;
      document.getElementById('propLogoThresholdRow').classList.toggle('hidden', !sel.removeWhiteBg);
      document.getElementById('propLogoThreshold').value = sel.whiteThreshold ?? 235;
      document.getElementById('propLogoThresholdVal').textContent = sel.whiteThreshold ?? 235;
      document.getElementById('propLogoMonochrome').checked = !!sel.monochrome;
    }

    if (sel.color) {
      document.getElementById('propItemColor').value = sel.color;
      document.getElementById('propItemColorHex').value = sel.color.toUpperCase();
    }

    document.getElementById('propScale').value = sel.scale || 100;
    document.getElementById('propScaleVal').textContent = `${sel.scale || 100}%`;
    document.getElementById('propRotation').value = sel.rotation || 0;
    document.getElementById('propRotationVal').textContent = `${sel.rotation || 0}°`;
    document.getElementById('propOpacity').value = sel.opacity ?? 100;
    document.getElementById('propOpacityVal').textContent = `${sel.opacity ?? 100}%`;

    document.getElementById('propRepeatMode').value = sel.repeatMode || 'none';
    document.getElementById('propRepeatGapRow').classList.toggle('hidden', (sel.repeatMode || 'none') === 'none');
    document.getElementById('propRepeatGap').value = sel.repeatGap || 180;
    document.getElementById('propRepeatGapVal').textContent = `${sel.repeatGap || 180}px`;
  }

  function updateSelectedItemProp(prop, value, recordHistory = false) {
    const sel = state.items.find(it => it.id === state.selectedId);
    if (!sel) return;
    sel[prop] = value;
    syncUIFromState();
    renderCanvas();
    if (recordHistory) pushHistory();
  }

  function renderLayerList() {
    const list = document.getElementById('layerList');
    list.innerHTML = '';

    // 上にある要素（配列末尾）から順に表示
    [...state.items].reverse().forEach((item, revIdx) => {
      const actualIdx = state.items.length - 1 - revIdx;
      const li = document.createElement('li');
      li.className = 'layer-item' + (item.id === state.selectedId ? ' active' : '');

      let icon = '💮';
      let label = item.name || 'スタンプ';
      if (item.type === 'text') {
        icon = '🖌️';
        label = (item.text || '').replace(/\n/g, ' ').slice(0, 14);
      } else if (item.type === 'image') {
        icon = '🖼️';
        label = item.name || 'アップロード画像';
      } else if (item.type === 'rakkan') {
        icon = '🟥';
        label = `落款「${item.text}」`;
      }

      li.innerHTML = `
        <div class="layer-item-left">
          <span>${icon}</span>
          <span>${label}</span>
        </div>
        <div class="layer-item-controls">
          <button type="button" data-act="up" title="前面へ移動">▲</button>
          <button type="button" data-act="down" title="背面へ移動">▼</button>
        </div>
      `;

      li.addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') {
          const act = e.target.dataset.act;
          if (act === 'up' && actualIdx < state.items.length - 1) {
            const tmp = state.items[actualIdx];
            state.items[actualIdx] = state.items[actualIdx + 1];
            state.items[actualIdx + 1] = tmp;
            pushHistory();
          } else if (act === 'down' && actualIdx > 0) {
            const tmp = state.items[actualIdx];
            state.items[actualIdx] = state.items[actualIdx - 1];
            state.items[actualIdx - 1] = tmp;
            pushHistory();
          }
          syncUIFromState();
          renderCanvas();
          return;
        }
        state.selectedId = item.id;
        syncUIFromState();
        renderCanvas();
      });

      list.appendChild(li);
    });
  }

  // =========================================================================
  // 8. 畳み方・熨斗巻き・掛け軸シミュレーション描画
  // =========================================================================
  function openFoldSimulationModal() {
    document.getElementById('foldSimModal').classList.remove('hidden');

    // 現在の仕上がり部分（塗り足しカット後）をオフスクリーンに生成
    const dim = getDimensions();
    const flatCanvas = document.createElement('canvas');
    flatCanvas.width = dim.trimW_px;
    flatCanvas.height = dim.trimH_px;
    const fCtx = flatCanvas.getContext('2d');
    drawTenuguiScene(fCtx, {
      scaleFactor: 1.0,
      includeBleed: false,
      showGuides: false,
      showTexture: true,
      showSelection: false
    });

    // ① 四つ折り・八つ折り状態（手ぬぐいの右端1/4エリアが表面になるシミュレーション）
    const c1 = document.getElementById('simFoldedCanvas');
    const ctx1 = c1.getContext('2d');
    ctx1.clearRect(0, 0, c1.width, c1.height);
    ctx1.fillStyle = '#cbd5e1';
    ctx1.fillRect(0, 0, c1.width, c1.height);

    // 畳まれた布の厚み段差を描画
    ctx1.save();
    ctx1.shadowColor = 'rgba(0,0,0,0.28)';
    ctx1.shadowBlur = 16;
    ctx1.shadowOffsetY = 6;
    const foldW = 240;
    const foldH = 190;
    const fx = (c1.width - foldW) / 2;
    const fy = (c1.height - foldH) / 2;

    // 下層の折り返し布端
    ctx1.fillStyle = state.bgColor;
    ctx1.fillRect(fx + 6, fy + 6, foldW, foldH);
    ctx1.restore();

    // 表面（右端 30% × 全高）を切り出して描画
    const srcW = Math.round(flatCanvas.width * 0.30);
    const srcX = flatCanvas.width - srcW;
    ctx1.drawImage(flatCanvas, srcX, 0, srcW, flatCanvas.height, fx, fy, foldW, foldH);
    ctx1.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx1.strokeRect(fx, fy, foldW, foldH);

    // ② 熨斗（のし）帯巻きパッケージ状態
    const c2 = document.getElementById('simNoshiCanvas');
    const ctx2 = c2.getContext('2d');
    ctx2.clearRect(0, 0, c2.width, c2.height);
    ctx2.fillStyle = '#cbd5e1';
    ctx2.fillRect(0, 0, c2.width, c2.height);

    ctx2.save();
    ctx2.shadowColor = 'rgba(0,0,0,0.25)';
    ctx2.shadowBlur = 14;
    ctx2.shadowOffsetY = 5;
    ctx2.drawImage(flatCanvas, srcX, 0, srcW, flatCanvas.height, fx, fy, foldW, foldH);
    ctx2.restore();

    // 白い熨斗紙帯と水引
    const obiH = 68;
    const obiY = fy + (foldH - obiH) / 2;
    ctx2.fillStyle = '#ffffff';
    ctx2.fillRect(fx - 2, obiY, foldW + 4, obiH);
    ctx2.strokeStyle = '#cbd5e1';
    ctx2.strokeRect(fx - 2, obiY, foldW + 4, obiH);

    // 紅白水引ライン
    ctx2.strokeStyle = '#c93a40';
    ctx2.lineWidth = 3;
    ctx2.beginPath();
    ctx2.moveTo(fx - 2, obiY + obiH / 2 - 2);
    ctx2.lineTo(fx + foldW + 2, obiY + obiH / 2 - 2);
    ctx2.stroke();
    ctx2.strokeStyle = '#dc2626';
    ctx2.fillStyle = '#c93a40';
    ctx2.font = "700 16px 'Yuji Syuku', serif";
    ctx2.textAlign = 'center';
    ctx2.fillStyle = '#1f2937';
    ctx2.fillText('御 挨拶', c2.width / 2, obiY + 22);

    // ③ 掛け軸・タペストリー飾り状態
    const c3 = document.getElementById('simHangingCanvas');
    const ctx3 = c3.getContext('2d');
    ctx3.clearRect(0, 0, c3.width, c3.height);
    ctx3.fillStyle = '#d6d3cd';
    ctx3.fillRect(0, 0, c3.width, c3.height);

    const maxW = c3.width - 60;
    const maxH = c3.height - 60;
    const sc = Math.min(maxW / flatCanvas.width, maxH / flatCanvas.height);
    const dw = flatCanvas.width * sc;
    const dh = flatCanvas.height * sc;
    const dx = (c3.width - dw) / 2;
    const dy = (c3.height - dh) / 2 + 8;

    // 掛け紐と木製タペストリー棒
    ctx3.strokeStyle = '#475569';
    ctx3.lineWidth = 2;
    ctx3.beginPath();
    ctx3.moveTo(c3.width / 2, dy - 22);
    ctx3.lineTo(dx + dw * 0.2, dy);
    ctx3.moveTo(c3.width / 2, dy - 22);
    ctx3.lineTo(dx + dw * 0.8, dy);
    ctx3.stroke();

    ctx3.save();
    ctx3.shadowColor = 'rgba(0,0,0,0.3)';
    ctx3.shadowBlur = 12;
    ctx3.shadowOffsetY = 5;
    ctx3.drawImage(flatCanvas, dx, dy, dw, dh);
    ctx3.restore();

    ctx3.fillStyle = '#5c4033';
    ctx3.fillRect(dx - 8, dy - 6, dw + 16, 8);
    ctx3.fillRect(dx - 8, dy + dh - 2, dw + 16, 8);
  }

  // =========================================================================
  // 9. 入稿データ・高解像度PNG / SVG / 仕様書出力
  // =========================================================================
  function openExportModal() {
    document.getElementById('exportModal').classList.remove('hidden');
    runPreflightCheck();
  }

  function runPreflightCheck() {
    const list = document.getElementById('preflightList');
    list.innerHTML = '';
    const dim = getDimensions();
    const checks = [];

    checks.push({
      ok: true,
      msg: `仕上がり寸法: ${dim.trimW_mm} × ${dim.trimH_mm} mm / 入稿データ寸法(塗り足し各10mm込): ${dim.totalW_mm} × ${dim.totalH_mm} mm`
    });

    // 安全領域からはみ出している文字・ロゴがないかチェック
    let outOfSafeCount = 0;
    const minSafeX = dim.bleedPx + dim.safePx;
    const maxSafeX = dim.bleedPx + dim.trimW_px - dim.safePx;
    const minSafeY = dim.bleedPx + dim.safePx;
    const maxSafeY = dim.bleedPx + dim.trimH_px - dim.safePx;

    state.items.forEach(it => {
      if ((it.repeatMode || 'none') !== 'none') return; // 総柄リピートは端までOK
      const { w, h } = getItemBaseSize(it);
      const sc = (it.scale || 100) / 100;
      const hw = (w * sc) / 2;
      const hh = (h * sc) / 2;
      if (
        it.x - hw < minSafeX ||
        it.x + hw > maxSafeX ||
        it.y - hh < minSafeY ||
        it.y + hh > maxSafeY
      ) {
        outOfSafeCount++;
      }
    });

    if (outOfSafeCount === 0) {
      checks.push({
        ok: true,
        msg: 'すべての単体ロゴ・文字が内側安全領域（緑色の点線枠内）に収まっています。断裁切れの心配はありません。'
      });
    } else {
      checks.push({
        ok: false,
        msg: `注意: ${outOfSafeCount}個の要素が緑色の安全領域ラインの外に出ています（端まで intentionally 伸ばすデザインでない場合は内側へ移動してください）。`
      });
    }

    checks.forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `${c.ok ? '🟢' : '🟠'} ${c.msg}`;
      list.appendChild(li);
    });
  }

  function exportHighResPng(forPrintSubmission = true) {
    const dim = getDimensions();
    const dpi = parseInt(document.getElementById('exportDpiSelect').value, 10) || 200;
    const includeTrimMarks = document.getElementById('exportIncludeTrimMarks').checked;

    const outCanvas = document.createElement('canvas');
    if (forPrintSubmission) {
      // 実寸mm + 塗り足し20mm を指定DPIでピクセル換算 (1 inch = 25.4 mm)
      const targetW = Math.round((dim.totalW_mm / 25.4) * dpi);
      const targetH = Math.round((dim.totalH_mm / 25.4) * dpi);
      const scaleFactor = targetW / dim.totalW_px;
      outCanvas.width = targetW;
      outCanvas.height = targetH;
      const oCtx = outCanvas.getContext('2d');
      drawTenuguiScene(oCtx, {
        scaleFactor,
        includeBleed: true,
        showGuides: false,
        showTexture: false,
        showSelection: false,
        showTrimMarks: includeTrimMarks
      });
    } else {
      // 完成イメージ確認用（塗り足しカット、布地質感あり）
      outCanvas.width = dim.trimW_px;
      outCanvas.height = dim.trimH_px;
      const oCtx = outCanvas.getContext('2d');
      drawTenuguiScene(oCtx, {
        scaleFactor: 1.0,
        includeBleed: false,
        showGuides: false,
        showTexture: true,
        showSelection: false,
        showTrimMarks: false
      });
    }

    outCanvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const suffix = forPrintSubmission ? `入稿用_${dim.totalW_mm}x${dim.totalH_mm}mm_${dpi}dpi` : `完成イメージ_${dim.trimW_mm}x${dim.trimH_mm}mm`;
      a.href = url;
      a.download = `tenugui_${suffix}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    }, 'image/png');
  }

  function exportSvgFile() {
    const dim = getDimensions();
    // 高精細なベースレンダリング＋ベクターテキスト＆寸法枠を含むSVGを生成
    const flatCanvas = document.createElement('canvas');
    flatCanvas.width = dim.totalW_px;
    flatCanvas.height = dim.totalH_px;
    const fCtx = flatCanvas.getContext('2d');
    drawTenuguiScene(fCtx, {
      scaleFactor: 1.0,
      includeBleed: true,
      showGuides: false,
      showTexture: false,
      showSelection: false
    });
    const embeddedPng = flatCanvas.toDataURL('image/png');

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${dim.totalW_mm}mm" height="${dim.totalH_mm}mm"
     viewBox="0 0 ${dim.totalW_px} ${dim.totalH_px}">
  <title>オリジナル手ぬぐい入稿データ (${dim.trimW_mm}x${dim.trimH_mm}mm + 塗り足し10mm)</title>
  <!-- レンダリング済みデザインレイヤー -->
  <image href="${embeddedPng}" x="0" y="0" width="${dim.totalW_px}" height="${dim.totalH_px}" />
  <!-- 仕上がり断裁ガイド枠 (非表示レイヤーとして同梱) -->
  <g id="trim-guide" opacity="0.0">
    <rect x="${dim.bleedPx}" y="${dim.bleedPx}" width="${dim.trimW_px}" height="${dim.trimH_px}" fill="none" stroke="#0088ff" stroke-width="2" />
  </g>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenugui_${dim.trimW_mm}x${dim.trimH_mm}mm.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function openSpecSheetWindow() {
    const dim = getDimensions();
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = dim.trimW_px;
    previewCanvas.height = dim.trimH_px;
    drawTenuguiScene(previewCanvas.getContext('2d'), {
      scaleFactor: 1.0,
      includeBleed: false,
      showGuides: false,
      showTexture: true,
      showSelection: false
    });
    const imgUrl = previewCanvas.toDataURL('image/png');

    // 使用色リスト抽出
    const usedHexes = new Set([state.bgColor.toUpperCase()]);
    if (state.patternId !== 'none') usedHexes.add(state.patternColor.toUpperCase());
    state.items.forEach(it => {
      if (it.color) usedHexes.add(it.color.toUpperCase());
    });

    const colorRows = Array.from(usedHexes).map(hex => {
      const found = window.TenuguiData.traditionalColors.find(c => c.hex.toUpperCase() === hex);
      return `<div style="display:inline-flex;align-items:center;gap:8px;margin-right:16px;margin-bottom:8px;padding:6px 10px;border:1px solid #ccc;border-radius:6px;">
        <span style="width:24px;height:24px;background:${hex};border:1px solid #666;display:inline-block;border-radius:4px;"></span>
        <strong>${found ? found.name : '指定色'}</strong> <code>${hex}</code>
      </div>`;
    }).join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>手ぬぐい制作仕様書 - 手ぬぐい工房</title>
  <style>
    body { font-family: 'Noto Sans JP', sans-serif; padding: 30px; color: #1f2937; max-width: 960px; margin: 0 auto; }
    h1 { font-size: 22px; border-bottom: 2px solid #132c3e; padding-bottom: 8px; margin-bottom: 16px; }
    .preview-box { background: #f1f5f9; padding: 24px; text-align: center; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 20px; }
    .preview-box img { max-width: 100%; max-height: 420px; box-shadow: 0 4px 14px rgba(0,0,0,0.2); }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; font-size: 14px; }
    th { background: #f8fafc; width: 28%; }
    .print-btn { background: #c93a40; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; font-size: 15px; font-weight: bold; cursor: pointer; margin-bottom: 20px; }
    @media print { .print-btn { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">🖨️ この仕様書を印刷 / PDFとして保存</button>
  <h1>オリジナル手ぬぐい 制作仕様書・デザイン確認票</h1>
  <div class="preview-box">
    <img src="${imgUrl}" alt="手ぬぐい完成イメージ" />
  </div>
  <table>
    <tr><th>仕上がりサイズ</th><td>${dim.trimW_mm} × ${dim.trimH_mm} mm (${state.orientation === 'horizontal' ? '横使い' : '縦使い'})</td></tr>
    <tr><th>入稿データサイズ (塗り足し込)</th><td>${dim.totalW_mm} × ${dim.totalH_mm} mm (四方 +10mm 塗り足し付)</td></tr>
    <tr><th>想定生地タイプ</th><td>${state.fabricWeave === 'bun' ? '総理（文）生地 20番手' : '岡生地 30番手（細目）'}</td></tr>
    <tr><th>使用カラー（伝統色・HEX指定）</th><td>${colorRows}</td></tr>
    <tr><th>背景文様（和柄）</th><td>${state.patternId === 'none' ? '無地' : state.patternId} (配置: ${state.patternArea})</td></tr>
  </table>
</body>
</html>`);
    win.document.close();
  }

  // =========================================================================
  // 10. イベントバインディング
  // =========================================================================
  function bindEvents() {
    // 左サイドバータブ切替
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });

    // サイズ規格・カスタムサイズ
    const sizePresetSelect = document.getElementById('sizePresetSelect');
    const customSizeInputs = document.getElementById('customSizeInputs');
    sizePresetSelect.addEventListener('change', () => {
      const val = sizePresetSelect.value;
      if (val === 'custom') {
        customSizeInputs.classList.remove('hidden');
      } else {
        customSizeInputs.classList.add('hidden');
        const [l, s] = val.split('x').map(Number);
        state.longMm = l;
        state.shortMm = s;
        fitCanvasToViewport();
        pushHistory();
      }
    });

    ['customLongMm', 'customShortMm'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        state.longMm = Math.min(2000, Math.max(200, Number(document.getElementById('customLongMm').value) || 900));
        state.shortMm = Math.min(1000, Math.max(200, Number(document.getElementById('customShortMm').value) || 350));
        fitCanvasToViewport();
        pushHistory();
      });
    });

    // 横向き・縦向き切り替え（要素の相対位置も維持変換）
    const switchOrientation = newOrient => {
      if (state.orientation === newOrient) return;
      const oldDim = getDimensions();
      state.orientation = newOrient;
      const newDim = getDimensions();

      state.items.forEach(it => {
        const rx = it.x / oldDim.totalW_px;
        const ry = it.y / oldDim.totalH_px;
        it.x = Math.round(rx * newDim.totalW_px);
        it.y = Math.round(ry * newDim.totalH_px);
      });

      syncUIFromState();
      fitCanvasToViewport();
      pushHistory();
    };

    document.getElementById('orientHorizontalBtn').addEventListener('click', () => switchOrientation('horizontal'));
    document.getElementById('orientVerticalBtn').addEventListener('click', () => switchOrientation('vertical'));

    // 表示トグル
    document.getElementById('togglePrintGuides').addEventListener('change', e => {
      state.showGuides = e.target.checked;
      renderCanvas();
    });
    document.getElementById('toggleFabricTexture').addEventListener('change', e => {
      state.showTexture = e.target.checked;
      renderCanvas();
    });
    document.getElementById('toggleFoldLines').addEventListener('change', e => {
      state.showFoldLines = e.target.checked;
      renderCanvas();
    });

    // ズーム操作
    document.getElementById('zoomInBtn').addEventListener('click', () => {
      state.zoom = Math.min(2.5, Math.round((state.zoom + 0.15) * 100) / 100);
      document.getElementById('zoomLevelText').textContent = `${Math.round(state.zoom * 100)}%`;
      updateCanvasSize();
      renderCanvas();
    });
    document.getElementById('zoomOutBtn').addEventListener('click', () => {
      state.zoom = Math.max(0.3, Math.round((state.zoom - 0.15) * 100) / 100);
      document.getElementById('zoomLevelText').textContent = `${Math.round(state.zoom * 100)}%`;
      updateCanvasSize();
      renderCanvas();
    });
    document.getElementById('zoomFitBtn').addEventListener('click', fitCanvasToViewport);

    // Undo / Redo
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);

    // 地色・伝統色フィルター
    document.querySelectorAll('.color-category-filter .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.color-category-filter .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        renderColorSwatches(chip.dataset.cat);
      });
    });

    document.getElementById('bgColorInput').addEventListener('input', e => setBgColor(e.target.value));
    document.getElementById('bgColorInput').addEventListener('change', () => pushHistory());
    document.getElementById('bgColorHex').addEventListener('change', e => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value.trim())) {
        setBgColor(e.target.value.trim());
        pushHistory();
      }
    });

    // 和柄オプション
    document.getElementById('patternColorInput').addEventListener('input', e => {
      state.patternColor = e.target.value.toUpperCase();
      document.getElementById('patternColorHex').value = state.patternColor;
      renderCanvas();
    });
    document.getElementById('patternColorInput').addEventListener('change', () => pushHistory());
    document.getElementById('patternColorHex').addEventListener('change', e => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value.trim())) {
        state.patternColor = e.target.value.trim().toUpperCase();
        document.getElementById('patternColorInput').value = state.patternColor;
        renderCanvas();
        pushHistory();
      }
    });

    document.getElementById('patternScaleInput').addEventListener('input', e => {
      state.patternScale = Number(e.target.value);
      document.getElementById('patternScaleVal').textContent = `${state.patternScale}%`;
      renderCanvas();
    });
    document.getElementById('patternScaleInput').addEventListener('change', () => pushHistory());

    document.getElementById('patternOpacityInput').addEventListener('input', e => {
      state.patternOpacity = Number(e.target.value);
      document.getElementById('patternOpacityVal').textContent = `${state.patternOpacity}%`;
      renderCanvas();
    });
    document.getElementById('patternOpacityInput').addEventListener('change', () => pushHistory());

    document.getElementById('patternAreaSelect').addEventListener('change', e => {
      state.patternArea = e.target.value;
      renderCanvas();
      pushHistory();
    });

    document.getElementById('fabricWeaveSelect').addEventListener('change', e => {
      state.fabricWeave = e.target.value;
      renderCanvas();
    });

    // ロゴ画像のドラッグ＆ドロップ・ファイル選択
    const dropzone = document.getElementById('logoDropzone');
    const fileInput = document.getElementById('logoFileInput');
    document.getElementById('logoSelectBtn').addEventListener('click', e => {
      e.stopPropagation();
      fileInput.click();
    });
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', e => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleLogoFileUpload(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) {
        handleLogoFileUpload(e.target.files[0]);
        fileInput.value = '';
      }
    });

    // 文字追加・定型フレーズ
    document.getElementById('addVerticalTextBtn').addEventListener('click', () => addTextItem('手ぬぐい工房', true, 110));
    document.getElementById('addHorizontalTextBtn').addEventListener('click', () => addTextItem('TENUGUI STUDIO', false, 72));
    document.querySelectorAll('.phrase-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        addTextItem(btn.dataset.text, btn.dataset.vert === 'true', Number(btn.dataset.size) || 110);
      });
    });

    // 落款スタンプ追加
    document.getElementById('addRakkanBtn').addEventListener('click', addRakkanItem);

    // キャンバス上のマウス操作
    canvas.addEventListener('mousedown', onCanvasMouseDown);
    window.addEventListener('mousemove', onCanvasMouseMove);
    window.addEventListener('mouseup', onCanvasMouseUp);

    // 右パネル：位置揃えボタン
    document.querySelectorAll('.align-btn-grid button').forEach(btn => {
      btn.addEventListener('click', () => {
        const sel = state.items.find(it => it.id === state.selectedId);
        if (!sel) return;
        const dim = getDimensions();
        const { w, h } = getItemBaseSize(sel);
        const sc = (sel.scale || 100) / 100;
        const hw = (w * sc) / 2;
        const hh = (h * sc) / 2;
        const margin = dim.bleedPx + dim.safePx + 12;

        switch (btn.dataset.align) {
          case 'left': sel.x = Math.round(margin + hw); break;
          case 'center-h': sel.x = Math.round(dim.totalW_px / 2); break;
          case 'right': sel.x = Math.round(dim.totalW_px - margin - hw); break;
          case 'top': sel.y = Math.round(margin + hh); break;
          case 'center-v': sel.y = Math.round(dim.totalH_px / 2); break;
          case 'bottom': sel.y = Math.round(dim.totalH_px - margin - hh); break;
        }
        renderCanvas();
        pushHistory();
      });
    });

    // 右パネル：テキスト属性
    document.getElementById('propTextContent').addEventListener('input', e => updateSelectedItemProp('text', e.target.value));
    document.getElementById('propTextContent').addEventListener('change', () => pushHistory());
    document.getElementById('propFontFamily').addEventListener('change', e => updateSelectedItemProp('fontFamily', e.target.value, true));
    document.getElementById('propTextVertBtn').addEventListener('click', () => updateSelectedItemProp('isVertical', true, true));
    document.getElementById('propTextHorizBtn').addEventListener('click', () => updateSelectedItemProp('isVertical', false, true));
    document.getElementById('propFontSize').addEventListener('input', e => updateSelectedItemProp('fontSize', Number(e.target.value)));
    document.getElementById('propFontSize').addEventListener('change', () => pushHistory());
    document.getElementById('propLetterSpacing').addEventListener('input', e => updateSelectedItemProp('letterSpacing', Number(e.target.value)));
    document.getElementById('propLetterSpacing').addEventListener('change', () => pushHistory());
    document.getElementById('propTextOutlineToggle').addEventListener('change', e => updateSelectedItemProp('outlineEnabled', e.target.checked, true));
    document.getElementById('propTextOutlineColor').addEventListener('input', e => updateSelectedItemProp('outlineColor', e.target.value));
    document.getElementById('propTextOutlineWidth').addEventListener('input', e => updateSelectedItemProp('outlineWidth', Number(e.target.value)));
    document.getElementById('propTextBoxStyle').addEventListener('change', e => updateSelectedItemProp('boxStyle', e.target.value, true));

    // 右パネル：ロゴ透過・単色化
    document.getElementById('propLogoRemoveBg').addEventListener('change', e => updateSelectedItemProp('removeWhiteBg', e.target.checked, true));
    document.getElementById('propLogoThreshold').addEventListener('input', e => updateSelectedItemProp('whiteThreshold', Number(e.target.value)));
    document.getElementById('propLogoThreshold').addEventListener('change', () => pushHistory());
    document.getElementById('propLogoMonochrome').addEventListener('change', e => updateSelectedItemProp('monochrome', e.target.checked, true));

    // 右パネル：色・白抜きボタン
    document.getElementById('propItemColor').addEventListener('input', e => updateSelectedItemProp('color', e.target.value.toUpperCase()));
    document.getElementById('propItemColor').addEventListener('change', () => pushHistory());
    document.getElementById('propItemColorHex').addEventListener('change', e => {
      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value.trim())) {
        updateSelectedItemProp('color', e.target.value.trim().toUpperCase(), true);
      }
    });
    document.getElementById('propSetShironukiBtn').addEventListener('click', () => {
      updateSelectedItemProp('color', state.bgColor, true);
    });

    // 右パネル：スケール・回転・不透明度・リピート
    document.getElementById('propScale').addEventListener('input', e => updateSelectedItemProp('scale', Number(e.target.value)));
    document.getElementById('propScale').addEventListener('change', () => pushHistory());
    document.getElementById('propRotation').addEventListener('input', e => updateSelectedItemProp('rotation', Number(e.target.value)));
    document.getElementById('propRotation').addEventListener('change', () => pushHistory());
    document.getElementById('propRotResetBtn').addEventListener('click', () => updateSelectedItemProp('rotation', 0, true));
    document.getElementById('propRot90Btn').addEventListener('click', () => {
      const sel = state.items.find(it => it.id === state.selectedId);
      if (!sel) return;
      let next = ((sel.rotation || 0) + 90);
      if (next > 180) next -= 360;
      updateSelectedItemProp('rotation', next, true);
    });
    document.getElementById('propOpacity').addEventListener('input', e => updateSelectedItemProp('opacity', Number(e.target.value)));
    document.getElementById('propOpacity').addEventListener('change', () => pushHistory());
    document.getElementById('propRepeatMode').addEventListener('change', e => updateSelectedItemProp('repeatMode', e.target.value, true));
    document.getElementById('propRepeatGap').addEventListener('input', e => updateSelectedItemProp('repeatGap', Number(e.target.value)));
    document.getElementById('propRepeatGap').addEventListener('change', () => pushHistory());

    // 複製・削除
    document.getElementById('propDuplicateBtn').addEventListener('click', duplicateSelectedItem);
    document.getElementById('propDeleteBtn').addEventListener('click', deleteSelectedItem);

    // キーボードショートカット
    window.addEventListener('keydown', e => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelectedItem();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedItem();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && state.selectedId) {
        e.preventDefault();
        const sel = state.items.find(it => it.id === state.selectedId);
        if (!sel) return;
        const step = e.shiftKey ? 10 : 2;
        if (e.key === 'ArrowLeft') sel.x -= step;
        if (e.key === 'ArrowRight') sel.x += step;
        if (e.key === 'ArrowUp') sel.y -= step;
        if (e.key === 'ArrowDown') sel.y += step;
        renderCanvas();
      }
    });

    // モーダル開閉
    document.getElementById('foldSimBtn').addEventListener('click', openFoldSimulationModal);
    document.getElementById('projectSaveBtn').addEventListener('click', () => {
      document.getElementById('projectModal').classList.remove('hidden');
    });
    document.getElementById('exportModalBtn').addEventListener('click', openExportModal);

    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById(btn.dataset.close).classList.add('hidden');
      });
    });
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', e => {
        if (e.target === backdrop) backdrop.classList.add('hidden');
      });
    });

    // プロジェクトJSON保存・読込
    document.getElementById('downloadProjectJsonBtn').addEventListener('click', () => {
      const jsonStr = serializeState();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my_tenugui_${new Date().toISOString().slice(0, 10)}.tenugui.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    });

    const jsonInput = document.getElementById('uploadProjectJsonInput');
    document.getElementById('triggerLoadJsonBtn').addEventListener('click', () => jsonInput.click());
    jsonInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          restoreSerializedState(ev.target.result);
          pushHistory();
          document.getElementById('projectModal').classList.add('hidden');
        } catch (err) {
          alert('プロジェクトファイルの形式が正しくありません。');
        }
      };
      reader.readAsText(file);
    });

    // 入稿・画像エクスポート実行ボタン
    document.getElementById('exportPrintPngBtn').addEventListener('click', () => exportHighResPng(true));
    document.getElementById('exportPreviewPngBtn').addEventListener('click', () => exportHighResPng(false));
    document.getElementById('exportSvgBtn').addEventListener('click', exportSvgFile);
    document.getElementById('exportSpecSheetBtn').addEventListener('click', openSpecSheetWindow);

    window.addEventListener('resize', () => {
      fitCanvasToViewport();
    });
  }

  function duplicateSelectedItem() {
    const sel = state.items.find(it => it.id === state.selectedId);
    if (!sel) return;
    const copy = JSON.parse(JSON.stringify(sel));
    copy.id = generateId();
    copy.x += 30;
    copy.y += 30;
    if (copy.type === 'image') {
      loadImageToCache(copy);
    }
    state.items.push(copy);
    state.selectedId = copy.id;
    pushHistory();
    syncUIFromState();
    renderCanvas();
  }

  function deleteSelectedItem() {
    if (!state.selectedId) return;
    state.items = state.items.filter(it => it.id !== state.selectedId);
    state.selectedId = null;
    pushHistory();
    syncUIFromState();
    renderCanvas();
  }

  // 起動
  window.addEventListener('DOMContentLoaded', init);
})();
