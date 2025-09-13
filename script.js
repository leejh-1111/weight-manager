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

// Helpers ---------------------------------------------------------------------
function getData(){ return JSON.parse(localStorage.getItem('healthData')||'[]'); }
function setData(d){ localStorage.setItem('healthData', JSON.stringify(d)); }
function setWeightText(v){ if (weightLabel) weightLabel.textContent = v + 'kg'; }
function setFatText(v){ if (fatLabel) fatLabel.textContent = v + '%'; }
function setMuscleText(v){ if (muscleLabel) muscleLabel.textContent = v + 'kg'; }
function updateSliderValues(){ setWeightText(weightSlider.value); setFatText(fatSlider.value); setMuscleText(muscleSlider.value); }

// Feedback --------------------------------------------------------------------
function showFeedback(msg, color = '#22c55e'){
  const el = document.getElementById('feedback'); if(!el) return;
  el.textContent = msg; el.style.background = color; el.style.display='block'; el.style.opacity='1';
  setTimeout(()=>{ el.style.opacity='0'; setTimeout(()=>{ el.style.display='none'; }, 350); }, 1600);
}

// Form reset/list --------------------------------------------------------------
let selectedDate = null;
function resetForm(){
  if (dateInput) dateInput.value = '';
  weightSlider.value = 60; fatSlider.value = 25; muscleSlider.value = 30;
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
};

// Save/Update/Delete -----------------------------------------------------------
saveBtn.onclick = function(e){
  e.preventDefault(); const date = dateInput.value; if(!date) return showFeedback('日付を選択してください！', '#f43f5e');
  const data = getData(); if (data.some(d=>d.date===date)) return showFeedback('すでに入力された日付です。修正するにはリストから選択してください。', '#fbbf24');
  data.push({ date, weight:+weightSlider.value, fat:+fatSlider.value, muscle:+muscleSlider.value }); setData(data);
  renderList(); renderChart(currentPeriod); resetForm(); showFeedback('保存しました！');
};

updateBtn.onclick = function(e){
  e.preventDefault(); if(!selectedDate) return; const data=getData(); const idx=data.findIndex(d=>d.date===selectedDate); if(idx<0) return;
  data[idx] = { date: dateInput.value, weight:+weightSlider.value, fat:+fatSlider.value, muscle:+muscleSlider.value };
  setData(data); renderList(); renderChart(currentPeriod); resetForm(); showFeedback('修正しました！', '#2563eb');
};

deleteBtn.onclick = function(e){
  e.preventDefault(); if(!selectedDate) return; let data=getData(); data=data.filter(d=>d.date!==selectedDate);
  setData(data); renderList(); renderChart(currentPeriod); resetForm(); showFeedback('削除しました！', '#e11d48');
};

