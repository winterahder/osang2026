// 오상고 상담카드 v2.6.1 - 기본정보 한글화 + y축 정수 눈금
const STATE = { students: [], mock: {}, current: null, chart: null, scoreMode: 'grade' };

const $ = (id) => document.getElementById(id);
const setText = (id, t) => { const el = $(id); if (el) el.textContent = t; };
const setHTML = (id, h) => { const el = $(id); if (el) el.innerHTML = h; };

// 필드명 한글 라벨 매핑
const FIELD_LABELS = {
  hak: '학번', grade: '학년', class: '반', cls: '반', no: '번호',
  name: '이름', gender: '성별', sex: '성별',
  g1_hak: '1학년 학번', g2_hak: '2학년 학번', g3_hak: '3학년 학번',
  birth: '생년월일', phone: '연락처', address: '주소',
  parent: '보호자', parent_phone: '보호자 연락처',
  email: '이메일', school: '출신학교', note: '비고'
};
const labelOf = (k) => FIELD_LABELS[k] || k;

const ROUND_ORDER = {
  'g1_3월': 1, 'g1_6월': 2, 'g1_9월': 3, 'g1_11월': 4,
  'g2_3월': 5, 'g2_6월': 6, 'g2_9월': 7, 'g2_11월': 8,
  'g3_3월': 9, 'g3_6월': 10, 'g3_9월': 11, 'g3_11월': 12
};
const roundLabel = (r) => {
  if (!r) return '';
  const m = String(r).match(/g(\d)_(\d+)월/);
  if (m) return `${m[1]}학년 ${m[2]}월`;
  return r;
};

const GRADE_COLOR = (g) => {
  if (!g) return '#999';
  if (g == 1) return '#1e40af';
  if (g == 2) return '#2563eb';
  if (g == 3) return '#059669';
  if (g == 4) return '#ca8a04';
  if (g == 5) return '#ea580c';
  if (g == 6) return '#dc2626';
  if (g == 7) return '#b91c1c';
  if (g == 8) return '#991b1b';
  if (g == 9) return '#7f1d1d';
  return '#999';
};

function parseHak(hak) {
  const s = String(hak || '').padStart(5, '0');
  return { grade: +s[0] || 0, cls: +s.slice(1, 3) || 0, num: +s.slice(3, 5) || 0 };
}

async function init() {
  try {
    setText('statusBar', '데이터 로드 중...');
    const [stuRes, mockRes] = await Promise.all([
      fetch('data/students.json').then(r => { if (!r.ok) throw new Error('students.json ' + r.status); return r.json(); }),
      fetch('data/mock.json').then(r => { if (!r.ok) throw new Error('mock.json ' + r.status); return r.json(); })
    ]);

    let arr = [];
    if (Array.isArray(stuRes)) arr = stuRes;
    else arr = Object.entries(stuRes).map(([k, v]) => ({ hak: k, ...v }));

    arr = arr.map(s => {
      const p = parseHak(s.hak);
      return { ...s, grade: s.grade || p.grade, class: s.class || p.cls, no: s.no || p.num };
    });
    arr.sort((a, b) => String(a.hak).localeCompare(String(b.hak)));

    STATE.students = arr;
    STATE.mock = mockRes;

    setText('statusBar', `총 ${arr.length}명 로드됨`);
    buildFilters();
    renderList();
  } catch (e) {
    setText('statusBar', '오류: ' + e.message);
    console.error(e);
  }
}

function buildFilters() {
  const gSel = $('gradeFilter');
  if (gSel) gSel.addEventListener('change', onFilter);
  const cSel = $('classFilter');
  if (cSel) cSel.addEventListener('change', onFilter);
  const search = $('searchBox');
  if (search) search.addEventListener('input', onFilter);
}

function onFilter() {
  const g = $('gradeFilter')?.value || '';
  const cSel = $('classFilter');
  if (g && cSel) {
    const classes = [...new Set(STATE.students.filter(s => String(s.grade) === g).map(s => s.class))].sort((a, b) => a - b);
    cSel.innerHTML = '<option value="">전체 반</option>' + classes.map(c => `<option value="${c}">${c}반</option>`).join('');
    cSel.style.display = 'inline-block';
  } else if (cSel) {
    cSel.innerHTML = '<option value="">전체 반</option>';
    cSel.style.display = 'none';
  }
  renderList();
}

