export const meta = {
  name: 'hyunhak-critic-r6',
  description: 'hyunhak.com critic 6회차: 팝업 하단바 무대 고정 + 첫 초점 수리 실측 프로브 3종 → design-critic + Codex X1 병렬 → 릴리스 반증 2렌즈',
  phases: [
    { title: 'Probe', detail: '팝업 넘김 전 경로와 연타 스윕과 정지 위치, 짧은 화면과 초점 모델, 라이브 94f577b 대비 A/B 픽셀 회귀' },
    { title: 'Judge', detail: 'design-critic 6회차 9렌즈 + Codex X1 병렬' },
    { title: 'Refute', detail: '릴리스 YES 반증 2렌즈(레이아웃 회귀, 동작과 접근성)' },
  ],
}

// ---- wf_guard 계약 v1.2 (정본 = ~/unjang/_shared/wf_guard/probe/wfg_probe.js 상단 블록) ----
const DONE = (args && args.done) || {}
const STOP_FILE = (args && args.stop_file) || '$HOME/Workspace/hyunhak-site/_design/site_audit_20260923/r6/.wf_stop'
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
const R6 = A + '/r6'
const TS = (args && args.ts) || 'unknown'

const CTX = `[공통 맥락]
리포 = ${ROOT} (hyunhak.com, 현학적 연구소. 대입 면접 상품을 파는 정적 사이트). HEAD = 3d2ada3 (팝업 하단바 무대 둘째 행 고정 + 두 장 이상일 때 첫 초점 = 대화상자 틀). 라이브 = 94f577b(배포 2차, 5회차 채점 판 507edf1 + 터치 재개 수리). 3d2ada3 이 94f577b 대비 바꾼 서빙 파일 = assets/app.js, assets/base.css 둘뿐.
로컬 하네스 가동 중: http://localhost:8092/ = 리포 루트 정적 서버(면 = http://localhost:8092/<면>.html), 모킹 API = http://localhost:8799 (공지 목록, 랭킹 표, 강의 상태는 비어 있을 수 있다. 결함 아님).
Playwright = node ESM 스크립트에서 import { createRequire } from "node:module"; const require = createRequire(import.meta.url); const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core"); chromium.launch({ channel: "chrome", headless: true }).
앞 회차 도구를 재사용한다(읽고 관례를 따른다): ${R5}/probe_popnav.mjs(팝업 넘김 전 경로, seq, sweep, restpos, pause, n1, visual, close 구획. 공지 1건을 route 로 더한 N=3 확장 포함), ${R5}/probe_regress_ab.mjs 와 ${R3}/probe_regress_compare.py(결정론 A/B), ${R6}/quick_check.mjs(메인 세션 빠른 점검: → 위치, 3연타, 터치 재개, 첫 초점).
홈(index) 팝업은 세션당 1회라 컨텍스트를 매번 새로 연다. .rv(스크롤 표시) 는 캡처 전 .rv{opacity:1!important;transform:none!important;transition:none!important} 주입. Chrome --virtual-time-budget 금지. 스크립트 끝에는 browser.close() 5초 상한과 process.exit 를 둔다.
산출 폴더 = ${R6}/ (재현 스크립트 ${R6}/probe_<이름>.mjs, 스크린샷 ${R6}/shots/, 원자료 ${R6}/<이름>.json). 절대경로. 앞 회차 산출(${R3}/, ${R4}/, ${R5}/)은 덮어쓰지 않는다.
금지: 리포 추적 파일(assets/, *.html, _tools/, programs/ 등) 수정, 빌드 실행, git 쓰기. git 은 log, show, diff, status 만.
배경: critic 5차 회신 = ${A}/critic_r5_20260923.md(§5 P2 1~4, 반증 P2 2건), Codex 5차 = ${R5}/codex_x1_20260923.md(터치 재개 P1, 하단바 표적 이동 P2 2건), 수리 커밋 = git show 94f577b(터치 재개, 라이브) 와 git show 3d2ada3(이번 채점 대상: app.js 하단바를 stage.appendChild 로 한 번 붙이고 layout() 에서 옮기지 않음, popupFocus 첫 초점 N>1 이면 대화상자 뿌리 .pdim / base.css .pstage grid-template-rows:auto auto + place-items:end center, .pbar grid-area:2/1 width:min(440px,100%) pointer-events:auto z-index:2, .pdim:focus 윤곽 없음, 활성 .pop border-bottom-color:transparent). 구조가 바뀌어 5회차 프로브의 「하단바 = 활성 슬롯 안」 기대는 이제 「하단바 = .pstage 직계 자식, 활성 카드 아래 선에 붙음(하단바 top = 활성 .pop bottom)」 으로 바꿔 판정한다.
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
    prompt: `[프로브 popnav] 3d2ada3 팝업 무대 검증. ${R5}/probe_popnav.mjs 를 ${R6}/probe_popnav.mjs 로 복사하고 산출 경로와 「하단바 위치」 기대만 고쳐 all 구획을 돌린다(nav, seq, sweep, restpos, pause, n1, visual, close). 기대:
