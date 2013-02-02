/*
	TODO:
		-lots of duplication btwn leaflet's standard image overlay class; consider subclassing?
*/

L.AffineImageOverlay = L.Class.extend({
	options: {
		icon: L.Icon.Default,
		boundingScale: .75,
		opacity: .75,
	},

	initialize: function(url, center, options) {
		this.url = url;
		this.center = L.latLng(center);
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
		var map = this.map,
			mapSize = map.getSize().clone(),
			boundedMapSize = mapSize.multiplyBy(this.options.boundingScale),
			imageSize = L.point(this.image.width, this.image.height);

		var xBoundingPad = (mapSize.x - boundedMapSize.x) / 2;
		var yBoundingPad = (mapSize.y - boundedMapSize.y) / 2;

		var mapAspectratio = boundedMapSize.x / boundedMapSize.y;
		var imageAspectRatio = imageSize.x / imageSize.y;

		var xPad = 0;
		var yPad = 0;

		if (mapAspectratio > imageAspectRatio) {
			var imageScale = boundedMapSize.y / imageSize.y;
			var scaledImageWidth = imageSize.x * imageScale;
			xPad = (boundedMapSize.x - scaledImageWidth) / 2;
		} else {
			var imageScale = boundedMapSize.x / imageSize.x;
			var scaledImageHeight = imageSize.y * imageScale;
			yPad = (boundedMapSize.y - scaledImageHeight) / 2;
		}

		var north = yBoundingPad + yPad;
		var south = mapSize.y - (yBoundingPad + yPad);
		var west = xBoundingPad + xPad;
		var east = mapSize.x - (xBoundingPad + xPad);

		// var points = [L.point(west,north),
		// 	L.point(east, north),
		// 	L.point(east, south)];

		var points =  [
			L.marker(this.map.containerPointToLatLng([west, north]), {draggable: true}),
			L.marker(this.map.containerPointToLatLng([east, north]), {draggable: true}),
			L.marker(this.map.containerPointToLatLng([east, south]), {draggable: true})
		];

		this.markers = L.layerGroup(points).addTo(this.map);
	},

	render: function() {

	},

	updateOpacity: function() {
		L.DomUtil.setOpacity(this.image, this.options.opacity);
	},
});

L.affineImageOverlay = function(url, center, options) {
	return new L.AffineImageOverlay(url, center, options);
}