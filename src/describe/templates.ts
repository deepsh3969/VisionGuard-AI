/**
 * Grounded, deterministic description templates for the 80 COCO classes.
 *
 * Rules enforced by content and by tests:
 * - No brands, model numbers, hidden contents, material claims from pixels,
 *   medical/chemical identity, safety certifications, or invented specs.
 * - Visual characteristics describe only generally observable features.
 * - Handling guidance is generic and non-certified.
 */

export interface TemplateEntry {
  short: string;
  purpose: string;
  applications: string;
  visual: string;
  handling: string;
  facts: string[];
  detailLevel: 'basic' | 'moderate' | 'rich';
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  person: {
    short: 'A person, detected as a human figure in the frame.',
    purpose: 'People are detected for context; VisionGuard does not identify individuals.',
    applications: 'Scene context, occupancy awareness, accessibility assistance.',
    visual: 'Typically shows head, torso and limbs; clothing and pose vary widely.',
    handling: 'Respect privacy. VisionGuard never identifies people or infers personal attributes.',
    facts: [
      'VisionGuard deliberately does not perform face recognition or attribute inference.',
    ],
    detailLevel: 'basic',
  },
  bicycle: {
    short: 'A bicycle — a human-powered vehicle with two wheels.',
    purpose: 'Personal transportation and exercise.',
    applications: 'Commuting, recreation, sport, delivery riding.',
    visual: 'Two large wheels, a frame, handlebars, a seat and pedals with a chain drive.',
    handling: 'Check brakes and tire pressure before use; wear a helmet where appropriate.',
    facts: [
      'Standard bicycles transfer pedaling force to the rear wheel through a chain or belt.',
    ],
    detailLevel: 'rich',
  },
  car: {
    short: 'A car — a four-wheeled motor vehicle for road travel.',
    purpose: 'Private road transportation of passengers and light cargo.',
    applications: 'Personal transport, ride-hailing, logistics, motorsport.',
    visual: 'Enclosed body on four wheels, with windows, doors and lights.',
    handling: 'Always obey traffic rules; verify surroundings before opening doors.',
    facts: [
      'Most passenger cars have four wheels and an enclosed cabin for a small number of people.',
    ],
    detailLevel: 'rich',
  },
  motorcycle: {
    short: 'A motorcycle — a two-wheeled motorized vehicle.',
    purpose: 'Motorized transport for one or two riders on two wheels.',
    applications: 'Commuting, touring, sport, delivery services.',
    visual: 'Two wheels with an exposed engine, handlebars, and a seat for the rider.',
    handling: 'Protective gear is strongly recommended; handle at low speeds with care.',
    facts: [
      'Motorcycles accelerate and stop faster than most cars and are less visible in traffic.',
    ],
    detailLevel: 'moderate',
  },
  airplane: {
    short: 'An airplane — a powered fixed-wing aircraft.',
    purpose: 'Air transportation of passengers and cargo.',
    applications: 'Commercial aviation, cargo freight, private travel, aviation training.',
    visual: 'Fixed wings, one or more engines, tail assembly; parked aircraft show landing gear.',
    handling: 'Only approach aircraft with authorization; keep clear of runways and propellers.',
    facts: [
      'Fixed wings generate lift as the aircraft moves forward through the air.',
    ],
    detailLevel: 'moderate',
  },
  bus: {
    short: 'A bus — a large road vehicle built to carry many passengers.',
    purpose: 'Mass road transit of groups of people.',
    applications: 'Public transport, school transport, tourism, shuttles.',
    visual: 'Long rectangular body with many windows and multiple doors.',
    handling: 'Allow large vehicles extra stopping distance; watch for passengers exiting.',
    facts: [
      'Buses carry far more passengers per road space than private cars.',
    ],
    detailLevel: 'rich',
  },
  train: {
    short: 'A train — connected rail vehicles running on tracks.',
    purpose: 'Efficient land transport of passengers or freight over long distances.',
    applications: 'Commuter rail, intercity travel, freight logistics.',
    visual: 'A powered locomotive or multiple units pulling carriages along metal rails.',
    handling: 'Never cross active tracks at non-designated points; trains are quiet and stop slowly.',
    facts: [
      'Trains have low rolling resistance, making them energy-efficient for heavy loads.',
    ],
    detailLevel: 'moderate',
  },
  truck: {
    short: 'A truck — a motor vehicle designed to carry cargo.',
    purpose: 'Road transport of goods and materials.',
    applications: 'Logistics, construction, moving services, delivery.',
    visual: 'Cab for the driver plus a large cargo bed, box or trailer.',
    handling: 'Expect wide turns and long braking distances; stay out of blind spots.',
    facts: [
      'Larger trucks often have air brakes and require special licenses to operate.',
    ],
    detailLevel: 'moderate',
  },
  boat: {
    short: 'A boat — a small to mid-sized watercraft.',
    purpose: 'Travel and work on water.',
    applications: 'Fishing, recreation, transport, water sports, rescue.',
    visual: 'A hull designed to float, often with a bow, seating and propulsion (oar, motor or sail).',
    handling: 'Wear flotation devices; check weather and local boating rules before departure.',
    facts: [
      'Boats stay afloat through displacement or planing of their hull shape.',
    ],
    detailLevel: 'moderate',
  },
  'traffic light': {
    short: 'A traffic light — a signal that controls road traffic with colored lights.',
    purpose: 'Regulate the flow of vehicles and pedestrians at intersections.',
    applications: 'Road junctions, pedestrian crossings, roundabouts.',
    visual: 'Vertical housing with red, amber and green lamps, often on a pole or mast arm.',
    handling: 'Obey the current signal; some signals include pedestrian or arrow phases.',
    facts: [
      'Traffic lights usually cycle red → green → amber with a red phase in between.',
    ],
    detailLevel: 'moderate',
  },
  'fire hydrant': {
    short: 'A fire hydrant — a roadside water connection for firefighting.',
    purpose: 'Provide pressurized water to fire departments.',
    applications: 'Fire response, occasional maintenance flushing.',
    visual: 'Short metal post, often red or yellow, with capped side outlets.',
    handling: 'Keep hydrants unobstructed; only trained personnel should operate them.',
    facts: [
      'Hydrants connect to municipal water mains sized for firefighting flow rates.',
    ],
    detailLevel: 'moderate',
  },
  'stop sign': {
    short: 'A stop sign — an octagonal red sign requiring a full stop.',
    purpose: 'Require vehicles to halt before proceeding at an intersection.',
    applications: 'Intersections, private roads, pedestrian crossings.',
    visual: 'Red octagon with white "STOP" lettering and a reflective border.',
    handling: 'Come to a complete stop and yield according to local rules.',
    facts: [
      'The octagonal shape lets drivers recognize the sign even from the back.',
    ],
    detailLevel: 'moderate',
  },
  'parking meter': {
    short: 'A parking meter — a device that collects payment for timed parking.',
    purpose: 'Manage limited-duration parking spaces.',
    applications: 'Urban curbside parking, paid lots.',
    visual: 'Post-mounted unit with a display, payment slot or reader, and a status indicator.',
    handling: 'Follow posted time limits and payment instructions; rates vary by location.',
    facts: [
      'Modern parking meters often accept cards or phone payments in addition to coins.',
    ],
    detailLevel: 'basic',
  },
  bench: {
    short: 'A bench — a long seat without a back or with one, for several people.',
    purpose: 'Provide public or garden seating.',
    applications: 'Parks, transit stops, gardens, waiting areas.',
    visual: 'Long flat seat, often on legs, made of wood, metal or concrete.',
    handling: 'Check stability before sitting; outdoor surfaces can be hot or wet.',
    facts: [
      'Park benches are designed for short-term public use and weather resistance.',
    ],
    detailLevel: 'basic',
  },
  bird: {
    short: 'A bird — a warm-blooded animal with feathers, wings and a beak.',
    purpose: 'Wildlife subject; observed rather than handled.',
    applications: 'Ecology, birdwatching, pest management contexts.',
    visual: 'Feathered body, wings, beak and clawed feet; sizes vary enormously.',
    handling: 'Observe wild birds from a distance; do not handle nests or chicks.',
    facts: [
      'All living birds have feathers, the defining feature of the group.',
    ],
    detailLevel: 'moderate',
  },
  cat: {
    short: 'A cat — a small domesticated feline animal.',
    purpose: 'Companion animal; also used for pest control in some settings.',
    applications: 'Pet ownership, working farm cats, animal-assisted activities.',
    visual: 'Pointed ears, retractile claws, whiskers, soft fur, long tail.',
    handling: 'Approach calmly; support the body if lifting; respect the animal’s signals.',
    facts: [
      'Domestic cats retain many hunting behaviours of their wild ancestors.',
    ],
    detailLevel: 'moderate',
  },
  dog: {
    short: 'A dog — a domesticated canine animal.',
    purpose: 'Companion, working and service animal.',
    applications: 'Pets, herding, guarding, search and rescue, assistance work.',
    visual: 'Muzzle, floppy or upright ears, fur coat, tail; breeds vary widely in size.',
    handling: 'Ask the owner before petting; give unfamiliar dogs space and calm body language.',
    facts: [
      'Dogs were among the first domesticated animals and read human social cues well.',
    ],
    detailLevel: 'rich',
  },
  horse: {
    short: 'A horse — a large domesticated hoofed animal used for riding and work.',
    purpose: 'Riding, racing, herding and light draft work.',
    applications: 'Equestrian sport, farming, tourism, therapeutic riding.',
    visual: 'Large body on four legs with a mane, long tail and hooves.',
    handling: 'Approach from the side, speak softly; never stand directly behind a horse.',
    facts: [
      'Horses sleep standing up for short periods using a stay apparatus in their legs.',
    ],
    detailLevel: 'moderate',
  },
  sheep: {
    short: 'A sheep — a domesticated ruminant raised for wool and meat.',
    purpose: 'Livestock production.',
    applications: 'Wool, meat and milk production; land management grazing.',
    visual: 'Thick woolly fleece, horizontal pupils, typically a white or dark coat.',
    handling: 'Livestock should only be handled by experienced people; flock animals get stressed alone.',
    facts: [
      'Sheep wool keeps growing and usually needs periodic shearing.',
    ],
    detailLevel: 'basic',
  },
  cow: {
    short: 'A cow — a large domesticated bovine kept for milk and meat.',
    purpose: 'Livestock production.',
    applications: 'Dairy farming, beef production, manure as fertilizer.',
    visual: 'Large heavy body, hooves, often with a distinctive coat pattern; some have horns.',
    handling: 'Cows are large and can injure by accident; give them room and move calmly.',
    facts: [
      'Cows are ruminants with a four-chambered stomach for digesting grass.',
    ],
    detailLevel: 'moderate',
  },
  elephant: {
    short: 'An elephant — the largest living land animal, with a trunk and tusks.',
    purpose: 'Wildlife subject; keystone species in its habitat.',
    applications: 'Ecology, conservation programs, wildlife tourism (observe only).',
    visual: 'Massive body, long trunk, large ears, thick legs; tusks in some individuals.',
    handling: 'Wild elephants are dangerous at close range; observe from a safe, permitted distance.',
    facts: [
      'An elephant’s trunk combines a nose and upper lip with thousands of muscles.',
    ],
    detailLevel: 'moderate',
  },
  bear: {
    short: 'A bear — a large powerful mammal with thick fur and plantigrade feet.',
    purpose: 'Wildlife subject.',
    applications: 'Ecology, conservation, wildlife observation.',
    visual: 'Stocky body, thick fur, round ears, short tail, five non-retractile claws.',
    handling: 'Never approach or feed wild bears; secure food and follow local wildlife guidance.',
    facts: [
      'Bears have an excellent sense of smell and most are opportunistic omnivores.',
    ],
    detailLevel: 'moderate',
  },
  zebra: {
    short: 'A zebra — an African wild equine known for black-and-white stripes.',
    purpose: 'Wildlife subject.',
    applications: 'Ecology, conservation, wildlife tourism.',
    visual: 'Horse-like body covered in bold black-and-white stripe patterns.',
    handling: 'Observe from a distance in vehicles or designated areas; they can kick and bite.',
    facts: [
      'Every zebra’s stripe pattern is unique, like a fingerprint.',
    ],
    detailLevel: 'basic',
  },
  giraffe: {
    short: 'A giraffe — the tallest living animal, with a very long neck.',
    purpose: 'Wildlife subject.',
    applications: 'Ecology, conservation, wildlife tourism.',
    visual: 'Extremely long neck and legs, patterned coat, small horn-like ossicones.',
    handling: 'Observe from a safe distance; a giraffe kick is powerful.',
    facts: [
      'Despite its long neck, a giraffe has the same seven neck vertebrae as most mammals.',
    ],
    detailLevel: 'basic',
  },
  backpack: {
    short: 'A backpack — a bag carried on the back with two shoulder straps.',
    purpose: 'Carry personal items hands-free.',
    applications: 'School, hiking, travel, commuting.',
    visual: 'Fabric compartment with shoulder straps, often with zippers and pockets.',
    handling: 'Use both straps for even load; don’t overpack beyond comfortable weight.',
    facts: [
      'Properly fitted backpacks spread load weight across the shoulders and hips.',
    ],
    detailLevel: 'moderate',
  },
  umbrella: {
    short: 'An umbrella — a foldable canopy on a central pole for rain or sun.',
    purpose: 'Protect the user from rain or strong sun.',
    applications: 'Everyday weather protection, fashion, sun shade.',
    visual: 'Circular fabric canopy with radial ribs and a straight or curved handle.',
    handling: 'Close before entering crowded spaces; take care around electrical equipment when wet.',
    facts: [
      'Umbrellas work by shedding water off a stretched, water-resistant canopy.',
    ],
    detailLevel: 'basic',
  },
  handbag: {
    short: 'A handbag — a small to medium bag for carrying personal items.',
    purpose: 'Carry everyday essentials.',
    applications: 'Fashion, daily errands, travel organization.',
    visual: 'Soft or structured bag with a handle or strap and a closure.',
    handling: 'Keep closures fastened in crowds; distribute weight to avoid strap strain.',
    facts: [
      'Handbag styles vary widely across cultures and eras.',
    ],
    detailLevel: 'basic',
  },
  tie: {
    short: 'A tie — a length of fabric worn around the neck under a collar.',
    purpose: 'Formal or decorative neckwear.',
    applications: 'Business attire, formal events, uniforms.',
    visual: 'Narrow tapering strip of fabric, typically knotted at the collar.',
    handling: 'Avoid loose ties near machinery; store hanging or rolled to prevent creases.',
    facts: [
      'The common knot families include Windsor, half-Windsor and four-in-hand.',
    ],
    detailLevel: 'basic',
  },
  suitcase: {
    short: 'A suitcase — a rectangular case for packing clothes and travel items.',
    purpose: 'Transport belongings during travel.',
    applications: 'Air travel, hotels, relocation.',
    visual: 'Hard or soft rectangular shell with a handle, wheels or carry straps, and latches or zippers.',
    handling: 'Check weight limits for carriers; keep valuables and documents secure.',
    facts: [
      'Wheeled uprights (spinners) became standard as air travel grew.',
    ],
    detailLevel: 'basic',
  },
  frisbee: {
    short: 'A frisbee — a smooth plastic disc thrown for catching games.',
    purpose: 'Recreational throwing and catching.',
    applications: 'Park games, ultimate frisbee, disc golf (related discs).',
    visual: 'Round disc with a rounded rim and slightly domed top.',
    handling: 'Throw in open areas away from crowds, roads and vehicles.',
    facts: [
      'A disc’s curved top generates lift as it spins through the air.',
    ],
    detailLevel: 'basic',
  },
  skis: {
    short: 'Skis — a pair of long flat runners for travelling over snow.',
    purpose: 'Travel or sport across snow.',
    applications: 'Alpine and cross-country skiing, ski touring.',
    visual: 'Long narrow boards with turned-up tips and bindings for boots.',
    handling: 'Use within your skill level, follow slope rules, and wear appropriate protection.',
    facts: [
      'Skis glide because their base is waxed and the pressure melts a thin water layer.',
    ],
    detailLevel: 'basic',
  },
  snowboard: {
    short: 'A snowboard — a single wide board ridden across snow.',
    purpose: 'Snow sport riding.',
    applications: 'Freestyle, freeride, racing snowboarding.',
    visual: 'Single broad board with bindings for both boots; soft curved tips.',
    handling: 'Learn falling and stopping technique first; wear wrist and head protection.',
    facts: [
      'Snowboard bindings fix both feet to one board, unlike skiing.',
    ],
    detailLevel: 'basic',
  },
  'sports ball': {
    short: 'A sports ball — a rounded ball used in a ball game.',
    purpose: 'Play and competition in various ball sports.',
    applications: 'Football, basketball, volleyball and many other games.',
    visual: 'Spherical ball, size and surface pattern vary by sport.',
    handling: 'Use the correct ball type for the sport and playing surface.',
    facts: [
      'Ball specifications (size, mass, pressure) are defined per sport.',
    ],
    detailLevel: 'moderate',
  },
  kite: {
    short: 'A kite — a lightweight frame covered with material that flies on wind-borne lines.',
    purpose: 'Recreation and sport flying.',
    applications: 'Parks and beaches, kite festivals, kite surfing (power kites).',
    visual: 'Angular or curved frame with a tail, attached to control lines.',
    handling: 'Fly away from power lines, roads and airports; avoid flying in storms.',
    facts: [
      'Kites stay aloft because wind flowing over the sail creates lift.',
    ],
    detailLevel: 'basic',
  },
  'baseball bat': {
    short: 'A baseball bat — a tapered club used to hit a baseball.',
    purpose: 'Striking the ball in baseball or softball.',
    applications: 'Baseball and softball play and practice.',
    visual: 'Long tapered cylinder, narrow handle widening to a barrel.',
    handling: 'Use in designated areas; carry barrel-down and mind nearby people.',
    facts: [
      'League rules define bat materials, length and diameter limits.',
    ],
    detailLevel: 'basic',
  },
  'baseball glove': {
    short: 'A baseball glove — a padded leather glove for catching balls.',
    purpose: 'Protect the hand and secure catches.',
    applications: 'Baseball and softball fielding.',
    visual: 'Large padded glove with webbing between thumb and fingers.',
    handling: 'Break in new gloves gradually; keep leather conditioned.',
    facts: [
      'Glove patterns differ by position — pitchers, catchers and fielders use specialized shapes.',
    ],
    detailLevel: 'basic',
  },
  skateboard: {
    short: 'A skateboard — a short board on four small wheels.',
    purpose: 'Personal transport and sport.',
    applications: 'Street skating, parks, commuting short distances.',
    visual: 'Flat deck with grip tape, two trucks and four small hard wheels.',
    handling: 'Wear helmet and pads; learn to stop before riding in traffic areas.',
    facts: [
      'The trucks pivot, which is how a skateboard turns when the rider leans.',
    ],
    detailLevel: 'moderate',
  },
  surfboard: {
    short: 'A surfboard — a long buoyant board ridden on breaking waves.',
    purpose: 'Ocean sport riding waves.',
    applications: 'Surfing, surf schools, competitive surfing.',
    visual: 'Elongated buoyant board with a pointed or rounded nose, fins underneath, leash plug.',
    handling: 'Know ocean conditions and etiquette; wax the deck for grip; use a leash.',
    facts: [
      'Fins at the tail provide directional stability while surfing.',
    ],
    detailLevel: 'moderate',
  },
  'tennis racket': {
    short: 'A tennis racket — a strung frame used to strike a tennis ball.',
    purpose: 'Hit the ball in tennis.',
    applications: 'Recreational and competitive tennis.',
    visual: 'Oval stringed head, throat and handle with grip.',
    handling: 'Use the correct string tension for your level; keep the racket dry.',
    facts: [
      'Modern rackets are lightweight composites; string patterns affect spin and control.',
    ],
    detailLevel: 'basic',
  },
  bottle: {
    short: 'A bottle — a narrow-necked container for liquids.',
    purpose: 'Store and pour liquids.',
    applications: 'Beverages, condiments, laboratory and household use.',
    visual: 'Cylindrical body with a narrower neck and a cap or closure.',
    handling: 'VisionGuard cannot know what is inside a bottle — check the label yourself.',
    facts: [
      'Bottles are produced in glass and many plastics; closures vary by contents.',
    ],
    detailLevel: 'moderate',
  },
  'wine glass': {
    short: 'A wine glass — a stemmed glass designed for drinking wine.',
    purpose: 'Serve wine with aroma concentration.',
    applications: 'Dining, tastings, events.',
    visual: 'Stem with foot supporting a bowl; bowl shape varies by wine style.',
    handling: 'Hold by the stem to avoid warming the bowl; handle glassware carefully.',
    facts: [
      'Wider bowls allow more aeration, which can open up a wine’s aroma.',
    ],
    detailLevel: 'basic',
  },
  cup: {
    short: 'A cup — a small open container for drinking.',
    purpose: 'Hold beverages for drinking.',
    applications: 'Hot and cold drinks, measurement in cooking.',
    visual: 'Rounded open top, often with a handle; materials vary widely.',
    handling: 'Contents may be hot — test before drinking. VisionGuard cannot identify liquids.',
    facts: [
      'Measuring cups mark volume units for cooking accuracy.',
    ],
    detailLevel: 'rich',
  },
  fork: {
    short: 'A fork — a utensil with prongs for spearing and lifting food.',
    purpose: 'Eat or serve food.',
    applications: 'Dining, cooking, serving.',
    visual: 'Handle ending in two or more prongs.',
    handling: 'Standard table hygiene applies; prongs can be sharp.',
    facts: [
      'Forks gained widespread table use in Europe over several centuries.',
    ],
    detailLevel: 'basic',
  },
  knife: {
    short: 'A knife — a tool with a blade for cutting or spreading.',
    purpose: 'Cut food or materials.',
    applications: 'Kitchen prep, dining, outdoor and craft use.',
    visual: 'Blade with an edge attached to a handle; shapes vary by purpose.',
    handling: 'Sharp blades cut easily — cut away from your body and store safely.',
    facts: [
      'Kitchen knives are grouped by task: chef’s, paring, serrated and more.',
    ],
    detailLevel: 'moderate',
  },
  spoon: {
    short: 'A spoon — a utensil with a shallow bowl for scooping.',
    purpose: 'Eat or stir soft foods and liquids.',
    applications: 'Dining, cooking, tasting, measuring.',
    visual: 'Handle with a small concave bowl at the end.',
    handling: 'Standard tableware care; keep away from machinery when stirring hot contents.',
    facts: [
      'Measuring spoons standardize small ingredient quantities in cooking.',
    ],
    detailLevel: 'basic',
  },
  bowl: {
    short: 'A bowl — a deep round dish for holding food.',
    purpose: 'Serve or mix food.',
    applications: 'Cereal, soup, salads, food preparation.',
    visual: 'Rounded deep basin, wider at the top than the base.',
    handling: 'Contents may be hot; bowls can be heavy when full — support the base.',
    facts: [
      'Bowls are among the oldest forms of tableware.',
    ],
    detailLevel: 'basic',
  },
  banana: {
    short: 'A banana — a curved yellow fruit that grows in clusters.',
    purpose: 'Edible fruit eaten as a snack or ingredient.',
    applications: 'Snacking, baking, smoothies, breakfast foods.',
    visual: 'Curved elongated fruit with a peel; yellow when ripe, green when unripe.',
    handling: 'Peel before eating. VisionGuard cannot assess ripeness or safety of prepared food.',
    facts: [
      'Bananas are berries botanically and grow hanging in bunches called hands.',
    ],
    detailLevel: 'moderate',
  },
  apple: {
    short: 'An apple — a round firm fruit that grows on trees.',
    purpose: 'Edible fruit.',
    applications: 'Fresh eating, cooking, juice and cider production.',
    visual: 'Round fruit with smooth skin, a stem dimple at the top, ranging red, green or yellow.',
    handling: 'Rinse before eating; check for bruises on soft-skinned fruit.',
    facts: [
      'There are thousands of apple cultivars with different textures and flavors.',
    ],
    detailLevel: 'moderate',
  },
  sandwich: {
    short: 'A sandwich — fillings between slices of bread or a split roll.',
    purpose: 'Convenient prepared meal.',
    applications: 'Lunches, picnics, cafes, packed meals.',
    visual: 'Layered filling inside or between bread; triangular or rectangular cuts are common.',
    handling: 'Keep perishable fillings chilled; check allergens if sharing.',
    facts: [
      'Sandwich variations exist in nearly every cuisine that uses bread.',
    ],
    detailLevel: 'basic',
  },
  orange: {
    short: 'An orange — a round citrus fruit with a segmented interior.',
    purpose: 'Edible fruit, eaten fresh or juiced.',
    applications: 'Snacking, juice, cooking, zest.',
    visual: 'Round fruit with thick dimpled orange peel; segmented flesh inside.',
    handling: 'Peel before eating; citrus can sting cuts and eyes.',
    facts: [
      'Oranges are a major source of vitamin C.',
    ],
    detailLevel: 'basic',
  },
  broccoli: {
    short: 'Broccoli — a green vegetable with dense flowering heads.',
    purpose: 'Edible vegetable.',
    applications: 'Steaming, roasting, stir-fry, soups.',
    visual: 'Dark green clustered florets on thicker stalks.',
    handling: 'Rinse thoroughly; cook or eat raw according to preference.',
    facts: [
      'Broccoli is a cultivar of the cabbage family Brassica oleracea.',
    ],
    detailLevel: 'basic',
  },
  carrot: {
    short: 'A carrot — an orange root vegetable, conical in shape.',
    purpose: 'Edible root vegetable.',
    applications: 'Raw snacking, soups, roasting, juicing, baking.',
    visual: 'Tapered orange root with a leafy green top when sold fresh.',
    handling: 'Scrub or peel before use; store cool to keep crisp.',
    facts: [
      'Carrots come in orange, purple, yellow and other colors depending on variety.',
    ],
    detailLevel: 'basic',
  },
  'hot dog': {
    short: 'A hot dog — a sausage served in a sliced bun.',
    purpose: 'Prepared fast meal.',
    applications: 'Street food, barbecues, sports events.',
    visual: 'Long sausage in a soft elongated bun, often with condiments.',
    handling: 'Cook sausages thoroughly; mind allergies in toppings and mustard.',
    facts: [
      'The hot dog bun is sliced along the top in most North American styles.',
    ],
    detailLevel: 'basic',
  },
  pizza: {
    short: 'Pizza — a baked flatbread topped with sauce, cheese and other ingredients.',
    purpose: 'Shared meal.',
    applications: 'Restaurants, delivery, home baking.',
    visual: 'Round flat base with a raised crust edge, tomato sauce and melted cheese toppings.',
    handling: 'Fresh pizza is very hot; check for allergens such as gluten and dairy.',
    facts: [
      'Pizza styles vary widely by region, from thin Neapolitan to deep-dish.',
    ],
    detailLevel: 'moderate',
  },
  donut: {
    short: 'A donut — a fried or baked dough pastry, often ring-shaped and glazed.',
    purpose: 'Sweet snack or treat.',
    applications: 'Bakeries, breakfast, celebrations.',
    visual: 'Round pastry, sometimes with a center hole, topped with glaze or icing.',
    handling: 'Contains sugar and often allergens; enjoy in moderation.',
    facts: [
      'Both ring and filled (hole-less) donut styles are common.',
    ],
    detailLevel: 'basic',
  },
  cake: {
    short: 'A cake — a sweet baked dessert, often layered and frosted.',
    purpose: 'Dessert and celebration food.',
    applications: 'Birthdays, weddings, gatherings, cafés.',
    visual: 'Layered sponge with frosting or icing, frequently decorated.',
    handling: 'Check for allergens; cakes with cream require refrigeration.',
    facts: [
      'Cake recipes span from light sponge to dense fruitcake styles.',
    ],
    detailLevel: 'moderate',
  },
  chair: {
    short: 'A chair — a seat for one person, usually with a back.',
    purpose: 'Seating.',
    applications: 'Dining, offices, classrooms, waiting areas.',
    visual: 'Seat surface, legs, and typically a backrest; armrests optional.',
    handling: 'Check stability before sitting; use chairs only on level floors.',
    facts: [
      'Chair design is a major subject of ergonomics and industrial design.',
    ],
    detailLevel: 'moderate',
  },
  couch: {
    short: 'A couch (sofa) — a padded multi-person seat with a back and arms.',
    purpose: 'Seating for several people.',
    applications: 'Living rooms, lounges, waiting areas.',
    visual: 'Long upholstered seat with backrest, armrests and cushions.',
    handling: 'Lift with the frame, not the cushions, when moving.',
    facts: [
      'Sofas come as two-seat loveseats up to large sectional configurations.',
    ],
    detailLevel: 'basic',
  },
  'potted plant': {
    short: 'A potted plant — a plant growing in a container.',
    purpose: 'Decoration, air-quality interest, food growing.',
    applications: 'Indoor décor, balconies, herb growing.',
    visual: 'Foliage or flowers emerging from a pot with soil.',
    handling: 'Water according to species needs; some common plants are toxic to pets.',
    facts: [
      'Drainage holes in pots help prevent root rot from overwatering.',
    ],
    detailLevel: 'basic',
  },
  bed: {
    short: 'A bed — a piece of furniture for sleeping.',
    purpose: 'Sleep and rest.',
    applications: 'Bedrooms, hotels, hospitals.',
    visual: 'Flat raised platform with mattress, often with pillows and bedding.',
    handling: 'Choose a mattress and height suited to the user’s needs.',
    facts: [
      'Bed sizes are standardized by region (twin, queen, king, etc.).',
    ],
    detailLevel: 'basic',
  },
  'dining table': {
    short: 'A dining table — a table set for eating meals.',
    purpose: 'Shared eating and gathering surface.',
    applications: 'Homes, restaurants, cafeterias.',
    visual: 'Flat top on legs, sized for seating around the edges.',
    handling: 'Protect surfaces from heat and sharp objects; stabilize extensions before use.',
    facts: [
      'Table shapes (rectangular, round, oval) affect traffic flow in a room.',
    ],
    detailLevel: 'basic',
  },
  toilet: {
    short: 'A toilet — a plumbing fixture for human waste disposal.',
    purpose: 'Sanitation.',
    applications: 'Bathrooms and washrooms.',
    visual: 'Bowl with seat and lid connected to a water supply and drain.',
    handling: 'Follow hygiene practices; report leaks or faults to building maintenance.',
    facts: [
      'Modern toilets use a small amount of water per flush compared to older designs.',
    ],
    detailLevel: 'basic',
  },
  tv: {
    short: 'A TV — a television screen for viewing broadcast or streamed video.',
    purpose: 'Display video entertainment and information.',
    applications: 'Home entertainment, presentations, signage.',
    visual: 'Large flat panel with a stand or wall mount and a dark screen when off.',
    handling: 'Secure against tipping; support the display when lifting.',
    facts: [
      'Modern TVs are thin flat panels; picture quality varies with panel technology.',
    ],
    detailLevel: 'basic',
  },
  laptop: {
    short: 'A laptop — a portable computer with a built-in screen and keyboard.',
    purpose: 'Portable computing.',
    applications: 'Work, study, creative production, communication.',
    visual: 'Clamshell design: screen folds down over a keyboard base; trackpad below keys.',
    handling: 'Vent the base for cooling; handle by the base, not the screen.',
    facts: [
      'Laptops integrate battery, display and input so they run without mains power.',
    ],
    detailLevel: 'rich',
  },
  mouse: {
    short: 'A mouse — a handheld pointing device for a computer.',
    purpose: 'Control the on-screen cursor.',
    applications: 'Desktop computing, design, gaming.',
    visual: 'Palm-sized device with buttons and a scroll wheel; wired or wireless.',
    handling: 'Use on a suitable surface; keep the sensor clean.',
    facts: [
      'Optical mice track movement with a camera or laser under the device.',
    ],
    detailLevel: 'basic',
  },
  remote: {
    short: 'A remote — a handheld controller that operates a device wirelessly.',
    purpose: 'Control electronics from a distance.',
    applications: 'TVs, media players, air conditioners, projectors.',
    visual: 'Small handheld unit with many buttons; infrared blaster or radio link.',
    handling: 'Point infrared remotes at the device’s receiver window; replace batteries as needed.',
    facts: [
      'Most traditional remotes use infrared light; newer ones may use Bluetooth or Wi-Fi.',
    ],
    detailLevel: 'moderate',
  },
  keyboard: {
    short: 'A keyboard — a set of keys for typing into a computer.',
    purpose: 'Text and command input.',
    applications: 'Computing, music (instrument keyboards), data entry.',
    visual: 'Grid of keys on a flat base; layouts differ by language and purpose.',
    handling: 'Keep clean and dry; mechanical and membrane types feel different.',
    facts: [
      'Most computer keyboards follow the QWERTY layout or a regional variant.',
    ],
    detailLevel: 'basic',
  },
  'cell phone': {
    short: 'A cell phone — a handheld mobile telephone and computer.',
    purpose: 'Communication and mobile computing.',
    applications: 'Calls, messaging, photography, apps, navigation.',
    visual: 'Slim rectangular touchscreen handset, often with camera lenses on the back.',
    handling: 'Guard against drops; protect screens; keep software updated.',
    facts: [
      'Modern smartphones combine phone, camera, GPS and internet access in one device.',
    ],
    detailLevel: 'rich',
  },
  microwave: {
    short: 'A microwave — a kitchen appliance that heats food with microwave energy.',
    purpose: 'Quick heating and cooking of food.',
    applications: 'Reheating, defrosting, simple cooking.',
    visual: 'Boxy countertop or built-in oven with a door, control panel and interior cavity.',
    handling: 'Use microwave-safe containers; never run empty; keep the door seal clean.',
    facts: [
      'Microwaves heat by exciting water molecules inside food.',
    ],
    detailLevel: 'moderate',
  },
  oven: {
    short: 'An oven — a heated chamber for cooking and baking food.',
    purpose: 'Cook, bake or roast with dry heat.',
    applications: 'Baking, roasting, broiling in kitchens.',
    visual: 'Insulated compartment with a door, racks and temperature controls; gas or electric.',
    handling: 'Use oven mitts; verify the interior is empty before long unattended runs.',
    facts: [
      'Ovens cook primarily through convection and radiant heat.',
    ],
    detailLevel: 'moderate',
  },
  toaster: {
    short: 'A toaster — a small appliance that browns bread with radiant heat.',
    purpose: 'Toast bread products.',
    applications: 'Breakfasts, snacks.',
    visual: 'Countertop unit with slots on top and a lever; crumb tray below.',
    handling: 'Never insert metal objects; empty crumb trays regularly.',
    facts: [
      'Toast browning is controlled by a timer or sensor that ejects the bread.',
    ],
    detailLevel: 'basic',
  },
  sink: {
    short: 'A sink — a basin with a water supply and drain.',
    purpose: 'Wash hands, dishes and food.',
    applications: 'Kitchens, bathrooms, laboratories.',
    visual: 'Recessed basin with a faucet and drain; single or multiple bowls.',
    handling: 'Fix leaks promptly; avoid pouring grease down the drain.',
    facts: [
      'Kitchen and bathroom sinks differ in depth and required trap plumbing.',
    ],
    detailLevel: 'basic',
  },
  refrigerator: {
    short: 'A refrigerator — an appliance that keeps food cool.',
    purpose: 'Slow spoilage by cooling food and drink.',
    applications: 'Kitchens, offices, labs (specialized).',
    visual: 'Tall insulated cabinet with shelves and door(s), often with a freezer section.',
    handling: 'Keep sealed; set temperatures per food-safety guidance; clean seals regularly.',
    facts: [
      'Refrigerators remove heat from the interior using a vapor-compression cycle.',
    ],
    detailLevel: 'moderate',
  },
  book: {
    short: 'A book — bound printed pages for reading.',
    purpose: 'Store and present written or illustrated content.',
    applications: 'Education, literature, reference, documentation.',
    visual: 'Rectangular bound block of pages with a cover; spine visible on a shelf.',
    handling: 'Keep dry and away from direct sun to preserve pages and binding.',
    facts: [
      'The codex format (bound pages) replaced scrolls over a thousand years ago.',
    ],
    detailLevel: 'moderate',
  },
  clock: {
    short: 'A clock — a device that displays the time.',
    purpose: 'Tell time.',
    applications: 'Homes, offices, schools, transport.',
    visual: 'Face with hands or a digital display; wall, desk or tower mounted.',
    handling: 'Set to the correct time zone; replace batteries or service movements as needed.',
    facts: [
      'Clocks moved from pendulum and spring mechanisms to quartz and atomic standards.',
    ],
    detailLevel: 'basic',
  },
  vase: {
    short: 'A vase — a decorative container for holding flowers.',
    purpose: 'Display cut flowers or stand alone as décor.',
    applications: 'Home décor, events, gifts.',
    visual: 'Narrow-necked or open vessel, often ceramic or glass.',
    handling: 'Handle ceramics carefully; water inside can be heavy.',
    facts: [
      'Vase shapes are chosen to support specific flower stem arrangements.',
    ],
    detailLevel: 'basic',
  },
  scissors: {
    short: 'Scissors — a tool with two pivoted blades for cutting.',
    purpose: 'Cut paper, cloth, thread and other thin materials.',
    applications: 'Crafts, offices, kitchens, hairdressing (specialized shears).',
    visual: 'Two handles and two blades joined at a pivot screw.',
    handling: 'Blades are sharp — cut away from the body and store closed.',
    facts: [
      'Shears and scissors differ mainly in handle size and blade length.',
    ],
    detailLevel: 'basic',
  },
  'teddy bear': {
    short: 'A teddy bear — a soft stuffed toy shaped like a bear.',
    purpose: 'Comfort toy, especially for children.',
    applications: 'Toys, gifts, collectibles.',
    visual: 'Plush bear figure with stitched features and soft stuffing.',
    handling: 'Check for loose parts for very young children; wash according to the label.',
    facts: [
      'The teddy bear is named after a story involving US President Theodore Roosevelt.',
    ],
    detailLevel: 'basic',
  },
  'hair drier': {
    short: 'A hair drier — an appliance that blows warm air to dry hair.',
    purpose: 'Dry and style hair.',
    applications: 'Personal grooming, salons.',
    visual: 'Handheld unit with a barrel, nozzle, buttons and a power cord.',
    handling: 'Keep the intake vent clear; never use near water.',
    facts: [
      'Combining airflow with a brush styles hair as it dries.',
    ],
    detailLevel: 'basic',
  },
  toothbrush: {
    short: 'A toothbrush — a small brush for cleaning teeth.',
    purpose: 'Daily oral hygiene.',
    applications: 'Home and travel dental care.',
    visual: 'Long handle with a small bristle head; manual or electric.',
    handling: 'Replace every few months or after illness; let bristles dry between uses.',
    facts: [
      'Dentists typically recommend brushing twice a day with fluoride toothpaste.',
    ],
    detailLevel: 'basic',
  },
};

/** Unknown classes are handled with an explicit uncertainty message. */
export function templateFor(label: string): TemplateEntry | null {
  return TEMPLATES[label] ?? null;
}
