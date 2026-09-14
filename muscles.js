// 타겟부위 표시 규칙 — GymPick 앱과 동일하게 대문자 영어(CHEST/BACK/LEGS/
// SHOULDERS/ARMS/GLUTES/OTHER)로 표시하고, "Chest, Shoulder"처럼 콤마로
// 여러 부위가 들어간 값도 각각 분리해서 보여준다 (앱의 parseMuscles() 규칙과 동일).

export const MUSCLE_ORDER = ['CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'GLUTES', 'OTHER'];

const MUSCLE_LABELS = {
  chest: 'CHEST',
  back: 'BACK',
  leg: 'LEGS',
  legs: 'LEGS',
  shoulder: 'SHOULDERS',
  shoulders: 'SHOULDERS',
  arm: 'ARMS',
  arms: 'ARMS',
  glute: 'GLUTES',
  glutes: 'GLUTES',
  other: 'OTHER',
};

/** "Chest, Shoulder" → ['CHEST', 'SHOULDERS'] */
export function parseMuscles(targetMuscle) {
  return (targetMuscle ?? '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter(Boolean)
    .map((m) => MUSCLE_LABELS[m] ?? m.toUpperCase());
}

/** 머신의 대표(첫 번째) 부위 — 섹션 그룹핑용. */
export function primaryMuscle(targetMuscle) {
  return parseMuscles(targetMuscle)[0] ?? 'OTHER';
}
