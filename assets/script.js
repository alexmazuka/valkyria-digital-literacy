// ===== Українська Валькірія — інтерактивна лекція =====
const LS = 'valkyria_v1';
const store = JSON.parse(localStorage.getItem(LS) || '{}');
const save = () => localStorage.setItem(LS, JSON.stringify(store));

// ---- scroll progress + active TOC ----
const bar = document.getElementById('scroll-progress');
const tocLinks = [...document.querySelectorAll('.toc-link')];
const sections = tocLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

function onScroll(){
  const h = document.documentElement;
  const p = (h.scrollTop) / (h.scrollHeight - h.clientHeight);
  bar.style.width = Math.min(100, p * 100) + '%';
  let cur = sections[0];
  for (const s of sections){ if (s.getBoundingClientRect().top <= 140) cur = s; }
  tocLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + cur.id));
}
document.addEventListener('scroll', onScroll, {passive:true});
onScroll();

// ---- mobile menu ----
const sb = document.getElementById('sidebar');
document.getElementById('menu-toggle').onclick = () => sb.classList.toggle('open');
tocLinks.forEach(a => a.addEventListener('click', () => sb.classList.remove('open')));

// ---- progress tracking ----
const exercises = [...document.querySelectorAll('.exercise')];
const totalEl = document.getElementById('progress-total');
const countEl = document.getElementById('progress-count');
const fillEl = document.getElementById('progress-fill');
totalEl.textContent = exercises.length;
store.done = store.done || {};

function markDone(id){
  store.done[id] = true; save(); refreshProgress();
  const ex = document.querySelector(`.exercise[data-ex="${id}"]`);
  if (ex) ex.classList.add('done');
}
function refreshProgress(){
  const n = Object.keys(store.done).filter(k => store.done[k]).length;
  countEl.textContent = n;
  fillEl.style.width = (n / exercises.length * 100) + '%';
}
exercises.forEach(ex => { if (store.done[ex.dataset.ex]) ex.classList.add('done'); });
refreshProgress();

// ---- poll (warmup) ----
document.querySelectorAll('.poll').forEach(poll => {
  const ex = poll.closest('.exercise');
  poll.querySelectorAll('.poll-opt').forEach(btn => {
    btn.onclick = () => {
      poll.querySelectorAll('.poll-opt').forEach(b => b.classList.add('disabled'));
      btn.style.borderColor = 'var(--gold)';
      btn.style.background = 'var(--blue-soft)';
      ex.querySelector('.ex-feedback').hidden = false;
      markDone(ex.dataset.ex);
    };
  });
});

// ---- quizzes ----
document.querySelectorAll('.quiz').forEach(quiz => {
  const ex = quiz.closest('.exercise');
  const correct = quiz.dataset.correct;
  const fb = ex.querySelector('.ex-feedback');
  quiz.querySelectorAll('.quiz-opt').forEach(btn => {
    btn.onclick = () => {
      const k = btn.dataset.k;
      quiz.querySelectorAll('.quiz-opt').forEach(b => b.classList.add('disabled'));
      if (k === correct){
        btn.classList.add('correct');
        fb.textContent = '✅ Правильно! Чудова робота.';
        fb.classList.remove('bad');
        markDone(ex.dataset.ex);
      } else {
        btn.classList.add('wrong');
        quiz.querySelector(`.quiz-opt[data-k="${correct}"]`).classList.add('correct');
        fb.textContent = '❌ Не зовсім. Правильну відповідь підсвічено зеленим — прочитайте ще раз.';
        fb.classList.add('bad');
        markDone(ex.dataset.ex); // зарахуємо спробу
      }
      fb.hidden = false;
    };
  });
});

// ---- checklists (persisted) ----
document.querySelectorAll('.checklist').forEach(list => {
  const key = list.dataset.key;
  store[key] = store[key] || [];
  const ex = list.closest('.exercise');
  const boxes = [...list.querySelectorAll('input')];
  boxes.forEach((box, i) => {
    box.checked = !!store[key][i];
    box.onchange = () => {
      store[key][i] = box.checked; save();
      if (boxes.every(b => b.checked)){
        markDone(ex.dataset.ex);
        const fb = ex.querySelector('.ex-feedback');
        if (fb) fb.hidden = false;
      }
    };
  });
  if (boxes.length && boxes.every(b => b.checked)) markDone(ex.dataset.ex);
});

// ---- signature simulator ----
const sim = document.getElementById('sim-sign');
if (sim){
  const ex = sim.closest('.exercise');
  const steps = [...sim.querySelectorAll('.sim-step')];
  const restart = sim.querySelector('.sim-restart');
  let cur = 0;
  const show = i => steps.forEach((s,k) => s.hidden = k !== i);
  sim.querySelectorAll('[data-next]').forEach(btn => {
    btn.onclick = () => {
      // на кроці з пін-кодом вимагаємо 5 цифр (як у справжньому Дія.Підписі)
      const pin = steps[cur].querySelector('.pin-in');
      if (pin && pin.value.replace(/\D/g,'').length < 5){ pin.style.borderColor = 'var(--err)'; return; }
      cur++;
      show(cur);
      if (cur === steps.length - 1){ restart.hidden = false; markDone(ex.dataset.ex); }
    };
  });
  restart.onclick = () => { cur = 0; show(0); restart.hidden = true;
    const pin = sim.querySelector('.pin-in'); if (pin) pin.value = ''; };
}

// ---- reflection ----
const rInput = document.getElementById('reflect-input');
const rBtn = document.getElementById('reflect-save');
const rFb = document.getElementById('reflect-fb');
if (rInput){
  rInput.value = store.reflect || '';
  rBtn.onclick = () => {
    store.reflect = rInput.value; save();
    rFb.hidden = rInput.value.trim() === '';
    if (rInput.value.trim()) markDone('reflect');
  };
}

// ---- lesson timer (60 min) ----
(() => {
  const disp = document.getElementById('timer');
  const TOTAL = 60 * 60;
  let sec = store.timer || 0, running = false, iv = null;
  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const render = () => disp.textContent = `${fmt(sec)} / 60:00`;
  const tick = () => { sec++; if (sec>=TOTAL){sec=TOTAL;stop();} if(sec%5===0){store.timer=sec;save();} render(); };
  const stop = () => { running=false; clearInterval(iv); store.timer=sec; save(); };
  document.getElementById('timer-start').onclick = () => { if(!running){running=true; iv=setInterval(tick,1000);} };
  document.getElementById('timer-pause').onclick = stop;
  document.getElementById('timer-reset').onclick = () => { stop(); sec=0; store.timer=0; save(); render(); };
  render();
})();
