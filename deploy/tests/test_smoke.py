"""Offline unit tests for deploy/smoke_test.py (the network is mocked).

Run (repo root):  python3 -m unittest discover -s deploy/tests -p 'test_smoke.py'
CI runs it too (.github/workflows/ci-docker.yml).

Covers: public checks pass and login is skipped without credentials; a database that
is not ready fails even if HTTP answers; a protected route that answers 200 to an
anonymous request fails; the session is logged out even if a check fails.
"""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('smoke', Path(__file__).parents[1] / 'smoke_test.py')
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)

ME_ANON = (401, b'{"error":{"code":"UNAUTHENTICATED","message":"Please log in to continue.","details":[]}}', None)


class SmokeTests(unittest.TestCase):
    def response(self, base, path, data=None, cookie=None, csrf=None):
        if path == '/api/auth/me':
            return (200, b'{"user":{"email":"smoke@example.test"},"csrfToken":"c"}', None) if cookie else ME_ANON
        return {
            '/api/health': (200, b'{"status":"ok"}', None),
            '/api/ready': (200, b'{"status":"ok","db":"connected"}', None),
            '/': (200, b'<!doctype html><html></html>', None),
            '/api/auth/login': (200, b'{"user":{},"csrfToken":"csrf-1"}', 'sid=test-session; Path=/; HttpOnly'),
            '/api/auth/logout': (200, b'{"ok":true}', None),
        }[path]

    @patch.dict('os.environ', {}, clear=True)
    def test_public_checks_pass_and_skip_optional_login(self):
        with patch.object(smoke, 'request', side_effect=self.response) as req:
            smoke.check('https://demo.test')
            # Lab 5 gate proof: this deliberately fails on the four expected requests.
            self.assertEqual(req.call_count, 5)

    @patch.dict('os.environ', {}, clear=True)
    def test_db_not_ready_fails_even_when_http_responds(self):
        def disconnected(base, path, **kwargs):
            if path == '/api/ready':
                return (503, b'{"status":"unavailable","db":"disconnected"}', None)
            return self.response(base, path, **kwargs)
        with patch.object(smoke, 'request', side_effect=disconnected), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, '/api/ready'):
                smoke.check('https://demo.test')

    @patch.dict('os.environ', {}, clear=True)
    def test_open_protected_route_fails(self):
        def open_me(base, path, **kwargs):
            if path == '/api/auth/me':
                return (200, b'{"user":{"email":"someone@example.test"}}', None)
            return self.response(base, path, **kwargs)
        with patch.object(smoke, 'request', side_effect=open_me), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, '/api/auth/me'):
                smoke.check('https://demo.test')

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'smoke@example.test', 'SMOKE_PASSWORD': 'test-only'}, clear=True)
    def test_login_uses_cookie_and_csrf_then_logs_out(self):
        with patch.object(smoke, 'request', side_effect=self.response) as req:
            smoke.check('https://demo.test')
        last = req.call_args
        self.assertEqual(last.args[1], '/api/auth/logout')
        self.assertEqual(last.kwargs['cookie'], 'sid=test-session')
        self.assertEqual(last.kwargs['csrf'], 'csrf-1')

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'smoke@example.test', 'SMOKE_PASSWORD': 'test-only'}, clear=True)
    def test_session_is_logged_out_even_if_me_fails(self):
        def broken_me(base, path, data=None, cookie=None, csrf=None):
            if path == '/api/auth/me' and cookie:
                raise ValueError('Broken response')
            return self.response(base, path, data, cookie, csrf)
        with patch.object(smoke, 'request', side_effect=broken_me) as req:
            with self.assertRaisesRegex(RuntimeError, 'Login smoke'):
                smoke.check('https://demo.test')
            self.assertEqual(req.call_args.args[1], '/api/auth/logout')


if __name__ == '__main__':
    unittest.main()
