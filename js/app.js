// 2026 대입 상담카드 - v2.3
const DATA = { students: null, mock: null, cache: {} };
let currentStudent = null;
let currentTab = 'basic';
let scoreType = '등급'; // 등급 / 백분위 / 표준점수 / 원점수
let mockChart = null;

const ROUND_ORDER = {
  'g1_3월':1,'g1_5월':2,'g1_6월':3,'g1_7월':4,'g1_9월':5,'g1_10월':6,'g1_11월':7,
  'g2_3월':10,'g2_5월':11,'g2_6월':12,'g2_7월':13,'g2_9월':14,'g2_10월':15,'g2_11월':16,
  'g3_3월':20,'g3_5월':21,'g3_6월':22,'g3_7월':23,'g3_9월':24,'g3_10월':25,'g3_11월':26
};

// ========== 초기화 ==========
async function init() {
  try {
    const res = await fetch('data/students.json');
    DATA.students = await res.json();
    setupFilters();
    renderStudentList();
    attachTabEvents();
  } catch(e) {
    document.getElementById('studentList').innerHTML = '<li style="color:red;padding:20px;">데이터 로드 실패: ' + e.message + '</li>';
  }
}

// ========== 필터 ==========
function setupFilters() {
  document.getElementById('search').addEventListener('input', renderStudentList);
  document.getElementById('gradeFilter').addEventListener('change', onGradeChange);
  document.getElementById('classFilter').addEventListener('change', renderStudentList);
}

function onGradeChange() {
  const grade = document.getElementById('gradeFilter').value;
  const classFilter = document.getElementById('classFilter');
  if (grade === 'all') {
    classFilter.style.display = 'none';
    classFilter.value = 'all';
  } else {
    classFilter.style.display = 'block';
    // 해당 학년의 반 목록 채우기
    const classes = [...new Set(DATA.students.filter(s=>s.grade==grade).map(s=>s.class))].sort((a,b)=>a-b);
    classFilter.innerHTML = '<option value="all">전체 반</option>' + classes.map(c=>`<option value="${c}">${c}반</option>`).join('');
  }
  renderStudentList();
}

function renderStudentList() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const grade = document.getElementById('gradeFilter').value;
  const cls = document.getElementById('classFilter').value;

  let list = DATA.students;
  if (grade !== 'all') list = list.filter(s => s.grade == grade);
  if (cls !== 'all' && cls) list = list.filter(s => s.class == cls);
  if (q) list = list.filter(s => s.name.toLowerCase().includes(q) || String(s.hak).includes(q));

  // 학년-반-번호 순
  list = [...list].sort((a,b) => a.grade - b.grade || a.class - b.class || a.no - b.no);

  document.getElementById('studentCount').textContent = `${list.length}명`;
  const html = list.map(s => `
    <li data-hak="${s.hak}" class="${currentStudent && currentStudent.hak===s.hak?'active':''}">
      <div class="name">${s.name} <span style="font-size:11px;color:#888;">(${s.gender||''})</span></div>
      <div class="meta">${s.grade}학년 ${s.class}반 ${s.no}번 · ${s.hak}</div>
    </li>`).join('');
  document.getElementById('studentList').innerHTML = html;
  document.querySelectorAll('.student-list li').forEach(li => {
    li.addEventListener('click', () => selectStudent(parseInt(li.dataset.hak)));
  });
}

// ========== 학생 선택 ==========
function selectStudent(hak) {
  currentStudent = DATA.students.find(s => s.hak === hak);
  if (!currentStudent) return;
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('cardView').style.display = 'block';

  document.getElementById('studentName').textContent = currentStudent.name;
  const info = `${currentStudent.grade}학년 ${currentStudent.class}반 ${currentStudent.no}번 · 학번 ${currentStudent.hak} · ${currentStudent.gender||'-'}`;
  document.getElementById('studentInfo').textContent = info;

  document.querySelectorAll('.student-list li').forEach(li => {
    li.classList.toggle('active', parseInt(li.dataset.hak) === hak);
  });
  renderTab(currentTab);
}

