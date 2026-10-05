/// Activity selection (greedy by finish) — complete Rust reference.
#[derive(Clone)]
pub struct Activity {
    pub id: String,
    pub start: f64,
    pub finish: f64,
}

pub fn activity_selection(activities: &[Activity]) -> Vec<String> {
    let mut sorted = activities.to_vec();
    sorted.sort_by(|a, b| a.finish.total_cmp(&b.finish)); // @a: sort
    let mut picked: Vec<String> = Vec::new();
    let mut last_finish = f64::NEG_INFINITY;
    for act in &sorted {
        if act.start >= last_finish { // @a: check
            picked.push(act.id.clone()); // @a: pick
            last_finish = act.finish;
        }
    }
    picked // @a: done
}
