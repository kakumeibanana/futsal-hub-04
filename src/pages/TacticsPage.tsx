import { useState } from "react";
import { categories } from "@/lib/tactics";
import TacticsBoard from "@/components/TacticsBoard";

// 作戦が増えても1画面に収まるように、まずカテゴリ（フォルダ）を選び、その中の作戦を選ぶ。
const TacticsPage = () => {
  const [catName, setCatName] = useState(categories[0]?.name ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const category = categories.find((c) => c.name === catName) ?? categories[0];
  const tactic = category?.tactics.find((t) => t.id === selectedId) ?? category?.tactics[0];

  const chooseCategory = (name: string) => {
    setCatName(name);
    setSelectedId(null); // カテゴリを変えたら、その先頭の作戦から
  };

  return (
    <div className="container py-8 sm:py-12">
      <h1 className="font-display font-bold text-2xl sm:text-3xl mb-6">戦術ボード</h1>

      {!tactic || !category ? (
        <p className="text-muted-foreground">まだ作戦が登録されていません。</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="作戦の種類">
            {categories.map((c) => (
              <button
                key={c.name}
                type="button"
                role="tab"
                aria-selected={c.name === category.name}
                onClick={() => chooseCategory(c.name)}
                className={`px-3.5 py-2 rounded-full text-sm font-bold border transition-colors ${
                  c.name === category.name
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.name}
                <span className="ml-1.5 text-xs font-medium opacity-80 tabular-nums">{c.tactics.length}</span>
              </button>
            ))}
          </div>

          {category.tactics.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {category.tactics.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  aria-pressed={t.id === tactic.id}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    t.id === tactic.id
                      ? "bg-secondary border-primary text-secondary-foreground"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}

          <h2 className="font-bold text-lg mb-1">{tactic.name}</h2>
          {tactic.note && <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">{tactic.note}</p>}
          <TacticsBoard tactic={tactic} />
        </>
      )}
    </div>
  );
};

export default TacticsPage;
