// osang2026 - 학생 상담 카드 시스템 v2.3.2
const DATA_DIR = 'data/';
const TAB_FILES = {
  mock: 'mock.json', grades: 'grades.json', sewtuk: 'sewtuk.json',
  behavior: 'behavior.json', autonomy: 'autonomy.json', club: 'club.json',
  volunteer: 'volunteer.json', career: 'career.json', award: 'award.json',
  reading: 'reading.json', applications: 'applications.json',
  checklist: 'checklist.json', attendance: 'attendance.json'
};
const ROUND_ORDER = {
  '1학년 3월':1,'1학년 6월':2,'1학년 9월':3,'1학년 11월':4,
  '2학년 3월':5,'2학년 6월':6,'2학년 9월':7,'2학년 11월':8,
  '3학년 3월':9,'3학년 6월':10,'3학년 9월':11,'3학년 11월':12
};
const LABEL_MAP = {
  'g1_3월':'1학년 3월','g1_6월':'1학년 6월','g1_9월':'1학년 9월','g1_11월':'1학년 11월',
  'g2_3월':'2학년 3월','g2_6월':'2학년 6월','g2_9월':'2학년 9월','g2_11월':'2학년 11월',
  'g3_3월':'3학년 3월','g3_6월':'3학년 6월','g3_9월':'3학년 9월','g3_11월':'3학년 11월'
};

const state = {
  students: [], mock: null, grades: null, sewtuk: null, behavior: null,
  autonomy: null, club: null, volunteer: null, career: null, award: null,
  reading: null, applications: null, checklist: null, attendance: null,
  filteredStudents: [], currentStudent: null, currentTab: 'info',
  scoreType: 'grade', chart: null
};

async function loadJSON(file) {
  try {
    const res = await fetch(DATA_DIR + file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`[로드 실패] ${file}:`, e.message);
    return null;
  }
}

async function init() {
  try {
    const students = await loadJSON('students.json');
    if (!students || !Array.isArray(students)) {
      showError('students.json을 불러올 수 없습니다.');
      return;
    }
    state.students = students.sort((a,b) => (a.hak||'').localeCompare(b.hak||''));
    state.filteredStudents = [...state.students];
    renderStudentList();
    setupFilters();
    setupTabs();
    setupScoreToggle();
    if (state.students.length > 0) selectStudent(state.students[0]);
  } catch (e) {
    showError('초기화 오류: ' + e.message);
    console.error(e);
  }
}

function showError(msg) {
  const list = document.getElementById('student-list');
  if (list) list.innerHTML = `<div class="error">⚠️ ${msg}</div>`;
}

function setupFilters() {
  const search = document.getElementById('search-input');
  const gradeSel = document.getElementById('grade-filter');
  const classSel = document.getElementById('class-filter');
  if (search) search.addEventListener('input', applyFilters);
  if (gradeSel) {
    gradeSel.addEventListener('change', () => {
      updateClassFilter();
      applyFilters();
    });
  }
  if (classSel) classSel.addEventListener('change', applyFilters);
  updateClassFilter();
}

function updateClassFilter() {
  const gradeSel = document.getElementById('grade-filter');
  const classSel = document.getElementById('class-filter');
  if (!gradeSel || !classSel) return;
  const g = gradeSel.value;
  if (g === 'all') {
    classSel.style.display = 'none';
    classSel.value = 'all';
  } else {
    classSel.style.display = '';
    if (classSel.options.length <= 1) {
      classSel.innerHTML = '<option value="all">전체 반</option>' +
        Array.from({length:10},(_,i)=>`<option value="${i+1}">${i+1}반</option>`).join('');
    }
  }
}

function applyFilters() {
  const q = (document.getElementById('search-input')?.value || '').trim().toLowerCase();
  const g = document.getElementById('grade-filter')?.value || 'all';
  const c = document.getElementById('class-filter')?.value || 'all';
  state.filteredStudents = state.students.filter(s => {
    if (g !== 'all' && String(s.grade) !== g) return false;
    if (c !== 'all' && String(s.class) !== c) return false;
    if (q) {
      const hay = (s.name + ' ' + s.hak).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  renderStudentList();
}

function renderStudentList() {
  const list = document.getElementById('student-list');
  if (!list) return;
  if (state.filteredStudents.length === 0) {
    list.innerHTML = '<div class="empty">검색 결과 없음</div>';
    return;
  }
  list.innerHTML = state.filteredStudents.map(s => `
    <div class="student-item ${state.currentStudent?.hak === s.hak ? 'active' : ''}" 
         data-hak="${s.hak}">
      <div class="st-hak">${s.hak}</div>
      <div class="st-name">${s.name}</div>
      <div class="st-meta">${s.grade}학년 ${s.class}반 ${s.num}번 · ${s.gender||''}</div>
    </div>
  `).join('');
  list.querySelectorAll('.student-item').forEach(el => {
    el.addEventListener('click', () => {
      const s = state.students.find(x => x.hak === el.dataset.hak);
      if (s) selectStudent(s);
    });
  });
}

function selectStudent(s) {
  state.currentStudent = s;
  renderStudentList();
  renderCurrentTab();
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentTab = btn.dataset.tab;
      renderCurrentTab();
    });
  });
}

