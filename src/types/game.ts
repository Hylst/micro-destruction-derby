export type GameMode = "SURVIVAL" | "CHAMPIONSHIP" | "DEATHMATCH";
export type GameState = "ATTRACT" | "MODE_SELECT" | "ARENA_SELECT" | "SELECT" | "COUNTDOWN" | "PLAYING" | "ROUND_OVER" | "GAMEOVER";
export type ArenaId = "DIRT" | "TOXIC" | "ICE" | "FIRE";

export type CarSpecs = {
  id: string;
  body: string;
  trim: string;
  name: string;
  speed: number;    // Max speed multiplier
  weight: number;   // Ramming power & knockback resistance
  armor: number;    // Damage reduction multiplier
  aiType: "KAMIKAZE" | "SCAVENGER" | "TANK" | "STALKER" | "BALANCED";
};

export type Car = {
  id: number;
  isPlayer: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  wheelAngle: number;
  specs: CarSpecs;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  kills: number;
  score: number;
  nitro: number; // 0 to 100
  boostActive: boolean;
  invulnerable: number; // Timer
  doubleDamage: number; // Timer
  driftActive: boolean;
  spinOutTimer: number; // Tête-à-queue
};

export type ItemType = "REPAIR" | "NITRO" | "SHIELD" | "DAMAGE";
export type ItemCrate = {
  id: number;
  x: number;
  y: number;
  type: ItemType;
  bob: number;
};

export type ObstacleType = "BARREL" | "OIL_SLICK" | "BUMPER";
export type ArenaObstacle = {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  r: number;
  active: boolean;
  respawn: number;
};

export type FloatingText = {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale?: number;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  r: number;
  color: string;
  type: "DUST" | "SPARK" | "FIRE" | "SMOKE" | "DEBRIS" | "ACID" | "SNOW" | "EMBER";
  rot?: number;
};

export type TrackMark = { x: number; y: number; a: number; w: number; col?: string };

export type ArenaInfo = {
  id: ArenaId;
  name: string;
  subtitle: string;
  desc: string;
  friction: number;
  driftFriction: number;
  wallColor: { outer: string; inner: string };
  floorColor: string;
  accentColor: string;
  icon: string;
};
