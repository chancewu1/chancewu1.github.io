/* ============================================================
   i18n — Google Translate Element (free, no API key, unlimited)
   Injects Google's translate widget invisibly and maps our
   custom language buttons to it.
   ============================================================ */
(function () {

  var LANGS = {
    zh: { name: '中', code: 'zh-CN', label: '中文' },
    en: { name: 'EN', code: 'en',    label: 'English' },
    ja: { name: '日', code: 'ja',    label: '日本語' },
    ko: { name: '한', code: 'ko',    label: '한국어' }
  };

  // UI strings for sidebar chrome — switched instantly without Google
  var UI = {
    zh: { search: '搜索文章…', recent: '最新文章', about: '关于本站', back: '← 返回首页',
          cats: { 'deep-learning':'深度学习','machine-learning':'机器学习','life':'生活',
                  'leetcode':'Leetcode','language':'语言学习','interview':'面试记录',
                  'resources':'资源','business':'商业分析','statistics':'数理统计','notes':'转码笔记' } },
    en: { search: 'Search posts…', recent: 'Recent', about: 'About this blog', back: '← Back to Home',
          cats: { 'deep-learning':'Deep Learning','machine-learning':'Machine Learning','life':'Life',
                  'leetcode':'Leetcode','language':'Languages','interview':'Interviews',
                  'resources':'Resources','business':'Business','statistics':'Statistics','notes':'Notes' } },
    ja: { search: '記事を検索…', recent: '最新記事', about: 'このブログについて', back: '← ホームへ戻る',
          cats: { 'deep-learning':'深層学習','machine-learning':'機械学習','life':'ライフ',
                  'leetcode':'Leetcode','language':'言語学習','interview':'面接記録',
                  'resources':'リソース','business':'ビジネス','statistics':'統計','notes':'ノート' } },
    ko: { search: '게시물 검색…', recent: '최근 게시물', about: '이 블로그에 대해', back: '← 홈으로 돌아가기',
          cats: { 'deep-learning':'딥러닝','machine-learning':'머신러닝','life':'라이프',
                  'leetcode':'Leetcode','language':'언어 학습','interview':'면접 기록',
                  'resources':'리소스','business':'비즈니스','statistics':'통계','notes':'노트' } }
  };

  var current = localStorage.getItem('lang') || 'zh';

  // ── Apply sidebar UI strings instantly ───────────────────────
  function applyUI(code) {
    var t = UI[code];
    if (!t) return;
    var s = document.getElementById('search-input');
    if (s) s.placeholder = t.search;
    document.querySelectorAll('.sidebar-tag').forEach(function (el) {
      var f = el.dataset.filter;
      el.textContent = f === 'recent' ? t.recent : (t.cats[f] || el.textContent);
    });
    var pl = document.querySelector('.page-label');
    if (pl) pl.textContent = t.about;
    document.querySelectorAll('.back-link').forEach(function (el) {
      el.textContent = t.back;
    });
  }

  // ── Trigger Google Translate to switch language ──────────────
  function googleTranslateTo(langCode) {
    // Google Translate sets a cookie and uses a hidden select element
    var select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = langCode;
      select.dispatchEvent(new Event('change'));
      return;
    }
    // Fallback: use the translate.google.com URL approach via iframe trick
    var frame = document.getElementById(':1.container');
    if (frame) {
      var inner = frame.contentDocument || frame.contentWindow.document;
      var sel = inner && inner.querySelector('.goog-te-combo');
      if (sel) {
        sel.value = langCode;
        sel.dispatchEvent(new Event('change'));
      }
    }
  }

  // Restore to original (Google Translate "Show original" equivalent)
  function restoreOriginal() {
    // Click the "Show original" link if present
    var restore = document.querySelector('.goog-te-banner-frame');
    if (restore) {
      var inner = restore.contentDocument || restore.contentWindow.document;
      var btn = inner && inner.querySelector('.goog-te-banner button:last-child');
      if (btn) { btn.click(); return; }
    }
    // Alternative: reload without hash
    var cookie = document.cookie.match(/googtrans=([^;]+)/);
    if (cookie) {
      document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'googtrans=; path=/; domain=' + location.hostname + '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      location.reload();
    }
  }

  // ── Main switch ──────────────────────────────────────────────
  function switchLang(code) {
    current = code;
    localStorage.setItem('lang', code);

    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.lang === code);
    });

    applyUI(code);

    if (code === 'zh') {
      // zh-CN is the original — restore
      restoreOriginal();
    } else {
      googleTranslateTo(LANGS[code].code);
    }
  }

  // ── Inject Google Translate script (hidden widget) ───────────
  function loadGoogleTranslate() {
    // Hidden container for Google widget
    var div = document.createElement('div');
    div.id = 'google_translate_element';
    div.style.display = 'none';
    document.body.appendChild(div);

    // Callback Google calls when ready
    window.googleTranslateElementInit = function () {
      new window.google.translate.TranslateElement({
        pageLanguage: 'zh-CN',
        includedLanguages: 'en,ja,ko,zh-CN',
        autoDisplay: false
      }, 'google_translate_element');

      // Once loaded, apply saved language
      setTimeout(function () {
        if (current !== 'zh') {
          googleTranslateTo(LANGS[current].code);
        }
      }, 800);
    };

    var script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.head.appendChild(script);

    // Hide Google's ugly top banner
    var style = document.createElement('style');
    style.textContent = [
      '.goog-te-banner-frame { display: none !important; }',
      '.goog-te-menu-value:hover { text-decoration: none !important; }',
      'body { top: 0 !important; }',
      '#goog-gt-tt, .goog-te-balloon-frame { display: none !important; }',
      '.goog-text-highlight { background: none !important; box-shadow: none !important; }',
      '#lang-switcher .lang-btn.active { color:#fff!important; border-color:var(--accent,#0071e3)!important; background:rgba(0,113,227,0.18)!important; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── Inject our custom switcher buttons ───────────────────────
  function injectSwitcher() {
    if (document.getElementById('lang-switcher')) return;

    var wrap = document.createElement('div');
    wrap.id = 'lang-switcher';
    wrap.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:3px;padding:10px 8px 6px;border-top:1px solid rgba(255,255,255,0.06);flex-shrink:0;';

    Object.keys(LANGS).forEach(function (code) {
      var btn = document.createElement('button');
      btn.className = 'lang-btn';
      btn.dataset.lang = code;
      btn.textContent = LANGS[code].name;
      btn.title = LANGS[code].label;
      btn.style.cssText = 'background:none;border:1px solid #3a3a3c;color:#636366;border-radius:7px;width:30px;height:28px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:color 0.15s,border-color 0.15s,background 0.15s;';
      btn.addEventListener('click', function () { switchLang(code); });
      wrap.appendChild(btn);
    });

    var fsControl = document.querySelector('.fs-control');
    if (fsControl) fsControl.parentNode.insertBefore(wrap, fsControl);

    // Set initial active state
    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.lang === current);
    });
    applyUI(current);

    loadGoogleTranslate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSwitcher);
  } else {
    injectSwitcher();
  }

})();
