import { useRef, useState } from 'react';
import { Icon, type IconName } from '../components/icons';
import { Button, Modal, Panel, SectionTitle, Segmented, Toast, cx } from '../components/ui';
import { MASTERED_STABILITY_DAYS } from '../data/curriculum';
import { SEED_VERSION } from '../data/seed';
import { dayKey } from '../lib/date';
import type { Settings } from '../types';
import { navigate } from '../lib/router';
import { useStore } from '../state/store';

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium">{label}</div>
        {hint ? <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{hint}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function StackRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="px-3.5 py-3">
      <div className="text-[13.5px] font-medium">{label}</div>
      {hint ? <div className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{hint}</div> : null}
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const {
    settings,
    updateSettings,
    exportJSON,
    importJSON,
    resetProgress,
    clearAll,
    cards,
    srs,
    logs,
    questions,
    attempts,
    mistakes,
    essays,
    essayAttempts,
  } = useStore();
  const chapters = new Set(cards.map((card) => card.chapter)).size;
  const [toast, setToast] = useState<string | null>(null);
  const [confirmKind, setConfirmKind] = useState<'reset' | 'clear' | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `408刷卡-备份-${dayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    flash('已导出备份文件');
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const result = await importJSON(text);
    if (result.error) flash(`导入失败：${result.error}`);
    else flash(`导入成功：${result.cards} 张卡 · ${result.srs} 条进度 · ${result.logs} 条记录`);
  };

  const themeOptions: { value: Settings['theme']; label: string }[] = [
    { value: 'auto', label: '跟随系统' },
    { value: 'light', label: '浅色' },
    { value: 'dark', label: '深色' },
  ];

  return (
    <div className="px-4 pt-5 pb-6">
      <header className="mb-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="返回"
          onClick={() => navigate('/')}
          className="rounded-[10px] border border-line bg-surface p-2 text-ink-2 active:bg-surface-2"
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <h1 className="text-[19px] font-semibold">设置</h1>
      </header>

      <SectionTitle>复习计划</SectionTitle>
      <Panel className="divide-y divide-line">
        <Row label="考试日期" hint="用于首页倒计时与冲刺节奏">
          <input
            type="date"
            value={settings.examDate}
            onChange={(event) => updateSettings({ examDate: event.target.value })}
            className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[13px] text-ink outline-none"
          />
        </Row>
        <StackRow label="每日新卡上限" hint={`今天已学新卡按此限额发放，当前 ${settings.newPerDay} 张/天`}>
          <Segmented
            value={String(settings.newPerDay)}
            onChange={(value) => updateSettings({ newPerDay: Number(value) })}
            options={[10, 20, 30, 50].map((n) => ({ value: String(n), label: `${n} 张` }))}
          />
        </StackRow>
        <StackRow label="每日复习上限" hint={`单次会话最多排入的到期卡数量，当前 ${settings.reviewPerDay} 张`}>
          <Segmented
            value={String(settings.reviewPerDay)}
            onChange={(value) => updateSettings({ reviewPerDay: Number(value) })}
            options={[100, 200, 300, 500].map((n) => ({ value: String(n), label: String(n) }))}
          />
        </StackRow>
        <StackRow
          label="目标记忆保持率"
          hint="越高复习越频繁。冲刺期建议 95%（间隔约 1→4→8→22 天），90% 会拉长到 2→13→56 天"
        >
          <Segmented
            value={String(settings.requestRetention)}
            onChange={(value) => updateSettings({ requestRetention: Number(value) })}
            options={[
              { value: '0.85', label: '85% 省时间' },
              { value: '0.9', label: '90% 常规' },
              { value: '0.95', label: '95% 冲刺' },
            ]}
          />
        </StackRow>
      </Panel>

      <SectionTitle>外观</SectionTitle>
      <Panel className="divide-y divide-line">
        <StackRow label="主题">
          <Segmented value={settings.theme} onChange={(value) => updateSettings({ theme: value })} options={themeOptions} />
        </StackRow>
        <StackRow label="正文字号" hint="只影响卡片答案的字号">
          <Segmented
            value={String(settings.fontSize)}
            onChange={(value) => updateSettings({ fontSize: Number(value) })}
            options={[
              { value: '14.5', label: '小' },
              { value: '15.5', label: '标准' },
              { value: '17', label: '大' },
              { value: '18.5', label: '特大' },
            ]}
          />
        </StackRow>
      </Panel>

      <SectionTitle>数据</SectionTitle>
      <Panel className="divide-y divide-line">
        <Row label="当前数据" hint={`${cards.length} 张卡 · ${srs.size} 条学习进度 · ${logs.length} 条复习记录`} />
        <Row
          label="内容规模"
          hint={`${cards.length} 张知识点卡（${chapters} 个章节） · ${questions.length} 道选择题 · ${essays.length} 道综合应用题`}
        />
        <Row
          label="刷题数据"
          hint={`${attempts.length} 次作答 · ${essayAttempts.length} 次大题自评 · 错题 ${mistakes.size} 道`}
        />        <Row label="导出备份" hint="生成 JSON 文件，可换设备导入">
          <Button className="px-3 py-2 text-[13px]" onClick={handleExport}>
            导出
          </Button>
        </Row>
        <Row label="导入备份" hint="与现有数据合并，同 id 卡片覆盖正文">
          <Button className="px-3 py-2 text-[13px]" onClick={() => fileRef.current?.click()}>
            选择文件
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void handleImportFile(file);
            }}
          />
        </Row>
        <Row label="重置学习进度" hint="清空所有评分与到期时间，保留卡片内容">
          <Button variant="danger" className="px-3 py-2 text-[13px]" onClick={() => setConfirmKind('reset')}>
            重置
          </Button>
        </Row>
        <Row label="清空全部数据" hint="删除本地数据库（含卡片），不可恢复">
          <Button variant="danger" className="px-3 py-2 text-[13px]" onClick={() => setConfirmKind('clear')}>
            清空
          </Button>
        </Row>
      </Panel>

      <SectionTitle>关于</SectionTitle>
      <Panel className="space-y-2 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2">
        {(
          [
            { icon: 'sparkle', text: '调度算法：FSRS-5（ts-fsrs），与 Anki 同源的现代间隔重复算法。' },
            { icon: 'layers', text: `内容版本 seed v${SEED_VERSION}；正文升级不会清空学习进度。` },
            {
              icon: 'check',
              text: `「已掌握」的口径：处于复习状态且记忆稳定度 ≥ ${MASTERED_STABILITY_DAYS} 天。`,
            },
            { icon: 'clock', text: '所有数据保存在本机 IndexedDB，不上传任何服务器。' },
          ] as { icon: IconName; text: string }[]
        ).map((item) => (
          <p key={item.text} className="flex gap-2">
            <span className="mt-[2px] shrink-0 text-ink-3">
              <Icon name={item.icon} size={14} />
            </span>
            {item.text}
          </p>
        ))}
        <p className={cx('pt-1 text-[11.5px] text-ink-3')}>版本 0.1.0（M0 刷卡闭环）</p>
      </Panel>

      <Modal
        open={confirmKind !== null}
        title={confirmKind === 'reset' ? '重置学习进度？' : '清空全部数据？'}
        onClose={() => setConfirmKind(null)}
      >
        <p>
          {confirmKind === 'reset'
            ? '所有卡片的评分记录、到期时间和统计都会清空，卡片内容保留，操作不可恢复。'
            : '本地数据库会被整个删除，包括卡片内容、学习进度与统计，操作不可恢复。'}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={() => setConfirmKind(null)}>取消</Button>
          <Button
            variant="danger"
            onClick={() => {
              const kind = confirmKind;
              setConfirmKind(null);
              if (kind === 'reset') {
                void resetProgress().then(() => flash('学习进度已重置'));
              } else if (kind === 'clear') {
                void clearAll();
              }
            }}
          >
            确认{confirmKind === 'reset' ? '重置' : '清空'}
          </Button>
        </div>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}
