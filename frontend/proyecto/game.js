/* ==================== CONFIG ==================== */
// Fondo por código (ruta relativa o URL). Ej: './assets/almacen.jpg'
const DEFAULT_BG_URL = './assets/almacen.jpg';

// Rango delante del jugador para considerar que el salto fue “con propósito”
const FAIL_RANGE = 140;

/* ============== Carga API con fallback ============== */
let fetchTopScores = async (limit = 10) => {
  // Fallback: leaderboard local
  const raw = localStorage.getItem('runner:scores') || '[]';
  const list = JSON.parse(raw);
  return list.sort((a,b) => b.score - a.score).slice(0, limit);
};
let submitScore = async ({ name, score, level }) => {
  const payload = {
    name: String(name || 'Anónimo').slice(0,16),
    score: Math.max(0, score|0),
    level: Math.max(1, level|0),
    date: new Date().toISOString()
  };
  const raw = localStorage.getItem('runner:scores') || '[]';
  const list = JSON.parse(raw);
  list.push(payload);
  localStorage.setItem('runner:scores', JSON.stringify(list));
  return { ok: true, source: 'localStorage' };
};

try {
  // intenta usar tu api.js real (misma carpeta)
  const api = await import('./api.js');
  if (api?.fetchTopScores && api?.submitScore) {
    fetchTopScores = api.fetchTopScores;
    submitScore   = api.submitScore;
  }
} catch (err) {
  console.warn('No se pudo cargar api.js, usando fallback localStorage.', err);
}

/* ==================== DOM ==================== */
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

const muteBtn = document.getElementById('mute-btn');
const skinSelect = document.getElementById('skin-select');
const failCapInput = document.getElementById('fail-cap');

/* ==================== Juego: constantes ==================== */
const BASE_W = 960, BASE_H = 320;
const GROUND_Y = 260;
const GRAVITY = 0.6;
const JUMP_VELOCITY = -10;              // un pelín menos salto = sensación de peso
const PLAYER = { w: 56, h: 42 };        // 👈 señor obeso en el montacargas

const CHASER_X_BASE = 10;
// Cielo (ahora más claro)
const SKY = ['#74c0fc', '#d0ebff'];

/* ==================== Skins ==================== */
const SKINS = {
  cyan:  { base:'#22d3ee', mast:'#93c5fd', fork:'#60a5fa', cab:'#0ea5e9', driver:'#38bdf8' },
  amber: { base:'#f59e0b', mast:'#fbbf24', fork:'#fcd34d', cab:'#eab308', driver:'#f59e0b' },
  lime:  { base:'#84cc16', mast:'#a3e635', fork:'#bef264', cab:'#65a30d', driver:'#a3e635' },
  pink:  { base:'#fb7185', mast:'#f472b6', fork:'#f9a8d4', cab:'#f43f5e', driver:'#f9a8d4' },
};
let currentSkinKey = localStorage.getItem('runner:skin') || 'cyan';
let SKIN = SKINS[currentSkinKey] || SKINS.cyan;

/* ==================== Estado ==================== */
let state;
let last = 0;
let paused = false;
let backgroundImg = null;
let FAIL_CAP = Number(localStorage.getItem('runner:failCap') || 5); // X fallos seguidos

/* ==================== Utils ==================== */
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const aabb  = (a,b)=> a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
const rand  = (a,b)=> a + Math.random()*(b-a);

