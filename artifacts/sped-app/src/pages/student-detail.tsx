import { Layout } from "@/components/layout";
import { useGetStudent, getGetStudentQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, FileText, CheckCircle2, User, GraduationCap, Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const studentId = parseInt(id || "0", 10);
  
  const { data: student, isLoading } = useGetStudent(studentId, { query: { enabled: !!studentId, queryKey: getGetStudentQueryKey(studentId) } });

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

  const accommodationsByCategory = student.accommodations.reduce((acc, curr) => {
    if (!curr.isApproved) return acc; // Only show approved ones in the student view
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<string, typeof student.accommodations>);

  const unreviewedCount = student.accommodations.filter(a => !a.isReviewed).length;

  return (
    <Layout>
      <div className="flex-1 overflow-auto bg-background">
        <div className="p-8 max-w-6xl mx-auto space-y-8">
          <Link href="/students" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Students
          </Link>
          
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
            
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="text-base px-4 py-1.5 font-medium border-primary/20 bg-primary/5 text-primary">
                {student.planType} Plan
              </Badge>
              <div className="bg-card border rounded-md px-4 py-1.5 flex flex-col justify-center">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Accoms</span>
                <span className="font-bold text-lg leading-none mt-1">{student.accommodations.filter(a => a.isApproved).length}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-xl font-semibold">Active Accommodations</h2>
                {unreviewedCount > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                    {unreviewedCount} pending review
                  </Badge>
                )}
              </div>
              
              {Object.keys(accommodationsByCategory).length === 0 ? (
                <div className="bg-muted border p-8 rounded-lg text-center text-muted-foreground">
                  No active accommodations found. Upload and review a document to add accommodations.
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(accommodationsByCategory).map(([category, items]) => (
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
                                <p className="font-medium text-sm leading-snug">{acc.description}</p>
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
                          <div className={`p-2 rounded-md shrink-0 ${doc.status === 'parsed' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate" title={doc.filename}>{doc.filename}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] h-4 px-1">{doc.documentType}</Badge>
                              <span className="text-xs text-muted-foreground">{format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</span>
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
