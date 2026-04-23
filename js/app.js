/* 오상고 상담카드 시스템 v2.6.1 */
const $ = (id) => document.getElementById(id);
const setText = (id, t) => { const el = $(id); if (el) el.textContent = t; };
const setHTML = (id, h) => { const el = $(id); if (el) el.innerHTML = h; };

const STATE = {
  students: [],
  mock: {},
  filtered: [],
  current: null,
  scoreMode: 'grade', // grade / percentile / standard / raw
  chart: null
};

const ROUND_ORDER = {
  'g1_3월':1,'g1_6월':2,'g1_9월':3,'g1_11월':4,
  'g2_3월':5,'g2_6월':6,'g2_9월':7,'g2_11월':8,
  'g3_3월':9,'g3_6월':10,'g3_9월':11,'g3_11월':12
};
const roundLabel = (r) => {
  const m = String(r).match(/g(\d)_(\d+월)/);
  return m ? `${m[1]}학년 ${m[2]}` : r;
};

const SUBJECT_COLORS = {
  '국어':'#2563eb','수학':'#dc2626','영어':'#10b981',
  '한국사':'#8b5cf6','탐구1':'#f97316','탐구2':'#0ea5e9'
};

const FIELD_LABELS = {
  hak: '학번', grade: '학년', class: '반', no: '번호',
  name: '이름', gender: '성별',
  g1_hak: '1학년 학번', g2_hak: '2학년 학번', g3_hak: '3학년 학번',
  birth: '생년월일', phone: '연락처', address: '주소',
  parent: '보호자', parent_phone: '보호자 연락처'
};
const FIELD_ORDER = ['hak','grade','class','no','name','gender','g1_hak','g2_hak','g3_hak','birth','phone','address','parent','parent_phone'];

function parseHak(hak){
  const s = String(hak).padStart(5,'0');
  return { grade: +s[0], cls: +s.slice(1,3), num: +s.slice(3,5) };
}

async function loadJSON(path){
  const r = await fetch(path);
  if(!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

async function init(){
  try {
    const [stu, mock] = await Promise.all([
      loadJSON('data/students.json'),
      loadJSON('data/mock.json').catch(()=>({}))
    ]);
    let arr = Array.isArray(stu) ? stu : Object.entries(stu).map(([k,v])=>({hak:k, ...v}));
    arr = arr.map(s => {
      const p = parseHak(s.hak);
      return {
        ...s,
        grade: s.grade ?? p.grade,
        class: s.class ?? p.cls,
        no: s.no ?? p.num
      };
    });
    arr.sort((a,b) => String(a.hak).localeCompare(String(b.hak)));
    STATE.students = arr;
    STATE.mock = mock;
    STATE.filtered = arr;
    setText('statusBar', `총 ${arr.length}명 로드됨`);
    applyFilters();
    bindEvents();
  } catch(e){
    setText('statusBar', '오류: ' + e.message);
    console.error(e);
  }
}

function bindEvents(){
  $('searchBox')?.addEventListener('input', applyFilters);
  $('gradeFilter')?.addEventListener('change', applyFilters);
  $('classFilter')?.addEventListener('change', applyFilters);
}

function applyFilters(){
  const q = ($('searchBox')?.value || '').trim().toLowerCase();
  const g = $('gradeFilter')?.value || '';
  const c = $('classFilter')?.value || '';

  // 반 옵션 동적 갱신
  if (g) {
    const classes = [...new Set(STATE.students.filter(s => String(s.grade)===g).map(s => s.class))].sort((a,b)=>a-b);
    const cf = $('classFilter');
    const prev = cf.value;
    cf.innerHTML = '<option value="">전체 반</option>' + classes.map(cl => `<option value="${cl}">${cl}반</option>`).join('');
    cf.value = classes.includes(+prev) ? prev : '';
  }

  STATE.filtered = STATE.students.filter(s => {
    if (g && String(s.grade) !== g) return false;
    if (c && String(s.class) !== c) return false;
    if (q && !(String(s.name||'').toLowerCase().includes(q) || String(s.hak||'').includes(q))) return false;
    return true;
  });
  renderList();
}

function renderList(){
  const ul = $('studentList');
  if (!ul) return;
  setText('countLabel', `${STATE.filtered.length}명`);
  ul.innerHTML = STATE.filtered.map(s => {
    const sexLabel = s.gender === '남' ? '남' : s.gender === '여' ? '여' : '';
    return `<li data-hak="${s.hak}" class="${STATE.current?.hak===s.hak?'active':''}">
      <span><span class="hak">${s.hak}</span>${s.name||'-'}</span>
      <span class="sex">${sexLabel}</span>
    </li>`;
  }).join('');
  ul.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const hak = li.dataset.hak;
      const s = STATE.students.find(x => String(x.hak) === String(hak));
      if (s) selectStudent(s);
    });
  });
}

