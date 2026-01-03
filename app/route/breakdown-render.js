/**
 * ルート内訳表示の描画処理をまとめる。
 * @file ルート内訳表示の描画処理をまとめる。
 */
/* exported clearRouteBreakdown, renderRouteBreakdown, buildRailBreakdownSegments, buildWalkBreakdownSegments */
/* exported buildRouteBreakdownSegments, updateRouteBreakdown */
/* global buildDirectionsLink: writable, buildMapsLink: writable, buildRailSegment: writable */
/* global buildSegmentSearchQuery: writable, buildWalkSegment: writable, destinationLatLng: writable */
/* global extractTransitStops: writable, getDestinationDisplayLabel: writable, getOriginDisplayLabel: writable */
/* global originLatLng: writable, routeBreakdown: writable, routeBreakdownList: writable, walkingWaypoints: writable */
/**
 * ルート内訳表示をクリアする。
 */
function clearRouteBreakdown() {
  if (!routeBreakdown || !routeBreakdownList) {
    return;
  }
  routeBreakdownList.textContent = "";
  routeBreakdown.hidden = true;
}

/**
 * ルート内訳の区間リストを描画する。
 * @param {any} segments 区間リスト。
 */
function renderRouteBreakdown(segments) {
  if (routeBreakdown && routeBreakdownList) {
    routeBreakdownList.textContent = "";
    if (Array.isArray(segments) && segments.length > 0) {
      segments.forEach((segment) => {
        if (!segment) {
          return;
        }
        // DOM要素を生成する。
        const item = document.createElement("li");
        item.className = "segment-item";

        // DOM要素を生成する。
        const header = document.createElement("div");
        header.className = "segment-header";

        // DOM要素を生成する。
        const title = document.createElement("p");
        title.className = "segment-title";
        title.textContent = segment.title || "区間";
        header.appendChild(title);

        if (segment.meta) {
          // DOM要素を生成する。
          const meta = document.createElement("p");
          meta.className = "segment-meta";
          meta.textContent = segment.meta;
          header.appendChild(meta);
        }

        // DOM要素を生成する。
        const links = document.createElement("div");
        links.className = "segment-links";

        // directionsLinkを作成する。
        const directionsLink = buildDirectionsLink({
          origin: segment.origin,
          destination: segment.destination,
          travelMode: segment.travelMode,
          waypoints: segment.waypoints,
          transitMode: segment.transitMode,
        });

        if (directionsLink) {
          // DOM要素を生成する。
          const link = document.createElement("a");
          link.className = "map-link";
          link.href = directionsLink;
          link.target = "_blank";
          link.rel = "noreferrer";
          link.textContent = segment.linkLabel || "Google Mapsでルートを見る";
          links.appendChild(link);
        }

        // searchQueryを作成する。
        const searchQuery = buildSegmentSearchQuery({
          fromLabel: segment.fromLabel,
          toLabel: segment.toLabel,
          from: segment.origin,
          to: segment.destination,
        });
        if (searchQuery) {
          // DOM要素を生成する。
          const searchLink = document.createElement("a");
          searchLink.className = "map-link";
          searchLink.href = buildMapsLink(searchQuery);
          searchLink.target = "_blank";
          searchLink.rel = "noreferrer";
          searchLink.textContent = "Google Mapsで検索";
          links.appendChild(searchLink);
        }

        item.appendChild(header);
        if (links.children.length) {
          item.appendChild(links);
        }
        routeBreakdownList.appendChild(item);
      });
      routeBreakdown.hidden = false;
    } else {
      routeBreakdown.hidden = true;
    }
  }
}

/**
 * 在来線ルートの内訳を組み立てる。
 * @param {any} options 生成オプション。
 * @returns {any[]} 区間配列。
 */