function renderList() {
  const g = $('gradeFilter')?.value || '';
  const c = $('classFilter')?.value || '';
  const q = ($('searchBox')?.value || '').trim().toLowerCase();

  let list = STATE.students;
  if (g) list = list.filter(s => String(s.grade) === g);
  if (c) list = list.filter(s => String(s.class) === c);
  if (q) list = list.filter(s => (s.name || '').toLowerCase().includes(q) || String(s.hak).includes(q));

  const ul = $('studentList');
  if (!ul) return;
  if (!list.length) { ul.innerHTML = '<li class="empty">검색 결과 없음</li>'; return; }

  ul.innerHTML = list.map(s => `
    <li class="stu-item" data-hak="${s.hak}">
      <span class="stu-hak">${String(s.hak).slice(-4)}</span>
      <span class="stu-name">${s.name || ''}</span>
      <span class="stu-sex">${s.gender || s.sex || ''}</span>
    </li>`).join('');

  ul.querySelectorAll('.stu-item').forEach(li => {
    li.addEventListener('click', () => selectStudent(li.dataset.hak));
  });
  setText('listCount', `${list.length}명`);
}

function selectStudent(hak) {
  const s = STATE.students.find(x => String(x.hak) === String(hak));
  if (!s) return;
  STATE.current = s;

  document.querySelectorAll('.stu-item').forEach(li => {
    li.classList.toggle('active', li.dataset.hak === String(hak));
  });

  renderHeader(s);
  renderTabs();
  switchTab('basic');
}

function renderHeader(s) {
  setText('studentName', s.name || '');
  setText('studentHak', `(${s.hak})`);

  const badges = [];
  badges.push(`<span class="badge badge-grade">${s.grade}학년 ${s.class}반 ${s.no}번</span>`);
  badges.push(`<span class="badge">${s.gender || s.sex || ''}</span>`);
  if (s.g1_hak) badges.push(`<span class="badge badge-mini">1학년 학번: ${s.g1_hak}</span>`);
  if (s.g2_hak) badges.push(`<span class="badge badge-mini">2학년 학번: ${s.g2_hak}</span>`);
  setHTML('studentBadges', badges.join(''));
}

function renderTabs() {
  const tabs = [
    { id: 'basic', name: '기본정보' },
    { id: 'mock', name: '모의고사' },
    { id: 'naesin', name: '내신' },
    { id: 'sewtuk', name: '세특' },
    { id: 'haengbal', name: '행발' },
    { id: 'award', name: '수상' },
    { id: 'reading', name: '독서' }
  ];
  setHTML('tabBar', tabs.map(t =>
    `<button class="tab-btn" data-tab="${t.id}">${t.name}</button>`
  ).join(''));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });
}

function switchTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === id);
  });
  const content = $('tabContent');
  if (!content) return;
  try {
    if (id === 'basic') renderBasic();
    else if (id === 'mock') renderMock();
    else content.innerHTML = `<div class="empty-box">📋 ${id} 탭은 준비 중입니다.</div>`;
  } catch (e) {
    content.innerHTML = `<div class="error-box">렌더 오류: ${e.message}</div>`;
    console.error(e);
  }
}

function renderBasic() {
  const s = STATE.current;
  if (!s) return;
  // 표시 우선순위
  const preferred = ['hak', 'grade', 'class', 'no', 'name', 'gender', 'sex',
    'g1_hak', 'g2_hak', 'g3_hak', 'birth', 'phone', 'address',
    'parent', 'parent_phone', 'email', 'school', 'note'];
  const seen = new Set();
  const rows = [];
  for (const k of preferred) {
    if (s[k] !== undefined && s[k] !== null && s[k] !== '') {
      rows.push(`<tr><th>${labelOf(k)}</th><td>${s[k]}</td></tr>`);
      seen.add(k);
    }
  }
  // 기타 필드
  for (const [k, v] of Object.entries(s)) {
    if (seen.has(k)) continue;
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'object') continue;
    rows.push(`<tr><th>${labelOf(k)}</th><td>${v}</td></tr>`);
  }
  setHTML('tabContent', `<table class="info-table">${rows.join('')}</table>`);
}

