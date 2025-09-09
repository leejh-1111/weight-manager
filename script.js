// 슬라이더 값 표시
const weightSlider = document.getElementById('weightSlider');
const fatSlider = document.getElementById('fatSlider');
const muscleSlider = document.getElementById('muscleSlider');
const weightValue = document.getElementById('weightValue');
const fatValue = document.getElementById('fatValue');
const muscleValue = document.getElementById('muscleValue');
const dateInput = document.getElementById('dateInput');
const saveBtn = document.getElementById('saveBtn');
const updateBtn = document.getElementById('updateBtn');
const deleteBtn = document.getElementById('deleteBtn');
const dataList = document.getElementById('dataList');
const periodTabs = document.querySelectorAll('.tab-btn');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');
let selectedDate = null;

function updateSliderValues() {
  weightValue.textContent = weightSlider.value + 'kg';
  fatValue.textContent = fatSlider.value + '%';
  muscleValue.textContent = muscleSlider.value + 'kg';
}

weightSlider.oninput = updateSliderValues;
fatSlider.oninput = updateSliderValues;
muscleSlider.oninput = updateSliderValues;

// 데이터 저장 구조: [{date, weight, fat, muscle}]
function getData() {
  return JSON.parse(localStorage.getItem('healthData') || '[]');
}
function setData(data) {
  localStorage.setItem('healthData', JSON.stringify(data));
}

function resetForm() {
  dateInput.value = '';
  weightSlider.value = 60;
  fatSlider.value = 25;
  muscleSlider.value = 30;
  updateSliderValues();
  selectedDate = null;
  updateBtn.disabled = true;
  deleteBtn.disabled = true;
  saveBtn.disabled = false;
}

function renderList() {
  const data = getData().sort((a, b) => b.date.localeCompare(a.date));
  dataList.innerHTML = data.map(item =>
    `<div class="data-row${selectedDate === item.date ? ' selected' : ''}" data-date="${item.date}">
      <b>${item.date}</b> | 体重: ${item.weight}kg | 体脂肪: ${item.fat}% | 筋肉量: ${item.muscle}kg
    </div>`
  ).join('');
}

dataList.onclick = function(e) {
  const row = e.target.closest('.data-row');
  if (!row) return;
  const data = getData();
  const item = data.find(d => d.date === row.dataset.date);
  if (item) {
    dateInput.value = item.date;
    weightSlider.value = item.weight;
    fatSlider.value = item.fat;
    muscleSlider.value = item.muscle;
    updateSliderValues();
    selectedDate = item.date;
    updateBtn.disabled = false;
    deleteBtn.disabled = false;
    saveBtn.disabled = true;
  }
};

saveBtn.onclick = function(e) {
  e.preventDefault();
  const date = dateInput.value;
  if (!date) return alert('日付を選択してください！');
  const data = getData();
  if (data.some(d => d.date === date)) return alert('すでに入力された日付です。修正するにはリストから選択してください。');
  data.push({
    date,
    weight: +weightSlider.value,
    fat: +fatSlider.value,
    muscle: +muscleSlider.value
  });
  setData(data);
  renderList();
  renderChart(currentPeriod);
  resetForm();
};

updateBtn.onclick = function(e) {
  e.preventDefault();
  if (!selectedDate) return;
  const data = getData();
  const idx = data.findIndex(d => d.date === selectedDate);
  if (idx === -1) return;
  data[idx] = {
    date: dateInput.value,
    weight: +weightSlider.value,
    fat: +fatSlider.value,
    muscle: +muscleSlider.value
  };
  setData(data);
  renderList();
  renderChart(currentPeriod);
  resetForm();
};

deleteBtn.onclick = function(e) {
  e.preventDefault();
  if (!selectedDate) return;
  let data = getData();
  data = data.filter(d => d.date !== selectedDate);
  setData(data);
  renderList();
  renderChart(currentPeriod);
  resetForm();
};

// 기간별 그래프
let chart = null;
let currentPeriod = 'week';
periodTabs.forEach(tab => {
  tab.onclick = function() {
    periodTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentPeriod = tab.dataset.period;
    renderChart(currentPeriod);
  };
});

function getPeriodData(period) {
  const data = getData().sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date();
  let fromDate;
  if (period === 'week') {
    fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 6);
  } else if (period === 'month') {
    fromDate = new Date(today);
    fromDate.setMonth(today.getMonth() - 1);
  } else {
    fromDate = new Date(today);
    fromDate.setFullYear(today.getFullYear() - 1);
  }
  return data.filter(d => new Date(d.date) >= fromDate);
}

function renderChart(period) {
  const ctx = document.getElementById('dataChart').getContext('2d');
  const periodData = getPeriodData(period);
  const labels = periodData.map(d => d.date);
  const weights = periodData.map(d => d.weight);
  const fats = periodData.map(d => d.fat);
  const muscles = periodData.map(d => d.muscle);
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: '体重(kg)', data: weights, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)', tension: 0.3, fill: false },
        { label: '体脂肪(%)', data: fats, borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.1)', tension: 0.3, fill: false },
        { label: '筋肉量(kg)', data: muscles, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', tension: 0.3, fill: false }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true, position: 'top' }
      },
      scales: {
        x: { title: { display: true, text: '日付' } },
        y: { title: { display: true, text: '数値' } }
      }
    }
  });
}

// Chart.js CDN 동적 로드
(function loadChartJs() {
  if (window.Chart) return init();
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  script.onload = init;
  document.head.appendChild(script);
})();

function init() {
  updateSliderValues();
  renderList();
  renderChart(currentPeriod);
  resetForm();
}

// エクスポート (JSON)
exportBtn.onclick = function() {
  const data = getData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '健康データ.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
};

// インポート (JSON)
importInput.onchange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const imported = JSON.parse(evt.target.result);
      if (!Array.isArray(imported)) throw new Error('ファイル形式が正しくありません。');
      // 日付重複防止: 既存データとマージ
      const oldData = getData();
      const merged = [...oldData];
      imported.forEach(newItem => {
        if (!merged.some(d => d.date === newItem.date)) {
          merged.push(newItem);
        }
      });
      setData(merged);
      renderList();
      renderChart(currentPeriod);
      alert('データが正常にインポートされました！');
    } catch (err) {
      alert('インポート失敗: ' + err.message);
    }
    importInput.value = '';
  };
  reader.readAsText(file);
};
