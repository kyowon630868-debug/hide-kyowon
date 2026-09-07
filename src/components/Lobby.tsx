import { useState } from 'react';
import { hasSupabase } from '../lib/supabase';
import { makeRoomCode } from '../lib/id';
import { assetUrl } from '../game/assets';
import type { RoomMode, RoomOptions } from '../types/game';

const CODE_RE = /^[A-Za-z0-9]{4}$/;

export function Lobby({ onEnter }: { onEnter: (opts: RoomOptions) => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<RoomMode>(hasSupabase ? 'supabase' : 'local');
  const [error, setError] = useState('');

  const nick = name.trim();

  function enter(roomCode: string, isHost: boolean) {
    setError('');
    if (!nick) return setError('닉네임을 입력하세요.');
    if (!CODE_RE.test(roomCode)) return setError('방 코드는 영문/숫자 4자리입니다.');
    onEnter({ code: roomCode.toUpperCase(), name: nick, mode, isHost });
  }

  return (
    <div className="lobby2">
      <div className="lobby2__sky" style={{ backgroundImage: `url(${assetUrl('bg/window-namsan.png')})` }} />
      <div className="lobby2__vignette" />

      <div className="lobby2__inner">
        <header className="lobby2__head">
          <h1 className="lobby2__title">
            HIDE <span>@</span> KYOWON
          </h1>
          <p className="lobby2__tag">회사에서 벌어지는 짜릿한 숨바꼭질</p>
        </header>

        <div className="lobby2__card">
          <div
            className="lobby2__chibi"
            style={{ backgroundImage: `url(${assetUrl('characters/chibi.png')})` }}
          />

          <label className="lobby2__field">
            <span>닉네임</span>
            <input
              value={name}
              maxLength={12}
              placeholder="예: 기획하는사람"
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enter(makeRoomCode(), true)}
            />
          </label>

          <button className="lobby2__create" onClick={() => enter(makeRoomCode(), true)}>
            방 만들기
            <small>내가 방장이 됩니다</small>
          </button>

          <div className="lobby2__or">또는</div>

          <div className="lobby2__join">
            <input
              value={code}
              maxLength={4}
              placeholder="코드 4자리"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && enter(code, false)}
            />
            <button onClick={() => enter(code, false)}>참가</button>
          </div>

          <div className="lobby2__mode">
            <button
              className={mode === 'local' ? 'is-on' : ''}
              onClick={() => setMode('local')}
            >
              로컬 (같은 브라우저 창 2개)
            </button>
            <button
              className={mode === 'supabase' ? 'is-on' : ''}
              disabled={!hasSupabase}
              onClick={() => setMode('supabase')}
            >
              온라인 (다른 기기){!hasSupabase && ' · .env 필요'}
            </button>
          </div>

          {error && <p className="lobby2__error">{error}</p>}
        </div>

        <p className="lobby2__hint">
          술래 1명이 눈을 감고 세는 동안 건물 곳곳에 숨으세요. 엘리베이터로 층을 옮길 수도 있습니다.
        </p>
      </div>
    </div>
  );
}
