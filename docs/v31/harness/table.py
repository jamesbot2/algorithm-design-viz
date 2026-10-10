import json,sys
L={v:{r['tag'].split('-',1)[1]:r for r in json.load(open(f'logs/{f}'))} for v,f in [('V29','m2-v29.json'),('V30','m2-v30.json'),('V31','m2-v31-final.json')]}
keys=list(L['V31'].keys())
def cell(r):
    if not r: return '—'
    k=r['keyFrames']; d=k['default']; m=k.get('midCompare') or d
    pp=max(v for v in r['mainPP'].values() if v is not None)
    return f"{d['comp'][3]:.0f} / {d['main'][3]:.0f} / {m['maxBar']:.0f}{'' if d['mode']=='bars' else ' cells'} / {r['minShare']*100:.0f}% / {pp:.0f}{' ⇕' if r['stageScrolls'] else ''}"
print('| case (n-viewport) | V29 | V30 | V31 |'); print('|---|---|---|---|')
for k in keys: print(f"| {k} | {cell(L['V29'].get(k))} | {cell(L['V30'].get(k))} | {cell(L['V31'].get(k))} |")
print()
print('| case | frames | runIds | V31 overflow frames (in-band) / without affordance | unreadable companion-tag frames V30→V31 | same-step cmp / write-back V31 | key frames |'); print('|---|---|---|---|---|---|---|')
for k in keys:
    r=L['V31'][k]; o=L['V30'].get(k)
    print(f"| {k} | {r['frames']} | {len(r['runIds'])} | {r['overflowFrames']} / {len(r['overflowNoAffordance'])} | {o['unreadableTagFrames'] if o else '—'} → {r['unreadableTagFrames']} | {r['sync']['cmp']-len(r['sync']['cmpBad'])}/{r['sync']['cmp']} · {r['sync']['wb']-len(r['sync']['wbBad'])}/{r['sync']['wb']} | {' '.join(f'{a}={b}' for a,b in r['key'].items())} |")
