/*
	TODO:
		-lots of duplication btwn leaflet's standard image overlay class; consider subclassing?
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

		// branch point - if we're drawing with canvas, implementation will start to differ here
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

		this.bounds = L.latLngBounds([proj([topLeft.x, topLeft.y + height]), this.points[1].getLatLng()]);

		this.cornerMarkers = L.layerGroup(this.points).addTo(this.map);
		this.centerMarker  = L.marker(this.bounds.getCenter(), options)
			.addTo(this.map)
			.on('move', this.move, this);

		this.initHooks();
		this.render();
	},

	initHooks: function() {
		var overlay = this;
		this.points.forEach(function(marker){
			marker.on('drag', overlay.render, overlay);
		});
	},

	move: function(e) {
		console.log(e);
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