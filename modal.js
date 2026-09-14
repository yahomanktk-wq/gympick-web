// 머신 카드를 탭했을 때 뜨는 "앱에서 보기" 유도 모달 (바텀시트)
import { storeUrl } from './store.js';
import { gympickLogoSvg } from './logo.js';
import { machineImageUrl } from './images.js';
import { brandLogoUrl, brandLabel } from './brandLogos.js';

const LIME = '#c6ff00';

let modalEl = null;
let closeTimer = null;

function ensureModalEl() {
  if (modalEl) return modalEl;

  modalEl = document.createElement('div');
  modalEl.className = 'app-modal-overlay';
  modalEl.setAttribute('hidden', '');
  modalEl.innerHTML = `
    <div class="app-modal-sheet" role="dialog" aria-modal="true" aria-label="앱에서 보기">
      <button class="app-modal-close" type="button" aria-label="닫기">&times;</button>
      <div class="app-modal-body"></div>
    </div>
  `;
  document.body.appendChild(modalEl);

  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) closeMachineModal();
  });
  modalEl.querySelector('.app-modal-close').addEventListener('click', closeMachineModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMachineModal();
  });

  return modalEl;
}

const DEFAULT_MESSAGE =
  '머신 상세 정보와 보유 중인 헬스장 정보는<br />GYMPICK 앱에서 확인할 수 있어요.';

/**
 * machine: 안내할 머신
 * message: 잠금 섹션별로 다른 문구를 보여주고 싶을 때 전달 (없으면 기본 문구)
 */
export function openMachineAppModal(machine, message) {
  const el = ensureModalEl();
  clearTimeout(closeTimer);

  const img = machineImageUrl(machine.id, { width: 140, height: 140 });
  const logoUrl = brandLogoUrl(machine.brand);

  const body = el.querySelector('.app-modal-body');
  body.innerHTML = `
    <div class="app-modal-machine-row">
      <div class="app-modal-machine-thumb">
        <img
          src="${img}"
          alt="${machine.name}"
          loading="lazy"
          onerror="this.closest('.app-modal-machine-thumb').classList.add('app-modal-machine-thumb--empty'); this.remove();"
        />
      </div>
      <div class="app-modal-machine-info">
        <p class="app-modal-machine">${machine.name}</p>
        <div class="app-modal-machine-brand-row">
          ${logoUrl ? `<img class="app-modal-machine-brand-logo" src="${logoUrl}" alt="" loading="lazy" />` : ''}
          <p class="app-modal-machine-brand">${brandLabel(machine.brand)}</p>
        </div>
      </div>
    </div>
    <p class="app-modal-desc">${message || DEFAULT_MESSAGE}</p>
    <a class="app-modal-cta" href="${storeUrl()}" target="_blank" rel="noopener">
      ${gympickLogoSvg(LIME, 'app-modal-cta-logo')}
      <span>앱에서 보기</span>
    </a>
  `;

  el.removeAttribute('hidden');
  // 트랜지션 적용을 위해 다음 프레임에 open 클래스 추가
  requestAnimationFrame(() => el.classList.add('app-modal-overlay--open'));
  document.body.style.overflow = 'hidden';
}

export function closeMachineModal() {
  if (!modalEl) return;
  modalEl.classList.remove('app-modal-overlay--open');
  document.body.style.overflow = '';
  closeTimer = setTimeout(() => modalEl.setAttribute('hidden', ''), 220);
}
