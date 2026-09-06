"use client";

import { useState } from "react";
import { Sparkles, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { PlannerApi } from "@/hooks/use-planner";
import { findRoom } from "@/lib/planner/model";
import type { StudentGender } from "@/lib/planner/types";

export function StudentPanel({
  planner,
  className,
}: {
  planner: PlannerApi;
  className?: string;
}) {
  const {
    project,
    pendingStudentId,
    setPendingStudentId,
    addStudents,
    removeStudent,
    placeStudent,
    autoPlace,
    clearPlacements,
    selectedRoomId,
  } = planner;
  const [name, setName] = useState("");
  const [gender, setGender] = useState<StudentGender>("kiz");

  const waiting = project.students.filter((student) => !student.roomId);
  const placed = project.students.filter((student) => student.roomId);
  const waitingKiz = waiting.filter((student) => student.gender === "kiz");
  const waitingErkek = waiting.filter((student) => student.gender === "erkek");

  const submit = () => {
    const added = addStudents(name, gender);
    if (added) setName("");
  };

  return (
    <aside
      className={cn(
        "flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-card p-4 print:hidden",
        className,
      )}
    >
      <section>
        <h2 className="font-heading text-lg">Öğrenci yerleştir</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          1. İsim yazın. 2. Bekleyen karta tıklayın. 3. Plandaki odaya tıklayın.
          İsterseniz kartı odaya sürükleyin.
        </p>
      </section>

      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Label htmlFor="student-name">İsim</Label>
        <Input
          id="student-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ayşe, Elif, Merve"
        />
        <ToggleGroup
          type="single"
          value={gender}
          onValueChange={(value) => {
            if (value) setGender(value as StudentGender);
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
        </ToggleGroup>
        <Button type="submit" className="w-full">
          <UserPlus data-icon="inline-start" />
          Listeye ekle
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Virgülle birden fazla isim yazabilirsiniz.
        </p>
      </form>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={autoPlace}>
          <Sparkles data-icon="inline-start" />
          Otomatik
        </Button>
        <Button variant="ghost" onClick={clearPlacements} disabled={!placed.length}>
          Hepsini çıkar
        </Button>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Bekleyen
          </h3>
          <span className="text-xs text-muted-foreground">
            {waiting.length} kişi
          </span>
        </div>
        {waiting.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
            Bekleyen yok. Yeni isim ekleyin veya yerleşenleri çıkarın.
          </p>
        ) : (
          <div className="space-y-3">
            <StudentGroup
              title="Kız"
              students={waitingKiz}
              pendingStudentId={pendingStudentId}
              onPick={setPendingStudentId}
              onRemove={removeStudent}
              selectedRoomId={selectedRoomId}
              onAssignToSelected={(id) => {
                if (selectedRoomId) placeStudent(id, selectedRoomId);
                else setPendingStudentId(id);
              }}
            />
            <StudentGroup
              title="Erkek"
              students={waitingErkek}
              pendingStudentId={pendingStudentId}
              onPick={setPendingStudentId}
              onRemove={removeStudent}
              selectedRoomId={selectedRoomId}
              onAssignToSelected={(id) => {
                if (selectedRoomId) placeStudent(id, selectedRoomId);
                else setPendingStudentId(id);
              }}
            />
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Yerleşen
          </h3>
          <span className="text-xs text-muted-foreground">
            {placed.length}/{project.students.length}
          </span>
        </div>
        <div className="space-y-1">
          {placed.slice(0, 12).map((student) => {
            const room = student.roomId
              ? findRoom(project, student.roomId)
              : undefined;
            return (
              <div
                key={student.id}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm"
              >
                <span className="truncate">
                  {student.name}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {room?.label ?? ""}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => placeStudent(student.id, null)}
                >
                  Çıkar
                </button>
              </div>
            );
          })}
          {placed.length > 12 ? (
            <p className="px-2 text-xs text-muted-foreground">
              +{placed.length - 12} kişi daha
            </p>
          ) : null}
        </div>
      </section>
    </aside>
  );
}

function StudentGroup({
  title,
  students,
  pendingStudentId,
  onPick,
  onRemove,
  selectedRoomId,
  onAssignToSelected,
}: {
  title: string;
  students: { id: string; name: string; gender: StudentGender }[];
  pendingStudentId: string | null;
  onPick: (id: string | null) => void;
  onRemove: (id: string) => void;
  selectedRoomId: string | null;
  onAssignToSelected: (id: string) => void;
}) {
  if (students.length === 0) return null;
  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-xs font-medium">
        <Users className="size-3" />
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {students.map((student) => (
          <button
            key={student.id}
            type="button"
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(
                "application/x-yurt-student",
                student.id,
              );
              event.dataTransfer.effectAllowed = "move";
              onPick(student.id);
            }}
            onClick={() => {
              if (selectedRoomId) onAssignToSelected(student.id);
              else onPick(pendingStudentId === student.id ? null : student.id);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              onRemove(student.id);
            }}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium",
              student.gender === "kiz"
                ? "border-[color:var(--kiz)] bg-[color-mix(in_oklch,var(--kiz)_16%,white)]"
                : "border-[color:var(--erkek)] bg-[color-mix(in_oklch,var(--erkek)_16%,white)]",
              pendingStudentId === student.id && "ring-2 ring-teal-800",
            )}
          >
            {student.name}
          </button>
        ))}
      </div>
    </div>
  );
}
