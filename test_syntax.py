import urllib.request, json, websocket, sys
r = urllib.request.urlopen("http://127.0.0.1:9222/json")
ws_url = [t for t in json.loads(r.read()) if t['type'] == 'page'][0]['webSocketDebuggerUrl']
ws = websocket.create_connection(ws_url)
def send(m, p=None):
    ws.send(json.dumps({"id": 1, "method": m, "params": p or {}}))
    return json.loads(ws.recv())
with open('js/selection.js') as f: code = f.read()
res = send("Runtime.evaluate", {"expression": code})
if 'exceptionDetails' in res.get('result', {}):
    print(json.dumps(res['result']['exceptionDetails'], indent=2))
    sys.exit(1)
print("Syntax OK")
