// osang2026 v2.1 - UI 개선판
const STATE = {
  students: [], selectedId: null, activeTab: 'basic',
  scoreType: 'grade', // grade | percentile | standard | raw
  cache: {}, charts: {}
};

// 회차 정렬 순서 (3,6,9,11월 순)
const ROUND_ORDER = {
  'g1_3': 1, 'g1_6': 2, 'g1_9': 3, 'g1_11': 4,
  'g2_3': 5, 'g2_6': 6, 'g2_9': 7, 'g2_11': 8,
  'g3_3': 9, 'g3_6': 10, 'g3_9': 11, 'g3_11': 12
};
const ROUND_LABEL = {
  'g1_3':'1-3월','g1_6':'1-6월','g1_9':'1-9월','g1_11':'1-11월',
  'g2_3':'2-3월','g2_6':'2-6월','g2_9':'2-9월','g2_11':'2-11월',
  'g3_3':'3-3월','g3_6':'3-6월','g3_9':'3-9월','g3_11':'3-11월'
};

async function loadJSON(path){
  if(STATE.cache[path]) return STATE.cache[path];
  try{
    const r = await fetch(path);
    if(!r.ok) throw new Error(r.status);
    const j = await r.json();
    STATE.cache[path] = j;
    return j;
  }catch(e){ console.warn('load fail',path,e); return null; }
}

// ========== 초기화 ==========
async function init(){
  const students = await loadJSON('data/students.json');
  STATE.students = students || [];
  bindFilters();
  renderStudentList();
  bindTabs();
}

// ========== 필터 ==========
function bindFilters(){
  document.getElementById('search').addEventListener('input', renderStudentList);
  document.getElementById('gradeFilter').addEventListener('change', onGradeChange);
  document.getElementById('classFilter').addEventListener('change', renderStudentList);
}

function onGradeChange(){
  const g = document.getElementById('gradeFilter').value;
  const classSel = document.getElementById('classFilter');
  if(g === 'all'){
    classSel.innerHTML = '<option value="all">전체 반</option>';
    classSel.style.display = 'none';
  }else{
    let html = '<option value="all">전체 반</option>';
    for(let i=1;i<=10;i++) html += `<option value="${i}">${i}반</option>`;
    classSel.innerHTML = html;
    classSel.style.display = 'inline-block';
  }
  renderStudentList();
}

function renderStudentList(){
  const q = document.getElementById('search').value.trim().toLowerCase();
  const g = document.getElementById('gradeFilter').value;
  const c = document.getElementById('classFilter').value;
  let list = STATE.students;
  if(g !== 'all') list = list.filter(s => String(s.grade) === g);
  if(c !== 'all') list = list.filter(s => String(s.class) === c);
  if(q) list = list.filter(s => (s.name||'').toLowerCase().includes(q) || String(s.hak||'').includes(q));
  list = list.slice().sort((a,b)=> (a.hak||0)-(b.hak||0));
  const box = document.getElementById('studentList');
  if(!list.length){ box.innerHTML = '<div class="empty">학생이 없습니다</div>'; return; }
  box.innerHTML = list.map(s =>
    `<div class="student-item ${s.hak===STATE.selectedId?'active':''}" data-hak="${s.hak}">
       <div class="s-name">${s.name}</div>
       <div class="s-meta">${s.hak} · ${s.gender||''}</div>
     </div>`
  ).join('');
  box.querySelectorAll('.student-item').forEach(el=>{
    el.addEventListener('click', ()=> selectStudent(Number(el.dataset.hak)));
  });
  document.getElementById('listCount').textContent = `${list.length}명`;
}

// ========== 학생 선택 ==========
function selectStudent(hak){
  STATE.selectedId = hak;
  renderStudentList();
  renderTab();
}

function getStudent(){
  return STATE.students.find(s => s.hak === STATE.selectedId);
}

// ========== 탭 ==========
function bindTabs(){
  document.querySelectorAll('.tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      STATE.activeTab = t.dataset.tab;
      renderTab();
    });
  });
}

