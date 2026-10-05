from typing import NamedTuple


class Activity(NamedTuple):
    id: str
    start: int
    finish: int


def activity_selection(activities: list[Activity]) -> list[str]:
    """Activity selection (greedy by finish) — complete Python reference."""
    ordered = sorted(activities, key=lambda a: a.finish)  # @a: sort
    picked: list[str] = []
    last_finish = float("-inf")
    for act in ordered:
        if act.start >= last_finish:  # @a: check
            picked.append(act.id)  # @a: pick
            last_finish = act.finish
    return picked  # @a: done
