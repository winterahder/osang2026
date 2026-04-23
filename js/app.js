// ============================================
// 2026 대입 상담카드 - GitHub Pages 버전
// ============================================

const DATA_DIR = 'data';
const state = {
  students: [],
  meta: null,
  data: {
    mock: null, grades: null, sewtuk: null, behavior: null,
    autonomy: null, career: null, club: null, volunteer: null,
    award: null, reading: null, applications: null, checklist: null,
    attendance: null
  },
  currentStudent: null,
  currentTab: 'basic',
  filter: { grade: 'all', search: '' },
  mockChart: null
};

// ============================================
// 초기화
// ============================================
async function init() {
  try {
    // 메타정보
    state.meta = await fetchJSON('meta.json');
    document.getElementById('meta-updated').textContent = 
      `📅 ${state.meta.updated} · 총 ${state.meta.total_students}명`;

    // 학생 마스터
    state.students = await fetchJSON('students.json');

    // 나머지 데이터는 lazy-load (모의고사만 미리 로드)
    state.data.mock = await fetchJSON('mock.json');

    renderStudentList();
    setupEventListeners();
  } catch (e) {
    console.error('초기화 실패', e);
    document.getElementById('emptyState').innerHTML = 
      `<div class="empty-icon">⚠️</div><h2>데이터 로드 실패</h2><p>${e.message}</p>`;
  }
}

async function fetchJSON(name) {
  const res = await fetch(`${DATA_DIR}/${name}`);
  if (!res.ok) throw new Error(`${name} 로드 실패 (${res.status})`);
  return res.json();
}

async function lazyLoad(key) {
  if (state.data[key]) return state.data[key];
  state.data[key] = await fetchJSON(`${key}.json`);
  return state.data[key];
}

// ============================================
// 학생 목록 렌더링
// ============================================
function renderStudentList() {
  const list = document.getElementById('studentList');
  const filtered = state.students.filter(s => {
    if (state.filter.grade !== 'all' && s.grade !== parseInt(state.filter.grade)) return false;
    if (state.filter.search) {
      const q = state.filter.search.toLowerCase();
      return s.name.toLowerCase().includes(q) || String(s.hak).includes(q);
    }
    return true;
  });

  // 정렬: 학년, 반, 번호
  filtered.sort((a,b) => a.hak - b.hak);

  list.innerHTML = filtered.map(s => `
    <div class="student-item ${state.currentStudent?.hak === s.hak ? 'active' : ''}" 
         data-hak="${s.hak}">
      <span>${s.grade}-${s.class}반 ${s.num}번 · ${s.name}</span>
      <span class="hak">${s.hak}</span>
    </div>
  `).join('');

  document.getElementById('studentCount').textContent = `${filtered.length}명`;

  list.querySelectorAll('.student-item').forEach(el => {
    el.addEventListener('click', () => selectStudent(parseInt(el.dataset.hak)));
  });
}

// ============================================
// 이벤트 리스너
// ============================================
function setupEventListeners() {
  // 학년 필터
  document.querySelectorAll('.grade-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filter.grade = btn.dataset.grade;
      renderStudentList();
    });
  });

  // 검색
  document.getElementById('searchInput').addEventListener('input', e => {
    state.filter.search = e.target.value;
    renderStudentList();
  });

  // 탭 전환
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}

// ============================================
// 학생 선택
// ============================================
function selectStudent(hak) {
  const student = state.students.find(s => s.hak === hak);
  if (!student) return;
  state.currentStudent = student;

  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('studentCard').style.display = 'block';

  // 학생 헤더 업데이트
  document.getElementById('stuName').textContent = student.name;
  document.getElementById('stuHak').textContent = `학번 ${student.hak}`;
  document.getElementById('stuGender').textContent = student.gender;
  document.getElementById('stuClassInfo').textContent = 
    `${student.grade}학년 ${student.class}반 ${student.num}번`;

  // 학번 이력
  const hist = [];
  if (student.g1_hak) hist.push(`1학년: ${student.g1_hak}`);
  if (student.g2_hak) hist.push(`2학년: ${student.g2_hak}`);
  if (student.g3_hak) hist.push(`3학년: ${student.g3_hak}`);
  document.getElementById('stuHistory').textContent = '🔗 ' + hist.join(' → ');

  renderStudentList();
  renderTab(state.currentTab);
}

