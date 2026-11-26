import type { ReactNode } from "react";
import InteractiveDerbyGame from "./components/InteractiveDerbyGame";
import heroImg from "./assets/derby-hero.png";

/* ---------- decorative top-down pixel car (SVG) ---------- */
function PixelCar({
  body = "#9c2b22",
  trim = "#c85a3a",
  className = "",
}: {
  body?: string;
  trim?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
    >
      {/* wheels */}
      <rect x="2" y="3" width="6" height="3" fill="#0c0a07" />
      <rect x="2" y="18" width="6" height="3" fill="#0c0a07" />
      <rect x="16" y="3" width="6" height="3" fill="#0c0a07" />
      <rect x="16" y="18" width="6" height="3" fill="#0c0a07" />
      {/* body */}
      <rect x="3" y="4" width="18" height="16" fill={body} />
      <rect x="3" y="4" width="4" height="16" fill={trim} />
      {/* windshield */}
      <rect x="3" y="9" width="18" height="6" fill="#0e1419" />
      <rect x="6" y="10" width="3" height="4" fill="#b4d2e6" opacity="0.55" />
      {/* dents */}
      <rect x="14" y="5" width="3" height="2" fill="#000" opacity="0.25" />
      <rect x="9" y="17" width="4" height="2" fill="#000" opacity="0.25" />
    </svg>
  );
}

function StatBox({
  label,
  value,
  accent = "text-ember",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex-1 border-2 border-panel-2 bg-asphalt px-3 py-2 text-center rounded-lg shadow-inner">
      <div className="font-arcade text-[0.5rem] leading-none text-bone-dim">
        {label}
      </div>
      <div className={`mt-1.5 font-arcade text-[0.8rem] leading-none ${accent}`}>
        {value}
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="group relative border-2 border-panel-2 bg-panel/70 p-6 rounded-xl transition-all duration-200 hover:border-rust hover:bg-panel shadow-lg hover:shadow-2xl">
      <div className="absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-ember/70" />
      <div className="absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-ember/70" />
      <div className="mb-3 text-4xl">{icon}</div>
      <h3 className="font-arcade text-sm leading-relaxed text-ember">
        {title}
      </h3>
      <p className="mt-2 font-term text-lg leading-relaxed text-bone-dim group-hover:text-bone">
        {children}
      </p>
    </div>
  );
}

function KeyRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-panel-2 py-3 last:border-0">
      <div className="flex items-center gap-2">
        {keys.map((k) => (
          <span key={k} className="keycap shadow-md">
            {k}
          </span>
        ))}
      </div>
      <span className="font-term text-lg text-bone-dim">{action}</span>
    </div>
  );
}

