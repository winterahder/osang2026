/* osang2026 v2.6.2 - Y축 제목 동적 표시 */
'use strict';

const $ = (id) => document.getElementById(id);
const setText = (id, t) => { const el = $(id); if (el) el.textContent = t; };
const setHTML = (id, h) => { const el = $(id); if (el) el.innerHTML = h; };

const STATE = {
  students: [],
  mock: {},
  selected: null,
  scoreMode: 'grade', // grade | percentile | standard | raw
  chart: null,
};

const SUBJECTS = ['국어','수학','영어','한국사','탐구1','탐구2'];
const SUBJECT_COLORS = {
  '국어':'#3b82f6','수학':'#ef4444','영어':'#10b981',
  '한국사':'#8b5cf6','탐구1':'#f59e0b','탐구2':'#06b6d4'
};

const ROUND_ORDER = {
  'g1_3월':1,'g1_6월':2,'g1_9월':3,'g1_11월':4,
  'g2_3월':5,'g2_6월':6,'g2_9월':7,'g2_11월':8,
  'g3_3월':9,'g3_6월':10,'g3_9월':11,'g3_11월':12,
};
const roundLabel = (r) => {
  if (!r) return '';
  const m = String(r).match(/g(\d)_?(\d+)월?/);
  if (m) return `${m[1]}학년 ${m[2]}월`;
  return r;
};

const LABEL_MAP = {
  hak:'학번', grade:'학년', class:'반', no:'번호',
  name:'이름', gender:'성별', sex:'성별',
  g1_hak:'1학년 학번', g2_hak:'2학년 학번', g3_hak:'3학년 학번',
  birth:'생년월일', phone:'연락처', address:'주소',
  parent:'보호자', parent_phone:'보호자 연락처',
};
const BASIC_ORDER = ['hak','grade','class','no','name','gender','sex','g1_hak','g2_hak','g3_hak'];

/* ---------------- 초기화 ---------------- */
document.addEventListener('DOMContentLoaded', init);

async function init(){
  try {
    const [s, m] = await Promise.all([
      fetch('data/students.json').then(r=>r.json()),
      fetch('data/mock.json').then(r=>r.json()),
    ]);
    STATE.students = Array.isArray(s) ? s : Object.entries(s).map(([k,v])=>({hak:k,...v}));
    STATE.mock = m || {};
    STATE.students.sort((a,b)=>String(a.hak||'').localeCompare(String(b.hak||'')));
    setText('statusBar', `총 ${STATE.students.length}명 로드됨`);
    buildFilters();
    renderStudentList();
  } catch(e){
    setText('statusBar', '데이터 로드 실패: '+e.message);
    console.error(e);
  }
}

/* ---------------- 필터 ---------------- */
function buildFilters(){
  const gradeSel = $('gradeFilter');
  const classSel = $('classFilter');
  const search = $('searchInput');
  if (!gradeSel || !classSel) return;

  const grades = [...new Set(STATE.students.map(s=>parseHak(s.hak).grade))].sort();
  gradeSel.innerHTML = '<option value="">전체 학년</option>' +
    grades.map(g=>`<option value="${g}">${g}학년</option>`).join('');

  const refreshClass = () => {
    const g = gradeSel.value;
    if (!g){ classSel.innerHTML = '<option value="">전체 반</option>'; return; }
    const classes = [...new Set(STATE.students
      .filter(s=>parseHak(s.hak).grade==+g)
      .map(s=>parseHak(s.hak).cls))].sort((a,b)=>a-b);
    classSel.innerHTML = '<option value="">전체 반</option>' +
      classes.map(c=>`<option value="${c}">${c}반</option>`).join('');
  };
  gradeSel.addEventListener('change', ()=>{ refreshClass(); renderStudentList(); });
  classSel.addEventListener('change', renderStudentList);
  if (search) search.addEventListener('input', renderStudentList);
}

function parseHak(hak){
  const s = String(hak||'').padStart(5,'0');
  return { grade:+s[0]||0, cls:+s.slice(1,3)||0, num:+s.slice(3,5)||0 };
}

