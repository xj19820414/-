const mainCanvas = document.getElementById('mainCanvas');
const ctx = mainCanvas.getContext('2d');
const waveCanvas = document.getElementById('waveCanvas');
const waveCtx = waveCanvas.getContext('2d');
const drawCanvas = document.getElementById('drawCanvas');
const drawCtx = drawCanvas.getContext('2d');

let circles = [
  { radius: 104, speed: 1, phase: 0, color: '#7ee8e3' },
  { radius: 52, speed: -2, phase: 1.2, color: '#d5f36e' },
  { radius: 22, speed: 3, phase: 2.1, color: '#ff785f' }
];
let time = 0, playing = true, trail = [], drawing = false, drawnPoints = [], analysisScene = null;

function resizeCanvas() {
  const rect = mainCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  mainCanvas.width = rect.width * dpr; mainCanvas.height = rect.height * dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize', resizeCanvas); resizeCanvas();

function pointAt(t) {
  if (analysisScene) {
    let x = analysisScene.mapX(analysisScene.center.x);
    let y = analysisScene.mapY(analysisScene.center.y);
    const nodes = [];
    analysisScene.terms.forEach(c => {
      const angle = c.phase + c.frequency * t;
      const radius = c.magnitude * analysisScene.scale;
      const nx = x + Math.cos(angle) * radius, ny = y + Math.sin(angle) * radius;
      nodes.push({ x, y, nx, ny, r: radius, color: c.frequency === 0 ? '#d5f36e' : (c.frequency % 2 ? '#7ee8e3' : '#ff785f') });
      x = nx; y = ny;
    });
    return { x, y, nodes };
  }
  let x = mainCanvas.clientWidth / 2, y = mainCanvas.clientHeight / 2;
  const nodes = [];
  circles.forEach(c => {
    const angle = c.phase + t * c.speed * 0.8;
    const nx = x + Math.cos(angle) * c.radius, ny = y + Math.sin(angle) * c.radius;
    nodes.push({ x, y, nx, ny, r: c.radius, color: c.color });
    x = nx; y = ny;
  });
  return { x, y, nodes };
}
function drawMain() {
  const w = mainCanvas.clientWidth, h = mainCanvas.clientHeight;
  ctx.clearRect(0,0,w,h);
  const current = pointAt(time);
  if (analysisScene && analysisScene.reference.length > 1) {
    ctx.beginPath();
    analysisScene.reference.forEach((p, i) => i ? ctx.lineTo(analysisScene.mapX(p.x), analysisScene.mapY(p.y)) : ctx.moveTo(analysisScene.mapX(p.x), analysisScene.mapY(p.y)));
    ctx.closePath(); ctx.strokeStyle = 'rgba(255,120,95,.28)'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
  }
  if (document.getElementById('trailToggle').checked && trail.length > 1) {
    ctx.beginPath(); trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.strokeStyle='rgba(255,120,95,.9)'; ctx.lineWidth=2.2; ctx.stroke();
  }
  current.nodes.forEach((n,i)=>{
    ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.strokeStyle = n.color; ctx.globalAlpha=.34; ctx.lineWidth=1; ctx.stroke(); ctx.globalAlpha=1;
    ctx.beginPath(); ctx.moveTo(n.x,n.y); ctx.lineTo(n.nx,n.ny); ctx.strokeStyle='#f5f4ee'; ctx.globalAlpha=.45; ctx.lineWidth=1; ctx.stroke(); ctx.globalAlpha=1;
    ctx.beginPath(); ctx.arc(n.nx,n.ny,3.5,0,Math.PI*2); ctx.fillStyle=n.color; ctx.fill();
  });
  ctx.beginPath();ctx.arc(current.x,current.y,4,0,Math.PI*2);ctx.fillStyle='#ff785f';ctx.shadowColor='#ff785f';ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;
  updateReadouts();
}
function drawWave() {
  const w=waveCanvas.width,h=waveCanvas.height; waveCtx.clearRect(0,0,w,h); waveCtx.strokeStyle='rgba(126,232,227,.13)'; waveCtx.beginPath();waveCtx.moveTo(0,h/2);waveCtx.lineTo(w,h/2);waveCtx.stroke();
  waveCtx.beginPath(); for(let x=0;x<w;x++){let t=(x/w)*Math.PI*5; let y=h/2; circles.forEach(c=>y += Math.sin(c.phase+t*c.speed*.4)*c.radius*.18); y=Math.max(8,Math.min(h-8,y)); x?waveCtx.lineTo(x,y):waveCtx.moveTo(x,y)} waveCtx.strokeStyle='#ff785f';waveCtx.lineWidth=2;waveCtx.stroke();
}
function updateReadouts() {
  const activeCircles = analysisScene ? analysisScene.termCount : circles.length;
  const activeRadius = analysisScene ? analysisScene.terms.reduce((sum, c) => sum + c.magnitude * analysisScene.scale, 0) : circles.reduce((a,c)=>a+c.radius,0);
  document.getElementById('timeReadout').textContent=(time%(Math.PI*2)).toFixed(2);
  document.getElementById('circleCount').textContent=activeCircles;
  document.getElementById('frequencyReadout').textContent=String(activeCircles).padStart(2,'0');
  document.getElementById('sumRadius').textContent=Math.round(activeRadius);
  document.getElementById('directionReadout').textContent=analysisScene ? 'DFT' : (circles.filter(c=>c.speed>0).length>=circles.length/2?'CCW':'CW');
  document.getElementById('progressBar').style.width=`${((time%(Math.PI*2))/(Math.PI*2))*100}%`;
  document.getElementById('progressText').textContent=`${String(Math.floor((time%(Math.PI*2))*1.59)).padStart(2,'0')}:00`;
}
function loop(){ if(playing){time+=.018; const p=pointAt(time); trail.push({x:p.x,y:p.y}); if(trail.length>420)trail.shift()} drawMain(); drawWave(); requestAnimationFrame(loop) } loop();

function renderCards(){
  const list=document.getElementById('circleList'); list.innerHTML='';
  circles.forEach((c,i)=>{
    const el=document.createElement('div'); el.className='circle-card'+(i===circles.length-1?' active':'');
    el.innerHTML=`<div class="card-top"><span class="card-index">CIRCLE ${String(i+1).padStart(2,'0')}</span>${circles.length>1?'<button class="remove-btn" title="删除圆形">×</button>':''}</div>
      <div class="control"><label>半径 <output>${c.radius}px</output></label><input class="radius-range" type="range" min="8" max="150" value="${c.radius}"></div>
      <div class="control-row"><div class="control"><label>相位 <output>${c.phase.toFixed(1)} rad</output></label><input class="phase-range" type="range" min="0" max="6.28" step=".1" value="${c.phase}"></div>
      <div class="control"><label>方向</label><div class="direction"><button data-dir="1" class="${c.speed>0?'active':''}">↺</button><button data-dir="-1" class="${c.speed<0?'active':''}">↻</button></div></div></div>`;
    el.querySelector('.radius-range').oninput=e=>{c.radius=+e.target.value;renderCards();trail=[]};
    el.querySelector('.phase-range').oninput=e=>{c.phase=+e.target.value;renderCards()};
    el.querySelectorAll('.direction button').forEach(b=>b.onclick=()=>{c.speed=Math.abs(c.speed)*+b.dataset.dir;renderCards()});
    const remove=el.querySelector('.remove-btn'); if(remove) remove.onclick=()=>{circles.splice(i,1);renderCards();trail=[]};
    list.appendChild(el);
  });
}
document.getElementById('addCircleBtn').onclick=()=>{analysisScene=null;circles.push({radius:Math.max(12,Math.round(circles.at(-1).radius*.52)),speed:circles.length%2?2:-2,phase:0,color:['#7ee8e3','#d5f36e','#ff785f'][circles.length%3]});renderCards();};
document.getElementById('pauseBtn').onclick=e=>{playing=!playing;e.target.textContent=playing?'暂停':'继续'};
document.getElementById('resetBtn').onclick=()=>{analysisScene=null;circles=[{radius:104,speed:1,phase:0,color:'#7ee8e3'},{radius:52,speed:-2,phase:1.2,color:'#d5f36e'},{radius:22,speed:3,phase:2.1,color:'#ff785f'}];time=0;trail=[];renderCards()};
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active'));t.classList.add('active');document.getElementById(t.dataset.tab+'-panel').classList.add('active')});

function drawUserLine(e){const r=drawCanvas.getBoundingClientRect();const p={x:(e.clientX-r.left)*(drawCanvas.width/r.width),y:(e.clientY-r.top)*(drawCanvas.height/r.height)};drawnPoints.push(p);drawCtx.lineTo(p.x,p.y);drawCtx.stroke();}
drawCanvas.addEventListener('pointerdown',e=>{drawing=true;drawnPoints=[];drawCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);drawCtx.beginPath();drawCtx.moveTo((e.offsetX/drawCanvas.clientWidth)*drawCanvas.width,(e.offsetY/drawCanvas.clientHeight)*drawCanvas.height);drawCtx.strokeStyle='#ff785f';drawCtx.lineWidth=3;drawUserLine(e);document.getElementById('drawLabel').style.display='none';drawCanvas.setPointerCapture(e.pointerId)});
drawCanvas.addEventListener('pointermove',e=>{if(drawing)drawUserLine(e)});drawCanvas.addEventListener('pointerup',()=>drawing=false);
document.getElementById('sampleRange').oninput=e=>document.getElementById('sampleValue').textContent=e.target.value;
document.getElementById('errorRange').oninput=e=>document.getElementById('errorValue').textContent=e.target.value+'%';
function resampleClosedPath(points, count) {
  if (points.length < 2) return [];
  const clean = points.filter((p, i) => i === 0 || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > 1);
  const segments = [];
  let total = 0;
  for (let i = 0; i < clean.length; i++) {
    const a = clean[i], b = clean[(i + 1) % clean.length];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    segments.push({ a, b, length }); total += length;
  }
  if (!total) return [];
  const result = [];
  for (let s = 0; s < count; s++) {
    let target = (s / count) * total, acc = 0, chosen = segments[0];
    for (const segment of segments) {
      if (target <= acc + segment.length) { chosen = segment; break; }
      acc += segment.length;
    }
    const ratio = chosen.length ? (target - acc) / chosen.length : 0;
    result.push({ x: chosen.a.x + (chosen.b.x - chosen.a.x) * ratio, y: chosen.a.y + (chosen.b.y - chosen.a.y) * ratio });
  }
  return result;
}

