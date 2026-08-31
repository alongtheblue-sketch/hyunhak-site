// 푸터 사업자 정보 래스터화 (2026-08-27 건우 지시: 텍스트 대신 이미지, 크롤러 수집 차단)
// 실행: node _tools/render_bizinfo.mjs  → assets/bizinfo.png (2x) + stdout 에 CSS px 치수
// 내용은 아래 LINES 고정. 문구 변경 시 여기 수정 후 재실행 + v2_shell.py 의 width/height 갱신.
// 2026-08-31 6행으로 확장: 토스페이먼츠 심사 요구 5항목(상호명, 사업자등록번호, 대표자명,
//   사업장 주소, 유선번호) 충족. 근거 = tosspayments.com/notice/20057 「홈페이지 하단 정보 검수」.
//   휴대폰번호는 유선번호 대체 인정 항목. 개인 번호라 크롤러 노출을 피해 이미지 안에 둔다.
// 호스팅 제공자 = Cloudflare 단독 (건우 결재 2026-08-31 '하나만'). 근거 = wrangler.toml 이
//   [assets] directory='.' 로 정적 파일을 Workers 에 얹고 routes 가 hyunhak.com/* 를 받는다
//   (2026-08-30 GitHub Pages 에서 이전). 실측 = www 301, server: cloudflare, cf-ray 존재.
//   GitHub Pages 는 DNS 프록시를 끌 때만 되살아나는 되돌리기 경로라 표시 대상이 아니다.
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'assets', 'bizinfo.png');
const LINES = [
  '상호: 현학적 연구소',
  '대표: 현건우',
  '사업자등록번호: 293-38-01827',
  '통신판매업 신고: 면제대상',
  '주소: 서울특별시 강남구 테헤란로 70길 12, 402-941A호(대치동,&nbsp;H&nbsp;타워)',
  '전화: 010-6764-8520',
  '호스팅 제공자: Cloudflare,&nbsp;Inc.',
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:transparent}
  #biz{display:inline-block;
    font-family:'Pretendard Variable','Pretendard',-apple-system,'Apple SD Gothic Neo',sans-serif;
    font-size:12px;line-height:1.75;color:#696561;letter-spacing:0;
    max-width:330px;word-break:keep-all}
</style></head><body><div id="biz">${LINES.join('<br>')}</div></body></html>`;

const b = await chromium.launch();
const pg = await (await b.newContext({ deviceScaleFactor: 2 })).newPage();
await pg.setContent(html);
await pg.evaluate(() => document.fonts.ready);
const el = pg.locator('#biz');
const box = await el.boundingBox();
await el.screenshot({ path: OUT, omitBackground: true });
console.log(JSON.stringify({ w: Math.ceil(box.width), h: Math.ceil(box.height) }));
await b.close();