1. nav: 전 경로(클릭, 탭, Enter, Space, 방향키, 측면 카드 클릭, 스와이프) × 1440/390 × 기본/reduce × N=2, N=3 에서 되돌아감 0, 조작 뒤 초점 = 새 활성 카드 제목.
2. seq, sweep: 고정 좌표 실포인터 연타 2회/3회 × 간격 50~700ms × 1440/390 × N=2/N=3 에서 팝업 닫힘 0, 「오늘 하루 보지 않기」 체크 0, 매 클릭 넘김(5회차 = 56회 중 닫힘 9, 체크 6). 넘김 중 같은 좌표 hit-test 시간표가 전 구간 → 단추인지.
3. restpos: 카드별 → 단추 정지 위치 차이 0(5회차 = N=2 7.2/24.3px, 짧은 공지 카드가 끼면 141.3/166.3px). 하단바 top = 활성 .pop bottom(±0.5px) 이 카드마다 성립하는지. 카드 높이가 다를 때 활성 카드 위쪽 빈 공간(무대 1행 높이 - 활성 카드 높이)을 기록하고, 390 에서 짧은 카드가 활성일 때 화면에서 카드가 어디에 서는지 캡처(${R6}/shots/popnav_short_390.png).
4. pause: 5회차 결과 유지(표기, aria-label, aria-pressed 없음, 9.5초 고정, 재개 뒤 넘김, 390 터치 재개 = 94f577b 수리).
5. 초점 모델(신규): N=2 로드 직후 document.activeElement = .pdim(role=dialog, aria-label 「안내 2건」), 자동 넘김 20초 동안 focusin 0(첫 1회 제외), Tab 첫 이동 = 활성 카드 첫 조작 요소, Shift+Tab 순환, 초점이 카드 안에 들어가면 자동 넘김 정지, ESC 로 닫으면 초점이 여는 앞 요소로 복귀. N=1 은 첫 초점 = 카드 제목(기존 그대로). CDP Accessibility.getFullAXTree 로 초점 노드 역할과 이름.
6. 짧은 화면: 390x640, 360x640, 844x390(가로 폰), 1440x600, 1280x720 에서 하단바 전체가 뷰포트 안인지(bottom ≤ innerHeight), 카드 내용이 max-height 안에서 스크롤되는지, 측면 카드가 하단바와 겹치지 않는지.
7. visual: 접합 dsf3 crop(선 1개), 측면 radius, 넘김 전이 0/150/300/500ms 캡처(${R6}/shots/popnav_turn_*.png), 하단바가 넘김 동안 움직이지 않는지(rAF 표본의 하단바 rect 변화 0).
스크린샷: ${R6}/shots/popnav_1440.png, popnav_390.png, popnav_join_x3.png, popnav_short_390.png, popnav_844x390.png, popnav_n3_1440.png.
판정 pass = 1~7 전부 기대와 같음.`,
  },
  {
    key: 'regress',
    prompt: `[프로브 regress] 결정론 A/B 픽셀 회귀: 3d2ada3 이 라이브 94f577b 대비 의도한 곳 밖을 바꾸지 않았는지 본다.
