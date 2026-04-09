#!/usr/bin/env python3
"""Populate assets_master with pea/cto/av/zone/dedup/ter/excl_esg flags."""
import psycopg2, os

NEON_URL = os.environ.get("NEON_DATABASE_URL",
    "postgresql://neondb_owner:npg_oG6NYIRxQn0S@ep-little-paper-alp3o3yc-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require")

# Hardcoded overrides from MASTER_PROMPT (critical assets)
OVERRIDES = {
    # ETF MONDE
    "CW8.PA":   {"pea":True,  "av":True,  "zone":"monde","dedup":"MSCI_WORLD",   "ter":0.12},
    "PANX.PA":  {"pea":True,  "av":True,  "zone":"monde","dedup":"MSCI_WORLD",   "ter":0.13},
    "EWLD.PA":  {"pea":True,  "av":True,  "zone":"monde","dedup":"MSCI_WORLD",   "ter":0.12},
    "IWDA.AS":  {"pea":False, "av":False, "zone":"monde","dedup":"MSCI_WORLD",   "ter":0.20},
    "EUNL.DE":  {"pea":False, "av":False, "zone":"monde","dedup":"MSCI_WORLD",   "ter":0.20},
    "SUWS.L":   {"pea":False, "av":False, "zone":"monde","dedup":"MSCI_WORLD",   "ter":0.20, "esg":True},
    "VWCE.DE":  {"pea":False, "av":False, "zone":"monde","dedup":"FTSE_ALLWORLD","ter":0.22},
    "ACWI":     {"pea":False, "av":False, "zone":"monde","dedup":"MSCI_ACWI",    "ter":0.32},
    # SP500
    "PE500.PA": {"pea":True,  "av":True,  "zone":"usa",  "dedup":"SP500",        "ter":0.15},
    "PSP5.PA":  {"pea":True,  "av":True,  "zone":"usa",  "dedup":"SP500",        "ter":0.15},
    "ESE.PA":   {"pea":True,  "av":True,  "zone":"usa",  "dedup":"SP500",        "ter":0.15},
    "SXR8.DE":  {"pea":False, "av":True,  "zone":"usa",  "dedup":"SP500",        "ter":0.07},
    "CSPX.L":   {"pea":False, "av":False, "zone":"usa",  "dedup":"SP500",        "ter":0.07},
    "VOO":      {"pea":False, "av":False, "zone":"usa",  "dedup":"SP500",        "ter":0.03},
    "SPY":      {"pea":False, "av":False, "zone":"usa",  "dedup":"SP500",        "ter":0.095},
    "VTI":      {"pea":False, "av":False, "zone":"usa",  "dedup":"SP500",        "ter":0.03},
    # NASDAQ
    "PUST.PA":  {"pea":True,  "av":True,  "zone":"usa",  "dedup":"NASDAQ100",    "ter":0.23},
    "EQQQ.DE":  {"pea":False, "av":False, "zone":"usa",  "dedup":"NASDAQ100",    "ter":0.30},
    "QQQ":      {"pea":False, "av":False, "zone":"usa",  "dedup":"NASDAQ100",    "ter":0.20},
    # EUROPE
    "C50.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"EUROSTOXX50", "ter":0.10},
    "EXSA.DE":  {"pea":True,  "av":False, "zone":"europe","dedup":"EUROSTOXX50", "ter":0.10},
    "MEUD.PA":  {"pea":True,  "av":True,  "zone":"europe","dedup":"EUROSTOXX50", "ter":0.11},
    "SMEA.PA":  {"pea":True,  "av":True,  "zone":"europe","dedup":"MSCI_EUROPE", "ter":0.15},
    "EXW1.DE":  {"pea":False, "av":False, "zone":"europe","dedup":"MSCI_EUROPE", "ter":0.12},
    "EPRE.PA":  {"pea":True,  "av":True,  "zone":"europe","dedup":"EU_REITS",    "ter":0.40},
    "IPRP.L":   {"pea":False, "av":False, "zone":"europe","dedup":"EU_REITS",    "ter":0.40},
    # EM
    "PAEEM.PA": {"pea":True,  "av":True,  "zone":"em",   "dedup":"MSCI_EM",      "ter":0.20},
    "AEEM.PA":  {"pea":True,  "av":True,  "zone":"em",   "dedup":"MSCI_EM",      "ter":0.25, "esg":True},
    "VWO":      {"pea":False, "av":False, "zone":"em",   "dedup":"FTSE_EM",      "ter":0.08},
    "IEMG":     {"pea":False, "av":False, "zone":"em",   "dedup":"FTSE_EM",      "ter":0.11},
    "VFEM.L":   {"pea":False, "av":False, "zone":"em",   "dedup":"FTSE_EM",      "ter":0.22},
    "MCHI":     {"pea":False, "av":False, "zone":"em",   "dedup":"MSCI_CHINA",   "ter":0.19},
    "KWEB":     {"pea":False, "av":False, "zone":"em",   "dedup":"CHINA_NET",    "ter":0.70},
    "INDA":     {"pea":False, "av":False, "zone":"em",   "dedup":"MSCI_INDIA",   "ter":0.64},
    "EWZ":      {"pea":False, "av":False, "zone":"em",   "dedup":"MSCI_BRAZIL",  "ter":0.59},
    "EWY":      {"pea":False, "av":False, "zone":"em",   "dedup":"MSCI_KOREA",   "ter":0.49},
    "EWT":      {"pea":False, "av":False, "zone":"em",   "dedup":"MSCI_TAIWAN",  "ter":0.59},
    "EWH":      {"pea":False, "av":False, "zone":"em",   "dedup":"MSCI_HK",      "ter":0.49},
    # OBLIGATIONS
    "XGLE.DE":  {"pea":False, "av":True,  "zone":"europe","dedup":"EUR_GOV",     "ter":0.09},
    "IBGS.L":   {"pea":False, "av":True,  "zone":"europe","dedup":"EUR_GOV_ST",  "ter":0.09},
    "IEAG.L":   {"pea":False, "av":False, "zone":"europe","dedup":"EUR_AGG",     "ter":0.17},
    "AGGH.L":   {"pea":False, "av":False, "zone":"any",   "dedup":"GLOBAL_AGG",  "ter":0.10},
    "TLT":      {"pea":False, "av":False, "zone":"usa",   "dedup":"US_20Y",      "ter":0.15},
    "IEF":      {"pea":False, "av":False, "zone":"usa",   "dedup":"US_7_10Y",    "ter":0.15},
    "AGG":      {"pea":False, "av":False, "zone":"usa",   "dedup":"US_AGG",      "ter":0.03},
    "LQD":      {"pea":False, "av":False, "zone":"usa",   "dedup":"US_IG",       "ter":0.14},
    "HYG":      {"pea":False, "av":False, "zone":"usa",   "dedup":"US_HY",       "ter":0.48},
    "VWOB":     {"pea":False, "av":False, "zone":"em",    "dedup":"EM_GOV",      "ter":0.20},
    "SHY":      {"pea":False, "av":False, "zone":"usa",   "dedup":"US_1_3Y",     "ter":0.15},
    "BND":      {"pea":False, "av":False, "zone":"usa",   "dedup":"US_TOTAL",    "ter":0.03},
    "TIP":      {"pea":False, "av":False, "zone":"usa",   "dedup":"US_TIPS",     "ter":0.19},
    "EMB":      {"pea":False, "av":False, "zone":"em",    "dedup":"EM_BOND_USD", "ter":0.39},
    # OR
    "SGLD.L":   {"pea":False, "av":True,  "zone":"any",  "dedup":"GOLD_EU",     "ter":0.12},
    "GLD":      {"pea":False, "av":False, "zone":"any",  "dedup":"GOLD_US",     "ter":0.40},
    "IAU":      {"pea":False, "av":False, "zone":"any",  "dedup":"GOLD_US",     "ter":0.25},
    "GNR":      {"pea":False, "av":False, "zone":"any",  "dedup":"NAT_RES",     "ter":0.46},
    "GSG":      {"pea":False, "av":False, "zone":"any",  "dedup":"CMDTY",       "ter":0.75},
    "GDX":      {"pea":False, "av":False, "zone":"any",  "dedup":"GOLD_MINERS", "ter":0.51},
    # REIT
    "VNQ":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_REITS",    "ter":0.12},
    "REET":     {"pea":False, "av":False, "zone":"any",  "dedup":"GLOBAL_REITS","ter":0.14},
    "AMT":      {"pea":False, "av":False, "zone":"usa",  "dedup":"AMT",         "ter":0},
    "IYR":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_REITS2",   "ter":0.39},
    "XLRE":     {"pea":False, "av":False, "zone":"usa",  "dedup":"US_REITS3",   "ter":0.10},
    "DLR":      {"pea":False, "av":False, "zone":"usa",  "dedup":"DLR",         "ter":0},
    "PLD":      {"pea":False, "av":False, "zone":"usa",  "dedup":"PLD",         "ter":0},
    # CRYPTO
    "BTC-USD":  {"pea":False, "av":False, "zone":"any",  "dedup":"BTC",         "ter":0, "cto":False},
    "ETH-USD":  {"pea":False, "av":False, "zone":"any",  "dedup":"ETH",         "ter":0, "cto":False},
    "SOL-USD":  {"pea":False, "av":False, "zone":"any",  "dedup":"SOL",         "ter":0, "cto":False},
    "BNB-USD":  {"pea":False, "av":False, "zone":"any",  "dedup":"BNB",         "ter":0, "cto":False},
    "IBIT":     {"pea":False, "av":False, "zone":"usa",  "dedup":"BTC",         "ter":0.25},
    "ETHA":     {"pea":False, "av":False, "zone":"usa",  "dedup":"ETH",         "ter":0.25},
    # SECTORIELS US
    "XLK":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_TECH",     "ter":0.10},
    "IGV":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_SOFTWARE", "ter":0.41},
    "SOXX":     {"pea":False, "av":False, "zone":"usa",  "dedup":"US_SEMIS",    "ter":0.35},
    "SMH":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_SEMIS2",   "ter":0.35},
    "XLV":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_HEALTH",   "ter":0.10},
    "IBB":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_BIOTECH",  "ter":0.44},
    "XLF":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_FINANCE",  "ter":0.10},
    "XLE":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_ENERGY",   "ter":0.10},
    "XLI":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_INDUS",    "ter":0.10},
    "XLY":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_CONS_D",   "ter":0.10},
    "XLP":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_CONS_S",   "ter":0.10},
    "ITA":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_DEFENSE",  "ter":0.40, "excl_esg":True},
    "PPA":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_AERO",     "ter":0.58, "excl_esg":True},
    # FACTORIELS US
    "IWM":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_SMALL",    "ter":0.19},
    "IJR":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_SMALL2",   "ter":0.06},
    "IJH":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_MID",      "ter":0.05},
    "VYM":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_DIV",      "ter":0.06},
    "DVY":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_DIV2",     "ter":0.38},
    "SCHD":     {"pea":False, "av":False, "zone":"usa",  "dedup":"US_DIV3",     "ter":0.06},
    "VIG":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_DIVGROW",  "ter":0.06},
    "MTUM":     {"pea":False, "av":False, "zone":"usa",  "dedup":"US_MOMENTUM", "ter":0.15},
    "USMV":     {"pea":False, "av":False, "zone":"usa",  "dedup":"US_MINVOL",   "ter":0.15},
    "VTV":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_VALUE",    "ter":0.04},
    "VUG":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_GROWTH",   "ter":0.04},
    "RSP":      {"pea":False, "av":False, "zone":"usa",  "dedup":"US_EW",       "ter":0.20},
    # MONDE ETENDU
    "EFA":      {"pea":False, "av":False, "zone":"monde","dedup":"MSCI_EAFE",   "ter":0.32},
    "VEA":      {"pea":False, "av":False, "zone":"monde","dedup":"FTSE_DEV",    "ter":0.05},
    "EWJ":      {"pea":False, "av":False, "zone":"em",   "dedup":"MSCI_JAPAN",  "ter":0.49},
    "EWA":      {"pea":False, "av":False, "zone":"em",   "dedup":"MSCI_AUS",    "ter":0.49},
    "EWC":      {"pea":False, "av":False, "zone":"usa",  "dedup":"MSCI_CAN",    "ter":0.49},
    "VGK":      {"pea":False, "av":False, "zone":"europe","dedup":"FTSE_EUR",   "ter":0.08},
    "EZU":      {"pea":False, "av":False, "zone":"europe","dedup":"MSCI_EMU",   "ter":0.47},
    # ACTIONS USA
    "AAPL":     {"pea":False, "av":False, "zone":"usa",  "dedup":"AAPL",  "ter":0, "esg":True},
    "MSFT":     {"pea":False, "av":False, "zone":"usa",  "dedup":"MSFT",  "ter":0, "esg":True},
    "GOOGL":    {"pea":False, "av":False, "zone":"usa",  "dedup":"GOOGL", "ter":0},
    "AMZN":     {"pea":False, "av":False, "zone":"usa",  "dedup":"AMZN",  "ter":0},
    "NVDA":     {"pea":False, "av":False, "zone":"usa",  "dedup":"NVDA",  "ter":0},
    "META":     {"pea":False, "av":False, "zone":"usa",  "dedup":"META",  "ter":0},
    "TSLA":     {"pea":False, "av":False, "zone":"usa",  "dedup":"TSLA",  "ter":0},
    "V":        {"pea":False, "av":False, "zone":"usa",  "dedup":"V",     "ter":0},
    "MA":       {"pea":False, "av":False, "zone":"usa",  "dedup":"MA",    "ter":0},
    "JNJ":      {"pea":False, "av":False, "zone":"usa",  "dedup":"JNJ",   "ter":0},
    "LLY":      {"pea":False, "av":False, "zone":"usa",  "dedup":"LLY",   "ter":0},
    "JPM":      {"pea":False, "av":False, "zone":"usa",  "dedup":"JPM",   "ter":0},
    "AVGO":     {"pea":False, "av":False, "zone":"usa",  "dedup":"AVGO",  "ter":0},
    "ADBE":     {"pea":False, "av":False, "zone":"usa",  "dedup":"ADBE",  "ter":0, "esg":True},
    "NOW":      {"pea":False, "av":False, "zone":"usa",  "dedup":"NOW",   "ter":0, "esg":True},
    "CRM":      {"pea":False, "av":False, "zone":"usa",  "dedup":"CRM",   "ter":0, "esg":True},
    "NFLX":     {"pea":False, "av":False, "zone":"usa",  "dedup":"NFLX",  "ter":0},
    "PG":       {"pea":False, "av":False, "zone":"usa",  "dedup":"PG",    "ter":0},
    "KO":       {"pea":False, "av":False, "zone":"usa",  "dedup":"KO",    "ter":0},
    "LMT":      {"pea":False, "av":False, "zone":"usa",  "dedup":"LMT",   "ter":0, "excl_esg":True},
    "XOM":      {"pea":False, "av":False, "zone":"usa",  "dedup":"XOM",   "ter":0, "excl_esg":True},
    "MO":       {"pea":False, "av":False, "zone":"usa",  "dedup":"MO",    "ter":0, "excl_esg":True},
    "COST":     {"pea":False, "av":False, "zone":"usa",  "dedup":"COST",  "ter":0},
    "PEP":      {"pea":False, "av":False, "zone":"usa",  "dedup":"PEP",   "ter":0},
    "TMO":      {"pea":False, "av":False, "zone":"usa",  "dedup":"TMO",   "ter":0, "esg":True},
    "BLK":      {"pea":False, "av":False, "zone":"usa",  "dedup":"BLK",   "ter":0},
    "CVX":      {"pea":False, "av":False, "zone":"usa",  "dedup":"CVX",   "ter":0, "excl_esg":True},
    "CAT":      {"pea":False, "av":False, "zone":"usa",  "dedup":"CAT_",  "ter":0},
    "HON":      {"pea":False, "av":False, "zone":"usa",  "dedup":"HON",   "ter":0, "esg":True},
    "DE":       {"pea":False, "av":False, "zone":"usa",  "dedup":"DE",    "ter":0},
    "CMCSA":    {"pea":False, "av":False, "zone":"usa",  "dedup":"CMCSA", "ter":0},
    "ISRG":     {"pea":False, "av":False, "zone":"usa",  "dedup":"ISRG",  "ter":0, "esg":True},
    # ACTIONS EUROPE PEA
    "MC.PA":    {"pea":True,  "av":True,  "zone":"europe","dedup":"MC_PA",  "ter":0},
    "RMS.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"RMS_PA", "ter":0},
    "KER.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"KER_PA", "ter":0},
    "AIR.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"AIR_PA", "ter":0, "esg":True},
    "SAF.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"SAF_PA", "ter":0},
    "SAN.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"SAN_PA", "ter":0, "esg":True},
    "OR.PA":    {"pea":True,  "av":True,  "zone":"europe","dedup":"OR_PA",  "ter":0, "esg":True},
    "SU.PA":    {"pea":True,  "av":True,  "zone":"europe","dedup":"SU_PA",  "ter":0, "esg":True},
    "ENGI.PA":  {"pea":True,  "av":True,  "zone":"europe","dedup":"ENGI_PA","ter":0},
    "VIE.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"VIE_PA", "ter":0, "esg":True},
    "ORA.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"ORA_PA", "ter":0},
    "EL.PA":    {"pea":True,  "av":True,  "zone":"europe","dedup":"EL_PA",  "ter":0},
    "BNP.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"BNP_PA", "ter":0},
    "ASML.AS":  {"pea":True,  "av":True,  "zone":"europe","dedup":"ASML_AS","ter":0, "esg":True},
    "SAP.DE":   {"pea":True,  "av":True,  "zone":"europe","dedup":"SAP_DE", "ter":0, "esg":True},
    "SIE.DE":   {"pea":True,  "av":True,  "zone":"europe","dedup":"SIE_DE", "ter":0, "esg":True},
    "ALV.DE":   {"pea":True,  "av":True,  "zone":"europe","dedup":"ALV_DE", "ter":0},
    "MBG.DE":   {"pea":True,  "av":True,  "zone":"europe","dedup":"MBG_DE", "ter":0},
    "NOVO-B.CO":{"pea":True,  "av":True,  "zone":"europe","dedup":"NOVO_CO","ter":0, "esg":True},
    "NESN.SW":  {"pea":False, "av":True,  "zone":"europe","dedup":"NESN_SW","ter":0, "esg":True},
    "NOVN.SW":  {"pea":False, "av":True,  "zone":"europe","dedup":"NOVN_SW","ter":0, "esg":True},
    "ROG.SW":   {"pea":False, "av":True,  "zone":"europe","dedup":"ROG_SW", "ter":0, "esg":True},
    "DSY.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"DSY_PA", "ter":0, "esg":True},
    "CAP.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"CAP_PA", "ter":0, "esg":True},
    "HO.PA":    {"pea":True,  "av":True,  "zone":"europe","dedup":"HO_PA",  "ter":0, "esg":True},
    "TTE.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"TTE_PA", "ter":0, "excl_esg":True},
    "GLE.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"GLE_PA", "ter":0},
    "SGO.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"SGO_PA", "ter":0, "esg":True},
    "PUB.PA":   {"pea":True,  "av":True,  "zone":"europe","dedup":"PUB_PA", "ter":0, "esg":True},
    "LR.PA":    {"pea":True,  "av":True,  "zone":"europe","dedup":"LR_PA",  "ter":0, "esg":True},
    "BAS.DE":   {"pea":True,  "av":True,  "zone":"europe","dedup":"BAS_DE", "ter":0},
    "BMW.DE":   {"pea":True,  "av":True,  "zone":"europe","dedup":"BMW_DE", "ter":0},
    "IFX.DE":   {"pea":True,  "av":True,  "zone":"europe","dedup":"IFX_DE", "ter":0, "esg":True},
    "PHIA.AS":  {"pea":True,  "av":True,  "zone":"europe","dedup":"PHIA_AS","ter":0, "esg":True},
    # EM Actions
    "BABA":     {"pea":False, "av":False, "zone":"em",   "dedup":"BABA",  "ter":0},
    "TCEHY":    {"pea":False, "av":False, "zone":"em",   "dedup":"TCEHY", "ter":0},
    "JD":       {"pea":False, "av":False, "zone":"em",   "dedup":"JD",    "ter":0},
    "BIDU":     {"pea":False, "av":False, "zone":"em",   "dedup":"BIDU",  "ter":0},
    "SE":       {"pea":False, "av":False, "zone":"em",   "dedup":"SE",    "ter":0},
    "MELI":     {"pea":False, "av":False, "zone":"em",   "dedup":"MELI",  "ter":0},
    "NU":       {"pea":False, "av":False, "zone":"em",   "dedup":"NU",    "ter":0},
}


