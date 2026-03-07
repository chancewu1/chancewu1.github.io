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
    // Open external links in new tab
    main.find('a').filter(function () {
      return this.hostname && this.hostname !== window.location.hostname;
    }).attr('target', '_blank');

    // Re-apply font size to any newly loaded fs buttons
    applyFs(localStorage.getItem('fs') || 'md');

    // Build right-side post TOC from headings
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

    // Smooth scroll for anchor links
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
  $('#sidebar-tags').on('click', '.sidebar-tag', function () {
    var filter = $(this).data('filter');
    toc.hide();
    if (filter === 'recent') {
      toc.slice(0, RECENT_NUM).fadeIn(300);
    } else {
      toc.filter(function () {
        var tags = $(this).data('tags') || '';
        return (' ' + tags + ' ').indexOf(' ' + filter + ' ') !== -1;
      }).fadeIn(300);
    }
    $(this).addClass('active').siblings().removeClass('active');
    $('#search-input').val('');
  });

  // Default: show recent N posts
  toc.hide();
  toc.slice(0, RECENT_NUM).fadeIn(300);

  // ===== Search =====
  $('#search-input').on('input', function () {
    var q = $(this).val().trim().toLowerCase();
    if (!q) {
      toc.hide();
      toc.slice(0, RECENT_NUM).fadeIn(300);
      return;
    }
    toc.hide();
    toc.filter(function () {
      return $(this).text().toLowerCase().indexOf(q) !== -1;
    }).fadeIn(300);
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
  $(document).on('click', '.toc-link, #sidebar-avatar', function (e) {
    var href = $(this).attr('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) return;
    e.preventDefault();

    NProgress.start();
    main.removeClass('fadeIn');

    fetch(href)
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var newMain = doc.querySelector('#main');
        if (newMain) {
          main.html(newMain.innerHTML);
          document.title = doc.title;
          history.pushState(null, doc.title, href);
          main.scrollTop(0).addClass('fadeIn');
          afterLoad();
          toc = $('.toc-link');
          $('.toc-link').removeClass('active').filter('[href="' + href + '"]').addClass('active');
          if ($(window).width() <= 1024) sidebar.removeClass('open');
        }
        NProgress.done();
      })
      .catch(function () { NProgress.done(); window.location = href; });
  });

  window.addEventListener('popstate', function () {
    NProgress.start();
    fetch(location.pathname + location.search)
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
