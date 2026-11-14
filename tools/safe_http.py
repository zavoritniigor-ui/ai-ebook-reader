"""HTTP for the repository's maintenance tools, without urllib's file://, ftp:// and data: handlers.

urllib.request.urlopen() opens whatever scheme a URL carries, so a URL that ends up pointing at file:///… reads a
local file (Semgrep: python.lang.security.audit.dynamic-urllib-use-detected). The tools only ever need HTTPS to
fixed public hosts, and plain HTTP to the local test server / Chrome on 127.0.0.1, so they use these two instead:

    open_https(url, headers=None, timeout=60)   # an HTTPS response; any other scheme or a redirect to one is refused
    local_http_status(port, path='/', timeout)  # the status of http://127.0.0.1:<port><path>, or None if unreachable
"""
import http.client
import urllib.parse
import urllib.request

# An opener with ONLY what HTTPS needs: the environment's proxy, HTTPS itself, redirects and error handling. No
# FileHandler, FTPHandler, DataHandler or plain HTTPHandler is registered, so no other scheme can be opened even
# through a redirect: UnknownHandler turns it into an error.
_OPENER = urllib.request.OpenerDirector()
for _handler in (urllib.request.ProxyHandler(), urllib.request.HTTPSHandler(), urllib.request.HTTPRedirectHandler(),
                 urllib.request.HTTPDefaultErrorHandler(), urllib.request.HTTPErrorProcessor(),
                 urllib.request.UnknownHandler()):   # any other scheme: URLError «unknown url type», not a silent None
    _OPENER.add_handler(_handler)


def open_https(url, headers=None, timeout=60):
    parts = urllib.parse.urlsplit(url)
    if parts.scheme != 'https' or not parts.hostname:
        raise ValueError('only https:// URLs are fetched: ' + repr(url[:80]))
    return _OPENER.open(urllib.request.Request(url, headers=dict(headers or {})), timeout=timeout)


def local_http_status(port, path='/', timeout=1.0):
    conn = http.client.HTTPConnection('127.0.0.1', int(port), timeout=timeout)
    try:
        conn.request('GET', path)
        return conn.getresponse().status
    except OSError:
        return None
    finally:
        conn.close()
