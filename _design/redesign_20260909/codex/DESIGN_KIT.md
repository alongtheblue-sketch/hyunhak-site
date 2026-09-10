# DESIGN KIT for Codex (astra) — 우리가 만든 디자인 스킬·지식·도구 (2026-09-08, 건우 지시 "astra 가 필요하면 활용할 수 있게")

읽기 전용 참조 자산. 필요할 때만 열어라(전부 읽지 마라). 경로는 절대경로. 편집 금지.
쓰는 규칙: 어떤 자산을 어떤 판단에 썼는지 산출 마지막 "USED_ASSETS:" 줄에 경로를 열거한다.

## 1. 웹 디자인 스킬 (Meng To 75 + 품질 베이스). 각 디렉터리의 SKILL.md (+REFERENCES.md) 를 읽는다
- 라우터(레이어링 규칙): ~/.claude/skills/mengto-design/SKILL.md
- 품질 베이스(하나 필수): library/ui/high-end-visual-design · design-taste-frontend · frontend-design · gpt-taste
- 재디자인 전용: library/ui/redesign-existing-projects · minimalist-ui · design-first-ui-prompting
- 페이지 유형: library/web-design/landing-page · pricing-page · (카피) library/codex/copywriting
- 스타일 시스템·기법 (web-design/):
      agency-grid-layout-minimal     animation-on-scroll     animation-systems     atmosphere-background     background-grid-webgl     beautiful-shadows     blue-cloudy-clean-modern 
      blue-laser-clean-glass-layout     book-serif-index     bright-green-tech-system-webgl     cinematic-gsap-lenis-motion-system     cinematic-scroll-storytelling     
  clean-minimal-beige-light-mode     cobejs     company-logos     container-lines     corner-diagonals     corner-lasers     css-alpha-masking     css-border-gradient     
  dark-blue-contrasting-clean     dark-glass-clean-layout     dither-background     dither-laser-dark-mode     editorial-tech     framed-grid-layout     
  framed-tech-dark-border-gradient     funky-purple-container-tech     glass-dark-mode-clock     glass-dark-ui     globe-gl     globe-particles     gooey-blob-system     gsap     
  gsap-scrolltrigger-storytelling     high-contrast-skeuomorphic-clean     image-first-grid-layout     landing-page     light-mode-paper-technical     marquee-loop     masked-reveal 
      matterjs     mesh-gradient-dark-blue-clean     nested-container-clean-agency     nested-container-frames     number-details     orange-clean-paper-saas     pricing-page     
  progressive-blur     README.md     skeuomorphic-ui     solar-duotone-bold     split-layout-technical     staggered-word-reveal     tailwindcss     tech-green-dark-mode-modern     
  technical-wireframe-info-layout     threejs     unicorn-studio     vantajs     WEB-DESIGN-SKILLS.md     webgl-3d-object     webgl-landing-steering     webgl-laser
- 미디어: library/media/unsplash-asset-images · aura-asset-images
- Anthropic 공식 frontend-design 스킬: ~/.claude/plugins/cache/claude-plugins-official/frontend-design/1d3892dabda5/skills/frontend-design/SKILL.md

## 2. 디자인 지식 (마라톤 학습 SSOT, 실측 수치 기반)
- 디지털 UI/UX 32 DS 실측(Linear·Vercel Geist·Toss·Stripe·Material 3·a11y·UX 라이팅): ~/.claude/projects/-Users-gregory/memory/design_references/05_digital_ui_ux.md
- 광학 안티패턴(정렬·시각 보정): design_references/08_optical_antipatterns.md
- 타이포 심화: design_references/06_typography_deep.md · 2026 트렌드: 07_trends_2024_2026.md, 07b_trends_2026q2.md
- 용도별 그리드/색/이미지/비율 마라톤: design_references/learning_marathon_20260530_v6_grid_layout_by_usecase, v7_color_by_usecase, v7_imagery_by_usecase, 20260531_v8_total_by_purpose, v9_ratio_situation_medium_purpose, v10_design_planning (각 디렉터리 00_INDEX.md 부터)
- 5요소 craft SSOT(형·색·타이포·공간·이미지 Q-K 게이트): ~/.claude/projects/-Users-gregory/memory/reference_design_5elements_craft_ssot.md
- E2E 상업성·CRO·WCAG 2.2·KWCAG·모션 성능예산: ~/.claude/projects/-Users-gregory/memory/reference_design_marathon_20260612_e2e_commercial.md
- 디자인 라우터(§4 통합 QA 게이트, §5 dual-call): ~/.claude/projects/-Users-gregory/memory/feedback_design_master_router.md
- 채점 기준 design-critic 9렌즈 45점(렌즈1 ≥4, 총 ≥31 릴리스): ~/.claude/agents/_knowledge/design-critic/expertise_v1.md, v2_application.md, v3_critic_sop.md, v4_usecase_anchors.md
- AI 슬롭 16뿌리(디자인)·24뿌리(마케팅 카피) 사전: ~/.claude/agents/_knowledge/ai-slop-detector/expertise_v1.md

## 3. 도구
- 한국어 문체 게이트(카피 등급 A/B 필수): ~/unjang/_shared/style_gate/ — `python3 style_gate.py scan --gate-only <file>` · 쓰기 지침 WRITING_GUIDE.md · 혼합 문체 BLEND_GUIDE.md + blend_check.py
- 디자인 계측: ~/unjang/_shared/design_measure/ (brief.py 브리프 구조화, color.py 대비·팔레트 계산)
- 사내 디자인 시스템 참조(토큰 명명·brand-voice): ~/unjang/_shared/design-system/ (base.css, brand-voice.md, adjectives.yaml, DESIGN_DEPT.md)
- 사이트 자체 게이트(구현 뒤 반드시 통과): _tools/build_all.sh (빌드 2회 해시 동일), _tools/v2_check.py, _tools/seo_check.py, _tools/guidebook_aeo_check.py, _tools/apply_counts.py --check, _tools/caption_check.py, _tools/deploy_gate.sh
- 렌더 프로브(본 세션이 돌림, Codex 샌드박스는 Chromium 불가): _design/redesign_20260908/audit_probe.mjs
