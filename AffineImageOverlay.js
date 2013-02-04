/*
	TODO:
		-lots of duplication btwn leaflet's standard image overlay class; consider subclassing?
*/

L.AffineImageOverlay = L.Class.extend({
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

		var options = { draggable: true };

		var points = [
			L.marker(this.initialTopLeft, options),
			L.marker(proj([topLeft.x + width, topLeft.y]), options),			// Top Right
			L.marker(proj([topLeft.x + width, topLeft.y + height]), options),   // Bottom Right
			L.marker(proj([topLeft.x, topLeft.y + height]), options)  			// Bottom Left
		];

		this.bounds = L.latLngBounds([points[3].getLatLng(), points[1].getLatLng()]);
		var rect = L.rectangle(this.bounds).addTo(this.map);

		this.cornerMarkers = L.layerGroup(points).addTo(this.map);
		this.centerMarker  = L.marker(this.bounds.getCenter(), options)
			.addTo(this.map)
			.on('move', this.move, this);
	},

	move: function(e) {
		console.log(e);
	},

	render: function() {
		var image   = this.image,
		    topLeft = this.map.latLngToLayerPoint(this.bounds.getNorthWest()),
		    size = this.map.latLngToLayerPoint(this.bounds.getSouthEast())._subtract(topLeft);

		L.DomUtil.setPosition(image, topLeft);

		image.style.width  = size.x + 'px';
		image.style.height = size.y + 'px';
	},

	updateOpacity: function() {
		L.DomUtil.setOpacity(this.image, this.options.opacity);
	},
});

L.affineImageOverlay = function(url, center, options) {
	return new L.AffineImageOverlay(url, center, options);
}