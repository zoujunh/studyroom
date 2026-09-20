import type { AnimFrame } from './types';

/**
 * 六种排序算法的逐步动画生成器。
 * 每个函数都是纯函数：数组进，步骤数组出，不改外部状态。
 */

export type BarStatus = 'idle' | 'compare' | 'pivot' | 'sorted' | 'active';

export interface Bar {
  value: number;
  status: BarStatus;
}

export interface SortState {
  bars: Bar[];
}

export const DEFAULT_SERIES = '5 2 9 1 7 4 8 3 6 10 0 11';

interface Ctx {
  arr: number[];
  status: BarStatus[];
  frames: AnimFrame<SortState>[];
  counters: Record<string, number>;
  push: (note: string) => void;
}

function makeCtx(data: number[]): Ctx {
  const arr = [...data];
  const status: BarStatus[] = arr.map(() => 'idle');
  const frames: AnimFrame<SortState>[] = [];
  const counters: Record<string, number> = { 比较: 0, 交换: 0 };
  const push = (note: string) => {
    frames.push({
      state: { bars: arr.map((value, i) => ({ value, status: status[i] })) },
      note,
      counters: { ...counters },
    });
  };
  return { arr, status, frames, counters, push };
}

/* ---------------- 冒泡排序 ---------------- */

export function bubbleSort(data: number[]): AnimFrame<SortState>[] {
  const ctx = makeCtx(data);
  const { arr, status, push } = ctx;
  push(`待排序序列：${arr.join(' ')}（共 ${arr.length} 个元素）`);

  for (let i = 0; i < arr.length - 1; i += 1) {
    let swapped = false;
    for (let j = 0; j < arr.length - 1 - i; j += 1) {
      status[j] = 'compare';
      status[j + 1] = 'compare';
      ctx.counters.比较 += 1;
      const a = arr[j];
      const b = arr[j + 1];
      push(`比较 ${a} 与 ${b}`);
      if (a > b) {
        arr[j] = b;
        arr[j + 1] = a;
        ctx.counters.交换 += 1;
        swapped = true;
        push(`${a} > ${b}，交换位置`);
      } else {
        push(`${a} ≦ ${b}，不交换`);
      }
      status[j] = 'idle';
      status[j + 1] = 'idle';
    }
    status[arr.length - 1 - i] = 'sorted';
    push(`第 ${i + 1} 趟结束，最大值 ${arr[arr.length - 1 - i]} 已归位`);
    if (!swapped) {
      for (let k = 0; k < arr.length - i; k += 1) status[k] = 'sorted';
      push('这一趟一次都没交换，说明已经有序，提前结束');
      break;
    }
  }
  status.forEach((_, i) => {
    status[i] = 'sorted';
  });
  push('排序完成');
  return ctx.frames;
}

/* ---------------- 简单选择排序 ---------------- */

export function selectionSort(data: number[]): AnimFrame<SortState>[] {
  const ctx = makeCtx(data);
  const { arr, status, push } = ctx;
  push(`待排序序列：${arr.join(' ')}`);

  for (let i = 0; i < arr.length - 1; i += 1) {
    let min = i;
    status[min] = 'pivot';
    push(`第 ${i + 1} 趟：先假设 ${arr[i]} 最小`);
    for (let j = i + 1; j < arr.length; j += 1) {
      status[j] = 'compare';
      ctx.counters.比较 += 1;
      push(`比较 ${arr[j]} 与当前最小 ${arr[min]}`);
      if (arr[j] < arr[min]) {
        status[min] = 'idle';
        min = j;
        status[min] = 'pivot';
        push(`${arr[j]} 更小，改记为最小`);
      } else {
        status[j] = 'idle';
      }
    }
    if (min !== i) {
      const tmp = arr[i];
      arr[i] = arr[min];
      arr[min] = tmp;
      ctx.counters.交换 += 1;
      push(`${arr[i]} 与第 ${i + 1} 位交换`);
    } else {
      push(`${arr[i]} 已是最小，原地不动`);
    }
    status[min] = 'idle';
    status[i] = 'sorted';
  }
  status[arr.length - 1] = 'sorted';
  push('排序完成');
  return ctx.frames;
}

