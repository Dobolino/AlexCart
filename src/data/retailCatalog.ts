import type { Currency } from '@/types'
import { normalize } from '@/utils/text'

export type RetailCountry = 'CH' | 'DE'
export interface RetailSelection {
  country: RetailCountry
  retailerId: string
}
export interface Retailer {
  id: string
  name: string
  country: RetailCountry
  aliases?: string[]
}
export const RETAILERS: Retailer[] = [
  { id: 'migros', name: 'Migros', country: 'CH' },
  { id: 'coop', name: 'Coop', country: 'CH' },
  { id: 'denner', name: 'Denner', country: 'CH' },
  { id: 'aldi-ch', name: 'Aldi Suisse', country: 'CH' },
  { id: 'lidl-ch', name: 'Lidl Schweiz', country: 'CH' },
  { id: 'volg', name: 'Volg', country: 'CH' },
  { id: 'spar-ch', name: 'Spar Schweiz', country: 'CH', aliases: ['Spar'] },
  { id: 'manor', name: 'Manor', country: 'CH' },
  { id: 'landi', name: 'Landi', country: 'CH' },
  { id: 'globus', name: 'Globus', country: 'CH' },
  { id: 'ottos', name: "Otto's", country: 'CH' },
  { id: 'alnatura-ch', name: 'Alnatura', country: 'CH' },
  { id: 'avec', name: 'Avec', country: 'CH' },
  { id: 'proxi', name: 'Proxi', country: 'CH' },
  { id: 'edeka', name: 'Edeka', country: 'DE' },
  { id: 'marktkauf', name: 'Marktkauf', country: 'DE' },
  { id: 'rewe', name: 'Rewe', country: 'DE' },
  { id: 'kaufland', name: 'Kaufland', country: 'DE' },
  { id: 'aldi-de', name: 'Aldi Deutschland', country: 'DE', aliases: ['Aldi', 'Aldi Nord', 'Aldi Süd'] },
  { id: 'lidl-de', name: 'Lidl Deutschland', country: 'DE', aliases: ['Lidl'] },
  { id: 'penny', name: 'Penny', country: 'DE' },
  { id: 'netto', name: 'Netto Marken-Discount', country: 'DE', aliases: ['Netto'] },
  { id: 'dm', name: 'dm', country: 'DE' },
  { id: 'rossmann', name: 'Rossmann', country: 'DE' },
  { id: 'norma', name: 'Norma', country: 'DE' },
  { id: 'budni', name: 'Budni', country: 'DE' },
  { id: 'hit', name: 'Hit', country: 'DE' },
]
export const retailCurrency = (country: RetailCountry): Currency => (country === 'CH' ? 'CHF' : 'EUR')
export const defaultRetailer = (country: RetailCountry) => (country === 'CH' ? 'migros' : 'edeka')
export function findRetailer(name: string, country?: RetailCountry) {
  const key = normalize(name)
  return RETAILERS.find(
    (r) =>
      (!country || r.country === country) &&
      [r.name, ...(r.aliases ?? [])].some(
        (alias) => key === normalize(alias) || key.startsWith(normalize(alias) + ' ')
      )
  )
}
export function retailSelection(
  settings: { currency: Currency; retailSelection?: RetailSelection },
  store?: string,
  listName?: string
): RetailSelection {
  const known = store
    ? findRetailer(store)
    : settings.retailSelection
      ? undefined
      : findRetailer(listName ?? '')
  if (known) return { country: known.country, retailerId: known.id }
  const saved = settings.retailSelection
  if (saved && RETAILERS.some((r) => r.id === saved.retailerId && r.country === saved.country)) return saved
  return {
    country: settings.currency === 'CHF' ? 'CH' : 'DE',
    retailerId: defaultRetailer(settings.currency === 'CHF' ? 'CH' : 'DE'),
  }
}
export const BRAND_SECTORS = [
  'Alle Bereiche',
  'Lebensmittel',
  'Milch & Kühlung',
  'Fleisch & Fisch',
  'Süßes & Snacks',
  'Getränke',
  'Haushalt',
  'Pflege & Kosmetik',
  'Baby & Kind',
  'Tierbedarf',
  'Sport & Textilien',
  'Garten & Technik',
] as const
export type BrandSector = (typeof BRAND_SECTORS)[number]
export interface CatalogBrand {
  name: string
  retailerIds: string[]
  sector: BrandSector
}
const own = (retailerIds: string[], sector: BrandSector, names: string): CatalogBrand[] =>
  names.split('|').map((name) => ({ name, retailerIds, sector }))
