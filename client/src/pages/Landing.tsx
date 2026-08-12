import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Check,
  Play,
  Zap,
  Crown,
  Building2,
  Brain,
  Target,
  Shield,
  Gamepad2,
  Swords,
  ChevronRight,
} from "lucide-react";

const GOLD = "#FDB927";
const PURPLE = "#552583";

const tiers = [
  {
    name: "Basic Build",
    setup: 3000,
    price: 70,
    icon: Zap,
    color: "#C4B5FD",
    description: "Core scouting, built and running for your program",
    features: [
      "AI Scouting Reports",
      "Film Breakdown with Annotations",
      "Player Tendency Cards",
      "Season Intel Dashboard",
      "Unlimited scouting sessions",
      "Core updates included",
    ],
    cta: "Start With Basic",
  },
  {
    name: "Full Program",
    setup: 10000,
    price: 150,
    icon: Crown,
    color: GOLD,
    popular: true,
    description: "Every feature we build, now and as it ships",
    features: [
      "Everything in Basic Build",
      "AI Game Plan Generator + 3D Play Diagrams",
      "Time Machine film review",
      "Attack Package & Coach Style Mode",
      "Play Designer, Coach Card & Challenge",
      "Custom build requests",
      "All future updates, free",
      "Unlimited coach seats",
    ],
    cta: "Get Full Program",
  },
  {
    name: "The Finnese Package",
    setup: 20000,
    price: 500,
    icon: Building2,
    color: "#FFD700",
    description: "Everything, and nobody else in your district gets it",
    features: [
      "Everything in Full Program",
      "District exclusivity — one program only",
      "New features first, before anyone",
      "Priority custom build queue",
      "Custom branding",
      "Direct line support",
    ],
    cta: "Contact Sales",
  },
];

const features = [
  {
    icon: Brain,
    title: "AI Scouting Reports",
    description: "Drop in game film and get a full 360° scouting report in under 60 seconds. Offense, defense, special situations, key players — all broken down by AI.",
  },
  {
    icon: Target,
    title: "AI Film Breakdown",
    description: "Color-coded SVG annotations drawn directly on film. Red for mistakes, green for good possessions, blue for spacing suggestions, yellow for key players.",
  },
  {
    icon: Swords,
    title: "Game Plan Generator",
    description: "AI builds a complete game plan: first 8 scripted possessions, ATO/BLOB/SLOB package, late-clock plays, defensive adjustments, and halftime checklist.",
  },
  {
    icon: Play,
    title: "Animated Play Diagrams",
    description: "2K-style X's and O's on a half-court with cuts, screens, and dribble actions. Hit 'Run Play' to watch the set develop in real time against the scouted defense.",
  },
  {
    icon: Shield,
    title: "Player Tendency Profiles",
    description: "AI-generated scouting cards for every key opponent. Tendencies, strengths, weaknesses, and 2K-style OVR ratings with attribute bars.",
  },
  {
    icon: Gamepad2,
    title: "Scouting Challenge",
    description: "Gamified quiz mode to sharpen your basketball IQ. Read defenses, identify sets, predict coverages, and make the right late-game call.",
  },
];

