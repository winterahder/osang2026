// =============================================
// 2026 대입 상담카드 - 메인 앱
// =============================================

const DATA = { students: [], mock: null, grades: null, sewtuk: null, behavior: null,
  autonomy: null, career: null, club: null, volunteer: null,
  award: null, reading: null, applications: null, checklist: null, attendance: null };

let currentStudent = null;
let currentTab = 'basic';
let currentScoreType = '등급'; // 등급/원점수/표점/백분위
let chartInstance = null;

// 데이터 로더
async function loadJSON(name) {
  if (DATA[name] !== null && DATA[name] !== undefined && (Array.isArray(DATA[name]) ? DATA[name].length>0 : Object.keys(DATA[name]).length>0)) return DATA[name];
  try {
    const res = await fetch(`data/${name}.json`);
    if (!res.ok) throw new Error(res.status);
    DATA[name] = await res.json();
  } catch (e) {
    console.warn(`${name}.json 로드 실패:`, e);
    DATA[name] = null;
  }
  return DATA[name];
}

// 초기화
async function init() {
  const meta = await (await fetch('data/meta.json')).json();
  document.getElementById('metaInfo').textContent = 
    `전체 ${meta.total_students}명 · 1학년 ${meta.by_grade['1']||0} · 2학년 ${meta.by_grade['2']||0} · 3학년 ${meta.by_grade['3']||0} · Updated ${meta.updated}`;

  DATA.students = await (await fetch('data/students.json')).json();

  setupFilters();
  setupSearch();
  setupTabs();
  renderStudentList();
}

// 필터 세팅
function setupFilters() {
  const gradeSel = document.getElementById('gradeFilter');
  const classSel = document.getElementById('classFilter');
  const classBox = document.getElementById('classFilterBox');

  gradeSel.addEventListener('change', () => {
    const g = gradeSel.value;
    classSel.innerHTML = '<option value="all">전체 반</option>';
    if (g === 'all') {
      classBox.style.display = 'none';
    } else {
      classBox.style.display = 'block';
      // 해당 학년의 반 목록 추출
      const classes = [...new Set(DATA.students.filter(s=>s.grade==+g).map(s=>s.class))].sort((a,b)=>a-b);
      classes.forEach(c => {
        classSel.innerHTML += `<option value="${c}">${c}반</option>`;
      });
    }
    renderStudentList();
  });

  classSel.addEventListener('change', renderStudentList);
}

function setupSearch() {
  document.getElementById('searchBox').addEventListener('input', renderStudentList);
}

// 학생 목록 렌더
function renderStudentList() {
  const g = document.getElementById('gradeFilter').value;
  const c = document.getElementById('classFilter').value;
  const q = document.getElementById('searchBox').value.trim().toLowerCase();

  let list = DATA.students.slice();
  if (g !== 'all') list = list.filter(s => s.grade == +g);
  if (c !== 'all') list = list.filter(s => s.class == +c);
  if (q) list = list.filter(s => s.name.toLowerCase().includes(q) || String(s.hak).includes(q));

  // 정렬: 학번
  list.sort((a,b) => a.hak - b.hak);

  document.getElementById('listStats').textContent = `${list.length}명 표시`;

  const ul = document.getElementById('studentList');
  ul.innerHTML = list.map(s => `
    <li data-hak="${s.hak}" ${currentStudent && currentStudent.hak===s.hak?'class="active"':''}>
      <span>${s.name}</span>
      <span class="hak">${s.hak}</span>
    </li>
  `).join('');

  ul.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => selectStudent(+li.dataset.hak));
  });
}

// 학생 선택
async function selectStudent(hak) {
  currentStudent = DATA.students.find(s => s.hak === hak);
  if (!currentStudent) return;

  document.querySelectorAll('.student-list li').forEach(li => {
    li.classList.toggle('active', +li.dataset.hak === hak);
  });

  document.getElementById('welcomePanel').style.display = 'none';
  document.getElementById('studentPanel').style.display = 'block';
  document.getElementById('studentName').textContent = currentStudent.name;

  const s = currentStudent;
  const gBadge = `<span class="badge">${s.grade}학년 ${s.class}반 ${s.no}번</span>`;
  const gender = s.gender ? `<span class="badge" style="background:#636e72">${s.gender}</span>` : '';
  document.getElementById('studentMeta').innerHTML = `${gBadge}${gender}현재 학번: <strong>${s.hak}</strong>`;

  renderTab(currentTab);
}

// 탭 세팅
function setupTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderTab(currentTab);
    });
  });
}

