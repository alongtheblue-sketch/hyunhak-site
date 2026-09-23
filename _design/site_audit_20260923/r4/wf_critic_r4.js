export const meta = {
  name: 'hyunhak-critic-r4',
  description: 'hyunhak.com critic 4회차: 대학 목록 열 수와 리셋 재구성 + P2 5건 실측 프로브 3종 → design-critic + Codex X1 병렬 → 릴리스 반증 2렌즈',
  phases: [
    { title: 'Probe', detail: '대학 목록 폭 전수와 소수 폭과 확대, P2 5건(측면 카드 모서리, 캡션 간격, 푸터 링크, 가입 전문, 0건 안내), 72면 A/B 픽셀 회귀' },
    { title: 'Judge', detail: 'design-critic 4회차 9렌즈 + Codex X1 병렬' },
    { title: 'Refute', detail: '릴리스 YES 반증 2렌즈(레이아웃 회귀, 동작과 접근성)' },
  ],
}

// ---- wf_guard 계약 v1.2 (정본 = ~/unjang/_shared/wf_guard/probe/wfg_probe.js 상단 블록) ----
const DONE = (args && args.done) || {}
const STOP_FILE = (args && args.stop_file) || '$HOME/Workspace/hyunhak-site/_design/site_audit_20260923/r4/.wf_stop'
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
const TS = (args && args.ts) || 'unknown'

const CTX = `[공통 맥락]
리포 = ${ROOT} (hyunhak.com, 현학적 연구소. 대입 면접 상품을 파는 정적 사이트). HEAD = c342aff (critic 3차 P1 수리 + P2 5건), 직전 채점 판 = 87106d8(서빙 파일 기준 bba74eb 와 같다). 빌드 해시 fc6cd2680c652190(메인 세션이 ${TS} 에 2회 동일 확인, 게이트 v2_check·seo_check·link_check·worker_check FAIL 0).
로컬 하네스 가동 중: http://localhost:8092/ = 리포 루트 정적 서버(면 = http://localhost:8092/<면>.html), 모킹 API = http://localhost:8799 (공지 목록, 랭킹 표, 강의 상태는 비어 있을 수 있다. 결함 아님).
Playwright = node ESM 스크립트에서 import { createRequire } from "node:module"; const require = createRequire(import.meta.url); const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core"); chromium.launch({ channel: "chrome", headless: true }).
3회차 도구를 재사용한다(읽고 관례를 따른다): ${R3}/probe_tiles.mjs(폭별 괘선, 소수 폭 = --force-device-scale-factor 창 방식 200행, iframe 트릭은 Chrome 이 정수로 반올림해 무효), ${R3}/probe_regress_ab.mjs + probe_regress_compare.py + probe_regress_summary.py(결정론 A/B: route 로 수리 전 파일을 git show 로 바꿔 서빙), ${R3}/probe_books.mjs(triggerLazy), ${R3}/probe_join.mjs(scroll-behavior:smooth 때문에 scrollIntoView behavior:'instant' 후 400ms 뒤 좌표), ${R4}/quick_tiles.mjs(메인 세션 빠른 점검).
홈(index) 팝업은 세션당 1회라 컨텍스트를 매번 새로 연다. .rv(스크롤 표시) 는 캡처 전 .rv{opacity:1!important;transform:none!important;transition:none!important} 주입. Chrome --virtual-time-budget 금지. 폰 폭 캡처에서 하단 고정 탭 바(nav.fix)와 sticky 헤더가 겹쳐 찍히면 촬영용으로만 visibility:hidden/static 처리(3회차 unstick 관례).
산출 폴더 = ${R4}/ (재현 스크립트 ${R4}/probe_<이름>.mjs, 스크린샷 ${R4}/shots/, 원자료 ${R4}/<이름>.json). 절대경로. 3회차 산출(${R3}/)은 덮어쓰지 않는다.
금지: 리포 추적 파일(assets/, *.html, _tools/, programs/ 등) 수정, 빌드 실행, git 쓰기. git 은 log, show, diff, status 만.
배경: critic 3차 회신 = ${A}/critic_r3_20260923.md, Codex 3차 = ${R3}/codex_x1_20260923.md, 수리 커밋 = git show c342aff (base.css 대학 목록: 3열 리셋 = @media not all and (max-width:1100px), 2열 = @media (max-width:1100px) 한 블록에 열 수와 리셋, 1열 = @media (max-width:37.5em) 이 뒤에서 2번 타일 윗선 복원. 옛 465/487/506행 .tiles 열 수 삭제. .tiles .empty 전폭. 팝업 측면 카드 border-radius 네 모서리. 캡션 #q2h margin-bottom s3. join.html .view align-self:flex-start. _tools/v2_shell.py 푸터 .ft-legal a justify-content:center → 빌드가 72개 면 인라인 스타일 갱신).
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
    key: 'tiles',
    prompt: `[프로브 tiles] critic 3차 P1 수리 검증: 홈(index.html) 대학 목록 .tiles > .tile. 기대 = 폭 ≤600(37.5em) 1열, 601~1100 2열, 1100 초과(소수 포함) 3열. 각 구간에서 첫 행 타일만 border-top 0, 행 끝 타일만 padding-right 0, 행 괘선 연속(같은 행 타일 border-top 동일), 화살표(.ar)와 다음 열 글자(.n) 간격 > 0, 가로 넘침 0.
