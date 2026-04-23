
// ==========================================
// 오상고 상담카드 시스템 v2.6
// - DOM null-safe
// - mock.json: key=현재학번, value=배열, round=g1_3월
// ==========================================

const $ = (id) => document.getElementById(id);
const setText = (id, t) => { const el = $(id); if (el) el.textContent = t; };
const setHTML = (id, h) => { const el = $(id); if (el) el.innerHTML = h; };

const STATE = {
  students: [],
  mock: {},
  selected: null,
  filterGrade: '',
  filterClass: '',
  search: '',
  scoreMode: '등급',
  activeTab: '기본정보'
};

const ROUND_ORDER = {
  'g1_3월': 1, 'g1_6월': 2, 'g1_9월': 3, 'g1_11월': 4,
  'g2_3월': 5, 'g2_6월': 6, 'g2_9월': 7, 'g2_11월': 8,
  'g3_3월': 9, 'g3_6월': 10, 'g3_9월': 11, 'g3_11월': 12
};
function roundLabel(r) {
  const m = /g(\d)_(.+)/.exec(r || '');
  return m ? `${m[1]}학년 ${m[2]}` : (r || '-');
}

function parseHak(hak) {
  const s = String(hak || '').padStart(5, '0');
  return { grade: +s[0] || 0, cls: +s.slice(1, 3) || 0, num: +s.slice(3, 5) || 0 };
}

function getField(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return '';
}

// ---------- 데이터 로드 ----------
async function init() {
  try {
    setText('statusBar', '데이터 로드중...');

    const [studentsRes, mockRes] = await Promise.all([
      fetch('data/students.json'),
      fetch('data/mock.json')
    ]);
    if (!studentsRes.ok) throw new Error('students.json 로드 실패 (' + studentsRes.status + ')');
    if (!mockRes.ok) throw new Error('mock.json 로드 실패 (' + mockRes.status + ')');

    const studentsData = await studentsRes.json();
    STATE.mock = await mockRes.json();

    // students.json: 배열이든 딕셔너리든 처리
    let arr = [];
    if (Array.isArray(studentsData)) {
      arr = studentsData;
    } else if (typeof studentsData === 'object') {
      arr = Object.entries(studentsData).map(([k, v]) => ({ hak: k, ...v }));
    }

    // 정규화
    STATE.students = arr.map(s => {
      const hak = getField(s, 'hak', '학번') || '';
      const p = parseHak(hak);
      return {
        hak: String(hak),
        name: getField(s, 'name', '이름', '성명') || '(이름없음)',
        sex: getField(s, 'sex', 'gender', '성별') || '',
        grade: Number(getField(s, 'grade', '학년')) || p.grade,
        cls: Number(getField(s, 'cls', '반')) || p.cls,
        num: Number(getField(s, 'num', '번호')) || p.num,
        g1_hak: getField(s, 'g1_hak', '1학년학번') || '',
        g2_hak: getField(s, 'g2_hak', '2학년학번') || '',
        raw: s
      };
    });

    // 학번 오름차순
    STATE.students.sort((a, b) => String(a.hak).localeCompare(String(b.hak)));

    setText('statusBar', `총 ${STATE.students.length}명 로드됨`);
    buildFilters();
    renderList();
    attachEvents();
  } catch (e) {
    console.error(e);
    setText('statusBar', '오류: ' + e.message);
    const sl = $('studentList');
    if (sl) sl.innerHTML = `<div class="err-box">❌ ${e.message}</div>`;
  }
}

// ---------- 필터 드롭다운 ----------
function buildFilters() {
  const grades = [...new Set(STATE.students.map(s => s.grade).filter(Boolean))].sort();
  const gf = $('gradeFilter');
  if (gf) {
    gf.innerHTML = '<option value="">전체 학년</option>' +
      grades.map(g => `<option value="${g}">${g}학년</option>`).join('');
  }
  updateClassFilter();
}

function updateClassFilter() {
  const cf = $('classFilter');
  if (!cf) return;
  const pool = STATE.filterGrade
    ? STATE.students.filter(s => String(s.grade) === String(STATE.filterGrade))
    : STATE.students;
  const classes = [...new Set(pool.map(s => s.cls).filter(Boolean))].sort((a, b) => a - b);
  cf.innerHTML = '<option value="">전체 반</option>' +
    classes.map(c => `<option value="${c}">${c}반</option>`).join('');
}

// ---------- 이벤트 ----------
function attachEvents() {
  const si = $('searchInput');
  if (si) si.addEventListener('input', (e) => { STATE.search = e.target.value.trim(); renderList(); });
  const gf = $('gradeFilter');
  if (gf) gf.addEventListener('change', (e) => {
    STATE.filterGrade = e.target.value;
    STATE.filterClass = '';
    updateClassFilter();
    renderList();
  });
  const cf = $('classFilter');
  if (cf) cf.addEventListener('change', (e) => { STATE.filterClass = e.target.value; renderList(); });
}

