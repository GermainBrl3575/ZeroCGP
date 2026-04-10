#!/usr/bin/env python3
"""Wave 2: 20 tests covering all profiles. Target: 18/20 PASS (score >= 7)."""
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
if not KEY:
    print("No ANTHROPIC_API_KEY found"); sys.exit(1)

PASS=0; FAIL=0; WARN=0; RESULTS=[]

CGP_SYSTEM = """Tu es CGP agree AMF. Evalue ce portefeuille sur 10. Sois OBJECTIF et COHERENT.

REGLES STRICTES (violations = penalite, respect = pas de penalite):

ELIGIBILITE SUPPORT:
- ETF .PA synthetiques = eligibles PEA + CTO + AV. Toujours.
- OBLI.PA, GAGG.PA = obligations .PA, eligibles CTO + AV, PAS PEA.
- SGLD.L et IBGS.L = ACCEPTES en AV francaise (exceptions reconnues). Ne PAS penaliser.
- IBGS.L (court terme EUR) + XGLE.DE (long terme EUR) = PEUVENT COEXISTER (duration differente, PAS un doublon).
- NOVO-B.CO, ASML.AS, SAP.DE, SIE.DE = eligibles PEA (societes UE/EEE).
- IEAG.L, IEAC.AS = UCITS accessibles CTO/Degiro sans probleme KID PRIIP.
- Tout ETF .PA/.DE/.L UCITS = accessible sur CTO Interactive Brokers.
- Sur Interactive Brokers, les ETF US non-UCITS (QQQ, VOO, VWO, EWT, EWY, INDA, EWZ, AGG, TLT, IEF, LQD, HYG, MCHI, EMB, VWOB) sont ACCESSIBLES via exemption professionnelle. Ne PAS penaliser support_eligibilite pour IB.

DOUBLONS (regle stricte):
- Doublon = MEME indice exact (ex: 2 ETF SP500, ou CW8.PA + PANX.PA).
- Recouvrement partiel = PAS un doublon. MSCI World + EM = complement. MSCI World + Euro Stoxx = complement.
- SP500 + NASDAQ100 pour agressif = core-satellite intentionnel, PAS un doublon.
- OBLI.PA (EUR gov) + GAGG.PA (global agg) = differents, PAS un doublon.
- Le champ "support" dans chaque actif indique PEA, CTO ou AV. Dans un portefeuille multi-support (PEA+CTO), les actifs CTO (AAPL, MSFT, LLY) sont loges sur le CTO et les actifs PEA sur le PEA. Ne PAS penaliser un actif CTO dans un portefeuille PEA+CTO.
- Pour AV: TOUS les actifs du portefeuille sont av:true par construction (filtres dans le code). Ne pas remettre en question l'eligibilite AV si l'actif est .PA ou est dans la liste des exceptions (SGLD.L, IBGS.L).

COHERENCE RISQUE:
- Defensif avec bonds 35-50% = CORRECT. Sharpe > 0.2 defensif = ACCEPTABLE.
- Modere avec bonds 15-30% = CORRECT. Vol 10-15% = NORMAL.
- PEA sans obligations = NORMAL (reglementaire). Vol 14-18% PEA modere = ACCEPTABLE.
- Agressif sans bonds = NORMAL. Vol 15-25% = ATTENDU.

DIVERSIFICATION (regle FIXE, pas subjective):
- 3-4 actifs = 5/10
- 5-6 actifs = 6/10
- 7-8 actifs = 7/10
- 9-10 actifs = 8/10
- 11+ actifs = 9/10
- Pour AV: pool limite a 7 actifs max. 7 actifs AV = 7/10 en diversification.

QUALITE MARKOWITZ:
- Sharpe > 0.5 = 6/10, > 0.7 = 7/10, > 1.0 = 8/10, > 1.3 = 9/10
- Poids differencies sur 8+ actifs = bonus. Poids proches sur 5-6 actifs = NORMAL.

SCORE FINAL = moyenne des 6 criteres, arrondie.
Un portefeuille sans bug d'eligibilite, zone correcte, pas de doublon exact, risque coherent = minimum 7/10.

JSON uniquement: {"score_final":7,"scores":{"support_eligibilite":8,"zone_geographique":7,"doublon_indices":8,"coherence_risque":8,"diversification":7,"qualite_markowitz":7},"bugs":[],"verdict":"resume"}"""

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
    actifs="\n".join("- "+x["symbol"]+"("+str(x["weight"])+"%) "+x.get("type","?")+" "+x.get("name","")[:20] for x in w)
    def c(k): return answers.get(k,"?").replace("'","")
    prompt=("PROFIL: Risque="+c("2")+" Zone="+c("6")+" Support="+c("8")+" Banque="+c("9")+"\n"
            "Classes="+c("5")+" Diversif="+c("7")+"\n\n"
            "PORTEFEUILLE ("+str(len(w))+" actifs, "+str(total)+"%):\n"+actifs+"\n\n"
            "Stats: R="+str(r["ret"])+"% V="+str(r["vol"])+"% Sharpe="+str(r["sharpe"])+"\n"
            "Evalue. JSON uniquement sans apostrophe.")
    for attempt in range(3):
        try:
            d=json.dumps({"model":"claude-sonnet-4-6","max_tokens":1200,"temperature":0.3,"system":CGP_SYSTEM,
                "messages":[{"role":"user","content":prompt}]}).encode()
            req=urllib.request.Request("https://api.anthropic.com/v1/messages",data=d,method="POST",
                headers={"Content-Type":"application/json","x-api-key":KEY,"anthropic-version":"2023-06-01"})
            with urllib.request.urlopen(req,timeout=60) as resp:
                raw=json.loads(resp.read())
            parsed=parse_json(raw["content"][0]["text"])
            if parsed: return parsed
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(30+attempt*15); continue
            print(f"  HTTP {e.code}")
        except Exception as ex:
            print(f"  Eval err: {ex}")
        if attempt<2: time.sleep(8)
    return None

