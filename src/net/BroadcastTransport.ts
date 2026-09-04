import type { Transport, TransportHandlers } from './transport';

type Wire =
  | { t: 'hello'; id: string; name: string }
  | { t: 'welcome'; id: string; name: string; to: string }
  | { t: 'bye'; id: string }
  | { t: 'msg'; id: string; data: unknown };

/**
 * 같은 브라우저의 다른 창/탭끼리만 통신 (BroadcastChannel).
 * Supabase 설정 없이 2인 테스트를 바로 해볼 수 있는 용도.
 */
export class BroadcastTransport implements Transport {
  readonly selfId: string;
  private readonly name: string;
  private readonly channel: BroadcastChannel;
  private handlers: TransportHandlers | null = null;
  private known = new Set<string>();

  constructor(code: string, selfId: string, name: string) {
    this.selfId = selfId;
    this.name = name;
    this.channel = new BroadcastChannel(`hide-kyowon:${code}`);
  }

  async join(handlers: TransportHandlers): Promise<void> {
    this.handlers = handlers;
    this.channel.onmessage = (e: MessageEvent<Wire>) => this.receive(e.data);
    window.addEventListener('beforeunload', this.sayBye);

    handlers.onStatus('joined');
    // 이미 들어와 있는 사람들이 welcome 으로 응답해준다
    this.post({ t: 'hello', id: this.selfId, name: this.name });
  }

  send(data: unknown): void {
    this.post({ t: 'msg', id: this.selfId, data });
  }

  async leave(): Promise<void> {
    this.sayBye();
    window.removeEventListener('beforeunload', this.sayBye);
    this.channel.onmessage = null;
    this.channel.close();
    this.handlers = null;
    this.known.clear();
  }

  private receive(m: Wire) {
    if (!this.handlers || !m || m.id === this.selfId) return;

    switch (m.t) {
      case 'hello':
        this.noticePeer(m.id, m.name);
        // 새로 온 사람에게 나의 존재를 알림
        this.post({ t: 'welcome', id: this.selfId, name: this.name, to: m.id });
        break;
      case 'welcome':
        if (m.to === this.selfId) this.noticePeer(m.id, m.name);
        break;
      case 'bye':
        if (this.known.delete(m.id)) this.handlers.onPeerLeave(m.id);
        break;
      case 'msg':
        this.handlers.onMessage(m.id, m.data);
        break;
    }
  }

  private noticePeer(id: string, name: string) {
    if (this.known.has(id)) return;
    this.known.add(id);
    this.handlers?.onPeerJoin(id, name);
  }

  private post(m: Wire) {
    this.channel.postMessage(m);
  }

  private sayBye = () => {
    this.post({ t: 'bye', id: this.selfId });
  };
}
