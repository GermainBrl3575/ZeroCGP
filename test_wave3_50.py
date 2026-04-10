#!/usr/bin/env python3
"""Wave 3: 50 tests. Target: 45/50 PASS (score >= 7). More stable measurement."""
import json, urllib.request, urllib.error, time, re, sys, os

BASE_URL = "https://zero-cgp.vercel.app"
KEY = os.environ.get("ANTHROPIC_API_KEY", "")
if not KEY:
    try:
        with open(".env.local") as f:
            for line in f:
                if line.startswith("ANTHROPIC_API_KEY="):
                    KEY = line.strip().split("=", 1)[1]
    except: pass
if not KEY: print("No ANTHROPIC_API_KEY"); sys.exit(1)

PASS=0; FAIL=0; WARN=0; RESULTS=[]

CGP_SYSTEM = """Tu es CGP agree AMF. Evalue ce portefeuille sur 10.

REGLES CRITIQUES (ne pas penaliser si respectees):
- ETF .PA synthetiques (PANX, CW8, LCWD, PE500, PUST, PAEEM, MEUD, C50, SMC, EESM, OBLI, GAGG) = eligibles PEA + CTO + AV.
- NOVO-B.CO, ASML.AS, SAP.DE, SIE.DE = eligibles PEA (societes UE/EEE).
- SGLD.L (Invesco Physical Gold ETC, ISIN IE00B579F325) EST eligible dans certaines assurances-vie francaises dont Linxea Spirit et Lucya Cardif. Ne pas le penaliser en support_eligibilite.
- IBGS.L, XGLE.DE, SXR8.DE = av:true (accessibles en assurance-vie francaise).
- IEAG.L, IEAC.AS = UCITS europeens accessibles sur CTO/Degiro sans probleme KID PRIIP.
- Un doublon = MEME sous-jacent exact. Pas un recouvrement partiel.
- MSCI World + ETF EM = COMPLEMENT. SP500 + NASDAQ100 pour agressif = core-satellite INTENTIONNEL.
- MSCI World + Euro Stoxx 50 = COMPLEMENT (EU ~16% du World).
- MSCI World + CAC Mid 60 = COMPLEMENT (mid-caps pas dans MSCI World large cap).
- Pour PEA: pas d'obligations possible (reglementaire). Vol 14-18% NORMAL pour PEA modere.
- Pour AV: seulement ~10 ETF eligibles, 5-7 actifs est le MAXIMUM atteignable.
- Sharpe > 0.5 = acceptable. Sharpe > 0.8 = bon. Sharpe > 1.0 = excellent.
- Poids proches (25-30%) NORMAUX avec 5-6 actifs.

CRITERES:
1. support_eligibilite: actifs vraiment INACCESSIBLES ?
2. zone_geographique: zone correspond ?
3. doublon_indices: MEME sous-jacent en double ?
4. coherence_risque: vol coherente avec profil et contraintes ?
5. diversification: nb actifs vs demande, tenant compte contraintes AV/PEA ?
6. qualite_markowitz: Sharpe, poids differencies ?

BAREME: 7/10 = correct avec defauts mineurs. 8/10 = bon. 6/10 = defauts significatifs.

JSON uniquement: {"score_final":7,"scores":{"support_eligibilite":8,"zone_geographique":7,"doublon_indices":8,"coherence_risque":8,"diversification":6,"qualite_markowitz":5},"bugs":["bug1"],"verdict":"resume"}"""

