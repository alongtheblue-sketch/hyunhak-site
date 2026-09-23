export const meta = {
  name: 'hyunhak-critic-r5',
  description: 'hyunhak.com critic 5회차: 팝업 하단바 넘김 결함 수리 + P2 실측 프로브 3종 → design-critic + Codex X1 병렬 → 릴리스 반증 2렌즈',
  phases: [
    { title: 'Probe', detail: '팝업 넘김 전 경로와 초점과 전이, 목록 큰 기본 글꼴과 푸터 77면과 0건 안내, c342aff 대비 A/B 픽셀 회귀' },
    { title: 'Judge', detail: 'design-critic 5회차 9렌즈 + Codex X1 병렬' },
    { title: 'Refute', detail: '릴리스 YES 반증 2렌즈(레이아웃 회귀, 동작과 접근성)' },
  ],
}

// ---- wf_guard 계약 v1.2 (정본 = ~/unjang/_shared/wf_guard/probe/wfg_probe.js 상단 블록) ----
const DONE = (args && args.done) || {}
const STOP_FILE = (args && args.stop_file) || '$HOME/Workspace/hyunhak-site/_design/site_audit_20260923/r5/.wf_stop'
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
const R4 = A + '/r4'
const R5 = A + '/r5'
const TS = (args && args.ts) || 'unknown'

