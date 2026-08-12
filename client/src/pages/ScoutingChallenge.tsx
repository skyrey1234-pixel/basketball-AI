import { useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Trophy, RotateCcw, CircleCheck, CircleX } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { COACH_BADGES } from "@shared/twok";

type Question = {
  category: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

const QUESTION_BANK: Question[] = [
  {
    category: "Reading Defenses",
    question: "The defense has two defenders up top, three across the baseline area. What are you looking at?",
    options: ["1-3-1 zone", "2-3 zone", "3-2 zone", "Box-and-one"],
    answer: 1,
    explanation: "Two up top and three along the back line is the classic 2-3 zone — attack it with high-post touches and corner threes.",
  },
  {
    category: "Reading Defenses",
    question: "Your PG comes off a ball screen and BOTH defenders jump to the ball. What coverage is this and what's the counter?",
    options: [
      "Drop coverage — pull up mid-range",
      "Switch — attack the mismatch",
      "Hedge/trap — hit the roller in the short roll",
      "Ice — reject the screen",
    ],
    answer: 2,
    explanation: "Two on the ball is a hard hedge or trap. The screener rolling into the short-roll pocket becomes your 4-on-3 playmaker.",
  },
  {
    category: "Set Recognition",
    question: "Offense aligns with two bigs at the elbows and shooters in both corners. What set is this?",
    options: ["Box set", "Horns", "5-out motion", "1-4 low"],
    answer: 1,
    explanation: "Bigs at both elbows with corner spacing is Horns — a launchpad for PnR, dribble handoffs, and elbow splits.",
  },
  {
    category: "Set Recognition",
    question: "A guard passes to the wing and immediately screens for the screener who just set a back screen. That action is called:",
    options: ["Flex action", "Spain pick & roll", "Screen-the-screener", "Chicago action"],
    answer: 2,
    explanation: "Screen-the-screener creates a delayed second cut that's brutal to track — common in BLOB and elbow sets.",
  },
  {
    category: "Late-Game IQ",
    question: "Down 3, opponent's ball, 12 seconds left. Best defensive call for most teams?",
    options: [
      "Foul immediately before the shot",
      "Switch everything, no threes",
      "Trap the inbounder",
      "Drop into 2-3 zone",
    ],
    answer: 1,
    explanation: "Up 3 late you can debate fouling, but DOWN 3 you need a stop — switch everything and run shooters off the line. Wait — read carefully: they have the ball and you're down 3. A quick foul only helps if you must extend the game with a shot-clock edge; standard is to get a stop without fouling a 3-point shooter.",
  },
  {
    category: "Late-Game IQ",
    question: "Up 3 with 8 seconds left, opponent inbounding frontcourt. The analytics-approved move is:",
    options: [
      "Play straight man defense",
      "Foul before the shooter starts a shooting motion",
      "Zone up and protect the arc",
      "Double the best shooter",
    ],
    answer: 1,
    explanation: "Fouling up 3 (before a shooting motion) sends them to the line for 2 max, and eliminates the game-tying three.",
  },
  {
    category: "Tendency Scouting",
    question: "Film shows their star wing goes left on 82% of iso drives. Your best coverage:",
    options: [
      "Force him right with a heavy left shade",
      "Sag off and give the jumper",
      "Full deny so he never catches",
      "Trap on every catch",
    ],
    answer: 0,
    explanation: "Overplay the strong hand and force the counter — an 82% lefty-drive tendency means his right-hand pull-up is his weakness.",
  },
  {
    category: "Tendency Scouting",
    question: "Their center never steps outside the paint on defense. What action punishes that most directly?",
    options: [
      "Post-ups on the block",
      "Spread PnR with a pick-and-pop 5",
      "Full-court press offense",
      "Dump-offs to the dunker spot",
    ],
    answer: 1,
    explanation: "A drop-bound center dies to pick-and-pop: he can't contest the popping big without leaving the rim, and can't guard both.",
  },
  {
    category: "Special Situations",
    question: "On a BLOB (baseline out of bounds) against a 2-3 zone, the highest-value first look is usually:",
    options: [
      "Deep corner three",
      "Lob over the front line",
      "Quick slip to the short corner / dunker spot",
      "Kick back to the inbounder stepping in",
    ],
    answer: 2,
    explanation: "The short corner is the 2-3 zone's dead spot on a BLOB — a quick slip there forces the back line to break shape.",
  },
  {
    category: "Special Situations",
    question: "Your press break keeps getting trapped in the corners crossing half court. The fix:",
    options: [
      "Dribble faster through the trap zones",
      "Flatten everyone to the baseline",
      "Middle flash + reversal — never cross with the dribble in the corner",
      "Throw deep over the top every time",
    ],
    answer: 2,
    explanation: "Presses feed on corner dribblers. A middle flash gives a pressure release, and quick reversals make the trap chase.",
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ScoutingChallenge() {
  const [gameKey, setGameKey] = useState(0);
  const questions = useMemo(() => shuffle(QUESTION_BANK).slice(0, 7), [gameKey]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const current = questions[index];
  const isAnswered = selected !== null;

  const utils = trpc.useUtils();
  const awardChallenge = trpc.progress.awardChallenge.useMutation({
    onSuccess: res => {
      if (!res) return;
      utils.progress.me.invalidate();
      if (res.leveledUp) {
        toast.success(`Level ${res.level}`, {
          description: "Your Coach Card just leveled up.",
        });
      }
      for (const id of res.newlyEarned) {
        const badge = COACH_BADGES.find(b => b.id === id);
        toast.success(`Badge unlocked: ${badge?.label ?? id}`, {
          description: badge?.desc,
        });
      }
    },
  });

  const handleSelect = (i: number) => {
    if (isAnswered) return;
    setSelected(i);
    if (i === current.answer) {
      setScore(s => s + 1);
      awardChallenge.mutate({ correct: true });
    }
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setSelected(null);
    }
  };

  const handleRestart = () => {
    setGameKey(k => k + 1);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  };

  const grade =
    score >= questions.length * 0.85 ? { label: "ELITE SCOUT", color: "#FFD700" }
    : score >= questions.length * 0.6 ? { label: "VARSITY ASSISTANT", color: "#FDB927" }
    : score >= questions.length * 0.4 ? { label: "JV CLIPBOARD", color: "#60A5FA" }
    : { label: "FILM ROOM ROOKIE", color: "#9CA3AF" };

  return (
    <AppLayout>
      <div className="container max-w-2xl py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gamepad2 className="h-6 w-6 text-primary" /> Scouting Challenge
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Test your basketball IQ: read defenses, recognize sets, and make the right call.
          </p>
        </div>

        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card>
              <CardContent className="py-12 flex flex-col items-center text-center">
                <Trophy className="h-12 w-12 mb-4" style={{ color: grade.color }} />
                <div className="text-4xl font-bold mb-1">
                  {score}/{questions.length}
                </div>
                <Badge variant="outline" className="mb-6 font-bold tracking-wider" style={{ borderColor: grade.color, color: grade.color }}>
                  {grade.label}
                </Badge>
                <p className="text-xs text-muted-foreground mb-6 -mt-3">
                  +{score * 100} XP banked to your Coach Card
                </p>
                <Button className="gap-2 font-semibold" onClick={handleRestart}>
                  <RotateCcw className="h-4 w-4" /> Run It Back
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Question {index + 1} of {questions.length}
              </span>
              <span className="font-mono font-bold text-primary">{score} pts</span>
            </div>
            <Progress value={((index + (isAnswered ? 1 : 0)) / questions.length) * 100} />

            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <Badge variant="outline" className="mb-4 border-primary/40 text-primary">{current.category}</Badge>
                    <h2 className="text-lg font-semibold mb-6">{current.question}</h2>
                    <div className="space-y-2">
                      {current.options.map((option, i) => {
                        const isCorrect = i === current.answer;
                        const isSelected = i === selected;
                        let cls = "border-border hover:border-primary/50";
                        if (isAnswered && isCorrect) cls = "border-green-500 bg-green-500/10";
                        else if (isAnswered && isSelected && !isCorrect) cls = "border-red-500 bg-red-500/10";
                        else if (isAnswered) cls = "border-border opacity-60";
                        return (
                          <button
                            key={i}
                            className={`w-full text-left rounded-lg border p-3.5 text-sm transition-colors flex items-center justify-between gap-2 ${cls}`}
                            onClick={() => handleSelect(i)}
                            disabled={isAnswered}
                          >
                            {option}
                            {isAnswered && isCorrect && <CircleCheck className="h-4 w-4 text-green-400 shrink-0" />}
                            {isAnswered && isSelected && !isCorrect && <CircleX className="h-4 w-4 text-red-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"
                      >
                        <span className="text-primary font-bold text-[10px] uppercase tracking-wider block mb-1">Film Room Note</span>
                        {current.explanation}
                      </motion.div>
                    )}

                    {isAnswered && (
                      <Button className="w-full mt-4 font-semibold" onClick={handleNext}>
                        {index + 1 >= questions.length ? "See Final Score" : "Next Question"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
