export type Zone = "none" | "kiz" | "erkek" | "ortak";
export type Gender = "kiz" | "erkek" | "karma";
export type RoomKind =
  | "oda"
  | "banyo"
  | "wc"
  | "mutfak"
  | "salon"
  | "camasir"
  | "koridor";

export type Tool = "sec" | "pan" | "bina" | "bolge" | "yerlestir";
export type BuildingShape = "dikdortgen" | "l" | "u" | "c" | "kanat";
export type PaintMode = "boya" | "sil";

export interface Room {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: RoomKind;
  capacity: number;
  occupants: number;
  gender: Gender;
  label: string;
}

export interface Floor {
  id: string;
  name: string;
  cols: number;
  rows: number;
  building: boolean[][];
  zones: Zone[][];
  rooms: Room[];
}

export interface Limits {
  maxKizYatak: number;
  maxErkekYatak: number;
  maxOdaPerKat: number;
  defaultKapasite: number;
}

export interface Project {
  name: string;
  floors: Floor[];
  activeFloorId: string;
  limits: Limits;
}

export interface RoomTemplate {
  id: string;
  name: string;
  w: number;
  h: number;
  kind: RoomKind;
  capacity: number;
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  { id: "tek", name: "1 kişilik", w: 3, h: 3, kind: "oda", capacity: 1 },
  { id: "cift", name: "2 kişilik", w: 4, h: 3, kind: "oda", capacity: 2 },
  { id: "uc", name: "3 kişilik", w: 4, h: 4, kind: "oda", capacity: 3 },
  { id: "dort", name: "4 kişilik", w: 5, h: 4, kind: "oda", capacity: 4 },
  { id: "alti", name: "6 kişilik", w: 6, h: 4, kind: "oda", capacity: 6 },
  { id: "banyo", name: "Banyo", w: 3, h: 3, kind: "banyo", capacity: 0 },
  { id: "wc", name: "WC", w: 2, h: 2, kind: "wc", capacity: 0 },
  { id: "mutfak", name: "Mutfak", w: 4, h: 3, kind: "mutfak", capacity: 0 },
  { id: "salon", name: "Salon", w: 6, h: 4, kind: "salon", capacity: 0 },
  { id: "camasir", name: "Çamaşırhane", w: 4, h: 3, kind: "camasir", capacity: 0 },
  { id: "koridor", name: "Koridor", w: 8, h: 2, kind: "koridor", capacity: 0 },
];

export const KIND_LABEL: Record<RoomKind, string> = {
  oda: "Oda",
  banyo: "Banyo",
  wc: "WC",
  mutfak: "Mutfak",
  salon: "Salon",
  camasir: "Çamaşırhane",
  koridor: "Koridor",
};

export const GENDER_LABEL: Record<Gender, string> = {
  kiz: "Kız",
  erkek: "Erkek",
  karma: "Karma",
};

export const ZONE_LABEL: Record<Zone, string> = {
  none: "Yok",
  kiz: "Kız bölümü",
  erkek: "Erkek bölümü",
  ortak: "Ortak alan",
};

export const SHAPE_LABEL: Record<BuildingShape, string> = {
  dikdortgen: "Dikdörtgen",
  l: "L şekli",
  u: "U şekli",
  c: "C şekli",
  kanat: "Çift kanat",
};

export const STORAGE_KEY = "yurtplan-v1";
export const CELL_SIZE = 30;
