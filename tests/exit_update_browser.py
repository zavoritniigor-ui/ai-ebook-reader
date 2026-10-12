"""The exit (door) button first checks for an app update: with a new version it restarts straight into it; without one it saves
state and tries to close the window. No network."""
import os, time
from browser_cdp import CDP

URL = os.environ.get('READER_TEST_URL', 'http://127.0.0.1:8765/index.html')
c = CDP(); c.sock.settimeout(60)
c.call('Page.enable'); c.call('Runtime.enable'); c.call('Network.setBypassServiceWorker', bypass=True)
c.call('Page.navigate', url=URL)
c.wait("document.readyState==='complete' && !document.body.inert && typeof exitApp==='function'", timeout=30)


def check(name, expression):
    result = c.js(expression)
    assert result is True, (name, result)
    print('PASS', name, flush=True)


c.js("window.__marker = 1; window.__closed = 0; window.close = () => { __closed++; }; swRegistration = {installing: null, waiting: null, update: async () => {}}; 1")
c.js("exitApp(); 1"); time.sleep(1.5)
check('1 no update: the window close is attempted and the app is NOT reloaded', "__closed === 1 && window.__marker === 1")
c.js("swRegistration = {installing: null, waiting: null, update: async function () { this.installing = {}; setTimeout(() => navigator.serviceWorker.dispatchEvent(new Event('controllerchange')), 150); }}; 1")
c.js("exitApp(); 1"); time.sleep(3)
c.wait("document.readyState==='complete' && typeof exitApp==='function'", timeout=20)
check('2 a new version: the app restarts into it (page reloaded, no close)', "window.__marker === undefined")
print('ALL PASS')
