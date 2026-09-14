// 머신 상세보기 화면
//
// 머신 카드를 탭하면 이 화면으로 이동한다(#machine=<id> 해시 라우팅).
// 머신 기본 정보(이름/제조사/타겟부위)는 그대로 보여주되,
// 아래 두 섹션은 블러 처리된 잠금(paywall) 상태로 보여주고
// 탭하면 앱 다운로드 유도 모달을 띄운다:
//   - 이 머신을 보유한 다른 헬스장
//   - 머신 리뷰
// (machines 테이블에 별도 설명 필드가 없어, 위 두 항목을 "기능 잠금" 대상으로 선택함)

import { machineImageUrl } from './images.js';
import { brandLogoUrl, brandLabel } from './brandLogos.js';
import { parseMuscles } from './muscles.js';

/** 잠금 섹션 타입별 메시지 — app.js에서 모달을 열 때 이 타입으로 문구를 고른다. */
export const LOCK_MESSAGES = {
  gyms: '이 머신을 보유한 다른 헬스장 정보는<br />GYMPICK 앱에서 확인할 수 있어요.',
  reviews: '실제 이용자들이 남긴 머신 리뷰는<br />GYMPICK 앱에서 확인할 수 있어요.',
};

function lockedSectionHtml(type, title, desc) {
  return `
    <section class="locked-section" data-lock-type="${type}">
      <h2 class="locked-title">${title}</h2>
      <div class="locked-body">
        <div class="locked-blur" aria-hidden="true">
          <span class="locked-blur-line"></span>
          <span class="locked-blur-line"></span>
          <span class="locked-blur-line locked-blur-line--short"></span>
        </div>
        <div class="locked-overlay">
          <span class="locked-icon" aria-hidden="true">&#128274;</span>
          <p class="locked-desc">${desc}</p>
        </div>
      </div>
    </section>
  `;
}

export function renderMachineDetailHtml(machine) {
  const muscles = parseMuscles(machine.target_muscle);
  const badges = muscles.map((m) => `<span class="badge">${m}</span>`).join('');
  const img = machineImageUrl(machine.id, { width: 400, height: 400 });
  const logoUrl = brandLogoUrl(machine.brand);

  return `
    <div class="detail-screen">
      <button class="detail-close" type="button" aria-label="닫기">&times;</button>

      <div class="detail-thumb">
        <img
          src="${img}"
          alt="${machine.name}"
          onerror="this.closest('.detail-thumb').classList.add('detail-thumb--empty'); this.remove();"
        />
      </div>

      <h1 class="detail-name">${machine.name}</h1>
      <div class="${logoUrl ? 'detail-brand-row detail-brand-row--clickable' : 'detail-brand-row'}"${
        logoUrl ? ` data-brand="${machine.brand}"` : ''
      }>
        ${logoUrl ? `<img class="detail-brand-logo" src="${logoUrl}" alt="" loading="lazy" />` : ''}
        <span class="detail-brand">${brandLabel(machine.brand)}</span>
      </div>
      <div class="badge-row">${badges}</div>

      ${lockedSectionHtml('gyms', '이 머신 보유 헬스장', '이 머신을 보유한 다른 헬스장들을<br />GYMPICK 앱에서 확인하세요.')}
      ${lockedSectionHtml('reviews', '머신 리뷰', '실제 이용자들이 남긴 솔직한 리뷰를<br />GYMPICK 앱에서 확인하세요.')}
    </div>
  `;
}
