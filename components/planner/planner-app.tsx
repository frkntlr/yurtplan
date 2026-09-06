"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Hand,
  MousePointer2,
  Paintbrush,
  PanelLeft,
  SlidersHorizontal,
} from "lucide-react";
import { usePlanner } from "@/hooks/use-planner";
import { FloorCanvas } from "@/components/planner/floor-canvas";
import { PlannerInspector } from "@/components/planner/inspector";
import { PlannerSidebar } from "@/components/planner/sidebar";
import { PlannerTopBar } from "@/components/planner/top-bar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function PlannerApp() {
  const planner = usePlanner();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (typing) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) planner.redo();
        else planner.undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        planner.redo();
        return;
      }
      if (event.key === "Escape") {
        planner.setSelectedRoomId(null);
        planner.setTemplate(null);
        planner.setTool("sec");
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        planner.selectedRoomId
      ) {
        event.preventDefault();
        planner.deleteRoom(planner.selectedRoomId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [planner]);

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <PlannerTopBar planner={planner} />
      <div className="flex min-h-0 flex-1">
        <div className="hidden lg:flex">
          <PlannerSidebar planner={planner} />
        </div>
        <main className="relative flex min-w-0 flex-1 flex-col">
          <FloorCanvas planner={planner} />
          <Legend />
        </main>
        <div className="hidden lg:flex">
          <PlannerInspector planner={planner} />
        </div>
      </div>

      <nav className="flex items-center justify-around gap-1 border-t border-border bg-card px-2 py-2 lg:hidden print:hidden">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setLeftOpen(true)}
        >
          <PanelLeft data-icon="inline-start" />
          Araçlar
        </Button>
        <ToolChip
          active={planner.tool === "sec"}
          onClick={() => planner.setTool("sec")}
        >
          <MousePointer2 className="size-4" />
        </ToolChip>
        <ToolChip
          active={planner.tool === "pan"}
          onClick={() => planner.setTool("pan")}
        >
          <Hand className="size-4" />
        </ToolChip>
        <ToolChip
          active={planner.tool === "bina"}
          onClick={() => planner.setTool("bina")}
        >
          <Building2 className="size-4" />
        </ToolChip>
        <ToolChip
          active={planner.tool === "bolge"}
          onClick={() => planner.setTool("bolge")}
        >
          <Paintbrush className="size-4" />
        </ToolChip>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRightOpen(true)}
        >
          <SlidersHorizontal data-icon="inline-start" />
          {planner.selectedRoom ? "Oda" : "Limit"}
        </Button>
      </nav>

      <Sheet open={leftOpen} onOpenChange={setLeftOpen}>
        <SheetContent side="left" className="w-[min(100%,20rem)] overflow-y-auto p-0">
          <SheetHeader>
            <SheetTitle>Araçlar ve odalar</SheetTitle>
          </SheetHeader>
          <PlannerSidebar
            planner={{
              ...planner,
              chooseTemplate: (tpl) => {
                planner.chooseTemplate(tpl);
                setLeftOpen(false);
              },
            }}
            className="w-full border-0"
          />
        </SheetContent>
      </Sheet>
      <Sheet open={rightOpen} onOpenChange={setRightOpen}>
        <SheetContent side="right" className="w-[min(100%,22rem)] overflow-y-auto p-0">
          <SheetHeader>
            <SheetTitle>Limitler ve oda</SheetTitle>
          </SheetHeader>
          <PlannerInspector planner={planner} className="w-full border-0" />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ToolChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg border",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background",
      )}
    >
      {children}
    </button>
  );
}

function Legend() {
  return (
    <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-2 text-[11px] print:static print:mt-2">
      <span className="rounded-full bg-white/90 px-2 py-1 shadow-sm ring-1 ring-stone-200">
        <i className="mr-1 inline-block size-2 rounded-full bg-[var(--kiz)]" />
        Kız bölümü
      </span>
      <span className="rounded-full bg-white/90 px-1.5 py-1 shadow-sm ring-1 ring-stone-200">
        <i className="mr-1 inline-block size-2 rounded-full bg-[var(--erkek)]" />
        Erkek bölümü
      </span>
      <span className="rounded-full bg-white/90 px-1.5 py-1 shadow-sm ring-1 ring-stone-200">
        <i className="mr-1 inline-block size-2 rounded-full bg-[var(--ortak)]" />
        Ortak alan
      </span>
    </div>
  );
}