1. ${R5}/probe_regress_ab.mjs 를 ${R6}/probe_regress_ab.mjs 로 복사해 고친다: 수리 전 판 = 94f577b, 수리 후 판 = 현재 서빙(3d2ada3). route 로 바꿔 서빙할 파일 = assets/app.js, assets/base.css. 결정론 조건은 5회차와 같게. 대상 = ${A}/shoot_r2.mjs 의 PAGES 20면 × 1440, 390 = 40쌍 + 홈 팝업 2장 + 공지 1건을 route 로 더한 N=3 홈 팝업 1440, 390.
2. ${R3}/probe_regress_compare.py 로 비교 → ${R6}/regress_ab.json, ${R6}/diff_ab/.
3. 분류: (a) 의도 = 홈 팝업 무대 안(하단바 위치, 활성 카드 위치, 접합 선) (b) 타이밍 흔들림(같은 판 재촬영으로 확인. 알려진 출처: 표본 이미지, 朱 점, programs 라디오 테두리, 영상 프레임) (c) 의도 밖 = 회귀 후보. 팝업이 없는 면(홈 본문 포함)은 차이 0 기대. 띠 crop 을 Read 로 직접 열어 보고 분류한다.
판정 pass = (c) 0건. checks 에 면별 한 줄.`,
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

const SHOTS = `${R6}/shots/ 의 popnav_1440.png, popnav_390.png, popnav_join_x3.png, popnav_short_390.png, popnav_844x390.png, popnav_n3_1440.png, popnav_turn_*.png, 메인 세션 자기 점검 popup_pinned_1440.png, popup_pinned_390.png. A/B 전후 = ${R6}/shots/ab_pre, ab_post, 차이 crop = ${R6}/diff_ab/. 5회차 스크린샷 = ${R5}/shots/, 라이브 94f577b 캡처 = ${R5}/live/.`

const CRITIC_PROMPT = `제2 평가자 채점 6회차. hyunhak.com 팝업 무대의 하단바 고정과 첫 초점 수리(3d2ada3)를 채점하고 배포 3차 릴리스 판정을 내라. 리포 = ${ROOT}. 대학 목록은 이번에 바뀌지 않았다(5회차 37/45 YES 유지, A/B 로 확인).

[용도 식별 G1] 매체 = 반응형 웹사이트(1440 데스크톱, 1024와 768 태블릿, 430과 390 폰). 용도 = 상품 판매 지면의 첫 진입 안내 팝업(의뢰 개시 카드, 행사 카드, 공지 카드). 대상 = 학부모와 고3 수험생. 토큰 SSOT = assets/base.css 1~80행(--ink 玄墨, --paper 楮紙, --seal 朱印은 가격과 인장과 폼 오류만, 그림자 대신 괘선, 리터럴 px 금지).

[이전 회차] 5차 회신 = ${A}/critic_r5_20260923.md (팝업 33/45 YES, L6=3 넘김 첫 프레임 세로 튐, L8=3 L9=3 터치 재개와 하단바 이동, §5 P2 1~4). Codex 5차 = ${R5}/codex_x1_20260923.md (RELEASE: NO: 터치 재개 P1, 하단바 표적 이동 P2 2건). 라이브 = 94f577b(터치 재개 수리 포함, 배포 2차).
[이번 수리] git show 3d2ada3. 하단바를 무대 둘째 행에 고정(넘김 동안 조작부 정지, 카드별 → 위치 동일, 연타 오작동 제거, 세로 튐 제거), 슬롯 아래 맞춤, 두 장 이상일 때 첫 초점 = 대화상자 틀(자동 넘김이 초점을 옮기지 않음), 활성 카드 아래 선 투명.
[이번 회차 실측 = 프로브 2종 결과, 수치는 스크립트 실측]
${probeDigest}
[스크린샷] ${SHOTS}

