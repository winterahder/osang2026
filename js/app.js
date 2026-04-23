// osang2026 - 학생 상담카드 시스템 v2.3.1
const TAB_FILES = {
  basic: null,
  grades: 'data/grades.json',
  mock: 'data/mock.json',
  award: 'data/award.json',
  autonomy: 'data/autonomy.json',
  club: 'data/club.json',
  volunteer: 'data/volunteer.json',
  career: 'data/career.json',
  reading: 'data/reading.json',
  sewtuk: 'data/sewtuk.json',
  behavior: 'data/behavior.json',
  attendance: 'data/attendance.json',
  application: 'data/applications.json',
  checklist: 'data/checklist.json'
};

const ROUND_ORDER = {
  'g1_3월': 1, 'g1_6월': 2, 'g1_9월': 3, 'g1_11월': 4,
  'g2_3월': 5, 'g2_6월': 6, 'g2_9월': 7, 'g2_11월': 8,
  'g3_3월': 9, 'g3_6월':10, 'g3_9월':11, 'g3_11월':12
};

// 라벨 변환 (g1_3월 → 1학년 3월)
function labelRound(r) {
  return r.replace('g1_', '1학년 ').replace('g2_', '2학년 ').replace('g3_', '3학년 ');
}

let students = [];
let currentStudent = null;
let dataCache = {};
let currentScoreMode = 'grade';
let mockChart = null;

// ============= 초기화 =============
async function init() {
  try {
    const res = await fetch('data/students.json');
    students = await res.json();
    setupFilters();
    renderStudentList();
    setupTabs();
  } catch (e) {
    console.error('students.json 로드 실패', e);
    document.getElementById('studentList').innerHTML = '<p style="padding:20px;color:red">데이터 로드 실패</p>';
  }
}

// ============= 필터 =============
function setupFilters() {
  const gradeSel = document.getElementById('gradeFilter');
  const classSel = document.getElementById('classFilter');
  const search = document.getElementById('searchInput');

  gradeSel.addEventListener('change', () => {
    const g = gradeSel.value;
    if (g === 'all') {
      classSel.style.display = 'none';
      classSel.value = 'all';
    } else {
      classSel.style.display = 'inline-block';
      classSel.innerHTML = '<option value="all">전체 반</option>';
      for (let i = 1; i <= 10; i++) {
        classSel.innerHTML += `<option value="${i}">${i}반</option>`;
      }
    }
    renderStudentList();
  });

  classSel.addEventListener('change', renderStudentList);
  search.addEventListener('input', renderStudentList);
}

// ============= 학생 목록 =============
function renderStudentList() {
  const g = document.getElementById('gradeFilter').value;
  const c = document.getElementById('classFilter').value;
  const q = document.getElementById('searchInput').value.trim().toLowerCase();

  let filtered = students.filter(s => {
    if (g !== 'all' && String(s.grade) !== g) return false;
    if (c !== 'all' && String(s.class) !== c) return false;
    if (q && !s.name.toLowerCase().includes(q) && !String(s.hak).includes(q)) return false;
    return true;
  });

  filtered.sort((a, b) => a.hak - b.hak);

  const list = document.getElementById('studentList');
  document.getElementById('totalCount').textContent = filtered.length;

  if (filtered.length === 0) {
    list.innerHTML = '<p style="padding:20px;color:#888;text-align:center">해당 학생 없음</p>';
    return;
  }

  list.innerHTML = filtered.map(s => `
    <div class="student-item" data-hak="${s.hak}" onclick="selectStudent(${s.hak})">
      <div class="s-hak">${s.hak}</div>
      <div class="s-info">
        <div class="s-name">${s.name}</div>
        <div class="s-meta">${s.grade}학년 ${s.class}반 ${s.no}번 · ${s.gender}</div>
      </div>
    </div>
  `).join('');
}

// ============= 학생 선택 =============
function selectStudent(hak) {
  currentStudent = students.find(s => s.hak === hak);
  document.querySelectorAll('.student-item').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.hak) === hak);
  });
  document.getElementById('detailPanel').style.display = 'block';
  document.getElementById('emptyMsg').style.display = 'none';
  renderHeader();
  const activeTab = document.querySelector('.tab.active')?.dataset.tab || 'basic';
  loadTab(activeTab);
}

