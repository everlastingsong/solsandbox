import requests
import re

url = 'https://raw.githubusercontent.com/orca-so/typescript-sdk/main/src/constants/pools.ts'

response = requests.get(url)
typescript_code = response.text

pattern = re.compile(r'export const (\w+):[^;]+poolTokenMint: new PublicKey\("(\w+)"\)[^;]+addr: new PublicKey\("(\w+)"\)[^;]+addr: new PublicKey\("(\w+)"\)')
defs = pattern.findall(typescript_code)

for d in defs:
  print(d)

"""
OUTPUT:

('solUsdcPool', 'APDFRM3HMr8CAGXwKHiu2f5ePSpaiEJhaURwhsRrUUt9', 'ANP74VNsHwSrq9uUSjiSNyNWvf6ZPrKTmE4gHoNd13Lg', '75HgnSvXbWKZBpZHveX68ZzAhDqMzNDS29X6BGLtxMo1')
('solUsdtPool', 'FZthQCuYHhcfiDma7QrX7buDHwrZEd7vL8SjS6LQa3Tx', 'DTb8NKsfhEJGY1TrA7RXN6MBiTrjnkdMAfjPEjtmTT3M', 'E8erPjPEorykpPjFV9yUYMYigEWKQUxuGfL2rJKLJ3KU')
('ethSolPool', '71FymgN2ZUf7VvVTLE8jYEnjP3jSK1Frp2XT1nHs8Hob', '7F2cLdio3i6CCJaypj9VfNDPW2DwT3vkDmZJDEfmxu6A', '5pUTGvN2AA2BEzBDU4CNDh3LHER15WS6J8oJf5XeZFD8')
('ethUsdcPool', '3e1W6Aqcbuk2DfHUwRiRcyzpyYRRjg6yhZZcyEARydUX', 'H9h5yTBfCHcb4eRP87fXczzXgNaMzKihr7bf1sjw7iuZ', 'JA98RXv2VdxQD8pRQq4dzJ1Bp4nH8nokCGmxvPWKJ3hx')
...
('stsolUsdtPool', '4ni1nho89cDKAQ9ddbNQA9ieLYpzvJVmJpuogu5Ct5ur', 'BAMiBNk9j6Z9LLdZzzGScHDFQas58uLqW4GGX4ndq7K6', 'Ajf4bxNoKCyFVfV35sRTgGwZK1dfJJJVXgNFs7ncC5EF')
...
"""
