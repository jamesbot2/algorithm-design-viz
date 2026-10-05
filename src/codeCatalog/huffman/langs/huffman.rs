/// Huffman coding — complete Rust reference.
pub struct HNode {
    pub ch: Option<String>,
    pub freq: u64,
    pub left: Option<Box<HNode>>,
    pub right: Option<Box<HNode>>,
}

pub fn huffman(symbols: &[String], freqs: &[u64]) -> Option<Box<HNode>> {
    let mut nodes: Vec<Box<HNode>> = symbols.iter().zip(freqs).map(|(ch, &freq)| Box::new(HNode { ch: Some(ch.clone()), freq, left: None, right: None })).collect(); // @a: init
    if nodes.is_empty() {
        return None;
    }
    while nodes.len() > 1 {
        nodes.sort_by_key(|x| x.freq); // @a: sort
        let a = nodes.remove(0);
        let b = nodes.remove(0);
        nodes.push(Box::new(HNode { ch: None, freq: a.freq + b.freq, left: Some(a), right: Some(b) })); // @a: merge
    }
    nodes.pop() // @a: done
}