// ========== 탭 ==========
function attachTabEvents() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderTab(currentTab);
    });
  });
}

async function renderTab(tab) {
  if (!currentStudent) return;
  const container = document.getElementById('tabContent');
  container.innerHTML = '<div class="placeholder">로딩중...</div>';

  switch(tab) {
    case 'basic': renderBasic(container); break;
    case 'mock': await renderMock(container); break;
    default: renderPlaceholder(container, tab);
  }
}

function renderBasic(container) {
  const s = currentStudent;
  container.innerHTML = `
    <div class="info-grid">
      <div class="info-card"><div class="label">이름</div><div class="value">${s.name}</div></div>
      <div class="info-card"><div class="label">성별</div><div class="value">${s.gender||'-'}</div></div>
      <div class="info-card"><div class="label">현재 학번</div><div class="value">${s.hak}</div></div>
      <div class="info-card"><div class="label">현재 학년/반/번호</div><div class="value">${s.grade}학년 ${s.class}반 ${s.no}번</div></div>
      <div class="info-card"><div class="label">1학년 학번</div><div class="value">${s.g1_hak||'-'}</div></div>
      <div class="info-card"><div class="label">2학년 학번</div><div class="value">${s.g2_hak||'-'}</div></div>
      <div class="info-card"><div class="label">3학년 학번</div><div class="value">${s.g3_hak||'-'}</div></div>
    </div>`;
}

// ========== 모의고사 ==========
async function loadMock() {
  if (!DATA.mock) {
    const res = await fetch('data/mock.json');
    DATA.mock = await res.json();
  }
  return DATA.mock;
}

async function renderMock(container) {
  await loadMock();
  const records = DATA.mock[currentStudent.hak] || [];
  if (records.length === 0) {
    container.innerHTML = '<div class="placeholder"><h3>📊 모의고사</h3><p>성적 데이터가 없습니다.</p></div>';
    return;
  }

  // 회차 정렬
  records.sort((a,b) => (ROUND_ORDER[a.round]||99) - (ROUND_ORDER[b.round]||99));

  container.innerHTML = `
    <div class="score-toggle">
      <button data-type="등급" class="${scoreType==='등급'?'active':''}">등급</button>
      <button data-type="백분위" class="${scoreType==='백분위'?'active':''}">백분위</button>
      <button data-type="표준점수" class="${scoreType==='표준점수'?'active':''}">표준점수</button>
      <button data-type="원점수" class="${scoreType==='원점수'?'active':''}">원점수</button>
    </div>
    <div class="chart-wrapper"><canvas id="mockChart"></canvas></div>
    <h3 style="margin:15px 0 10px; font-size:15px;">회차별 세부 성적</h3>
    <div id="mockTableWrap"></div>`;

  document.querySelectorAll('.score-toggle button').forEach(b => {
    b.addEventListener('click', () => {
      scoreType = b.dataset.type;
      renderMock(container);
    });
  });

  renderMockChart(records);
  renderMockTable(records);
}

