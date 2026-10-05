include!("algo.rs");
use std::collections::BTreeMap;
use std::io::Read;
fn walk(n: &HNode, p: String, d: u64, codes: &mut BTreeMap<String, String>) -> u64 {
    match (&n.left, &n.right) {
        (Some(l), Some(r)) => walk(l, format!("{}0", p), d + 1, codes) + walk(r, format!("{}1", p), d + 1, codes),
        _ => {
            codes.insert(n.ch.clone().unwrap(), p);
            n.freq * d
        }
    }
}
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let l: Vec<&str> = s.split('\n').collect();
    let sym: Vec<String> = l[0].split_whitespace().map(|x| x.to_string()).collect();
    let fr: Vec<u64> = l[1].split_whitespace().map(|x| x.parse().unwrap()).collect();
    let mut codes = BTreeMap::new();
    let w = match huffman(&sym, &fr) { Some(r) => walk(&r, String::new(), 0, &mut codes), None => 0 };
    println!("{}", w);
    if l[2].trim() == "codes" {
        let v: Vec<String> = codes.iter().map(|(k, c)| format!("{}={}", k, c)).collect();
        println!("{}", v.join(" "));
    }
}