/* ==================== Sprites ==================== */
function drawForklift(x, y, t){
  ctx.save(); ctx.translate(x, y);

  // sombra
  ctx.fillStyle='rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(PLAYER.w*0.5, PLAYER.h+7, PLAYER.w*0.55, 7, 0, 0, Math.PI*2); ctx.fill();

  // ruedas
  const wobble = Math.sin(t*0.013) * 1.6;
  ctx.fillStyle = '#1f2937';
  ctx.beginPath(); ctx.arc(12, PLAYER.h-3+wobble, 9, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(PLAYER.w-10, PLAYER.h-3-wobble, 11, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#374151'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(12, PLAYER.h-3+wobble, 6, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(PLAYER.w-10, PLAYER.h-3-wobble, 8, 0, Math.PI*2); ctx.stroke();

  // base reforzada
  ctx.fillStyle = SKIN.base;
  ctx.fillRect(2, PLAYER.h-18, PLAYER.w-4, 14);

  // mástil y horquillas
  ctx.fillStyle = SKIN.mast;
  ctx.fillRect(PLAYER.w-7, 5, 5, PLAYER.h-22);
  ctx.fillStyle = SKIN.fork;
  ctx.fillRect(PLAYER.w-22, PLAYER.h-12, 26, 4);

  // cabina "gorda"
  ctx.fillStyle = SKIN.cab;
  ctx.fillRect(6, 6, PLAYER.w-20, 22);

  // “señor obeso” dentro
  // cabeza
  ctx.fillStyle = '#fcd34d';
  ctx.beginPath(); ctx.arc(18, 15, 7, 0, Math.PI*2); ctx.fill();
  // barriga
  ctx.fillStyle = SKIN.driver;
  ctx.beginPath(); ctx.ellipse(26, 21, 10, 7, 0, 0, Math.PI*2); ctx.fill();
  // brazo
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(22,20); ctx.lineTo(32,22); ctx.stroke();

  ctx.restore();
}

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

  // torso (blusa)
  ctx.fillStyle = '#eab308';
  ctx.fillRect(12, 12+pace*0.2, 10, 12);

  // cabeza (tono medio)
  ctx.fillStyle = '#8d5524';
  ctx.beginPath(); ctx.arc(17, 8+pace*0.3, 6, 0, Math.PI*2); ctx.fill();

  // cejas/enojo
  ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(13,7); ctx.lineTo(15,6); ctx.moveTo(19,6); ctx.lineTo(21,7); ctx.stroke();

  // brazo levantado
  ctx.strokeStyle = '#8d5524'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(12,16); ctx.lineTo(6, 10+pace); ctx.stroke();

  ctx.restore();
}

function drawBox(x,y,w,h){
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle='#fbbf24'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#ad7300'; ctx.lineWidth=2; ctx.strokeRect(0,0,w,h);
  ctx.fillStyle='#fde68a'; ctx.fillRect(4,3,w-8,4);
  ctx.strokeStyle='#92400e'; ctx.strokeRect(6,10,w-12,h-16);
  ctx.restore();
}
function cloud(x,y){
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI*2);
  ctx.arc(x+16, y+4, 18, 0, Math.PI*2);
  ctx.arc(x+34, y, 14, 0, Math.PI*2);
  ctx.fill();
}
function drawParallax(t){
  const g = ctx.createLinearGradient(0,0,0,BASE_H);
  g.addColorStop(0, SKY[0]); g.addColorStop(1, SKY[1]);
  ctx.fillStyle = g; ctx.fillRect(0,0,BASE_W,BASE_H);

  if (backgroundImg){
    const iw=backgroundImg.width, ih=backgroundImg.height;
    const s=Math.max(BASE_W/iw, BASE_H/ih);
    const dw=iw*s, dh=ih*s, dx=(BASE_W-dw)/2, dy=(BASE_H-dh)/2;
    ctx.save(); ctx.globalAlpha=0.35; ctx.drawImage(backgroundImg, dx, dy, dw, dh); ctx.restore();
  }

  ctx.save(); ctx.globalAlpha=.25; ctx.fillStyle='#1e293b';
  const offset1 = -((t*0.03) % (BASE_W*2));
  for(let i=-2;i<3;i++){
    const x = i*BASE_W*2 + offset1;
    ctx.fillRect(x+80, BASE_H-120, 260, 100);
    ctx.fillRect(x+370, BASE_H-160, 220, 140);
    ctx.fillRect(x+620, BASE_H-140, 280, 120);
  }
  ctx.restore();

  ctx.save(); ctx.globalAlpha=.5; ctx.fillStyle='#e5e7eb';
  const offset2 = -((t*0.06) % (BASE_W+200));
  for(let i=0;i<4;i++){ const cx=offset2+i*260; cloud(cx, 60+(i%2)*14); }
  ctx.restore();
}
function drawGround(t){
  ctx.fillStyle='#172036'; ctx.fillRect(0, GROUND_Y+28, BASE_W, 4);
  ctx.save(); ctx.globalAlpha=.25; ctx.fillStyle='#0f172a';
  const off = -((t*0.2)%40);
  for(let x=off-40; x<BASE_W+40; x+=40) ctx.fillRect(x, GROUND_Y+32, 28, 6);
  ctx.restore();
}
function spawnDust(x,y){
  for(let i=0;i<3;i++){
    state.particles.push({x:x+rand(-3,3),y:y+rand(-2,1),vx:rand(-.4,.6),vy:rand(-1.2,-.2),life:rand(200,450),t:0});
  }
}
function drawParticles(dt){
  for(const p of state.particles){ p.t+=dt; p.x+=p.vx*(dt/16); p.y+=p.vy*(dt/16); }
  state.particles = state.particles.filter(p=>p.t<p.life);
  ctx.save(); ctx.globalAlpha=.35; ctx.fillStyle='#94a3b8';
  for(const p of state.particles) ctx.fillRect(p.x,p.y,2,2);
  ctx.restore();
}

