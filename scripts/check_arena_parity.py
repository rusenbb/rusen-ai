"""Compare browser-generated cases with the real CPU training environment; no training."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

os.environ["ADAPTIVE_ARENA_DEVICE"] = "cpu"
import torch
from train_arena_gpu import VecArenaEnv, build_arena, precompute_bfs_tables


def main() -> None:
    torch.set_num_threads(1)
    source = json.loads(Path(sys.argv[1]).read_text())
    arena = build_arena()
    assert arena.tolist() == source["arena"], "Arena maps differ"
    distances, directions = precompute_bfs_tables(arena)
    env = VecArenaEnv(1, arena, distances, directions)
    failures = []
    for case in source["cases"]:
        env.reset_all()
        env.bot_x[0], env.bot_y[0] = case["bot"]
        env.opp_x[0], env.opp_y[0] = case["player"]
        env.timer[0] = case["timer"]
        before = env.encode_state()[0]
        reward, done, _, _ = env.step(torch.tensor([case["botAction"]]), torch.tensor([case["playerAction"]]))
        after = env.encode_state()[0]
        actual = {"bot": [env.bot_x.item(), env.bot_y.item(), env.bot_hp.item(), env.bot_energy.item()], "player": [env.opp_x.item(), env.opp_y.item(), env.opp_hp.item(), env.opp_energy.item()], "timer": env.timer.item(), "done": done.item()}
        errors = [key for key, value in actual.items() if value != case["expected"][key]]
        if abs(reward.item() - case["expected"]["reward"]) > 1e-5:
            errors.append(f"reward {reward.item():.6f} != {case['expected']['reward']:.6f}")
        for label, observation in [("before", before), ("after", after)]:
            expected = torch.tensor(case[label])
            indices = (torch.abs(observation - expected) > 1e-5).nonzero().flatten().tolist()
            if indices:
                errors.append(f"{label} observation indices {indices}")
        if errors:
            failures.append(f"{case['name']} {case['botAction']}/{case['playerAction']}: {', '.join(errors)}")
    if failures:
        raise SystemExit("Parity failed:\n" + "\n".join(failures))
    print(f"Passed {len(source['cases'])} transitions: movement, health, energy, reward, timer, and 68-value observations.")


if __name__ == "__main__":
    main()
