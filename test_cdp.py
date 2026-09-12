import json
import urllib.request
import time

def send(ws_url, method, params=None):
    import websocket
    ws = websocket.create_connection(ws_url)
    req = json.dumps({"id": 1, "method": method, "params": params or {}})
    ws.send(req)
    res = json.loads(ws.recv())
    ws.close()
    return res

r = urllib.request.urlopen("http://127.0.0.1:9222/json")
targets = json.loads(r.read())
page = [t for t in targets if t['type'] == 'page'][0]
ws_url = page['webSocketDebuggerUrl']

time.sleep(1)
js = "document.getElementById('out').innerText"
res = send(ws_url, "Runtime.evaluate", {"expression": js, "returnByValue": True})
print(res)
