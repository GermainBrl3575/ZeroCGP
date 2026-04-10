#!/usr/bin/env python3
"""Diagnostic des 5 WARN de Wave 2 — portefeuille + scores détaillés."""
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

CGP_SYSTEM = open("test_wave2_20.py").read().split('CGP_SYSTEM = """')[1].split('"""')[0]

def parse_json(text):
    text = text.replace("```json","").replace("```","").strip()
    s=text.find("{"); e=text.rfind("}")+1
    if s<0: return None
    try: return json.loads(text[s:e])
    except:
        out={"scores":{},"bugs":[],"score_final":5,"verdict":"?"}
        m=re.search(r'"score_final"\s*:\s*(\d+)',text[s:e])
        if m: out["score_final"]=int(m.group(1))
        for k in ["support_eligibilite","zone_geographique","doublon_indices","coherence_risque","diversification","qualite_markowitz"]:
            m2=re.search('"'+k+r'"\s*:\s*(\d+)',text[s:e])
            if m2: out["scores"][k]=int(m2.group(1))
        return out

def test(name, answers):
    print(f"\n{'='*60}")
    print(f"WARN: {name}")
    d = json.dumps({"capital":20000,"answers":answers}).encode()
    req = urllib.request.Request(f"{BASE_URL}/api/optimize", data=d, method="POST", headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        result = json.loads(resp.read())
    r = next(x for x in result.get("results",[]) if x["method"]=="maxsharpe")
    dbg = result.get("debug",{})
    w = r["weights"]

    print(f"Pool: req={dbg.get('requested',0)} valid={dbg.get('valid',0)} output={len(w)}")
    print(f"Stats: R={r['ret']}% V={r['vol']}% Sharpe={r['sharpe']}")
    bonds = sum(x["weight"] for x in w if x["type"]=="bond")
    gold = sum(x["weight"] for x in w if x["type"]=="gold")
    print(f"Bonds={bonds:.0f}% Gold={gold:.0f}% Equity={100-bonds-gold:.0f}%")
    print(f"Actifs:")
    for x in w:
        print(f"  {x['symbol']:14s} {x['weight']:5.1f}% {x['type']:8s} {x.get('name','')[:25]}")

    # CGP eval
    actifs = "\n".join(f"- {x['symbol']}({x['weight']}%) {x['type']} {x.get('name','')[:20]}" for x in w)
    def c(k): return answers.get(k,"?")
    prompt = (f"PROFIL: Risque={c('2')} Zone={c('6')} Support={c('8')} Banque={c('9')}\n"
              f"Classes={c('5')} Diversif={c('7')}\n\n"
              f"PORTEFEUILLE ({len(w)} actifs, {sum(x['weight'] for x in w):.0f}%):\n{actifs}\n\n"
              f"Stats: R={r['ret']}% V={r['vol']}% Sharpe={r['sharpe']}\nEvalue. JSON uniquement.")

    d2 = json.dumps({"model":"claude-sonnet-4-6","max_tokens":1500,"temperature":0.3,
        "system":CGP_SYSTEM,"messages":[{"role":"user","content":prompt}]}).encode()
    req2 = urllib.request.Request("https://api.anthropic.com/v1/messages", data=d2, method="POST",
        headers={"Content-Type":"application/json","x-api-key":KEY,"anthropic-version":"2023-06-01"})
    with urllib.request.urlopen(req2, timeout=60) as resp2:
        raw = json.loads(resp2.read())
    ev = parse_json(raw["content"][0]["text"])

    print(f"\nSCORES DETAILLES:")
    for k,v in ev.get("scores",{}).items():
        flag = " << LOW" if v < 7 else ""
        print(f"  {k:25s} {v}/10{flag}")
    print(f"SCORE FINAL: {ev.get('score_final',0)}/10")
    print(f"VERDICT: {ev.get('verdict','?')[:120]}")
    for b in ev.get("bugs",[])[:3]:
        print(f"  BUG: {b[:100]}")
    time.sleep(5)

TESTS = [
    ("CTO IB ETF monde agressif", {"1":"10 ans et plus","2":"Agressif","3":"Pas de limite","4":"Aucun filtre","5":"ETF","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"}),
    ("CTO Degiro ETF monde modere", {"1":"5 a 10 ans","2":"Modere","3":"-20% maximum","4":"Aucun filtre","5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Degiro"}),
    ("CTO IB ETF monde defensif", {"1":"2 a 5 ans","2":"Conservateur","3":"-10% maximum","4":"Aucun filtre","5":"ETF,Obligations","6":"Monde entier","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"}),
    ("CTO IB ETF EM dynamique", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre","5":"ETF","6":"Emergents","7":"Equilibre (8-10 actifs)","8":"Compte-Titres (CTO)","9":"Interactive Brokers"}),
    ("PEA+CTO BoursoBank monde dynamique large", {"1":"10 ans et plus","2":"Dynamique","3":"-35% maximum","4":"Aucun filtre","5":"ETF,Actions","6":"Monde entier","7":"Large (15+ actifs)","8":"PEA,Compte-Titres (CTO)","9":"BoursoBank"}),
]

for name, answers in TESTS:
    test(name, answers)
