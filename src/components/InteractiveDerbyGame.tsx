import { useEffect, useRef, useState } from "react";
import { audioEngine } from "../utils/audio";
import type {
  ArenaId,
  ArenaObstacle,
  Car,
  FloatingText,
  GameMode,
  GameState,
  ItemCrate,
  Particle,
  TrackMark,
} from "../types/game";
import { ARENA_ROSTER, CAR_ROSTER, generateArenaBackground } from "../utils/arenas";

const W = 800;
const H = 640;
const CX = W / 2;
const CY = H / 2;
const WALL = 28; // Tire wall thickness
const R = 260; // Inner play arena radius

function angleDiff(a: number, b: number) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function InteractiveDerbyGame() {
  const gameWrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Vue Fullscreen web / API browser
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // États globaux
  const [gameState, setGameState] = useState<GameState>("ATTRACT");
  const gameStateRef = useRef<GameState>("ATTRACT");
  const [gameMode, setGameMode] = useState<GameMode>("SURVIVAL");
  const [selectedArenaId, setSelectedArenaId] = useState<ArenaId>("DIRT");
  const selectedArenaIdRef = useRef<ArenaId>("DIRT");

  // Sélection du joueur
  const [selectedCarIdx, setSelectedCarIdx] = useState<number>(0);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);

  // Indicateurs en direct pour le React HUD
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [playerKills, setPlayerKills] = useState<number>(0);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [playerNitro, setPlayerNitro] = useState<number>(100);
  const [activeRank, setActiveRank] = useState<number>(1);
  const [aliveEnemiesCount, setAliveEnemiesCount] = useState<number>(7);
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [deathmatchTimeList, setDeathmatchTimeList] = useState<string>("03:00");

  // Championnat
  const [champRoundIdx, setChampRoundIdx] = useState<number>(0);
  const [finalStatus, setFinalStatus] = useState<"VICTORY" | "WRECKED" | "TIMEUP">("WRECKED");

  // Réf. internes pour la boucle 60fps
  const keysDown = useRef<Record<string, boolean>>({});
  const nextCrateId = useRef<number>(1);
  const nextTextId = useRef<number>(1);
  const nextObsId = useRef<number>(1);
  const scoreRef = useRef<number>(0);
  const killsRef = useRef<number>(0);
  const screenShakeRef = useRef<{ x: number; y: number; timer: number }>({ x: 0, y: 0, timer: 0 });
  const deathmatchSecondsRef = useRef<number>(180);

  const updateGameState = (newSt: GameState) => {
    gameStateRef.current = newSt;
    setGameState(newSt);
  };

  const handleToggleMute = () => {
    const muted = audioEngine.toggleMute();
    setSoundMuted(muted);
    if (!muted && gameStateRef.current === "ATTRACT") {
      audioEngine.startBGM();
    } else if (muted) {
      audioEngine.stopBGM();
    }
  };

  // Fullscreen Handler
  const toggleFullscreen = () => {
    const elem = gameWrapperRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {
        // Fallback Web Fullscreen si API non dispo
        setIsFullscreen(!isFullscreen);
      });
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current === "PLAYING" && ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      keysDown.current[e.code] = true;
      keysDown.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.current[e.code] = false;
      keysDown.current[e.key] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // --- MOTEUR DE JEU PRINCIPAL (CANVAS) ---
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    // Cache des fonds de chaque arène pour un rendu immédiat
    const backgroundCache: Record<ArenaId, HTMLCanvasElement> = {
      DIRT: generateArenaBackground(W, H, CX, CY, R, WALL, "DIRT"),
      TOXIC: generateArenaBackground(W, H, CX, CY, R, WALL, "TOXIC"),
      ICE: generateArenaBackground(W, H, CX, CY, R, WALL, "ICE"),
      FIRE: generateArenaBackground(W, H, CX, CY, R, WALL, "FIRE"),
    };

    let cars: Car[] = [];
    let items: ItemCrate[] = [];
    let obstacles: ArenaObstacle[] = [];
    let particles: Particle[] = [];
    let tracks: TrackMark[] = [];
    let floatingTexts: FloatingText[] = [];

    const spawnCar = (id: number, specIdx: number, isPlayer: boolean = false): Car => {
      const specs = CAR_ROSTER[specIdx % CAR_ROSTER.length];
      const angle = (id / CAR_ROSTER.length) * Math.PI * 2;
      const spawnDist = isPlayer ? Math.max(50, R - 150) : Math.max(60, R - 70);
      const x = CX + Math.cos(angle) * spawnDist;
      const y = CY + Math.sin(angle) * spawnDist;
      const aToCenter = Math.atan2(CY - y, CX - x) + (Math.random() - 0.5) * 0.3;

      return {
        id,
        isPlayer,
        x,
        y,
        vx: 0,
        vy: 0,
        angle: aToCenter,
        wheelAngle: 0,
        specs,
        hp: 100,
        maxHp: 100,
        alive: true,
        respawnTimer: 0,
        kills: 0,
        score: 0,
        nitro: 100,
        boostActive: false,
        invulnerable: isPlayer ? 2.5 : 0.8,
        doubleDamage: 0,
        driftActive: false,
        spinOutTimer: 0,
      };
    };

    const addText = (x: number, y: number, text: string, color: string = "#ffd23f", scale: number = 1) => {
      floatingTexts.push({
        id: nextTextId.current++,
        x: x + (Math.random() - 0.5) * 16,
        y: y - 14,
        text,
        color,
        life: 1.3,
        maxLife: 1.3,
        scale,
      });
    };

    const addParticle = (x: number, y: number, type: Particle["type"], count: number, pSpeed: number = 2.5, col?: string) => {
      for (let i = 0; i < count; i++) {
        if (particles.length > 400) particles.shift();
        const a = Math.random() * Math.PI * 2;
        const sp = (0.4 + Math.random()) * pSpeed;
        let color = col || "#fff";
        let life = 0.5 + Math.random() * 0.5;
        let r = 2.5 + Math.random() * 2.5;

        if (type === "DUST") {
          color = Math.random() > 0.5 ? "#9c8263" : "#72563a";
          r = 4 + Math.random() * 5;
          life = 0.8 + Math.random() * 0.7;
        } else if (type === "SPARK") {
          color = ["#fff", "#ffd23f", "#ff6a00"][Math.floor(Math.random() * 3)];
          r = 1.5 + Math.random() * 2;
          life = 0.25 + Math.random() * 0.25;
        } else if (type === "FIRE") {
          color = ["#ff3300", "#ff8800", "#ffcc00"][Math.floor(Math.random() * 3)];
          r = 3.5 + Math.random() * 4;
          life = 0.35 + Math.random() * 0.3;
        } else if (type === "SMOKE") {
          color = ["#222", "#444", "#666"][Math.floor(Math.random() * 3)];
          r = 5 + Math.random() * 6;
          life = 0.9 + Math.random() * 0.8;
        } else if (type === "DEBRIS") {
          color = col || "#6b6f76";
          r = 3 + Math.random() * 4;
          life = 1.5 + Math.random() * 1.5;
        } else if (type === "ACID") {
          color = ["#9bc24a", "#cddc39", "#8bc34a"][Math.floor(Math.random() * 3)];
          r = 2 + Math.random() * 2;
          life = 0.6 + Math.random() * 0.4;
        } else if (type === "SNOW") {
          color = "#e2e8f0";
          r = 2 + Math.random() * 2;
          life = 1.2 + Math.random() * 0.8;
        } else if (type === "EMBER") {
          color = ["#ff6a00", "#ff3300", "#ffd23f"][Math.floor(Math.random() * 3)];
          r = 2 + Math.random() * 2;
          life = 1.0 + Math.random() * 0.8;
        }

        particles.push({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life,
          maxLife: life,
          r,
          color,
          type,
          rot: Math.random() * Math.PI * 2,
        });
      }
    };

    const triggerExplosion = (ex: number, ey: number, force: number, sourceCar?: Car) => {
      audioEngine.playExplosion();
      screenShakeRef.current = { x: (Math.random() - 0.5) * 25, y: (Math.random() - 0.5) * 25, timer: 0.4 };
      addParticle(ex, ey, "FIRE", Math.round(force * 7), force * 1.8);
      addParticle(ex, ey, "SMOKE", Math.round(force * 6), force * 1.5);
      addParticle(ex, ey, "SPARK", Math.round(force * 10), force * 2.5);

      const blastRadius = 90;
      for (const car of cars) {
        if (!car.alive) continue;
        const dist = Math.hypot(car.x - ex, car.y - ey);
        if (dist < blastRadius) {
          const actualDist = Math.max(10, dist);
          const pushForce = ((blastRadius - actualDist) / blastRadius) * force * 4.5;
          const aBlast = Math.atan2(car.y - ey, car.x - ex);

          car.vx += Math.cos(aBlast) * pushForce;
          car.vy += Math.sin(aBlast) * pushForce;
          car.spinOutTimer = 0.6; // Tête-à-queue

          if (car.invulnerable <= 0) {
            const dmg = pushForce * 6 * (1 / car.specs.armor);
            car.hp -= dmg;
            if (car.isPlayer) addText(car.x, car.y, `-${Math.round(dmg)} HP (EXPLOSION)`, "#ff3300", 1.2);

            // Attribution du kill si sourceCar précisée et mortelle
            if (car.hp <= 0 && sourceCar && sourceCar !== car) {
              if (sourceCar.isPlayer) {
                killsRef.current++;
                setPlayerKills(killsRef.current);
                scoreRef.current += 600;
                setPlayerScore(scoreRef.current);
                addText(sourceCar.x, sourceCar.y, "🔥 +600 ÉLIMINATION EXPLOSIVE !", "#ffd23f", 1.3);
              }
            }
          }
        }
      }
    };

    const spawnCrate = () => {
      if (items.length >= 5) return;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (R - 60);
      const types: ItemCrate["type"][] = ["REPAIR", "NITRO", "SHIELD", "DAMAGE"];
      items.push({
        id: nextCrateId.current++,
        x: CX + Math.cos(angle) * dist,
        y: CY + Math.sin(angle) * dist,
        type: types[Math.floor(Math.random() * types.length)],
        bob: Math.random() * Math.PI * 2,
      });
    };

    // Obstacles statiques ou barils explosifs
    const setupObstacles = (arenaId: ArenaId) => {
      obstacles = [];
      if (arenaId === "TOXIC" || arenaId === "FIRE") {
        // 4 barils explosifs
        for (let o = 0; o < 4; o++) {
          const a = (o / 4) * Math.PI * 2 + Math.PI / 4;
          const dist = R * 0.55;
          obstacles.push({
            id: nextObsId.current++,
            type: "BARREL",
            x: CX + Math.cos(a) * dist,
            y: CY + Math.sin(a) * dist,
            r: 14,
            active: true,
            respawn: 0,
          });
        }
      } else if (arenaId === "ICE") {
        // Flaques d'huile ou glace gelée
        for (let o = 0; o < 3; o++) {
          const a = Math.random() * Math.PI * 2;
          const dist = R * 0.6;
          obstacles.push({
            id: nextObsId.current++,
            type: "OIL_SLICK",
            x: CX + Math.cos(a) * dist,
            y: CY + Math.sin(a) * dist,
            r: 22,
            active: true,
            respawn: 0,
          });
        }
      } else if (arenaId === "DIRT") {
        // 2 barils au centre
        obstacles.push({
          id: nextObsId.current++,
          type: "BARREL",
          x: CX - 40,
          y: CY,
          r: 14,
          active: true,
          respawn: 0,
        });
        obstacles.push({
          id: nextObsId.current++,
          type: "BARREL",
          x: CX + 40,
          y: CY,
          r: 14,
          active: true,
          respawn: 0,
        });
      }
    };

    const initSession = (isRealGame: boolean) => {
      cars = [];
      items = [];
      particles = [];
      tracks = [];
      floatingTexts = [];
      scoreRef.current = 0;
      killsRef.current = 0;
      deathmatchSecondsRef.current = 180;

      const currentArena = selectedArenaIdRef.current;
      setupObstacles(currentArena);

      if (isRealGame) {
        setPlayerScore(0);
        setPlayerKills(0);
        setAliveEnemiesCount(7);
        // Joueur
        cars.push(spawnCar(0, selectedCarIdx, true));
        // 7 IA
        const aiSpecs = [0, 1, 2, 3, 4, 5, 6, 7].filter((n) => n !== selectedCarIdx);
        for (let i = 1; i <= 7; i++) {
          const specIdx = aiSpecs[(i - 1) % aiSpecs.length];
          cars.push(spawnCar(i, specIdx, false));
        }
      } else {
        // Attract Mode: 8 IA
        for (let i = 0; i < 8; i++) {
          cars.push(spawnCar(i, i, false));
        }
      }
    };

    initSession(gameStateRef.current === "PLAYING" || gameStateRef.current === "COUNTDOWN");

    let lastTime = performance.now();
    let crateTimer = 0;
    let weatherTimer = 0;
    let animId = 0;

    // --- BOUCLE D'ANIMATION PRINCIPALE 60 FPS ---
    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      const dt = clamp((now - lastTime) / 16.667, 0.2, 2.5);
      lastTime = now;

      const currentSt = gameStateRef.current;
      const currentArenaId = selectedArenaIdRef.current;
      const arenaInfo = ARENA_ROSTER[currentArenaId];

      // Météo dynamique
      weatherTimer += dt;
      if (weatherTimer > 8) {
        weatherTimer = 0;
        if (currentArenaId === "TOXIC") {
          addParticle(Math.random() * W, 10, "ACID", 1, 3);
        } else if (currentArenaId === "ICE") {
          addParticle(Math.random() * W, Math.random() * H, "SNOW", 2, 4);
        } else if (currentArenaId === "FIRE") {
          addParticle(Math.random() * W, H - 10, "EMBER", 1, 3);
        }
      }

      // Secousse d'écran
      if (screenShakeRef.current.timer > 0) {
        screenShakeRef.current.timer -= (dt * 16.667) / 1000;
        if (screenShakeRef.current.timer <= 0) screenShakeRef.current = { x: 0, y: 0, timer: 0 };
      }

      // ---- 1. LOGIC DE JEU ACTIF ----
      if (currentSt === "PLAYING" || currentSt === "ATTRACT") {
        crateTimer += dt;
        if (crateTimer > 210) {
          crateTimer = 0;
          spawnCrate();
        }

        // Décompte Time Attack Deathmatch
        if (currentSt === "PLAYING" && gameMode === "DEATHMATCH") {
          deathmatchSecondsRef.current -= (dt * 16.667) / 1000;
          const sec = Math.max(0, Math.ceil(deathmatchSecondsRef.current));
          const mins = Math.floor(sec / 60);
          const remSecs = sec % 60;
          setDeathmatchTimeList(`${mins.toString().padStart(2, "0")}:${remSecs.toString().padStart(2, "0")}`);

          if (sec <= 0) {
            setFinalStatus("TIMEUP");
            setTimeout(() => updateGameState("GAMEOVER"), 1500);
          }
        }

        let aliveAI = 0;
        let playerCar: Car | undefined;

        // Réapparition barils/obstacles
        for (const obs of obstacles) {
          if (!obs.active) {
            obs.respawn -= (dt * 16.667) / 1000;
            if (obs.respawn <= 0) obs.active = true;
          }
        }

        // --- MISE À JOUR DES BOLIDES ---
        for (const car of cars) {
          if (!car.alive) {
            if (currentSt === "ATTRACT" || (currentSt === "PLAYING" && gameMode === "DEATHMATCH")) {
              car.respawnTimer -= (dt * 16.667) / 1000;
              if (car.respawnTimer <= 0) {
                // Réapparition en pleine forme
                const newC = spawnCar(car.id, cars.indexOf(car), car.isPlayer);
                Object.assign(car, newC, { kills: car.kills, score: car.score });
                addParticle(car.x, car.y, "DUST", 15, 4);
                audioEngine.playBoost();
              }
            }
            continue;
          }

          if (!car.isPlayer) aliveAI++;
          if (car.isPlayer) playerCar = car;

          // Power-up & Spinout timers
          if (car.invulnerable > 0) car.invulnerable -= (dt * 16.667) / 1000;
          if (car.doubleDamage > 0) car.doubleDamage -= (dt * 16.667) / 1000;
          if (car.spinOutTimer > 0) {
            car.spinOutTimer -= (dt * 16.667) / 1000;
            car.angle += 0.4 * dt; // Tourbillon
            addParticle(car.x, car.y, "SMOKE", 1, 2);
          }

          // Recharge Nitro
          if (car.nitro < 100 && !car.boostActive) {
            car.nitro = Math.min(100, car.nitro + dt * 0.18);
          }

          // Effets visuels de dégâts
          if (car.hp < 40 && Math.random() < 0.35) {
            addParticle(car.x - Math.cos(car.angle) * 10, car.y - Math.sin(car.angle) * 10, car.hp < 20 ? "FIRE" : "SMOKE", 1, 1);
          }

          // --- COMMANDES ---
          let driveForce = 0;
          let steerForce = 0;

          if (car.isPlayer && currentSt === "PLAYING") {
            const up = keysDown.current["ArrowUp"] || keysDown.current["KeyW"] || keysDown.current["KeyZ"];
            const down = keysDown.current["ArrowDown"] || keysDown.current["KeyS"];
            const left = keysDown.current["ArrowLeft"] || keysDown.current["KeyA"] || keysDown.current["KeyQ"];
            const right = keysDown.current["ArrowRight"] || keysDown.current["KeyD"];
            const boost = keysDown.current["ShiftLeft"] || keysDown.current["ShiftRight"] || keysDown.current["KeyB"];
            const drift = keysDown.current["Space"];

            if (up) driveForce = 1;
            if (down) driveForce = -0.6;
            if (left) steerForce = -1;
            if (right) steerForce = 1;

            car.driftActive = Boolean(drift);

            // Turbo Boost
            if (boost && car.nitro > 3 && driveForce > 0) {
              car.boostActive = true;
              car.nitro = Math.max(0, car.nitro - dt * 1.3);
              if (Math.random() < 0.5) audioEngine.playBoost();
              addParticle(car.x - Math.cos(car.angle) * 14, car.y - Math.sin(car.angle) * 14, "FIRE", 2, 4);
            } else {
              car.boostActive = false;
            }

            setPlayerHp(Math.max(0, Math.round(car.hp)));
            setPlayerNitro(Math.round(car.nitro));
          } else {
            // IA Améliorée avec Personnalités
            let target: { x: number; y: number } | null = null;
            const aiType = car.specs.aiType;

            // Scavenger cherche les caisses
            if (aiType === "SCAVENGER" && items.length > 0 && car.hp < 80) {
              let nearestItem: ItemCrate | null = null;
              let itemD = Infinity;
              for (const it of items) {
                const idist = Math.hypot(it.x - car.x, it.y - car.y);
                if (idist < itemD) { itemD = idist; nearestItem = it; }
              }
              if (nearestItem) target = { x: nearestItem.x, y: nearestItem.y };
            }

            // Vise la proie par défaut ou spécifique
            if (!target) {
              let bestRival: Car | null = null;
              let bestDist = Infinity;
              for (const o of cars) {
                if (o === car || !o.alive) continue;
                const d = Math.hypot(o.x - car.x, o.y - car.y);

                let priorityD = d;
                // Kamikaze vise le joueur ou le rival le plus proche
                if (aiType === "KAMIKAZE" && o.isPlayer) priorityD *= 0.5;
                // Stalker vise les voitures abîmées
                if (aiType === "STALKER") priorityD *= o.hp / 100;

                if (priorityD < bestDist) { bestDist = priorityD; bestRival = o; }
              }
              if (bestRival) target = { x: bestRival.x, y: bestRival.y };
            }

            // Repousse l'IA si trop près d'un baril ou du mur
            const distCenter = Math.hypot(car.x - CX, car.y - CY);
            if (distCenter > R - 65) {
              target = { x: CX, y: CY };
            }

            if (target) {
              const aTarget = Math.atan2(target.y - car.y, target.x - car.x);
              const diff = angleDiff(aTarget, car.angle);
              const distToTarget = Math.hypot(target.x - car.x, target.y - car.y);

              if (Math.abs(diff) > 0.18) {
                steerForce = diff > 0 ? 1 : -1;
                driveForce = Math.abs(diff) > Math.PI / 2 ? 0.35 : 0.85;
              } else {
                steerForce = 0;
                driveForce = 1;
                // Déclenche le turbo si aligné
                if (distToTarget < 200 && car.nitro > 35 && (aiType === "KAMIKAZE" || Math.random() < 0.08)) {
                  car.boostActive = true;
                }
              }
            } else {
              driveForce = 0.65;
            }

            if (car.boostActive) {
              car.nitro -= dt * 1.3;
              if (car.nitro <= 0) car.boostActive = false;
              addParticle(car.x - Math.cos(car.angle) * 14, car.y - Math.sin(car.angle) * 14, "FIRE", 1, 3);
            }
          }

          // --- PHYSIQUE & INTÉGRATION ---
          if (car.spinOutTimer <= 0) {
            car.wheelAngle = steerForce * 0.42;
            const turnSp = (car.driftActive ? 0.095 : 0.07) * car.specs.speed;
            const spNorm = Math.hypot(car.vx, car.vy);
            if (spNorm > 0.2) {
              const steerDir = Math.sign(driveForce >= 0 ? 1 : -1);
              car.angle += steerForce * turnSp * steerDir * clamp(spNorm / 2.5, 0.4, 1.25) * dt;
            }

            const baseAccel = 0.5 * car.specs.speed;
            const boostMultiplier = currentArenaId === "FIRE" ? 2.4 : 2.2;
            const accel = (car.boostActive ? baseAccel * boostMultiplier : baseAccel) * driveForce;

            car.vx += Math.cos(car.angle) * accel * dt;
            car.vy += Math.sin(car.angle) * accel * dt;
          }

          // Glissement & Adhérence selon le circuit
          const actualFriction = car.driftActive ? arenaInfo.driftFriction : arenaInfo.friction;
          car.vx *= Math.pow(actualFriction, dt);
          car.vy *= Math.pow(actualFriction, dt);

          const currentSp = Math.hypot(car.vx, car.vy);
          if (!car.driftActive && currentSp > 0.1 && car.spinOutTimer <= 0) {
            const fX = Math.cos(car.angle);
            const fY = Math.sin(car.angle);
            const dot = car.vx * fX + car.vy * fY;
            // Grip d'arène
            const grip = currentArenaId === "ICE" ? 0.6 : 0.82;
            car.vx = car.vx * (1 - grip) + fX * dot * grip;
            car.vy = car.vy * (1 - grip) + fY * dot * grip;
          }

          car.x += car.vx * dt;
          car.y += car.vy * dt;

          // Traces de pneus
          if ((car.driftActive || car.boostActive || Math.abs(steerForce) > 0.85) && currentSp > 1.8 && Math.random() < 0.65) {
            if (tracks.length > 600) tracks.shift();
            const perpX = Math.cos(car.angle + Math.PI / 2);
            const perpY = Math.sin(car.angle + Math.PI / 2);
            tracks.push({ x: car.x + perpX * 8, y: car.y + perpY * 8, a: 0.55, w: car.boostActive ? 5 : 3.5 });
            tracks.push({ x: car.x - perpX * 8, y: car.y - perpY * 8, a: 0.55, w: car.boostActive ? 5 : 3.5 });
            audioEngine.playSkid();
          }

          // --- COLLISION MURS D'ARÈNE ---
          const dCenter = Math.hypot(car.x - CX, car.y - CY);
          const limitR = R - 16;
          if (dCenter > limitR) {
            const nX = (car.x - CX) / dCenter;
            const nY = (car.y - CY) / dCenter;
            car.x = CX + nX * limitR;
            car.y = CY + nY * limitR;

            const vn = car.vx * nX + car.vy * nY;
            if (vn > 0) {
              car.vx -= nX * vn * 1.85;
              car.vy -= nY * vn * 1.85;
              const hitForce = Math.abs(vn);

              if (hitForce > 1.5) {
                audioEngine.playCrash(clamp(hitForce / 5, 0.25, 1));
                addParticle(car.x, car.y, "DUST", Math.round(hitForce * 4), hitForce);
                addParticle(car.x, car.y, "DEBRIS", Math.round(hitForce * 3), hitForce, arenaInfo.wallColor.outer);

                if (car.invulnerable <= 0) {
                  const dmg = hitForce * 3.5 * (1 / car.specs.armor);
                  car.hp -= dmg;
                  if (car.isPlayer) addText(car.x, car.y, `-${Math.round(dmg)} HP`, "#ff3300", 1.1);
                }
              }
            }
          }

          // --- COLLISION OBSTACLES (BARILS / HUILE) ---
          for (const obs of obstacles) {
            if (!obs.active) continue;
            const oDist = Math.hypot(obs.x - car.x, obs.y - car.y);
            if (oDist < obs.r + 14) {
              if (obs.type === "BARREL") {
                obs.active = false;
                obs.respawn = 18; // Réapparaît au bout de 18s
                triggerExplosion(obs.x, obs.y, 7, car);
              } else if (obs.type === "OIL_SLICK") {
                car.spinOutTimer = 0.8;
                audioEngine.playSkid();
                addText(car.x, car.y, "💦 GLISSADE !", "#3a7bd5", 1.1);
              }
            }
          }

          // --- CAISSES BONUS ---
          for (let k = items.length - 1; k >= 0; k--) {
            const it = items[k];
            if (Math.hypot(it.x - car.x, it.y - car.y) < 22) {
              items.splice(k, 1);
              audioEngine.playItem();
              addParticle(it.x, it.y, "SPARK", 18, 4, "#ffd23f");

              if (it.type === "REPAIR") {
                const heal = Math.min(100 - car.hp, 45);
                car.hp += heal;
                addText(car.x, car.y, `+${Math.round(heal)} RÉPARATION !`, "#8aae4f", 1.1);
              } else if (it.type === "NITRO") {
                car.nitro = 100;
                addText(car.x, car.y, "⚡ TURBO MAX !", "#ffd23f", 1.2);
              } else if (it.type === "SHIELD") {
                car.invulnerable = 6.5;
                addText(car.x, car.y, "🛡️ BOUCLIER INVINCIBLE !", "#3a7bd5", 1.2);
              } else if (it.type === "DAMAGE") {
                car.doubleDamage = 7.5;
                addText(car.x, car.y, "💥 DÉGÂTS X2 !", "#ff6a00", 1.25);
              }
            }
          }
        }

        // --- COMBAT COLLISIONS VOITURE VS VOITURE ---
        for (let i = 0; i < cars.length; i++) {
          const cA = cars[i];
          if (!cA.alive) continue;

          for (let j = i + 1; j < cars.length; j++) {
            const cB = cars[j];
            if (!cB.alive) continue;

            const dx = cB.x - cA.x;
            const dy = cB.y - cA.y;
            const dSq = dx * dx + dy * dy;
            const colRad = 20;

            if (dSq < colRad * colRad && dSq > 0.01) {
              const dFinal = Math.sqrt(dSq);
              const nx = dx / dFinal;
              const ny = dy / dFinal;

              const overlap = colRad - dFinal;
              const totW = cA.specs.weight + cB.specs.weight;
              const shiftA = (overlap * (cB.specs.weight / totW)) * 1.05;
              const shiftB = (overlap * (cA.specs.weight / totW)) * 1.05;

              cA.x -= nx * shiftA;
              cA.y -= ny * shiftA;
              cB.x += nx * shiftB;
              cB.y += ny * shiftB;

              const rvx = cB.vx - cA.vx;
              const rvy = cB.vy - cA.vy;
              const impactSp = rvx * nx + rvy * ny;

              if (impactSp < 0) {
                const rest = 0.78; // Bounciness
                const impulse = (-(1 + rest) * impactSp) / (1 / cA.specs.weight + 1 / cB.specs.weight);

                cA.vx -= (nx * impulse) / cA.specs.weight;
                cA.vy -= (ny * impulse) / cA.specs.weight;
                cB.vx += (nx * impulse) / cB.specs.weight;
                cB.vy += (ny * impulse) / cB.specs.weight;

                const rawForce = Math.abs(impactSp);

                if (rawForce > 0.5) {
                  audioEngine.playCrash(clamp(rawForce / 6, 0.3, 1));
                  const midX = (cA.x + cB.x) / 2;
                  const midY = (cA.y + cB.y) / 2;
                  addParticle(midX, midY, "SPARK", Math.round(rawForce * 7), rawForce * 1.6);

                  const aDmgX2 = cA.doubleDamage > 0 ? 2 : 1;
                  const bDmgX2 = cB.doubleDamage > 0 ? 2 : 1;

                  const dmgA = rawForce * 4.0 * cB.specs.weight * (1 / cA.specs.armor) * bDmgX2;
                  const dmgB = rawForce * 4.0 * cA.specs.weight * (1 / cB.specs.armor) * aDmgX2;

                  if (cA.invulnerable <= 0) cA.hp -= dmgA;
                  if (cB.invulnerable <= 0) cB.hp -= dmgB;

                  if (rawForce > 4.5) {
                    addText(midX, midY, "💥 CARNAGE !", "#ff6a00", 1.3);
                    addParticle(midX, midY, "DEBRIS", 7, 5, cA.specs.body);
                    screenShakeRef.current = { x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 15, timer: 0.2 };
                  } else if (rawForce > 2.8) {
                    addText(midX, midY, "BOUM !", "#ffd23f", 1.15);
                  }

                  // Points & Kill attribution
                  const handleCombatRewards = (attacker: Car, victim: Car, forceHit: number) => {
                    if (attacker.isPlayer && forceHit > 1.5) {
                      const earned = Math.round(forceHit * 30 * (attacker.doubleDamage > 0 ? 2 : 1));
                      scoreRef.current += earned;
                      setPlayerScore(scoreRef.current);
                      addText(victim.x, victim.y, `+${earned}`, "#ffd23f", 1.1);
                    }
                  };

                  handleCombatRewards(cA, cB, rawForce);
                  handleCombatRewards(cB, cA, rawForce);
                }
              }
            }
          }
        }

        // --- FATALITÉS & GAMEOVER CHECKS ---
        for (const car of cars) {
          if (car.alive && car.hp <= 0) {
            car.alive = false;
            audioEngine.playExplosion();
            screenShakeRef.current = { x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 20, timer: 0.35 };
            addParticle(car.x, car.y, "FIRE", 30, 5);
            addParticle(car.x, car.y, "SMOKE", 25, 4);
            addParticle(car.x, car.y, "DEBRIS", 15, 6, car.specs.body);
            addText(car.x, car.y, "☠️ BOLIDE DÉTRUIT !", "#ff3300", 1.3);

            if (currentSt === "ATTRACT" || (currentSt === "PLAYING" && gameMode === "DEATHMATCH")) {
              car.respawnTimer = 4.0; // Réapparaît 4s plus tard en Time Attack ou Attract
            } else if (currentSt === "PLAYING") {
              if (car.isPlayer) {
                setFinalStatus("WRECKED");
                setTimeout(() => updateGameState("GAMEOVER"), 1500);
              } else {
                killsRef.current++;
                setPlayerKills(killsRef.current);
                scoreRef.current += 750;
                setPlayerScore(scoreRef.current);
                if (playerCar && playerCar.alive) {
                  addText(playerCar.x, playerCar.y, "🔥 +750 ÉLIMINATION !", "#ffd23f", 1.3);
                }

                // Survie ou Manches de Championnat
                const remEnemies = cars.filter((c) => !c.isPlayer && c.alive).length;
                setAliveEnemiesCount(remEnemies);

                if (remEnemies === 0 && playerCar && playerCar.alive) {
                  scoreRef.current += 2500;
                  setPlayerScore(scoreRef.current);

                  if (gameMode === "CHAMPIONSHIP") {
                    if (champRoundIdx < 3) {
                      setTimeout(() => updateGameState("ROUND_OVER"), 1500);
                    } else {
                      setFinalStatus("VICTORY");
                      setTimeout(() => updateGameState("GAMEOVER"), 1500);
                    }
                  } else {
                    setFinalStatus("VICTORY");
                    setTimeout(() => updateGameState("GAMEOVER"), 1500);
                  }
                }
              }
            }
          }
        }

        if (currentSt === "PLAYING") {
          const aliveSorted = cars.filter((c) => c.alive).sort((a, b) => b.hp - a.hp);
          const myIdx = aliveSorted.findIndex((c) => c.isPlayer);
          setActiveRank(myIdx !== -1 ? myIdx + 1 : aliveSorted.length + 1);
        }
      }

      // --- DÉCAISSEMENT PARTICULES & TRACES ---
      for (const t of tracks) t.a -= 0.0018 * dt;
      tracks = tracks.filter((t) => t.a > 0.01);

      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= (dt * 16.667) / 1000;
        if (p.type === "SMOKE" || p.type === "FIRE") p.r += 0.12 * dt;
        if (p.rot !== undefined) p.rot += 0.1 * dt;
      }
      particles = particles.filter((p) => p.life > 0);

      for (const ft of floatingTexts) {
        ft.y -= 0.9 * dt;
        ft.life -= (dt * 16.667) / 1000;
      }
      floatingTexts = floatingTexts.filter((t) => t.life > 0);

      // --- RENDU CANVAS FINAL ---
      ctx.save();
      if (screenShakeRef.current.timer > 0) {
        ctx.translate(screenShakeRef.current.x, screenShakeRef.current.y);
      }

      // 1. Fond d'Arène mis en cache
      ctx.drawImage(backgroundCache[currentArenaId], 0, 0);

      // 2. Traces de Pneus
      for (const t of tracks) {
        ctx.fillStyle = `rgba(16,12,8,${t.a})`;
        ctx.beginPath(); ctx.arc(t.x, t.y, t.w, 0, Math.PI * 2); ctx.fill();
      }

      // 3. Obstacles (Barils / Flaques d'huile)
      for (const obs of obstacles) {
        if (!obs.active) continue;
        ctx.save();
        ctx.translate(obs.x, obs.y);
        if (obs.type === "BARREL") {
          ctx.fillStyle = "#ff3300"; ctx.beginPath(); ctx.arc(0, 0, obs.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#881100"; ctx.beginPath(); ctx.arc(0, 0, obs.r - 3, 0, Math.PI * 2); ctx.fill();
          ctx.font = 'bold 10px "Press Start 2P", monospace';
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillStyle = "#ffd23f"; ctx.fillText("☣", 0, 1);
        } else if (obs.type === "OIL_SLICK") {
          ctx.fillStyle = "rgba(10, 15, 20, 0.85)";
          ctx.beginPath(); ctx.ellipse(0, 0, obs.r, obs.r * 0.6, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
          ctx.beginPath(); ctx.ellipse(-6, -4, 5, 2, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      // 4. Caisses
      for (const cr of items) {
        cr.bob += 0.08 * dt;
        const bobY = Math.sin(cr.bob) * 4;
        ctx.save();
        ctx.translate(cr.x, cr.y + bobY);
        ctx.fillStyle = "rgba(255,210,63,0.3)";
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#8a6442"; ctx.fillRect(-11, -11, 22, 22);
        ctx.fillStyle = "#5c4028"; ctx.strokeRect(-11, -11, 22, 22);
        ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(-11, -11); ctx.lineTo(11, 11);
        ctx.moveTo(11, -11); ctx.lineTo(-11, 11); ctx.stroke();

        ctx.font = '14px "Press Start 2P", monospace';
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(cr.type === "REPAIR" ? "🔧" : cr.type === "NITRO" ? "⚡" : cr.type === "SHIELD" ? "🛡️" : "💥", 0, 2);
        ctx.restore();
      }

      // 5. Particules de Sol / Débris
      for (const p of particles) {
        if (p.type === "DUST" || p.type === "DEBRIS" || p.type === "ACID") {
          ctx.save();
          ctx.translate(p.x, p.y);
          if (p.rot) ctx.rotate(p.rot);
          ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
          ctx.fillStyle = p.color;
          if (p.type === "DEBRIS") ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
          else { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        }
      }

      // 6. Bolides
      for (const car of cars) {
        if (!car.alive) continue;
        ctx.save();
        ctx.translate(car.x, car.y);

        if (car.invulnerable > 0) {
          ctx.strokeStyle = "rgba(58,123,213,0.85)"; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.stroke();
        }
        if (car.doubleDamage > 0) {
          ctx.strokeStyle = "rgba(255,106,0,0.9)"; ctx.lineWidth = 3;
          ctx.setLineDash([8, 6]);
          ctx.beginPath(); ctx.arc(0, 0, 27, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.rotate(car.angle);

        // Ombre
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(-14, -10, 28, 20);

        // Roues
        ctx.fillStyle = "#0c0a07";
        ctx.fillRect(-12, -12.5, 7, 3.5); ctx.fillRect(-12, 9, 7, 3.5);
        ctx.save();
        ctx.translate(9, -10.75); ctx.rotate(car.wheelAngle); ctx.fillRect(-3.5, -1.75, 7, 3.5);
        ctx.restore();
        ctx.save();
        ctx.translate(9, 10.75); ctx.rotate(car.wheelAngle); ctx.fillRect(-3.5, -1.75, 7, 3.5);
        ctx.restore();

        // Carrosserie
        ctx.fillStyle = car.specs.body; ctx.fillRect(-13, -9, 26, 18);

        // Phares
        ctx.fillStyle = "#ffffaa"; ctx.fillRect(12, -8, 2, 4); ctx.fillRect(12, 4, 2, 4);
        ctx.fillStyle = "#ff1100"; ctx.fillRect(-14, -8, 1, 4); ctx.fillRect(-14, 4, 1, 4);

        // Bandeau
        ctx.fillStyle = car.specs.trim; ctx.fillRect(-13, -3.5, 26, 7);

        // Pare-brise
        ctx.fillStyle = "#0e1419"; ctx.fillRect(1, -7, 6, 14);
        ctx.fillStyle = "rgba(180,210,230,0.6)"; ctx.fillRect(2, -6, 2, 12);
        ctx.fillStyle = "#0e1419"; ctx.fillRect(-9, -6, 4, 12);

        // Identificateur du Joueur
        if (car.isPlayer && currentSt === "PLAYING") {
          ctx.restore(); ctx.save();
          ctx.translate(car.x, car.y - 32);
          ctx.fillStyle = "#ffd23f";
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -9); ctx.lineTo(7, -9); ctx.closePath(); ctx.fill();
        }
        ctx.restore();

        // Jauge de vie sur sprite
        if (currentSt === "PLAYING" || currentSt === "ATTRACT") {
          ctx.save();
          ctx.translate(car.x, car.y - 24);
          ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(-16, -3, 32, 6);
          const hpP = clamp(car.hp / car.maxHp, 0, 1);
          ctx.fillStyle = hpP > 0.5 ? "#8aae4f" : hpP > 0.25 ? "#f59e0b" : "#ff3300";
          ctx.fillRect(-15, -2, 30 * hpP, 4);
          ctx.restore();
        }
      }

      // 7. Particules d'Air (Feu / Neige / Fumée)
      for (const p of particles) {
        if (p.type === "FIRE" || p.type === "SPARK" || p.type === "SMOKE" || p.type === "SNOW" || p.type === "EMBER") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }

      // 8. Textes Pop-up Combats
      for (const ft of floatingTexts) {
        ctx.save();
        ctx.font = `bold ${Math.round(14 * (ft.scale || 1))}px "Press Start 2P", monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#000";
        ctx.fillText(ft.text, ft.x + 2, ft.y + 2);
        ctx.globalAlpha = clamp(ft.life / ft.maxLife, 0, 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore(); // Fin Screen Shake
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Décompte visuel 3 2 1 GO
  useEffect(() => {
    if (gameState === "COUNTDOWN") {
      audioEngine.playStart();
      setCountdownNum(3);
      const t3 = setTimeout(() => { audioEngine.playStart(); setCountdownNum(2); }, 750);
      const t2 = setTimeout(() => { audioEngine.playStart(); setCountdownNum(1); }, 1500);
      const t1 = setTimeout(() => { audioEngine.playBoost(); setCountdownNum(0); }, 2250);
      const tGo = setTimeout(() => updateGameState("PLAYING"), 3000);
      return () => { clearTimeout(t3); clearTimeout(t2); clearTimeout(t1); clearTimeout(tGo); };
    }
  }, [gameState]);

  const handleInsertCoin = () => {
    audioEngine.playCoin();
    updateGameState("MODE_SELECT");
  };

  const handleSelectMode = (mode: GameMode) => {
    audioEngine.playSelect();
    setGameMode(mode);
    setChampRoundIdx(0);

    if (mode === "CHAMPIONSHIP") {
      // Le championnat impose les arènes dans l'ordre
      setSelectedArenaId("DIRT");
      selectedArenaIdRef.current = "DIRT";
      updateGameState("SELECT");
    } else {
      updateGameState("ARENA_SELECT");
    }
  };

  const handleSelectArena = (arenaId: ArenaId) => {
    audioEngine.playSelect();
    setSelectedArenaId(arenaId);
    selectedArenaIdRef.current = arenaId;
    updateGameState("SELECT");
  };

  const confirmCarSelection = () => {
    audioEngine.playSelect();
    updateGameState("COUNTDOWN");
  };

  const nextChampionshipRound = () => {
    audioEngine.playSelect();
    const nextIdx = champRoundIdx + 1;
    setChampRoundIdx(nextIdx);
    const list: ArenaId[] = ["DIRT", "TOXIC", "ICE", "FIRE"];
    const nextArena = list[nextIdx];
    setSelectedArenaId(nextArena);
    selectedArenaIdRef.current = nextArena;
    updateGameState("COUNTDOWN");
  };

  const holdKey = (code: string, down: boolean) => {
    keysDown.current[code] = down;
  };

  return (
    <div
      ref={gameWrapperRef}
      className={`bezel relative mx-auto rounded-2xl p-3 sm:p-5 shadow-2xl transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-50 flex flex-col justify-center bg-asphalt max-w-none w-screen h-screen rounded-none border-0 p-2 sm:p-4" : "max-w-4xl"
      }`}
    >
      {/* Cabinet Top Chrome / Bezel Chrome */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b-2 border-rust/40 px-2 pb-3">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full bg-toxic animate-led" />
          <span className="font-arcade text-xs text-bone tracking-wider">
            IA ASSIST : <strong className="text-ember font-bold">HYLST - GEOFFROY</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="keycap cursor-pointer transition border-ember text-ember hover:bg-ember hover:text-black font-bold px-3"
            title="Agrandir au maximum"
          >
            {isFullscreen ? "🗗 RÉDUIRE" : "🗖 PLEIN ÉCRAN"}
          </button>

          <button
            onClick={handleToggleMute}
            className={`keycap cursor-pointer transition px-3 ${soundMuted ? "border-rust text-rust hover:bg-rust hover:text-black" : "border-toxic text-toxic hover:bg-toxic hover:text-black"}`}
            title={soundMuted ? "Activer le son" : "Couper le son"}
          >
            {soundMuted ? "🔇 MUET" : "🔊 SON ON"}
          </button>
        </div>
      </div>

      {/* Rendu Écran Cathodique Principal */}
      <div className={`crt-screen crt-flicker relative rounded-xl border-4 border-panel-2 shadow-[inset_0_0_35px_rgba(0,0,0,0.95)] overflow-hidden ${
        isFullscreen ? "flex-1 flex justify-center items-center bg-black" : ""
      }`}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className={`pixelated block bg-asphalt-2 ${
            isFullscreen ? "max-w-full max-h-[82vh] object-contain w-auto h-auto" : "w-full h-auto"
          }`}
          style={{ aspectRatio: `${W} / ${H}` }}
        />
        <div className="crt-vignette" />
        <div className="crt-glare" />

        {/* --- ÉCRANS INTERACTIFS D'INTERFACE OVERLAY --- */}

        {/* 1. ÉCRAN D'ACCUEIL ATTRACT MODE */}
        {gameState === "ATTRACT" && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-between bg-black/35 p-6 sm:p-8 pointer-events-none animate-fadeIn">
            <div className="rounded-xl border-2 border-rust bg-asphalt-2/95 px-8 py-4 text-center shadow-2xl animate-pulse">
              <h2 className="text-flame font-arcade text-xl sm:text-3xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.9)]">
                DÉMOLITION DERBY
              </h2>
              <p className="mt-1.5 font-term text-lg text-bone-dim">
                Créateur de l'app : <span className="text-bone font-bold">Hylst - Geoffroy</span> <span className="text-ember">(avec IA)</span>
              </p>
            </div>

            <div className="pointer-events-auto">
              <button
                onClick={handleInsertCoin}
                className="bg-flame hover:bg-ember text-black font-arcade text-base sm:text-xl px-10 py-5 rounded-2xl border-4 border-ember/60 shadow-[0_0_25px_rgba(255,106,0,0.9)] cursor-pointer transition transform hover:scale-105 active:scale-95 flex flex-col items-center gap-1"
              >
                <span>🪙 INSÉREZ UNE PIÈCE</span>
                <span className="text-xs text-asphalt-2 font-bold tracking-widest">APPUYEZ POUR JOUER</span>
              </button>
            </div>

            <div className="flex w-full justify-between px-4 font-arcade text-[0.65rem] text-bone-dim">
              <span>BORNE 16-BIT ULTRA 60FPS</span>
              <span>© 199X CASSE-PIXEL</span>
            </div>
          </div>
        )}

        {/* 2. CHOIX DU MODE DE JEU */}
        {gameState === "MODE_SELECT" && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-asphalt-2/95 p-6 text-bone animate-fadeIn">
            <h2 className="font-arcade text-2xl text-flame mb-2 animate-pulse">CHOIX DU MODE DE JEU</h2>
            <p className="font-term text-lg text-bone-dim mb-8">Sélectionnez votre type de compétition d'arcade</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-2xl">
              {[
                { m: "SURVIVAL", name: "💥 CARNAGE SURVIE", desc: "Combat Derby classique. Le dernier bolide en mouvement remporte la victoire." },
                { m: "CHAMPIONSHIP", name: "🏆 CHAMPIONNAT", desc: "4 manches successives sur toutes les arènes de la casse. Cumulez le maximum de points !" },
                { m: "DEATHMATCH", name: "⏱️ MATCH À MORT", desc: "Temps limité de 3 minutes avec réapparitions infinies. Maximisez les éliminations." },
              ].map((item) => (
                <button
                  key={item.m}
                  onClick={() => handleSelectMode(item.m as GameMode)}
                  className="flex flex-col items-center justify-between p-6 rounded-2xl border-4 border-panel bg-panel/50 hover:border-flame hover:bg-panel transition cursor-pointer group text-center shadow-lg hover:scale-105"
                >
                  <span className="font-arcade text-sm text-ember group-hover:text-flame mb-3">{item.name}</span>
                  <span className="font-term text-base text-bone-dim group-hover:text-bone leading-snug">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. CHOIX DU CIRCUIT ARENA_SELECT */}
        {gameState === "ARENA_SELECT" && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-asphalt-2/95 p-6 text-bone animate-fadeIn">
            <h2 className="font-arcade text-2xl text-flame mb-2 animate-pulse">SÉLECTION DE L'ARÈNE</h2>
            <p className="font-term text-lg text-bone-dim mb-8">Chaque circuit possède sa propre météo et adhérence</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
              {Object.values(ARENA_ROSTER).map((info) => (
                <button
                  key={info.id}
                  onClick={() => handleSelectArena(info.id)}
                  className="flex items-center gap-4 p-5 rounded-2xl border-4 border-panel bg-panel/50 hover:border-toxic hover:bg-panel transition cursor-pointer text-left shadow-lg hover:scale-105"
                >
                  <span className="text-4xl">{info.icon}</span>
                  <div>
                    <div className="font-arcade text-xs text-bone mb-1">{info.name}</div>
                    <div className="font-term text-base text-bone-dim leading-snug">{info.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. CHOIX DU BOLIDE SELECT */}
        {gameState === "SELECT" && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-between bg-asphalt-2/95 p-6 text-bone animate-fadeIn">
            <div className="text-center">
              <h2 className="font-arcade text-xl sm:text-2xl text-flame animate-pulse">SÉLECTION DU PILOTE</h2>
              <p className="font-term text-lg text-bone-dim mt-1">Circuit actif : <strong className="text-toxic">{ARENA_ROSTER[selectedArenaId].name}</strong></p>
            </div>

            {/* Roster de Voitures */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-auto w-full max-w-xl">
              {CAR_ROSTER.map((specs, idx) => {
                const isSelected = selectedCarIdx === idx;
                return (
                  <button
                    key={specs.id}
                    onClick={() => { setSelectedCarIdx(idx); audioEngine.playSelect(); }}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-4 transition cursor-pointer ${
                      isSelected ? "border-flame bg-panel-2 shadow-[0_0_20px_rgba(255,106,0,0.85)] transform scale-105" : "border-panel bg-asphalt hover:border-steel/60"
                    }`}
                  >
                    <svg viewBox="0 0 32 32" className="w-14 h-14 pixelated mb-2">
                      <rect x="5" y="6" width="6" height="4" fill="#000" />
                      <rect x="5" y="22" width="6" height="4" fill="#000" />
                      <rect x="21" y="6" width="6" height="4" fill="#000" />
                      <rect x="21" y="22" width="6" height="4" fill="#000" />
                      <rect x="6" y="8" width="20" height="16" rx="2" fill={specs.body} />
                      <rect x="12" y="8" width="8" height="16" fill={specs.trim} />
                      <rect x="8" y="13" width="16" height="6" fill="#0e1419" />
                      <rect x="10" y="14" width="3" height="4" fill="#b4d2e6" opacity="0.6" />
                    </svg>
                    <span className="font-arcade text-[0.65rem] text-center leading-tight">{specs.id}</span>
                  </button>
                );
              })}
            </div>

            {/* Stats & Bouton Confirmer */}
            <div className="w-full max-w-xl bg-panel p-4 rounded-xl border-2 border-panel-2 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1 font-term text-base w-full sm:w-auto">
                <div className="flex justify-between gap-6">
                  <span className="text-bone-dim">VITESSE :</span>
                  <span className="text-ember font-bold">{"★".repeat(Math.round(CAR_ROSTER[selectedCarIdx].speed * 3.5))}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-bone-dim">BLINDAGE :</span>
                  <span className="text-toxic font-bold">{"★".repeat(Math.round(CAR_ROSTER[selectedCarIdx].armor * 3.5))}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-bone-dim">POIDS (CHOC) :</span>
                  <span className="text-flame font-bold">{"★".repeat(Math.round(CAR_ROSTER[selectedCarIdx].weight * 3.5))}</span>
                </div>
              </div>

              <button
                onClick={confirmCarSelection}
                className="bg-toxic hover:bg-toxic/80 text-asphalt font-arcade text-sm px-8 py-4 rounded-xl border-4 border-bone cursor-pointer shadow-lg transition transform hover:scale-105 font-bold"
              >
                ▶ LANCER DERBY
              </button>
            </div>
          </div>
        )}

        {/* 5. ÉCRAN DE COMPTE À REBOURS 3 2 1 */}
        {gameState === "COUNTDOWN" && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 pointer-events-none">
            <div className="text-flame font-arcade text-7xl sm:text-9xl drop-shadow-[0_8px_8px_rgba(0,0,0,0.95)] animate-bounce">
              {countdownNum > 0 ? countdownNum : "DERBY !"}
            </div>
          </div>
        )}

        {/* 6. INTERFACE DIRECTE HUD PENDANT LE JEU */}
        {gameState === "PLAYING" && (
          <div className="absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-2 p-2 sm:p-3 pointer-events-none bg-gradient-to-b from-asphalt-2/95 via-asphalt-2/60 to-transparent">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:block border-2 border-panel-2 bg-asphalt px-3 py-2 rounded-lg text-center shadow-lg">
                <div className="font-arcade text-[0.5rem] text-bone-dim">SURVIVANTS</div>
                <div className="font-arcade text-sm sm:text-lg text-toxic mt-0.5">
                  {aliveEnemiesCount + (playerHp > 0 ? 1 : 0)} / 8
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-arcade text-[0.6rem] text-bone">
                  <span>BLINDAGE (HP)</span>
                  <span className={playerHp < 30 ? "text-rust animate-pulse font-bold" : "text-toxic"}>
                    {playerHp}%
                  </span>
                </div>
                <div className="h-4 w-28 sm:w-52 rounded-full bg-panel border-2 border-panel-2 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-150 ${
                      playerHp > 50 ? "bg-toxic" : playerHp > 25 ? "bg-ember" : "bg-rust animate-pulse"
                    }`}
                    style={{ width: `${playerHp}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Time Attack Timer ou Affichage Championnat */}
            {gameMode === "DEATHMATCH" && (
              <div className="border-2 border-rust bg-asphalt px-4 py-1.5 rounded-full text-center">
                <span className="font-arcade text-xs text-flame animate-pulse">{deathmatchTimeList}</span>
              </div>
            )}
            {gameMode === "CHAMPIONSHIP" && (
              <div className="border-2 border-toxic bg-asphalt px-4 py-1.5 rounded-full text-center">
                <span className="font-arcade text-[0.65rem] text-toxic">MANCHE {champRoundIdx + 1} / 4</span>
              </div>
            )}

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="space-y-1 text-right">
                <div className="flex justify-between gap-4 font-arcade text-[0.6rem] text-bone">
                  <span className="text-ember"><span className="hidden sm:inline">TURBO (MAJ)</span><span className="sm:hidden">TURBO</span></span>
                  <span className="text-ember">{playerNitro}%</span>
                </div>
                <div className="h-4 w-24 sm:w-44 rounded-full bg-panel border-2 border-panel-2 overflow-hidden p-0.5 flex justify-end">
                  <div
                    className="h-full rounded-full bg-flame transition-all duration-75 shadow-[0_0_8px_#ff6a00]"
                    style={{ width: `${playerNitro}%` }}
                  />
                </div>
              </div>

              <div className="border-2 border-panel-2 bg-asphalt px-3 py-2 rounded-lg text-center hidden sm:block shadow-lg">
                <div className="font-arcade text-[0.5rem] text-bone-dim">ÉLIMINÉS</div>
                <div className="font-arcade text-sm sm:text-lg text-flame mt-0.5">
                  {playerKills}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Commandes tactiles pendant la partie */}
        {gameState === "PLAYING" && (
          <div className="derby-touch mt-3 items-end justify-between gap-3 rounded-xl border-2 border-panel-2 bg-asphalt/90 p-3">
            <div className="grid grid-cols-3 gap-1.5">
              <span />
              <button
                aria-label="Accélérer"
                className="derby-pad border-toxic text-toxic"
                onPointerDown={(e) => { e.preventDefault(); holdKey("ArrowUp", true); }}
                onPointerUp={() => holdKey("ArrowUp", false)}
                onPointerLeave={() => holdKey("ArrowUp", false)}
                onPointerCancel={() => holdKey("ArrowUp", false)}
              >▲</button>
              <span />
              <button
                aria-label="Tourner à gauche"
                className="derby-pad border-ember text-ember"
                onPointerDown={(e) => { e.preventDefault(); holdKey("ArrowLeft", true); }}
                onPointerUp={() => holdKey("ArrowLeft", false)}
                onPointerLeave={() => holdKey("ArrowLeft", false)}
                onPointerCancel={() => holdKey("ArrowLeft", false)}
              >◀</button>
              <button
                aria-label="Reculer"
                className="derby-pad border-rust text-rust"
                onPointerDown={(e) => { e.preventDefault(); holdKey("ArrowDown", true); }}
                onPointerUp={() => holdKey("ArrowDown", false)}
                onPointerLeave={() => holdKey("ArrowDown", false)}
                onPointerCancel={() => holdKey("ArrowDown", false)}
              >▼</button>
              <button
                aria-label="Tourner à droite"
                className="derby-pad border-ember text-ember"
                onPointerDown={(e) => { e.preventDefault(); holdKey("ArrowRight", true); }}
                onPointerUp={() => holdKey("ArrowRight", false)}
                onPointerLeave={() => holdKey("ArrowRight", false)}
                onPointerCancel={() => holdKey("ArrowRight", false)}
              >▶</button>
            </div>
            <div className="flex gap-2">
              <button
                className="derby-pad derby-pad-wide border-rust text-rust"
                onPointerDown={(e) => { e.preventDefault(); holdKey("Space", true); }}
                onPointerUp={() => holdKey("Space", false)}
                onPointerLeave={() => holdKey("Space", false)}
                onPointerCancel={() => holdKey("Space", false)}
              >DÉRAPAGE</button>
              <button
                className="derby-pad derby-pad-wide border-flame text-flame"
                onPointerDown={(e) => { e.preventDefault(); holdKey("ShiftLeft", true); }}
                onPointerUp={() => holdKey("ShiftLeft", false)}
                onPointerLeave={() => holdKey("ShiftLeft", false)}
                onPointerCancel={() => holdKey("ShiftLeft", false)}
              >TURBO</button>
            </div>
          </div>
        )}

        {/* 7. RECAPITULATIF FIN DE MANCHE CHAMPIONNAT ROUND_OVER */}
        {gameState === "ROUND_OVER" && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-asphalt-2/95 p-6 text-bone animate-fadeIn">
            <h2 className="font-arcade text-3xl sm:text-4xl text-toxic animate-pulse mb-2">MANCHE {champRoundIdx + 1} TERMINÉE !</h2>
            <p className="font-term text-xl text-bone-dim mb-6">Préparez-vous pour le circuit suivant</p>

            <div className="bg-panel/80 border-4 border-panel-2 p-6 rounded-2xl w-full max-w-md text-center mb-8 shadow-xl">
              <div className="font-arcade text-xs text-bone-dim mb-2">SCORE CUMULÉ ACTUEL</div>
              <div className="font-arcade text-3xl text-ember">{playerScore} POINTS</div>
            </div>

            <button
              onClick={nextChampionshipRound}
              className="bg-toxic hover:bg-toxic/80 text-asphalt font-arcade text-base px-8 py-5 rounded-2xl border-4 border-bone cursor-pointer shadow-xl transition transform hover:scale-105 font-bold"
            >
              ▶ MANCHE SUIVANTE
            </button>
          </div>
        )}

        {/* 8. ÉCRAN DE FIN DE JEU GAMEOVER */}
        {gameState === "GAMEOVER" && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-asphalt-2/95 p-6 text-bone animate-fadeIn">
            <div className="text-center">
              <h2 className={`font-arcade text-3xl sm:text-5xl ${
                finalStatus === "VICTORY" ? "text-toxic animate-pulse text-shadow-hard" : "text-rust"
              }`}>
                {finalStatus === "VICTORY" ? "🏆 VICTOIRE LÉGENDAIRE !" : finalStatus === "TIMEUP" ? "⏱️ FIN DU TEMPS !" : "💥 VOITURE DÉTRUITE"}
              </h2>
              <p className="font-term text-xl text-bone-dim mt-2">
                {finalStatus === "VICTORY" ? "Vous êtes le maître incontesté de toute la casse !" : "Votre carcasse fumante a rejoint le cimetière de la ferraille."}
              </p>
            </div>

            {/* Récapitulatif Final */}
            <div className="my-8 grid grid-cols-3 gap-4 bg-panel/80 border-4 border-panel-2 p-5 rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="text-center">
                <div className="font-arcade text-[0.55rem] text-bone-dim">SCORE FINAL</div>
                <div className="font-arcade text-base sm:text-xl text-ember mt-2">{playerScore}</div>
              </div>
              <div className="text-center border-x-2 border-panel-2 px-2">
                <div className="font-arcade text-[0.55rem] text-bone-dim">ÉLIMINATIONS</div>
                <div className="font-arcade text-base sm:text-xl text-flame mt-2">{playerKills}</div>
              </div>
              <div className="text-center">
                <div className="font-arcade text-[0.55rem] text-bone-dim">RANG SURVIVANT</div>
                <div className="font-arcade text-base sm:text-xl text-toxic mt-2">{activeRank}</div>
              </div>
            </div>

            <div className="flex gap-5">
              <button
                onClick={() => updateGameState("MODE_SELECT")}
                className="bg-flame hover:bg-ember text-black font-arcade text-sm sm:text-base px-8 py-5 rounded-2xl border-4 border-ember cursor-pointer shadow-2xl transition transform hover:scale-105 font-bold"
              >
                ⟳ REJOUER
              </button>
              <button
                onClick={() => updateGameState("ATTRACT")}
                className="bg-panel hover:bg-panel-2 text-bone font-arcade text-sm sm:text-base px-8 py-5 rounded-2xl border-2 border-panel-2 cursor-pointer transition hover:text-ember"
              >
                MENU ACCUEIL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Règle & Instructions de Pilotage en Bas */}
      {gameState === "PLAYING" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-panel-2 bg-asphalt/90 p-3 shadow-inner">
          <div className="flex items-center gap-4 text-xs sm:text-sm">
            <span className="text-bone-dim font-arcade">PILOTAGE :</span>
            <span className="keycap">↑ ↓ ← → / ZQSD</span>
            <span className="keycap">ESPACE</span> <span className="text-bone-dim">Dérapage</span>
            <span className="keycap">MAJ / B</span> <span className="text-ember font-bold">Turbo Boost</span>
          </div>

          <div className="font-arcade text-xs text-toxic animate-pulse flex items-center gap-2">
            <span>Circuit :</span> <strong className="text-bone">{ARENA_ROSTER[selectedArenaId].name}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
