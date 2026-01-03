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
  function Map(element, options) {
    this.element = element;
    this.options = options;
    this.__listeners = {};
    window.__mapsTest = window.__mapsTest || {};
    window.__mapsTest.map = this;
  }
  Map.prototype.addListener = function (eventName, callback) {
    if (eventName && typeof callback === "function") {
      this.__listeners[eventName] = callback;
    }
  };
  Map.prototype.__trigger = function (eventName, payload) {
    const handler = this.__listeners[eventName];
    if (typeof handler === "function") {
      handler(payload);
    }
  };
  Map.prototype.getZoom = function () {
    return this.options && this.options.zoom ? this.options.zoom : 13;
  };
  Map.prototype.setZoom = function () {};
  Map.prototype.panTo = function () {};
  Map.prototype.fitBounds = function () {};

  function DirectionsRenderer() {}
  DirectionsRenderer.prototype.setDirections = function () {};
  DirectionsRenderer.prototype.set = function () {};

  function DirectionsService() {}
  DirectionsService.prototype.route = function (request, callback) {
    if (typeof callback === "function") {
      callback({ routes: [] }, "ZERO_RESULTS");
    }
  };

  function Geocoder() {}
  Geocoder.prototype.geocode = function (_, callback) {
    const location = new LatLng(35.681236, 139.767125);
    callback(
      [
        {
          geometry: { location },
          formatted_address: "東京都",
          address_components: [
            { long_name: "東京都", types: ["administrative_area_level_1"] },
          ],
        },
      ],
      "OK"
    );
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

  function LatLngBounds() {
    this._isEmpty = true;
  }
  LatLngBounds.prototype.extend = function () {
    this._isEmpty = false;
  };
  LatLngBounds.prototype.union = function () {
    this._isEmpty = false;
  };
  LatLngBounds.prototype.isEmpty = function () {
    return this._isEmpty;
  };

  window.google = {
    maps: {
      Map: Map,
      DirectionsService: DirectionsService,
      Geocoder: Geocoder,
      DirectionsRenderer: DirectionsRenderer,
      Marker: Marker,
      LatLng: LatLng,
      LatLngBounds: LatLngBounds,
      TravelMode: {
        TRANSIT: "TRANSIT",
        WALKING: "WALKING"
      },
      TransitMode: {
        TRAIN: "TRAIN",
        SUBWAY: "SUBWAY",
        TRAM: "TRAM",
        RAIL: "RAIL"
      },
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
