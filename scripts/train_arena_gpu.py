"""
Vectorized PyTorch self-play training for RL-Arena.

This script is the primary offline trainer for checkpoint generation. It keeps
the browser-facing checkpoint format unchanged while moving the expensive DQN
math into PyTorch so training can use CPU vectorization or CUDA when available.
"""

from __future__ import annotations

import json
import math
import multiprocessing as mp
import os
import random
import sys
import time
from argparse import ArgumentParser
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path

# Unbuffered output so child process prints show up immediately
os.environ["PYTHONUNBUFFERED"] = "1"

import torch
import torch.nn as nn
import torch.nn.functional as F

# ── Constants ──────────────────────────────────────────────────────────────────

ARENA_SIZE = 30
TRAINING_ROUND_TICKS = 100
INTERMISSION_TICKS = 10
MAX_HEALTH = 100
MAX_ENERGY = 4
STATE_DIM = 68
NUM_ACTIONS = 8

# Action indices
ACT_UP, ACT_DOWN, ACT_LEFT, ACT_RIGHT = 0, 1, 2, 3
ACT_ATTACK, ACT_GUARD, ACT_DASH, ACT_HOLD = 4, 5, 6, 7

# Direction deltas for actions 0-3 (move actions)
DX = [0, 0, -1, 1, 0, 0, 0, 0]  # indexed by action
DY = [-1, 1, 0, 0, 0, 0, 0, 0]


def resolve_device(name: str) -> torch.device:
    if name == "auto":
        if torch.cuda.is_available():
            return torch.device("cuda")
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return torch.device("mps")
        return torch.device("cpu")
    return torch.device(name)


DEVICE = resolve_device(os.environ.get("ADAPTIVE_ARENA_DEVICE", "auto"))


def verify_cuda_runtime():
    if DEVICE.type != "cuda":
        return
    try:
        x = torch.randn(256, 256, device=DEVICE)
        y = torch.randn(256, 256, device=DEVICE)
        _ = x @ y
        torch.cuda.synchronize()
    except Exception as exc:  # pragma: no cover - hardware/runtime specific
        raise SystemExit(
            "CUDA is visible but basic torch matmul failed. "
            "Reinstall a working build with "
            "`uv pip install --reinstall torch==2.10.0 --torch-backend=cu128`.\n"
            f"Original error: {exc}"
        ) from exc


# ── Arena Map ──────────────────────────────────────────────────────────────────


def build_arena() -> torch.Tensor:
    """Build 30x30 arena. 0=floor, 1=wall, 2=cover, 3=hazard."""
    arena = torch.zeros(ARENA_SIZE, ARENA_SIZE, dtype=torch.long)

    # Border walls
    arena[0, :] = 1
    arena[ARENA_SIZE - 1, :] = 1
    arena[:, 0] = 1
    arena[:, ARENA_SIZE - 1] = 1

    def set_rect(x: int, y: int, w: int, h: int, tile: int):
        for dy in range(h):
            for dx in range(w):
                yy, xx = y + dy, x + dx
                if 0 < yy < 29 and 0 < xx < 29:
                    arena[yy, xx] = tile

    def set_tile(x: int, y: int, tile: int):
        if 0 < y < 29 and 0 < x < 29:
            arena[y, x] = tile

    # Corner wall blocks
    set_rect(6, 4, 3, 7, 1)
    set_rect(21, 4, 3, 7, 1)
    set_rect(6, 19, 3, 7, 1)
    set_rect(21, 19, 3, 7, 1)

    # Horizontal wall bars
    set_rect(11, 7, 8, 2, 1)
    set_rect(11, 21, 8, 2, 1)

    # Short vertical wall bars
    set_rect(13, 12, 4, 1, 1)
    set_rect(13, 17, 4, 1, 1)

    # Central hazard cross
    for x in range(11, 19):
        set_tile(x, 14, 3)
        set_tile(x, 15, 3)
    for y in range(11, 19):
        set_tile(14, y, 3)
        set_tile(15, y, 3)

    # Cover tiles (x, y)
    cover_positions = [
        (5, 12),
        (5, 17),
        (24, 12),
        (24, 17),
        (10, 5),
        (19, 5),
        (10, 24),
        (19, 24),
        (10, 14),
        (19, 15),
        (12, 10),
        (17, 19),
        (12, 19),
        (17, 10),
    ]
    for cx, cy in cover_positions:
        if arena[cy, cx] == 0:  # only on floor
            arena[cy, cx] = 2

    return arena


# Precompute BFS distance+direction tables for the static arena
def precompute_bfs_tables(arena: torch.Tensor):
    """
    For each source cell, BFS to all reachable cells.
    Uses plain Python arrays for speed, then converts to torch tensors.
    Caches result to disk for instant reuse.
    """
    cache_path = Path(__file__).parent / ".arena_bfs_cache.pt"
    if cache_path.exists():
        cached = torch.load(cache_path, weights_only=True)
        return cached["dist"], cached["dir"]

    S = ARENA_SIZE
    # Use flat Python lists for BFS (avoid torch tensor overhead in loops)
    flat_size = S * S * S * S
    dist_flat = [-1] * flat_size
    dir_flat = [-1] * flat_size

    walkable_grid = [[arena[y, x].item() != 1 for x in range(S)] for y in range(S)]
    dirs = [(0, -1), (0, 1), (-1, 0), (1, 0)]  # up, down, left, right

    count = 0
    for sy in range(S):
        for sx in range(S):
            if not walkable_grid[sy][sx]:
                continue
            count += 1
            base = (sy * S + sx) * S * S
            dist_flat[base + sy * S + sx] = 0
            queue = [(sy, sx)]
            qi = 0
            while qi < len(queue):
                cy, cx = queue[qi]
                qi += 1
                cd = dist_flat[base + cy * S + cx]
                for ai, (ddx, ddy) in enumerate(dirs):
                    ny, nx = cy + ddy, cx + ddx
                    if 0 <= ny < S and 0 <= nx < S and walkable_grid[ny][nx]:
                        idx = base + ny * S + nx
                        if dist_flat[idx] == -1:
                            dist_flat[idx] = cd + 1
                            if cy == sy and cx == sx:
                                dir_flat[idx] = ai
                            else:
                                dir_flat[idx] = dir_flat[base + cy * S + cx]
                            queue.append((ny, nx))

    dist_table = torch.tensor(dist_flat, dtype=torch.short).reshape(S, S, S, S)
    dir_table = torch.tensor(dir_flat, dtype=torch.int8).reshape(S, S, S, S)

    torch.save({"dist": dist_table, "dir": dir_table}, cache_path)
    return dist_table, dir_table


# Pickup spawn positions: (x, y, kind) where kind: 0=health, 1=energy
PICKUP_SPAWNS = [
    (4, 4, 0),
    (4, 25, 1),
    (25, 4, 1),
    (25, 25, 0),
    (14, 5, 0),
    (15, 24, 1),
    (6, 15, 1),
    (23, 14, 0),
]
NUM_PICKUPS = len(PICKUP_SPAWNS)


# ── Vectorized Game Environment ────────────────────────────────────────────────


