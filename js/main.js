$(function () {
  var toc     = $('.toc-link'),
      sidebar = $('#sidebar'),
      main    = $('#main'),
      menu    = $('#menu'),
      posttoc = $('#post-toc-menu');

  var RECENT_NUM = 5;

  // ===== Font size control =====
  var savedFs = localStorage.getItem('fs') || 'md';
  applyFs(savedFs);

  $(document).on('click', '.fs-btn', function () {
    var level = $(this).data('fs');
    applyFs(level);
    localStorage.setItem('fs', level);
  });

  function applyFs(level) {
    $('html').attr('data-fs', level);
    $('.fs-btn').removeClass('active').filter('[data-fs="' + level + '"]').addClass('active');
  }

  // ===== After page load / navigation =====
  var afterLoad = function () {
    main.find('a').filter(function () {
      return this.hostname && this.hostname !== window.location.hostname;
    }).attr('target', '_blank');

    applyFs(localStorage.getItem('fs') || 'md');

    // Re-apply sidebar filter after every page load
    applyFilter(sessionStorage.getItem('sidebar_filter') || 'recent');

    var tocInner = $('#post-toc-inner');
    if (tocInner.length) {
      tocInner.empty();

      var postTitle = $('#post-title');
      if (postTitle.length) {
        tocInner.append(
          '<li class="post-toc-li post-toc-h1"><a href="#post-title" class="js-anchor-link">' +
          postTitle.text() + '</a></li>'
        );
      }

      main.find('.post').children('h2,h3').each(function () {
        var id = randomId();
        $(this).attr('id', id);
        var tag = $(this).prop('tagName');
        var cls = tag === 'H2' ? 'post-toc-h2' : 'post-toc-h3';
        tocInner.append(
          '<li class="post-toc-li ' + cls + '"><a href="#' + id + '" class="js-anchor-link">' +
          $(this).text() + '</a></li>'
        );
      });

      var hasHeadings = main.find('.post h2, .post h3').length > 0;
      posttoc.css('display', hasHeadings ? 'flex' : 'none');
    }

    main.find('.js-anchor-link').on('click', function (e) {
      e.preventDefault();
      var target = $(this.hash);
      if (target.length) {
        main.animate({ scrollTop: target.offset().top + main.scrollTop() - 70 }, 400);
      }
    });
  };

  function randomId() {
    var s = '', alpha = 'abcdefghijklmnopqrstuvwxyz';
    for (var i = 0; i < 6; i++) s += alpha[Math.floor(Math.random() * alpha.length)];
    return s;
  }

  afterLoad();

  // ===== Category / tag filter =====
  function applyFilter(filter) {
    // Always re-query fresh toc elements from the live DOM
    var freshToc = $('#post-toc-ul .toc-link');
    freshToc.closest('li').hide();
    var visible;
    if (filter === 'recent') {
      visible = freshToc.slice(0, RECENT_NUM);
    } else {
      visible = freshToc.filter(function () {
        var tags = $(this).data('tags') || '';
        return (' ' + tags + ' ').indexOf(' ' + filter + ' ') !== -1;
      });
    }
    visible.closest('li').fadeIn(300);
    $('#sidebar-tags .sidebar-tag').removeClass('active')
      .filter('[data-filter="' + filter + '"]').addClass('active');
    sessionStorage.setItem('sidebar_filter', filter);
  }

  $('#sidebar-tags').on('click', '.sidebar-tag', function () {
    applyFilter($(this).data('filter'));
    $('#search-input').val('');
  });

  // Restore last active filter instead of always jumping to recent
  var savedFilter = sessionStorage.getItem('sidebar_filter') || 'recent';
  applyFilter(savedFilter);

  // ===== Search =====
  $('#search-input').on('input', function () {
    var q = $(this).val().trim().toLowerCase();
    if (!q) {
      applyFilter(sessionStorage.getItem('sidebar_filter') || 'recent');
      return;
    }
    var freshToc = $('#post-toc-ul .toc-link');
    freshToc.closest('li').hide();
    freshToc.filter(function () {
      return $(this).text().toLowerCase().indexOf(q) !== -1;
    }).closest('li').fadeIn(300);
    $('#sidebar-tags .sidebar-tag').removeClass('active');
  });

  // ===== Mobile menu toggle =====
  menu.on('click', function () {
    sidebar.toggleClass('open');
  });

  main.on('click', function () {
    if ($(window).width() <= 1024) sidebar.removeClass('open');
  });

  // ===== Right-side post TOC toggle =====
  posttoc.on('click', function () {
    $('#post-toc').toggleClass('open');
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest('#post-toc, #post-toc-menu').length) {
      $('#post-toc').removeClass('open');
    }
  });

  // ===== SPA navigation =====
  // Resolve href always relative to the site root, not the current URL
  function resolveHref(href) {
    // Use the browser's built-in URL resolution based on a known root anchor
    // Find the root by going up from current path to remove /posts/filename
    var currentHref = window.location.href;
    // Strip everything after the last / to get directory
    var dir = currentHref.substring(0, currentHref.lastIndexOf('/') + 1);
    // If we're in /posts/, go up one level to root
    if (dir.indexOf('/posts/') !== -1) {
      dir = dir.substring(0, dir.lastIndexOf('/posts/') + 1);
    }
    // Now resolve href relative to root dir
    if (href.startsWith('posts/')) {
      return dir + href;
    }
    return dir + href;
  }

  $(document).on('click', '.toc-link, #sidebar-avatar', function (e) {
    var href = $(this).attr('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return;
    e.preventDefault();
    e.stopPropagation();

    var absoluteUrl = resolveHref(href);

    // Always get fresh reference to #main in case DOM was modified
    var $main = $('#main');
    if (!$main.length) { window.location.href = absoluteUrl; return; }

    NProgress.start();
    $main.removeClass('fadeIn');

    fetch(absoluteUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var newMain = doc.querySelector('#main');
        if (newMain) {
          // Re-get $main in case it changed
          $main = $('#main');
          $main.html(newMain.innerHTML);
          document.title = doc.title;
          history.pushState(null, doc.title, absoluteUrl);
          $main.scrollTop(0).addClass('fadeIn');
          main = $main; // update module-level reference
          afterLoad();
          toc = $('.toc-link');
          $('.toc-link').removeClass('active').filter('[href="' + href + '"]').addClass('active');
          applyFilter(sessionStorage.getItem('sidebar_filter') || 'recent');
          if ($(window).width() <= 1024) sidebar.removeClass('open');
          // Tell admin editor about the new page context
          if (window.ED && window.ED._onNavigate) window.ED._onNavigate(absoluteUrl);
        } else {
          window.location.href = absoluteUrl;
        }
        NProgress.done();
      })
      .catch(function () { NProgress.done(); window.location.href = absoluteUrl; });
  });

  window.addEventListener('popstate', function () {
    NProgress.start();
    fetch(location.href)
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var newMain = doc.querySelector('#main');
        if (newMain) {
          main.html(newMain.innerHTML);
          document.title = doc.title;
          main.scrollTop(0).addClass('fadeIn');
          afterLoad();
          toc = $('.toc-link');
        }
        NProgress.done();
      })
      .catch(function () { NProgress.done(); });
  });

  NProgress.configure({ showSpinner: false });
});
