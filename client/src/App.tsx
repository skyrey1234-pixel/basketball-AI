import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import NewSession from "./pages/NewSession";
import SessionPage from "./pages/SessionPage";
import SeasonDashboard from "./pages/SeasonDashboard";
import ScoutingChallenge from "./pages/ScoutingChallenge";
import CoachStyleMode from "./pages/CoachStyleMode";
import CoachCard from "./pages/CoachCard";
import PlayDesigner from "./pages/PlayDesigner";
import ShotChart from "./pages/ShotChart";
import FormCoach from "./pages/FormCoach";
import HighlightReel from "./pages/HighlightReel";
import ShotDetection from "./pages/ShotDetection";
function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/landing"} component={Landing} />
      <Route path={"/new"} component={NewSession} />
      <Route path={"/season"} component={SeasonDashboard} />
      <Route path={"/challenge"} component={ScoutingChallenge} />
      <Route path={"/coach-style"} component={CoachStyleMode} />
      <Route path={"/coach-card"} component={CoachCard} />
      <Route path={"/play-designer"} component={PlayDesigner} />
  <Route path={"/session/:id"} component={SessionPage} />
      <Route path={"/shot-chart"} component={ShotChart} />
      <Route path={"/form-coach"} component={FormCoach} />
      <Route path={"/highlight-reel"} component={HighlightReel} />
      <Route path={"/shot-detection"} component={ShotDetection} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