class VecArenaEnv:
    """N parallel arena games as batched tensors."""

    def __init__(
        self,
        n_envs: int,
        arena: torch.Tensor,
        dist_table: torch.Tensor,
        dir_table: torch.Tensor,
    ):
        self.n = n_envs
        self.arena = arena.to(DEVICE)  # [30, 30]
        self.dist_table = dist_table.to(DEVICE)  # [30, 30, 30, 30]
        self.dir_table = dir_table.to(DEVICE)  # [30, 30, 30, 30]

        # Fighter state: [N, 2] for positions, [N] for scalars
        self.bot_x = torch.zeros(n_envs, dtype=torch.long, device=DEVICE)
        self.bot_y = torch.zeros(n_envs, dtype=torch.long, device=DEVICE)
        self.bot_hp = torch.zeros(n_envs, dtype=torch.float32, device=DEVICE)
        self.bot_energy = torch.zeros(n_envs, dtype=torch.long, device=DEVICE)
        self.bot_last_action = torch.full(
            (n_envs,), ACT_HOLD, dtype=torch.long, device=DEVICE
        )

        self.opp_x = torch.zeros(n_envs, dtype=torch.long, device=DEVICE)
        self.opp_y = torch.zeros(n_envs, dtype=torch.long, device=DEVICE)
        self.opp_hp = torch.zeros(n_envs, dtype=torch.float32, device=DEVICE)
        self.opp_energy = torch.zeros(n_envs, dtype=torch.long, device=DEVICE)
        self.opp_last_action = torch.full(
            (n_envs,), ACT_HOLD, dtype=torch.long, device=DEVICE
        )

        # Pickups: [N, 8] cooldowns
        self.pickup_cooldowns = torch.zeros(
            n_envs, NUM_PICKUPS, dtype=torch.long, device=DEVICE
        )

        # Pickup positions as tensors for vectorized distance computation
        self.pickup_x = torch.tensor(
            [p[0] for p in PICKUP_SPAWNS], dtype=torch.long, device=DEVICE
        )
        self.pickup_y = torch.tensor(
            [p[1] for p in PICKUP_SPAWNS], dtype=torch.long, device=DEVICE
        )
        self.pickup_kinds = torch.tensor(
            [p[2] for p in PICKUP_SPAWNS], dtype=torch.long, device=DEVICE
        )

        self.timer = torch.zeros(n_envs, dtype=torch.long, device=DEVICE)
        self.phase = torch.zeros(
            n_envs, dtype=torch.long, device=DEVICE
        )  # 0=live, 1=intermission
        self.intermission_ticks = torch.zeros(n_envs, dtype=torch.long, device=DEVICE)

        self.reset_all()

    def reset_all(self):
        self._reset_round(torch.arange(self.n, device=DEVICE))

    def _reset_round(self, idx: torch.Tensor):
        if idx.numel() == 0:
            return
        self.bot_x[idx] = 26
        self.bot_y[idx] = 14
        self.bot_hp[idx] = MAX_HEALTH
        self.bot_energy[idx] = 2
        self.bot_last_action[idx] = ACT_HOLD
        self.opp_x[idx] = 3
        self.opp_y[idx] = 15
        self.opp_hp[idx] = MAX_HEALTH
        self.opp_energy[idx] = 2
        self.opp_last_action[idx] = ACT_HOLD
        self.pickup_cooldowns[idx] = 0
        self.timer[idx] = TRAINING_ROUND_TICKS
        self.phase[idx] = 0

    def _tile_at(self, x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
        """Lookup tile type for batched positions. Returns [N] long tensor."""
        return self.arena[y, x]

    def _is_walkable(self, x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
        """Check if positions are walkable (not wall, not out of bounds)."""
        in_bounds = (x >= 0) & (x < ARENA_SIZE) & (y >= 0) & (y < ARENA_SIZE)
        safe_x = x.clamp(0, ARENA_SIZE - 1)
        safe_y = y.clamp(0, ARENA_SIZE - 1)
        return in_bounds & (self.arena[safe_y, safe_x] != 1)

    def _manhattan(
        self, x1: torch.Tensor, y1: torch.Tensor, x2: torch.Tensor, y2: torch.Tensor
    ) -> torch.Tensor:
        return (x1 - x2).abs() + (y1 - y2).abs()

    def _has_los(
        self, x0: torch.Tensor, y0: torch.Tensor, x1: torch.Tensor, y1: torch.Tensor
    ) -> torch.Tensor:
        """Vectorized Bresenham LOS check. Returns [N] bool tensor."""
        n = x0.shape[0]
        result = torch.ones(n, dtype=torch.bool, device=DEVICE)

        cx = x0.clone()
        cy = y0.clone()
        dx = (x1 - x0).abs()
        dy = (y1 - y0).abs()
        sx = torch.where(x0 < x1, torch.ones_like(x0), -torch.ones_like(x0))
        sy = torch.where(y0 < y1, torch.ones_like(y0), -torch.ones_like(y0))
        err = dx - dy

        max_steps = 60  # max manhattan on 30x30 grid
        for _ in range(max_steps):
            at_target = (cx == x1) & (cy == y1)
            if at_target.all():
                break

            e2 = err * 2
            move_x = (~at_target) & (e2 > -dy)
            move_y = (~at_target) & (e2 < dx)

            err = err - dy * move_x.long() + dx * move_y.long()
            cx = cx + sx * move_x.long()
            cy = cy + sy * move_y.long()

            at_target2 = (cx == x1) & (cy == y1)
            checking = (~at_target) & (~at_target2)

            if checking.any():
                safe_cx = cx.clamp(0, ARENA_SIZE - 1)
                safe_cy = cy.clamp(0, ARENA_SIZE - 1)
                tile = self.arena[safe_cy, safe_cx]
                blocked = checking & ((tile == 1) | (tile == 2))  # wall or cover
                result = result & (~blocked)

        return result

    def _can_attack(
        self, ax: torch.Tensor, ay: torch.Tensor, tx: torch.Tensor, ty: torch.Tensor
    ) -> torch.Tensor:
        dist = self._manhattan(ax, ay, tx, ty)
        in_range = dist <= 3
        los = self._has_los(ax, ay, tx, ty)
        return in_range & los

    def _resolve_move(
        self,
        actor_x: torch.Tensor,
        actor_y: torch.Tensor,
        opp_x: torch.Tensor,
        opp_y: torch.Tensor,
        action: torch.Tensor,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """Resolve movement for a batch. Returns new (x, y)."""
        is_move = action < 4  # actions 0-3 are movement
        dx_act = torch.tensor(DX, device=DEVICE)[action]
        dy_act = torch.tensor(DY, device=DEVICE)[action]
        new_x = actor_x + dx_act
        new_y = actor_y + dy_act

        walkable = self._is_walkable(new_x, new_y)
        not_blocked = ~((new_x == opp_x) & (new_y == opp_y))
        can_move = is_move & walkable & not_blocked

        final_x = torch.where(can_move, new_x, actor_x)
        final_y = torch.where(can_move, new_y, actor_y)
        return final_x, final_y

    def _resolve_dash(
        self,
        actor_x: torch.Tensor,
        actor_y: torch.Tensor,
        actor_energy: torch.Tensor,
        opp_x: torch.Tensor,
        opp_y: torch.Tensor,
        action: torch.Tensor,
        toward_x: torch.Tensor,
        toward_y: torch.Tensor,
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """Resolve dash movement. Returns new (x, y, energy).
        toward_x/toward_y is the target to dash toward/away from.
        For simplicity, dash toward the target."""
        is_dash = action == ACT_DASH
        has_energy = actor_energy > 0
        can_dash = is_dash & has_energy

        # Simple dash direction: toward opponent
        dir_x = torch.sign(toward_x - actor_x)
        dir_y = torch.sign(toward_y - actor_y)
        # If same position, default to no direction
        no_dir = (dir_x == 0) & (dir_y == 0)
        dir_x = torch.where(no_dir, torch.zeros_like(dir_x), dir_x)

        # Prefer the axis with larger distance
        dist_x = (toward_x - actor_x).abs()
        dist_y = (toward_y - actor_y).abs()
        use_x = dist_x >= dist_y
        dash_dx = torch.where(use_x, dir_x, torch.zeros_like(dir_x))
        dash_dy = torch.where(use_x, torch.zeros_like(dir_y), dir_y)

        # Step 1
        s1x = actor_x + dash_dx
        s1y = actor_y + dash_dy
        s1_ok = self._is_walkable(s1x, s1y) & ~((s1x == opp_x) & (s1y == opp_y))
        s1x = torch.where(can_dash & s1_ok, s1x, actor_x)
        s1y = torch.where(can_dash & s1_ok, s1y, actor_y)

        # Step 2
        s2x = s1x + dash_dx
        s2y = s1y + dash_dy
        s2_ok = self._is_walkable(s2x, s2y) & ~((s2x == opp_x) & (s2y == opp_y))
        s2x = torch.where(can_dash & s1_ok & s2_ok, s2x, s1x)
        s2y = torch.where(can_dash & s1_ok & s2_ok, s2y, s1y)

        moved = can_dash & s1_ok
        new_energy = torch.where(moved, actor_energy - 1, actor_energy)

        final_x = torch.where(can_dash, s2x, actor_x)
        final_y = torch.where(can_dash, s2y, actor_y)
        return final_x, final_y, new_energy.clamp(0, MAX_ENERGY)

    def encode_state(self, perspective: str = "bot") -> torch.Tensor:
        """Encode state for all envs. Returns [N, 68] float tensor.
        perspective: 'bot' or 'opp' (mirrors fields)."""
        N = self.n
        state = torch.zeros(N, STATE_DIM, dtype=torch.float32, device=DEVICE)

        if perspective == "bot":
            self_x, self_y = self.bot_x, self.bot_y
            self_hp, self_energy = self.bot_hp, self.bot_energy
            self_last = self.bot_last_action
            other_x, other_y = self.opp_x, self.opp_y
            other_hp, other_energy = self.opp_hp, self.opp_energy
            other_last = self.opp_last_action
        else:
            self_x, self_y = self.opp_x, self.opp_y
            self_hp, self_energy = self.opp_hp.float(), self.opp_energy
            self_last = self.opp_last_action
            other_x, other_y = self.bot_x, self.bot_y
            other_hp, other_energy = self.bot_hp, self.bot_energy
            other_last = self.bot_last_action

        dx = (other_x - self_x).float().clamp(-9, 9)
        dy = (other_y - self_y).float().clamp(-9, 9)
        dist = self._manhattan(self_x, self_y, other_x, other_y).float()

        # BFS distance and first move
        bfs_dist = self.dist_table[self_y, self_x, other_y, other_x].float()
        bfs_dir = self.dir_table[self_y, self_x, other_y, other_x]  # action index or -1
        path_blocked = bfs_dist < 0

        # Nearest active pickup
        active = self.pickup_cooldowns == 0  # [N, 8]
        px = self.pickup_x.unsqueeze(0).expand(N, -1)  # [N, 8]
        py = self.pickup_y.unsqueeze(0).expand(N, -1)
        pdist = (px - self_x.unsqueeze(1)).abs() + (
            py - self_y.unsqueeze(1)
        ).abs()  # [N, 8]
        pdist = torch.where(active, pdist, torch.full_like(pdist, 999))
        nearest_idx = pdist.argmin(dim=1)  # [N]
        nearest_dist = pdist.gather(1, nearest_idx.unsqueeze(1)).squeeze(1).float()
        has_pickup = nearest_dist < 999
        nearest_px = self.pickup_x[nearest_idx]
        nearest_py = self.pickup_y[nearest_idx]
        pickup_dx = torch.where(
            has_pickup,
            torch.sign((nearest_px - self_x).float()),
            torch.zeros(N, device=DEVICE),
        )
        pickup_dy = torch.where(
            has_pickup,
            torch.sign((nearest_py - self_y).float()),
            torch.zeros(N, device=DEVICE),
        )

        # LOS and attack window
        los = self._has_los(self_x, self_y, other_x, other_y).float()
        attack_window = ((dist <= 3) & (los > 0.5)).float()

        # Chase tile (tile at the next BFS step)
        bfs_dx = torch.zeros(N, dtype=torch.long, device=DEVICE)
        bfs_dy = torch.zeros(N, dtype=torch.long, device=DEVICE)
        bfs_dx = torch.where(bfs_dir == 0, bfs_dx, bfs_dx)  # move-up: dx=0
        bfs_dy = torch.where(bfs_dir == 0, torch.tensor(-1, device=DEVICE), bfs_dy)
        bfs_dy = torch.where(bfs_dir == 1, torch.tensor(1, device=DEVICE), bfs_dy)
        bfs_dx = torch.where(bfs_dir == 2, torch.tensor(-1, device=DEVICE), bfs_dx)
        bfs_dx = torch.where(bfs_dir == 3, torch.tensor(1, device=DEVICE), bfs_dx)

        chase_x = (self_x + bfs_dx).clamp(0, ARENA_SIZE - 1)
        chase_y = (self_y + bfs_dy).clamp(0, ARENA_SIZE - 1)
        chase_tile = self.arena[chase_y, chase_x]

        # Features
        state[:, 0] = dx / 9.0
        state[:, 1] = dy / 9.0
        state[:, 2] = dist.clamp(0, 28) / 28.0
        state[:, 3] = torch.where(
            path_blocked, torch.tensor(0.5, device=DEVICE), bfs_dist.clamp(0, 28) / 28.0
        )
        state[:, 4] = self_hp.float() / MAX_HEALTH
        state[:, 5] = other_hp.float() / MAX_HEALTH
        state[:, 6] = self_energy.float() / MAX_ENERGY
        state[:, 7] = other_energy.float() / MAX_ENERGY
        state[:, 8] = torch.where(
            has_pickup, nearest_dist.clamp(0, 28) / 28.0, torch.ones(N, device=DEVICE)
        )
        state[:, 9] = los
        state[:, 10] = attack_window
        state[:, 11] = path_blocked.float()

        # Path first-step direction
        state[:, 12] = bfs_dx.float()
        state[:, 13] = bfs_dy.float()
        state[:, 14] = pickup_dx
        state[:, 15] = pickup_dy

        # Chase tile one-hot [16-19]
        for t in range(4):
            state[:, 16 + t] = (chase_tile == t).float()

        # Zones
        def get_zone(x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
            """Returns zone index: 0=west, 1=east, 2=north, 3=south, 4=center, 5=mid"""
            center = (x >= 11) & (x <= 18) & (y >= 11) & (y <= 18)
            west = (~center) & (x <= 9)
            east = (~center) & (x >= 20)
            north = (~center) & (~west) & (~east) & (y <= 9)
            south = (~center) & (~west) & (~east) & (y >= 20)
            zone = torch.full_like(x, 5)  # default=mid
            zone = torch.where(center, torch.tensor(4, device=DEVICE), zone)
            zone = torch.where(west, torch.tensor(0, device=DEVICE), zone)
            zone = torch.where(east, torch.tensor(1, device=DEVICE), zone)
            zone = torch.where(north, torch.tensor(2, device=DEVICE), zone)
            zone = torch.where(south, torch.tensor(3, device=DEVICE), zone)
            return zone

        bot_zone = get_zone(self_x, self_y)
        opp_zone = get_zone(other_x, other_y)
        for z in range(6):
            state[:, 20 + z] = (bot_zone == z).float()
            state[:, 26 + z] = (opp_zone == z).float()

        # Last action one-hot [32-39] bot, [40-47] opponent
        for a in range(NUM_ACTIONS):
            state[:, 32 + a] = (self_last == a).float()
            state[:, 40 + a] = (other_last == a).float()

        # Habit: always "balanced" (index 6) for training
        state[:, 54] = 1.0

        # Stillness: always "active" (index 2)
        state[:, 57] = 1.0

        # Local terrain ordinals
        def tile_ordinal(x: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
            in_bounds = (x >= 0) & (x < ARENA_SIZE) & (y >= 0) & (y < ARENA_SIZE)
            sx = x.clamp(0, ARENA_SIZE - 1)
            sy = y.clamp(0, ARENA_SIZE - 1)
            tile = self.arena[sy, sx]
            # 0=floor→1.0, 1=wall→0.0, 2=cover→0.33, 3=hazard→0.67
            vals = torch.where(
                tile == 0,
                torch.tensor(1.0, device=DEVICE),
                torch.where(
                    tile == 2,
                    torch.tensor(0.33, device=DEVICE),
                    torch.where(
                        tile == 3,
                        torch.tensor(0.67, device=DEVICE),
                        torch.tensor(0.0, device=DEVICE),
                    ),
                ),
            )
            return torch.where(in_bounds, vals, torch.tensor(0.0, device=DEVICE))

        # Bot local terrain: self, up, right, down, left
        state[:, 58] = tile_ordinal(self_x, self_y)
        state[:, 59] = tile_ordinal(self_x, self_y - 1)
        state[:, 60] = tile_ordinal(self_x + 1, self_y)
        state[:, 61] = tile_ordinal(self_x, self_y + 1)
        state[:, 62] = tile_ordinal(self_x - 1, self_y)
        # Opponent local terrain
        state[:, 63] = tile_ordinal(other_x, other_y)
        state[:, 64] = tile_ordinal(other_x, other_y - 1)
        state[:, 65] = tile_ordinal(other_x + 1, other_y)
        state[:, 66] = tile_ordinal(other_x, other_y + 1)
        state[:, 67] = tile_ordinal(other_x - 1, other_y)

        return state

    def step(self, bot_action: torch.Tensor, opp_action: torch.Tensor):
        """
        Advance all envs by one tick.
        Returns: (reward [N], done [N] bool, bot_won [N] bool, draw [N] bool)
        """
        N = self.n
        reward = torch.zeros(N, dtype=torch.float32, device=DEVICE)
        done = torch.zeros(N, dtype=torch.bool, device=DEVICE)
        bot_won = torch.zeros(N, dtype=torch.bool, device=DEVICE)
        draw = torch.zeros(N, dtype=torch.bool, device=DEVICE)

        live = self.phase == 0

        # Handle intermission ticks
        inter = self.phase == 1
        self.intermission_ticks[inter] -= 1
        start_round = inter & (self.intermission_ticks <= 0)
        if start_round.any():
            idx = start_round.nonzero(as_tuple=True)[0]
            self._reset_round(idx)

        if not live.any():
            return reward, done, bot_won, draw

        # Save pre-move positions
        bot_x0 = self.bot_x.clone()
        bot_y0 = self.bot_y.clone()
        opp_x0 = self.opp_x.clone()
        opp_y0 = self.opp_y.clone()

        # Set guarding flags
        bot_guarding = (bot_action == ACT_GUARD) & live
        opp_guarding = (opp_action == ACT_GUARD) & live

        # Resolve opponent movement first (opponent = "player" in the TS code)
        opp_nx, opp_ny = self._resolve_move(
            self.opp_x, self.opp_y, self.bot_x, self.bot_y, opp_action
        )
        # Dash
        opp_nx_d, opp_ny_d, opp_new_energy = self._resolve_dash(
            self.opp_x,
            self.opp_y,
            self.opp_energy,
            self.bot_x,
            self.bot_y,
            opp_action,
            self.bot_x,
            self.bot_y,
        )
        is_opp_dash = opp_action == ACT_DASH
        opp_nx = torch.where(is_opp_dash & live, opp_nx_d, opp_nx)
        opp_ny = torch.where(is_opp_dash & live, opp_ny_d, opp_ny)
        self.opp_energy = torch.where(
            is_opp_dash & live, opp_new_energy, self.opp_energy
        )

        self.opp_x = torch.where(live, opp_nx, self.opp_x)
        self.opp_y = torch.where(live, opp_ny, self.opp_y)

        # Resolve bot movement (using opp's already-moved position)
        bot_nx, bot_ny = self._resolve_move(
            self.bot_x, self.bot_y, self.opp_x, self.opp_y, bot_action
        )
        bot_nx_d, bot_ny_d, bot_new_energy = self._resolve_dash(
            self.bot_x,
            self.bot_y,
            self.bot_energy,
            self.opp_x,
            self.opp_y,
            bot_action,
            self.opp_x,
            self.opp_y,
        )
        is_bot_dash = bot_action == ACT_DASH
        bot_nx = torch.where(is_bot_dash & live, bot_nx_d, bot_nx)
        bot_ny = torch.where(is_bot_dash & live, bot_ny_d, bot_ny)
        self.bot_energy = torch.where(
            is_bot_dash & live, bot_new_energy, self.bot_energy
        )

        self.bot_x = torch.where(live, bot_nx, self.bot_x)
        self.bot_y = torch.where(live, bot_ny, self.bot_y)

        # Collision check 1: same position → revert both
        same_pos = (self.bot_x == self.opp_x) & (self.bot_y == self.opp_y) & live
        self.bot_x = torch.where(same_pos, bot_x0, self.bot_x)
        self.bot_y = torch.where(same_pos, bot_y0, self.bot_y)
        self.opp_x = torch.where(same_pos, opp_x0, self.opp_x)
        self.opp_y = torch.where(same_pos, opp_y0, self.opp_y)

        # Collision check 2: swap → revert both
        swapped = (
            live
            & (self.opp_x == bot_x0)
            & (self.opp_y == bot_y0)
            & (self.bot_x == opp_x0)
            & (self.bot_y == opp_y0)
        )
        self.bot_x = torch.where(swapped, bot_x0, self.bot_x)
        self.bot_y = torch.where(swapped, bot_y0, self.bot_y)
        self.opp_x = torch.where(swapped, opp_x0, self.opp_x)
        self.opp_y = torch.where(swapped, opp_y0, self.opp_y)

        # Penalize failed bot dash/attack
        bot_dash_failed = (
            live & is_bot_dash & (self.bot_x == bot_x0) & (self.bot_y == bot_y0)
        )
        reward -= 0.05 * bot_dash_failed.float()
        bot_attack_no_target = (
            live
            & (bot_action == ACT_ATTACK)
            & ~self._can_attack(self.bot_x, self.bot_y, self.opp_x, self.opp_y)
        )
        reward -= 0.05 * bot_attack_no_target.float()

        # Tick pickups
        self.pickup_cooldowns = (self.pickup_cooldowns - 1).clamp(0)

        # Opponent collects pickups
        for i in range(NUM_PICKUPS):
            on_pickup = (
                live
                & (self.opp_x == self.pickup_x[i])
                & (self.opp_y == self.pickup_y[i])
                & (self.pickup_cooldowns[:, i] == 0)
            )
            if on_pickup.any():
                if self.pickup_kinds[i] == 0:  # health
                    self.opp_hp = torch.where(
                        on_pickup, (self.opp_hp + 18).clamp(0, MAX_HEALTH), self.opp_hp
                    )
                else:  # energy
                    self.opp_energy = torch.where(
                        on_pickup,
                        (self.opp_energy + 2).clamp(0, MAX_ENERGY),
                        self.opp_energy,
                    )
                self.pickup_cooldowns[:, i] = torch.where(
                    on_pickup,
                    torch.tensor(18, device=DEVICE),
                    self.pickup_cooldowns[:, i],
                )

        # Bot collects pickups
        for i in range(NUM_PICKUPS):
            on_pickup = (
                live
                & (self.bot_x == self.pickup_x[i])
                & (self.bot_y == self.pickup_y[i])
                & (self.pickup_cooldowns[:, i] == 0)
            )
            if on_pickup.any():
                if self.pickup_kinds[i] == 0:  # health
                    self.bot_hp = torch.where(
                        on_pickup, (self.bot_hp + 18).clamp(0, MAX_HEALTH), self.bot_hp
                    )
                    reward += 0.16 * on_pickup.float()
                else:  # energy
                    self.bot_energy = torch.where(
                        on_pickup,
                        (self.bot_energy + 2).clamp(0, MAX_ENERGY),
                        self.bot_energy,
                    )
                    reward += 0.12 * on_pickup.float()
                self.pickup_cooldowns[:, i] = torch.where(
                    on_pickup,
                    torch.tensor(18, device=DEVICE),
                    self.pickup_cooldowns[:, i],
                )

        # Combat
        opp_deals = (
            live
            & (opp_action == ACT_ATTACK)
            & self._can_attack(self.opp_x, self.opp_y, self.bot_x, self.bot_y)
        )
        bot_deals = (
            live
            & (bot_action == ACT_ATTACK)
            & self._can_attack(self.bot_x, self.bot_y, self.opp_x, self.opp_y)
        )

        bot_tile = self._tile_at(self.bot_x, self.bot_y)
        opp_tile = self._tile_at(self.opp_x, self.opp_y)
        bot_cover = (bot_tile == 2).float() * 0.72 + (bot_tile != 2).float() * 1.0
        opp_cover = (opp_tile == 2).float() * 0.72 + (opp_tile != 2).float() * 1.0
        bot_guard_mul = torch.where(
            bot_guarding,
            torch.tensor(0.45, device=DEVICE),
            torch.tensor(1.0, device=DEVICE),
        )
        opp_guard_mul = torch.where(
            opp_guarding,
            torch.tensor(0.45, device=DEVICE),
            torch.tensor(1.0, device=DEVICE),
        )

        dmg_to_bot = torch.where(
            opp_deals,
            (15.0 * bot_cover * bot_guard_mul).round(),
            torch.zeros(N, device=DEVICE),
        )
        dmg_to_opp = torch.where(
            bot_deals,
            (15.0 * opp_cover * opp_guard_mul).round(),
            torch.zeros(N, device=DEVICE),
        )

        self.bot_hp = (self.bot_hp - dmg_to_bot).clamp(0, MAX_HEALTH)
        self.opp_hp = (self.opp_hp - dmg_to_opp).clamp(0, MAX_HEALTH)

        reward -= 0.25 * (dmg_to_bot > 0).float()
        reward += 0.35 * (dmg_to_opp > 0).float()

        # Hazard damage
        bot_on_hazard = live & (bot_tile == 3)
        opp_on_hazard = live & (opp_tile == 3)
        self.bot_hp = torch.where(
            bot_on_hazard, (self.bot_hp - 4).clamp(0, MAX_HEALTH), self.bot_hp
        )
        self.opp_hp = torch.where(
            opp_on_hazard, (self.opp_hp - 4).clamp(0, MAX_HEALTH), self.opp_hp
        )
        reward -= 0.14 * bot_on_hazard.float()

        # Update last actions
        self.bot_last_action = torch.where(live, bot_action, self.bot_last_action)
        self.opp_last_action = torch.where(live, opp_action, self.opp_last_action)

        # Timer
        self.timer = torch.where(live, self.timer - 1, self.timer)

        # Terminal conditions
        both_dead = live & (self.bot_hp <= 0) & (self.opp_hp <= 0)
        opp_dead = live & (~both_dead) & (self.opp_hp <= 0)
        bot_dead = live & (~both_dead) & (~opp_dead) & (self.bot_hp <= 0)
        timeout = live & (~both_dead) & (~opp_dead) & (~bot_dead) & (self.timer <= 0)
        timeout_draw = timeout & (self.bot_hp == self.opp_hp)
        timeout_bot_win = timeout & (self.bot_hp > self.opp_hp)
        timeout_opp_win = timeout & (self.bot_hp < self.opp_hp)

        # Terminal rewards
        reward += 0.10 * both_dead.float()
        reward += 1.00 * opp_dead.float()
        reward -= 1.00 * bot_dead.float()
        reward -= 0.15 * timeout_draw.float()
        reward += 0.45 * timeout_bot_win.float()
        reward -= 0.45 * timeout_opp_win.float()

        # Mark done
        terminal = both_dead | opp_dead | bot_dead | timeout
        done = terminal
        bot_won = opp_dead | timeout_bot_win
        draw = both_dead | timeout_draw

        # Transition to intermission
        self.phase = torch.where(terminal, torch.ones_like(self.phase), self.phase)
        self.intermission_ticks = torch.where(
            terminal,
            torch.full_like(self.intermission_ticks, INTERMISSION_TICKS),
            self.intermission_ticks,
        )

        return reward, done, bot_won, draw


# ── DQN Network ────────────────────────────────────────────────────────────────


class DQN(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(STATE_DIM, 128)
        self.fc2 = nn.Linear(128, 64)
        self.fc3 = nn.Linear(64, NUM_ACTIONS)
        self._init_weights()

    def _init_weights(self):
        for m in [self.fc1, self.fc2, self.fc3]:
            nn.init.kaiming_normal_(m.weight, nonlinearity="relu")
            nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        return self.fc3(x)


# ── Replay Buffer ──────────────────────────────────────────────────────────────


class ReplayBuffer:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.states = torch.zeros(capacity, STATE_DIM, device=DEVICE)
        self.actions = torch.zeros(capacity, dtype=torch.long, device=DEVICE)
        self.rewards = torch.zeros(capacity, device=DEVICE)
        self.next_states = torch.zeros(capacity, STATE_DIM, device=DEVICE)
        self.dones = torch.zeros(capacity, dtype=torch.bool, device=DEVICE)
        self.pos = 0
        self.size = 0

    def push_batch(
        self,
        states: torch.Tensor,
        actions: torch.Tensor,
        rewards: torch.Tensor,
        next_states: torch.Tensor,
        dones: torch.Tensor,
    ):
        n = states.shape[0]
        if n == 0:
            return
        idx = torch.arange(n, device=DEVICE) + self.pos
        idx = idx % self.capacity
        self.states[idx] = states
        self.actions[idx] = actions
        self.rewards[idx] = rewards
        self.next_states[idx] = next_states
        self.dones[idx] = dones
        self.pos = (self.pos + n) % self.capacity
        self.size = min(self.size + n, self.capacity)

    def sample(self, batch_size: int):
        idx = torch.randint(self.size, (batch_size,), device=DEVICE)
        return (
            self.states[idx],
            self.actions[idx],
            self.rewards[idx],
            self.next_states[idx],
            self.dones[idx],
        )


@dataclass
class SnapshotEntry:
    label: str
    model: DQN
    epsilon: float
    captured_at_round: int


class SnapshotPool:
    def __init__(self, max_size: int, initial_model: DQN, initial_epsilon: float):
        self.max_size = max_size
        self.entries: list[SnapshotEntry] = [
            SnapshotEntry(
                label="init",
                model=deepcopy(initial_model).to(DEVICE).eval(),
                epsilon=initial_epsilon,
                captured_at_round=0,
            )
        ]

    def _active_start(self) -> int:
        return max(0, len(self.entries) - self.max_size)

    def active_entries(self) -> list[SnapshotEntry]:
        return self.entries[self._active_start() :]

    def sample(self) -> SnapshotEntry:
        active = self.active_entries()
        return active[random.randrange(len(active))]

    def add_snapshot(self, model: DQN, round_number: int, epsilon: float):
        snapshot = deepcopy(model).to(DEVICE)
        snapshot.eval()
        self.entries.append(
            SnapshotEntry(
                label=f"snap-r{round_number}",
                model=snapshot,
                epsilon=epsilon,
                captured_at_round=round_number,
            )
        )


# ── Training Loop ──────────────────────────────────────────────────────────────


@dataclass
class TrainConfig:
    difficulty: str
    label: str
    training_rounds: int
    eval_rounds: int
    base_epsilon: float
    lr: float
    gamma: float
    weight_decay: float
    batch_size: int
    replay_capacity: int
    target_update_freq: int
    snapshot_interval: int
    pool_max_size: int
    initial_opponent_epsilon: float
    snapshot_opponent_epsilon: float
    n_envs: int
    train_every_n_ticks: int


def train_checkpoint(
    cfg: TrainConfig,
    arena: torch.Tensor,
    dist_table: torch.Tensor,
    dir_table: torch.Tensor,
) -> dict:
    env = VecArenaEnv(cfg.n_envs, arena, dist_table, dir_table)
    policy = DQN().to(DEVICE)
    target = DQN().to(DEVICE)
    target.load_state_dict(policy.state_dict())
    target.eval()

    optimizer = torch.optim.AdamW(
        policy.parameters(), lr=cfg.lr, weight_decay=cfg.weight_decay
    )
    replay = ReplayBuffer(cfg.replay_capacity)

    pool = SnapshotPool(
        max_size=cfg.pool_max_size,
        initial_model=policy,
        initial_epsilon=cfg.initial_opponent_epsilon,
    )
    current_opponent = pool.sample()

    completed_rounds = 0
    tick_count = 0
    step_count = 0
    episode_rewards = torch.zeros(cfg.n_envs, device=DEVICE)

    # Telemetry
    telemetry_points = []
    recent_wins = []
    recent_rewards = []
    recent_health_delta = []
    sample_every = 50
    rolling_window = 60
    next_snapshot_round = cfg.snapshot_interval

    t0 = time.time()

    while completed_rounds < cfg.training_rounds:
        # Encode states
        bot_state = env.encode_state("bot")
        opp_state = env.encode_state("opp")

        # Bot action: epsilon-greedy
        with torch.no_grad():
            q_vals = policy(bot_state)
        rand_mask = torch.rand(cfg.n_envs, device=DEVICE) < cfg.base_epsilon
        greedy_actions = q_vals.argmax(dim=1)
        random_actions = torch.randint(NUM_ACTIONS, (cfg.n_envs,), device=DEVICE)
        bot_actions = torch.where(rand_mask, random_actions, greedy_actions)

        # Opponent action: epsilon-greedy from the current self-play pool snapshot
        with torch.no_grad():
            opp_q = current_opponent.model(opp_state)
        opp_rand = torch.rand(cfg.n_envs, device=DEVICE) < current_opponent.epsilon
        opp_actions = torch.where(
            opp_rand,
            torch.randint(NUM_ACTIONS, (cfg.n_envs,), device=DEVICE),
            opp_q.argmax(dim=1),
        )

        # Only act in live envs
        live = env.phase == 0
        bot_actions = torch.where(
            live, bot_actions, torch.full_like(bot_actions, ACT_HOLD)
        )
        opp_actions = torch.where(
            live, opp_actions, torch.full_like(opp_actions, ACT_HOLD)
        )

        reward, done, bot_won, is_draw = env.step(bot_actions, opp_actions)
        tick_count += 1
        episode_rewards += reward

        # Get next state for replay
        next_bot_state = env.encode_state("bot")

        # Push to replay (only live envs that took actions)
        if live.any():
            live_idx = live.nonzero(as_tuple=True)[0]
            replay.push_batch(
                bot_state[live_idx],
                bot_actions[live_idx],
                reward[live_idx],
                next_bot_state[live_idx],
                done[live_idx],
            )

        # Keep the training/update ratio close to the current TS trainer:
        # one optimizer step per ~20 environment transitions.
        if tick_count % cfg.train_every_n_ticks == 0 and replay.size >= cfg.batch_size:
            n_trains = max(1, (cfg.n_envs * cfg.train_every_n_ticks) // 20)
            for _ in range(n_trains):
                s, a, r, ns, d = replay.sample(cfg.batch_size)
                with torch.no_grad():
                    next_q = target(ns).max(dim=1).values
                    target_q = r + cfg.gamma * next_q * (~d).float()
                current_q = policy(s).gather(1, a.unsqueeze(1)).squeeze(1)
                loss = F.mse_loss(current_q, target_q)
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                step_count += 1

                if step_count % cfg.target_update_freq == 0:
                    target.load_state_dict(policy.state_dict())

        # Handle completed rounds
        if done.any():
            done_idx = done.nonzero(as_tuple=True)[0]
            n_done = done_idx.shape[0]
            completed_rounds += n_done

            for i in range(n_done):
                idx = done_idx[i].item()
                win = bot_won[idx].item()
                d = is_draw[idx].item()
                ep_r = episode_rewards[idx].item()
                hp_delta = (env.bot_hp[idx] - env.opp_hp[idx]).item()

                recent_wins.append(1.0 if win else 0.0)
                recent_rewards.append(ep_r)
                recent_health_delta.append(hp_delta)
                if len(recent_wins) > rolling_window:
                    recent_wins.pop(0)
                    recent_rewards.pop(0)
                    recent_health_delta.pop(0)

            episode_rewards[done_idx] = 0

            while (
                next_snapshot_round <= completed_rounds
                and next_snapshot_round <= cfg.training_rounds
            ):
                pool.add_snapshot(
                    policy,
                    next_snapshot_round,
                    cfg.snapshot_opponent_epsilon,
                )
                next_snapshot_round += cfg.snapshot_interval
            current_opponent = pool.sample()

            # Telemetry
            if (
                completed_rounds % sample_every < n_done
                or completed_rounds >= cfg.training_rounds
            ):
                telemetry_points.append(
                    {
                        "round": min(completed_rounds, cfg.training_rounds),
                        "averageReward": round(
                            sum(recent_rewards) / max(len(recent_rewards), 1), 3
                        ),
                        "averageBotWinRate": round(
                            sum(recent_wins) / max(len(recent_wins), 1), 3
                        ),
                        "averageHealthDelta": round(
                            sum(recent_health_delta) / max(len(recent_health_delta), 1),
                            3,
                        ),
                        "qStateCount": replay.size,
                    }
                )

            if completed_rounds % 100 < n_done:
                win_rate = sum(recent_wins) / max(len(recent_wins), 1)
                elapsed = time.time() - t0
                print(
                    f"  [{cfg.difficulty}] round {min(completed_rounds, cfg.training_rounds)}/{cfg.training_rounds}"
                    f" — win: {win_rate * 100:.1f}%, pool: {len(pool.active_entries())}"
                    f", replay: {replay.size}, steps: {step_count}, {elapsed:.1f}s",
                    flush=True,
                )

    # Evaluation
    eval_stats = evaluate(cfg, policy, pool, arena, dist_table, dir_table)
    print(
        f"  [{cfg.difficulty}] eval: {eval_stats['botWinRate'] * 100:.1f}% "
        f"({eval_stats['botWins']}W/{eval_stats['playerWins']}L/{eval_stats['draws']}D "
        f"over {eval_stats['rounds']} rounds) in {time.time() - t0:.1f}s",
        flush=True,
    )

    # Serialize weights to match TypeScript format
    weights = serialize_weights(policy)

    return {
        "difficulty": cfg.difficulty,
        "label": cfg.label,
        "summary": f"{cfg.label} checkpoint ({cfg.training_rounds} rounds, pure self-play league with {len(pool.active_entries())} opponents).",
        "snapshotInterval": cfg.snapshot_interval,
        "trainingRounds": cfg.training_rounds,
        "parameterCount": sum(p.numel() for p in policy.parameters()),
        "stats": eval_stats,
        "telemetry": {
            "sampleEvery": sample_every,
            "rollingWindow": rolling_window,
            "points": telemetry_points,
        },
        "weights": weights,
        "config": {"layerSizes": [STATE_DIM, 128, 64, NUM_ACTIONS]},
    }


def evaluate(
    cfg: TrainConfig,
    policy: DQN,
    pool: SnapshotPool,
    arena: torch.Tensor,
    dist_table: torch.Tensor,
    dir_table: torch.Tensor,
) -> dict:
    n_eval = min(cfg.n_envs, 64)
    env = VecArenaEnv(n_eval, arena, dist_table, dir_table)
    policy.eval()
    current_opponent = pool.sample()

    completed = 0
    bot_wins = 0
    player_wins = 0
    draws = 0

    while completed < cfg.eval_rounds:
        bot_state = env.encode_state("bot")
        opp_state = env.encode_state("opp")

        with torch.no_grad():
            bot_q = policy(bot_state)
            opp_q = current_opponent.model(opp_state)

        # Low epsilon for evaluation
        eps = 0.05
        bot_rand = torch.rand(n_eval, device=DEVICE) < eps
        bot_actions = torch.where(
            bot_rand,
            torch.randint(NUM_ACTIONS, (n_eval,), device=DEVICE),
            bot_q.argmax(dim=1),
        )
        opp_rand = torch.rand(n_eval, device=DEVICE) < current_opponent.epsilon
        opp_actions = torch.where(
            opp_rand,
            torch.randint(NUM_ACTIONS, (n_eval,), device=DEVICE),
            opp_q.argmax(dim=1),
        )

        live = env.phase == 0
        bot_actions = torch.where(
            live, bot_actions, torch.full_like(bot_actions, ACT_HOLD)
        )
        opp_actions = torch.where(
            live, opp_actions, torch.full_like(opp_actions, ACT_HOLD)
        )

        _, done, won, drew = env.step(bot_actions, opp_actions)

        if done.any():
            done_idx = done.nonzero(as_tuple=True)[0]
            for i in range(done_idx.shape[0]):
                idx = done_idx[i].item()
                if won[idx]:
                    bot_wins += 1
                elif drew[idx]:
                    draws += 1
                else:
                    player_wins += 1
                completed += 1
                if completed >= cfg.eval_rounds:
                    break
            current_opponent = pool.sample()

    policy.train()
    return {
        "rounds": completed,
        "botWins": bot_wins,
        "playerWins": player_wins,
        "draws": draws,
        "botWinRate": round(bot_wins / max(completed, 1), 3),
    }


# ── Weight Serialization ──────────────────────────────────────────────────────


def serialize_weights(model: DQN) -> dict:
    """Serialize to the same JSON format as the TypeScript DQN."""
    layers = []
    for name, layer in [("fc1", model.fc1), ("fc2", model.fc2), ("fc3", model.fc3)]:
        w = (
            layer.weight.detach().cpu()
        )  # [out, in] — same as TS row-major [outDim × inDim]
        b = layer.bias.detach().cpu()
        layers.append(
            {
                "weights": w.flatten().tolist(),
                "biases": b.tolist(),
                "inDim": layer.in_features,
                "outDim": layer.out_features,
            }
        )
    return {"layers": layers}


# ── Cross-Evaluation ──────────────────────────────────────────────────────────


def cross_evaluate(
    checkpoints: list[dict],
    arena: torch.Tensor,
    dist_table: torch.Tensor,
    dir_table: torch.Tensor,
    rounds: int = 200,
):
    """Round-robin evaluation of all checkpoints against each other."""
    n = len(checkpoints)
    labels = [c["difficulty"] for c in checkpoints]

    # Load all models
    models = []
    for c in checkpoints:
        model = DQN().to(DEVICE)
        load_weights(model, c["weights"])
        model.eval()
        models.append(model)

    print(f"\n── Round-Robin ({rounds} rounds each) ──")
    header = "bot \\ opp  " + "  ".join(f"{l:>8}" for l in labels)
    print(header)

    for row in range(n):
        cells = [f"{labels[row]:<9}"]
        for col in range(n):
            n_eval = 32
            env = VecArenaEnv(n_eval, arena, dist_table, dir_table)
            completed = 0
            bot_wins = 0

            while completed < rounds:
                bot_state = env.encode_state("bot")
                opp_state = env.encode_state("opp")

                with torch.no_grad():
                    bot_q = models[row](bot_state)
                    opp_q = models[col](opp_state)

                eps = 0.05
                bot_rand = torch.rand(n_eval, device=DEVICE) < eps
                bot_actions = torch.where(
                    bot_rand,
                    torch.randint(NUM_ACTIONS, (n_eval,), device=DEVICE),
                    bot_q.argmax(dim=1),
                )
                opp_rand = torch.rand(n_eval, device=DEVICE) < eps
                opp_actions = torch.where(
                    opp_rand,
                    torch.randint(NUM_ACTIONS, (n_eval,), device=DEVICE),
                    opp_q.argmax(dim=1),
                )

                live = env.phase == 0
                bot_actions = torch.where(
                    live, bot_actions, torch.full_like(bot_actions, ACT_HOLD)
                )
                opp_actions = torch.where(
                    live, opp_actions, torch.full_like(opp_actions, ACT_HOLD)
                )

                _, done, won, drew = env.step(bot_actions, opp_actions)
                if done.any():
                    done_idx = done.nonzero(as_tuple=True)[0]
                    for i in range(done_idx.shape[0]):
                        if won[done_idx[i]]:
                            bot_wins += 1
                        completed += 1
                        if completed >= rounds:
                            break

            cells.append(f"{bot_wins / rounds * 100:7.0f}%")
        print("  ".join(cells))


def load_weights(model: DQN, weights_dict: dict):
    layers = weights_dict["layers"]
    for (name, layer), lw in zip(
        [("fc1", model.fc1), ("fc2", model.fc2), ("fc3", model.fc3)], layers
    ):
        w = torch.tensor(lw["weights"], dtype=torch.float32).reshape(
            lw["outDim"], lw["inDim"]
        )
        b = torch.tensor(lw["biases"], dtype=torch.float32)
        layer.weight.data.copy_(w)
        layer.bias.data.copy_(b)


# ── Main ───────────────────────────────────────────────────────────────────────

# Must match BOT_DIFFICULTIES in game.ts exactly
DIFFICULTIES = [
    {
        "id": "easy",
        "label": "Easy",
        "rounds": 1000,
        "eval": 150,
        "alpha_mul": 0.9,
        "gamma_bonus": -0.02,
        "eps_mul": 1.35,
    },
    {
        "id": "medium",
        "label": "Medium",
        "rounds": 3000,
        "eval": 200,
        "alpha_mul": 1.0,
        "gamma_bonus": 0,
        "eps_mul": 1.0,
    },
    {
        "id": "hard",
        "label": "Hard",
        "rounds": 6000,
        "eval": 300,
        "alpha_mul": 1.08,
        "gamma_bonus": 0.03,
        "eps_mul": 0.78,
    },
    {
        "id": "expert",
        "label": "Expert",
        "rounds": 12000,
        "eval": 400,
        "alpha_mul": 1.15,
        "gamma_bonus": 0.05,
        "eps_mul": 0.6,
    },
]

BASE_CONFIG = {"epsilon": 0.18, "alpha": 0.27, "gamma": 0.74}
POOL_CONFIG = {
    "easy": {"max_size": 8, "snapshot_every": 30},
    "medium": {"max_size": 12, "snapshot_every": 60},
    "hard": {"max_size": 15, "snapshot_every": 100},
    "expert": {"max_size": 20, "snapshot_every": 150},
}
SNAPSHOT_INTERVAL = 50


def default_n_envs() -> int:
    if DEVICE.type == "cuda":
        return 512
    if DEVICE.type == "mps":
        return 128
    return 48


def default_batch_size() -> int:
    if DEVICE.type == "cuda":
        return 2048
    if DEVICE.type == "mps":
        return 512
    return 256


def create_train_config(diff_cfg: dict, args) -> TrainConfig:
    alpha = BASE_CONFIG["alpha"] * diff_cfg["alpha_mul"]
    gamma = min(0.95, BASE_CONFIG["gamma"] + diff_cfg["gamma_bonus"])
    pool_cfg = POOL_CONFIG[diff_cfg["id"]]
    n_envs = args.n_envs or default_n_envs()
    batch_size = args.batch_size or default_batch_size()

    return TrainConfig(
        difficulty=diff_cfg["id"],
        label=diff_cfg["label"],
        training_rounds=args.round_limit or diff_cfg["rounds"],
        eval_rounds=args.eval_round_limit or diff_cfg["eval"],
        base_epsilon=max(0.03, BASE_CONFIG["epsilon"] * diff_cfg["eps_mul"]),
        lr=0.001 * alpha * 3,
        gamma=gamma,
        weight_decay=0.0003,
        batch_size=batch_size,
        replay_capacity=50_000,
        target_update_freq=500,
        snapshot_interval=SNAPSHOT_INTERVAL,
        pool_max_size=pool_cfg["max_size"],
        initial_opponent_epsilon=0.5,
        snapshot_opponent_epsilon=0.08,
        n_envs=n_envs,
        train_every_n_ticks=args.train_every or 20,
    )


def _train_one_difficulty(args: tuple) -> dict:
    """Train a single difficulty — runs in a separate process."""
    # Limit PyTorch intra-op threads per worker to avoid CPU contention
    torch.set_num_threads(2)
    diff_cfg, cli_args = args
    arena = build_arena()
    dist_table, dir_table = precompute_bfs_tables(arena)
    arena = arena.to(DEVICE)
    dist_table = dist_table.to(DEVICE)
    dir_table = dir_table.to(DEVICE)

    print(f"── {diff_cfg['label']} ({diff_cfg['rounds']} rounds) ──", flush=True)
    cfg = create_train_config(diff_cfg, cli_args)
    return train_checkpoint(cfg, arena, dist_table, dir_table)


def parse_args():
    parser = ArgumentParser()
    parser.add_argument(
        "--device", default="auto", choices=["auto", "cpu", "cuda", "mps"]
    )
    parser.add_argument("--difficulties", default="all")
    parser.add_argument("--n-envs", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--train-every", type=int, default=None)
    parser.add_argument("--round-limit", type=int, default=None)
    parser.add_argument("--eval-round-limit", type=int, default=None)
    parser.add_argument("--processes", type=int, default=None)
    parser.add_argument("--cross-eval", action="store_true")
    parser.add_argument("--no-write", action="store_true")
    return parser.parse_args()


def main():
    global DEVICE
    args = parse_args()
    DEVICE = resolve_device(args.device)
    torch.set_float32_matmul_precision("high")
    print(f"Device: {DEVICE}")
    print(f"PyTorch: {torch.__version__}")
    if DEVICE.type == "cuda":
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        verify_cuda_runtime()

    print("Precomputing BFS tables (one-time)...")
    arena = build_arena()
    dist_table, dir_table = precompute_bfs_tables(arena)
    arena = arena.to(DEVICE)
    dist_table = dist_table.to(DEVICE)
    dir_table = dir_table.to(DEVICE)
    print("BFS tables ready.")

    selected = (
        DIFFICULTIES
        if args.difficulties == "all"
        else [
            diff
            for diff in DIFFICULTIES
            if diff["id"] in {item.strip() for item in args.difficulties.split(",")}
        ]
    )
    if not selected:
        raise SystemExit("No matching difficulties selected.")

    processes = args.processes or min(len(selected), os.cpu_count() or 1)

    print(f"\nTraining self-play DQN — network: {STATE_DIM} → 128 → 64 → {NUM_ACTIONS}")
    print(
        f"Vectorized environments: {args.n_envs or default_n_envs()} parallel games per difficulty"
    )
    if DEVICE.type == "cuda":
        print(
            f"Training {len(selected)} difficulties sequentially on a single accelerator\n"
        )
    elif processes <= 1:
        print(f"Training {len(selected)} difficulties sequentially on CPU\n")
    else:
        print(f"Training {len(selected)} difficulties with Python multiprocessing\n")

    project_root = Path(__file__).resolve().parent.parent
    payload_dir = project_root / "public" / "adaptive-arena-checkpoints"
    payload_dir.mkdir(parents=True, exist_ok=True)
    all_checkpoints: list[dict]

    if DEVICE.type == "cuda":
        all_checkpoints = []
        for diff in selected:
            cfg = create_train_config(diff, args)
            print(
                f"── {cfg.label} ({cfg.training_rounds} rounds, pool max {cfg.pool_max_size}) ──",
                flush=True,
            )
            all_checkpoints.append(train_checkpoint(cfg, arena, dist_table, dir_table))
    else:
        worker_args = [(diff, args) for diff in selected]
        if processes <= 1:
            all_checkpoints = [_train_one_difficulty(worker_args[0])]
        else:
            ctx = mp.get_context("spawn")
            with ctx.Pool(processes=processes) as pool:
                all_checkpoints = pool.map(_train_one_difficulty, worker_args)

    # Sort by difficulty order
    diff_order = [d["id"] for d in DIFFICULTIES]
    all_checkpoints.sort(key=lambda c: diff_order.index(c["difficulty"]))

    if not args.no_write:
        # Write checkpoint assets
        for checkpoint in all_checkpoints:
            filename = f"arena-{checkpoint['difficulty']}.json"
            asset = {
                "weights": checkpoint["weights"],
                "config": checkpoint["config"],
                "telemetry": checkpoint["telemetry"],
            }
            with open(payload_dir / filename, "w") as f:
                json.dump(asset, f)

        # Write manifests
        manifests = []
        for cp in all_checkpoints:
            manifests.append(
                {
                    "difficulty": cp["difficulty"],
                    "label": cp["label"],
                    "summary": cp["summary"],
                    "snapshotInterval": cp["snapshotInterval"],
                    "trainingRounds": cp["trainingRounds"],
                    "parameterCount": cp["parameterCount"],
                    "stats": cp["stats"],
                    "telemetry": cp["telemetry"],
                    "assetPath": f"/adaptive-arena-checkpoints/arena-{cp['difficulty']}.json",
                }
            )

        out_dir = project_root / "src" / "app" / "nerdy-stuff" / "adaptive-arena"
        out_file = out_dir / "checkpoints.generated.ts"
        content = (
            '/* eslint-disable */\nimport type { DQNCheckpointManifest } from "./game"\n\n'
            f"export const ADAPTIVE_ARENA_CHECKPOINTS: DQNCheckpointManifest[] = {json.dumps(manifests, indent=2)}\n"
        )
        with open(out_file, "w") as f:
            f.write(content)

        print(f"\nWrote {len(manifests)} checkpoint manifests to {out_file}")
        total_size = sum(
            (payload_dir / f"arena-{d['id']}.json").stat().st_size for d in selected
        )
        print(f"Total checkpoint asset size: {total_size / 1024:.0f} KB")
    else:
        print("\nSkipping checkpoint writes (--no-write).")

    if args.cross_eval:
        cross_evaluate(all_checkpoints, arena, dist_table, dir_table)


if __name__ == "__main__":
    main()
