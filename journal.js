// 유저 운동일지 공유 페이지 — https://gympick.app/u/{코드}
//
// 짐픽 앱 운동일지 탭의 "운동일지 공유" 링크를 앱 없이 열었을 때 보이는 화면.
// get_public_journal RPC(anon 호출 가능)로 닉네임·프로필 사진·공개 오운완을 받아
// 앱 운동일지와 같은 "주별 줄"(월~일 7칸, 가로 스크롤)로 그린다.
// 사진/상세 보기는 헬스장 페이지 오운완(ounwan.js)의 함수를 그대로 재사용한다.
// config.js 의 공개 키(publishable)만 사용한다.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { gympickLogoSvg } from './logo.js';
import { storeCtaHtml } from './store.js';
import { esc, tileSources, photoImgAttrs, injectCss, openPostDetail } from './ounwan.js';
import { buildWeeks } from './journalWeeks.js';

const CODE_RE = /^[a-z0-9]{6,12}$/;

const root = document.getElementById('root');
const storeCtaBar = document.getElementById('store-cta-bar');

// 하단 고정 앱 설치 버튼 — 헬스장 페이지와 동일
if (storeCtaBar) storeCtaBar.innerHTML = storeCtaHtml();

// ── 데이터 ─────────────────────────────────────────────────────────────

function getCodeFromPath() {
  const match = window.location.pathname.match(/^\/u\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/** 없는 코드 → null, 실패 → throw */
async function fetchPublicJournal(code) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_journal`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_code: code }),
  });
  if (!res.ok) throw new Error(`Supabase 요청 실패 (${res.status})`);
  return res.json();
}

// ── 아이콘 ─────────────────────────────────────────────────────────────

const PERSON_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.4 0-8 2.2-8 5v1.5c0 .3.2.5.5.5h15c.3 0 .5-.2.5-.5V19c0-2.8-3.6-5-8-5Z"/></svg>`;

const LOCK_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 9h-1V7a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V7Zm3 9.7V18h-2v-1.3a1.5 1.5 0 1 1 2 0Z"/></svg>`;

// ── 렌더 ────────────────────────────────────────────────────────────────

function render(html) {
  root.innerHTML = html;
}

function logoHtml() {
  return `<div class="jn-logo">${gympickLogoSvg()}</div>`;
}

function profileHtml(data) {
  const avatar = data.avatar_url
    ? `<img src="${esc(data.avatar_url)}" alt="" onerror="this.parentNode.classList.add('jn-avatar--empty');this.remove();" />`
    : '';
  return `
    <header class="jn-header">
      ${logoHtml()}
      <div class="jn-profile">
        <div class="jn-avatar${data.avatar_url ? '' : ' jn-avatar--empty'}">${avatar}${PERSON_ICON}</div>
        <div class="jn-profile-text">
          <h1 class="jn-nick">${esc(data.nickname)}</h1>
          <p class="jn-sub">짐픽 운동일지</p>
        </div>
      </div>
    </header>`;
}

function footerHtml() {
  return `
    <footer class="page-footer jn-footer">
      <p>짐픽 앱에서 운동을 기록하고 오운완을 공유해 보세요</p>
    </footer>`;
}

function stateHtml(title, sub, icon = '') {
  return `
    <div class="state">
      ${icon ? `<div class="jn-state-icon">${icon}</div>` : ''}
      <p class="state-title">${esc(title)}</p>
      ${sub ? `<p class="state-sub">${esc(sub)}</p>` : ''}
    </div>`;
}

function renderLoading() {
  render(`
    ${logoHtml()}
    <div class="state">
      <div class="spinner" aria-hidden="true"></div>
      <p>불러오는 중...</p>
    </div>`);
}

function renderNotFound() {
  document.title = '짐픽 운동일지 | GymPick';
  render(`
    ${logoHtml()}
    ${stateHtml('찾을 수 없는 링크예요', '링크가 잘못됐거나 더 이상 사용할 수 없어요.')}
    ${footerHtml()}`);
}

function renderError() {
  render(`
    ${logoHtml()}
    ${stateHtml('잠시 후 다시 시도해주세요', '데이터를 불러오지 못했어요.')}
    ${footerHtml()}`);
}

function dayCellHtml(day) {
  const cls = ['jn-cell'];
  if (day.isToday) cls.push('jn-cell--today');
  if (day.isFuture) cls.push('jn-cell--future');

  if (day.post) {
    cls.push('jn-cell--photo');
    return `
      <button class="${cls.join(' ')}" type="button" data-jn-post="${esc(day.post.id)}"
        aria-label="${day.date.getMonth() + 1}월 ${day.dayNum}일 오운완 보기">
        <img ${photoImgAttrs(tileSources(day.post))} alt="" loading="lazy" />
      </button>`;
  }
  return `
    <div class="${cls.join(' ')}">
      <span class="jn-cell-num">${day.dayNum}</span>
      <span class="jn-cell-wd">${day.weekday}</span>
    </div>`;
}

function weeksHtml(weeks) {
  return weeks
    .map(
      (w) => `
      <section class="jn-week">
        <h2 class="jn-week-head"><span class="jn-week-no">${esc(w.week)}</span><span class="jn-week-range">${esc(w.range)}</span></h2>
        <div class="jn-row">${w.days.map(dayCellHtml).join('')}</div>
      </section>`
    )
    .join('');
}

let postById = new Map();
let nickname = '';

function renderJournal(data) {
  nickname = data.nickname ?? '';
  document.title = `${nickname}님의 운동일지 | GymPick`;

  if (data.is_private) {
    render(`
      ${profileHtml(data)}
      ${stateHtml('비공개 운동일지예요', '이 사용자는 운동일지를 공개하지 않았어요.', LOCK_ICON)}
      ${footerHtml()}`);
    return;
  }

  const posts = Array.isArray(data.posts) ? data.posts : [];
  if (posts.length === 0) {
    render(`
      ${profileHtml(data)}
      ${stateHtml('아직 공개된 오운완이 없어요', '')}
      ${footerHtml()}`);
    return;
  }

  postById = new Map(posts.map((p) => [String(p.id), p]));
  render(`
    ${profileHtml(data)}
    <div class="jn-weeks">${weeksHtml(buildWeeks(posts))}</div>
    ${footerHtml()}`);
}

// 사진 칸 → 헬스장 페이지 오운완과 같은 상세 보기 (헬스장 이름은 /gym/{id} 링크)
root.addEventListener('click', (e) => {
  const cell = e.target.closest('[data-jn-post]');
  if (!cell) return;
  const post = postById.get(cell.dataset.jnPost);
  if (!post) return;
  injectCss();
  openPostDetail({ ...post, nickname }, { gymLink: true });
});

async function main() {
  const code = getCodeFromPath();
  if (!code || !CODE_RE.test(code)) {
    renderNotFound();
    return;
  }

  renderLoading();
  try {
    const data = await fetchPublicJournal(code);
    if (!data) {
      renderNotFound();
      return;
    }
    renderJournal(data);
  } catch (e) {
    console.error(e);
    renderError();
  }
}

main();
