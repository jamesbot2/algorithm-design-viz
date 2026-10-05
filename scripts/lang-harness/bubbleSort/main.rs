include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let a: Vec<i64> = s.split_whitespace().map(|x| x.parse().unwrap()).collect();
    let r: Vec<String> = bubble_sort(&a).iter().map(|x| x.to_string()).collect();
    println!("{}", r.join(" "));
}
