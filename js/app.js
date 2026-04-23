
// ============================================================
// 오상고 상담카드 시스템 v2.4 - 안정판
// ============================================================
const STATE = {
  students: [],
  mock: {},
  selected: null,
  gradeFilter: 'all',
  classFilter: 'all',
  searchText: '',
  activeTab: 'basic',
  scoreMode: 'grade'
};

const ABS_SUBJ = ['영어', '한국사'];
const SUBJECTS = ['국어', '수학', '영어', '한국사', '탐구1', '탐구2'];
const COLORS = {
  '국어':'#3b5bdb', '수학':'#e03131', '영어':'#2f9e44',
  '한국사':'#7048e8', '탐구1':'#f76707', '탐구2':'#0c8599'
};

const ROUND_ORDER = [
  ['1학년 3월', 1, 3], ['1학년 6월', 1, 6], ['1학년 9월', 1, 9], ['1학년 11월', 1, 11],
  ['2학년 3월', 2, 3], ['2학년 6월', 2, 6], ['2학년 9월', 2, 9], ['2학년 11월', 2, 11],
  ['3학년 3월', 3, 3], ['3학년 6월', 3, 6], ['3학년 9월', 3, 9], ['3학년 11월', 3, 11]
];

const TABS = [
  { id: 'basic', label: '기본정보' },
  { id: 'grade', label: '내신' },
  { id: 'mock',  label: '모의고사' },
  { id: 'award', label: '수상' },
  { id: 'autonomy', label: '자율' },
  { id: 'club', label: '동아리' },
  { id: 'service', label: '봉사' },
  { id: 'career', label: '진로' },
  { id: 'reading', label: '독서' },
  { id: 'sewtuk', label: '세특' },
  { id: 'behavior', label: '행발' },
  { id: 'attend', label: '출결' },
  { id: 'univ', label: '지원대학' },
  { id: 'check', label: '체크리스트' }
];

// --------- helpers ---------
function $(sel){ return document.querySelector(sel); }
function el(tag, attrs={}, ...kids){
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k === 'class') e.className = v;
    else if(k === 'html') e.innerHTML = v;
    else if(k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  });
  kids.flat().forEach(k=>{
    if(k == null) return;
    if(typeof k === 'string') e.appendChild(document.createTextNode(k));
    else e.appendChild(k);
  });
  return e;
}
function setStatus(msg){
  const b = $('#statusBar'); if(b) b.textContent = msg;
}
function parseHak(hak){
  const s = String(hak || '').padStart(5, '0');
  return {
    grade: +s[0] || 0,
    cls:   +s.slice(1,3) || 0,
    num:   +s.slice(3,5) || 0
  };
}
function getField(obj, ...names){
  for(const n of names){
    if(obj && obj[n] !== undefined && obj[n] !== null && obj[n] !== '') return obj[n];
  }
  return '';
}
function normalizeRoundLabel(r){
  if(!r) return '';
  let s = String(r).replace(/\s+/g, '');
  // g1_3, g1-3, 1-3, 1학년3월 등을 모두 "1학년 3월"로 변환
  s = s.replace(/^g/i, '').replace(/_/g, '-');
  let m = s.match(/^([123])[^0-9]*([0-9]{1,2})/);
  if(m) return `${m[1]}학년 ${+m[2]}월`;
  m = s.match(/([123])학년([0-9]{1,2})월/);
  if(m) return `${m[1]}학년 ${+m[2]}월`;
  return String(r);
}

// --------- data load ---------
async function loadData(){
  try{
    setStatus('데이터 로드 중...');
    const [sRes, mRes] = await Promise.all([
      fetch('data/students.json'),
      fetch('data/mock.json').catch(()=>null)
    ]);
    if(!sRes.ok) throw new Error('students.json 로드 실패 ('+sRes.status+')');
    const sData = await sRes.json();
    const mData = (mRes && mRes.ok) ? await mRes.json() : {};

    STATE.students = normalizeStudents(sData);
    STATE.mock = mData || {};
    setStatus(`총 ${STATE.students.length}명 로드됨`);

    renderStudentList();
  }catch(e){
    console.error(e);
    setStatus('로드 오류: ' + e.message);
    showErrorBanner('데이터 로드 오류: ' + e.message);
  }
}

