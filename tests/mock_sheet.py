"""Local stand-in for the Apps Script web app (port 4290).
GET ?action=questions -> question tabs built from public/data, the same way setupQuestionTabs() lays them out, plus test edits:
  * Q_L2_equation gets one bad row (does not balance) -> must be skipped and reported
  * Q_L5_targets gets one extra good row (L5-A99)   -> must join the pool
  * Q_L6_shelf is missing                           -> built-in level6_shelf.csv must be used
GET ?class=... -> scores posted to this mock; POST -> stores a score (so tests never touch the real Sheet).
MODE file /tmp/mock_mode: 'ok' (default), 'allbad' (every Level 3 row invalid), 'old' (old script, no tabs), 'slow' (answers after 20 s)."""
import csv, io, json, os, time
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
D = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
TABS = [('Q_L1_baskets', 'level1_baskets.csv'), ('Q_L1_waves', 'level1_waves.csv'), ('Q_L1_concepts', 'level1_concepts.csv'), ('Q_L2_equation', 'level2_equation.csv'),
        ('Q_L3_classify', 'level3_classify.csv'), ('Q_L4_profit', 'level4_profit.csv'), ('Q_L5_targets', 'level5_targets.csv'), ('Q_L6_shelf', 'level6_shelf.csv'), ('Q_L6_ratios', 'level6_ratios.csv')]
SCORES = []
PORT = int(os.environ.get('PORT', '4290')); TAG = os.environ.get('TAG', 'A99')  # TAG makes each mock's extra Level 5 row unique (L5-<TAG>)
MODEFILE = '/tmp/mock_mode' + ('' if PORT == 4290 else '_' + str(PORT))

def tab(values):
    return {'headers': values[0], 'rows': [[i + 2] + r for i, r in enumerate(values[1:]) if ''.join(r).strip()]}

def build():
    tabs = {}
    for name, f in TABS:
        vals = list(csv.reader(io.StringIO(open(os.path.join(D, f), encoding='utf-8-sig').read())))
        tabs[name] = tab(vals)
    t = tabs['Q_L2_equation']; h = t['headers']
    bad = {'id': 'L2-BAD', 'wave': '1', 'subtopic': 'Test', 'prompt': 'TEST bad row: buys machinery for cash', 'effects': 'Machinery:Assets:500|Cash:Assets:-400', 'decoys': '', 'explanation': 'x', 'difficulty': '1', 'active': 'TRUE'}
    t['rows'].append([len(t['rows']) + 3] + [bad.get(k, '') for k in h])
    t = tabs['Q_L5_targets']; h = t['headers']
    extra = {'id': 'L5-' + TAG, 'stage': 'A', 'subtopic': 'Operating', 'text': 'Cash paid for in-flight meals, $1 million', 'correct': 'Operating', 'explanation': 'Paying for meals served to passengers is part of running the airline, so operating.', 'difficulty': '1', 'active': 'TRUE'}
    t['rows'].append([len(t['rows']) + 2] + [extra.get(k, '') for k in h])
    del tabs['Q_L6_shelf']
    s = json.load(open(os.path.join(D, 'level6_slingshot.json'), encoding='utf-8'))
    keys = [r['key'] for r in s['ratios']]
    tabs['Q_L6_sling_ratios'] = tab([['key', 'label', 'unit']] + [[r['key'], r['label'], r.get('unit', '')] for r in s['ratios']])
    cos = [['round_id', 'name', 'ceo', 'colour', 'industry'] + keys]; hd = [['id', 'round_id', 'source', 'text', 'answer', 'category', 'ratio', 'explanation', 'active']]
    for rd in s['rounds']:
        for c in rd['companies']: cos.append([rd['id'], c['name'], c.get('ceo', ''), c.get('colour', ''), s['industry']] + [str(c['ratios'][k]) for k in keys])
        for x in rd['headlines']: hd.append([x['id'], rd['id'], x.get('source', ''), x['text'], x['answer'], x['category'], x['ratio'], x['explanation'], 'TRUE'])
    tabs['Q_L6_sling_companies'] = tab(cos); tabs['Q_L6_sling_headlines'] = tab(hd)
    return tabs

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def send(self, obj):
        b = json.dumps(obj).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        q = parse_qs(urlparse(self.path).query)
        mode = open(MODEFILE).read().strip() if os.path.exists(MODEFILE) else 'ok'
        if q.get('action') == ['questions']:
            if mode == 'slow': time.sleep(20)
            if mode == 'old': return self.send({'ok': True, 'class_code': '', 'rows': []})
            tabs = build()
            if mode == 'allbad':  # every Level 3 row broken -> game must fall back to the built-in file for that tab
                t = tabs['Q_L3_classify']; i = t['headers'].index('correct_5chute')
                for r in t['rows']: r[i + 1] = 'Fixed Asset'
            return self.send({'ok': True, 'tabs': tabs})
        code = q.get('class', [''])[0]
        self.send({'ok': True, 'class_code': code, 'rows': sorted([r for r in SCORES if r.get('class_code') == code], key=lambda r: -r.get('total', 0))})
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0)); d = json.loads(self.rfile.read(n) or b'{}'); SCORES.append(d); self.send({'ok': True})

ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
