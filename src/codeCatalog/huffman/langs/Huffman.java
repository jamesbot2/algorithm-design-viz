import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Huffman coding — complete Java reference. */
public final class Huffman {
    public static final class HNode {
        final String ch;
        final long freq;
        final HNode left, right;

        HNode(String ch, long freq, HNode left, HNode right) {
            this.ch = ch;
            this.freq = freq;
            this.left = left;
            this.right = right;
        }
    }

    public static HNode huffman(String[] symbols, long[] freqs) {
        List<HNode> nodes = new ArrayList<>();
        for (int i = 0; i < symbols.length; i++) nodes.add(new HNode(symbols[i], freqs[i], null, null)); // @a: init
        if (nodes.isEmpty()) return null;
        while (nodes.size() > 1) {
            nodes.sort(Comparator.comparingLong(x -> x.freq)); // @a: sort
            HNode a = nodes.remove(0);
            HNode b = nodes.remove(0);
            nodes.add(new HNode(null, a.freq + b.freq, a, b)); // @a: merge
        }
        return nodes.get(0); // @a: done
    }
}
