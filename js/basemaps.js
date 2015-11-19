// array of loaded baselayers (stored this way for base layers switching)
var baseLayers = [
	{
		name: "Streets and Topographic", 
		layer: new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles provided by <a href='http://ESRI.com/' target='_blank'>ESRI</a>, created with data from: Esri, HERE, DeLorme, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), swisstopo, MapmyIndia, ©OpenStreetMap contributors, GIS User Community."
				})]
			})})
	}, 
	{
		name: "Landscape and Bathymetry", 
		layer: new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/arcgis/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles provided by <a href='http://ESRI.com/' target='_blank'>ESRI</a>, created with data from: Esri, GEBCO, NOAA, National Geographic, DeLorme, HERE, Geonames.org, and other contributors."
				})]
			})
		})
	}, 
	{
		name: "Aerial/Satellite Imagery", 
		layer: new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles provided by <a href='http://ESRI.com/' target='_blank'>ESRI</a>, created with data from: Esri, DigitalGlobe, Earthstar Geographics, CNES/Airbus DS, GeoEye, USDA FSA, USGS, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community"
				})]
			})
		})
	}
];
var baseLayersGroup;

function addBasemapControl(container, style) {
	var basemapControl = $("<select id='base-layer-control'></select>");
	if(style) { basemapControl.css(style); }
	for(var i = 0; i < baseLayers.length; i++) {
		basemapControl.append(
			$("<option></option>").attr('value', i).text(baseLayers[i].name)
		);
	}
	basemapControl.appendTo(container);
	basemapControl.on('change', function() { changeBasemap(basemapControl.val()); });
}

function addBasemaps(baseMapSelect) {
	// first convert to regular array and create a layer group
	var baseLayersArray = [];
	for(var i = 0; i < baseLayers.length; i++) {
		baseLayersArray.push(baseLayers[i].layer);
	}
	baseLayersGroup = new ol.layer.Group({
		layers: baseLayersArray
	});
	// select the basemap in controls and hide all but the initial selected basemap
	changeBasemap(baseMapSelect);
	// add to map
	baseLayersGroup.setZIndex(0);
	map.setLayerGroup(baseLayersGroup);
}

/** Base layers are changed just by comparing to the given index in the base layer group
 * @param {Number} layerIndex */
function changeBasemap(layerIndex) {
	layerIndex = parseInt(layerIndex);
	if(!layerIndex || layerIndex < 0 || layerIndex >= baseLayers.length) { 
		layerIndex = 0; 
	}
	for(var i = 0; i < baseLayers.length; i++) {
		baseLayers[i].layer.setVisible(layerIndex === i);
	}
	$("#base-layer-control").val(layerIndex);
}