// 헬스장 보유 머신 목록 화면 — 스크롤 최하단 잠금
//
// 머신 목록(부위별 섹션)을 끝까지 스크롤해서 다 확인한 시점에, 화면 전체를
// 반투명 블러 오버레이로 덮어 앱 다운로드를 유도한다. 목록 자체는 항상 완전히
// 공개(헬스장 홍보 목적)되어 있고, "다 봤을 때" 마지막에 한 번 더 유도하는
// 용도 — 목록 콘텐츠를 가리거나 잠그는 것이 아니다.
import { storeUrl } from './store.js';
import { gympickLogoSvg } from './logo.js';

const LIME = '#c6ff00';
const DEFAULT_MESSAGE =
  '이 헬스장이 보유한 머신을 모두 확인하셨어요.<br />각 머신의 상세 정보는<br />GYMPICK 앱에서 확인하세요.';
const DEFAULT_DISMISS_LABEL = '위로 올라가기';

let overlayEl = null;
let observer = null;

function ensureOverlayEl() {
  if (overlayEl) return overlayEl;

  overlayEl = document.createElement('div');
  overlayEl.className = 'scroll-lock-overlay';
  overlayEl.setAttribute('hidden', '');
  document.body.appendChild(overlayEl);

  return overlayEl;
}

/**
 * onDismiss: 닫기 동작(예: 스크롤을 맨 위로 되돌리기) 콜백.
 * message: 안내 문구(HTML 허용), dismissLabel: 하단 텍스트 버튼 라벨.
 */
export function showScrollLockOverlay(onDismiss, { message, dismissLabel } = {}) {
  const el = ensureOverlayEl();
  el.innerHTML = `
    <div class="scroll-lock-card">
      <span class="scroll-lock-icon" aria-hidden="true">&#128274;</span>
      <p class="scroll-lock-desc">${message || DEFAULT_MESSAGE}</p>
      <a class="scroll-lock-cta" href="${storeUrl()}" target="_blank" rel="noopener">
        ${gympickLogoSvg(LIME, 'scroll-lock-cta-logo')}
        <span>앱에서 계속 보기</span>
      </a>
      <button class="scroll-lock-back" type="button">${dismissLabel || DEFAULT_DISMISS_LABEL}</button>
    </div>
  `;
  el.querySelector('.scroll-lock-back').onclick = () => {
    hideScrollLockOverlay();
    onDismiss?.();
  };

  el.removeAttribute('hidden');
  requestAnimationFrame(() => el.classList.add('scroll-lock-overlay--open'));
  document.body.style.overflow = 'hidden';
}

export function hideScrollLockOverlay() {
  document.body.style.overflow = '';
  if (!overlayEl) return;
  overlayEl.classList.remove('scroll-lock-overlay--open');
  overlayEl.setAttribute('hidden', '');
}

/**
 * sentinelEl이 화면에 들어오면(= 스크롤을 끝까지 내림) onReachEnd 실행.
 * 반환값을 호출하면 관찰을 멈춘다 — 다른 화면으로 전환할 때 정리용.
 */
export function watchScrollToEnd(sentinelEl, onReachEnd) {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (!sentinelEl) return () => {};

  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        onReachEnd();
      }
    },
    { threshold: 0.99 }
  );
  observer.observe(sentinelEl);

  return () => {
    observer?.disconnect();
    observer = null;
  };
}
