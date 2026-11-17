import { useEffect, useState } from "react";
import { BriefForm } from "./components/BriefForm.tsx";
import { EMPTY_DRAFT, type Draft } from "./lib/draft.ts";
import { Hall } from "./components/Hall.tsx";
import { EmptyRoom, RoomStage } from "./components/RoomStage.tsx";
import { LangProvider } from "./i18n.tsx";
import { planDorm } from "./lib/planner/plan.ts";
import type { Brief, Plan } from "./lib/planner/types.ts";

type Stage = "hall" | "brief" | "room";

export default function App() {
  return (
    <LangProvider>
      <Studio />
    </LangProvider>
  );
}

function Studio() {
  const [stage, setStage] = useState<Stage>(() => readStage());
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const onHash = () => setStage(readStage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function go(next: Stage) {
    const hash = next === "hall" ? "#/" : `#/${next}`;
    if (window.location.hash !== hash) window.location.hash = hash;
    setStage(next);
  }

  function enter(brief: Brief) {
    const result = planDorm(brief);
    if (!result.ok) return;
    setPlan(result.plan);
    go("room");
  }

  if (stage === "hall") return <Hall onStart={() => go("brief")} />;
  if (stage === "brief") return <BriefForm draft={draft} onChange={setDraft} onBack={() => go("hall")} onPlan={enter} />;
  if (!plan) return <EmptyRoom onBack={() => go("brief")} />;
  return <RoomStage plan={plan} onPlan={setPlan} onBack={() => go("brief")} />;
}

function readStage(): Stage {
  const hash = window.location.hash;
  if (hash.startsWith("#/room")) return "room";
  if (hash.startsWith("#/brief")) return "brief";
  return "hall";
}
