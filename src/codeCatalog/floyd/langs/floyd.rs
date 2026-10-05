/// Floyd-Warshall — complete Rust reference.
pub const INF: f64 = f64::INFINITY; // missing edge

pub fn floyd(dist: &[Vec<f64>]) -> Vec<Vec<f64>> {
    let n = dist.len();
    let mut d: Vec<Vec<f64>> = dist.to_vec(); // @a: init
    for k in 0..n { // @a: kLoop
        for i in 0..n {
            for j in 0..n {
                if d[i][k] + d[k][j] < d[i][j] { // @a: relax
                    d[i][j] = d[i][k] + d[k][j]; // @a: update
                }
            }
        }
    }
    d // @a: done
}
