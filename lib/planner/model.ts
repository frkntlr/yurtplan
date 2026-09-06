import type {
  BuildingShape,
  Floor,
  Gender,
  Limits,
  Project,
  Room,
  RoomTemplate,
  Student,
  StudentGender,
  Zone,
} from "./types";

export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

export function makeGrid<T>(cols: number, rows: number, fill: T): T[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => fill),
  );
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createFloor(
  name: string,
  cols = 32,
  rows = 22,
): Floor {
  return {
    id: uid(),
    name,
    cols,
    rows,
    building: makeGrid(cols, rows, false),
    zones: makeGrid<Zone>(cols, rows, "none"),
    rooms: [],
  };
}

export function defaultLimits(): Limits {
  return {
    maxKizYatak: 60,
    maxErkekYatak: 60,
    maxOdaPerKat: 16,
    defaultKapasite: 4,
  };
}

export function createEmptyProject(): Project {
  const floor = createFloor("Kat 1");
  return {
    name: "Yeni yurt",
    floors: [floor],
    activeFloorId: floor.id,
    limits: defaultLimits(),
    students: [],
  };
}

export function activeFloor(project: Project): Floor {
  return (
    project.floors.find((f) => f.id === project.activeFloorId) ??
    project.floors[0]
  );
}

export function hasBuilding(floor: Floor): boolean {
  return floor.building.some((row) => row.some(Boolean));
}

export function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function isInsideBuilding(
  floor: Floor,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  if (x < 0 || y < 0 || x + w > floor.cols || y + h > floor.rows) {
    return false;
  }
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (!floor.building[yy]?.[xx]) return false;
    }
  }
  return true;
}

export function overlapsRooms(
  rooms: Room[],
  x: number,
  y: number,
  w: number,
  h: number,
  ignoreId?: string,
): boolean {
  const rect = { x, y, w, h };
  return rooms.some((r) => r.id !== ignoreId && rectsOverlap(r, rect));
}

export function roomPlacementValid(
  floor: Floor,
  x: number,
  y: number,
  w: number,
  h: number,
  ignoreId?: string,
): boolean {
  return (
    isInsideBuilding(floor, x, y, w, h) &&
    !overlapsRooms(floor.rooms, x, y, w, h, ignoreId)
  );
}

export function majorityGender(
  floor: Floor,
  x: number,
  y: number,
  w: number,
  h: number,
): Gender {
  let kiz = 0;
  let erkek = 0;
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const z = floor.zones[yy]?.[xx];
      if (z === "kiz") kiz++;
      if (z === "erkek") erkek++;
    }
  }
  if (kiz === 0 && erkek === 0) return "karma";
  return kiz >= erkek ? "kiz" : "erkek";
}

export function nextRoomLabel(floor: Floor, floorIndex: number): string {
  const prefix = floorIndex + 1;
  const used = new Set(floor.rooms.map((r) => r.label));
  for (let n = 1; n < 200; n++) {
    const label = `${prefix}${String(n).padStart(2, "0")}`;
    if (!used.has(label)) return label;
  }
  return `${prefix}${floor.rooms.length + 1}`;
}

export function applyShape(floor: Floor, shape: BuildingShape): Floor {
  const next = clone(floor);
  const { cols, rows } = next;
  next.building = makeGrid(cols, rows, false);
  const wing = Math.max(7, Math.round(cols * 0.28));
  const bar = Math.max(5, Math.round(rows * 0.26));

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let fill = false;
      if (shape === "dikdortgen") fill = true;
      else if (shape === "l") fill = x < wing || y >= rows - bar;
      else if (shape === "u") fill = x < wing || x >= cols - wing || y >= rows - bar;
      else if (shape === "c") fill = y < bar || y >= rows - bar || x < wing;
      else if (shape === "kanat") {
        const mid = Math.floor(rows / 2);
        fill =
          x < wing ||
          x >= cols - wing ||
          (y >= mid - 1 && y <= mid + 2);
      }
      next.building[y][x] = fill;
    }
  }

  next.zones = makeGrid<Zone>(cols, rows, "none");
  applyDefaultZones(next, shape);
  next.rooms = next.rooms.filter((r) =>
    isInsideBuilding(next, r.x, r.y, r.w, r.h),
  );
  return next;
}

