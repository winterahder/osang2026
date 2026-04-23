// osang2026 app.js v2.6.4
// - v2.6.1 전체 기능 + Y축 정수 눈금 (afterBuildTicks)

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

const LABELS = {
  hak: '학번', grade: '학년', class: '반', no: '번호',
  name: '이름', gender: '성별',
  g1_hak: '1학년 학번', g2_hak: '2학년 학번', g3_hak: '3학년 학번',
  birth: '생년월일', phone: '연락처', address: '주소',
  parent: '보호자', parent_phone: '보호자 연락처'
};
const LABEL_ORDER = ['hak','grade','class','no','name','gender','g1_hak','g2_hak','g3_hak',
  'birth','phone','address','parent','parent_phone'];

const ROUND_ORDER = {
  'g1_3월':1,'g1_6월':2,'g1_9월':3,'g1_11월':4,
  'g2_3월':5,'g2_6월':6,'g2_9월':7,'g2_11월':8,
  'g3_3월':9,'g3_6월':10,'g3_9월':11,'g3_11월':12,
};
const ROUND_LABEL = {
  'g1_3월':'1학년 3월','g1_6월':'1학년 6월','g1_9월':'1학년 9월','g1_11월':'1학년 11월',
  'g2_3월':'2학년 3월','g2_6월':'2학년 6월','g2_9월':'2학년 9월','g2_11월':'2학년 11월',
  'g3_3월':'3학년 3월','g3_6월':'3학년 6월','g3_9월':'3학년 9월','g3_11월':'3학년 11월',
};

const SUBJECTS = ['국어','수학','영어','한국사','탐구1','탐구2'];
const SUBJECT_COLORS = {
  '국어':'#3b82f6','수학':'#ef4444','영어':'#10b981',
  '한국사':'#8b5cf6','탐구1':'#f59e0b','탐구2':'#06b6d4'
};

function parseHak(hak){
  const s = String(hak||'').padStart(5,'0');
  return { grade:+s[0]||0, cls:+s.slice(1,3)||0, num:+s.slice(3,5)||0 };
}

function getField(obj, ...keys){
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  return null;
}

async function loadData(){
  try {
    const [sRes, mRes] = await Promise.all([
      fetch('data/students.json'),
      fetch('data/mock.json')
    ]);
    if (!sRes.ok) throw new Error('students.json 로드 실패');
    if (!mRes.ok) throw new Error('mock.json 로드 실패');
    const sData = await sRes.json();
    const mData = await mRes.json();

    let arr = [];
    if (Array.isArray(sData)) arr = sData;
    else arr = Object.entries(sData).map(([k,v]) => ({ hak:k, ...v }));

    STATE.students = arr.map(s => {
      const hak = getField(s, 'hak', '학번') || '';
      const p = parseHak(hak);
      return {
        ...s,
        hak: String(hak),
        grade: getField(s, 'grade', '학년') || p.grade,
        class: getField(s, 'class', '반') || p.cls,
        no: getField(s, 'no', '번호') || p.num,
        name: getField(s, 'name', '이름', '성명') || '',
        gender: getField(s, 'gender', 'sex', '성별') || '',
      };
    });
    STATE.students.sort((a,b) => String(a.hak).localeCompare(String(b.hak)));
    STATE.mock = mData;

    setText('statusBar', `총 ${STATE.students.length}명 로드됨`);
    buildFilters();
    renderList();
  } catch (err) {
    setText('statusBar', '오류: ' + err.message);
    console.error(err);
  }
}

function buildFilters(){
  const gradeSel = $('gradeFilter');
  const classSel = $('classFilter');
  if (!gradeSel || !classSel) return;

  const grades = [...new Set(STATE.students.map(s => s.grade))].filter(Boolean).sort();
  gradeSel.innerHTML = '<option value="">전체 학년</option>' +
    grades.map(g => `<option value="${g}">${g}학년</option>`).join('');

  const updateClasses = () => {
    const g = gradeSel.value;
    if (!g) { classSel.innerHTML = '<option value="">전체 반</option>'; return; }
    const classes = [...new Set(STATE.students.filter(s => String(s.grade)===g).map(s => s.class))]
      .filter(Boolean).sort((a,b)=>a-b);
    classSel.innerHTML = '<option value="">전체 반</option>' +
      classes.map(c => `<option value="${c}">${c}반</option>`).join('');
  };

  gradeSel.onchange = () => { updateClasses(); renderList(); };
  classSel.onchange = renderList;
  const searchEl = $('search');
  if (searchEl) searchEl.oninput = renderList;
}

