export const MEMORY_CATEGORIES = [
  { value: "identity", label: "Identité" },
  { value: "preference", label: "Préférence" },
  { value: "project", label: "Projet" },
  { value: "person", label: "Personne" },
  { value: "habit", label: "Habitude" },
  { value: "goal", label: "Objectif" },
  { value: "note", label: "Note" },
  { value: "general", label: "Général" },
] as const;

export function categoryLabel(value: string) {
  return MEMORY_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
