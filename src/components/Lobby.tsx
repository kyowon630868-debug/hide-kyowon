import { useState } from 'react';
import { hasSupabase } from '../lib/supabase';
import { makeRoomCode } from '../lib/id';
import { assetUrl, CHAR_FRAME, CHAR_NAMES } from '../game/assets';
import type { RoomMode, RoomOptions } from '../types/game';

const CODE_RE = /^[A-Za-z0-9]{4}$/;
const SHEET_W = CHAR_FRAME.width * 6;
const SHEET_H = CHAR_FRAME.height * CHAR_NAMES.length;

export function Lobby({ onEnter }: { onEnter: (opts: RoomOptions) => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [char, setChar] = useState(() => Math.floor(Math.random() * CHAR_NAMES.length));
  const [error, setError] = useState('');

  // 온라인 전용. Supabase 미설정 시에만 로컬로 폴백(개발용).
  const mode: RoomMode = hasSupabase ? 'supabase' : 'local';
  const nick = name.trim();

  function enter(roomCode: string, isHost: boolean) {
    setError('');
    if (!nick) return setError('닉네임을 입력하세요.');
    if (!CODE_RE.test(roomCode)) return setError('방 코드는 영문·숫자 4자리예요.');
    onEnter({ code: roomCode.toUpperCase(), name: nick, mode, isHost, char });
  }

  return (
    <div className="lobby2">
      <div
        className="lobby2__sky"
        style={{ backgroundImage: `url(${assetUrl('bg/lobby-bg.png')})` }}
      />
      <div className="lobby2__vignette" />

      <div className="lobby2__inner">
        <img className="lobby2__logo" src={assetUrl('bg/game-logo.png')} alt="HIDE @ KYOWON" />

        <div className="lobby2__card">
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

          <div className="lobby2__field">
            <span>
              캐릭터 — <b>{CHAR_NAMES[char]}</b>
            </span>
            <div className="charpick">
              {CHAR_NAMES.map((nm, i) => (
                <button
                  key={nm}
                  type="button"
                  title={nm}
                  className={`charpick__slot ${i === char ? 'is-on' : ''}`}
                  onClick={() => setChar(i)}
                >
                  <span
                    className="charpick__sprite"
                    style={{
                      backgroundImage: `url(${assetUrl('characters/chars.png')})`,
                      backgroundSize: `${SHEET_W}px ${SHEET_H}px`,
                      backgroundPosition: `0px -${i * CHAR_FRAME.height}px`,
                    }}
                  />
                  <em>{nm}</em>
                </button>
              ))}
            </div>
          </div>

          <button
            className="lobby2__create"
            disabled={!nick}
            onClick={() => enter(makeRoomCode(), true)}
          >
            방 만들기
            <small>새 방을 열고 코드를 친구에게 공유하세요</small>
          </button>

          <div className="lobby2__or"><span>이미 방이 있다면</span></div>

          <div className="lobby2__join">
            <input
              value={code}
              maxLength={4}
              placeholder="방 코드"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && enter(code, false)}
            />
            <button disabled={!nick || code.length !== 4} onClick={() => enter(code, false)}>
              참가
            </button>
          </div>

          {error && <p className="lobby2__error">{error}</p>}
        </div>

        <p className="lobby2__hint">
          최대 5명 · 술래 1명이 눈을 감고 세는 동안 사무실 곳곳에 숨으세요.
          <br />
          방향키로 이동, <kbd>Shift</kbd>로 질주, <kbd>F</kbd>로 가구 뒤에 숨기.
        </p>
      </div>
    </div>
  );
}
