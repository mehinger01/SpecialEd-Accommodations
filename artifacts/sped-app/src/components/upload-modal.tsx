import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { sectionLabel } from "@/lib/section-utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListDocumentsQueryKey,
  getListStudentsQueryKey,
  useListStudents,
  useCreateStudent,
  getGetStatsQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, FileText, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  UserPlus, AlertTriangle,
} from "lucide-react";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UploadPhase = "idle" | "creating-student" | "uploading" | "polling" | "done" | "error";

interface ParsedAccommodation {
  id: number;
  accommodationName: string | null;
  category: string;
  description: string;
  sourceSection: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
}

interface ParseResult {
  docId: number;
  filename: string;
  displayFilename: string | null;
  extractedStudentName: string | null;
  accommodations: ParsedAccommodation[];
  warnings: string[];
  rawText: string | null;
  parseError: string | null;
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("IEP");
  const [studentId, setStudentId] = useState<string>("none");
  const [newStudentName, setNewStudentName] = useState<string>("");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [showJson, setShowJson] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: students } = useListStudents({}, { query: { enabled: open } as any });
  const createStudent = useCreateStudent();

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  useEffect(() => {
    if (!open) stopPolling();
    return () => stopPolling();
  }, [open]);

  function handleClose() {
    stopPolling();
    setFile(null);
    setDocumentType("IEP");
    setStudentId("none");
    setNewStudentName("");
    setPhase("idle");
    setStatusMessage("");
    setResult(null);
    setShowJson(false);
    onOpenChange(false);
  }

  async function pollDocument(docId: number, filename: string) {
    let attempts = 0;
    const maxAttempts = 30;
    setPhase("polling");
    setStatusMessage("Parsing PDF for accommodations…");

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/documents/${docId}`);
        if (!res.ok) return;
        const doc = await res.json();

        if (doc.status === "parsed") {
          stopPolling();
          setResult({
            docId,
            filename,
            displayFilename: doc.displayFilename ?? null,
            extractedStudentName: doc.extractedStudentName ?? null,
            accommodations: doc.accommodations ?? [],
            warnings: doc.parseWarnings ?? [],
            rawText: doc.rawTextPreview ?? null,
            parseError: null,
          });
          setPhase("done");
          setStatusMessage(`Found ${doc.accommodations?.length ?? 0} accommodation(s)`);
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        } else if (doc.status === "error") {
          stopPolling();
          setResult({
            docId,
            filename,
            displayFilename: doc.displayFilename ?? null,
            extractedStudentName: doc.extractedStudentName ?? null,
            accommodations: [],
            warnings: [],
            rawText: doc.rawTextPreview ?? null,
            parseError: doc.parseError ?? "Unknown parse error",
          });
          setPhase("error");
          setStatusMessage(`Parse failed: ${doc.parseError ?? "Unknown error"}`);
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        } else if (attempts >= maxAttempts) {
          stopPolling();
          setPhase("error");
          setStatusMessage("Parsing timed out. Check the Documents page for status.");
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        }
      } catch (_err) {
        // network hiccup, keep polling
      }
    }, 1500);
  }

  async function handleUpload() {
    if (!file) return;
    setResult(null);

    try {
      let resolvedStudentId: string = studentId;

      if (studentId === "new") {
        const name = newStudentName.trim();
        if (!name) {
          toast({ title: "Student name required", description: "Enter a display name for the new student.", variant: "destructive" });
          return;
        }
        setPhase("creating-student");
        setStatusMessage(`Creating student "${name}"…`);

        const created = await new Promise<{ id: number }>((resolve, reject) => {
          createStudent.mutate(
            { data: { displayName: name } },
            {
              onSuccess: (s) => { queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }); resolve(s); },
              onError: reject,
            }
          );
        });
        resolvedStudentId = String(created.id);
      }

      setPhase("uploading");
      setStatusMessage("Uploading…");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      if (resolvedStudentId !== "none") formData.append("studentId", resolvedStudentId);

      const res = await fetch("/api/documents", { method: "POST", body: formData });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Upload failed (${res.status}): ${body}`);
      }

      const doc = await res.json();
      toast({ title: "Document Uploaded", description: "Upload successful. Parsing accommodations…" });
      await pollDocument(doc.id, doc.filename);
    } catch (err) {
      setPhase("error");
      setStatusMessage(err instanceof Error ? err.message : String(err));
      toast({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "There was an error uploading your document.",
        variant: "destructive",
      });
    }
  }

  const isWorking = phase === "creating-student" || phase === "uploading" || phase === "polling";
  const isDone = phase === "done" || phase === "error";
  const canSubmit = !!file && !isWorking && (studentId !== "new" || newStudentName.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload an IEP, 504, or BIP PDF to extract accommodations using rule-based parsing.
          </DialogDescription>
        </DialogHeader>

        {(phase === "idle" || isWorking) && (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">PDF File</Label>
              <input
                id="file"
                type="file"
                accept=".pdf,application/pdf"
                disabled={isWorking}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded px-3 py-2">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate font-medium">{file.name}</span>
                  <span className="shrink-0 ml-auto">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType} disabled={isWorking}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IEP">IEP</SelectItem>
                    <SelectItem value="504">504 Plan</SelectItem>
                    <SelectItem value="BIP">BIP</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Student</Label>
                <Select
                  value={studentId}
                  onValueChange={(v) => { setStudentId(v); if (v !== "new") setNewStudentName(""); }}
                  disabled={isWorking}
                >
                  <SelectTrigger><SelectValue placeholder="— Unassigned —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Unassigned —</SelectItem>
                    {students && students.length > 0 &&
                      students.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.displayName}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                {studentId !== "new" && (
                  <button
                    type="button"
                    disabled={isWorking}
                    onClick={() => setStudentId("new")}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <UserPlus className="w-3 h-3" />
                    Create New Student
                  </button>
                )}
              </div>
            </div>

            {studentId === "new" && (
              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Label htmlFor="new-student-name" className="text-sm font-medium flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-primary" />
                  New Student Display Name
                </Label>
                <Input
                  id="new-student-name"
                  placeholder="e.g. Student G"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  disabled={isWorking}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  A student record will be created automatically before uploading. Grade, case manager, and plan type can be added from the Students page later.
                </p>
              </div>
            )}

            {isWorking && (
              <div className="flex items-center gap-3 bg-muted/40 rounded px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-primary" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        )}

        {isDone && result && (
          <div className="space-y-4 py-2">
            {/* Status banner */}
            <div className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${
              phase === "done"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}>
              {phase === "done" ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              <div>
                <span className="font-medium">{phase === "done" ? "Parsing complete" : "Parse error"}</span>
                <p className="mt-0.5 opacity-80">{statusMessage}</p>
              </div>
            </div>

            {/* Extracted metadata */}
            {phase === "done" && (result.displayFilename || result.extractedStudentName) && (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1.5 text-sm">
                {result.extractedStudentName && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground shrink-0">Extracted Student:</span>
                    <span className="font-medium">{result.extractedStudentName}</span>
                  </div>
                )}
                {result.displayFilename && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground shrink-0">Generated Filename:</span>
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{result.displayFilename}</span>
                  </div>
                )}
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {result.warnings.length === 1 ? "1 Warning" : `${result.warnings.length} Warnings`}
                </div>
                <ul className="space-y-0.5">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-amber-700 pl-6">• {w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Accommodations list */}
            {phase === "done" && result.accommodations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  Extracted Accommodations ({result.accommodations.length})
                </h4>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {result.accommodations.map((a) => (
                    <div key={a.id} className="rounded-md border bg-muted/20 px-3 py-2.5 text-xs space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-foreground leading-snug">
                          {a.accommodationName || a.category}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {a.sourceSection && (
                            <Badge variant="outline" className="text-[10px] font-medium">{sectionLabel(a.sourceSection)}</Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px]">Pending Review</Badge>
                        </div>
                      </div>
                      {a.description && (
                        <p className="text-muted-foreground leading-relaxed">{a.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                        {a.startDate ? (
                          <span>{a.startDate} – {a.endDate ?? <span className="text-amber-600">end missing</span>}</span>
                        ) : a.sourceSection === "Section 6" ? (
                          <span className="italic">Assessment accommodation</span>
                        ) : (
                          <span className="text-amber-600">Dates missing</span>
                        )}
                        {a.location && <span>📍 {a.location}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {phase === "done" && result.accommodations.length === 0 && (
              <p className="text-sm text-muted-foreground bg-muted/30 rounded px-4 py-3">
                No accommodations were extracted. Check the warnings above, review the raw text preview on the document page, or try a different PDF.
              </p>
            )}

            {/* JSON debug */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setShowJson((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showJson ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showJson ? "Hide" : "Show"} raw JSON
              </button>
              {showJson && (
                <pre className="bg-muted/50 border rounded p-3 text-xs overflow-x-auto max-h-48 text-foreground">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {isDone && !result && phase === "error" && (
          <div className="flex items-start gap-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-4 py-3 text-sm">
            <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium">Error</span>
              <p className="mt-0.5 opacity-80">{statusMessage}</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {isDone ? (
            <>
              <Button variant="outline" onClick={handleClose}>Close</Button>
              {result?.docId && (
                <Button asChild>
                  <a href={`/documents/${result.docId}`}>View Document →</a>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isWorking}>Cancel</Button>
              <Button onClick={handleUpload} disabled={!canSubmit}>
                {isWorking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {phase === "creating-student" ? "Creating Student…"
                  : phase === "uploading" ? "Uploading…"
                  : phase === "polling" ? "Parsing…"
                  : "Upload & Parse"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
