from tests.browser_cdp import CDP
import json
c=CDP();c.sock.settimeout(40);c.call('Page.enable');c.call('Network.setBypassServiceWorker',bypass=True)
c.call('Page.navigate',url='http://127.0.0.1:8765/index.html')
c.wait("document.readyState==='complete' && !document.body.inert")
errors = c.js('window.__errors || []')
print("ERRORS:", errors)
