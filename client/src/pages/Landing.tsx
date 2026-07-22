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

const ORANGE = "#FF7A1A";

const tiers = [
  {
    name: "Scout",
    price: 99,
    icon: Zap,
    color: "#60A5FA",
    description: "Essential scouting for competitive programs",
    features: [
      "AI Scouting Reports",
      "Season Intel Dashboard",
      "Player Tendency Profiles",
      "5 sessions/month",
      "SVG Film Annotations",
    ],
    cta: "Start Scouting",
  },
  {
    name: "Strategist",
    price: 199,
    icon: Crown,
    color: ORANGE,
    popular: true,
    description: "Full game planning for serious coaching staffs",
    features: [
      "Everything in Scout",
      "AI Game Plan Generator",
      "Animated 2K-Style Play Diagrams",
      "Unlimited sessions",
      "ATO / BLOB / SLOB Packages",
      "Scouting Challenge Mode",
    ],
    cta: "Get Strategist",
  },
  {
    name: "Program",
    price: 499,
    icon: Building2,
    color: "#FFD700",
    description: "Enterprise solution for entire athletic programs",
    features: [
      "Everything in Strategist",
      "5-10 team seats",
      "API access",
      "Priority support",
      "Custom branding",
      "Dedicated account manager",
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
      <circle cx="200" cy="38" r="8" fill="none" stroke={ORANGE} strokeWidth="2" />

      {/* Routes */}
      {routes.map((route, i) => (
        <motion.line
          key={i}
          x1={route.from.x}
          y1={route.from.y}
          x2={route.to.x}
          y2={route.to.y}
          stroke={ORANGE}
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
          fill={ORANGE}
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
          <circle cx={p.x} cy={p.y} r="12" fill="#0d1117" stroke={ORANGE} strokeWidth="2" />
          <text x={p.x} y={p.y + 3.5} textAnchor="middle" fill={ORANGE} fontSize="8" fontWeight="bold">
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
    <div className="min-h-screen bg-[#0d1117] text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0d1117]/80 backdrop-blur-xl border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FF7A1A]/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-[#FF7A1A]" />
            </div>
            <span className="text-lg font-bold">CourtVision AI</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
            {isAuthenticated ? (
              <Button size="sm" className="bg-[#FF7A1A] text-black hover:bg-[#ff8f40] font-semibold" onClick={() => setLocation("/")}>
                Dashboard
              </Button>
            ) : (
              <Button size="sm" className="bg-[#FF7A1A] text-black hover:bg-[#ff8f40] font-semibold" onClick={() => startLogin()}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF7A1A]/10 border border-[#FF7A1A]/30 text-[#FF7A1A] text-xs font-semibold mb-6"
            >
              <Zap className="h-3 w-3" />
              AI-POWERED BASKETBALL SCOUTING
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl lg:text-6xl font-bold leading-tight mb-6"
            >
              Scout Any Opponent.
              <br />
              <span className="text-[#FF7A1A]">Own the Court.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-400 mb-8 max-w-lg"
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
                className="bg-[#FF7A1A] text-black hover:bg-[#ff8f40] font-semibold text-base px-8"
                onClick={() => (isAuthenticated ? setLocation("/") : startLogin())}
              >
                Start Scouting Free
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-700 text-white hover:bg-gray-800 text-base px-8"
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
            className="bg-[#161b22] border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Spain Pick & Roll vs Man</span>
              <span className="text-xs font-mono text-[#FF7A1A]">● LIVE ANALYSIS</span>
            </div>
            <HeroDiagram />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-[#0a0d12]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Your AI Coaching Staff</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
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
                className="bg-[#161b22] border border-gray-800 rounded-xl p-6 hover:border-[#FF7A1A]/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[#FF7A1A]/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-[#FF7A1A]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
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
            <p className="text-gray-400">Monthly plans built for every level of program.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {tiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-[#161b22] border rounded-2xl p-8 ${
                  tier.popular ? "border-[#FF7A1A] shadow-[0_0_40px_rgba(255,122,26,0.15)]" : "border-gray-800"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#FF7A1A] text-black text-xs font-bold">
                    MOST POPULAR
                  </div>
                )}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ backgroundColor: `${tier.color}20` }}>
                  <tier.icon className="h-5 w-5" style={{ color: tier.color }} />
                </div>
                <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{tier.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${tier.price}</span>
                  <span className="text-gray-400">/mo</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {tier.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check className="h-4 w-4 mt-0.5 shrink-0" style={{ color: tier.color }} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full font-semibold ${
                    tier.popular ? "bg-[#FF7A1A] text-black hover:bg-[#ff8f40]" : "bg-gray-800 text-white hover:bg-gray-700"
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
      <section className="py-20 px-6 bg-[#0a0d12]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to out-scout everyone?</h2>
          <p className="text-gray-400 mb-8">
            Join coaching staffs using AI to win the film-room battle before tip-off.
          </p>
          <Button
            size="lg"
            className="bg-[#FF7A1A] text-black hover:bg-[#ff8f40] font-semibold text-base px-10"
            onClick={() => (isAuthenticated ? setLocation("/") : startLogin())}
          >
            Start Your First Scout
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[#FF7A1A]" />
            <span className="text-sm font-semibold">CourtVision AI</span>
          </div>
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} CourtVision AI. Scout smarter, win louder.</p>
        </div>
      </footer>
    </div>
  );
}
