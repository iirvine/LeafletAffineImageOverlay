(function(L) {

	L.affineImageOverlay = function(url, center, options) {
		return new L.AffineImageOverlay(url, center, options);
	};

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

		addTo: function(map) {
			map.addLayer(this);
			return this;
		},

		onAdd: function(map) {
			this.map = map;
			if (!this.image) {
				this.initImage();
			}

			map.getPanes().overlayPane.appendChild(this.image);
		},

		initImage: function() {
			this.image = L.DomUtil.create('img', 'leaflet-image-layer');

			// TODO: figure out if this is actually necessary - if so, try to ferret out some kind of cross-browser impl
			this.image.style.webkitTransformOrigin = '0 0'

			L.DomUtil.addClass(this.image, 'leaflet-zoom-hide');

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
			this.controlPoints = new ControlPoints(this.image, this.map, this.initialTopLeft);
			this.controlPoints.on('change', this.render, this);
			this.render();
		},

		updateOpacity: function() {
			L.DomUtil.setOpacity(this.image, this.options.opacity);
		},

		render: function() {
			this.image.style[L.DomUtil.TRANSFORM] = this.controlPoints.transform;
		},
	});

	var ControlPoints = L.Class.extend({
		includes: L.Mixin.Events,
		options: { draggable: true },

		initialize: function(image, map, initialTopLeft) {
			this.image = image;
			this.initialTopLeft = initialTopLeft;
			this.map = map;
			map.on('viewreset', this.setTransform, this);
			this.initMarkers();
		},

		initMarkers: function() {
			var imageAspectRatio = this.image.width / this.image.height,
					width = 100,
					height = width / imageAspectRatio,
					topLeft = this.map.latLngToLayerPoint(this.initialTopLeft),
					proj = this.map.containerPointToLatLng.bind(this.map),
					options = this.options;

			this.cornerMarkers = [
				L.marker(this.initialTopLeft, options),
				L.marker(proj([topLeft.x + width, topLeft.y]), options),			// Top Right
				L.marker(proj([topLeft.x + width, topLeft.y + height]), options),   // Bottom Right
			];

			this.cornerMarkers.forEach(function(marker) { this.map.addLayer(marker); }, this)

			var center = L.latLng(
				(this.cornerMarkers[0].getLatLng().lat + this.cornerMarkers[2].getLatLng().lat) / 2,
				(this.cornerMarkers[0].getLatLng().lng + this.cornerMarkers[2].getLatLng().lng) / 2);

			this.centerMarker = L.marker(center, options)
				.addTo(this.map);

			this.initMarkerHooks();
			this.setTransform();
		},

		initMarkerHooks: function() {
			var dragging = false,
					prevLatLng = null;

			this.cornerMarkers.forEach(function(marker){
				marker.on('drag', this.setTransform, this);
				marker.on('drag', this.recenter, this);
			}, this);

			this.centerMarker.on({
				'dragstart': function(e) {
					dragging = true;
					prevLatLng = e.target.getLatLng();
					console.log("Dragging from layer point %O", this.map.latLngToLayerPoint(e.target.getLatLng()));
				},
				'dragend': function(e) {
					dragging = false;
					console.log("Dropping at layer point %O", this.map.latLngToLayerPoint(e.target.getLatLng()));
				},
				'drag': function(e) {
					var diffLat = e.target.getLatLng().lat - prevLatLng.lat,
							diffLng = e.target.getLatLng().lng - prevLatLng.lng;

					this.move(diffLat, diffLng);
					prevLatLng = e.target.getLatLng();
				}
			}, this);
		},

		move: function(diffLat, diffLng) {
			this.cornerMarkers.forEach(function(marker) {
				marker.setLatLng(L.latLng(marker.getLatLng().lat + diffLat, marker.getLatLng().lng + diffLng));
			});
			this.setTransform();
		},

		recenter: function() {
			this.centerMarker.setLatLng(L.latLng(
				(this.cornerMarkers[0].getLatLng().lat + this.cornerMarkers[2].getLatLng().lat) / 2,
				(this.cornerMarkers[0].getLatLng().lng + this.cornerMarkers[2].getLatLng().lng) / 2));
		},

		toContainerPixels: function() {
			return this.cornerMarkers.map(function(marker) {
				return this.map.latLngToContainerPoint(marker.getLatLng())
			}, this);
		},

		setTransform: function() {
			var controlPoints = this.toContainerPixels(),
				topLeft = controlPoints[0],
				topRight = controlPoints[1]
				bottomRight = controlPoints[2];

			this.transform = "matrix(" +
				[(topRight.x - topLeft.x)/this.image.width,
				(topRight.y - topLeft.y)/this.image.width,
				(bottomRight.x - topRight.x)/this.image.height,
				(bottomRight.y - topRight.y)/this.image.height,
				this.map.latLngToLayerPoint(this.cornerMarkers[0].getLatLng()).x, this.map.latLngToLayerPoint(this.cornerMarkers[0].getLatLng()).y]
		 	+ ")"

			this.fire('change');
		},
	});
})(L);