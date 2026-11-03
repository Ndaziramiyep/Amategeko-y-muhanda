(() => {
  const LETTERS = ["a", "b", "c", "d"];
  const STORE_KEY = "amategeko-quiz-progress";

  const $ = (id) => document.getElementById(id);
  const screens = { start: $("startScreen"), quiz: $("quizScreen"), result: $("resultScreen") };

  let order = [];      // indexes into QUESTIONS for this run
  let pos = 0;         // position in `order`
  let correct = 0;
  let wrong = [];      // indexes of questions answered wrong
  let answered = false;

  function show(name) {
    Object.values(screens).forEach((s) => s.classList.add("hidden"));
    screens[name].classList.remove("hidden");
    window.scrollTo(0, 0);
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
      localStorage.setItem(STORE_KEY, JSON.stringify({ order, pos: nextPos, correct, wrong }));
    } catch (e) { /* storage unavailable */ }
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }

  function clearSaved() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
  }

  function updateCounters() {
    $("correctCount").textContent = correct;
    $("wrongCount").textContent = wrong.length;
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
    updateCounters();
    show("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    answered = false;
    const q = QUESTIONS[order[pos]];

    $("progressText").textContent = `Question ${pos + 1} / ${order.length}`;
    const done = pos;
    $("percentText").textContent = done ? `${Math.round((correct / done) * 100)}% correct` : "";
    $("progressBar").style.width = `${(pos / order.length) * 100}%`;

    $("questionText").textContent = q.q;

    const imgs = $("questionImages");
    imgs.innerHTML = "";
    q.img.forEach((name) => imgs.appendChild(imageEl(name)));

    const opts = $("options");
    opts.innerHTML = "";
    q.o.forEach((opt, i) => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.type = "button";
      btn.dataset.index = i;

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
    next.textContent = pos === order.length - 1 ? "See results" : "Next →";
  }

  function choose(i) {
    if (answered) return;
    answered = true;

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
      fb.textContent = "✔ Ni byo! Correct answer.";
    } else {
      wrong.push(qi);
      const ans = q.o[q.a];
      fb.className = "feedback bad";
      fb.textContent = `✘ Si byo. The correct answer is ${LETTERS[q.a]})` + (ans.t ? ` ${ans.t}` : " (see the highlighted option)");
    }

    updateCounters();
    $("nextBtn").disabled = false;
    $("nextBtn").focus();
    save(pos + 1);
  }

  function next() {
    if (!answered) return;
    pos++;
    if (pos >= order.length) finish();
    else renderQuestion();
  }

  function finish() {
    clearSaved();
    const total = correct + wrong.length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    $("scoreText").textContent = `${correct} / ${total} (${pct}%)`;
    $("scoreDetail").textContent = total < order.length
      ? `You answered ${total} of ${order.length} questions. Wrong answers: ${wrong.length}.`
      : `Wrong answers: ${wrong.length}.`;
    $("reviewWrongBtn").classList.toggle("hidden", wrong.length === 0);
    $("progressBar").style.width = "100%";
    show("result");
  }

  function allIndexes() {
    const idx = QUESTIONS.map((_, i) => i);
    return $("shuffleToggle").checked ? shuffle(idx) : idx;
  }

  // Wire up
  $("totalQuestions").textContent = QUESTIONS.length;

  const saved = load();
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
    updateCounters();
    show("quiz");
    renderQuestion();
  });
  $("nextBtn").addEventListener("click", next);
  $("quitBtn").addEventListener("click", finish);
  $("restartBtn").addEventListener("click", () => {
    $("resumeBtn").classList.add("hidden");
    show("start");
  });
  $("reviewWrongBtn").addEventListener("click", () => startRun(shuffle(wrong.slice())));

  // Keyboard: a-d / 1-4 to answer, Enter to go next
  document.addEventListener("keydown", (e) => {
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
