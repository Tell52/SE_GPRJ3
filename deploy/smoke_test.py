"""Public deployment checks for Event Planner. Passwords and cookies are never printed.

WHAT THIS SCRIPT DOES
    Called by .github/workflows/deploy.yml after a deployment:
        python3 deploy/smoke_test.py SERVICE_URL
    It checks the live service and exits non-zero (failing the workflow) if any
    check fails. Each public check is retried up to 5 times, 3 seconds apart, to
    tolerate Cloud Run cold starts. Read-only: it creates no events or registrations.

    Checks (in order)
      1. GET /api/health   -> 200 {"status": "ok"}
      2. GET /api/ready    -> 200 {"db": "connected"}       (proves the database works)
      3. GET /             -> HTML page                      (the built React app is served)
      4. GET /api/auth/me  -> 401 UNAUTHENTICATED (JSON)     (API routes and access control are live)
      5. OPTIONAL login    -> login, /api/auth/me, logout. Runs only if BOTH
         SMOKE_EMAIL and SMOKE_PASSWORD are set (set both or neither). Event Planner
         uses a session cookie (sid) and a CSRF token, not a bearer token. The
         session is always logged out, even if a check fails.

Uses only the Python standard library. Offline unit tests: deploy/tests/test_smoke.py
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request


# --- HTTP helper --------------------------------------------------------------
# Returns (status, body bytes, Set-Cookie header). HTTP error statuses are returned,
# not raised, so a check can expect 401. Network errors and timeouts still raise.
def request(base, path, data=None, cookie=None, csrf=None):
    headers = {}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    if cookie:
        headers['Cookie'] = cookie
    if csrf:
        headers['X-CSRF-Token'] = csrf
    req = urllib.request.Request(base + path, headers=headers,
        data=json.dumps(data).encode() if data is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status, response.read(), response.headers.get('Set-Cookie')
    except urllib.error.HTTPError as error:
        return error.code, error.read(), error.headers.get('Set-Cookie')


def _json(body):
    return json.loads(body or b'{}')


def check(base):
    # --- Public checks -------------------------------------------------------
    for path, predicate in (
        ('/api/health', lambda s, b: s == 200 and _json(b).get('status') == 'ok'),
        ('/api/ready', lambda s, b: s == 200 and _json(b).get('db') == 'connected'),
        ('/', lambda s, b: s == 200 and b'<html' in b.lower()),
        ('/api/auth/me', lambda s, b: s == 401 and _json(b).get('error', {}).get('code') == 'UNAUTHENTICATED'),
    ):
        # Retry: a cold Cloud Run instance may need a few seconds to start.
        for attempt in range(5):
            try:
                status, body, _ = request(base, path)
                if not predicate(status, body):
                    raise ValueError('Unexpected response')
                break
            except (urllib.error.URLError, TimeoutError, ValueError):
                if attempt == 4:
                    raise RuntimeError('Smoke check failed: ' + path) from None
                time.sleep(3)
        print('PASS ' + path)

    # --- Optional login check (only when both credentials are provided) -------
    email, password = os.getenv('SMOKE_EMAIL'), os.getenv('SMOKE_PASSWORD')
    if bool(email) != bool(password):
        raise RuntimeError('Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.')
    if not email:
        print('SKIP login: optional smoke credentials not configured')
        return
    cookie = csrf = None
    try:
        status, body, set_cookie = request(base, '/api/auth/login', {'email': email, 'password': password})
        if status != 200 or not set_cookie or not set_cookie.startswith('sid='):
            raise ValueError('Login refused')
        cookie = set_cookie.split(';', 1)[0]
        csrf = _json(body)['csrfToken']
        status, body, _ = request(base, '/api/auth/me', cookie=cookie)
        if status != 200 or _json(body).get('user', {}).get('email') != email.lower():
            raise ValueError('Session not recognised')
        print('PASS login and authenticated /api/auth/me')
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError):
        raise RuntimeError('Login smoke check failed') from None
    finally:
        # Always end the session, even when a check above failed.
        if cookie:
            request(base, '/api/auth/logout', data={}, cookie=cookie, csrf=csrf)
            print('PASS logout')


# --- Entry point ----------------------------------------------------------------
if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL')
    check(sys.argv[1].rstrip('/'))