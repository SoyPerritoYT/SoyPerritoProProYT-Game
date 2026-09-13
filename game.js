const dog = document.querySelector('#dog');
const field = document.querySelector('#playField');
const startCard = document.querySelector('#startCard');
const overCard = document.querySelector('#gameOverCard');
const bonesLabel = document.querySelector('#bones');
const bestLabel = document.querySelector('#best');
const finalScore = document.querySelector('#finalScore');
const toast = document.querySelector('#toast');
const soundButton = document.querySelector('#soundButton');

let active = false;
let score = 0;
let jumping = false;
let muted = false;
let speed = 5.2;
let spawnTimer;
let gamepadWasPressed = false;
let best = 0;

try { best = Number(localStorage.getItem('perrito-turbo-best') || 0); } catch { /* El juego también funciona sin almacenamiento. */ }
bestLabel.textContent = best;

function beep(tone = 440, duration = 0.07) {
  if (muted || !window.AudioContext) return;
  const audio = new AudioContext();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.frequency.value = tone;
  gain.gain.setValueAtTime(0.04, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}

function message(text) {
  toast.textContent = text;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 650);
}

function clearItems() {
  document.querySelectorAll('.obstacle,.collectible').forEach(item => item.remove());
}

function jump() {
  if (!active || jumping) return;
  jumping = true;
  beep(590);
  let startedAt;
  const animateJump = time => {
    if (!startedAt) startedAt = time;
    const progress = Math.min((time - startedAt) / 560, 1);
    dog.style.bottom = `${122 + Math.sin(progress * Math.PI) * 145}px`;
    if (progress < 1) requestAnimationFrame(animateJump);
    else {
      dog.style.bottom = '122px';
      jumping = false;
    }
  };
  requestAnimationFrame(animateJump);
}

function endGame() {
  if (!active) return;
  active = false;
  clearTimeout(spawnTimer);
  dog.classList.remove('running');
  clearItems();
  finalScore.textContent = score;
  best = Math.max(score, best);
  try { localStorage.setItem('perrito-turbo-best', best); } catch { /* Sin almacenamiento, muestra el récord de la sesión. */ }
  bestLabel.textContent = best;
  overCard.classList.remove('hidden');
  document.querySelector('#restartButton').focus();
  beep(150, 0.25);
}

function spawn() {
  if (!active) return;
  const item = document.createElement('div');
  const isBone = Math.random() > 0.42;
  item.className = isBone ? 'collectible' : 'obstacle';
  if (isBone) {
    item.textContent = '🦴';
    item.style.bottom = `${135 + Math.random() * 90}px`;
  }
  item.style.right = '-60px';
  field.append(item);
  let distance = -60;

  const move = () => {
    if (!active) { item.remove(); return; }
    distance += speed;
    item.style.transform = `translateX(${-distance}px)`;
    const dogRect = dog.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const collides = dogRect.left < itemRect.right - 8 && dogRect.right > itemRect.left + 8 && dogRect.top < itemRect.bottom - 7 && dogRect.bottom > itemRect.top + 7;
    if (collides) {
      if (isBone) {
        score += 1;
        bonesLabel.textContent = score;
        speed = Math.min(10, 5.2 + score * 0.18);
        message('+1 HUESITO');
        beep(820, 0.09);
        item.remove();
      } else endGame();
      return;
    }
    if (distance < field.clientWidth + 110) requestAnimationFrame(move);
    else item.remove();
  };

  requestAnimationFrame(move);
  const nextDelay = Math.max(620, 1320 - score * 22) + Math.random() * 580;
  spawnTimer = setTimeout(spawn, nextDelay);
}

function startGame() {
  clearTimeout(spawnTimer);
  clearItems();
  active = true;
  score = 0;
  speed = 5.2;
  bonesLabel.textContent = '0';
  startCard.classList.add('hidden');
  overCard.classList.add('hidden');
  dog.classList.add('running');
  field.focus();
  spawn();
}

function primaryAction() {
  if (active) jump();
  else if (!startCard.classList.contains('hidden') || !overCard.classList.contains('hidden')) startGame();
}

document.querySelector('#startButton').addEventListener('click', startGame);
document.querySelector('#restartButton').addEventListener('click', startGame);
document.addEventListener('keydown', event => {
  if (['Space', 'ArrowUp', 'Enter', 'NumpadEnter'].includes(event.code)) {
    event.preventDefault();
    primaryAction();
  }
});
field.addEventListener('pointerdown', event => {
  if (!event.target.closest('button')) primaryAction();
});
soundButton.addEventListener('click', () => {
  muted = !muted;
  soundButton.textContent = muted ? '🔇' : '🔊';
});

// Muchos mandos de TV se exponen como Gamepad; A, aceptar y flecha arriba saltan.
function watchGamepad() {
  const pad = navigator.getGamepads?.()[0];
  const pressed = Boolean(pad && (pad.buttons[0]?.pressed || pad.buttons[12]?.pressed));
  if (pressed && !gamepadWasPressed) primaryAction();
  gamepadWasPressed = pressed;
  requestAnimationFrame(watchGamepad);
}
requestAnimationFrame(watchGamepad);

setTimeout(() => document.querySelector('#startButton').focus(), 100);