function buildRailBreakdownSegments(
  /** @type {any} */
  {
    origin,
    destination,
    originLabel: originLabelText,
    destinationLabel: destinationLabelText,
    railResult,
  }
) {
  // segmentsの一覧を用意する。
  let segments = [];
  if (origin && destination) {
    // transitStopsを取得する。
    const transitStops = extractTransitStops(railResult);
    if (transitStops) {
      // departureLabelを条件で選ぶ。
      const departureLabel = transitStops.departure?.name || "出発駅";
      // arrivalLabelを条件で選ぶ。
      const arrivalLabel = transitStops.arrival?.name || "到着駅";
      // firstWalkを作成する。
      const firstWalk = buildWalkSegment({
        origin,
        destination: transitStops.departure.location,
        fromLabel: originLabelText,
        toLabel: departureLabel,
      });
      // railSegmentを作成する。
      const railSegment = buildRailSegment({
        origin: transitStops.departure.location,
        destination: transitStops.arrival.location,
        fromLabel: departureLabel,
        toLabel: arrivalLabel,
      });
      // lastWalkを作成する。
      const lastWalk = buildWalkSegment({
        origin: transitStops.arrival.location,
        destination,
        fromLabel: arrivalLabel,
        toLabel: destinationLabelText,
      });
      // railSegmentsを取得する。
      const railSegments = [firstWalk, railSegment, lastWalk].filter(Boolean);
      if (railSegments.length) {
        segments = railSegments;
      }
    }
  }
  return segments;
}

/**
 * 徒歩ルートの内訳を組み立てる。
 * @param {any} options 生成オプション。
 * @returns {any[]} 区間配列。
 */
function buildWalkBreakdownSegments(
  /** @type {any} */
  {
    origin,
    destination,
    originLabel: originLabelText,
    destinationLabel: destinationLabelText,
    mode,
    waypointPoints,
  }
) {
  /** @type {any[]} */
  let segments = [];
  if (origin && destination) {
    // waypointsを条件で選ぶ。
    const waypoints =
      mode === "walk" && waypointPoints.length ? waypointPoints : null;
    // walkSegmentを作成する。
    const walkSegment = buildWalkSegment({
      origin,
      destination,
      fromLabel: originLabelText,
      toLabel: destinationLabelText,
      waypoints,
    });
    if (walkSegment) {
      segments = [walkSegment];
    }
  }
  return segments;
}

/**
 * ルート内訳の区間配列を組み立てる。
 * @param {any} options 生成オプション。
 * @returns {any[]} 区間配列。
 */
function buildRouteBreakdownSegments(
  /** @type {{ mode?: any, railResult?: any }} */ { mode, railResult }
) {
  // segmentsの一覧を用意する。
  let segments = [];
  if (originLatLng && destinationLatLng) {
    // originDisplayLabelを取得する。
    const originDisplayLabel = getOriginDisplayLabel();
    // destinationDisplayLabelを取得する。
    const destinationDisplayLabel = getDestinationDisplayLabel();
    // waypointPointsを条件で選ぶ。
    const waypointPoints = Array.isArray(walkingWaypoints)
      ? walkingWaypoints.map((waypoint) => waypoint.location).filter(Boolean)
      : [];

    if (mode === "rail") {
      segments = buildRailBreakdownSegments({
        origin: originLatLng,
        destination: destinationLatLng,
        originLabel: originDisplayLabel,
        destinationLabel: destinationDisplayLabel,
        railResult,
      });
    }

    if (!segments.length) {
      segments = buildWalkBreakdownSegments({
        origin: originLatLng,
        destination: destinationLatLng,
        originLabel: originDisplayLabel,
        destinationLabel: destinationDisplayLabel,
        mode,
        waypointPoints,
      });
    }
  }
  return segments;
}

/**
 * ルート内訳表示を更新する。
 * @param {{ mode?: any, railResult?: any }} options 更新オプション。
 */
function updateRouteBreakdown(
  /** @type {{ mode?: any, railResult?: any }} */ { mode, railResult }
) {
  // segmentsを作成する。
  const segments = buildRouteBreakdownSegments({ mode, railResult });
  if (!segments.length) {
    clearRouteBreakdown();
  } else {
    renderRouteBreakdown(segments);
  }
}