const MARQUEE = [
  "★ CRÉATEUR : HYLST & GEOFFROY",
  "AVEC L'AIDE D'UNE IA",
  "NOUVEAU SYSTÈME AUDIO CHIPTUNE",
  "BOLIDES 100% JOUABLES",
  "DÉGÂTS PERMANENTS",
  "BIENVENUE DANS LA CASSE",
];

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0e0b08] text-bone font-term selection:bg-flame selection:text-black">
      {/* Faint pixel grid backdrop */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Floating embers */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {[
          { left: "10%", delay: "0s", dur: "4.5s" },
          { left: "25%", delay: "1.2s", dur: "5.2s" },
          { left: "52%", delay: "0.5s", dur: "3.9s" },
          { left: "71%", delay: "2.3s", dur: "4.8s" },
          { left: "88%", delay: "1.1s", dur: "5.5s" },
        ].map((e, i) => (
          <span
            key={i}
            className="animate-rise absolute bottom-0 h-2 w-2 rounded-full bg-flame opacity-75 shadow-[0_0_6px_#ff6a00]"
            style={{ left: e.left, animationDelay: e.delay, animationDuration: e.dur }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {/* ============ ARCADE HEADER ============ */}
        <header className="pt-8 text-center sm:pt-12">
          <div className="mb-3 inline-flex items-center gap-3 font-arcade text-[0.65rem] text-rust tracking-wider">
            <span className="animate-blink text-ember">●</span> UNE CRÉATION DE <span className="text-bone font-bold">HYLST - GEOFFROY</span> (AVEC IA) <span className="animate-blink text-ember">●</span>
          </div>
          <h1 className="text-flame text-flame-anim font-arcade leading-[1.3] text-3xl sm:text-5xl md:text-6xl tracking-tight">
            DÉMOLITION
            <br /> DERBY
          </h1>
          <p className="mt-4 font-term text-2xl text-bone-dim">
            Le chaos miniature dans la grande casse : <span className="text-ember font-bold">Maintenant 100% Jouable !</span>
          </p>
        </header>

        {/* Scrolling sub-marquee */}
        <div className="relative mt-8 overflow-hidden border-y-2 border-rust/60 bg-asphalt py-2.5 shadow-xl">
          <div className="animate-marquee flex w-max gap-8 whitespace-nowrap font-arcade text-[0.6rem] text-ember tracking-wider">
            {[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i} className="flex items-center gap-8">
                <PixelCar className="inline-block h-3.5 w-3.5 align-middle" /> {m}
              </span>
            ))}
          </div>
        </div>

        {/* ============ CENTERPIECE PLAYABLE ARCADE CABINET ============ */}
        <section className="mt-12">
          <div className="text-center mb-6">
            <div className="inline-block bg-toxic/20 border-2 border-toxic text-toxic font-arcade text-xs px-4 py-1.5 rounded-full mb-2 shadow-[0_0_12px_rgba(155,194,74,0.4)] animate-pulse">
              NOUVEAU MODE INTERACTIF 60 FPS
            </div>
            <h2 className="font-arcade text-xl sm:text-2xl text-bone">
              BORNE D'ARCADE OFFICIELLE
            </h2>
            <p className="font-term text-lg text-bone-dim mt-1">
              Insérez une pièce, choisissez votre bolide et détruisez les 7 pilotes IA !
            </p>
          </div>

          <div className="w-full">
            <InteractiveDerbyGame />
          </div>
        </section>

        <div className="pixel-rule my-16" />

        {/* ============ HERO ORIGINAL ARTWORK SHOWCASE & LORE ============ */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
          <div className="lg:col-span-7">
            <div className="bezel p-3 sm:p-5 rounded-2xl shadow-2xl border-4 border-panel-2">
              <div className="mb-3 flex items-center justify-between px-2">
                <span className="font-arcade text-[0.6rem] text-bone-dim">ILLUSTRATION PIXEL ART ORIGINALE</span>
                <span className="font-arcade text-[0.6rem] text-rust">16-BIT RETRO CRT</span>
              </div>

              <div className="crt-screen crt-flicker rounded-xl overflow-hidden border-2 border-panel">
                <img
                  src={heroImg}
                  alt="Vue de haut en pixel art du jeu Démolition Derby : arène de terre entourée de pneus broyés avec des petites voitures qui se percutent."
                  className="pixelated block w-full hover:scale-105 transition-transform duration-700"
                  style={{ aspectRatio: "1 / 1" }}
                />
                <div className="crt-vignette" />
                <div className="crt-glare" />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <StatBox label="RÉSOLUTION" value="32x32 SPRITES" />
                <StatBox label="PALETTE" value="INDUSTRIELLE" accent="text-toxic" />
                <StatBox label="CRÉATEURS" value="HYLST & GEOFFROY" accent="text-flame" />
              </div>
            </div>
          </div>

          <aside className="lg:col-span-5 space-y-6">
            <div className="border-2 border-panel-2 bg-panel/60 p-6 rounded-xl shadow-xl">
              <h3 className="font-arcade text-sm text-flame flex items-center gap-2">
                <span>🔥</span> GENÈSE DU PROJET
              </h3>
              <p className="mt-3 font-term text-lg leading-relaxed text-bone-dim">
                Imaginé et réalisé par <span className="text-bone font-bold">Hylst - Geoffroy</span> en collaboration avec une IA, <strong className="text-ember">Démolition Derby</strong> est un hommage passionné aux jeux d'arcade mythiques des années 90.
              </p>
              <p className="mt-2 font-term text-lg leading-relaxed text-bone-dim">
                Chaque élément visuel respecte l'esthétique des consoles 16-bit : une grille de pixels brute, des scanlines CRT cathodiques, une musique chiptune rythmée et un moteur physique de collision aux petits oignons.
              </p>
            </div>

            <div className="border-2 border-panel-2 bg-asphalt p-6 rounded-xl shadow-xl">
              <h3 className="font-arcade text-sm text-toxic flex items-center gap-2">
                <span>🎧</span> SPÉCIFICATIONS AUDIO & IA
              </h3>
              <ul className="mt-3 space-y-2 font-term text-lg text-bone-dim">
                <li className="flex items-center gap-3">
                  <span className="text-toxic font-bold">✔</span> Synthétiseur d'ambiance Chiptune Web Audio
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-toxic font-bold">✔</span> Effets sonores procéduraux (chocs, turbo, dérapages)
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-toxic font-bold">✔</span> Pilotes IA autonomes avec évitement des murs
                </li>
              </ul>
            </div>
          </aside>
        </section>

        <div className="pixel-rule my-16" />

        {/* ============ GAMEPLAY FEATURES ============ */}
        <section>
          <div className="text-center mb-10">
            <h2 className="font-arcade text-xl sm:text-3xl text-flame">
              MÉCANIQUES & NOUVEAUTÉS
            </h2>
            <p className="mt-2 font-term text-xl text-bone-dim">
              Une expérience d'arcade enrichie en circuits, gameplay et effets
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon="🗖" title="MODE PLEIN ÉCRAN">
              Bouton dédié Plein Écran pour agrandir l'arène de combat et profiter du gameplay 60 FPS avec une visibilité et une immersion maximales.
            </FeatureCard>
            <FeatureCard icon="🌋" title="4 CIRCUITS UNIQUES">
              Affrontez vos rivaux sur La Fosse de Terre, L'Usine Toxique, Le Dépôt Glacé ou Le Cratère en Feu, chacun avec sa propre météo et friction de sol.
            </FeatureCard>
            <FeatureCard icon="🤖" title="IA PERSONNALISÉES">
              7 pilotes IA aux comportements distincts : le Kamikaze qui fonce en turbo, le Scavenger qui cherche les caisses, ou le Tank qui garde le centre.
            </FeatureCard>
            <FeatureCard icon="💥" title="BARILS EXPLOSIFS">
              Des bidons hautement inflammables peuplent désormais l'arène. Percutez-les pour déclencher une onde de choc qui souffle les voitures !
            </FeatureCard>
            <FeatureCard icon="⚡" title="TURBO & CAISSES">
              Injectez du Nitro (MAJ) et récupérez des caisses tombées du ciel : Réparation (🔧), Bouclier Invincible (🛡️), ou Roues Dégâts X2 (💥).
            </FeatureCard>
            <FeatureCard icon="🏎️" title="MODES DE COMPÉTITION">
              Variété absolue : Carnage Survie (le dernier en vie gagne), Match à Mort 3 minutes (max d'éliminations), ou Grand Championnat sur 4 manches.
            </FeatureCard>
          </div>
        </section>

        <div className="pixel-rule my-16" />

        {/* ============ CONTROLS & STRATEGY GUIDE ============ */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="border-2 border-panel-2 bg-panel/50 p-6 sm:p-8 rounded-2xl shadow-xl">
            <h2 className="font-arcade text-base sm:text-lg text-ember flex items-center gap-2">
              <span>🕹️</span> GUIDE DES COMMANDES
            </h2>
            <div className="mt-6">
              <KeyRow keys={["←", "→", "Q", "D"]} action="Tourner le volant" />
              <KeyRow keys={["↑", "Z", "W"]} action="Accélérer (Marche avant)" />
              <KeyRow keys={["↓", "S"]} action="Freiner / Marche arrière" />
              <KeyRow keys={["ESPACE"]} action="Frein à main (Dérapage)" />
              <KeyRow keys={["MAJ", "B"]} action="Activer le Turbo Boost" />
            </div>
          </div>

          <div className="flex flex-col justify-center gap-6 border-2 border-panel-2 bg-asphalt p-6 sm:p-8 rounded-2xl shadow-xl">
            <div className="space-y-2">
              <h2 className="font-arcade text-base sm:text-lg text-flame flex items-center gap-2">
                <span>💡</span> CONSEIL DU CHEF MÉCANICIEN
              </h2>
              <p className="font-term text-2xl leading-snug text-bone italic">
                « Ne tapez jamais un Enclume de front. Prenez de la vitesse, glissez au frein à main et frappez sa portière en plein turbo ! »
              </p>
            </div>

            <div className="flex items-center justify-around py-2 border-y border-panel-2 bg-panel/30 rounded-xl">
              <PixelCar body="#9c2b22" trim="#c85a3a" className="h-10 w-10 animate-pixel-bob" />
              <PixelCar body="#2f6f72" trim="#4fa3a6" className="h-10 w-10 animate-pixel-bob shadow-md" />
              <PixelCar body="#c79a2e" trim="#e6c45a" className="h-10 w-10 animate-pixel-bob" />
              <PixelCar body="#5d7d3a" trim="#8aae4f" className="h-10 w-10 animate-pixel-bob shadow-md" />
            </div>

            <p className="font-term text-lg text-toxic">
              🏆 Ramassez les caisses de Réparation pour durer jusqu'au face-à-face final !
            </p>
          </div>
        </section>

        {/* ============ FOOTER CREDITS ============ */}
        <footer className="mt-20 text-center bg-asphalt/80 border-t-4 border-panel-2 pt-10 pb-12 px-4 rounded-b-3xl shadow-2xl">
          <PixelCar
            body="#7a4b8a"
            trim="#a06fb0"
            className="mx-auto h-10 w-10 animate-pixel-bob"
          />
          <p className="mt-5 font-arcade text-xs leading-relaxed text-ember">
            CRÉATEUR DE L'APP : <span className="text-bone font-bold">HYLST - GEOFFROY</span> (AVEC L'AIDE D'UNE IA)
          </p>
          <p className="mt-2 font-term text-xl text-bone-dim">
            DÉMOLITION DERBY. Tous les bolides et débris ont été recyclés dans le respect de l'arcade.
          </p>
          <p className="mt-4 animate-blink font-arcade text-[0.65rem] text-rust">
            ● MERCI D'AVOIR JOUÉ ●
          </p>
        </footer>
      </div>
    </div>
  );
}
