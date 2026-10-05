include!("algo.rs");
use std::io::Read;
fn main() {
    let mut s = String::new();
    std::io::stdin().read_to_string(&mut s).unwrap();
    let l: Vec<&str> = s.split('\n').collect();
    let st: Vec<f64> = l[0].split_whitespace().map(|x| x.parse().unwrap()).collect();
    let en: Vec<f64> = l[1].split_whitespace().map(|x| x.parse().unwrap()).collect();
    let acts: Vec<Activity> = (0..st.len()).map(|i| Activity { id: format!("A{}", i), start: st[i], finish: en[i] }).collect();
    println!("{}", activity_selection(&acts).join(" "));
}
