/* I-40 trip data.
   Route runs from his base at Mountain Ave & 13th St, Upland CA, up I-15 over
   Cajon Pass to Barstow, then I-40 all the way east to Wilmington NC.
   Coordinates are approximate and easy to fine-tune. Distances/mileposts are
   computed in geo.js so the route line and every number stay in agreement. */

const BASE = { name: "Home — Mountain Ave & 13th St, Upland CA", lat: 34.1090, lng: -117.6553 };

const ROUTE = [
  { name: "Upland, CA (home)",  lat: 34.1090, lng: -117.6553 },
  { name: "Cajon Pass, CA",     lat: 34.3122, lng: -117.4720 },
  { name: "Victorville, CA",    lat: 34.5362, lng: -117.2928 },
  { name: "Barstow, CA",        lat: 34.8958, lng: -117.0173 },
  { name: "Needles, CA",        lat: 34.8481, lng: -114.6141 },
  { name: "Kingman, AZ",        lat: 35.1894, lng: -114.0530 },
  { name: "Seligman, AZ",       lat: 35.3258, lng: -112.8747 },
  { name: "Williams, AZ",       lat: 35.2494, lng: -112.1910 },
  { name: "Flagstaff, AZ",      lat: 35.1983, lng: -111.6513 },
  { name: "Winslow, AZ",        lat: 35.0242, lng: -110.6974 },
  { name: "Holbrook, AZ",       lat: 34.9022, lng: -110.1665 },
  { name: "Gallup, NM",         lat: 35.5281, lng: -108.7426 },
  { name: "Grants, NM",         lat: 35.1473, lng: -107.8514 },
  { name: "Albuquerque, NM",    lat: 35.0844, lng: -106.6504 },
  { name: "Santa Rosa, NM",     lat: 34.9387, lng: -104.6819 },
  { name: "Tucumcari, NM",      lat: 35.1717, lng: -103.7250 },
  { name: "Amarillo, TX",       lat: 35.2220, lng: -101.8313 },
  { name: "Groom, TX",          lat: 35.2036, lng: -101.1085 },
  { name: "Shamrock, TX",       lat: 35.2145, lng: -100.2493 },
  { name: "Elk City, OK",       lat: 35.4109, lng:  -99.4043 },
  { name: "Weatherford, OK",    lat: 35.5262, lng:  -98.7073 },
  { name: "Oklahoma City, OK",  lat: 35.4676, lng:  -97.5164 },
  { name: "Henryetta, OK",      lat: 35.4392, lng:  -95.9808 },
  { name: "Sallisaw, OK",       lat: 35.4606, lng:  -94.7935 },
  { name: "Fort Smith, AR",     lat: 35.3859, lng:  -94.3985 },
  { name: "Russellville, AR",   lat: 35.2784, lng:  -93.1338 },
  { name: "Little Rock, AR",    lat: 34.7465, lng:  -92.2896 },
  { name: "Forrest City, AR",   lat: 35.0081, lng:  -90.7898 },
  { name: "Memphis, TN",        lat: 35.1495, lng:  -90.0490 },
  { name: "Jackson, TN",        lat: 35.6145, lng:  -88.8139 },
  { name: "Nashville, TN",      lat: 36.1627, lng:  -86.7816 },
  { name: "Cookeville, TN",     lat: 36.1628, lng:  -85.5016 },
  { name: "Knoxville, TN",      lat: 35.9606, lng:  -83.9207 },
  { name: "Asheville, NC",      lat: 35.5951, lng:  -82.5515 },
  { name: "Hickory, NC",        lat: 35.7345, lng:  -81.3412 },
  { name: "Statesville, NC",    lat: 35.7826, lng:  -80.8873 },
  { name: "Winston-Salem, NC",  lat: 36.0999, lng:  -80.2442 },
  { name: "Greensboro, NC",     lat: 36.0726, lng:  -79.7920 },
  { name: "Burlington, NC",     lat: 36.0957, lng:  -79.4378 },
  { name: "Durham, NC",         lat: 35.9940, lng:  -78.8986 },
  { name: "Raleigh, NC",        lat: 35.7796, lng:  -78.6382 },
  { name: "Benson, NC",         lat: 35.3821, lng:  -78.5486 },
  { name: "Wilmington, NC",     lat: 34.2257, lng:  -77.9447 }
];

const I40_JOIN = "Barstow, CA";

