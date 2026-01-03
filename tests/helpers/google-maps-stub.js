/**
 * Google Maps stub script for tests.
 * @file Google Maps stub script for E2E tests.
 */
/**
 * Return a Google Maps stub script for tests.
 * @returns {string} Stub JavaScript.
 */
const getGoogleMapsStubScript = () => {
  return `
(function () {
  function Noop() {}
  function Map(element, options) {
    this.element = element;
    this.options = options;
  }
  Map.prototype.addListener = function () {};
  Map.prototype.getZoom = function () {
    return this.options && this.options.zoom ? this.options.zoom : 13;
  };
  Map.prototype.setZoom = function () {};
  Map.prototype.panTo = function () {};

  function DirectionsRenderer() {}
  DirectionsRenderer.prototype.setDirections = function () {};
  DirectionsRenderer.prototype.set = function () {};

  function Geocoder() {}
  Geocoder.prototype.geocode = function (_, callback) {
    callback([], "ZERO_RESULTS");
  };

  function Marker() {}
  Marker.prototype.setMap = function () {};

  function LatLng(lat, lng) {
    this.lat = function () {
      return lat;
    };
    this.lng = function () {
      return lng;
    };
  }

  window.google = {
    maps: {
      Map: Map,
      DirectionsService: Noop,
      Geocoder: Geocoder,
      DirectionsRenderer: DirectionsRenderer,
      Marker: Marker,
      LatLng: LatLng,
      TravelMode: { TRANSIT: "TRANSIT" },
      TransitVehicleType: { HIGH_SPEED_TRAIN: "HIGH_SPEED_TRAIN" }
    }
  };

  if (typeof window.initMap === "function") {
    window.initMap();
  }
})();
`;
};

module.exports = {
  getGoogleMapsStubScript,
};