1. 정수 폭 전수: 320, 360, 375, 390, 412, 420, 421, 428, 430, 480, 540, 599, 600, 601, 640, 768, 820, 900, 1024, 1100, 1101, 1280, 1440, 1920. 폭마다 열 수, 앞 8 타일 border-top 배열, padding-right 배열, 최소 간격, .n 말줄임 개수, document scrollWidth.
2. 소수 폭(--force-device-scale-factor 창 방식): 창 1100 × 1.125, 1100 × 1.333, 600 × 1.333, 601 × 1.25, 1101 × 1.5. visualViewport.width 와 위 측정.
3. 1440 브라우저 확대 200/250/300% 에 해당하는 CSS 폭 720, 576, 480 (deviceScaleFactor 2, 2.5, 3).
4. 검색 필터: 입력에 "서"(부분 결과), "없는대학"(0건) 을 넣고 1440, 1024, 390 에서 측정. 0건일 때 p.empty 가 행 전폭인지(너비 = .tiles 너비), 부분 결과 첫 행 괘선 중복이나 빠짐.
5. 한 열(≤600)에서 1번 타일 윗선 0, 2번부터 1px 인지(2열 블록 -n+2 리셋을 1열 블록이 2번 타일에서 되돌렸는지).
6. 스크린샷(#find 절 element): ${R4}/shots/tiles_430.png, tiles_600.png, tiles_601.png, tiles_1024.png, tiles_1100frac.png(1100×1.125), tiles_1440.png, tiles_390.png, tiles_empty_1440.png, tiles_filter_1024.png.
판정 pass = 1~5 전부 기대와 같음.`,
  },
  {
    key: 'p2set',
    prompt: `[프로브 p2set] critic 3차와 2차 P2 중 c342aff 가 고친 5건 검증.
1. 팝업 측면 카드 모서리: 홈 1440x900(팝업 카드 2장 이상일 때 측면 슬롯 .pslot[data-side] .pop) computed border-radius 네 모서리 값, 활성 카드(.pslot[data-on] .pop)는 위 두 모서리만 둥글고 아래 0(하단바 .pbar 가 아래에 붙음) 인지, 하단바와 활성 카드 사이 틈이나 모서리 어긋남 없는지. 측면 카드가 활성으로 넘어가는 순간(→ 클릭 후 0ms, 150ms, 400ms) 모서리가 튀는지 캡처 3장. 스크린샷 ${R4}/shots/popup_1440.png, popup_turn_0.png, popup_turn_150.png, popup_turn_400.png, 그리고 390 에서 측면 카드 숨김 상태 ${R4}/shots/popup_390.png.
2. 캡션 간격: 홈 #q2h(「가나다 순입니다.」) 박스 아래와 #tiles 윗선 사이 = 16px(s3) 인지 1440, 1024, 390 에서. 캡션과 검색창 사이 간격도 같이 기록(위아래 리듬). 스크린샷은 tiles 프로브가 찍으므로 생략.
3. 푸터 법적 고지 링크(footer .ft-legal a): 면 index, faq, support, terms, programs/guidebook, join 의 1440 과 390 에서 링크마다 상자 폭, 글자 폭(Range), 왼쪽 빈칸과 오른쪽 빈칸(차이 ≤ 1px 이면 가운데), 높이 ≥ 48, 줄바꿈 뒤 행 정렬. 「결제」 한쪽 빈칸(3차 전 28px)이 양쪽 14px 로 나뉘었는지. join 과 login 은 옛 푸터일 수 있으니 .ft-legal 존재 여부부터 기록. 스크린샷 ${R4}/shots/footer_index_1440.png, footer_index_390.png.
4. 가입 약관 행 「전문」(join.html #joinForm .check .view): 320, 390, 1440 에서 행마다 .view 세로 중심 - span 첫 줄 세로 중심(3차 값: ck-mkt 320 +50, 390 +30.5 / 한 줄 행 +11). 줄 안 정렬이 나아졌는지, 한 줄 행이 나빠지지 않았는지, 체크박스와 글자 같은 줄 유지(3차 P1 수리 회귀 없음), 글자 클릭 토글, .view 48x48. 스크린샷 ${R4}/shots/join_320.png, join_390.png.
5. 검색 0건 안내: tiles 프로브와 겹치므로 여기서는 p.empty 안 링크 탭 크기(≥48 높이)와 글자 줄바꿈만.
판정 pass = 1~5 전부 기대와 같음. 기대와 다르지만 결함이 아닌 관찰은 issues 에 「관찰」 로.`,
  },
  {
    key: 'regress',
    prompt: `[프로브 regress] 결정론 A/B 픽셀 회귀: c342aff 가 의도한 곳 밖을 바꾸지 않았는지 본다.
1. ${R3}/probe_regress_ab.mjs 를 ${R4}/probe_regress_ab.mjs 로 복사해 고친다: 수리 전 판 = 87106d8, 수리 후 판 = 현재 서빙(c342aff). route 가 바꿔 서빙할 파일 = git diff --name-only 87106d8 c342aff 중 _design/ 와 _tools/ 를 뺀 72개 전부(assets/base.css, join.html, 푸터가 바뀐 면들). 결정론 조건(팝업 DOMContentLoaded + networkidle 최대 5초 + 글꼴 + 300ms, 애니메이션 정지, 영상 숨김, lazy eager + decode 대기, .rv 강제 표시)은 3회차와 같게. 대상 면 = ${A}/shoot_r2.mjs 의 PAGES 20면 × 1440, 390 = 40쌍 + 홈 팝업 2장. 출력 = ${R4}/shots/ab_pre, ${R4}/shots/ab_post.
2. ${R3}/probe_regress_compare.py 로 비교(차이 픽셀, 크기, 띠 bbox, 두 판 crop) → ${R4}/regress_ab.json, ${R4}/diff_ab/.
3. 차이 띠마다 분류: (a) 의도(푸터 .ft-legal 링크 가운데 정렬 = 푸터 법적 고지 줄 안에서만 글자 x 이동 / 홈 캡션 간격 16px 로 그 아래 전체가 16px 내려감 / 홈 대학 목록 390 은 1열 그대로라 캡션 이동 외 0 / 가입 면 약관 행 「전문」 위치 / 팝업 측면 카드 아래 모서리) (b) 타이밍 흔들림(같은 판 재촬영으로 확인) (c) 의도 밖 = 회귀 후보. 홈처럼 한 지점 아래 전체가 밀린 면은 밀린 만큼 이동시켜 다시 비교해(예: post 를 16px 위로 crop) 이동 외 차이가 0 인지 본다. 띠 crop 을 Read 로 직접 열어 보고 분류한다.
4. 1024 와 768 홈 대학 목록 계산값 A/B(열 수, 타일 rect, border-top, padding-right): 2열 구간은 수리 전과 같아야 한다(3차에서 601~1100 는 이미 정상). 430 과 600 은 수리 전 2열 → 수리 후 1열로 바뀌는 것이 의도.
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

const SHOTS = `${R4}/shots/ 의 tiles_430.png, tiles_600.png, tiles_601.png, tiles_1024.png, tiles_1100frac.png, tiles_1440.png, tiles_390.png, tiles_empty_1440.png, tiles_filter_1024.png, popup_1440.png, popup_turn_0.png, popup_turn_150.png, popup_turn_400.png, popup_390.png, footer_index_1440.png, footer_index_390.png, join_320.png, join_390.png. A/B 전후 = ${R4}/shots/ab_pre, ab_post, 차이 crop = ${R4}/diff_ab/.`

const CRITIC_PROMPT = `제2 평가자 채점 4회차. hyunhak.com 웹사이트 critic 3차 릴리스 전 P1 1건(대학 목록 421~600px) 수리와 P2 5건 수리분을 채점하고 릴리스 판정을 내라. 리포 = ${ROOT}.

[용도 식별 G1] 매체 = 반응형 웹사이트(1440 데스크톱, 1024와 768 태블릿, 430과 390 폰). 용도 = 상품 판매 지면(가이드북 31권, 스튜디오, 의뢰)과 안내 지면. 대상 = 학부모와 고3 수험생. 토큰 SSOT = assets/base.css 1~80행(--ink 玄墨, --paper 楮紙, --seal 朱印은 가격과 인장과 폼 오류만, 그림자 대신 괘선, 리터럴 px 금지).

[이전 회차] 3차 회신 = ${A}/critic_r3_20260923.md (팝업 36/45 YES, 대학 목록 33/45 NO L4=2, §4 P1 1건, §5 P2). Codex 3차 = ${R3}/codex_x1_20260923.md (RELEASE: NO). 2차 회신 = ${A}/critic_r2_20260923.md.
[이번 수리] git show c342aff. 대학 목록: 3열 = @media not all and (max-width:1100px)(여집합이라 소수 폭 틈 없음), 2열 = @media (max-width:1100px) 한 블록에 열 수 repeat(2,minmax(0,1fr)) 와 리셋, 1열 = @media (max-width:37.5em) 가 뒤에서 2번 타일 윗선 복원. 3차 P1 권고(37.501em~1100 블록)와 경계 방식이 다르다: 1열과 2열의 경계를 min-width 하한 대신 소스 순서로 가른다(600~600.016 틈도 없음). P2 = 측면 카드 네 모서리, 캡션 간격 16, 가입 「전문」 align-self:flex-start, 푸터 법적 고지 가운데 정렬, 0건 안내 전폭, 무대 주석 문구.
[이번 회차 실측 = 프로브 3종 결과, 수치는 스크립트 실측]
${probeDigest}
[스크린샷] ${SHOTS} 3차 스크린샷 = ${R3}/shots/.

[채점 대상]
1. 홈 대학 목록 9렌즈 재채점(3차 33/45, L4=2 의 원인 수리분. 430, 600, 601, 1024, 1440, 소수 폭, 200~300% 확대, 검색 0건과 부분 결과 기준). 1열 전환 폭이 600 이하로 바뀐 것(3차 전 실효 420 이하)이 폰 가로와 작은 태블릿에서 정보 밀도와 스캔성 면에서 맞는지도 판단.
2. 팝업 무대 9렌즈 재확인(3차 36/45, 측면 카드 모서리와 주석 수리분 반영).
3. P2 5건 수리 확인(resolved + 근거).
4. 프로브 issues 와 A/B 회귀 후보를 릴리스 차단(P1)인지 다음 회차(P2)인지 판정.
릴리스 기준 = 각 면 총점 31 이상 + 렌즈1 ≥ 4 + 렌즈8 ≥ 3 + 렌즈9 ≥ 3, 그리고 릴리스 전 P1 0건.

[출력] markdown 필드에 700단어 이내, §1 대학 목록 점수와 판정 / §2 팝업 무대 점수와 판정 / §3 P2 수리 확인 표 / §4 릴리스 전 P1(파일:행과 수정안 한 줄, 없으면 「없음」) / §5 P2 / §6 슬롭 16뿌리와 잔상 7축 / §7 토큰 위배. §1 말미에 「Codex X1 병렬 채점 = 같은 워크플로의 별도 Codex 에이전트, 메인 세션이 병합」 한 줄. 산문 은유와 가운뎃점 금지. popup.L 과 tiles.L 은 렌즈 1~9 순서 정수 9개, total 은 그 합, release 는 위 기준 충족 여부. 파일 수정 금지, 점수 없는 평가 금지.`

const CODEX_PROMPT = `[Codex X1 병렬 채점 에이전트] 너는 design-critic 4회차와 병렬로 도는 외부 모델(Codex) 2차 시선을 발주하고 회수한다.
1. Write 로 ${R4}/codex_x1_prompt.md 를 만든다. 내용(한국어): 역할 = hyunhak.com 릴리스 전 외부 검토자(읽기 전용). 대상 = git show c342aff (critic 3차 P1 대학 목록 열 수와 리셋 재구성, P2 5건). 배경 = ${A}/critic_r3_20260923.md §4 §5, 너의 3차 회신 = ${R3}/codex_x1_20260923.md (3차에 네가 지적한 421~600px 결함, 1100~1101 소수 폭 틈, 토글 단추 라벨과 aria-pressed 의미가 이번에 어떻게 되었는지 먼저 확인). 이번 실측 프로브 요약(아래 JSON 을 그대로 붙인다). 요구 = (a) 3차 P1 해결 여부와 근거(파일:행) (b) P2 5건 각각 해결 여부 (c) 수리가 만든 새 회귀 후보(@media not all and 문법 호환, 1열과 2열 경계를 소스 순서로 가르는 방식의 취약점, 72면 푸터 인라인 스타일 변경, 가입 행 align-self, 측면 카드 모서리 전환 순간) (d) 릴리스 판정. 500단어 이내, 마지막 줄은 정확히 「RELEASE: YES」 또는 「RELEASE: NO」.
프로브 요약 JSON:
${probeDigest}
2. Bash(timeout 600000) 로 한 번 실행한다(첨부 이미지는 존재하는 것만 -i 로 붙인다: ${R4}/shots/tiles_430.png, tiles_600.png, tiles_1024.png, popup_1440.png, footer_index_390.png):
cd ${ROOT} && env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u CMUX_CODEX_WRAPPER_SHIM -u CMUX_CODEX_WRAPPER_SHIM_ROOT perl -e 'alarm 570; exec @ARGV' -- /opt/homebrew/bin/codex exec -s read-only -C ${ROOT} --skip-git-repo-check -c model_reasoning_effort="high" -i <이미지1> -i <이미지2> ... -o ${R4}/codex_x1_20260923.md < ${R4}/codex_x1_prompt.md > ${R4}/codex_x1.out 2> ${R4}/codex_x1.err
주의: codex 는 반드시 절대경로 /opt/homebrew/bin/codex. 프록시 변수를 빼지 않으면 TLS UnknownIssuer 로 죽는다. stdin 은 프롬프트 파일(인자로 프롬프트를 주지 않는다).
3. 결과 = ${R4}/codex_x1_20260923.md (마지막 메시지만 담긴다). 비었거나 exit 코드가 0 이 아니면 codex_x1.err 앞 20줄로 원인을 reason 에 적고 ok=false. 「usage limit」 이면 재시도하지 않는다. alarm 으로 끊겼으면 ok=false, reason="timeout".
4. 성공이면 파일을 읽어 fixes(id = tiles_p1, radius, caption, view, footer, empty), regressions, release(마지막 줄의 YES 또는 NO) 를 채우고 raw_path 에 파일 경로. Codex 의 판단을 네가 고쳐 쓰지 않는다(그대로 옮긴다).`

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
    prompt: `렌즈 = 레이아웃 회귀. 이번 배포는 라이브 44aea38 대비 커밋 e76030a, 67fa33f, c5dff51, c2adf08, 87106d8, bba74eb, c342aff 를 한꺼번에 싣는다. c342aff 가 바꾼 CSS(base.css 대학 목록 블록, 팝업 측면 카드, 캡션, join.html .view, 72면 푸터 인라인 스타일)의 캐스케이드 전체를 읽고(.tile, .tiles, .empty, .pslot, .pop, .help, .ft-legal, .view 를 쓰는 모든 규칙과 모든 면: grep 으로 *.html, _tools/*.html, _tools/*.py, assets/*.css 전수), 수리가 다른 면이나 다른 폭에서 깨뜨린 것을 찾는다. 직접 Playwright 로 재현해 숫자를 낸다. 최소한 시도할 것: @media not all and (max-width:1100px) 가 print 매체에서 어떻게 평가되는지(인쇄 미리보기 emulateMedia print 로 홈 목록), 1열과 2열 경계(600, 601, 소수 600.15), 3열 경계(1100, 1101, 소수 1100.444), 타일 수가 2나 3의 배수가 아닐 때 마지막 행(검색 부분 결과), .ft-legal 가 compact 푸터(body.ft-compact)와 일반 푸터에서 줄바꿈될 때 행 첫 링크 정렬, 가입 면 3줄 이상 약관 행.`,
  },
  {
    key: 'behavior',
    prompt: `렌즈 = 동작과 접근성. (1) 팝업 무대: 측면 카드가 활성으로 넘어갈 때와 활성이 측면으로 빠질 때 모서리와 하단바 이동이 어긋나는 순간(전환 중 캡처), 모션 감소 설정에서 전환, 카드 1장일 때 하단바와 모서리, 390 에서 측면 숨김. (2) 홈 대학 목록 검색: 0건 안내 p.empty 가 aria-live(#q2n) 문구와 일치하는지, 0건에서 결과 복귀 시 괘선. (3) 푸터 가운데 정렬된 링크의 초점 표시(:focus-visible) 윤곽이 글자와 어긋나지 않는지. (4) 가입 약관 행 「전문」 align-self 변경 뒤 초점 순서와 클릭 영역 겹침(체크 토글 영역과 .view 가 겹치지 않는지 elementFromPoint 로 행 전체 격자 스캔). Playwright 로 재현해 숫자를 낸다. 기존부터 있던 것인지 이번 신규인지 git show 87106d8:<파일> 과 비교해 구분한다.`,
  },
]

let skeptics = []
if (criticYes) {
  phase('Refute')
  const verdictDigest = JSON.stringify({ popup: critic.popup, tiles: critic.tiles, fixes: critic.fixes, p2: critic.p2, codex: ok(codex) ? { ok: codex.ok, release: codex.release, regressions: codex.regressions } : null }, null, 1)
  skeptics = await parallel(LENSES.map((l) => () =>
    wf(`${CTX}\n\n[반증 에이전트] design-critic 4회차가 릴리스 YES 를 냈다. 너의 일은 그 YES 를 깨는 것이다. 재현 가능한 증거가 있는 결함만 blockers 에 올린다(추측 금지). 증거를 못 찾으면 blockers 는 빈 배열, verdict_refuted=false. severity = P0(깨짐, 판매 방해) / P1(릴리스 전 고칠 것) / P2(다음 회차). new_regression = 이번 수리 c342aff 가 새로 만든 것이면 true, 이전부터 있던 것이면 false.
critic 판정 요약:
${verdictDigest}
프로브 요약:
${probeDigest}

${l.prompt}
재현 스크립트는 ${R4}/refute_${l.key}.mjs 로 저장. tried 에 시도한 경로를 한 줄씩.`,
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
