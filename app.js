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

})();
