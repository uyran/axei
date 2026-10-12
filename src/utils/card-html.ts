const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;

export const TABLE_2X2_HTML = `
  <table class="find-table">
    <tbody>
      <tr><td><br></td><td><br></td></tr>
      <tr><td><br></td><td><br></td></tr>
    </tbody>
  </table>
  <p><br></p>
`;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function normalizeCardContent(content: string): string {
  if (content.trim() === '') {
    return '';
  }
  if (HTML_TAG_PATTERN.test(content)) {
    return content;
  }

  const lines = content.split(/\r?\n/);
  const firstLine = escapeHtml(lines.shift() ?? '') || '<br>';
  const remaining = lines
    .map((line) => `<p>${escapeHtml(line) || '<br>'}</p>`)
    .join('');

  return `<h1>${firstLine}</h1>${remaining}`;
}
