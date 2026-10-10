| case (n-viewport) | V29 | V30 | V31 |
|---|---|---|---|
| n7-375x812 | — | 203 / 243 / 94 / 54% / 0 | 117 / 329 / 180 / 74% / 0 |
| n7-390x844 | — | 203 / 290 / 141 / 59% / 0 | 117 / 376 / 228 / 76% / 0 |
| n7-844x390 | — | 87 / 160 / 32 / 65% / 0 ⇕ | 87 / 164 / 32 / 65% / 0 ⇕ |
| n7-1024x600 | — | 117 / 169 / 37 / 59% / 0 | 87 / 199 / 67 / 70% / 0 |
| n7-1366x768 | — | 87 / 238 / 106 / 73% / 0 | 87 / 238 / 106 / 73% / 0 |
| n7-1920x1080 | — | 87 / 697 / 565 / 89% / 0 | 87 / 697 / 565 / 89% / 0 |
| n16-375x812 | 113 / 349 / 197 / 31% / 254 ⇕ | 286 / 160 / 32 / 36% / 0 ⇕ | 117 / 329 / 181 / 74% / 0 |
| n16-390x844 | 113 / 381 / 229 / 31% / 239 ⇕ | 318 / 160 / 32 / 33% / 0 ⇕ | 117 / 361 / 213 / 76% / 0 |
| n16-844x390 | 82 / 160 / 32 / 44% / 121 ⇕ | 87 / 160 / 32 / 65% / 0 ⇕ | 87 / 180 / 32 / 67% / 0 ⇕ |
| n16-1024x600 | 82 / 203 / 51 / 44% / 121 ⇕ | 125 / 160 / 32 / 56% / 0 ⇕ | 87 / 199 / 51 / 70% / 0 |
| n16-1366x768 | 82 / 242 / 90 / 44% / 121 ⇕ | 165 / 160 / 32 / 49% / 0 ⇕ | 87 / 238 / 90 / 73% / 0 |
| n16-1920x1080 | 82 / 701 / 549 / 74% / 121 | 203 / 580 / 433 / 74% / 0 | 203 / 580 / 433 / 74% / 0 |
| n24-375x812 | — | 286 / 160 / 32 / 36% / 0 ⇕ | 117 / 528 / 0 cells / 82% / 0 ⇕ |
| n24-390x844 | — | 318 / 160 / 32 / 33% / 0 ⇕ | 117 / 528 / 0 cells / 82% / 0 ⇕ |
| n24-844x390 | — | 87 / 160 / 32 / 65% / 0 ⇕ | 87 / 180 / 32 / 67% / 0 ⇕ |
| n24-1024x600 | — | 125 / 160 / 32 / 56% / 0 ⇕ | 87 / 199 / 51 / 70% / 0 |
| n24-1366x768 | — | 165 / 160 / 32 / 49% / 0 ⇕ | 87 / 238 / 90 / 73% / 0 |
| n24-1920x1080 | — | 203 / 580 / 433 / 74% / 0 | 203 / 580 / 433 / 74% / 0 |
| n32-375x812 | — | 87 / 359 / 0 cells / 81% / 0 ⇕ | 117 / 691 / 0 cells / 86% / 0 ⇕ |
| n32-390x844 | — | 87 / 391 / 0 cells / 82% / 0 ⇕ | 117 / 691 / 0 cells / 86% / 0 ⇕ |
| n32-844x390 | — | 87 / 160 / 0 cells / 65% / 0 ⇕ | 87 / 285 / 0 cells / 77% / 0 ⇕ |
| n32-1024x600 | — | 87 / 199 / 0 cells / 70% / 0 ⇕ | 87 / 447 / 0 cells / 84% / 0 ⇕ |
| n32-1366x768 | — | 87 / 238 / 0 cells / 73% / 0 ⇕ | 87 / 366 / 0 cells / 81% / 0 ⇕ |
| n32-1920x1080 | — | 352 / 432 / 0 cells / 55% / 0 | 87 / 697 / 0 cells / 89% / 0 |
| n16-375x812-tree | 113 / 165 / 33 / 31% / 254 ⇕ | 286 / 160 / 32 / 36% / 0 ⇕ | 117 / 182 / 33 / 61% / 0 |
| n16-844x390-tree | 82 / 160 / 32 / 44% / 121 ⇕ | 87 / 160 / 32 / 65% / 0 ⇕ | 87 / 180 / 32 / 67% / 0 ⇕ |
| n16-1366x768-tree | 82 / 242 / 60 / 31% / 269 ⇕ | 165 / 160 / 32 / 49% / 0 ⇕ | 87 / 238 / 90 / 73% / 0 |
| n16-375x812-cells | 113 / 349 / 0 cells / 31% / 254 ⇕ | 87 / 359 / 0 cells / 81% / 0 | 117 / 366 / 0 cells / 76% / 0 ⇕ |

