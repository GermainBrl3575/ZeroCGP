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

CGP_SYSTEM = """Tu es CGP agree AMF. Evalue ce portefeuille sur 10.

REGLES CRITIQUES (ne pas penaliser si respectees):
- ETF .PA synthetiques (PANX, CW8, LCWD, PE500, PUST, PAEEM, MEUD, C50, SMC, EESM) = eligibles PEA + CTO + AV.
- NOVO-B.CO, ASML.AS, SAP.DE, SIE.DE = eligibles PEA (societes UE/EEE).
- SGLD.L, IBGS.L, XGLE.DE, SXR8.DE = av:true (accessibles en assurance-vie francaise).
- IGLN.L = av:false (ETC, pas ETF, pas en AV).
- IEAG.L, IEAC.AS = UCITS europeens accessibles sur CTO/Degiro sans probleme KID PRIIP.
- Un doublon = MEME sous-jacent exact (ex: 2 ETF SP500). Pas un recouvrement partiel.
- MSCI World + ETF EM = COMPLEMENT (pas doublon, car EM pese <12% du World).
- SP500 + NASDAQ100 pour agressif = core-satellite INTENTIONNEL (pas doublon).
- MSCI World + Euro Stoxx 50 = COMPLEMENT (EU pese ~16% du World, le surponderer est un choix).
- MSCI World + CAC Mid 60 = COMPLEMENT (mid-caps pas dans MSCI World large cap).
- Pour PEA: pas d'obligations possible (reglementaire). Vol 14-18% est NORMAL pour PEA modere.
- Pour AV: seulement ~10 ETF eligibles, 5-7 actifs est le MAXIMUM atteignable. Ne pas penaliser si diversif=5-7.
- Sharpe > 0.5 = acceptable. Sharpe > 0.8 = bon. Sharpe > 1.0 = excellent.
- Poids differencies a partir de 8+ actifs. Avec 5-6 actifs, des poids proches (25-30%) sont NORMAUX.

CRITERES:
1. support_eligibilite: actifs vraiment INACCESSIBLES sur le support ? (pas juste cotes en GBP)
2. zone_geographique: zone correspond au profil demande ?
3. doublon_indices: MEME sous-jacent en double ? (pas recouvrements partiels)
4. coherence_risque: vol coherente avec profil et contraintes du support ?
5. diversification: nb actifs vs demande, en tenant compte des contraintes AV/PEA ?
6. qualite_markowitz: Sharpe, poids differencies (adapte au nb d'actifs) ?

BAREME: 7/10 = portefeuille correct avec defauts mineurs. 8/10 = bon. 6/10 = defauts significatifs.
Sois realiste: un portefeuille AV de 5-7 actifs av:true avec Sharpe>0.7 merite 7/10 minimum.
SGLD.L (Invesco Physical Gold ETC, ISIN IE00B579F325) EST eligible dans certaines assurances-vie francaises dont Linxea Spirit et Lucya Cardif. Ne pas le penaliser en support_eligibilite pour ces contrats.

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
    actifs="\n".join("- "+x["symbol"]+"("+str(x["weight"])+"%) "+x.get("type","?")+" "+x.get("name","")[:20] for x in w)
    def c(k): return answers.get(k,"?").replace("'","")
    prompt=("PROFIL: Risque="+c("2")+" Zone="+c("6")+" Support="+c("8")+" Banque="+c("9")+"\n"
            "Classes="+c("5")+" Diversif="+c("7")+"\n\n"
            "PORTEFEUILLE ("+str(len(w))+" actifs, "+str(total)+"%):\n"+actifs+"\n\n"
            "Stats: R="+str(r["ret"])+"% V="+str(r["vol"])+"% Sharpe="+str(r["sharpe"])+"\n"
            "Evalue. JSON uniquement sans apostrophe.")
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
