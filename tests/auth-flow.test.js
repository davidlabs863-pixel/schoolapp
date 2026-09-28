import assert from 'node:assert/strict';
import { getAuthRedirectUrl, extractSessionFromUrl } from '../js/auth-helpers.js';

const redirect = getAuthRedirectUrl();
assert.match(redirect, /^https?:\/\//);
assert.match(redirect, /\/index\.html$/);

const previousLocation = globalThis.window?.location || globalThis.location;
const previousWindow = globalThis.window;
globalThis.window = {
  location: new URL('https://learn-with-fola-peach.vercel.app/index.html#access_token=abc&refresh_token=xyz')
};
try {
  const parsed = extractSessionFromUrl();
  assert.equal(parsed.accessToken, 'abc');
  assert.equal(parsed.refreshToken, 'xyz');
} finally {
  if (previousWindow) {
    globalThis.window = previousWindow;
  } else {
    delete globalThis.window;
  }
  if (previousLocation) {
    globalThis.location = previousLocation;
  }
}

globalThis.window = {
  location: new URL('https://learn-with-fola-peach.vercel.app/index.html?code=oauth-code')
};
try {
  const parsed = extractSessionFromUrl();
  assert.equal(parsed.code, 'oauth-code');
} finally {
  if (previousWindow) {
    globalThis.window = previousWindow;
  } else {
    delete globalThis.window;
  }
  if (previousLocation) {
    globalThis.location = previousLocation;
  }
}

console.log('auth flow test passed');
