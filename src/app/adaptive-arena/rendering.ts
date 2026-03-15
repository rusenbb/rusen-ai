import { ACTION_LABELS, ARENA_SIZE, MAX_HEALTH, type ArenaTile, type MatchState } from "./game";

function getTileColor(tile: ArenaTile): string {
  switch (tile) {
    case "wall":
      return "#24303c";
    case "cover":
      return "#193748";
    case "hazard":
      return "#512212";
    default:
      return "#091119";
  }
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (currentLine && context.measureText(candidate).width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }
    currentLine = candidate;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.forEach((line, index) => {
    context.fillText(line, centerX, startY + index * lineHeight);
  });

  return lines.length;
}

export function drawArena(
  canvas: HTMLCanvasElement,
  arena: ArenaTile[][],
  match: MatchState,
  profileAccent: string,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  const dpr = window.devicePixelRatio || 1;
  const cssSize = canvas.clientWidth || 900;
  const size = Math.round(cssSize * dpr);
  canvas.width = size;
  canvas.height = size;
  context.scale(dpr, dpr);

  const drawSize = cssSize;
  const tileSize = drawSize / ARENA_SIZE;
  context.clearRect(0, 0, drawSize, drawSize);

  const background = context.createLinearGradient(0, 0, drawSize, drawSize);
  background.addColorStop(0, "#040608");
  background.addColorStop(1, "#09121a");
  context.fillStyle = background;
  context.fillRect(0, 0, drawSize, drawSize);

  for (let y = 0; y < ARENA_SIZE; y += 1) {
    for (let x = 0; x < ARENA_SIZE; x += 1) {
      const px = x * tileSize;
      const py = y * tileSize;
      context.fillStyle = getTileColor(arena[y][x]);
      context.fillRect(px, py, tileSize, tileSize);

      context.strokeStyle = "rgba(255,255,255,0.04)";
      context.lineWidth = 1;
      context.strokeRect(px, py, tileSize, tileSize);
    }
  }

  match.pickups.forEach((pickup) => {
    if (pickup.cooldown > 0) return;
    const px = pickup.position.x * tileSize;
    const py = pickup.position.y * tileSize;
    context.fillStyle = pickup.kind === "health" ? "#f97316" : "#a3e635";
    context.fillRect(
      px + tileSize * 0.2,
      py + tileSize * 0.2,
      tileSize * 0.6,
      tileSize * 0.6,
    );
    context.strokeStyle = "rgba(255,255,255,0.7)";
    context.lineWidth = 1.5 * (drawSize / 900);
    context.strokeRect(
      px + tileSize * 0.2,
      py + tileSize * 0.2,
      tileSize * 0.6,
      tileSize * 0.6,
    );
  });

  if (
    Math.abs(match.player.position.x - match.bot.position.x) +
      Math.abs(match.player.position.y - match.bot.position.y) <=
    5
  ) {
    context.strokeStyle = "rgba(255,255,255,0.12)";
    context.setLineDash([8, 8]);
    context.beginPath();
    context.moveTo(
      (match.player.position.x + 0.5) * tileSize,
      (match.player.position.y + 0.5) * tileSize,
    );
    context.lineTo(
      (match.bot.position.x + 0.5) * tileSize,
      (match.bot.position.y + 0.5) * tileSize,
    );
    context.stroke();
    context.setLineDash([]);
  }

  const fighters = [
    { ...match.player, color: "#67e8f9", label: "You" },
    { ...match.bot, color: profileAccent, label: "Bot" },
  ];

  const s = drawSize / 900;

  fighters.forEach((fighter) => {
    const centerX = (fighter.position.x + 0.5) * tileSize;
    const centerY = (fighter.position.y + 0.5) * tileSize;
    const radius = tileSize * 0.28;

    context.beginPath();
    context.fillStyle = fighter.color;
    context.shadowColor = fighter.color;
    context.shadowBlur = (fighter.flashTicks > 0 ? 24 : 14) * s;
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;

    if (fighter.guarding) {
      context.beginPath();
      context.strokeStyle = "rgba(255,255,255,0.9)";
      context.lineWidth = 2 * s;
      context.arc(centerX, centerY, radius + 4 * s, 0, Math.PI * 2);
      context.stroke();
    }

    context.fillStyle = "rgba(0,0,0,0.85)";
    context.fillRect(centerX - 18 * s, centerY - radius - 16 * s, 36 * s, 14 * s);
    context.fillStyle = "#f8fafc";
    context.font = `${10 * s}px monospace`;
    context.textAlign = "center";
    context.fillText(fighter.label, centerX, centerY - radius - 5 * s);
  });

  context.fillStyle = "rgba(3,7,12,0.88)";
  context.fillRect(drawSize / 2 - 74 * s, 4 * s, 148 * s, 28 * s);
  context.strokeStyle = "rgba(255,255,255,0.14)";
  context.strokeRect(drawSize / 2 - 74 * s, 4 * s, 148 * s, 28 * s);

  context.fillStyle = "#e5e7eb";
  context.font = `${12 * s}px monospace`;
  context.textAlign = "center";
  context.fillText(
    `TIMER ${match.timer.toString().padStart(3, "0")}`,
    drawSize / 2,
    23 * s,
  );

  const hudY = 16 * s;
  const barWidth = 190 * s;
  const barHeight = 12 * s;
  const hudMargin = 44 * s;

  context.textAlign = "left";
  context.fillStyle = "#67e8f9";
  context.font = `${11 * s}px monospace`;
  context.fillText("YOU", hudMargin, hudY);
  context.fillStyle = "rgba(255,255,255,0.12)";
  context.fillRect(hudMargin, hudY + 10 * s, barWidth, barHeight);
  context.fillStyle = "#67e8f9";
  context.fillRect(
    hudMargin,
    hudY + 10 * s,
    barWidth * (match.player.health / MAX_HEALTH),
    barHeight,
  );
  context.fillStyle = "#e5e7eb";
  context.fillText(
    `${match.player.health}/${MAX_HEALTH}`,
    hudMargin,
    hudY + 38 * s,
  );

  context.textAlign = "right";
  context.fillStyle = profileAccent;
  context.fillText("BOT", drawSize - hudMargin, hudY);
  context.fillStyle = "rgba(255,255,255,0.12)";
  context.fillRect(drawSize - hudMargin - barWidth, hudY + 10 * s, barWidth, barHeight);
  context.fillStyle = profileAccent;
  context.fillRect(
    drawSize - hudMargin - barWidth,
    hudY + 10 * s,
    barWidth * (match.bot.health / MAX_HEALTH),
    barHeight,
  );
  context.fillStyle = "#e5e7eb";
  context.fillText(
    `${match.bot.health}/${MAX_HEALTH}`,
    drawSize - hudMargin,
    hudY + 38 * s,
  );
  context.fillStyle = "rgba(229,231,235,0.75)";
  context.font = `${10 * s}px monospace`;
  context.fillText(
    `${match.lastDecisionMode.toUpperCase()} / ${ACTION_LABELS[match.botIntent]}`,
    drawSize - hudMargin,
    hudY + 56 * s,
  );

  if (match.phase === "intermission") {
    context.fillStyle = "rgba(1,4,9,0.72)";
    context.fillRect(0, 0, drawSize, drawSize);
    context.fillStyle = "rgba(3,7,12,0.9)";
    context.fillRect(drawSize / 2 - 220 * s, drawSize / 2 - 92 * s, 440 * s, 144 * s);
    context.strokeStyle = "rgba(255,255,255,0.14)";
    context.strokeRect(drawSize / 2 - 220 * s, drawSize / 2 - 92 * s, 440 * s, 144 * s);
    context.fillStyle = "#f8fafc";
    context.font = `700 ${32 * s}px monospace`;
    context.textAlign = "center";
    const lineCount = drawWrappedText(
      context,
      match.statusMessage,
      drawSize / 2,
      drawSize / 2 - 40 * s,
      380 * s,
      36 * s,
    );
    context.font = `${14 * s}px monospace`;
    context.fillText(
      `next round in ${match.intermissionTicks}  |  press space to continue`,
      drawSize / 2,
      drawSize / 2 + 14 * s + Math.max(0, lineCount - 1) * 18 * s,
    );
  }
}
