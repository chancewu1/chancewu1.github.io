/* ============================================================
   Blog Editor
   - Password-gated (never visible to public)
   - Rich text editing (no Markdown needed)
   - Publishes directly to GitHub Pages via API
   ============================================================ */
(function () {

  var REPO      = 'chancewu1/chancewu1.github.io';
  var BRANCH    = 'main';

  // CATEGORIES is always built dynamically from the live DOM sidebar-tags
  // so it always reflects exactly what is on the website — no hardcoded list.
  function getCategories() {
    var cats = {};
    document.querySelectorAll('#sidebar-tags .sidebar-tag').forEach(function (el) {
      var key = el.dataset.filter;
      if (key && key !== 'recent') cats[key] = el.textContent.trim();
    });
    return cats;
  }
  // Keep a live reference — always call getCategories() where needed
  var CATEGORIES = {};

  var ghToken     = localStorage.getItem('gh_token') || '';
  var adminUnlocked = !!sessionStorage.getItem('admin_unlocked');
  var editing     = null;
  var currentPath = window.location.pathname;
  var isPost      = currentPath.includes('/posts/') || currentPath.includes('\\posts\\');
  var currentFile = (currentPath.includes('/posts/') || currentPath.includes('\\posts\\'))
    ? currentPath.split(/[\/\\]/).pop() : null;

  // ── Never inject anything until unlocked ────────────────────
  if (!adminUnlocked) {
    // Desktop: type W → C → H within 1.5s
    var _seq = [], _seqTimer;
    document.addEventListener('keydown', function (e) {
      _seq.push(e.key.toLowerCase());
      clearTimeout(_seqTimer);
      _seqTimer = setTimeout(function () { _seq = []; }, 1500);
      if (_seq.slice(-3).join('') === 'wch') {
        _seq = [];
        showLoginModal();
      }
    });

    // Inject a small lock button right below the CW avatar — always visible
    function attachAdminBtn() {
      var avatarWrap = document.getElementById('sidebar-avatar');
      if (!avatarWrap || document.getElementById('ed-admin-btn')) return;
      var btn = document.createElement('button');
      btn.id = 'ed-admin-btn';
      btn.title = 'Admin login';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
      btn.style.cssText = [
        'display:block', 'margin:6px auto 0',
        'background:none', 'border:none',
        'cursor:pointer', 'color:rgba(255,255,255,0.2)',
        'padding:4px', 'line-height:1',
        'transition:color 0.2s'
      ].join(';');
      btn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); showLoginModal(); });
      avatarWrap.parentNode.insertBefore(btn, avatarWrap.nextSibling);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachAdminBtn);
    } else {
      attachAdminBtn();
    }

    return; // stop here — no toolbar, no editor injected for public
  }

  // ── Admin is unlocked — inject everything ───────────────────
  injectStyles();
  function initAdmin() {
    injectHTML();
    var path2 = window.location.href;
    isPost = path2.includes('/posts/') || path2.includes('\\posts\\') || path2.includes('%2Fposts%2F');
    currentFile = isPost ? decodeURIComponent(path2).split(/[\/\\]/).pop().split('?')[0] : null;
    CATEGORIES = getCategories();
    setTimeout(function() {
      var eb = document.getElementById('ed-edit-btn');
      var db = document.getElementById('ed-del-btn');
      if (eb) eb.disabled = !isPost;
      if (db) db.disabled = !isPost;
    }, 50);
    // Auto-open blog folder for local file sync (best-effort, silently ignored if declined)
    if ('showDirectoryPicker' in window && !window._blogRootDir) {
      window.showDirectoryPicker({ mode: 'readwrite' })
        .then(function(root) { window._blogRootDir = root; })
        .catch(function() {}); // user declined — that's fine
    }
  }
  window.addEventListener('DOMContentLoaded', initAdmin);
  if (document.readyState !== 'loading') initAdmin();

  function showLoginModal() {
    var bg = document.createElement('div');
    bg.id = 'ed-login-bg';
    bg.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;';
    bg.innerHTML = `
      <div style="background:#1c1c1e;border:1px solid rgba(255,255,255,0.12);border-radius:18px;padding:36px;width:380px;box-shadow:0 24px 60px rgba(0,0,0,0.5);">
        <h3 style="color:#fff;font-size:17px;font-weight:700;margin-bottom:20px;">Password</h3>
        <input id="ed-pwd-inp" type="password" placeholder="Enter password"
          style="width:100%;padding:10px 14px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:10px;color:#ebebf5;font-size:14px;font-family:inherit;outline:none;margin-bottom:12px;" />
        <p id="ed-pwd-err" style="color:#ff453a;font-size:12px;margin-bottom:12px;display:none;">Incorrect password.</p>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button onclick="document.getElementById('ed-login-bg').remove()"
            style="padding:8px 18px;border-radius:50px;border:none;background:rgba(255,255,255,0.1);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Cancel</button>
          <button id="ed-pwd-btn"
            style="padding:8px 18px;border-radius:50px;border:none;background:#0071e3;color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">Unlock</button>
        </div>
      </div>`;
    document.body.appendChild(bg);
    var inp = document.getElementById('ed-pwd-inp');
    inp.focus();
    async function tryLogin() {
      var token = inp.value.trim();
      if (!token) return;
      document.getElementById('ed-pwd-btn').textContent = 'Verifying…';
      try {
        // Verify token by hitting GitHub API — only works if token is valid
        var res = await fetch('https://api.github.com/repos/chancewu1/chancewu1.github.io', {
          headers: { 'Authorization': 'token ' + token }
        });
        if (res.ok) {
          localStorage.setItem('gh_token', token);
          sessionStorage.setItem('admin_unlocked','1');
          bg.remove();
          location.reload();
        } else {
          document.getElementById('ed-pwd-err').style.display = 'block';
          document.getElementById('ed-pwd-btn').textContent = 'Unlock';
          inp.value = ''; inp.focus();
        }
      } catch(e) {
        document.getElementById('ed-pwd-err').textContent = 'Network error. Check your connection.';
        document.getElementById('ed-pwd-err').style.display = 'block';
        document.getElementById('ed-pwd-btn').textContent = 'Unlock';
      }
    }
    document.getElementById('ed-pwd-btn').onclick = tryLogin;
    inp.addEventListener('keydown', function(e){ if(e.key==='Enter') tryLogin(); });
  }

  // ── Inject styles ────────────────────────────────────────────
  function injectStyles() {
    var s = document.createElement('style');
    s.textContent = `
      /* Floating admin bar */
      #ed-bar {
        position:fixed;bottom:0;left:0;right:0;
        transform:none;
        z-index:9000;display:flex;align-items:center;gap:6px;
        flex-wrap:wrap;justify-content:center;
        background:rgba(20,20,22,0.97);
        backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
        border-top:1px solid rgba(255,255,255,0.1);border-radius:0;
        padding:10px 12px;box-shadow:0 -4px 24px rgba(0,0,0,0.35);
        font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      }
      @media (min-width:700px) {
        #ed-bar {
          bottom:28px;left:50%;right:auto;
          transform:translateX(-50%);
          width:auto;border-radius:50px;border:1px solid rgba(255,255,255,0.1);
          border-top:1px solid rgba(255,255,255,0.1);
          flex-wrap:nowrap;
        }
      }
      .ed-div{width:1px;height:20px;background:rgba(255,255,255,0.1);margin:0 2px;}
      @media (max-width:699px){ .ed-div{ display:none; } .ed-btn-label{ display:none; } }
      .ed-pill{
        display:inline-flex;align-items:center;gap:5px;
        padding:7px 12px;border-radius:50px;border:none;
        font-family:inherit;font-size:12px;font-weight:600;
        cursor:pointer;transition:opacity 0.15s,transform 0.1s;
      }
      .ed-pill:hover{opacity:.82;} .ed-pill:active{transform:scale(.95);}
      .ed-pill:disabled{opacity:.3;cursor:default;}
      .ed-pill svg{width:12px;height:12px;flex-shrink:0;}
      .ep-new{background:#0071e3;color:#fff;}
      .ep-edit{background:rgba(255,255,255,0.1);color:#e5e5ea;}
      .ep-del{background:rgba(255,59,48,0.15);color:#ff453a;}
      .ep-pub{background:#34c759;color:#fff;}
      .ep-lock{background:rgba(255,255,255,0.07);color:#636366;padding:6px 10px;}

      /* Full-screen overlay */
      #ed-overlay{
        display:none;position:fixed;inset:0;z-index:9100;
        background:var(--main-bg,#f5f5f7);flex-direction:column;
      }
      #ed-overlay.open{display:flex;}

      /* Top bar */
      #ed-topbar{
        display:flex;align-items:center;gap:10px;flex-wrap:wrap;
        padding:11px 20px;
        background:rgba(255,255,255,0.9);
        backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
        border-bottom:1px solid rgba(0,0,0,0.08);flex-shrink:0;
        font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      }
      #ed-topbar h2{font-size:14px;font-weight:700;color:#1d1d1f;margin-right:auto;}
      .ed-fi{display:flex;flex-direction:column;gap:2px;}
      .ed-fi label{font-size:10px;font-weight:600;color:#aeaeb2;text-transform:uppercase;letter-spacing:.05em;}
      .ed-inp{
        padding:5px 10px;background:#f2f2f7;border:1px solid rgba(0,0,0,0.08);
        border-radius:8px;font-size:13px;font-family:inherit;color:#1d1d1f;
        outline:none;transition:border-color .2s;
      }
      .ed-inp:focus{border-color:#0071e3;background:#fff;}
      select.ed-inp{cursor:pointer;}
      #ed-title-inp{width:200px;}
      #ed-date-inp{width:130px;}
      #ed-file-inp{width:155px;font-family:"SF Mono",monospace;font-size:12px;}
      .ed-tb{
        display:inline-flex;align-items:center;gap:6px;
        padding:7px 16px;border-radius:50px;border:none;
        font-family:inherit;font-size:13px;font-weight:600;
        cursor:pointer;transition:opacity .15s,transform .1s;
      }
      .ed-tb:hover{opacity:.82;} .ed-tb:active{transform:scale(.96);}
      .ed-tb svg{width:13px;height:13px;}
      .ed-cancel{background:rgba(0,0,0,0.06);color:#1d1d1f;}
      .ed-pubBtn{background:#0071e3;color:#fff;box-shadow:0 2px 8px rgba(0,113,227,.3);}

      /* Editor body */
      #ed-body{display:flex;flex:1;overflow:hidden;}

      /* Rich text toolbar */
      #ed-rte-wrap{
        width:50%;min-width:300px;display:flex;flex-direction:column;
        border-right:1px solid rgba(0,0,0,0.08);
      }
      #ed-rte-toolbar{
        display:flex;align-items:center;gap:2px;flex-wrap:wrap;
        padding:8px 12px;background:#f9f9fb;
        border-bottom:1px solid rgba(0,0,0,0.08);flex-shrink:0;
      }
      .rte-btn{
        width:30px;height:28px;border:none;background:none;border-radius:6px;
        font-size:13px;font-weight:700;cursor:pointer;color:#3a3a3c;
        display:flex;align-items:center;justify-content:center;
        transition:background .15s,color .15s;font-family:-apple-system,sans-serif;
      }
      .rte-btn:hover{background:rgba(0,0,0,0.07);color:#0071e3;}
      .rte-btn.active{background:rgba(0,113,227,0.12);color:#0071e3;}
      .rte-btn svg{width:14px;height:14px;}
      .rte-sep{width:1px;height:20px;background:rgba(0,0,0,0.1);margin:0 4px;}
      #ed-rte-select{
        padding:3px 8px;border:1px solid rgba(0,0,0,0.1);border-radius:6px;
        font-size:12.5px;font-family:inherit;background:#fff;color:#1d1d1f;
        outline:none;cursor:pointer;margin-right:4px;
      }
      #ed-rte{
        flex:1;padding:24px 28px;outline:none;overflow-y:auto;
        font-family:"Lora",Georgia,serif;font-size:15px;line-height:1.8;
        color:#3a3a3c;background:#fff;
      }
      #ed-rte:empty:before{content:attr(data-placeholder);color:#aeaeb2;}
      /* RTE content styles mirror blog */
      #ed-rte h1{font-size:2rem;font-weight:700;color:#1d1d1f;letter-spacing:-.02em;margin:0 0 16px;}
      #ed-rte h2{font-size:1.2rem;font-weight:700;color:#1d1d1f;margin:32px 0 12px;padding-bottom:8px;border-bottom:1px solid #efefef;}
      #ed-rte h3{font-size:1rem;font-weight:700;color:#1d1d1f;margin:22px 0 8px;}
      #ed-rte p{margin-bottom:14px;}
      #ed-rte strong{font-weight:700;color:#1d1d1f;}
      #ed-rte em{font-style:italic;}
      #ed-rte code{font-family:"SF Mono","Fira Code",monospace;font-size:.83em;background:#f2f2f7;color:#c0392b;padding:2px 5px;border-radius:4px;}
      #ed-rte pre{background:#1c1c1e;color:#f0f0f0;padding:18px 22px;border-radius:10px;overflow-x:auto;margin:6px 0 18px;font-family:"SF Mono",monospace;font-size:13px;line-height:1.65;}
      #ed-rte pre code{background:none;color:inherit;padding:0;}
      #ed-rte blockquote{border-left:3px solid #0071e3;padding:12px 18px;background:rgba(0,113,227,.04);border-radius:0 8px 8px 0;font-style:italic;color:#6e6e73;margin:16px 0;}
      #ed-rte ul,#ed-rte ol{padding-left:1.5em;margin-bottom:14px;}
      #ed-rte a{color:#0071e3;}
      #ed-rte:focus-visible{outline:none;}

      /* Live preview */
      #ed-preview-pane{
        width:50%;overflow-y:auto;
        background:var(--main-bg,#f5f5f7);display:flex;flex-direction:column;
      }
      #ed-preview-label{
        padding:8px 16px;font-family:-apple-system,sans-serif;
        font-size:11px;font-weight:600;color:#6e6e73;
        text-transform:uppercase;letter-spacing:.06em;
        border-bottom:1px solid rgba(0,0,0,0.08);flex-shrink:0;
        background:#fff;
      }
      #ed-preview-content .post-content{margin:20px auto;}

      /* Token modal */
      .ed-modal-bg{
        display:none;position:fixed;inset:0;z-index:9300;
        background:rgba(0,0,0,0.55);
        backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
        align-items:center;justify-content:center;
        font-family:-apple-system,BlinkMacSystemFont,sans-serif;
      }
      .ed-modal-bg.open{display:flex;}
      .ed-modal-box{
        background:#1c1c1e;border:1px solid rgba(255,255,255,0.12);
        border-radius:18px;padding:32px;
        box-shadow:0 24px 60px rgba(0,0,0,.5);
      }
      .ed-modal-box h3{color:#fff;font-size:17px;font-weight:700;margin-bottom:10px;}
      .ed-modal-box p{color:#8e8e93;font-size:13px;line-height:1.65;margin-bottom:16px;}
      .ed-modal-box a{color:#0071e3;}
      .ed-dark-inp{
        width:100%;padding:10px 14px;margin-bottom:16px;
        background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);
        border-radius:10px;color:#ebebf5;font-size:13px;
        font-family:"SF Mono",monospace;outline:none;
      }
      .ed-dark-inp:focus{border-color:#0071e3;}
      .ed-row{display:flex;gap:10px;justify-content:flex-end;}

      /* Publish steps */
      .pub-steps{margin:20px 0;text-align:left;}
      .pub-step{display:flex;align-items:center;gap:10px;padding:5px 0;font-size:13px;color:#636366;}
      .pub-step.active{color:#fff;} .pub-step.done{color:#34c759;} .pub-step.fail{color:#ff453a;}
      .pub-dot{width:7px;height:7px;border-radius:50%;background:currentColor;flex-shrink:0;}
    `;
    document.head.appendChild(s);
  }

  // ── Inject HTML ──────────────────────────────────────────────
  function injectHTML() {
    if (document.getElementById('ed-bar')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <!-- Admin toolbar -->
      <div id="ed-bar">
        <button class="ed-pill ep-new" onclick="ED.openNew()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span class="ed-btn-label"> New Post</span>
        </button>
        <div class="ed-div"></div>
        <button class="ed-pill ep-edit" id="ed-edit-btn" onclick="ED.openEdit()" ${isPost?'':'disabled'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          <span class="ed-btn-label"> Edit</span>
        </button>
        <button class="ed-pill ep-del" id="ed-del-btn" onclick="ED.askDelete()" ${isPost?'':'disabled'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          <span class="ed-btn-label"> Delete</span>
        </button>
        <div class="ed-div"></div>
        <button class="ed-pill ep-pub" onclick="ED.publishSite()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
          <span class="ed-btn-label"> Publish</span>
        </button>
        <div class="ed-div"></div>
        <button class="ed-pill ep-lock" onclick="ED.openToken()" title="GitHub Token">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </button>
        <button class="ed-pill ep-lock" onclick="ED.logout()" title="Lock admin" style="color:#ff453a;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
        <div class="ed-div"></div>
        <button class="ed-pill ep-edit" onclick="ED.openSidebar()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          <span class="ed-btn-label"> Sidebar</span>
        </button>
      </div>

      <!-- Full-screen editor -->
      <div id="ed-overlay">
        <div id="ed-topbar">
          <h2 id="ed-topbar-title">New Post</h2>
          <div class="ed-fi">
            <label>Title</label>
            <input class="ed-inp" id="ed-title-inp" type="text" placeholder="Post title…" />
          </div>
          <div class="ed-fi">
            <label>Category</label>
            <select class="ed-inp" id="ed-cat-inp">
              ${Object.entries(CATEGORIES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}
            </select>
          </div>
          <div class="ed-fi">
            <label>Date</label>
            <input class="ed-inp" id="ed-date-inp" type="date" />
          </div>
          <div class="ed-fi">
            <label>Filename</label>
            <input class="ed-inp" id="ed-file-inp" type="text" placeholder="my-post.html" />
          </div>
          <button class="ed-tb ed-cancel" onclick="ED.close()">Cancel</button>
          <button class="ed-tb ed-pubBtn" onclick="ED.publishPost()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>
            Publish
          </button>
        </div>
        <div id="ed-body">
          <!-- Rich text editor pane -->
          <div id="ed-rte-wrap">
            <div id="ed-rte-toolbar">
              <select id="ed-rte-select" onchange="ED.rteBlock(this.value);this.value='p'">
                <option value="p">Paragraph</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="pre">Code Block</option>
              </select>
              <div class="rte-sep"></div>
              <button class="rte-btn" onclick="ED.rteCmd('bold')" title="Bold"><b>B</b></button>
              <button class="rte-btn" onclick="ED.rteCmd('italic')" title="Italic"><i>I</i></button>
              <button class="rte-btn" onclick="ED.rteCmd('underline')" title="Underline"><u>U</u></button>
              <button class="rte-btn" onclick="ED.rteInlineCode()" title="Inline code">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              </button>
              <div class="rte-sep"></div>
              <button class="rte-btn" onclick="ED.rteCmd('insertUnorderedList')" title="Bullet list">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
              <button class="rte-btn" onclick="ED.rteCmd('insertOrderedList')" title="Numbered list">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
              </button>
              <button class="rte-btn" onclick="ED.rteBlockquote()" title="Blockquote">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1zm12 0c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
              </button>
              <div class="rte-sep"></div>
              <button class="rte-btn" onclick="ED.rteLink()" title="Insert link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              </button>
              <button class="rte-btn" onclick="ED.rteClear()" title="Clear formatting" style="margin-left:4px;color:#8e8e93;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
              </button>
              <div class="rte-sep"></div>
              <button class="rte-btn" onclick="ED.insertImage()" title="Insert image">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </button>
              <button class="rte-btn" onclick="ED.insertVideo()" title="Upload video file">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              </button>
              <button class="rte-btn" onclick="ED.embedVideoUrl()" title="Embed video from URL (YouTube, Vimeo, etc.)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="8" y1="16" x2="8" y2="20"/><line x1="12" y1="18" x2="4" y2="18"/></svg>
              </button>
            </div>
            <input type="file" id="ed-img-input" accept="image/*" style="display:none" />
            <input type="file" id="ed-vid-input" accept="video/*" style="display:none" />
            <div id="ed-rte" contenteditable="true"
              data-placeholder="Start writing your post here…&#10;&#10;Use the toolbar above to format text, add headings, lists, and code blocks."></div>
          </div>

          <!-- Live preview — uses real blog CSS -->
          <div id="ed-preview-pane">
            <div id="ed-preview-label">Live Preview</div>
            <div id="ed-preview-content">
              <div class="post-content">
                <div class="post-header">
                  <div class="post-meta">
                    <span class="post-date" id="prev-date"></span>
                    <span class="post-tag" id="prev-tag"></span>
                  </div>
                  <h1 id="prev-title" style="margin-bottom:0;"></h1>
                </div>
                <div id="prev-body"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Token modal -->
      <div id="ed-token-modal" class="ed-modal-bg">
        <div class="ed-modal-box" style="width:440px;">
          <h3>GitHub Token</h3>
          <p>Required to publish to <strong>chancewu1.github.io</strong>.<br>
            <a href="https://github.com/settings/tokens/new?scopes=repo&description=Blog+Editor" target="_blank">Generate a token ↗</a> with <strong>repo</strong> scope. Stored in your browser only.</p>
          <input id="ed-token-inp" class="ed-dark-inp" type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" />
          <div class="ed-row">
            <button class="ed-tb ed-cancel" onclick="document.getElementById('ed-token-modal').classList.remove('open')">Cancel</button>
            <button class="ed-tb ed-pubBtn" onclick="ED.saveToken()">Save</button>
          </div>
        </div>
      </div>

      <!-- Publish progress modal -->
      <div id="ed-pub-modal" class="ed-modal-bg">
        <div class="ed-modal-box" style="width:380px;text-align:center;">
          <h3 id="ed-pub-title">Publishing…</h3>
          <p id="ed-pub-sub" style="min-height:18px;"></p>
          <div class="pub-steps" id="ed-pub-steps"></div>
          <a id="ed-pub-link" href="https://chancewu1.github.io" target="_blank"
            style="display:none;color:#0071e3;font-size:13px;margin-top:12px;">View live site →</a>
          <div id="ed-pub-done" style="display:none;margin-top:18px;">
            <button class="ed-tb ed-cancel" onclick="document.getElementById('ed-pub-modal').classList.remove('open')">Done</button>
          </div>
        </div>
      </div>

      <!-- Delete confirm modal -->
      <div id="ed-del-modal" class="ed-modal-bg">
        <div class="ed-modal-box" style="width:360px;">
          <h3>Delete this post?</h3>
          <p id="ed-del-text">This will publish the removal immediately.</p>
          <div class="ed-row">
            <button class="ed-tb ed-cancel" onclick="document.getElementById('ed-del-modal').classList.remove('open')">Cancel</button>
            <button class="ed-tb" id="ed-del-ok" style="background:#ff3b30;color:#fff;">Delete &amp; Publish</button>
          </div>
        </div>
      </div>

    <!-- Sidebar editor modal -->
    <div id="ed-sb-modal" class="ed-modal-bg" onclick="ED.closeSidebar(event)">
      <div id="ed-sb-box" onclick="event.stopPropagation()" style="background:#1c1c1e;border:1px solid rgba(255,255,255,0.12);border-radius:18px;width:min(700px,95vw);max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.5);font-family:-apple-system,sans-serif;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;">
          <h3 style="color:#fff;font-size:16px;font-weight:700;margin:0;">Edit Sidebar</h3>
          <button onclick="ED.closeSidebarForce()" style="background:rgba(255,255,255,0.1);border:none;color:#8e8e93;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;">&#215;</button>
        </div>
        <div style="display:flex;flex:1;overflow:hidden;min-height:0;">
          <div style="width:50%;border-right:1px solid rgba(255,255,255,0.07);display:flex;flex-direction:column;overflow:hidden;">
            <div style="padding:14px 20px 10px;font-size:11px;font-weight:600;color:#636366;text-transform:uppercase;letter-spacing:.06em;flex-shrink:0;">Categories <span style="color:#8e8e93;font-weight:400;text-transform:none;letter-spacing:0;">left sidebar</span></div>
            <div id="ed-cats-list" style="flex:1;overflow-y:auto;padding:0 12px 12px;"></div>
            <div style="padding:12px 16px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:8px;flex-shrink:0;">
              <input id="ed-cat-label" placeholder="Label e.g. 生活" class="ed-dark-inp" style="flex:1;margin:0;padding:7px 11px;font-size:13px;" />
              <input id="ed-cat-key" placeholder="key e.g. life" class="ed-dark-inp" style="width:100px;margin:0;padding:7px 11px;font-size:13px;" />
              <button onclick="ED.addCategory()" class="ed-tb ed-pubBtn" style="padding:7px 14px;border-radius:8px;flex-shrink:0;">Add</button>
            </div>
          </div>
          <div style="width:50%;display:flex;flex-direction:column;overflow:hidden;">
            <div style="padding:14px 20px 10px;font-size:11px;font-weight:600;color:#636366;text-transform:uppercase;letter-spacing:.06em;flex-shrink:0;">Posts <span style="color:#8e8e93;font-weight:400;text-transform:none;letter-spacing:0;">right sidebar</span></div>
            <div id="ed-posts-list" style="flex:1;overflow-y:auto;padding:0 12px 12px;"></div>
          </div>
        </div>
        <div style="padding:14px 24px;border-top:1px solid rgba(255,255,255,0.08);display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;">
          <button class="ed-tb ed-cancel" onclick="ED.closeSidebarForce()">Cancel</button>
          <button class="ed-tb ed-pubBtn" onclick="ED.saveSidebar()">Save &amp; Publish</button>
        </div>
      </div>
    </div>
    `);

    // Wire live preview
    var rte = document.getElementById('ed-rte');
    rte.addEventListener('input', syncPreview);
    document.getElementById('ed-title-inp').addEventListener('input', function () {
      syncPreview();
      if (editing && editing.isNew)
        document.getElementById('ed-file-inp').value =
          this.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') + '.html';
    });
    document.getElementById('ed-cat-inp').addEventListener('change', syncPreview);
    document.getElementById('ed-date-inp').addEventListener('change', syncPreview);
  }

  // ── Sync live preview ────────────────────────────────────────
  function syncPreview() {
    var title   = document.getElementById('ed-title-inp').value || 'Untitled';
    var cat     = document.getElementById('ed-cat-inp').value;
    var dateVal = document.getElementById('ed-date-inp').value;
    var dateStr = dateVal
      ? new Date(dateVal+'T12:00:00').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})
      : '';
    document.getElementById('prev-title').textContent = title;
    document.getElementById('prev-tag').textContent   = CATEGORIES[cat]||cat;
    document.getElementById('prev-date').textContent  = dateStr;
    document.getElementById('prev-body').innerHTML    = document.getElementById('ed-rte').innerHTML;
  }

  // ── Public API ───────────────────────────────────────────────
  window.ED = {

    openNew: function () {
      CATEGORIES = getCategories();
      this._refreshCatDropdown();
      editing = { isNew: true, filename: null };
      document.getElementById('ed-topbar-title').textContent = 'New Post';
      document.getElementById('ed-title-inp').value = '';
      document.getElementById('ed-cat-inp').value   = Object.keys(CATEGORIES)[0] || 'machine-learning';
      document.getElementById('ed-date-inp').value  = today();
      document.getElementById('ed-file-inp').value  = '';
      document.getElementById('ed-rte').innerHTML   = '';
      syncPreview();
      document.getElementById('ed-overlay').classList.add('open');
      setTimeout(()=>document.getElementById('ed-rte').focus(), 100);
    },

    openEdit: function () {
      CATEGORIES = getCategories();
      this._refreshCatDropdown();
      if (!currentFile) return;
      editing = { isNew: false, filename: currentFile };
      document.getElementById('ed-topbar-title').textContent = 'Edit Post';

      var titleEl = document.getElementById('post-title');
      var tagEl   = document.querySelector('.post-tag');
      var dateEl  = document.querySelector('.post-date');

      document.getElementById('ed-title-inp').value = titleEl ? titleEl.textContent.trim() : '';
      document.getElementById('ed-file-inp').value  = currentFile;

      if (tagEl) {
        var ck = Object.keys(CATEGORIES).find(k=>CATEGORIES[k]===tagEl.textContent.trim())||'machine-learning';
        document.getElementById('ed-cat-inp').value = ck;
      }
      if (dateEl) {
        var mo = {January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',July:'07',August:'08',September:'09',October:'10',November:'11',December:'12'};
        var dm = dateEl.textContent.trim().match(/(\w+)\s+(\d+),\s+(\d+)/);
        if (dm) document.getElementById('ed-date-inp').value = dm[3]+'-'+(mo[dm[1]]||'01')+'-'+dm[2].padStart(2,'0');
      }

      // Load body HTML from the current page's post-content
      var bodyEl = document.querySelector('.post-content');
      if (bodyEl) {
        // Clone and strip everything except the actual content
        var clone = bodyEl.cloneNode(true);
        // Remove header, social share, post-nav
        ['post-header','social-share','post-nav'].forEach(function(cls){
          var el = clone.querySelector('.'+cls);
          if (el) el.remove();
        });
        document.getElementById('ed-rte').innerHTML = clone.innerHTML.trim();
      }
      syncPreview();
      document.getElementById('ed-overlay').classList.add('open');
      setTimeout(()=>document.getElementById('ed-rte').focus(), 100);
    },

    close: function () {
      document.getElementById('ed-overlay').classList.remove('open');
    },

    askDelete: function () {
      if (!currentFile) return;
      var t = document.getElementById('post-title');
      document.getElementById('ed-del-text').textContent =
        'Delete "' + (t ? t.textContent.trim() : currentFile) + '"? This will publish the removal immediately.';
      document.getElementById('ed-del-modal').classList.add('open');
      document.getElementById('ed-del-ok').onclick = function () {
        document.getElementById('ed-del-modal').classList.remove('open');
        ED._doDelete(currentFile);
      };
    },

    // ── Rich text commands ─────────────────────────────────────
    rteCmd: function (cmd) {
      document.getElementById('ed-rte').focus();
      document.execCommand(cmd, false, null);
      syncPreview();
    },

    rteBlock: function (tag) {
      if (!tag || tag === 'p') { document.execCommand('formatBlock', false, 'p'); }
      else { document.execCommand('formatBlock', false, tag); }
      document.getElementById('ed-rte').focus();
      syncPreview();
    },

    rteInlineCode: function () {
      var sel = window.getSelection();
      if (!sel.rangeCount) return;
      var range = sel.getRangeAt(0);
      var text  = range.toString();
      if (!text) return;
      var code  = document.createElement('code');
      code.textContent = text;
      range.deleteContents();
      range.insertNode(code);
      syncPreview();
    },

    rteBlockquote: function () {
      document.execCommand('formatBlock', false, 'blockquote');
      document.getElementById('ed-rte').focus();
      syncPreview();
    },

    rteLink: function () {
      var url = prompt('Link URL:');
      if (url) { document.execCommand('createLink', false, url); syncPreview(); }
    },

    embedVideoUrl: function () {
      var url = prompt('Paste video URL:\n(YouTube, Vimeo, or direct .mp4 link)');
      if (!url) return;

      var html = '';

      // YouTube
      var yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (yt) {
        html = '<figure class="media-figure">' +
          '<iframe src="https://www.youtube-nocookie.com/embed/' + yt[1] + '?rel=0" ' +
          'frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen ' +
          'style="width:100%;aspect-ratio:16/9;display:block;border-radius:8px;"></iframe>' +
          '</figure>';
      }

      // Vimeo
      var vim = url.match(/vimeo\.com\/(\d+)/);
      if (!html && vim) {
        html = '<figure class="media-figure">' +
          '<iframe src="https://player.vimeo.com/video/' + vim[1] + '" ' +
          'frameborder="0" allowfullscreen ' +
          'style="width:100%;aspect-ratio:16/9;display:block;border-radius:8px;"></iframe>' +
          '</figure>';
      }

      // Direct video file (.mp4, .webm, .mov)
      if (!html && url.match(/\.(mp4|webm|mov|ogg)(\?|$)/i)) {
        html = '<figure class="media-figure">' +
          '<video controls style="width:100%;border-radius:8px;">' +
          '<source src="' + url + '">' +
          '</video>' +
          '</figure>';
      }

      // Fallback: just embed as iframe
      if (!html) {
        html = '<figure class="media-figure">' +
          '<iframe src="' + url + '" frameborder="0" allowfullscreen ' +
          'style="width:100%;aspect-ratio:16/9;display:block;border-radius:8px;"></iframe>' +
          '</figure>';
      }

      document.getElementById('ed-rte').focus();
      document.execCommand('insertHTML', false, html);
      syncPreview();
    },

    rteClear: function () {
      document.execCommand('removeFormat', false, null);
      document.execCommand('formatBlock', false, 'p');
      syncPreview();
    },

    insertImage: function () {
      var input = document.getElementById('ed-img-input');
      input.onchange = async function () {
        var file = input.files[0];
        if (!file) return;
        if (!ghToken) { ED.openToken(); return; }
        var filename = 'assets/media/' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
        try {
          // Show uploading indicator
          var rte = document.getElementById('ed-rte');
          rte.focus();
          document.execCommand('insertHTML', false, '<p><em style="color:#8e8e93">Uploading image…</em></p>');

          // Read file as base64
          var b64 = await readFileB64(file);

          // Upload to GitHub
          await ghPut('/repos/'+REPO+'/contents/'+filename, {
            message: 'Upload image: ' + file.name,
            content: b64,
            branch: BRANCH
          });

          var url = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + filename;

          // Replace placeholder with real image
          var placeholder = rte.querySelector('em[style*="Uploading image"]');
          if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.outerHTML = '<figure class="media-figure"><img src="' + url + '" alt="' + file.name + '" /></figure>';
          } else {
            document.execCommand('insertHTML', false, '<figure class="media-figure"><img src="' + url + '" alt="' + file.name + '" /></figure>');
          }
          syncPreview();
        } catch(e) {
          alert('Image upload failed: ' + e.message);
        }
        input.value = '';
      };
      input.click();
    },

    insertVideo: function () {
      var input = document.getElementById('ed-vid-input');
      input.onchange = async function () {
        var file = input.files[0];
        if (!file) return;
        if (!ghToken) { ED.openToken(); return; }

        // Check size — GitHub API limit is 50MB for a single file
        if (file.size > 50 * 1024 * 1024) {
          alert('Video must be under 50MB. For larger videos, upload to YouTube and use the YouTube embed option instead.');
          input.value = ''; return;
        }

        var filename = 'assets/media/' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
        try {
          var rte = document.getElementById('ed-rte');
          rte.focus();
          document.execCommand('insertHTML', false, '<p><em style="color:#8e8e93">Uploading video…</em></p>');

          var b64 = await readFileB64(file);

          await ghPut('/repos/'+REPO+'/contents/'+filename, {
            message: 'Upload video: ' + file.name,
            content: b64,
            branch: BRANCH
          });

          var url = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/' + filename;
          var html = '<figure class="media-figure"><video controls><source src="' + url + '" type="' + file.type + '"></video></figure>';

          var placeholder = rte.querySelector('em[style*="Uploading video"]');
          if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.outerHTML = html;
          } else {
            document.execCommand('insertHTML', false, html);
          }
          syncPreview();
        } catch(e) {
          alert('Video upload failed: ' + e.message);
        }
        input.value = '';
      };
      input.click();
    },

    // ── Publish new/edited post ────────────────────────────────
    publishPost: async function () {
      if (!ghToken) { this.openToken(); return; }
      var title    = document.getElementById('ed-title-inp').value.trim();
      var cat      = document.getElementById('ed-cat-inp').value;
      var dateVal  = document.getElementById('ed-date-inp').value;
      var filename = document.getElementById('ed-file-inp').value.trim() || slugify(title)+'.html';
      var bodyHtml = document.getElementById('ed-rte').innerHTML;

      if (!title) { alert('Please enter a title.'); return; }

      var dateStr  = dateVal
        ? new Date(dateVal+'T12:00:00').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})
        : new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
      var catLabel = CATEGORIES[cat]||cat;
      var postHtml = buildPostHtml(title, dateStr, cat, catLabel, filename, bodyHtml);

      this.close();
      showPub(['Fetching current site state','Updating post','Updating sidebar','Pushing to GitHub']);

      try {
        step(0,'active');
        var ref      = await ghGet('/repos/'+REPO+'/git/ref/heads/'+BRANCH);
        var commit   = await ghGet('/repos/'+REPO+'/git/commits/'+ref.object.sha);
        step(0,'done');

        step(2,'active');
        var idxRes   = await ghGet('/repos/'+REPO+'/contents/index.html');
        var idxHtml  = b64decode(idxRes.content);
        var newIdx   = editing.isNew
          ? addToSidebar(idxHtml, title, filename, cat)
          : updateSidebar(idxHtml, title, filename);
        step(2,'done');

        step(1,'active');
        var tree     = await ghPost('/repos/'+REPO+'/git/trees',{
          base_tree: commit.tree.sha,
          tree:[
            {path:'posts/'+filename, mode:'100644', type:'blob', content:postHtml},
            {path:'index.html',      mode:'100644', type:'blob', content:newIdx}
          ]
        });
        var newCommit= await ghPost('/repos/'+REPO+'/git/commits',{
          message:(editing.isNew?'Add':'Update')+' post: '+title,
          tree:tree.sha, parents:[ref.object.sha]
        });
        step(1,'done');

        step(3,'active');
        await ghPatch('/repos/'+REPO+'/git/refs/heads/'+BRANCH,{sha:newCommit.sha});
        step(3,'done');

        pubDone('✓ Published!','Live at chancewu1.github.io (~1 min to propagate)');
        editing = { isNew:false, filename };
      } catch(e) { pubFail(e.message); }
    },

    // ── Delete + publish ───────────────────────────────────────
    _doDelete: async function (filename) {
      if (!ghToken) { this.openToken(); return; }
      showPub(['Fetching current site state','Removing post file','Updating sidebar','Pushing to GitHub']);
      try {
        step(0,'active');
        var idxRes  = await ghGet('/repos/'+REPO+'/contents/index.html');
        var idxHtml = b64decode(idxRes.content);
        var fileRes = await ghGet('/repos/'+REPO+'/contents/posts/'+filename);
        step(0,'done');

        step(1,'active');
        await ghDelete('/repos/'+REPO+'/contents/posts/'+filename,{
          message:'Delete post: '+filename, sha:fileRes.sha, branch:BRANCH
        });
        step(1,'done');

        step(2,'active');
        var newIdx = removeFromSidebar(idxHtml, filename);
        var updIdx = await ghGet('/repos/'+REPO+'/contents/index.html');
        await ghPut('/repos/'+REPO+'/contents/index.html',{
          message:'Remove post from sidebar: '+filename,
          content:b64encode(newIdx), sha:updIdx.sha, branch:BRANCH
        });
        step(2,'done'); step(3,'done');
        pubDone('✓ Deleted!','Post removed from chancewu1.github.io');
        setTimeout(()=>{ window.location.href='../index.html'; },1800);
      } catch(e) { pubFail(e.message); }
    },

    // ── Publish entire site (all local files) ─────────────────
    publishSite: async function () {
      if (!ghToken) { this.openToken(); return; }
      if (!('showDirectoryPicker' in window)) {
        alert('Full-site publish requires Chrome or Edge.'); return;
      }
      showPub(['Select blog folder','Read all files','Push to GitHub','Done']);
      try {
        step(0,'active');
        var root = await window.showDirectoryPicker({ mode:'readwrite' });
        window._blogRootDir = root; // cache for writeLocalIndex
        step(0,'done');

        step(1,'active');
        var files = await collectFiles(root);
        step(1,'done');

        step(2,'active');
        var ref   = await ghGet('/repos/'+REPO+'/git/ref/heads/'+BRANCH);
        var cm    = await ghGet('/repos/'+REPO+'/git/commits/'+ref.object.sha);
        var tree  = await ghPost('/repos/'+REPO+'/git/trees',{
          base_tree:cm.tree.sha,
          tree:Object.entries(files).map(([p,c])=>({path:p,mode:'100644',type:'blob',content:c}))
        });
        var nc    = await ghPost('/repos/'+REPO+'/git/commits',{
          message:'Publish blog — '+new Date().toLocaleString(),
          tree:tree.sha, parents:[ref.object.sha]
        });
        await ghPatch('/repos/'+REPO+'/git/refs/heads/'+BRANCH,{sha:nc.sha});
        step(2,'done'); step(3,'done');
        pubDone('✓ Published!','All changes live at chancewu1.github.io');
      } catch(e) {
        if (e.name!=='AbortError') pubFail(e.message);
        else document.getElementById('ed-pub-modal').classList.remove('open');
      }
    },

    openToken: function () {
      document.getElementById('ed-token-inp').value = ghToken;
      document.getElementById('ed-token-modal').classList.add('open');
    },
    saveToken: function () {
      ghToken = document.getElementById('ed-token-inp').value.trim();
      localStorage.setItem('gh_token', ghToken);
      document.getElementById('ed-token-modal').classList.remove('open');
    },
    logout: function () {
      sessionStorage.removeItem('admin_unlocked');
      location.reload();
    },

    // Rebuild category dropdown from live CATEGORIES (DOM-sourced)
    _refreshCatDropdown: function () {
      var sel = document.getElementById('ed-cat-inp');
      if (!sel) return;
      var cur = sel.value;
      sel.innerHTML = Object.entries(CATEGORIES).map(function(e) {
        return '<option value="' + e[0] + '">' + e[1] + '</option>';
      }).join('');
      if (cur && CATEGORIES[cur]) sel.value = cur;
    },

    // ── Sidebar editor ─────────────────────────────────────────
    openSidebar: function () {
      CATEGORIES = getCategories();
      var modal = document.getElementById('ed-sb-modal');
      var catsList = document.getElementById('ed-cats-list');
      var postsList = document.getElementById('ed-posts-list');
      if (!modal || !catsList || !postsList) {
        alert('Sidebar editor not ready. Please refresh the page and unlock admin again.');
        return;
      }
      this._renderCats();
      this._renderPosts();
      modal.classList.add('open');
    },

    closeSidebar: function (e) {
      if (e.target.id === 'ed-sb-modal') this.closeSidebarForce();
    },
    closeSidebarForce: function () {
      document.getElementById('ed-sb-modal').classList.remove('open');
    },

    _renderCats: function () {
      var tags = document.querySelectorAll('#sidebar-tags .sidebar-tag');
      var html = '';
      tags.forEach(function (t) {
        var key   = t.dataset.filter;
        var label = t.textContent.trim();
        html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 6px;border-bottom:1px solid rgba(255,255,255,0.05);">' +
          '<div style="flex:1;">' +
            '<div style="color:#ebebf5;font-size:13px;">' + label + '</div>' +
            '<div style="color:#636366;font-size:11px;font-family:monospace;">' + key + '</div>' +
          '</div>' +
          '<button onclick="ED._editCat(this)" data-key="' + key + '" data-label="' + label + '" ' +
            'style="background:rgba(255,255,255,0.07);border:none;color:#8e8e93;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;">Rename</button>' +
          '<button onclick="ED._deleteCat(this)" data-key="' + key + '" ' +
            'style="background:rgba(255,59,48,0.12);border:none;color:#ff453a;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;">Delete</button>' +
        '</div>';
      });
      document.getElementById('ed-cats-list').innerHTML = html || '<p style="color:#636366;font-size:13px;padding:12px 6px;">No categories yet.</p>';
    },

    _renderPosts: function () {
      var links = document.querySelectorAll('#post-toc-ul .toc-link');
      var html = '';
      links.forEach(function (a) {
        var title = a.textContent.trim();
        var href  = a.getAttribute('href');
        var file  = href.split('/').pop();
        var cat   = a.dataset.tags || '';
        html += '<div style="display:flex;align-items:center;gap:6px;padding:8px 6px;border-bottom:1px solid rgba(255,255,255,0.05);">' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="color:#ebebf5;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + title + '</div>' +
            '<div style="color:#636366;font-size:11px;font-family:monospace;">' + file + '</div>' +
          '</div>' +
          '<select onchange="ED._recat(this)" data-file="' + file + '" ' +
            'style="background:#2a2a2c;border:1px solid rgba(255,255,255,0.1);color:#8e8e93;padding:4px 6px;border-radius:6px;font-size:11px;cursor:pointer;">' +
            Object.entries(CATEGORIES).map(function(e){ return '<option value="' + e[0] + '"' + (cat===e[0]?' selected':'') + '>' + e[1] + '</option>'; }).join('') +
          '</select>' +
          '<button onclick="ED._movePost(this,-1)" data-file="' + file + '" title="Move up" ' +
            'style="background:rgba(255,255,255,0.07);border:none;color:#8e8e93;width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:14px;">↑</button>' +
          '<button onclick="ED._movePost(this,1)" data-file="' + file + '" title="Move down" ' +
            'style="background:rgba(255,255,255,0.07);border:none;color:#8e8e93;width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:14px;">↓</button>' +
          '<button onclick="ED._deletePost(this)" data-file="' + file + '" data-title="' + title.replace(/"/g,'&quot;') + '" title="Delete post" ' +
            'style="background:rgba(255,59,48,0.12);border:none;color:#ff453a;width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:14px;">✕</button>' +
        '</div>';
      });
      document.getElementById('ed-posts-list').innerHTML = html || '<p style="color:#636366;font-size:13px;padding:12px 6px;">No posts yet.</p>';
    },

    addCategory: function () {
      var label = document.getElementById('ed-cat-label').value.trim();
      var key   = document.getElementById('ed-cat-key').value.trim().toLowerCase().replace(/\s+/g,'-');
      if (!label || !key) { alert('Enter both a label and a key.'); return; }
      // Add to live sidebar
      var tags = document.getElementById('sidebar-tags');
      var div  = document.createElement('div');
      div.className = 'sidebar-tag';
      div.dataset.filter = key;
      div.textContent = label;
      tags.appendChild(div);
      // Add to CATEGORIES map
      CATEGORIES[key] = label;
      document.getElementById('ed-cat-label').value = '';
      document.getElementById('ed-cat-key').value   = '';
      this._renderCats();
    },

    _editCat: function (btn) {
      var key      = btn.dataset.key;
      var oldLabel = btn.dataset.label;
      var newLabel = prompt('Rename category:', oldLabel);
      if (!newLabel || newLabel === oldLabel) return;
      // Update live sidebar
      var tag = document.querySelector('.sidebar-tag[data-filter="' + key + '"]');
      if (tag) tag.textContent = newLabel;
      CATEGORIES[key] = newLabel;
      this._renderCats();
    },

    _deleteCat: function (btn) {
      var key = btn.dataset.key;
      if (!confirm('Delete category "' + key + '"? Posts in this category won\'t be deleted, just uncategorized.')) return;
      var tag = document.querySelector('.sidebar-tag[data-filter="' + key + '"]');
      if (tag) tag.remove();
      delete CATEGORIES[key];
      this._renderCats();
    },

    _recat: function (sel) {
      var file   = sel.dataset.file;
      var newCat = sel.value;
      // Update the toc-link data-tags
      var link = document.querySelector('.toc-link[href*="' + file + '"]');
      if (link) link.dataset.tags = newCat;
    },

    _movePost: function (btn, dir) {
      var file = btn.dataset.file;
      var ul   = document.getElementById('post-toc-ul');
      var li   = Array.from(ul.children).find(function(l){ return l.querySelector('a[href*="'+file+'"]'); });
      if (!li) return;
      if (dir === -1 && li.previousElementSibling) ul.insertBefore(li, li.previousElementSibling);
      if (dir ===  1 && li.nextElementSibling)     ul.insertBefore(li.nextElementSibling, li);
      this._renderPosts();
    },

    _deletePost: async function (btn) {
      var file  = btn.dataset.file;
      var title = btn.dataset.title || file;
      if (!confirm('Delete "' + title + '"?\n\nThis will permanently delete the post file and remove it from the sidebar.')) return;
      if (!ghToken) { this.openToken(); return; }

      // Remove from sidebar DOM first
      var ul = document.getElementById('post-toc-ul');
      var li = Array.from(ul.children).find(function(l){ return l.querySelector('a[href*="'+file+'"]'); });
      if (li) li.remove();
      this._renderPosts();

      // Delete file from GitHub and save updated sidebar in one go
      showPub(['Deleting post file', 'Updating sidebar', 'Publishing']);
      try {
        step(0,'active');
        // Get file SHA for deletion
        var fileRes = await ghGet('/repos/'+REPO+'/contents/posts/'+file);
        await ghDelete('/repos/'+REPO+'/contents/posts/'+file, {
          message: 'Delete post: ' + file,
          sha: fileRes.sha,
          branch: BRANCH
        });
        step(0,'done');

        // Update index.html on GitHub to remove entry
        step(1,'active');
        var idxRes  = await ghGet('/repos/'+REPO+'/contents/index.html');
        var idxHtml = b64decode(idxRes.content);
        // Remove the li entry
        idxHtml = idxHtml.replace(
          new RegExp('\\s*<li><a[^>]+href="posts/'+file+'"[^>]*>[^<]*<\\/a><\\/li>', 'g'), ''
        );
        await ghPut('/repos/'+REPO+'/contents/index.html', {
          message: 'Remove post from sidebar: ' + file,
          content: b64encode(idxHtml),
          sha: idxRes.sha,
          branch: BRANCH
        });
        step(1,'done');
        step(2,'done');
        // Remove from live DOM
        var liveLi = document.querySelector('#post-toc-ul a[href="posts/'+file+'"], #post-toc-ul a[href="'+file+'"]');
        if (liveLi) liveLi.closest('li').remove();
        // Write updated index.html back to local file
        await writeLocalIndex(idxHtml);
        pubDone('✓ Post deleted!', '"' + title + '" permanently removed from site and admin.');
      } catch(e) {
        pubFail(e.message);
      }
    },

    // Save sidebar changes and publish index.html
    saveSidebar: async function () {
      if (!ghToken) { this.openToken(); return; }
      this.closeSidebarForce();

      // Serialize current sidebar state from live DOM
      var tags  = document.querySelectorAll('#sidebar-tags .sidebar-tag');
      var links = document.querySelectorAll('#post-toc-ul .toc-link');

      var tagsHtml  = Array.from(tags).map(function(t){
        return '        <div class="sidebar-tag' + (t.classList.contains('active')?' active':'') + '" data-filter="' + t.dataset.filter + '">' + t.textContent.trim() + '</div>';
      }).join('\n');

      var linksHtml = Array.from(links).map(function(a){
        var href = a.getAttribute('href');
        // Ensure href always has posts/ prefix in index.html
        if (!href.startsWith('posts/') && !href.startsWith('http')) {
          href = 'posts/' + href;
        }
        return '        <li><a class="toc-link" href="' + href + '" data-tags="' + (a.dataset.tags||'') + '">' + a.textContent.trim() + '</a></li>';
      }).join('\n');

      showPub(['Fetching index.html','Updating sidebar','Pushing to GitHub']);
      try {
        step(0,'active');
        var idxRes  = await ghGet('/repos/'+REPO+'/contents/index.html');
        var idxHtml = b64decode(idxRes.content);
        step(0,'done');

        step(1,'active');
        // Replace sidebar-tags block — match opening tag through its own closing </div>
        // Use a split approach to reliably replace the entire block
        var sbStart = idxHtml.indexOf('<div id="sidebar-tags">');
        var fsStart = idxHtml.indexOf('<div class="fs-control">', sbStart);
        // Find the </div> that closes sidebar-tags (last </div> before fs-control)
        var sbEnd = idxHtml.lastIndexOf('</div>', fsStart) + '</div>'.length;
        if (sbStart !== -1 && sbEnd > sbStart) {
          idxHtml = idxHtml.slice(0, sbStart) +
            '<div id="sidebar-tags">\n' + tagsHtml + '\n      </div>' +
            idxHtml.slice(sbEnd);
        }
        // Replace toc-ul block
        idxHtml = idxHtml.replace(
          /(<ul id="post-toc-ul"[^>]*>)[\s\S]*?(<\/ul>)/,
          '$1\n' + linksHtml + '\n      $2'
        );
        step(1,'done');

        step(2,'active');
        var ref      = await ghGet('/repos/'+REPO+'/git/ref/heads/'+BRANCH);
        var commit   = await ghGet('/repos/'+REPO+'/git/commits/'+ref.object.sha);
        var tree     = await ghPost('/repos/'+REPO+'/git/trees',{
          base_tree: commit.tree.sha,
          tree:[{path:'index.html', mode:'100644', type:'blob', content:idxHtml}]
        });
        var nc = await ghPost('/repos/'+REPO+'/git/commits',{
          message:'Update sidebar',
          tree:tree.sha, parents:[ref.object.sha]
        });
        await ghPatch('/repos/'+REPO+'/git/refs/heads/'+BRANCH,{sha:nc.sha});
        step(2,'done');
        // Write updated index.html back to local file to keep in sync
        await writeLocalIndex(idxHtml);
        pubDone('✓ Sidebar updated!','Changes live at chancewu1.github.io');
      } catch(e) { pubFail(e.message); }
    }
  };

  // ── Publish UI helpers ───────────────────────────────────────
  function showPub(steps) {
    document.getElementById('ed-pub-title').textContent = 'Publishing…';
    document.getElementById('ed-pub-sub').textContent   = '';
    document.getElementById('ed-pub-link').style.display= 'none';
    document.getElementById('ed-pub-done').style.display= 'none';
    document.getElementById('ed-pub-steps').innerHTML   = steps.map((s,i)=>
      `<div class="pub-step" id="ps${i}"><div class="pub-dot"></div><span>${s}</span></div>`
    ).join('');
    document.getElementById('ed-pub-modal').classList.add('open');
  }
  function step(i,state){ var e=document.getElementById('ps'+i); if(e) e.className='pub-step '+state; }
  function pubDone(title,sub){
    document.getElementById('ed-pub-title').textContent=title;
    document.getElementById('ed-pub-sub').textContent=sub;
    document.getElementById('ed-pub-link').style.display='block';
    document.getElementById('ed-pub-done').style.display='block';
  }
  function pubFail(msg){
    var a=document.querySelector('.pub-step.active');
    if(a) a.className='pub-step fail';
    document.getElementById('ed-pub-title').textContent='Publish failed';
    document.getElementById('ed-pub-sub').textContent=msg;
    document.getElementById('ed-pub-done').style.display='block';
  }

  // ── GitHub API ───────────────────────────────────────────────
  function ghFetch(path,opts){
    return fetch('https://api.github.com'+path, Object.assign({
      headers:{'Authorization':'token '+ghToken,'Content-Type':'application/json','Accept':'application/vnd.github.v3+json'}
    },opts)).then(r=>r.ok?r.json():r.json().then(e=>{throw new Error(e.message||'GitHub '+r.status);}));
  }
  function ghGet(p)    {return ghFetch(p);}
  function ghPost(p,b) {return ghFetch(p,{method:'POST',  body:JSON.stringify(b)});}
  function ghPatch(p,b){return ghFetch(p,{method:'PATCH', body:JSON.stringify(b)});}
  function ghDelete(p,b){return ghFetch(p,{method:'DELETE',body:JSON.stringify(b)});}
  function ghPut(p,b)  {return ghFetch(p,{method:'PUT',   body:JSON.stringify(b)});}

  // ── Sidebar helpers ──────────────────────────────────────────
  function addToSidebar(html,title,filename,cat){
    if(html.includes('href="posts/'+filename+'"')) return html;
    var e='\n        <li><a class="toc-link" href="posts/'+filename+'" data-tags="'+cat+'">'+esc(title)+'</a></li>';
    return html.replace(/(<ul id="post-toc-ul"[^>]*>)/,'$1'+e);
  }
  function updateSidebar(html,title,filename){
    return html.replace(
      new RegExp('(<a class="toc-link[^"]*"\\s+href="posts/'+filename+'"[^>]*>)[^<]*(</a>)'),
      '$1'+esc(title)+'$2'
    );
  }
  function removeFromSidebar(html,filename){
    return html.replace(new RegExp('\\s*<li><a[^>]+href="posts/'+filename+'"[^>]*>[^<]*<\\/a><\\/li>','g'),'');
  }

  // ── File collector ───────────────────────────────────────────
  async function collectFiles(root){
    var files={};
    async function walk(dir,pre){
      for await(var [name,h] of dir.entries()){
        if(h.kind==='directory'&&name!=='admin'&&name!=='.git') await walk(h,pre+name+'/');
        else if(h.kind==='file'&&/\.(html|css|js)$/.test(name))
          files[pre+name]=await(await h.getFile()).text();
      }
    }
    await walk(root,'');
    return files;
  }

  // ── Build post HTML ──────────────────────────────────────────
  function buildPostHtml(title,dateStr,cat,catLabel,filename,bodyHtml){
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
  <title>${esc(title)} | Chris Wu</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&amp;display=swap" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/nprogress/0.2.0/nprogress.min.css" />
  <link rel="stylesheet" href="../css/main.css" />
</head>
<body>
  <div id="sidebar" class="open">
    <div class="sidebar-left">
      <a id="sidebar-avatar" href="../index.html" title="Home"><div class="avatar">CW</div></a>
      <div id="sidebar-tags">
        <div class="sidebar-tag active" data-filter="recent">最新文章</div>
        <div class="sidebar-tag" data-filter="deep-learning">深度学习</div>
        <div class="sidebar-tag" data-filter="machine-learning">机器学习</div>
        <div class="sidebar-tag" data-filter="life">生活</div>
        <div class="sidebar-tag" data-filter="leetcode">Leetcode</div>
        <div class="sidebar-tag" data-filter="language">语言学习</div>
        <div class="sidebar-tag" data-filter="interview">面试记录</div>
        <div class="sidebar-tag" data-filter="resources">Resources</div>
        <div class="sidebar-tag" data-filter="business">商业分析</div>
        <div class="sidebar-tag" data-filter="statistics">数理统计</div>
        <div class="sidebar-tag" data-filter="notes">转码笔记</div>
      </div>
      <div class="fs-control">
        <button class="fs-btn" data-fs="sm">A</button>
        <button class="fs-btn active" data-fs="md">A</button>
        <button class="fs-btn" data-fs="lg">A</button>
        <button class="fs-btn" data-fs="xl">A</button>
      </div>
    </div>
    <div class="sidebar-right">
      <input id="search-input" type="text" placeholder="Search posts…" autocomplete="off" />
      <ul id="post-toc-ul" class="toc-ul">
        <li><a class="toc-link active" href="${filename}" data-tags="${cat}">${esc(title)}</a></li>
      </ul>
    </div>
  </div>
  <div id="menu">&#9776;</div>
  <div id="main" class="fadeIn">
    <div id="post-toc-menu" title="Table of Contents">&#8801;</div>
    <div id="post-toc"><ul id="post-toc-inner"></ul></div>
    <div class="post">
      <div class="post-content">
        <div class="post-header">
          <div class="post-meta">
            <span class="post-date">${dateStr}</span>
            <span class="post-tag">${esc(catLabel)}</span>
          </div>
          <h1 id="post-title">${esc(title)}</h1>
        </div>
        ${bodyHtml}
        <div class="social-share">
          <a href="mailto:chancewu1@gmail.com" title="Email"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></a>
          <a href="https://linkedin.com" target="_blank" title="LinkedIn"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
        </div>
        <div class="post-nav"><a href="../index.html" class="back-link">&#8592; Back to Home</a></div>
      </div>
    </div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.3/jquery.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/nprogress/0.2.0/nprogress.min.js"><\/script>
  <script src="../js/main.js"><\/script>
  <script src="../js/editor.js"><\/script>
</body>
</html>`;
  }

  // ── Utilities ────────────────────────────────────────────────
  // Write updated index.html to local file so admin stays in sync after reload
  async function writeLocalIndex(html) {
    try {
      if (!('showDirectoryPicker' in window)) return;
      // Try to get root dir handle — reuse if already open, otherwise skip silently
      var root = window._blogRootDir;
      if (!root) return;
      var h = await root.getFileHandle('index.html');
      var w = await h.createWritable();
      await w.write(html);
      await w.close();
    } catch(e) { /* non-fatal — local write is best-effort */ }
  }

  function b64decode(str){ return decodeURIComponent(escape(atob(str.replace(/\n/g,'')))); }
  function b64encode(str){ return btoa(unescape(encodeURIComponent(str))); }

  function readFileB64(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload  = function(e) { resolve(e.target.result.split(',')[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function slugify(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'post'; }
  function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function today(){ return new Date().toISOString().split('T')[0]; }

})();
