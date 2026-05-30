import { Layout } from "@/components/layout";
import { useListAccommodations, getListAccommodationsQueryKey, useUpdateAccommodation } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export default function Accommodations() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  
  const { data: accommodations, isLoading } = useListAccommodations();
  const updateAcc = useUpdateAccommodation();
  const queryClient = useQueryClient();

  const filtered = accommodations?.filter(acc => {
    if (search && !acc.description.toLowerCase().includes(search.toLowerCase())) return false;
    
    if (filter === "pending" && acc.isReviewed) return false;
    if (filter === "approved" && (!acc.isReviewed || !acc.isApproved)) return false;
    if (filter === "rejected" && (!acc.isReviewed || acc.isApproved)) return false;
    
    return true;
  });

  const handleReview = (id: number, isApproved: boolean) => {
    updateAcc.mutate({ id, data: { isReviewed: true, isApproved } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAccommodationsQueryKey() });
      }
    });
  };

  return (
    <Layout>
      <div className="flex-1 overflow-auto bg-background">
        <div className="p-8 max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">All Accommodations</h1>
              <p className="text-muted-foreground mt-1">Master list of all extracted accommodations.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search accommodations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex bg-muted/50 rounded-md p-1 border border-border self-start">
              {["all", "pending", "approved", "rejected"].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-sm capitalize transition-colors ${
                    filter === status 
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
                  <TableHead className="w-[40%]">Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-full max-w-[300px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                      No accommodations found matching criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered?.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-medium text-sm">
                        {acc.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal text-xs uppercase tracking-wider">
                          {acc.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {acc.studentId ? (
                          <Link href={`/students/${acc.studentId}`} className="text-primary hover:underline text-sm">
                            Student #{acc.studentId}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!acc.isReviewed ? (
                          <span className="inline-flex items-center text-amber-600 text-xs font-medium bg-amber-100 px-2 py-1 rounded-full">
                            <Clock className="w-3 h-3 mr-1" /> Pending
                          </span>
                        ) : acc.isApproved ? (
                          <span className="inline-flex items-center text-emerald-600 text-xs font-medium bg-emerald-100 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-destructive text-xs font-medium bg-destructive/10 px-2 py-1 rounded-full">
                            <XCircle className="w-3 h-3 mr-1" /> Rejected
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!acc.isReviewed ? (
                            <>
                              <Button size="sm" variant="ghost" className="h-8 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleReview(acc.id, true)}>
                                Approve
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleReview(acc.id, false)}>
                                Reject
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateAcc.mutate({ id: acc.id, data: { isReviewed: false } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAccommodationsQueryKey() }) })}>
                              Undo Review
                            </Button>
                          )}
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
