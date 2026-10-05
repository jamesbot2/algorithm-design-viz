include!("algo.rs");
use std::io::Read;
fn paren(s: &Vec<Vec<usize>>, i: usize, j: usize) -> String {
    if i == j { format!("A{}", i + 1) } else { format!("({}{})", paren(s, i, s[i][j]), paren(s, s[i][j] + 1, j)) }
}
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let d: Vec<i64> = s.split_whitespace().map(|x| x.parse().unwrap()).collect();
    let (c, sp) = matrix_chain_order(&d);
    println!("{}", c);
    println!("{}", paren(&sp, 0, d.len() - 2));
}