// ---------- 학생 목록 ----------
function renderList() {
  let list = STATE.students;
  if (STATE.filterGrade) list = list.filter(s => String(s.grade) === String(STATE.filterGrade));
  if (STATE.filterClass) list = list.filter(s => String(s.cls) === String(STATE.filterClass));
  if (STATE.search) {
    const q = STATE.search.toLowerCase();
    list = list.filter(s => s.name.toLowerCase().includes(q) || String(s.hak).includes(q));
  }

  setText('countInfo', `${list.length}명`);
  const html = list.map(s => `
    <div class="student-item ${STATE.selected?.hak === s.hak ? 'active' : ''}" data-hak="${s.hak}">
      <span class="hak">${String(s.hak).padStart(5, '0').slice(-4)}</span>
      <span class="name">${s.name}</span>
      <span class="sex">${s.sex}</span>
    </div>
  `).join('');
  setHTML('studentList', html || '<div style="padding:20px;text-align:center;color:#999;">결과 없음</div>');
  const sl = $('studentList');
  if (sl) {
    sl.querySelectorAll('.student-item').forEach(el => {
      el.addEventListener('click', () => selectStudent(el.dataset.hak));
    });
  }
}

// ---------- 학생 선택 ----------
function selectStudent(hak) {
  const s = STATE.students.find(x => String(x.hak) === String(hak));
  if (!s) return;
  STATE.selected = s;
  renderList();
  const empty = $('empty');
  const detail = $('detail');
  if (empty) empty.style.display = 'none';
  if (detail) detail.style.display = 'block';
  renderHeader();
  renderTabs();
  renderTabBody();
}

function renderHeader() {
  const s = STATE.selected;
  const html = `
    <h2>${s.name} <span style="font-size:14px;color:#6b7280;font-weight:400;">(${s.hak})</span></h2>
    <div class="badges">
      <span class="badge">${s.grade}학년 ${s.cls}반 ${s.num}번</span>
      ${s.sex ? `<span class="badge sex">${s.sex}</span>` : ''}
      ${s.g1_hak ? `<span class="badge">1학년 학번: ${s.g1_hak}</span>` : ''}
      ${s.g2_hak ? `<span class="badge">2학년 학번: ${s.g2_hak}</span>` : ''}
    </div>
  `;
  setHTML('studentHeader', html);
}

// ---------- 탭 ----------
const TABS = ['기본정보', '모의고사', '내신', '세특', '행발', '수상', '독서'];

function renderTabs() {
  const html = TABS.map(t => `
    <button class="tab-btn ${STATE.activeTab === t ? 'active' : ''}" data-tab="${t}">${t}</button>
  `).join('');
  setHTML('tabBar', html);
  const tb = $('tabBar');
  if (tb) tb.querySelectorAll('.tab-btn').forEach(b => {
    b.addEventListener('click', () => {
      STATE.activeTab = b.dataset.tab;
      renderTabs();
      renderTabBody();
    });
  });
}

function renderTabBody() {
  try {
    const t = STATE.activeTab;
    if (t === '기본정보') renderBasic();
    else if (t === '모의고사') renderMock();
    else setHTML('tabBody', `<div class="info-box">📝 ${t} 탭은 준비 중입니다.</div>`);
  } catch (e) {
    console.error(e);
    setHTML('tabBody', `<div class="err-box">렌더 오류: ${e.message}</div>`);
  }
}

function renderBasic() {
  const s = STATE.selected;
  const raw = s.raw || {};
  const items = Object.entries(raw)
    .filter(([k, v]) => v !== '' && v !== null && v !== undefined && typeof v !== 'object')
    .map(([k, v]) => `<tr><th style="text-align:left;padding:6px 10px;background:#f9fafb;">${k}</th><td style="padding:6px 10px;">${v}</td></tr>`)
    .join('');
  setHTML('tabBody', `<table style="width:100%;border-collapse:collapse;">${items}</table>`);
}

// ---------- 모의고사 ----------
function getMockRecords(student) {
  // key 후보
  const keys = [student.hak, String(student.hak), Number(student.hak), student.g1_hak, student.g2_hak]
    .filter(Boolean);
  for (const k of keys) {
    const v = STATE.mock[k] ?? STATE.mock[String(k)] ?? STATE.mock[Number(k)];
    if (Array.isArray(v) && v.length) return v;
  }
  return [];
}