// 탭 렌더 분기
async function renderTab(tab) {
  const box = document.getElementById('tabContent');
  box.innerHTML = '<div class="empty-state"><div class="icon">⏳</div><div class="msg">Loading...</div></div>';

  const renderers = {
    basic: renderBasic,
    grades: renderGrades,
    mock: renderMock,
    award: renderAward,
    autonomy: renderAutonomy,
    club: renderClub,
    volunteer: renderVolunteer,
    career: renderCareer,
    reading: renderReading,
    sewtuk: renderSewtuk,
    behavior: renderBehavior,
    attendance: renderAttendance,
    applications: renderApplications,
    checklist: renderChecklist
  };

  if (renderers[tab]) await renderers[tab](box);
  else box.innerHTML = '<div class="empty-state"><div class="msg">준비 중</div></div>';
}

// ---- 기본정보 ----
function renderBasic(box) {
  const s = currentStudent;
  const rows = [
    ['이름', s.name],
    ['성별', s.gender || '-'],
    ['현재 학년/반/번호', `${s.grade}학년 ${s.class}반 ${s.no}번`],
    ['현재 학번', s.hak],
    ['1학년 학번', s.g1_hak || '-'],
    ['2학년 학번', s.g2_hak || '-'],
    ['3학년 학번', s.g3_hak || '-']
  ];
  box.innerHTML = '<div class="info-grid">' + 
    rows.map(([l,v]) => `<div class="info-card"><div class="label">${l}</div><div class="value">${v}</div></div>`).join('') +
    '</div>';
}

// ---- 모의고사 ----
async function renderMock(box) {
  const data = await loadJSON('mock');
  const recs = (data && data[currentStudent.hak]) || [];
  if (recs.length === 0) { box.innerHTML = emptyMsg('모의고사 기록 없음'); return; }

  box.innerHTML = `
    <div class="score-toggle" id="scoreToggle">
      <button data-type="등급" class="${currentScoreType==='등급'?'active':''}">등급</button>
      <button data-type="백분위" class="${currentScoreType==='백분위'?'active':''}">백분위</button>
      <button data-type="표점" class="${currentScoreType==='표점'?'active':''}">표준점수</button>
      <button data-type="원점수" class="${currentScoreType==='원점수'?'active':''}">원점수</button>
    </div>
    <div id="mockTable"></div>
    <div class="chart-wrap"><canvas id="mockChart"></canvas></div>
  `;

  document.querySelectorAll('#scoreToggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      currentScoreType = btn.dataset.type;
      document.querySelectorAll('#scoreToggle button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      drawMockTable(recs);
      drawMockChart(recs);
    });
  });

  drawMockTable(recs);
  drawMockChart(recs);
}

function getScore(subj, type) {
  if (!subj) return null;
  // 영어, 한국사는 등급/원점수만
  if (type === '등급') return subj.등급;
  if (type === '원점수') return subj.원점수;
  if (type === '표점') return subj.표점 ?? null;
  if (type === '백분위') return subj.백분위 ?? null;
  return null;
}

function fmtCell(subj, type, isEngOrHistory=false) {
  if (!subj) return '-';
  // 영어/한국사는 등급 외 선택 시에도 등급만 노출
  if (isEngOrHistory && (type === '백분위' || type === '표점')) {
    return subj.등급 != null ? `<span class="grade-${subj.등급}" style="padding:3px 8px;border-radius:3px">${subj.등급}</span>` : '-';
  }
  const v = getScore(subj, type);
  if (v == null) return '-';
  if (type === '등급') return `<span class="grade-${v}" style="padding:3px 8px;border-radius:3px">${v}</span>`;
  return typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : v;
}

function drawMockTable(recs) {
  const t = currentScoreType;
  const header = `
    <thead><tr>
      <th>시점</th><th>내신</th>
      <th>국어</th><th>수학<br><small>선택</small></th><th>영어</th><th>한국사</th>
      <th>탐구1<br><small>과목</small></th><th>탐구2<br><small>과목</small></th>
    </tr></thead>`;
  const body = recs.map(r => {
    const 국 = fmtCell(r.국어, t);
    const 수 = fmtCell(r.수학, t);
    const 영 = fmtCell(r.영어, t, true);
    const 한 = fmtCell(r.한국사, t, true);
    const 탐1 = fmtCell(r.탐1, t);
    const 탐2 = fmtCell(r.탐2, t);
    const 수선 = r.수학?.선택 ? `<br><small>${r.수학.선택}</small>` : '';
    const 탐1과 = r.탐1?.과목 ? `<br><small>${r.탐1.과목}</small>` : '';
    const 탐2과 = r.탐2?.과목 ? `<br><small>${r.탐2.과목}</small>` : '';
    return `<tr>
      <td><strong>${r.시점}</strong><br><small>${r.연도}</small></td>
      <td>${r.내신!=null ? r.내신.toFixed(2) : '-'}</td>
      <td>${국}</td><td>${수}${수선}</td><td>${영}</td><td>${한}</td>
      <td>${탐1}${탐1과}</td><td>${탐2}${탐2과}</td>
    </tr>`;
  }).join('');
  document.getElementById('mockTable').innerHTML = `<table class="data-table">${header}<tbody>${body}</tbody></table>`;
}

