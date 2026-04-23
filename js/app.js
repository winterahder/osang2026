// ==========================================================
// 오상고 상담카드 시스템 v2.3.5
// - 학번에서 반/번호 자동 파싱
// - mock 매칭: 숫자/문자열 모두 시도
// - 필드명 다양한 변형 방어
// ==========================================================

const STATE = {
  students: [],
  mock: null,
  meta: null,
  selected: null,
  filters: { grade: 'all', cls: 'all', keyword: '' },
  scoreType: 'grade',  // grade | percentile | stdscore | raw
  chart: null,
};

const ROUND_ORDER = {
  '1학년 3월': 1, '1학년 6월': 2, '1학년 9월': 3, '1학년 11월': 4,
  '2학년 3월': 5, '2학년 6월': 6, '2학년 9월': 7, '2학년 11월': 8,
  '3학년 3월': 9, '3학년 6월':10, '3학년 9월':11, '3학년 10월':12,
};

// -------- utility --------
function $(sel){ return document.querySelector(sel); }
function $$(sel){ return document.querySelectorAll(sel); }
function showError(msg){
  const box = $('#errorBox');
  if(box){ box.style.display='block'; box.textContent = '⚠️ ' + msg; }
  console.error(msg);
}
function getField(obj, ...keys){
  for(const k of keys){
    if(obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

// 학번 → 학년/반/번호 파싱 (5자리 학번: GCCNN)
function parseHak(hak){
  const s = String(hak || '').padStart(5,'0');
  return {
    grade: parseInt(s.slice(0,1)) || null,
    cls:   parseInt(s.slice(1,3)) || null,
    num:   parseInt(s.slice(3,5)) || null,
  };
}

// -------- Load data --------
async function loadJSON(path){
  try {
    const res = await fetch(path);
    if(!res.ok) throw new Error(path + ' ' + res.status);
    return await res.json();
  } catch(e){
    console.warn('JSON load fail:', path, e);
    return null;
  }
}

async function init(){
  try {
    const [students, mock, meta] = await Promise.all([
      loadJSON('data/students.json'),
      loadJSON('data/mock.json'),
      loadJSON('data/meta.json'),
    ]);

    if(!students || !Array.isArray(students)){
      showError('students.json 로드 실패 또는 형식 오류');
      return;
    }

    // 필드 정규화 + 학번에서 반/번호 파싱
    STATE.students = students.map(s => {
      const hak = getField(s, 'hak', '학번', 'studentId');
      const parsed = parseHak(hak);
      return {
        ...s,
        hak: hak,
        name: getField(s, 'name', '이름', '성명') || '',
        sex:  getField(s, 'sex', 'gender', '성별') || '',
        grade: getField(s, 'grade', '학년') || parsed.grade,
        cls:   getField(s, 'cls', '반', 'ban') || parsed.cls,
        num:   getField(s, 'num', '번호', 'no') || parsed.num,
        g1_hak: getField(s, 'g1_hak', 'hak_g1'),
        g2_hak: getField(s, 'g2_hak', 'hak_g2'),
      };
    });

    // 학번 정렬 (문자열 안전)
    STATE.students.sort((a,b) =>
      String(a.hak||'').localeCompare(String(b.hak||''), undefined, {numeric:true})
    );

    STATE.mock = mock || {};
    STATE.meta = meta || {};

    const cnt = $('#totalCount');
    if(cnt) cnt.textContent = `총 ${STATE.students.length}명 로드됨`;

    buildFilters();
    renderList();
    bindEvents();
  } catch(e){
    showError('초기화 오류: ' + e.message);
    console.error(e);
  }
}

// -------- filters --------
function buildFilters(){
  const grade = $('#gradeFilter');
  const cls = $('#classFilter');
  if(!grade || !cls) return;

  grade.innerHTML = `
    <option value="all">전체</option>
    <option value="1">1학년</option>
    <option value="2">2학년</option>
    <option value="3">3학년</option>
  `;
  cls.innerHTML = `<option value="all">전체 반</option>`;
  for(let i=1;i<=10;i++) cls.innerHTML += `<option value="${i}">${i}반</option>`;
  cls.style.display = 'none';

  grade.onchange = () => {
    STATE.filters.grade = grade.value;
    STATE.filters.cls = 'all';
    cls.value = 'all';
    cls.style.display = (grade.value === 'all') ? 'none' : '';
    renderList();
  };
  cls.onchange = () => {
    STATE.filters.cls = cls.value;
    renderList();
  };
}

function bindEvents(){
  const kw = $('#searchInput');
  if(kw){
    kw.oninput = () => {
      STATE.filters.keyword = kw.value.trim().toLowerCase();
      renderList();
    };
  }
}

// -------- list --------
function filteredStudents(){
  const {grade, cls, keyword} = STATE.filters;
  return STATE.students.filter(s => {
    if(grade !== 'all' && String(s.grade) !== String(grade)) return false;
    if(cls !== 'all' && String(s.cls) !== String(cls)) return false;
    if(keyword){
      const hay = (s.name + ' ' + s.hak).toLowerCase();
      if(!hay.includes(keyword)) return false;
    }
    return true;
  });
}

function renderList(){
  const list = $('#studentList');
  const cnt = $('#filterCount');
  if(!list) return;
  const arr = filteredStudents();
  if(cnt) cnt.textContent = `${arr.length}명`;
  list.innerHTML = arr.map(s => `
    <div class="student-item ${STATE.selected?.hak===s.hak?'active':''}" data-hak="${s.hak}">
      <span class="hak">${s.hak}</span>
      <span class="name">${s.name}</span>
      <span class="sex ${s.sex==='남'?'male':'female'}">${s.sex}</span>
    </div>
  `).join('');
  list.querySelectorAll('.student-item').forEach(el => {
    el.onclick = () => selectStudent(el.dataset.hak);
  });
}

function selectStudent(hak){
  STATE.selected = STATE.students.find(s =>
    String(s.hak) === String(hak)
  );
  renderList();
  renderDetail();
}

// -------- detail --------
function renderDetail(){
  const panel = $('#detailPanel');
  if(!panel) return;
  const s = STATE.selected;
  if(!s){
    panel.innerHTML = `<div class="empty">👈 왼쪽에서 학생을 선택하세요</div>`;
    return;
  }
  panel.innerHTML = `
    <div class="student-header">
      <h2>${s.name} <small>(${s.hak})</small></h2>
      <div class="tags">
        <span class="tag">${s.grade||'?'}학년 ${s.cls||'?'}반 ${s.num||'?'}번</span>
        <span class="tag">${s.sex||''}</span>
        ${s.g1_hak?`<span class="tag gray">1학년 학번: ${s.g1_hak}</span>`:''}
        ${s.g2_hak?`<span class="tag gray">2학년 학번: ${s.g2_hak}</span>`:''}
      </div>
    </div>
    <div class="tabs">
      ${['기본정보','내신','모의고사','수상','자율','동아리','봉사','진로','독서','세특','행발','출결','지원대학','체크리스트']
        .map((t,i)=>`<button class="tab ${i===2?'active':''}" data-tab="${t}">${t}</button>`).join('')}
    </div>
    <div id="tabContent" class="tab-content"></div>
  `;
  panel.querySelectorAll('.tab').forEach(b => {
    b.onclick = () => {
      panel.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      renderTab(b.dataset.tab);
    };
  });
  renderTab('모의고사');
}

// -------- tabs --------
function renderTab(tab){
  const c = $('#tabContent');
  if(!c) return;
  const s = STATE.selected;
  if(tab === '모의고사') return renderMock(c, s);
  c.innerHTML = `<div class="tab-empty">📝 <b>${tab}</b> 데이터는 추후 업데이트 예정입니다.</div>`;
}

// -------- mock --------
function getMockForStudent(s){
  if(!STATE.mock) return [];
  const keys = [s.hak, String(s.hak), Number(s.hak), s.g1_hak, s.g2_hak].filter(Boolean);
  for(const k of keys){
    const v = STATE.mock[k];
    if(v && Array.isArray(v) && v.length) return v;
    if(v && typeof v === 'object'){
      // object-keyed → flatten
      const arr = Object.values(v).flat ? Object.values(v) : [];
      if(arr.length) return arr;
    }
  }
  return [];
}

function renderMock(c, s){
  const rows = getMockForStudent(s);
  c.innerHTML = `
    <div class="score-toggle">
      <button class="stbtn ${STATE.scoreType==='grade'?'active':''}" data-type="grade">등급</button>
      <button class="stbtn ${STATE.scoreType==='percentile'?'active':''}" data-type="percentile">백분위</button>
      <button class="stbtn ${STATE.scoreType==='stdscore'?'active':''}" data-type="stdscore">표준점수</button>
      <button class="stbtn ${STATE.scoreType==='raw'?'active':''}" data-type="raw">원점수</button>
    </div>
    <div class="chart-box">
      <h3>📈 모의고사 추이</h3>
      <canvas id="mockChart"></canvas>
    </div>
    <div class="table-box">
      <h3>회차별 세부 성적</h3>
      <div id="mockTable"></div>
    </div>
  `;
  c.querySelectorAll('.stbtn').forEach(b => {
    b.onclick = () => {
      STATE.scoreType = b.dataset.type;
      renderMock(c, s);
    };
  });

  if(!rows.length){
    $('#mockTable').innerHTML = `<div class="tab-empty">모의고사 기록이 없습니다.</div>`;
    return;
  }

  // sort by round
  rows.sort((a,b) => (ROUND_ORDER[a.시점]||99) - (ROUND_ORDER[b.시점]||99));
  drawMockTable(rows, s);
  drawMockChart(rows);
}

function getVal(row, subj, type){
  const suffixMap = { grade:'등급', percentile:'백분위', stdscore:'표준점수', raw:'원점수' };
  // 영어/한국사: percentile/stdscore 요청이어도 등급 반환
  if((subj==='영어' || subj==='한국사') && (type==='percentile' || type==='stdscore')){
    return { val: row[subj+'등급'], type:'grade' };
  }
  const key = subj + suffixMap[type];
  return { val: row[key], type };
}

function gradeClass(g){
  const n = parseInt(g);
  if(!n) return '';
  if(n===1) return 'g1';
  if(n===2) return 'g2';
  if(n===3) return 'g3';
  if(n===4) return 'g4';
  if(n===5) return 'g5';
  return 'g6';
}

function cellHTML(row, subj){
  const { val, type } = getVal(row, subj, STATE.scoreType);
  if(val === undefined || val === null || val === '') return '<td>-</td>';
  if(type === 'grade'){
    return `<td class="grade-cell ${gradeClass(val)}">${val}</td>`;
  }
  // big number with bg
  const cls = type==='raw'?'raw':(type==='stdscore'?'std':'pct');
  return `<td class="num-cell ${cls}">${val}</td>`;
}

function drawMockTable(rows, s){
  const sel = rows[0] || {};
  const isG3 = (s.grade === 3);
  const el = $('#mockTable');
  if(!el) return;
  el.innerHTML = `
    <table class="mock-table">
      <thead>
        <tr>
          <th>회차</th><th>국어</th><th>수학</th><th>영어</th>
          <th>한국사</th><th>탐구1</th><th>탐구2</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td class="round">${r.시점||''}</td>
            ${cellHTML(r,'국어')}
            ${cellHTML(r,'수학')}${isG3 && r.수학선택?`<small>${r.수학선택}</small>`:''}
            ${cellHTML(r,'영어')}
            ${cellHTML(r,'한국사')}
            ${cellHTML(r,'탐구1')}${isG3 && r.탐구1과목?`<small>${r.탐구1과목}</small>`:''}
            ${cellHTML(r,'탐구2')}${isG3 && r.탐구2과목?`<small>${r.탐구2과목}</small>`:''}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function drawMockChart(rows){
  const ctx = $('#mockChart');
  if(!ctx || !window.Chart) return;
  if(STATE.chart){ STATE.chart.destroy(); STATE.chart = null; }

  const labels = rows.map(r => r.시점 || '');
  const subjs = [
    {name:'국어', color:'#2563eb'},
    {name:'수학', color:'#dc2626'},
    {name:'영어', color:'#16a34a'},
    {name:'한국사', color:'#9333ea'},
    {name:'탐구1', color:'#ea580c'},
    {name:'탐구2', color:'#0891b2'},
  ];
  const type = STATE.scoreType;

  const datasets = subjs.map(({name,color}) => ({
    label: name,
    data: rows.map(r => {
      const {val} = getVal(r, name, type);
      const n = parseFloat(val);
      return isNaN(n) ? null : n;
    }),
    borderColor: color,
    backgroundColor: color + '22',
    borderWidth: 2,
    tension: 0.3,
    spanGaps: true,
  }));

  const reverse = (type === 'grade');
  const yOpts = reverse
    ? { reverse:true, min:0.5, max:9.5, ticks:{stepSize:1}, title:{display:true, text:'등급'} }
    : { beginAtZero:true, title:{display:true, text:
        type==='raw'?'원점수':type==='stdscore'?'표준점수':'백분위'} };

  STATE.chart = new Chart(ctx, {
    type:'line',
    data:{ labels, datasets },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      layout:{ padding:{ top:20, bottom:10 } },
      scales:{ y: yOpts },
      plugins:{ legend:{ position:'bottom' } },
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
