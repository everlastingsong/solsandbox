use whirlpool::state::{MAX_TICK_INDEX, MIN_TICK_INDEX, TICK_ARRAY_SIZE};

pub fn get_start_tick_index(tick_index: i32, tick_spacing: u16, offset: i32) -> i32 {
  let ticks_in_array = TICK_ARRAY_SIZE * tick_spacing as i32;
  let real_index = div_floor(tick_index, ticks_in_array);
  let start_tick_index = (real_index + offset) * ticks_in_array;

  assert!(MIN_TICK_INDEX <= start_tick_index);
  assert!(start_tick_index + ticks_in_array <= MAX_TICK_INDEX);
  start_tick_index
}

pub fn get_initializable_tick_index(tick_index: i32, tick_spacing: u16) -> i32 {
  let initialiable_tick_index_abs = tick_index.abs() - tick_index.abs() % (tick_spacing as i32);
  if tick_index < 0 {
      -initialiable_tick_index_abs
  } else {
      initialiable_tick_index_abs
  }
}

fn div_floor(a: i32, b: i32) -> i32 {
  if a < 0 && a % b != 0 {
      a / b - 1
  } else {
      a / b
  }
}