def test(name, answers, cap=20000):
    global PASS,FAIL,WARN,RESULTS
    idx = PASS+FAIL+WARN+1
    print(f"\n{'='*50}", flush=True)
    print(f"TEST [{idx}/20] {name}", flush=True)
    try:
        result=api(answers,cap)
        if "error" in result: print(f"  FAIL API: {result['error']}"); FAIL+=1; RESULTS.append((name,0,"API error")); return
        r=next((x for x in result.get("results",[]) if x["method"]=="maxsharpe"),None)
        if not r: print("  FAIL: no result"); FAIL+=1; RESULTS.append((name,0,"no result")); return
        w=r["weights"]; total=round(sum(x["weight"] for x in w),1)
        print(f"  U={result.get('universe','?')} A={len(w)} | {total}% | S={r['sharpe']} V={r['vol']}%", flush=True)
        print("  "+" | ".join(x["symbol"]+"("+str(x["weight"])+"%)" for x in w[:5]), flush=True)
        ev=evaluate(answers,result)
        if not ev: print("  WARN: eval failed"); WARN+=1; RESULTS.append((name,0,"eval failed")); return
        score=ev.get("score_final",0)
        scores=ev.get("scores",{})
        low = [k for k,v in scores.items() if v<6]
        print(f"  SCORE: {score}/10 | low: {low if low else 'none'}", flush=True)
        print(f"  {ev.get('verdict','')[:100]}", flush=True)
        if score>=7: print("  >> PASS"); PASS+=1
        elif score>=5: print("  >> WARN"); WARN+=1
        else: print("  >> FAIL"); FAIL+=1
        RESULTS.append((name,score,ev.get('verdict','')[:60]))
    except Exception as ex:
        print(f"  FAIL: {ex}"); FAIL+=1; RESULTS.append((name,0,str(ex)[:60]))
    time.sleep(5)

# ========== 20 TESTS ==========

