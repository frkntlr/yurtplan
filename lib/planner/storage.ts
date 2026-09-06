import { createSampleProject } from "./sample";
import { normalizeProject } from "./model";
import { STORAGE_KEY } from "./types";
import type { Project } from "./types";

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== "object") return false;
  const p = value as Project;
  return (
    typeof p.name === "string" &&
    Array.isArray(p.floors) &&
    p.floors.length > 0 &&
    typeof p.activeFloorId === "string" &&
    !!p.limits
  );
}

export function loadProject(): Project {
  if (typeof window === "undefined") return createSampleProject();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSampleProject();
    const parsed = JSON.parse(raw) as unknown;
    if (isProject(parsed)) return normalizeProject(parsed);
  } catch {
    /* ignore corrupt storage */
  }
  return createSampleProject();
}

export function saveProject(project: Project): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}

export function exportProject(project: Project): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, "-").toLowerCase()}-plan.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProject(file: File): Promise<Project> {
  const text = await file.text();
  const parsed = JSON.parse(text) as unknown;
  if (!isProject(parsed)) {
    throw new Error("Bu dosya geçerli bir yurt planı değil.");
  }
  return normalizeProject(parsed);
}