async function renderTab(){
  const stu = getStudent();
  const panel = document.getElementById('panel');
  if(!stu){ panel.innerHTML = '<div class="empty-panel">학생을 선택하세요 👈</div>'; return; }

  switch(STATE.activeTab){
    case 'basic':    return renderBasic(stu, panel);
    case 'mock':     return renderMock(stu, panel);
    case 'grade':    return renderSimple(stu, panel, 'data/grades.json', '내신');
    case 'award':    return renderSimple(stu, panel, 'data/award.json', '수상경력');
    case 'autonomy': return renderSimple(stu, panel, 'data/autonomy.json', '자율활동');
    case 'club':     return renderSimple(stu, panel, 'data/club.json', '동아리활동');
    case 'volunteer':return renderSimple(stu, panel, 'data/volunteer.json', '봉사활동');
    case 'career':   return renderSimple(stu, panel, 'data/career.json', '진로활동');
    case 'reading':  return renderSimple(stu, panel, 'data/reading.json', '독서활동');
    case 'sewtuk':   return renderSimple(stu, panel, 'data/sewtuk.json', '세부능력 및 특기사항');
    case 'behavior': return renderSimple(stu, panel, 'data/behavior.json', '행동특성 및 종합의견');
    case 'attendance':return renderSimple(stu, panel, 'data/attendance.json', '출결상황');
    case 'apply':    return renderSimple(stu, panel, 'data/applications.json', '지원대학');
    case 'check':    return renderSimple(stu, panel, 'data/checklist.json', '체크리스트');
  }
}

// ========== 기본정보 ==========
function renderBasic(stu, panel){
  const hist = [];
  if(stu.g1_hak) hist.push(`<span class="hak-chip">1학년: <b>${stu.g1_hak}</b></span>`);
  if(stu.g2_hak) hist.push(`<span class="hak-chip">2학년: <b>${stu.g2_hak}</b></span>`);
  if(stu.g3_hak) hist.push(`<span class="hak-chip">3학년: <b>${stu.g3_hak}</b></span>`);
  panel.innerHTML = `
    <h2>${stu.name} <small>(${stu.hak})</small></h2>
    <div class="info-grid">
      <div><label>현재 학년</label><div>${stu.grade}학년</div></div>
      <div><label>반</label><div>${stu.class}반</div></div>
      <div><label>번호</label><div>${stu.no}번</div></div>
      <div><label>성별</label><div>${stu.gender||'-'}</div></div>
    </div>
    <h3>학번 이력</h3>
    <div class="hak-history">${hist.join('') || '-'}</div>
    ${stu.note ? `<div class="note">📌 ${stu.note}</div>` : ''}
  `;
}