/* ---------------- 학생 목록 ---------------- */
function renderStudentList(){
  const list = $('studentList');
  if (!list) return;
  const g = $('gradeFilter')?.value;
  const c = $('classFilter')?.value;
  const q = ($('searchInput')?.value || '').trim().toLowerCase();

  const filtered = STATE.students.filter(s=>{
    const p = parseHak(s.hak);
    if (g && p.grade != +g) return false;
    if (c && p.cls != +c) return false;
    if (q){
      const name = (s.name||s.이름||'').toLowerCase();
      if (!name.includes(q) && !String(s.hak).includes(q)) return false;
    }
    return true;
  });

  list.innerHTML = filtered.map(s=>{
    const p = parseHak(s.hak);
    const name = s.name || s.이름 || '';
    const sex = s.gender || s.sex || s.성별 || '';
    return `<div class="student-item" data-hak="${s.hak}">
      <span class="hak">${String(s.hak).slice(-4)}</span>
      <span class="name">${name}</span>
      <span class="sex">${sex}</span>
    </div>`;
  }).join('');

  list.querySelectorAll('.student-item').forEach(el=>{
    el.addEventListener('click', ()=>selectStudent(el.dataset.hak));
  });
}

/* ---------------- 학생 선택 ---------------- */
function selectStudent(hak){
  const s = STATE.students.find(x=>String(x.hak)===String(hak));
  if (!s) return;
  STATE.selected = s;
  document.querySelectorAll('.student-item').forEach(el=>{
    el.classList.toggle('active', el.dataset.hak===String(hak));
  });
  renderDetail();
}

/* ---------------- 상세 ---------------- */
function renderDetail(){
  const s = STATE.selected;
  if (!s){ setHTML('detailPanel','<div class="placeholder">👈 왼쪽에서 학생을 선택하세요</div>'); return; }
  const p = parseHak(s.hak);
  const name = s.name || s.이름 || '';
  const sex = s.gender || s.sex || s.성별 || '';

  setHTML('detailPanel', `
    <div class="detail-header">
      <h2>${name} <span class="hak-small">(${s.hak})</span></h2>
      <div class="badges">
        <span class="badge">${p.grade}학년 ${p.cls}반 ${p.num}번</span>
        ${sex?`<span class="badge">${sex}</span>`:''}
        ${s.g1_hak?`<span class="badge muted">1학년 학번: ${s.g1_hak}</span>`:''}
        ${s.g2_hak?`<span class="badge muted">2학년 학번: ${s.g2_hak}</span>`:''}
      </div>
    </div>
    <div class="tabs">
      <button class="tab active" data-tab="basic">기본정보</button>
      <button class="tab" data-tab="mock">모의고사</button>
      <button class="tab" data-tab="grade">내신</button>
      <button class="tab" data-tab="sewtuk">세특</button>
      <button class="tab" data-tab="haengbal">행발</button>
      <button class="tab" data-tab="award">수상</button>
      <button class="tab" data-tab="reading">독서</button>
    </div>
    <div id="tabContent" class="tab-content"></div>
  `);
  document.querySelectorAll('.tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      renderTab(t.dataset.tab);
    });
  });
  renderTab('basic');
}

function renderTab(name){
  const s = STATE.selected;
  const c = $('tabContent');
  if (!c || !s) return;
  try {
    if (name==='basic') renderBasic(s, c);
    else if (name==='mock') renderMock(s, c);
    else c.innerHTML = '<div class="empty">준비 중...</div>';
  } catch(e){
    c.innerHTML = `<div class="error">탭 렌더 오류: ${e.message}</div>`;
    console.error(e);
  }
}

function renderBasic(s, c){
  const keys = [...BASIC_ORDER.filter(k=>s[k]!=null&&s[k]!==''),
    ...Object.keys(s).filter(k=>!BASIC_ORDER.includes(k)&&s[k]!=null&&s[k]!=='')];
  c.innerHTML = `<div class="info-table">
    ${keys.map(k=>`<div class="info-row"><div class="info-key">${LABEL_MAP[k]||k}</div><div class="info-val">${s[k]}</div></div>`).join('')}
  </div>`;
}

/* ---------------- 모의고사 ---------------- */
function getMockRecords(s){
  const keys = [s.hak, String(s.hak), Number(s.hak), s.g1_hak, s.g2_hak, s.g3_hak].filter(Boolean);
  for (const k of keys){
    const v = STATE.mock[k] || STATE.mock[String(k)];
    if (Array.isArray(v) && v.length) return v;
  }
  return [];
}

