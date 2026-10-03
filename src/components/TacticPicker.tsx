import { useMemo, useState } from "react";
import { categories, type Tactic } from "@/lib/tactics";
import { Input } from "@/components/ui/input";

// 動画を付ける作戦を、チェックで選ぶ（複数）。作戦の名前で絞り込める（例:「ホシナ」）。
// 「表示中をすべて選ぶ」で、絞り込んだ作戦を、まとめて選べる。
// disabledIds … すでに付いている作戦（選べない）。excludeId … 選ぶ対象から外す作戦（いま見ている作戦）。

const labelOf = (t: Tactic) => `${t.side ? t.side + " " : ""}${t.label}`;

const TacticPicker = ({
  selected,
  onChange,
  disabledIds = [],
  excludeId,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  disabledIds?: string[];
  excludeId?: string;
}) => {
  const [q, setQ] = useState("");
  const disabled = useMemo(() => new Set(disabledIds), [disabledIds]);
  const chosen = useMemo(() => new Set(selected), [selected]);

  const groups = useMemo(() => {
    const key = q.trim();
    return categories
      .map((c) => ({
        name: c.name,
        items: c.tactics.filter((t) => t.id !== excludeId && (key === "" || `${c.name}${t.name}${t.label}`.includes(key))),
      }))
      .filter((g) => g.items.length > 0);
  }, [q, excludeId]);

  const selectable = groups.flatMap((g) => g.items).filter((t) => !disabled.has(t.id));

  const toggle = (id: string) => onChange(chosen.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const selectVisible = () => onChange([...new Set([...selected, ...selectable.map((t) => t.id)])]);

  return (
    <div className="space-y-2">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="作戦をさがす（例：ホシナ）" aria-label="作戦をさがす" />

      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground tabular-nums">{selected.length} 個の作戦を選んでいます</span>
        <span className="flex gap-3">
          <button type="button" onClick={selectVisible} disabled={selectable.length === 0} className="font-medium text-primary hover:underline disabled:opacity-40">
            表示中をすべて選ぶ
          </button>
          <button type="button" onClick={() => onChange([])} disabled={selected.length === 0} className="font-medium text-muted-foreground hover:underline disabled:opacity-40">
            選びを外す
          </button>
        </span>
      </div>

      <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {groups.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">当てはまる作戦がありません。</p>}
        {groups.map((g) => (
          <div key={g.name}>
            <p className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground bg-muted/50">{g.name}</p>
            {g.items.map((t) => {
              const off = disabled.has(t.id);
              return (
                <label key={t.id} className={`flex items-center gap-2.5 px-3 py-2 text-sm ${off ? "opacity-50" : "cursor-pointer hover:bg-muted/40"}`}>
                  <input type="checkbox" className="h-4 w-4 accent-primary" checked={off || chosen.has(t.id)} disabled={off} onChange={() => toggle(t.id)} />
                  <span className="min-w-0 truncate">{labelOf(t)}</span>
                  {off && <span className="ml-auto flex-shrink-0 text-[11px] text-muted-foreground">付いている</span>}
                </label>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TacticPicker;
