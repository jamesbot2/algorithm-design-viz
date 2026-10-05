from dataclasses import dataclass
from typing import Optional


@dataclass
class HNode:
    freq: int
    ch: Optional[str] = None
    left: Optional["HNode"] = None
    right: Optional["HNode"] = None


def huffman(symbols: list[str], freqs: list[int]) -> Optional[HNode]:
    """Huffman coding — complete Python reference."""
    nodes = [HNode(freqs[i], ch) for i, ch in enumerate(symbols)]  # @a: init
    if not nodes:
        return None
    while len(nodes) > 1:
        nodes.sort(key=lambda x: x.freq)  # @a: sort
        a = nodes.pop(0)
        b = nodes.pop(0)
        nodes.append(HNode(a.freq + b.freq, None, a, b))  # @a: merge
    return nodes[0]  # @a: done
