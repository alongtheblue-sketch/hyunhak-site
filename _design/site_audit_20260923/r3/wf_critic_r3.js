export const meta = {
  name: 'hyunhak-critic-r3',
  description: 'hyunhak.com critic 3회차: P1 4건 수리분 실측 프로브 5종 → design-critic + Codex X1 병렬 채점 → 릴리스 반증 2렌즈',
  phases: [
    { title: 'Probe', detail: '모션 감소 단추, 대학 목록 폭별 괘선, 가입 약관 행, 가이드북 담기 문구, 40면 픽셀 회귀' },
    { title: 'Judge', detail: 'design-critic 3회차 9렌즈 + Codex X1 병렬' },
    { title: 'Refute', detail: '릴리스 YES 반증 2렌즈(레이아웃 회귀, 동작과 접근성)' },
  ],
}

// ---- wf_guard 계약 v1.2 (정본 = ~/unjang/_shared/wf_guard/probe/wfg_probe.js 상단 블록) ----
const DONE = (args && args.done) || {}
const STOP_FILE = (args && args.stop_file) || '$HOME/Workspace/hyunhak-site/_design/site_audit_20260923/r3/.wf_stop'
function stopTest(p) {
  if (typeof p !== 'string' || /[`'"\\\r\n]/.test(p)) throw new Error(`stop_file 부적합: ${p}`)
  if (p.startsWith('$HOME/')) { const rest = p.slice(5); if (rest.includes('$')) throw new Error(`stop_file 부적합: ${p}`); return `"$HOME"'${rest}'` }
  if (!p.startsWith('/') || p.includes('$')) throw new Error(`stop_file 부적합: ${p}`)
  return `'${p}'`
}
const STOP_TEST = `test -e ${stopTest(STOP_FILE)} && echo STOP || echo GO`
let STOPPED = false
const STOP_NOTE = `\n\n[중단 규약] 첫 명령 전에 Bash 로 \`${STOP_TEST}\` 를 실행한다. STOP 이면 아무 파일도 만들거나 고치지 말고 즉시 필수 필드는 0, false, 빈 문자열, 빈 배열로 채우고 stopped 를 true 로 해 반환한다. 작업 도중에도 게이트를 돌리는 사이에 이 파일이 보이면, 지금까지 고친 것을 게이트로 확인한 뒤 실측값을 적고 stopped 를 true 로 해 반환한다.`
const MAX_INFLIGHT = 16
let inflight = 0
const waiters = []
const REUSED = []
function reuse(label, d) { REUSED.push(label); return (d && typeof d === 'object' && !Array.isArray(d)) ? { ...d, reused: true } : d }
async function wf(prompt, opts, expect) {
  const label = opts.label
  if (Object.prototype.hasOwnProperty.call(DONE, label)) {
    const d = DONE[label]
    const isObj = d !== null && typeof d === 'object' && !Array.isArray(d)
    const okStop = !(isObj && (d.stopped || d.skipped_by_stop))
    const okId = !expect || (isObj && expect.values.map(String).includes(String(d[expect.key])))
    if (d !== null && d !== undefined && okStop && okId) return reuse(label, d)
    log(`done 재사용 거부 ${label}`)
  }
  while (inflight >= MAX_INFLIGHT) await new Promise((res) => waiters.push(res))
  if (STOPPED) {
    const w = waiters.shift()
    if (w) w()
    return { stopped: true, skipped_by_stop: true }
  }
  inflight++
  try {
    const r = await agent(prompt + STOP_NOTE, opts)
    if (r && r.stopped) {
      STOPPED = true
      while (waiters.length) waiters.shift()()
    }
    return r
  } finally {
    inflight--
    const w = waiters.shift()
    if (w) w()
  }
}
const ok = (r) => r !== null && r !== undefined && typeof r === 'object' && !r.stopped && !r.skipped_by_stop
// ---- 계약 끝 ----

const ROOT = '/Users/gregory/Workspace/hyunhak-site'
const A = ROOT + '/_design/site_audit_20260923'
const R3 = A + '/r3'
const TS = (args && args.ts) || 'unknown'

const CTX = `[공통 맥락]
리포 = ${ROOT} (hyunhak.com, 현학적 연구소. 대입 면접 상품을 파는 정적 사이트). HEAD = 87106d8, 빌드 해시 ffccb97a3bb3f9f7(메인 세션이 ${TS} 에 재빌드해 동일 확인, 게이트 v2_check·seo_check·link_check·worker_check FAIL 0).
로컬 하네스 가동 중: http://localhost:8092/ = 리포 루트 정적 서버(면 = http://localhost:8092/<면>.html), 모킹 API = http://localhost:8799 (공지 목록, 랭킹 표, 강의 상태는 비어 있을 수 있다. 결함 아님).
Playwright = node ESM 스크립트에서 import { createRequire } from "node:module"; const require = createRequire(import.meta.url); const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core"); chromium.launch({ channel: "chrome", headless: true }). 기존 캡처 스크립트 예 = ${A}/shoot_r2.mjs (읽고 관례를 따른다).
홈(index) 팝업은 세션당 1회라 컨텍스트를 매번 새로 연다. .rv(스크롤 표시) 는 캡처 전 .rv{opacity:1!important;transform:none!important;transition:none!important} 주입. Chrome --virtual-time-budget 금지(홈 팝업 타이머로 무한 대기).
산출 폴더 = ${R3}/ (재현 스크립트는 ${R3}/probe_<이름>.mjs 로 저장, 스크린샷은 ${R3}/shots/, 측정 원자료는 ${R3}/<이름>.json). 경로는 절대경로.
금지: 리포 추적 파일(assets/, *.html, _tools/, programs/ 등) 수정, 빌드 실행(_tools/build_all.sh), git 쓰기(commit, checkout, stash, reset). git 은 log, show, diff, status 만.
배경 문서: critic 2차 회신 = ${A}/critic_r2_20260923.md (§4 가 이번에 고친 P1 4건), 수리 커밋 = git show 87106d8, 2차 실측 ledger = ${A}/measure_r2_20260923.md, 2차 브리프 = ${A}/critic_r2_brief.md.
측정값은 반드시 스크립트 실행 결과 숫자로 적는다. 추측으로 PASS 를 적지 않는다.`

const CHECK = { type: 'object', properties: { name: { type: 'string' }, pass: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['name', 'pass', 'evidence'] }
const PROBE_SCHEMA = {
  type: 'object',
  properties: {
    probe: { type: 'string' },
    pass: { type: 'boolean' },
    checks: { type: 'array', items: CHECK },
    shots: { type: 'array', items: { type: 'string' } },
    script: { type: 'string' },
    issues: { type: 'array', items: { type: 'string' } },
    stopped: { type: 'boolean' },
  },
  required: ['probe', 'pass', 'checks', 'shots', 'script', 'issues'],
}

const PROBES = [
  {
    key: 'motion',
    prompt: `[프로브 motion] critic 2차 P1-1 수리 검증: assets/app.js 팝업 무대 자동 넘김 정지 단추([data-ppop-pause]). 수리 = 모션 감소(prefers-reduced-motion: reduce) 사용자는 멈춘 채 시작하므로 단추가 처음부터 「재생」 aria-pressed="true" 여야 한다(app.js 480행 부근, setPause 495행).
측정(홈 index.html, 컨텍스트마다 새로, 1440x900 과 390x844 두 폭):
1. reducedMotion:'reduce' 컨텍스트: 로드 뒤 단추 textContent 와 aria-pressed, 현재 칸 표시([data-ppop-cur]) 값. 9.5초 대기 뒤 칸 표시가 그대로인지(자동 넘김 없음). 단추 클릭 → 단추 「정지」 aria-pressed="false" 인지, 그 뒤 9.5초 안에 칸이 넘어가는지.
2. reducedMotion:'no-preference' 컨텍스트: 로드 뒤 「정지」 aria-pressed="false", 9.5초 안에 칸이 넘어가는지(8초 주기). 단추 클릭 → 「재생」 "true", 그 뒤 9.5초 동안 칸 고정.
3. 팝업 카드 수(N)와 단추 존재 여부, 키보드 Tab 으로 단추에 초점이 닿는지(초점 순서에서 몇 번째인지).
4. 스크린샷(팝업이 떠 있는 뷰포트, fullPage 아님): ${R3}/shots/popup_reduce_1440.png, ${R3}/shots/popup_reduce_390.png (둘 다 reduce 컨텍스트, 클릭 전 상태로 「재생」 단추가 보이게).
판정 pass = 1과 2의 모든 항목이 기대와 같음.`,
  },
  {
    key: 'tiles',
    prompt: `[프로브 tiles] critic 2차 P1-2 수리 검증: 홈(index.html) 대학 목록 .tiles > .tile. 수리 = assets/base.css 366~367행(3열 리셋을 min-width:1101px 로, 37.501em~1100px 2열 구간은 nth-child(-n+2) border-top 0 과 nth-child(2n) padding-right 0), 374행(max-width:37.5em 1열), 464행 부근 max-width:1100px 가 2열로 바꾼다. 회귀 증상(2차) = 1024 에서 3번 타일 border-top 0 이라 2행 왼쪽 괘선이 빠지고 화살표가 열 경계에 붙어 「건국대학교 서울 →경기대학교」 글자 충돌.
팝업은 ESC 로 닫고 측정한다. 폭 = 1440, 1280, 1101, 1100, 1024, 900, 768, 601, 600, 390, 360 (높이 900). 추가로 200% 확대 = viewport 720x450 + deviceScaleFactor 2.
폭마다 측정: .tiles 의 grid-template-columns 열 수, 앞 8개 타일의 border-top-width 배열과 padding-right 배열, 각 열의 첫 행 타일이 border-top 0 이고 나머지 행은 괘선이 있는지(= 행 괘선이 열 사이에서 끊기지 않고 연속인지: 같은 행 타일들의 border-top 이 모두 같은지), 타일 안 화살표(또는 마지막 자식 요소)의 오른쪽 끝 x 와 다음 열 타일 글자 시작 x 사이 간격(음수나 0 이면 충돌), .tile .n 텍스트가 넘쳐 잘리는지(scrollWidth > clientWidth 개수, 말줄임은 허용하되 개수 기록).
소수 폭 경계: iframe 트릭으로 검사한다. 빈 페이지에 <iframe src="http://localhost:8092/index.html" style="width:1100.5px;height:900px;border:0"> 을 넣으면 iframe 안 미디어 쿼리가 1100.5px 로 평가된다. 1100.5 와 600.5(37.53em 부근) 두 값에서 같은 측정(iframe 안 document 로 evaluate, 팝업 닫기는 iframe 안에서 ESC 또는 .pdim 제거). 이 두 값에서 결함이 나오면 issues 에 적는다(수리 필요 여부는 메인 세션이 판단).
검색 필터 상태: 홈 대학 목록 검색 입력(.find .search 안 input)에 한 글자(예: "서") 를 넣어 일부 타일이 숨겨질 때 1440 과 1024 에서 보이는 타일들의 첫 행 괘선 중복(목록 윗선 rule-strong 바로 밑에 타일 border-top 이 또 그려짐)이나 빠짐이 있는지 측정하고 기록한다(숨김 방식 hidden 속성, display:none 등도 적는다). 이것은 이번 수리 이전부터 있던 구조일 수 있으니 git show 44aea38:assets/base.css 등과 비교해 신규 회귀인지 기존인지 구분해 적는다.
스크린샷(목록 구역만 element 캡처 또는 clip): ${R3}/shots/tiles_1440.png, tiles_1024.png, tiles_768.png, tiles_720z2.png, tiles_390.png (모두 ${R3}/shots/ 아래).
판정 pass = 정수 폭 전부에서 행 괘선 연속 + 첫 행만 border-top 0 + 행 끝 타일만 padding-right 0 + 화살표와 다음 열 글자 간격 > 0.`,
  },
  {
    key: 'join',
    prompt: `[프로브 join] critic 2차 P1-3 수리 검증: join.html 약관 동의 행(#joinForm .check, 안의 label.check-choice > input[type=checkbox] + span, 옆 「전문」 링크 .view). 회귀(2차) = 390 에서 「전문」 링크가 있는 두 행에서 체크박스가 혼자 한 줄을 차지하고 라벨이 아래로 내려감(base.css:574 .check label{flex-wrap:wrap} 이 안 풀림). 수리 = join.html 59~60행 .check-choice flex-wrap:nowrap + 안 span flex:1;min-width:0.
폭 = 320, 360, 390, 768, 1440 (높이 900). 각 .check 행마다: 체크박스 rect 와 span rect(top, left, height), 같은 줄 여부(체크박스 세로 중심이 span 첫 줄 박스 안, span.left > checkbox.right), .view 링크 크기(가로 세로 ≥ 48), 행 전체 높이, 가로 넘침(document scrollWidth > 폭).
동작: 390 에서 각 행 span 글자 부분을 클릭하면 체크박스 checked 가 토글되는지, .view 클릭은 체크를 토글하지 않는지(다른 곳으로 가는 링크면 navigation 을 막고 checked 만 비교).
「전체 동의」 류 행이 있으면 그것도 같은 측정.
스크린샷(약관 동의 블록 element 또는 clip): ${R3}/shots/join_390.png, ${R3}/shots/join_360.png, ${R3}/shots/join_1440.png.
판정 pass = 전 폭 전 행 같은 줄 + .view ≥48 + 넘침 0 + 클릭 토글 정상.`,
  },
  {
    key: 'books',
    prompt: `[프로브 books] critic 2차 P1-4 수리 검증: programs/guidebook.html #books 절 아래 링크 문구가 「담기」(copy 키 add) 에서 return_buy 로 바뀌었다(템플릿 _tools/program_guidebook_v2.html 92행, 산출 programs/guidebook.html 은 빌드가 템플릿으로 재생성). astra 원 지적 = ${A}/astra/out_D.md 의 P1-5 (「담기」 tlink 가 #buy 로 이동).
검사:
1. 산출 programs/guidebook.html 의 #books 절 링크 문구와 href, 같은 문구의 #close 절 버튼 문구와 일치 여부, href 대상 id="buy" 존재. data-copy 키가 실제 문구로 치환됐는지(산출 HTML 에 __C_ 자리표시자가 남은 면이 있는지 리포 전체 *.html 산출물 grep: node_modules, _design, _docs 제외. 템플릿 _tools/*.html 은 자리표시자가 정상이므로 제외).
2. 템플릿과 산출 일치: 템플릿 92행 변경이 산출에 반영됐는지(git show 87106d8 -- programs/guidebook.html 과 _tools/program_guidebook_v2.html).
3. 다른 상품 면(programs/studio.html 등)에 같은 「담기」→#buy 패턴이 남았는지 grep.
4. 실브라우저(8092) 1440 과 390: #books 링크 클릭 시 #buy 로 스크롤되는지(클릭 전후 scrollY 와 #buy 의 getBoundingClientRect().top), 링크 탭 크기(≥48 높이).
5. critic 2차 P2 에 「shoot_r2 가 lazy 이미지를 안 트리거해 표본 갤러리, 표지, 스튜디오 화면이 빈 틀」 이 있다. 이 프로브에서 lazy 트리거 캡처를 만든다: 페이지를 끝까지 단계 스크롤(예: 400px 씩, 매 단계 150ms 대기) 한 뒤 모든 img 의 complete && naturalWidth>0 을 기다리고(최대 15초) fullPage 캡처. 대상 = programs/guidebook, programs/studio, guidebook/index, studio 면 × 1440, 390. 저장 = ${R3}/shots/lazy_<면 이름에서 / 를 _ 로>_<폭>.png. 면마다 img 총수, 로드 완료 수, 실패 목록(src) 을 기록. 재현 스크립트 = ${R3}/probe_books.mjs (다음 회차 shoot 에 재사용하게 lazy 트리거 함수를 분리해 둔다).
6. #books 절 element 캡처: ${R3}/shots/books_1440.png, ${R3}/shots/books_390.png.
판정 pass = 1~4 전부 기대와 같음(5는 기록용, 이미지 실패는 issues 에).`,
  },
  {
    key: 'regress',
    prompt: `[프로브 regress] 40면 픽셀 회귀: 87106d8 수리가 의도한 곳 밖을 바꾸지 않았는지 본다. 기준 = ${A}/shots_r2/ (2차 촬영, shoot_r2.mjs, 08:39~08:53. 파일마다 mtime 을 기록한다. join_390 은 수리 뒤 재촬영본일 수 있다).
1. ${A}/shoot_r2.mjs 를 ${R3}/shoot_r3.mjs 로 복사하되 OUT 만 ${R3}/shots_all 로 바꾼다(촬영 방식은 한 글자도 바꾸지 않는다. 같은 방식이어야 비교가 성립한다). node 로 all 실행.
2. 같은 이름 PNG 쌍마다 크기(가로x세로)와 차이 픽셀 수: magick compare -metric AE -fuzz 2% a.png b.png ${R3}/diff/<이름>.png (크기가 다르면 compare 가 실패하므로 크기 차이로 기록하고, 공통 영역 crop 비교를 추가로 해 본다). python3 PIL 도 가능.
3. 차이가 있는 쌍마다 원인 분류: (a) 의도한 수리(programs/guidebook 의 #books 링크 문구, join 약관 행, 모션 감소 무관) (b) 타이밍 흔들림(팝업 자동 넘김, 스크롤 표시, 폰트 로딩, 모킹 API 응답 순서) (c) 의도 밖 변화 = 회귀 후보. 차이 영역 bbox 를 구해(magick 의 -trim 또는 PIL getbbox) 그 영역을 두 판에서 crop 해 ${R3}/diff/ 에 나란히 저장하고 직접 눈으로 보고(Read 로 PNG 열람) 분류한다. (b) 로 분류하려면 같은 면을 한 번 더 찍어 차이가 사라지거나 달라지는지로 확인한다.
4. 1440 과 390 에서는 base.css 타일 규칙 결과가 수리 전과 같아야 한다(1101px 이상 3열, 37.5em 이하 1열). index_nopop_1440, index_nopop_390 의 대학 목록 구역 차이는 0 이어야 한다.
판정 pass = (c) 0건. checks 에 면별 한 줄(이름, 크기, 차이 픽셀, 분류).`,
  },
]

phase('Probe')
const probes = await parallel(PROBES.map((p) => () =>
  wf(`${CTX}\n\n${p.prompt}\n\n반환: probe="${p.key}", pass, checks(항목별 name/pass/evidence, evidence 에는 실측 숫자), shots(만든 스크린샷 절대경로), script(재현 스크립트 절대경로), issues(결함 또는 이상, 없으면 빈 배열).`,
    { label: `probe:${p.key}`, phase: 'Probe', schema: PROBE_SCHEMA, model: 'opus' })))

const probeByKey = {}
PROBES.forEach((p, i) => { probeByKey[p.key] = probes[i] })
const probeMissing = PROBES.filter((p, i) => !ok(probes[i])).map((p) => p.key)
if (probeMissing.length) log(`프로브 미완: ${probeMissing.join(', ')}`)
const probeDigest = JSON.stringify(PROBES.map((p, i) => {
  const r = probes[i]
  if (!ok(r)) return { probe: p.key, missing: true }
  return { probe: p.key, pass: r.pass, checks: r.checks, shots: r.shots, issues: r.issues }
}), null, 1)

const LSCORE = {
  type: 'object',
  properties: {
    L: { type: 'array', items: { type: 'integer' } },
    total: { type: 'integer' },
    release: { type: 'boolean' },
    top_defect: { type: 'string' },
  },
  required: ['L', 'total', 'release', 'top_defect'],
}
const FIX = { type: 'object', properties: { id: { type: 'string' }, resolved: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['id', 'resolved', 'evidence'] }
const CRITIC_SCHEMA = {
  type: 'object',
  properties: {
    popup: LSCORE,
    tiles: LSCORE,
    fixes: { type: 'array', items: FIX },
    p1: { type: 'array', items: { type: 'string' } },
    p2: { type: 'array', items: { type: 'string' } },
    slop_afterimage: { type: 'string' },
    token_violations: { type: 'array', items: { type: 'string' } },
    markdown: { type: 'string' },
    stopped: { type: 'boolean' },
  },
  required: ['popup', 'tiles', 'fixes', 'p1', 'p2', 'slop_afterimage', 'token_violations', 'markdown'],
}
const CODEX_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    reason: { type: 'string' },
    fixes: { type: 'array', items: FIX },
    regressions: { type: 'array', items: { type: 'string' } },
    release: { type: 'string' },
    raw_path: { type: 'string' },
    stopped: { type: 'boolean' },
  },
  required: ['ok', 'reason', 'fixes', 'regressions', 'release', 'raw_path'],
}

const SHOTS = `${R3}/shots/ 의 popup_reduce_1440.png, popup_reduce_390.png, tiles_1440.png, tiles_1024.png, tiles_768.png, tiles_720z2.png, tiles_390.png, join_390.png, join_360.png, join_1440.png, books_1440.png, books_390.png, lazy_*.png (표본 갤러리 lazy 트리거 캡처). 40면 재촬영 = ${R3}/shots_all/, 차이 crop = ${R3}/diff/.`

const CRITIC_PROMPT = `제2 평가자 채점 3회차. hyunhak.com 웹사이트 critic 2차 릴리스 전 P1 4건 수리분을 재채점하고 릴리스 판정을 내라. 리포 = ${ROOT}.

[용도 식별 G1] 매체 = 반응형 웹사이트(1440 데스크톱, 1024와 768 태블릿, 390 폰). 용도 = 상품 판매 지면(가이드북 31권, 스튜디오, 의뢰)과 안내 지면. 대상 = 학부모와 고3 수험생. 토큰 SSOT = assets/base.css 1~80행(--ink 玄墨, --paper 楮紙, --seal 朱印은 가격과 인장과 폼 오류만, 그림자 대신 괘선, 리터럴 px 금지).

[이전 회차] 2차 브리프 = ${A}/critic_r2_brief.md, 2차 회신 = ${A}/critic_r2_20260923.md (팝업 무대 35/45 YES 조건부 L9=3, 대학 목록 33/45 NO L4=2 회귀, §4 릴리스 전 P1 4건).
[이번 수리] git show 87106d8 (app.js 모션 감소 시 단추 「재생」 aria-pressed=true / base.css 366~367 타일 리셋을 3열 구간과 2열 구간으로 분리 / join.html 59~60 .check-choice nowrap + span flex:1 / 템플릿 program_guidebook_v2.html #books 링크 「담기」→return_buy).
[이번 회차 실측 = 프로브 5종 결과, 수치는 스크립트 실측]
${probeDigest}
[스크린샷] ${SHOTS} 2차 스크린샷 = ${A}/shots_r2/.

[채점 대상]
1. 팝업 무대 9렌즈 재채점(2차 35/45 에서 L9 결함 수리분 반영).
2. 홈 대학 목록 9렌즈 재채점(2차 33/45 에서 L4 회귀 수리분 반영, 1024 와 768 과 200% 확대 기준).
3. 가입 약관 행, 가이드북 소개 #books 링크 = 수리 확인(resolved + 근거) 만.
4. 프로브 issues 에 오른 것(소수 폭 경계, 검색 필터 상태의 괘선, lazy 이미지, 픽셀 회귀 후보)을 릴리스 차단(P1)인지 다음 회차(P2)인지 판정.
릴리스 기준 = 각 면 총점 31 이상 + 렌즈1 ≥ 4 + 렌즈8 ≥ 3 + 렌즈9 ≥ 3, 그리고 릴리스 전 P1 0건.

[출력] markdown 필드에 700단어 이내, §1 팝업 무대 점수와 판정 / §2 대학 목록 점수와 판정 / §3 수리 확인 표(가입, 가이드북) / §4 릴리스 전 P1(파일:행과 수정안 한 줄, 없으면 「없음」) / §5 P2 / §6 슬롭 16뿌리와 잔상 7축 / §7 토큰 위배. §1 말미에 「Codex X1 병렬 채점 = 같은 워크플로의 별도 Codex 에이전트, 메인 세션이 병합」 한 줄. 산문 은유와 가운뎃점 금지. popup.L 과 tiles.L 은 렌즈 1~9 순서 정수 9개, total 은 그 합, release 는 위 기준 충족 여부. 파일 수정 금지, 점수 없는 평가 금지.`

const CODEX_PROMPT = `[Codex X1 병렬 채점 에이전트] 너는 design-critic 3회차와 병렬로 도는 외부 모델(Codex) 2차 시선을 발주하고 회수한다.
1. Write 로 ${R3}/codex_x1_prompt.md 를 만든다. 내용(한국어): 역할 = hyunhak.com 릴리스 전 외부 검토자(읽기 전용). 대상 = git show 87106d8 의 4건 수리(모션 감소 정지 단추, 대학 목록 2열 구간 괘선 리셋, 가입 약관 행 줄바꿈, 가이드북 #books 링크 문구). 배경 = ${A}/critic_r2_20260923.md §4. 이번 실측 프로브 요약(아래 JSON 을 그대로 붙인다). 요구 = (a) 4건 각각 해결 여부와 근거(파일:행) (b) 수리가 만든 새 회귀 후보(다른 폭, 다른 면, 소수 폭 1100~1101px 틈, 검색 필터로 타일이 숨겨질 때 nth-child 괘선, 토글 단추 라벨과 aria-pressed 동시 변경의 접근성 의미) (c) 릴리스 판정. 500단어 이내, 마지막 줄은 정확히 「RELEASE: YES」 또는 「RELEASE: NO」.
프로브 요약 JSON:
${probeDigest}
2. Bash(timeout 600000) 로 한 번 실행한다(첨부 이미지는 존재하는 것만 -i 로 붙인다: ${R3}/shots/tiles_1024.png, tiles_768.png, popup_reduce_1440.png, join_390.png, books_390.png):
cd ${ROOT} && env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u CMUX_CODEX_WRAPPER_SHIM -u CMUX_CODEX_WRAPPER_SHIM_ROOT perl -e 'alarm 570; exec @ARGV' -- /opt/homebrew/bin/codex exec -s read-only -C ${ROOT} --skip-git-repo-check -c model_reasoning_effort="high" -i <이미지1> -i <이미지2> ... -o ${R3}/codex_x1_20260923.md < ${R3}/codex_x1_prompt.md > ${R3}/codex_x1.out 2> ${R3}/codex_x1.err
주의: codex 는 반드시 절대경로 /opt/homebrew/bin/codex (PATH 의 cmux 심은 다른 인증이라 usage limit 으로 죽는다). 프록시 변수를 빼지 않으면 TLS UnknownIssuer 로 죽는다. stdin 은 프롬프트 파일(인자로 프롬프트를 주지 않는다).
3. 결과 = ${R3}/codex_x1_20260923.md (마지막 메시지만 담긴다). 비었거나 exit 코드가 0 이 아니면 codex_x1.err 앞 20줄로 원인을 reason 에 적고 ok=false. 「usage limit」 이면 재시도하지 않는다. alarm 으로 끊겼으면(exit 142 부근) ok=false, reason="timeout".
4. 성공이면 파일을 읽어 fixes(4건 id = motion, tiles, join, books), regressions, release(마지막 줄의 YES 또는 NO) 를 채우고 raw_path 에 파일 경로. Codex 의 판단을 네가 고쳐 쓰지 않는다(그대로 옮긴다).`

phase('Judge')
const [critic, codex] = await parallel([
  () => wf(CRITIC_PROMPT, { label: 'judge:critic', phase: 'Judge', schema: CRITIC_SCHEMA, model: 'opus', agentType: 'design-critic' }),
  () => wf(CODEX_PROMPT, { label: 'judge:codex', phase: 'Judge', schema: CODEX_SCHEMA, model: 'opus' }),
])

function gate(s) {
  return !!(s && Array.isArray(s.L) && s.L.length === 9 && s.total >= 31 && s.L[0] >= 4 && s.L[7] >= 3 && s.L[8] >= 3 && s.release)
}
const criticOk = ok(critic)
const criticYes = criticOk && gate(critic.popup) && gate(critic.tiles) && critic.p1.length === 0

const SKEPTIC_SCHEMA = {
  type: 'object',
  properties: {
    lens: { type: 'string' },
    blockers: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, severity: { type: 'string' }, evidence: { type: 'string' }, repro: { type: 'string' }, new_regression: { type: 'boolean' } },
        required: ['title', 'severity', 'evidence', 'repro', 'new_regression'],
      },
    },
    tried: { type: 'array', items: { type: 'string' } },
    verdict_refuted: { type: 'boolean' },
    stopped: { type: 'boolean' },
  },
  required: ['lens', 'blockers', 'tried', 'verdict_refuted'],
}
const LENSES = [
  {
    key: 'layout',
    prompt: `렌즈 = 레이아웃 회귀. 87106d8 이 바꾼 CSS(base.css 366~367, join.html 59~60) 의 캐스케이드 전체를 읽고(.tile, .tiles, .check, .check-choice, .check label 를 쓰는 모든 규칙과 모든 면: grep 으로 *.html, _tools/*.html, assets/*.css 전수), 수리가 다른 면이나 다른 폭에서 깨뜨린 것을 찾는다. 직접 Playwright 로 재현해 숫자를 낸다. 최소한 시도할 것: 37.5em 경계(600, 601), 1100~1101 소수 폭(iframe 트릭: 빈 페이지에 width:1100.5px iframe), 200% 확대(720 CSS, dsf 2), 검색 필터로 타일 일부 숨김, 타일 수가 2나 3의 배수가 아닐 때 마지막 행, 가입 면 약관 행에서 긴 문구가 3줄 이상일 때, .check 를 쓰는 다른 면(고객센터, 스쿨, 로그인 등)에 join.html 의 규칙이 새지 않는지.`,
  },
  {
    key: 'behavior',
    prompt: `렌즈 = 동작과 접근성. 팝업 무대 정지 단추(app.js 470~520행 전체와 호출부)를 읽고 모션 감소 설정, 일반 설정, 카드 1장일 때(N<2), 마우스 오버 일시정지(hover), 키보드 초점이 카드 안으로 들어갔을 때(autoFocus), 「오늘 하루 보지 않기」 와 닫기 뒤 재진입, 스와이프, 화살표 키에서 stopped 상태와 단추 표기(textContent, aria-pressed)가 어긋나는 경로를 찾는다. 라벨 문구와 aria-pressed 를 동시에 바꾸는 토글 단추가 스크린리더에 「재생, 눌림」 처럼 읽혀 의미가 뒤집히는지 WAI-ARIA APG 버튼 패턴 기준으로 판단한다(기존부터 있던 설계인지 이번 신규인지 구분). 가이드북 #books 링크와 #close 버튼이 같은 문구로 같은 곳을 가리키는 것이 WCAG 2.4.4 문제인지. Playwright 로 reducedMotion 두 설정을 재현해 숫자를 낸다.`,
  },
]