const CTX = `[공통 맥락]
리포 = ${ROOT} (hyunhak.com, 현학적 연구소. 대입 면접 상품을 파는 정적 사이트). HEAD = 507edf1 (critic 4차 P1 팝업 하단바 넘김 수리 + P2), 직전 채점 판 = c342aff(서빙 파일 기준 63c4e2d 와 같다). 빌드 해시 b179f71e262ed94f(메인 세션이 ${TS} 에 2회 동일 확인, 게이트 v2_check·seo_check·link_check·worker_check FAIL 0).
로컬 하네스 가동 중: http://localhost:8092/ = 리포 루트 정적 서버(면 = http://localhost:8092/<면>.html), 모킹 API = http://localhost:8799 (공지 목록, 랭킹 표, 강의 상태는 비어 있을 수 있다. 결함 아님).
Playwright = node ESM 스크립트에서 import { createRequire } from "node:module"; const require = createRequire(import.meta.url); const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core"); chromium.launch({ channel: "chrome", headless: true }).
앞 회차 도구를 재사용한다(읽고 관례를 따른다): ${R4}/probe_tiles.mjs(폭별 괘선, 소수 폭 = --force-device-scale-factor 창 방식), ${R4}/probe_p2set.mjs(팝업 모서리와 전이 캡처, 푸터 링크 빈칸, 가입 「전문」), ${R4}/probe_regress_ab.mjs 와 ${R3}/probe_regress_compare.py(결정론 A/B: route 로 수리 전 파일을 git show 로 바꿔 서빙, studio_390 은 16384px 캡처 한도라 꼬리 캡처로 대체), ${R5}/quick_check.mjs(메인 세션 빠른 점검: 클릭, 탭, Enter, 측면 카드 클릭).
홈(index) 팝업은 세션당 1회라 컨텍스트를 매번 새로 연다. .rv(스크롤 표시) 는 캡처 전 .rv{opacity:1!important;transform:none!important;transition:none!important} 주입. Chrome --virtual-time-budget 금지. 폰 폭 캡처에서 하단 고정 탭 바(nav.fix)와 sticky 헤더가 겹쳐 찍히면 촬영용으로만 visibility:hidden/static 처리. 스크립트 끝에는 browser.close() 5초 상한과 process.exit 를 둔다(4회차 close 무응답 1회).
산출 폴더 = ${R5}/ (재현 스크립트 ${R5}/probe_<이름>.mjs, 스크린샷 ${R5}/shots/, 원자료 ${R5}/<이름>.json). 절대경로. 앞 회차 산출(${R3}/, ${R4}/)은 덮어쓰지 않는다.
금지: 리포 추적 파일(assets/, *.html, _tools/, programs/ 등) 수정, 빌드 실행, git 쓰기. git 은 log, show, diff, status 만.
배경: critic 4차 회신 = ${A}/critic_r4_20260923.md, Codex 4차 = ${R4}/codex_x1_20260923.md, 수리 커밋 = git show 507edf1 (app.js 슬롯 click 이 e.target.closest(".pbar") 면 무시 / 정지 단추 aria-pressed 제거하고 aria-label 「자동 넘김 정지」「자동 넘김 재생」 = 누르면 일어날 동작 / base.css 1열 블록 .tile:nth-child(n+2) 윗선 복원 / 푸터 .ft-legal a{justify-content:center} 를 base.css 한 곳으로 옮기고 v2_shell 인라인 추가분 되돌림(서빙 html 은 87106d8 대비 join.html 한 줄만 다르다) / .tiles .empty border 0 / 활성 .pop border-bottom 0 / .pslot .pop 바탕과 .pfr 명도 transition var(--dur-2), 모션 감소 시 none).
측정값은 스크립트 실행 결과 숫자로 적는다. 추측으로 PASS 를 적지 않는다.`

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
    key: 'popnav',
    prompt: `[프로브 popnav] critic 4차 P1 수리 검증: 홈(index.html) 팝업 무대 넘김. 1440x900 과 390x844(hasTouch, isMobile) 두 폭, 모션 기본과 reduce 두 설정.
1. 넘김 경로 전수(각각 새 컨텍스트): 하단바 → 마우스 클릭, ← 클릭, → 터치 탭(390), 초점 뒤 Enter, 초점 뒤 Space, 키보드 ArrowRight/ArrowLeft(대화상자 안 초점), 1440 측면 카드 클릭(좌우 둘 다), 390 스와이프(touchstart/touchend 합성 dx -60, +60). 경로마다 전후 [data-ppop-cur] 값, MutationObserver 로 한 동작 안 data-on 변화 순서(되돌아감 0 인지), 조작 뒤 document.activeElement 가 새 활성 카드 제목(또는 카드)인지, 초점이 inert 측면 카드 안에 남지 않는지.
2. 연속 조작: → 3회 연속(카드 수 N 에 대해 순환 1→2→…→1), ← 로 역순환. 빠른 연타(50ms 간격 3회) 뒤 cur 값과 레이아웃 일관(활성 1, 측면 N-1, 하단바가 활성 슬롯 안).
3. 정지 단추: 기본 설정 로드 = textContent 「정지」, aria-label 「자동 넘김 정지」, aria-pressed 속성 없음. 클릭 → 「재생」/「자동 넘김 재생」, 9.5초 고정. 다시 클릭 → 「정지」, 8초 안에 넘어감. reduce 로드 = 「재생」/「자동 넘김 재생」, 9.5초 고정. ←/→ 조작 뒤 단추 표기가 실제 상태(멈춤)와 일치하는지. 접근성 트리(page.accessibility.snapshot 또는 CDP Accessibility.getFullAXTree)에서 단추 이름과 pressed 속성 부재.
4. 카드 1장(N=1) 경로: page.route 로 행사 판정(promo.json 등, app.js 의 행사 카드 소스를 읽어 확인)을 만료나 빈 값으로 응답하게 해 의뢰 카드 한 장만 서게 하고, 하단바에 ←/→/정지가 없고 닫기와 오늘 하루 보지 않기만 있는지, 활성 .pop 아래 선과 하단바 접합이 정상인지.
5. 시각: 활성 .pop computed border-bottom-width 0 이고 .pbar border-top 1px 하나만 보이는지(1440 확대 캡처 dsf 3, 접합부 crop), 측면 카드 radius 네 모서리, 넘김 전이 중 캡처(0, 150, 300, 500ms: 바탕 --card↔--mat 과 .pfr 명도가 transform 과 같이 변하는지, 계산값 표로), reduce 에서 전이 0.
6. 닫기, ESC, 딤 클릭, 「오늘 하루 보지 않기」 체크 뒤 닫기 → 새로고침 시 안 뜸(같은 컨텍스트).
스크린샷: ${R5}/shots/popnav_1440.png(→ 한 번 뒤), popnav_390.png(탭 한 번 뒤), popnav_join_x3.png(접합부 dsf 3 crop), popnav_turn_0.png, popnav_turn_150.png, popnav_turn_300.png, popnav_n1_1440.png.
판정 pass = 1~6 전부 기대와 같음.`,
  },
  {
    key: 'layout',
    prompt: `[프로브 layout] 507edf1 의 CSS 수리 검증.
1. 대학 목록 큰 기본 글꼴: Codex 4차 지적 = 브라우저 기본 글꼴 32px 이면 37.5em = 1200px 이라 1150px 에서 1열 블록과 3열 리셋이 겹쳐 3번 타일 윗선이 빠진다. CDP Page.setFontSizes({ fontSizes: { standard: 32 } }) (또는 --force-device-scale-factor 가 아닌 크롬 기본 글꼴 설정 방법, 먼저 matchMedia("(max-width:37.5em)") 가 1150 에서 true 가 되는지로 설정 적용을 확인) 로 폭 1150, 1200, 1250, 1024 에서 열 수, 앞 8 타일 border-top, padding-right. 기본 글꼴 20px 에서 폭 700, 760, 1024. 기대 = 1열 구간이면 첫 타일만 윗선 0, 2번부터 1px, 패딩 0.
2. 보통 글꼴 폭 회귀: 390, 430, 600, 601, 1024, 1100, 1101, 1440 (4회차와 같은 값이어야: 600 이하 1열, 601~1100 2열 간격 40, 1101 이상 3열).
3. 푸터 법적 고지: .ft-legal 이 있는 서빙 면 전수(grep 으로 *.html, programs/*.html, guidebook/*.html, interview/*.html 등 찾기, 적어도 77면)에서 1440 과 390 링크마다 왼쪽 빈칸과 오른쪽 빈칸 차이 ≤ 1px, 높이 ≥ 48. compact 셸 7면(404, cart, checkout, join, login, my, pay_done) 포함. 면 수가 많으면 병렬 컨텍스트로.
4. 검색 0건(「없는대학」) 1440, 1024, 390: p.empty 테두리 0, 폭 = #tiles 폭, 목록 윗선과 아랫선만 보이는지(element 캡처). 결과 복귀(입력 지우기) 뒤 괘선 정상.
5. 가입 약관 행: 4회차 값 유지(같은 줄, .view 48, 중심차 6.5 부근).
스크린샷: ${R5}/shots/tiles_font32_1150.png, tiles_430.png, tiles_1024.png, tiles_empty_1440.png, footer_join_390.png, footer_login_1440.png, footer_index_390.png.
판정 pass = 1~5 전부 기대와 같음.`,
  },
  {
    key: 'regress',
    prompt: `[프로브 regress] 결정론 A/B 픽셀 회귀: 507edf1 이 c342aff(4회차 채점 판) 대비 의도한 곳 밖을 바꾸지 않았는지 본다.
1. ${R4}/probe_regress_ab.mjs 를 ${R5}/probe_regress_ab.mjs 로 복사해 고친다: 수리 전 판 = c342aff, 수리 후 판 = 현재 서빙(507edf1). route 로 바꿔 서빙할 파일 = git diff --name-only c342aff 507edf1 중 _design/ 와 _tools/ 를 뺀 전부(assets/app.js, assets/base.css, 푸터 인라인이 되돌려진 70면). 결정론 조건은 4회차와 같게. 대상 = ${A}/shoot_r2.mjs 의 PAGES 20면 × 1440, 390 = 40쌍 + 홈 팝업 2장 + compact 셸 면 cart, checkout, my, 404 × 1440, 390(추가 8쌍, 모킹 API 상태 그대로).
2. ${R3}/probe_regress_compare.py 로 비교 → ${R5}/regress_ab.json, ${R5}/diff_ab/.
3. 차이 띠마다 분류: (a) 의도 = compact 셸 면(join, login, cart, checkout, my, 404, pay_done)의 푸터 법적 고지 줄 글자 x 이동 / 홈 팝업 활성 카드와 하단바 접합 1px / 검색 0건 상태가 아니면 목록 변화 0 / 70면 푸터는 인라인에서 base.css 로 옮겼을 뿐 렌더 동일이어야 하므로 차이 0 기대 (b) 타이밍 흔들림(같은 판 재촬영으로 확인, 4회차에 알려진 출처: 표본 이미지, 朱 점, programs 라디오 테두리 안티에일리어싱, 영상 프레임) (c) 의도 밖 = 회귀 후보. 띠 crop 을 Read 로 직접 열어 보고 분류한다.
판정 pass = (c) 0건. checks 에 면별 한 줄(이름, 크기 전후, 차이 픽셀, 띠 수, 분류).`,
  },
]

