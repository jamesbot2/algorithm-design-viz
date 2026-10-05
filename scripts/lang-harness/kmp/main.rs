include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let mut it = s.split('\n');
    let t = it.next().unwrap_or("");
    let p = it.next().unwrap_or("");
    let h: Vec<String> = kmp_search(t, p).iter().map(|x| x.to_string()).collect();
    println!("{}", h.join(" "));
    let pc: Vec<char> = p.chars().collect();
    let l: Vec<String> = build_lps(&pc).iter().map(|x| x.to_string()).collect();
    println!("{}", l.join(" "));
}
