// osang2026 v2.3.4 - 완전 재빌드 (HTML/JS ID 정합성 보장)
const STATE = {
  students: [],
  mock: {},
  selected: null,
  activeTab: 'basic',
  scoreMode: 'grade'  // grade | percentile | standard | raw
};

const ROUND_ORDER = {
  'g1_3월':1,'g1_6월':2,'g1_9월':3,'g1_11월':4,
  'g2_3월':5,'g2_6월':6,'g2_9월':7,'g2_11월':8,
  'g3_3월':9,'g3_6월':10,'g3_9월':11,'g3_11월':12
};

const ROUND_LABEL = {
  'g1_3월':'1학년 3월','g1_6월':'1학년 6월','g1_9월':'1학년 9월','g1_11월':'1학년 11월',
  'g2_3월':'2학년 3월','g2_6월':'2학년 6월','g2_9월':'2학년 9월','g2_11월':'2학년 11월',
  'g3_3월':'3학년 3월','g3_6월':'3학년 6월','g3_9월':'3학년 9월','g3_11월':'3학년 11월'
};

function showError(msg){
  const box = document.getElementById('errorBox');
  if(box){ box.style.display='block'; box.textContent='⚠ '+msg; }
  console.error(msg);
}
function setStatus(msg){
  const s = document.getElementById('status');
  if(s) s.textContent = msg;
}

async function loadData(){
  try {
    setStatus('데이터 로드 중...');
    const [studentsRes, mockRes] = await Promise.all([
      fetch('data/students.json'),
      fetch('data/mock.json')
    ]);
    if(!studentsRes.ok) throw new Error('students.json 로드 실패 ('+studentsRes.status+')');
    if(!mockRes.ok) throw new Error('mock.json 로드 실패 ('+mockRes.status+')');
    const studentsData = await studentsRes.json();
    const mockData = await mockRes.json();

    // students.json이 배열 or {students:[...]} 둘 다 대응
    STATE.students = Array.isArray(studentsData) ? studentsData : (studentsData.students || []);
    STATE.mock = mockData || {};

    // 학번 문자열 정렬 (숫자여도 안전)
    STATE.students.sort((a,b) => String(a.hak||'').localeCompare(String(b.hak||''), 'ko'));

    setStatus(`총 ${STATE.students.length}명 로드됨`);
    renderList();
  } catch(e){
    showError('데이터 로드 오류: '+e.message);
    setStatus('로드 실패');
  }
}

