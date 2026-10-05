include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let n: usize = s.trim().parse().unwrap();
    let r = solve_n_queens(n);
    println!("{}", r.len());
    for v in r {
        let p: Vec<String> = v.iter().map(|x| x.to_string()).collect();
        println!("{}", p.join(" "));
    }
}
