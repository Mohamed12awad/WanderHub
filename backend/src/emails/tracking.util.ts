function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Plain-text body → safe HTML paragraphs. */
export function bodyToHtml(body: string): string {
  return escHtml(body).replace(/\n/g, '<br>');
}

/**
 * Wraps an email body in the NawaHub template, rewrites outbound links through
 * the click tracker, and appends a 1x1 open-tracking pixel.
 */
export function instrumentEmail(opts: {
  trackId: string;
  baseUrl: string;
  subject: string;
  bodyHtml: string;
}): string {
  const { trackId, baseUrl, subject, bodyHtml } = opts;
  const rewritten = bodyHtml.replace(
    /href="(https?:\/\/[^"]+)"/g,
    (_m, url) => `href="${baseUrl}/api/track/c/${trackId}?u=${encodeURIComponent(url)}"`,
  );
  const pixel = `<img src="${baseUrl}/api/track/o/${trackId}" width="1" height="1" alt="" style="display:none" />`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;border:1px solid #e4e4e7">
      <tr><td style="background:#0f172a;padding:16px 28px"><span style="color:#fff;font-weight:600">NawaHub</span></td></tr>
      <tr><td style="padding:28px;font-size:14px;color:#27272a;line-height:1.6">
        <h1 style="margin:0 0 16px;font-size:17px;color:#09090b">${escHtml(subject)}</h1>
        ${rewritten}
      </td></tr>
    </table>
  </td></tr></table>
  ${pixel}
</body></html>`;
}
