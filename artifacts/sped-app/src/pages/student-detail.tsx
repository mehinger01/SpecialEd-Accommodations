import { Layout } from "@/components/layout";
import { useGetStudent, getGetStudentQueryKey, useDeleteStudent, getListStudentsQueryKey, getGetStatsQueryKey, getListDocumentsQueryKey, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, FileText, CheckCircle2, User, GraduationCap, Briefcase, Trash2, Clock, CalendarRange, MapPin, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const studentId = parseInt(id || "0", 10);
  const [, navigate] = useLocation();

  const { data: student, isLoading } = useGetStudent(studentId, { query: { enabled: !!studentId, queryKey: getGetStudentQueryKey(studentId) } });
  const deleteStudent = useDeleteStudent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!student) return;
    if (!confirm(`Delete this student and ALL related documents, accommodations, and review history?\n\nThis action cannot be undone.`)) return;
    deleteStudent.mutate({ id: studentId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
        toast({ title: "Student and all related records deleted successfully." });
        navigate("/students");
      },
      onError: () => {
        toast({ title: "Delete failed", variant: "destructive" });
      },
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-6xl mx-auto space-y-8 w-full">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!student) {
    return (
      <Layout>
        <div className="p-8 max-w-6xl mx-auto text-center py-20">
          <h2 className="text-2xl font-bold">Student not found</h2>
          <Link href="/students" className="text-primary hover:underline mt-4 inline-block">Back to Students</Link>
        </div>
      </Layout>
    );
  }

  const pendingAccommodations = student.accommodations.filter(a => !a.isReviewed);
  const approvedAccommodations = student.accommodations.filter(a => a.isApproved);

  const approvedByCategory = approvedAccommodations.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<string, typeof student.accommodations>);

  return (
    <Layout>
      <div className="flex-1 overflow-auto bg-background">
        <div className="p-8 max-w-6xl mx-auto space-y-8">
          <Link href="/students" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Students
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <User size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{student.displayName}</h1>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center"><GraduationCap className="w-4 h-4 mr-1" /> Grade {student.gradeLevel}</span>
                  <span className="flex items-center"><Briefcase className="w-4 h-4 mr-1" /> CM: {student.caseManager}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="text-base px-4 py-1.5 font-medium border-primary/20 bg-primary/5 text-primary">
                {student.planType} Plan
              </Badge>
              <div className="bg-card border rounded-md px-4 py-1.5 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pending Review</span>
                <span className={`font-bold text-lg leading-none mt-1 ${pendingAccommodations.length > 0 ? "text-amber-600" : ""}`}>
                  {pendingAccommodations.length}
                </span>
              </div>
              <div className="bg-card border rounded-md px-4 py-1.5 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Approved</span>
                <span className="font-bold text-lg leading-none mt-1">{approvedAccommodations.length}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive ml-2"
                onClick={handleDelete}
                disabled={deleteStudent.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete Student
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">

              {/* Pending Review section */}
              {pendingAccommodations.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 border-b pb-2">
                    <h2 className="text-xl font-semibold">Pending Accommodation Review</h2>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                      {pendingAccommodations.length}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground -mt-2">
                    Review these accommodations in the linked source document before they become active for staff.
                  </p>
                  <div className="grid gap-3">
                    {pendingAccommodations.map(acc => (
                      <Card key={acc.id} className="border-l-4 border-l-amber-400">
                        <CardContent className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-2.5 items-start min-w-0">
                              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                              <p className="font-medium text-sm leading-snug">
                                {acc.accommodationName || acc.description || acc.category}
                              </p>
                            </div>
                            <Link href={`/documents/${acc.documentId}`}>
                              <Button variant="outline" size="sm" className="shrink-0 text-xs h-7 px-2.5 gap-1.5">
                                <ExternalLink className="w-3 h-3" />
                                Review in Source Document
                              </Button>
                            </Link>
                          </div>

                          {acc.accommodationName && acc.description && acc.description !== acc.accommodationName && (
                            <p className="text-xs text-muted-foreground leading-relaxed pl-6">{acc.description}</p>
                          )}

                          <div className="pl-6 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px]">{acc.category}</Badge>
                              {acc.sourceSection && (
                                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{acc.sourceSection}</span>
                              )}
                            </div>
                            {(acc.startDate || acc.endDate) && (
                              <span className="flex items-center gap-1">
                                <CalendarRange className="w-3 h-3" />
                                {acc.startDate ?? "?"} – {acc.endDate ?? <span className="text-amber-600">end missing</span>}
                              </span>
                            )}
                            {acc.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {acc.location}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved / Active section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b pb-2">
                  <h2 className="text-xl font-semibold">Active Accommodations</h2>
                  <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-medium">
                    {approvedAccommodations.length}
                  </span>
                </div>

                {Object.keys(approvedByCategory).length === 0 ? (
                  <div className="bg-muted border p-8 rounded-lg text-center text-muted-foreground text-sm">
                    {student.accommodations.length > 0
                      ? "No accommodations have been approved yet. Review them in the linked document."
                      : "No accommodations found. Upload and review a document to add accommodations."}
                  </div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(approvedByCategory).map(([category, items]) => (
                      <div key={category} className="space-y-3">
                        <h3 className="font-medium text-primary uppercase text-sm tracking-wider flex items-center gap-2">
                          {category}
                          <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">{items.length}</span>
                        </h3>
                        <div className="grid gap-3">
                          {items.map(acc => (
                            <Card key={acc.id} className="border-l-4 border-l-primary">
                              <CardContent className="p-4 flex gap-4 items-start">
                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium text-sm leading-snug">
                                    {acc.accommodationName || acc.description}
                                  </p>
                                  {acc.accommodationName && acc.description && acc.description !== acc.accommodationName && (
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{acc.description}</p>
                                  )}
                                  {acc.notes && <p className="text-xs text-muted-foreground mt-2 italic border-l-2 pl-2">Note: {acc.notes}</p>}
                                  <p className="text-[10px] text-muted-foreground mt-3 uppercase tracking-wider">Source Doc ID: {acc.documentId}</p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar: linked documents */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold border-b pb-2">Linked Documents</h2>
              {student.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted rounded-md border">No documents linked</p>
              ) : (
                <div className="grid gap-3">
                  {student.documents.map(doc => (
                    <Link key={doc.id} href={`/documents/${doc.id}`} className="block transition-transform hover:-translate-y-1">
                      <Card className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4 flex items-start gap-3">
                          <div className={`p-2 rounded-md shrink-0 ${doc.status === "parsed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate" title={doc.filename}>{doc.filename}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] h-4 px-1">{doc.documentType}</Badge>
                              <span className="text-xs text-muted-foreground">{format(new Date(doc.uploadedAt), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