function renderMockTable(records) {
  const g = currentStudent.grade;
  // 3학년만 선택과목 라벨 표시
  const showSelect = (g === 3);

  let html = '<table class="mock-table"><thead><tr>';
  html += '<th>회차</th>';
  ['국어','수학','영어','한국사','탐구1','탐구2'].forEach(sub => html += `<th>${sub}</th>`);
  html += '</tr></thead><tbody>';

  records.forEach(r => {
    html += '<tr>';
    html += `<td class="round-cell">${r.year} ${r.round}</td>`;
    ['국어','수학','영어','한국사','탐구1','탐구2'].forEach(sub => {
      const data = r[sub] || {};
      html += '<td>' + renderCell(data, sub, showSelect) + '</td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  document.getElementById('mockTableWrap').innerHTML = html;
}

function renderCell(data, subject, showSelect) {
  const isAbs = (subject==='영어' || subject==='한국사');
  // 절대평가는 항상 등급 표시 (원점수 모드에서만 원점수)
  let displayType = scoreType;
  if (isAbs && (scoreType==='백분위' || scoreType==='표준점수')) {
    displayType = '등급';
  }

  let content = '';
  if (displayType === '등급') {
    const g = data.등급;
    if (g == null || g === 0) return '-';
    content = `<span class="grade-${g}">${g}</span>`;
  } else if (displayType === '원점수') {
    const v = data.원점수;
    if (v == null) return '-';
    content = `<span class="score-box score-raw">${Math.round(v)}</span>`;
  } else if (displayType === '표준점수') {
    const v = data.표준점수;
    if (v == null) return '-';
    content = `<span class="score-box score-std">${Math.round(v)}</span>`;
  } else if (displayType === '백분위') {
    const v = data.백분위;
    if (v == null) return '-';
    content = `<span class="score-box score-pct">${Math.round(v)}</span>`;
  }

  // 선택과목 표시 (3학년만, 수학/탐구1/탐구2)
  if (showSelect && data.선택 && ['수학','탐구1','탐구2'].includes(subject)) {
    content += `<span class="subject-detail">${data.선택}</span>`;
  }
  return content;
}

function renderMockChart(records) {
  const ctx = document.getElementById('mockChart').getContext('2d');
  if (mockChart) mockChart.destroy();

  const labels = records.map(r => `${r.year%100}.${r.round.replace('g','G').replace('_',' ')}`);
  const subjects = ['국어','수학','영어','한국사','탐구1','탐구2'];
  const colors = {
    '국어':'#e11d48', '수학':'#0891b2', '영어':'#7c3aed',
    '한국사':'#ca8a04', '탐구1':'#16a34a', '탐구2':'#ea580c'
  };

  const datasets = subjects.map(sub => {
    const isAbs = (sub==='영어' || sub==='한국사');
    let type = scoreType;
    if (isAbs && (type==='백분위' || type==='표준점수')) type = '등급';
    const key = type;
    return {
      label: sub,
      data: records.map(r => (r[sub] && r[sub][key] != null) ? r[sub][key] : null),
      borderColor: colors[sub],
      backgroundColor: colors[sub]+'22',
      tension: 0.3,
      spanGaps: true,
      borderWidth: 2,
      pointRadius: 4
    };
  });

  const isGrade = (scoreType === '등급');

  mockChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { 
        legend: { position:'top' },
        title: { display:true, text:`회차별 ${scoreType} 추이`, font:{size:14} }
      },
      scales: {
        y: {
          reverse: isGrade,
          min: isGrade ? 1 : undefined,
          max: isGrade ? 9 : undefined,
          ticks: { stepSize: isGrade ? 1 : undefined }
        }
      }
    }
  });
}

// ========== 기타 탭 ==========
function renderPlaceholder(container, tab) {
  const labels = {
    grades:'📘 내신', award:'🏆 수상', autonomy:'📝 자율활동', club:'👥 동아리',
    volunteer:'🤝 봉사활동', career:'🎯 진로활동', reading:'📚 독서활동',
    sewtuk:'📖 세부능력 및 특기사항', behavior:'💬 행동특성 및 종합의견',
    attendance:'📅 출결', applications:'🎓 지원대학', checklist:'✅ 체크리스트'
  };
  container.innerHTML = `
    <div class="placeholder">
      <h3>${labels[tab]||tab}</h3>
      <p>데이터가 아직 입력되지 않았습니다.</p>
      <p style="margin-top:8px; font-size:12px;">data/${tab}.json 파일에 데이터를 추가하면 자동 표시됩니다.</p>
    </div>`;
}

init();
