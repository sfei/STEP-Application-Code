
define([
    "OpenLayers", 
    "common", 
    "./app-station-details", 
    "./app-map-instructions", 
    "./module-download", 
    "./module-legend", 
    "./module-marker-factory", 
    "./module-query-and-ui"
], function(
    ol, 
    common, 
    StationDetails, 
    MapInstructions, 
    Download, 
    Legend, 
    MarkerFactory, 
    QueryAndUI
) {
    /**
     * Basic constructor, does nothing really on it's own, just sets instance variables.
     * @returns {STEP}
     */
    function STEP(options) {
        // Internet Explorer versioning check (although jQuery alone would have thrown several exceptions by this point)
        if(browserType.isIE) {
            // Edge returns NaN value
            if(!isNaN(browserType.ieVersion) && browserType.ieVersion < 9) {
                alert("This application is not compatible with Internet Explorer version 8 or below.");
            }
        }
        // only chrome seems to handle hover interactions smoothly for OpenLayers-3
        this.enableHoverInteractions = browserType.isChrome;
        // generic variables
        this.mapProjection = 'EPSG:3857'; // web mercator wgs84
        this.wgs84 = 'EPSG:4326';         // assumed coordinate-system for any incoming data
        this.initZoomLevel = 6;           // init zoom level as zoomToStationsExtent() can be a bit too zoomed out
        // map variables
        this.map;              // openlayers map object
        this.hoverInteraction; // hover interactions stored globally so it can be removed/reapplied
        this.colorMap = [      // the color gradient for symbology
//            [210, 255, 255], 
//            [110, 180, 200], 
//            [ 45,  35, 230], 
//            [ 95,   0, 180]
            [  0,  51, 253], 
            [ 52, 146, 105], 
            [188, 220,  54], 
            [255, 255,   0]
        ];
        // array of loaded base layers (stored this way for base layers switching)
        this.baseLayers = [
            {
                name: "Streets and Topographic", 
                layer: new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", 
                        attributions: [new ol.Attribution({
                            html: "Map tiles provided by <a href='https://ESRI.com/' target='_blank'>ESRI</a>, created with data from: Esri, HERE, DeLorme, Intermap, increment P Corp., GEBCO, USGS, FAO, NPS, NRCAN, GeoBase, IGN, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), swisstopo, MapmyIndia, ©OpenStreetMap contributors, GIS User Community."
                        })]
                    })})
            }, 
            {
                name: "Landscape and Bathymetry", 
                layer: new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        url: "https://server.arcgisonline.com/arcgis/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}", 
                        attributions: [new ol.Attribution({
                            html: "Map tiles provided by <a href='https://ESRI.com/' target='_blank'>ESRI</a>, created with data from: Esri, GEBCO, NOAA, National Geographic, DeLorme, HERE, Geonames.org, and other contributors."
                        })]
                    })
                })
            }, 
            {
                name: "Aerial/Satellite Imagery", 
                layer: new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", 
                        attributions: [new ol.Attribution({
                            html: "Map tiles provided by <a href='https://ESRI.com/' target='_blank'>ESRI</a>, created with data from: Esri, DigitalGlobe, Earthstar Geographics, CNES/Airbus DS, GeoEye, USDA FSA, USGS, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community"
                        })]
                    })
                })
            }
        ];
        // array of base layers as a ol.LayerGroup
        this.baseLayersGroup;
        // no data options
        this.noDataOptions = {
            showNoData: true, // whether to show no data values on map
            noDataValue: -99, // no data value (all values <= are considered no data as well)
            noDataColor: null // fill color for no data markers
        };
        // Stations related variables
        this.stations = {
            data: null,       // raw stations data as array of GeoJSON
            collection: null, // stations data as ol.Collection instance
            layer: null       // layer object
        };
        // Water Board Regions
        this.waterboards = {
            url: options.mapserverUrl + "watboards.map", 
            params: {
                layers: "watboards"
            }, 
            layer: null
        };
        // CA counties
        this.counties = {
            url: "data/ca_counties.geojson", 
            layer: null,          // layer for all counties
            highlightLayer: null, // layer for highlighted county
            names: [],            // list of county names (for search drop-down)
            selected: null,       // name of highlighted county
            styles: null
        };
        // Marine Protected Areas
        this.mpa = {
            url: "data/mpa_ca.geojson", //"lib/getMPAsAsGeoJSON.php", 
            layer: null,                // marine protected areas
            color: [50, 220, 50, 0.5],  // default MPA color
            styles: null                // array of normal and hover style
        };
        // Sub-modules
        this.modules = {
            mapInstructions: null, // map instructions
            download:        null, // handles downloading
            legend:          null, // handles legend and thresholds
            markerFactory:   null, // handles markers/symbology
            queryAndUI:      null, // handles queries and ui elements
            stationDetails:  null  // handles the pop-up details
        };
        // google analytics
        this.gaKey = options.gaKey || false;
    };

    //************************************************************************************************************
    // Initialize functions
    //************************************************************************************************************
    /**
     * Application init function. Pretty much the only thing the HTML page has to call explicitly. Separated from 
     * mapInit() as sub pages (such as summary report) can override this portion of init while still calling 
     * common mapInit() function.
     */
    STEP.prototype.init = function(options) {
        options = options || {};
        
        // add basemap control dynamically (easier to change the basemaps later without changing related code)
        if(!options.storymapMode) {
            this.addBasemapControl($("#base-layer-control-container"), {width: 220});
        }
        
        // create marker factory - value function is not set here, but instead set when updating thresholds 
        // (see legend.js) which is triggered by a query return.
        this.modules.markerFactory = new MarkerFactory({
            shapeFunction: function(feature) {
                var watertype = feature.get("waterType");
                if(watertype.search(/reservoir|lake/i) >= 0) {
                    return 'circle';
                } else if(watertype.search(/coast/i) >= 0) {
                    return 'triangle';
                } else {
                    return 'diamond';
                }
            },
            colorMap: this.colorMap,
            showNoData: this.noDataOptions.showNoData, 
            noDataValue: this.noDataOptions.noDataValue,
            noDataColor: this.noDataOptions.noDataColor, 
            resolution: (this.modules.markerFactory) ? this.modules.markerFactory.resolution : null, 
            valueFunction: (this.modules.markerFactory) ? this.modules.markerFactory.normalizeValue : null
        });
        // other modules
        this.modules.legend              = new Legend(this);
        this.modules.queryAndUI          = new QueryAndUI(this, options.defaultQuery);
        this.modules.stationDetails      = new StationDetails(this);
        if(!options.storymapMode) {
            this.modules.download        = Download;
            this.modules.mapInstructions = new MapInstructions(this);
        }
        
        // init functions
        if(options.storymapMode) {
            $("#controls-container").hide();
            this.mapInit(null, {interactions: ol.interaction.defaults({mouseWheelZoom:false})});
            $(".ol-zoom").css("right", 4);
        } else {
            this.mapInit();
        }
        this.addCountyLayer();
        if(!options.storymapMode) {
            this.addWaterBoardLayer();
            this.addMPALayer();
        }
        this.initStationsLayer(null, options.filterStations);
        this.modules.queryAndUI.updateStationsSelect();
        this.modules.queryAndUI.init();
        this.modules.legend.init($("#step-container"));
        
        // activate functions (start by using map instructions to fire first query)
        var self = this;
        var getVars = common.getUrlGetVars();
        
        if(options.storymapMode) {
            var queryOptions = {
                query: this.modules.queryAndUI.defaultQuery, 
                selectThresholdGroup: getVars.tgroup, 
                firstRun: true, // special option as very first query has to do some extra things
                // enable these after some query is fired to load stations
                onComplete: function() {
                    self.modules.queryAndUI.updateSpeciesList(); // needed for station details (not fired automatically as UI not activated)
                    self.addClickInteractions();
                    if(self.enableHoverInteractions) self.addHoverInteractions();
                    self.modules.queryAndUI.toggleNoDataDisplay(false, true);
                    common.closeModal();
                }
            };
            this.modules.queryAndUI.updateQuery(queryOptions);
        } else if(options.skipInstructions) {
            this.modules.queryAndUI.activate();
            this.modules.queryAndUI.updateQuery({
                query: this.modules.queryAndUI.defaultQuery, 
                selectThresholdGroup: getVars.tgroup, 
                firstRun: true // special option as very first query has to do some extra things
            });
            // enable these after some query is fired to load stations
            this.addClickInteractions();
            if(this.enableHoverInteractions) {
                this.addHoverInteractions();
            }
            this.modules.queryAndUI.toggleNoDataDisplay(false, true);
            this.modules.mapInstructions.bindControls($("#btn-map-instructions"));
        } else {
            this.modules.mapInstructions.begin(
                {
                    query: this.modules.queryAndUI.defaultQuery, 
                    selectThresholdGroup: getVars.tgroup, 
                    firstRun: true // special option as very first query has to do some extra things
                }, 
                function(queryOptions) {
                    self.modules.queryAndUI.activate();
                    self.modules.queryAndUI.updateQuery(queryOptions);
                    // enable these after some query is fired to load stations
                    self.addClickInteractions();
                    if(self.enableHoverInteractions) {
                        self.addHoverInteractions();
                    }
                    self.modules.mapInstructions.bindControls($("#btn-map-instructions"));
                }
            );
        }
    };

    /**
     * Functions a little more specific to initializing the map. Does not have to be called explicitly, as it 
     * is called from {@link #init()}, but if you have a custom init function, this method can be used to do 
     * the common and less-specific map init. Creates the map object, adds the cursor functionality and a 
     * station tooltip (hidden and no functionality added to it yet), and finally adds the basemap.
     * @param {number} baseMapSelect - Index of basemap to set as active on init. If not specified defaults 0,
     *        or first base layer on the list. (See basemaps.js)
     */
    STEP.prototype.mapInit = function(baseMapSelect, mapOptions) {
        if(!mapOptions) { mapOptions = {}; }
        mapOptions.target = "map-view";
        // create map and view
        this.map = new ol.Map(mapOptions);
        this.map.setView(
            new ol.View({
                center: ol.proj.fromLonLat([-120, 37.5]),
                zoom: this.initZoomLevel,
                minZoom: 6,
                // past this zoom, many areas of the ESRI Oceans Basemap have no tiles
                maxZoom: 13,
                // map bounds roughly fit to California
                extent: ol.proj.transformExtent(
                    [-130, 31, -110, 44], 
                    'EPSG:4326',
                    this.mapProjection
                )
            })
        );
        // grabbing cursor functionality since it's not default to open layers 3
        common.addGrabCursorFunctionality($('#map-view'));
        // initialize tooltip
        $("<div id='station-tooltip'></div>").appendTo($("#map-view")).hide();
        // add basemaps
        this.addBasemaps(this.map, baseMapSelect);
    };
    
    //********************************************************************************************************
    // Misc functionalities
    //********************************************************************************************************
    /**
     * Flash the notification tab.
     * @param {string} message - The notification message.
     * @param {number} millis - How long the message stays on screen (not including 700 ms to animation the show 
     *    and hide).
     */
    STEP.prototype.flashNotification = function(message, millis) {
        $("#notification-container")
            .css('bottom', -40);
        $("#notification-tab")
            .html(message)
            .css('display', 'inline-block');
        $("#notification-container")
            .animate({bottom: 30}, 500);
        setTimeout(function() {
            $("#notification-tab").fadeOut();
        }, millis);
    };
    
    //********************************************************************************************************
    // Basemap functionalities
    //********************************************************************************************************
    /**
     * Adds basemap control to given element.
     * @param {jQuery} container - jQuery object for DOM element in which to place base layer control.
     * @param {Object} style - Optional css styles to apply.
     */
    STEP.prototype.addBasemapControl = function(container, style) {
        var basemapControl = $("<select id='base-layer-control'></select>");
        if(style) { basemapControl.css(style); }
        for(var i = 0; i < this.baseLayers.length; i++) {
            basemapControl.append(
                $("<option></option>").attr('value', i).text(this.baseLayers[i].name)
            );
        }
        basemapControl.appendTo(container);
        var self = this;
        basemapControl.on('change', function() {
            self.changeBasemap(basemapControl.val());
        });
    };
    
    /**
     * Add base layers to a map object.
     * @param {ol.Map} map - Map instance to add base layers to.
     * @param {number} baseMapSelect - Index of base layer (in baseLayers array) to set as initially active 
     *       (defaults to 0, or the first base layer).
     */
    STEP.prototype.addBasemaps = function(map, baseMapSelect) {
        // first convert to regular array and create a layer group
        var baseLayersArray = [];
        for(var i = 0; i < this.baseLayers.length; i++) {
            baseLayersArray.push(this.baseLayers[i].layer);
        }
        this.baseLayersGroup = new ol.layer.Group({
            layers: baseLayersArray
        });
        // select the basemap in controls and hide all but the initial selected basemap
        this.changeBasemap(baseMapSelect);
        // add to map
        this.baseLayersGroup.setZIndex(0);
        this.map.setLayerGroup(this.baseLayersGroup);
    };

    /** 
     * Base layers are swapped by comparing to the given index in the baseLayers array, setting the matching 
     * layer to visible, and setting the rest to invisible.
     * @param {number} layerIndex - Index of baselayer (in baseLayers array).
     */
    STEP.prototype.changeBasemap = function(layerIndex) {
        layerIndex = parseInt(layerIndex);
        if(!layerIndex || layerIndex < 0 || layerIndex >= this.baseLayers.length) { 
            layerIndex = 0; 
        }
        for(var i = 0; i < this.baseLayers.length; i++) {
            this.baseLayers[i].layer.setVisible(layerIndex === i);
        }
        $("#base-layer-control").val(layerIndex);
    };

    //********************************************************************************************************
    // Symbology functionalities
    //********************************************************************************************************
    STEP.prototype.refreshMarkerFactory = function() {
        this.modules.markerFactory.setStyle({
            colorMap: this.colorMap,
            showNoData: this.noDataOptions.showNoData, 
            noDataValue: this.noDataOptions.noDataValue,
            noDataColor: this.noDataOptions.noDataColor, 
            resolution: (this.modules.markerFactory) ? this.modules.markerFactory.resolution : null, 
            valueFunction: (this.modules.markerFactory) ? this.modules.markerFactory.normalizeValue : null
        });
    };

    //************************************************************************************************************
    // Map functions
    //************************************************************************************************************
    /**
     * Add hover interactions to the map. Specifically adds swapping layers symbols with the highlight style 
     * on hover and the tooltip with the station name. Should be reset on changing any of the affected layers 
     * as the interaction object is linked to the layers it interacts with (thus a new interaction object 
     * should be created if one of the layers is swapped out).
     * <br /><br />
     * Important to note that it uses the "featType" attribute of a feature to differentiate which layer the 
     * feature came from and thus use the appropriate functionality. This is not a default feature attribute, 
     * so on loading any layer, make sure all features have this value set appropriately.
     */
    STEP.prototype.addHoverInteractions = function() {
        var self = this;
        this.hoverInteraction = new ol.interaction.Select({
            condition: ol.events.condition.pointerMove, 
            layers: [this.stations.layer, this.mpa.layer], 
            style: function(feature) {
                var type = feature.get('featType');
                if(type === 'station') {
                    return self.modules.markerFactory.createHighlightStyle(feature);
                } else if(type === 'mpa') {
                    return [self.mpa.styles[1]];
                }
            }
        });
        // hover tooltip
        this.hoverInteraction.on("select", function(evt) {
            var features = evt.selected;
            if(features[0]) {
                $("#map-view").css("cursor", "pointer");
                var name = 'unidentified';
                var type = features[0].get('featType');
                if(type === 'station') {
                    name = features[0].get('name');
                } else if(type === 'mpa') {
                    name = features[0].get('NAME');
                }
                $("#station-tooltip").html(name)
                    .css({
                        top: evt.mapBrowserEvent.pixel[1]-10,
                        left: evt.mapBrowserEvent.pixel[0]+15
                    }).show();
            } else {
                $("#map-view").css("cursor", "");
                $("#station-tooltip").hide();
            }
        });
        this.map.addInteraction(this.hoverInteraction);
    };

    /**
     * Add click interactions to the map. In this case by opening the station details for stations, and a new 
     * window to the specific catch/take regulations for MPA polygons.
     * <br /><br />
     * Important to note that it uses the "featType" attribute of a feature to differentiate which layer the 
     * feature came from and thus use the appropriate functionality. This is not a default feature attribute, 
     * so on loading any layer, make sure all features have this value set appropriately.
     */
    STEP.prototype.addClickInteractions = function() {
        var self = this;
        $(this.map.getViewport()).on('click', function(evt) {
            var pixel = self.map.getEventPixel(evt.originalEvent);
            self.map.forEachFeatureAtPixel(
                pixel, 
                function(feature, layer) { 
                    // for some reason, checking by layer is buggy (often null, even for valid feature), so check
                    // by property which we manually add on layer being loaded
                    var type = feature.get('featType');
                    if(type === 'station') {
                        self.openStationDetails(feature); 
                        return true;    // make sure to return on match to stop cycling through additional features
                    } else if(type === 'mpa') {
                        common.newWindow(null, feature.get("DFG_URL"), "Marine Protected Areas: Regulations", 800, 600, false);
                        return true;
                    }
                }
            );
        });
    };

    //************************************************************************************************************
    // Station layer functionalities
    //************************************************************************************************************
    /**
     * Create stations layer. By default data does not have to be provided, function will automatically 
     * request a list of all stations from getAllStations.php. However, since those results do not have a 
     * value (default no data value will be set for all points), if you do want to initialize with 
     * pre-existing data, it can be supplied.
     * @param {Object[]} data - Array of the query results. If not provided, it will ajax request a list of 
     *        all stations automatically.
     * @param {string} data[].name - Station name.
     * @param {number} data[].lat - Station latitude.
     * @param {number} data[].long - Station longitude.
     * @param {String} data[].waterType - The station water type.
     * @param {number} data[].value - The contaminant value for this station. (Optional)
     * @param {String} data[].advisoryName - Specific site advisory name, if it exists.
     * @param {String} data[].advisoryUrl - Link to specific site advisory page, if it exists.
     * @param {Function} filterStations - Optional callback to filter stations.
     */
    STEP.prototype.initStationsLayer = function(data, filterStations) {
        if(!data) {
            $.ajax({
                async: false,
                url: "lib/query.php", 
                data: { query: "getAllStations" }, 
                dataType: "json", 
                success: function(json) {
                    data = json;
                },
                failure: function(e) {
                    alert(defaultErrorMessage + "(Error Loading Stations)");
                }
            });
        }
        if(data) {
            // create array of ol.Features from data (since it's not technically geographic)
            var featArray = new Array();
            for(var i = 0; i < data.length; i++) {
                if(filterStations && !filterStations(data[i])) continue;
                featArray.push(
                    new ol.Feature({
                        geometry: new ol.geom.Point(
                            ol.proj.fromLonLat(
                                [parseFloat(data[i].long), parseFloat(data[i].lat)], 
                                this.mapProjection
                            )
                        ),
                        name: (data[i].name) ? data[i].name : data[i].station,
                        waterType: data[i].waterType, 
                        value: (typeof data[i].value !== "undefined") ? data[i].value : this.noDataOptions.noDataValue, 
                        advisoryName: data[i].advisoryName, 
                        advisoryUrl: data[i].advisoryUrl, 
                        featType: 'station',
                        mfStyle: null
                    })
                );
            }
            // update stations data
            this.stations.data = data;
            this.stations.collection = new ol.Collection(featArray);
            // load and add features
            var self = this;
            this.stations.layer = new ol.layer.Vector({
                title: 'Stations', 
                source: new ol.source.Vector({
                    features: this.stations.collection
                }), 
                style: function(feature) {
                    return self.modules.markerFactory.createLayerStyle(feature);
                }
            });
            this.stations.layer.setZIndex(3);
            this.map.addLayer(this.stations.layer);
        }
    };

    /** 
     * Update data for stations
     * @param {Object[]} data - Array of the query results.
     * @param {string} data[].name - Station name.
     * @param {number} data[].lat - Station latitude.
     * @param {number} data[].long - Station longitude.
     * @param {String} data[].waterType - The station water type.
     * @param {number} data[].value - The contaminant value for this station.
     * @param {String} data[].advisoryName - Specific site advisory name, if it exists.
     * @param {String} data[].advisoryUrl - Link to specific site advisory page, if it exists.
     * */
    STEP.prototype.updateStations = function(data) {
        // update stations data
        this.stations.data = data;
        // loop through stations
        var self = this;
        this.stations.collection.forEach(function(feature) {
            //console.log(feature);
            var name = feature.get("name");
            // reset style cache (otherwise it will never change)
            feature.set("mfStyle", null);
            // try and find matching data point. this can probably be optimized rather than straightforward array
            // search. perhaps by forcing results to be alphabetically sorted and using a cut search.
            var matchedResult = null;
            for(var i = 0; i < data.length; i++) {
                if(name === data[i].name) {
                    matchedResult = data[i];
                    break;
                }
            }
            if(matchedResult) {
                feature.set("value", matchedResult.value);
            } else {
                feature.set("value", self.noDataOptions.noDataValue);
            }
            feature.changed();
        });
    };

    /**
     * Force refreshing of the stations layer. Usually done after a style change. Hopefully this updates in 
     * OL3 soon, right now only way is to force refreshing by deleting/recreating.
     */
    STEP.prototype.refreshStations = function() {
        this.updateStations(this.stations.data);
        // note for later, a more direct solution you still need to remember to clear 'mfStyle' cache in feature
    };

    /**
     * Opens the more detailed {@link StationDetails} for the given station.
     * @param {ol.Feature} station - Feature object to option details on.
     */
    STEP.prototype.openStationDetails = function(station) {
        // google analytics
        if(typeof window.gtag !== "undefined") {
            window.gtag('event', station.get("name"), {"event_category": "view_station"});
        }
        this.modules.stationDetails.open({
            query: this.modules.queryAndUI.lastQuery,
            station: station
        });
    };

    /**
     * Zoom to the extent of the entire stations layer.
     */
    STEP.prototype.zoomToStations = function() {
        var extent = null;
        var self = this;
        this.stations.collection.forEach(function(feature) {
            // zoom only to stations with values
            if(feature.get("value") !== self.noDataOptions.noDataValue) {
                var coords = feature.getGeometry().getCoordinates();
                if(!extent) {
                    extent = [coords[0], coords[1], coords[0], coords[1]];
                } else {
                    if(coords[0] < extent[0]) {
                        extent[0] = coords[0];
                    } else if(coords[0] > extent[2]) {
                        extent[2] = coords[0];
                    }
                    if(coords[1] < extent[1]) {
                        extent[1] = coords[1];
                    } else if(coords[1] > extent[3]) {
                        extent[3] = coords[1];
                    }
                }
            }
        });
        // if no stations showed up, zoom to whole thing
        if(!extent) {
            extent = this.stations.layer.getSource().getExtent();
        }
        if(extent && isFinite(extent[0]) && isFinite(extent[1]) && isFinite(extent[2]) && isFinite(extent[3])) {
            this.map.getView().fit(extent, this.map.getSize());
        }
    };

    /**
     * Zoom to a specific station. (Uses zoom level 16, though it can be overruled by max-zoom in map view)
     * @param {ol.Feature} station - Feature object to zoom to. (Actually can be any point feature.)
     */
    STEP.prototype.zoomToStation = function(station) {
        if(station) {
            var coords = station.getGeometry().getCoordinates();
            var view = this.map.getView();
            view.setCenter(coords);
            view.setZoom(16);    // this will probably be overruled by max-zoom parameter
        }
    };

    /** 
     * Get the ol.Feature object for a station, by its name. While it is case sensitive, it ignores any non
     * alphanumeric or whitespace character when comparing (as some may be escaped).
     * @param {string} stationName - The station name.
     * @returns {ol.Feature} The feature, or null if no match found.
     */
    STEP.prototype.getStationByName = function(stationName) {
        // to ease compare, remove any special characters except alphanumeric and spaces, especially since some, 
        // like quotes, are replaced with character codes
        stationName = stationName.replace(/[^A-Za-z0-9\s]/g,'');
        var stationsArray = this.stations.collection.getArray();
        for(var i = 0; i < stationsArray.length; i++) {
            if(stationsArray[i].get("name").replace(/[^A-Za-z0-9\s]/g,'') === stationName) {
                return stationsArray[i];
            }
        }
        return null;
    };

    //********************************************************************************************************
    // County, Water Board Region, and MPA layer functionalities
    //********************************************************************************************************
    /**
     * Add Water Board Region layer to the map.
     */
    STEP.prototype.addWaterBoardLayer = function() {
        this.waterboards.layer = new ol.layer.Tile({
            title: 'Water Board Regions', 
            source: new ol.source.TileWMS({
                url: this.waterboards.url, 
                params: this.waterboards.params
            })
        });
        this.waterboards.layer.setZIndex(1);
        this.waterboards.layer.setVisible(false);
        this.map.addLayer(this.waterboards.layer);
    };
    
    /**
     * Add CA counties layer to the map.
     */
    STEP.prototype.addCountyLayer = function() {
        var self = this;
        // Done this way due to async nature of OL3 loading and how it doesn't load until set visible (since layer
        // defaults to hidden at start), but we need to preload the features to create the counties name list.
        $.ajax({
            async: false, 
            dataType: "json", 
            url: this.counties.url, 
            success: function(json) {
                self.counties.styles = [
                    [
                        new ol.style.Style({
                            fill: null, 
                            stroke: new ol.style.Stroke({
                                color: '#222',
                                width: 1.5
                            })
                        })
                    ],
                    [
                        new ol.style.Style({
                            fill: null, 
                            stroke: new ol.style.Stroke({
                                color: '#f0f',
                                width: 2
                            })
                        })
                    ]
                ];
                for(var i = 0; i < json.features.length; i++) {
                    self.counties.names.push(json.features[i].properties.NAME);
                }
                self.counties.names.sort();
                self.counties.layer = new ol.layer.Vector({
                    title: 'CA Counties', 
                    source: new ol.source.Vector({
                        features: (new ol.format.GeoJSON())
                            .readFeatures(json, {
                                // json is technically in NAD83 but right now OL3 only supports WGS84 for datums
                                dataProjection: self.wgs84, 
                                featureProjection: self.mapProjection
                            })
                    }), 
                    style: self.counties.styles[0]
                });
                self.counties.highlightLayer = new ol.layer.Vector({
                    title: 'CA Counties', 
                    source: new ol.source.Vector({
                        features: (new ol.format.GeoJSON())
                            .readFeatures(json, {
                                // json is technically in NAD83 but right now OL3 only supports WGS84 for datums
                                dataProjection: self.wgs84, 
                                featureProjection: self.mapProjection
                            })
                    }), 
                    style: function(feat) {
                        return self.getHighlightCountyStyle(feat);
                    }
                });
            }
        });
        this.counties.layer.setZIndex(1);
        this.counties.highlightLayer.setZIndex(2);
        this.counties.layer.setVisible(false);
        this.counties.highlightLayer.setVisible(false);
        this.map.addLayer(this.counties.layer);
        this.map.addLayer(this.counties.highlightLayer);
    };

    /**
     * Zoom to the extent of the specific CA county. If the counties layer was not set visible, it will 
     * automatically be turned on.
     * @param {string} countyName - Name of county.
     */
    STEP.prototype.zoomToCountyByName = function(countyName) {
        if(!countyName || countyName < 0) { return; }
        countyName = countyName.toLowerCase();
        var features = this.counties.layer.getSource().getFeatures();
        var selected = null;
        for(var i = 0; i < features.length; i++) {
            if(features[i].get("NAME").toLowerCase() === countyName) {
                selected = features[i];
                break;
            }
        }
        if(selected) {
            this.counties.selected = countyName;
            // force style update
            this.counties.highlightLayer.changed();
            // if county layers are not on, turn it on
            if(!this.counties.layer.getVisible()) {
                this.counties.layer.setVisible(true);
                this.counties.highlightLayer.setVisible(true);
                $("#show-counties-control").prop('checked', true);
                this.flashNotification("CA counties layer turned on", 2000);
            } else if(!this.counties.highlightLayer.getVisible()) {
                this.counties.highlightLayer.setVisible(true);
            }
            this.map.getView().fit(selected.getGeometry().getExtent(), this.map.getSize());
        }
    };

    STEP.prototype.getHighlightCountyStyle = function(feature) {
        if(!this.counties.selected) { return null; }
        if(feature.get("NAME").toLowerCase() === this.counties.selected) {
            return this.counties.styles[1];
        } else {
            return null;
        }
    };

    /**
     * Add marine protected area layer.
     */
    STEP.prototype.addMPALayer = function() {
        var self = this;
        $.ajax({
            async: false, // async must be false as hover interaction must be applied after this is loaded
            dataType: "json", 
            url: this.mpa.url, 
            success: function(json) {
                self.mpa.styles = [
                    new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: self.mpa.color
                        }), 
                        stroke: new ol.style.Stroke({
                            color: '#aaa',
                            width: 1
                        })
                    }), 
                    new ol.style.Style({
                        fill: new ol.style.Fill({
                            color: self.mpa.color
                        }), 
                        stroke: new ol.style.Stroke({
                            color: '#fff',
                            width: 1
                        })
                    })
                ];
                self.mpa.layer = new ol.layer.Vector({
                    title: 'Marine Protected Areas', 
                    source: new ol.source.Vector({
                        features: (new ol.format.GeoJSON())
                            .readFeatures(json, {
                                dataProjection: self.wgs84, 
                                featureProjection: self.mapProjection
                            })
                    }), 
                    style: self.mpa.styles[0]
                });
                self.mpa.layer.getSource().forEachFeature(function(feature) {
                    feature.set('featType', 'mpa');
                });
                self.mpa.layer.setZIndex(1);
                self.mpa.layer.setVisible(false);    // init not visible
                self.map.addLayer(self.mpa.layer);
            }
        });
    };
    
    return STEP;
    
});