function renderMock() {
  const s = STATE.current;
  const records = STATE.mock[s.hak] || STATE.mock[String(s.hak)] || STATE.mock[Number(s.hak)] || [];

  if (!records.length) {
    setHTML('tabContent', `<div class="empty-box">📊 모의고사 데이터 없음 (학번: ${s.hak})</div>`);
    return;
  }

  const sorted = [...records].sort((a, b) => (ROUND_ORDER[a.round] || 99) - (ROUND_ORDER[b.round] || 99));

  setHTML('tabContent', `
    <div class="mock-toolbar">
      <button class="score-btn active" data-mode="grade">등급</button>
      <button class="score-btn" data-mode="백분위">백분위</button>
      <button class="score-btn" data-mode="표준점수">표준점수</button>
      <button class="score-btn" data-mode="원점수">원점수</button>
    </div>
    <div class="chart-box"><h3>📈 등급 추이</h3><canvas id="mockChart" height="110"></canvas></div>
    <div class="mock-table-box"><h3>회차별 세부 성적</h3><div id="mockTable"></div></div>
  `);

  document.querySelectorAll('.score-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.score-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      STATE.scoreMode = b.dataset.mode;
      drawChart(sorted);
      drawMockTable(sorted);
    });
  });

  STATE.scoreMode = 'grade';
  drawChart(sorted);
  drawMockTable(sorted);
}

function drawChart(records) {
  const ctx = document.getElementById('mockChart');
  if (!ctx) return;
  if (STATE.chart) { STATE.chart.destroy(); STATE.chart = null; }

  const subjects = [
    { key: '국어', color: '#3b82f6' },
    { key: '수학', color: '#ef4444' },
    { key: '영어', color: '#10b981' },
    { key: '한국사', color: '#8b5cf6' },
    { key: '탐구1', color: '#f59e0b' },
    { key: '탐구2', color: '#06b6d4' }
  ];

  const labels = records.map(r => roundLabel(r.round));
  const datasets = subjects.map(sub => ({
    label: sub.key,
    data: records.map(r => {
      const v = r[sub.key];
      if (!v) return null;
      return v.등급 || null;
    }),
    borderColor: sub.color,
    backgroundColor: sub.color,
    tension: 0.3,
    spanGaps: true
  }));

  STATE.chart = new Chart(ctx, {
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
          ticks: {
            stepSize: 1,
            callback: function(value) {
              // 정수만 표시
              return Number.isInteger(value) ? value : '';
            }
          },
          title: { display: true, text: '등급' }
        }
      },
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function drawMockTable(records) {
  const s = STATE.current;
  const isG3 = String(s.grade) === '3';
  const subjects = ['국어', '수학', '영어', '한국사', '탐구1', '탐구2'];
  const mode = STATE.scoreMode;

  const cell = (v, subject, round) => {
    if (!v || typeof v !== 'object') return '<td class="empty-cell">-</td>';
    const grade = v.등급;
    const gradeColor = GRADE_COLOR(grade);

    // 영어, 한국사는 원점수/표준/백분위 모드에서도 등급 표시
    if ((subject === '영어' || subject === '한국사') && mode !== 'grade') {
      if (grade) return `<td><span class="grade-text" style="color:${gradeColor}">${grade}등급</span></td>`;
      return '<td class="empty-cell">-</td>';
    }

    if (mode === 'grade') {
      if (grade) return `<td><span class="grade-text" style="color:${gradeColor}">${grade}등급</span></td>`;
      return '<td class="empty-cell">-</td>';
    }

    // 점수 모드
    const val = v[mode];
    if (val === null || val === undefined) return '<td class="empty-cell">-</td>';

    const bgClass = mode === '원점수' ? 'score-raw' : mode === '표준점수' ? 'score-std' : 'score-pct';
    let html = `<span class="score-big ${bgClass}">${val}</span>`;

    // 3학년 선택과목 표시
    if (isG3 && (subject === '수학' || subject === '탐구1' || subject === '탐구2') && v.선택) {
      html += `<br><small class="select-name">${v.선택}</small>`;
    }
    return `<td>${html}</td>`;
  };

  let html = '<table class="mock-table"><thead><tr><th>회차</th>';
  subjects.forEach(sub => html += `<th>${sub}</th>`);
  html += '</tr></thead><tbody>';

  records.forEach(r => {
    html += `<tr><td class="round-label">${roundLabel(r.round)}</td>`;
    subjects.forEach(sub => {
      html += cell(r[sub], sub, r.round);
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  const box = document.getElementById('mockTable');
  if (box) box.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', init);