def deduce_flags(symbol, asset_type, name):
    """Auto-deduce flags for assets not in OVERRIDES."""
    suffix = symbol.split(".")[-1] if "." in symbol else "US"
    if "-" in symbol:  # crypto
        return {"pea": False, "cto": False, "av": False, "zone": "any",
                "dedup": symbol, "ter": 0, "excl_esg": False}

    # AV rules
    av_true = {"XGLE.DE", "SXR8.DE", "SGLD.L", "IBGS.L"}
    if symbol in av_true:
        av = True
    elif suffix == "PA":
        av = True
    else:
        av = False

    # PEA rules
    pea_exchanges = {"PA", "AS", "DE", "MI", "ST", "OL", "HE", "CO"}
    if suffix == "PA":
        pea = True
    elif asset_type == "stock" and suffix in pea_exchanges:
        pea = True
    elif suffix == "SW" or suffix == "L":
        pea = False
    else:
        pea = False

    # Zone
    zone_map = {
        "PA": "europe", "DE": "europe", "AS": "europe",
        "MI": "europe", "ST": "europe", "OL": "europe",
        "HE": "europe", "SW": "europe", "L": "europe",
        "CO": "europe", "US": "usa",
    }
    zone = zone_map.get(suffix, "any")

    cto = True
    excl_esg = False
    excl_keywords = ["oil", "gas", "coal", "defense", "weapon", "tobacco",
                     "altria", "exxon", "chevron", "lockheed", "raytheon"]
    if name:
        excl_esg = any(kw in name.lower() for kw in excl_keywords)

    return {"pea": pea, "cto": cto, "av": av, "zone": zone,
            "dedup": symbol, "ter": 0, "excl_esg": excl_esg}


