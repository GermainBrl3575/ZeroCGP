import { HISTORICAL_RETURNS, HISTORICAL_VOLS } from "./marketData";

export interface AssetInfo {
  name:    string;
  sector:  string;
  isin:    string;
  desc:    string;
  type:    "etf" | "stock" | "crypto" | "bond" | "reit";
}

// ── Base de données descriptions ──────────────────────────────
const ASSET_INFO_DB: Record<string, AssetInfo> = {
  // ── ETF MONDE ───────────────────────────────────────────────
  "IWDA":  { name:"iShares MSCI World",          type:"etf",    sector:"ETF Actions Monde",       isin:"IE00B4L5Y983", desc:"Réplique 1 600+ grandes et moyennes capitalisations des pays développés (USA, Europe, Japon). La référence pour investir mondialement en un seul ETF. TER 0.20%." },
  "VWCE":  { name:"Vanguard All-World",           type:"etf",    sector:"ETF Actions Monde",       isin:"IE00BK5BQT80", desc:"ETF 'total world' exposé à 3 700+ entreprises de 50 pays incluant les émergents. La diversification ultime. Gestion Vanguard, pionnière des fonds indiciels. TER 0.22%." },
  "CSPX":  { name:"iShares Core S&P 500",         type:"etf",    sector:"ETF Actions USA",         isin:"IE00B5BMR087", desc:"Réplique les 500 plus grandes entreprises américaines. L'indice le plus suivi au monde, base de tout portefeuille long terme. TER 0.07%." },
  "EQQQ":  { name:"Invesco NASDAQ-100",           type:"etf",    sector:"ETF Tech USA",            isin:"IE0032077012", desc:"Suit les 100 plus grandes valeurs technologiques (Nvidia, Apple, Meta, Google). Plus volatile mais historiquement très performant. TER 0.30%." },
  "MEUD":  { name:"Amundi Euro Stoxx 50",         type:"etf",    sector:"ETF Actions Europe",      isin:"FR0007054358", desc:"Les 50 plus grandes entreprises de la zone euro. Exposition pure à l'économie européenne. TER 0.05% — l'un des moins chers du marché." },
  "SXRT":  { name:"iShares EURO STOXX 50",        type:"etf",    sector:"ETF Actions Europe",      isin:"DE0005933956", desc:"Réplique l'Euro Stoxx 50, référence des marchés européens. Cotation en euros, idéal pour les investisseurs européens. TER 0.10%." },
  "PAEEM": { name:"Amundi MSCI Emerging Markets", type:"etf",    sector:"ETF Marchés Émergents",   isin:"LU1681045370", desc:"Accès aux marchés émergents : Chine, Inde, Brésil, Taïwan, Corée. Fort potentiel de croissance sur le long terme. TER 0.20%." },
  "SOXX":  { name:"iShares PHLX Semiconductor",  type:"etf",    sector:"ETF Semi-conducteurs",    isin:"US4642875415", desc:"ETF concentré sur les semi-conducteurs : Intel, Qualcomm, Broadcom, ASML. Secteur clé de l'IA et de la tech. TER 0.35%." },
  "SMH":   { name:"VanEck Semiconductor ETF",     type:"etf",    sector:"ETF Semi-conducteurs",    isin:"US92189F7915", desc:"Les 25 plus grandes entreprises de semi-conducteurs mondiales. TSMC, NVDA, ASML surpondérés. Alternative concentrée à SOXX. TER 0.35%." },
  "XLK":   { name:"Technology Select SPDR",       type:"etf",    sector:"ETF Tech USA",            isin:"US81369Y8030", desc:"Toute la tech du S&P 500 : Apple, Microsoft, Nvidia, Broadcom. L'ETF sectoriel tech le plus liquide et le moins cher. TER 0.10%." },
  "XLF":   { name:"Financial Select SPDR",        type:"etf",    sector:"ETF Finance USA",         isin:"US81369Y6055", desc:"Les financières du S&P 500 : JPMorgan, Berkshire, Visa, Mastercard. Secteur bénéficiaire des taux élevés. TER 0.10%." },
  "XLV":   { name:"Health Care Select SPDR",      type:"etf",    sector:"ETF Santé USA",           isin:"US81369Y5073", desc:"Toute la santé du S&P 500 : UnitedHealth, Eli Lilly, Johnson & Johnson. Défensif avec un fort potentiel de croissance. TER 0.10%." },
  "XLE":   { name:"Energy Select SPDR",           type:"etf",    sector:"ETF Énergie USA",         isin:"US81369Y4076", desc:"Les énergéticiens du S&P 500 : ExxonMobil, Chevron, ConocoPhillips. Exposé aux prix du pétrole et du gaz naturel. TER 0.10%." },
  "XLI":   { name:"Industrial Select SPDR",       type:"etf",    sector:"ETF Industriel USA",      isin:"US81369Y7079", desc:"Les industriels du S&P 500 : United Parcel, Raytheon, Honeywell. Cyclique, suit la croissance économique américaine. TER 0.10%." },
  "ICLN":  { name:"iShares Global Clean Energy",  type:"etf",    sector:"ETF Énergie Verte",       isin:"IE00B1XNHC34", desc:"Entreprises d'énergies renouvelables mondiales (solaire, éolien, hydro). Fortement corrélé aux politiques climatiques et aux taux. TER 0.40%." },
  "ARKK":  { name:"ARK Innovation ETF",           type:"etf",    sector:"ETF Innovation",          isin:"US00214Q1040", desc:"ETF géré activement par Cathie Wood sur les technologies disruptives : IA, génomique, robotique, cryptos. Volatilité très élevée. TER 0.75%." },
  "SGLD":  { name:"Invesco Physical Gold ETC",    type:"etf",    sector:"Matières Premières / Or", isin:"IE00B579F325", desc:"ETC adossé à de l'or physique stocké à Londres. Valeur refuge par excellence, corrélation négative avec les actions en crise. TER 0.12%." },
  "AIGA":  { name:"Amundi Physical Gold ETC",     type:"etf",    sector:"Matières Premières / Or", isin:"FR0013416716", desc:"ETC or physique d'Amundi, alternative européenne au GLD américain. Or stocké en voûte à Paris. TER 0.15%." },
  "GLD":   { name:"SPDR Gold Shares",             type:"etf",    sector:"Matières Premières / Or", isin:"US78463V1070", desc:"Le plus grand ETF or au monde (~60 Mds$ d'actifs). Référence mondiale pour l'exposition à l'or physique. TER 0.40%." },
  "TLT":   { name:"iShares 20+ Year Treasury",    type:"bond",   sector:"Obligations US Long Terme",isin:"US4642874576", desc:"Obligations d'État américaines à très long terme (20-30 ans). Très sensible aux taux : baisse quand les taux montent. Refuge en récession. TER 0.15%." },
  "HYG":   { name:"iShares iBoxx High Yield",     type:"bond",   sector:"Obligations Haut Rendement",isin:"US4642885135",desc:"Obligations d'entreprises à haut rendement (junk bonds). Rendement supérieur mais risque de défaut plus élevé. Corrélé aux actions. TER 0.48%." },
  "LQD":   { name:"iShares Investment Grade Corp",type:"bond",   sector:"Obligations Corporate",   isin:"US4642882819", desc:"Obligations d'entreprises investment grade américaines. Rendement supérieur aux bons du Trésor avec un risque modéré. TER 0.14%." },
  "EMB":   { name:"iShares JP Morgan EM Bond",    type:"bond",   sector:"Obligations Émergents",   isin:"US4642882991", desc:"Obligations souveraines des marchés émergents en dollars. Rendement attractif mais risque devise et politique. TER 0.39%." },
  "EPRE":  { name:"FTSE EPRA Europe Real Estate", type:"reit",   sector:"Immobilier Coté Europe",  isin:"FR0010686099", desc:"Foncières cotées européennes : bureaux, commerces, logistique. Accès à l'immobilier sans gestion directe, dividendes réguliers. TER 0.40%." },
  "VNQ":   { name:"Vanguard Real Estate ETF",     type:"reit",   sector:"Immobilier Coté USA",     isin:"US9229085538", desc:"Les REITs américains : centres de données, logistique, résidentiel, santé. Dividendes élevés obligatoires (90% des revenus). TER 0.12%." },
  // ── ACTIONS USA ─────────────────────────────────────────────
  "AAPL":  { name:"Apple",                        type:"stock",  sector:"Tech / Consumer",         isin:"US0378331005", desc:"Première capitalisation mondiale (~3 000 Mds$). Écosystème fermé iPhone/Mac/Services. L'App Store et iCloud génèrent des marges exceptionnelles. CA 2024 : 391 Mds$." },
  "MSFT":  { name:"Microsoft",                    type:"stock",  sector:"Cloud / IA / Software",   isin:"US5949181045", desc:"Leader mondial du cloud (Azure, 25% de parts de marché) et de la productivité (Office 365). Investisseur clé dans OpenAI. CA 2024 : 245 Mds$." },
  "NVDA":  { name:"Nvidia",                       type:"stock",  sector:"Semi-conducteurs / IA",   isin:"US67066G1040", desc:"Dominant incontesté des GPU pour l'IA. Ses puces H100/H200 équipent tous les grands data centers. Croissance de 122% en 2024. CA 2024 : 130 Mds$." },
  "AMZN":  { name:"Amazon",                       type:"stock",  sector:"E-commerce / Cloud",      isin:"US0231351067", desc:"Leader e-commerce et cloud (AWS, 33% de parts). AWS représente 17% du CA mais 60% des profits. Prime compte 200M abonnés mondiaux." },
  "GOOGL": { name:"Alphabet",                     type:"stock",  sector:"Tech / Publicité",        isin:"US02079K3059", desc:"Maison mère de Google. Monopole de la recherche web (90% de parts). YouTube, Cloud et Waymo complètent l'écosystème. CA 2024 : 307 Mds$." },
  "META":  { name:"Meta Platforms",               type:"stock",  sector:"Réseaux Sociaux / IA",    isin:"US30303M1027", desc:"Facebook, Instagram, WhatsApp : 3,3 milliards d'utilisateurs actifs quotidiens. La plateforme publicitaire la plus ciblée au monde. CA 2024 : 164 Mds$." },
  "TSLA":  { name:"Tesla",                        type:"stock",  sector:"Véhicules Électriques",   isin:"US88160R1014", desc:"Leader des VE avec 1,8M véhicules livrés en 2024. Réseau Supercharger, FSD (conduite autonome) et énergie (Powerwall) en fort développement." },
  "AVGO":  { name:"Broadcom",                     type:"stock",  sector:"Semi-conducteurs",        isin:"US11135F1012", desc:"Fournisseur clé de puces réseau et de stockage. Clients : Apple (WiFi/Bluetooth), Google (TPU IA), Amazon. Acquisition VMware complétée en 2024." },
  "AMD":   { name:"AMD",                          type:"stock",  sector:"Semi-conducteurs",        isin:"US0079031078", desc:"Principal concurrent d'Intel sur les processeurs et de Nvidia sur les GPU IA. Série EPYC en forte croissance dans les data centers. CA 2024 : 25 Mds$." },
  "LLY":   { name:"Eli Lilly",                    type:"stock",  sector:"Pharma / Diabète / Obésité",isin:"US5324571083",desc:"Fabricant de Mounjaro et Zepbound (GLP-1), les médicaments anti-obésité les plus prescrits. Croissance de 60% en 2024. Capitalisation 750 Mds$." },
  "UNH":   { name:"UnitedHealth Group",           type:"stock",  sector:"Assurance Santé",         isin:"US91324P1021", desc:"Le plus grand assureur santé américain (50M assurés). Combine assurance (UnitedHealthcare) et services santé (Optum). CA 2024 : 400 Mds$." },
  "JNJ":   { name:"Johnson & Johnson",            type:"stock",  sector:"Santé / Pharma",          isin:"US4781601046", desc:"Conglomérat santé mondial : médicaments (Darzalex, Stelara), dispositifs médicaux (DePuy, Ethicon). Dividende en croissance depuis 62 ans." },
  "JPM":   { name:"JPMorgan Chase",               type:"stock",  sector:"Banque / Finance",        isin:"US46625H1005", desc:"Première banque mondiale par actifs (4 000 Mds$). Banque d'investissement, retail et gestion d'actifs. Dirigée par Jamie Dimon depuis 2005." },
  "V":     { name:"Visa",                         type:"stock",  sector:"Paiements Numériques",    isin:"US92826C8394", desc:"Réseau de paiement mondial présent dans 200 pays. 4,3 milliards de cartes. Modèle asset-light avec marges nettes de 53%. CA 2024 : 36 Mds$." },
  "MA":    { name:"Mastercard",                   type:"stock",  sector:"Paiements Numériques",    isin:"US57636Q1040", desc:"Deuxième réseau de paiement mondial. Concurrent direct de Visa, légèrement plus exposé aux marchés internationaux. Marges nettes de 45%." },
  "GS":    { name:"Goldman Sachs",                type:"stock",  sector:"Banque d'Investissement", isin:"US38141G1040", desc:"Première banque d'investissement mondiale. Trading, M&A, gestion d'actifs. Retour en force sur le trading après la pandémie. CA 2024 : 47 Mds$." },
  "BX":    { name:"Blackstone",                   type:"stock",  sector:"Private Equity",          isin:"US09260D1072", desc:"Le plus grand gestionnaire d'actifs alternatifs au monde (1 000 Mds$ d'AUM). Private equity, immobilier, credit. Dividende variable attractif." },
  "COST":  { name:"Costco",                       type:"stock",  sector:"Distribution",            isin:"US22160K1051", desc:"Chaîne de clubs-entrepôts avec 130M membres. Modèle d'abonnement (50$/an) unique. Croissance régulière depuis 40 ans. CA 2024 : 254 Mds$." },
  "WMT":   { name:"Walmart",                      type:"stock",  sector:"Distribution",            isin:"US9311421039", desc:"Le plus grand distributeur mondial (600 Mds$ de CA). Transformation réussie vers l'e-commerce (Walmart+). Publicité digitale en forte croissance." },
  "MCD":   { name:"McDonald's",                   type:"stock",  sector:"Restauration",            isin:"US5801351017", desc:"40 000 restaurants dans 100 pays, 95% franchisés. Modèle immobilier unique (propriétaire des terrains). Dividende en croissance depuis 48 ans." },
  "XOM":   { name:"ExxonMobil",                   type:"stock",  sector:"Énergie / Pétrole",       isin:"US30231G1022", desc:"Premier groupe pétrolier et gazier occidental. Acquisition de Pioneer Natural Resources en 2024. Dividende en croissance depuis 41 ans." },
  "LMT":   { name:"Lockheed Martin",              type:"stock",  sector:"Défense",                 isin:"US5398301094", desc:"Premier contractant défense américain. Fabricant du F-35, des missiles HIMARS et des systèmes Patriot. Carnet de commandes record en 2024." },
  "ISRG":  { name:"Intuitive Surgical",           type:"stock",  sector:"Robotique Médicale",      isin:"US46120E6023", desc:"Monopole de la chirurgie robotique (système da Vinci). 8 000+ robots installés dans le monde. Modèle récurrent via consommables. CA 2024 : 8 Mds$." },
  "SPGI":  { name:"S&P Global",                   type:"stock",  sector:"Finance / Données",       isin:"US78409V1044", desc:"Fournit les indices S&P 500, les notations de crédit et les données financières. Oligopole avec Moody's. Marges exceptionnelles > 40%." },
  "BRK-B": { name:"Berkshire Hathaway B",         type:"stock",  sector:"Conglomérat / Finance",   isin:"US0846707026", desc:"Conglomérat de Warren Buffett. Assurance (GEICO), énergie, transport, consommation. 300 Mds$ de cash disponible en 2024." },
  // ── ACTIONS EUROPE ──────────────────────────────────────────
  "MC":    { name:"LVMH",                         type:"stock",  sector:"Luxe",                    isin:"FR0000121014", desc:"Numéro 1 mondial du luxe (Louis Vuitton, Dior, Moët, Sephora). 75 maisons dans 6 secteurs. CA 2024 : 84 Mds€. Famille Arnault à 48%." },
  "RMS":   { name:"Hermès",                       type:"stock",  sector:"Luxe / Maroquinerie",     isin:"FR0000052292", desc:"Maison de luxe la plus exclusive au monde. Sacs Birkin/Kelly en liste d'attente. Marges brutes de 70%, les plus élevées du luxe. Famille Hermès détient 67%." },
  "OR":    { name:"L'Oréal",                      type:"stock",  sector:"Cosmétiques",             isin:"FR0000120321", desc:"Numéro 1 mondial des cosmétiques (40 marques dont Lancôme, Garnier, Maybelline). Présent dans 150 pays. CA 2024 : 43 Mds€." },
  "SU":    { name:"Schneider Electric",           type:"stock",  sector:"Électricité / IA",        isin:"FR0000121972", desc:"Leader mondial de la gestion de l'énergie et des automatismes industriels. Fort bénéficiaire de la transition énergétique et des data centers IA." },
  "AIR":   { name:"Airbus",                       type:"stock",  sector:"Aéronautique",            isin:"NL0000235190", desc:"Duopole avec Boeing sur l'aviation civile mondiale. Carnet de commandes record : 8 800 avions (13 ans de production). CA 2024 : 69 Mds€." },
  "SAF":   { name:"Safran",                       type:"stock",  sector:"Aéronautique / Moteurs",  isin:"FR0000073272", desc:"Fabricant du moteur LEAP (40% de l'aviation mondiale). Activité de maintenance très récurrente. Joint-venture CFM avec GE sur les moteurs civils." },
  "TTE":   { name:"TotalEnergies",                type:"stock",  sector:"Énergie / Pétrole",       isin:"FR0014000MR3", desc:"Major pétrolier français en transformation vers les énergies bas carbone. Dividende élevé et rachats d'actions. CA 2024 : 190 Mds$." },
  "ASML":  { name:"ASML",                         type:"stock",  sector:"Semi-conducteurs / EUV",  isin:"NL0010273215", desc:"Monopole absolu sur les machines lithographiques EUV indispensables pour les puces <7nm. Seule entreprise à maîtriser cette technologie. Carnet : 40 Mds€." },
  "SAP":   { name:"SAP",                          type:"stock",  sector:"Logiciels Enterprise",    isin:"DE0007164600", desc:"Leader mondial des ERP (systèmes de gestion d'entreprise). Transition cloud réussie : S/4HANA Cloud en forte croissance. 400 000 clients dans 180 pays." },
  "NOVO":  { name:"Novo Nordisk",                 type:"stock",  sector:"Pharma / Obésité",        isin:"DK0060534915", desc:"Ozempic et Wegovy ont révolutionné le traitement du diabète et de l'obésité. Capitalisation de 500 Mds€, la plus grande d'Europe continentale." },
  "NOVOB": { name:"Novo Nordisk",                 type:"stock",  sector:"Pharma / Obésité",        isin:"DK0060534915", desc:"Ozempic et Wegovy ont révolutionné le traitement du diabète et de l'obésité. Capitalisation de 500 Mds€, la plus grande d'Europe continentale." },
  "ROG":   { name:"Roche",                        type:"stock",  sector:"Pharma / Diagnostics",    isin:"CH0012221716", desc:"Leader mondial de l'oncologie et des diagnostics. Pipeline solide avec des médicaments contre Alzheimer. Dividende en croissance depuis 36 ans." },
  "NESN":  { name:"Nestlé",                       type:"stock",  sector:"Alimentation / FMCG",     isin:"CH0012221716", desc:"Le plus grand groupe alimentaire mondial (Nescafé, KitKat, Purina, Maggi). Présent dans 186 pays. Dividende en croissance continue depuis 1959." },
  "CFR":   { name:"Richemont",                    type:"stock",  sector:"Luxe / Joaillerie",       isin:"CH0210483332", desc:"Deuxième groupe du luxe européen (Cartier, Van Cleef, IWC, Montblanc). Très exposé à la joaillerie haut de gamme et à la clientèle asiatique." },
  "AZN":   { name:"AstraZeneca",                  type:"stock",  sector:"Pharma / Oncologie",      isin:"GB0009895292", desc:"Transformation réussie vers l'oncologie (Tagrisso, Imfinzi). Pipeline oncologie parmi les plus riches du secteur. CA 2024 : 55 Mds$." },
  "BA":    { name:"BAE Systems",                  type:"stock",  sector:"Défense UK",              isin:"GB0002634946", desc:"Premier groupe de défense britannique. Navires de guerre, chars, avions de combat. Fort bénéficiaire de la hausse des budgets défense post-2022." },
  "RR":    { name:"Rolls-Royce Holdings",         type:"stock",  sector:"Propulsion / Énergie",    isin:"GB00B63H8491", desc:"Moteurs d'avions large-corps (Trent) et sous-marins nucléaires. Turnaround spectaculaire depuis 2023 sous Tufan Erginbilgic. CA 2024 : 17 Mds£." },
  "RACE":  { name:"Ferrari",                      type:"stock",  sector:"Luxe / Automobile",       isin:"NL0011585146", desc:"Le seul constructeur auto coté comme une entreprise de luxe. Marges nettes de 22%, liste d'attente de 2 ans. 14 000 véhicules/an. CA 2024 : 6,7 Mds€." },
  // ── ACTIONS ASIE ────────────────────────────────────────────
  "7203T": { name:"Toyota",                       type:"stock",  sector:"Automobile / Hybride",    isin:"JP3633400001", desc:"Premier constructeur automobile mondial. Leader de l'hybride avec Prius. Stratégie 'multi-technologie' (hybride, hydrogène, EV). CA 2024 : 45 000 Mds¥." },
  "6758T": { name:"Sony Group",                   type:"stock",  sector:"Électronique / Médias",   isin:"JP3435000009", desc:"PlayStation (leader gaming), capteurs d'image (50% du marché), musique (Sony Music), films. Conglomérat tech-entertainment unique au monde." },
  "2330TW":{ name:"TSMC",                         type:"stock",  sector:"Semi-conducteurs",        isin:"TW0002330008", desc:"Fabrique les puces d'Apple, Nvidia, AMD, Qualcomm. Monopole sur les nœuds <5nm. 64% des revenus mondiaux de fonderie. Investissement massif en Arizona." },
  "005930":{ name:"Samsung Electronics",          type:"stock",  sector:"Électronique / Mémoire",  isin:"KR7005930003", desc:"Leader mondial des DRAM et NAND Flash. Smartphones Galaxy, télévisions, semi-conducteurs. Champion national coréen et conglomérat mondial." },
  "9988HK":{ name:"Alibaba Group",                type:"stock",  sector:"E-commerce Chine",        isin:"KYG017191142", desc:"Géant du e-commerce chinois (Taobao, Tmall, AliExpress). Cloud (Aliyun) en forte croissance. Valorisation décotée vs Amazon post-régulation." },
  "0700HK":{ name:"Tencent Holdings",             type:"stock",  sector:"Tech / Médias Chine",     isin:"KYG875721634", desc:"WeChat (1,3 Mds utilisateurs), gaming (Riot Games, Supercell), paiements (WeChat Pay). Plus grand éditeur de jeux vidéo mondial." },
  "BIDU":  { name:"Baidu",                        type:"stock",  sector:"IA / Recherche Chine",    isin:"US0567521085", desc:"Google chinois : moteur de recherche dominant + plateforme IA (ERNIE Bot). Apollo (conduite autonome) l'un des plus avancés. Valorisation très décotée." },
  "TCS":   { name:"Tata Consultancy Services",    type:"stock",  sector:"IT / Outsourcing",        isin:"INE467B01029", desc:"Premier groupe IT indien. Services d'outsourcing pour banques, assureurs et industriels mondiaux. 600 000 employés. Dividende régulier, bilan solide." },
  "INFY":  { name:"Infosys",                      type:"stock",  sector:"IT / Conseil",            isin:"INE009A01021", desc:"Deuxième groupe IT indien. Transformation numérique, cloud, cybersécurité pour des clients Fortune 500. Fondé par Narayana Murthy en 1981." },
  // ── CRYPTO ──────────────────────────────────────────────────
  "BTC":   { name:"Bitcoin",                      type:"crypto", sector:"Crypto-actif",            isin:"N/A", desc:"Première cryptomonnaie (1 400 Mds$ de capitalisation). Offre limitée à 21M d'unités, halving tous les 4 ans. ETF spot approuvés par la SEC en 2024. Réserve de valeur numérique." },
  "ETH":   { name:"Ethereum",                     type:"crypto", sector:"Crypto-actif / Smart Contracts", isin:"N/A", desc:"Blockchain de référence pour les smart contracts, DeFi et NFTs. Passage au Proof of Stake en 2022 (-99,95% consommation). ETF spot approuvés en 2024." },
  "SOL":   { name:"Solana",                       type:"crypto", sector:"Blockchain Haute Performance", isin:"N/A", desc:"Blockchain ultra-rapide (65 000 TPS vs 15 pour Ethereum). Favori des applications DeFi et NFT. Forte reprise post-FTX, soutenu par des fonds majeurs." },
  "BNB":   { name:"BNB (Binance)",                type:"crypto", sector:"Crypto-actif / Exchange", isin:"N/A", desc:"Token natif de Binance, le plus grand exchange crypto. Utilisé pour réduire les frais, participer aux IEO et dans l'écosystème BNB Chain." },
  "XRP":   { name:"XRP (Ripple)",                 type:"crypto", sector:"Paiements / Blockchain",  isin:"N/A", desc:"Conçu pour les paiements interbancaires rapides et peu coûteux. Victoire partielle contre la SEC en 2023. Adopté par plusieurs banques centrales." },
  "ADA":   { name:"Cardano",                      type:"crypto", sector:"Blockchain / Smart Contracts", isin:"N/A", desc:"Blockchain académique fondée par Charles Hoskinson (co-fondateur Ethereum). Approche scientifique avec peer review. Forte communauté en Afrique." },
  "AVAX":  { name:"Avalanche",                    type:"crypto", sector:"Blockchain DeFi",         isin:"N/A", desc:"Réseau de blockchains interopérables ultra-rapide. Finalité des transactions en <1 seconde. Populaire pour les applications DeFi et les sous-réseaux (Subnets)." },
  // ── OR / MATIERES PREMIERES ─────────────────────────────────
  "SGLDL": { name:"Invesco Physical Gold",        type:"etf",    sector:"Or Physique",             isin:"IE00B579F325", desc:"ETC adossé à de l'or physique. Valeur refuge en période d'inflation ou de crise. Corrélation faible avec les actions. Cotation à Londres en USD." },

  // ── ETF supplémentaires ─────────────────────────────────────
  "CMOD":   { name:"iShares Diversified Commodity",  type:"etf",   sector:"Matières Premières",      isin:"IE00BDFL4P12", desc:"Panier diversifié de matières premières : énergie, métaux, agriculture. Décorrélé des actions, protection contre l'inflation. TER 0.19%." },
  "CMODL":  { name:"iShares Diversified Commodity",  type:"etf",   sector:"Matières Premières",      isin:"IE00BDFL4P12", desc:"Panier diversifié de matières premières : énergie, métaux, agriculture. Décorrélé des actions, protection contre l'inflation. TER 0.19%." },
  "XDWD":   { name:"Xtrackers MSCI World",            type:"etf",   sector:"ETF Actions Monde",       isin:"IE00BJ0KDQ92", desc:"ETF MSCI World de DWS/Xtrackers, réplique 1 600+ entreprises des pays développés. Alternative à IWDA avec des frais compétitifs. TER 0.19%." },
  "MEUD":   { name:"Amundi Euro Stoxx 50",            type:"etf",   sector:"ETF Actions Europe",      isin:"FR0007054358", desc:"Les 50 plus grandes entreprises de la zone euro (ASML, LVMH, SAP, Total). ETF Amundi parmi les moins chers du marché européen. TER 0.05%." },
  "MEUDPA": { name:"Amundi Euro Stoxx 50",            type:"etf",   sector:"ETF Actions Europe",      isin:"FR0007054358", desc:"Les 50 plus grandes entreprises de la zone euro (ASML, LVMH, SAP, Total). ETF Amundi parmi les moins chers du marché européen. TER 0.05%." },
  "SXRT":   { name:"iShares EURO STOXX 50",           type:"etf",   sector:"ETF Actions Europe",      isin:"DE0005933956", desc:"Réplique l'Euro Stoxx 50, indice phare des marchés européens. Cotation en euros à Francfort. TER 0.10%." },
  "SXRTDE": { name:"iShares EURO STOXX 50",           type:"etf",   sector:"ETF Actions Europe",      isin:"DE0005933956", desc:"Réplique l'Euro Stoxx 50, indice phare des marchés européens. Cotation en euros à Francfort. TER 0.10%." },
  "EXW1":   { name:"iShares STOXX Europe 600",        type:"etf",   sector:"ETF Actions Europe",      isin:"DE0002635307", desc:"600 plus grandes entreprises européennes (UK inclus). Exposition large à l'économie européenne dans tous les secteurs. TER 0.20%." },
  "EXW1DE": { name:"iShares STOXX Europe 600",        type:"etf",   sector:"ETF Actions Europe",      isin:"DE0002635307", desc:"600 plus grandes entreprises européennes. Exposition large à l'économie européenne dans tous les secteurs. TER 0.20%." },
  "LYPS":   { name:"Lyxor STOXX Europe 600",          type:"etf",   sector:"ETF Actions Europe",      isin:"LU0908500753", desc:"Alternative Lyxor à iShares pour l'Europe 600. Même exposition, frais légèrement inférieurs. TER 0.07%." },
  "IBGL":   { name:"iShares Core Global Agg Bond",    type:"bond",  sector:"Obligations Monde",       isin:"IE00B3F81409", desc:"Obligations mondiales investment grade (gouvernements + entreprises). Cœur d'un portefeuille obligataire diversifié. TER 0.10%." },
  "AGGH":   { name:"iShares Core Global Agg Hedged",  type:"bond",  sector:"Obligations Monde",       isin:"IE00BDBRDM35", desc:"Comme IBGL mais avec couverture du risque de change en euros. Idéal pour les investisseurs européens. TER 0.10%." },
  "IUAG":   { name:"iShares € Corp Bond",             type:"bond",  sector:"Obligations Corp. Euro",  isin:"IE00B3F81R35", desc:"Obligations d'entreprises européennes investment grade. Rendement supérieur aux obligations souveraines pour un risque modéré. TER 0.20%." },
  "DBZB":   { name:"Xtrackers Euro Gov Bond",         type:"bond",  sector:"Obligations Souveraines", isin:"LU0290358497", desc:"Obligations souveraines de la zone euro (Allemagne, France, Italie…). Actif refuge en période de crise. TER 0.15%." },
  "EPRE":   { name:"FTSE EPRA Europe Real Estate",    type:"reit",  sector:"Immobilier Coté Europe",  isin:"FR0010686099", desc:"Foncières cotées européennes : bureaux, commerces, logistique. Dividendes réguliers, valorisation décotée par rapport à l'actif net. TER 0.40%." },
  "IQQP":   { name:"iShares MSCI World REIT",         type:"reit",  sector:"Immobilier Coté Monde",   isin:"IE00B1FZS350", desc:"REITs mondiaux dans tous les sous-secteurs : centres de données, logistique, résidentiel, santé. Diversification immobilière internationale. TER 0.59%." },
  "BOTZ":   { name:"Global X Robotics & AI ETF",      type:"etf",   sector:"Robotique / IA",          isin:"IE00BMW3QX54", desc:"Entreprises de robotique industrielle, automatisation et intelligence artificielle. Exposition thématique à la révolution de l'IA. TER 0.68%." },
  "DRIV":   { name:"Global X Autonomous & EV ETF",    type:"etf",   sector:"VE / Conduite Autonome",  isin:"IE00BGV5VN51", desc:"Véhicules électriques, conduite autonome et infrastructure de recharge. Bénéficiaire de la transition vers la mobilité décarbonée. TER 0.68%." },
  // ── Actions européennes supplémentaires ─────────────────────
  "ASML":   { name:"ASML",                            type:"stock", sector:"Semi-conducteurs / EUV",  isin:"NL0010273215", desc:"Monopole absolu mondial des machines EUV indispensables pour graver les puces <7nm (TSMC, Samsung, Intel). Aucun concurrent à horizon 10 ans. Carnet : 40 Mds€." },
  "ASMLAS": { name:"ASML",                            type:"stock", sector:"Semi-conducteurs / EUV",  isin:"NL0010273215", desc:"Monopole absolu mondial des machines EUV indispensables pour graver les puces <7nm. Aucun concurrent à horizon 10 ans. Carnet : 40 Mds€." },
  "RMS":    { name:"Hermès",                          type:"stock", sector:"Luxe / Maroquinerie",     isin:"FR0000052292", desc:"La maison de luxe la plus exclusive au monde. Sacs Birkin/Kelly en liste d'attente de plusieurs années. Marges brutes de 70%. Famille Hermès détient 67%. CA 2024 : 14 Mds€." },
  "RMSPA":  { name:"Hermès",                         type:"stock", sector:"Luxe / Maroquinerie",     isin:"FR0000052292", desc:"La maison de luxe la plus exclusive au monde. Sacs Birkin/Kelly en liste d'attente. Marges brutes de 70%. CA 2024 : 14 Mds€." },
  "KER":    { name:"Kering",                          type:"stock", sector:"Luxe (Gucci, YSL)",       isin:"FR0000121485", desc:"Maison mère de Gucci, Yves Saint Laurent, Balenciaga, Bottega Veneta. En phase de repositionnement stratégique sur le luxe absolu. CA 2024 : 17 Mds€." },
  "EL":     { name:"EssilorLuxottica",                type:"stock", sector:"Santé / Vision",          isin:"FR0000121667", desc:"Fusion Essilor (verres) + Luxottica (Ray-Ban, Oakley). Monopole virtuel de la correction visuelle mondiale. CA 2024 : 25 Mds€." },
  "BN":     { name:"Danone",                          type:"stock", sector:"Alimentation / Santé",    isin:"FR0000120644", desc:"Leader mondial des produits laitiers, eaux minérales (Evian, Volvic) et nutrition médicale. Transformation sous le CEO Faber. CA 2024 : 27 Mds€." },
  "SAF":    { name:"Safran",                          type:"stock", sector:"Moteurs / Aéronautique",  isin:"FR0000073272", desc:"Co-fabricant du moteur LEAP avec GE (équipe 40% des avions neufs). Activité MRO très récurrente. CA 2024 : 27 Mds€. Forte visibilité long terme." },
  "DSY":    { name:"Dassault Systèmes",               type:"stock", sector:"Logiciels 3D / PLM",      isin:"FR0014003TT8", desc:"Leader mondial des logiciels de simulation 3D (CATIA, SolidWorks, ENOVIA). 350 000 clients industriels. Transition cloud en cours. CA 2024 : 6 Mds€." },
  "SAN":    { name:"Banco Santander",                 type:"stock", sector:"Banque Espagne/EM",       isin:"ES0113900J37", desc:"Première banque de la zone euro par capitalisation. Forte présence en Amérique latine (50% du résultat). Dividende supérieur à 4%. CA 2024 : 62 Mds€." },
  "UCG":    { name:"UniCredit",                       type:"stock", sector:"Banque Italie/Europe",    isin:"IT0005239360", desc:"Deuxième banque européenne par résultat net. Présente en Italie, Allemagne (HypoVereinsbank) et Europe centrale. Valorisation très décotée. CA 2024 : 24 Mds€." },
  "UCGMI":  { name:"UniCredit",                       type:"stock", sector:"Banque Italie/Europe",    isin:"IT0005239360", desc:"Deuxième banque européenne par résultat net. Présente en Italie, Allemagne et Europe centrale. Valorisation très décotée. CA 2024 : 24 Mds€." },
  "ISP":    { name:"Intesa Sanpaolo",                 type:"stock", sector:"Banque Italie",           isin:"IT0000072618", desc:"Première banque italienne. Spécialiste de la banque de proximité et de la gestion de patrimoine. Dividende très élevé (>8%). CA 2024 : 14 Mds€." },
  "ENI":    { name:"Eni",                             type:"stock", sector:"Énergie / Pétrole Italie",isin:"IT0003132476", desc:"Major pétrolier international en transformation vers les énergies renouvelables (Plenitude). Opère dans 60 pays. Dividende >5%. CA 2024 : 100 Mds€." },
  "VOLV":   { name:"Volvo AB",                        type:"stock", sector:"Camions / Industriel",    isin:"SE0000115446", desc:"Leader mondial des camions lourds (Volvo, Renault Trucks, UD Trucks). Bénéficiaire de l'électrification des transports. CA 2024 : 53 Mds SEK." },
  "ERIC":   { name:"Ericsson",                        type:"stock", sector:"Télécoms / 5G",           isin:"SE0000108656", desc:"Fabricant suédois d'équipements de réseau 5G. En cours de restructuration après l'affaire de corruption. Concurrent de Nokia et Huawei." },
  "ATCO":   { name:"Atlas Copco",                     type:"stock", sector:"Industriel / Compresseurs",isin:"SE0011166610",desc:"Leader mondial des compresseurs, outils de précision et équipements de vacuum. Clients : semi-conducteurs, aérospatial, médical. TER 0.19%." },
  "EQNR":   { name:"Equinor",                         type:"stock", sector:"Énergie / Norvège",       isin:"NO0010096985", desc:"Major pétrolier et gazier norvégien. Premier investisseur européen dans les énergies offshore. Dividende élevé soutenu par le fonds souverain." },
  "DSV":    { name:"DSV Panalpina",                   type:"stock", sector:"Transport / Logistique",  isin:"DK0060079531", desc:"Troisième groupe mondial de fret (route, mer, air). Croissances externa fortes (Agility, Schenker). CA 2024 : 100 Mds DKK." },
  "NOVOB":  { name:"Novo Nordisk B",                  type:"stock", sector:"Pharma / Obésité / GLP-1",isin:"DK0060534915", desc:"Ozempic (sémaglutide) et Wegovy dominent le marché des GLP-1 contre le diabète et l'obésité. Plus grande capitalisation européenne (500+ Mds€). Croissance exceptionnelle." },
  "NESTE":  { name:"Neste",                           type:"stock", sector:"Carburants Durables",     isin:"FI0009013403", desc:"Leader mondial des carburants d'aviation durables (SAF) et des biocarburants. Transformation profonde en cours vers la chimie renouvelable. CA 2024 : 20 Mds€." },
  "ORSTED": { name:"Ørsted",                          type:"stock", sector:"Éolien Offshore",         isin:"DK0060094928", desc:"Premier producteur mondial d'énergie éolienne offshore. Projets en Europe, USA et Asie. Valorisation pénalisée par la hausse des taux. CA 2024 : 77 Mds DKK." },
  "IBE":    { name:"Iberdrola",                       type:"stock", sector:"Électricité / Renouvelable",isin:"ES0144580Y14",desc:"Premier producteur mondial d'énergie éolienne. Parmi les 10 plus grandes entreprises européennes. Dividende régulier, expansion aux USA et au Brésil. CA 2024 : 43 Mds€." },
  "RACE":   { name:"Ferrari",                         type:"stock", sector:"Luxe / Automobile",       isin:"NL0011585146", desc:"Le seul constructeur auto coté comme une marque de luxe. Prix moyen 350 000€, liste d'attente 2 ans. Marges nettes de 22%, les plus élevées de l'auto. CA 2024 : 6,7 Mds€." },
  "RACEMI": { name:"Ferrari",                         type:"stock", sector:"Luxe / Automobile",       isin:"NL0011585146", desc:"Le seul constructeur auto coté comme une marque de luxe. Prix moyen 350 000€, liste d'attente 2 ans. Marges nettes de 22%. CA 2024 : 6,7 Mds€." },
  "LDO":    { name:"Leonardo",                        type:"stock", sector:"Défense / Aérospatial",   isin:"IT0003856405", desc:"Champion national italien de la défense et de l'aérospatial. Hélicoptères (60% du CA), radar, cybersécurité. Carnet de commandes record. CA 2024 : 17 Mds€." },
  "HLMA":   { name:"Halma",                           type:"stock", sector:"Tech / Sécurité",         isin:"GB0004052071", desc:"Conglomérat technologique britannique spécialisé dans la sécurité, la santé et l'environnement. Croissance organique constante depuis 45 ans. CA 2024 : 2,2 Mds£." },
  "REL":    { name:"RELX",                            type:"stock", sector:"Données / Analytics",     isin:"GB00B2B0DG97", desc:"Groupe d'information et d'analytics (Elsevier, LexisNexis, Reed Exhibitions). Modèle d'abonnement récurrent avec marges élevées. CA 2024 : 9 Mds£." },
  // ── Actions asiatiques supplémentaires ──────────────────────
  "8035T":  { name:"Tokyo Electron",                  type:"stock", sector:"Équipements Semi-cond.",  isin:"JP3571400005", desc:"Principal fabricant japonais d'équipements pour semi-conducteurs (gravure, dépôt de couches). Bénéficiaire direct du boom des puces IA. CA 2024 : 2 200 Mds¥." },
  "9984T":  { name:"SoftBank Group",                  type:"stock", sector:"Tech / Investissement",   isin:"JP3436100006", desc:"Conglomérat tech japonais et investisseur ($100 Mds Vision Fund). Paris sur l'IA, la robotique et la tech mondiale via Arm Holdings. Très volatile." },
  "6861T":  { name:"Keyence",                         type:"stock", sector:"Automatisation Industrielle",isin:"JP3236200006",desc:"Fabricant japonais de capteurs, systèmes de vision et microscopes. Marges opérationnelles de 50%, parmi les plus élevées du monde industriel. CA 2024 : 960 Mds¥." },
  "2454TW": { name:"MediaTek",                        type:"stock", sector:"Semi-conducteurs",        isin:"TW0002454009", desc:"Deuxième fabless de puces mondiale. Processeurs pour smartphones (Dimensity), TV, IoT et véhicules connectés. CA 2024 : 530 Mds TWD." },
  "000660": { name:"SK Hynix",                        type:"stock", sector:"Mémoire / DRAM HBM",      isin:"KR7000660001", desc:"Deuxième fabricant mondial de DRAM et NAND. Fournisseur exclusif des mémoires HBM3e utilisées dans les GPU IA de Nvidia. Croissance explosive en 2024." },
  "9988HK": { name:"Alibaba Group",                   type:"stock", sector:"E-commerce / Cloud Chine",isin:"KYG017191142", desc:"Géant du e-commerce (Taobao, Tmall) et cloud (Aliyun). Valorisation très décotée post-régulation (P/E 10x). Rachat d'actions massif en 2024." },
  "TCNS":   { name:"Tata Consultancy Services",       type:"stock", sector:"IT / Services Inde",      isin:"INE467B01029", desc:"Premier groupe IT indien. Services d'outsourcing, cloud et transformation numérique pour 3 000 clients Fortune 500. 600 000 employés. CA 2024 : 25 Mds$." },
  // ── Actions américaines supplémentaires ─────────────────────
  "REGN":   { name:"Regeneron Pharmaceuticals",       type:"stock", sector:"Biotech / Ophtalmologie", isin:"US75886F1075", desc:"Eylea (dégénérescence maculaire) et Dupixent (dermatite, asthme) génèrent 15 Mds$ de revenus. Pipeline très solide. Modèle sans dilution actionnariale." },
  "VRTX":   { name:"Vertex Pharmaceuticals",          type:"stock", sector:"Biotech / Mucoviscidose", isin:"US92532F1003", desc:"Monopole thérapeutique sur la mucoviscidose (Trikafta). Expansion dans la douleur chronique et les maladies rénales. Bilan solide, sans dette." },
  "ISRG":   { name:"Intuitive Surgical",              type:"stock", sector:"Robotique Chirurgicale",  isin:"US46120E6023", desc:"Monopole de facto en chirurgie robotique (da Vinci, Ion). 8 000 robots installés. Revenus récurrents via instruments jetables. CA 2024 : 8 Mds$." },
  "BX":     { name:"Blackstone",                      type:"stock", sector:"Private Equity / Alter.", isin:"US09260D1072", desc:"Plus grand gestionnaire d'actifs alternatifs (1 000 Mds$). Private equity, immobilier, infrastructure et crédit. Dividende variable élevé." },
  "CRWD":   { name:"CrowdStrike",                     type:"stock", sector:"Cybersécurité / IA",      isin:"US2270791014", desc:"Leader de la cybersécurité cloud-native (Falcon Platform). Protection endpoint alimentée par l'IA. ARR dépasse 3 Mds$. Croissance >30%/an." },
  "NOW":    { name:"ServiceNow",                      type:"stock", sector:"SaaS / Automatisation IT",isin:"US81762P1021", desc:"Plateforme d'automatisation des workflows IT et RH. Intégration de l'IA générative (Now Assist). ARR 10 Mds$. Clients : 85% du Fortune 500." },
  "AMAT":   { name:"Applied Materials",               type:"stock", sector:"Équipements Semi-cond.",  isin:"US0382221051", desc:"Leader mondial des équipements de dépôt de couches minces. Bénéficiaire structurel de la multiplication des usines de puces (TSMC, Samsung, Intel). CA 2024 : 27 Mds$." },
  "LRCX":   { name:"Lam Research",                    type:"stock", sector:"Équipements Semi-cond.",  isin:"US5128071082", desc:"Équipements de gravure et de dépôt pour semi-conducteurs. Duopole avec Applied Materials sur certains segments. CA 2024 : 17 Mds$." },
  "KLAC":   { name:"KLA Corporation",                 type:"stock", sector:"Contrôle Qualité Semi-cond.",isin:"US4824801009",desc:"Monopole sur les équipements d'inspection et de métrologie pour semi-conducteurs. Marges très élevées (65% brut). CA 2024 : 10 Mds$." },
  "CYBR":   { name:"CyberArk Software",               type:"stock", sector:"Cybersécurité / IAM",     isin:"IL0011334468", desc:"Leader mondial de la gestion des accès à privilèges (PAM). Protège les comptes administrateurs contre les cyberattaques. Israélien coté au Nasdaq. ARR 900M$." },
  "CHKP":   { name:"Check Point Software",            type:"stock", sector:"Cybersécurité",           isin:"IL0010824113", desc:"Pionnier de la cybersécurité réseau (pare-feux, VPN). Basé à Tel Aviv. Valorisation raisonnable pour le secteur. Dividendes et rachats d'actions réguliers." },
  "SPGI":   { name:"S&P Global",                      type:"stock", sector:"Finance / Indices / Data",isin:"US78409V1044", desc:"Fournit les indices S&P 500/400/600, les notations de crédit et les données de marché. Oligopole avec Moody's. Marges opérationnelles >45%. CA 2024 : 14 Mds$." },
  "MCO":    { name:"Moody's Corporation",             type:"stock", sector:"Notation / Données Fin.", isin:"US6153691059", desc:"Duopole avec S&P Global sur la notation des obligations mondiales. Activité données et analytics (Moody's Analytics) en forte croissance. CA 2024 : 7 Mds$." },
  "GS":     { name:"Goldman Sachs",                   type:"stock", sector:"Banque d'Investissement", isin:"US38141G1040", desc:"La banque d'investissement la plus prestigious au monde. Trading, M&A, gestion d'actifs. Retour en force post-2022. Dirigée par David Solomon. CA 2024 : 47 Mds$." },
  "MS":     { name:"Morgan Stanley",                  type:"stock", sector:"Banque / Gestion de Patrimoine",isin:"US6174464486",desc:"Banque d'investissement et de gestion de fortune. Acquisition E*Trade et Eaton Vance renforcent la gestion de patrimoine. AUM 5 500 Mds$." },
  "TMO":    { name:"Thermo Fisher Scientific",        type:"stock", sector:"Sciences de la Vie / Labo",isin:"US8835561023",desc:"Leader des équipements et réactifs scientifiques. Clients : pharma, biotech, hôpitaux, gouvernements. Croissance inorganique régulière. CA 2024 : 43 Mds$." },
  "MRK":    { name:"Merck & Co.",                     type:"stock", sector:"Pharma / Oncologie",      isin:"US58933Y1055", desc:"Keytruda (immunothérapie) est le médicament le plus vendu au monde (25 Mds$). Pipeline oncologie très solide. CA 2024 : 63 Mds$." },
  "ABBV":   { name:"AbbVie",                          type:"stock", sector:"Pharma / Immunologie",    isin:"US0031721050", desc:"Humira (autoimmun) et Skyrizi/Rinvoq prennent le relais. Acquisition d'Allergan (Botox) complète le portefeuille. Dividende en croissance continue. CA 2024 : 56 Mds$." },

};

