// 유저 운동일지 공유 링크(/u/:code) 미리보기 메타 — api/gym.js와 같은 방식.
// vercel.json rewrite로 /u/:code 요청이 이 함수로 들어오고, 정적 journal.html의
// og:title·og:description·og:image만 사용자별로 바꿔서 내려준다.
// 화면 자체는 journal.js가 브라우저에서 같은 RPC를 호출해 그린다.
// 공개(publishable/anon) 키만 사용 — service_role 키 사용 금지.

const SUPABASE_URL = 'https://okrouzqqvfioodfieljv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_f3GrrwmhqQFyuI_1wQV6zw_Q6kF27qI';

const CODE_RE = /^[a-z0-9]{6,12}$/;
const DEFAULT_TITLE = '짐픽 운동일지 | GymPick';
const DEFAULT_DESCRIPTION = '짐픽에서 운동일지와 오운완 기록을 확인해 보세요';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** ounwan.js photoVariant와 같은 규칙 — 원본 → 미리 만든 _w1024.webp 변형 (변형이 아니면 null) */
function w1024Variant(url) {
  if (!url || !url.includes('/storage/v1/object/public/workout-photos/')) return null;
  const clean = url.split('?')[0];
  if (/_w1024\.webp$/i.test(clean)) return clean;
  if (/_(thumb|w2048)\.[a-z0-9]+$/i.test(clean)) return null;
  const dot = clean.lastIndexOf('.');
  if (dot <= clean.lastIndexOf('/')) return null;
  return `${clean.slice(0, dot)}_w1024.webp`;
}

/** 변형 파일이 아직 안 만들어진 글도 있어(Storage 404/400) 실제로 있는지 확인한다. */
async function urlExists(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/** 없는 코드/실패 → null */
async function fetchPublicJournal(code) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_journal`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_code: code }),
    });
    if (!res.ok) return null;
    return (await res.json()) ?? null;
  } catch (e) {
    return null;
  }
}

const FALLBACK_HTML = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0a0a0c" />
    <meta name="color-scheme" content="dark" />
    <title>__TITLE__</title>
    <meta name="description" content="__DESCRIPTION__" />
    <meta property="og:title" content="__TITLE__" />
    <meta property="og:description" content="__DESCRIPTION__" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="__OG_IMAGE__" />
    <link rel="stylesheet" href="/styles.css" />
    <link rel="stylesheet" href="/journal.css" />
  </head>
  <body>
    <div id="root"><div class="state"><p>불러오는 중...</p></div></div>
    <div id="store-cta-bar"></div>
    <script type="module" src="/journal.js"></script>
  </body>
</html>`;

module.exports = async (req, res) => {
  const code = (req.query.code || '').toString();
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;

  const data = CODE_RE.test(code) ? await fetchPublicJournal(code) : null;

  const defaultImage = `${proto}://${host}/og-image.png`;
  let title = DEFAULT_TITLE;
  let description = DEFAULT_DESCRIPTION;
  let ogImage = defaultImage;
  if (data && data.nickname) {
    title = `${data.nickname}님의 운동일지 | GymPick`;
    if (data.is_private) {
      description = '비공개 운동일지예요';
    } else {
      description = `짐픽에서 ${data.nickname}님의 오운완 기록을 확인해 보세요`;
      const latest = Array.isArray(data.posts) ? data.posts[0] : null;
      if (latest) {
        const variant = w1024Variant(latest.composite_uri || latest.photo_uri);
        if (variant && (await urlExists(variant))) ogImage = variant;
      }
    }
  }
  const pageUrl = `${proto}://${host}/u/${encodeURIComponent(code)}`;

  let html;
  try {
    const templateRes = await fetch(`${proto}://${host}/journal.html`);
    if (!templateRes.ok) throw new Error(`template ${templateRes.status}`);
    html = await templateRes.text();

    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(
        /<meta name="description"[^>]*\/>/,
        `<meta name="description" content="${escapeHtml(description)}" />`
      )
      .replace(
        /<meta property="og:title"[^>]*\/>/,
        `<meta property="og:title" content="${escapeHtml(title)}" />`
      )
      .replace(
        /<meta property="og:description"[^>]*\/>/,
        `<meta property="og:description" content="${escapeHtml(description)}" />`
      )
      .replace(
        /<meta property="og:image"[^>]*\/>/,
        `<meta property="og:image" content="${escapeHtml(ogImage)}" />`
      )
      .replace('</head>', `<meta property="og:url" content="${escapeHtml(pageUrl)}" /></head>`);
  } catch (e) {
    html = FALLBACK_HTML.replace(/__TITLE__/g, escapeHtml(title))
      .replace(/__DESCRIPTION__/g, escapeHtml(description))
      .replace(/__OG_IMAGE__/g, escapeHtml(ogImage));
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // 공개/비공개 전환이 빨리 반영되도록 헬스장 페이지보다 짧게 캐시
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
  res.status(200).send(html);
};