function selectStudent(s){
  STATE.current = s;
  document.querySelectorAll('#studentList li').forEach(li => {
    li.classList.toggle('active', li.dataset.hak === String(s.hak));
  });
  renderHeader(s);
  renderTabs();
  showTab('info');
}

function renderHeader(s){
  const sexClass = s.gender === '남' ? 'sex-male' : s.gender === '여' ? 'sex-female' : '';
  const badges = [
    `<span class="badge">${s.grade}학년 ${s.class}반 ${s.no}번</span>`,
    s.gender ? `<span class="badge ${sexClass}">${s.gender}</span>` : '',
    s.g1_hak ? `<span class="badge">1학년 학번: ${s.g1_hak}</span>` : '',
    s.g2_hak ? `<span class="badge">2학년 학번: ${s.g2_hak}</span>` : ''
  ].filter(Boolean).join('');
  setHTML('studentHeader', `<h2>${s.name || '-'} <span style="color:#888;font-size:16px;">(${s.hak})</span></h2><div class="badges">${badges}</div>`);
}

const TABS = [
  {id:'info', label:'기본정보'},
  {id:'mock', label:'모의고사'},
  {id:'naesin', label:'내신'},
  {id:'sewtuk', label:'세특'},
  {id:'haengbal', label:'행발'},
  {id:'award', label:'수상'},
  {id:'reading', label:'독서'}
];

function renderTabs(){
  setHTML('tabBar', TABS.map(t => `<button data-tab="${t.id}">${t.label}</button>`).join(''));
  document.querySelectorAll('#tabBar button').forEach(b => {
    b.addEventListener('click', () => showTab(b.dataset.tab));
  });
}

function showTab(id){
  document.querySelectorAll('#tabBar button').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === id);
  });
  const s = STATE.current;
  if (!s) return;
  try {
    if (id === 'info') renderInfo(s);
    else if (id === 'mock') renderMock(s);
    else setHTML('tabContent', `<div class="empty">📭 ${TABS.find(t=>t.id===id)?.label} 데이터 준비중</div>`);
  } catch(e){
    setHTML('tabContent', `<div class="err-box">오류: ${e.message}</div>`);
    console.error(e);
  }
}

function renderInfo(s){
  const keys = FIELD_ORDER.filter(k => s[k] != null && s[k] !== '');
  const extra = Object.keys(s).filter(k => !FIELD_ORDER.includes(k) && s[k] != null && s[k] !== '');
  const all = [...keys, ...extra];
  const rows = all.map(k => `<tr><th>${FIELD_LABELS[k] || k}</th><td>${s[k]}</td></tr>`).join('');
  setHTML('tabContent', `<table class="info-table"><tbody>${rows}</tbody></table>`);
}

