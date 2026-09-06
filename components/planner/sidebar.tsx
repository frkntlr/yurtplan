"use client";

import {
  Building2,
  Eraser,
  Hand,
  MousePointer2,
  Paintbrush,
  Venus,
  Mars,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { PlannerApi } from "@/hooks/use-planner";
import {
  KIND_LABEL,
  ROOM_TEMPLATES,
  SHAPE_LABEL,
  type BuildingShape,
  type RoomKind,
  type Tool,
  type Zone,
} from "@/lib/planner/types";

const TOOLS: { id: Tool; label: string; icon: typeof MousePointer2 }[] = [
  { id: "sec", label: "Seç / taşı", icon: MousePointer2 },
  { id: "pan", label: "Kaydır", icon: Hand },
  { id: "bina", label: "Bina çiz", icon: Building2 },
  { id: "bolge", label: "Bölge boya", icon: Paintbrush },
];

const SHAPES: BuildingShape[] = ["dikdortgen", "l", "u", "c", "kanat"];

const ZONES: { id: Zone; label: string; className: string; icon?: typeof Venus }[] = [
  { id: "kiz", label: "Kız", className: "bg-[var(--kiz)] text-white", icon: Venus },
  { id: "erkek", label: "Erkek", className: "bg-[var(--erkek)] text-white", icon: Mars },
  { id: "ortak", label: "Ortak", className: "bg-[var(--ortak)] text-stone-900", icon: Users },
  { id: "none", label: "Sil", className: "bg-white text-stone-700", icon: Eraser },
];

export function PlannerSidebar({
  planner,
  className,
}: {
  planner: PlannerApi;
  className?: string;
}) {
  const {
    tool,
    setTool,
    zoneBrush,
    setZoneBrush,
    buildingPaint,
    setBuildingPaint,
    template,
    chooseTemplate,
    setShape,
    floor,
    setGridSize,
  } = planner;

  return (
    <aside className={cn("flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-card p-4 print:hidden", className)}>
      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Araçlar
        </h2>
        <div className="grid grid-cols-2 gap-1.5">
          {TOOLS.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                type="button"
                variant={tool === item.id ? "default" : "outline"}
                className="h-9 justify-start"
                onClick={() => setTool(item.id)}
              >
                <Icon data-icon="inline-start" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Bina şekli
        </h2>
        <p className="mb-2 text-xs text-muted-foreground">
          Tek tıkla kat planını kurun. U ve çift kanat kız / erkek kanadını otomatik boyar.
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {SHAPES.map((shape) => (
            <Button
              key={shape}
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => {
                setShape(shape);
                setTool("bolge");
              }}
            >
              {SHAPE_LABEL[shape]}
            </Button>
          ))}
        </div>
        <div className="mt-3 space-y-3">
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <Label>Genişlik</Label>
              <span className="text-muted-foreground">{floor.cols} kare</span>
            </div>
            <Slider
              min={16}
              max={48}
              step={1}
              value={[floor.cols]}
              onValueChange={([cols]) => setGridSize(cols, floor.rows)}
            />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <Label>Derinlik</Label>
              <span className="text-muted-foreground">{floor.rows} kare</span>
            </div>
            <Slider
              min={12}
              max={36}
              step={1}
              value={[floor.rows]}
              onValueChange={([rows]) => setGridSize(floor.cols, rows)}
            />
          </div>
          <ToggleGroup
            type="single"
            value={buildingPaint ? "boya" : "sil"}
            onValueChange={(v) => {
              if (v) setBuildingPaint(v === "boya");
            }}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <ToggleGroupItem value="boya" className="flex-1" onClick={() => setTool("bina")}>
              Fırça
            </ToggleGroupItem>
            <ToggleGroupItem value="sil" className="flex-1" onClick={() => setTool("bina")}>
              Silgi
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Kız / erkek bölümü
        </h2>
        <p className="mb-2 text-xs text-muted-foreground">
          Kanadı boyayın. Yeni oda, altına geldiği rengin cinsiyetini alır.
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {ZONES.map((zone) => {
            const Icon = zone.icon;
            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => {
                  setZoneBrush(zone.id);
                  setTool("bolge");
                }}
                className={cn(
                  "flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium ring-offset-2",
                  zone.className,
                  tool === "bolge" && zoneBrush === zone.id
                    ? "ring-2 ring-teal-800"
                    : "opacity-90 hover:opacity-100",
                )}
              >
                {Icon ? <Icon className="size-3.5" /> : null}
                {zone.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="pb-4">
        <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Odalar ve ortak alan
        </h2>
        <p className="mb-2 text-xs text-muted-foreground">
          Kartı seçip plana tıklayın veya sürükleyin.
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {ROOM_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-yurt-room", tpl.id);
                e.dataTransfer.effectAllowed = "copy";
                chooseTemplate(tpl);
              }}
              onClick={() => chooseTemplate(tpl)}
              className={cn(
                "flex items-center justify-between rounded-lg border px-2.5 py-2 text-left text-sm transition-colors",
                template?.id === tpl.id && tool === "yerlestir"
                  ? "border-teal-800 bg-teal-50"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              <span className="font-medium">{tpl.name}</span>
              <span className="text-xs text-muted-foreground">
                {tpl.w}×{tpl.h}
                {tpl.kind === "oda" ? ` · ${tpl.capacity} yatak` : ` · ${KIND_LABEL[tpl.kind as RoomKind]}`}
              </span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
