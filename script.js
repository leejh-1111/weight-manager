// Core JS: CRUD with LocalStorage, inline rulers, Chart.js, import/export (JA)

// Elements -------------------------------------------------------------------
const dateInput = document.getElementById('dateInput');
const weightSlider = document.getElementById('weightSlider');
const fatSlider = document.getElementById('fatSlider');
const muscleSlider = document.getElementById('muscleSlider');
const weightLabel = document.getElementById('weightValueCustom');
const fatLabel = document.getElementById('fatValueCustom');
const muscleLabel = document.getElementById('muscleValueCustom');
const saveBtn = document.getElementById('saveBtn');
const updateBtn = document.getElementById('updateBtn');
const deleteBtn = document.getElementById('deleteBtn');
const dataList = document.getElementById('dataList');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');
const periodTabs = document.querySelectorAll('.tab-btn');
const weightCalBtn = document.getElementById('weightCalBtn');
const dateCard = document.getElementById('dateCard');

// Helpers ---------------------------------------------------------------------
const rulerBias = (()=>{ try{ return JSON.parse(localStorage.getItem('rulerBias')||'{}'); }catch{ return {}; } })();
function saveRulerBias(){ try{ localStorage.setItem('rulerBias', JSON.stringify(rulerBias)); }catch{} }
let weightDisplayOffset = 0; // display-only offset for weight
function getData(){ return JSON.parse(localStorage.getItem('healthData')||'[]'); }
function setData(d){ localStorage.setItem('healthData', JSON.stringify(d)); }
function setWeightText(v){ if (weightLabel) weightLabel.textContent = (Number(v) + weightDisplayOffset).toFixed(2) + 'kg'; }
function setFatText(v){ if (fatLabel) fatLabel.textContent = Number(v).toFixed(2) + '%'; }
function setMuscleText(v){ if (muscleLabel) muscleLabel.textContent = Number(v).toFixed(2) + 'kg'; }
function updateSliderValues(){ setWeightText(weightSlider.value); setFatText(fatSlider.value); setMuscleText(muscleSlider.value); }

// Enable/disable buttons based on current selection/date -----------------------
function syncButtonsByDateInput(){
  const date = dateInput?.value;
  const exists = !!date && getData().some(d=>d.date===date);
  if(exists){ selectedDate = date; updateBtn.disabled=false; deleteBtn.disabled=false; saveBtn.disabled=true; }
  else { selectedDate = null; updateBtn.disabled=true; deleteBtn.disabled=true; saveBtn.disabled=false; }
}

// Feedback --------------------------------------------------------------------
function showFeedback(msg, color = '#22c55e'){
  const el = document.getElementById('feedback'); if(!el) return;
  el.textContent = msg; el.style.background = color; el.style.display='block'; el.style.opacity='1';
  setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>{ el.style.display='none'; }, 350); }, 1600);
}

// Form reset/list --------------------------------------------------------------
let selectedDate = null;
function resetForm(){
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth()+1).padStart(2,'0');
    const dd = String(today.getDate()).padStart(2,'0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }
  weightSlider.value = 53.5; fatSlider.value = 33; muscleSlider.value = 33;
  updateSliderValues();
  selectedDate = null; updateBtn.disabled = true; deleteBtn.disabled = true; saveBtn.disabled=false;
}

function renderList(){
  const data = getData().sort((a,b)=>b.date.localeCompare(a.date));
  dataList.innerHTML = data.map(i=>
    `<div class="data-row${selectedDate===i.date?' selected':''}" data-date="${i.date}"><b>${i.date}</b> | 体重: ${i.weight}kg | 体脂肪: ${i.fat}% | 筋肉量: ${i.muscle}kg</div>`
  ).join('');
}

dataList.onclick = function(e){
  const row = e.target.closest('.data-row'); if(!row) return;
  const item = getData().find(d=>d.date===row.dataset.date); if(!item) return;
  dateInput.value=item.date; weightSlider.value=item.weight; fatSlider.value=item.fat; muscleSlider.value=item.muscle;
  updateSliderValues(); selectedDate=item.date; updateBtn.disabled=false; deleteBtn.disabled=false; saveBtn.disabled=true;
  // keep list selection visible
  renderList();
};

