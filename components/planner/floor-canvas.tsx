"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bath,
  BedDouble,
  CookingPot,
  Sofa,
  WashingMachine,
  DoorOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasBuilding, isRoomValid, roomPlacementValid } from "@/lib/planner/model";
import { CELL_SIZE, type Floor, type Room, type RoomKind, type Zone } from "@/lib/planner/types";
import type { PlannerApi } from "@/hooks/use-planner";

const ZONE_FILL: Record<Zone, string> = {
  none: "transparent",
  kiz: "color-mix(in oklch, var(--kiz) 42%, transparent)",
  erkek: "color-mix(in oklch, var(--erkek) 42%, transparent)",
  ortak: "color-mix(in oklch, var(--ortak) 48%, transparent)",
};

const KIND_ICON: Record<RoomKind, typeof BedDouble> = {
  oda: BedDouble,
  banyo: Bath,
  wc: Bath,
  mutfak: CookingPot,
  salon: Sofa,
  camasir: WashingMachine,
  koridor: DoorOpen,
};

function cellFromEvent(
  event: { clientX: number; clientY: number },
  board: HTMLElement,
  cols: number,
  rows: number,
) {
  const rect = board.getBoundingClientRect();
  const x = Math.floor(((event.clientX - rect.left) / rect.width) * cols);
  const y = Math.floor(((event.clientY - rect.top) / rect.height) * rows);
  return {
    x: Math.min(cols - 1, Math.max(0, x)),
    y: Math.min(rows - 1, Math.max(0, y)),
    outside:
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom,
  };
}

function brushCells(
  x: number,
  y: number,
  size: number,
  cols: number,
  rows: number,
) {
  const cells: { x: number; y: number }[] = [];
  for (let dy = 0; dy < size; dy++) {
    for (let dx = 0; dx < size; dx++) {
      const cx = x + dx;
      const cy = y + dy;
      if (cx >= 0 && cy >= 0 && cx < cols && cy < rows) {
        cells.push({ x: cx, y: cy });
      }
    }
  }
  return cells;
}