// Import/Export ----------------------------------------------------------------
exportBtn.onclick = function(){
  const blob = new Blob([JSON.stringify(getData(), null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='健康データ.json';
  document.body.appendChild(a); a.click(); setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
};

importInput.onchange = function(e){
  const file = e.target.files[0]; if(!file) return; const reader = new FileReader();
  reader.onload = (evt)=>{ try { const imported = JSON.parse(evt.target.result); if(!Array.isArray(imported)) throw new Error('形式が正しくありません');
      const cur = getData(); const merged=[...cur]; imported.forEach(n=>{ if(!merged.some(d=>d.date===n.date)) merged.push(n); });
      setData(merged); renderList(); renderChart(currentPeriod); alert('インポート成功');
    } catch(err){ alert('インポート失敗: '+err.message); } importInput.value=''; };
  reader.readAsText(file);
};

// Chart -----------------------------------------------------------------------
let chart=null; let currentPeriod='week';
periodTabs.forEach(tab=>{ tab.onclick=()=>{ periodTabs.forEach(t=>t.classList.remove('active')); tab.classList.add('active'); currentPeriod=tab.dataset.period; renderChart(currentPeriod); }; });

function getPeriodData(period){
  const data = getData().sort((a,b)=>a.date.localeCompare(b.date)); const now=new Date(); let from;
  if(period==='week'){ from=new Date(now); from.setDate(now.getDate()-6); }
  else if(period==='month'){ from=new Date(now); from.setMonth(now.getMonth()-1); }
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
(function loadChartJs(){ if(window.Chart) return init(); const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/chart.js'; s.onload=init; document.head.appendChild(s); })();

function init(){
  // set placeholder (JA)
  if (dateInput) dateInput.placeholder = '年-月-日';
  // wire sliders text
  [weightSlider,fatSlider,muscleSlider].forEach(el=> el.addEventListener('input', updateSliderValues));
  updateSliderValues(); renderList(); renderChart(currentPeriod); resetForm();
  initRulers();
}

// Inline rulers ---------------------------------------------------------------
function buildInlineRuler(trackEl, min, max, step){
  trackEl.innerHTML=''; const total=Math.round((max-min)/step);
  for(let i=0;i<=total;i++){
    const v=+(min+i*step).toFixed(1); const div=document.createElement('div');
    const isMajor = (i % Math.round(1/step) === 0);
    div.className='ruler-tick'+(isMajor?' major':'');
    const t=document.createElement('div'); t.className='t';
    const lbl=document.createElement('div'); lbl.className='label'; if(isMajor) lbl.textContent=String(v).replace(/\.0$/,'');
    div.appendChild(t); div.appendChild(lbl); trackEl.appendChild(div);
  }
}

function wireRuler(trackEl, sliderEl, labelEl, unit, min, max, step){
  if(!trackEl||!sliderEl) return; buildInlineRuler(trackEl,min,max,step);
  const getStepPx=()=>{ const a=trackEl.children[0], b=trackEl.children[1]; return (!a||!b)?16:Math.max(8, Math.round(b.getBoundingClientRect().left - a.getBoundingClientRect().left)); };
  const center=()=> trackEl.clientWidth/2;
  const toIndex=(v)=> Math.round((v-min)/step);
  const scrollToIndex=(idx)=>{ trackEl.scrollLeft = idx*getStepPx() - center(); };
  const syncFromSlider=()=>{ const v=parseFloat(sliderEl.value); if(labelEl) labelEl.textContent=v+unit; scrollToIndex(toIndex(v)); highlightNearestLabel(trackEl); };
  sliderEl.addEventListener('input', syncFromSlider);
  trackEl.addEventListener('scroll', ()=>{ window.requestAnimationFrame(()=>{
    const idx = Math.round((trackEl.scrollLeft + center())/getStepPx());
    const v = +(min + idx*step).toFixed(1);
    sliderEl.value = v; if(labelEl) labelEl.textContent = v+unit; highlightNearestLabel(trackEl);
    updateSliderValues();
  }); });
  // snap
  let snapT; trackEl.addEventListener('scroll', ()=>{ clearTimeout(snapT); snapT=setTimeout(()=>{ scrollToIndex(Math.round((trackEl.scrollLeft + center())/getStepPx())); }, 60); }, {passive:true});
  // drag support (track/pointer/wrap)
  addDragScroll(trackEl.parentElement, trackEl); addDragScroll(trackEl, trackEl); addPointerDrag(trackEl.parentElement.querySelector('.ruler-pointer'), trackEl);
  // initial
  syncFromSlider();
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
  wireRuler(document.getElementById('weightRulerTrack'), weightSlider, weightLabel, 'kg', 30, 80, 0.1);
  wireRuler(document.getElementById('fatRulerTrack'), fatSlider, fatLabel, '%', 10, 40, 0.1);
  wireRuler(document.getElementById('muscleRulerTrack'), muscleSlider, muscleLabel, 'kg', 10, 50, 0.1);
  // clicking large value recenters ruler
  weightLabel?.addEventListener('click', ()=> wireRuler(document.getElementById('weightRulerTrack'), weightSlider, weightLabel, 'kg', 30,80,0.1));
  fatLabel?.addEventListener('click', ()=> wireRuler(document.getElementById('fatRulerTrack'), fatSlider, fatLabel, '%', 10,40,0.1));
  muscleLabel?.addEventListener('click', ()=> wireRuler(document.getElementById('muscleRulerTrack'), muscleSlider, muscleLabel, 'kg', 10,50,0.1));
}

// Topbar date -----------------------------------------------------------------
(function(){ const el=document.getElementById('topbarDate'); if(!el) return; const d=new Date(); el.textContent=`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`; })();


