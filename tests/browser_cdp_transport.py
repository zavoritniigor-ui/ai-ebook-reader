"""A closed CDP socket must fail promptly instead of spinning forever."""
import json, socket, unittest
from browser_cdp import CDP

class ClosedSocket:
    def __init__(self): self.reads = 0
    def recv(self, count):
        self.reads += 1
        if self.reads > 1: raise AssertionError('reader spun after EOF')
        return b''

class TransportTest(unittest.TestCase):
    def test_eof_raises_connection_error(self):
        client = CDP.__new__(CDP)
        client.sock = ClosedSocket()
        with self.assertRaises(ConnectionError): client.read(2)

    def test_tap_queues_release_before_waiting_for_reply(self):
        client = CDP.__new__(CDP); client.seq = 0; sent = []
        client._send_frame = lambda payload: sent.append(json.loads(payload))
        replies = iter([{'method': 'Page.event'}, {'id': 2, 'result': {}}, {'id': 1, 'result': {}}])
        def read_message():
            self.assertEqual([m['params']['type'] for m in sent], ['touchStart', 'touchEnd'])
            return json.dumps(next(replies)).encode()
        client._read_message = read_message
        client.touch_tap(10, 20)
        self.assertEqual(sent[0]['params']['touchPoints'], [dict(x=10, y=20, id=1)])
        self.assertEqual(sent[1]['params']['touchPoints'], [])

    def test_silent_renderer_times_out_with_recent_events(self):
        class SilentSocket:
            def settimeout(self, value): self.timeout = value
            def recv(self, count): raise socket.timeout()
        client = CDP.__new__(CDP); client.seq = 0; client.sock = SilentSocket()
        client._send_frame = lambda payload: None
        client.RESPONSE_TIMEOUT = 0.01
        with self.assertRaises(TimeoutError): client.call('Runtime.evaluate', expression='1')
        self.assertIsNone(client.sock.timeout)

    def test_renderer_crash_event_fails_fast(self):
        client = CDP.__new__(CDP); client.seq = 0; client._send_frame = lambda payload: None
        client._read_message = lambda: json.dumps({'method': 'Inspector.targetCrashed', 'params': {}}).encode()
        with self.assertRaises(ConnectionError): client.call('Runtime.evaluate', expression='1')

if __name__ == '__main__': unittest.main()