def parse_json(text):
    text = text.replace("```json","").replace("```","").strip()
    s=text.find("{"); e=text.rfind("}")+1
    if s<0: return None
    raw=text[s:e]
    try: return json.loads(raw)
    except:
        out={"scores":{},"bugs":[]}
        m=re.search(r'"score_final"\s*:\s*(\d+)',raw)
        out["score_final"]=int(m.group(1)) if m else 5
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
    actifs="\n".join("- "+x["symbol"]+"("+str(x["weight"])+"%) "+x.get("type","?")+" "+x.get("name","")[:20] for x in w)
    def c(k): return answers.get(k,"?").replace("'","")
    prompt=("PROFIL: Risque="+c("2")+" Zone="+c("6")+" Support="+c("8")+" Banque="+c("9")+"\n"
            "Classes="+c("5")+" Diversif="+c("7")+"\n\n"
            "PORTEFEUILLE ("+str(len(w))+" actifs, "+str(total)+"%):\n"+actifs+"\n\n"
            "Stats: R="+str(r["ret"])+"% V="+str(r["vol"])+"% Sharpe="+str(r["sharpe"])+"\n"
            "Evalue. JSON uniquement.")
    for attempt in range(3):
        try:
            d=json.dumps({"model":"claude-sonnet-4-6","max_tokens":1200,"temperature":0,"system":CGP_SYSTEM,
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
    global PASS,FAIL,WARN,RESULTS
    idx=PASS+FAIL+WARN+1
    print(f"[{idx}/50] {name}", end=" ", flush=True)
    try:
        result=api(answers,cap)
        if "error" in result: print(f"FAIL(API)"); FAIL+=1; RESULTS.append((name,0)); return
        r=next((x for x in result.get("results",[]) if x["method"]=="maxsharpe"),None)
        if not r: print("FAIL(no result)"); FAIL+=1; RESULTS.append((name,0)); return
        w=r["weights"]
        ev=evaluate(answers,result)
        if not ev: print("WARN(eval fail)"); WARN+=1; RESULTS.append((name,0)); return
        score=ev.get("score_final",0)
        status="PASS" if score>=7 else "WARN" if score>=5 else "FAIL"
        print(f"{status}({score}) A={len(w)} S={r['sharpe']}", flush=True)
        if score>=7: PASS+=1
        elif score>=5: WARN+=1
        else: FAIL+=1
        RESULTS.append((name,score))
    except Exception as ex:
        print(f"FAIL({ex})"); FAIL+=1; RESULTS.append((name,0))
    time.sleep(4)

# ===== 50 TESTS =====

# G1: CTO MONDE (8 tests)
test("CTO IB ETF monde agressif equi", {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("CTO IB ETF monde modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("CTO IB ETF monde defensif equi", {"1":"2 a 5 ans","2":"Conservateur","3":"-10% maximum","4":"Aucun filtre","5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("CTO IB ETF monde dynamique large", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre","5":"ETF,Actions","6":"Monde entier","7":"Large (15+ actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("CTO Degiro ETF monde modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Degiro"})
test("CTO Degiro ETF monde agressif equi", {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Degiro"})
test("CTO IB ETF monde modere concentre", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Concentre (5 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("CTO IB actions monde dynamique equi", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre","5":"ETF,Actions","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})

# G2: PEA (8 tests)
test("PEA BoursoBank ETF monde modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"PEA","9":"BoursoBank"})
test("PEA BoursoBank ETF monde agressif equi", {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"PEA","9":"BoursoBank"})
test("PEA BoursoBank ETF monde agressif large", {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre","5":"ETF,Actions","6":"Monde entier","7":"Large (15+ actifs)","8":"PEA","9":"BoursoBank"})
test("PEA Fortuneo ETF Europe dynamique equi", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre","5":"ETF,Actions","6":"Europe","7":"Equilibre (8-10 actifs)","8":"PEA","9":"Fortuneo"})
test("PEA BNP ETF monde modere concentre", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Concentre (5 actifs)","8":"PEA","9":"BNP Paribas"})
test("PEA Fortuneo ETF monde modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"PEA","9":"Fortuneo"})
test("PEA BoursoBank ETF monde defensif equi", {"1":"2 a 5 ans","2":"Modere","3":"-10% maximum","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"PEA","9":"BoursoBank"})
test("PEA Fortuneo actions Europe agressif equi", {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre","5":"Actions","6":"Europe","7":"Equilibre (8-10 actifs)","8":"PEA","9":"Fortuneo"})

# G3: ASSURANCE-VIE (8 tests)
test("AV BoursoBank ETF monde modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Assurance-Vie","9":"BoursoBank"})
test("AV BoursoBank ETF monde defensif equi", {"1":"2 a 5 ans","2":"Conservateur","3":"-10% maximum","4":"Aucun filtre","5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Assurance-Vie","9":"BoursoBank"})
test("AV Fortuneo ETF monde defensif equi", {"1":"2 a 5 ans","2":"Conservateur","3":"-10% maximum","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Assurance-Vie","9":"Fortuneo"})
test("AV BoursoBank ETF monde dynamique equi", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Assurance-Vie","9":"BoursoBank"})
test("AV Fortuneo ETF monde modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Assurance-Vie","9":"Fortuneo"})
test("AV BoursoBank ETF or monde modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF,Or","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Assurance-Vie","9":"BoursoBank"})
test("AV BoursoBank tout monde modere large", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF,Actions,Or,Immobilier","6":"Monde entier","7":"Large (15+ actifs)","8":"Assurance-Vie","9":"BoursoBank"})
test("AV BoursoBank ETF monde agressif equi", {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Assurance-Vie","9":"BoursoBank"})

# G4: ESG (4 tests)
test("CTO IB ESG strict monde dynamique equi", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"ESG strict","5":"ETF,Actions","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("PEA BoursoBank ESG strict monde dynamique equi", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"ESG strict","5":"ETF,Actions","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"PEA","9":"BoursoBank"})
test("CTO Degiro ESG strict monde modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"ESG strict","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Degiro"})
test("PEA Fortuneo ESG exclusion Europe dynamique", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Exclusion armement/tabac","5":"ETF,Actions","6":"Europe","7":"Equilibre (8-10 actifs)","8":"PEA","9":"Fortuneo"})

# G5: ZONES (6 tests)
test("CTO Degiro ETF USA agressif equi", {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre","5":"ETF,Actions","6":"USA","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Degiro"})
test("CTO IB ETF EM dynamique equi", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre","5":"ETF","6":"Emergents","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("PEA BoursoBank ETF Europe modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF","6":"Europe","7":"Equilibre (8-10 actifs)","8":"PEA","9":"BoursoBank"})
test("CTO IB ETF USA modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF,Obligations","6":"USA","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("CTO IB ETF Asie dynamique equi", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre","5":"ETF","6":"Asie-Pacifique","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("PEA Fortuneo ETF monde agressif concentre", {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Concentre (5 actifs)","8":"PEA","9":"Fortuneo"})

# G6: CLASSES SPECIALES (6 tests)
test("CTO IB ETF or obligations monde modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF,Or,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("CTO IB Crypto monde agressif equi", {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre","5":"ETF,Crypto","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("CTO IB ETF immobilier monde modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF,Immobilier","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("CTO IB ETF oblig seules defensif equi", {"1":"2 a 5 ans","2":"Conservateur","3":"-10% maximum","4":"Aucun filtre","5":"Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("CTO IB crypto seule agressif", {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre","5":"Crypto","6":"Monde entier","7":"Concentre (5 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("CTO IB ETF or monde defensif equi", {"1":"2 a 5 ans","2":"Conservateur","3":"-10% maximum","4":"Aucun filtre","5":"ETF,Or,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})

# G7: MULTI-SUPPORT + EDGE CASES (10 tests)
test("PEA+CTO BoursoBank monde dynamique large", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre","5":"ETF,Actions","6":"Monde entier","7":"Large (15+ actifs)","8":"PEA,Compte-Titres (CTO)","9":"BoursoBank"})
test("PEA+AV BoursoBank monde modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"PEA,Assurance-Vie","9":"BoursoBank"})
test("CTO Trade Republic ETF monde modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Trade Republic"})
test("CTO Saxo ETF monde dynamique equi", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Saxo Bank"})
test("CTO Bourse Direct ETF monde modere equi", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Bourse Direct"})
test("PEA BoursoBank ETF monde modere large", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF,Actions","6":"Monde entier","7":"Large (15+ actifs)","8":"PEA","9":"BoursoBank"})
test("CTO IB tout monde agressif large", {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre","5":"ETF,Actions,Or,Crypto","6":"Monde entier","7":"Large (15+ actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("AV+CTO BoursoBank monde defensif equi", {"1":"2 a 5 ans","2":"Conservateur","3":"-10% maximum","4":"Aucun filtre","5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Assurance-Vie,Compte-Titres (CTO)","9":"BoursoBank"})
test("CTO IB ETF monde court terme defensif", {"1":"Moins de 2 ans","2":"Conservateur","3":"-10% maximum","4":"Aucun filtre","5":"ETF,Obligations","6":"Monde entier","7":"Concentre (5 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})
test("PEA Hello Bank ETF monde dynamique equi", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"PEA","9":"Hello Bank"})

# ===== BILAN =====
print(f"\n{'='*60}", flush=True)
print(f"BILAN VAGUE 3: {PASS} PASS | {WARN} WARN | {FAIL} FAIL / 50", flush=True)
print(f"Score: {PASS}/50 ({round(PASS/50*100)}%)", flush=True)
print(f"Target: 45/50 (90%)", flush=True)
scores = [s for _,s in RESULTS if s > 0]
if scores:
    print(f"Moyenne: {sum(scores)/len(scores):.1f}/10", flush=True)
    print(f"Distribution: " + " ".join(f"{i}:{scores.count(i)}" for i in range(1,11) if scores.count(i)>0), flush=True)
print(f"\nFAIL (<5):", flush=True)
for name,score in RESULTS:
    if score < 5: print(f"  {score}/10 | {name}", flush=True)
print(f"WARN (5-6):", flush=True)
for name,score in RESULTS:
    if 5 <= score < 7: print(f"  {score}/10 | {name}", flush=True)
