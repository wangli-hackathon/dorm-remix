import type { Plan } from "../lib/planner/types.ts";
import { useLang } from "../i18n.tsx";

export function PlanSvg({ plan, className = "" }: { plan: Plan; className?: string }) {
  const { lang, t } = useLang();
  const pad = 28;
  const width = 360;
  const height = 460;
  const scale = Math.min((width - pad * 2) / plan.room.width, (height - pad * 2) / plan.room.depth);
  const xOf = (x: number) => pad + (x + plan.room.width / 2) * scale;
  const yOf = (z: number) => pad + (z + plan.room.depth / 2) * scale;
  return (
    <svg className={className} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t("寝室平面图", "Dorm floor plan")}>
      <rect width={width} height={height} fill="#f4efe4" />
      <rect x={xOf(-plan.room.width / 2)} y={yOf(-plan.room.depth / 2)} width={plan.room.width * scale} height={plan.room.depth * scale} fill="#f7f1e6" stroke="#241910" strokeWidth="2" />
      <rect x={xOf(plan.windowOpening.minX)} y={yOf(plan.windowOpening.minZ)} width={(plan.windowOpening.maxX - plan.windowOpening.minX) * scale} height={Math.max(8, (plan.windowOpening.maxZ - plan.windowOpening.minZ) * scale)} fill="#8eabc4" />
      <rect x={xOf(plan.corridor.minX)} y={yOf(plan.corridor.minZ)} width={plan.corridor.clearWidth * scale} height={(plan.corridor.maxZ - plan.corridor.minZ) * scale} fill="none" stroke="#c6532d" strokeDasharray="4 3" />
      {plan.solids.filter((solid) => ["mattress", "desk", "wardrobe", "rug"].includes(solid.role)).map((solid) => (
        <rect key={solid.id} x={xOf(solid.position[0] - solid.size[0] / 2)} y={yOf(solid.position[2] - solid.size[2] / 2)} width={solid.size[0] * scale} height={solid.size[2] * scale} fill={solid.color} stroke="#24191022" />
      ))}
      {plan.beds.map((bed) => {
        const mattress = plan.solids.find((solid) => solid.role === "mattress" && solid.bedIndex === bed.index);
        if (!mattress) return null;
        return (
          <text key={bed.index} x={xOf(mattress.position[0])} y={yOf(mattress.position[2]) + 4} textAnchor="middle" fontSize="12" fill="#241910">
            {lang === "en" ? bed.nameEn : bed.nameZh}
          </text>
        );
      })}
      <text x={width / 2} y={18} textAnchor="middle" fontSize="12" fill="#4d3b2e">
        {t("窗", "Window")}
      </text>
      <text x={width / 2} y={height - 8} textAnchor="middle" fontSize="12" fill="#4d3b2e">
        {t("门", "Door")}
      </text>
    </svg>
  );
}
