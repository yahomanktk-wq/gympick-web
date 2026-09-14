// 머신 썸네일 이미지 URL (Supabase Storage Image Transformation API)
import { SUPABASE_URL } from './config.js';

export function machineImageUrl(machineId, { width = 160, height = 160, quality = 75 } = {}) {
  return `${SUPABASE_URL}/storage/v1/render/image/public/machine-images/${machineId}.webp?width=${width}&height=${height}&quality=${quality}`;
}
