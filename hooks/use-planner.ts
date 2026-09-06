"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  activeFloor,
  applyShape,
  clone,
  createEmptyProject,
  createFloor,
  floorStats,
  makeRoom,
  paintCells,
  projectStats,
  resizeFloor,
  roomPlacementValid,
} from "@/lib/planner/model";
import { createSampleProject } from "@/lib/planner/sample";
import {
  exportProject,
  importProject,
  loadProject,
  saveProject,
} from "@/lib/planner/storage";
import type {
  BuildingShape,
  Floor,
  Limits,
  Project,
  Room,
  RoomTemplate,
  Tool,
  Zone,
} from "@/lib/planner/types";

type HistoryFlag = { history?: boolean };

export function usePlanner() {
  const [project, setProjectState] = useState<Project>(createSampleProject);
  const [hydrated, setHydrated] = useState(false);
  const [tool, setTool] = useState<Tool>("sec");
  const [zoneBrush, setZoneBrush] = useState<Zone>("kiz");
  const [buildingPaint, setBuildingPaint] = useState<boolean>(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [template, setTemplate] = useState<RoomTemplate | null>(null);
  const [historyCount, setHistoryCount] = useState({ undo: 0, redo: 0 });
  const history = useRef<string[]>([]);
  const future = useRef<string[]>([]);

  const bumpHistory = useCallback(() => {
    setHistoryCount({
      undo: history.current.length,
      redo: future.current.length,
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProjectState(loadProject());
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => saveProject(project), 280);
    return () => window.clearTimeout(timer);
  }, [project, hydrated]);

  const setProject = useCallback(
    (
      updater: Project | ((prev: Project) => Project),
      flag: HistoryFlag = {},
    ) => {
      setProjectState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (flag.history !== false) {
          history.current.push(JSON.stringify(prev));
          if (history.current.length > 70) history.current.shift();
          future.current = [];
        }
        return next;
      });
      if (flag.history !== false) {
        queueMicrotask(bumpHistory);
      }
    },
    [bumpHistory],
  );

  const checkpoint = useCallback(() => {
    history.current.push(JSON.stringify(project));
    if (history.current.length > 70) history.current.shift();
    future.current = [];
    bumpHistory();
  }, [project, bumpHistory]);

  const updateActiveFloor = useCallback(
    (mutator: (floor: Floor) => Floor, flag: HistoryFlag = {}) => {
      setProject((prev) => {
        const current = activeFloor(prev);
        const nextFloor = mutator(current);
        return {
          ...prev,
          floors: prev.floors.map((f) =>
            f.id === current.id ? nextFloor : f,
          ),
        };
      }, flag);
    },
    [setProject],
  );

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    future.current.push(JSON.stringify(project));
    setProjectState(JSON.parse(prev) as Project);
    bumpHistory();
  };

  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    history.current.push(JSON.stringify(project));
    setProjectState(JSON.parse(next) as Project);
    bumpHistory();
  };

  const floor = activeFloor(project);
  const floorIndex = Math.max(
    0,
    project.floors.findIndex((f) => f.id === floor.id),
  );
  const stats = useMemo(() => projectStats(project), [project]);
  const currentFloorStats = useMemo(() => floorStats(floor), [floor]);
  const selectedRoom =
    floor.rooms.find((r) => r.id === selectedRoomId) ?? null;

  const paint = useCallback(
    (
      cells: { x: number; y: number }[],
      flag: HistoryFlag = { history: false },
    ) => {
      if (tool === "bina") {
        updateActiveFloor(
          (f) =>
            paintCells(f, cells, {
              type: "building",
              value: buildingPaint,
            }),
          flag,
        );
      } else if (tool === "bolge") {
        updateActiveFloor(
          (f) => paintCells(f, cells, { type: "zone", value: zoneBrush }),
          flag,
        );
      }
    },
    [tool, buildingPaint, zoneBrush, updateActiveFloor],
  );

  const placeRoomAt = useCallback(
    (x: number, y: number, tpl?: RoomTemplate) => {
      const used = tpl ?? template;
      if (!used) return false;
      let placed = false;
      setProject((prev) => {
        const current = activeFloor(prev);
        const idx = prev.floors.findIndex((f) => f.id === current.id);
        const count = current.rooms.filter((r) => r.kind === "oda").length;
        if (!roomPlacementValid(current, x, y, used.w, used.h)) {
          toast.error("Burası uygun değil. Bina içinde boş bir yer seçin.");
          return prev;
        }
        if (used.kind === "oda" && count >= prev.limits.maxOdaPerKat) {
          toast.error(
            `Bu katta oda limiti doldu (${prev.limits.maxOdaPerKat}). Sağdaki limitleri artırın.`,
          );
          return prev;
        }
        const room = makeRoom(
          current,
          idx,
          used,
          x,
          y,
          prev.limits.defaultKapasite,
        );
        placed = true;
        setSelectedRoomId(room.id);
        setTool("sec");
        setTemplate(null);
        const totals = projectStats(prev);
        const nextKiz =
          totals.kizKapasite + (room.gender === "kiz" ? room.capacity : 0);
        const nextErkek =
          totals.erkekKapasite + (room.gender === "erkek" ? room.capacity : 0);
        if (room.kind === "oda" && nextKiz > prev.limits.maxKizYatak) {
          toast.warning(
            `Kız yatağı limiti aşıldı (${nextKiz}/${prev.limits.maxKizYatak}).`,
          );
        }
        if (room.kind === "oda" && nextErkek > prev.limits.maxErkekYatak) {
          toast.warning(
            `Erkek yatağı limiti aşıldı (${nextErkek}/${prev.limits.maxErkekYatak}).`,
          );
        }
        return {
          ...prev,
          floors: prev.floors.map((f) =>
            f.id === current.id
              ? { ...f, rooms: [...f.rooms, room] }
              : f,
          ),
        };
      });
      return placed;
    },
    [template, setProject],
  );

  const moveRoom = useCallback(
    (id: string, x: number, y: number, flag: HistoryFlag = {}) => {
      let ok = false;
      updateActiveFloor((f) => {
        const room = f.rooms.find((r) => r.id === id);
        if (!room) return f;
        if (!roomPlacementValid(f, x, y, room.w, room.h, id)) return f;
        ok = true;
        return {
          ...f,
          rooms: f.rooms.map((r) => (r.id === id ? { ...r, x, y } : r)),
        };
      }, flag);
      return ok;
    },
    [updateActiveFloor],
  );

  const resizeRoom = useCallback(
    (id: string, w: number, h: number, flag: HistoryFlag = {}) => {
      let ok = false;
      updateActiveFloor((f) => {
        const room = f.rooms.find((r) => r.id === id);
        if (!room) return f;
        const nw = Math.max(2, w);
        const nh = Math.max(2, h);
        if (!roomPlacementValid(f, room.x, room.y, nw, nh, id)) return f;
        ok = true;
        return {
          ...f,
          rooms: f.rooms.map((r) =>
            r.id === id ? { ...r, w: nw, h: nh } : r,
          ),
        };
      }, flag);
      return ok;
    },
    [updateActiveFloor],
  );

  const updateRoom = useCallback(
    (id: string, patch: Partial<Room>) => {
      updateActiveFloor((f) => ({
        ...f,
        rooms: f.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }));
    },
    [updateActiveFloor],
  );

  const deleteRoom = useCallback(
    (id: string) => {
      updateActiveFloor((f) => ({
        ...f,
        rooms: f.rooms.filter((r) => r.id !== id),
      }));
      setSelectedRoomId((curr) => (curr === id ? null : curr));
    },
    [updateActiveFloor],
  );

  const setShape = useCallback(
    (shape: BuildingShape) => {
      updateActiveFloor((f) => applyShape(f, shape));
      toast.success("Bina şekli uygulandı.");
    },
    [updateActiveFloor],
  );

  const setGridSize = useCallback(
    (cols: number, rows: number) => {
      updateActiveFloor((f) => resizeFloor(f, cols, rows));
    },
    [updateActiveFloor],
  );

  const addFloor = useCallback(() => {
    setProject((prev) => {
      const source = activeFloor(prev);
      const nextFloor = createFloor(
        `Kat ${prev.floors.length + 1}`,
        source.cols,
        source.rows,
      );
      nextFloor.building = clone(source.building);
      nextFloor.zones = clone(source.zones);
      return {
        ...prev,
        floors: [...prev.floors, nextFloor],
        activeFloorId: nextFloor.id,
      };
    });
    setSelectedRoomId(null);
  }, [setProject]);

  const removeFloor = useCallback(
    (id: string) => {
      setProject((prev) => {
        if (prev.floors.length === 1) {
          toast.error("En az bir kat olmalı.");
          return prev;
        }
        const floors = prev.floors.filter((f) => f.id !== id);
        return {
          ...prev,
          floors,
          activeFloorId:
            prev.activeFloorId === id ? floors[0].id : prev.activeFloorId,
        };
      });
      setSelectedRoomId(null);
    },
    [setProject],
  );

  const renameFloor = useCallback(
    (id: string, name: string) => {
      setProject((prev) => ({
        ...prev,
        floors: prev.floors.map((f) => (f.id === id ? { ...f, name } : f)),
      }));
    },
    [setProject],
  );

  const selectFloor = useCallback(
    (id: string) => {
      setProject((prev) => ({ ...prev, activeFloorId: id }), {
        history: false,
      });
      setSelectedRoomId(null);
    },
    [setProject],
  );

  const setLimits = useCallback(
    (patch: Partial<Limits>) => {
      setProject((prev) => ({
        ...prev,
        limits: { ...prev.limits, ...patch },
      }));
    },
    [setProject],
  );

  const setName = useCallback(
    (name: string) => {
      setProject((prev) => ({ ...prev, name }), { history: false });
    },
    [setProject],
  );

  const newProject = useCallback(() => {
    setProject(createEmptyProject());
    setSelectedRoomId(null);
    setTool("bina");
    toast.success("Boş plan açıldı. Önce bina şeklini seçin veya çizin.");
  }, [setProject]);

  const loadSample = useCallback(() => {
    setProject(createSampleProject());
    setSelectedRoomId(null);
    setTool("sec");
    toast.success("Örnek yurt yüklendi.");
  }, [setProject]);

  const download = useCallback(() => {
    exportProject(project);
  }, [project]);

  const upload = useCallback(
    async (file: File) => {
      try {
        const next = await importProject(file);
        setProject(next);
        setSelectedRoomId(null);
        toast.success("Plan içe aktarıldı.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Dosya okunamadı.",
        );
      }
    },
    [setProject],
  );

  const chooseTemplate = useCallback((tpl: RoomTemplate) => {
    setTemplate(tpl);
    setTool("yerlestir");
    setSelectedRoomId(null);
  }, []);

  return {
    project,
    hydrated,
    floor,
    floorIndex,
    stats,
    currentFloorStats,
    tool,
    setTool,
    zoneBrush,
    setZoneBrush,
    buildingPaint,
    setBuildingPaint,
    selectedRoomId,
    setSelectedRoomId,
    selectedRoom,
    template,
    chooseTemplate,
    setTemplate,
    paint,
    checkpoint,
    placeRoomAt,
    moveRoom,
    resizeRoom,
    updateRoom,
    deleteRoom,
    setShape,
    setGridSize,
    addFloor,
    removeFloor,
    renameFloor,
    selectFloor,
    setLimits,
    setName,
    newProject,
    loadSample,
    download,
    upload,
    undo,
    redo,
    canUndo: historyCount.undo > 0,
    canRedo: historyCount.redo > 0,
  };
}

export type PlannerApi = ReturnType<typeof usePlanner>;