// ── Lookup avec gestion des suffixes de bourse ─────────────────
function normalizeKey(symbol: string): string {
  // Générer toutes les variantes possibles du symbole
  const upper = symbol.toUpperCase();
  const noSuffix = upper
    .replace(/-B\.CO$/,"B").replace(/\.CO$/,"").replace(/\.AS$/,"")
    .replace(/\.DE$/,"").replace(/\.PA$/,"").replace(/\.SW$/,"")
    .replace(/\.L$/,"").replace(/\.MI$/,"").replace(/\.MC$/,"")
    .replace(/\.(HK|T|NS|AX|TO|ST|OL|JK|KL|BK|SI|SA|MX|SR|JO|VI|LS|BR|WA)$/,"")
    .replace(/-EUR$/,"").replace(/-USD$/,"")
    .replace(/\./g,"").replace(/-/g,"");

  const candidates = [
    symbol,           // Exact
    upper,            // Majuscules
    noSuffix,         // Sans suffixe bourse
    upper.split(".")[0], // Avant le premier point
    upper.split("-")[0], // Avant le premier tiret
    noSuffix.replace(/B$/,""),  // Retirer le B final (NOVO-B → NOVO)
    upper.replace(".AS","").replace(".DE","").replace(".PA","").replace(".L",""),
  ];

  for (const key of candidates) {
    if (key && ASSET_INFO_DB[key]) return key;
  }
  return upper.split(".")[0];
}

