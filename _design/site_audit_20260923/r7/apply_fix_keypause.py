#!/usr/bin/env python3
"""Codex 7차 P2 수리 패치 (프로브 회수 뒤 적용): 키 스크롤 시 자동 넘김 정지 + 감아 돌기 transition 복구 rAF 세대 검사."""
import pathlib, sys
A = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/Users/gregory/Workspace/_wt/hh-studio12/assets/app.js')
s = A.read_text(encoding='utf-8')
old1 = '''        const sc = cards[cur].card;
        if (sc.scrollHeight > sc.clientHeight) {
          const page = e.key !== "ArrowDown" && e.key !== "ArrowUp";'''
new1 = '''        const sc = cards[cur].card;
        if (sc.scrollHeight > sc.clientHeight) {
          if (!stopped) setPause(true);   // 키로 읽는 중에는 벨트를 멈춘다(WCAG 2.2.2). 초점이 .pdim 에 남아 focusin, pointerdown 정지가 걸리지 않았다 (Codex 7차 P2)
          const page = e.key !== "ArrowDown" && e.key !== "ArrowUp";'''
old2 = '''        if (pd !== null && Math.abs(d - pd) > 1) { s.style.transition = "none"; requestAnimationFrame(() => requestAnimationFrame(() => s.style.removeProperty("transition"))); }'''
new2 = '''        if (pd !== null && Math.abs(d - pd) > 1) {
          const gen = (Number(s.dataset.gen) || 0) + 1; s.dataset.gen = String(gen); s.style.transition = "none";   // 세대 검사: 두 프레임 안에 다시 감아 돌면 앞 rAF 가 뒤 슬롯의 none 을 지우지 않게 (Codex 7차 관찰)
          requestAnimationFrame(() => requestAnimationFrame(() => { if (s.dataset.gen === String(gen)) s.style.removeProperty("transition"); }));
        }'''
for old, new in ((old1, new1), (old2, new2)):
    assert s.count(old) == 1, old[:60]
    s = s.replace(old, new)
A.write_text(s, encoding='utf-8'); print('applied keypause + rAF gen to', A)
