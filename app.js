import { fetchGym, fetchGymMachineIds, fetchMachinesByIds } from './supabase.js';
import { MUSCLE_ORDER, parseMuscles, primaryMuscle } from './muscles.js';
import { SUPABASE_URL } from './config.js';
import { brandLogoUrl } from './brandLogos.js';
import { gympickLogoSvg } from './logo.js';
import { storeCtaHtml } from './store.js';

const root = document.getElementById('root');
const storeCtaBar = document.getElementById('store-cta-bar');

// 하단 고정 앱스토어 연결 바 — 헬스장 조회 성공/실패와 무관하게 항상 표시
if (storeCtaBar) storeCtaBar.innerHTML = storeCtaHtml();

function machineImageUrl(machineId) {
  return `${SUPABASE_URL}/storage/v1/render/image/public/machine-images/${machineId}.webp?width=160&height=160&quality=75`;
}

function brandLabel(brand) {
  // 앱과 동일한 규칙: 노브랜드(매니저 직접등록) 카탈로그는 DB에 brand='NONE'으로
  // 저장되지만 화면에는 'STANDARD'로 표시한다.
  return brand === 'NONE' ? 'STANDARD' : brand;
}

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

  return `
    <li class="machine-card">
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
        <div class="machine-brand-row">
          ${logoUrl ? `<img class="machine-brand-logo" src="${logoUrl}" alt="" loading="lazy" />` : ''}
          <p class="machine-brand">${brandLabel(machine.brand)}</p>
        </div>
        <div class="badge-row">${badges}</div>
      </div>
    </li>
  `;
}

/** 보유 머신들의 제조사 로고를 중복 없이 나열 (로고가 없는 브랜드/STANDARD는 제외) */
function brandLogoRowHtml(machines) {
  const seen = new Set();
  const urls = [];
  for (const m of machines) {
    const url = brandLogoUrl(m.brand);
    if (url && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  if (urls.length === 0) return '';
  return `
    <div class="brand-logo-row">
      ${urls
        .map((url) => `<span class="brand-logo-chip"><img src="${url}" alt="" loading="lazy" /></span>`)
        .join('')}
    </div>
  `;
}

function renderGym(gym, machines) {
  document.title = `${gym.name} 보유머신`;

  if (machines.length === 0) {
    renderState(`
      <header class="gym-header">
        ${gympickLogoSvg()}
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

  const sections = MUSCLE_ORDER.filter((key) => grouped.has(key))
    .map((key) => {
      const items = grouped.get(key);
      return `
        <section class="muscle-section">
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
      ${gympickLogoSvg()}
      <h1>${gym.name}</h1>
      <p class="gym-location">${gym.location ?? ''}</p>
      <div class="gym-total-row">
        <p class="gym-total">보유 머신 ${machines.length}대</p>
        ${brandLogoRowHtml(machines)}
      </div>
    </header>
    ${sections}
    <footer class="page-footer">
      <p>이 페이지는 GymPick 앱의 헬스장 보유 머신 정보를 보여줍니다.</p>
    </footer>
  `);
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
  } catch (e) {
    console.error(e);
    renderError();
  }
}

main();
