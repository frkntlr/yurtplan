"use client";

import { useRef, useState } from "react";
import {
  Download,
  HelpCircle,
  Plus,
  Redo2,
  Trash2,
  Undo2,
  Upload,
  Building2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PlannerApi } from "@/hooks/use-planner";

export function PlannerTopBar({ planner }: { planner: PlannerApi }) {
  const {
    project,
    setName,
    floor,
    selectFloor,
    addFloor,
    removeFloor,
    renameFloor,
    undo,
    redo,
    canUndo,
    canRedo,
    newProject,
    loadSample,
    download,
    upload,
    switchMode,
    mode,
  } = planner;
  const fileRef = useRef<HTMLInputElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <header className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2 print:hidden">
      <div className="flex items-center gap-2 pr-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-teal-800 text-white">
          <Building2 className="size-4" />
        </div>
        <div>
          <p className="font-heading text-sm leading-none">YurtPlan</p>
          <p className="text-[11px] text-muted-foreground">2D oda yerleştirme</p>
        </div>
      </div>

      <div className="flex rounded-lg bg-muted p-0.5">
        <button
          type="button"
          onClick={() => switchMode("plan")}
          className={cn(
            "h-8 rounded-md px-3 text-sm whitespace-nowrap",
            mode === "plan"
              ? "bg-background font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          1. Planı çiz
        </button>
        <button
          type="button"
          onClick={() => switchMode("ogrenci")}
          className={cn(
            "h-8 rounded-md px-3 text-sm whitespace-nowrap",
            mode === "ogrenci"
              ? "bg-background font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          2. Öğrenci yerleştir
        </button>
      </div>

      <Input
        value={project.name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 w-40 font-medium sm:w-52"
        aria-label="Yurt adı"
      />

      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {project.floors.map((item) => (
          <div key={item.id} className="flex items-center">
            <button
              type="button"
              onClick={() => selectFloor(item.id)}
              onDoubleClick={() => {
                const name = window.prompt("Kat adı", item.name);
                if (name) renameFloor(item.id, name);
              }}
              className={cn(
                "h-8 rounded-md px-2.5 text-sm whitespace-nowrap",
                item.id === floor.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80",
              )}
            >
              {item.name}
            </button>
            {project.floors.length > 1 && item.id === floor.id ? (
              <button
                type="button"
                className="ml-0.5 rounded-md p-1 text-muted-foreground hover:text-destructive"
                aria-label="Katı sil"
                onClick={() => removeFloor(item.id)}
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={addFloor}>
          <Plus data-icon="inline-start" />
          Kat
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Geri al"
        >
          <Undo2 />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={redo}
          disabled={!canRedo}
          aria-label="Yinele"
        >
          <Redo2 />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              Dosya
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={newProject}>
              Yeni boş yurt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={loadSample}>
              <Sparkles />
              Örnek yurt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={download}>
              <Download />
              JSON indir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileRef.current?.click()}>
              <Upload />
              JSON yükle
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setHelpOpen(true)}
          aria-label="Nasıl kullanılır"
        >
          <HelpCircle />
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>İki adım: plan, sonra isimler</DialogTitle>
            <DialogDescription>
              Önce kat planını çizin. Sonra öğrenci isimlerini odalara koyun.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li>
              <strong>1. Planı çiz.</strong> Bina şekli, kız/erkek bölümü, odalar
              ve yatak limiti.
            </li>
            <li>
              <strong>2. Öğrenci yerleştir.</strong> Üstten bu sekmeyi açın.
              İsim yazıp listeye ekleyin.
            </li>
            <li>
              Bekleyen karta tıklayın, sonra plandaki odaya tıklayın. Kartı
              sürükleyebilirsiniz.
            </li>
            <li>
              <strong>Otomatik</strong> kızları kız odalarına, erkekleri erkek
              odalarına doldurur. Kız erkek odasına girmez.
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </header>
  );
}
