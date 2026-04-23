// osang2026 v2.5 - mock.json 실제 구조 완벽 반영
const STATE = { students: [], mock: {}, current: null, scoreType: 'grade' };

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

const GRADE_COLOR = {
  1:'#1e40af', 2:'#2563eb', 3:'#059669', 4:'#ca8a04',
  5:'#ea580c', 6:'#dc2626', 7:'#b91c1c', 8:'#991b1b', 9:'#7f1d1d'
};

function parseHak(hak){
  const s = String(hak||'').padStart(5,'0');
  return { grade:+s[0]||0, cls:+s.slice(1,3)||0, num:+s.slice(3,5)||0 };
}

function getField(obj, ...names){
  if(!obj) return null;
  for(const n of names){
    if(obj[n]!==undefined && obj[n]!==null && obj[n]!=='') return obj[n];
  }
  return null;
}

async function init(){
  try{
    const [stuRes, mockRes] = await Promise.all([
      fetch('data/students.json'),
      fetch('data/mock.json')
    ]);
    if(!stuRes.ok) throw new Error('students.json 로드 실패');
    if(!mockRes.ok) throw new Error('mock.json 로드 실패');

    const stuData = await stuRes.json();
    STATE.mock = await mockRes.json();

    // students.json 정규화
    let arr;
    if(Array.isArray(stuData)) arr = stuData;
    else arr = Object.entries(stuData).map(([k,v])=>({hak:k, ...v}));

    STATE.students = arr.map(s=>{
      const hak = s.hak || s.학번 || s.id;
      const p = parseHak(hak);
      return {
        hak: String(hak),
        name: getField(s,'name','이름','성명') || '',
        sex: getField(s,'sex','gender','성별') || '',
        grade: getField(s,'grade','학년') || p.grade,
        cls: getField(s,'cls','class','반') || p.cls,
        num: getField(s,'num','number','번호') || p.num,
        g1_hak: getField(s,'g1_hak','1학년학번'),
        g2_hak: getField(s,'g2_hak','2학년학번'),
        raw: s
      };
    });

    STATE.students.sort((a,b)=>String(a.hak).localeCompare(String(b.hak)));

    document.getElementById('total').textContent = `총 ${STATE.students.length}명 로드됨`;
    buildFilters();
    renderList();
  }catch(e){
    console.error(e);
    document.getElementById('list').innerHTML = `<div style="padding:20px;color:#dc2626">❌ ${e.message}</div>`;
  }
}

function buildFilters(){
  const gradeSel = document.getElementById('gradeFilter');
  const clsSel = document.getElementById('classFilter');
  if(!gradeSel || !clsSel) return;

  gradeSel.innerHTML = '<option value="">학년 전체</option><option value="1">1학년</option><option value="2">2학년</option><option value="3">3학년</option>';
  clsSel.innerHTML = '<option value="">반 전체</option>';

  gradeSel.addEventListener('change', ()=>{
    const g = gradeSel.value;
    const classes = new Set();
    STATE.students.forEach(s=>{
      if(!g || String(s.grade)===g) classes.add(s.cls);
    });
    clsSel.innerHTML = '<option value="">반 전체</option>' +
      [...classes].sort((a,b)=>a-b).map(c=>`<option value="${c}">${c}반</option>`).join('');
    renderList();
  });
  clsSel.addEventListener('change', renderList);

  const search = document.getElementById('search');
  if(search) search.addEventListener('input', renderList);
}

function renderList(){
  const g = document.getElementById('gradeFilter')?.value || '';
  const c = document.getElementById('classFilter')?.value || '';
  const q = (document.getElementById('search')?.value || '').toLowerCase().trim();

  const filtered = STATE.students.filter(s=>{
    if(g && String(s.grade)!==g) return false;
    if(c && String(s.cls)!==c) return false;
    if(q && !s.name.toLowerCase().includes(q) && !String(s.hak).includes(q)) return false;
    return true;
  });

  const listEl = document.getElementById('list');
  document.getElementById('count').textContent = `${filtered.length}명`;

  listEl.innerHTML = filtered.map(s=>
    `<div class="stu-row" data-hak="${s.hak}">
      <span class="stu-num">${String(s.cls).padStart(2,'0')}${String(s.num).padStart(2,'0')}</span>
      <span class="stu-name">${s.name}</span>
      <span class="stu-sex">${s.sex}</span>
    </div>`
  ).join('');

  listEl.querySelectorAll('.stu-row').forEach(el=>{
    el.addEventListener('click', ()=>selectStudent(el.dataset.hak));
  });
}

