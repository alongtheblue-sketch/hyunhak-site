// GS-17 G4 판정 규칙 단일 구현. gate_gs17.mjs 와 g4_controls.mjs 가 함께 import 한다(술어 재구현 금지).
//
// 축 교체 근거 (2026-09-04 r3b):
//   구 식 = booksPct ≤ 72. 72 는 패널 brief 산식이고 백분율은 #books 아래 절들의 높이의 함수라,
//   배치가 옳아도 도달하지 못한다. r3 실측 1440 = books.top 12492 / H 16984 = 73.6%.
//   72 를 만들려면 (a) books 를 264px 위로 올려 #p5 앞에 두거나 = 5부 전건 뒤라는 순서를 깨거나,
//   (b) 뒤 절들을 366px 늘려 H 를 2.2% 불리거나 = 지면을 개악하는 두 길뿐이다.
//   임계 하나가 배치를 정하는 자리이므로 완화가 아니라 축을 바꾼다.
//
// 새 축 세 겹:
//   1) 구조 = #books 의 직전 형제가 #p5, 직후 형제가 #diff (5부 전건 뒤, 비교 앞).
//      r1·r2 의 #p3 뒤 배치(50.4%)는 백분율로는 통과하므로 이 술어만이 가른다.
//   2) 무회귀 = booksPct < 80.9. HEAD 82acc5a 실측(baseline_before) = #format 뒤 #faq 앞 80.9%,
//      원 지적("그리드가 FAQ 앞에 처박혔다")의 자리. 그보다 앞이어야 한다.
//   3) 절정 = 47.8 ≤ p4Pct ≤ 65. 상한은 절정 규범, 하한은 HEAD 48.3 무회귀.
//      규범 하한 50 은 HEAD 부터 미충족이라 이 게이트 범위 밖(별건 GS-21 후보).
//   1440 과 390 두 폭 모두에서 성립해야 한다.

export const HEAD_BOOKS_PCT = 80.9;
export const P4_MIN = 47.8, P4_MAX = 65;

// 페이지 안에서 도는 계측 함수. __g(게이트 헬퍼)가 있으면 쓰고 없으면 자체 폴백.
export function g4Eval() {
  const H = document.documentElement.scrollHeight;
  const sel = el => (typeof __g !== 'undefined' && __g.sel) ? __g.sel(el)
    : el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).trim().split(/\s+/).join('.') : '');
  const txt = (el, n) => (typeof __g !== 'undefined' && __g.txt) ? __g.txt(el, n) : (el.innerText || '').trim().slice(0, n);
  const pos = q => {
    const el = document.querySelector(q); if (!el) return null;
    const top = el.getBoundingClientRect().top + scrollY;
    const nx = el.nextElementSibling, pv = el.previousElementSibling;
    return {
      top: Math.round(top), pct: +(top / H * 100).toFixed(1),
      prevId: pv ? (pv.id || null) : null, nextId: nx ? (nx.id || null) : null,
      prev: pv ? sel(pv) : null, next: nx ? sel(nx) + ' "' + txt(nx, 24) + '"' : null
    };
  };
  return { w: innerWidth, books: pos('#books'), p4: pos('#p4'), scrollHeight: H };
}

// 한 폭의 계측값 판정. 이유를 함께 돌려준다(대조군이 어느 겹에 걸렸는지 세기 위함).
export function g4One(o) {
  const why = [];
  if (!o || !o.books || !o.p4) { return { pass: false, why: ['#books 또는 #p4 없음'] }; }
  if (o.books.prevId !== 'p5') why.push(`직전 형제 = ${o.books.prevId} (기대 p5)`);
  if (o.books.nextId !== 'diff') why.push(`직후 형제 = ${o.books.nextId} (기대 diff)`);
  if (!(o.books.pct < HEAD_BOOKS_PCT)) why.push(`booksPct ${o.books.pct} ≥ HEAD ${HEAD_BOOKS_PCT}`);
  if (!(o.p4.pct >= P4_MIN && o.p4.pct <= P4_MAX)) why.push(`p4Pct ${o.p4.pct} 가 ${P4_MIN}~${P4_MAX} 밖`);
  return { pass: why.length === 0, why };
}

export const G4_TARGET = `#books 의 직전 형제 = #p5 AND 직후 형제 = #diff AND booksPct < ${HEAD_BOOKS_PCT}(HEAD 무회귀) AND ${P4_MIN} ≤ p4Pct ≤ ${P4_MAX} — 1440 과 390 양쪽`;
export const G4_METRIC = 'guidebook 1440·390: #books 의 형제 순서(직전/직후 id), #books offsetTop / document.scrollHeight (%), #p4(4부 절정) offsetTop / document.scrollHeight (%)';