function setupScoreToggle() {
  document.querySelectorAll('.score-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.score-toggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.scoreType = btn.dataset.type;
      if (state.currentTab === 'mock') renderMock();
    });
  });
}

async function renderCurrentTab() {
  const area = document.getElementById('tab-content');
  if (!area) return;
  if (!state.currentStudent) {
    area.innerHTML = '<div class="empty">학생을 선택하세요</div>';
    return;
  }
  const tab = state.currentTab;
  if (tab === 'info') { renderInfo(); return; }
  if (tab === 'mock') {
    if (!state.mock) state.mock = await loadJSON(TAB_FILES.mock);
    renderMock(); return;
  }
  const key = tab;
  if (TAB_FILES[key]) {
    if (!state[key]) state[key] = await loadJSON(TAB_FILES[key]);
    renderGeneric(key);
  } else {
    area.innerHTML = '<div class="empty">준비중</div>';
  }
}

function renderInfo() {
  const s = state.currentStudent;
  const area = document.getElementById('tab-content');
  area.innerHTML = `
    <div class="info-card">
      <h2>${s.name}</h2>
      <div class="info-grid">
        <div><label>현재 학번</label><span class="big">${s.hak}</span></div>
        <div><label>학년/반/번호</label><span>${s.grade}학년 ${s.class}반 ${s.num}번</span></div>
        <div><label>성별</label><span>${s.gender||'-'}</span></div>
        <div><label>1학년 학번</label><span>${s.g1_hak||'-'}</span></div>
        <div><label>2학년 학번</label><span>${s.g2_hak||'-'}</span></div>
        <div><label>3학년 학번</label><span>${s.g3_hak||'-'}</span></div>
      </div>
    </div>
  `;
}

function gradeColorClass(g) {
  g = Number(g);
  if (!g) return '';
  if (g === 1) return 'g1';
  if (g === 2) return 'g2';
  if (g === 3) return 'g3';
  if (g === 4) return 'g4';
  if (g === 5) return 'g5';
  if (g <= 7) return 'g67';
  return 'g89';
}

function renderMock() {
  const s = state.currentStudent;
  const area = document.getElementById('tab-content');
  const toggleHTML = `
    <div class="score-toggle">
      <button data-type="grade" class="${state.scoreType==='grade'?'active':''}">등급</button>
      <button data-type="percentile" class="${state.scoreType==='percentile'?'active':''}">백분위</button>
      <button data-type="standard" class="${state.scoreType==='standard'?'active':''}">표준점수</button>
      <button data-type="raw" class="${state.scoreType==='raw'?'active':''}">원점수</button>
    </div>
  `;
  const records = (state.mock && state.mock[s.hak]) || [];
  if (records.length === 0) {
    area.innerHTML = toggleHTML + '<div class="empty">모의고사 기록 없음</div>';
    setupScoreToggle();
    return;
  }
  records.sort((a,b) => {
    const la = LABEL_MAP[a.round] || a.round;
    const lb = LABEL_MAP[b.round] || b.round;
    return (ROUND_ORDER[la]||99) - (ROUND_ORDER[lb]||99);
  });
  area.innerHTML = `
    ${toggleHTML}
    <div class="chart-wrap"><canvas id="mock-chart"></canvas></div>
    <h3 style="margin-top:24px">회차별 세부 성적</h3>
    <div class="table-wrap">
      <table class="mock-table">
        <thead><tr><th>회차</th><th>국어</th><th>수학</th><th>영어</th><th>한국사</th><th>탐구1</th><th>탐구2</th></tr></thead>
        <tbody>${records.map(r => rowHTML(r, s)).join('')}</tbody>
      </table>
    </div>
  `;
  setupScoreToggle();
  drawChart(records);
}