function selectStudent(hak){
  const s = STATE.students.find(x=>String(x.hak)===String(hak));
  if(!s) return;
  STATE.current = s;
  document.querySelectorAll('.stu-row').forEach(el=>{
    el.classList.toggle('active', el.dataset.hak===hak);
  });
  renderDetail();
}

function renderDetail(){
  const s = STATE.current;
  if(!s) return;

  const detail = document.getElementById('detail');
  detail.innerHTML = `
    <div class="detail-header">
      <h2>${s.name} <span class="hak">(${s.hak})</span></h2>
      <div class="badges">
        <span class="badge blue">${s.grade}학년 ${s.cls}반 ${s.num}번</span>
        <span class="badge gray">${s.sex}</span>
        ${s.g1_hak?`<span class="badge light">1학년 학번: ${s.g1_hak}</span>`:''}
        ${s.g2_hak?`<span class="badge light">2학년 학번: ${s.g2_hak}</span>`:''}
      </div>
    </div>
    <div class="tabs">
      <button class="tab active" data-tab="info">기본정보</button>
      <button class="tab" data-tab="naesin">내신</button>
      <button class="tab" data-tab="mock">모의고사</button>
      <button class="tab" data-tab="sewtuk">세특</button>
      <button class="tab" data-tab="haengbal">행발</button>
      <button class="tab" data-tab="autonomy">자율</button>
      <button class="tab" data-tab="club">동아리</button>
      <button class="tab" data-tab="volunteer">봉사</button>
      <button class="tab" data-tab="career">진로</button>
      <button class="tab" data-tab="reading">독서</button>
      <button class="tab" data-tab="award">수상</button>
      <button class="tab" data-tab="univ">지원대학</button>
      <button class="tab" data-tab="check">체크리스트</button>
      <button class="tab" data-tab="attend">출결</button>
    </div>
    <div id="tabBody" class="tab-body"></div>
  `;

  detail.querySelectorAll('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      detail.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      renderTab(btn.dataset.tab);
    });
  });
  renderTab('info');
}

function renderTab(tab){
  const body = document.getElementById('tabBody');
  if(!body) return;
  try{
    if(tab==='mock') renderMock(body);
    else if(tab==='info') body.innerHTML = `<div class="info-box">학생 기본정보 영역입니다.<br>학번: ${STATE.current.hak}<br>이름: ${STATE.current.name}<br>학년/반/번호: ${STATE.current.grade}학년 ${STATE.current.cls}반 ${STATE.current.num}번</div>`;
    else body.innerHTML = `<div class="info-box">🚧 [${tab}] 영역은 준비 중입니다.</div>`;
  }catch(e){
    body.innerHTML = `<div style="color:#dc2626;padding:20px">탭 렌더 오류: ${e.message}</div>`;
    console.error(e);
  }
}

function getMockRecords(student){
  // 현재 학번으로 조회 (mock.json은 현재학번이 키)
  const keys = [student.hak, String(student.hak), Number(student.hak)];
  for(const k of keys){
    const v = STATE.mock[k];
    if(Array.isArray(v) && v.length) return v;
  }
  return [];
}

function renderMock(body){
  const records = getMockRecords(STATE.current);

  body.innerHTML = `
    <div class="score-toggle">
      <button data-st="grade" class="${STATE.scoreType==='grade'?'active':''}">등급</button>
      <button data-st="percentile" class="${STATE.scoreType==='percentile'?'active':''}">백분위</button>
      <button data-st="standard" class="${STATE.scoreType==='standard'?'active':''}">표준점수</button>
      <button data-st="raw" class="${STATE.scoreType==='raw'?'active':''}">원점수</button>
    </div>

    ${records.length===0 ? `
      <div class="info-box" style="color:#dc2626">
        📊 모의고사 데이터가 없습니다.<br>
        <small>조회한 키: ${STATE.current.hak}</small>
      </div>
    ` : `
      <div class="chart-wrap">
        <h3>📈 등급 추이</h3>
        <canvas id="mockChart" height="220"></canvas>
      </div>

      <div class="table-wrap">
        <h3>회차별 세부 성적</h3>
        <table class="mock-table">
          <thead><tr><th>회차</th><th>국어</th><th>수학</th><th>영어</th><th>한국사</th><th>탐구1</th><th>탐구2</th></tr></thead>
          <tbody>${renderMockRows(records)}</tbody>
        </table>
      </div>
    `}
  `;

  body.querySelectorAll('.score-toggle button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      STATE.scoreType = btn.dataset.st;
      renderMock(body);
    });
  });

  if(records.length) drawChart(records);
}