const MILESTONES = [
  { id: "kingman",    name: "Kingman, AZ",              lat: 35.1894, lng: -114.0530,
    blurb: "Historic Route 66 town. Powerhouse Visitor Center and the Route 66 Museum." },
  { id: "grand-canyon", name: "Grand Canyon (South Rim)", lat: 36.0544, lng: -112.1401,
    blurb: "About an hour north of Williams on AZ-64. The big one - worth the detour." },
  { id: "williams",   name: "Williams, AZ",             lat: 35.2494, lng: -112.1910,
    blurb: "Gateway to the Grand Canyon and the Grand Canyon Railway. Classic Route 66 main street." },
  { id: "flagstaff",  name: "Flagstaff, AZ",            lat: 35.1983, lng: -111.6513,
    blurb: "Cool pine country at 7,000 ft. Lowell Observatory and a walkable historic downtown." },
  { id: "meteor-crater", name: "Meteor Crater",         lat: 35.0278, lng: -111.0225,
    blurb: "A 4,000-ft-wide impact crater just a few miles off the interstate. Genuinely staggering." },
  { id: "winslow",    name: "Winslow, AZ",              lat: 35.0242, lng: -110.6974,
    blurb: "\"Standin' on the Corner\" park - yes, that corner, from the Eagles song." },
  { id: "petrified-forest", name: "Petrified Forest & Painted Desert", lat: 34.9100, lng: -109.8068,
    blurb: "National park right off I-40 near Holbrook. Ancient petrified wood and banded desert." },
  { id: "wigwam",     name: "Wigwam Motel, Holbrook",   lat: 34.8994, lng: -110.1548,
    blurb: "Sleep in a concrete teepee. A Route 66 icon since 1950." },
  { id: "albuquerque", name: "Albuquerque, NM",         lat: 35.0844, lng: -106.6504,
    blurb: "Old Town plaza and the Sandia Peak Tramway. Great green-chile everything." },
  { id: "tucumcari",  name: "Tucumcari, NM",            lat: 35.1717, lng: -103.7250,
    blurb: "Peak Route 66 neon. The Blue Swallow Motel sign is the postcard shot." },
  { id: "cadillac-ranch", name: "Cadillac Ranch, Amarillo", lat: 35.1872, lng: -101.9871,
    blurb: "Ten Cadillacs half-buried nose-down in a field. Bring spray paint - it's encouraged." },
  { id: "big-texan",  name: "Big Texan Steak Ranch, Amarillo", lat: 35.1994, lng: -101.7601,
    blurb: "Home of the free 72-oz steak - if you can finish it in an hour." },
  { id: "okc",        name: "Oklahoma City, OK",        lat: 35.4676, lng:  -97.5164,
    blurb: "The National Memorial & Museum, plus the Stockyards for a real steakhouse." },
  { id: "little-rock", name: "Little Rock, AR",         lat: 34.7465, lng:  -92.2896,
    blurb: "Clinton Presidential Library and the River Market district downtown." },
  { id: "memphis",    name: "Memphis, TN",              lat: 35.1495, lng:  -90.0490,
    blurb: "Graceland, Beale Street, Sun Studio, and barbecue worth planning a night around." },
  { id: "nashville",  name: "Nashville, TN",            lat: 36.1627, lng:  -86.7816,
    blurb: "Music City. Broadway honky-tonks and the Country Music Hall of Fame." },
  { id: "knoxville",  name: "Knoxville, TN",            lat: 35.9606, lng:  -83.9207,
    blurb: "The Sunsphere from the '82 World's Fair and the gateway to the Smokies." },
  { id: "smokies",    name: "Great Smoky Mountains",    lat: 35.6532, lng:  -83.5070,
    blurb: "Most-visited national park in the U.S., just south of the route near the TN/NC line." },
  { id: "asheville",  name: "Asheville, NC",            lat: 35.5951, lng:  -82.5515,
    blurb: "The Biltmore Estate and a famous downtown food-and-beer scene in the Blue Ridge." },
  { id: "wilmington", name: "Wilmington, NC - the finish", lat: 34.2257, lng: -77.9447,
    blurb: "End of I-40. The battleship USS North Carolina and the Atlantic a few miles on." },
  { id: "vegas",      name: "Las Vegas, NV",              lat: 36.1147, lng: -115.1728,
    blurb: "The Strip, old-school downtown Fremont Street, and Hoover Dam a short drive away." },
  { id: "santa-fe",   name: "Santa Fe, NM",               lat: 35.6870, lng: -105.9378,
    blurb: "Adobe plaza, galleries, and some of the best food in the Southwest." },
  { id: "denver",     name: "Denver / Red Rocks, CO",     lat: 39.7392, lng: -104.9903,
    blurb: "Mile-high city with Red Rocks amphitheatre carved into the foothills." },
  { id: "wichita",    name: "Old Cowtown, Wichita KS",    lat: 37.6889, lng: -97.3831,
    blurb: "Living-history frontier town on the Arkansas River. Very Kansas." },
  { id: "kansas-city", name: "Kansas City, MO",           lat: 39.0997, lng:  -94.5786,
    blurb: "Legendary barbecue, jazz history, and more fountains than any city but Rome." },
  { id: "st-louis",   name: "Gateway Arch, St. Louis MO", lat: 38.6247, lng:  -90.1848,
    blurb: "Ride the tram to the top of the 630-ft Arch on the Mississippi." },
  { id: "branson",    name: "Branson, MO",                lat: 36.6437, lng:  -93.2185,
    blurb: "Ozarks entertainment town - theaters, shows, and Table Rock Lake." },
  { id: "sedona",     name: "Sedona, AZ",                 lat: 34.8697, lng: -111.7610,
    blurb: "Red-rock canyons and jeep trails - one of the prettiest detours in the Southwest." },
  { id: "taos",       name: "Taos, NM",                   lat: 36.4072, lng: -105.5731,
    blurb: "Ancient adobe pueblo and a mountain arts town north of Santa Fe." },
  { id: "hot-springs", name: "Hot Springs, AR",           lat: 34.5117, lng:  -93.0538,
    blurb: "A national park built around historic downtown bathhouses and thermal springs." },
  { id: "dallas",     name: "Dallas, TX",                 lat: 32.7767, lng:  -96.7970,
    blurb: "Dealey Plaza and the Sixth Floor Museum, plus big-city Texas dining." },
  { id: "new-orleans", name: "New Orleans, LA",           lat: 29.9584, lng:  -90.0644,
    blurb: "French Quarter, live jazz, and beignets - a worthy swing down south." },
  { id: "chattanooga", name: "Chattanooga, TN",           lat: 35.0456, lng:  -85.3097,
    blurb: "Lookout Mountain, Rock City, and Ruby Falls above the Tennessee River." },
  { id: "gatlinburg", name: "Gatlinburg, TN",             lat: 35.7143, lng:  -83.5102,
    blurb: "The Smoky Mountains' front door - parkway, aerial tram, and Clingmans Dome nearby." },
  { id: "atlanta",    name: "Atlanta, GA",                lat: 33.7490, lng:  -84.3880,
    blurb: "The Georgia Aquarium, the MLK National Historical Park, and Southern city life." },
  { id: "savannah",   name: "Savannah, GA",               lat: 32.0809, lng:  -81.0912,
    blurb: "Oak-lined squares and one of the loveliest historic districts in the South." },
  { id: "charleston", name: "Charleston, SC",             lat: 32.7765, lng:  -79.9311,
    blurb: "Cobblestone streets, antebellum homes, and the Battery on the harbor." }
];

