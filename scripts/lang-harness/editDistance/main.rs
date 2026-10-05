include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let mut it = s.split('\n');
    let a = it.next().unwrap_or("");
    let b = it.next().unwrap_or("");
    println!("{}", edit_distance(a, b));
}
