# 로컬 렌더 하네스용 /api/config 모킹 (라이브 2026-09-22 22:1x 실측값 사본, 행사 prm_2609_30 활성). 읽기 전용, 포트 8799 = app.js 의 localhost 분기.
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
CFG = {"provider":"portone","portoneStoreId":"store-test","portoneChannelKey":"channel-test","testMode":True,"idvEnabled":False,"oauth":{"google":True,"kakao":True,"naver":True},"promo":{"id":"prm_2609_30","label":"9월 30일까지 전 상품 30% 할인","rate":30,"starts_at":None,"ends_at":"2026-09-30T14:59:59.000Z"}}
class H(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', self.headers.get('Origin') or 'http://localhost:8092'); self.send_header('Access-Control-Allow-Credentials','true'); self.send_header('Access-Control-Allow-Headers','*'); self.send_header('Vary','Origin'); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_OPTIONS(self): self._send(204, {})
    def do_GET(self):
        if self.path.startswith('/api/config'):
            import os, copy
            c = copy.deepcopy(CFG)
            if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'promo_off')): c['promo'] = None   # 행사 종료 상태 렌더용 토글 파일
            return self._send(200, c)
        if self.path.startswith('/api/notices'): return self._send(200, {"items":[]})
        return self._send(404, {"error":"mock"})
    def do_POST(self): return self._send(404, {"error":"mock"})
    def log_message(self, *a): pass
HTTPServer(('127.0.0.1', 8799), H).serve_forever()
