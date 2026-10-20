import json,random,sys
P={"10":[5,15,50],"J":[5,20,60],"Q":[5,25,75],"K":[10,30,100],"A":[10,40,125],
   "kotva":[15,60,200],"papousek":[20,75,250],"kompas":[25,100,300],"truhla":[30,125,400],"kapitan":[50,200,1000]}
names={"10":"10","J":"J","Q":"Q","K":"K","A":"A","kotva":"Kotva","papousek":"Papoušek","kompas":"Kompas","truhla":"Truhla","kapitan":"Kapitán","wild":"Pirátská vlajka (WILD)","mapa":"Mapa pokladu (SCATTER)"}
# counts per reel
base={"10":7,"J":7,"Q":6,"K":6,"A":5,"kotva":4,"papousek":3,"kompas":3,"truhla":3,"kapitan":2,"mapa":2}
wild={1:1,2:2,3:1}
mapa=[2,2,1,2,2]
scale=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
kprob=float(sys.argv[2]) if len(sys.argv)>2 else 1/70
jprob=float(sys.argv[3]) if len(sys.argv)>3 else 1/6000
gscale=float(sys.argv[4]) if len(sys.argv)>4 else 1.0
wprob=float(sys.argv[5]) if len(sys.argv)>5 else 0.02
rng=random.Random(42); reels=[]
for r in range(5):
    c=dict(base); 
    if r in wild: c["wild"]=wild[r]
    c["mapa"]=mapa[r]
    while True:
        s=[k for k,v in c.items() for _ in range(v)]; rng.shuffle(s)
        n=len(s)
        ok=all(not(s[i] in("mapa","wild","truhla","kapitan") and s[i]==s[(i+1)%n]) for i in range(n)) and \
           all(not(s[i]=="mapa" and "mapa" in (s[(i+1)%n],s[(i+2)%n])) for i in range(n))
        if ok: break
    reels.append(s)
syms=[]
for k,v in P.items():
    pays=[0,0,0]+[max(1,round(x*(scale if k in("10","J","Q","K","A") else 1)*gscale)) for x in v]
    syms.append({"id":k,"name":names[k],"tier":"low" if len(k)<=2 else "high","pays":pays})
syms.append({"id":"wild","name":names["wild"],"tier":"special","pays":None})
syms.append({"id":"mapa","name":names["mapa"],"tier":"special","pays":None})
lines=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[1,0,1,2,1],
       [1,2,1,0,1],[0,1,1,1,0],[2,1,1,1,2],[0,1,0,1,0],[2,1,2,1,2],[1,1,0,1,1],[1,1,2,1,1],[0,0,2,0,0],[2,2,0,2,2],[0,2,2,2,0]]
cfg={"game":"Pirátský poklad","rows":3,"reelsCount":5,"symbols":syms,"reels":reels,"paylines":lines,
 "payUnits":"pays = násobky sázky na linii (celková sázka / 20); scatter a bonus = násobky celkové sázky",
 "wild":{"id":"wild","reels":[2,3,4],"expanding":True,"substitutesScatter":False},
 "scatter":{"id":"mapa","pays":[0,0,0,1,10,50],"freeSpins":10,"retrigger":10,"multiplierStart":1,"multiplierStep":1},
 "pickBonus":{"name":"Vykopej poklad","triggerSymbol":"truhla","triggerReels":[1,3,5],"prizes":[1,1,2,2,3,3,5,8,10],"skulls":3,"availableInFreeSpins":False},
 "krakenAttack":{"name":"Útok krakena","probability":kprob,"wildCounts":[3,4,5,6],"reels":[2,3,4,5],"expanding":False,"baseGameOnly":True},
 "tidalWave":{"name":"Přílivová vlna","probability":wprob,"condition":"nevýherní otáčka v základní hře (bez výhry, bez volných otáček a bonusu)","respin":"opakuje se, dokud otáčka nepřinese výhru (výhra zaručena)","videoPeak":3.5},
 "jackpot":{"name":"Kapitánova truhla","type":"mystery-progressive","triggerProbPerMinBet":jprob,"minBet":20,"seedUnit":"násobky minimální sázky","contributionUnit":"podíl z každé sázky",
   "tiers":[{"id":"bronz","name":"Bronz","seed":20,"contribution":0.004,"weight":70},{"id":"stribro","name":"Stříbro","seed":100,"contribution":0.003,"weight":22},
            {"id":"zlato","name":"Zlato","seed":500,"contribution":0.002,"weight":6.5},{"id":"diamant","name":"Diamant","seed":2500,"contribution":0.001,"weight":1.5}]},
 "bets":[20,40,60,100,200],"startBalance":1000}
json.dump(cfg,open("/workspace/piratsky-poklad/demo/game_config.json","w"),ensure_ascii=False,indent=1)