function renderHeader() {
  const s = currentStudent;
  const history = [];
  if (s.g1_hak) history.push(`1학년: ${s.g1_hak}`);
  if (s.g2_hak) history.push(`2학년: ${s.g2_hak}`);
  history.push(`현재: ${s.hak}`);
  document.getElementById('studentHeader').innerHTML = `
    <h2>${s.name} <span class="gender-badge">${s.gender}</span></h2>
    <div class="header-meta">
      <span>${s.grade}학년 ${s.class}반 ${s.no}번</span>
      <span class="history">${history.join(' → ')}</span>
    </div>
  `;
}

// ============= 탭 =============
function setupTabs() {
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      if (currentStudent) loadTab(t.dataset.tab);
    });
  });
}

async function loadTab(tab) {
  const panel = document.getElementById('tabContent');
  if (tab === 'basic') { renderBasic(); return; }

  const file = TAB_FILES[tab];
  if (!file) { panel.innerHTML = '<p class="empty">준비 중</p>'; return; }

  if (!dataCache[tab]) {
    try {
      const res = await fetch(file);
      dataCache[tab] = await res.json();
    } catch (e) {
      dataCache[tab] = {};
    }
  }

  if (tab === 'mock') renderMock();
  else renderGeneric(tab);
}

// ============= 기본정보 =============
function renderBasic() {
  const s = currentStudent;
  const panel = document.getElementById('tabContent');
  panel.innerHTML = `
    <div class="basic-grid">
      <div class="info-card">
        <h3>👤 인적사항</h3>
        <table class="info-table">
          <tr><th>이름</th><td>${s.name}</td></tr>
          <tr><th>성별</th><td>${s.gender}</td></tr>
          <tr><th>학년/반/번호</th><td>${s.grade}학년 ${s.class}반 ${s.no}번</td></tr>
          <tr><th>현재 학번</th><td><b>${s.hak}</b></td></tr>
        </table>
      </div>
      <div class="info-card">
        <h3>📜 학번 이력</h3>
        <table class="info-table">
          <tr><th>1학년 학번</th><td>${s.g1_hak || '-'}</td></tr>
          <tr><th>2학년 학번</th><td>${s.g2_hak || '-'}</td></tr>
          <tr><th>3학년 학번</th><td>${s.grade === 3 ? s.hak : '-'}</td></tr>
          <tr><th>비고</th><td>${s.note || '-'}</td></tr>
        </table>
      </div>
    </div>
  `;
}

// ============= 모의고사 =============
function renderMock() {
  const s = currentStudent;
  const records = (dataCache.mock && dataCache.mock[s.hak]) || [];
  const panel = document.getElementById('tabContent');

  if (records.length === 0) {
    panel.innerHTML = '<p class="empty">모의고사 데이터 없음</p>';
    return;
  }

  // 회차 순서 정렬
  records.sort((a, b) => (ROUND_ORDER[a.round] || 99) - (ROUND_ORDER[b.round] || 99));

  panel.innerHTML = `
    <div class="mock-wrap">
      <div class="score-toggle">
        <button class="score-btn active" data-mode="grade">등급</button>
        <button class="score-btn" data-mode="percentile">백분위</button>
        <button class="score-btn" data-mode="standard">표준점수</button>
        <button class="score-btn" data-mode="raw">원점수</button>
      </div>
      <div class="chart-area">
        <canvas id="mockChart"></canvas>
      </div>
      <h3 class="sec-title">회차별 세부 성적</h3>
      <div id="mockTable"></div>
    </div>
  `;

  document.querySelectorAll('.score-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.score-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      currentScoreMode = b.dataset.mode;
      drawMockChart(records);
      drawMockTable(records);
    });
  });

  drawMockChart(records);
  drawMockTable(records);
}

function getScore(rec, subj, mode) {
  // 영어, 한국사는 백분위/표점 없음 → 등급으로 대체
  if ((subj === '영어' || subj === '한국사') && (mode === 'percentile' || mode === 'standard')) {
    return rec[`${subj}_등급`];
  }
  const keyMap = {
    grade: '등급',
    percentile: '백분위',
    standard: '표준점수',
    raw: '원점수'
  };
  return rec[`${subj}_${keyMap[mode]}`];
}

