import { fetchTopScores, submitScore } from './api.js';
export const API_BASE = 'https://runnerjs-api.onrender.com';

// ---- DOM -------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');
const overlay = document.getElementById('overlay');
const finalInfo = document.getElementById('final-info');
const restartBtn = document.getElementById('restart-btn');
const overlayRestart = document.getElementById('overlay-restart');
const pauseBtn = document.getElementById('pause-btn');
const saveForm = document.getElementById('save-form');
const nameInput = document.getElementById('player-name');
const leaderList = document.getElementById('leader-list');

const bgFile = document.getElementById('bg-file');
const bgUrl = document.getElementById('bg-url');
const bgClear = document.getElementById('bg-clear');
const bgFitRadios = document.querySelectorAll('input[name="bgFit"]');

// ---- Config ----------------------------------------------------
const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
const BASE_W = 960;
const BASE_H = 320;

const GROUND_Y = 260;       // línea de suelo (en coordenadas de canvas)
const GRAVITY = 0.6;
const JUMP_VELOCITY = -11;
const PLAYER = { w: 40, h: 34 }; // montacargas
const CHASER_X = 10;        // posición de la señora
const SKY = ['#0b1120', '#0f172a'];

// ---- Estado ----------------------------------------------------
let state;
let last = 0;
let backgroundImg = null;
let bgFit = localStorage.getItem('runner:bgFit') || 'cover';
let paused = false;

