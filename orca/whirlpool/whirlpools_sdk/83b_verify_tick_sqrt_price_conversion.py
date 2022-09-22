from cmath import sqrt
import sys
import math

# node-ts src/83a_verify_tick_sqrt_price_conversion.ts > tick_sqrt_price_x64_table.txt
# python3 src/83b_verify_tick_sqrt_price_conversion.py < tick_sqrt_price_x64_table.txt

def sqrt_price_x64_to_tick_index(sqrt_price_x64: int) -> int:
  # rough calculation
  shift_64 = 2**64
  sqrt_price = sqrt_price_x64 / shift_64
  price = sqrt_price**2
  tick_index = math.floor( math.log(price) / math.log(1.0001) )

  # adjust to exact result
  while tick_index_to_sqrt_price_x64(tick_index)   >  sqrt_price_x64: tick_index = tick_index - 1
  while tick_index_to_sqrt_price_x64(tick_index+1) <= sqrt_price_x64: tick_index = tick_index + 1
  return tick_index

def tick_index_to_sqrt_price_x64(tick_index: int) -> int:
  if tick_index > 0:
    return tick_index_to_sqrt_price_positive(tick_index)
  else:
    return tick_index_to_sqrt_price_negative(tick_index)

def mul_shift(a: int, b: int, shift: int) -> int:
  return (a * b) >> shift

def tick_index_to_sqrt_price_positive(tick_index: int) -> int:
  tick_index_shifted = tick_index

  if tick_index_shifted & 1 == 0:
    ratio = 79228162514264337593543950336 # 0
  else:
    ratio = 79232123823359799118286999567 # 1

  precalculated_factor = [
    79236085330515764027303304731, # 2
    79244008939048815603706035061, # 4
    79259858533276714757314932305, # 8
    79291567232598584799939703904, # ...
    79355022692464371645785046466,
    79482085999252804386437311141,
    79736823300114093921829183326,
    80248749790819932309965073892,
    81282483887344747381513967011,
    83390072131320151908154831281,
    87770609709833776024991924138,
    97234110755111693312479820773,
    119332217159966728226237229890,
    179736315981702064433883588727,
    407748233172238350107850275304,
    2098478828474011932436660412517,
    55581415166113811149459800483533,
    38992368544603139932233054999993551, # 262144
  ]

  for i in range(len(precalculated_factor)):
    tick_index_shifted = tick_index_shifted >> 1
    if tick_index_shifted & 1 != 0:
      ratio = mul_shift(ratio, precalculated_factor[i], 96)

  return mul_shift(ratio, 1, 32)

def tick_index_to_sqrt_price_negative(tick_index: int) -> int:
  tick_index_shifted = abs(tick_index)

  if tick_index_shifted & 1 == 0:
    ratio = 18446744073709551616 # 0
  else:
    ratio = 18445821805675392311 # 1

  precalculated_factor = [
    18444899583751176498, # 2
    18443055278223354162, # 4
    18439367220385604838, # 8
    18431993317065449817, # ...
    18417254355718160513,
    18387811781193591352,
    18329067761203520168,
    18212142134806087854,
    17980523815641551639,
    17526086738831147013,
    16651378430235024244,
    15030750278693429944,
    12247334978882834399,
    8131365268884726200,
    3584323654723342297,
    696457651847595233,
    26294789957452057,
    37481735321082, # 262144
  ]

  for i in range(len(precalculated_factor)):
    tick_index_shifted = tick_index_shifted >> 1
    if tick_index_shifted & 1 != 0:
      ratio = mul_shift(ratio, precalculated_factor[i], 64)

  return ratio

def main():
  while True:
    line = sys.stdin.readline()
    if len(line) == 0: break

    [tick_index, sqrt_price_x64] = map(int, line.rstrip().split(" "))

    # verify tick_index_to_sqrt_price_x64
    calculated_sqrt_price_x64 = tick_index_to_sqrt_price_x64(tick_index)

    delta_sqrt_price_x64 = calculated_sqrt_price_x64 - sqrt_price_x64
    assert delta_sqrt_price_x64 == 0

    # verify sqrt_price_x
    calculated_tick_index = sqrt_price_x64_to_tick_index(sqrt_price_x64)
    calculated_next_tick_index = sqrt_price_x64_to_tick_index(sqrt_price_x64 + 1)
    calculated_prev_tick_index = sqrt_price_x64_to_tick_index(sqrt_price_x64 - 1)

    delta_tick_index = calculated_tick_index - tick_index
    assert delta_tick_index == 0
    delta_next_tick_index = calculated_next_tick_index - calculated_tick_index
    assert delta_next_tick_index == 0
    delta_prev_tick_index = calculated_tick_index - calculated_prev_tick_index
    assert delta_prev_tick_index == 1

if __name__ == "__main__":
    main()