const general = (sector: BrandSector, names: string) => own([], sector, names)
const entries: CatalogBrand[] = [
  ...own(
    ['migros'],
    'Alle Bereiche',
    'M Classic|M-Budget|Migros Bio|M-Bio|Aus der Region. Für die Region.|Sélection|V-Love|Aha!|YOU|Léger'
  ),
  ...own(['migros'], 'Lebensmittel', 'Anna’s Best|Farmer|Blévita|Pasta Premium'),
  ...own(['migros'], 'Milch & Kühlung', 'Valflora|Soja Line'),
  ...own(['migros'], 'Fleisch & Fisch', 'Don Pollo|Optigal'),
  ...own(['migros'], 'Süßes & Snacks', 'Frey|Sun Queen|Crème d’Or'),
  ...own(['migros'], 'Getränke', 'Café Royal|Exquisito|Delizio|Aproz|Passaia'),
  ...own(['migros'], 'Haushalt', 'Handy|Total|Potz|Oeco Power|Mio Star|Linsoft'),
  ...own(['migros'], 'Pflege & Kosmetik', 'I am|Candida|Zoé|Sun Look|Exelia'),
  ...own(['migros'], 'Baby & Kind', 'Milette'),
  ...own(['migros'], 'Tierbedarf', 'Exelcat|Exelpet'),
  ...own(['migros'], 'Sport & Textilien', 'Ellen Amber|John Adams|Trevolution|Perform'),
  ...own(['migros'], 'Garten & Technik', 'Do it + Garden|Miocolor|Mio Garden'),
  ...own(
    ['edeka', 'marktkauf'],
    'Alle Bereiche',
    'Gut & Günstig|Edeka|Edeka Herzstücke|Edeka Bio|Edeka Bio + Vegan|Edeka Genussmomente|Edeka Selection|Edeka Gourmet|Edeka My Veggie|Edeka Heimatliebe|Edeka Naturkind'
  ),
  ...own(['edeka', 'marktkauf'], 'Fleisch & Fisch', 'Bauerngut|Hofglück|Gutfleisch|Schwarzwaldhof'),
  ...own(['edeka', 'marktkauf'], 'Getränke', 'All in Fruits|Booster'),
  ...own(['edeka', 'marktkauf'], 'Haushalt', 'Edeka Zuhause'),
  ...own(
    ['edeka', 'marktkauf'],
    'Pflege & Kosmetik',
    'Elkos|Elkos Face|Elkos Body|Elkos Hair|Elkos Dental|Elkos Sun'
  ),
  ...own(['edeka', 'marktkauf'], 'Baby & Kind', 'Elkos Baby|Tabaluga'),
  ...own(['edeka', 'marktkauf'], 'Tierbedarf', 'Domino'),
  ...own(
    ['coop'],
    'Alle Bereiche',
    'Prix Garantie|Naturaplan|Coop Qualité & Prix|Fine Food|Karma|Betty Bossi|Délicorn|Free From|Pro Montagna|Sapori d’Italia|Naturafarm'
  ),
  ...own(['coop'], 'Haushalt', 'Oecoplan|Super Clean|Super Soft'),
  ...own(['coop'], 'Pflege & Kosmetik', 'Naturaline|Coop Care|Dentamed'),
  ...own(['coop'], 'Baby & Kind', 'My Baby'),
  ...own(['denner'], 'Alle Bereiche', 'Denner|Denner Bio'),
  ...own(
    ['rewe'],
    'Alle Bereiche',
    'ja!|Rewe Beste Wahl|Rewe Bio|Rewe Bio + Vegan|Rewe Feine Welt|Rewe Regional|Rewe frei von|Rewe To Go'
  ),
  ...own(['rewe'], 'Fleisch & Fisch', 'Wilhelm Brandenburg'),
  ...own(['rewe'], 'Pflege & Kosmetik', 'Today'),
  ...own(['rewe'], 'Tierbedarf', 'ZooRoyal'),
  ...own(
    ['kaufland'],
    'Alle Bereiche',
    'K-Classic|K-Bio|K-take it veggie|K-Favourites|K-free|K-Purland|K-Wertschätze|K-To Go'
  ),
  ...own(['kaufland'], 'Pflege & Kosmetik', 'Bevola'),
  ...own(
    ['lidl-ch', 'lidl-de'],
    'Lebensmittel',
    'Deluxe|Bio Organic|Chef Select|Combino|Freshona|Vemondo|Crownfield|Golden Sun|Baresa'
  ),
  ...own(['lidl-ch', 'lidl-de'], 'Milch & Kühlung', 'Milbona|Pilos'),
  ...own(['lidl-ch', 'lidl-de'], 'Fleisch & Fisch', 'Dulano|Ocean Sea'),
  ...own(['lidl-ch', 'lidl-de'], 'Süßes & Snacks', 'Alesto|Fin Carré|Sondey|Gelatelli|Snack Day'),
  ...own(['lidl-ch', 'lidl-de'], 'Getränke', 'Bellarom|Saskia|Solevita|Freeway'),
  ...own(['lidl-ch', 'lidl-de'], 'Haushalt', 'W5|Formil|Floralys'),
  ...own(['lidl-ch', 'lidl-de'], 'Pflege & Kosmetik', 'Cien|Dentalux'),
  ...own(['lidl-ch', 'lidl-de'], 'Baby & Kind', 'Lupilu'),
  ...own(['lidl-ch', 'lidl-de'], 'Tierbedarf', 'Coshida|Orlando'),
  ...own(['lidl-ch', 'lidl-de'], 'Sport & Textilien', 'Crivit|Esmara|Livergy'),
  ...own(['lidl-ch', 'lidl-de'], 'Garten & Technik', 'Parkside|Silvercrest'),
  ...own(
    ['aldi-ch', 'aldi-de'],
    'Lebensmittel',
    'Gut Bio|Bio Natura|Bellasan|Cucina|Goldähren|Golden Bridge|King’s Crown|Le Gusto|Specially Selected|My Vay'
  ),
  ...own(['aldi-ch', 'aldi-de'], 'Milch & Kühlung', 'Milsani'),
  ...own(['aldi-ch', 'aldi-de'], 'Süßes & Snacks', 'Choceur|Moser Roth|Biscotto'),
  ...own(['aldi-ch', 'aldi-de'], 'Fleisch & Fisch', 'Meine Metzgerei|Almare|Golden Seafood'),
  ...own(['aldi-ch', 'aldi-de'], 'Getränke', 'Rio d’Oro|Amaroy|Markus Kaffee|Westcliff|Südquelle'),
  ...own(['aldi-ch', 'aldi-de'], 'Haushalt', 'Tandil|Alio|Kokett'),
  ...own(['aldi-ch', 'aldi-de'], 'Pflege & Kosmetik', 'Lacura|Ombia|Kür'),
  ...own(['aldi-ch', 'aldi-de'], 'Baby & Kind', 'Mamia'),
  ...own(['aldi-ch', 'aldi-de'], 'Tierbedarf', 'Shah|Cachet|Romeo'),
  ...own(['aldi-ch', 'aldi-de'], 'Sport & Textilien', 'Crane|Alive|Blue Motion'),
  ...own(['aldi-ch', 'aldi-de'], 'Garten & Technik', 'Ferrex|Workzone|Ambiano'),
  ...own(['dm'], 'Pflege & Kosmetik', 'Balea|Alverde|Dontodent|Sundance|Ebelin|Jessa'),
  ...own(['dm'], 'Haushalt', 'Denkmit|Profissimo'),
  ...own(['dm'], 'Lebensmittel', 'dmBio|Mivolis'),
  ...own(['dm'], 'Baby & Kind', 'Babylove'),
  ...own(['dm'], 'Tierbedarf', 'Dein Bestes'),
  ...own(['rossmann'], 'Pflege & Kosmetik', 'Isana|Alterra|Sunozon|Prokudent|Rival de Loop|For Your Beauty'),
  ...own(['rossmann'], 'Haushalt', 'Domol|Flink & Sauber'),
  ...own(['rossmann'], 'Lebensmittel', 'EnerBio|Altapharma'),
  ...own(['rossmann'], 'Baby & Kind', 'Babydream'),
  ...general(
    'Lebensmittel',
    'Barilla|De Cecco|Rummo|Garofalo|Buitoni|Knorr|Maggi|Thomy|Heinz|Kühne|Hengstenberg|Bonduelle|Mutti|Oro di Parma|D’Aucy|Hak|Cirio|Ben’s Original|Oryza|Reis-Fit|Tipiak|Kikkoman|Lee Kum Kee|Blue Dragon|Thai Kitchen|Patak’s|Sharwood’s|Old El Paso|Santa Maria|Alnatura|Rapunzel|Davert|Bauck Mühle|Spielberger|Seeberger|Kölln|Kellogg’s|Weetabix|Nestlé|Schär|Hammermühle|Schnitzer|Harry|Golden Toast|Mestemacher|Wasa|Finn Crisp|Leimer|Dr. Oetker|Ruf|Alsa|Maizena|Mondamin|Diamant|Aurora|Rosenmehl|Driscoll’s|Chiquita|Dole|Zespri|Pink Lady|SanLucar|Chirat|Hero|St. Dalfour|Bonne Maman|Schwartau|Darbo|Zentis|Südzucker|Bertolli|Monini|Filippo Berio|Mazola|Rapso|Albaöl|Maille|Tabasco|Flying Goose'
  ),
  ...general(
    'Milch & Kühlung',
    'Emmi|Cremo|Züger|Zott|Müller|Weihenstephan|Landliebe|Berchtesgadener Land|Andechser Natur|Arla|Bärenmarke|Schwarzwaldmilch|Bauer|Danone|Activia|Actimel|Fruchtzwerge|Ehrmann|Almighurt|Onken|Yoplait|Ísey Skyr|Philadelphia|Kiri|Babybel|La Vache qui rit|Président|Le Rustique|Saint Albray|Géramont|Chavroux|Bresso|Boursin|Leerdammer|Fol Epi|Bergader|Rücker|Milram|Bonbel|Cathedral City|Kerrygold|Meggle|Lätta|Rama|Becel|Alpro|Oatly|Provamel|Simply V|Violife|Bedda|Henglein|Hilcona|Bürger|Rana|Settele|Nadler|Popp|Homann|Hochland|Goldsteig'
  ),
  ...general(
    'Fleisch & Fisch',
    'Bell|Rapelli|Malbuner|Citterio|Beretta|Herta|Rügenwalder Mühle|Wiesenhof|Gutfried|Reinert|Dieter Hein|Wiltmann|Abraham|Aoste|Houdek|Zimbo|Meica|Landhof|HANDL TYROL|Danish Crown|Iglo|Frosta|Followfood|Costa|Escal|Deutsche See|Saupiquet|Followfish|Hawesta|Larsen|Rügen Fisch|John West|Rio Mare'
  ),
  ...general(
    'Süßes & Snacks',
    'Lindt|Cailler|Toblerone|Villars|Ragusa|Camille Bloch|Munz|Minor|Kägi|Wernli|Kambly|Hug|Ovomaltine|Nutella|Ferrero|Kinder|Mon Chéri|Raffaello|Ferrero Rocher|Duplo|Hanuta|Milka|Ritter Sport|Tony’s Chocolonely|Alpia|Sarotti|Merci|Toffifee|Storck|Werther’s Original|Knoppers|Manner|Loacker|Bahlsen|Leibniz|De Beukelaer|Prinzen Rolle|Oreo|Lotus Biscoff|Lu|Mikado|McVitie’s|Walkers|Haribo|Katjes|Trolli|Maoam|Nimm2|Hitschies|Ricola|Vivil|Fisherman’s Friend|Mentos|Tic Tac|Airwaves|Extra|Chupa Chups|Pringles|Zweifel|Lorenz|Funny-Frisch|Chio|Lay’s|Doritos|Tyrrells|Ültje|NicNac’s|Kelly’s|Soletti|Huober|Saltletts|Pom-Bär|Schöller|Langnese|Magnum|Cornetto|Ben & Jerry’s|Häagen-Dazs|Gustavo Gusto'
  ),
  ...general(
    'Getränke',
    'Rivella|Coca-Cola|Fanta|Sprite|Pepsi|7Up|Sinalco|Schweppes|Orangina|Fritz-Kola|Afri Cola|Almdudler|Mezzo Mix|Lipton|Nestea|Fuze Tea|Pfanner|Rauch|Granini|Hohes C|Innocent|True Fruits|Valser|Henniez|Evian|Volvic|Vittel|Contrex|Perrier|San Pellegrino|Acqua Panna|Gerolsteiner|Adelholzener|Apollinaris|Vilsa|Römerquelle|Red Bull|Monster|Rockstar|Powerade|Isostar|Gatorade|Nescafé|Nespresso|Lavazza|Illy|Segafredo|Jacobs|Tchibo|Melitta|Mövenpick|Dallmayr|Café Intención|Bialetti|Twinings|Teekanne|Meßmer|Yogi Tea|Pukka|Sonnentor|Salus|Bad Heilbrunner|Nesquik|Caotina|Suchard|Feldschlösschen|Calanda|Quöllfrisch|Eichhof|Heineken|Carlsberg|Beck’s|Krombacher|Warsteiner|Bitburger|Paulaner|Erdinger|Augustiner|Franziskaner|Jever|Clausthaler|Mumm|Rotkäppchen|Freixenet|Henkell|Martini|Aperol'
  ),
  ...general(
    'Haushalt',
    'Persil|Ariel|Lenor|Frosch|Ecover|Sonett|Sodasan|Spee|Coral|Perwoll|Dalli|Weißer Riese|Vanish|Dr. Beckmann|Calgon|Sagrotan|Pril|Fairy|Fit|Palmolive|Finish|Somat|Sun|Reinex|Ajax|Meister Proper|Cillit Bang|Bref|WC-Ente|Domestos|Viss|Cif|Sidol|Poliboy|Spontex|Scotch-Brite|Vileda|Swiffer|Leifheit|Zewa|Tempo|Kleenex|Softis|Hakle|Cottonelle|Regina|Toppits|Alufix|Swirl|Duni|Paclan|Rotho|Curver|Brabantia|Mepal|Emsa|Tesa|Uhu|Pritt|Pattex|Scotch|Duracell|Varta|Energizer|Osram|Ledvance'
  ),
  ...general(
    'Pflege & Kosmetik',
    'Nivea|Dove|Neutrogena|Bebe|Penaten|Garnier|L’Oréal Paris|La Roche-Posay|CeraVe|Eucerin|Weleda|Lavera|Dr. Hauschka|Sante|Logona|Kneipp|Sebamed|CD|Speick|Fenjal|Florena|Atrix|Fa|Duschdas|Lux|Rexona|Axe|8x4|Hidrofugal|Old Spice|Borotalco|Elmex|Aronal|Meridol|Colgate|Sensodyne|Parodontax|Oral-B|Blend-a-med|Odol-med3|Listerine|Curaprox|TePe|Jordan|Guhl|Schwarzkopf|Schauma|Gliss Kur|Syoss|Taft|Got2b|Pantene|Head & Shoulders|Herbal Essences|Wella|John Frieda|Alpecin|Plantur|Bübchen|Gillette|Wilkinson Sword|Bic|Veet|Braun|Always|Carefree|O.B.|Tampax|Tena|Hartmann|Hansaplast|Compeed|Durex|Ritex|Labello|Blistex|Bepanthol|Maybelline|Essence|Catrice|Manhattan|Max Factor|Bourjois|Essie|Sally Hansen'
  ),
  ...general(
    'Baby & Kind',
    'Pampers|Huggies|Hipp|Aptamil|Beba|Bebivita|Milupa|Alete|Holle|Freche Freunde|Fruchtbar|Ella’s Kitchen|Organix|Nuk|Mam|Philips Avent|Chicco|Medela|Suavinex|Nuby|Reer|Fisher-Price|Playmobil|Lego|Ravensburger|Haba|Schleich|Toniebox'
  ),
  ...general(
    'Tierbedarf',
    'Whiskas|Felix|Sheba|Gourmet|Purina One|Purina Pro Plan|Friskies|Perfect Fit|Royal Canin|Hill’s|Animonda|Miamor|Leonardo|Catz Finefood|Almo Nature|Applaws|Schesir|Josera|Happy Cat|Pedigree|Cesar|Frolic|Rinti|Terra Canis|Belcando|Bosch Tiernahrung|Happy Dog|Eukanuba|Iams|Vitakraft|Versele-Laga|Bunny Nature|JBL|Tetra|Sera|Catsan|Biokat’s|Cat’s Best|Ever Clean|Sanicat|Chappi|Dog Chow'
  ),
  ...general(
    'Sport & Textilien',
    'Adidas|Nike|Puma|Reebok|Asics|New Balance|Under Armour|Hummel|Fila|Champion|Skechers|Salomon|Mammut|Odlo|Craft|Falke|Burlington|Schiesser|Calida|Triumph|Sloggi|Mey|Skiny|Hanro|Fruit of the Loom|Hanes|Levi’s|Wrangler|Lee|Jack Wolfskin|Deuter|Ortlieb|Vaude|Tatonka|Wenko'
  ),
  ...general(
    'Garten & Technik',
    'Gardena|Fiskars|Wolf-Garten|Compo|Neudorff|Substral|Seramis|Westland|Bosch|Einhell|Makita|Metabo|Kärcher|Stihl|Black+Decker|DeWalt|Wagner|Ryobi|Dremel|Stanley|Wera|Knipex|Fischer|Spax|Alpina|Schöner Wohnen Farbe|Brennenstuhl|Hama|Philips|Panasonic|Sony|Samsung|Logitech|Sandisk|Intenso|Ansmann|ABUS|Burg-Wächter|Weber|Campingaz|Enders|Severin|Tefal|Krups|Rowenta|Russell Hobbs|WMF|Fissler|Silit|Zwilling|Victorinox'
  ),
]
export const BRAND_CATALOG = [...new Map(entries.map((b) => [normalize(b.name), b])).values()]
export const brandSearchKey = (name: string) =>
  normalize(name)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
const byName = new Map(BRAND_CATALOG.map((b) => [brandSearchKey(b.name), b]))
export const catalogBrand = (name: string) => byName.get(brandSearchKey(name))
export const BRAND_CATALOG_NOTE =
  'Kuratierte Markenauswahl, keine vollständige Live-Sortimentsliste. Regionale Verfügbarkeit und Bezeichnungen können abweichen.'
export const BRAND_CATALOG_SOURCES = [
  { label: 'Migros Marken', url: 'https://www.migros.ch/de/entdecken/marken' },
  { label: 'Edeka Eigenmarken', url: 'https://www.edeka.de/unsere-marken/index.jsp' },
]
