import type { ArenaId, ArenaInfo, CarSpecs } from "../types/game";

export const ARENA_ROSTER: Record<ArenaId, ArenaInfo> = {
  DIRT: {
    id: "DIRT",
    name: "LA FOSSE DE TERRE",
    subtitle: "Circuit Junkyard Officiel",
    desc: "Terre battue et pneus broyés. Adhérence équilibrée, idéale pour les duels de tôle pure.",
    friction: 0.91,
    driftFriction: 0.94,
    wallColor: { outer: "#120d06", inner: "#2c2216" },
    floorColor: "#483420",
    accentColor: "#f59e0b",
    icon: "🛞",
  },
  TOXIC: {
    id: "TOXIC",
    name: "L'USINE TOXIQUE",
    subtitle: "Dépotoir de la Friche",
    desc: "Asphalte verdâtre suintant d'acide. Glissant, jonché de bidons explosifs et de flaques toxiques.",
    friction: 0.925,
    driftFriction: 0.95,
    wallColor: { outer: "#0c1a12", inner: "#1b3a26" },
    floorColor: "#182a1f",
    accentColor: "#9bc24a",
    icon: "☢️",
  },
  ICE: {
    id: "ICE",
    name: "LE DÉPÔT GLACÉ",
    subtitle: "Station de Recyclage Nord",
    desc: "Neige tassée et verglas. Contrôle extrêmement délicat, le royaume incontesté des dérapages contrôlés.",
    friction: 0.945,
    driftFriction: 0.965,
    wallColor: { outer: "#0d1b2a", inner: "#1b3a57" },
    floorColor: "#243b55",
    accentColor: "#3a7bd5",
    icon: "❄️",
  },
  FIRE: {
    id: "FIRE",
    name: "LE CRATÈRE EN FEU",
    subtitle: "La Grande Fonderie",
    desc: "Sol de scories magmatiques au pied des hauts fourneaux. Accroche brutale et bumpers repousseurs au centre.",
    friction: 0.89,
    driftFriction: 0.925,
    wallColor: { outer: "#2a0800", inner: "#571600" },
    floorColor: "#3a1408",
    accentColor: "#ff6a00",
    icon: "🌋",
  },
};

export const CAR_ROSTER: CarSpecs[] = [
  { id: "BOUCHON", body: "#9c2b22", trim: "#c85a3a", name: "BOUCHON (ROUGE)", speed: 1.05, weight: 1.1, armor: 1.0, aiType: "BALANCED" },
  { id: "TURBINE", body: "#2f6f72", trim: "#4fa3a6", name: "TURBINE (TURQUOISE)", speed: 1.2, weight: 0.85, armor: 0.9, aiType: "KAMIKAZE" },
  { id: "MOUTARDE", body: "#c79a2e", trim: "#e6c45a", name: "MOUTARDE (JAUNE)", speed: 1.1, weight: 1.0, armor: 0.95, aiType: "SCAVENGER" },
  { id: "BLINDE", body: "#5d7d3a", trim: "#8aae4f", name: "BLINDÉ (VERT)", speed: 0.9, weight: 1.3, armor: 1.25, aiType: "TANK" },
  { id: "FANTOME", body: "#7a4b8a", trim: "#a06fb0", name: "FANTÔME (VIOLET)", speed: 1.15, weight: 0.95, armor: 0.9, aiType: "STALKER" },
  { id: "ENCLUME", body: "#6b6f76", trim: "#9aa0a6", name: "ENCLUME (ACIER)", speed: 0.85, weight: 1.4, armor: 1.3, aiType: "TANK" },
  { id: "FLAMME", body: "#b5501e", trim: "#f59e0b", name: "FLAMME (ROUILLE)", speed: 1.25, weight: 0.8, armor: 0.85, aiType: "KAMIKAZE" },
  { id: "TEMPETE", body: "#1a4c8a", trim: "#3a7bd5", name: "TEMPÊTE (BLEU)", speed: 1.0, weight: 1.0, armor: 1.0, aiType: "SCAVENGER" },
];

/**
 * Procedurally generates the background canvas for a specific arena
 */