let skeptics = []
if (criticYes) {
  phase('Refute')
  const verdictDigest = JSON.stringify({ popup: critic.popup, tiles: critic.tiles, fixes: critic.fixes, p2: critic.p2, codex: ok(codex) ? { ok: codex.ok, release: codex.release, regressions: codex.regressions } : null }, null, 1)
  skeptics = await parallel(LENSES.map((l) => () =>
    wf(`${CTX}\n\n[반증 에이전트] design-critic 3회차가 릴리스 YES 를 냈다. 너의 일은 그 YES 를 깨는 것이다. 재현 가능한 증거가 있는 결함만 blockers 에 올린다(추측 금지). 증거를 못 찾으면 blockers 는 빈 배열, verdict_refuted=false. severity = P0(깨짐, 판매 방해) / P1(릴리스 전 고칠 것) / P2(다음 회차). new_regression = 이번 수리 87106d8 이 새로 만든 것이면 true, 이전부터 있던 것이면 false(git show 7b65085:<파일> 또는 44aea38:<파일> 로 비교).
critic 판정 요약:
${verdictDigest}
프로브 요약:
${probeDigest}

${l.prompt}
재현 스크립트는 ${R3}/refute_${l.key}.mjs 로 저장. tried 에 시도한 경로를 한 줄씩.`,
      { label: `refute:${l.key}`, phase: 'Refute', schema: SKEPTIC_SCHEMA, model: 'opus' })))
} else {
  log(`critic 릴리스 NO 또는 미완 → 반증 단계 생략 (criticOk=${criticOk})`)
}