// Save/Update/Delete -----------------------------------------------------------
saveBtn.onclick = function(e){
  e.preventDefault(); const date = dateInput.value; if(!date) return showFeedback('日付を選択してください！', '#f43f5e');
  const data = getData(); if (data.some(d=>d.date===date)) return showFeedback('すでに入力された日付です。修正するにはリストから選択してください。', '#fbbf24');
  data.push({ date, weight:+weightSlider.value, fat:+fatSlider.value, muscle:+muscleSlider.value }); setData(data);
  renderList(); renderChart(currentPeriod); resetForm(); showFeedback('保存しました！');
  syncButtonsByDateInput();
};

updateBtn.onclick = function(e){
  e.preventDefault(); if(!selectedDate) return; const data=getData(); const idx=data.findIndex(d=>d.date===selectedDate); if(idx<0) return;
  data[idx] = { date: dateInput.value, weight:+weightSlider.value, fat:+fatSlider.value, muscle:+muscleSlider.value };
  setData(data); renderList(); renderChart(currentPeriod); resetForm(); showFeedback('修正しました！', '#2563eb');
  syncButtonsByDateInput();
};

deleteBtn.onclick = function(e){
  e.preventDefault(); if(!selectedDate) return; let data=getData(); data=data.filter(d=>d.date!==selectedDate);
  setData(data); renderList(); renderChart(currentPeriod); resetForm(); showFeedback('削除しました！', '#e11d48');
  syncButtonsByDateInput();
};