// ========== 모의고사 ==========
async function renderMock(stu, panel){
  const all = await loadJSON('data/mock.json');
  const rows = (all && all[stu.hak]) || [];
  if(!rows.length){
    panel.innerHTML = '<h2>모의고사 성적</h2><div class="empty-panel">데이터 없음</div>';
    return;
  }
  // 회차 정렬
  rows.sort((a,b)=> (ROUND_ORDER[a.round]||99)-(ROUND_ORDER[b.round]||99));

  panel.innerHTML = `
    <h2>모의고사 성적</h2>
    <div class="score-toggle">
      <button data-type="grade" class="active">등급</button>
      <button data-type="percentile">백분위</button>
      <button data-type="standard">표준점수</button>
      <button data-type="raw">원점수</button>
    </div>
    <div class="chart-wrap"><canvas id="mockChart"></canvas></div>
    <h3>회차별 세부 성적</h3>
    <div id="mockTableWrap"></div>
  `;

  panel.querySelectorAll('.score-toggle button').forEach(b=>{
    b.addEventListener('click',()=>{
      panel.querySelectorAll('.score-toggle button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      STATE.scoreType = b.dataset.type;
      drawMockChart(rows);
      drawMockTable(rows, stu);
    });
  });

  drawMockChart(rows);
  drawMockTable(rows, stu);
}

// 과목별 점수 추출
function pickScore(row, subject, type){
  // type: grade | percentile | standard | raw
  // 영어, 한국사: grade/raw 만 의미있음 -> percentile/standard 요청 시에도 grade 반환
  const absoluteSubjects = ['english','history'];
  const useType = (absoluteSubjects.includes(subject) && (type==='percentile'||type==='standard')) ? 'grade' : type;
  const key = `${subject}_${useType}`;
  return row[key];
}

const SUBJECTS = [
  {key:'korean',  label:'국어'},
  {key:'math',    label:'수학'},
  {key:'english', label:'영어'},
  {key:'history', label:'한국사'},
  {key:'inq1',    label:'탐구1'},
  {key:'inq2',    label:'탐구2'}
];

function drawMockChart(rows){
  const ctx = document.getElementById('mockChart');
  if(!ctx) return;
  if(STATE.charts.mock) STATE.charts.mock.destroy();

  const labels = rows.map(r => ROUND_LABEL[r.round] || r.round);
  const type = STATE.scoreType;

  const colors = {korean:'#4e79a7', math:'#f28e2b', english:'#e15759',
                  history:'#76b7b2', inq1:'#59a14f', inq2:'#b07aa1'};

  const datasets = SUBJECTS.map(s => ({
    label: s.label,
    data: rows.map(r => {
      const v = pickScore(r, s.key, type);
      return (v===null||v===undefined||v==='') ? null : Number(v);
    }),
    borderColor: colors[s.key],
    backgroundColor: colors[s.key],
    tension: 0.3,
    spanGaps: true
  }));

  const opts = {
    responsive: true,
    plugins:{ legend:{position:'bottom'} },
    scales:{
      y: type==='grade'
        ? {reverse:true, min:1, max:9, ticks:{stepSize:1}, title:{display:true,text:'등급 (1등급이 위)'}}
        : {beginAtZero: type==='raw'||type==='percentile', title:{display:true,text: typeLabel(type)}}
    }
  };

  STATE.charts.mock = new Chart(ctx, { type:'line', data:{labels, datasets}, options:opts });
}

function typeLabel(t){
  return {grade:'등급', percentile:'백분위', standard:'표준점수', raw:'원점수'}[t];
}

// ====== 회차별 세부 테이블 ======
function drawMockTable(rows, stu){
  const wrap = document.getElementById('mockTableWrap');
  if(!wrap) return;
  const type = STATE.scoreType;
  const isG3 = Number(stu.grade) === 3; // 3학년만 선택과목 표시

  let html = '<table class="mock-table"><thead><tr><th>회차</th>';
  SUBJECTS.forEach(s=>{ html += `<th>${s.label}</th>`; });
  html += '</tr></thead><tbody>';

  rows.forEach(r=>{
    html += `<tr><td class="round-cell">${ROUND_LABEL[r.round]||r.round}</td>`;
    SUBJECTS.forEach(s=>{
      const grade = r[`${s.key}_grade`];
      const v = pickScore(r, s.key, type);
      const absolute = (s.key==='english'||s.key==='history');

      // 선택과목 라벨 (3학년 + 수학/탐구1/탐구2 만)
      let elective = '';
      if(isG3){
        if(s.key==='math' && r.math_choice) elective = `<div class="elective">${r.math_choice}</div>`;
        if(s.key==='inq1' && r.inq1_subject) elective = `<div class="elective">${r.inq1_subject}</div>`;
        if(s.key==='inq2' && r.inq2_subject) elective = `<div class="elective">${r.inq2_subject}</div>`;
      }

      // 셀 렌더링
      if(type==='grade' || (absolute && (type==='percentile'||type==='standard'))){
        // 등급 표시 모드: 글자색만
        const g = Number(grade);
        const cls = isNaN(g) ? '' : `g${g}`;
        html += `<td class="cell-grade ${cls}">${grade ?? '-'}${elective}</td>`;
      } else {
        // 원점수/표준점수/백분위: 숫자 크게 + 배경색
        const display = (v===null||v===undefined||v==='') ? '-' : v;
        html += `<td class="cell-score score-${type}"><div class="big-num">${display}</div>${elective}</td>`;
      }
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
}

// ========== 공통 간단 탭 ==========
async function renderSimple(stu, panel, path, title){
  const data = await loadJSON(path);
  const rows = (data && data[stu.hak]) || [];
  if(!rows.length){
    panel.innerHTML = `<h2>${title}</h2><div class="empty-panel">추후 입력 예정</div>`;
    return;
  }
  panel.innerHTML = `<h2>${title}</h2><pre class="raw-json">${JSON.stringify(rows, null, 2)}</pre>`;
}

window.addEventListener('DOMContentLoaded', init);