function roomAt(floor: Floor, x: number, y: number): Room | undefined {
  return floor.rooms.find(
    (r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h,
  );
}

export function FloorCanvas({ planner }: { planner: PlannerApi }) {
  const {
    floor,
    tool,
    template,
    selectedRoomId,
    setSelectedRoomId,
    paint,
    checkpoint,
    placeRoomAt,
    moveRoom,
    resizeRoom,
    setTool,
    pendingStudentId,
    setPendingStudentId,
    placeStudent,
    project,
    mode,
  } = planner;

  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 48, y: 36, scale: 1 });
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const drag = useRef<
    | { type: "paint" }
    | { type: "pan"; x: number; y: number; vx: number; vy: number }
    | {
        type: "room";
        id: string;
        ox: number;
        oy: number;
        startX: number;
        startY: number;
      }
    | {
        type: "resize";
        id: string;
        startW: number;
        startH: number;
        sx: number;
        sy: number;
      }
    | { type: "place" }
    | null
  >(null);
  const [liveRoom, setLiveRoom] = useState<{
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(e.type === "keydown");
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  const fit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const pad = 64;
    const sx = (vp.clientWidth - pad) / (floor.cols * CELL_SIZE);
    const sy = (vp.clientHeight - pad) / (floor.rows * CELL_SIZE);
    const scale = Math.min(1.35, Math.max(0.45, Math.min(sx, sy)));
    setView({
      scale,
      x: (vp.clientWidth - floor.cols * CELL_SIZE * scale) / 2,
      y: (vp.clientHeight - floor.rows * CELL_SIZE * scale) / 2,
    });
  }, [floor.cols, floor.rows, setView]);

  useEffect(() => {
    fit();
  }, [fit, floor.id]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = viewRef.current;
      const rect = vp.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const delta = event.deltaY > 0 ? 0.92 : 1.08;
      const scale = Math.min(2.2, Math.max(0.35, current.scale * delta));
      const wx = (mx - current.x) / current.scale;
      const wy = (my - current.y) / current.scale;
      setView({
        scale,
        x: mx - wx * scale,
        y: my - wy * scale,
      });
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

  const startPan = (event: React.PointerEvent) => {
    drag.current = {
      type: "pan",
      x: event.clientX,
      y: event.clientY,
      vx: view.x,
      vy: view.y,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button === 1 || event.button === 2 || spaceDown || tool === "pan") {
      event.preventDefault();
      startPan(event);
      return;
    }
    if (event.button !== 0) return;
    const board = boardRef.current;
    if (!board) return;
    const cell = cellFromEvent(event, board, floor.cols, floor.rows);

    if (tool === "bina" || tool === "bolge") {
      checkpoint();
      drag.current = { type: "paint" };
      paint(brushCells(cell.x, cell.y, 1, floor.cols, floor.rows));
      board.setPointerCapture(event.pointerId);
      return;
    }

    if (tool === "yerlestir" && template) {
      drag.current = { type: "place" };
      setGhost({ x: cell.x, y: cell.y });
      board.setPointerCapture(event.pointerId);
      return;
    }

    const hit = roomAt(floor, cell.x, cell.y);
    if (hit) {
      if (pendingStudentId && hit.kind === "oda") {
        placeStudent(pendingStudentId, hit.id);
        return;
      }
      setSelectedRoomId(hit.id);
      if (mode !== "ogrenci") setTool("sec");
      if (mode === "ogrenci") return;
      checkpoint();
      drag.current = {
        type: "room",
        id: hit.id,
        ox: cell.x - hit.x,
        oy: cell.y - hit.y,
        startX: hit.x,
        startY: hit.y,
      };
      setLiveRoom({ id: hit.id, x: hit.x, y: hit.y, w: hit.w, h: hit.h });
      board.setPointerCapture(event.pointerId);
      return;
    }

    setSelectedRoomId(null);
    if (pendingStudentId) setPendingStudentId(null);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const board = boardRef.current;
    const current = drag.current;
    if (current?.type === "pan") {
      setView((v) => ({
        ...v,
        x: current.vx + (event.clientX - current.x),
        y: current.vy + (event.clientY - current.y),
      }));
      return;
    }
    if (!board) return;
    const cell = cellFromEvent(event, board, floor.cols, floor.rows);

    if (tool === "yerlestir" && template && !cell.outside) {
      setGhost({ x: cell.x, y: cell.y });
    }

    if (!current) return;

    if (current.type === "paint" && (tool === "bina" || tool === "bolge")) {
      paint(brushCells(cell.x, cell.y, 1, floor.cols, floor.rows));
      return;
    }

    if (current.type === "room") {
      const x = cell.x - current.ox;
      const y = cell.y - current.oy;
      const room = floor.rooms.find((r) => r.id === current.id);
      if (!room) return;
      if (roomPlacementValid(floor, x, y, room.w, room.h, room.id)) {
        setLiveRoom({ id: room.id, x, y, w: room.w, h: room.h });
      }
      return;
    }

    if (current.type === "resize") {
      const room = floor.rooms.find((r) => r.id === current.id);
      if (!room) return;
      const w = current.startW + (cell.x - current.sx);
      const h = current.startH + (cell.y - current.sy);
      if (roomPlacementValid(floor, room.x, room.y, Math.max(2, w), Math.max(2, h), room.id)) {
        setLiveRoom({
          id: room.id,
          x: room.x,
          y: room.y,
          w: Math.max(2, w),
          h: Math.max(2, h),
        });
      }
    }
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const current = drag.current;
    const board = boardRef.current;
    if (current?.type === "place" && template && board) {
      const cell = cellFromEvent(event, board, floor.cols, floor.rows);
      placeRoomAt(cell.x, cell.y, template);
    }
    if (current?.type === "room" && liveRoom) {
      moveRoom(current.id, liveRoom.x, liveRoom.y, { history: false });
    }
    if (current?.type === "resize" && liveRoom) {
      resizeRoom(current.id, liveRoom.w, liveRoom.h, { history: false });
    }
    drag.current = null;
    setLiveRoom(null);
    if (tool !== "yerlestir") setGhost(null);
  };

  const startResize = (event: React.PointerEvent, room: Room) => {
    event.stopPropagation();
    event.preventDefault();
    const board = boardRef.current;
    if (!board) return;
    checkpoint();
    const cell = cellFromEvent(event, board, floor.cols, floor.rows);
    drag.current = {
      type: "resize",
      id: room.id,
      startW: room.w,
      startH: room.h,
      sx: cell.x,
      sy: cell.y,
    };
    setLiveRoom({ id: room.id, x: room.x, y: room.y, w: room.w, h: room.h });
    setSelectedRoomId(room.id);
    board.setPointerCapture(event.pointerId);
  };

  const ghostValid = useMemo(() => {
    if (!ghost || !template) return false;
    return roomPlacementValid(floor, ghost.x, ghost.y, template.w, template.h);
  }, [ghost, template, floor]);

  const built = hasBuilding(floor);
  const cursor =
    spaceDown || tool === "pan"
      ? "cursor-grab"
      : tool === "bina" || tool === "bolge"
        ? "cursor-cell"
        : tool === "yerlestir"
          ? "cursor-copy"
          : "cursor-default";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={viewportRef}
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden bg-[oklch(0.93_0.012_80)]",
          cursor,
        )}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.target === viewportRef.current) {
            if (spaceDown || tool === "pan" || e.button === 1) startPan(e);
          }
        }}
        onPointerMove={(e) => {
          if (drag.current?.type === "pan") onPointerMove(e);
        }}
        onPointerUp={() => {
          if (drag.current?.type === "pan") drag.current = null;
        }}
      >
        <div
          className="absolute origin-top-left will-change-transform"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        >
          <AxisLabels cols={floor.cols} rows={floor.rows} />
          <div
            ref={boardRef}
            className="relative rounded-sm shadow-[0_20px_50px_-24px_rgba(60,40,20,0.45)] ring-1 ring-stone-400/40"
            style={{
              width: floor.cols * CELL_SIZE,
              height: floor.rows * CELL_SIZE,
              backgroundColor: "oklch(0.88 0.01 80)",
              backgroundImage: `
                linear-gradient(to right, rgb(120 90 50 / 0.12) 1px, transparent 1px),
                linear-gradient(to bottom, rgb(120 90 50 / 0.12) 1px, transparent 1px)
              `,
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
              touchAction: "none",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDragOver={(event) => {
              event.preventDefault();
              const cell = cellFromEvent(event, boardRef.current!, floor.cols, floor.rows);
              setGhost({ x: cell.x, y: cell.y });
            }}
            onDrop={(event) => {
              event.preventDefault();
              const studentId = event.dataTransfer.getData(
                "application/x-yurt-student",
              );
              const cell = cellFromEvent(event, boardRef.current!, floor.cols, floor.rows);
              if (studentId) {
                const target = roomAt(floor, cell.x, cell.y);
                if (target) placeStudent(studentId, target.id);
                return;
              }
              if (!template) return;
              placeRoomAt(cell.x, cell.y, template);
            }}
          >
            {floor.building.map((row, y) =>
              row.map((on, x) =>
                on ? (
                  <div
                    key={`${x}-${y}`}
                    className="pointer-events-none absolute"
                    style={{
                      left: x * CELL_SIZE,
                      top: y * CELL_SIZE,
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      background: `linear-gradient(180deg, oklch(0.99 0.008 85), oklch(0.965 0.012 85))`,
                      boxShadow: `inset 0 0 0 1px rgb(90 70 40 / 0.08)`,
                    }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ background: ZONE_FILL[floor.zones[y][x]] }}
                    />
                  </div>
                ) : null,
              ),
            )}

            {floor.rooms.map((room) => {
              const live = liveRoom?.id === room.id ? liveRoom : null;
              const display = live
                ? { ...room, x: live.x, y: live.y, w: live.w, h: live.h }
                : room;
              return (
                <RoomBlock
                  key={room.id}
                  room={display}
                  names={project.students
                    .filter((student) => student.roomId === room.id)
                    .map((student) => student.name)}
                  selected={selectedRoomId === room.id}
                  invalid={!isRoomValid(floor, display)}
                  highlight={Boolean(pendingStudentId && room.kind === "oda")}
                  onResizePointerDown={(e) => startResize(e, room)}
                />
              );
            })}

            {tool === "yerlestir" && template && ghost ? (
              <div
                className={cn(
                  "pointer-events-none absolute rounded-md border-2 border-dashed",
                  ghostValid
                    ? "border-teal-700/70 bg-teal-600/20"
                    : "border-red-600/70 bg-red-500/15",
                )}
                style={{
                  left: ghost.x * CELL_SIZE,
                  top: ghost.y * CELL_SIZE,
                  width: template.w * CELL_SIZE,
                  height: template.h * CELL_SIZE,
                }}
              />
            ) : null}
          </div>
        </div>

        {!built ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <div className="max-w-sm rounded-2xl border border-dashed border-stone-400/70 bg-white/80 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
              <p className="font-heading text-lg text-stone-800">
                Bina henüz çizilmedi
              </p>
              <p className="mt-1 text-sm text-stone-600">
                Soldan bir şekil seçin veya fırçayla kat planını boyayın. Sonra
                kız / erkek bölümünü işaretleyip odaları yerleştirin.
              </p>
            </div>
          </div>
        ) : pendingStudentId ? (
          <div className="pointer-events-none absolute top-12 left-1/2 z-10 -translate-x-1/2 rounded-full bg-teal-800 px-3 py-1.5 text-xs font-medium text-white shadow-md">
            Şimdi bir odaya tıklayın
          </div>
        ) : null}
      </div>

      <div className="pointer-events-none absolute right-3 bottom-3 flex gap-1 print:hidden">
        <CanvasButton onClick={() => setView((v) => ({ ...v, scale: Math.min(2.2, v.scale * 1.12) }))}>
          +
        </CanvasButton>
        <CanvasButton onClick={() => setView((v) => ({ ...v, scale: Math.max(0.35, v.scale * 0.9) }))}>
          −
        </CanvasButton>
        <CanvasButton onClick={fit}>Sığdır</CanvasButton>
      </div>
    </div>
  );
}

function CanvasButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto h-8 min-w-8 rounded-md border border-stone-300/80 bg-white/90 px-2 text-sm font-medium text-stone-700 shadow-sm backdrop-blur hover:bg-white"
    >
      {children}
    </button>
  );
}

function AxisLabels({ cols, rows }: { cols: number; rows: number }) {
  return (
    <>
      <div
        className="absolute -top-5 left-0 flex text-[10px] text-stone-500"
        style={{ width: cols * CELL_SIZE }}
      >
        {Array.from({ length: cols }, (_, i) => (
          <span
            key={i}
            className="flex items-center justify-center"
            style={{ width: CELL_SIZE }}
          >
            {i % 2 === 0 ? i + 1 : ""}
          </span>
        ))}
      </div>
      <div
        className="absolute top-0 -left-6 flex flex-col text-[10px] text-stone-500"
        style={{ height: rows * CELL_SIZE }}
      >
        {Array.from({ length: rows }, (_, i) => (
          <span
            key={i}
            className="flex items-center justify-end pr-1"
            style={{ height: CELL_SIZE }}
          >
            {i % 2 === 0 ? i + 1 : ""}
          </span>
        ))}
      </div>
    </>
  );
}

function RoomBlock({
  room,
  names,
  selected,
  invalid,
  highlight,
  onResizePointerDown,
}: {
  room: Room;
  names: string[];
  selected: boolean;
  invalid: boolean;
  highlight: boolean;
  onResizePointerDown: (event: React.PointerEvent) => void;
}) {
  const Icon = KIND_ICON[room.kind];
  const genderRing =
    room.kind !== "oda"
      ? "border-stone-400 bg-[oklch(0.97_0.01_85)]"
      : room.gender === "kiz"
        ? "border-[color:var(--kiz)] bg-[color-mix(in_oklch,var(--kiz)_18%,white)]"
        : room.gender === "erkek"
          ? "border-[color:var(--erkek)] bg-[color-mix(in_oklch,var(--erkek)_18%,white)]"
          : "border-stone-500 bg-white";

  return (
    <div
      className={cn(
        "absolute flex flex-col overflow-hidden rounded-[6px] border-2 shadow-sm",
        genderRing,
        selected && "z-10 ring-2 ring-teal-700 ring-offset-1",
        highlight && !selected && "ring-1 ring-teal-600/50",
        invalid && "border-red-600 bg-red-50",
      )}
      style={{
        left: room.x * CELL_SIZE + 2,
        top: room.y * CELL_SIZE + 2,
        width: room.w * CELL_SIZE - 4,
        height: room.h * CELL_SIZE - 4,
      }}
    >
      <div className="flex items-center justify-between gap-1 px-1.5 pt-1">
        <span className="truncate text-[10px] font-semibold tracking-wide text-stone-800">
          {room.label}
          {room.kind === "oda" ? ` · ${names.length || room.occupants}/${room.capacity}` : ""}
        </span>
        <Icon className="size-3 shrink-0 text-stone-500" />
      </div>
      {room.kind === "oda" ? (
        <div className="flex flex-1 flex-col justify-between px-1.5 pb-1">
          <BedDots capacity={room.capacity} occupants={names.length || room.occupants} />
          {names.length ? (
            <p className="truncate text-[10px] leading-tight text-stone-700">
              {names.slice(0, 3).join(", ")}
              {names.length > 3 ? ` +${names.length - 3}` : ""}
            </p>
          ) : (
            <p className="text-[10px] font-medium text-stone-600">
              {room.occupants}/{room.capacity} yatak
            </p>
          )}
        </div>
      ) : (
        <p className="px-1.5 text-[10px] text-stone-500">Ortak</p>
      )}
      {selected ? (
        <button
          type="button"
          aria-label="Boyutlandır"
          onPointerDown={onResizePointerDown}
          className="absolute right-0.5 bottom-0.5 size-3 cursor-nwse-resize rounded-sm bg-teal-800"
        />
      ) : null}
    </div>
  );
}

function BedDots({ capacity, occupants }: { capacity: number; occupants: number }) {
  return (
    <div className="mt-0.5 flex flex-wrap gap-0.5">
      {Array.from({ length: capacity }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 w-3 rounded-[2px]",
            i < occupants ? "bg-teal-800" : "bg-stone-300",
          )}
        />
      ))}
    </div>
  );
}