function computeSpectrum(points) {
  const n = points.length;
  const coefficients = [];
  for (let k = 0; k < n; k++) {
    let real = 0, imag = 0;
    for (let j = 0; j < n; j++) {
      const angle = (2 * Math.PI * k * j) / n;
      const x = points[j].x, y = points[j].y;
      real += x * Math.cos(angle) + y * Math.sin(angle);
      imag += y * Math.cos(angle) - x * Math.sin(angle);
    }
    real /= n; imag /= n;
    const frequency = k <= n / 2 ? k : k - n;
    coefficients.push({ frequency, real, imag, magnitude: Math.hypot(real, imag), phase: Math.atan2(imag, real) });
  }
  return coefficients.sort((a, b) => b.magnitude - a.magnitude);
}

function reconstructionError(points, terms) {
  let sum = 0, energy = 0;
  for (let j = 0; j < points.length; j++) {
    let x = 0, y = 0;
    terms.forEach(c => {
      const angle = (2 * Math.PI * c.frequency * j) / points.length;
      x += c.real * Math.cos(angle) - c.imag * Math.sin(angle);
      y += c.real * Math.sin(angle) + c.imag * Math.cos(angle);
    });
    sum += Math.hypot(points[j].x - x, points[j].y - y) ** 2;
    energy += Math.hypot(points[j].x, points[j].y) ** 2;
  }
  return energy ? Math.sqrt(sum / energy) * 100 : 100;
}