// ---- Utiles ----------------------------------------------------
function rand(a, b){ return a + Math.random() * (b - a); }
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function aabb(a, b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function lerp(a,b,t){ return a + (b-a)*t; }

// ---- Responsive canvas (HiDPI) --------------------------------
function resize(){
  const maxW = BASE_W;
  const desiredW = Math.min(maxW, canvas.parentElement.clientWidth - 2);
  const scale = desiredW / BASE_W;

  canvas.style.width = `${Math.round(BASE_W * scale)}px`;
  canvas.style.height = `${Math.round(BASE_H * scale)}px`;

  canvas.width = Math.round(BASE_W * DPR);
  canvas.height = Math.round(BASE_H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
addEventListener('resize', resize);

// ---- Sprites dibujados por código ------------------------------
// Montacargas (señor conduciendo)
function drawForklift(x, y, t){
  ctx.save();
  ctx.translate(x, y);

  // sombra
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(PLAYER.w*0.5, PLAYER.h+6, PLAYER.w*0.5, 6, 0, 0, Math.PI*2);
  ctx.fill();

  // ruedas
  const bounce = Math.sin(t*0.015) * 1.2;
  ctx.fillStyle = '#1f2937';
  ctx.beginPath(); ctx.arc(10, PLAYER.h-2+bounce, 8, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(PLAYER.w-8, PLAYER.h-2-bounce, 10, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(10, PLAYER.h-2+bounce, 5, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(PLAYER.w-8, PLAYER.h-2-bounce, 7, 0, Math.PI*2); ctx.stroke();

  // base
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(2, PLAYER.h-16, PLAYER.w-4, 12);
  // mástil
  ctx.fillStyle = '#93c5fd';
  ctx.fillRect(PLAYER.w-6, 4, 4, PLAYER.h-20);
  // horquillas
  ctx.fillStyle = '#60a5fa';
  ctx.fillRect(PLAYER.w-18, PLAYER.h-12, 22, 3);

  // cabina y “señor”
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(6, 6, 26, 18);
  // señor (cabeza)
  ctx.fillStyle = '#fcd34d';
  ctx.beginPath(); ctx.arc(16, 14, 5, 0, Math.PI*2); ctx.fill();
  // brazo
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(18,18); ctx.lineTo(26,20); ctx.stroke();

  ctx.restore();
}

// Señora enojada que persigue
function drawAngryLady(x, y, t){
  ctx.save();
  ctx.translate(x, y);

  const pace = Math.sin(t*0.02) * 2;
  // sombra
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath(); ctx.ellipse(16, 36, 14, 5, 0, 0, Math.PI*2); ctx.fill();

  // falda
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(6, 34); ctx.lineTo(26, 34); ctx.lineTo(20, 22); ctx.lineTo(12, 22); ctx.closePath(); ctx.fill();

  // torso
  ctx.fillStyle = '#eab308';
  ctx.fillRect(12, 12+pace*0.2, 10, 12);

  // cabeza
  ctx.fillStyle = '#fde68a';
  ctx.beginPath(); ctx.arc(17, 8+pace*0.3, 6, 0, Math.PI*2); ctx.fill();

  // cejas/enojo
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(13,7); ctx.lineTo(15,6); ctx.moveTo(19,6); ctx.lineTo(21,7); ctx.stroke();

  // brazo levantado
  ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(12,16); ctx.lineTo(6, 10+pace); ctx.stroke();

  ctx.restore();
}

// Caja/obstáculo
function drawBox(x, y, w, h){
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#ad7300'; ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, w, h);
  // cinta
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(4, 3, w-8, 4);
  // marca
  ctx.strokeStyle = '#92400e';
  ctx.strokeRect(6, 10, w-12, h-16);
  ctx.restore();
}

// Parallax: nubes y siluetas
function drawParallax(t, speed){
  // cielo de gradiente
  const g = ctx.createLinearGradient(0,0,0,BASE_H);
  g.addColorStop(0, SKY[0]);
  g.addColorStop(1, SKY[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,BASE_W,BASE_H);

  // imagen de fondo opcional
  if (backgroundImg){
    if (bgFit === 'repeat'){
      const pat = ctx.createPattern(backgroundImg, 'repeat');
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = pat;
      ctx.translate(-(t*0.02)%backgroundImg.width, 0);
      ctx.fillRect(-backgroundImg.width, 0, BASE_W+backgroundImg.width*2, BASE_H);
      ctx.restore();
    } else {
      // cover/contain manual
      const iw = backgroundImg.width, ih = backgroundImg.height;
      const cw = BASE_W, ch = BASE_H;
      const s = bgFit === 'cover' ? Math.max(cw/iw, ch/ih) : Math.min(cw/iw, ch/ih);
      const dw = iw*s, dh = ih*s;
      const dx = (cw - dw)/2, dy = (ch - dh)/2;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.drawImage(backgroundImg, dx, dy, dw, dh);
      ctx.restore();
    }
  }

  // siluetas almacén (lejana)
  ctx.save();
  ctx.globalAlpha = .25;
  ctx.fillStyle = '#1e293b';
  const offset1 = -((t*0.03) % (BASE_W*2));
  for(let i=-2;i<3;i++){
    const x = i*BASE_W*2 + offset1;
    ctx.fillRect(x+80, BASE_H-120, 260, 100);
    ctx.fillRect(x+370, BASE_H-160, 220, 140);
    ctx.fillRect(x+620, BASE_H-140, 280, 120);
  }
  ctx.restore();

  // nubes
  ctx.save();
  ctx.globalAlpha = .5;
  ctx.fillStyle = '#e5e7eb';
  const offset2 = -((t*0.06) % (BASE_W+200));
  for(let i=0;i<4;i++){
    const cx = offset2 + i*260;
    cloud(cx, 60 + (i%2)*14);
  }
  ctx.restore();
}
function cloud(x,y){
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI*2);
  ctx.arc(x+16, y+4, 18, 0, Math.PI*2);
  ctx.arc(x+34, y, 14, 0, Math.PI*2);
  ctx.fill();
}

// suelo y polvo
function drawGround(t){
  // línea de suelo
  ctx.fillStyle = '#172036';
  ctx.fillRect(0, GROUND_Y + 28, BASE_W, 4);

  // textura
  ctx.save();
  ctx.globalAlpha = .25;
  ctx.fillStyle = '#0f172a';
  const off = -((t*0.2) % 40);
  for(let x=off-40; x<BASE_W+40; x+=40){
    ctx.fillRect(x, GROUND_Y+32, 28, 6);
  }
  ctx.restore();
}

// partículas de polvo
function spawnDust(x, y){
  for(let i=0;i<3;i++){
    state.particles.push({
      x: x + rand(-3, 3),
      y: y + rand(-2, 1),
      vx: rand(-0.4, 0.6),
      vy: rand(-1.2, -0.2),
      life: rand(200, 450),
      t: 0
    });
  }
}
function drawParticles(dt){
  for(const p of state.particles){
    p.t += dt;
    p.x += p.vx * (dt/16);
    p.y += p.vy * (dt/16);
  }
  state.particles = state.particles.filter(p => p.t < p.life);
  ctx.save();
  ctx.globalAlpha = .35;
  ctx.fillStyle = '#94a3b8';
  for(const p of state.particles){
    ctx.fillRect(p.x, p.y, 2, 2);
  }
  ctx.restore();
}

// ---- Juego -----------------------------------------------------
function reset(){
  state = {
    running: true,
    time: 0,
    lastSpawn: 0,
    speed: 6,
    level: 1,
    score: 0,
    hiScore: Number(localStorage.getItem('runner:hi') || 0),
    player: { x: 70, y: GROUND_Y, w: PLAYER.w, h: PLAYER.h, vy: 0, onGround: true },
    chaserLag: 0, // cuánto atrás está la señora (ms)
    obstacles: [],
    particles: []
  };
  overlay.hidden = true;
  nameInput && (nameInput.value = '');
  paused = false;
  pauseBtn?.setAttribute('aria-pressed', 'false');
}

function spawnObstacle(){
  const h = 22 + (Math.random()*34|0);
  const w = clamp(h * rand(0.9, 1.2), 22, 58) | 0;
  state.obstacles.push({ x: BASE_W + 20, y: GROUND_Y + 28 - h, w, h });
}

function update(dt){
  state.time += dt;
  // progresión
  const targetSpeed = 6 + Math.floor(state.score / 400);
  state.level = 1 + Math.floor(state.score / 400);
  state.speed += (targetSpeed - state.speed) * 0.02;

  // jugador
  const p = state.player;
  p.vy += GRAVITY; p.y += p.vy;
  if (p.y >= GROUND_Y) { p.y = GROUND_Y; p.vy = 0; if(!p.onGround) spawnDust(p.x+PLAYER.w*0.5, p.y+PLAYER.h); p.onGround = true; }
  else { p.onGround = false; }

  // obstáculos
  state.obstacles.forEach(o => o.x -= state.speed);
  state.obstacles = state.obstacles.filter(o => o.x + o.w > -20);

  // spawn ritmo
  if (state.time - state.lastSpawn > 950 / (1 + (state.level - 1) * 0.18)) {
    spawnObstacle(); state.lastSpawn = state.time;
  }

  // puntaje
  state.score += Math.floor(state.speed);

  // colisión
  for (const o of state.obstacles) {
    if (aabb({x:p.x, y:p.y, w:p.w-6, h:p.h-6}, o)) return gameOver();
  }

  // señora se acerca muy lentamente si vas mal (en el aire, baja un poco el lag)
  const chaserGain = p.onGround ? 0.008 : 0.03;
  state.chaserLag = clamp(state.chaserLag + chaserGain*dt - 0.004*dt, 0, 2400);
}

function draw(){
  // fondo/parallax
  drawParallax(state.time, state.speed);
  drawGround(state.time);

  // señora
  const chaserX = CHASER_X;
  const chaserY = GROUND_Y - 6;
  drawAngryLady(chaserX, chaserY, state.time);

  // barras de “peligro” (qué tan cerca está)
  const danger = state.chaserLag / 2400; // 0..1
  if (danger > 0.1){
    ctx.save();
    ctx.globalAlpha = clamp((danger-0.1)*1.4, 0, 0.5);
    ctx.fillStyle = '#ef444455';
    ctx.fillRect(0, 0, BASE_W, 6);
    ctx.restore();
  }

  // obstáculos
  for (const o of state.obstacles) drawBox(o.x, o.y, o.w, o.h);

  // jugador
  drawForklift(state.player.x, state.player.y, state.time);

  // partículas
  drawParticles(16);

  // HUD
  hud.textContent = `Puntos: ${state.score.toLocaleString()}  •  Nivel: ${state.level}  •  Máximo: ${state.hiScore.toLocaleString()}`;
}

function loop(ts){
  if (!state.running || paused) return;
  const dt = ts - last; last = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function jump(){
  const p = state.player;
  if (p.onGround) { p.vy = JUMP_VELOCITY; p.onGround = false; }
}

function gameOver(){
  state.running = false;
  state.hiScore = Math.max(state.hiScore, state.score);
  localStorage.setItem('runner:hi', String(state.hiScore));
  finalInfo.textContent = `Puntaje: ${state.score} • Nivel: ${state.level} • Máximo: ${state.hiScore}`;
  overlay.hidden = false;
  nameInput?.focus();
  renderLeaderboard();
}

// ---- Leaderboard ------------------------------------------------
async function renderLeaderboard(){
  leaderList.innerHTML = '<li>Cargando...</li>';
  try{
    const top = await fetchTopScores(10);
    leaderList.innerHTML = top.map((s,i)=>`<li>#${i+1} <strong>${escapeHtml(s.name)}</strong> — ${s.score} (niv ${s.level})</li>`).join('');
  }catch{
    leaderList.innerHTML = '<li>No se pudo cargar el leaderboard.</li>';
  }
}
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[s]));
}

// ---- Fondo personalizable --------------------------------------
function setBgImage(img){
  backgroundImg = img;
  localStorage.setItem('runner:bg', img ? 'custom' : '');
}
bgFile?.addEventListener('change', (e)=>{
  const file = e.target.files?.[0];
  if (!file) return;
  const img = new Image();
  img.onload = ()=> setBgImage(img);
  img.src = URL.createObjectURL(file);
});
bgUrl?.addEventListener('change', ()=>{
  const url = bgUrl.value.trim();
  if (!url) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = ()=> setBgImage(img);
  img.onerror = ()=> alert('No se pudo cargar la imagen.');
  img.src = url;
});
bgClear?.addEventListener('click', ()=>{
  setBgImage(null);
});
bgFitRadios.forEach(r=>{
  r.addEventListener('change', ()=>{
    if (r.checked){ bgFit = r.value; localStorage.setItem('runner:bgFit', bgFit); }
  });
});

// ---- Controles --------------------------------------------------
addEventListener('keydown', (e)=>{
  if (e.code === 'Space' || e.code === 'ArrowUp'){ e.preventDefault(); jump(); }
  if (e.code === 'KeyR' && !state.running){ e.preventDefault(); start(); }
  if (e.code === 'KeyP'){ togglePause(); }
});
canvas.addEventListener('pointerdown', ()=> jump());

restartBtn?.addEventListener('click', start);
overlayRestart?.addEventListener('click', start);
pauseBtn?.addEventListener('click', togglePause);

saveForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = (nameInput.value || 'Anónimo').trim().slice(0,16);
  await submitScore({ name, score: state.score, level: state.level });
  await renderLeaderboard();
  const btn = saveForm.querySelector('button');
  btn.textContent = '¡Guardado!';
  setTimeout(()=> btn.textContent = 'Guardar puntuación', 1200);
});

function togglePause(){
  if (!state.running) return;
  paused = !paused;
  pauseBtn?.setAttribute('aria-pressed', String(paused));
  if (!paused){ last = performance.now(); requestAnimationFrame(loop); }
}

function start(){
  reset();
  last = performance.now();
  requestAnimationFrame(loop);
}

// ---- Init -------------------------------------------------------
resize();
reset();
renderLeaderboard();
requestAnimationFrame(ts => { last = ts; loop(ts); });

// Carga de preferencia de ajuste del fondo
(function restoreBgFit(){
  const saved = localStorage.getItem('runner:bgFit');
  if (saved) {
    bgFit = saved;
    const r = [...bgFitRadios].find(x=>x.value===saved);
    if (r) r.checked = true;
  }
})();