/* ---------------- 直接插入排序 ---------------- */

export function insertionSort(data: number[]): AnimFrame<SortState>[] {
  const ctx = makeCtx(data);
  const { arr, status, push } = ctx;
  status[0] = 'sorted';
  push(`待排序序列：${arr.join(' ')}；第 1 个元素视为已排好`);

  for (let i = 1; i < arr.length; i += 1) {
    const key = arr[i];
    status[i] = 'pivot';
    push(`取出 ${key}，在前面已排好的序列里找插入位置`);
    let j = i - 1;
    while (j >= 0) {
      ctx.counters.比较 += 1;
      status[j] = 'compare';
      push(`比较：${arr[j]} 与 ${key}`);
      if (arr[j] > key) {
        arr[j + 1] = arr[j];
        ctx.counters.交换 += 1;
        status[j + 1] = 'sorted';
        status[j] = 'pivot';
        push(`${arr[j + 1]} > ${key}，后移一位，继续往前找`);
        j -= 1;
      } else {
        status[j] = 'sorted';
        push(`${arr[j]} ≦ ${key}，插入位置确定`);
        break;
      }
    }
    arr[j + 1] = key;
    status[j + 1] = 'sorted';
    push(`${key} 插入到第 ${j + 2} 位`);
  }
  push('排序完成');
  return ctx.frames;
}

/* ---------------- 快速排序（Lomuto 划分） ---------------- */

export function quickSort(data: number[]): AnimFrame<SortState>[] {
  const ctx = makeCtx(data);
  const { arr, status, push } = ctx;
  push(`待排序序列：${arr.join(' ')}`);

  const partition = (lo: number, hi: number) => {
    const pivot = arr[hi];
    status[hi] = 'pivot';
    push(`区间 [${lo + 1}, ${hi + 1}]：取末尾 ${pivot} 作为枢轴`);
    let i = lo;
    for (let j = lo; j < hi; j += 1) {
      status[j] = 'compare';
      ctx.counters.比较 += 1;
      push(`比较 ${arr[j]} 与枢轴 ${pivot}`);
      if (arr[j] < pivot) {
        if (i !== j) {
          const tmp = arr[i];
          arr[i] = arr[j];
          arr[j] = tmp;
          ctx.counters.交换 += 1;
          push(`${arr[i]} < ${pivot}，换到左边区域`);
        } else {
          push(`${arr[j]} < ${pivot}，本来就在左边区域`);
        }
        i += 1;
      } else {
        push(`${arr[j]} ≥ ${pivot}，留在右边`);
      }
      status[j] = 'idle';
    }
    const tmp = arr[i];
    arr[i] = arr[hi];
    arr[hi] = tmp;
    ctx.counters.交换 += 1;
    status[hi] = 'idle';
    status[i] = 'sorted';
    push(`枢轴 ${pivot} 归位到第 ${i + 1} 位，左边都比它小、右边都不比它小`);
    return i;
  };

  const sort = (lo: number, hi: number) => {
    if (lo > hi) return;
    if (lo === hi) {
      status[lo] = 'sorted';
      push(`区间只剩 ${arr[lo]}，天然有序`);
      return;
    }
    const mid = partition(lo, hi);
    sort(lo, mid - 1);
    sort(mid + 1, hi);
  };

  sort(0, arr.length - 1);
  push('排序完成');
  return ctx.frames;
}

/* ---------------- 二路归并排序（自底向上） ---------------- */