// Trip endpoints.
const DESTINATION = { name: "Wilmington, NC", lat: 34.2257, lng: -77.9447 };

// Optional meetup / hand-off point that splits the trip into two legs.
const MEETUP_DEFAULT = { name: "Nashville Airport (BNA)", lat: 36.1263, lng: -86.6774 };

// Popular detours he can tap to route through. Each is a "pass-through" point;
// the router threads real highways through the ones he picks, west to east.
const DETOURS = [
  { id: "vegas",       name: "Las Vegas, NV",   lat: 36.1699, lng: -115.1398 },
  { id: "grand-canyon", name: "Grand Canyon, AZ", lat: 36.0544, lng: -112.1401 },
  { id: "santa-fe",    name: "Santa Fe, NM",    lat: 35.6870, lng: -105.9378 },
  { id: "denver",      name: "Denver, CO",      lat: 39.7392, lng: -104.9903 },
  { id: "wichita",     name: "Wichita, KS",     lat: 37.6872, lng:  -97.3301 },
  { id: "tulsa",       name: "Tulsa, OK",       lat: 36.1540, lng:  -95.9928 },
  { id: "kansas-city", name: "Kansas City, MO", lat: 39.0997, lng:  -94.5786 },
  { id: "branson",     name: "Branson, MO",     lat: 36.6437, lng:  -93.2185 },
  { id: "st-louis",    name: "St. Louis, MO",   lat: 38.6270, lng:  -90.1994 },
  { id: "sedona",      name: "Sedona, AZ",      lat: 34.8697, lng: -111.7610 },
  { id: "taos",        name: "Taos, NM",        lat: 36.4072, lng: -105.5731 },
  { id: "dallas",      name: "Dallas, TX",      lat: 32.7767, lng:  -96.7970 },
  { id: "hot-springs", name: "Hot Springs, AR", lat: 34.5117, lng:  -93.0538 },
  { id: "new-orleans", name: "New Orleans, LA", lat: 29.9584, lng:  -90.0644 },
  { id: "chattanooga", name: "Chattanooga, TN", lat: 35.0456, lng:  -85.3097 },
  { id: "gatlinburg",  name: "Gatlinburg, TN",  lat: 35.7143, lng:  -83.5102 },
  { id: "atlanta",     name: "Atlanta, GA",     lat: 33.7490, lng:  -84.3880 },
  { id: "savannah",    name: "Savannah, GA",    lat: 32.0809, lng:  -81.0912 },
  { id: "charleston",  name: "Charleston, SC",  lat: 32.7765, lng:  -79.9311 }
];

const VEHICLE = {
  name: "2024 Chevrolet Equinox",
  engine: "1.5L turbo",
  mpgHwy: 30,
  tankGal: 14.9,
  gasPrice: 3.75,
  refuelEveryMi: 300
};

const CATEGORIES = ["Gas", "Food", "Lodging", "Tolls", "Souvenirs", "Misc"];