// Import/Export ----------------------------------------------------------------
exportBtn.onclick = function(){
  const blob = new Blob([JSON.stringify(getData(), null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='健康データ.json';
  document.body.appendChild(a); a.click(); setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
};

importInput.onchange = function(e){
  const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
  reader.onload = (evt)=>{ try { const imported = JSON.parse(evt.target.result); if(!Array.isArray(imported)) throw new Error('형식이 올바르지 않습니다');
      const cur = getData(); const merged=[...cur]; imported.forEach(n=>{ if(!merged.some(d=>d.date===n.date)) merged.push(n); });
      setData(merged); renderList(); renderChart(currentPeriod); alert('가져오기 성공');
    } catch(err){ alert('가져오기 실패: '+err.message); } importInput.value=''; };
  reader.readAsText(file);
};

// Chart -----------------------------------------------------------------------
let chart=null; let currentPeriod='week';
periodTabs.forEach(tab=>{ tab.onclick=()=>{ periodTabs.forEach(t=>t.classList.remove('active')); tab.classList.add('active'); currentPeriod=tab.dataset.period; renderChart(currentPeriod); }; });

function getPeriodData(period){
  const data = getData().sort((a,b)=>a.date.localeCompare(b.date)); const now=new Date(); let from;
  if(period==='week'){ from=new Date(now); from.setDate(now.getDate()-6); }
  else if(period==='month'){ from=new Date(now); from.setDate(now.getDate()-45); }
  else { from=new Date(now); from.setFullYear(now.getFullYear()-1); }
  return data.filter(d=> new Date(d.date) >= from);
}

function renderChart(period){
  const ctx = document.getElementById('dataChart').getContext('2d'); const d=getPeriodData(period);
  const labels=d.map(x=>x.date); const w=d.map(x=>x.weight); const f=d.map(x=>x.fat); const m=d.map(x=>x.muscle);
  if(chart) chart.destroy();
  chart = new Chart(ctx,{ type:'line', data:{ labels, datasets:[
      { label:'体重(kg)', data:w, borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.1)', tension:.3, fill:false },
      { label:'体脂肪(%)', data:f, borderColor:'#f43f5e', backgroundColor:'rgba(244,63,94,0.1)', tension:.3, fill:false },
      { label:'筋肉量(kg)', data:m, borderColor:'#10b981', backgroundColor:'rgba(16,185,129,0.1)', tension:.3, fill:false }
    ]}, options:{ responsive:true, plugins:{ legend:{display:true, position:'top'} }, scales:{ x:{title:{display:true,text:'日付'}}, y:{title:{display:true,text:'数値'}} } } });
}

// Load Chart.js then init ------------------------------------------------------
(function loadChartJs(){
  if(window.Chart) return init();
  const s=document.createElement('script');
  // Pin to a specific file to avoid sourcemap 404s from CDN aliasing
  s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
  s.crossOrigin='anonymous';
  s.onload=init; document.head.appendChild(s);
})();

function init(){
  // set placeholder (JA)
  if (dateInput) dateInput.placeholder = '年-月-日';
  // wire sliders text
  [weightSlider,fatSlider,muscleSlider].forEach(el=> el.addEventListener('input', updateSliderValues));
  dateInput?.addEventListener('change', syncButtonsByDateInput);
  updateSliderValues(); renderList(); renderChart(currentPeriod); resetForm();
  syncButtonsByDateInput();
  initRulers();
  // Bias so labels align under the red bar
  setRulerBiasTicksForAll(1.8);
  // re-sync all rulers with the new bias
  [weightSlider,fatSlider,muscleSlider].forEach(el=> el && el.dispatchEvent(new Event('input', {bubbles:true})));

  // Make the whole date card clickable -> focus the date input
  if (dateCard && dateInput){
    dateCard.style.cursor = 'pointer';
    const openPicker = ()=>{ try { if (typeof dateInput.showPicker === 'function') { dateInput.showPicker(); } else { dateInput.focus(); dateInput.click(); } } catch(_) { dateInput.focus(); } };
    dateCard.addEventListener('click', (e)=>{ e.preventDefault(); openPicker(); });
    dateCard.addEventListener('pointerdown', (e)=>{ e.preventDefault(); });
    dateInput.addEventListener('click', ()=> openPicker());
  }
  // Display-only calibration: show 60.00kg without changing slider value
  weightCalBtn?.addEventListener('click', ()=>{
    const current = parseFloat(weightSlider.value);
    weightDisplayOffset = +(59.8 - current).toFixed(2);
    updateSliderValues();
  });
}

// Inline rulers ---------------------------------------------------------------
function buildInlineRuler(trackEl, min, max, step){
  // Canvas-based ruler for pixel-perfect rendering with wide scroll
  const canvas = trackEl.querySelector('canvas'); if(!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const padding = 40; const topPad = 10; const bottomPad = 26;
  const visibleW = trackEl.clientWidth; const height = trackEl.clientHeight;
  const totalSteps = Math.round((max-min)/step);
  const pxPerStep = 24; // finer spacing per 0.1 step for smoother control
  const fullW = padding*2 + pxPerStep*totalSteps;
  canvas.width = Math.max(1, Math.floor(fullW*dpr)); canvas.height = Math.max(1, Math.floor(height*dpr));
  canvas.style.width = fullW + 'px'; canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,fullW,height);
  ctx.translate(padding, topPad);
  for(let i=0;i<=totalSteps;i++){
    const x = Math.round(i*pxPerStep) + 0.5; // pixel grid alignment
    const isMajor = (i % Math.round(1/step) === 0);
    ctx.strokeStyle = isMajor ? '#0f172a' : '#94a3b8';
    ctx.lineWidth = 2;
    const h = isMajor ? 28 : 16;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    if(isMajor){ ctx.fillStyle = '#475569'; ctx.font = '12px Noto Sans JP, Arial'; ctx.textAlign='center'; ctx.fillText(String((min+i*step).toFixed(1)).replace(/\.0$/,''), x, h+14); }
  }
}

function wireRuler(trackEl, sliderEl, labelEl, unit, min, max, step){
  if(!trackEl||!sliderEl) return; buildInlineRuler(trackEl,min,max,step);
  // Geometry helpers -----------------------------------------------------------
  const getStepPx=()=> 24; // match buildInlineRuler spacing
  const getPaddingLeft=()=>{ const cs = window.getComputedStyle(trackEl); const pl = parseFloat(cs.paddingLeft||'0'); return isNaN(pl)?0:pl; };
  const center=()=> trackEl.clientWidth/2;
  // For canvas-based ruler, ticks start exactly at left padding
  const calcOriginOffset=()=> getPaddingLeft();
  let originOffset = calcOriginOffset();
  const type = trackEl.id.indexOf('weight')===0?'weight':(trackEl.id.indexOf('fat')===0?'fat':'muscle');
  const getBias=()=> Number(rulerBias[type]||0);
  const setBias=(b)=>{ rulerBias[type]=b; saveRulerBias(); };
  const toIndex=(v)=> Math.round((v-min)/step);
  const clampIdx=(i)=> Math.max(0, Math.min(i, Math.round((max-min)/step)));
  let isSyncing=false, snapT;
  const scrollToIndex=(idx)=>{ isSyncing=true; trackEl.scrollLeft = Math.max(0, idx*getStepPx() + originOffset - center() + getBias()); requestAnimationFrame(()=>{ isSyncing=false; }); };
  const valueFromScroll=()=>{ const px = trackEl.scrollLeft + center() - originOffset - getBias(); const raw = px/getStepPx(); const idx = clampIdx(Math.round(raw + 1e-3)); return { idx, val: +(min + idx*step).toFixed(1) }; };
  const updateLabelFromSlider=()=>{ const v=parseFloat(sliderEl.value); if(labelEl) labelEl.textContent = Number(v).toFixed(2)+unit; };
  const syncFromSlider=()=>{ const val=+parseFloat(sliderEl.value).toFixed(1); sliderEl.value=val; updateLabelFromSlider(); scrollToIndex(toIndex(val)); highlightNearestLabel(trackEl); };
  sliderEl.addEventListener('input', syncFromSlider);
  const onScroll = ()=>{
    if(isSyncing) return;
    const g = valueFromScroll();
    const cur = parseFloat(sliderEl.value);
    if (Math.abs(g.val - cur) > 0.6) { scrollToIndex(toIndex(cur)); return; }
    sliderEl.value=g.val; updateLabelFromSlider(); highlightNearestLabel(trackEl);
  };
  trackEl.addEventListener('scroll', ()=>{ window.requestAnimationFrame(onScroll); });
  const scheduleSnap=()=>{ if(isSyncing) return; clearTimeout(snapT); snapT=setTimeout(()=>{ originOffset=calcOriginOffset(); const g=valueFromScroll();
      // Auto 1px calibration: measure residual error and round to nearest pixel
      const residual = (trackEl.scrollLeft + center()) - (originOffset + getBias() + g.idx*getStepPx());
      const corr = Math.round(residual);
      if (Math.abs(corr) <= 1) { rulerBias[type] = getBias() + corr; saveRulerBias(); }
      scrollToIndex(g.idx); sliderEl.value=g.val; updateLabelFromSlider(); highlightNearestLabel(trackEl); }, 120); };
  trackEl.addEventListener('scroll', scheduleSnap, {passive:true});
  // Manual micro-calibration: double-click the blue value to align current value to center
  if(labelEl){
    labelEl.addEventListener('dblclick', ()=>{
      const idx = toIndex(parseFloat(sliderEl.value));
      const target = idx*getStepPx() + originOffset - center() + getBias();
      const current = trackEl.scrollLeft;
      const residual = target - current; // px
      const newBias = getBias() - Math.round(residual);
      setBias(newBias);
      scrollToIndex(idx);
    });
  }
  // drag support (track/pointer/wrap)
  addDragScroll(trackEl.parentElement, trackEl); addDragScroll(trackEl, trackEl); addPointerDrag(trackEl.parentElement.querySelector('.ruler-pointer'), trackEl);
  // initial
  syncFromSlider();
}

// Fine recenter helper (1px precision)
function recenterRuler(kind){
  const trackId = kind==='weight'?'weightRulerTrack':(kind==='fat'?'fatRulerTrack':'muscleRulerTrack');
  const sliderEl = kind==='weight'?weightSlider:(kind==='fat'?fatSlider:muscleSlider);
  const min = kind==='weight'?40:(kind==='fat'?10:10);
  const step = 0.1;
  const trackEl = document.getElementById(trackId); if(!trackEl||!sliderEl) return;
  const getPaddingLeft=()=>{ const cs = window.getComputedStyle(trackEl); const pl = parseFloat(cs.paddingLeft||'0'); return isNaN(pl)?0:pl; };
  const center=()=> trackEl.clientWidth/2;
  const originOffset = getPaddingLeft();
  const stepPx = 24;
  const type = kind;
  const bias = Number(rulerBias[type]||0);
  const idx = Math.round((parseFloat(sliderEl.value)-min)/step);
  const expected = idx*stepPx + originOffset - center() + bias;
  const actual = trackEl.scrollLeft;
  const corr = Math.round(actual - expected);
  if (Math.abs(corr) !== 0){ rulerBias[type] = bias + corr; saveRulerBias(); }
}

// Set bias for all rulers in ticks (each tick = 0.1 step)
function setRulerBiasTicksForAll(ticks){
  const pxPerStep = 24; // keep in sync with buildInlineRuler/getStepPx
  const px = Math.round(ticks * pxPerStep);
  rulerBias.weight = px; rulerBias.fat = px; rulerBias.muscle = px; saveRulerBias();
}

function highlightNearestLabel(trackEl){
  const rect = trackEl.getBoundingClientRect(); const cx=rect.left+rect.width/2; let target=null, best=1e9;
  Array.from(trackEl.children).forEach(el=>{ const r=el.getBoundingClientRect(); const d=Math.abs((r.left+r.width/2)-cx); if(d<best){best=d; target=el;} });
  trackEl.querySelectorAll('.label').forEach(l=>{ l.style.fontWeight='700'; l.style.color='#475569'; });
  const lab = target?.querySelector('.label'); if(lab){ lab.style.fontWeight='900'; lab.style.color='#111827'; }
}

function addDragScroll(dragSource, scrollTarget){
  if(!dragSource||!scrollTarget) return; let down=false, sx=0, start=0;
  const onDown=(e)=>{ down=true; sx=(e.touches?e.touches[0].clientX:e.clientX); start=scrollTarget.scrollLeft; dragSource.classList.add('dragging'); e.preventDefault(); };
  const onMove=(e)=>{ if(!down) return; const x=(e.touches?e.touches[0].clientX:e.clientX); scrollTarget.scrollLeft = start - (x - sx); e.preventDefault(); };
  const onUp=()=>{ down=false; dragSource.classList.remove('dragging'); };
  dragSource.addEventListener('mousedown', onDown, {passive:false}); dragSource.addEventListener('mousemove', onMove, {passive:false}); window.addEventListener('mouseup', onUp);
  dragSource.addEventListener('touchstart', onDown, {passive:false}); dragSource.addEventListener('touchmove', onMove, {passive:false}); window.addEventListener('touchend', onUp);
}

function addPointerDrag(pointerEl, trackEl){
  if(!pointerEl||!trackEl) return; let down=false, sx=0, start=0; pointerEl.style.touchAction='none';
  const onDown=(e)=>{ down=true; sx=e.clientX; start=trackEl.scrollLeft; pointerEl.setPointerCapture?.(e.pointerId); e.preventDefault(); };
  const onMove=(e)=>{ if(!down) return; const dx=e.clientX-sx; trackEl.scrollLeft=start+dx; e.preventDefault(); };
  const onEnd=()=>{ down=false; };
  pointerEl.addEventListener('pointerdown', onDown, {passive:false}); pointerEl.addEventListener('pointermove', onMove, {passive:false}); pointerEl.addEventListener('pointerup', onEnd); pointerEl.addEventListener('pointercancel', onEnd); pointerEl.addEventListener('pointerleave', onEnd);
}

function initRulers(){
  wireRuler(document.getElementById('weightRulerTrack'), weightSlider, weightLabel, 'kg', 40, 80, 0.1);
  wireRuler(document.getElementById('fatRulerTrack'), fatSlider, fatLabel, '%', 10, 40, 0.1);
  wireRuler(document.getElementById('muscleRulerTrack'), muscleSlider, muscleLabel, 'kg', 10, 50, 0.1);
  // clicking large value → prompt numeric input and apply
  function promptAndSet(sliderEl, labelEl, trackId, unit, min, max, step){
    const cur = parseFloat(sliderEl.value || min);
    const input = prompt(`${unit==='%'?'값':'값(kg)'}을 입력하세요`, cur.toFixed(2));
    if(input===null) return; const v=parseFloat(input);
    if(isNaN(v)) return alert('숫자를 입력해주세요');
    const clamped = Math.min(max, Math.max(min, v));
    sliderEl.value = (+clamped.toFixed(1));
    updateSliderValues();
    wireRuler(document.getElementById(trackId), sliderEl, labelEl, unit, min, max, step);
  }
  weightLabel?.addEventListener('click', ()=> promptAndSet(weightSlider, weightLabel, 'weightRulerTrack', 'kg', 30,80,0.1));
  fatLabel?.addEventListener('click', ()=> promptAndSet(fatSlider, fatLabel, 'fatRulerTrack', '%', 10,40,0.1));
  muscleLabel?.addEventListener('click', ()=> promptAndSet(muscleSlider, muscleLabel, 'muscleRulerTrack', 'kg', 10,50,0.1));
}

// Topbar date -----------------------------------------------------------------
(function(){ const el=document.getElementById('topbarDate'); if(!el) return; const d=new Date(); el.textContent=`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`; })();