// Animated half-court hero diagram
function HeroDiagram() {
  const offensePlayers = [
    { x: 200, y: 235, label: "PG" },
    { x: 90, y: 170, label: "SG" },
    { x: 310, y: 170, label: "SF" },
    { x: 150, y: 105, label: "PF" },
    { x: 250, y: 105, label: "C" },
  ];

  const routes = [
    { from: { x: 200, y: 235 }, to: { x: 245, y: 160 } }, // PG dribbles off screen
    { from: { x: 250, y: 105 }, to: { x: 215, y: 175 } }, // C sets ball screen
    { from: { x: 90, y: 170 }, to: { x: 120, y: 85 } }, // SG backdoor cut
    { from: { x: 150, y: 105 }, to: { x: 90, y: 90 } }, // PF flare
  ];

  return (
    <svg viewBox="0 0 400 300" className="w-full max-w-md mx-auto">
      {/* Court outline */}
      <rect x="20" y="10" width="360" height="280" fill="none" stroke="#30363D" strokeWidth="1.5" rx="4" />
      {/* Paint */}
      <rect x="150" y="10" width="100" height="90" fill="none" stroke="#30363D" strokeWidth="1.5" />
      <path d="M 150 100 A 50 50 0 0 0 250 100" fill="none" stroke="#30363D" strokeWidth="1.5" />
      {/* 3pt arc */}
      <path d="M 50 10 L 50 70 Q 200 230 350 70 L 350 10" fill="none" stroke="#30363D" strokeWidth="1.5" />
      {/* Hoop */}
      <line x1="180" y1="28" x2="220" y2="28" stroke="#555" strokeWidth="2" />
            <circle cx="200" cy="38" r="8" fill="none" stroke={GOLD} strokeWidth="2" />

      {/* Routes */}
      {routes.map((route, i) => (
        <motion.line
          key={i}
          x1={route.from.x}
          y1={route.from.y}
          x2={route.to.x}
          y2={route.to.y}
          stroke={GOLD}
          strokeWidth="2"
          strokeDasharray="6 3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 1 + i * 0.3, duration: 1 }}
        />
      ))}

      {/* Route arrows */}
      {routes.map((route, i) => (
        <motion.polygon
          key={`arrow-${i}`}
          points={`${route.to.x},${route.to.y - 6} ${route.to.x - 4},${route.to.y + 2} ${route.to.x + 4},${route.to.y + 2}`}
          fill={GOLD}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 + i * 0.3 }}
        />
      ))}

      {/* Offense players */}
      {offensePlayers.map((p, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 * i, type: "spring" }}
        >
          <circle cx={p.x} cy={p.y} r="12" fill="#160826" stroke={GOLD} strokeWidth="2" />
          <text x={p.x} y={p.y + 3.5} textAnchor="middle" fill={GOLD} fontSize="8" fontWeight="bold">
            {p.label}
          </text>
        </motion.g>
      ))}

      {/* Defense X marks */}
      {[
        { x: 200, y: 200 }, { x: 115, y: 145 }, { x: 285, y: 145 },
        { x: 165, y: 80 }, { x: 235, y: 80 },
      ].map((p, i) => (
        <motion.text
          key={`def-${i}`}
          x={p.x}
          y={p.y}
          textAnchor="middle"
          fill="#EF4444"
          fontSize="16"
          fontWeight="bold"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 + i * 0.1 }}
        >
          ×
        </motion.text>
      ))}
    </svg>
  );
}

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#100719] text-white overflow-x-hidden selection:bg-[#FDB927] selection:text-[#2b1249]">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#100719]/85 backdrop-blur-xl border-b border-[#6b4a92]/40 shadow-[0_1px_0_rgba(253,185,39,0.1)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg border border-[#FDB927]/35 bg-[#FDB927]/10 flex items-center justify-center shadow-[0_0_18px_rgba(253,185,39,0.12)]">
              <Target className="h-4 w-4 text-[#FDB927]" />
            </div>
            <span className="text-lg font-bold">CourtVision AI</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <a href="#features" className="hidden sm:inline text-sm text-purple-200/65 hover:text-[#FDE68A] transition-colors">Features</a>
            <a href="#pricing" className="hidden sm:inline text-sm text-purple-200/65 hover:text-[#FDE68A] transition-colors">Pricing</a>
            {isAuthenticated ? (
              <Button size="sm" className="bg-[#FDB927] text-[#2b1249] hover:bg-[#ffe08a] font-bold shadow-[0_8px_22px_rgba(253,185,39,0.18)]" onClick={() => setLocation("/")}>
                Dashboard
              </Button>
            ) : (
              <Button size="sm" className="bg-[#FDB927] text-[#2b1249] hover:bg-[#ffe08a] font-bold shadow-[0_8px_22px_rgba(253,185,39,0.18)]" onClick={() => startLogin()}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_at_72%_22%,rgba(85,37,131,0.55),transparent_58%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FDB927]/10 border border-[#FDB927]/35 text-[#FDE68A] text-xs font-semibold mb-6"
            >
              <Zap className="h-3 w-3" />
              AI-POWERED BASKETBALL SCOUTING
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative text-5xl lg:text-6xl font-bold leading-tight mb-6"
            >
              Scout Any Opponent.
              <br />
              <span className="text-[#FDB927]">Own the Court.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative text-lg text-purple-100/65 mb-8 max-w-lg"
            >
              Upload game film and get complete AI scouting reports, player tendency cards, film annotations, and 2K-style animated game plans — in minutes, not all-nighters.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <Button
                size="lg"
                className="bg-[#FDB927] text-[#2b1249] hover:bg-[#ffe08a] font-bold text-base px-8 shadow-[0_12px_30px_rgba(253,185,39,0.2)]"
                onClick={() => (isAuthenticated ? setLocation("/") : startLogin())}
              >
                Start Scouting Free
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-[#8564a8]/55 text-purple-50 hover:bg-[#2b1249] text-base px-8"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                See Features
              </Button>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative lakers-surface border border-[#7e5ca2]/55 rounded-2xl p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(253,185,39,0.12)]"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-purple-200/45 uppercase tracking-wider">Spain Pick & Roll vs Man</span>
              <span className="text-xs font-mono text-[#FDE68A]">● LIVE ANALYSIS</span>
            </div>
            <HeroDiagram />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-[#160a26] border-y border-[#6b4a92]/25">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Your AI Coaching Staff</h2>
            <p className="text-purple-100/65 max-w-2xl mx-auto">
              Everything a varsity, AAU, or college staff needs to out-prepare any opponent, powered by film-room AI.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-[#211037] border border-[#6b4a92]/50 rounded-xl p-6 hover:border-[#FDB927]/55 hover:-translate-y-0.5 transition-[border-color,transform,box-shadow] duration-200 hover:shadow-[0_14px_34px_rgba(0,0,0,0.2)]"
              >
                <div className="w-10 h-10 rounded-lg bg-[#FDB927]/10 border border-[#FDB927]/15 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-[#FDB927]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-purple-100/60 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Pick Your Game Plan</h2>
            <p className="text-purple-100/65">
              A one-time build to stand your system up, then a small monthly to keep it running.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {tiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-[#211037] border rounded-2xl p-8 ${
                  tier.popular ? "border-[#FDB927] shadow-[0_0_42px_rgba(253,185,39,0.16),inset_0_1px_0_rgba(253,185,39,0.18)]" : "border-[#6b4a92]/50"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#FDB927] text-[#2b1249] text-xs font-black shadow-[0_8px_18px_rgba(253,185,39,0.2)]">
                    MOST POPULAR
                  </div>
                )}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${tier.color}20` }}>
                  <tier.icon className="h-5 w-5" style={{ color: tier.color }} />
                </div>
                <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                <p className="text-sm text-purple-100/60 mb-4">{tier.description}</p>
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">${tier.setup.toLocaleString()}</span>
                    <span className="text-sm text-purple-100/55">one-time build</span>
                  </div>
                  <div className="mt-1 text-sm text-purple-100/55">
                    then <span className="font-semibold text-purple-50">${tier.price}</span>/month
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-purple-50/80">
                      <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: tier.color }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full font-semibold ${
                    tier.popular ? "bg-[#FDB927] text-[#2b1249] hover:bg-[#ffe08a] font-bold" : "bg-[#32184f] text-purple-50 hover:bg-[#3d1e61] border border-[#8564a8]/35"
                  }`}
                  onClick={() => (isAuthenticated ? setLocation("/") : startLogin())}
                >
                  {tier.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-[#160a26] border-y border-[#6b4a92]/25">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to out-scout everyone?</h2>
          <p className="text-purple-100/65 mb-8">
            Join coaching staffs using AI to win the film-room battle before tip-off.
          </p>
          <Button
            size="lg"
            className="bg-[#FDB927] text-[#2b1249] hover:bg-[#ffe08a] font-bold text-base px-10 shadow-[0_12px_30px_rgba(253,185,39,0.2)]"
            onClick={() => (isAuthenticated ? setLocation("/") : startLogin())}
          >
            Start Your First Scout
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#6b4a92]/35 py-8 px-6 bg-[#100719]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[#FDB927]" />
            <span className="text-sm font-semibold">CourtVision AI</span>
          </div>
          <p className="text-xs text-purple-200/40">© {new Date().getFullYear()} CourtVision AI. Scout smarter, win louder.</p>
        </div>
      </footer>
    </div>
  );
}
