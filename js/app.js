// osang2026 v2.3.3 - 학번 정렬 TypeError 수정
const DATA_DIR = 'data/';
const ROUND_ORDER = {
  '1학년 3월': 1, '1학년 6월': 2, '1학년 9월': 3, '1학년 11월': 4,
  '2학년 3월': 5, '2학년 6월': 6, '2학년 9월': 7, '2학년 11월': 8,
  '3학년 3월': 9, '3학년 6월':10, '3학년 9월':11, '3학년 11월':12
};
const TABS = [
  {id:'basic', label:'기본정보'},
  {id:'mock',  label:'모의고사'},
  {id:'grades',label:'내신'},
  {id:'sewtuk',label:'세특'},
  {id:'behavior',label:'행발'},
  {id:'autonomy',label:'자율'},
  {id:'club',label:'동아리'},
  {id:'volunteer',label:'봉사'},
  {id:'career',label:'진로'},
  {id:'award',label:'수상'},
  {id:'reading',label:'독서'},
  {id:'applications',label:'지원대학'},
  {id:'checklist',label:'체크리스트'},
  {id:'attendance',label:'출결'}
];
const SCORE_MODES = [
  {key:'등급', label:'등급'},
  {key:'백분위', label:'백분위'},
  {key:'표준점수', label:'표준점수'},
  {key:'원점수', label:'원점수'}
];
const SUBJECTS = ['국어','수학','영어','한국사','탐구1','탐구2'];
const ABS_SUBJECTS = new Set(['영어','한국사']);

let STATE = {
  students: [],
  filtered: [],
  selected: null,
  scoreMode: '등급',
  activeTab: 'basic',
  data: { mock:null, grades:null, sewtuk:null, behavior:null, autonomy:null,
          club:null, volunteer:null, career:null, award:null, reading:null,
          applications:null, checklist:null, attendance:null }
};

async function fetchJSON(name){
  try{
    const r = await fetch(DATA_DIR + name + '?t=' + Date.now());
    if(!r.ok) return null;
    return await r.json();
  }catch(e){ console.warn('fetch fail', name, e); return null; }
}

function showError(msg){
  const el = document.getElementById('detail');
  if(el) el.innerHTML = '<div class="error">⚠️ '+msg+'</div>';
}

async function init(){
  try{
    const s = await fetchJSON('students.json');
    if(!s){ showError('students.json 로드 실패'); return; }
    STATE.students = Array.isArray(s) ? s : (s.students || Object.values(s));
    STATE.students.sort((a,b)=> String(a.hak||'').localeCompare(String(b.hak||'')));
    STATE.filtered = STATE.students.slice();
    buildFilters();
    buildTabs();
    renderStudentList();
    if(STATE.students.length>0) selectStudent(STATE.students[0]);
  }catch(e){
    console.error(e);
    showError('초기화 오류: '+e.message);
  }
}

function buildFilters(){
  const host = document.getElementById('filters');
  host.innerHTML = `
    <input id="q" class="search" placeholder="🔍 이름 또는 학번 검색" />
    <div class="filter-row">
      <select id="grade">
        <option value="">학년: 전체</option>
        <option value="1">1학년</option>
        <option value="2">2학년</option>
        <option value="3">3학년</option>
      </select>
      <select id="cls" style="display:none">
        <option value="">반: 전체</option>
      </select>
    </div>`;
  document.getElementById('q').addEventListener('input', applyFilter);
  document.getElementById('grade').addEventListener('change', onGradeChange);
  document.getElementById('cls').addEventListener('change', applyFilter);
}

function onGradeChange(){
  const g = document.getElementById('grade').value;
  const cls = document.getElementById('cls');
  if(!g){
    cls.style.display='none'; cls.value='';
  }else{
    cls.style.display='';
    cls.innerHTML = '<option value="">반: 전체</option>' +
      [1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}">${n}반</option>`).join('');
  }
  applyFilter();
}

function applyFilter(){
  const q = (document.getElementById('q').value||'').trim().toLowerCase();
  const g = document.getElementById('grade').value;
  const c = document.getElementById('cls').value;
  STATE.filtered = STATE.students.filter(s=>{
    if(g && String(s.grade)!==g) return false;
    if(c && String(s.cls)!==c) return false;
    if(q){
      const blob = (String(s.hak||'')+' '+(s.name||'')).toLowerCase();
      if(!blob.includes(q)) return false;
    }
    return true;
  });
  renderStudentList();
}

