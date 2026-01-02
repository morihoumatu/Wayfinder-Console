/* exported loadGoogleMaps, keyMissing */
/* global DEFAULT_CENTER: writable, DEFAULT_ZOOM: writable, MAPS_API_KEY: writable, areaAnchorCache: writable */
/* global areaAnchorSelection: writable, calculateRoutes: writable, destinationLatLng: writable */
/* global directionsService: writable, geocoder: writable, handleOriginRegionStart: writable */
/* global handleRecommendSubmit: writable, map: writable, mapElement: writable, maxTimeInput: writable */
/* global originAreaSelect: writable, originLatLng: writable, originRegionButton: writable */
/* global originRegionSelect: writable, railRenderer: writable, recommendForm: writable, resetButton: writable */
/* global resetRoute: writable, setDestination: writable, setOrigin: writable, setOverlay: writable */
/* global setStatus: writable, updateLimitHint: writable, updateRegionControls: writable, updateRouteHint: writable */
/* global updateRouteLabels: writable, walkingRenderer: writable */
/**
 * Google Maps APIスクリプトを読み込む。
 * @param {string} apiKey APIキー。
 */
function loadGoogleMaps(apiKey) {
  const existingScript = document.querySelector(
    'script[src^="https://maps.googleapis.com/maps/api/js"]'
  );
  if (existingScript) {
    return;
  }

  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
  script.async = true;
  script.defer = true;
  script.onerror = () => {
    setStatus("エラー", "error");
    setOverlay("地図の読み込みに失敗しました。APIキーを確認してください。", true);
  };
  document.head.appendChild(script);
}

/**
 * 地図サービスとレンダラーを初期化する。
 * @returns {any} 初期化済みのサービス群。
 */
function initializeMapServices() {
  directionsService = new google.maps.DirectionsService();
  geocoder = new google.maps.Geocoder();
  walkingRenderer = new google.maps.DirectionsRenderer({
    map,
    suppressMarkers: true,
    preserveViewport: true,
    polylineOptions: {
      strokeColor: "#ef8354",
      strokeOpacity: 0.75,
      strokeWeight: 4,
    },
  });
  railRenderer = new google.maps.DirectionsRenderer({
    map,
    suppressMarkers: true,
    preserveViewport: true,
    polylineOptions: {
      strokeColor: "#2f6f5b",
      strokeOpacity: 0.85,
      strokeWeight: 5,
    },
  });
  return {
    directionsService,
    geocoder,
    walkingRenderer,
    railRenderer,
  };
}

/**
 * Google Mapsの初期化処理を行う。
 */
window.initMap = function initMap() {
  map = new google.maps.Map(mapElement, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#f4efe7" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#1f1a17" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#f4efe7" }] },
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#cfe3f4" }],
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#ffffff" }],
      },
    ],
  });

  initializeMapServices();

  updateRouteLabels();
  updateRouteHint();
  updateRegionControls();
  if (originAreaSelect) {
    originAreaSelect.addEventListener("change", () => {
      if (originAreaSelect.value && originRegionSelect) {
        originRegionSelect.value = "";
      }
      if (originAreaSelect.value !== areaAnchorSelection) {
        areaAnchorSelection = "";
        if (areaAnchorCache !== "") {
          areaAnchorCache = "";
        }
      }
      updateRegionControls();
    });
  }
  if (originRegionSelect) {
    originRegionSelect.addEventListener("change", () => {
      if (originRegionSelect.value && originAreaSelect) {
        originAreaSelect.value = "";
      }
      if (originAreaSelect?.value !== areaAnchorSelection) {
        areaAnchorSelection = "";
        if (areaAnchorCache !== "") {
          areaAnchorCache = "";
        }
      }
      updateRegionControls();
    });
  }
  resetButton.addEventListener("click", () => {
    resetRoute();
  });
  if (originRegionButton) {
    originRegionButton.addEventListener("click", handleOriginRegionStart);
  }
  recommendForm.addEventListener("submit", handleRecommendSubmit);
  maxTimeInput.addEventListener("input", updateLimitHint);
  updateLimitHint();

  map.addListener("click", (/** @type {any} */ event) => {
    if (!originLatLng) {
      setOrigin(event.latLng);
      updateRouteLabels();
      updateRouteHint();
    } else if (!destinationLatLng) {
      setDestination(event.latLng, "manual");
      updateRouteLabels();
      updateRouteHint();
      calculateRoutes();
    } else {
      resetRoute();
      setOrigin(event.latLng);
      updateRouteLabels();
      updateRouteHint();
    }
  });

  setStatus("準備完了", "ready");
  setOverlay("", false);
};

const keyMissing = !MAPS_API_KEY || MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY";

if (keyMissing) {
  setStatus("未設定", "missing");
  setOverlay("APIキーを設定してください。", true);
} else {
  setStatus("読み込み中", "loading");
  setOverlay("地図を読み込み中...", true);
  loadGoogleMaps(MAPS_API_KEY);
}
