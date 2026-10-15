(function () {
  'use strict';

  var progressKey = 'openstudy.course-progress.v1';
  var search = document.getElementById('class-search');
  var grid = document.getElementById('course-grid');
  var empty = document.getElementById('empty-state');
  var activeFilter = 'all';
  var progressWarning = '';
  var filters = { all: ['foundations', 'technology'], foundations: ['foundations'], technology: ['technology'] };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function readProgress() {
    try {
      var stored = window.localStorage.getItem(progressKey);
      if (!stored) return {};
      var data = JSON.parse(stored);
      if (data && typeof data === 'object' && !Array.isArray(data)) return data;
      progressWarning = 'Saved lesson progress could not be read. Your new answers can still be saved.';
    } catch (error) {
      progressWarning = 'Saved lesson progress could not be read. Your new answers can still be saved.';
    }
    return {};
  }

  function renderCards() {
    if (!grid) return;
    var term = (search.value || '').trim().toLowerCase();
    var visible = 0;
    grid.innerHTML = window.COURSES.map(function (course) {
      var matchesFilter = filters[activeFilter].indexOf(course.category) !== -1;
      var matchesSearch = !term || (course.title + ' ' + course.description + ' ' + course.search).toLowerCase().indexOf(term) !== -1;
      var show = matchesFilter && matchesSearch;
      if (show) visible++;
      return '<article class="course-card" data-course="' + escapeHtml(course.id) + '"' + (show ? '' : ' hidden') + '>' +
        '<div class="card-top"><span class="course-icon" aria-hidden="true">' + escapeHtml(course.icon) + '</span>' +
        '<span class="course-label">' + escapeHtml(course.label) + '</span></div>' +
        '<h3 class="course-title">' + escapeHtml(course.title) + '</h3>' +
        '<p class="course-summary">' + escapeHtml(course.description) + '</p>' +
        '<div class="course-meta">' + course.meta.map(function (item) { return '<span>' + escapeHtml(item) + '</span>'; }).join('') + '</div>' +
        '<a class="course-link" href="' + escapeHtml(course.href) + '">' + escapeHtml(course.cta) + '<span aria-hidden="true">→</span></a>' +
        '</article>';
    }).join('');
    empty.hidden = visible !== 0;
  }

  function renderCourse() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get('course');
    var data = window.LESSONS[id];
    var course = window.COURSES.filter(function (item) { return item.id === id; })[0];
    var app = document.getElementById('course-app');
    if (!app) return;
    /* A class that has grown into its own course lives elsewhere; send old links there. */
    if (course && !data && course.href.indexOf('course.html') !== 0) {
      window.location.replace(course.href);
      return;
    }
    if (!data || !course) {
      document.title = 'Class not found — Open Study';
      app.innerHTML = '<header class="course-header"><a class="brand" href="/" aria-label="Open Study home">' +
        '<span class="brand-mark" aria-hidden="true">o</span><span>open<span class="brand-light">study</span></span></a>' +
        '<a class="back-link" href="/">← All classes</a></header><main class="not-found">' +
        '<div class="eyebrow">Let’s find another path</div><h1>That class isn’t here yet.</h1>' +
        '<p>The address may be out of date. Browse the classes that are ready now.</p>' +
        '<a class="button button-dark" href="/">Browse all classes</a></main>';
      return;
    }

    document.title = data.title + ' — Open Study';
    document.body.classList.add('course-page');
    var saved = readProgress();
    var completed = Array.isArray(saved[id]) ? saved[id] : [];
    var current = 0;
    app.innerHTML = '<header class="course-header">' +
      '<a class="brand" href="/" aria-label="Open Study home"><span class="brand-mark" aria-hidden="true">o</span><span>open<span class="brand-light">study</span></span></a>' +
      '<a class="back-link" href="/">← All classes</a></header>' +
      '<main class="course-shell"><section class="course-intro"><div class="eyebrow">' + escapeHtml(data.eyebrow) + '</div>' +
      '<h1>' + escapeHtml(data.title) + '</h1><p>' + escapeHtml(data.intro) + '</p></section>' +
      '<div class="course-layout"><aside class="lesson-sidebar"><h2>In this class</h2><nav class="lesson-list" aria-label="Lessons">' +
      data.lessons.map(function (lesson, index) {
        return '<button type="button" class="lesson-pick' + (index === 0 ? ' is-current' : '') +
          (completed.indexOf(index) !== -1 ? ' is-complete' : '') + '" data-lesson="' + index + '">' +
          '<span class="lesson-number">' + (completed.indexOf(index) !== -1 ? '✓' : String(index + 1).padStart(2, '0')) + '</span>' +
          '<span class="lesson-pick-title">' + escapeHtml(lesson.title) + '<small>' + escapeHtml(lesson.duration) + '</small></span></button>';
      }).join('') +
      '</nav><p class="course-progress" id="course-progress"></p></aside><article class="lesson-content" id="lesson-content"></article></div></main>' +
      '<footer class="course-footer">Open Study · Free lessons, at your pace.</footer>';

    function renderLesson() {
      var lesson = data.lessons[current];
      var content = document.getElementById('lesson-content');
      content.innerHTML = '<div class="lesson-kicker">Lesson ' + String(current + 1).padStart(2, '0') + ' · ' +
        escapeHtml(lesson.duration) + '</div><h2>' + escapeHtml(lesson.title) + '</h2>' +
        '<div class="lesson-body">' + lesson.paragraphs.map(function (text) { return '<p>' + escapeHtml(text) + '</p>'; }).join('') +
        '<h3>See it in action</h3><pre class="lesson-example"><code>' + escapeHtml(lesson.example) + '</code></pre>' +
        '<div class="lesson-callout">' + escapeHtml(lesson.callout) + '</div></div>' +
        '<section class="quiz" aria-labelledby="quiz-heading"><h3 id="quiz-heading">Quick check</h3>' +
        '<p class="quiz-question">' + escapeHtml(lesson.quiz.question) + '</p><div class="quiz-options">' +
        lesson.quiz.options.map(function (option, index) {
          return '<button type="button" class="quiz-option" data-answer="' + index + '">' + escapeHtml(option) + '</button>';
        }).join('') + '</div><p class="quiz-feedback" id="quiz-feedback" aria-live="polite"></p></section>';
      Array.prototype.forEach.call(document.querySelectorAll('[data-lesson]'), function (button) {
        button.classList.toggle('is-current', Number(button.getAttribute('data-lesson')) === current);
      });
      var progress = document.getElementById('course-progress');
      progress.innerHTML = '<strong>' + completed.length + ' of ' + data.lessons.length + '</strong> lessons complete' +
        (progressWarning ? '<br>' + escapeHtml(progressWarning) : '');
    }

    document.querySelector('.lesson-list').addEventListener('click', function (event) {
      var button = event.target.closest('[data-lesson]');
      if (!button) return;
      current = Number(button.getAttribute('data-lesson'));
      renderLesson();
      window.scrollTo(0, 0);
    });
    document.getElementById('lesson-content').addEventListener('click', function (event) {
      var answerButton = event.target.closest('[data-answer]');
      if (!answerButton) return;
      var chosen = Number(answerButton.getAttribute('data-answer'));
      var correct = chosen === data.lessons[current].quiz.answer;
      Array.prototype.forEach.call(document.querySelectorAll('[data-answer]'), function (button) {
        button.disabled = true;
        if (Number(button.getAttribute('data-answer')) === data.lessons[current].quiz.answer) button.classList.add('is-right');
        else if (button === answerButton && !correct) button.classList.add('is-wrong');
      });
      var feedback = document.getElementById('quiz-feedback');
      feedback.className = 'quiz-feedback ' + (correct ? 'is-right' : 'is-wrong');
      feedback.textContent = correct ? data.lessons[current].quiz.explanation : 'Not quite. The highlighted answer is correct. ' + data.lessons[current].quiz.explanation;
      if (correct && completed.indexOf(current) === -1) {
        completed.push(current);
        saved[id] = completed;
        try {
          window.localStorage.setItem(progressKey, JSON.stringify(saved));
        } catch (error) {
          feedback.textContent += ' Your answer is correct; progress could not be saved in this browser.';
        }
        var pick = document.querySelector('[data-lesson="' + current + '"]');
        pick.classList.add('is-complete');
        pick.querySelector('.lesson-number').textContent = '✓';
        document.getElementById('course-progress').innerHTML = '<strong>' + completed.length + ' of ' + data.lessons.length + '</strong> lessons complete' +
          (progressWarning ? '<br>' + escapeHtml(progressWarning) : '');
      }
    });
    renderLesson();
  }

  if (grid) {
    renderCards();
    search.addEventListener('input', renderCards);
    document.querySelector('.filter-row').addEventListener('click', function (event) {
      var button = event.target.closest('[data-filter]');
      if (!button) return;
      activeFilter = button.getAttribute('data-filter');
      Array.prototype.forEach.call(document.querySelectorAll('[data-filter]'), function (filter) {
        var active = filter === button;
        filter.classList.toggle('is-active', active);
        filter.setAttribute('aria-pressed', String(active));
      });
      renderCards();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === '/' && document.activeElement !== search && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        event.preventDefault();
        search.focus();
      }
    });
  } else {
    renderCourse();
  }
})();