function renderList(){
  const list = $('studentList');
  if (!list) return;
  const g = $('gradeFilter')?.value || '';
  const c = $('classFilter')?.value || '';
  const q = ($('search')?.value || '').trim().toLowerCase();

  const filtered = STATE.students.filter(s => {
    if (g && String(s.grade) !== g) return false;
    if (c && String(s.class) !== c) return false;
    if (q && !(String(s.name).toLowerCase().includes(q) || String(s.hak).includes(q))) return false;
    return true;
  });

  setText('listCount', `${filtered.length}명`);
  list.innerHTML = filtered.map(s => {
    const p = parseHak(s.hak);
    const cn = `${String(p.cls).padStart(2,'0')}${String(p.num).padStart(2,'0')}`;
    return `<li data-hak="${s.hak}">
      <span class="cn">${cn}</span>
      <span class="nm">${s.name}</span>
      <span class="gd">${s.gender||''}</span>
    </li>`;
  }).join('');

  list.querySelectorAll('li').forEach(li => {
    li.onclick = () => selectStudent(li.dataset.hak);
  });
}

function selectStudent(hak){
  const s = STATE.students.find(x => String(x.hak) === String(hak));
  if (!s) return;
  STATE.selected = s;

  document.querySelectorAll('#studentList li').forEach(li => {
    li.classList.toggle('active', li.dataset.hak === String(hak));
  });

  renderHeader();
  renderTabs();
  showTab('basic');
}

function renderHeader(){
  const s = STATE.selected;
  if (!s) return;
  const p = parseHak(s.hak);
  const genderClass = s.gender === '남' ? 'male' : (s.gender === '여' ? 'female' : '');

  setHTML('studentHeader', `
    <div class="s-name">${s.name} <span class="s-hak">(${s.hak})</span></div>
    <div class="s-badges">
      <span class="badge primary">${p.grade}학년 ${p.cls}반 ${p.num}번</span>
      ${s.gender ? `<span class="badge ${genderClass}">${s.gender}</span>` : ''}
      ${s.g1_hak ? `<span class="badge">1학년 학번: ${s.g1_hak}</span>` : ''}
      ${s.g2_hak ? `<span class="badge">2학년 학번: ${s.g2_hak}</span>` : ''}
    </div>
  `);
}

function renderTabs(){
  const tabs = [
    ['basic','기본정보'],['mock','모의고사'],['naesin','내신'],
    ['sewtuk','세특'],['haengbal','행발'],['award','수상'],['reading','독서']
  ];
  setHTML('tabBar', tabs.map(([k,l]) =>
    `<button class="tab" data-tab="${k}">${l}</button>`
  ).join(''));
  document.querySelectorAll('#tabBar .tab').forEach(btn => {
    btn.onclick = () => showTab(btn.dataset.tab);
  });
}

function showTab(key){
  document.querySelectorAll('#tabBar .tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === key);
  });
  const panel = $('tabPanel');
  if (!panel) return;
  try {
    if (key === 'basic') renderBasic(panel);
    else if (key === 'mock') renderMock(panel);
    else panel.innerHTML = `<div class="empty">해당 탭은 준비 중입니다.</div>`;
  } catch (err) {
    panel.innerHTML = `<div class="error">탭 로드 오류: ${err.message}</div>`;
    console.error(err);
  }
}

function renderBasic(panel){
  const s = STATE.selected;
  const rows = [];
  const seen = new Set();
  for (const k of LABEL_ORDER){
    if (s[k] !== undefined && s[k] !== null && s[k] !== '') {
      rows.push([LABELS[k]||k, s[k]]);
      seen.add(k);
    }
  }
  for (const [k,v] of Object.entries(s)){
    if (seen.has(k)) continue;
    if (v === null || v === undefined || v === '') continue;
    if (typeof v === 'object') continue;
    rows.push([LABELS[k]||k, v]);
  }
  panel.innerHTML = `
    <table class="info-table">
      ${rows.map(([k,v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}
    </table>`;
}

function getMockRecords(s){
  const keys = [s.hak, String(s.hak), Number(s.hak), s.g1_hak, s.g2_hak, s.g3_hak];
  for (const k of keys){
    if (k === undefined || k === null || k === '') continue;
    const v = STATE.mock[k] ?? STATE.mock[String(k)] ?? STATE.mock[Number(k)];
    if (v && Array.isArray(v) && v.length) return v;
  }
  return [];
}

function renderMock(panel){
  const s = STATE.selected;
  const records = getMockRecords(s);

  const toggleHTML = `
    <div class="score-toggle">
      <button data-mode="grade" class="${STATE.scoreMode==='grade'?'active':''}">등급</button>
      <button data-mode="percentile" class="${STATE.scoreMode==='percentile'?'active':''}">백분위</button>
      <button data-mode="standard" class="${STATE.scoreMode==='standard'?'active':''}">표준점수</button>
      <button data-mode="raw" class="${STATE.scoreMode==='raw'?'active':''}">원점수</button>
    </div>`;

  if (!records.length){
    panel.innerHTML = toggleHTML + `<div class="empty">📊 모의고사 데이터가 없습니다.</div>`;
    bindToggle(panel);
    return;
  }

  const sorted = [...records].sort((a,b)=>(ROUND_ORDER[a.round]||99)-(ROUND_ORDER[b.round]||99));

  panel.innerHTML = `
    ${toggleHTML}
    <div class="chart-wrap">
      <div class="chart-title" id="chartTitle">📈 등급 추이</div>
      <canvas id="mockChart" height="120"></canvas>
    </div>
    <h3 class="section-title">회차별 세부 성적</h3>
    <div class="table-wrap">
      <table class="mock-table">
        <thead><tr><th>회차</th>${SUBJECTS.map(sj=>`<th>${sj}</th>`).join('')}</tr></thead>
        <tbody>
          ${sorted.map(r => `<tr>
            <td class="round">${ROUND_LABEL[r.round]||r.round}</td>
            ${SUBJECTS.map(sj => `<td>${renderCell(r, sj)}</td>`).join('')}
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  bindToggle(panel);
  drawChart(sorted);
}