function getFiltered(){
  const q = (document.getElementById('searchInput').value||'').trim().toLowerCase();
  const g = document.getElementById('gradeFilter').value;
  const cf = document.getElementById('classFilter');
  const c = cf ? cf.value : 'all';

  return STATE.students.filter(s => {
    if(g !== 'all' && String(s.grade) !== String(g)) return false;
    if(c !== 'all' && String(s.class) !== String(c)) return false;
    if(q){
      const hay = (s.name||'')+' '+(s.hak||'');
      if(!hay.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function renderList(){
  const list = document.getElementById('studentList');
  const cnt = document.getElementById('studentCount');
  if(!list) return;
  const items = getFiltered();
  cnt.textContent = `${items.length}명`;
  list.innerHTML = items.map(s => `
    <li class="student-item ${STATE.selected && STATE.selected.hak===s.hak?'active':''}" data-hak="${s.hak}">
      <span class="hak">${s.hak}</span>
      <span class="name">${s.name||''}</span>
      <span class="gender">${s.gender||''}</span>
    </li>`).join('');
  list.querySelectorAll('.student-item').forEach(el => {
    el.addEventListener('click', () => {
      const hak = el.dataset.hak;
      const stu = STATE.students.find(x => String(x.hak)===String(hak));
      if(stu) selectStudent(stu);
    });
  });
}

function onGradeChange(){
  const g = document.getElementById('gradeFilter').value;
  const cf = document.getElementById('classFilter');
  if(g === 'all'){
    cf.style.display = 'none';
    cf.value = 'all';
  } else {
    // 해당 학년의 반 목록 수집
    const classes = [...new Set(STATE.students.filter(s=>String(s.grade)===String(g)).map(s=>s.class))]
      .filter(x=>x!=null).sort((a,b)=>Number(a)-Number(b));
    cf.innerHTML = '<option value="all">반 전체</option>' + classes.map(c=>`<option value="${c}">${c}반</option>`).join('');
    cf.style.display = '';
  }
  renderList();
}

function selectStudent(stu){
  STATE.selected = stu;
  document.getElementById('tabs').style.display = '';
  renderStudentInfo();
  renderTab();
  renderList();
}

function renderStudentInfo(){
  const s = STATE.selected;
  if(!s) return;
  const info = document.getElementById('studentInfo');
  info.innerHTML = `
    <div class="student-header">
      <h2>${s.name||''} <small>(${s.hak})</small></h2>
      <div class="badges">
        <span class="badge">${s.grade}학년 ${s.class}반 ${s.number}번</span>
        <span class="badge">${s.gender||''}</span>
        ${s.g1_hak?`<span class="badge badge-light">1학년 학번: ${s.g1_hak}</span>`:''}
        ${s.g2_hak?`<span class="badge badge-light">2학년 학번: ${s.g2_hak}</span>`:''}
      </div>
    </div>`;
}

function bindTabs(){
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      STATE.activeTab = btn.dataset.tab;
      renderTab();
    });
  });
}

function renderTab(){
  const c = document.getElementById('tabContent');
  if(!STATE.selected){ c.innerHTML=''; return; }
  const t = STATE.activeTab;
  if(t==='basic') return renderBasic(c);
  if(t==='mock') return renderMock(c);
  // 나머지는 준비 중
  c.innerHTML = `<div class="placeholder">📝 <strong>${tabName(t)}</strong> 데이터는 추후 입력 예정입니다.</div>`;
}

function tabName(t){
  return {basic:'기본정보',grades:'내신',mock:'모의고사',award:'수상',autonomy:'자율활동',
    club:'동아리',volunteer:'봉사',career:'진로',reading:'독서',sewtuk:'세특',
    behavior:'행동발달',attendance:'출결',applications:'지원대학',checklist:'체크리스트'}[t]||t;
}

function renderBasic(c){
  const s = STATE.selected;
  c.innerHTML = `
    <div class="card">
      <h3>기본 정보</h3>
      <table class="kv">
        <tr><th>학번</th><td>${s.hak}</td><th>이름</th><td>${s.name||''}</td></tr>
        <tr><th>학년/반/번호</th><td>${s.grade}학년 ${s.class}반 ${s.number}번</td><th>성별</th><td>${s.gender||''}</td></tr>
        <tr><th>1학년 학번</th><td>${s.g1_hak||'-'}</td><th>2학년 학번</th><td>${s.g2_hak||'-'}</td></tr>
      </table>
    </div>`;
}

function renderMock(c){
  const s = STATE.selected;
  const rows = (STATE.mock[String(s.hak)] || []).slice();
  rows.sort((a,b) => (ROUND_ORDER[a.round]||99) - (ROUND_ORDER[b.round]||99));

  if(rows.length === 0){
    c.innerHTML = '<div class="placeholder">모의고사 성적이 없습니다.</div>';
    return;
  }

  c.innerHTML = `
    <div class="card">
      <div class="score-toggle">
        ${['grade','percentile','standard','raw'].map(m=>`
          <button class="stoggle ${STATE.scoreMode===m?'active':''}" data-mode="${m}">${{grade:'등급',percentile:'백분위',standard:'표준점수',raw:'원점수'}[m]}</button>
        `).join('')}
      </div>
      <h3>📈 등급 추이</h3>
      <div class="chart-wrap"><canvas id="mockChart"></canvas></div>
    </div>
    <div class="card">
      <h3>회차별 세부 성적</h3>
      <div class="table-wrap">${buildMockTable(rows)}</div>
    </div>`;

  document.querySelectorAll('.stoggle').forEach(b => {
    b.addEventListener('click', () => {
      STATE.scoreMode = b.dataset.mode;
      renderMock(c);
    });
  });

  drawChart(rows);
}

function buildMockTable(rows){
  const s = STATE.selected;
  const mode = STATE.scoreMode;
  const subjects = [
    {key:'korean',label:'국어',abs:false},
    {key:'math',label:'수학',abs:false,selKey:'math_sel'},
    {key:'english',label:'영어',abs:true},
    {key:'history',label:'한국사',abs:true},
    {key:'tam1',label:'탐구1',abs:false,selKey:'tam1_sel'},
    {key:'tam2',label:'탐구2',abs:false,selKey:'tam2_sel'}
  ];

  let html = '<table class="mock-table"><thead><tr><th>회차</th>';
  subjects.forEach(sb => html += `<th>${sb.label}</th>`);
  html += '</tr></thead><tbody>';

  rows.forEach(r => {
    html += `<tr><td class="round-cell">${ROUND_LABEL[r.round]||r.round}</td>`;
    subjects.forEach(sb => {
      const val = getScoreVal(r, sb, mode);
      html += `<td>${renderCell(r, sb, val, mode, s.grade)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

function getScoreVal(r, sb, mode){
  // 영어/한국사는 백분위/표점 모드에서도 등급 표시
  if(sb.abs && (mode==='percentile' || mode==='standard')){
    return r[sb.key+'_grade'];
  }
  const suffix = {grade:'_grade', percentile:'_percentile', standard:'_standard', raw:'_raw'}[mode];
  const v = r[sb.key+suffix];
  return v==null||v===''?'-':v;
}

function renderCell(r, sb, val, mode, studentGrade){
  if(val==null||val==='-') return '<span class="dash">-</span>';
  const isAbsForcedGrade = sb.abs && (mode==='percentile' || mode==='standard');
  const effectiveMode = isAbsForcedGrade ? 'grade' : mode;

  let inner = '';
  if(effectiveMode === 'grade'){
    const g = Number(val);
    inner = `<span class="grade g${g}">${g}</span>`;
  } else if(effectiveMode === 'raw'){
    inner = `<span class="bignum raw">${val}</span>`;
  } else if(effectiveMode === 'standard'){
    inner = `<span class="bignum std">${val}</span>`;
  } else if(effectiveMode === 'percentile'){
    inner = `<span class="bignum pct">${val}</span>`;
  }

  // 3학년만 선택과목 라벨
  if(sb.selKey && studentGrade===3 && r[sb.selKey]){
    inner += `<div class="sel-sub">${r[sb.selKey]}</div>`;
  }
  return inner;
}

let chartInst = null;
function drawChart(rows){
  const ctx = document.getElementById('mockChart');
  if(!ctx) return;
  if(chartInst) chartInst.destroy();

  const labels = rows.map(r => ROUND_LABEL[r.round]||r.round);
  const mode = STATE.scoreMode;
  const subjects = [
    {key:'korean',label:'국어',color:'#2563eb',abs:false},
    {key:'math',label:'수학',color:'#dc2626',abs:false},
    {key:'english',label:'영어',color:'#059669',abs:true},
    {key:'history',label:'한국사',color:'#7c3aed',abs:true},
    {key:'tam1',label:'탐구1',color:'#ea580c',abs:false},
    {key:'tam2',label:'탐구2',color:'#0891b2',abs:false}
  ];

  const datasets = subjects.map(sb => {
    const effMode = (sb.abs && (mode==='percentile'||mode==='standard')) ? 'grade' : mode;
    const suffix = {grade:'_grade',percentile:'_percentile',standard:'_standard',raw:'_raw'}[effMode];
    return {
      label: sb.label,
      data: rows.map(r => { const v=r[sb.key+suffix]; return v==null||v===''?null:Number(v); }),
      borderColor: sb.color,
      backgroundColor: sb.color,
      tension: 0.25,
      spanGaps: true
    };
  });

  const isGrade = mode==='grade';
  chartInst = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 20 } },
      scales: {
        y: isGrade
          ? { reverse: true, min: 0.5, max: 9.5, ticks: { stepSize: 1 }, title: { display:true, text:'등급' } }
          : { title: { display:true, text: {percentile:'백분위',standard:'표준점수',raw:'원점수'}[mode] } }
      },
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function init(){
  try {
    document.getElementById('searchInput').addEventListener('input', renderList);
    document.getElementById('gradeFilter').addEventListener('change', onGradeChange);
    document.getElementById('classFilter').addEventListener('change', renderList);
    bindTabs();
    loadData();
  } catch(e){
    showError('초기화 오류: '+e.message);
  }
}
document.addEventListener('DOMContentLoaded', init);
