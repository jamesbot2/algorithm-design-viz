include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let tok: Vec<&str> = s.split_whitespace().collect();
    let n: usize = tok[0].parse().unwrap();
    let mut g = vec![vec![0f64; n]; n];
    for i in 0..n {
        for j in 0..n {
            let t = tok[1 + i * n + j];
            g[i][j] = if t == "INF" { INF } else { t.parse().unwrap() };
        }
    }
    for row in floyd(&g) {
        let r: Vec<String> = row.iter().map(|x| if *x == INF { "INF".to_string() } else { (*x as i64).to_string() }).collect();
        println!("{}", r.join(" "));
    }
}
