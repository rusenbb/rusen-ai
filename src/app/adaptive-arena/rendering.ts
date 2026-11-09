import { ARENA_SIZE, type ArenaTile, type MatchState } from "./game";

/** Site colour tokens, read at draw time so the board follows the theme. */
// Fallbacks below are only used if a token is missing; they are not theme colours.
function readTokens() {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    surface: token("--surface", "#131316"),
    background: token("--background", "#0a0a0a"),
    foreground: token("--foreground", "#ededed"),
    sub: token("--sub", "#85858b"),
    line: token("--line", "rgba(255,255,255,0.1)"),
    you: token("--accent", "#22d3ee"),
    bot: token("--accent-2", "#fbbf24"),
  };
}

export interface ArenaLabels {
  player: string;
  bot: string;
}

const OUTCOME_TEXT = {
  player: (labels: ArenaLabels) => (labels.player === "You" ? "You win the round" : `${labels.player} wins the round`),
  bot: (labels: ArenaLabels) => `${labels.bot} wins the round`,
  draw: () => "Round drawn",
} as const;

export function drawArena(
  canvas: HTMLCanvasElement,
  arena: ArenaTile[][],
  match: MatchState,
  labels: ArenaLabels = { player: "You", bot: "Bot" },
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const colors = readTokens();

  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 600;
  canvas.width = Math.round(cssSize * dpr);
  canvas.height = Math.round(cssSize * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  const tile = cssSize / ARENA_SIZE;
  const s = cssSize / 600;
  context.fillStyle = colors.surface;
  context.fillRect(0, 0, cssSize, cssSize);

  const fillTile = (x: number, y: number, color: string, alpha: number) => {
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.fillRect(x * tile, y * tile, tile, tile);
    context.globalAlpha = 1;
  };

  for (let y = 0; y < ARENA_SIZE; y += 1) {
    for (let x = 0; x < ARENA_SIZE; x += 1) {
      const kind = arena[y][x];
      if (kind === "wall") fillTile(x, y, colors.foreground, 0.5);
      else if (kind === "cover") fillTile(x, y, colors.you, 0.16);
      else if (kind === "hazard") fillTile(x, y, colors.bot, 0.22);
    }
  }

  context.strokeStyle = colors.line;
  context.lineWidth = 1;
  context.beginPath();
  for (let i = 1; i < ARENA_SIZE; i += 1) {
    context.moveTo(i * tile, 0);
    context.lineTo(i * tile, cssSize);
    context.moveTo(0, i * tile);
    context.lineTo(cssSize, i * tile);
  }
  context.stroke();

  // Pickups are shapes, not colours: a plus for health, a diamond for energy.
  context.strokeStyle = colors.foreground;
  context.fillStyle = colors.foreground;
  context.lineWidth = Math.max(1.5, 2 * s);
  for (const pickup of match.pickups) {
    if (pickup.cooldown > 0) continue;
    const cx = (pickup.position.x + 0.5) * tile;
    const cy = (pickup.position.y + 0.5) * tile;
    const r = tile * 0.3;
    context.beginPath();
    if (pickup.kind === "health") {
      context.moveTo(cx - r, cy);
      context.lineTo(cx + r, cy);
      context.moveTo(cx, cy - r);
      context.lineTo(cx, cy + r);
      context.stroke();
    } else {
      context.moveTo(cx, cy - r);
      context.lineTo(cx + r, cy);
      context.lineTo(cx, cy + r);
      context.lineTo(cx - r, cy);
      context.closePath();
      context.fill();
    }
  }

  const fighters = [
    { fighter: match.player, color: colors.you, label: labels.player },
    { fighter: match.bot, color: colors.bot, label: labels.bot },
  ];
  context.font = `600 ${Math.max(9, 11 * s)}px ui-monospace, monospace`;
  context.textAlign = "center";
  for (const { fighter, color, label } of fighters) {
    const cx = (fighter.position.x + 0.5) * tile;
    const cy = (fighter.position.y + 0.5) * tile;
    const radius = tile * 0.42;
    context.fillStyle = color;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
    if (fighter.flashTicks > 0) {
      context.strokeStyle = colors.foreground;
      context.lineWidth = 2 * s;
      context.beginPath();
      context.arc(cx, cy, radius + 3 * s, 0, Math.PI * 2);
      context.stroke();
    }
    if (fighter.guarding) {
      context.strokeStyle = color;
      context.lineWidth = 2 * s;
      context.beginPath();
      context.arc(cx, cy, radius + 6 * s, 0, Math.PI * 2);
      context.stroke();
    }
    context.fillStyle = colors.foreground;
    context.fillText(label.toUpperCase(), cx, cy - radius - 5 * s);
  }

  if (match.phase === "intermission") {
    const last = match.roundHistory[0];
    context.globalAlpha = 0.82;
    context.fillStyle = colors.surface;
    context.fillRect(0, 0, cssSize, cssSize);
    context.globalAlpha = 1;
    context.fillStyle = colors.foreground;
    context.textAlign = "center";
    context.font = `700 ${26 * s}px ui-monospace, monospace`;
    context.fillText(last ? OUTCOME_TEXT[last.outcome](labels) : "Round over", cssSize / 2, cssSize / 2 - 10 * s);
    context.fillStyle = colors.sub;
    context.font = `${13 * s}px ui-monospace, monospace`;
    if (last) {
      context.fillText(
        `${labels.player} ${last.playerHealth} hp, ${labels.bot} ${last.botHealth} hp`,
        cssSize / 2,
        cssSize / 2 + 18 * s,
      );
    }
  }
}