function drawMockChart(recs) {
  const ctx = document.getElementById('mockChart');
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  const t = currentScoreType;
  const labels = recs.map(r => r.시점);

  const subjects = [
    {key:'국어', color:'#e74c3c'},
    {key:'수학', color:'#3498db'},
    {key:'영어', color:'#2ecc71'},
    {key:'한국사', color:'#9b59b6'},
    {key:'탐1', color:'#f39c12'},
    {key:'탐2', color:'#1abc9c'}
  ];

  const datasets = subjects.map(s => {
    const isEngOrHist = (s.key === '영어' || s.key === '한국사');
    const useType = (isEngOrHist && (t === '백분위' || t === '표점')) ? '등급' : t;
    return {
      label: s.key,
      data: recs.map(r => getScore(r[s.key], useType)),
      borderColor: s.color, backgroundColor: s.color+'33',
      tension: 0.2, spanGaps: true
    };
  });

  const isGrade = (t === '등급');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { title: { display: true, text: `모의고사 ${t} 추이` } },
      scales: {
        y: isGrade ? { reverse: true, min: 0.5, max: 9.5, ticks: { stepSize: 1 }, title: { display:true, text:'등급(낮을수록 우수)' } } 
                   : { beginAtZero: false, title: { display:true, text: t } }
      }
    }
  });
}

// ---- 기타 탭 (추후 구현) ----
async function renderGrades(box) { await genericList(box, 'grades', '내신', '학년·학기별 내신 성적이 입력되면 표시됩니다.'); }
async function renderAward(box) { await genericList(box, 'award', '수상', '수상경력 데이터 입력 시 표시됩니다. (※ 대입 미반영, 참고용)'); }
async function renderAutonomy(box) { await genericList(box, 'autonomy', '자율활동', '자율활동 특기사항이 입력되면 표시됩니다.'); }
async function renderClub(box) { await genericList(box, 'club', '동아리활동', '동아리활동 내용이 입력되면 표시됩니다.'); }
async function renderVolunteer(box) { await genericList(box, 'volunteer', '봉사활동', '봉사활동 기록이 입력되면 표시됩니다.'); }
async function renderCareer(box) { await genericList(box, 'career', '진로활동', '진로활동 특기사항이 입력되면 표시됩니다.'); }
async function renderReading(box) { await genericList(box, 'reading', '독서활동', '독서활동 기록 (※ 대입 미반영, 참고용)'); }
async function renderSewtuk(box) { await genericList(box, 'sewtuk', '세부능력 및 특기사항', '과목별 세특이 입력되면 표시됩니다.'); }
async function renderBehavior(box) { await genericList(box, 'behavior', '행동특성 및 종합의견', '담임 종합의견이 입력되면 표시됩니다.'); }
async function renderAttendance(box) { await genericList(box, 'attendance', '출결상황', '학년별 출결 현황이 입력되면 표시됩니다.'); }
async function renderApplications(box) { await genericList(box, 'applications', '지원대학', '수시·정시 지원 대학 정보가 입력되면 표시됩니다.'); }
async function renderChecklist(box) { await genericList(box, 'checklist', '학종 체크리스트', '학업역량·진로역량·공동체역량 평가가 입력되면 표시됩니다.'); }

async function genericList(box, key, title, emptyMsgText) {
  const data = await loadJSON(key);
  const recs = (data && data[currentStudent.hak]) || null;
  if (!recs || (Array.isArray(recs) && recs.length === 0) || (typeof recs === 'object' && Object.keys(recs).length === 0)) {
    box.innerHTML = `<h3 style="margin-bottom:12px">${title}</h3>` + emptyMsg(emptyMsgText);
    return;
  }
  // 기본 JSON 표시
  box.innerHTML = `<h3 style="margin-bottom:12px">${title}</h3><pre style="background:#f8f9fa;padding:12px;border-radius:6px;font-size:12px;white-space:pre-wrap">${JSON.stringify(recs, null, 2)}</pre>`;
}

function emptyMsg(msg) {
  return `<div class="empty-state"><div class="icon">📭</div><div class="msg">${msg}</div></div>`;
}

// 시작
init();
