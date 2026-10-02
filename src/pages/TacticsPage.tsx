import { useState } from "react";
import { Pencil } from "lucide-react";
import { categories, type Tactic } from "@/lib/tactics";
import TacticsBoard from "@/components/TacticsBoard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

// 作戦を作る・直す場所（別のサイト）。作戦盤の中身はブラウザの中に保存されるだけで、
// 開いてもサイトの作戦は変わらない。サイトに載せるときは、書き出したJSONを tactics フォルダに入れる。
const BOARD_URL = "https://futsal-board-hazel.vercel.app/";

// 作戦が増えても1画面に収まるように、まずカテゴリ（フォルダ）を選び、その中の作戦を選ぶ。
const TacticsPage = () => {
  const { isStaff } = useAuth();
  const [catName, setCatName] = useState(categories[0]?.name ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const category = categories.find((c) => c.name === catName) ?? categories[0];
  const tactic = category?.tactics.find((t) => t.id === selectedId) ?? category?.tactics[0];

  // 画面に出すのは「( )」の中身だけ。ただ、右と左に同じ名前（オーサワ1番など）があると見分けがつかないので、
  // 同じカテゴリの中に同じ名前が複数あるときだけ、小さく「右」「左」を付ける。
  const sideTag = (t: Tactic) => {
    const dup = category?.tactics.filter((x) => x.label === t.label).length > 1;
    if (!dup || !t.side) return null;
    return (
      <span className="mr-1.5 inline-block rounded border border-current/60 px-1 text-[11px] font-bold leading-4 align-[1px]">
        {t.side}
      </span>
    );
  };

  const chooseCategory = (name: string) => {
    setCatName(name);
    setSelectedId(null); // カテゴリを変えたら、その先頭の作戦から
  };

  return (
    <div className="container py-8 sm:py-12">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="font-display font-bold text-2xl sm:text-3xl">戦術ボード</h1>
        {/* 作戦の編集は3役（主将・幹部）だけ。ほかのページの編集と同じ isStaff の判定を使う */}
        {isStaff && (
          <Button asChild size="sm" variant="outline" className="gap-1.5 flex-shrink-0">
            <a href={BOARD_URL} target="_blank" rel="noopener noreferrer">
              <Pencil size={14} />
              作戦盤を開く
            </a>
          </Button>
        )}
      </div>

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
                  {sideTag(t)}
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <h2 className="font-bold text-lg mb-1">
            {sideTag(tactic)}
            {tactic.label}
          </h2>
          {tactic.note && <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">{tactic.note}</p>}
          <TacticsBoard tactic={tactic} />
        </>
      )}
    </div>
  );
};

export default TacticsPage;
