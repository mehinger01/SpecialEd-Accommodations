import { Layout } from "@/components/layout";
import { useGetDocument, getGetDocumentQueryKey, useUpdateAccommodation, useDeleteAccommodation } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft, CheckCircle2, XCircle, Clock, FileText, AlertTriangle, CalendarRange, MapPin, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const docId = parseInt(id || "0", 10);

  const { data: doc, isLoading } = useGetDocument(docId, { query: { enabled: !!docId, queryKey: getGetDocumentQueryKey(docId) } });
  const updateAcc = useUpdateAccommodation();
  const deleteAcc = useDeleteAccommodation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-6xl mx-auto space-y-8 w-full">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Layout>
    );
  }

  if (!doc) {
    return (
      <Layout>
        <div className="p-8 max-w-6xl mx-auto">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold">Document not found</h2>
            <p className="text-muted-foreground mt-2">The document you're looking for doesn't exist or was deleted.</p>
            <Link href="/documents"><Button className="mt-4">Back to Documents</Button></Link>
          </div>
        </div>
      </Layout>
    );
  }

  const handleReview = (accId: number, isApproved: boolean) => {
    updateAcc.mutate({ id: accId, data: { isReviewed: true, isApproved } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDocumentQueryKey(docId) });
        toast({ title: isApproved ? "Accommodation approved" : "Accommodation rejected" });
      }
    });
  };

  const handleDelete = (accId: number) => {
    if (!confirm("Remove this accommodation record?")) return;
    deleteAcc.mutate({ id: accId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDocumentQueryKey(docId) });
        toast({ title: "Accommodation removed" });
      },
      onError: () => {
        toast({ title: "Delete failed", variant: "destructive" });
      },
    });
  };

  const bySection = doc.accommodations.reduce((acc, curr) => {
    const section = curr.sourceSection || "Unsectioned";
    if (!acc[section]) acc[section] = [];
    acc[section].push(curr);
    return acc;
  }, {} as Record<string, typeof doc.accommodations>);

  const sectionOrder = ["Section 5", "Section 6", "Unsectioned"];
  const orderedSections = [
    ...sectionOrder.filter((s) => bySection[s]),
    ...Object.keys(bySection).filter((s) => !sectionOrder.includes(s)),
  ];

  const isFullyReviewed = doc.accommodations.length > 0 && doc.accommodations.every((a) => a.isReviewed);
  const warnings: string[] = (doc as any).parseWarnings ?? [];

  return (
    <Layout>
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4 flex-none shrink-0">
          <div className="max-w-6xl mx-auto">
            <Link href="/documents" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Documents
            </Link>

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    {doc.filename}
                  </h1>
                  <Badge variant="outline" className="font-mono">{doc.documentType}</Badge>
                  <Badge variant={doc.status === "parsed" ? "default" : doc.status === "error" ? "destructive" : "secondary"}>
                    {doc.status}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground flex items-center gap-4">
                  <span>Uploaded {format(new Date(doc.uploadedAt), "MMM d, yyyy")}</span>
                  {doc.studentId && (
                    <>
                      <span>•</span>
                      <span>Student: <Link href={`/students/${doc.studentId}`} className="text-primary hover:underline">{doc.studentName}</Link></span>
                    </>
                  )}
                </div>
              </div>

              {doc.accommodations.length > 0 && (
                <div className="bg-muted p-3 rounded-lg border flex flex-col items-end">
                  <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground mb-1">Review Status</span>
                  {isFullyReviewed ? (
                    <span className="flex items-center text-sm font-medium text-primary">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> All {doc.accommodations.length} Reviewed
                    </span>
                  ) : (
                    <span className="flex items-center text-sm font-medium text-amber-600">
                      <Clock className="w-4 h-4 mr-1" /> {doc.accommodations.filter((a) => a.isReviewed).length} / {doc.accommodations.length} Reviewed
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-lg font-semibold border-b pb-2">Extracted Accommodations</h2>

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {warnings.length === 1 ? "1 Parser Warning" : `${warnings.length} Parser Warnings`}
                  </div>
                  <ul className="space-y-0.5">
                    {warnings.map((w, i) => (
                      <li key={i} className="text-xs text-amber-700 pl-6">• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {doc.status === "pending" && (
                <div className="bg-muted border p-8 rounded-lg text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <h3 className="font-medium text-lg">Processing Document</h3>
                  <p className="text-muted-foreground text-sm mt-1">Extracting accommodations from this document.</p>
                </div>
              )}

              {doc.status === "error" && (
                <div className="bg-destructive/10 border-destructive border p-6 rounded-lg text-destructive">
                  <h3 className="font-medium text-lg flex items-center"><XCircle className="w-5 h-5 mr-2" /> Processing Failed</h3>
                  <p className="text-sm mt-2">{doc.parseError || "An unknown error occurred while parsing this document."}</p>
                </div>
              )}

              {doc.status === "parsed" && doc.accommodations.length === 0 && (
                <div className="bg-muted border p-8 rounded-lg text-center text-muted-foreground">
                  No accommodations were found in this document.
                </div>
              )}

              {orderedSections.map((section) => (
                <div key={section} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-base text-foreground">{section}</h3>
                    <Badge variant="secondary" className="text-xs">{bySection[section].length}</Badge>
                  </div>

                  <div className="space-y-3">
                    {bySection[section].map((acc) => {
                      const displayName = acc.accommodationName || acc.description;
                      const hasDateIssue = !acc.startDate || !acc.endDate;

                      return (
                        <Card
                          key={acc.id}
                          className={
                            acc.isReviewed
                              ? acc.isApproved
                                ? "border-l-4 border-l-primary"
                                : "border-l-4 border-l-destructive/50 opacity-60"
                              : "border-l-4 border-l-amber-400"
                          }
                        >
                          <CardContent className="p-4 flex gap-4">
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-start gap-2 flex-wrap">
                                <p className="font-semibold text-sm leading-tight">{displayName}</p>
                                <Badge variant="outline" className="text-[10px] shrink-0">{acc.category}</Badge>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <CalendarRange className="w-3 h-3" />
                                  {acc.startDate
                                    ? <>{acc.startDate} – {acc.endDate ?? <span className="text-amber-600">End date missing</span>}</>
                                    : <span className="text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Dates missing</span>
                                  }
                                </span>
                                {acc.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {acc.location}
                                  </span>
                                )}
                              </div>

                              {acc.description && acc.description !== displayName && (
                                <p className="text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1.5 leading-relaxed">
                                  {acc.description}
                                </p>
                              )}
                            </div>

                            {/* Review + delete actions */}
                            <div className="flex flex-col gap-2 shrink-0 border-l pl-4 justify-center">
                              {acc.isReviewed ? (
                                <div className="flex flex-col items-center text-xs gap-1">
                                  {acc.isApproved ? (
                                    <><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-medium">Approved</span></>
                                  ) : (
                                    <><XCircle className="w-5 h-5 text-destructive/70" /><span className="text-muted-foreground">Rejected</span></>
                                  )}
                                  <Button
                                    variant="link" size="sm"
                                    className="h-auto p-0 mt-1 text-[10px]"
                                    onClick={() => updateAcc.mutate({ id: acc.id, data: { isReviewed: false } }, {
                                      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetDocumentQueryKey(docId) })
                                    })}
                                  >
                                    Undo
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <Button
                                    size="sm" variant="outline"
                                    className="border-primary text-primary hover:bg-primary/10"
                                    onClick={() => handleReview(acc.id, true)}
                                    disabled={updateAcc.isPending}
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    size="sm" variant="ghost"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => handleReview(acc.id, false)}
                                    disabled={updateAcc.isPending}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" /> Reject
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm" variant="ghost"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-1"
                                onClick={() => handleDelete(acc.id)}
                                disabled={deleteAcc.isPending}
                                title="Delete this accommodation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="text-base">Raw Text Preview</CardTitle>
                  <CardDescription>Extracted text from the PDF (first 5000 characters)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-md h-[500px] overflow-y-auto border font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                    {doc.rawTextPreview || "No text preview available."}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
