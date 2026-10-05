include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let l: Vec<&str> = s.split('\n').collect();
    let cap: usize = l[0].trim().parse().unwrap();
    let w: Vec<usize> = l[1].split_whitespace().map(|x| x.parse().unwrap()).collect();
    let vals: Vec<i64> = l[2].split_whitespace().map(|x| x.parse().unwrap()).collect();
    println!("{}", knapsack_backtracking(&w, &vals, cap));
}
