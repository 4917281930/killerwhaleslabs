export function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function isSecureRequest(req) {
  const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
  return Boolean(req?.secure || req?.protocol === 'https' || forwardedProto === 'https');
}

export function sessionCookie(token, req) {
  const secure = isSecureRequest(req) ? '; Secure' : '';
  return `kwl_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${secure}`;
}

export function clearSessionCookie(req) {
  const secure = isSecureRequest(req) ? '; Secure' : '';
  return `kwl_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

export function csrfCookie(token, req) {
  const secure = isSecureRequest(req) ? '; Secure' : '';
  return `kwl_csrf=${encodeURIComponent(token)}; SameSite=Lax; Path=/; Max-Age=43200${secure}`;
}

export function clearCsrfCookie(req) {
  const secure = isSecureRequest(req) ? '; Secure' : '';
  return `kwl_csrf=; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

