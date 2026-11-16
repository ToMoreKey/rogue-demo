/* ================= pixel sprites ================= */
const SHAPES = {
  slime: ['............','............','....oooo....','..oobbbboo..','.obbhhbbbbo.','.obhhbbbbbo.','obbbbbbbbbbo','obwwbbbwwbbo','obwebbbwebbo','obbbbbbbbbbo','.oobbbbbboo.','...oooooo...'],
  bat:   ['o..........o','oo...oo...oo','obo.obbo.obo','obbobbbbobbo','obbbbeebbbbo','.obbbbbbbbo.','..obbbbbbo..','...obbbbo...','....obbo....','.....oo.....','............','............'],
  skull: ['...oooooo...','..owwwwwwo..','.owwwwwwwwo.','.owoowwoowo.','.owoowwoowo.','.owwwwwwwwo.','..owowowwo..','...oooooo...','..owwrrwwo..','.owwwrrwwwo.','.ow.owwo.wo.','..o..oo..o..'],
  boss:  ['...r.rr.r...','...rrrrrr...','..oooooooo..','.obbbbbbbbo.','obbeebbeebbo','obbeebbeebbo','obbbbbbbbbbo','obbboooobbbo','obbowwwwobbo','obbbooooobbo','.obbbbbbbbo.','oo.oo..oo.oo'],
  hero:  ['....oooo....','...ohhhho...','..ohhhhhho..','..osseesso..','..osssssso..','...oooooo...','..oooooooo..','.occcaaccco.','.occcaaccco.','..occcccco..','..occ..cco..','..ooo..ooo..']
};
const PAL = {
  hero: { o: '#141a22', h: '#c7d3e0', s: '#f2caa2', e: '#141a22', c: '#4c7fd6', a: '#e8dc9b' },
  A: { slime: { o: '#183324', b: '#6fd16f', h: '#d2f7c8', w: '#ffffff', e: '#142019' }, bat: { o: '#241a33', b: '#8a62c9', e: '#ff5a5a' }, skull: { o: '#23232b', w: '#e9e6d9', r: '#7a2a35' }, boss: { o: '#12231a', b: '#8fb89a', r: '#e8d26a', e: '#ffe27a', w: '#f2f2e6' } },
  B: { slime: { o: '#4a160a', b: '#ff7a3d', h: '#ffd08a', w: '#fff2d6', e: '#2a0a04' }, bat: { o: '#3a1410', b: '#e0572f', e: '#ffe27a' }, skull: { o: '#2b1a14', w: '#f3b27a', r: '#ff5d2b' }, boss: { o: '#2a0f0a', b: '#e65a3a', r: '#ffd24a', e: '#fff0a0', w: '#ffd9b0' } },
  C: { slime: { o: '#143a58', b: '#7fd0ff', h: '#e6f7ff', w: '#ffffff', e: '#0b2236' }, bat: { o: '#16304a', b: '#9ad8ff', e: '#2a5fd6' }, skull: { o: '#1b2a3a', w: '#cfeaff', r: '#4a7fb8' }, boss: { o: '#10283f', b: '#9fd3ff', r: '#ffffff', e: '#2a5fd6', w: '#e6f7ff' } },
  D: { slime: { o: '#152d1a', b: '#78b856', h: '#c6ef9b', w: '#f6f8e2', e: '#241418' }, bat: { o: '#21261a', b: '#9c78c8', e: '#ff96d2' }, skull: { o: '#262118', w: '#c4a97d', r: '#4f8f46' }, boss: { o: '#132818', b: '#5f9e4c', r: '#e8c458', e: '#b6ff7a', w: '#e8f5d6' } },
  E: { slime: { o: '#3a2a16', b: '#d6a44e', h: '#ffe08a', w: '#fff4d6', e: '#2b1b0a' }, bat: { o: '#332218', b: '#c4834b', e: '#ff6a3d' }, skull: { o: '#2c241c', w: '#e8d9b5', r: '#b87634' }, boss: { o: '#2f2010', b: '#e0b050', r: '#6ad8ff', e: '#fff2a6', w: '#fff7e0' } },
  F: { slime: { o: '#0d2b36', b: '#4ec4c8', h: '#a8f2f0', w: '#e6ffff', e: '#091d26' }, bat: { o: '#102836', b: '#4fa3d1', e: '#ffd86b' }, skull: { o: '#14262e', w: '#b5d8dc', r: '#e06e7a' }, boss: { o: '#0a222c', b: '#399cb8', r: '#ffd25a', e: '#7affea', w: '#d6fcff' } }
};