// ============================================
// 탭 전환
// ============================================
async function switchTab(tabName) {
  state.currentTab = tabName;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.id === `tab-${tabName}`));
  renderTab(tabName);
}

async function renderTab(tabName) {
  if (!state.currentStudent) return;
  const container = document.getElementById(`tab-${tabName}`);
  const s = state.currentStudent;

  switch (tabName) {
    case 'basic': renderBasic(container, s); break;
    case 'mock': renderMock(container, s); break;
    case 'grades': await renderText(container, s, 'grades', '내신'); break;
    case 'award': await renderText(container, s, 'award', '수상경력', true); break;
    case 'autonomy': await renderText(container, s, 'autonomy', '자율활동'); break;
    case 'club': await renderText(container, s, 'club', '동아리활동'); break;
    case 'volunteer': await renderText(container, s, 'volunteer', '봉사활동'); break;
    case 'career': await renderText(container, s, 'career', '진로활동'); break;
    case 'reading': await renderText(container, s, 'reading', '독서활동', true); break;
    case 'sewtuk': await renderText(container, s, 'sewtuk', '세부능력 및 특기사항'); break;
    case 'behavior': await renderText(container, s, 'behavior', '행동특성 및 종합의견'); break;
    case 'attendance': await renderText(container, s, 'attendance', '출결상황'); break;
    case 'applications': await renderText(container, s, 'applications', '지원대학'); break;
    case 'checklist': await renderText(container, s, 'checklist', '평가 체크리스트'); break;
  }
}

