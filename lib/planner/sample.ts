import {
  applyShape,
  createFloor,
  makeRoom,
  syncOccupants,
  uid,
} from "./model";
import type { Floor, Project, RoomTemplate, Student } from "./types";
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
  extras?: Partial<{ gender: "kiz" | "erkek" | "karma"; label: string }>,
): void {
  const room = makeRoom(floor, floorIndex, template(templateId), x, y, 4);
  Object.assign(room, extras);
  floor.rooms.push(room);
}

function furnishUFloor(floor: Floor, floorIndex: number): void {
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

  left.forEach((pos) => {
    place(floor, floorIndex, "dort", pos.x, pos.y, { gender: "kiz" });
  });
  right.forEach((pos) => {
    place(floor, floorIndex, "dort", pos.x, pos.y, { gender: "erkek" });
  });

  place(floor, floorIndex, "banyo", 6, 1, { label: "Kız banyo" });
  place(floor, floorIndex, "wc", 6, 5, { label: "Kız WC" });
  place(floor, floorIndex, "banyo", 23, 1, { label: "Erkek banyo" });
  place(floor, floorIndex, "wc", 23, 5, { label: "Erkek WC" });
  place(floor, floorIndex, "salon", 13, 17, { label: "Ortak salon" });
  place(floor, floorIndex, "mutfak", 7, 17, { label: "Mutfak" });
  place(floor, floorIndex, "camasir", 21, 17, { label: "Çamaşırhane" });
}

function student(
  name: string,
  gender: "kiz" | "erkek",
  roomId: string | null,
): Student {
  return { id: uid(), name, gender, roomId };
}

function fillRooms(
  rooms: { id: string }[],
  names: string[],
  gender: "kiz" | "erkek",
  perRoom: number[],
): Student[] {
  const students: Student[] = [];
  let index = 0;
  rooms.forEach((room, roomIndex) => {
    const count = perRoom[roomIndex] ?? 0;
    for (let i = 0; i < count; i++) {
      const name = names[index++];
      if (!name) return;
      students.push(student(name, gender, room.id));
    }
  });
  while (index < names.length) {
    students.push(student(names[index++], gender, null));
  }
  return students;
}

export function createSampleProject(): Project {
  const kat1 = createFloor("Kat 1", 32, 22);
  furnishUFloor(kat1, 0);

  const kat2 = createFloor("Kat 2", 32, 22);
  furnishUFloor(kat2, 1);

  const kizOdalar = kat1.rooms.filter(
    (room) => room.kind === "oda" && room.gender === "kiz",
  );
  const erkekOdalar = kat1.rooms.filter(
    (room) => room.kind === "oda" && room.gender === "erkek",
  );

  const students = [
    ...fillRooms(
      kizOdalar,
      [
        "Zeynep",
        "Elif",
        "Merve",
        "Ayşe",
        "Fatma",
        "Selin",
        "Ece",
        "Duru",
        "İrem",
        "Deniz",
      ],
      "kiz",
      [4, 3, 2, 0],
    ),
    ...fillRooms(
      erkekOdalar,
      ["Ahmet", "Mehmet", "Can", "Emre", "Yusuf", "Berk", "Kerem", "Arda"],
      "erkek",
      [4, 1, 2, 0],
    ),
  ];

  return syncOccupants({
    name: "Güneş Yurdu",
    floors: [kat1, kat2],
    activeFloorId: kat1.id,
    limits: {
      maxKizYatak: 40,
      maxErkekYatak: 40,
      maxOdaPerKat: 12,
      defaultKapasite: 4,
    },
    students,
  });
}