function cellHTML(r, subj, forceGrade) {
  const g = r[subj + '_grade'] ?? r[subj + '등급'];
  const p = r[subj + '_percentile'] ?? r[subj + '백분위'];
  const st = r[subj + '_standard'] ?? r[subj + '표준점수'];
  const raw = r[subj + '_raw'] ?? r[subj + '원점수'];
  const sel = r[subj + '_select'] ?? r[subj + '선택'];
  let val = '-';
  let cls = '';
  const type = forceGrade ? 'grade' : state.scoreType;
  if (type === 'grade') {
    val = g ?? '-';
    cls = 'grade-cell ' + gradeColorClass(g);
  } else if (type === 'percentile') {
    val = p ?? '-';
    cls = 'score-cell percentile';
  } else if (type === 'standard') {
    val = st ?? '-';
    cls = 'score-cell standard';
  } else {
    val = raw ?? '-';
    cls = 'score-cell raw';
  }
  const selHTML = (sel && state.currentStudent.grade === 3) ? `<small>${sel}</small>` : '';
  return `<td class="${cls}">${val}${selHTML}</td>`;
}

function rowHTML(r, s) {
  const label = LABEL_MAP[r.round] || r.round;
  return `<tr>
    <td class="round-label">${label}</td>
    ${cellHTML(r, '국어', false)}
    ${cellHTML(r, '수학', false)}
    ${cellHTML(r, '영어', true)}
    ${cellHTML(r, '한국사', true)}
    ${cellHTML(r, '탐구1', false)}
    ${cellHTML(r, '탐구2', false)}
  </tr>`;
}

function drawChart(records) {
  const canvas = document.getElementById('mock-chart');
  if (!canvas) return;
  if (state.chart) { state.chart.destroy(); state.chart = null; }
  const labels = records.map(r => LABEL_MAP[r.round] || r.round);
  const subjects = ['국어','수학','영어','한국사','탐구1','탐구2'];
  const colors = ['#e74c3c','#3498db','#2ecc71','#9b59b6','#f39c12','#1abc9c'];
  const type = state.scoreType;
  const datasets = subjects.map((subj,i) => {
    const data = records.map(r => {
      if (type === 'grade' || subj === '영어' || subj === '한국사') {
        if (type === 'grade' || subj === '영어' || subj === '한국사') {
          const v = r[subj+'_grade'] ?? r[subj+'등급'];
          if (type === 'percentile' || type === 'standard') {
            if (subj === '영어' || subj === '한국사') return v ?? null;
          }
          return v ?? null;
        }
      }
      let v;
      if (type === 'percentile') v = r[subj+'_percentile'] ?? r[subj+'백분위'];
      else if (type === 'standard') v = r[subj+'_standard'] ?? r[subj+'표준점수'];
      else if (type === 'raw') v = r[subj+'_raw'] ?? r[subj+'원점수'];
      else v = r[subj+'_grade'] ?? r[subj+'등급'];
      return (v == null || v === '') ? null : Number(v);
    });
    return {
      label: subj, data, borderColor: colors[i], backgroundColor: colors[i]+'33',
      tension: 0.2, spanGaps: true, pointRadius: 4
    };
  });
  const yOpt = (type === 'grade')
    ? { reverse: true, min: 0.5, max: 9.5, ticks:{stepSize:1}, title:{display:true,text:'등급(낮을수록 우수)'} }
    : { title: {display:true, text: type==='percentile'?'백분위':type==='standard'?'표준점수':'원점수'} };
  state.chart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 20, bottom: 10 } },
      plugins: { legend: { position: 'bottom' } },
      scales: { y: yOpt }
    }
  });
}

function renderGeneric(key) {
  const s = state.currentStudent;
  const area = document.getElementById('tab-content');
  const data = state[key];
  if (!data || Object.keys(data).length === 0) {
    area.innerHTML = `<div class="empty">📋 ${key} 데이터가 아직 등록되지 않았습니다.<br><small>추후 업로드 예정</small></div>`;
    return;
  }
  const myData = data[s.hak];
  if (!myData) {
    area.innerHTML = `<div class="empty">${s.name} 학생의 ${key} 데이터 없음</div>`;
    return;
  }
  area.innerHTML = `<pre class="json-dump">${JSON.stringify(myData, null, 2)}</pre>`;
}

document.addEventListener('DOMContentLoaded', init);