/* ==================== Lógica ==================== */
function reset(){
  state = {
    running:true, time:0, lastSpawn:0, speed:1, level:1, score:0,
    hiScore:Number(localStorage.getItem('runner:hi')||0),
    player:{x:70,y:GROUND_Y,w:PLAYER.w,h:PLAYER.h,vy:0,onGround:true},
    chaserLag:0, obstacles:[], particles:[],
    failStreak: 0
  };
  overlay.setAttribute('hidden','');
  paused=false;
  if (nameInput) nameInput.value='';
  if (pauseBtn) pauseBtn.setAttribute('aria-pressed','false');
}
function spawnObstacle(){
  const h=22+(Math.random()*34|0);
  const w=clamp(h*(0.9+Math.random()*0.3),22,58)|0;
  state.obstacles.push({x:BASE_W+20,y:GROUND_Y+28-h,w,h});
}
function update(dt){
  state.time+=dt;
  const targetSpeed = 6 + Math.floor(state.score/400);
  state.level = 1 + Math.floor(state.score/400);
  state.speed += (targetSpeed - state.speed)*0.02;

  const p=state.player;
  p.vy+=GRAVITY; p.y+=p.vy;
  if (p.y>=GROUND_Y){
    p.y=GROUND_Y; p.vy=0;
    if(!p.onGround){ spawnDust(p.x+PLAYER.w*.5,p.y+PLAYER.h); sfxLand(); }
    p.onGround=true;
  } else p.onGround=false;

  // mover obstáculos + detectar “clear” (pasaste una caja sin colisionar)
  state.obstacles.forEach(o=>{
    const before = o.x + o.w;
    o.x -= state.speed;
    const after = o.x + o.w;
    if (!o.cleared && before >= p.x && after < p.x){
      o.cleared = true;
      state.failStreak = 0; // perdona la racha al superar una caja
      sfxGood();
    }
  });
  state.obstacles = state.obstacles.filter(o=>o.x+o.w>-20);

  // menos obstáculos: intervalo base mayor y escalado más suave
  const spawnInterval = 1400 / (1 + (state.level - 1) * 0.12);
  if (state.time - state.lastSpawn > spawnInterval) {
    if (Math.random() < 0.85) spawnObstacle();
    state.lastSpawn = state.time;
  }

  state.score += Math.floor(state.speed);

  // colisión con cajas
  for (const o of state.obstacles) {
    if (aabb({x:p.x+4, y:p.y+2, w:p.w-14, h:p.h-10}, o)) return gameOver();
  }

  // “presión” de la señora (visual)
  const chaserGain = p.onGround ? 0.008 : 0.03;
  state.chaserLag = clamp(state.chaserLag + chaserGain*dt - 0.004*dt, 0, 2400);
}
function draw(){
  drawParallax(state.time);
  drawGround(state.time);

  // acercamiento visual según racha de fallos
  const chaserX = CHASER_X_BASE + Math.min(70, state.failStreak * 10);
  drawAngryLady(chaserX, GROUND_Y-6, state.time);

  for(const o of state.obstacles) drawBox(o.x,o.y,o.w,o.h);
  drawForklift(state.player.x, state.player.y, state.time);
  drawParticles(16);

  hud.textContent =
    `Puntos: ${state.score.toLocaleString()}  •  Nivel: ${state.level}  •  ` +
    `Máximo: ${state.hiScore.toLocaleString()}  •  Fallos: ${state.failStreak}/${FAIL_CAP}`;
}
function loop(ts){
  if (!state || !state.running || paused) return;
  const dt = ts - last; last = ts;
  update(dt); draw();
  requestAnimationFrame(loop);
}
function jump(){
  const p=state.player;
  if (!p.onGround) return;

  // ¿hay obstáculo útil cerca?
  const near = state.obstacles.find(o=>{
    const dx = o.x - (p.x + p.w);
    const verticalOverlap = o.y <= p.y + p.h; // a la altura del jugador
    return dx >= -4 && dx <= FAIL_RANGE && verticalOverlap;
  });

  if (near){
    state.failStreak = 0; // salto con propósito
    sfxJump();
  } else {
    state.failStreak++;
    sfxBad();
    // (opcional) acerca visualmente a la señora un poco más vía lag
    state.chaserLag = Math.max(0, state.chaserLag - 380);

    if (state.failStreak >= FAIL_CAP){
      // la señora te alcanza por racha de fallos
      sfxGameOver();
      return gameOver();
    }
  }

  // ejecuta el salto
  p.vy=JUMP_VELOCITY; p.onGround=false;
}
function gameOver(){
  state.running=false;
  state.hiScore=Math.max(state.hiScore,state.score);
  localStorage.setItem('runner:hi', String(state.hiScore));
  finalInfo.textContent=`Puntaje: ${state.score} • Nivel: ${state.level} • Máximo: ${state.hiScore}`;
  overlay.removeAttribute('hidden');
  if (nameInput) nameInput.focus();
  renderLeaderboard();
}