function drawMockChart(records) {
  const ctx = document.getElementById('mockChart').getContext('2d');
  if (mockChart) mockChart.destroy();

  const labels = records.map(r => labelRound(r.round));
  const subjects = ['국어', '수학', '영어', '한국사', '탐구1', '탐구2'];
  const colors = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1'];

  const datasets = subjects.map((subj, i) => ({
    label: subj,
    data: records.map(r => {
      const v = getScore(r, subj, currentScoreMode);
      return (v === null || v === undefined || v === '') ? null : Number(v);
    }),
    borderColor: colors[i],
    backgroundColor: colors[i] + '22',
    tension: 0.3,
    spanGaps: true
  }));

  const isGrade = currentScoreMode === 'grade';

  mockChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 20, bottom: 10, left: 10, right: 10 }
      },
      scales: {
        y: {
          reverse: isGrade,
          min: isGrade ? 0.5 : undefined,
          max: isGrade ? 9.5 : undefined,
          suggestedMin: isGrade ? 0.5 : 0,
          suggestedMax: isGrade ? 9.5 : 100,
          ticks: {
            stepSize: isGrade ? 1 : undefined
          },
          grace: isGrade ? 0 : '5%',
          title: {
            display: true,
            text: {grade:'등급', percentile:'백분위', standard:'표준점수', raw:'원점수'}[currentScoreMode]
          }
        }
      },
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: '모의고사 ' + {grade:'등급', percentile:'백분위', standard:'표준점수', raw:'원점수'}[currentScoreMode] + ' 추이'
        }
      }
    }
  });
}

function drawMockTable(records) {
  const s = currentStudent;
  const subjects = ['국어', '수학', '영어', '한국사', '탐구1', '탐구2'];
  const mode = currentScoreMode;
  const isGrade = mode === 'grade';
  const showSubj = s.grade === 3;

  let html = '<table class="mock-table"><thead><tr><th>회차</th>';
  subjects.forEach(sj => html += `<th>${sj}</th>`);
  html += '</tr></thead><tbody>';

  records.forEach(r => {
    html += `<tr><td class="round-col">${labelRound(r.round)}</td>`;
    subjects.forEach(sj => {
      const isAbsolute = (sj === '영어' || sj === '한국사');
      const forceGrade = isAbsolute && (mode === 'percentile' || mode === 'standard');
      const effectiveMode = forceGrade ? 'grade' : mode;
      const val = getScore(r, sj, mode);
      const displayVal = (val === null || val === undefined || val === '') ? '-' : val;

      let cls = '';
      if (effectiveMode === 'grade' && typeof val === 'number') {
        cls = `grade-${val}`;
      } else if (!forceGrade && (mode === 'raw' || mode === 'standard' || mode === 'percentile')) {
        cls = `score-big score-${mode}`;
      }

      // 선택과목 표시 (3학년만, 수학/탐구1/탐구2)
      let subText = '';
      if (showSubj && (sj === '수학' || sj === '탐구1' || sj === '탐구2')) {
        const subKey = sj === '수학' ? '수학_선택' : `${sj}_과목`;
        const subVal = r[subKey];
        if (subVal) subText = `<div class="sub-name">${subVal}</div>`;
      }

      html += `<td class="${cls}">${displayVal}${subText}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('mockTable').innerHTML = html;
}

// ============= 기타 탭 (generic) =============
function renderGeneric(tab) {
  const s = currentStudent;
  const data = (dataCache[tab] && dataCache[tab][s.hak]) || [];
  const panel = document.getElementById('tabContent');
  const titleMap = {
    grades:'내신 성적', award:'수상경력', autonomy:'자율활동',
    club:'동아리활동', volunteer:'봉사활동', career:'진로활동',
    reading:'독서활동', sewtuk:'세부능력 및 특기사항',
    behavior:'행동특성 및 종합의견', attendance:'출결상황',
    application:'지원대학', checklist:'평가 체크리스트'
  };
  panel.innerHTML = `
    <div class="generic-tab">
      <h3>${titleMap[tab] || tab}</h3>
      ${data.length === 0 ? '<p class="empty">데이터 준비 중 (추후 업로드 예정)</p>' : '<pre>'+JSON.stringify(data, null, 2)+'</pre>'}
    </div>
  `;
}

init();