function renderMock(s, c){
  const recs = getMockRecords(s);
  if (!recs.length){ c.innerHTML = '<div class="empty">📊 모의고사 데이터가 없습니다.</div>'; return; }
  recs.sort((a,b)=>(ROUND_ORDER[a.round]||99)-(ROUND_ORDER[b.round]||99));

  c.innerHTML = `
    <div class="mode-buttons">
      ${['grade','percentile','standard','raw'].map(m=>`
        <button class="mode-btn ${STATE.scoreMode===m?'active':''}" data-mode="${m}">
          ${ {grade:'등급',percentile:'백분위',standard:'표준점수',raw:'원점수'}[m] }
        </button>`).join('')}
    </div>
    <div class="chart-wrap"><canvas id="mockChart"></canvas></div>
    <h3>회차별 세부 성적</h3>
    <div id="mockTable"></div>
  `;
  document.querySelectorAll('.mode-btn').forEach(b=>{
    b.addEventListener('click', ()=>{
      STATE.scoreMode = b.dataset.mode;
      document.querySelectorAll('.mode-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      drawMockChart(recs);
      drawMockTable(recs);
    });
  });
  drawMockChart(recs);
  drawMockTable(recs);
}

function getScoreValue(rec, subj, mode){
  const o = rec[subj]; if (!o) return null;
  // 영어/한국사는 백분위/표점 모드여도 등급 유지
  if ((subj==='영어'||subj==='한국사') && (mode==='percentile'||mode==='standard')){
    return o.등급 ?? null;
  }
  if (mode==='grade') return o.등급 ?? null;
  if (mode==='percentile') return o.백분위 ?? null;
  if (mode==='standard') return o.표준점수 ?? null;
  if (mode==='raw') return o.원점수 ?? null;
  return null;
}

/* 모드별 Y축 설정 */
function getYAxisConfig(mode){
  if (mode==='grade'){
    return {
      title: '등급',
      reverse: true,          // 1등급이 위
      min: 0.5, max: 9.5,
      stepSize: 1,
      callback: (v)=> Number.isInteger(v) ? v : '',
    };
  }
  if (mode==='percentile'){
    return {
      title: '백분위',
      reverse: false,
      min: 0, max: 100,
      stepSize: 10,
      callback: (v)=> v,
    };
  }
  if (mode==='standard'){
    return {
      title: '표준점수',
      reverse: false,
      min: 0, max: 200,
      stepSize: 20,
      callback: (v)=> v,
    };
  }
  // raw (원점수)
  return {
    title: '원점수',
    reverse: false,
    min: 0, max: 100,
    stepSize: 10,
    callback: (v)=> v,
  };
}

function drawMockChart(recs){
  const ctx = $('mockChart'); if (!ctx) return;
  if (STATE.chart){ STATE.chart.destroy(); STATE.chart = null; }
  const labels = recs.map(r=>roundLabel(r.round));
  const mode = STATE.scoreMode;
  const yConf = getYAxisConfig(mode);

  const datasets = SUBJECTS.map(subj=>({
    label: subj,
    data: recs.map(r=>getScoreValue(r, subj, mode)),
    borderColor: SUBJECT_COLORS[subj],
    backgroundColor: SUBJECT_COLORS[subj],
    borderWidth: 2,
    tension: 0.3,
    spanGaps: true,
    pointRadius: 4,
    pointHoverRadius: 6,
  }));

  STATE.chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { top: 20 } },
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: `${yConf.title} 추이`, font:{size:14} },
      },
      scales: {
        y: {
          reverse: yConf.reverse,
          min: yConf.min,
          max: yConf.max,
          title: { display: true, text: yConf.title, font:{size:13,weight:'bold'} },
          ticks: {
            stepSize: yConf.stepSize,
            callback: yConf.callback,
          },
        },
        x: { ticks: { autoSkip: false } },
      },
    },
  });
}

function drawMockTable(recs){
  const host = $('mockTable'); if (!host) return;
  const mode = STATE.scoreMode;
  const header = `<tr><th>회차</th>${SUBJECTS.map(s=>`<th>${s}</th>`).join('')}</tr>`;
  const body = recs.map(r=>{
    const cells = SUBJECTS.map(subj=>{
      const v = getScoreValue(r, subj, mode);
      if (v==null) return '<td>-</td>';
      // 등급은 글자색만, 나머지는 큰 숫자+배경
      if (mode==='grade' || ((subj==='영어'||subj==='한국사')&&(mode==='percentile'||mode==='standard'))){
        return `<td class="grade-cell g${v}">${v}</td>`;
      }
      return `<td class="score-cell">${v}</td>`;
    }).join('');
    return `<tr><td class="round-cell">${roundLabel(r.round)}</td>${cells}</tr>`;
  }).join('');
  host.innerHTML = `<table class="mock-table"><thead>${header}</thead><tbody>${body}</tbody></table>`;
}
