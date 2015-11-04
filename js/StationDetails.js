
// common function that comes in handy
String.prototype.capitalize = function() {
    return this.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};

var StationDetails = function(query) {
	
	this.init = function(query) {
		//****************************************************************************************************
		// All customizable variables below (but do it by manually coding, not dynamically)
		//****************************************************************************************************
		// the id for the container for any created details dialog
		this.parent = "map-container";
		// All div id's will use identified prefix follow by sub-id words separated by hyphens. Although if y
		// you change this, much of the default css styles (those not specified in this.style which is a lot) 
		// will not apply and must accounted for.
		this.divIdPrefix = "details";
		// styles for a few things that appear frequently and/or has cascading effects on parent/child 
		// elements so is easier to set here as variables
		this.titleDivPadLeft = 12;
		this.containerPadding = 2;
		this.contentPadding = 4;
		this.style = {
			title: "font-size:14px;font-weight:bolder;", 
			titleDiv: "margin:12px 0px;padding-left:"+this.titleDivPadLeft+"px;", 
			bottomMsg: "height:35px;line-height:35px;text-align:right;font-size:10px;"
		};
		// doesn't customize the actual width as doing that isn't consistent cross-browser, but set here so it
		// can adjust every place where it is called in one line
		this.scrollbarWidth = 20;
		// tabs configurations
		this.tabs = { 
			data: {
				tabId: this.divIdPrefix + "-tab-data", 
				element: null, 
				colWidths: [180, 80, 60, 80, 150], 
				titleFunction: function(query) {
					var yearMsg;
					if(query.startYear !== query.endYear) {
						yearMsg = "between " + query.startYear + "-" + query.endYear;
					} else {
						yearMsg = "in " + query.startYear;
					}
					return "What records exist for " + query.contaminant + " at \"" + query.station + "\" " + yearMsg + "?";
				},
				bottomMsg: "A result of ND means the concentration was below detection limits."
			}, 
			trends: {
				tabId: this.divIdPrefix + "-tab-trends", 
				element: null, 
				chartWidth: 640, 
				chartHeight: 360, 
				titleFunction: function(query) {
					var yearMsg;
					if(query.startYear !== query.endYear) {
						yearMsg = "between " + query.startYear + "-" + query.endYear;
					} else {
						yearMsg = "in " + query.startYear;
					}
					return "What are the trends for " + query.contaminant + " at \"" + query.station + "\" " + yearMsg + "?";
				}
			}, 
			nearby: {
				tabId: this.divIdPrefix + "-tab-nearby", 
				element: null, 
				species: null, 
				colWidths: [240, 60, 180, 80, 60, 80, 150], 
				titleFunction: function(query) {
					var yearMsg;
					if(query.startYear !== query.endYear) {
						yearMsg = "between " + query.startYear + "-" + query.endYear;
					} else {
						yearMsg = "in " + query.startYear;
					}
					return "How does \"" + query.station + "\" compare to nearby water bodies " + yearMsg + "?";
				},
				bottomMsg: "A result of ND means the concentration was below detection limits.", 
				noDataMsg: "No nearby water bodies to compare data against. Try expanding the query year-span or species type."
			}
		};
		//****************************************************************************************************
		// End of customization block
		//****************************************************************************************************
		// get table widths by summing column widths
		for(var t in this.tabs) {
			if(this.tabs.hasOwnProperty(t) && this.tabs[t].colWidths) {
				this.tabs[t].tableWidth = this.tabs[t].colWidths.reduce(function(a, b) { return a + b; });
				// plus 2px padding each side of every cell
				this.tabs[t].tableWidth += this.tabs[t].colWidths.length*4;
			}
		}
		// the element that contains the dialog box/tabs
		if($("#"+this.divIdPrefix+"-container").length === 0) {
			this.createDetailsDialog();
		} else {
			this.element = $("#"+this.divIdPrefix+"-container");
		}
		// open data/query
		this.open(query);
	};
		
	this.open = function(inputQuery) {
		// self refernce necessary for callbacks
		var self = this;
		// the query that constructed this
		this.query = this.copyQuery(inputQuery.query);
		if(inputQuery.station) {
			this.station = inputQuery.station;
			this.query.station = this.station.get("name");
		}
		// this needs to be reset
		this.tabs.nearby.species = null;
		// put station name from query and place loading message
		this.setTitle();
		this.openLoadingMessage();
		// nearby data is left null until specifically requested
		this.nearbyData = null;
		// get the data at least for the data and trends tabs
		this.stationData = null;
		$.ajax({
			url: "lib/getStationData.php", 
			data: this.query, 
			dataType: "json", 
			success: function(data) {
				//console.log(data);
				self.stationData = data;
				self.element.show();
				self.openTabData();
			},
			error: function(e) {
				//self.openErrorMessage();
				alert(defaultErrorMessage + "(Error StationData)");
			}
		});
	};
	
	this.copyQuery = function(toCopy) {
		//this.query = Object.assign({}, copyQuery);
		var theCopy = {};
		for(var v in toCopy) {
			if(toCopy.hasOwnProperty(v)) {
				theCopy[v] = toCopy[v];
			}
		}
		return theCopy;
	};
	
	this.createDetailsDialog = function() {
		var self = this;
		$('#' + this.parent).append(
			"<div id='" + this.divIdPrefix+"-container" + "' style='padding:"+this.containerPadding+"px;'>" + 
				"<div id='"+this.divIdPrefix+"-dialog' style='padding:"+this.contentPadding+"px;'>" + 
					"<div id='"+this.divIdPrefix+"-title' class='grab'></div>" + // title set elsewhere
					"<div id='"+this.divIdPrefix+"-info'></div>" +
					"<div id='"+this.divIdPrefix+"-tabs-container'>" + 
						"<ul id='"+this.divIdPrefix+"-dialog-tabs'>" + 
							"<li id='" + this.tabs.data.tabId + "' class='"+this.divIdPrefix+"-tab'>Data</li>" + 
							"<li id='" + this.tabs.trends.tabId + "' class='"+this.divIdPrefix+"-tab'>Trends</li>" + 
							"<li id='" + this.tabs.nearby.tabId + "' class='"+this.divIdPrefix+"-tab'>Nearby</li>" + 
						"</ul>" + 
					"</div>" + 
					"<div id='"+this.divIdPrefix+"-content'></div>" + 
				"</div>" + 
			"</div>"
		);
		this.element = $("#"+this.divIdPrefix+"-container");
		var titleElement = this.element.find("#"+this.divIdPrefix+"-title");
		this.element.hide()
			.draggable()
			.mousedown(function(evt) {
				self.element.addClass("grabbing");
				titleElement.removeClass("grab");
			})
			.mouseup(function(evt) {
				self.element.removeClass("grabbing");
				titleElement.addClass("grab");
			});
		this.tabs.data.element = $("#"+this.tabs.data.tabId)
			.on('click', function() { self.openTabData(); });
		this.tabs.trends.element = $("#"+this.tabs.trends.tabId)
			.on('click', function() { self.openTabTrends(); });
		this.tabs.nearby.element = $("#"+this.tabs.nearby.tabId)
			.on('click', function() { self.openTabNearby(); });
	};
	
	this.setTitle = function() {
		this.element.find("#"+this.divIdPrefix+"-title").html(
			"<div id='"+this.divIdPrefix+"-station-name'>" + this.query.station + "</div>" + 
			"<div id='"+this.divIdPrefix+"-dialog-close' class='button'>X</div>"
		);
		var self = this;
		this.element.find("#"+this.divIdPrefix+"-dialog-close").click(function() {
			self.element.hide();
		});
		var advisoryName = "View <b>General Guidance of Safe Fish Consumption</b>";
		if(this.station.get("advisoryName")) {
			advisoryName = "View <b>Specific Safe Eating Guidelines</b> for this water body";
		}
		var infoHtml = "<ul>" + 
			"<li>" + 
				"<a  id='"+this.divIdPrefix+"-advisory' " + 
					"href='" + this.station.get("advisoryUrl") + "' target='_blank'>" + 
						advisoryName + 
				"</a>" + 
			"</li>";
		if(this.station.get("waterType") === "coast") {
			var coords = ol.proj.toLonLat(this.station.getGeometry().getCoordinates());
			infoHtml += 
				"<li>" + 
					"<a	 id='"+this.divIdPrefix+"-tides' " + 
						"href='https://tidesandcurrents.noaa.gov/tide_predictions.html?type=Tide+Predictions&searchfor=" + 
							coords[1].toFixed(4) + "%2C+" + coords[0].toFixed(4) + "' target='_blank'>" + 
						"Find nearest <b>Tidal Prediction Stations</b> for this location" + 
					"</a>" + 
				"</li>";
		}
		infoHtml += "</ul>";
		this.element.find("#"+this.divIdPrefix+"-info").html(infoHtml);
	};	
	
	this.openLoadingMessage = function() {
		this.element.find("#"+this.divIdPrefix+"-content").html("Loading data...");
	};
	
	this.setActiveTab = function(tab) {
		for(var t in this.tabs) {
			if(!tab.element) {
				tab.element = $("#"+tab.tabId);
			}
			if(this.tabs.hasOwnProperty(t)) {
				if(!this.tabs[t].element) {
					this.tabs[t].element = $("#"+tab.tabId);
				}
				if(this.tabs[t] === tab) {
					this.tabs[t].element
					  .removeClass(this.divIdPrefix+"-tab")
					  .addClass(this.divIdPrefix+"-tab-active");
				} else {
					this.tabs[t].element
					  .removeClass(this.divIdPrefix+"-tab-active")
					  .addClass(this.divIdPrefix+"-tab");
				}
			}
		}
	};
	
	// getting divs to fit content across all browsers is a pain so just do it manually
	this.adjustContainerDimensions = function(width, height) {
		var dialogDiv = this.element.find("#"+this.divIdPrefix+"-dialog");
		
		if(!width || width <= 0) { 
			width = dialogDiv.width();
		} else {
			width += this.scrollbarWidth;
			dialogDiv.width(width);
			width += 2*this.contentPadding + 2;	// plus 2 from the border
		}
		this.element.width(width);
		
		if(!height || height <= 0) { 
			height = dialogDiv.height();
			height += 2*this.contentPadding;
		} else {
			dialogDiv.height(height);
			height += 2*this.contentPadding + 2;
		}
		this.element.height(height+2*this.containerPadding);
	};
	
	this.openTabData = function() {
		var yearMsg;
		if(this.query.startYear !== this.query.endYear) {
			yearMsg = "between " + this.query.startYear + "-" + this.query.endYear;
		} else {
			yearMsg = "in " + this.query.startYear;
		}
		var contentDiv = this.element.find("#"+this.divIdPrefix+"-content");
		var width = this.tabs.data.tableWidth;
		contentDiv.html(
			"<div style='width:" + (width-this.titleDivPadLeft) + "px;" + this.style.titleDiv + this.style.title + "'>" + 
				this.tabs.data.titleFunction(this.query) + 
			"</div>"
		);
		contentDiv.append(
			"<div class='"+this.divIdPrefix+"-table-row' style='width:" + width + "px;'>" + 
				"<div class='"+this.divIdPrefix+"-table-header' style='width:" + this.tabs.data.colWidths[0] + "px;text-align:left;'>" + 
					"Species" + 
				"</div>" + 
				"<div class='"+this.divIdPrefix+"-table-header' style='width:" + this.tabs.data.colWidths[1] + "px;'>" + 
					this.query.contaminant + " (" +  this.stationData[0].units + ")" + 
				"</div>" + 
				"<div class='"+this.divIdPrefix+"-table-header' style='width:" + this.tabs.data.colWidths[2] + "px;'>" + 
					"Sample Year" + 
				"</div>" + 
				"<div class='"+this.divIdPrefix+"-table-header' style='width:" + this.tabs.data.colWidths[3] + "px;'>" + 
					"Prep Code" + 
				"</div>" + 
				"<div class='"+this.divIdPrefix+"-table-header' style='width:" + this.tabs.data.colWidths[4] + "px;'>" + 
					"Sample Type" + 
				"</div>" + 
			"</div>"
		);
		for(var i = 0; i < this.stationData.length; i++) {
			contentDiv.append(
				"<div class='"+this.divIdPrefix+"-table-row' style='width:" + width + "px;'>" + 
					"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.data.colWidths[0] + "px;text-align:left;'>" + 
						this.stationData[i].species + 
					"</div>" + 
					"<div class='"+this.divIdPrefix+"-table-cell color-value' style='width:" + this.tabs.data.colWidths[1] + "px;font-weight:bolder;'>" + 
						this.stationData[i].value + 
					"</div>" + 
					"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.data.colWidths[2] + "px;'>" + 
						this.stationData[i].sampleYear + 
					"</div>" + 
					"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.data.colWidths[3] + "px;'>" + 
						this.stationData[i].prepCode + 
					"</div>" + 
					"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.data.colWidths[4] + "px;'>" + 
						this.stationData[i].sampleType + 
					"</div>" + 
				"</div>"
			);
		}
		// colorize!
		contentDiv.find(".color-value").each(function(i, element) {
			element.style.color = getThresholdColor(parseFloat(element.innerHTML));
		});
		if(this.tabs.data.bottomMsg) {
			contentDiv.append(
				"<div style='width:" + width + "px;" + this.style.bottomMsg + "'>" + this.tabs.data.bottomMsg + "</div>"
			);
		}
		this.setActiveTab(this.tabs.data);
		this.adjustContainerDimensions(this.tabs.data.tableWidth);
	};	
	
	this.openTabTrends = function() {
		var contentDiv = this.element.find("#"+this.divIdPrefix+"-content");
		contentDiv.html(
			"<div style='width:" + (this.tabs.trends.chartWidth - this.titleDivPadLeft) + "px;" + this.style.titleDiv + this.style.title + "'>" + 
				this.tabs.trends.titleFunction(this.query) + 
			"</div>"
		);
		// not used but it returns the svg object (already added to container)
		var svg = Scatterplot.create({
			container: this.divIdPrefix+"-content",
			data: this.stationData, 
			dataPointName: 'species', 
			xValueName: 'sampleYear', 
			xAxisLabel: 'Year', 
			yValueName: 'value', 
			yAxisLabel: this.query.contaminant + " (" +  this.stationData[0].units + ")", 
			width: this.tabs.trends.chartWidth,
			height: this.tabs.trends.chartHeight
		});
		this.setActiveTab(this.tabs.trends);
		this.adjustContainerDimensions(this.tabs.trends.chartWidth);
	};
	
	this.openTabNearby = function() {
		if(!this.nearbyData) {
			// if data does not exist, attempt to load it from server
			this.openLoadingMessage();
			this.nearbyData = this.loadNearbyData();
		}
		var contentDiv = this.element.find("#"+this.divIdPrefix+"-content");
		if(!this.nearbyData) {
			// if data still does not exist, throw error
			contentDiv.html(defaultErrorMessage + "(Error NearbyData)");
		} else {
			// check whether there was at least 1 record returned (done early to set width)
			var hasResult = this.nearbyData.length > 0;
			var width = this.tabs.nearby.tableWidth;
			// create the header and select options
			contentDiv.html(
				"<div style='width:" + (width-this.titleDivPadLeft) + "px;" + this.style.titleDiv + "'>" + 
					"<div style='" + this.style.title + "margin-bottom:6px;'>" + 
						this.tabs.nearby.titleFunction(this.query) + 
					"</div>" + 
					"<div>" + 
						"Compare by: " + 
						"<select id='"+this.divIdPrefix+"-species-control' style='width:360px;'>" +
							"<option value='highest'>Any Species with Highest Avg Concentration</option>" + 
							"<option value='lowest'>Any Species with Lowest Avg Concentration</option>" + 
						"</select>" +
					"</div>" + 
				"</div>"
			);
			// add all available species to the list
			var speciesSelect = contentDiv.find("#"+this.divIdPrefix+"-species-control");
			for(var i = 0; i < speciesList.length; i++) {
				speciesSelect.append("<option value=\"" + speciesList[i][0].toLowerCase() + "\">" + speciesList[i][0].capitalize() + "</option>");
			}
			// set the currently selected option
			speciesSelect.val(this.tabs.nearby.species);
			// fancy select
			contentDiv.find("#"+this.divIdPrefix+"-species-control").chosen();
			// click functionality
			var self = this;
			speciesSelect.on('change', function() {
				self.nearbyData = null;
				self.tabs.nearby.species = speciesSelect.val();
				self.openTabNearby();
			});
			// now get to writing the table
			// table headers
			contentDiv.append(
				"<div class='"+this.divIdPrefix+"-table-row' style='width:" + width + "px;'>" + 
					"<div class='"+this.divIdPrefix+"-table-header' style='width:" + this.tabs.nearby.colWidths[0] + "px;text-align:left;'>" + 
						"Location" + 
					"</div>" + 
					"<div class='"+this.divIdPrefix+"-table-header' style='width:" + this.tabs.nearby.colWidths[1] + "px;'>" + 
						"Distance (mi)" + 
					"</div>" + 
					"<div class='"+this.divIdPrefix+"-table-header' style='width:" + this.tabs.nearby.colWidths[2] + "px;'>" + 
						"Species" + 
					"</div>" + 
					"<div class='"+this.divIdPrefix+"-table-header' style='width:" + this.tabs.nearby.colWidths[3] + "px;'>" + 
						this.query.contaminant + (hasResult ? " ("+this.nearbyData[0].units+")" : "") + "</div>" + 
					"<div class='"+this.divIdPrefix+"-table-header' style='width:" + this.tabs.nearby.colWidths[4] + "px;'>" + 
						"Sample Year" + 
					"</div>" + 
					"<div class='"+this.divIdPrefix+"-table-header' style='width:" + this.tabs.nearby.colWidths[5] + "px;'>" + 
						"Prep Code" + 
					"</div>" + 
					"<div class='"+this.divIdPrefix+"-table-header' style='width:" + this.tabs.nearby.colWidths[6] + "px;'>" + 
						"Sample Type" + 
					"</div>" + 
				"</div>"
			);
			if(!hasResult) {
				// if no result, display no data message
				contentDiv.append("<div class='"+this.divIdPrefix+"-table-row' style='width:" + width + "px;padding:10px 5px;margin-bottom:30px;'>" + this.tabs.nearby.noDataMsg + "</div>");
			} else {
				// loop through rows
				for(var i = 0; i < this.nearbyData.length; i++) {
					contentDiv.append(
						"<div class='"+this.divIdPrefix+"-table-row' style='width:" + width + "px;'>" + 
							"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.nearby.colWidths[0] + "px;text-align:left'>" + 
								this.nearbyData[i].station + 
							"</div>" + 
							"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.nearby.colWidths[1] + "px;'>" + 
								this.nearbyData[i].distanceMiles + 
							"</div>" + 
							"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.nearby.colWidths[2] + "px;'>" + 
								this.nearbyData[i].species + 
							"</div>" + 
							"<div class='"+this.divIdPrefix+"-table-cell color-value' style='width:" + this.tabs.nearby.colWidths[3] + "px;font-weight:bolder;'>" + 
								this.nearbyData[i].value + 
							"</div>" + 
							"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.nearby.colWidths[4] + "px;'>" + 
								this.nearbyData[i].sampleYear + 
							"</div>" + 
							"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.nearby.colWidths[5] + "px;'>" + 
								this.nearbyData[i].prepCode + 
							"</div>" + 
							"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.nearby.colWidths[6] + "px;'>" + 
								this.nearbyData[i].sampleType + 
							"</div>" + 
						"</div>"
					);
				}
				// colorize!
				contentDiv.find(".color-value").each(function(i, element) {
					element.style.color = getThresholdColor(parseFloat(element.innerHTML));
				});
				if(this.tabs.nearby.bottomMsg) {
					contentDiv.append(
						"<div style='width:" + width + "px;" + this.style.bottomMsg + "'>" + this.tabs.nearby.bottomMsg + "</div>"
					);
				}
			}
		}
		this.setActiveTab(this.tabs.nearby);
		this.adjustContainerDimensions(this.tabs.nearby.tableWidth);
	};
	
	this.loadNearbyData = function() {
		// load default selection for species type
		if(this.tabs.nearby.species === null) {
			this.tabs.nearby.species = this.query.species;
		}
		// create new query with possibly divergent species type
		var nearbyQuery = this.copyQuery(this.query);
		nearbyQuery.species = this.tabs.nearby.species;
		//console.log(nearbyQuery);
		// synchronized ajax call
		var returnData = null;
		$.ajax({
			async: false, 
			url: "lib/getNearbyData.php", 
			data: nearbyQuery, 
			dataType: "json", 
			success: function(data) {
				//console.log(data);
				returnData = data;
			},
			error: function(e) {
				// does nothing at the moment
				//alert(defaultErrorMessage + "(Error NearbyData)");
			}
		});
		return returnData;
	};
	
	// fire init function
	this.init(query);
		
};