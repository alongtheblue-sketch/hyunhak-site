#!/usr/bin/env python3
# regress 프로브 집계: r2→r3(shots_all), r2→재촬영(shots_again), r3→재촬영, A/B(수리 전 c2adf08 → 후 87106d8, 결정론 조건) 를 면별 한 줄로 묶는다.
# 분류는 눈으로 본 결과를 CLASS 표에 적은 것(근거 = diff/pair, diff_again_vs_r2/pair, diff_ab/pair 의 crop).
import json, os, time
H = os.path.dirname(os.path.abspath(__file__))
L = lambda f: json.load(open(os.path.join(H, f)))["pairs"]
r3, ag, aa, ab = L("regress.json"), L("regress_again_vs_r2.json"), L("regress_again_vs_all.json"), L("regress_ab.json")
def ae(r):
    if r is None: return None
    if r.get("same_size", True) and "ae" in r: return r["ae"]
    return f"top{r['top']['ae']}/bot{r['bottom']['ae']}"
def size(r, k): return "x".join(map(str, r[k])) if r and k in r else "?"
CLASS = {
 "about_1440": "b 영상 프레임(y3433-4000 브랜드 영상). 재촬영 r3 대비 13035 로 변동, A/B(영상 숨김) 0",
 "about_390": "b 영상 프레임(y4605-4802)+글자 안티에일리어싱. 재촬영 r3 대비 59788 로 변동, A/B 0",
 "guidebook_index_390": "b 朱 점 안티에일리어싱 8px+2px. 재촬영이 r2 와 같아짐(0)",
 "index_nopop_1440": "b 영상 프레임(y2457-2729 x740-1224). 대학 목록 #find(y1380-1922) crop 차이 0, A/B 0",
 "index_popup_1440": "b 팝업 자동 넘김(r3 = 2/2, r2 = 1/2). 재촬영이 r2 와 같아짐(0)",
 "index_popup_390": "0 (재촬영에서는 자동 넘김으로 66456 = b)",
 "interview_390": "b 안티에일리어싱 13px. 재촬영이 r2 와 같아짐(0)",
 "join_1440": "a 약관 행 수리: 광고성 동의 행 체크박스가 글자 옆으로(행 높이 -31px). 위정렬 차이 시작 y1119, 아래정렬 차이 끝 y1172. 재촬영 r3 대비 0, A/B 같은 수치",
 "join_390": "0 (기준 join_390 은 08:53 수리 뒤 재촬영본). A/B 3746→3684 = a 약관 5행",
 "lectures_1440": "b 페이지 둥근 모서리와 朱 점 안티에일리어싱 30px(5회 재촬영 모두 30, studio_1440 은 반대 방향으로 뒤집힘), A/B 0 = 수리 무관",
 "library_1440": "b lazy 표지 썸네일 14개 로드 여부. 재촬영이 r2 와 같아짐(0)",
 "pastexam_390": "b 朱 점 안티에일리어싱 8px(5회 재촬영 모두 8, guidebook_index_390 에서 같은 점이 되돌아감), A/B 0 = 수리 무관",
 "programs_guidebook_1440": "a #books 링크 담기→구매할 상품 고르기 724px + b lazy 표본 면 로드 여부(143446, 재촬영 rep2 는 r2 대비 724 만 남음). A/B 724 만",
 "programs_guidebook_390": "a #books 링크 724px + b lazy 표본 면(재촬영은 r2 대비 724 만). A/B 724 만",
 "studio_1440": "b 둥근 모서리 안티에일리어싱 10px. 재촬영이 r2 와 같아짐(0)",
 "faq_1440": "0 (재촬영에서만 둥근 모서리 10px = b)",
 "faq_390": "0 (재촬영에서만 2px = b)",
 "interview_1440": "0 (재촬영에서만 둥근 모서리와 朱 점 36px = b)",
 "notice_1440": "0 (재촬영에서만 행사 띠 가격 글자 229px = b)",
 "programs_studio_1440": "0 (재촬영에서만 lazy 표본 면 로드 161320 = b)",
 "programs_studio_390": "0. A/B 의 차이는 표본 이미지 축소 안티에일리어싱(수리 후 판끼리 반복 촬영도 2644 차이 = b)",
}
rows = []
for k in sorted(r3):
    a, g, x, b = r3[k], ag.get(k), aa.get(k), ab.get(k)
    base_m = time.strftime("%H:%M:%S", time.localtime(a["base_mtime"])) if "base_mtime" in a else "-"
    cls = CLASS.get(k, "0" if ae(a) == 0 else "?")
    rows.append({"name": k, "base_mtime": base_m, "size_r2": size(a, "base_size"), "size_r3": size(a, "new_size"),
                 "ae_r2_r3": ae(a), "ae_r2_again": ae(g), "ae_r3_again": ae(x), "ae_ab": ae(b), "class": cls})
for extra in ("index_tiles_1440", "index_tiles_390"):
    rows.append({"name": extra, "ae_ab": ae(ab.get(extra)), "class": "A/B 요소 캡처(#tiles)"})
json.dump(rows, open(os.path.join(H, "regress_summary.json"), "w"), ensure_ascii=False, indent=1)
for r in rows:
    print(f"{r['name']}\tr2 {r.get('base_mtime','')}\t{r.get('size_r2','')}->{r.get('size_r3','')}\tr2→r3 {r.get('ae_r2_r3')}\tr2→재 {r.get('ae_r2_again')}\tr3→재 {r.get('ae_r3_again')}\tA/B {r.get('ae_ab')}\t{r['class']}")