function renderMock() {
  const s = STATE.selected;
  const records = getMockRecords(s);

  if (!records || records.length === 0) {
    setHTML('tabBody', `
      <div class="info-box">📊 모의고사 데이터가 없습니다.<br>조회한 학번: ${s.hak}</div>
    `);
    return;
  }

  // 정렬
  const sorted = [...records].sort((a, b) => (ROUND_ORDER[a.round] || 99) - (ROUND_ORDER[b.round] || 99));

  const modes = ['등급', '백분위', '표준점수', '원점수'];
  const modeBtns = modes.map(m => `
    <button class="mode-btn ${STATE.scoreMode === m ? 'active' : ''}" data-mode="${m}">${m}</button>
  `).join('');

  setHTML('tabBody', `
    <div class="mode-buttons">${modeBtns}</div>
    <div class="chart-card">
      <h3>📈 등급 추이</h3>
      <div class="chart-wrap"><canvas id="mockChart"></canvas></div>
    </div>
    <div class="section-title">회차별 세부 성적</div>
    <div style="overflow-x:auto;">${buildMockTable(sorted)}</div>
  `);

  // 모드 버튼 이벤트
  const tb = $('tabBody');
  if (tb) tb.querySelectorAll('.mode-btn').forEach(b => {
    b.addEventListener('click', () => {
      STATE.scoreMode = b.dataset.mode;
      renderMock();
    });
  });

  // 차트
  drawChart(sorted);
}

function gradeClass(g) {
  const n = Number(g);
  if (!n) return '';
  if (n <= 9) return 'g' + n;
  return '';
}

function renderCell(sub, record, mode, showSel) {
  if (!sub || typeof sub !== 'object') return '-';
  const selLabel = showSel && sub.선택 ? `<span class="sel-label">${sub.선택}</span>` : '';
  if (mode === '등급') {
    const g = sub.등급;
    if (g == null) return '-';
    return `<span class="${gradeClass(g)}">${g}등급</span>${selLabel}`;
  }
  // 영어/한국사는 표준점수/백분위 없음 → 등급 유지
  if (mode === '표준점수' && sub.표준점수 != null) {
    return `<span class="big-num pyo">${sub.표준점수}</span>${selLabel}`;
  }
  if (mode === '백분위' && sub.백분위 != null) {
    return `<span class="big-num paek">${sub.백분위}</span>${selLabel}`;
  }
  if (mode === '원점수' && sub.원점수 != null) {
    return `<span class="big-num won">${sub.원점수}</span>${selLabel}`;
  }
  // fallback: 등급
  if (sub.등급 != null) {
    return `<span class="${gradeClass(sub.등급)}">${sub.등급}등급</span>${selLabel}`;
  }
  return '-';
}

function buildMockTable(records) {
  const header = `
    <tr>
      <th>회차</th><th>국어</th><th>수학</th><th>영어</th><th>한국사</th><th>탐구1</th><th>탐구2</th>
    </tr>
  `;
  const rows = records.map(r => {
    const is3 = r.grade_at === 3;  // 3학년만 선택과목 표시
    return `
      <tr>
        <td class="round-label">${roundLabel(r.round)}</td>
        <td>${renderCell(r['국어'], r, STATE.scoreMode, false)}</td>
        <td>${renderCell(r['수학'], r, STATE.scoreMode, is3)}</td>
        <td>${renderCell(r['영어'], r, STATE.scoreMode, false)}</td>
        <td>${renderCell(r['한국사'], r, STATE.scoreMode, false)}</td>
        <td>${renderCell(r['탐구1'], r, STATE.scoreMode, is3)}</td>
        <td>${renderCell(r['탐구2'], r, STATE.scoreMode, is3)}</td>
      </tr>
    `;
  }).join('');
  return `<table class="score-table">${header}${rows}</table>`;
}

// ---------- 차트 ----------
let chartInst = null;
function drawChart(records) {
  const canvas = $('mockChart');
  if (!canvas || !window.Chart) return;
  if (chartInst) { chartInst.destroy(); chartInst = null; }

  const labels = records.map(r => roundLabel(r.round));
  const subjects = ['국어', '수학', '영어', '한국사', '탐구1', '탐구2'];
  const colors = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c', '#0891b2'];

  const datasets = subjects.map((sub, i) => ({
    label: sub,
    data: records.map(r => r[sub] && r[sub].등급 != null ? r[sub].등급 : null),
    borderColor: colors[i],
    backgroundColor: colors[i] + '33',
    tension: 0.2,
    spanGaps: true,
    pointRadius: 4
  }));

  chartInst = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 20 } },
      scales: {
        y: {
          reverse: true,
          min: 0.5,
          max: 9.5,
          ticks: { stepSize: 1 },
          title: { display: true, text: '등급' }
        }
      },
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// ---------- 시작 ----------
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
