import { Layout } from "@/components/layout";
import { useListStudents, useDeleteStudent, getListStudentsQueryKey, getGetStatsQueryKey, getListDocumentsQueryKey, getGetRecentActivityQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, GraduationCap, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Students() {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();

  const { data: students, isLoading } = useListStudents({ search: search || undefined });
  const deleteStudent = useDeleteStudent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete this student and ALL related documents, accommodations, and review history?\n\nThis action cannot be undone.`)) return;
    deleteStudent.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
        toast({ title: "Student and all related records deleted successfully." });
      },
      onError: () => {
        toast({ title: "Delete failed", variant: "destructive" });
      },
    });
  };

  return (
    <Layout>
      <div className="flex-1 overflow-auto bg-background">
        <div className="p-8 max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Students</h1>
              <p className="text-muted-foreground mt-1">Directory of students with accommodation plans.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Plan Type</TableHead>
                  <TableHead>Case Manager</TableHead>
                  <TableHead>Accommodations</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : students?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  students?.map((student) => (
                    <TableRow key={student.id} className="group">
                      <TableCell className="font-medium">
                        <Link href={`/students/${student.id}`} className="hover:text-primary transition-colors">
                          {student.displayName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-muted-foreground">
                          <GraduationCap className="w-4 h-4 mr-2 opacity-50" />
                          {student.gradeLevel}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.planType !== "NONE" ? "default" : "secondary"} className={student.planType !== "NONE" ? "bg-primary/20 text-primary hover:bg-primary/30 border-none" : ""}>
                          {student.planType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{student.caseManager}</TableCell>
                      <TableCell><div className="font-medium">{student.accommodationCount}</div></TableCell>
                      <TableCell>{student.documentCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/students/${student.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); handleDelete(student.id, student.displayName); }}
                            disabled={deleteStudent.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
