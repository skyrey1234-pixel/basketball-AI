import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Target, Plus, LayoutDashboard, TrendingUp, Gamepad2, LogOut, Loader2, Activity, Clapperboard, Radar, Dumbbell } from "lucide-react";
import { Crosshair, PenTool, IdCard } from "lucide-react";

const navItems = [
  { path: "/", label: "Sessions", icon: LayoutDashboard },
  { path: "/new", label: "New Analysis", icon: Plus },
  { path: "/season", label: "Season Intel", icon: TrendingUp },
  { path: "/challenge", label: "Scouting Challenge", icon: Gamepad2 },
  { path: "/coach-style", label: "Coach Style Mode", icon: Crosshair },
  { path: "/play-designer", label: "Play Designer", icon: PenTool },
  { path: "/coach-card", label: "Coach Card", icon: IdCard },
  { path: "/shot-chart", label: "Shot Chart", icon: Activity },
  { path: "/highlight-reel", label: "Highlight Reel", icon: Clapperboard },
  { path: "/shot-detection", label: "Shot Detection", icon: Radar },
  { path: "/form-coach", label: "Form Coach", icon: Dumbbell },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/landing");
    }
  }, [loading, isAuthenticated, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar hidden md:flex flex-col bg-[linear-gradient(180deg,rgba(85,37,131,0.36)_0%,rgba(18,7,37,0.18)_42%,transparent_100%)]">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-border lakers-gold-line">
          <div className="w-8 h-8 rounded-lg border border-primary/35 bg-primary/15 flex items-center justify-center shadow-[0_0_18px_rgba(253,185,39,0.12)]">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-sidebar-foreground">CourtVision AI</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = item.path === "/" ? location === "/" : location.startsWith(item.path);
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-200 cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_8px_22px_rgba(253,185,39,0.14)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent hover:translate-x-0.5"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border bg-black/10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                    {(user?.name || "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-sidebar-foreground truncate">{user?.name || "Coach"}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile top bar + content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 flex items-center gap-2 px-4 border-b border-border bg-sidebar bg-[linear-gradient(90deg,rgba(85,37,131,0.35),transparent)]">
          <div className="flex items-center gap-2 shrink-0">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm">CourtVision AI</span>
          </div>
          <div className="flex flex-1 min-w-0 items-center gap-1 overflow-x-auto justify-end [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map(item => (
              <Link key={item.path} href={item.path}>
                <Button variant="ghost" size="icon" className={`shrink-0 ${location === item.path ? "text-primary" : "text-muted-foreground"}`}>
                  <item.icon className="h-4 w-4" />
                </Button>
              </Link>
            ))}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
