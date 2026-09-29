import { useState } from "react";
import { tactics } from "@/lib/tactics";
import TacticsBoard from "@/components/TacticsBoard";

const TacticsPage = () => {
  const [selected, setSelected] = useState(0);
  const tactic = tactics[selected];

  return (
    <div className="container py-8 sm:py-12">
      <h1 className="font-display font-bold text-2xl sm:text-3xl mb-1">戦術ボード</h1>
      <p className="text-sm text-muted-foreground mb-6">
        キャプテンが作った作戦の動きです。赤と青の動きを見て確認してください。
      </p>

      {!tactic ? (
        <p className="text-muted-foreground">まだ作戦が登録されていません。</p>
      ) : (
        <>
          {tactics.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {tactics.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(i)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    i === selected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-muted border-border text-muted-foreground hover:text-foreground"
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
