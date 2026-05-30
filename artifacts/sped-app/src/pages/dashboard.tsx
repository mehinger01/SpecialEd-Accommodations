import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetStats, useGetRecentActivity } from "@workspace/api-client-react";
import { FileText, Users, ListChecks, FileWarning, ArrowRight, Upload } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { UploadModal } from "@/components/upload-modal";

export default function Dashboard() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const { data: stats, isLoading: isLoadingStats, isError: isErrorStats } = useGetStats();
  const { data: activity, isLoading: isLoadingActivity, isError: isErrorActivity } = useGetRecentActivity();

  return (
    <Layout>
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">Overview of accommodation extraction status.</p>
            </div>
            <Button onClick={() => setUploadOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
          <UploadModal open={uploadOpen} onOpenChange={setUploadOpen} />

          {isErrorStats ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md border border-destructive/20">
              Failed to load statistics.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Documents"
                value={stats?.totalDocuments}
                isLoading={isLoadingStats}
                icon={FileText}
                href="/documents"
              />
              <StatCard
                title="Pending Review"
                value={stats?.pendingDocuments}
                isLoading={isLoadingStats}
                icon={FileWarning}
                href="/documents?status=pending"
                alert={stats?.pendingDocuments ? stats.pendingDocuments > 0 : false}
              />
              <StatCard
                title="Students"
                value={stats?.totalStudents}
                isLoading={isLoadingStats}
                icon={Users}
                href="/students"
              />
              <StatCard
                title="Accommodations"
                value={stats?.totalAccommodations}
                isLoading={isLoadingStats}
                icon={ListChecks}
                href="/accommodations"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Recent Activity
                  <Link href="/documents" className="text-sm font-medium text-primary hover:underline flex items-center">
                    View all <ArrowRight className="ml-1 w-4 h-4" />
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingActivity ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex gap-4">
                        <Skeleton className="w-2 h-2 rounded-full mt-2" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : isErrorActivity ? (
                  <div className="text-sm text-destructive">Failed to load activity.</div>
                ) : activity?.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No recent activity.
                  </div>
                ) : (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                    {activity?.map((item) => (
                      <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-background bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-border bg-card shadow-sm">
                          <div className="flex flex-col">
                            <span className="text-sm text-foreground mb-1">{item.message}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{format(new Date(item.occurredAt), 'MMM d, h:mm a')}</span>
                              {item.documentId && (
                                <>
                                  <span>•</span>
                                  <Link href={`/documents/${item.documentId}`} className="hover:text-primary hover:underline">
                                    {item.documentName}
                                  </Link>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ 
  title, 
  value, 
  isLoading, 
  icon: Icon, 
  href,
  alert = false
}: { 
  title: string; 
  value?: number; 
  isLoading: boolean; 
  icon: any; 
  href: string;
  alert?: boolean;
}) {
  return (
    <Link href={href} className="block transition-transform hover:-translate-y-1">
      <Card className="h-full border-border/60 hover:border-primary/50 transition-colors hover:shadow-md cursor-pointer">
        <CardContent className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-muted-foreground text-sm">{title}</h3>
            <div className={`p-2 rounded-md ${alert ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
              <Icon size={18} />
            </div>
          </div>
          <div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className={`text-3xl font-bold tracking-tight ${alert ? 'text-destructive' : 'text-foreground'}`}>
                {value ?? 0}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
