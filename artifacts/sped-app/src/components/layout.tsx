import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  FileText, 
  LayoutDashboard, 
  Users, 
  ListChecks,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/students", label: "Students", icon: Users },
    { href: "/accommodations", label: "Accommodations", icon: ListChecks },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="w-64 flex flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <FileText size={20} />
          </div>
          <div className="font-semibold text-sm tracking-tight">
            Special Education<br/>Accommodations
          </div>
        </div>
        
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || 
                             (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon size={18} className={isActive ? "text-sidebar-primary" : "opacity-80"} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}
