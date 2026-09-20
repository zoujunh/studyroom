import type { AnimFrame } from './types';

/**
 * TCP 三次握手 / 四次挥手的时序图数据。
 * 只描述"发了什么报文、双方状态变成什么"，渲染交给 lifeline 视图。
 */

export interface TcpMessage {
  /** 发送方 */
  from: 'client' | 'server';
  /** 报文名，如 SYN / SYN+ACK */
  label: string;
  /** 序号确认号细节 */
  detail: string;
  /** 配色分类 */
  kind: 'syn' | 'ack' | 'data';
}

export interface TcpState {
  messages: TcpMessage[];
  clientState: string;
  serverState: string;
  /** 已发报文数 */
  sent: number;
  /** 当前高亮的报文下标 */
  active: number | null;
}

export type TcpScenario = 'handshake' | 'teardown';

export const TCP_SCENARIOS: { id: TcpScenario; label: string }[] = [
  { id: 'handshake', label: '三次握手' },
  { id: 'teardown', label: '四次挥手' },
];

function frame(
  messages: TcpMessage[],
  clientState: string,
  serverState: string,
  note: string,
): AnimFrame<TcpState> {
  return {
    state: {
      messages,
      clientState,
      serverState,
      sent: messages.length,
      active: messages.length ? messages.length - 1 : null,
    },
    note,
    counters: { 已发报文: messages.length },
  };
}

export function buildHandshake(): AnimFrame<TcpState>[] {
  return [
    frame([], 'CLOSED', 'LISTEN', '建立连接之前：客户端处于 CLOSED，服务器处于 LISTEN，等待连接请求。'),
    frame(
      [{ from: 'client', label: 'SYN', detail: 'seq = x', kind: 'syn' }],
      'SYN-SENT',
      'LISTEN',
      '第一次握手：客户端发送 SYN=1、seq=x，自己进入 SYN-SENT。此时不携带数据。',
    ),
    frame(
      [
        { from: 'client', label: 'SYN', detail: 'seq = x', kind: 'syn' },
        { from: 'server', label: 'SYN + ACK', detail: 'seq = y, ack = x+1', kind: 'ack' },
      ],
      'SYN-SENT',
      'SYN-RCVD',
      '第二次握手：服务器同意连接，回 SYN=1、ACK=1、seq=y、ack=x+1，进入 SYN-RCVD。',
    ),
    frame(
      [
        { from: 'client', label: 'SYN', detail: 'seq = x', kind: 'syn' },
        { from: 'server', label: 'SYN + ACK', detail: 'seq = y, ack = x+1', kind: 'ack' },
        { from: 'client', label: 'ACK', detail: 'seq = x+1, ack = y+1', kind: 'ack' },
      ],
      'ESTABLISHED',
      'SYN-RCVD',
      '第三次握手：客户端收到 SYN+ACK 后进入 ESTABLISHED，再发 ACK=1、ack=y+1。这一次可以携带数据。',
    ),
    frame(
      [
        { from: 'client', label: 'SYN', detail: 'seq = x', kind: 'syn' },
        { from: 'server', label: 'SYN + ACK', detail: 'seq = y, ack = x+1', kind: 'ack' },
        { from: 'client', label: 'ACK', detail: 'seq = x+1, ack = y+1', kind: 'ack' },
      ],
      'ESTABLISHED',
      'ESTABLISHED',
      '服务器收到 ACK 后也进入 ESTABLISHED，连接建立完成。前两次握手不能带数据——因为还没确认对方的接收能力。',
    ),
    frame(
      [
        { from: 'client', label: 'SYN', detail: 'seq = x', kind: 'syn' },
        { from: 'server', label: 'SYN + ACK', detail: 'seq = y, ack = x+1', kind: 'ack' },
        { from: 'client', label: 'ACK', detail: 'seq = x+1, ack = y+1', kind: 'ack' },
      ],
      'ESTABLISHED',
      'ESTABLISHED',
      '为什么不是两次？若只有两次，服务器无法确认「客户端能收到自己的报文」；而且失效的旧 SYN 会让服务器白建连接、浪费资源。',
    ),
  ];
}

export function buildTeardown(): AnimFrame<TcpState>[] {
  const base: TcpMessage[] = [
    { from: 'client', label: 'FIN', detail: 'seq = u', kind: 'syn' },
  ];
  const withAck: TcpMessage[] = [
    ...base,
    { from: 'server', label: 'ACK', detail: 'seq = v, ack = u+1', kind: 'ack' },
  ];
  const withFin: TcpMessage[] = [
    ...withAck,
    { from: 'server', label: 'FIN', detail: 'seq = w, ack = u+1', kind: 'syn' },
  ];
  const withFinalAck: TcpMessage[] = [
    ...withFin,
    { from: 'client', label: 'ACK', detail: 'seq = u+1, ack = w+1', kind: 'ack' },
  ];

  return [
    frame([], 'ESTABLISHED', 'ESTABLISHED', '挥手之前：双方都处于 ESTABLISHED，数据传送完毕。'),
    frame(base, 'FIN-WAIT-1', 'ESTABLISHED', '第一次挥手：客户端发送 FIN=1、seq=u，表示自己没有数据要发了，进入 FIN-WAIT-1。'),
    frame(
      withAck,
      'FIN-WAIT-2',
      'CLOSE-WAIT',
      '第二次挥手：服务器回 ACK=1、ack=u+1，进入 CLOSE-WAIT。此时是半关闭状态：客户端不能再发数据，服务器还能发。',
    ),
    frame(
      withFin,
      'FIN-WAIT-2',
      'LAST-ACK',
      '第三次挥手：服务器把剩余数据发完后，也发 FIN=1、seq=w、ack=u+1，进入 LAST-ACK，等待客户端确认。',
    ),
    frame(
      withFinalAck,
      'TIME-WAIT',
      'CLOSED',
      '第四次挥手：客户端回 ACK=1、ack=w+1，进入 TIME-WAIT；服务器收到后直接进入 CLOSED，连接可以释放。',
    ),
    frame(
      withFinalAck,
      'CLOSED',
      'CLOSED',
      '客户端等待 2MSL 后进入 CLOSED。为什么等 2MSL？①万一最后的 ACK 丢了，还能重传；②让本次连接的旧报文在网络中全部消失，避免影响新连接。',
    ),
  ];
}

export function buildTcp(scenario: TcpScenario): AnimFrame<TcpState>[] {
  return scenario === 'teardown' ? buildTeardown() : buildHandshake();
}
