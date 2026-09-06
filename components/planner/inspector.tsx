"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { PlannerApi } from "@/hooks/use-planner";
import { GENDER_LABEL, KIND_LABEL, type Gender } from "@/lib/planner/types";

export function PlannerInspector({
  planner,
  className,
}: {
  planner: PlannerApi;
  className?: string;
}) {
  const {
    stats,
    currentFloorStats,
    project,
    setLimits,
    selectedRoom,
    updateRoom,
    deleteRoom,
    floor,
  } = planner;

  const kizOver = stats.kizKapasite > project.limits.maxKizYatak;
  const erkekOver = stats.erkekKapasite > project.limits.maxErkekYatak;
  const odaOver = currentFloorStats.odaCount > project.limits.maxOdaPerKat;

  return (
    <aside className={cn("flex w-80 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border bg-card p-4 print:hidden", className)}>
      <section>
        <h2 className="mb-1 font-heading text-lg">Doluluk ve limitler</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Kaydırıcıları oynatmanız yeterli. Aşım kırmızıya döner.
        </p>
        <LimitRow
          label="Kız yatağı"
          used={stats.kizKapasite}
          max={project.limits.maxKizYatak}
          filled={stats.kizDolu}
          over={kizOver}
          tone="kiz"
          onChange={(maxKizYatak) => setLimits({ maxKizYatak })}
        />
        <LimitRow
          label="Erkek yatağı"
          used={stats.erkekKapasite}
          max={project.limits.maxErkekYatak}
          filled={stats.erkekDolu}
          over={erkekOver}
          tone="erkek"
          onChange={(maxErkekYatak) => setLimits({ maxErkekYatak })}
        />
        <LimitRow
          label={`${floor.name} oda sayısı`}
          used={currentFloorStats.odaCount}
          max={project.limits.maxOdaPerKat}
          filled={currentFloorStats.odaCount}
          over={odaOver}
          tone="oda"
          onChange={(maxOdaPerKat) => setLimits({ maxOdaPerKat })}
          unit="oda"
        />
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs">
            <Label>Yeni oda varsayılan kapasite</Label>
            <span>{project.limits.defaultKapasite} kişilik</span>
          </div>
          <Slider
            min={1}
            max={8}
            step={1}
            value={[project.limits.defaultKapasite]}
            onValueChange={([defaultKapasite]) => setLimits({ defaultKapasite })}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <StatChip
            label="Kız odası"
            value={stats.kizOda}
            className="bg-[color-mix(in_oklch,var(--kiz)_16%,white)]"
          />
          <StatChip
            label="Erkek odası"
            value={stats.erkekOda}
            className="bg-[color-mix(in_oklch,var(--erkek)_16%,white)]"
          />
        </div>
      </section>

      <section className="border-t border-border pt-4">
        {selectedRoom ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading text-lg">Seçili yer</h2>
              <Badge variant="secondary">{KIND_LABEL[selectedRoom.kind]}</Badge>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room-label">Ad / numara</Label>
              <Input
                id="room-label"
                value={selectedRoom.label}
                onChange={(e) =>
                  updateRoom(selectedRoom.id, { label: e.target.value })
                }
              />
            </div>
            {selectedRoom.kind === "oda" ? (
              <>
                <div>
                  <Label className="mb-1.5 block">Bölüm</Label>
                  <ToggleGroup
                    type="single"
                    value={selectedRoom.gender}
                    onValueChange={(v) => {
                      if (v) updateRoom(selectedRoom.id, { gender: v as Gender });
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <ToggleGroupItem value="kiz" className="flex-1">
                      Kız
                    </ToggleGroupItem>
                    <ToggleGroupItem value="erkek" className="flex-1">
                      Erkek
                    </ToggleGroupItem>
                    <ToggleGroupItem value="karma" className="flex-1">
                      Karma
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <Label>Kapasite</Label>
                    <span>{selectedRoom.capacity} yatak</span>
                  </div>
                  <Slider
                    min={1}
                    max={8}
                    step={1}
                    value={[selectedRoom.capacity]}
                    onValueChange={([capacity]) =>
                      updateRoom(selectedRoom.id, { capacity })
                    }
                  />
                </div>
                <RoomStudents
                  roomId={selectedRoom.id}
                  planner={planner}
                />
                <p className="text-xs text-muted-foreground">
                  {GENDER_LABEL[selectedRoom.gender]} bölümü · {selectedRoom.w}×
                  {selectedRoom.h} kare. Öğrencileri soldan bu odaya tıklayarak
                  yerleştirin.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Bu bir ortak alan. Sürükleyerek taşıyabilir, köşeden
                boyutlandırabilirsiniz.
              </p>
            )}
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => deleteRoom(selectedRoom.id)}
            >
              <Trash2 data-icon="inline-start" />
              Sil
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Bir odaya tıklayın. Öğrenciler o odanın listesinde görünür.
          </div>
        )}
      </section>
    </aside>
  );
}

function RoomStudents({
  roomId,
  planner,
}: {
  roomId: string;
  planner: PlannerApi;
}) {
  const here = planner.project.students.filter(
    (student) => student.roomId === roomId,
  );
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <Label>Bu odadaki öğrenciler</Label>
        <span>
          {here.length}/{planner.selectedRoom?.capacity ?? 0}
        </span>
      </div>
      {here.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-2 text-xs text-muted-foreground">
          Boş. Soldan bir isme tıklayıp bu odaya tıklayın.
        </p>
      ) : (
        <ul className="space-y-1">
          {here.map((student) => (
            <li
              key={student.id}
              className="flex items-center justify-between rounded-md bg-muted/60 px-2 py-1 text-sm"
            >
              <span>{student.name}</span>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => planner.placeStudent(student.id, null)}
              >
                Çıkar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LimitRow({
  label,
  used,
  max,
  filled,
  over,
  tone,
  onChange,
  unit = "yatak",
}: {
  label: string;
  used: number;
  max: number;
  filled: number;
  over: boolean;
  tone: "kiz" | "erkek" | "oda";
  onChange: (value: number) => void;
  unit?: string;
}) {
  const pct = Math.min(100, max === 0 ? 0 : (used / max) * 100);
  const bar =
    tone === "kiz"
      ? "bg-[var(--kiz)]"
      : tone === "erkek"
        ? "bg-[var(--erkek)]"
        : "bg-teal-800";
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <Label>{label}</Label>
        <span className={cn("font-medium", over && "text-destructive")}>
          {used}/{max} {unit}
          {unit === "yatak" ? ` · ${filled} dolu` : ""}
        </span>
      </div>
      <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", over ? "bg-destructive" : bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <Slider
        min={tone === "oda" ? 1 : 0}
        max={tone === "oda" ? 40 : 200}
        step={1}
        value={[max]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

function StatChip({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl px-3 py-2", className)}>
      <div className="font-heading text-2xl leading-none">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
