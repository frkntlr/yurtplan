"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  activeFloor,
  applyShape,
  assignStudent,
  autoPlaceStudents,
  clone,
  createEmptyProject,
  createFloor,
  floorStats,
  makeRoom,
  paintCells,
  projectStats,
  resizeFloor,
  roomPlacementValid,
  syncOccupants,
  uid,
  normalizeProject,
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
  StudentGender,
  Tool,
  WorkspaceMode,
  Zone,
} from "@/lib/planner/types";

type HistoryFlag = { history?: boolean };

export function usePlanner() {
  const [project, setProjectState] = useState<Project>(createSampleProject);
  const [hydrated, setHydrated] = useState(false);
  const [tool, setTool] = useState<Tool>("sec");
  const [mode, setMode] = useState<WorkspaceMode>("plan");
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
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
      setProject((prev) => {
        const current = activeFloor(prev);
        let students = prev.students;
        if (typeof patch.capacity === "number") {
          const inRoom = students.filter((student) => student.roomId === id);
          if (inRoom.length > patch.capacity) {
            const keep = new Set(
              inRoom.slice(0, patch.capacity).map((student) => student.id),
            );
            students = students.map((student) =>
              student.roomId === id && !keep.has(student.id)
                ? { ...student, roomId: null }
                : student,
            );
          }
        }
        if (patch.gender && patch.gender !== "karma") {
          students = students.map((student) =>
            student.roomId === id && student.gender !== patch.gender
              ? { ...student, roomId: null }
              : student,
          );
        }
        return syncOccupants({
          ...prev,
          students,
          floors: prev.floors.map((f) =>
            f.id === current.id
              ? {
                  ...f,
                  rooms: f.rooms.map((r) =>
                    r.id === id ? { ...r, ...patch } : r,
                  ),
                }
              : f,
          ),
        });
      });
    },
    [setProject],
  );

  const deleteRoom = useCallback(
    (id: string) => {
      setProject((prev) =>
        syncOccupants({
          ...prev,
          floors: prev.floors.map((f) =>
            f.id === activeFloor(prev).id
              ? { ...f, rooms: f.rooms.filter((r) => r.id !== id) }
              : f,
          ),
          students: prev.students.map((student) =>
            student.roomId === id ? { ...student, roomId: null } : student,
          ),
        }),
      );
      setSelectedRoomId((curr) => (curr === id ? null : curr));
    },
    [setProject],
  );

  const setShape = useCallback(
    (shape: BuildingShape) => {
      setProject((prev) => {
        const current = activeFloor(prev);
        return normalizeProject({
          ...prev,
          floors: prev.floors.map((f) =>
            f.id === current.id ? applyShape(f, shape) : f,
          ),
        });
      });
      toast.success("Bina şekli uygulandı.");
    },
    [setProject],
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
    setMode("plan");
    setPendingStudentId(null);
  }, []);

  const switchMode = useCallback((next: WorkspaceMode) => {
    setMode(next);
    setTemplate(null);
    setPendingStudentId(null);
    if (next === "ogrenci") setTool("sec");
  }, []);

  const addStudents = useCallback(
    (raw: string, gender: StudentGender) => {
      const names = raw
        .split(/[,;\n]+/)
        .map((name) => name.trim())
        .filter(Boolean);
      if (names.length === 0) {
        toast.error("Bir isim yazın.");
        return 0;
      }
      setProject((prev) => ({
        ...prev,
        students: [
          ...(prev.students ?? []),
          ...names.map((name) => ({
            id: uid(),
            name,
            gender,
            roomId: null as string | null,
          })),
        ],
      }));
      toast.success(
        names.length === 1
          ? `${names[0]} listeye eklendi.`
          : `${names.length} öğrenci eklendi.`,
      );
      return names.length;
    },
    [setProject],
  );

  const removeStudent = useCallback(
    (id: string) => {
      setProject((prev) =>
        syncOccupants({
          ...prev,
          students: prev.students.filter((student) => student.id !== id),
        }),
      );
      setPendingStudentId((curr) => (curr === id ? null : curr));
    },
    [setProject],
  );

  const placeStudent = useCallback(
    (studentId: string, roomId: string | null) => {
      let error: string | undefined;
      setProject((prev) => {
        const result = assignStudent(prev, studentId, roomId);
        error = result.error;
        return result.error ? prev : result.project;
      });
      if (error) {
        toast.error(error);
        return false;
      }
      setPendingStudentId(null);
      if (roomId) setSelectedRoomId(roomId);
      return true;
    },
    [setProject],
  );

  const autoPlace = useCallback(() => {
    let placed = 0;
    let leftover = 0;
    setProject((prev) => {
      const result = autoPlaceStudents(prev);
      placed = result.placed;
      leftover = result.leftover;
      return result.project;
    });
    if (placed === 0) {
      toast.message(
        leftover
          ? "Boş yatak kalmadı. Oda ekleyin veya limiti kontrol edin."
          : "Bekleyen öğrenci yok.",
      );
    } else if (leftover) {
      toast.warning(
        `${placed} kişi yerleşti, ${leftover} kişi için yer kalmadı.`,
      );
    } else {
      toast.success(`${placed} öğrenci odalara yerleşti.`);
    }
    setPendingStudentId(null);
  }, [setProject]);

  const clearPlacements = useCallback(() => {
    setProject((prev) =>
      syncOccupants({
        ...prev,
        students: prev.students.map((student) => ({ ...student, roomId: null })),
      }),
    );
    toast.success("Tüm öğrenciler bekleyen listeye alındı.");
  }, [setProject]);

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
    mode,
    switchMode,
    pendingStudentId,
    setPendingStudentId,
    addStudents,
    removeStudent,
    placeStudent,
    autoPlace,
    clearPlacements,
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