export function getAssetInfo(symbol: string): AssetInfo {
  const key = normalizeKey(symbol);
  const info = ASSET_INFO_DB[key];
  if (info) return info;

  // Fallback : générer une description à partir du type et secteur
  const base = symbol.split(".")[0].split("-")[0];
  return {
    name:   base,
    type:   "stock",
    sector: "Actif Financier",
    isin:   "",
    desc:   `${base} — sélectionné par l'algorithme de Markowitz pour ses propriétés de diversification optimales. Données historiques disponibles dans lib/marketData.ts.`,
  };
}

// ── Performances historiques depuis les vraies données Yahoo Finance ──
export function getAssetHistory(symbol: string): Record<string, string> {
  const annualRet = HISTORICAL_RETURNS[symbol]
    ?? HISTORICAL_RETURNS[symbol.split(".")[0]]
    ?? HISTORICAL_RETURNS[symbol.split("-")[0]]
    ?? null;

  if (annualRet === null) return { "1M":"N/D","6M":"N/D","1A":"N/D","5A":"N/D","10A":"N/D" };

  const monthly  = annualRet / 12;
  const r6m      = ((1 + monthly) ** 6  - 1) * 100;
  const r1a      = annualRet * 100;
  const r5a      = ((1 + annualRet) ** 5  - 1) * 100;
  const r10a     = ((1 + annualRet) ** 10 - 1) * 100;

  const fmt = (n: number) => (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
  return {
    "1M":  fmt(monthly * 100),
    "6M":  fmt(r6m),
    "1A":  fmt(r1a),
    "5A":  fmt(r5a),
    "10A": fmt(r10a),
  };
}
