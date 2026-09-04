import { useState } from 'react';
import { hasSupabase } from '../lib/supabase';
import { makeRoomCode } from '../lib/id';
import type { RoomMode, RoomOptions } from '../types/game';

const CODE_RE = /^[A-Za-z0-9]{4}$/;

export function Lobby({ onEnter }: { onEnter: (opts: RoomOptions) => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<RoomMode>(hasSupabase ? 'supabase' : 'local');
  const [error, setError] = useState('');

  const nick = name.trim();

  function enter(roomCode: string, isHost: boolean) {
    if (!nick) return setError('닉네임을 입력하세요.');
    if (!CODE_RE.test(roomCode)) return setError('방 코드는 영문/숫자 4자리입니다.');
    onEnter({ code: roomCode.toUpperCase(), name: nick, mode, isHost });
  }

  return (
    <div className="lobby">
      <h1 className="lobby__title">HIDE @ KYOWON</h1>
      <p className="lobby__sub">회사에서 벌어지는 숨바꼭질 · Phase 2 (2인 실시간)</p>

      <label className="field">
        <span>닉네임</span>
        <input
          value={name}
          maxLength={12}
          placeholder="예: 기획하는사람"
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <fieldset className="field">
        <span>접속 방식</span>
        <label className="radio">
          <input
            type="radio"
            checked={mode === 'supabase'}
            disabled={!hasSupabase}
            onChange={() => setMode('supabase')}
          />
          온라인 — 다른 기기·다른 브라우저 {!hasSupabase && '(.env 설정 필요)'}
        </label>
        <label className="radio">
          <input
            type="radio"
            checked={mode === 'local'}
            onChange={() => setMode('local')}
          />
          로컬 — 같은 브라우저에서 창 2개로 테스트
        </label>
      </fieldset>

      <div className="lobby__actions">
        <button className="btn btn--primary" onClick={() => enter(makeRoomCode(), true)}>
          방 만들기 (방장)
        </button>
        <div className="join">
          <input
            value={code}
            maxLength={4}
            placeholder="코드"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && enter(code, false)}
          />
          <button className="btn" onClick={() => enter(code, false)}>
            방 참가
          </button>
        </div>
      </div>

      {error && <p className="lobby__error">{error}</p>}
    </div>
  );
}
