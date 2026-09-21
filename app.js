import { fetchGym, fetchGymMachineIds, fetchMachinesByIds } from './supabase.js';
import { MUSCLE_ORDER, parseMuscles, primaryMuscle } from './muscles.js';
import { machineImageUrl } from './images.js';
import { brandLogoUrl, brandLabel } from './brandLogos.js';
import { gympickLogoSvg } from './logo.js';
import { storeCtaHtml } from './store.js';
import { openMachineAppModal } from './modal.js';
import { renderMachineDetailHtml, LOCK_MESSAGES } from './detail.js';
import { renderBrandLockedHtml } from './brandScreen.js';
import { watchScrollToEnd, showScrollLockOverlay, hideScrollLockOverlay } from './scrollLock.js';

const root = document.getElementById('root');
const storeCtaBar = document.getElementById('store-cta-bar');

// 하단 고정 앱스토어 연결 바 — 헬스장 조회 성공/실패와 무관하게 항상 표시
if (storeCtaBar) storeCtaBar.innerHTML = storeCtaHtml();

// 화면 전환은 해시 라우팅으로 처리한다:
//   (없음)        → 머신 목록
//   #machine=<id> → 머신 상세보기 (기능 잠금 섹션 포함)
//   #brand=<value>→ 제조사 머신 목록 잠금 화면 (전체 블러 처리)
// 렌더링마다 다시 그려지는 #root에 이벤트 위임으로 한 번만 등록.
let currentGym = null;
let currentMachines = [];
let currentMachineById = new Map();
let currentDetailMachine = null;
let stopListScrollWatch = null;

/** 목록 화면을 벗어날 때(상세/브랜드 화면 진입) 스크롤 최하단 잠금(관찰자/오버레이) 정리 */
function teardownListScrollLock() {
  if (stopListScrollWatch) {
    stopListScrollWatch();
    stopListScrollWatch = null;
  }
  hideScrollLockOverlay();
}

