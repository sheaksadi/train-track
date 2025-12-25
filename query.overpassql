[out:json][timeout:180];
area["ISO3166-1"="DE"]->.searchArea;
(
  way["railway"="rail"]["usage"="main"](area.searchArea);
);
out geom;