phase('Probe')
const probes = await parallel(PROBES.map((p) => () =>
  wf(`${CTX}\n\n${p.prompt}\n\n반환: probe="${p.key}", pass, checks(항목별 name/pass/evidence, evidence 에는 실측 숫자), shots(만든 스크린샷 절대경로), script(재현 스크립트 절대경로), issues(결함 또는 관찰, 없으면 빈 배열).`,
    { label: `probe:${p.key}`, phase: 'Probe', schema: PROBE_SCHEMA, model: 'opus' })))

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

const SHOTS = `${R5}/shots/ 의 popnav_1440.png, popnav_390.png, popnav_join_x3.png, popnav_turn_0.png, popnav_turn_150.png, popnav_turn_300.png, popnav_n1_1440.png, tiles_font32_1150.png, tiles_430.png, tiles_1024.png, tiles_empty_1440.png, footer_join_390.png, footer_login_1440.png, footer_index_390.png. A/B 전후 = ${R5}/shots/ab_pre, ab_post, 차이 crop = ${R5}/diff_ab/. 4회차 스크린샷 = ${R4}/shots/.`

const CRITIC_PROMPT = `제2 평가자 채점 5회차. hyunhak.com 웹사이트 critic 4차 릴리스 전 P1 1건(팝업 하단바 ←/→ 넘김) 수리와 P2 수리분을 채점하고 릴리스 판정을 내라. 리포 = ${ROOT}.

[용도 식별 G1] 매체 = 반응형 웹사이트(1440 데스크톱, 1024와 768 태블릿, 430과 390 폰). 용도 = 상품 판매 지면(가이드북 31권, 스튜디오, 의뢰)과 안내 지면. 대상 = 학부모와 고3 수험생. 토큰 SSOT = assets/base.css 1~80행(--ink 玄墨, --paper 楮紙, --seal 朱印은 가격과 인장과 폼 오류만, 그림자 대신 괘선, 리터럴 px 금지).

[이전 회차] 4차 회신 = ${A}/critic_r4_20260923.md (대학 목록 37/45 YES, 팝업 무대 34/45 NO L8=3 L9=3, §4 P1 1건, §5 P2). Codex 4차 = ${R4}/codex_x1_20260923.md (RELEASE: NO). 3차 회신 = ${A}/critic_r3_20260923.md.
[이번 수리] git show 507edf1. app.js 슬롯 click 이 하단바 안 클릭 무시(P1), 정지 단추 aria-pressed 제거와 aria-label 「자동 넘김 정지/재생」(Codex 3·4차 P2), 1열 블록 n+2 윗선 복원(Codex 4차 큰 기본 글꼴), 푸터 법적 고지 가운데 정렬을 base.css 한 곳으로(compact 7면 포함), 0건 안내 테두리 0, 활성 카드와 하단바 접합 겹선 제거, 넘김 시 바탕과 명도 전이.
[이번 회차 실측 = 프로브 3종 결과, 수치는 스크립트 실측]
${probeDigest}
[스크린샷] ${SHOTS}

[채점 대상]
1. 팝업 무대 9렌즈 재채점(4차 34/45, L8·L9 결함 수리분 반영. 넘김 전 경로, 초점, 전이, 카드 1장 경로).
2. 홈 대학 목록 9렌즈 재확인(4차 37/45, 큰 기본 글꼴과 0건 안내 수리분 반영).
3. P2 수리 확인(resolved + 근거).
4. 프로브 issues 와 A/B 회귀 후보를 릴리스 차단(P1)인지 다음 회차(P2)인지 판정.
릴리스 기준 = 각 면 총점 31 이상 + 렌즈1 ≥ 4 + 렌즈8 ≥ 3 + 렌즈9 ≥ 3, 그리고 릴리스 전 P1 0건.

[출력] markdown 필드에 700단어 이내, §1 팝업 무대 점수와 판정 / §2 대학 목록 점수와 판정 / §3 수리 확인 표 / §4 릴리스 전 P1(파일:행과 수정안 한 줄, 없으면 「없음」) / §5 P2 / §6 슬롭 16뿌리와 잔상 7축 / §7 토큰 위배. §1 말미에 「Codex X1 병렬 채점 = 같은 워크플로의 별도 Codex 에이전트, 메인 세션이 병합」 한 줄. 산문 은유와 가운뎃점 금지. popup.L 과 tiles.L 은 렌즈 1~9 순서 정수 9개, total 은 그 합, release 는 위 기준 충족 여부. 파일 수정 금지, 점수 없는 평가 금지.`

