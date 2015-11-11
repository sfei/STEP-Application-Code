// array of loaded baselayers (stored this way for base layers switching)
var baseLayerArray = [
	{
		name: "Streets and Topographic", 
		layer: new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles provided by <a href='http://ESRI.com/' target='_blank'>ESRI</a>"
				})]
			})})
	}, 
	{
		name: "Natural Colors", 
		layer: new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/arcgis/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles provided by <a href='http://ESRI.com/' target='_blank'>ESRI</a>"
				})]
			})
		})
	}, 
	{
		name: "Imagery", 
		layer: new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles provided by <a href='http://ESRI.com/' target='_blank'>ESRI</a>"
				})]
			})
		})
	}
];

function addBasemapControl(container, style) {
	var basemapControl = $("<select id='base-layer-control'></select>");
	if(style) { basemapControl.css(style); }
	for(var i = 0; i < baseLayerArray.length; i++) {
		basemapControl.append(
			$("<option></option>").attr('value', i).text(baseLayerArray[i].name)
		);
	}
	basemapControl.appendTo(container);
	basemapControl.on('change', function() { changeBaseLayer(basemapControl.val()); });
}

function addBasemaps(baseMapSelect) {
	// first convert to regular array
	var baseLayers = [];
	for(var i = 0; i < baseLayerArray.length; i++) {
		baseLayers.push(baseLayerArray[i].layer);
	}
	var baseLayerGroup = new ol.layer.Group({
		layers: baseLayers
	});
	// select the basemap in controls and hide all but the initial selected basemap
	if(!baseMapSelect || typeof baseMapSelect !== 'number' || baseMapSelect < 0) {
		baseMapSelect = 0;
	} else if(baseMapSelect > baseLayerArray.length-1) {
		baseMapSelect = baseLayerArray.length-1;
	}
	var baseLayers = baseLayerGroup.get("layers");
	for(var i = 0; i < baseLayerArray.length; i++) {
		baseLayers.item(i).setVisible(i==baseMapSelect);
	}
	$("#base-layer-control").val(baseMapSelect);
	// add to map
	baseLayerGroup.setZIndex(0);
	map.setLayerGroup(baseLayerGroup);
}

/** Base layers are changed just by comparing to the given index in the base layer group
 * @param {Number} baseLayerIndex */
function changeBaseLayer(baseLayerIndex) {
	if(baseLayerIndex === undefined || baseLayerIndex === null) {
		baseLayerIndex = parseInt($("#base-layer-control").val());
	}
	if(baseLayerIndex < 0 || baseLayerIndex >= baseLayerArray.length) { 
		baseLayerIndex = 0; 
	}
	for(var i = 0; i < baseLayerArray.length; i++) {
		baseLayerArray[i].layer.setVisible(baseLayerIndex === i);
	}
}