export function mergeSort(data: number[]): AnimFrame<SortState>[] {
  const ctx = makeCtx(data);
  const { arr, status, push } = ctx;
  push(`待排序序列：${arr.join(' ')}；先每个元素自成一段`);
  const tmp = new Array<number>(arr.length);

  for (let width = 1; width < arr.length; width *= 2) {
    for (let lo = 0; lo < arr.length; lo += 2 * width) {
      const mid = Math.min(lo + width, arr.length);
      const hi = Math.min(lo + 2 * width, arr.length);
      if (mid >= hi) continue;

      for (let k = lo; k < mid; k += 1) status[k] = 'active';
      for (let k = mid; k < hi; k += 1) status[k] = 'compare';
      push(`把左段 [${lo + 1}..${mid}] 与右段 [${mid + 1}..${hi}] 归并`);

      let i = lo;
      let j = mid;
      let k = lo;
      while (i < mid && j < hi) {
        ctx.counters.比较 += 1;
        if (arr[i] <= arr[j]) tmp[k++] = arr[i++];
        else tmp[k++] = arr[j++];
      }
      while (i < mid) tmp[k++] = arr[i++];
      while (j < hi) tmp[k++] = arr[j++];
      for (let t = lo; t < hi; t += 1) arr[t] = tmp[t];
      ctx.counters.交换 += hi - lo;
      for (let t = lo; t < hi; t += 1) status[t] = 'sorted';
      push(`写回合并结果：${arr.slice(lo, hi).join(' ')}`);
    }
  }
  push('排序完成');
  return ctx.frames;
}

/* ---------------- 堆排序 ---------------- */

export function heapSort(data: number[]): AnimFrame<SortState>[] {
  const ctx = makeCtx(data);
  const { arr, status, push } = ctx;
  const n = arr.length;
  push(`待排序序列：${arr.join(' ')}`);

  const siftDown = (start: number, end: number) => {
    let root = start;
    while (root * 2 + 1 < end) {
      const left = root * 2 + 1;
      const right = left + 1;
      let largest = left;
      status[root] = 'active';
      status[left] = 'compare';
      ctx.counters.比较 += 1;
      if (right < end) {
        ctx.counters.比较 += 1;
        status[right] = 'compare';
        if (arr[right] > arr[left]) largest = right;
      }
      push(`比较父结点 ${arr[root]} 与孩子 ${arr[largest]}`);
      if (arr[largest] > arr[root]) {
        const tmp = arr[root];
        arr[root] = arr[largest];
        arr[largest] = tmp;
        ctx.counters.交换 += 1;
        push(`孩子更大，交换，继续向下调整`);
        status[root] = 'idle';
        status[left] = 'idle';
        if (right < end) status[right] = 'idle';
        root = largest;
      } else {
        push(`父结点已最大，调整结束`);
        status[root] = 'idle';
        status[left] = 'idle';
        if (right < end) status[right] = 'idle';
        return;
      }
    }
  };

  for (let i = Math.floor(n / 2) - 1; i >= 0; i -= 1) siftDown(i, n);
  push('初始大顶堆建立完成，堆顶是全局最大值');

  for (let end = n - 1; end > 0; end -= 1) {
    const tmp = arr[0];
    arr[0] = arr[end];
    arr[end] = tmp;
    ctx.counters.交换 += 1;
    status[end] = 'sorted';
    push(`堆顶最大值 ${arr[end]} 与末尾交换，归位到第 ${end + 1} 位`);
    siftDown(0, end);
  }
  status[0] = 'sorted';
  push('排序完成');
  return ctx.frames;
}

/* ---------------- 注册入口 ---------------- */

export const SORT_ALGORITHMS: { id: string; label: string; run: (data: number[]) => AnimFrame<SortState>[] }[] = [
  { id: 'bubble', label: '冒泡排序', run: bubbleSort },
  { id: 'selection', label: '简单选择', run: selectionSort },
  { id: 'insertion', label: '直接插入', run: insertionSort },
  { id: 'quick', label: '快速排序', run: quickSort },
  { id: 'merge', label: '归并排序', run: mergeSort },
  { id: 'heap', label: '堆排序', run: heapSort },
];

/** 六种排序的复杂度与稳定性（静态知识，用于结果卡片）。 */
export const SORT_FACTS: Record<string, { avg: string; space: string; stable: string }> = {
  bubble: { avg: 'O(n²)', space: 'O(1)', stable: '稳定' },
  selection: { avg: 'O(n²)', space: 'O(1)', stable: '不稳定' },
  insertion: { avg: 'O(n²)', space: 'O(1)', stable: '稳定' },
  quick: { avg: 'O(n log n)', space: 'O(log n)', stable: '不稳定' },
  merge: { avg: 'O(n log n)', space: 'O(n)', stable: '稳定' },
  heap: { avg: 'O(n log n)', space: 'O(1)', stable: '不稳定' },
};
