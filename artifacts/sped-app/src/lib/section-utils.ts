export function sectionLabel(sourceSection: string | null | undefined): string {
  if (sourceSection === "Section 5") return "📘 Classroom Accommodation";
  if (sourceSection === "Section 6") return "📝 Assessment Accommodation";
  return sourceSection ?? "";
}

export function sectionBorderClass(sourceSection: string | null | undefined): string {
  if (sourceSection === "Section 5") return "border-l-blue-500";
  if (sourceSection === "Section 6") return "border-l-purple-500";
  return "border-l-muted-foreground/30";
}