function getRouteFromHash() {
  const hash = window.location.hash;
  let match = hash.match(/^#machine=([^&]+)/);
  if (match) return { view: 'machine', value: decodeURIComponent(match[1]) };
  match = hash.match(/^#brand=([^&]+)/);
  if (match) return { view: 'brand', value: decodeURIComponent(match[1]) };
  return { view: 'list' };
}

function goToDetail(machineId) {
  window.location.hash = `machine=${encodeURIComponent(machineId)}`;
}

function goToBrand(brand) {
  window.location.hash = `brand=${encodeURIComponent(brand)}`;
}

function goToList() {
  if (window.location.hash) {
    history.pushState('', document.title, window.location.pathname + window.location.search);
  }
  currentDetailMachine = null;
  if (currentGym) renderGym(currentGym, currentMachines);
}

function renderDetailView(machineId) {
  const machine = currentMachineById.get(machineId);
  if (!machine) {
    goToList();
    return;
  }
  teardownListScrollLock();
  currentDetailMachine = machine;
  renderState(renderMachineDetailHtml(machine));
  window.scrollTo(0, 0);
}

function renderBrandView(brand) {
  currentDetailMachine = null;
  teardownListScrollLock();
  renderState(renderBrandLockedHtml(brand));
  window.scrollTo(0, 0);
}

function renderRoute() {
  const route = getRouteFromHash();
  if (route.view === 'machine') {
    renderDetailView(route.value);
  } else if (route.view === 'brand') {
    renderBrandView(route.value);
  } else {
    goToList();
  }
}

function handleRootClick(target) {
  const backBtn = target.closest('.detail-close');
  if (backBtn) {
    goToList();
    return;
  }

  const filterBtn = target.closest('.muscle-filter-btn');
  if (filterBtn) {
    const targetSection = document.getElementById(filterBtn.dataset.target);
    if (targetSection) targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const lockedSection = target.closest('.locked-section');
  if (lockedSection) {
    if (currentDetailMachine) {
      openMachineAppModal(currentDetailMachine, LOCK_MESSAGES[lockedSection.dataset.lockType]);
    }
    return;
  }

  // 제조사 로고(헬스장 헤더) / 머신 카드·상세화면의 제조사 로고+텍스트 탭 → 제조사 잠금 화면
  // 로고가 없는 브랜드(NONE/STANDARD)는 data-brand가 없으므로, 그 경우엔 여기서
  // 끝내지 않고 아래로 흘려보내 카드 탭(상세보기 이동)이 정상 동작하게 한다.
  const brandTrigger = target.closest('.brand-logo-chip, .machine-brand-row, .detail-brand-row');
  if (brandTrigger?.dataset.brand) {
    goToBrand(brandTrigger.dataset.brand);
    return;
  }

  const card = target.closest('.machine-card');
  if (card) {
    const machine = currentMachineById.get(card.dataset.machineId);
    if (machine) goToDetail(machine.id);
  }
}

root.addEventListener('click', (e) => handleRootClick(e.target));
root.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  if (!e.target.closest('.machine-card, .brand-logo-chip')) return;
  e.preventDefault();
  handleRootClick(e.target);
});

window.addEventListener('hashchange', renderRoute);

function getGymIdFromPath() {
  // 기대 경로: /gym/:gymId
  const match = window.location.pathname.match(/\/gym\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function renderState(html) {
  root.innerHTML = html;
}

function renderLoading() {
  renderState(`
    <div class="state">
      <div class="spinner" aria-hidden="true"></div>
      <p>불러오는 중...</p>
    </div>
  `);
}

function renderNotFound() {
  renderState(`
    <div class="state">
      <p class="state-title">헬스장을 찾을 수 없어요</p>
      <p class="state-sub">링크가 정확한지 다시 확인해주세요.</p>
    </div>
  `);
}

function renderError() {
  renderState(`
    <div class="state">
      <p class="state-title">잠시 후 다시 시도해주세요</p>
      <p class="state-sub">데이터를 불러오지 못했어요.</p>
    </div>
  `);
}

function machineCardHtml(machine) {
  const muscles = parseMuscles(machine.target_muscle);
  const badges = muscles.map((m) => `<span class="badge">${m}</span>`).join('');
  const img = machineImageUrl(machine.id);
  const logoUrl = brandLogoUrl(machine.brand);
  // 로고가 있는(=실제 제조사가 확인된) 머신만 브랜드 행을 탭해 잠금 화면으로
  // 이동시킨다 — NONE/STANDARD(노브랜드)는 이동 대상에서 제외.
  const brandRowClass = logoUrl ? 'machine-brand-row machine-brand-row--clickable' : 'machine-brand-row';
  const brandRowAttr = logoUrl ? ` data-brand="${machine.brand}"` : '';

  return `
    <li class="machine-card" data-machine-id="${machine.id}" role="button" tabindex="0">
      <div class="machine-thumb">
        <img
          src="${img}"
          alt="${machine.name}"
          loading="lazy"
          onerror="this.closest('.machine-thumb').classList.add('machine-thumb--empty'); this.remove();"
        />
      </div>
      <div class="machine-info">
        <p class="machine-name">${machine.name}</p>
        <div class="${brandRowClass}"${brandRowAttr}>
          ${logoUrl ? `<img class="machine-brand-logo" src="${logoUrl}" alt="" loading="lazy" />` : ''}
          <p class="machine-brand">${brandLabel(machine.brand)}</p>
        </div>
        <div class="badge-row">${badges}</div>
      </div>
    </li>
  `;
}

/** 보유 머신들의 제조사 로고를 중복 없이 나열 (로고가 없는 브랜드/STANDARD는 제외).
 *  각 로고를 탭하면 해당 제조사의 머신 목록 잠금 화면으로 이동한다. */
function brandLogoRowHtml(machines) {
  const seen = new Set();
  const items = [];
  for (const m of machines) {
    const url = brandLogoUrl(m.brand);
    if (url && !seen.has(url)) {
      seen.add(url);
      items.push({ url, brand: m.brand });
    }
  }
  if (items.length === 0) return '';
  return `
    <div class="brand-logo-row">
      ${items
        .map(
          ({ url, brand }) =>
            `<span class="brand-logo-chip" data-brand="${brand}" role="button" tabindex="0"><img src="${url}" alt="" loading="lazy" /></span>`
        )
        .join('')}
    </div>
  `;
}

/** 부위별 보유 머신이 있는 부위만 버튼으로 나열 — 탭하면 해당 부위 섹션으로
 *  스무스 스크롤 이동한다. 부위 개수가 많아 한 줄에 다 안 들어갈 수 있어
 *  가로 스크롤 가능한 한 줄(nav)로 구성. */
function muscleFilterRowHtml(keys) {
  if (keys.length === 0) return '';
  return `
    <nav class="muscle-filter-row" aria-label="부위별 바로가기">
      ${keys
        .map(
          (key) =>
            `<button type="button" class="muscle-filter-btn" data-target="muscle-section-${key}">${key}</button>`
        )
        .join('')}
    </nav>
  `;
}

/** 헤더 최상단: GYMPICK 로고와 안내 문구를 한 줄에 배치 */
function brandLineHtml() {
  return `
    <div class="brand-line">
      ${gympickLogoSvg()}
      <span class="brand-line-text">에서 제공하는 보유 머신 목록입니다.</span>
    </div>
  `;
}

function renderGym(gym, machines) {
  document.title = `[${gym.name}] 보유머신 확인하기`;
  currentGym = gym;
  currentMachines = machines;
  currentMachineById = new Map(machines.map((m) => [String(m.id), m]));
  teardownListScrollLock();

  if (machines.length === 0) {
    renderState(`
      <header class="gym-header">
        ${brandLineHtml()}
        <h1>${gym.name}</h1>
        <p class="gym-location">${gym.location ?? ''}</p>
      </header>
      <div class="state">
        <p class="state-title">아직 등록된 머신이 없어요</p>
      </div>
    `);
    return;
  }

  // 부위별로 그룹핑 후 정해진 순서(MUSCLE_ORDER)대로 섹션 렌더링
  const grouped = new Map();
  for (const m of machines) {
    const key = primaryMuscle(m.target_muscle);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(m);
  }

  const availableKeys = MUSCLE_ORDER.filter((key) => grouped.has(key));

  const sections = availableKeys
    .map((key) => {
      const items = grouped.get(key);
      return `
        <section class="muscle-section" id="muscle-section-${key}">
          <h2 class="muscle-title">${key}<span class="muscle-count">${items.length}</span></h2>
          <ul class="machine-list">
            ${items.map(machineCardHtml).join('')}
          </ul>
        </section>
      `;
    })
    .join('');

  renderState(`
    <header class="gym-header">
      ${brandLineHtml()}
      <h1>${gym.name}</h1>
      <p class="gym-location">${gym.location ?? ''}</p>
      <div class="gym-total-row">
        <p class="gym-total">보유 머신 ${machines.length}대</p>
        ${brandLogoRowHtml(machines)}
      </div>
      <p class="gym-disclaimer">* 실시간 정보가 아니며, 현장의 실제 보유 머신 현황과 다를 수 있어요.</p>
    </header>
    ${muscleFilterRowHtml(availableKeys)}
    ${sections}
    <footer class="page-footer">
      <p>이 페이지는 GymPick 앱의 헬스장 보유 머신 정보를 보여줍니다.</p>
    </footer>
    <div class="list-scroll-sentinel" aria-hidden="true"></div>
  `);

  // 머신 목록을 끝까지 스크롤해서 다 확인한 시점에 앱 다운로드 유도 오버레이 표시.
  // 목록 콘텐츠 자체는 항상 그대로 완전히 공개된 상태 — 이 오버레이는 콘텐츠를
  // 가리는 게 아니라, 페이지 끝에 도달했을 때 한 번 더 유도하는 용도.
  // 머신 수가 적어 페이지가 한 화면에 다 들어오는 경우(스크롤 자체가 필요 없는
  // 경우)에는 진입하자마자 곧바로 잠기는 걸 막기 위해 스크롤이 실제로 가능할
  // 때만 관찰을 등록한다.
  const sentinel = root.querySelector('.list-scroll-sentinel');
  const isScrollable = document.documentElement.scrollHeight > window.innerHeight + 40;
  if (!isScrollable) return;
  stopListScrollWatch = watchScrollToEnd(sentinel, () => {
    showScrollLockOverlay(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

async function main() {
  const gymId = getGymIdFromPath();
  if (!gymId) {
    renderNotFound();
    return;
  }

  renderLoading();

  try {
    const gym = await fetchGym(gymId);
    if (!gym) {
      renderNotFound();
      return;
    }

    const machineIds = await fetchGymMachineIds(gymId);
    const machines = await fetchMachinesByIds(machineIds);
    // 이름순 정렬 (부위 그룹 내 순서)
    machines.sort((a, b) => a.name.localeCompare(b.name));

    renderGym(gym, machines);

    // 새로고침/공유 링크로 상세보기·잠금 화면에 바로 진입한 경우 대응
    const route = getRouteFromHash();
    if (route.view === 'machine') renderDetailView(route.value);
    else if (route.view === 'brand') renderBrandView(route.value);
  } catch (e) {
    console.error(e);
    renderError();
  }
}

main();
