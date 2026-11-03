/* かんたん／詳細の切り替え。かんたんでは、よく使う項目だけを出し、図案は写真で選べるようにする。
   設定（cfg）は詳細モードと共通なので、切り替えても作りかけの図案はそのまま。 */
(function () {
  'use strict';
  var KEY = 'towel_ui';
  var root = document.documentElement;
  var T = window.__towelEasy;
  var QS = new URLSearchParams(location.search);
  var V = (function () { var s = document.querySelector('script[src*="ui_easy.js"]'); var m = s && /\?v=[^"']+/.exec(s.getAttribute('src')); return m ? m[0] : ''; })();

  function $(q) { return document.querySelector(q); }
  function $$(q) { return Array.prototype.slice.call(document.querySelectorAll(q)); }

  var mode = 'easy';
  try { var sv = localStorage.getItem(KEY); if (sv === 'full' || sv === 'easy') mode = sv; } catch (e) {}
  if (QS.get('ui') === 'full' || QS.get('ui') === 'easy') mode = QS.get('ui');

  // かんたんでは折りたたみを全部開く（詳細に戻すと元の開閉に戻す）
  var foldMemo = null;
  function openFolds(on) {
    var sets = $$('#panel > fieldset.fold, #fpanel > fieldset.fold');
    if (on) {
      if (!foldMemo) foldMemo = sets.map(function (fs) { return fs.classList.contains('closed'); });
      sets.forEach(function (fs) { fs.classList.remove('closed'); });
    } else if (foldMemo) {
      sets.forEach(function (fs, i) { fs.classList.toggle('closed', !!foldMemo[i]); });
      foldMemo = null;
    }
  }
  // かんたんでは見出しを押しても閉じない
  $$('#panel > fieldset, #fpanel > fieldset').forEach(function (fs) {
    fs.addEventListener('click', function (e) {
      if (mode === 'easy' && e.target.closest && e.target.closest('legend') && e.target.closest('legend').parentNode === fs) e.stopPropagation();
    }, true);
  });

  function setMode(m, store) {
    mode = m === 'full' ? 'full' : 'easy';
    root.classList.toggle('easy', mode === 'easy');
    $$('.uimode button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.ui === mode)); });
    openFolds(mode === 'easy');
    if (mode === 'easy') {
      // 札の調整でペンなどを選んだままだと、かんたんでは戻せないので「選ぶ・動かす」に戻す
      var none = $('#ftool button[data-t="none"]');
      if (none && none.getAttribute('aria-pressed') !== 'true') none.click();
    }
    if (store) { try { localStorage.setItem(KEY, mode); } catch (e) {} }
    render();
  }
  $$('.uimode button').forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.ui, true); }); });

  /* ---- 図案を写真で選ぶ ---- */
  var pick = $('#easyPick');
  var shown = '';
  function groupOf(p) { var c = p.cfg; return c.H === 840 ? 'tenugui' : (c.W > c.H ? 'yoko' : 'tate'); }
  // 手ぬぐいの大きさを選んでいるときは、同じ向きのタオル図案を出し、選んだら手ぬぐいの大きさに移す
  var TN = { tnv: 'tate', tnh: 'yoko' };
  function render() {
    if (!pick || !T) return;
    var ck = T.canvas(), cur = T.cur();
    if (shown !== ck) {
      shown = ck;
      pick.textContent = '';
      pick.className = 'pick easy-only' + (ck === 'yoko' || ck === 'tnh' ? '' : ' tate');
      var g = TN[ck] || ck;
      T.presets.filter(function (p) { return groupOf(p) === g; }).forEach(function (p) {
        var b = document.createElement('button'); b.type = 'button'; b.dataset.id = p.id;
        var im = document.createElement('img'); im.loading = 'lazy'; im.alt = ''; im.src = 'thumb/' + p.id + '.webp' + V;
        var t = document.createElement('span'); t.textContent = p.label.replace(/^(Y\d|[A-E]) /, '');
        var w = document.createElement('span'); w.className = 'ng';
        b.appendChild(im); b.appendChild(t); b.appendChild(w);
        b.addEventListener('click', function () {
          var want = T.canvas();
          T.load(p.id);
          if (TN[want]) { var cb = $('#canvasSeg button[data-c="' + want + '"]'); if (cb) cb.click(); }
        });
        pick.appendChild(b);
      });
    }
    $$('#easyPick button').forEach(function (b) {
      var p = T.presets.filter(function (x) { return x.id === b.dataset.id; })[0];
      b.setAttribute('aria-pressed', String(!!cur && cur.id === b.dataset.id));
      var ng = p ? T.problems(p.cfg) : [];
      b.lastChild.textContent = ng.length ? '※自動で太くします' : '';
      b.title = p.label + (ng.length ? '（いまのプリント方法では ' + ng.join('・') + ' を太らせます）' : '');
    });
  }
  window.__easySync = render;

  setMode(mode, false);
})();
