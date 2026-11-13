// 머신 썸네일 이미지 URL — Supabase Image Transformation(유료 한도 초과) 대신 원본(800×800 WebP) 사용
import { SUPABASE_URL } from './config.js';

// 크기 옵션은 기존 호출처 호환용으로 받기만 하고 무시한다.
export function machineImageUrl(machineId, _options = {}) {
  return `${SUPABASE_URL}/storage/v1/object/public/machine-images/${machineId}.webp`;
}
