/* Treino para o Concurso — lógica do teste (HTML + JS simples, sem dependências). */
(function () {
  'use strict';

  var STORAGE_KEY = 'upcb_teste_v130';
  var LETTERS = ['A', 'B', 'C', 'D'];
  var QUESTIONS = Array.isArray(window.QUESTIONS) ? window.QUESTIONS : [];
  var BY_N = {};
  QUESTIONS.forEach(function (q) { BY_N[q.n] = q; });

  /* Secções pela ordem em que aparecem nos dados. */
  var SECTIONS = [];
  var SECTION_COUNT = {};
  QUESTIONS.forEach(function (q) {
    if (!(q.section in SECTION_COUNT)) { SECTIONS.push(q.section); SECTION_COUNT[q.section] = 0; }
    SECTION_COUNT[q.section]++;
  });

  /* ---------- Armazenamento (sempre protegido com try/catch) ---------- */
  var storageOk = true;
  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { storageOk = false; return null; }
  }
  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { storageOk = false; }
  }
  function clearStorage() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { storageOk = false; }
  }

  /*
   * state.session: o teste em curso { type, section, label, order:[n], pos, answers:{n:letra}, finished }
   * state.wrong:   números das perguntas cuja última resposta (em qualquer modo) foi errada
   * state.theme:   'light' | 'dark' | null (segue o sistema)
   */
  function freshState() { return { session: null, wrong: [], theme: null }; }
  var state = sanitize(load());

  function sanitize(s) {
    var out = freshState();
    if (!s || typeof s !== 'object') return out;
    if (s.theme === 'light' || s.theme === 'dark') out.theme = s.theme;
    if (Array.isArray(s.wrong)) out.wrong = s.wrong.filter(function (n) { return BY_N[n]; });
    var ss = s.session;
    if (ss && Array.isArray(ss.order)) {
      var order = ss.order.filter(function (n) { return BY_N[n]; });
      if (order.length) {
        var answers = {};
        if (ss.answers && typeof ss.answers === 'object') {
          Object.keys(ss.answers).forEach(function (k) {
            if (BY_N[k] && LETTERS.indexOf(ss.answers[k]) !== -1) answers[k] = ss.answers[k];
          });
        }
        var pos = parseInt(ss.pos, 10);
        out.session = {
          type: String(ss.type || 'all'),
          section: ss.section || null,
          label: String(ss.label || 'Todas as perguntas'),
          order: order,
          pos: isNaN(pos) ? 0 : Math.max(0, Math.min(order.length - 1, pos)),
          answers: answers,
          finished: !!ss.finished
        };
      }
    }
    return out;
  }

  /* ---------- Utilitários ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  function isCorrect(n, letter) { return BY_N[n] && BY_N[n].correct === letter; }

  function setWrong(n, wrong) {
    var i = state.wrong.indexOf(n);
    if (wrong && i === -1) state.wrong.push(n);
    if (!wrong && i !== -1) state.wrong.splice(i, 1);
  }

  /* ---------- Ecrãs ---------- */
  var screens = { start: $('screen-start'), quiz: $('screen-quiz'), results: $('screen-results') };
  var current = 'start';
  function show(name) {
    current = name;
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
    $('score').hidden = name !== 'quiz';
    window.scrollTo(0, 0);
  }

  /* ---------- Ecrã inicial ---------- */
  function renderStart() {
    var total = QUESTIONS.length;
    var title = 'Treino para o Concurso: ' + total + ' perguntas';
    $('start-title').textContent = title;
    document.title = title;
    $('all-desc').textContent = 'Da 1 à ' + total + ', por ordem';

    var tbody = $('sections-body');
    tbody.textContent = '';
    var select = $('section-select');
    select.textContent = '';
    SECTIONS.forEach(function (s, i) {
      var tr = el('tr');
      tr.appendChild(el('td', null, s));
      tr.appendChild(el('td', 'num', String(SECTION_COUNT[s])));
      tbody.appendChild(tr);
      var opt = el('option', null, s + ' (' + SECTION_COUNT[s] + ')');
      opt.value = String(i);
      select.appendChild(opt);
    });
    $('sections-total').textContent = String(total);

    var nWrong = state.wrong.length;
    var wrongBtn = $('mode-wrong');
    wrongBtn.disabled = nWrong === 0;
    $('wrong-desc').textContent = nWrong
      ? plural(nWrong, 'pergunta errada', 'perguntas erradas') + ' para rever'
      : 'Ainda não falhou nenhuma pergunta';

    var ss = state.session;
    var contBtn = $('mode-continue');
    if (ss) {
      var answered = Object.keys(ss.answers).length;
      contBtn.hidden = false;
      $('continue-desc').textContent = ss.label + ' · pergunta ' + (ss.pos + 1) + ' de ' + ss.order.length +
        ' · ' + plural(answered, 'respondida', 'respondidas');
    } else {
      contBtn.hidden = true;
    }

    $('storage-hint').textContent = storageOk
      ? 'O progresso é guardado automaticamente neste navegador.'
      : 'Não é possível guardar o progresso neste navegador; o teste funciona na mesma.';
  }

  /* ---------- Sessões ---------- */
  function startSession(type, opts) {
    opts = opts || {};
    var order, label, section = null;
    if (type === 'section') {
      section = opts.section;
      order = QUESTIONS.filter(function (q) { return q.section === section; }).map(function (q) { return q.n; });
      label = section;
    } else if (type === 'random') {
      order = shuffle(QUESTIONS.map(function (q) { return q.n; }));
      label = 'Aleatório';
    } else if (type === 'wrong') {
      order = (opts.order || state.wrong).slice().sort(function (a, b) { return a - b; });
      label = opts.label || 'Só as que falhei';
    } else {
      type = 'all';
      order = QUESTIONS.map(function (q) { return q.n; });
      label = 'Todas as perguntas';
    }
    if (!order.length) return;
    state.session = { type: type, section: section, label: label, order: order, pos: 0, answers: {}, finished: false };
    save();
    openQuiz();
  }

  function openQuiz() {
    show('quiz');
    renderQuestion();
    $('main').focus({ preventScroll: true });
  }

  /* ---------- Pergunta ---------- */
  function renderScore() {
    var ss = state.session;
    var answered = 0, correct = 0;
    Object.keys(ss.answers).forEach(function (n) {
      answered++;
      if (isCorrect(+n, ss.answers[n])) correct++;
    });
    var wrong = answered - correct;
    $('score-answered').textContent = answered + '/' + ss.order.length;
    $('score-correct').textContent = String(correct);
    $('score-wrong').textContent = String(wrong);
    $('score-pct').textContent = pct(correct, answered) + '%';
    $('score').setAttribute('aria-label',
      'Respondidas ' + answered + ' de ' + ss.order.length + ', certas ' + correct + ', erradas ' + wrong +
      ', ' + pct(correct, answered) + ' por cento de acerto');
  }

  function renderQuestion() {
    var ss = state.session;
    var n = ss.order[ss.pos];
    var q = BY_N[n];
    var total = ss.order.length;
    var chosen = ss.answers[n] || null;

    $('q-counter').textContent = 'Pergunta ' + (ss.pos + 1) + ' de ' + total;
    $('q-section').textContent = q.section + ' · n.º ' + q.n;
    var p = pct(ss.pos + 1, total);
    $('progress-bar').style.width = p + '%';
    var prog = $('progress');
    prog.setAttribute('aria-valuenow', String(p));
    prog.setAttribute('aria-valuetext', 'Pergunta ' + (ss.pos + 1) + ' de ' + total);

    $('q-text').textContent = q.question;

    var box = $('q-options');
    box.textContent = '';
    q.options.forEach(function (text, i) {
      var letter = LETTERS[i];
      var b = el('button', 'option');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.dataset.letter = letter;
      b.setAttribute('aria-checked', chosen === letter ? 'true' : 'false');
      b.appendChild(el('span', 'option__letter', letter + ')'));
      var t = el('span', 'option__text', text);
      b.appendChild(t);
      var mark = el('span', 'option__mark');
      mark.setAttribute('aria-hidden', 'true');
      b.appendChild(mark);
      var label = 'Opção ' + letter + ': ' + text;

      if (chosen) {
        b.setAttribute('aria-disabled', 'true');
        if (letter === q.correct) {
          b.classList.add('option--correct');
          mark.textContent = '✓';
          t.appendChild(el('span', 'option__status', letter === chosen ? 'A sua resposta — correta' : 'Resposta correta'));
          label += letter === chosen ? '. A sua resposta, correta.' : '. Resposta correta.';
        } else if (letter === chosen) {
          b.classList.add('option--wrong');
          mark.textContent = '✗';
          t.appendChild(el('span', 'option__status', 'A sua resposta — errada'));
          label += '. A sua resposta, errada.';
        } else {
          b.classList.add('option--dim');
        }
      }
      b.setAttribute('aria-label', label);
      b.tabIndex = (chosen ? letter === chosen : i === 0) ? 0 : -1;
      b.addEventListener('click', function () { answer(letter); });
      box.appendChild(b);
    });

    renderFeedback(q, chosen);

    $('btn-prev').disabled = ss.pos === 0;
    var next = $('btn-next');
    var last = ss.pos === total - 1;
    next.innerHTML = '';
    next.appendChild(document.createTextNode(last ? 'Ver resultado ' : 'Seguinte '));
    var arr = el('span', null, '→'); arr.setAttribute('aria-hidden', 'true');
    next.appendChild(arr);

    renderScore();
    renderJumpGrid();
  }

  function renderFeedback(q, chosen) {
    var fb = $('feedback');
    var exp = $('explanation');
    fb.className = 'feedback';
    if (!chosen) {
      fb.textContent = '';
      exp.hidden = true;
      return;
    }
    var ok = chosen === q.correct;
    var correctText = q.options[LETTERS.indexOf(q.correct)];
    fb.textContent = '';
    fb.classList.add(ok ? 'feedback--ok' : 'feedback--bad');
    fb.appendChild(document.createTextNode(ok ? '✓ Correto!' : '✗ Errado'));
    if (!ok) {
      fb.appendChild(el('span', 'feedback__sub', 'A resposta correta é a ' + q.correct + ') ' + correctText));
    }
    $('explanation-text').textContent = q.explanation;
    exp.hidden = false;
  }

  function answer(letter) {
    var ss = state.session;
    var n = ss.order[ss.pos];
    if (ss.answers[n]) return; // pergunta já bloqueada
    ss.answers[n] = letter;
    setWrong(n, !isCorrect(n, letter));
    save();
    renderQuestion();
    // Manter o foco na opção escolhida para quem usa teclado.
    var btn = $('q-options').querySelector('[data-letter="' + letter + '"]');
    if (btn) btn.focus({ preventScroll: true });
    var exp = $('explanation');
    if (exp && exp.scrollIntoView) {
      var r = exp.getBoundingClientRect();
      if (r.bottom > window.innerHeight) exp.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function go(pos) {
    var ss = state.session;
    if (pos < 0 || pos >= ss.order.length) return;
    ss.pos = pos;
    save();
    renderQuestion();
    window.scrollTo(0, 0);
  }
  function next() {
    var ss = state.session;
    if (ss.pos >= ss.order.length - 1) { showResults(); return; }
    go(ss.pos + 1);
  }
  function prev() { go(state.session.pos - 1); }

  /* ---------- Grelha de navegação ---------- */
  function renderJumpGrid() {
    var ss = state.session;
    var grid = $('jump-grid');
    grid.textContent = '';
    ss.order.forEach(function (n, i) {
      var b = el('button', 'jump__btn');
      b.type = 'button';
      var a = ss.answers[n];
      var status = 'por responder';
      b.appendChild(document.createTextNode(String(i + 1)));
      if (a) {
        var ok = isCorrect(n, a);
        status = ok ? 'correta' : 'errada';
        b.classList.add(ok ? 'jump__btn--ok' : 'jump__btn--bad');
        var s = el('small', null, ok ? '✓' : '✗');
        s.setAttribute('aria-hidden', 'true');
        b.appendChild(s);
      }
      if (i === ss.pos) b.setAttribute('aria-current', 'true');
      b.setAttribute('aria-label', 'Pergunta ' + (i + 1) + ', ' + status + (i === ss.pos ? ', atual' : ''));
      b.addEventListener('click', function () { go(i); $('q-text').scrollIntoView({ block: 'center' }); });
      grid.appendChild(b);
    });
  }

  /* ---------- Resultados ---------- */
  function showResults() {
    var ss = state.session;
    ss.finished = true;
    save();
    var total = ss.order.length;
    var correct = 0, answered = 0;
    var perSection = {};
    var wrongList = [];
    ss.order.forEach(function (n, i) {
      var q = BY_N[n];
      if (!perSection[q.section]) perSection[q.section] = { total: 0, correct: 0 };
      perSection[q.section].total++;
      var a = ss.answers[n];
      if (a) {
        answered++;
        if (a === q.correct) { correct++; perSection[q.section].correct++; }
        else wrongList.push({ pos: i, q: q, chosen: a });
      }
    });

    $('r-score').textContent = correct + ' / ' + total;
    $('r-pct').textContent = pct(correct, total) + '%';
    var unanswered = total - answered;
    $('r-detail').textContent = ss.label + ' · ' + plural(correct, 'certa', 'certas') + ', ' +
      plural(wrongList.length, 'errada', 'erradas') + (unanswered ? ', ' + plural(unanswered, 'por responder', 'por responder') : '');

    var tb = $('r-sections');
    tb.textContent = '';
    SECTIONS.forEach(function (s) {
      var d = perSection[s];
      if (!d) return;
      var tr = el('tr');
      tr.appendChild(el('td', null, s));
      tr.appendChild(el('td', 'num', d.correct + ' / ' + d.total));
      tr.appendChild(el('td', 'num', pct(d.correct, d.total) + '%'));
      tb.appendChild(tr);
    });

    var ul = $('r-wrong');
    ul.textContent = '';
    $('r-wrong-title').textContent = 'Perguntas erradas (' + wrongList.length + ')';
    if (!wrongList.length) {
      ul.appendChild(el('li', null, answered ? 'Nenhuma pergunta errada. Muito bem!' : 'Não respondeu a nenhuma pergunta.'));
    }
    wrongList.forEach(function (w) {
      var li = el('li');
      var a = el('a', null, 'Pergunta ' + (w.pos + 1) + ' (n.º ' + w.q.n + ') — rever');
      a.href = '#';
      a.addEventListener('click', function (e) { e.preventDefault(); state.session.pos = w.pos; save(); openQuiz(); });
      li.appendChild(a);
      li.appendChild(el('span', 'wl-q', w.q.question));
      li.appendChild(el('span', 'wl-meta', '✗ A sua resposta: ' + w.chosen + ') · ✓ Correta: ' + w.q.correct + ') ' +
        w.q.options[LETTERS.indexOf(w.q.correct)]));
      ul.appendChild(li);
    });

    var rev = $('r-review');
    rev.disabled = wrongList.length === 0;
    rev.onclick = function () {
      startSession('wrong', { order: wrongList.map(function (w) { return w.q.n; }), label: 'Rever as erradas' });
    };
    show('results');
    $('main').focus({ preventScroll: true });
  }

  /* ---------- Tema ---------- */
  function effectiveTheme() {
    if (state.theme) return state.theme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme() {
    if (state.theme) document.documentElement.setAttribute('data-theme', state.theme);
    else document.documentElement.removeAttribute('data-theme');
    var dark = effectiveTheme() === 'dark';
    $('theme-icon').textContent = dark ? '☀' : '☾';
    $('theme-toggle').setAttribute('aria-label', dark ? 'Mudar para tema claro' : 'Mudar para tema escuro');
  }

  /* ---------- Eventos ---------- */
  $('mode-all').addEventListener('click', function () { startSession('all'); });
  $('mode-random').addEventListener('click', function () { startSession('random'); });
  $('mode-wrong').addEventListener('click', function () { if (state.wrong.length) startSession('wrong'); });
  $('mode-section').addEventListener('click', function () {
    var s = SECTIONS[parseInt($('section-select').value, 10)];
    if (s) startSession('section', { section: s });
  });
  $('mode-continue').addEventListener('click', function () { if (state.session) openQuiz(); });
  $('reset-all').addEventListener('click', function () {
    if (!window.confirm('Apagar todo o progresso guardado (respostas e perguntas erradas)? Esta ação não pode ser desfeita.')) return;
    var theme = state.theme;
    clearStorage();
    state = freshState();
    state.theme = theme;
    if (theme) save();
    renderStart();
  });

  $('btn-prev').addEventListener('click', prev);
  $('btn-next').addEventListener('click', next);
  $('btn-home').addEventListener('click', goHome);
  $('r-home').addEventListener('click', goHome);
  $('r-restart').addEventListener('click', function () {
    var ss = state.session;
    if (ss.type === 'wrong') {
      startSession('wrong', { order: ss.order, label: ss.label });
    } else {
      startSession(ss.type, { section: ss.section });
    }
  });
  function goHome() { renderStart(); show('start'); }

  $('theme-toggle').addEventListener('click', function () {
    state.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
    save();
    applyTheme();
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () { if (!state.theme) applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
  }

  document.addEventListener('keydown', function (e) {
    if (current !== 'quiz' || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    var tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    var ss = state.session;
    var n = ss.order[ss.pos];
    var answered = !!ss.answers[n];
    var key = e.key;
    var isOption = t && t.classList && t.classList.contains('option');

    var idx = -1;
    if (/^[1-4]$/.test(key)) idx = +key - 1;
    else if (/^[a-dA-D]$/.test(key)) idx = LETTERS.indexOf(key.toUpperCase());
    if (idx !== -1) {
      e.preventDefault();
      answer(LETTERS[idx]);
      return;
    }

    if (key === 'Enter') {
      // Enter num botão (que não seja opção) ou no resumo da grelha: comportamento normal.
      if ((tag === 'BUTTON' && !isOption) || tag === 'SUMMARY' || tag === 'A') return;
      if (isOption && !answered) return; // Enter numa opção = escolher essa opção
      e.preventDefault();
      next();
    } else if (key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    } else if ((key === 'ArrowDown' || key === 'ArrowUp') && isOption) {
      // Navegação dentro do grupo de opções (padrão radiogroup).
      e.preventDefault();
      var opts = Array.prototype.slice.call($('q-options').querySelectorAll('.option'));
      var i = opts.indexOf(t);
      var j = (i + (key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length;
      opts[j].focus();
    }
  });

  /* ---------- Arranque ---------- */
  applyTheme();
  renderStart();
  show('start');
  save(); // testa se o armazenamento está disponível
  if (!storageOk) renderStart();
})();
