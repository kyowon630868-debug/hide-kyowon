import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Transport, TransportHandlers } from './transport';

interface PresenceMeta {
  name: string;
  [key: string]: unknown;
}

/**
 * Supabase Realtime 기반. 다른 브라우저·다른 기기끼리 통신.
 * - Broadcast: 이동 등 자주 바뀌는 메시지
 * - Presence : 지금 방에 누가 있는지
 */
export class SupabaseTransport implements Transport {
  readonly selfId: string;
  private readonly name: string;
  private readonly code: string;
  private channel: RealtimeChannel | null = null;
  private handlers: TransportHandlers | null = null;
  private present = new Set<string>();

  constructor(code: string, selfId: string, name: string) {
    this.code = code;
    this.selfId = selfId;
    this.name = name;
  }

  async join(handlers: TransportHandlers): Promise<void> {
    if (!supabase) throw new Error('Supabase 미설정');
    this.handlers = handlers;
    handlers.onStatus('connecting');

    const channel = supabase.channel(`room:${this.code}`, {
      config: {
        broadcast: { self: false },
        presence: { key: this.selfId },
      },
    });
    this.channel = channel;

    channel.on('broadcast', { event: 'move' }, ({ payload }) => {
      const p = payload as { id: string; data: unknown };
      if (p.id !== this.selfId) handlers.onMessage(p.id, p.data);
    });

    channel.on('presence', { event: 'sync' }, () => this.syncPresence());

    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          handlers.onStatus('joined');
          channel.track({ name: this.name } satisfies PresenceMeta);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          handlers.onStatus('error');
          resolve();
        }
      });
    });
  }

  send(data: unknown): void {
    this.channel?.send({
      type: 'broadcast',
      event: 'move',
      payload: { id: this.selfId, data },
    });
  }

  async leave(): Promise<void> {
    if (this.channel) {
      await supabase?.removeChannel(this.channel);
      this.channel = null;
    }
    this.handlers = null;
    this.present.clear();
  }

  /** presence state 전체를 받아 이전 상태와 비교 → join/leave 콜백 */
  private syncPresence() {
    if (!this.channel || !this.handlers) return;
    const state = this.channel.presenceState<PresenceMeta>();

    const now = new Map<string, string>();
    for (const [id, metas] of Object.entries(state)) {
      const name = metas[0]?.name ?? '손님';
      now.set(id, name);
    }

    for (const [id, name] of now) {
      if (id !== this.selfId && !this.present.has(id)) {
        this.present.add(id);
        this.handlers.onPeerJoin(id, name);
      }
    }
    for (const id of [...this.present]) {
      if (!now.has(id)) {
        this.present.delete(id);
        this.handlers.onPeerLeave(id);
      }
    }
  }
}
