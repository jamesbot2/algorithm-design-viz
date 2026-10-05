include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let a: Vec<i64> = s.split_whitespace().map(|x| x.parse().unwrap()).collect();
    match kadane(&a) {
        None => println!("null"),
        Some((b, l, r)) => println!("{} {} {}", b, l, r),
    }
}
