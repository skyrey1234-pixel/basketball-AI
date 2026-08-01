# CourtVision AI — Project TODO

Basketball version of TacticalEdge AI (football scouting app), mirroring its structure and process.

## Backend
- [x] DB schema: game_sessions, scouting_reports, player_profiles, film_annotations, game_plans
- [x] DB migration applied to remote database
- [x] db.ts query helpers for sessions/reports/players/annotations/game plans
- [x] sessions router: list, get, create (triggers async AI report), delete, reanalyze
- [x] AI generateReport pipeline (LLM json_schema: 6 sections + timestamped highlights)
- [x] reports router: getBySession
- [x] ai router: chat (Ask the Analyst) with report context
- [x] ai router: annotateHighlight (SVG annotation JSON: circles/arrows/zones/labels)
- [x] players router: listBySession, generate (3-6 tendency profiles via LLM)
- [x] gamePlan router: generate (first 8 possessions, ATO/BLOB/SLOB package, late-clock, defensive adjustments, key matchups, halftime checklist)
- [x] upload route: POST /api/upload (multer -> storagePut, 500MB)
- [x] season router: stats + opponent trends

## Frontend
- [x] Dark theme (#0D1117 bg, basketball orange #FF7A1A accent), fonts, index.css
- [x] Landing page: nav, animated half-court hero diagram, 6 feature cards, 3-tier pricing, footer
- [x] Dashboard: session list, status badges, empty state CTA
- [x] NewSession: opponent name, date, YouTube URL or video upload
- [x] SessionPage with tabs: Scouting Report | Film Breakdown | Player Profiles | Game Plan | Matchup
- [x] ReportView: video embed + 6 section cards + Ask the Analyst chat + Key Moments sidebar
- [x] FilmBreakdown: filter tabs, stats bar, per-highlight annotation canvas over video at timestamp, color legend
- [x] AnnotationCanvas: SVG overlay (circles/arrows/zones/labels)
- [x] PlayCourtDiagram: animated half-court SVG (hoop, 3pt arc, paint) with player circles, cut/screen/dribble routes, defense X marks, Run Play / Reset controls
- [x] PlayerProfiles tab: generate button, 2K-style tendency cards
- [x] PlayerRatingCard: 2K-style card with OVR + 6 attribute bars (3PT/Driving/Playmaking/Perimeter D/Rebounding/IQ)
- [x] GamePlanGenerator: overview, First 8, ATO/OB package, Late Clock, defensive adjustments, halftime checklist with court diagrams
- [x] MatchupScreen: key matchups with advantage badges (from game plan)
- [x] ScoutingChallenge: gamified quiz (read defenses, identify sets, late-game IQ) with score grades
- [x] Season Intel dashboard: opponent history/aggregate stats
- [x] Sidebar layout: Sessions, New Analysis, Season Intel, Scouting Challenge

## Quality
- [x] Vitest coverage for routers (9 tests passing)
- [x] Screenshot verification of key pages
- [x] TypeScript check clean
- [x] Checkpoint saved (version 2b80beee)

## Deferred (needs user input)
- [ ] [DEFERRED — needs user Stripe key] Stripe subscription tiers (Scout $99 / Strategist $199 / Program $499) — requires Stripe integration setup; game plan gating included in-code with free access until Stripe is connected

## New Features (in progress)
- [x] Full React Three Fiber 3D court play diagrams (replace flat SVG PlayCourtDiagram)
- [x] Coach Style Mode — pick Pop/Stevens/Thibs/etc., AI generates game plan in their system
- [x] Opponent Weakness Exploiter — Attack Package: 5 plays built specifically to torch opponent weaknesses

## NBA 2K-Style Features (Tier 1)
- [x] 2K Player DNA Cards: animated flip reveal, rarity tiers (Bronze/Silver/Gold/Diamond), position colors, animated OVR reveal, glow effects
- [x] Tendency Ratings 0-99 (Drive Left/Right, Pull-Up Mid/3, Spot-Up 3, Catch & Shoot, Post Fade/Hook, Pass Under Pressure, Ball Security, Clutch, On-Ball D)
- [x] Hot Zones / Cold Zones half-court shot chart with animated heat map and hover "Attack this zone"
- [x] 2K MyTeam-style Matchup Battle screen: card vs card, attribute comparison bars, advantage badges, overall matchup score

## NBA 2K-Style Features (Tier 2)
- [x] Scouting XP & progression system (+500 film, +300 game plan, +100 challenge) with level bar
- [x] Coach Card with level, badges (Film Rat, Play Designer, Defensive Mastermind)
- [x] Play Designer: drag-and-drop play builder on court, save to playbook, AI grades the play
- [x] 2K-style analyzing loading screen: animated silhouette, progress phases, basketball tips
- [x] Clutch Rating situational analysis (Clutch, Under Pressure, Late Shot Clock)

## NBA 2K-Style Features (Tier 3)
- [x] Opponent player badge system (Hot Zone Shooter, Clamps, Catch & Shoot, Slithery, Floor General)
- [x] 2K-style cutscene intro when opening a session (team name reveal, glitch text)
- [x] MyCoach Mode campaign: weekly opponents, bracket progression, coins, leaderboard
- [x] Post-Game Prediction vs Reality: enter final score, accuracy %, season track record