function normalizeStudents(data){
  let arr = [];
  if(Array.isArray(data)) arr = data.slice();
  else if(data && typeof data === 'object'){
    arr = Object.entries(data).map(([k, v])=>{
      if(v && typeof v === 'object') return { hak: v.hak || v.학번 || k, ...v };
      return { hak: k };
    });
  }
  arr = arr.map(s => {
    const hak = getField(s, 'hak', '학번', 'id') || '';
    const p = parseHak(hak);
    return {
      ...s,
      hak: String(hak),
      name: getField(s, 'name', '이름', '성명') || '',
      sex: getField(s, 'sex', 'gender', '성별') || '',
      grade: Number(getField(s, 'grade', '학년')) || p.grade,
      cls: Number(getField(s, 'cls', 'class', '반')) || p.cls,
      num: Number(getField(s, 'num', 'number', '번호')) || p.num,
      g1_hak: getField(s, 'g1_hak', '1학년학번', 'hak1') || '',
      g2_hak: getField(s, 'g2_hak', '2학년학번', 'hak2') || ''
    };
  });
  arr.sort((a,b)=> String(a.hak).localeCompare(String(b.hak)));
  return arr;
}

function showErrorBanner(msg){
  const d = $('#tabContent');
  if(d) d.innerHTML = `<div class="error-box">${msg}</div>`;
}

