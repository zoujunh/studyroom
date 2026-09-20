import type { AnimFrame, MatrixState } from './types';
import { cell } from './types';

/** IP 分片：给定数据报总长与 MTU，逐片算出数据长度、片偏移与 MF。 */

export const DEFAULT_DATAGRAM_LENGTH = 4000;
export const DEFAULT_MTU = 1500;
const IP_HEADER = 20;

export interface FragmentPlan {
  maxData: number;
  dataTotal: number;
  fragments: { index: number; dataLength: number; offset: number; mf: number; totalLength: number }[];
}

export function planFragments(totalLength: number, mtu: number): FragmentPlan | null {
  const maxData = Math.floor((mtu - IP_HEADER) / 8) * 8;
  if (maxData <= 0 || totalLength <= IP_HEADER) return null;
  const dataTotal = totalLength - IP_HEADER;
  const fragments: FragmentPlan['fragments'] = [];
  let sent = 0;
  let index = 0;
  while (sent < dataTotal && index < 20) {
    const dataLength = Math.min(maxData, dataTotal - sent);
    fragments.push({
      index: index + 1,
      dataLength,
      offset: sent / 8,
      mf: sent + dataLength < dataTotal ? 1 : 0,
      totalLength: dataLength + IP_HEADER,
    });
    sent += dataLength;
    index += 1;
  }
  return { maxData, dataTotal, fragments };
}

function buildTable(plan: FragmentPlan, reveal: number, mtu: number): MatrixState {
  return {
    columnLabels: ['数据字段长度', '片偏移', 'MF', '分片总长'],
    rowHeader: '分片',
    rows: plan.fragments.map((fragment, index) => ({
      label: `片 ${fragment.index}`,
      status: index < reveal ? 'active' : undefined,
      cells: [
        cell(fragment.dataLength, index < reveal ? 'ok' : 'idle'),
        cell(fragment.offset, index < reveal ? 'ok' : 'idle'),
        cell(fragment.mf, index < reveal ? (fragment.mf ? 'warn' : 'ok') : 'idle'),
        cell(fragment.totalLength, index < reveal ? 'ok' : 'idle'),
      ],
    })),
    badges: [
      { label: 'MTU', value: String(mtu) },
      { label: '首部', value: `${IP_HEADER} B` },
      { label: '每片最大数据', value: `${plan.maxData} B` },
      { label: '数据总长', value: `${plan.dataTotal} B` },
    ],
    caption: `片偏移以 8 字节为单位，所以每片的数据长度必须是 8 的倍数：$\\lfloor (MTU-20)/8 \\rfloor \\times 8 = ${plan.maxData}$ B。`,
  };
}

export function buildFragment(totalLength: number, mtu: number): AnimFrame<MatrixState>[] {
  const plan = planFragments(totalLength, mtu);
  const frames: AnimFrame<MatrixState>[] = [];
  if (!plan) {
    frames.push({
      state: { rows: [{ label: '参数', cells: [cell('无法分片：MTU 太小或数据报太短')] }], badges: [] },
      note: '参数不合法：MTU 必须大于 20 字节首部，数据报总长要大于 20 字节。',
      counters: {},
    });
    return frames;
  }

  frames.push({
    state: buildTable(plan, 0, mtu),
    note: `数据报总长 ${totalLength} B（含 ${IP_HEADER} B 首部），MTU = ${mtu} B。每片最多携带 ${plan.maxData} B 数据，因此需要分成 ${plan.fragments.length} 片。`,
    counters: { 分片数: plan.fragments.length, 每片最大数据: plan.maxData },
  });

  let offset = 0;
  plan.fragments.forEach((fragment, index) => {
    offset += fragment.dataLength;
    frames.push({
      state: buildTable(plan, index + 1, mtu),
      note: `片 ${fragment.index}：携带 ${fragment.dataLength} B 数据（原数据报第 ${offset - fragment.dataLength + 1} ~ ${offset} 字节），片偏移 = ${fragment.offset}，MF = ${fragment.mf}${
        fragment.mf ? '（后面还有分片）' : '（这是最后一片）'
      }，分片总长 = ${fragment.totalLength} B。`,
      counters: { 已发送数据: offset, 片偏移: fragment.offset },
    });
  });

  frames.push({
    state: buildTable(plan, plan.fragments.length, mtu),
    note: `分片完成：共 ${plan.fragments.length} 片，前 ${plan.fragments.length - 1} 片 MF = 1、最后一片 MF = 0。片偏移是「该片数据在原始数据报数据区中的位置 ÷ 8」，所以最后一片的片偏移 = ${
      plan.fragments[plan.fragments.length - 1].offset
    }$，第 $i$ 片的偏移等于前面所有片数据长度之和除以 8。`,
    counters: {
      分片数: plan.fragments.length,
      数据总长: plan.dataTotal,
      每片最大数据: plan.maxData,
    },
  });

  return frames;
}