[채점 대상]
1. 팝업 무대 9렌즈 재채점(5차 33/45). 특히 L6(세로 튐), L8(조작부 안정), L9(연타, 터치, 초점) 변화. 카드 높이가 다를 때 짧은 카드가 활성이면 카드 위에 빈 공간이 생기는 배치(아래 맞춤)가 시각 균형에서 허용되는지.
2. 대학 목록은 A/B 가 0 이면 5회차 점수 유지로 적는다(tiles 필드에 5회차 L 과 total 을 그대로, release true).
3. 5차 P2 1~4 와 반증 P2 2건 수리 확인(resolved + 근거).
4. 프로브 issues 를 릴리스 차단(P1)인지 다음 회차(P2)인지 판정.
릴리스 기준 = 각 면 총점 31 이상 + 렌즈1 ≥ 4 + 렌즈8 ≥ 3 + 렌즈9 ≥ 3, 그리고 릴리스 전 P1 0건.

[출력] markdown 필드에 700단어 이내, §1 팝업 무대 점수와 판정 / §2 대학 목록(유지 근거 한 줄) / §3 수리 확인 표 / §4 릴리스 전 P1(파일:행과 수정안 한 줄, 없으면 「없음」) / §5 P2 / §6 슬롭 16뿌리와 잔상 7축 / §7 토큰 위배. §1 말미에 「Codex X1 병렬 채점 = 같은 워크플로의 별도 Codex 에이전트, 메인 세션이 병합」 한 줄. 산문 은유와 가운뎃점 금지. popup.L 과 tiles.L 은 렌즈 1~9 순서 정수 9개, total 은 그 합, release 는 위 기준 충족 여부. 파일 수정 금지, 점수 없는 평가 금지.`

const CODEX_PROMPT = `[Codex X1 병렬 채점 에이전트] 너는 design-critic 6회차와 병렬로 도는 외부 모델(Codex) 2차 시선을 발주하고 회수한다.
1. Write 로 ${R6}/codex_x1_prompt.md 를 만든다. 내용(한국어): 역할 = hyunhak.com 릴리스 전 외부 검토자(읽기 전용). 대상 = git show 3d2ada3 (팝업 하단바 무대 둘째 행 고정 + 두 장 이상일 때 첫 초점 대화상자 틀) 와 이미 라이브인 git show 94f577b (터치 재개). 배경 = 너의 5차 회신 ${R5}/codex_x1_20260923.md (터치 재개 P1, 같은 좌표 연타 오작동 P2, 카드 높이별 → 위치 이동 P2 가 어떻게 되었는지 먼저 확인), critic 5차 ${A}/critic_r5_20260923.md. 이번 실측 프로브 요약(아래 JSON 을 그대로 붙인다). 요구 = (a) 5차 지적 3건 해결 여부와 근거(파일:행) (b) 수리가 만든 새 회귀 후보(하단바가 슬롯 밖으로 나가며 생긴 초점 순서, 측면 카드와 하단바 겹침, 짧은 화면에서 하단바 잘림, 카드 높이 차이로 생긴 빈 공간, .pdim 첫 초점이 스크린리더에 주는 안내, focus trap 의 initial 대상 변경이 onFocus 복귀에 주는 영향) (c) 릴리스 판정. 500단어 이내, 마지막 줄은 정확히 「RELEASE: YES」 또는 「RELEASE: NO」.
프로브 요약 JSON:
${probeDigest}
2. Bash(timeout 600000) 로 한 번 실행한다(첨부 이미지는 존재하는 것만 -i 로 붙인다: ${R6}/shots/popnav_1440.png, popnav_390.png, popnav_short_390.png, popnav_n3_1440.png, popnav_844x390.png):
cd ${ROOT} && env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u CMUX_CODEX_WRAPPER_SHIM -u CMUX_CODEX_WRAPPER_SHIM_ROOT perl -e 'alarm 570; exec @ARGV' -- /opt/homebrew/bin/codex exec -s read-only -C ${ROOT} --skip-git-repo-check -c model_reasoning_effort="high" -i <이미지1> -i <이미지2> ... -o ${R6}/codex_x1_20260923.md < ${R6}/codex_x1_prompt.md > ${R6}/codex_x1.out 2> ${R6}/codex_x1.err
주의: codex 는 반드시 절대경로 /opt/homebrew/bin/codex. 프록시 변수를 빼지 않으면 TLS UnknownIssuer 로 죽는다. stdin 은 프롬프트 파일(인자로 프롬프트를 주지 않는다).
3. 결과 = ${R6}/codex_x1_20260923.md (마지막 메시지만 담긴다). 비었거나 exit 코드가 0 이 아니면 codex_x1.err 앞 20줄로 원인을 reason 에 적고 ok=false. 「usage limit」 이면 재시도하지 않는다. alarm 으로 끊겼으면 ok=false, reason="timeout".
4. 성공이면 파일을 읽어 fixes(id = touch_resume, rapid_click, restpos, focus_model), regressions, release(마지막 줄의 YES 또는 NO) 를 채우고 raw_path 에 파일 경로. Codex 의 판단을 네가 고쳐 쓰지 않는다(그대로 옮긴다).`

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
    prompt: `렌즈 = 레이아웃 회귀. 3d2ada3 의 팝업 무대 CSS(.pstage 2행 격자 place-items:end center, .pbar grid-area 2/1, 활성 .pop 아래 선 투명)를 읽고 깨지는 조건을 찾는다: 뷰포트 320x568, 360x640, 390x640, 844x390, 768x1024, 1024x600, 1440x600, 1920x1080, 브라우저 확대 200%(1440 → CSS 720), 공지 카드(route 로 모킹 API 공지 1~2건, 긴 본문과 짧은 본문)를 더한 N=3, N=4, 카드 한 장. 경우마다 하단바 전체가 뷰포트 안인지, 측면 카드가 하단바나 활성 카드와 겹치는지, 활성 카드 위 빈 공간 높이, 카드 내용 스크롤(max-height 72vh), 가로 넘침. 팝업이 공지 카드로 서는 다른 면(공지 API 가 있으면 뜨는 면: app.js 에서 openStage 호출 조건을 읽어 확인)도 1곳 이상. Playwright 로 재현해 숫자를 낸다.`,
  },
  {
    key: 'behavior',
    prompt: `렌즈 = 동작과 접근성. (1) 첫 초점 대화상자 틀: popupFocus 의 initial 이 .pdim 일 때 onFocus(대화상자 밖 초점 → initial 로 복귀), Tab 이 f.indexOf(-1) 경로로 첫 조작 요소에 가는지, Shift+Tab 첫 이동, 스크린리더 안내(CDP 접근성 트리의 초점 노드 이름과 역할, aria-modal), 초점 윤곽이 없는 틀에 초점이 있을 때 키보드 사용자가 위치를 잃는지(첫 Tab 전 시각 표지 유무). (2) 하단바가 슬롯 밖으로 나간 뒤 자동 넘김 tick 의 hadFocus(초점이 하단바에 있으면 넘겨도 초점 유지), focusin 정지(하단바 안 조작도 멈추는지, 정지 단추 자신은 제외), pointerdown 정지. (3) 스와이프가 하단바 위에서 시작될 때. (4) 94f577b 터치 재개 회귀. Playwright 로 재현해 숫자를 낸다. 기존부터 있던 것인지 이번 신규인지 git show 94f577b:<파일> 과 비교해 구분한다.`,
  },
]

let skeptics = []
if (criticYes) {
  phase('Refute')
  const verdictDigest = JSON.stringify({ popup: critic.popup, tiles: critic.tiles, fixes: critic.fixes, p2: critic.p2, codex: ok(codex) ? { ok: codex.ok, release: codex.release, regressions: codex.regressions } : null }, null, 1)
  skeptics = await parallel(LENSES.map((l) => () =>
    wf(`${CTX}\n\n[반증 에이전트] design-critic 6회차가 릴리스 YES 를 냈다. 너의 일은 그 YES 를 깨는 것이다. 재현 가능한 증거가 있는 결함만 blockers 에 올린다(추측 금지). 증거를 못 찾으면 blockers 는 빈 배열, verdict_refuted=false. severity = P0(깨짐, 판매 방해) / P1(릴리스 전 고칠 것) / P2(다음 회차). new_regression = 이번 수리 3d2ada3 가 새로 만든 것이면 true, 이전부터 있던 것이면 false.
critic 판정 요약:
${verdictDigest}
프로브 요약:
${probeDigest}

${l.prompt}
재현 스크립트는 ${R6}/refute_${l.key}.mjs 로 저장. tried 에 시도한 경로를 한 줄씩.`,
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