/* ==================== Leaderboard ==================== */
async function renderLeaderboard(){
  if (!leaderList) return;
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

/* ==================== Fondo por código ==================== */
function loadDefaultBackground(cb){
  if (!DEFAULT_BG_URL){ cb(); return; }
  const img = new Image();
  img.onload = ()=>{ backgroundImg = img; cb(); };
  img.onerror = ()=>{ console.warn('No se pudo cargar DEFAULT_BG_URL'); cb(); };
  img.src = DEFAULT_BG_URL;
}

/* ==================== Audio ==================== */
let ACTX, master, muted = (localStorage.getItem('runner:muted') === '1');

function ensureAudio() {
  if (ACTX) return;
  ACTX = new (window.AudioContext || window.webkitAudioContext)();
  master = ACTX.createGain();
  master.gain.value = muted ? 0 : 0.4;
  master.connect(ACTX.destination);
}

function beep({freq=440, dur=0.10, type='sine', gain=0.3}) {
  if (!ACTX || muted) return;
  const o = ACTX.createOscillator();
  const g = ACTX.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, ACTX.currentTime);
  g.gain.value = gain;
  o.connect(g); g.connect(master);
  o.start();
  o.stop(ACTX.currentTime + dur);
}

function sfxJump(){ ensureAudio(); beep({freq:520, dur:.08, type:'square', gain:.25}); }
function sfxLand(){ ensureAudio(); beep({freq:200, dur:.06, type:'triangle', gain:.22}); }
function sfxGood(){ ensureAudio(); beep({freq:760, dur:.07, type:'square', gain:.22}); }
function sfxBad(){ ensureAudio(); beep({freq:160, dur:.12, type:'sawtooth', gain:.28}); }
function sfxGameOver(){ ensureAudio(); beep({freq:100, dur:.24, type:'triangle', gain:.35}); }

function setMuted(v){
  muted = !!v; localStorage.setItem('runner:muted', muted?'1':'0');
  ensureAudio();
  master.gain.linearRampToValueAtTime(muted ? 0 : 0.4, ACTX.currentTime + 0.05);
  muteBtn?.setAttribute('aria-pressed', String(muted));
  if (muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊';
}
setMuted(muted);

/* ==================== Controles ==================== */
function bindControls(){
  document.addEventListener('keydown',(e)=>{
    if (e.code==='Space'||e.code==='ArrowUp'){ e.preventDefault(); jump(); }
    if (e.code==='KeyR' && state && !state.running){ e.preventDefault(); start(); }
    if (e.code==='KeyP'){ togglePause(); }
    if (e.code==='KeyM'){ setMuted(!muted); }
  });
  canvas.addEventListener('pointerdown', ()=> jump());
  restartBtn && restartBtn.addEventListener('click', start);
  overlayRestart && overlayRestart.addEventListener('click', start);
  pauseBtn && pauseBtn.addEventListener('click', togglePause);
  muteBtn && muteBtn.addEventListener('click', ()=> setMuted(!muted));
  saveForm && saveForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const name=(nameInput.value||'Anónimo').trim().slice(0,16);
    await submitScore({ name, score: state.score, level: state.level });
    await renderLeaderboard();
    const btn=saveForm.querySelector('button');
    if (btn){ btn.textContent='¡Guardado!'; setTimeout(()=>btn.textContent='Guardar puntuación',1200); }
  });

  // Skins selector (si existe en el HTML)
  if (skinSelect){
    skinSelect.value = currentSkinKey;
    skinSelect.addEventListener('change', ()=>{
      currentSkinKey = skinSelect.value;
      SKIN = SKINS[currentSkinKey] || SKINS.cyan;
      localStorage.setItem('runner:skin', currentSkinKey);
    });
  }

  // Límite de fallos seguidos
  if (failCapInput){
    failCapInput.value = String(FAIL_CAP);
    failCapInput.addEventListener('change', ()=>{
      const v = clamp(parseInt(failCapInput.value||'5',10), 2, 12);
      FAIL_CAP = v;
      localStorage.setItem('runner:failCap', String(v));
      failCapInput.value = String(v);
    });
  }
}
function togglePause(){
  if (!state || !state.running) return;
  paused=!paused;
  pauseBtn && pauseBtn.setAttribute('aria-pressed', String(paused));
  if (!paused){ last=performance.now(); requestAnimationFrame(loop); }
}
function start(){ reset(); last=performance.now(); requestAnimationFrame(loop); }

/* ==================== Init ==================== */
function init(){
  // El canvas ya tiene 960x320 en el HTML; CSS lo escala. Simples = menos bugs.
  bindControls();
  renderLeaderboard();
  loadDefaultBackground(start); // carga el fondo (si hay) y arranca el loop
}
init();