| case | frames | runIds | V31 overflow frames (in-band) / without affordance | unreadable companion-tag frames V30→V31 | same-step cmp / write-back V31 | key frames |
|---|---|---|---|---|---|---|
| n7-375x812 | 50 | 1 | 11 / 0 | 0 → 0 | 9/9 · 9/9 | default=0 midCompare=29 maxBuffer=38 writeBack=40 done=49 |
| n7-390x844 | 50 | 1 | 11 / 0 | 0 → 0 | 9/9 · 9/9 | default=0 midCompare=29 maxBuffer=38 writeBack=40 done=49 |
| n7-844x390 | 50 | 1 | 0 / 0 | 0 → 0 | 9/9 · 9/9 | default=0 midCompare=29 maxBuffer=38 writeBack=40 done=49 |
| n7-1024x600 | 50 | 1 | 11 / 0 | 0 → 0 | 9/9 · 9/9 | default=0 midCompare=29 maxBuffer=38 writeBack=40 done=49 |
| n7-1366x768 | 50 | 1 | 0 / 0 | 0 → 0 | 9/9 · 9/9 | default=0 midCompare=29 maxBuffer=38 writeBack=40 done=49 |
| n7-1920x1080 | 50 | 1 | 0 / 0 | 0 → 0 | 9/9 · 9/9 | default=0 midCompare=29 maxBuffer=38 writeBack=40 done=49 |
| n16-375x812 | 144 | 1 | 51 / 0 | 6 → 0 | 32/32 · 32/32 | default=0 midCompare=88 maxBuffer=118 writeBack=120 done=143 |
| n16-390x844 | 144 | 1 | 51 / 0 | 6 → 0 | 32/32 · 32/32 | default=0 midCompare=88 maxBuffer=118 writeBack=120 done=143 |
| n16-844x390 | 144 | 1 | 51 / 0 | 25 → 0 | 32/32 · 32/32 | default=0 midCompare=88 maxBuffer=118 writeBack=120 done=143 |
| n16-1024x600 | 144 | 1 | 51 / 0 | 51 → 0 | 32/32 · 32/32 | default=0 midCompare=88 maxBuffer=118 writeBack=120 done=143 |
| n16-1366x768 | 144 | 1 | 51 / 0 | 17 → 0 | 32/32 · 32/32 | default=0 midCompare=88 maxBuffer=118 writeBack=120 done=143 |
| n16-1920x1080 | 144 | 1 | 0 / 0 | 0 → 0 | 32/32 · 32/32 | default=0 midCompare=88 maxBuffer=118 writeBack=120 done=143 |
| n24-375x812 | 236 | 1 | 115 / 0 | 41 → 0 | 52/52 · 52/52 | default=0 midCompare=135 maxBuffer=198 writeBack=200 done=235 |
| n24-390x844 | 236 | 1 | 115 / 0 | 29 → 0 | 52/52 · 52/52 | default=0 midCompare=135 maxBuffer=198 writeBack=200 done=235 |
| n24-844x390 | 236 | 1 | 115 / 0 | 75 → 0 | 52/52 · 52/52 | default=0 midCompare=135 maxBuffer=198 writeBack=200 done=235 |
| n24-1024x600 | 236 | 1 | 115 / 0 | 75 → 0 | 52/52 · 52/52 | default=0 midCompare=135 maxBuffer=198 writeBack=200 done=235 |
| n24-1366x768 | 236 | 1 | 115 / 0 | 51 → 0 | 52/52 · 52/52 | default=0 midCompare=135 maxBuffer=198 writeBack=200 done=235 |
| n24-1920x1080 | 236 | 1 | 0 / 0 | 0 → 0 | 52/52 · 52/52 | default=0 midCompare=135 maxBuffer=198 writeBack=200 done=235 |
| n32-375x812 | 336 | 1 | 151 / 0 | 207 → 0 | 80/80 · 80/80 | default=0 midCompare=191 maxBuffer=286 writeBack=288 done=335 |
| n32-390x844 | 336 | 1 | 151 / 0 | 207 → 0 | 80/80 · 80/80 | default=0 midCompare=191 maxBuffer=286 writeBack=288 done=335 |
| n32-844x390 | 336 | 1 | 151 / 0 | 99 → 0 | 80/80 · 80/80 | default=0 midCompare=191 maxBuffer=286 writeBack=288 done=335 |
| n32-1024x600 | 336 | 1 | 151 / 0 | 151 → 0 | 80/80 · 80/80 | default=0 midCompare=191 maxBuffer=286 writeBack=288 done=335 |
| n32-1366x768 | 336 | 1 | 151 / 0 | 99 → 0 | 80/80 · 80/80 | default=0 midCompare=191 maxBuffer=286 writeBack=288 done=335 |
| n32-1920x1080 | 336 | 1 | 151 / 0 | 0 → 0 | 80/80 · 80/80 | default=0 midCompare=191 maxBuffer=286 writeBack=288 done=335 |
| n16-375x812-tree | 144 | 1 | 51 / 0 | 6 → 0 | 32/32 · 32/32 | default=0 midCompare=88 maxBuffer=118 writeBack=120 done=143 |
| n16-844x390-tree | 144 | 1 | 51 / 0 | 51 → 0 | 32/32 · 32/32 | default=0 midCompare=88 maxBuffer=118 writeBack=120 done=143 |
| n16-1366x768-tree | 144 | 1 | 51 / 0 | 43 → 0 | 32/32 · 32/32 | default=0 midCompare=88 maxBuffer=118 writeBack=120 done=143 |
| n16-375x812-cells | 144 | 1 | 51 / 0 | 79 → 0 | 32/32 · 32/32 | default=0 midCompare=88 maxBuffer=118 writeBack=120 done=143 |
