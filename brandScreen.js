// 제조사(브랜드) 머신 목록 잠금 화면
//
// 헬스장 상세 헤더의 브랜드 로고 칩, 또는 머신 카드의 브랜드명(로고+텍스트)을
// 탭하면 이 화면으로 이동한다(#brand=<브랜드값> 해시 라우팅). 해당 브랜드가
// 보유한 머신 목록을 실제로 보여주는 대신, 화면 전체를 블러 처리하고 중앙에
// 잠금 안내를 띄워 앱 다운로드를 유도한다.

import { brandLogoUrl, brandLabel } from './brandLogos.js';

export function renderBrandLockedHtml(brand) {
  const logoUrl = brandLogoUrl(brand);
  const label = brandLabel(brand);

  return `
    <div class="brand-screen">
      <button class="detail-close" type="button" aria-label="닫기">&times;</button>

      <div class="brand-screen-body">
        <div class="brand-blur" aria-hidden="true">
          ${Array.from({ length: 6 })
            .map(() => '<span class="brand-blur-card"></span>')
            .join('')}
        </div>
        <div class="brand-screen-overlay">
          ${
            logoUrl
              ? `<div class="brand-screen-logo-wrap"><img class="brand-screen-logo" src="${logoUrl}" alt="${label}" /></div>`
              : ''
          }
          <p class="brand-screen-desc">${label}의 머신들을 보려면<br />GYMPICK 앱에서 확인하세요.</p>
        </div>
      </div>
    </div>
  `;
}
