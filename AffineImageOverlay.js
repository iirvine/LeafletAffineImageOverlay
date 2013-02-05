/*
	TODO:
		-currently explicitly targeting webkit style tags; some amount of cross browser-ness would be keen
		-better default initial image size
		-zoom animations
		-performance testing on laaaarge images
		-canvas rendering fallback if css transforms aren't performant
		-getting a bit monstrous - might get some SRP goodness by breaking concept of 'control points' into their own class?
		-code cleanup
*/

L.AffineImageOverlay = L.Class.extend({
	includes: L.Mixin.Events,

	options: {
		icon: L.Icon.Default,
		opacity: .75,
	},

	initialize: function(url, initialTopLeft, options) {
		this.url = url;
		this.initialTopLeft = L.latLng(initialTopLeft);
		L.setOptions(this, options);
	},

	onAdd: function(map) {
		this.map = map;
		if (!this.image) {
			this.initImage();
		}

		map.getPanes().overlayPane.appendChild(this.image);
		map.on('viewreset', this.render, this);
	},

	onRemove: function(map) {

	},

	addTo: function(map) {
		map.addLayer(this);
		return this;
	},

	initImage: function() {
		this.image = L.DomUtil.create('img', 'leaflet-image-layer');

		if (this.map.options.zoomAnimation && L.Browser.any3d) {
			L.DomUtil.addClass(this.image, 'leaflet-zoom-animated');
		} else {
			L.DomUtil.addClass(this.image, 'leaflet-zoom-hide');
		}

		this.updateOpacity();

		L.extend(this.image, {
			galleryimg: 'no',
			onselectstart: L.Util.falseFn,
			onmousemove: L.Util.falseFn,
			onload: L.bind(this.onImageLoad, this),
			src: this.url
		});
	},

	onImageLoad: function() {
		this.setMarkers();
		this.render();
	},

	setMarkers: function() {
		var imageAspectRatio = this.image.width / this.image.height,
			width = 100,
			height = width / imageAspectRatio,
			topLeft = this.map.latLngToContainerPoint(this.initialTopLeft),
			proj = this.map.containerPointToLatLng.bind(this.map);

		this.image.style.webkitTransformOrigin = '0 0'
		var options = { draggable: true };

		this.points = [
			L.marker(this.initialTopLeft, options),
			L.marker(proj([topLeft.x + width, topLeft.y]), options),			// Top Right
			L.marker(proj([topLeft.x + width, topLeft.y + height]), options),   // Bottom Right
		];

		this.cornerMarkers = L.layerGroup(this.points).addTo(this.map);
		var center = L.latLng(
			(this.points[0].getLatLng().lat + this.points[2].getLatLng().lat) / 2,
			(this.points[0].getLatLng().lng + this.points[2].getLatLng().lng) / 2);

		this.centerMarker  = L.marker(center, options)
			.addTo(this.map)
			// .on('drag', this.move, this);

		this.initMarkerHooks();
		this.render();
	},

	initMarkerHooks: function() {
		var overlay = this,
			dragging = false,
			prevLatLng = null;

		this.points.forEach(function(marker){
			marker.on('drag', overlay.render, overlay);
			marker.on('drag', overlay.reCenter, overlay);
		});

		this.centerMarker.on({
			'dragstart': function(e) {
				dragging = true;
				prevLatLng = e.target.getLatLng();
			},
			'dragend': function() {
				dragging = false;
			},
			'drag': function(e) {
				var diffLat = e.target.getLatLng().lat - prevLatLng.lat,
					diffLng = e.target.getLatLng().lng - prevLatLng.lng;

				overlay.move(diffLat, diffLng);
				prevLatLng = e.target.getLatLng();
			}
		});
	},

	reCenter: function() {
		this.centerMarker.setLatLng(L.latLng(
			(this.points[0].getLatLng().lat + this.points[2].getLatLng().lat) / 2,
			(this.points[0].getLatLng().lng + this.points[2].getLatLng().lng) / 2));
	},

	move: function(diffLat, diffLng) {
		this.points.forEach(function(marker){
			marker.setLatLng(L.latLng(marker.getLatLng().lat + diffLat, marker.getLatLng().lng + diffLng));
		});
		this.render();
	},

	controlPointsInContainerPixels: function() {
		var map = this.map;
		return this.points.map(function(marker) {
			return map.latLngToContainerPoint(marker.getLatLng())
		});
	},

	computeTransform: function() {
		var controlPoints = this.controlPointsInContainerPixels(),
			topLeft = controlPoints[0],
			topRight = controlPoints[1]
			bottomRight = controlPoints[2];

		return "matrix(" +
			[(topRight.x - topLeft.x)/this.image.width,
			(topRight.y - topLeft.y)/this.image.width,
			(bottomRight.x - topRight.x)/this.image.height,
			(bottomRight.y - topRight.y)/this.image.height,
			this.map.latLngToLayerPoint(this.points[0].getLatLng()).x, this.map.latLngToLayerPoint(this.points[0].getLatLng()).y]
		 + ")"
	},

	render: function() {
		this.image.style.webkitTransform = this.computeTransform();
	},

	updateOpacity: function() {
		L.DomUtil.setOpacity(this.image, this.options.opacity);
	},
});

L.affineImageOverlay = function(url, center, options) {
	return new L.AffineImageOverlay(url, center, options);
}