const skepticBlockers = []
LENSES.forEach((l, i) => {
  const s = skeptics[i]
  if (ok(s)) s.blockers.filter((b) => b.severity === 'P0' || b.severity === 'P1').forEach((b) => skepticBlockers.push({ lens: l.key, ...b }))
})
const skepticMissing = criticYes ? LENSES.filter((l, i) => !ok(skeptics[i])).map((l) => l.key) : []

const missing = [...probeMissing.map((k) => `probe:${k}`), ...(criticOk ? [] : ['judge:critic']), ...(ok(codex) ? [] : ['judge:codex']), ...skepticMissing.map((k) => `refute:${k}`)]
return {
  partial: missing.length > 0 || STOPPED,
  stopped: STOPPED,
  missing,
  reused: REUSED,
  gate: { criticYes, popup: criticOk ? gate(critic.popup) : null, tiles: criticOk ? gate(critic.tiles) : null, critic_p1: criticOk ? critic.p1 : null, codex_release: ok(codex) ? codex.release : null, skeptic_blockers: skepticBlockers },
  probes: PROBES.map((p, i) => ok(probes[i]) ? { probe: p.key, pass: probes[i].pass, issues: probes[i].issues, fails: probes[i].checks.filter((c) => !c.pass), shots: probes[i].shots, script: probes[i].script } : { probe: p.key, missing: true }),
  critic: criticOk ? critic : null,
  codex: ok(codex) ? codex : null,
  skeptics: skeptics.map((s, i) => ok(s) ? s : { lens: LENSES[i].key, missing: true }),
}