export function applyDefaultZones(floor: Floor, shape: BuildingShape): void {
  const { cols, rows } = floor;
  const wing = Math.max(7, Math.round(cols * 0.28));
  const bar = Math.max(5, Math.round(rows * 0.26));

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!floor.building[y][x]) {
        floor.zones[y][x] = "none";
        continue;
      }
      if (shape === "dikdortgen") {
        floor.zones[y][x] = x < cols / 2 ? "kiz" : "erkek";
        if (y >= rows - bar) floor.zones[y][x] = "ortak";
      } else if (shape === "l") {
        floor.zones[y][x] = x < wing && y < rows - bar ? "kiz" : "ortak";
      } else if (shape === "u" || shape === "kanat") {
        if (x < wing && y < rows - bar) floor.zones[y][x] = "kiz";
        else if (x >= cols - wing && y < rows - bar) floor.zones[y][x] = "erkek";
        else floor.zones[y][x] = "ortak";
      } else if (shape === "c") {
        if (y < bar) floor.zones[y][x] = "kiz";
        else if (y >= rows - bar) floor.zones[y][x] = "erkek";
        else floor.zones[y][x] = "ortak";
      }
    }
  }
}

export function resizeFloor(floor: Floor, cols: number, rows: number): Floor {
  const next = clone(floor);
  const building = makeGrid(cols, rows, false);
  const zones = makeGrid<Zone>(cols, rows, "none");
  for (let y = 0; y < Math.min(rows, floor.rows); y++) {
    for (let x = 0; x < Math.min(cols, floor.cols); x++) {
      building[y][x] = floor.building[y][x];
      zones[y][x] = floor.zones[y][x];
    }
  }
  next.cols = cols;
  next.rows = rows;
  next.building = building;
  next.zones = zones;
  next.rooms = next.rooms.filter(
    (r) => r.x + r.w <= cols && r.y + r.h <= rows && isInsideBuilding(next, r.x, r.y, r.w, r.h),
  );
  return next;
}

export function paintCells(
  floor: Floor,
  cells: { x: number; y: number }[],
  action:
    | { type: "building"; value: boolean }
    | { type: "zone"; value: Zone },
): Floor {
  const next = clone(floor);
  for (const { x, y } of cells) {
    if (y < 0 || x < 0 || y >= next.rows || x >= next.cols) continue;
    if (action.type === "building") {
      next.building[y][x] = action.value;
      if (!action.value) next.zones[y][x] = "none";
    } else if (next.building[y][x]) {
      next.zones[y][x] = action.value;
    }
  }
  if (action.type === "building" && !action.value) {
    next.rooms = next.rooms.filter((r) =>
      isInsideBuilding(next, r.x, r.y, r.w, r.h),
    );
  }
  return next;
}

export function makeRoom(
  floor: Floor,
  floorIndex: number,
  template: RoomTemplate,
  x: number,
  y: number,
  defaultCapacity: number,
): Room {
  const kind = template.kind;
  const gender =
    kind === "oda" ? majorityGender(floor, x, y, template.w, template.h) : "karma";
  const capacity =
    kind === "oda"
      ? template.capacity || defaultCapacity
      : 0;
  return {
    id: uid(),
    x,
    y,
    w: template.w,
    h: template.h,
    kind,
    capacity,
    occupants: 0,
    gender,
    label: kind === "oda" ? nextRoomLabel(floor, floorIndex) : template.name,
  };
}

export interface FloorStats {
  odaCount: number;
  kizOda: number;
  erkekOda: number;
  karmaOda: number;
  kizKapasite: number;
  erkekKapasite: number;
  karmaKapasite: number;
  kizDolu: number;
  erkekDolu: number;
  toplamKapasite: number;
  toplamDolu: number;
}

export function emptyStats(): FloorStats {
  return {
    odaCount: 0,
    kizOda: 0,
    erkekOda: 0,
    karmaOda: 0,
    kizKapasite: 0,
    erkekKapasite: 0,
    karmaKapasite: 0,
    kizDolu: 0,
    erkekDolu: 0,
    toplamKapasite: 0,
    toplamDolu: 0,
  };
}

export function floorStats(floor: Floor): FloorStats {
  const s = emptyStats();
  for (const room of floor.rooms) {
    if (room.kind !== "oda") continue;
    s.odaCount++;
    s.toplamKapasite += room.capacity;
    s.toplamDolu += room.occupants;
    if (room.gender === "kiz") {
      s.kizOda++;
      s.kizKapasite += room.capacity;
      s.kizDolu += room.occupants;
    } else if (room.gender === "erkek") {
      s.erkekOda++;
      s.erkekKapasite += room.capacity;
      s.erkekDolu += room.occupants;
    } else {
      s.karmaOda++;
      s.karmaKapasite += room.capacity;
    }
  }
  return s;
}