def main():
    conn = psycopg2.connect(NEON_URL)
    cur = conn.cursor()

    # Get all symbols in assets_master
    cur.execute("SELECT symbol, name, type FROM assets_master")
    rows = cur.fetchall()
    print(f"Found {len(rows)} assets in assets_master")

    updated = 0
    for symbol, name, atype in rows:
        if symbol in OVERRIDES:
            o = OVERRIDES[symbol]
            pea = o.get("pea", False)
            cto = o.get("cto", True)
            av = o.get("av", False)
            zone = o.get("zone", "any")
            dedup = o.get("dedup", symbol)
            ter = o.get("ter", 0)
            excl_esg = o.get("excl_esg", False)
        else:
            flags = deduce_flags(symbol, atype, name)
            pea = flags["pea"]
            cto = flags["cto"]
            av = flags["av"]
            zone = flags["zone"]
            dedup = flags["dedup"]
            ter = flags["ter"]
            excl_esg = flags["excl_esg"]

        cur.execute("""
            UPDATE assets_master
            SET pea=%s, cto=%s, av=%s, zone=%s, dedup=%s, ter=%s, excl_esg=%s
            WHERE symbol=%s
        """, (pea, cto, av, zone, dedup, ter, excl_esg, symbol))
        updated += 1

    conn.commit()
    print(f"Updated {updated} assets")

    # Populate dedup_groups
    cur.execute("DELETE FROM dedup_groups")
    for symbol, o in OVERRIDES.items():
        dedup_key = o.get("dedup", symbol)
        ter = o.get("ter", 0)
        # Only insert if symbol exists in assets_master
        cur.execute("""
            INSERT INTO dedup_groups (symbol, dedup_key, ter)
            SELECT %s, %s, %s WHERE EXISTS (SELECT 1 FROM assets_master WHERE symbol=%s)
            ON CONFLICT (symbol) DO UPDATE SET dedup_key=%s, ter=%s
        """, (symbol, dedup_key, ter, symbol, dedup_key, ter))
    conn.commit()
    cur.execute("SELECT COUNT(*) FROM dedup_groups")
    print(f"Dedup groups: {cur.fetchone()[0]} entries")

    # Populate esg_ratings
    ESG = {
        "MSFT": ("AAA", 9), "AAPL": ("AA", 8), "ADBE": ("AA", 8),
        "ASML.AS": ("AAA", 9), "SAP.DE": ("AAA", 9), "SIE.DE": ("AA", 8),
        "NOVO-B.CO": ("AAA", 9), "OR.PA": ("AA", 8), "SU.PA": ("AAA", 9),
        "AIR.PA": ("AA", 8), "SAN.PA": ("AA", 8), "NESN.SW": ("AA", 8),
        "ROG.SW": ("AA", 8), "NOVN.SW": ("AA", 8), "DSY.PA": ("AAA", 9),
        "NOW": ("AA", 8), "CRM": ("AA", 8), "V": ("AA", 8), "MA": ("AA", 8),
        "LLY": ("AA", 8), "TMO": ("AA", 8), "ISRG": ("AA", 8),
        "AMZN": ("BBB", 5), "GOOGL": ("BBB", 5), "META": ("BBB", 5),
        "NVDA": ("BBB", 5), "NFLX": ("BBB", 5), "JPM": ("BBB", 5),
        "MC.PA": ("BBB", 5), "RMS.PA": ("BBB", 5),
        "XOM": ("B", 2), "CVX": ("B", 2), "TTE.PA": ("BB", 3),
        "LMT": ("B", 2), "MO": ("CCC", 1),
        "SUWS.L": ("AA", 8), "AEEM.PA": ("AA", 8),
        "ENGI.PA": ("AA", 8), "VIE.PA": ("AA", 8),
        "CAP.PA": ("AA", 8), "HO.PA": ("A", 7),
        "SGO.PA": ("AA", 8), "PUB.PA": ("A", 7),
        "LR.PA": ("AA", 8), "IFX.DE": ("AA", 8),
        "PHIA.AS": ("AA", 8), "HON": ("AA", 8),
    }
    cur.execute("DELETE FROM esg_ratings")
    for sym, (rating, score) in ESG.items():
        excl = []
        if rating in ("B", "CCC"):
            excl = ["sector_exclusion"]
        cur.execute("""
            INSERT INTO esg_ratings (symbol, msci_rating, esg_score, exclusions, source)
            VALUES (%s, %s, %s, %s, 'manual')
            ON CONFLICT (symbol) DO UPDATE SET msci_rating=%s, esg_score=%s
        """, (sym, rating, score, excl, rating, score))
    conn.commit()
    cur.execute("SELECT COUNT(*) FROM esg_ratings")
    print(f"ESG ratings: {cur.fetchone()[0]} entries")

    # Verify
    cur.execute("SELECT COUNT(*) FROM assets_master WHERE pea=true")
    print(f"PEA eligible: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM assets_master WHERE av=true")
    print(f"AV eligible: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM assets_master WHERE zone='europe'")
    print(f"Zone Europe: {cur.fetchone()[0]}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
