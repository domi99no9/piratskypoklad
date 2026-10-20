const fs=require('fs'),{Engine,makeRng}=require('../demo/engine.js');
const cfg=JSON.parse(fs.readFileSync(__dirname+'/../demo/game_config.json','utf8'));
const N=+process.argv[2]||1e6, seed=+process.argv[3]||12345, E=new Engine(cfg), rng=makeRng(seed);
const K=cfg.krakenAttack,J=cfg.jackpot,T=cfg.tidalWave,pools=J.tiers.map(t=>t.seed),wsum=J.tiers.reduce((a,t)=>a+t.weight,0);
const R={base:0,kraken:0,wave:0,free:0,bonus:0,jackpot:0};let hits=0,trig=0,btrig=0,krHits=0,waveHits=0,max=0,s1=0,s2=0,fsSpins=0;const jpHits=J.tiers.map(()=>0);
const dist=[0,0,0,0,0,0,0],edges=[0,1,5,20,100,500,Infinity];
function features(r){let w=0;
  if(r.bonus){btrig++;const b=E.playPick(rng);R.bonus+=b;w+=b;}
  if(r.freeSpins){trig++;let left=r.freeSpins,m=cfg.scatter.multiplierStart;
    while(left>0){left--;fsSpins++;const f=E.evaluate(E.spin(rng));const fw=f.total*m;R.free+=fw;w+=fw;
      if(f.total>0)m+=cfg.scatter.multiplierStep; if(f.scatterCount>=3)left+=cfg.scatter.retrigger;}}
  return w;}
for(let i=0;i<N;i++){
  let w=0;
  for(let k=0;k<pools.length;k++)pools[k]+=J.tiers[k].contribution;
  if(rng()<J.triggerProbPerMinBet){const k=E.jackpotTier(rng);w+=pools[k];R.jackpot+=pools[k];jpHits[k]++;pools[k]=J.tiers[k].seed;}
  const g0=E.spin(rng);let r;
  if(rng()<K.probability){krHits++;const kp=E.krakenPositions(g0,rng);const r0=E.evaluate(g0);r=E.evaluate(g0,kp);R.kraken+=r.total-r0.total;R.base+=r0.total;}
  else{r=E.evaluate(g0);R.base+=r.total;}
  w+=r.total+features(r);
  if(r.total===0&&!r.freeSpins&&!r.bonus&&rng()<T.probability){waveHits++;let rr;do{rr=E.evaluate(E.spin(rng));}while(rr.total<=0);R.wave+=rr.total;w+=rr.total+features(rr);}
  if(w>0)hits++;if(w>max)max=w;s1+=w;s2+=w*w;
  if(w==0)dist[0]++;else for(let k=0;k<6;k++)if(w>edges[k]&&w<=edges[k+1]){dist[k+1]++;break;}
}
const mean=s1/N,sd=Math.sqrt(s2/N-mean*mean),jt=J.tiers.reduce((a,t)=>a+t.contribution+J.triggerProbPerMinBet*t.weight/wsum*t.seed,0);
const out={spins:N,seed,rtp:mean,rtpBase:R.base/N,rtpFree:R.free/N,rtpBonus:R.bonus/N,rtpKrakenAttack:R.kraken/N,rtpTidalWave:R.wave/N,rtpJackpot:R.jackpot/N,jackpotTheoretical:jt,
 rtpWithTheoreticalJackpot:mean-R.jackpot/N+jt,hitFreq:hits/N,fsTriggerEvery:N/trig,bonusTriggerEvery:N/btrig,krakenEvery:N/krHits,tidalWaveEvery:N/waveHits,
 jackpotEvery:N/jpHits.reduce((a,b)=>a+b,0),jackpotHits:Object.fromEntries(J.tiers.map((t,k)=>[t.name,jpHits[k]])),avgFsPerTrigger:fsSpins/trig,maxWinX:max,stdDev:sd,ci95:1.96*sd/Math.sqrt(N),
 winDist:{"0":dist[0],"(0,1]x":dist[1],"(1,5]x":dist[2],"(5,20]x":dist[3],"(20,100]x":dist[4],"(100,500]x":dist[5],">500x":dist[6]}};
console.log(JSON.stringify(out,null,1));if(process.argv[4])fs.writeFileSync(process.argv[4],JSON.stringify(out,null,1));
