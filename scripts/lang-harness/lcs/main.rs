include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let mut it = s.split('\n');
    let x = it.next().unwrap_or("");
    let y = it.next().unwrap_or("");
    let (len, seq) = lcs(x, y);
    println!("{} {}", len, seq);
}
