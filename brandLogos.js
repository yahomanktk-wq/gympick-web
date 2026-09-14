// 브랜드 로고 매핑
//
// 앱(React Native)의 src/constants/brandLogos.ts와 동일한 규칙:
// 키 = 브랜드명을 대문자로 바꾸고 공백을 언더바로 치환한 값.
// 사용: brandLogoFile(machine.brand.toUpperCase().replace(/\s+/g, '_'))

const BRAND_LOGO_FILES = {
  ARSENAL: 'ARSENAL.png',
  ATLANTIS: 'ATLANTIS.png',
  BODY_MASTER: 'BODY_MASTER.png',
  BOOTY_BUILDER: 'BOOTY_BUILDER.png',
  CITADEL: 'CITADEL.png',
  CROSS_AXES_TECH: 'CROSS_AXES_TECH.png',
  CYBEX: 'CYBEX.png',
  DEFIANT_STRENGTH: 'DEFIANT_STRENGTH.png',
  DRAX: 'DRAX.png',
  DYNA_BODY: 'DYNA_BODY.png',
  DYNAMIC: 'DYNAMIC.png',
  FLEX_FITNESS: 'FLEX_FITNESS.png',
  FLEX_LEVERAGE: 'FLEX_LEVERAGE.png',
  FORWARD: 'FORWARD.png',
  FREEMOTION: 'FREEMOTION.png',
  GLUTEBUILDER: 'GLUTEBUILDER.png',
  GYM80: 'GYM80.png',
  GYMLECO: 'GYMLECO.png',
  HAMMER_STRENGTH: 'HAMMER_STRENGTH.png',
  HOIST: 'HOIST.png',
  ICARIAN: 'ICARIAN.png',
  IMAGINE_STRENGTH: 'Imagine_strength.png',
  INTENZA: 'INTENZA.png',
  IRON_CORE: 'IRON_CORE.png',
  KING_STRENGTH: 'KING_STRENGTH.png',
  LEGEND_FITNESS: 'LEGEND_FITNESS.png',
  LEXCO: 'LEXCO.png',
  LIFE_FITNESS: 'LIFE_FITNESS.png',
  MAGNUM: 'MAGNUM.png',
  MATRIX: 'MATRIX.png',
  MAXPUMP: 'MAXPUMP.png',
  MEGAMASS: 'Megamass.png',
  NAUTILUS: 'NAUTILUS.png',
  NEBULA: 'NEBULA.png',
  NEWTECH: 'NEWTECH.png',
  PANATTA: 'PANATTA.png',
  PARAMOUNT: 'PARAMOUNT.png',
  POWER_LIFT: 'POWER_LIFT.png',
  PRECOR: 'PRECOR.png',
  PRIME: 'PRIME.png',
  REAL_READER_USA: 'REAL_READER_USA.png',
  REPCON: 'REPCON.png',
  ROGERS: 'ROGERS.png',
  ROSEN: 'ROSEN.png',
  SALUS: 'SALUS.png',
  SEGYM: 'SEGYM.png',
  SINCO: 'SINCO.png',
  SOUTHERN_STRENGTH: 'SOUTHERN_STRENGTH.png',
  STAR_TRAC: 'STAR_TRAC.png',
  STRIVE: 'STRIVE.png',
  TECHNOGYM: 'TECHNOGYM.png',
  TELJU: 'TELJU.png',
  TRUE: 'TRUE.png',
  USP: 'USP.png',
  WATSON: 'WATSON.png',
};

/** brand: machines.brand 원본 값 (예: "Life Fitness", "NONE"). 없으면 null 반환. */
export function brandLogoUrl(brand) {
  if (!brand || brand === 'NONE') return null;
  const key = brand.toUpperCase().replace(/\s+/g, '_');
  const file = BRAND_LOGO_FILES[key];
  return file ? `/assets/brand-logos/${file}` : null;
}

/**
 * 화면에 표시할 브랜드명.
 * 앱과 동일한 규칙: 노브랜드(매니저 직접등록) 카탈로그는 DB에 brand='NONE'으로
 * 저장되지만 화면에는 'STANDARD'로 표시한다.
 */
export function brandLabel(brand) {
  return brand === 'NONE' ? 'STANDARD' : brand;
}
