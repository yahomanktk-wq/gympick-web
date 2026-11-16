// 헬스장 보유머신 웹페이지 — '다른 사람들은 이렇게 운동해요' 오운완 섹션 (2026-10-21)
// 앱 헬스장 상세와 같은 기준/모양:
//   - 공개(is_public) + 헬스장 페이지 노출(show_on_gym) 글만, 최신 6장, 3열 × 2줄, 3:4 비율, 각진 모서리
//   - 사진을 누르면 상세(닉네임·헬스장·사진·운동 루틴) — 루틴은 get_ounwan_routine RPC(공개 글만 반환)
//   - '더보기'는 앱 설치 안내로 연결
// config.js 의 공개 키(publishable)만 사용한다. 리액션은 로그인이 필요해 웹에서는 표시하지 않는다.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { storeCtaHtml } from './store.js';

const LIMIT = 6;

const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── 데이터 ─────────────────────────────────────────────────────────────

async function fetchGymOunwan(gymId) {
  const url =
    `${SUPABASE_URL}/rest/v1/workout_feed_posts` +
    `?gym_id=eq.${encodeURIComponent(gymId)}&is_public=eq.true&show_on_gym=eq.true` +
    `&select=id,nickname,gym_id,gym_name,photo_uri,composite_uri,thumbnail_uri,muscles,created_at` +
    `&order=created_at.desc&limit=${LIMIT}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function fetchRoutine(postId) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_ounwan_routine`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_post_id: postId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && Array.isArray(data.entries) ? data : null;
  } catch {
    return null;
  }
}

// ── 이미지 URL ─────────────────────────────────────────────────────────

/**
 * 오운완 사진 원본 URL → 미리 만들어 둔 WebP 변형 URL.
 * Supabase Image Transformation(render)은 유료 한도를 넘어 쓰지 않는다 — 앱(photoImageUrl.ts)과 같은 규칙.
 *   .../workout-photos/u/s_123.png → .../workout-photos/u/s_123_w1024.webp (그리드) / _w2048.webp (상세)
 * workout-photos 경로가 아니거나, 구 썸네일(_thumb.*)·이미 변형(_w1024/_w2048)이면 그대로 쓴다.
 */
export function photoVariant(url, tier = 'w1024') {
  if (!url) return '';
  if (!url.includes('/storage/v1/object/public/workout-photos/')) return url;
  const clean = url.split('?')[0];
  if (/_(thumb|w1024|w2048)\.[a-z0-9]+$/i.test(clean)) return url;
  const dot = clean.lastIndexOf('.');
  if (dot <= clean.lastIndexOf('/')) return url;
  return `${clean.slice(0, dot)}_${tier}.webp`;
}

/** 그리드 타일 후보: 원본의 _w1024 → thumbnail_uri → 원본 (원본이 없으면 thumbnail_uri만) */
export function tileSources(post) {
  const orig = post.composite_uri || post.photo_uri;
  if (!orig) return [post.thumbnail_uri];
  return [photoVariant(orig, 'w1024'), post.thumbnail_uri, orig];
}

/** 상세 사진 후보: 원본의 _w2048 → 원본 */
export function detailSources(post) {
  const orig = post.composite_uri || post.photo_uri;
  return [photoVariant(orig, 'w2048'), orig];
}

/**
 * 후보 URL 목록 → <img> 속성. 첫 URL을 src로 쓰고, 로드 실패 시 남은 후보를 하나씩 시도한다.
 * 각 후보는 한 번만 쓰이고, 다 떨어지면 onerror를 해제해 무한 반복을 막는다.
 */
export function photoImgAttrs(candidates) {
  const list = [...new Set(candidates.filter(Boolean))];
  if (list.length === 0) return 'src=""';
  const [src, ...rest] = list;
  if (rest.length === 0) return `src="${esc(src)}"`;
  return (
    `src="${esc(src)}" data-fb="${esc(JSON.stringify(rest))}" ` +
    `onerror="var l=JSON.parse(this.dataset.fb||'[]');if(!l.length){this.onerror=null;return;}` +
    `this.src=l.shift();this.dataset.fb=JSON.stringify(l);"`
  );
}

