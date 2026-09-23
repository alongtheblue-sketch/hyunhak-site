# 반증 7차 behavior P2(신규 회귀) 수리: N>1 첫 초점 .pdim 에서 End/Home 키로 활성 카드 끝/처음 이동.
# 라이브(96be167)는 첫 초점이 h2 라 브라우저 기본 End/Home 이 닿았는데, 틀(.pdim) 초점에서는 onArrow 가 5종 키만 처리해 무반응이었다.
# 사용: python3 apply_fix_endhome.py [app.js 경로]  (기본 = 워크트리 assets/app.js). 자리 문자열이 정확히 1회 아니면 exit 2.
import sys, pathlib
p = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/Users/gregory/Workspace/_wt/hh-studio12/assets/app.js")
src = p.read_text(encoding="utf-8")
old_re = 'if (document.activeElement === root && /^(ArrowDown|ArrowUp|PageDown|PageUp| )$/.test(e.key)) {'
new_re = 'if (document.activeElement === root && /^(ArrowDown|ArrowUp|PageDown|PageUp|End|Home| )$/.test(e.key)) {'
old_body = '''          const page = e.key !== "ArrowDown" && e.key !== "ArrowUp";
          const up = e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey);
          e.preventDefault(); sc.scrollBy({ top: (up ? -1 : 1) * (page ? Math.round(sc.clientHeight * 0.85) : 48) });'''
new_body = '''          if (e.key === "End" || e.key === "Home") { e.preventDefault(); sc.scrollTo({ top: e.key === "End" ? sc.scrollHeight : 0 }); return; }   // 틀 초점에서는 브라우저 기본 End/Home 이 카드에 닿지 않는다 (반증 7차 behavior P2, 라이브 대비 신규 회귀)
          const page = e.key !== "ArrowDown" && e.key !== "ArrowUp";
          const up = e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey);
          e.preventDefault(); sc.scrollBy({ top: (up ? -1 : 1) * (page ? Math.round(sc.clientHeight * 0.85) : 48) });'''
for o in (old_re, old_body):
    n = src.count(o)
    if n != 1:
        print(f"자리 문자열 {n}회: 중단", o[:60]); sys.exit(2)
src = src.replace(old_re, new_re).replace(old_body, new_body)
p.write_text(src, encoding="utf-8")
print("적용 완료:", p)
