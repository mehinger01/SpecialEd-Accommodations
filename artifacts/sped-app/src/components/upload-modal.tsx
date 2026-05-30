import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { getListDocumentsQueryKey, useListStudents, getGetStatsQueryKey, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UploadPhase = "idle" | "uploading" | "polling" | "done" | "error";

interface ParsedAccommodation {
  id: number;
  category: string;
  description: string;
  rawText: string | null;
}

interface ParseResult {
  docId: number;
  filename: string;
  accommodations: ParsedAccommodation[];
  rawText: string | null;
  parseError: string | null;
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("IEP");
  const [studentId, setStudentId] = useState<string>("none");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [showJson, setShowJson] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: students } = useListStudents({}, { query: { enabled: open } as any });

  function stopPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }

  useEffect(() => {
    if (!open) {
      stopPolling();
    }
    return () => stopPolling();
  }, [open]);

  function handleClose() {
    stopPolling();
    setFile(null);
    setDocumentType("IEP");
    setStudentId("none");
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
      console.log(`[upload-modal] polling attempt ${attempts} for document ${docId}`);

      try {
        const res = await fetch(`/api/documents/${docId}`);
        if (!res.ok) {
          console.error(`[upload-modal] poll failed with status ${res.status}`);
          return;
        }
        const doc = await res.json();
        console.log("[upload-modal] poll response:", doc);

        if (doc.status === "parsed") {
          stopPolling();
          setResult({
            docId,
            filename,
            accommodations: doc.accommodations ?? [],
            rawText: doc.rawTextPreview ?? null,
            parseError: null,
          });
          setPhase("done");
          setStatusMessage(`Found ${doc.accommodations?.length ?? 0} accommodation(s)`);
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
        } else if (doc.status === "error") {
          stopPolling();
          console.error("[upload-modal] parse error from server:", doc.parseError);
          setResult({
            docId,
            filename,
            accommodations: [],
            rawText: doc.rawTextPreview ?? null,
            parseError: doc.parseError ?? "Unknown parse error",
          });
          setPhase("error");
          setStatusMessage(`Parse failed: ${doc.parseError ?? "Unknown error"}`);
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        } else if (attempts >= maxAttempts) {
          stopPolling();
          console.error("[upload-modal] polling timed out after", maxAttempts, "attempts");
          setPhase("error");
          setStatusMessage("Parsing timed out. Check the Documents page for status.");
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        }
      } catch (err) {
        console.error("[upload-modal] poll request threw:", err);
      }
    }, 1500);
  }

  async function handleUpload() {
    if (!file) return;

    console.log("[upload-modal] starting upload:", file.name, "type:", documentType, "student:", studentId);
    setPhase("uploading");
    setStatusMessage("Uploading…");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      if (studentId !== "none") {
        formData.append("studentId", studentId);
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      console.log("[upload-modal] upload response status:", res.status);

      if (!res.ok) {
        const body = await res.text();
        console.error("[upload-modal] upload failed:", res.status, body);
        throw new Error(`Upload failed (${res.status}): ${body}`);
      }

      const doc = await res.json();
      console.log("[upload-modal] upload success, doc:", doc);

      toast({
        title: "Document Uploaded",
        description: "Upload successful. Parsing accommodations…",
      });

      await pollDocument(doc.id, doc.filename);
    } catch (err) {
      console.error("[upload-modal] upload threw:", err);
      setPhase("error");
      setStatusMessage(err instanceof Error ? err.message : String(err));
      toast({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "There was an error uploading your document.",
        variant: "destructive",
      });
    }
  }

  const isWorking = phase === "uploading" || phase === "polling";
  const isDone = phase === "done" || phase === "error";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <DialogDescription>
            Upload an IEP, 504, or BIP PDF to extract accommodations using rule-based parsing.
          </DialogDescription>
        </DialogHeader>

        {phase === "idle" || isWorking ? (
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IEP">IEP</SelectItem>
                    <SelectItem value="504">504 Plan</SelectItem>
                    <SelectItem value="BIP">BIP</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Student (optional)</Label>
                <Select value={studentId} onValueChange={setStudentId} disabled={isWorking}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Unassigned —</SelectItem>
                    {students?.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isWorking && (
              <div className="flex items-center gap-3 bg-muted/40 rounded px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-primary" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        ) : null}

        {isDone && result && (
          <div className="space-y-4 py-2">
            <div className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${phase === "done" ? "bg-green-50 text-green-800 border border-green-200" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
              {phase === "done"
                ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              }
              <div>
                <span className="font-medium">{phase === "done" ? "Parsing complete" : "Parse error"}</span>
                <p className="mt-0.5 opacity-80">{statusMessage}</p>
              </div>
            </div>

            {phase === "done" && result.accommodations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Extracted Accommodations</h4>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[140px]">Category</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.accommodations.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-medium capitalize whitespace-nowrap">
                              {a.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{a.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {phase === "done" && result.accommodations.length === 0 && (
              <p className="text-sm text-muted-foreground bg-muted/30 rounded px-4 py-3">
                No accommodations were extracted. The PDF may not contain recognizable accommodation patterns, or the text may not be machine-readable. Check the document detail page for the raw text preview.
              </p>
            )}

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setShowJson((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showJson ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showJson ? "Hide" : "Show"} JSON debug output
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
              <Button variant="outline" onClick={handleClose} disabled={isWorking}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={!file || isWorking}>
                {isWorking && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {phase === "uploading" ? "Uploading…" : phase === "polling" ? "Parsing…" : "Upload & Parse"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
