import { Layout } from "@/components/layout";
import { useListDocuments, getListDocumentsQueryKey, useDeleteDocument } from "@workspace/api-client-react";
import { useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, FileText, Trash2, Eye } from "lucide-react";
import { UploadModal } from "@/components/upload-modal";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Documents() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  
  const queryParams = statusFilter !== "all" ? { status: statusFilter as any } : {};
  const { data: documents, isLoading } = useListDocuments(queryParams);
  const deleteDoc = useDeleteDocument();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filteredDocuments = documents?.filter(doc => 
    (doc.displayFilename ?? doc.filename).toLowerCase().includes(search.toLowerCase()) || 
    (doc.studentName && doc.studentName.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this document and all its parsed accommodations?")) {
      deleteDoc.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
          toast({ title: "Document deleted" });
        }
      });
    }
  };

  return (
    <Layout>
      <div className="flex-1 overflow-auto bg-background">
        <div className="p-8 max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Documents</h1>
              <p className="text-muted-foreground mt-1">Manage uploaded IEPs, 504s, and BIPs.</p>
            </div>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex bg-muted/50 rounded-md p-1 border border-border">
              {["all", "pending", "parsed", "error"].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-sm capitalize transition-colors ${
                    statusFilter === status 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="border rounded-md bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Filename</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Accommodations</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredDocuments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                      No documents found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments?.map((doc) => (
                    <TableRow key={doc.id} className="group">
                      <TableCell className="font-medium">
                        <Link href={`/documents/${doc.id}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {doc.displayFilename ?? doc.filename}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {doc.documentType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.studentId ? (
                          <Link href={`/students/${doc.studentId}`} className="hover:underline">
                            {doc.studentName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={doc.status === 'parsed' ? 'default' : doc.status === 'error' ? 'destructive' : 'secondary'}
                        >
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.accommodationCount > 0 ? (
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {doc.accommodationCount}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/documents/${doc.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(doc.id)}
                            disabled={deleteDoc.isPending}
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
      <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />
    </Layout>
  );
}
