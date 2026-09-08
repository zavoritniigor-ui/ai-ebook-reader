"""A closed CDP socket must fail promptly instead of spinning forever."""
import json, unittest
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

if __name__ == '__main__': unittest.main()