// --------- sidebar ---------
function renderStudentList(){
  const list = $('#studentList');
  const cntEl = $('#countInfo');
  if(!list) return;
  list.innerHTML = '';
  const q = STATE.searchText.trim().toLowerCase();
  const filtered = STATE.students.filter(s => {
    if(STATE.gradeFilter !== 'all' && String(s.grade) !== String(STATE.gradeFilter)) return false;
    if(STATE.classFilter !== 'all' && String(s.cls) !== String(STATE.classFilter)) return false;
    if(q){
      const hay = (s.name + ' ' + s.hak).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  if(cntEl) cntEl.textContent = `${filtered.length}명`;
  if(!filtered.length){
    list.appendChild(el('li', {class:'empty', style:'grid-template-columns:1fr;text-align:center;color:#8b94a8'}, '조건에 맞는 학생 없음'));
    return;
  }
  filtered.forEach(s=>{
    const li = el('li', {
      onclick: ()=>selectStudent(s)
    },
      el('span', {class:'hak'}, String(s.cls).padStart(2,'0')+String(s.num).padStart(2,'0')),
      el('span', {class:'name'}, s.name || '(이름없음)'),
      el('span', {class:'sex'}, s.sex || '')
    );
    if(STATE.selected && STATE.selected.hak === s.hak) li.classList.add('active');
    list.appendChild(li);
  });
}

// --------- student detail ---------
function selectStudent(s){
  STATE.selected = s;
  renderStudentList();
  renderDetailHeader();
  renderTabNav();
  renderTab();
}

function renderDetailHeader(){
  const h = $('#detailHeader'); if(!h) return;
  const s = STATE.selected;
  if(!s){ h.innerHTML = `<div class="placeholder">👈 왼쪽에서 학생을 선택하세요</div>`; return; }
  const badges = [];
  badges.push(`<span>${s.grade}학년 ${s.cls}반 ${s.num}번</span>`);
  if(s.sex) badges.push(`<span class="sex-badge">${s.sex}</span>`);
  if(s.g1_hak) badges.push(`<span>1학년 학번: ${s.g1_hak}</span>`);
  if(s.g2_hak) badges.push(`<span>2학년 학번: ${s.g2_hak}</span>`);
  h.innerHTML = `
    <h2>${s.name || '(이름없음)'} <span style="font-size:14px;color:#8b94a8;font-weight:400">(${s.hak})</span></h2>
    <div class="meta">${badges.join('')}</div>
  `;
}

function renderTabNav(){
  const nav = $('#tabNav'); if(!nav) return;
  nav.style.display = 'flex';
  nav.innerHTML = '';
  TABS.forEach(t=>{
    const b = el('button', {
      onclick: ()=>{ STATE.activeTab = t.id; renderTabNav(); renderTab(); }
    }, t.label);
    if(STATE.activeTab === t.id) b.classList.add('active');
    nav.appendChild(b);
  });
}

function renderTab(){
  const c = $('#tabContent'); if(!c) return;
  if(!STATE.selected){ c.innerHTML=''; return; }
  try{
    c.innerHTML = '<div class="empty">로딩중...</div>';
    switch(STATE.activeTab){
      case 'basic': renderBasic(c); break;
      case 'mock':  renderMock(c); break;
      default:      renderGenericEmpty(c); break;
    }
  }catch(e){
    console.error(e);
    c.innerHTML = `<div class="error-box">탭 렌더 오류: ${e.message}</div>`;
  }
}

function renderBasic(c){
  const s = STATE.selected;
  c.innerHTML = '';
  const rows = [
    ['이름', s.name],
    ['학번', s.hak],
    ['성별', s.sex],
    ['학년/반/번호', `${s.grade}학년 ${s.cls}반 ${s.num}번`],
    ['1학년 학번', s.g1_hak || '-'],
    ['2학년 학번', s.g2_hak || '-']
  ];
  const p = el('div', {class:'panel'});
  p.appendChild(el('h3', {}, '기본 정보'));
  const tbl = el('table', {class:'score-table'});
  rows.forEach(([k,v])=>{
    const tr = el('tr', {},
      el('th', {style:'width:30%;text-align:left;padding-left:14px'}, k),
      el('td', {style:'text-align:left'}, String(v || '-'))
    );
    tbl.appendChild(tr);
  });
  p.appendChild(tbl);
  c.appendChild(p);
}

function renderGenericEmpty(c){
  const tabLabel = TABS.find(t=>t.id===STATE.activeTab)?.label || '';
  c.innerHTML = `<div class="panel"><div class="empty">📄 ${tabLabel} 데이터는 준비 중입니다.</div></div>`;
}

// --------- mock ---------
function findMockRecords(s){
  const tryKeys = [s.hak, String(s.hak), Number(s.hak), s.g1_hak, s.g2_hak, String(s.g1_hak), String(s.g2_hak)];
  for(const k of tryKeys){
    if(k === '' || k == null) continue;
    const v = STATE.mock[k];
    if(v) return { data: v, keyUsed: k };
  }
  return { data: null, tried: tryKeys.filter(k=>k!=='' && k!=null) };
}

function recordsToMap(records){
  // records: dict { '1학년 3월': { '국어': {...}, ... } } 또는 array [ {회차, 과목, ...} ]
  const map = {}; // map[round][subject] = {등급, 백분위, 표준점수, 원점수, 선택과목}
  if(Array.isArray(records)){
    records.forEach(r=>{
      const round = normalizeRoundLabel(r.회차 || r.round || r.시험);
      const subj = r.과목 || r.subject;
      if(!round || !subj) return;
      if(!map[round]) map[round] = {};
      map[round][subj] = {
        grade: r.등급 ?? r.grade,
        pct: r.백분위 ?? r.percentile,
        std: r.표준점수 ?? r.standard,
        raw: r.원점수 ?? r.raw,
        sel: r.선택과목 ?? r.elective ?? ''
      };
    });
  }else if(records && typeof records === 'object'){
    Object.entries(records).forEach(([roundKey, subjObj])=>{
      const round = normalizeRoundLabel(roundKey);
      if(!map[round]) map[round] = {};
      if(subjObj && typeof subjObj === 'object'){
        Object.entries(subjObj).forEach(([subj, v])=>{
          if(!v) return;
          if(typeof v !== 'object'){
            map[round][subj] = { grade: v };
          }else{
            map[round][subj] = {
              grade: v.등급 ?? v.grade,
              pct: v.백분위 ?? v.percentile,
              std: v.표준점수 ?? v.standard,
              raw: v.원점수 ?? v.raw,
              sel: v.선택과목 ?? v.elective ?? ''
            };
          }
        });
      }
    });
  }
  return map;
}

function getRoundsForStudent(map, s){
  return ROUND_ORDER
    .filter(([label, g])=> g <= (s.grade || 3))
    .map(([label])=> label);
}

function renderMock(c){
  const s = STATE.selected;
  c.innerHTML = '';

  // 모드 버튼
  const modes = [
    { id:'grade', label:'등급' },
    { id:'pct',   label:'백분위' },
    { id:'std',   label:'표준점수' },
    { id:'raw',   label:'원점수' }
  ];
  const modeBar = el('div', {class:'mode-buttons'});
  modes.forEach(m=>{
    const b = el('button', {
      onclick: ()=>{ STATE.scoreMode = m.id; renderMock(c); }
    }, m.label);
    if(STATE.scoreMode === m.id) b.classList.add('active');
    modeBar.appendChild(b);
  });
  c.appendChild(modeBar);

  // 데이터 조회
  const { data, keyUsed, tried } = findMockRecords(s);
  if(!data){
    c.appendChild(el('div', {class:'panel', html:`
      <div class="empty">📊 모의고사 데이터가 없습니다.</div>
      <div class="diag">조회한 키: ${(tried||[]).join(', ') || '-'}</div>
    `}));
    return;
  }
  const map = recordsToMap(data);
  const rounds = getRoundsForStudent(map, s);

  // 차트
  const chartBox = el('div', {class:'chart-box'});
  chartBox.appendChild(el('h3', {}, `📈 ${modes.find(m=>m.id===STATE.scoreMode).label} 추이`));
  const cw = el('div', {class:'chart-wrap'});
  const canvas = el('canvas');
  cw.appendChild(canvas);
  chartBox.appendChild(cw);
  c.appendChild(chartBox);

  drawMockChart(canvas, map, rounds);

  // 표
  const panel = el('div', {class:'panel'});
  panel.appendChild(el('h3', {}, '회차별 세부 성적'));
  const tbl = el('table', {class:'score-table'});
  const thead = el('tr', {}, el('th', {}, '회차'), ...SUBJECTS.map(sj=>el('th', {}, sj)));
  tbl.appendChild(thead);
  rounds.forEach(r=>{
    const tr = el('tr', {}, el('td', {class:'round-cell'}, r));
    SUBJECTS.forEach(sj=>{
      const cell = map[r] && map[r][sj];
      tr.appendChild(renderCell(cell, sj));
    });
    tbl.appendChild(tr);
  });
  panel.appendChild(tbl);
  c.appendChild(panel);

  if(keyUsed !== s.hak){
    panel.appendChild(el('div', {class:'diag'}, `조회 키: ${keyUsed}`));
  }
}

function renderCell(cell, subj){
  if(!cell) return el('td', {}, '-');
  const mode = STATE.scoreMode;
  const isAbs = ABS_SUBJ.includes(subj);
  const showGradeOnly = isAbs && (mode === 'pct' || mode === 'std');

  const s = STATE.selected;
  const showElective = (s && s.grade === 3 && ['수학','탐구1','탐구2'].includes(subj) && cell.sel);

  if(mode === 'grade' || showGradeOnly){
    const g = cell.grade;
    if(g == null || g === '') return el('td', {}, '-');
    const td = el('td', {},
      el('span', {class:'grade-'+g}, String(g)+'등급'),
      showElective ? el('span', {class:'subj-tag'}, cell.sel) : ''
    );
    return td;
  }

  let v = null, cls = 'num-raw';
  if(mode === 'raw'){ v = cell.raw; cls = 'num-raw'; }
  else if(mode === 'std'){ v = cell.std; cls = 'num-std'; }
  else if(mode === 'pct'){ v = cell.pct; cls = 'num-pct'; }

  if(v == null || v === '') return el('td', {}, '-');
  return el('td', {},
    el('span', {class:'num-big ' + cls}, String(v)),
    showElective ? el('span', {class:'subj-tag'}, cell.sel) : ''
  );
}

let chartInstance = null;
function drawMockChart(canvas, map, rounds){
  if(!window.Chart) return;
  if(chartInstance){ try{ chartInstance.destroy(); }catch(e){} chartInstance = null; }

  const mode = STATE.scoreMode;
  const datasets = SUBJECTS.map(subj=>{
    const data = rounds.map(r=>{
      const cell = map[r] && map[r][subj];
      if(!cell) return null;
      const isAbs = ABS_SUBJ.includes(subj);
      if(mode === 'grade' || ((mode==='pct'||mode==='std') && isAbs)){
        return cell.grade ?? null;
      }
      if(mode === 'raw') return cell.raw ?? null;
      if(mode === 'std') return cell.std ?? null;
      if(mode === 'pct') return cell.pct ?? null;
      return null;
    });
    return {
      label: subj,
      data,
      borderColor: COLORS[subj],
      backgroundColor: COLORS[subj],
      tension: 0.2,
      spanGaps: true
    };
  });

  const isGrade = (mode === 'grade');
  const yOpts = isGrade
    ? { reverse:true, min:0.5, max:9.5, ticks:{ stepSize:1 }, title:{display:true, text:'등급'} }
    : { beginAtZero:(mode==='raw'||mode==='pct'), title:{display:true, text:mode==='pct'?'백분위':(mode==='std'?'표준점수':'원점수')} };

  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: rounds, datasets },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      layout: { padding: { top: 20, right: 10, left: 4, bottom: 4 } },
      plugins: {
        legend: { position:'bottom', labels:{ boxWidth:14, font:{size:12} } },
        tooltip: { mode:'index', intersect:false }
      },
      scales: {
        y: yOpts,
        x: { ticks:{ font:{size:11} } }
      }
    }
  });
}

// --------- init ---------
function init(){
  try{
    const g = $('#gradeFilter'), cSel = $('#classFilter'), sch = $('#searchInput');
    if(g) g.addEventListener('change', e=>{
      STATE.gradeFilter = e.target.value;
      if(STATE.gradeFilter === 'all'){
        cSel.style.display = 'none';
        STATE.classFilter = 'all';
      }else{
        cSel.style.display = '';
        cSel.innerHTML = '<option value="all">전체 반</option>' +
          Array.from({length:10}, (_,i)=>`<option value="${i+1}">${i+1}반</option>`).join('');
        STATE.classFilter = 'all';
      }
      renderStudentList();
    });
    if(cSel) cSel.addEventListener('change', e=>{
      STATE.classFilter = e.target.value; renderStudentList();
    });
    if(sch) sch.addEventListener('input', e=>{
      STATE.searchText = e.target.value; renderStudentList();
    });
    loadData();
  }catch(e){
    console.error(e);
    setStatus('초기화 오류: '+e.message);
    showErrorBanner('초기화 오류: '+e.message);
  }
}

document.addEventListener('DOMContentLoaded', init);
