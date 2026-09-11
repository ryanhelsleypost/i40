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
    blurb: "End of I-40. The battleship USS North Carolina and the Atlantic a few miles on." }
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