function sortRecords(records){
  return [...records].sort((a,b)=>{
    const oa = ROUND_ORDER[a.round] || 99;
    const ob = ROUND_ORDER[b.round] || 99;
    return oa-ob;
  });
}

function getScoreValue(subjObj, type){
  if(!subjObj) return null;
  if(type==='grade') return subjObj.등급 ?? null;
  if(type==='percentile') return subjObj.백분위 ?? null;
  if(type==='standard') return subjObj.표준점수 ?? null;
  if(type==='raw') return subjObj.원점수 ?? null;
  return null;
}

function renderCell(subjObj, type, gradeAt, subjName){
  if(!subjObj) return '<td>-</td>';

  const grade = subjObj.등급;
  const val = getScoreValue(subjObj, type);
  const choice = subjObj.선택;

  // 영어/한국사는 절대평가 → 등급만 있음. 백분위/표준/원점수 모드에서도 등급으로 표시
  const isAbs = (subjName==='영어' || subjName==='한국사');
  const useType = isAbs ? 'grade' : type;
  const showVal = isAbs ? grade : val;

  if(showVal===null || showVal===undefined) return '<td>-</td>';

  // 선택과목 라벨 (3학년만)
  const showChoice = (gradeAt===3 && choice && (subjName==='수학' || subjName==='탐구1' || subjName==='탐구2'));
  const choiceLabel = showChoice ? `<div class="choice-label">${choice}</div>` : '';

  if(useType==='grade'){
    const color = GRADE_COLOR[grade] || '#555';
    return `<td><span class="grade-text" style="color:${color};font-weight:700">${grade}등급</span>${choiceLabel}</td>`;
  }else{
    const bgClass = useType==='raw'?'bg-raw':useType==='standard'?'bg-std':'bg-pct';
    return `<td><span class="score-big ${bgClass}">${showVal}</span>${choiceLabel}</td>`;
  }
}

function renderMockRows(records){
  const sorted = sortRecords(records);
  return sorted.map(r=>{
    const label = ROUND_LABEL[r.round] || r.round;
    return `<tr>
      <td class="round-cell">${label}</td>
      ${renderCell(r.국어, STATE.scoreType, r.grade_at, '국어')}
      ${renderCell(r.수학, STATE.scoreType, r.grade_at, '수학')}
      ${renderCell(r.영어, STATE.scoreType, r.grade_at, '영어')}
      ${renderCell(r.한국사, STATE.scoreType, r.grade_at, '한국사')}
      ${renderCell(r.탐구1, STATE.scoreType, r.grade_at, '탐구1')}
      ${renderCell(r.탐구2, STATE.scoreType, r.grade_at, '탐구2')}
    </tr>`;
  }).join('');
}

function drawChart(records){
  const canvas = document.getElementById('mockChart');
  if(!canvas || !window.Chart) return;

  const sorted = sortRecords(records);
  const labels = sorted.map(r=>ROUND_LABEL[r.round]||r.round);

  const subjects = [
    {name:'국어', color:'#3b82f6'},
    {name:'수학', color:'#ef4444'},
    {name:'영어', color:'#10b981'},
    {name:'한국사', color:'#a855f7'},
    {name:'탐구1', color:'#f97316'},
    {name:'탐구2', color:'#06b6d4'}
  ];

  const datasets = subjects.map(sub=>({
    label: sub.name,
    data: sorted.map(r=>{
      const o = r[sub.name];
      return o ? (o.등급 ?? null) : null;
    }),
    borderColor: sub.color,
    backgroundColor: sub.color,
    tension: 0.25,
    spanGaps: true,
    pointRadius: 4
  }));

  if(window._mockChart) window._mockChart.destroy();
  window._mockChart = new Chart(canvas, {
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
          ticks: { stepSize: 1, callback: v=>v },
          title: { display: true, text: '등급' }
        }
      },
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
