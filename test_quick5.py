#!/usr/bin/env python3
import json, urllib.request, urllib.error, time, re
def p(*args): print(*args, flush=True)
BASE_URL = input("URL Vercel: ").strip().rstrip("/")
KEY      = input("ANTHROPIC_API_KEY: ").strip()
PASS=0; FAIL=0; WARN=0

CGP_SYSTEM = """Tu es CGP agree AMF. Evalue ce portefeuille sur 10.

REGLES IMPORTANTES:
- Les ETF .PA synthetiques (PANX, CW8, PE500, PUST, PAEEM, MEUD, C50) sont eligibles PEA ET CTO ET AV. Ne pas les signaler comme ineligibles CTO ou AV.
- NOVO-B.CO, ASML.AS, SAP.DE sont eligibles PEA (societes europeennes UE).
- Un doublon = meme sous-jacent. MSCI World + ETF EM = complement OK (pas doublon).

CRITERES:
1. support_eligibilite: actifs vraiment inaccessibles ?
2. zone_geographique: zone correspond ?
3. doublon_indices: meme sous-jacent en double ?
4. coherence_risque: vol coherente avec profil ?
5. diversification: nb actifs vs demande ?
6. qualite_markowitz: poids differencies, Sharpe logique ?

JSON uniquement: {"score_final":7,"scores":{"support_eligibilite":8,"zone_geographique":7,"doublon_indices":8,"coherence_risque":8,"diversification":6,"qualite_markowitz":5},"bugs":["bug1"],"verdict":"resume"}"""

def parse_json(text):
    text = text.replace("```json","").replace("```","").strip()
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]","",text)
    s=text.find("{"); e=text.rfind("}")+1
    if s<0: return None
    raw=text[s:e]
    try: return json.loads(raw)
    except:
        out={"scores":{},"bugs":[]}
        m=re.search(r'"score_final"\s*:\s*(\d+)',raw)
        out["score_final"]=int(m.group(1)) if m else 5
        m=re.search(r'"verdict"\s*:\s*"([^"]{3,200})"',raw)
        out["verdict"]=m.group(1) if m else "?"
        out["bugs"]=re.findall(r'"(BUG[^"]{5,120})"',raw)
        for k in ["support_eligibilite","zone_geographique","doublon_indices","coherence_risque","diversification","qualite_markowitz"]:
            m2=re.search('"'+k+r'"\s*:\s*(\d+)',raw)
            if m2: out["scores"][k]=int(m2.group(1))
        if out["scores"]: out["score_final"]=round(sum(out["scores"].values())/len(out["scores"]))
        return out

def api(answers, cap=20000):
    d=json.dumps({"capital":cap,"answers":answers}).encode()
    req=urllib.request.Request(f"{BASE_URL}/api/optimize",data=d,method="POST",headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req,timeout=90) as r: return json.loads(r.read())

def evaluate(answers, result):
    r=next((x for x in result.get("results",[]) if x["method"]=="maxsharpe"),None)
    if not r: return None
    w=r["weights"]; total=round(sum(x["weight"] for x in w),1)
    actifs="\n".join("- "+x["symbol"]+"("+str(x["weight"])+"%) "+x.get("type","?")+" "+x.get("name","")[:15] for x in w)
    def c(k): return answers.get(k,"?").replace("'","")
    prompt=("PROFIL: Risque="+c("2")+" Zone="+c("6")+" Support="+c("8")+" Banque="+c("9")+"\n"
            "Classes="+c("5")+" Diversif="+c("7")+"\n\n"
            "PORTEFEUILLE ("+str(len(w))+" actifs, "+str(total)+"%):\n"+actifs+"\n\n"
            "Stats: R="+str(r["ret"])+"% V="+str(r["vol"])+"% Sharpe="+str(r["sharpe"])+"\n"
            "Evalue. JSON uniquement sans apostrophe.")
    for attempt in range(3):
        try:
            d=json.dumps({"model":"claude-sonnet-4-6","max_tokens":1200,"system":CGP_SYSTEM,
                "messages":[{"role":"user","content":prompt}]}).encode()
            req=urllib.request.Request("https://api.anthropic.com/v1/messages",data=d,method="POST",
                headers={"Content-Type":"application/json","x-api-key":KEY,"anthropic-version":"2023-06-01"})
            with urllib.request.urlopen(req,timeout=60) as resp:
                raw=json.loads(resp.read())
            parsed=parse_json(raw["content"][0]["text"])
            if parsed: return parsed
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(30+attempt*15); continue
        except: pass
        if attempt<2: time.sleep(8)
    return None

def test(name, answers, cap=20000):
    global PASS,FAIL,WARN
    p(f"\n{'─'*50}")
    p(f"TEST [{PASS+FAIL+WARN+1}/5] {name}")
    try:
        result=api(answers,cap)
        if "error" in result: p(f"  FAIL API: {result['error']}"); FAIL+=1; return
        r=next((x for x in result.get("results",[]) if x["method"]=="maxsharpe"),None)
        if not r: p("  FAIL: no result"); FAIL+=1; return
        w=r["weights"]; total=round(sum(x["weight"] for x in w),1)
        p(f"  {result.get('universe','?')} actifs -> {len(w)} | {total}% | Sharpe={r['sharpe']}")
        p("  "+" | ".join(x["symbol"]+"("+str(x["weight"])+"%) " for x in w[:5]))
        ev=evaluate(answers,result)
        if not ev: p("  WARN: eval echouee"); WARN+=1; return
        score=ev.get("score_final",0)
        scores=ev.get("scores",{})
        p(f"\n  SCORES:")
        for k,v in scores.items():
            flag=" << FIX" if v<6 else ""
            p(f"    {k:<25} {v}/10{flag}")
        p(f"  SCORE: {score}/10  |  {ev.get('verdict','')[:80]}")
        for b in ev.get("bugs",[])[:3]: p(f"  ! {b[:90]}")
        if score>=7: p("  PASS"); PASS+=1
        elif score>=5: p("  WARN"); WARN+=1
        else: p("  FAIL"); FAIL+=1
    except Exception as ex:
        p(f"  FAIL: {ex}"); FAIL+=1
    time.sleep(6)

# 5 tests couvrant les bugs principaux
test("CTO IB ETF monde agressif",
    {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre",
     "5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})

test("PEA BoursoBank ETF monde modere",
    {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre",
     "5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"PEA","9":"BoursoBank"})

test("AV BoursoBank ETF obligations defensif",
    {"1":"2 a 5 ans","2":"Conservateur","3":"-10% maximum","4":"Aucun filtre",
     "5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Assurance-Vie","9":"BoursoBank"})

test("PEA Fortuneo ETF Europe dynamique",
    {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre",
     "5":"ETF,Actions","6":"Europe","7":"Equilibre (8-10 actifs)","8":"PEA","9":"Fortuneo"})

test("CTO Degiro ETF monde modere obligations",
    {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre",
     "5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Degiro"})

p(f"\n{'='*50}")
p(f"BILAN: {PASS} PASS | {WARN} WARN | {FAIL} FAIL / 5")
p(f"Score: {round(PASS/5*100)}%")