export function projectStats(project: Project): FloorStats {
  return project.floors.reduce((acc, floor) => {
    const s = floorStats(floor);
    acc.odaCount += s.odaCount;
    acc.kizOda += s.kizOda;
    acc.erkekOda += s.erkekOda;
    acc.karmaOda += s.karmaOda;
    acc.kizKapasite += s.kizKapasite;
    acc.erkekKapasite += s.erkekKapasite;
    acc.karmaKapasite += s.karmaKapasite;
    acc.kizDolu += s.kizDolu;
    acc.erkekDolu += s.erkekDolu;
    acc.toplamKapasite += s.toplamKapasite;
    acc.toplamDolu += s.toplamDolu;
    return acc;
  }, emptyStats());
}

export function isRoomValid(floor: Floor, room: Room): boolean {
  return roomPlacementValid(floor, room.x, room.y, room.w, room.h, room.id);
}

export function allRooms(project: Project): Room[] {
  return project.floors.flatMap((floor) => floor.rooms);
}

export function findRoom(project: Project, roomId: string): Room | undefined {
  return allRooms(project).find((room) => room.id === roomId);
}

export function genderFits(room: Room, gender: StudentGender): boolean {
  if (room.kind !== "oda") return false;
  return room.gender === "karma" || room.gender === gender;
}

export function studentsInRoom(students: Student[], roomId: string): Student[] {
  return students.filter((student) => student.roomId === roomId);
}

export function syncOccupants(project: Project): Project {
  const next = clone(project);
  if (!Array.isArray(next.students)) next.students = [];
  for (const floor of next.floors) {
    for (const room of floor.rooms) {
      room.occupants = studentsInRoom(next.students, room.id).length;
    }
  }
  return next;
}

export function normalizeProject(project: Project): Project {
  const next = clone(project);
  const hadStudents = Array.isArray(project.students);
  if (!hadStudents) next.students = [];
  const roomIds = new Set(allRooms(next).map((room) => room.id));
  for (const student of next.students) {
    if (student.roomId && !roomIds.has(student.roomId)) student.roomId = null;
  }
  if (next.students.length > 0) return syncOccupants(next);
  return next;
}

export function canAssignStudent(
  project: Project,
  student: Student,
  roomId: string,
): { ok: true } | { ok: false; reason: string } {
  const room = findRoom(project, roomId);
  if (!room || room.kind !== "oda") {
    return { ok: false, reason: "Burası yatakhane odası değil." };
  }
  if (!genderFits(room, student.gender)) {
    return {
      ok: false,
      reason:
        student.gender === "kiz"
          ? "Kız öğrenci erkek odasına giremez."
          : "Erkek öğrenci kız odasına giremez.",
    };
  }
  const alreadyHere = student.roomId === roomId;
  const filled = studentsInRoom(project.students, roomId).length;
  if (!alreadyHere && filled >= room.capacity) {
    return { ok: false, reason: `${room.label} dolu (${room.capacity} yatak).` };
  }
  return { ok: true };
}

export function assignStudent(
  project: Project,
  studentId: string,
  roomId: string | null,
): { project: Project; error?: string } {
  const student = project.students.find((item) => item.id === studentId);
  if (!student) return { project, error: "Öğrenci bulunamadı." };
  if (roomId) {
    const check = canAssignStudent(project, student, roomId);
    if (!check.ok) return { project, error: check.reason };
  }
  const next = clone(project);
  next.students = next.students.map((item) =>
    item.id === studentId ? { ...item, roomId } : item,
  );
  return { project: syncOccupants(next) };
}

export function autoPlaceStudents(project: Project): {
  project: Project;
  placed: number;
  leftover: number;
} {
  const next = clone(project);
  let placed = 0;
  for (const student of next.students) {
    if (student.roomId) continue;
    const options = allRooms(next)
      .filter((room) => genderFits(room, student.gender))
      .map((room) => ({
        room,
        fill: studentsInRoom(next.students, room.id).length,
      }))
      .filter((item) => item.fill < item.room.capacity)
      .sort((a, b) => b.fill - a.fill || a.room.label.localeCompare(b.room.label, "tr"));
    if (!options[0]) continue;
    student.roomId = options[0].room.id;
    placed++;
  }
  return {
    project: syncOccupants(next),
    placed,
    leftover: next.students.filter((student) => !student.roomId).length,
  };
}