function renderStudentList(){
  const host = document.getElementById('list');
  if(!host) return;
  host.innerHTML = `<div class="list-count">총 ${STATE.filtered.length}명</div>` +
    STATE.filtered.map(s=>`
      <div class="student-item ${STATE.selected&&STATE.selected.hak===s.hak?'active':''}" data-hak="${s.hak}">
        <span class="shak">${s.hak}</span>
        <span class="sname">${s.name||''}</span>
        <span class="sgender">${s.gender||''}</span>
      </div>`).join('');
  host.querySelectorAll('.student-item').forEach(el=>{
    el.addEventListener('click', ()=>{
      const h = el.dataset.hak;
      const st = STATE.students.find(x=> String(x.hak)===String(h));
      if(st) selectStudent(st);
    });
  });
}

function selectStudent(s){
  STATE.selected = s;
  renderStudentList();
  renderDetail();
}

function buildTabs(){
  const host = document.getElementById('tabs');
  host.innerHTML = TABS.map(t=>`<div class="tab ${STATE.activeTab===t.id?'active':''}" data-tab="${t.id}">${t.label}</div>`).join('');
  host.querySelectorAll('.tab').forEach(el=>{
    el.addEventListener('click', ()=>{
      STATE.activeTab = el.dataset.tab;
      host.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      el.classList.add('active');
      renderDetail();
    });
  });
}

async function renderDetail(){
  const host = document.getElementById('detail');
  if(!STATE.selected){ host.innerHTML='<div class="empty">학생을 선택하세요</div>'; return; }
  const s = STATE.selected;
  const header = `
    <div class="detail-header">
      <h2>${s.name||''} <small>${s.grade||'?'}학년 ${s.cls||'?'}반 ${s.num||'?'}번</small></h2>
      <div class="hak-history">
        ${s.g1_hak?`<span>1학년 학번 <b>${s.g1_hak}</b></span>`:''}
        ${s.g2_hak?`<span>2학년 학번 <b>${s.g2_hak}</b></span>`:''}
        <span>현재 학번 <b>${s.hak}</b></span>
      </div>
    </div>`;
  host.innerHTML = header + '<div id="tab-body">불러오는 중...</div>';
  const body = document.getElementById('tab-body');
  const tab = STATE.activeTab;
  if(tab==='basic'){
    body.innerHTML = renderBasic(s);
  }else if(tab==='mock'){
    if(!STATE.data.mock) STATE.data.mock = await fetchJSON('mock.json') || {};
    renderMock(body, s);
  }else{
    if(!STATE.data[tab]) STATE.data[tab] = await fetchJSON(tab+'.json') || {};
    const d = STATE.data[tab];
    const rows = d[s.hak] || d[String(s.hak)] || [];
    if(!rows || (Array.isArray(rows)&&rows.length===0)){
      body.innerHTML = `<div class="empty">등록된 데이터가 없습니다. (추후 입력 예정)</div>`;
    }else{
      body.innerHTML = '<pre class="raw">'+JSON.stringify(rows,null,2)+'</pre>';
    }
  }
}

function renderBasic(s){
  return `
    <table class="info-table">
      <tr><th>이름</th><td>${s.name||''}</td><th>성별</th><td>${s.gender||''}</td></tr>
      <tr><th>학년</th><td>${s.grade||''}</td><th>반/번호</th><td>${s.cls||''}반 ${s.num||''}번</td></tr>
      <tr><th>현재 학번</th><td colspan="3"><b>${s.hak}</b></td></tr>
      <tr><th>1학년 학번</th><td>${s.g1_hak||'-'}</td><th>2학년 학번</th><td>${s.g2_hak||'-'}</td></tr>
    </table>`;
}

function renderMock(body, s){
  const mock = STATE.data.mock || {};
  const rec = mock[s.hak] || mock[String(s.hak)] || [];
  if(!rec.length){
    body.innerHTML = '<div class="empty">모의고사 성적이 없습니다.</div>';
    return;
  }
  rec.sort((a,b)=> (ROUND_ORDER[a.시점]||99) - (ROUND_ORDER[b.시점]||99));
  body.innerHTML = `
    <div class="score-toggle">
      ${SCORE_MODES.map(m=>`<button class="stog ${STATE.scoreMode===m.key?'active':''}" data-mode="${m.key}">${m.label}</button>`).join('')}
    </div>
    <div class="chart-box"><canvas id="mockChart"></canvas></div>
    <div class="score-table-wrap"><table id="scoreTable" class="score-table"></table></div>`;
  body.querySelectorAll('.stog').forEach(btn=>{
    btn.addEventListener('click',()=>{
      STATE.scoreMode = btn.dataset.mode;
      body.querySelectorAll('.stog').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      drawMock(s, rec);
    });
  });
  drawMock(s, rec);
}

