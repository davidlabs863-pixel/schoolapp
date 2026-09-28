export function getAuthRedirectUrl() {
  const locationObject = typeof window !== 'undefined' ? window.location : (globalThis.location || { origin: 'http://localhost:8000' });
  const origin = locationObject.origin || 'http://localhost:8000';
  return `${origin}/index.html`;
}

export function extractSessionFromUrl() {
  const locationObject = typeof window !== 'undefined' ? window.location : (globalThis.location || { hash: '', search: '' });
  const hash = (locationObject.hash || '').replace(/^#/, '');
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(locationObject.search || '');

  return {
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
    code: queryParams.get('code'),
    error: queryParams.get('error')
  };
}
