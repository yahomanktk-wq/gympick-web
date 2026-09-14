// 앱스토어 연결 버튼 — 기기별로 알맞은 스토어로 연결
import { PLAY_STORE_URL, APP_STORE_URL } from './config.js';
import { gympickLogoSvg } from './logo.js';

// 앱 컬러 시스템의 라임그린 (styles.css --lime과 동일 값)
const LIME = '#c6ff00';

export function storeUrl() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  if (isIOS) return APP_STORE_URL;
  return PLAY_STORE_URL;
}

export function storeCtaHtml() {
  return `
    <a class="store-cta" href="${storeUrl()}" target="_blank" rel="noopener">
      ${gympickLogoSvg(LIME, 'store-cta-logo')}
      <span>앱에서 보기</span>
    </a>
  `;
}