function drawAnalysisOverlay(points, terms) {
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  if (!points.length) return;
  drawCtx.beginPath();
  points.forEach((p, i) => i ? drawCtx.lineTo(p.x, p.y) : drawCtx.moveTo(p.x, p.y));
  drawCtx.closePath(); drawCtx.strokeStyle = '#ff785f'; drawCtx.lineWidth = 2; drawCtx.stroke();
  if (!terms.length) return;
  drawCtx.beginPath();
  for (let j = 0; j <= points.length; j++) {
    let x = 0, y = 0;
    terms.forEach(c => {
      const angle = (2 * Math.PI * c.frequency * (j % points.length)) / points.length;
      x += c.real * Math.cos(angle) - c.imag * Math.sin(angle);
      y += c.real * Math.sin(angle) + c.imag * Math.cos(angle);
    });
    j ? drawCtx.lineTo(x, y) : drawCtx.moveTo(x, y);
  }
  drawCtx.closePath(); drawCtx.strokeStyle = '#7ee8e3'; drawCtx.lineWidth = 1.5; drawCtx.stroke();
}

document.getElementById('analyzeBtn').onclick=()=>{
  const errorLimit = +document.getElementById('errorRange').value;
  const sampleCount = +document.getElementById('sampleRange').value;
  const sampled = resampleClosedPath(drawnPoints, sampleCount);
  if (sampled.length < 16) {
    document.querySelector('.result-number').textContent='—';
    document.querySelector('#analysisResult strong').textContent='等待轮廓';
    document.querySelector('#analysisResult span').textContent='请先画出足够长的闭合图形。';
    return;
  }
  const spectrum = computeSpectrum(sampled);
  let selected = [], actualError = 100;
  for (let i = 0; i < spectrum.length; i++) {
    selected.push(spectrum[i]);
    actualError = reconstructionError(sampled, selected);
    if (actualError <= errorLimit) break;
  }
  const estimate = selected.length;
  const xs = sampled.map(p => p.x), ys = sampled.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const boundsWidth = Math.max(1, maxX - minX), boundsHeight = Math.max(1, maxY - minY);
  const fitScale = Math.min((mainCanvas.clientWidth * .62) / boundsWidth, (mainCanvas.clientHeight * .62) / boundsHeight);
  const offsetX = mainCanvas.clientWidth / 2 - ((minX + maxX) / 2) * fitScale;
  const offsetY = mainCanvas.clientHeight / 2 - ((minY + maxY) / 2) * fitScale;
  analysisScene = {
    reference: sampled,
    terms: selected.filter(c => c.frequency !== 0),
    termCount: selected.length,
    center: { x: selected.find(c => c.frequency === 0)?.real || sampled.reduce((s,p)=>s+p.x,0)/sampled.length, y: selected.find(c => c.frequency === 0)?.imag || sampled.reduce((s,p)=>s+p.y,0)/sampled.length },
    scale: fitScale,
    mapX: value => value * fitScale + offsetX,
    mapY: value => value * fitScale + offsetY
  };
  time = 0; trail = [];
  drawAnalysisOverlay(sampled, selected);
  document.querySelector('.result-number').textContent=String(estimate).padStart(2,'0');
  document.querySelector('#analysisResult strong').textContent='最少圆形数量';
  document.querySelector('#analysisResult span').textContent=`重建误差 ${actualError.toFixed(2)}%，目标阈值 ${errorLimit.toFixed(1)}%。`;
};
renderCards();
