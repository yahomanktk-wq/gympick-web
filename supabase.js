// Supabase REST 조회 헬퍼 — supabase-js SDK 없이 fetch()만으로 필요한
// 읽기 전용 쿼리 3개만 구현 (번들 크기/의존성 최소화 목적).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

async function restGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase 요청 실패 (${res.status})`);
  }
  return res.json();
}

/** 헬스장 기본 정보 조회. 없으면 null. */
export async function fetchGym(gymId) {
  const rows = await restGet(
    `gyms?id=eq.${encodeURIComponent(gymId)}&select=id,name,location`
  );
  return rows[0] ?? null;
}

/** 해당 헬스장이 보유한 머신 id 목록. */
export async function fetchGymMachineIds(gymId) {
  const rows = await restGet(
    `gym_machines?gym_id=eq.${encodeURIComponent(gymId)}&select=machine_id`
  );
  return rows.map((r) => r.machine_id);
}

/** id 목록에 해당하는 머신 상세 정보 조회. */
export async function fetchMachinesByIds(ids) {
  if (!ids.length) return [];
  const idList = ids.map(encodeURIComponent).join(',');
  return restGet(
    `machines?id=in.(${idList})&select=id,name,brand,target_muscle,line`
  );
}
