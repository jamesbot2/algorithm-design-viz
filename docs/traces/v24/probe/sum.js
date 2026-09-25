const d=require(process.argv[2]);
for (const [k,v] of Object.entries(d)) { if (process.argv[3] && !k.includes(process.argv[3])) continue; const s={frame:v.frame&&[v.frame.counter,v.frame.primary,v.frame.banner.slice(0,24)]};
 for (const g of ["bars","values","slots","pointers","buffers","forestNodes","forestLabels","inputSymbols","legacySymbols","legacyFreqs"]) if (v[g]&&v[g].n) s[g]=`${v[g].full}/${v[g].n} visH=${JSON.stringify(v[g].visH.map(x=>Math.round(x)))} elH=${JSON.stringify(v[g].elH.map(x=>Math.round(x)))}`;
 if (v.dims) s.dims=v.dims; if (v.overlaps) s.ov=v.overlaps.length+" w="+JSON.stringify(v.widths)+" clipped="+v.clipped.length;
 console.log(k, JSON.stringify(s)); }