export function generateArenaBackground(
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  wallThickness: number,
  arenaId: ArenaId
): HTMLCanvasElement {
  const bg = document.createElement("canvas");
  bg.width = width;
  bg.height = height;
  const bc = bg.getContext("2d")!;
  bc.imageSmoothingEnabled = false;

  const info = ARENA_ROSTER[arenaId];

  // 1. Outer Junkyard Background texture
  bc.fillStyle = arenaId === "TOXIC" ? "#0f1712" : arenaId === "ICE" ? "#0a1118" : arenaId === "FIRE" ? "#1a0905" : "#1e1812";
  bc.fillRect(0, 0, width, height);

  // Outer environment speckles
  for (let i = 0; i < 2500; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const d = Math.hypot(x - cx, y - cy);
    if (d < radius + wallThickness + 10) continue;

    const v = Math.random();
    if (arenaId === "TOXIC") {
      bc.fillStyle = v > 0.85 ? "#1f2e24" : v > 0.5 ? "#131f18" : v > 0.2 ? "#2c3e32" : "#0a0f0c";
    } else if (arenaId === "ICE") {
      bc.fillStyle = v > 0.85 ? "#324960" : v > 0.5 ? "#162433" : v > 0.2 ? "#4a6984" : "#0d161f";
    } else if (arenaId === "FIRE") {
      bc.fillStyle = v > 0.85 ? "#3d140a" : v > 0.5 ? "#240a04" : v > 0.2 ? "#571d0e" : "#120502";
    } else {
      bc.fillStyle = v > 0.85 ? "#3a2f20" : v > 0.5 ? "#18140f" : v > 0.25 ? "#2a2217" : "#120e0a";
    }
    bc.fillRect(x, y, 2, 2);
  }

  // 2. Inner Arena Ground Layer
  bc.save();
  bc.beginPath();
  bc.arc(cx, cy, radius, 0, Math.PI * 2);
  bc.closePath();
  bc.clip();

  bc.fillStyle = info.floorColor;
  bc.fillRect(0, 0, width, height);

  // Inner Arena Mottling / Texture
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const d = Math.hypot(x - cx, y - cy);
    if (d > radius) continue;

    const v = Math.random();
    if (arenaId === "TOXIC") {
      bc.fillStyle = v > 0.8 ? "#233d2e" : v > 0.4 ? "#132219" : v > 0.15 ? "#32543f" : "#0e1812";
    } else if (arenaId === "ICE") {
      bc.fillStyle = v > 0.8 ? "#38597a" : v > 0.4 ? "#1b2d3f" : v > 0.15 ? "#517fa8" : "#14212e";
    } else if (arenaId === "FIRE") {
      bc.fillStyle = v > 0.8 ? "#521e0d" : v > 0.4 ? "#290e06" : v > 0.15 ? "#732a12" : "#1c0903";
    } else {
      bc.fillStyle = v > 0.75 ? "#5b422a" : v > 0.4 ? "#3d2b1a" : v > 0.2 ? "#684c30" : "#2f2012";
    }
    bc.fillRect(x, y, 2, 2);
  }

  // Circuit-specific markings (ex: Toxic ooze pits, lava cracks, ice patches)
  if (arenaId === "TOXIC") {
    // Toxic ooze puddles
    for (let p = 0; p < 8; p++) {
      const pa = Math.random() * Math.PI * 2;
      const pd = Math.random() * (radius - 50);
      const px = cx + Math.cos(pa) * pd;
      const py = cy + Math.sin(pa) * pd;
      bc.fillStyle = "rgba(155, 194, 74, 0.35)";
      bc.beginPath();
      bc.ellipse(px, py, 20 + Math.random() * 20, 10 + Math.random() * 15, Math.random() * Math.PI, 0, Math.PI * 2);
      bc.fill();
    }
  } else if (arenaId === "FIRE") {
    // Magma cracks
    bc.strokeStyle = "rgba(255, 106, 0, 0.4)";
    bc.lineWidth = 3;
    for (let c = 0; c < 5; c++) {
      bc.beginPath();
      let sx = cx + (Math.random() - 0.5) * radius * 1.4;
      let sy = cy + (Math.random() - 0.5) * radius * 1.4;
      bc.moveTo(sx, sy);
      for (let s = 0; s < 4; s++) {
        sx += (Math.random() - 0.5) * 60;
        sy += (Math.random() - 0.5) * 60;
        bc.lineTo(sx, sy);
      }
      bc.stroke();
    }
  } else if (arenaId === "ICE") {
    // Deep ice sheen patches
    for (let p = 0; p < 12; p++) {
      const pa = Math.random() * Math.PI * 2;
      const pd = Math.random() * (radius - 40);
      bc.fillStyle = "rgba(255, 255, 255, 0.15)";
      bc.beginPath();
      bc.arc(cx + Math.cos(pa) * pd, cy + Math.sin(pa) * pd, 15 + Math.random() * 25, 0, Math.PI * 2);
      bc.fill();
    }
  }

  // Baked skid marks
  for (let i = 0; i < 100; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.random() * (radius - 25);
    bc.fillStyle = arenaId === "ICE" ? `rgba(20,30,45,${0.2 + Math.random() * 0.3})` : `rgba(16,12,8,${0.2 + Math.random() * 0.3})`;
    bc.fillRect(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 3, 3);
  }

  bc.restore();

  // 3. Circular Wall (Crushed Tires or Industrial Barriers)
  const wallR = radius + wallThickness / 2;
  for (let a = 0; a < Math.PI * 2; a += 0.06) {
    const px = cx + Math.cos(a) * wallR;
    const py = cy + Math.sin(a) * wallR;

    bc.fillStyle = info.wallColor.outer;
    bc.beginPath();
    bc.ellipse(px, py, 9.5, 6.5, a, 0, Math.PI * 2);
    bc.fill();

    bc.fillStyle = info.wallColor.inner;
    bc.beginPath();
    bc.ellipse(px - 1.5, py - 1.5, 3.5, 2.5, a, 0, Math.PI * 2);
    bc.fill();

    // Hazard warning stripes on some arenas
    if (arenaId === "TOXIC" || arenaId === "FIRE") {
      if (Math.floor(a * 10) % 4 === 0) {
        bc.fillStyle = info.accentColor;
        bc.beginPath();
        bc.ellipse(px, py, 3, 1.5, a, 0, Math.PI * 2);
        bc.fill();
      }
    }
  }

  // Inner shadow edge
  bc.strokeStyle = "rgba(0,0,0,0.65)";
  bc.lineWidth = 5;
  bc.beginPath();
  bc.arc(cx, cy, radius, 0, Math.PI * 2);
  bc.stroke();

  // 4. Spectator Crowd around outer ring
  for (let a = 0; a < Math.PI * 2; a += 0.035) {
    const px = cx + Math.cos(a) * (radius + wallThickness + 14);
    const py = cy + Math.sin(a) * (radius + wallThickness + 14);
    const v = Math.random();

    bc.fillStyle = v > 0.8 ? "#9a8262" : v > 0.6 ? "#723d2f" : v > 0.4 ? "#3b5266" : "#4a3c2a";
    bc.fillRect(px - 1, py - 3, 3, 4);
    bc.fillStyle = v > 0.5 ? "#e6d3b8" : "#c4a381";
    bc.fillRect(px - 1, py - 4, 3, 2);
  }

  return bg;
}
