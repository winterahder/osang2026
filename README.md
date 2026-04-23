# 2026학년도 대입 상담카드 (v2.0)

> GitHub Pages 기반 웹 상담카드 시스템
> 🌐 https://winterahder.github.io/osang2026/

## ✨ v2.0 업데이트
- 🎓 **현 1학년 포함** — 1/2/3학년 전원(739명) 표시
- 🗂️ **학년·반 2단계 필터** — 전체 → 학년 선택 → 반 선택
- 📊 **점수 타입 토글** — 등급/백분위/표준점수/원점수 선택 가능
  - 기본값: 등급 (색상 하이라이트)
  - 영어·한국사는 절대평가라 등급만 표시
- 📈 **Chart.js 동적 반영** — 선택한 점수 타입에 따라 차트도 자동 변경

## 📁 구조
```
osang2026/
├── index.html
├── css/styles.css
├── js/app.js
└── data/           ← 모든 데이터 이곳에 저장 (fetch 기반)
    ├── meta.json
    ├── students.json      (학번 매핑 포함 739명)
    ├── mock.json          (모의고사 3,562건)
    ├── grades.json        ← 내신 (추후)
    ├── sewtuk.json        ← 세특 (추후)
    ├── behavior.json      ← 행발 (추후)
    ├── autonomy/career/club/volunteer.json  ← 창체
    ├── award/reading.json ← 참고용
    ├── applications.json  ← 지원대학
    ├── checklist.json     ← 학종 평가
    └── attendance.json    ← 출결
```

## 🚀 배포
```bash
git clone https://github.com/winterahder/osang2026.git
cd osang2026
# 파일 복사
git add .
git commit -m "v2.0 update"
git push
```
Settings → Pages → `main` / root

## 📝 데이터 추가 포맷 (예시)
`data/grades.json`:
```json
{
  "30101": [
    {"학년":1, "학기":1, "과목":"국어", "단위":4, "등급":2, "원점수":88, "표준편차":12},
    ...
  ]
}
```
키는 **현재 학번(hak)** 사용. 학생을 선택하면 해당 탭이 자동 렌더링됩니다.

## 🔐 개인정보
- ❌ 주소, 주민번호, 연락처 제외
- ✅ 이름, 학번, 성별, 성적만 포함