function gradeClass(g){
  g = Number(g);
  if(!g) return '';
  if(g===1) return 'g1'; if(g===2) return 'g2'; if(g===3) return 'g3';
  if(g===4) return 'g4'; if(g===5) return 'g5'; if(g<=7) return 'g67'; return 'g89';
}

function cellHtml(subj, row, mode){
  const g = row[subj+'등급'];
  const isAbs = ABS_SUBJECTS.has(subj);
  const showGrade = (mode==='등급') || (isAbs && mode!=='원점수');
  if(showGrade){
    if(g==null||g==='') return '<td>-</td>';
    return `<td class="grade-cell ${gradeClass(g)}">${g}</td>`;
  }
  let v = null, cls='score-num';
  if(mode==='백분위'){ v = row[subj+'백분위']; cls+=' pct'; }
  else if(mode==='표준점수'){ v = row[subj+'표준점수']; cls+=' std'; }
  else if(mode==='원점수'){ v = row[subj+'원점수']; cls+=' raw'; }
  if(v==null||v==='') return '<td>-</td>';
  return `<td class="${cls}">${v}</td>`;
}

function drawMock(s, rec){
  const mode = STATE.scoreMode;
  const is3 = Number(s.grade)===3;
  const headers = ['시점', ...SUBJECTS];
  const rows = rec.map(r=>{
    const tds = [`<td>${r.시점||''}</td>`];
    SUBJECTS.forEach(subj=>{
      let html = cellHtml(subj, r, mode);
      if(is3){
        if(subj==='수학' && r.수학선택) html = html.replace('</td>', `<div class="sub-tag">${r.수학선택}</div></td>`);
        if(subj==='탐구1' && r.탐구1과목) html = html.replace('</td>', `<div class="sub-tag">${r.탐구1과목}</div></td>`);
        if(subj==='탐구2' && r.탐구2과목) html = html.replace('</td>', `<div class="sub-tag">${r.탐구2과목}</div></td>`);
      }
      tds.push(html);
    });
    return '<tr>'+tds.join('')+'</tr>';
  });
  document.getElementById('scoreTable').innerHTML =
    '<thead><tr>'+headers.map(h=>`<th>${h}</th>`).join('')+'</tr></thead>' +
    '<tbody>'+rows.join('')+'</tbody>';

  // chart
  const ctx = document.getElementById('mockChart').getContext('2d');
  if(window._mockChart) window._mockChart.destroy();
  const labels = rec.map(r=>r.시점);
  const datasets = SUBJECTS.map((subj,i)=>{
    const colors = ['#2563eb','#dc2626','#059669','#7c3aed','#ea580c','#0891b2'];
    let ys;
    const isAbs = ABS_SUBJECTS.has(subj);
    const displayMode = (isAbs && mode!=='원점수') ? '등급' : mode;
    if(displayMode==='등급') ys = rec.map(r=>r[subj+'등급']??null);
    else if(displayMode==='백분위') ys = rec.map(r=>r[subj+'백분위']??null);
    else if(displayMode==='표준점수') ys = rec.map(r=>r[subj+'표준점수']??null);
    else ys = rec.map(r=>r[subj+'원점수']??null);
    return { label: subj, data: ys, borderColor: colors[i], backgroundColor: colors[i]+'33', tension:0.3, spanGaps:true };
  });
  const isGradeMode = (mode==='등급');
  window._mockChart = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets },
    options:{
      responsive:true, maintainAspectRatio:false,
      layout:{ padding:{ top:20 } },
      scales:{
        y: isGradeMode
           ? { reverse:true, min:0.5, max:9.5, ticks:{ stepSize:1 }, title:{display:true, text:'등급(낮을수록 우수)'} }
           : { beginAtZero: mode==='백분위' || mode==='원점수', title:{display:true, text:mode} }
      },
      plugins:{ legend:{ position:'bottom' } }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
