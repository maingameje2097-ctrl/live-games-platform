// Countryle floating globe — D3 orthographic projection ("drag to rotate a sphere").
// Loads a public 110m-resolution world country dataset at runtime (small, fast, no
// heavy 3D engine needed) and lets the host drag to rotate freely and zoom 10%-1000%.
//
// Known limitation: very small nations (e.g. Vatican City, Monaco, San Marino,
// Liechtenstein) are too small to exist as shapes at this map resolution, so they
// won't visibly highlight on the globe even though guessing them in chat still
// works normally for scoring.

const Globe = (() => {
  const WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

  // Internal country name -> the name used in the public world-atlas dataset,
  // only listed where they differ from our own name.
  const NAME_ALIASES = {
    "united states": "united states of america",
    "ivory coast": "cote d ivoire",
    "dr congo": "dem rep congo",
    "congo republic": "congo",
    "central african republic": "central african rep",
    "bosnia and herzegovina": "bosnia and herz",
    "dominican republic": "dominican rep",
    "south sudan": "s sudan",
    "equatorial guinea": "eq guinea",
    "czechia": "czech rep",
    "north macedonia": "macedonia",
    "eswatini": "swaziland",
    "timor-leste": "east timor",
    "sao tome and principe": "sao tome and principe",
    "antigua and barbuda": "antigua and barb",
    "saint kitts and nevis": "st kitts and nevis",
    "saint vincent and the grenadines": "st vin and gren",
    "solomon islands": "solomon is",
    "marshall islands": "marshall is",
    "cabo verde": "cape verde",
  };

  let svg, projection, path, zoomGroup, rotateGroup;
  let width = 320, height = 220;
  let baseScale = 100;
  let zoomPercent = 100;
  let rotation = [0, -12];
  let ready = false;
  let highlights = new Map(); // normalizedName -> "guess" | "correct"
  let resizeObserver = null;

  function normalize(str) {
    return (str || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function lookupKey(ourName) {
    const n = normalize(ourName);
    const alias = NAME_ALIASES[n];
    return alias ? normalize(alias) : n;
  }

  function measure() {
    const el = document.getElementById("globeViewport");
    if (!el) return;
    width = el.clientWidth || 320;
    height = el.clientHeight || 220;
  }

  function pivotTransform(factor) {
    const cx = width / 2, cy = height / 2;
    return `translate(${cx},${cy}) scale(${factor}) translate(${-cx},${-cy})`;
  }

  async function init() {
    measure();
    svg = d3.select("#globeSvg").attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();

    baseScale = Math.max(20, Math.min(width, height) / 2 - 4);
    projection = d3.geoOrthographic()
      .scale(baseScale)
      .translate([width / 2, height / 2])
      .rotate(rotation)
      .clipAngle(90);
    path = d3.geoPath(projection);

    const defs = svg.append("defs");
    const grad = defs.append("radialGradient").attr("id", "oceanGrad").attr("cx", "35%").attr("cy", "30%");
    grad.append("stop").attr("offset", "0%").attr("stop-color", "#2C4B85");
    grad.append("stop").attr("offset", "100%").attr("stop-color", "#0E1C3E");

    zoomGroup = svg.append("g").attr("class", "zoom-group");
    rotateGroup = zoomGroup.append("g").attr("class", "rotate-group");

    rotateGroup.append("path")
      .datum({ type: "Sphere" })
      .attr("class", "globe-ocean")
      .attr("d", path);

    rotateGroup.append("path")
      .datum(d3.geoGraticule()())
      .attr("class", "globe-graticule")
      .attr("d", path);

    try {
      const world = await d3.json(WORLD_URL);
      const features = topojson.feature(world, world.objects.countries).features;

      rotateGroup.selectAll("path.globe-country")
        .data(features)
        .enter()
        .append("path")
        .attr("class", "globe-country")
        .attr("data-key", (d) => normalize(d.properties && d.properties.name))
        .attr("d", path);

      ready = true;
      applyHighlights();
    } catch (err) {
      console.warn("Globe: could not load world map data", err);
    }

    enableDrag();
    setZoomPercent(zoomPercent);

    if (window.ResizeObserver) {
      const target = document.getElementById("globeViewport");
      resizeObserver = new ResizeObserver(() => onResize());
      resizeObserver.observe(target);
    }
  }

  function onResize() {
    const prevW = width, prevH = height;
    measure();
    if (width === prevW && height === prevH) return;
    baseScale = Math.max(20, Math.min(width, height) / 2 - 4);
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    projection.scale(baseScale).translate([width / 2, height / 2]);
    redraw();
    setZoomPercent(zoomPercent);
  }

  function redraw() {
    rotateGroup.selectAll("path").attr("d", path);
  }

  function enableDrag() {
    let last = null;
    const drag = d3.drag()
      .on("start", (event) => { last = [event.x, event.y]; })
      .on("drag", (event) => {
        if (!last) return;
        const dx = event.x - last[0];
        const dy = event.y - last[1];
        const r = projection.rotate();
        const sens = 0.4;
        const nextLat = Math.max(-90, Math.min(90, r[1] - dy * sens));
        projection.rotate([r[0] + dx * sens, nextLat]);
        rotation = projection.rotate();
        redraw();
        last = [event.x, event.y];
      })
      .on("end", () => { last = null; });
    svg.call(drag);
  }

  function setZoomPercent(pct) {
    zoomPercent = Math.max(10, Math.min(1000, pct));
    if (!zoomGroup) return;
    const factor = zoomPercent / 100;
    zoomGroup.attr("transform", pivotTransform(factor));
  }

  function getZoomPercent() {
    return zoomPercent;
  }

  function recenter() {
    rotation = [0, -12];
    projection.rotate(rotation);
    redraw();
    setZoomPercent(100);
  }

  function applyHighlights() {
    if (!ready) return;
    rotateGroup.selectAll("path.globe-country")
      .classed("is-guessed", (d) => highlights.get(normalize(d.properties && d.properties.name)) === "guess")
      .classed("is-correct", (d) => highlights.get(normalize(d.properties && d.properties.name)) === "correct");
  }

  function clearHighlights() {
    highlights = new Map();
    applyHighlights();
  }

  function highlightGuess(countryName) {
    const key = lookupKey(countryName);
    if (highlights.get(key) !== "correct") highlights.set(key, "guess");
    applyHighlights();
  }

  function highlightCorrect(countryName) {
    highlights.set(lookupKey(countryName), "correct");
    applyHighlights();
  }

  function afterResize() {
    // called explicitly after the Enlarge toggle finishes its CSS transition
    onResize();
  }

  return {
    init,
    setZoomPercent,
    getZoomPercent,
    recenter,
    clearHighlights,
    highlightGuess,
    highlightCorrect,
    afterResize,
  };
})();
