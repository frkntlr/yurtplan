import {
  applyShape,
  createFloor,
  makeRoom,
} from "./model";
import type { Floor, Project, RoomTemplate } from "./types";
import { ROOM_TEMPLATES } from "./types";

function template(id: string): RoomTemplate {
  const t = ROOM_TEMPLATES.find((item) => item.id === id);
  if (!t) throw new Error(`Şablon yok: ${id}`);
  return t;
}

function place(
  floor: Floor,
  floorIndex: number,
  templateId: string,
  x: number,
  y: number,
  extras?: Partial<{ occupants: number; gender: "kiz" | "erkek" | "karma"; label: string }>,
): void {
  const room = makeRoom(floor, floorIndex, template(templateId), x, y, 4);
  Object.assign(room, extras);
  floor.rooms.push(room);
}

function furnishUFloor(floor: Floor, floorIndex: number, occupancy: number[]): void {
  const shaped = applyShape(floor, "u");
  floor.building = shaped.building;
  floor.zones = shaped.zones;
  floor.rooms = [];

  const left = [
    { x: 1, y: 1 },
    { x: 1, y: 5 },
    { x: 1, y: 9 },
    { x: 1, y: 13 },
  ];
  const right = [
    { x: 26, y: 1 },
    { x: 26, y: 5 },
    { x: 26, y: 9 },
    { x: 26, y: 13 },
  ];

  left.forEach((pos, i) => {
    place(floor, floorIndex, "dort", pos.x, pos.y, {
      gender: "kiz",
      occupants: occupancy[i] ?? 0,
    });
  });
  right.forEach((pos, i) => {
    place(floor, floorIndex, "dort", pos.x, pos.y, {
      gender: "erkek",
      occupants: occupancy[i + 4] ?? 0,
    });
  });

  place(floor, floorIndex, "banyo", 6, 1, { label: "Kız banyo" });
  place(floor, floorIndex, "wc", 6, 5, { label: "Kız WC" });
  place(floor, floorIndex, "banyo", 23, 1, { label: "Erkek banyo" });
  place(floor, floorIndex, "wc", 23, 5, { label: "Erkek WC" });
  place(floor, floorIndex, "salon", 13, 17, { label: "Ortak salon" });
  place(floor, floorIndex, "mutfak", 7, 17, { label: "Mutfak" });
  place(floor, floorIndex, "camasir", 21, 17, { label: "Çamaşırhane" });
}

export function createSampleProject(): Project {
  const kat1 = createFloor("Kat 1", 32, 22);
  furnishUFloor(kat1, 0, [4, 3, 2, 4, 4, 1, 3, 2]);

  const kat2 = createFloor("Kat 2", 32, 22);
  furnishUFloor(kat2, 1, [4, 4, 0, 2, 3, 3, 4, 0]);

  return {
    name: "Güneş Yurdu",
    floors: [kat1, kat2],
    activeFloorId: kat1.id,
    limits: {
      maxKizYatak: 40,
      maxErkekYatak: 40,
      maxOdaPerKat: 12,
      defaultKapasite: 4,
    },
  };
}
