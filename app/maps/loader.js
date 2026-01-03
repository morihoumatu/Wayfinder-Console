/**
 * 地図の初期化とイベント登録をまとめる。
 * @file 地図の初期化とイベント登録をまとめる。
 */
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
// regionListenersBoundの初期値を定義する。
let regionListenersBound = false;
/**
 * Google Maps APIスクリプトを読み込む。
 * @param {string} apiKey APIキー。
 */
function loadGoogleMaps(apiKey) {
  // DOM要素を取得する。
  const existingScript = document.querySelector(
    'script[src^="https://maps.googleapis.com/maps/api/js"]'
  );
  if (existingScript) {
    return;
  }

  // DOM要素を生成する。
  const script = document.createElement("script");
  script.src =
    `https://maps.googleapis.com/maps/api/js?key=${apiKey}` +
    "&callback=initMap&loading=async";
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
 * 地域選択のイベントを登録する。
 */
function bindRegionControls() {
  if (regionListenersBound) {
    return;
  }
  regionListenersBound = true;
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
  updateRegionControls();
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

/**
 * サーバー設定からAPIキーを取得する。
 * @returns {Promise<string>} APIキー。
 */
function resolveMapsApiKey() {
  // resolverを解決する。
  let resolver = Promise.resolve("");
  if (MAPS_API_KEY) {
    resolver = Promise.resolve(MAPS_API_KEY);
  } else {
    resolver = fetch("/api/config")
      .then((response) => {
        // ペイロードを条件で選ぶ。
        const payload = response.ok ? response.json() : null;
        return payload;
      })
      .then((data) =>
        data && typeof data.mapsApiKey === "string" ? data.mapsApiKey : ""
      )
      .catch(() => "");
  }
  return resolver;
}

setStatus("読み込み中", "loading");
setOverlay("APIキーを読み込み中...", true);
bindRegionControls();
resolveMapsApiKey().then((apiKey) => {
  if (!apiKey) {
    setStatus("未設定", "missing");
    setOverlay("APIキーを設定してください。", true);
    return;
  }
  setStatus("読み込み中", "loading");
  setOverlay("地図を読み込み中...", true);
  // idleCallbackを用意する。
  const idleCallback =
    typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback
      : null;
  /**
   * 遅延実行のスケジューラを定義する。
   * @type {(callback: () => void) => void}
   */
  const schedule = idleCallback
    ? (callback) => idleCallback(callback, { timeout: 1200 })
    : (callback) => window.setTimeout(callback, 200);
  schedule(() => loadGoogleMaps(apiKey));
});
