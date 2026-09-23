"""TEMPORARY CI bisect for the pdf_ux_browser.py renderer stall (PR #122). Not a test suite; removed after use.
Runs tests/pdf_ux_browser.py with one branch feature neutralised at document start (READER_UX_VARIANT)."""
import os, runpy, sys
sys.path.insert(0, os.path.dirname(__file__))
import browser_cdp

VARIANTS = {
    'V0': '',
    'V1': "addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='.footer-nav-group{backdrop-filter:none!important}';document.head.append(s)})",
    'V2': "addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='footer#app-footer{display:none!important}';document.head.append(s)})",
    'V3': "addEventListener('load',()=>{window.updatePdfWorkspaceLayout=()=>{}; try{pdfPanelObserver.disconnect()}catch(e){}})",
    'V4': "addEventListener('load',()=>{window.syncActiveThumbnail=()=>{}; window.schedulePrefetchWindow=()=>{}})",
}
src = VARIANTS[os.environ.get('READER_UX_VARIANT', 'V0')]
orig_init = browser_cdp.CDP.__init__
def patched(self, *a, **k):
    orig_init(self, *a, **k)
    if src: self.call('Page.enable'); self.call('Page.addScriptToEvaluateOnNewDocument', source=src)
browser_cdp.CDP.__init__ = patched
runpy.run_path(os.path.join(os.path.dirname(__file__), 'pdf_ux_browser.py'), run_name='__main__')
