// array of loaded baselayers (stored this way for base layers switching)
var baseLayerArray;

function addBasemaps() {
	baseLayerArray = [
		new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles provided by <a href='http://ESRI.com/' target='_blank'>ESRI</a>"
				})]
			})
		}), 
		new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/arcgis/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles provided by <a href='http://ESRI.com/' target='_blank'>ESRI</a>"
				})]
			})
		}), 
		new ol.layer.Tile({
			source: new ol.source.XYZ({
				url: "http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", 
				attributions: [new ol.Attribution({
					html: "Map tiles provided by <a href='http://ESRI.com/' target='_blank'>ESRI</a>"
				})]
			})
		})
	];
	var baseLayerGroup = new ol.layer.Group({
		layers: baseLayerArray
	});
	baseLayerGroup.setZIndex(0);
	// set ESRI topo to default (adjust select option to match)
	var baseLayers = baseLayerGroup.get("layers");
	$("#base-layer-control").val(0);
	baseLayers.item(1).setVisible(false);
	baseLayers.item(2).setVisible(false);
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
		baseLayerArray[i].setVisible(baseLayerIndex === i);
	}
}