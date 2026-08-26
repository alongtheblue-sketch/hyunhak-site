// 헤더 GNB 줄 수 계측기 (s19 §C 재현 로직 영속화, 2026-08-26)
//   함정: inline-block 은 내부가 몇 줄이든 element.getClientRects()=1 → 거짓 PASS.
//   해법: 각 링크의 텍스트 노드에 Range 를 걸어 line box 단위 rect 를 세고,
//         판정 전에 fault 주입(강제 개행)으로 검출력을 확인한다.
//   부가: 밑줄(::after 등) 헤더 밖 누출 = 링크 시각 하단이 헤더 하단보다 아래인지 측정.
// 실행: node _tools/hdr_lines.mjs [URL]   (기본 https://hyunhak.com/)
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';

const URL = process.argv[2] || 'https://hyunhak.com/';
const WIDTHS = [1440, 1024, 980, 940, 900, 390];

const measure = () => {
  const hd = document.querySelector('header.hd');
  const links = [...document.querySelectorAll('.gnb a')];
  const hdRect = hd.getBoundingClientRect();
  const gnbVisible = links.length && getComputedStyle(links[0].closest('.gnb')).display !== 'none';
  return {
    gnbVisible,
    hdBottom: hdRect.bottom,
    items: links.map(a => {
      const r = document.createRange();
      r.selectNodeContents(a);
      const rects = [...r.getClientRects()].filter(x => x.width > 0 && x.height > 0);
      // line box 판정: top 이 이전 rect 하단보다 아래로 내려간 횟수 + 1
      let lines = 0, lastBottom = -1e9;
      for (const x of rects.sort((p, q) => p.top - q.top)) {
        if (x.top >= lastBottom - 1) lines += 1;
        lastBottom = Math.max(lastBottom, x.bottom);
      }
      const leak = a.getBoundingClientRect().bottom - hdRect.bottom;
      return { text: a.textContent.trim(), lines: Math.max(lines, rects.length ? 1 : 0), leakPx: Math.round(leak * 10) / 10 };
    }),
    scrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
};

const browser = await chromium.launch();
const pg = await browser.newPage();
let fail = 0;

for (const w of WIDTHS) {
  await pg.setViewportSize({ width: w, height: 900 });
  await pg.goto(URL, { waitUntil: 'networkidle' });

  // fault 주입 자기검사 (첫 폭에서 1회): 강제 개행이 lines>1 로 검출되는가
  if (w === WIDTHS[0]) {
    const faultLines = await pg.evaluate(() => {
      const a = document.querySelector('.gnb a');
      const old = a.innerHTML;
      a.innerHTML = a.textContent.trim().split('').join('') + '<br>강제개행행';
      const r = document.createRange();
      r.selectNodeContents(a);
      const rects = [...r.getClientRects()].filter(x => x.width > 0 && x.height > 0);
      let lines = 0, lastBottom = -1e9;
      for (const x of rects.sort((p, q) => p.top - q.top)) {
        if (x.top >= lastBottom - 1) lines += 1;
        lastBottom = Math.max(lastBottom, x.bottom);
      }
      a.innerHTML = old;
      return lines;
    });
    if (faultLines < 2) { console.log(`FAULT-CHECK FAIL: 강제 개행이 ${faultLines}줄로 계측됨 — 검출기 무효`); process.exit(2); }
    console.log(`fault-check PASS (강제 개행 → ${faultLines}줄 검출)`);
  }

  const m = await pg.evaluate(measure);
  if (!m.gnbVisible) { console.log(`${w}px  GNB 비표시(모바일 메뉴 전환) — 줄수 검사 대상 아님, scrollX=${m.scrollX}`); if (m.scrollX) fail++; continue; }
  for (const it of m.items) {
    // leak 임계 2px: 링크 패딩 박스 서브픽셀 오버행(1440px 실측 0.75px, 헤더 1px 보더와 겹침)은 정상.
    // 실결함 클래스(s19 +12px 밑줄 누출)는 2px 임계로 충분히 검출된다.
    const bad = it.lines > 1 || it.leakPx > 2;
    if (bad) fail++;
    console.log(`${w}px  [${it.text}] lines=${it.lines} leak=${it.leakPx}px ${bad ? '★FAIL' : 'ok'}${m.scrollX ? ' scrollX!' : ''}`);
  }
}
await browser.close();
console.log(fail ? `RESULT: FAIL ${fail}건` : 'RESULT: PASS (전 폭 1줄·누출 0·가로스크롤 0)');
process.exit(fail ? 1 : 0);