function renderMock(s){
  const keys = [s.hak, String(s.hak), Number(s.hak), s.g1_hak, s.g2_hak, s.g3_hak].filter(Boolean);
  let rec = null;
  for (const k of keys) {
    const v = STATE.mock[k];
    if (v && Array.isArray(v) && v.length) { rec = v; break; }
  }
  if (!rec) {
    setHTML('tabContent', `<div class="err-box">📊 모의고사 데이터가 없습니다.<br>조회 키: ${keys.join(', ')}</div>`);
    return;
  }
  rec = [...rec].sort((a,b) => (ROUND_ORDER[a.round]||99) - (ROUND_ORDER[b.round]||99));

  const html = `
    <div class="score-toggle">
      <button data-mode="grade" class="${STATE.scoreMode==='grade'?'active':''}">등급</button>
      <button data-mode="percentile" class="${STATE.scoreMode==='percentile'?'active':''}">백분위</button>
      <button data-mode="standard" class="${STATE.scoreMode==='standard'?'active':''}">표준점수</button>
      <button data-mode="raw" class="${STATE.scoreMode==='raw'?'active':''}">원점수</button>
    </div>
    <div class="chart-wrap"><canvas id="mockChart"></canvas></div>
    <div class="section-title">📋 회차별 세부 성적</div>
    <table class="mock-table">
      <thead><tr><th>회차</th><th>국어</th><th>수학</th><th>영어</th><th>한국사</th><th>탐구1</th><th>탐구2</th></tr></thead>
      <tbody>${rec.map(r => `<tr>
        <td class="round">${roundLabel(r.round)}</td>
        <td>${cellHTML(r['국어'],'국어',r)}</td>
        <td>${cellHTML(r['수학'],'수학',r)}</td>
        <td>${cellHTML(r['영어'],'영어',r)}</td>
        <td>${cellHTML(r['한국사'],'한국사',r)}</td>
        <td>${cellHTML(r['탐구1'],'탐구1',r)}</td>
        <td>${cellHTML(r['탐구2'],'탐구2',r)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  setHTML('tabContent', html);

  document.querySelectorAll('.score-toggle button').forEach(b => {
    b.addEventListener('click', () => { STATE.scoreMode = b.dataset.mode; renderMock(s); });
  });
  drawChart(rec);
}

function cellHTML(sub, name, r){
  if (!sub || typeof sub !== 'object') return '-';
  const mode = STATE.scoreMode;
  const isEngOrHist = (name === '영어' || name === '한국사');
  const showSelect = r.grade_at === 3 && sub.선택 && (name === '수학' || name === '탐구1' || name === '탐구2');
  const sel = showSelect ? `<div style="font-size:11px;color:#666;">${sub.선택}</div>` : '';

  if (mode === 'grade' || isEngOrHist && mode !== 'raw') {
    const g = sub.등급;
    if (g == null) return '-';
    return `${sel}<span class="grade-${g}">${g}등급</span>`;
  }
  let val;
  if (mode === 'percentile') val = sub.백분위;
  else if (mode === 'standard') val = sub.표준점수;
  else val = sub.원점수;
  if (val == null) return '-';
  return `${sel}<span class="score-cell">${val}</span>`;
}

function drawChart(rec){
  const canvas = $('mockChart');
  if (!canvas) return;
  if (STATE.chart) STATE.chart.destroy();
  const subjects = ['국어','수학','영어','한국사','탐구1','탐구2'];
  const labels = rec.map(r => roundLabel(r.round));
  const datasets = subjects.map(sub => ({
    label: sub,
    data: rec.map(r => r[sub]?.등급 ?? null),
    borderColor: SUBJECT_COLORS[sub],
    backgroundColor: SUBJECT_COLORS[sub],
    tension: 0.3, spanGaps: true
  }));
  STATE.chart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 20 } },
      plugins: { legend: { position: 'bottom' }, title: { display: true, text: '📈 등급 추이', align:'start' } },
      scales: {
        y: {
          reverse: true, min: 0.5, max: 9.5,
          ticks: { stepSize: 1, callback: (v) => Number.isInteger(v) ? v : '' },
          title: { display: true, text: '등급' }
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
