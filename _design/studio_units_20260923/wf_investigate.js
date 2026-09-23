export const meta = {
  name: 'hyunhak-studio-units-investigate',
  description: 'hyunhak.com 스튜디오 12단위: 구매 선택지 5곳뿐, 첨단만 판매 중 원인 조사(사이트 2면 + API + D1 읽기)',
  phases: [
    { title: 'Investigate', detail: '구매 select 와 SKU, 보유 판정 로직, API 상품과 이용권과 D1 읽기' },
  ],
}

// ---- wf_guard 계약 v1.2 (정본 = ~/unjang/_shared/wf_guard/probe/wfg_probe.js 상단 블록) ----
const DONE = (args && args.done) || {}
const STOP_FILE = (args && args.stop_file) || '$HOME/Workspace/hyunhak-site/_design/studio_units_20260923/.wf_stop'
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

const SITE = '/Users/gregory/Workspace/hyunhak-site'
const API = '/Users/gregory/Workspace/hyunhak-api'
const OUTD = SITE + '/_design/studio_units_20260923'
const CTX = `[공통 맥락] hyunhak.com(현학적 연구소) 스튜디오 = 연세대, 고려대 제시문 면접 응시 앱. 응시 단위 12곳(사이트 지표 「응시 단위 12곳」, 단위마다 지문 30편). 건우(운영자) 캡처 2장:
(1) 스튜디오 단위 목록(05 연세대 미래 디자인 「보유 중」 응시하러 가기 / 06 연세대 미래 첨단 「판매 중」 구매하러 가기 / 07 연세대 미래 보건 보유 중 / 08 연세대 미래 국제 보유 중 / 09 고려대 계열적합전형 인문 보유 중 / 10 고려대 계열적합전형 자연 보유 중 / 11 고려대 고른기회전형 인문 / 12 고려대 고른기회전형 자연, 각 카드에 「출제 유형과 풀이법 보기」「이용권 보기」). 건우 계정으로 본 화면이라 11곳 보유, 첨단만 판매 중으로 보인다. 건우 말 「모두 지금 있는거잖아」.
(2) programs/studio.html 「스튜디오 이용권 구매」 응시 단위 select 가 5곳(고려대 계열적합 인문/자연, 연세대 활동우수 인문통합/자연, 연세대 국제형)뿐. 연세대 미래와 고대 고른기회가 없다. 템플릿 = ${SITE}/_tools/program_studio_v2.html (빌드가 programs/studio.html 재생성).
사이트 리포 = ${SITE}, API 리포 = ${API} (Cloudflare Worker + D1 hyunhak). 로컬 하네스: http://localhost:8092 정적, http://localhost:8799 모킹 API.
금지: 어떤 파일도 수정하지 않는다(조사 전용, 산출은 ${OUTD}/ 아래 새 파일만). D1 은 SELECT 만(npx wrangler d1 execute hyunhak --remote --command "SELECT ..." 를 API 리포에서, INSERT/UPDATE/DELETE 금지). 개인정보는 이메일과 전화를 출력하지 않는다(사용자 id 와 건수만). git 은 읽기만.
보고는 파일:행 근거와 실측 값으로. 추측은 「추정」 표시.`
const SCHEMA = {
  type: 'object',
  properties: {
    area: { type: 'string' },
    findings: { type: 'array', items: { type: 'object', properties: { claim: { type: 'string' }, evidence: { type: 'string' } }, required: ['claim', 'evidence'] } },
    unit_codes: { type: 'array', items: { type: 'object', properties: { no: { type: 'string' }, name: { type: 'string' }, code: { type: 'string' }, where: { type: 'string' } }, required: ['no', 'name', 'code', 'where'] } },
    root_cause: { type: 'string' },
    fix_points: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    stopped: { type: 'boolean' },
  },
  required: ['area', 'findings', 'unit_codes', 'root_cause', 'fix_points', 'risks'],
}
const TASKS = [
  { key: 'select', prompt: `[조사 select] 구매 면 응시 단위 select 가 5곳뿐인 원인과 고칠 자리.
1. ${SITE}/_tools/program_studio_v2.html 와 이 템플릿을 채우는 빌더(_tools/build_interview_hub.py 의 build_programs, _tools/v2_shell.py 등)에서 select 옵션이 어디서 오는지(하드코딩인지, 단위 목록 SSOT 가 있는데 안 쓰는지). 사이트에 12단위 목록 SSOT 가 있으면(예: _tools/exam_pages/codes.py, _tools/*.json) 경로와 12개 코드와 이름.
2. assets/app.js 의 data-product-buy="studio" 처리: select 값 + 상품 라디오(single, pass, lecture) → data-cart-sku 를 어떻게 만드는지(SKU 문자열 규칙), 가격을 어디서 읽는지(HTML data-list-price 인지 API 인지), 장바구니와 checkout 이 SKU 를 서버에 어떻게 넘기는지.
3. 7개 누락 단위에 같은 규칙으로 만든 SKU 가 API 에 실재하는지는 api 조사가 본다. 여기서는 SKU 문자열 목록 12개를 규칙대로 산출해 적는다.
4. 다른 면(studio.html #units, my.html, cart.html, checkout.html, interview/*.html)에도 5곳만 하드코딩된 목록이 있는지 grep.` },
  { key: 'owned', prompt: `[조사 owned] 스튜디오 단위 목록의 「보유 중/판매 중」과 「응시하러 가기/구매하러 가기」 판정 로직.
1. 캡처 (1) 의 목록이 그려지는 면과 코드(studio.html #units 인지, my.html 인지, 스튜디오 앱인지)를 찾는다. 카드 12개의 순번, 이름, 단위 코드(DOM 속성)를 전부 적는다.
2. 보유 판정: 어느 API 엔드포인트(/api/me, /api/entitlements 등)의 어느 필드를 어느 키(단위 코드, SKU, product_id)와 대조하는지 파일:행. 판정 키 규칙이 단위마다 다르게 적용될 여지(예: 연세대 미래 첨단 코드가 API 쪽 표기와 다름, 오타, 하이픈, 별칭)를 찾는다.
3. 로컬 모킹 API(8799)의 해당 엔드포인트 응답 형식을 curl 로 확인(로그인 필요하면 모킹의 방식을 읽어 확인).
4. 첨단만 판매 중으로 보일 수 있는 코드 경로를 전부 나열(코드 불일치, 이용권 만료, 상품 매핑 누락, 번들 전개 누락).` },
  { key: 'api', prompt: `[조사 api] API 리포 ${API} 와 D1 원격 읽기.
1. 스튜디오 상품 모델: products 표(또는 카탈로그 파일)에서 스튜디오 단위 관련 행 전부(sku, 이름, 가격, 활성 여부). 12단위 각각 single/pass 상품이 있는지, 번들(전 단위 전권 등)이 어떤 단위 목록으로 전개되는지 파일:행. 7개 누락 단위(연세대 미래 5곳?, 고대 고른기회 2곳 — 실제 단위 구성은 사이트 조사와 대조)의 상품 존재 여부.
2. 이용권(entitlement) 모델: 표 구조, 단위 코드 저장 방식, 번들 구매 시 전개 로직.
3. D1 원격 SELECT(읽기만): (a) products 에서 스튜디오 관련 행 전부 (b) 이용권 표에서 스튜디오 단위별 보유 사용자 수 (c) 스튜디오 단위 이용권을 10개 이상 가진 사용자 id 별로 가진 단위 코드 목록(운영자 계정 추정, 이메일 출력 금지) → 첨단이 빠진 계정이 있는지, 그 계정의 첨단 관련 행(만료, 코드 표기)이 어떤지.
4. 첨단 단위 코드가 사이트 표기와 API/D1 표기에서 같은지 문자 단위로 대조.
5. 단위를 구매 목록에 추가하려면 API 쪽에 새 상품 행이 필요한지(필요하면 가격 기준이 어디 정해져 있는지: 가격 SSOT 파일이나 정책 문서 경로). 필요 없다면 그 근거.` },
]
phase('Investigate')
const res = await parallel(TASKS.map((t) => () => wf(`${CTX}\n\n${t.prompt}\n\n반환: area="${t.key}", findings(주장과 근거), unit_codes(찾은 단위 번호, 이름, 코드, 출처), root_cause(이 영역에서 본 원인 한 단락), fix_points(고칠 자리 파일:행과 방법), risks(돈, 결제, 기존 구매자 영향).`, { label: `inv:${t.key}`, phase: 'Investigate', schema: SCHEMA, model: 'opus' })))
const missing = TASKS.filter((t, i) => !ok(res[i])).map((t) => t.key)
return { partial: missing.length > 0 || STOPPED, missing, results: TASKS.map((t, i) => ok(res[i]) ? res[i] : { area: t.key, missing: true }) }
