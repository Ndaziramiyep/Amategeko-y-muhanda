(() => {
  const LETTERS = ["a", "b", "c", "d"];
  const STORE_KEY = "amategeko-quiz-progress";
  const THEME_KEY = "amategeko-theme";
  const QUIZ_LENGTH = 20;   // questions per quiz
  const TIME_LIMIT = 60;    // seconds per question
  const AUTO_NEXT_DELAY = 2000; // ms to show the answer after time runs out
  const TIMER_CIRCUMFERENCE = 2 * Math.PI * 52; // matches r="52" of #timerRing
  const SCORE_CIRCUMFERENCE = 2 * Math.PI * 68; // matches r="68" of #scoreRing
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (id) => document.getElementById(id);
  const screens = { start: $("startScreen"), quiz: $("quizScreen"), result: $("resultScreen") };

  let order = [];      // indexes into QUESTIONS for this run
  let pos = 0;         // position in `order`
  let correct = 0;
  let wrong = [];      // indexes of questions answered wrong
  let timedOut = 0;    // how many of the wrong ones ran out of time
  let answered = false;
  let timeLeft = TIME_LIMIT;
  let timerId = null;
  let autoNextId = null;

  function show(name) {
    Object.values(screens).forEach((s) => s.classList.add("hidden"));
    screens[name].classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }

  // Restart a CSS animation class on an element
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function save(nextPos) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ order, pos: nextPos, correct, wrong, timedOut }));
    } catch (e) { /* storage unavailable */ }
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }

  function clearSaved() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  }

  function updateCounters() {
    const c = $("correctCount"), w = $("wrongCount");
    if (c.textContent !== String(correct)) replay($("correctPill"), "bump");
    if (w.textContent !== String(wrong.length)) replay($("wrongPill"), "bump");
    c.textContent = correct;
    w.textContent = wrong.length;
  }

  function renderTimer() {
    const timer = $("timer");
    $("timerText").textContent = timeLeft;
    $("timerRing").style.strokeDashoffset = TIMER_CIRCUMFERENCE * (1 - timeLeft / TIME_LIMIT);
    timer.classList.toggle("warn", timeLeft <= 20 && timeLeft > 10);
    timer.classList.toggle("low", timeLeft <= 10);
  }

  function stopTimers() {
    clearInterval(timerId);
    clearTimeout(autoNextId);
    timerId = null;
    autoNextId = null;
  }

  function startTimer() {
    stopTimers();
    const timer = $("timer");
    timer.classList.remove("paused", "expired");
    timer.classList.add("refill"); // sweep the ring back to full instead of ticking
    timeLeft = TIME_LIMIT;
    renderTimer();
    timerId = setInterval(() => {
      timer.classList.remove("refill");
      timeLeft--;
      renderTimer();
      if (timeLeft <= 0) timeUp();
    }, 1000);
  }

  // Time ran out: submit with no answer, show the correct one, then move on
  function timeUp() {
    timedOut++;
    choose(-1);
    replay($("timer"), "expired");
    autoNextId = setTimeout(next, AUTO_NEXT_DELAY);
  }

  function imageEl(name) {
    const img = document.createElement("img");
    img.src = "images/" + name;
    img.alt = "Ishusho";
    img.loading = "lazy";
    return img;
  }

  function startRun(indexes) {
    order = indexes;
    pos = 0;
    correct = 0;
    wrong = [];
    timedOut = 0;
    updateCounters();
    show("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    answered = false;
    const q = QUESTIONS[order[pos]];

    $("progressText").textContent = `Ikibazo cya ${pos + 1} / ${order.length}`;
    const done = pos;
    $("percentText").textContent = done ? `Watsinze ${Math.round((correct / done) * 100)}%` : "";
    $("progressBar").style.width = `${(pos / order.length) * 100}%`;

    $("questionText").textContent = q.q;
    replay($("questionText"), "enter");

    const imgs = $("questionImages");
    imgs.innerHTML = "";
    q.img.forEach((name) => imgs.appendChild(imageEl(name)));
    replay(imgs, "enter");

    const opts = $("options");
    opts.innerHTML = "";
    q.o.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.type = "button";
      btn.dataset.index = i;
      btn.style.setProperty("--i", i);

      const letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = LETTERS[i];

      const body = document.createElement("span");
      body.className = "body";
      if (opt.t) body.appendChild(document.createTextNode(opt.t));
      opt.img.forEach((name) => body.appendChild(imageEl(name)));

      btn.append(letter, body);
      btn.addEventListener("click", () => choose(i));
      opts.appendChild(btn);
    });

    const fb = $("feedback");
    fb.className = "feedback hidden";
    fb.textContent = "";

    const next = $("nextBtn");
    next.disabled = true;
    next.textContent = pos === order.length - 1 ? "Reba amanota" : "Ibikurikira →";

    startTimer();
  }

  // i is the chosen option index, or -1 when time ran out
  function choose(i) {
    if (answered) return;
    answered = true;
    clearInterval(timerId);
    $("timer").classList.add("paused");

    const qi = order[pos];
    const q = QUESTIONS[qi];
    const buttons = $("options").querySelectorAll(".option");

    buttons.forEach((b, k) => {
      b.disabled = true;
      if (k === q.a) b.classList.add("correct");
      else if (k === i) b.classList.add("wrong");
      else b.classList.add("dim");
    });

    const fb = $("feedback");
    if (i === q.a) {
      correct++;
      fb.className = "feedback ok";
      fb.textContent = "✔ Ni byo! Igisubizo cyawe ni cyo.";
    } else {
      wrong.push(qi);
      const ans = q.o[q.a];
      fb.className = "feedback bad";
      const prefix = i === -1 ? "⏱ Igihe kirarangiye!" : "✘ Si byo.";
      fb.textContent = `${prefix} Igisubizo nyacyo ni ${LETTERS[q.a]})` + (ans.t ? ` ${ans.t}` : " (reba igisubizo kigaragara mu ibara ry'icyatsi)");
    }

    updateCounters();
    $("nextBtn").disabled = false;
    $("nextBtn").focus({ preventScroll: true });
    save(pos + 1);
  }

  function next() {
    if (!answered) return;
    stopTimers();
    pos++;
    if (pos >= order.length) finish();
    else renderQuestion();
  }

  function resultTitle(pct) {
    if (pct >= 90) return "Indashyikirwa! 🏆";
    if (pct >= 70) return "Wakoze neza cyane! 🎉";
    if (pct >= 50) return "Wagerageje neza 👍";
    return "Komeza witoze 💪";
  }

  function scoreColor(pct) {
    if (pct >= 70) return "var(--ok)";
    if (pct >= 50) return "var(--warn)";
    return "var(--bad)";
  }

  // Count a number up from 0 for a little drama on the results screen
  function countUp(el, to, suffix) {
    if (reducedMotion) { el.textContent = to + suffix; return; }
    const start = performance.now();
    const dur = 1200;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(to * eased) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function confetti() {
    if (reducedMotion) return;
    const box = $("confetti");
    const colors = ["#1f5eff", "#12a150", "#f08c00", "#d92d20", "#8a5cff", "#ffd23f"];
    for (let k = 0; k < 90; k++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[k % colors.length];
      p.style.animationDuration = 2.2 + Math.random() * 1.8 + "s";
      p.style.animationDelay = Math.random() * .6 + "s";
      p.style.setProperty("--dx", (Math.random() - .5) * 200 + "px");
      p.style.setProperty("--rot", (Math.random() > .5 ? 1 : -1) * (360 + Math.random() * 720) + "deg");
      box.appendChild(p);
    }
    setTimeout(() => { box.innerHTML = ""; }, 4800);
  }

  function finish() {
    stopTimers();
    clearSaved();
    const total = correct + wrong.length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    $("scoreText").textContent = `${correct} / ${total}`;
    $("resultTitle").textContent = resultTitle(pct);
    $("scoreDetail").textContent = total < order.length
      ? `Wasubije ibibazo ${total} kuri ${order.length}.`
      : `Wasubije ibibazo byose uko ari ${order.length}.`;
    $("statCorrect").textContent = correct;
    $("statWrong").textContent = wrong.length - timedOut;
    $("statTimeout").textContent = timedOut;
    $("reviewWrongBtn").classList.toggle("hidden", wrong.length === 0);
    $("progressBar").style.width = "100%";
    show("result");

    const ring = $("scoreRing");
    ring.style.setProperty("--score-color", scoreColor(pct));
    ring.style.transition = "none";
    ring.style.strokeDashoffset = SCORE_CIRCUMFERENCE;
    void ring.getBoundingClientRect();
    ring.style.transition = "";
    requestAnimationFrame(() => {
      ring.style.strokeDashoffset = SCORE_CIRCUMFERENCE * (1 - pct / 100);
    });
    countUp($("scorePct"), pct, "%");
    if (pct >= 70) confetti();
  }

  function allIndexes() {
    const idx = QUESTIONS.map((_, i) => i);
    return ($("shuffleToggle").checked ? shuffle(idx) : idx).slice(0, QUIZ_LENGTH);
  }

  // Wire up
  $("quizLength").textContent = Math.min(QUIZ_LENGTH, QUESTIONS.length);
  $("quizLengthRule").textContent = Math.min(QUIZ_LENGTH, QUESTIONS.length);
  $("timeLimit").textContent = TIME_LIMIT;
  $("totalQuestions").textContent = QUESTIONS.length;

  const saved = load();
  if (saved && Array.isArray(saved.order)) saved.order = saved.order.slice(0, QUIZ_LENGTH);
  if (saved && Array.isArray(saved.order) && saved.pos < saved.order.length) {
    $("resumeAt").textContent = saved.pos + 1;
    $("resumeBtn").classList.remove("hidden");
  }

  $("startBtn").addEventListener("click", () => startRun(allIndexes()));
  $("resumeBtn").addEventListener("click", () => {
    order = saved.order;
    pos = saved.pos;
    correct = saved.correct;
    wrong = saved.wrong;
    timedOut = saved.timedOut || 0;
    updateCounters();
    show("quiz");
    renderQuestion();
  });
  $("nextBtn").addEventListener("click", next);
  $("restartBtn").addEventListener("click", () => {
    $("resumeBtn").classList.add("hidden");
    show("start");
  });
  $("reviewWrongBtn").addEventListener("click", () => startRun(shuffle(wrong.slice())));

  // Light / dark theme switch (light is the default)
  function applyTheme(dark) {
    if (dark) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    const btn = $("themeToggle");
    const label = dark ? "Uburyo bw'urumuri" : "Uburyo bw'umwijima";
    btn.textContent = dark ? "☀️" : "🌙";
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }
  applyTheme(document.documentElement.dataset.theme === "dark");
  $("themeToggle").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme !== "dark";
    applyTheme(dark);
    replay($("themeToggle"), "spin");
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch (e) { /* ignore */ }
  });

  // Keyboard: a-d / 1-4 to answer, Enter to go next
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { $("lightbox").classList.add("hidden"); return; }
    if (screens.quiz.classList.contains("hidden")) return;
    const k = e.key.toLowerCase();
    const n = LETTERS.indexOf(k) !== -1 ? LETTERS.indexOf(k) : ["1", "2", "3", "4"].indexOf(k);
    if (n !== -1 && !answered) choose(n);
    else if (k === "enter" && answered) { e.preventDefault(); next(); }
  });

  // Click an image to enlarge it
  const lightbox = $("lightbox");
  document.addEventListener("click", (e) => {
    if (e.target.matches(".q-images img")) {
      lightbox.querySelector("img").src = e.target.src;
      lightbox.classList.remove("hidden");
    }
  });
  lightbox.addEventListener("click", () => lightbox.classList.add("hidden"));
})();