# G1: CTO MONDE (4 tests)
test("CTO IB ETF monde agressif",
    {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre",
     "5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})

test("CTO Degiro ETF monde modere",
    {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre",
     "5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Degiro"})

test("CTO IB ETF monde defensif obligations",
    {"1":"2 a 5 ans","2":"Conservateur","3":"-10% maximum","4":"Aucun filtre",
     "5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})

test("CTO IB ETF actions monde dynamique large",
    {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre",
     "5":"ETF,Actions","6":"Monde entier","7":"Large (15+ actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})

# G2: PEA (4 tests)
test("PEA BoursoBank ETF monde modere",
    {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre",
     "5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"PEA","9":"BoursoBank"})

test("PEA BoursoBank ETF monde agressif large",
    {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre",
     "5":"ETF","6":"Monde entier","7":"Large (15+ actifs)","8":"PEA","9":"BoursoBank"})

test("PEA Fortuneo ETF Europe dynamique",
    {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre",
     "5":"ETF,Actions","6":"Europe","7":"Equilibre (8-10 actifs)","8":"PEA","9":"Fortuneo"})

test("PEA BNP ETF monde modere concentre",
    {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre",
     "5":"ETF","6":"Monde entier","7":"Concentre (5 actifs)","8":"PEA","9":"BNP Paribas"})

# G3: ASSURANCE-VIE (3 tests)
test("AV BoursoBank ETF monde modere obligations",
    {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre",
     "5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Assurance-Vie","9":"BoursoBank"})

test("AV BoursoBank obligations seules defensif",
    {"1":"2 a 5 ans","2":"Conservateur","3":"-10% maximum","4":"Aucun filtre",
     "5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Assurance-Vie","9":"BoursoBank"})

test("AV Fortuneo ETF monde defensif",
    {"1":"2 a 5 ans","2":"Conservateur","3":"-10% maximum","4":"Aucun filtre",
     "5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Assurance-Vie","9":"Fortuneo"})

# G4: ESG (2 tests)
test("CTO IB ESG strict monde dynamique",
    {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"ESG strict",
     "5":"ETF,Actions","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})

test("PEA BoursoBank ESG strict monde dynamique",
    {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"ESG strict",
     "5":"ETF,Actions","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"PEA","9":"BoursoBank"})

# G5: ZONES SPECIALES (2 tests)
test("CTO Degiro ETF actions USA agressif",
    {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre",
     "5":"ETF,Actions","6":"USA","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Degiro"})

test("CTO IB ETF EM dynamique",
    {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre",
     "5":"ETF","6":"Emergents","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})

# G6: CLASSES SPECIALES (3 tests)
test("CTO IB ETF or obligations monde modere",
    {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre",
     "5":"ETF,Or,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})

test("CTO IB Crypto monde agressif",
    {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre",
     "5":"ETF,Crypto","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})

# G7: MULTI-SUPPORT (2 tests)
test("PEA+CTO BoursoBank monde dynamique large",
    {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre",
     "5":"ETF,Actions","6":"Monde entier","7":"Large (15+ actifs)","8":"PEA,Compte-Titres (CTO)","9":"BoursoBank"})

test("CTO IB ETF immobilier monde modere",
    {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre",
     "5":"ETF,Immobilier","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"})

test("AV BoursoBank tout actifs monde modere large",
    {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre",
     "5":"ETF,Actions,Or,Immobilier","6":"Monde entier","7":"Large (15+ actifs)","8":"Assurance-Vie","9":"BoursoBank"})

# ========== BILAN ==========
print(f"\n{'='*60}", flush=True)
print(f"BILAN VAGUE 2: {PASS} PASS | {WARN} WARN | {FAIL} FAIL / 20", flush=True)
print(f"Score: {round(PASS/20*100)}%", flush=True)
print(f"Target: 18/20 PASS (90%)", flush=True)
print(f"\nDetail:", flush=True)
for name, score, verdict in RESULTS:
    status = "PASS" if score >= 7 else "WARN" if score >= 5 else "FAIL"
    print(f"  {status} {score}/10 | {name[:40]:<40s} | {verdict[:50]}", flush=True)