const CODEX_PROMPT = `[Codex X1 병렬 채점 에이전트] 너는 design-critic 5회차와 병렬로 도는 외부 모델(Codex) 2차 시선을 발주하고 회수한다.
1. Write 로 ${R5}/codex_x1_prompt.md 를 만든다. 내용(한국어): 역할 = hyunhak.com 릴리스 전 외부 검토자(읽기 전용). 대상 = git show 507edf1 (critic 4차 P1 팝업 하단바 ←/→ 넘김 수리 + P2). 배경 = ${A}/critic_r4_20260923.md §4 §5, 너의 4차 회신 = ${R4}/codex_x1_20260923.md (4차에 네가 지적한 팝업 화살표 P1, 토글 단추 의미, 큰 기본 글꼴 경계, compact 7면 푸터, 0건 안내 점선이 어떻게 되었는지 먼저 확인). 이번 실측 프로브 요약(아래 JSON 을 그대로 붙인다). 요구 = (a) 4차 P1 해결 여부와 근거(파일:행) (b) P2 각각 해결 여부 (c) 수리가 만든 새 회귀 후보(.pbar 제외 조건이 측면 카드 클릭이나 스와이프를 막는 경로, aria-label 과 보이는 글자 불일치(WCAG 2.5.3), 전이 추가가 모션 감소 설정과 reduce 미지원 환경에 주는 영향, 푸터 규칙 이동의 특이도) (d) 릴리스 판정. 500단어 이내, 마지막 줄은 정확히 「RELEASE: YES」 또는 「RELEASE: NO」.
프로브 요약 JSON:
${probeDigest}
2. Bash(timeout 600000) 로 한 번 실행한다(첨부 이미지는 존재하는 것만 -i 로 붙인다: ${R5}/shots/popnav_1440.png, popnav_390.png, popnav_join_x3.png, tiles_font32_1150.png, footer_join_390.png):
cd ${ROOT} && env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u CMUX_CODEX_WRAPPER_SHIM -u CMUX_CODEX_WRAPPER_SHIM_ROOT perl -e 'alarm 570; exec @ARGV' -- /opt/homebrew/bin/codex exec -s read-only -C ${ROOT} --skip-git-repo-check -c model_reasoning_effort="high" -i <이미지1> -i <이미지2> ... -o ${R5}/codex_x1_20260923.md < ${R5}/codex_x1_prompt.md > ${R5}/codex_x1.out 2> ${R5}/codex_x1.err
주의: codex 는 반드시 절대경로 /opt/homebrew/bin/codex. 프록시 변수를 빼지 않으면 TLS UnknownIssuer 로 죽는다. stdin 은 프롬프트 파일(인자로 프롬프트를 주지 않는다).
3. 결과 = ${R5}/codex_x1_20260923.md (마지막 메시지만 담긴다). 비었거나 exit 코드가 0 이 아니면 codex_x1.err 앞 20줄로 원인을 reason 에 적고 ok=false. 「usage limit」 이면 재시도하지 않는다. alarm 으로 끊겼으면 ok=false, reason="timeout".
4. 성공이면 파일을 읽어 fixes(id = popnav_p1, pause_semantics, font_boundary, footer_all, empty_border, junction, transition), regressions, release(마지막 줄의 YES 또는 NO) 를 채우고 raw_path 에 파일 경로. Codex 의 판단을 네가 고쳐 쓰지 않는다(그대로 옮긴다).`

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
    prompt: `렌즈 = 레이아웃 회귀. 이번 배포는 라이브 44aea38 대비 커밋 e76030a 부터 507edf1 까지를 한꺼번에 싣는다(git log --oneline 44aea38..507edf1). 서빙 파일 전체 diff(git diff --stat 44aea38 507edf1 -- . 에서 _design, _docs 제외)를 훑어 이번 배포가 라이브 대비 바꾸는 면을 목록으로 만들고, 각 면을 1440 과 390 에서 열어 깨진 곳(가로 넘침, 겹침, 잘림, 빈 영역, 콘솔 오류, 404 자원)을 찾는다. 507edf1 의 CSS(base.css 1열 블록 n+2, 푸터 .ft-legal, .tiles .empty, 활성 .pop border-bottom, .pslot 전이)의 캐스케이드를 읽고 다른 면에서 새는지 grep 으로 전수. 직접 Playwright 로 재현해 숫자를 낸다. 콘솔 오류는 page.on('console') 과 'pageerror' 로 면마다 수집.`,
  },
  {
    key: 'behavior',
    prompt: `렌즈 = 동작과 접근성. (1) 팝업 무대 넘김: .pbar 제외 조건 뒤 측면 카드 클릭, 스와이프, 키보드, 하단바 안 「오늘 하루 보지 않기」 라벨 클릭과 닫기 클릭이 서로 간섭하지 않는지(특히 하단바 안 클릭이 측면 전환을 일으키거나 막지 않는지), 넘긴 직후 초점 위치와 스크린리더 알림(aria-live 여부), 카드 1장. (2) 정지 단추: aria-label 「자동 넘김 정지」 와 보이는 글자 「정지」 의 label-in-name(WCAG 2.5.3), 음성 명령 사용자가 「정지 클릭」 으로 누를 수 있는지. (3) 결제 흐름 스모크: 홈 → 가이드북 상품 → 구매 선택 → cart → checkout 진입까지(모킹 API, 실제 결제 버튼은 누르지 않는다) 콘솔 오류와 막힘 여부. (4) 의뢰 면(request.html) 폼 제출 전 검증 메시지. Playwright 로 재현해 숫자를 낸다. 기존부터 있던 것인지 이번 신규인지 git show c342aff:<파일> 과 비교해 구분한다.`,
  },
]

let skeptics = []
if (criticYes) {
  phase('Refute')
  const verdictDigest = JSON.stringify({ popup: critic.popup, tiles: critic.tiles, fixes: critic.fixes, p2: critic.p2, codex: ok(codex) ? { ok: codex.ok, release: codex.release, regressions: codex.regressions } : null }, null, 1)
  skeptics = await parallel(LENSES.map((l) => () =>
    wf(`${CTX}\n\n[반증 에이전트] design-critic 5회차가 릴리스 YES 를 냈다. 너의 일은 그 YES 를 깨는 것이다. 재현 가능한 증거가 있는 결함만 blockers 에 올린다(추측 금지). 증거를 못 찾으면 blockers 는 빈 배열, verdict_refuted=false. severity = P0(깨짐, 판매 방해) / P1(릴리스 전 고칠 것) / P2(다음 회차). new_regression = 이번 수리 507edf1 가 새로 만든 것이면 true, 이전부터 있던 것이면 false.
critic 판정 요약:
${verdictDigest}
프로브 요약:
${probeDigest}

${l.prompt}
재현 스크립트는 ${R5}/refute_${l.key}.mjs 로 저장. tried 에 시도한 경로를 한 줄씩.`,
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
