/** 이 탭의 플레이어 ID. 탭마다 다르다(sessionStorage) → 창 2개로 2인 테스트 가능 */
export function getPlayerId(): string {
  const KEY = 'hk_player_id';
  try {
    let v = sessionStorage.getItem(KEY);
    if (!v) {
      v = crypto.randomUUID();
      sessionStorage.setItem(KEY, v);
    }
    return v;
  } catch {
    return crypto.randomUUID();
  }
}

/** 헷갈리는 글자(0,O,1,I,L) 뺀 4자리 방 코드 */
export function makeRoomCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
