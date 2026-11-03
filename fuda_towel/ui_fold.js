/* 設定の各項目（枠）を見出しで折りたためるようにする。開閉の状態はこのブラウザに覚えておく */
(function () {
  'use strict';
  var KEY = 'fold_state_v1', saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  function store() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }
  // 最初から閉じておく項目（札の調整）
  var CLOSED = { 'fpanel:光': 1, 'fpanel:札の位置・大きさ': 1, 'fpanel:色・背景': 1, 'fpanel:ペン・消しゴム・なめらかの記録': 1 };
  function setup(panelId) {
    var panel = document.getElementById(panelId); if (!panel) return;
    var sets = Array.prototype.slice.call(panel.querySelectorAll(':scope > fieldset'));
    sets.forEach(function (fs) {
      var lg = fs.querySelector(':scope > legend'); if (!lg) return;
      var key = panelId + ':' + lg.textContent.trim();
      fs.classList.add('fold');
      lg.setAttribute('role', 'button'); lg.setAttribute('tabindex', '0');
      function apply(closed) { fs.classList.toggle('closed', closed); lg.setAttribute('aria-expanded', String(!closed)); }
      apply(key in saved ? saved[key] : !!CLOSED[key]);
      function toggle() { var c = !fs.classList.contains('closed'); apply(c); saved[key] = c; store(); }
      lg.addEventListener('click', toggle);
      lg.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      fs._fold = function (c) { apply(c); saved[key] = c; };
    });
    var bar = document.createElement('div'); bar.className = 'foldbar';
    [['すべて開く', false], ['すべて閉じる', true]].forEach(function (b) {
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn'; btn.textContent = b[0];
      btn.addEventListener('click', function () { sets.forEach(function (fs) { if (fs._fold) fs._fold(b[1]); }); store(); });
      bar.appendChild(btn);
    });
    panel.insertBefore(bar, panel.firstChild);
  }
  setup('panel'); setup('fpanel');
})();
