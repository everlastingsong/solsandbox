import requests
import re

url = 'https://raw.githubusercontent.com/orca-so/typescript-sdk/main/src/constants/pools.ts'

response = requests.get(url)
typescript_code = response.text

pattern = re.compile(r'export const (\w+):[^;]+addr: new PublicKey\("(\w+)"\)[^;]+addr: new PublicKey\("(\w+)"\)')
defs = pattern.findall(typescript_code)

for d in defs:
  print(d)

"""
OUTPUT:

('solUsdcPool', 'ANP74VNsHwSrq9uUSjiSNyNWvf6ZPrKTmE4gHoNd13Lg', '75HgnSvXbWKZBpZHveX68ZzAhDqMzNDS29X6BGLtxMo1')
('solUsdtPool', 'DTb8NKsfhEJGY1TrA7RXN6MBiTrjnkdMAfjPEjtmTT3M', 'E8erPjPEorykpPjFV9yUYMYigEWKQUxuGfL2rJKLJ3KU')
('ethSolPool', '7F2cLdio3i6CCJaypj9VfNDPW2DwT3vkDmZJDEfmxu6A', '5pUTGvN2AA2BEzBDU4CNDh3LHER15WS6J8oJf5XeZFD8')
('ethUsdcPool', 'H9h5yTBfCHcb4eRP87fXczzXgNaMzKihr7bf1sjw7iuZ', 'JA98RXv2VdxQD8pRQq4dzJ1Bp4nH8nokCGmxvPWKJ3hx')
('raySolPool', 'GZaUNWf4ov6VZaD5MqZtc5pHB3mWTqczNUB4sstt8CSR', 'GNSZ1rr57QQ6qLcmZnhMcoBymenVezhNpzcFSfJP37h9')
('ropeSolPool', 'HLHPVwgzYjTHmu1fmV9eZzdE8H3fZwhuCBRNNN2Z5miA', '7Be3aStQmKgeXC1xqfJnA8qaGzw6keQTLqHYAJprZK2H')
...
"""
