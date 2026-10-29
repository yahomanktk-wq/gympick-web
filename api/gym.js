// 카카오톡/문자 등으로 링크를 공유했을 때 미리보기(og:title 등)에
// 실제 헬스장 이름이 뜨도록, 정적 index.html을 그대로 서빙하지 않고
// 이 서버리스 함수를 거쳐 메타 태그만 헬스장별로 바꿔서 내려준다.
//
// vercel.json의 rewrite로 /gym/:gymId, /g/:code(짧은 코드), /:slug(영문 이름)
// 요청이 이 함수로 들어온다. 주소창은 짧은 주소 그대로 두고, 찾은 헬스장 id를
// <meta name="gympick:gym-id">로 넣어주면 app.js가 그 id로 화면을 그린다.
// (/gym/:gymId는 meta가 없어도 app.js가 pathname에서 id를 읽는다.)

const SUPABASE_URL = 'https://okrouzqqvfioodfieljv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_f3GrrwmhqQFyuI_1wQV6zw_Q6kF27qI';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CODE_RE = /^[23456789abcdefghjkmnpqrstuvwxyz]{6}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

// column: 'id' | 'short_code' | 'slug'. 없으면 null, 있으면 { id, name }.
async function fetchGym(column, value) {
  if (!value) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/gyms?${column}=eq.${encodeURIComponent(value)}&select=id,name`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0] ?? null;
  } catch (e) {
    return null;
  }
}

const FALLBACK_HTML = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>__TITLE__</title>
    <meta name="description" content="__DESCRIPTION__" />
    <meta property="og:title" content="__TITLE__" />
    <meta property="og:description" content="__DESCRIPTION__" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="__OG_IMAGE__" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div id="root"><div class="state"><p>불러오는 중...</p></div></div>
    <div id="store-cta-bar"></div>
    <script type="module" src="/app.js"></script>
  </body>
</html>`;

module.exports = async (req, res) => {
  const gymId = (req.query.gymId || '').toString();
  const code = (req.query.code || '').toString();
  const slug = (req.query.slug || '').toString();
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;

  // 요청된 주소 형태에 맞춰 조회 컬럼과 og:url 경로를 정한다.
  let gym = null;
  let pagePath;
  if (gymId) {
    gym = await fetchGym('id', gymId);
    pagePath = `/gym/${encodeURIComponent(gymId)}`;
  } else if (code) {
    if (CODE_RE.test(code)) gym = await fetchGym('short_code', code);
    pagePath = `/g/${encodeURIComponent(code)}`;
  } else {
    if (SLUG_RE.test(slug)) gym = await fetchGym('slug', slug);
    pagePath = `/${encodeURIComponent(slug)}`;
  }

  const gymName = gym?.name ?? null;
  const title = gymName ? `[${gymName}] 보유머신 확인하기` : '[GymPick] 보유머신 확인하기';
  const description = "'짐픽'을 통해 보유머신을 확인하세요.";
  const ogImage = `${proto}://${host}/og-image.png`;
  const pageUrl = `${proto}://${host}${pagePath}`;
  const gymIdMeta = gym?.id
    ? `<meta name="gympick:gym-id" content="${escapeHtml(gym.id)}" />`
    : '';

  let html;
  try {
    const templateRes = await fetch(`${proto}://${host}/index.html`);
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
      .replace(
        '</head>',
        `<meta property="og:url" content="${escapeHtml(pageUrl)}" />${gymIdMeta}</head>`
      );
  } catch (e) {
    html = FALLBACK_HTML.replace(/__TITLE__/g, escapeHtml(title))
      .replace(/__DESCRIPTION__/g, escapeHtml(description))
      .replace(/__OG_IMAGE__/g, escapeHtml(ogImage))
      .replace('</head>', `${gymIdMeta}</head>`);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
  res.status(200).send(html);
};