/** 머신 이미지 — 프리웨이트(fw숫자)는 애니메이션 GIF 원본, 그 외는 WebP 원본(800×800) */
function machineImg(machineId) {
  const id = encodeURIComponent(machineId);
  if (/^fw\d+$/i.test(machineId)) {
    return `${SUPABASE_URL}/storage/v1/object/public/machine-images/${id}.gif`;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/machine-images/${id}.webp`;
}

// ── 스타일 (이 섹션 전용, 한 번만 주입) ─────────────────────────────────

const CSS = `
.ow-section { margin: 4px 0 20px; }
.ow-head { display:flex; align-items:center; justify-content:space-between; padding: 0 16px; margin-bottom: 10px; }
.ow-title { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; margin: 0; color: #111; }
.ow-more { background:none; border:0; padding:4px 0; font-size:13px; color:#777; cursor:pointer; display:flex; align-items:center; gap:2px; }
.ow-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 0 16px; }
.ow-tile { position:relative; aspect-ratio: 3 / 4; background:#eee; border:0; padding:0; cursor:pointer; overflow:hidden; }
.ow-tile img { width:100%; height:100%; object-fit:cover; display:block; }
.ow-modal { position:fixed; inset:0; z-index:1000; background:#fff; overflow-y:auto; -webkit-overflow-scrolling:touch; }
.ow-modal-head { position:sticky; top:0; z-index:1; background:#fff; display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #eee; }
.ow-nick { font-size:15px; font-weight:800; color:#111; margin:0 0 4px; }
.ow-gym { font-size:12px; font-weight:600; color:#777; margin:0; }
.ow-gym-link { display:inline-block; text-decoration:none; }
.ow-close { background:none; border:0; font-size:26px; line-height:1; color:#777; cursor:pointer; padding:4px 6px; }
.ow-photo { width:100%; aspect-ratio:3 / 4; object-fit:cover; display:block; background:#eee; }
.ow-body { padding:16px 16px 120px; }
.ow-stats { display:flex; background:#f5f5f5; border-radius:16px; padding:16px 0; margin-bottom:16px; }
.ow-stat { flex:1; text-align:center; }
.ow-stat + .ow-stat { border-left:1px solid #e3e3e3; }
.ow-stat-val { font-size:20px; font-weight:900; color:#111; }
.ow-stat-lab { font-size:10px; font-weight:600; color:#888; margin-top:3px; }
.ow-routine-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; gap:8px; }
.ow-routine-title { font-size:18px; font-weight:700; letter-spacing:-0.3px; margin:0; color:#111; }
.ow-chips { display:flex; flex-wrap:wrap; gap:4px; justify-content:flex-end; }
.ow-chip { font-size:11px; font-weight:700; padding:4px 10px; border-radius:999px; background:var(--lime, #c6ff00); color:#111; }
.ow-card { border:3px solid #111; border-radius:16px; overflow:hidden; background:#fff; }
.ow-card-head { padding:12px 16px; }
.ow-card-row1 { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:2px; }
.ow-card-gym { font-size:15px; font-weight:900; color:#111; letter-spacing:-0.3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ow-card-badge { font-size:10px; font-weight:800; letter-spacing:0.5px; text-transform:uppercase; padding:3px 10px; border-radius:20px; color:#000; white-space:nowrap; }
.ow-card-date { font-size:11px; color:#888; font-weight:500; }
.ow-divider { height:1px; background:#e5e5e5; }
.ow-row { display:flex; align-items:flex-start; gap:10px; padding:12px; }
.ow-row-img { width:64px; height:64px; border-radius:10px; border:1px solid #e5e5e5; overflow:hidden; flex-shrink:0; background:#fff; }
.ow-row-img img { width:100%; height:100%; object-fit:contain; display:block; }
.ow-row-info { flex:1; min-width:0; }
.ow-row-name { font-size:12px; font-weight:700; color:#000; line-height:16px; margin-bottom:4px; word-break:break-word; }
.ow-row-brand { font-size:10px; color:#333; }
.ow-row-sets { text-align:right; min-width:80px; }
.ow-row-set { font-size:11px; font-weight:600; color:#000; line-height:18px; white-space:nowrap; }
.ow-card-foot { padding:10px 16px; text-align:right; font-size:11px; font-weight:900; letter-spacing:1px; color:#000; }
.ow-fallback-chips { display:flex; flex-wrap:wrap; gap:6px; }
.ow-loading { text-align:center; color:#888; font-size:13px; padding:24px 0; }
.ow-app-cta { margin-top:20px; }
`;

export function injectCss() {
  if (document.getElementById('ow-style')) return;
  const style = document.createElement('style');
  style.id = 'ow-style';
  style.textContent = CSS;
  document.head.appendChild(style);
}

// ── 렌더 ────────────────────────────────────────────────────────────────

function tileHtml(post) {
  return `
    <button class="ow-tile" type="button" data-ow-post="${esc(post.id)}" aria-label="오운완 사진 보기">
      <img ${photoImgAttrs(tileSources(post))} alt="" loading="lazy" />
    </button>`;
}

function sectionHtml(posts) {
  return `
    <section class="ow-section">
      <div class="ow-head">
        <h2 class="ow-title">다른 사람들은 이렇게 운동해요</h2>
        <button class="ow-more" type="button" data-ow-more="1">더보기 ›</button>
      </div>
      <div class="ow-grid">${posts.map(tileHtml).join('')}</div>
    </section>`;
}

const ENG_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function fmtDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}(${ENG_DAYS[d.getDay()]})_${p(d.getHours())}:${p(d.getMinutes())}`;
}

function badgeText(routine, chips) {
  const counts = {};
  for (const e of routine.entries) {
    if (e.target_muscle) counts[e.target_muscle] = (counts[e.target_muscle] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([m]) => m);
  const list = sorted.length ? sorted : chips;
  return list.length > 1 ? list.slice(0, 2).join(' + ') : (list[0] || 'WORKOUT');
}

function routineHtml(routine, post) {
  const entries = routine.entries;
  const totalSets = entries.reduce((a, e) => a + (e.sets || []).length, 0);
  const vol = entries.reduce(
    (a, e) => a + (e.sets || []).reduce((b, s) => b + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0),
    0,
  );
  const chips =
    Array.isArray(routine.target_muscles) && routine.target_muscles.length
      ? routine.target_muscles
      : [...new Set(post.muscles || [])];
  const color = routine.overlay_text_color || '#111111';

  const rows = entries
    .map((e, i) => {
      const sets = (e.sets || [])
        .map((s) => `<div class="ow-row-set">${Number(s.weight) > 0 ? `${esc(s.weight)}kg` : '--'} × ${esc(s.reps)}</div>`)
        .join('');
      return `
        ${i > 0 ? '<div class="ow-divider"></div>' : ''}
        <div class="ow-row">
          <div class="ow-row-img"><img src="${esc(machineImg(e.machine_id))}" alt="" loading="lazy" /></div>
          <div class="ow-row-info">
            <div class="ow-row-name">${esc(e.machine_name)}</div>
            <div class="ow-row-brand">${esc(e.machine_brand === 'NONE' ? 'STANDARD' : e.machine_brand)}</div>
          </div>
          <div class="ow-row-sets">${sets}</div>
        </div>`;
    })
    .join('');

  return `
    <div class="ow-stats">
      <div class="ow-stat"><div class="ow-stat-val">${entries.length}</div><div class="ow-stat-lab">운동</div></div>
      <div class="ow-stat"><div class="ow-stat-val">${totalSets}</div><div class="ow-stat-lab">세트</div></div>
      <div class="ow-stat"><div class="ow-stat-val">${vol > 0 ? (vol / 1000).toFixed(1) : '--'}</div><div class="ow-stat-lab">볼륨</div></div>
    </div>
    <div class="ow-routine-head">
      <h3 class="ow-routine-title">운동 루틴</h3>
      <div class="ow-chips">${chips.map((m) => `<span class="ow-chip">${esc(m)}</span>`).join('')}</div>
    </div>
    <div class="ow-card" style="border-color:${esc(color)}">
      <div class="ow-card-head">
        <div class="ow-card-row1">
          <span class="ow-card-gym">${esc(routine.gym_name || post.gym_name)}</span>
          <span class="ow-card-badge" style="background:${esc(color)}">${esc(badgeText(routine, chips))}</span>
        </div>
        <div class="ow-card-date">${esc(fmtDate(routine.date))}</div>
      </div>
      <div class="ow-divider"></div>
      ${rows}
      <div class="ow-divider"></div>
      <div class="ow-card-foot">GYM PICK</div>
    </div>`;
}

function fallbackChipsHtml(post) {
  const ms = [...new Set(post.muscles || [])];
  if (!ms.length) return '';
  return `<div class="ow-fallback-chips">${ms.map((m) => `<span class="ow-chip">${esc(m)}</span>`).join('')}</div>`;
}

// ── 상세 모달 ──────────────────────────────────────────────────────────

let modalEl = null;
let prevOverflow = '';

function closeModal() {
  if (!modalEl) return;
  modalEl.remove();
  modalEl = null;
  document.body.style.overflow = prevOverflow;
  document.removeEventListener('keydown', onKeydown);
}

function onKeydown(e) {
  if (e.key === 'Escape') closeModal();
}

function openShell(innerHtml) {
  closeModal();
  prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  modalEl = document.createElement('div');
  modalEl.className = 'ow-modal';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.innerHTML = innerHtml;
  modalEl.addEventListener('click', (e) => {
    if (e.target.closest('.ow-close')) closeModal();
  });
  document.body.appendChild(modalEl);
  document.addEventListener('keydown', onKeydown);
}

/**
 * 오운완 상세(사진 + 운동 루틴) 모달.
 * options.gymLink: true면 헬스장 이름을 /gym/{gym_id} 링크로 표시 (유저 운동일지 페이지에서 사용).
 */
export async function openPostDetail(post, options = {}) {
  const gymText = esc(post.gym_name);
  const gymHtml =
    options.gymLink && post.gym_id && post.gym_name
      ? `<a class="ow-gym ow-gym-link" href="/gym/${encodeURIComponent(post.gym_id)}">${gymText} ›</a>`
      : `<p class="ow-gym">${gymText}</p>`;
  openShell(`
    <div class="ow-modal-head">
      <div>
        <p class="ow-nick">${esc(post.nickname)}</p>
        ${gymHtml}
      </div>
      <button class="ow-close" type="button" aria-label="닫기">×</button>
    </div>
    <img class="ow-photo" ${photoImgAttrs(detailSources(post))} alt="오운완 사진" />
    <div class="ow-body">
      <div class="ow-routine-slot"><div class="ow-loading">운동 루틴 불러오는 중…</div></div>
      <div class="ow-app-cta">${storeCtaHtml()}</div>
    </div>
  `);
  const current = modalEl;
  const routine = await fetchRoutine(post.id);
  if (!modalEl || modalEl !== current) return; // 그 사이 닫힘
  const slot = modalEl.querySelector('.ow-routine-slot');
  if (slot) slot.innerHTML = routine ? routineHtml(routine, post) : fallbackChipsHtml(post);
}

function openAppGuide() {
  openShell(`
    <div class="ow-modal-head">
      <div><p class="ow-nick">GymPick 앱에서 더 보기</p></div>
      <button class="ow-close" type="button" aria-label="닫기">×</button>
    </div>
    <div class="ow-body">
      <p style="font-size:14px;color:#333;line-height:1.6;margin:0 0 16px">
        이 헬스장의 오운완과 운동 루틴은 GymPick 앱에서 모두 볼 수 있어요.
      </p>
      ${storeCtaHtml()}
    </div>
  `);
}

// ── 진입점 ─────────────────────────────────────────────────────────────

/**
 * container(빈 요소)에 오운완 섹션을 채운다. 공개 오운완이 없거나 실패하면 아무것도 그리지 않는다.
 * renderGym()이 다시 그려질 때마다 호출해도 된다.
 */
export async function mountOunwanSection(container, gymId) {
  if (!container || !gymId) return;
  let posts = [];
  try {
    posts = await fetchGymOunwan(gymId);
  } catch {
    posts = [];
  }
  if (!container.isConnected || posts.length === 0) return;

  injectCss();
  container.innerHTML = sectionHtml(posts);
  container.addEventListener('click', (e) => {
    // 2026-10-26: 사진을 탭하면 상세(루틴) 모달 대신 바로 앱 다운로드 안내로
    // 연결한다 (기존 다른 잠금 섹션들과 동일한 패턴).
    if (e.target.closest('[data-ow-post]')) {
      openAppGuide();
      return;
    }
    if (e.target.closest('[data-ow-more]')) openAppGuide();
  });
}