// ============================================
// 기본정보 탭
// ============================================
function renderBasic(el, s) {
  const hist = [];
  if (s.g1_hak) hist.push({year: '2024' === null ? '' : computeYear(s, 1), grade: '1학년', hak: s.g1_hak});
  if (s.g2_hak) hist.push({year: computeYear(s, 2), grade: '2학년', hak: s.g2_hak});
  if (s.g3_hak) hist.push({year: computeYear(s, 3), grade: '3학년', hak: s.g3_hak});

  el.innerHTML = `
    <div class="section">
      <h3 class="section-title">📋 인적사항</h3>
      <div class="info-grid">
        <div class="info-item"><div class="info-label">성명</div><div class="info-value">${s.name}</div></div>
        <div class="info-item"><div class="info-label">성별</div><div class="info-value">${s.gender}</div></div>
        <div class="info-item"><div class="info-label">현 학번</div><div class="info-value">${s.hak}</div></div>
        <div class="info-item"><div class="info-label">현 학년/반/번호</div><div class="info-value">${s.grade}-${s.class}-${s.num}</div></div>
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">🔗 학년별 학번 이력</h3>
      <table class="data-table">
        <thead><tr><th>학년도</th><th>학년</th><th>학번</th><th>반</th><th>번호</th></tr></thead>
        <tbody>
          ${hist.map(h => {
            const cls = Math.floor((h.hak % 10000) / 100);
            const num = h.hak % 100;
            return `<tr><td>${h.year}</td><td>${h.grade}</td><td><b>${h.hak}</b></td><td>${cls}</td><td>${num}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h3 class="section-title">ℹ️ 안내</h3>
      <p style="color:#64748b; font-size:0.9rem;">
        • 주소, 연락처, 주민번호 등 민감정보는 이 시스템에서 관리되지 않습니다.<br>
        • 내신·세특·행발·창체 등은 추후 데이터가 연동되면 자동 표시됩니다.
      </p>
    </div>
  `;
}

function computeYear(s, gradeTarget) {
  // 현재 학년/연도에서 역산
  const baseYear = 2026;
  return baseYear - (s.grade - gradeTarget);
}

// ============================================
// 모의고사 탭
// ============================================
function renderMock(el, s) {
  const records = state.data.mock[String(s.hak)] || [];

  if (records.length === 0) {
    el.innerHTML = noDataHTML('모의고사 성적 데이터가 없습니다.');
    return;
  }

  const gradeCell = v => v === null || v === undefined ? '-' : `<span class="grade-cell grade-${v}">${v}</span>`;
  const numCell = v => v === null || v === undefined ? '-' : v;

  el.innerHTML = `
    <div class="section">
      <h3 class="section-title">📊 모의고사 등급 추이</h3>
      <div class="chart-container">
        <canvas id="mockChart"></canvas>
      </div>
    </div>

    <div class="section">
      <h3 class="section-title">📝 회차별 성적</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th rowspan="2">연도</th><th rowspan="2">학년</th><th rowspan="2">구분</th>
            <th colspan="2">국어</th><th colspan="2">수학</th><th colspan="2">영어</th>
            <th>한국사</th><th colspan="2">탐구1</th><th colspan="2">탐구2</th>
          </tr>
          <tr>
            <th>원점수</th><th>등급</th>
            <th>원점수</th><th>등급</th>
            <th>원점수</th><th>등급</th>
            <th>등급</th>
            <th>과목</th><th>등급</th>
            <th>과목</th><th>등급</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(r => `
            <tr>
              <td>${r.연도}</td>
              <td>${r.학년}</td>
              <td><b>${r.구분}</b></td>
              <td>${numCell(r.kor_raw)}</td><td>${gradeCell(r.kor_grade)}</td>
              <td>${numCell(r.math_raw)}</td><td>${gradeCell(r.math_grade)}</td>
              <td>${numCell(r.eng_raw)}</td><td>${gradeCell(r.eng_grade)}</td>
              <td>${gradeCell(r.kh_grade)}</td>
              <td style="font-size:0.8rem;">${r.t1_subj || '-'}</td><td>${gradeCell(r.t1_grade)}</td>
              <td style="font-size:0.8rem;">${r.t2_subj || '-'}</td><td>${gradeCell(r.t2_grade)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  drawMockChart(records);
}

function drawMockChart(records) {
  const ctx = document.getElementById('mockChart');
  if (!ctx) return;
  if (state.mockChart) state.mockChart.destroy();

  const labels = records.map(r => `${String(r.연도).slice(2)}-${r.학년}학년 ${r.구분}`);
  const mkLine = (label, key, color) => ({
    label, data: records.map(r => r[key]),
    borderColor: color, backgroundColor: color + '33',
    tension: 0.3, spanGaps: true, borderWidth: 2
  });

  state.mockChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        mkLine('국어', 'kor_grade', '#3b82f6'),
        mkLine('수학', 'math_grade', '#ef4444'),
        mkLine('영어', 'eng_grade', '#10b981'),
        mkLine('탐구1', 't1_grade', '#f59e0b'),
        mkLine('탐구2', 't2_grade', '#8b5cf6')
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: {
          reverse: true, min: 1, max: 9,
          ticks: { stepSize: 1 },
          title: { display: true, text: '등급 (낮을수록 우수)' }
        }
      }
    }
  });
}

// ============================================
// 텍스트/기본 탭 (데이터 추후 입력)
// ============================================
async function renderText(el, s, key, title, notUsed=false) {
  await lazyLoad(key);
  const records = state.data[key][String(s.hak)] || [];

  let note = '';
  if (notUsed) {
    note = `<div style="background:#fef3c7; color:#92400e; padding:0.6rem 1rem; border-radius:6px; font-size:0.85rem; margin-bottom:1rem;">
      ⚠️ ${title}은(는) 2024학번부터 대입에 반영되지 않지만, 학생 지도를 위한 참고 자료로 표시됩니다.
    </div>`;
  }

  if (records.length === 0) {
    el.innerHTML = `
      <div class="section">
        <h3 class="section-title">${title}</h3>
        ${note}
        ${noDataHTML(`${title} 데이터가 아직 입력되지 않았습니다.<br>추후 <code>data/${key}.json</code>에 데이터가 추가되면 자동으로 표시됩니다.`)}
      </div>`;
    return;
  }

  // 레코드가 있으면 간단히 JSON 표시 (추후 구조에 맞춰 재렌더)
  el.innerHTML = `
    <div class="section">
      <h3 class="section-title">${title}</h3>
      ${note}
      <pre style="background:#f8fafc; padding:1rem; border-radius:8px; overflow:auto; font-size:0.85rem;">${JSON.stringify(records, null, 2)}</pre>
    </div>
  `;
}

function noDataHTML(msg) {
  return `<div class="no-data">
    <div class="no-data-icon">📭</div>
    <div>${msg}</div>
  </div>`;
}

// 시작
init();