function bindToggle(panel){
  panel.querySelectorAll('.score-toggle button').forEach(btn => {
    btn.onclick = () => {
      STATE.scoreMode = btn.dataset.mode;
      renderMock(panel);
    };
  });
}

function renderCell(r, subject){
  const d = r[subject];
  if (!d) return '-';
  const mode = STATE.scoreMode;

  // 영어/한국사는 표점/백분위 없음 → 등급으로 대체
  const noStdPct = (subject === '영어' || subject === '한국사');
  let val, cls='';

  if (mode === 'grade'){
    val = d.등급;
    cls = `grade-text g${val}`;
  } else if (mode === 'percentile'){
    if (noStdPct) { val = d.등급; cls = `grade-text g${val}`; }
    else { val = d.백분위; cls = 'score-box percentile'; }
  } else if (mode === 'standard'){
    if (noStdPct) { val = d.등급; cls = `grade-text g${val}`; }
    else { val = d.표준점수; cls = 'score-box standard'; }
  } else {
    val = d.원점수;
    cls = 'score-box raw';
  }
  if (val === null || val === undefined || val === '') return '-';

  // 3학년 선택과목 라벨
  let sel = '';
  if (r.grade_at === 3 && d.선택) sel = `<div class="sel-tag">${d.선택}</div>`;

  return `<span class="${cls}">${val}</span>${sel}`;
}

function drawChart(sorted){
  const canvas = $('mockChart');
  if (!canvas) return;
  if (STATE.chart) { STATE.chart.destroy(); STATE.chart = null; }

  const mode = STATE.scoreMode;
  const titleMap = { grade:'등급 추이', percentile:'백분위 추이', standard:'표준점수 추이', raw:'원점수 추이' };
  setText('chartTitle', '📈 ' + titleMap[mode]);

  const labels = sorted.map(r => ROUND_LABEL[r.round]||r.round);

  const datasets = SUBJECTS.map(sj => {
    const data = sorted.map(r => {
      const d = r[sj];
      if (!d) return null;
      const noStdPct = (sj === '영어' || sj === '한국사');
      if (mode === 'grade') return d.등급 ?? null;
      if (mode === 'percentile') return noStdPct ? (d.등급 ?? null) : (d.백분위 ?? null);
      if (mode === 'standard')   return noStdPct ? (d.등급 ?? null) : (d.표준점수 ?? null);
      return d.원점수 ?? null;
    });
    return {
      label: sj, data,
      borderColor: SUBJECT_COLORS[sj],
      backgroundColor: SUBJECT_COLORS[sj],
      tension: 0.3, spanGaps: true,
      pointRadius: 4, pointHoverRadius: 6
    };
  });

  // 축 설정
  let yOpts;
  if (mode === 'grade'){
    yOpts = {
      min: 0.5, max: 9.5,
      reverse: true,
      title: { display:true, text:'등급', font:{weight:'bold'} },
      afterBuildTicks: (axis) => { axis.ticks = [1,2,3,4,5,6,7,8,9].map(v => ({value:v})); },
      ticks: { stepSize:1, callback: v => Number.isInteger(v) ? v : '' }
    };
  } else if (mode === 'percentile'){
    yOpts = {
      min: 0, max: 100,
      title: { display:true, text:'백분위', font:{weight:'bold'} },
      afterBuildTicks: (axis) => { axis.ticks = [0,10,20,30,40,50,60,70,80,90,100].map(v => ({value:v})); },
      ticks: { stepSize: 10 }
    };
  } else if (mode === 'standard'){
    yOpts = {
      min: 0, max: 200,
      title: { display:true, text:'표준점수', font:{weight:'bold'} },
      afterBuildTicks: (axis) => { axis.ticks = [0,20,40,60,80,100,120,140,160,180,200].map(v => ({value:v})); },
      ticks: { stepSize: 20 }
    };
  } else {
    yOpts = {
      min: 0, max: 100,
      title: { display:true, text:'원점수', font:{weight:'bold'} },
      afterBuildTicks: (axis) => { axis.ticks = [0,10,20,30,40,50,60,70,80,90,100].map(v => ({value:v})); },
      ticks: { stepSize: 10 }
    };
  }

  STATE.chart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: true,
      layout: { padding: { top: 20 } },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { mode:'index', intersect:false }
      },
      scales: { y: yOpts }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
});
