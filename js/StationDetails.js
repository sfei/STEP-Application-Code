
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
		// styles for a few things that appear infrequently so is easier to modify here instead of css file
		this.style = {
			title: "font-size:14px;font-weight:bolder;", 
			titleDiv: "margin:12px 0px;padding-left:12px;", 
			bottomMsg: "height:35px;line-height:35px;text-align:right;font-size:10px;"
		};
		// tabs
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
					return "What records exist at \"" + query.station + "\" " + yearMsg + "?";
				},
				bottomMsg: "A result of ND means the concentration was below detection limits."
			}, 
			trends: {
				tabId: this.divIdPrefix + "-tab-trends", 
				element: null, 
				titleFunction: function(query) {
					var yearMsg;
					if(query.startYear !== query.endYear) {
						yearMsg = "between " + query.startYear + "-" + query.endYear;
					} else {
						yearMsg = "in " + query.startYear;
					}
					return "What are the trends at \"" + query.station + "\" " + yearMsg + "?";
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
			this.query.station = inputQuery.station;
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
				self.openTabData();
				self.element.show();
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
			"<div id='" + this.divIdPrefix+"-container" + "' class='grab'>" + 
				"<div id='"+this.divIdPrefix+"-dialog'>" + 
					"<div id='"+this.divIdPrefix+"-title'></div>" + // title set elsewhere
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
		this.element.hide()
			.draggable({containment: "parent"})
			.mouseup(function(evt) {
				self.element.switchClass("grabbing", "grab");
			})
			.mousedown(function(evt) {
				self.element.switchClass("grab", "grabbing");
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
	
	this.openTabData = function() {
		var yearMsg;
		if(this.query.startYear !== this.query.endYear) {
			yearMsg = "between " + this.query.startYear + "-" + this.query.endYear;
		} else {
			yearMsg = "in " + this.query.startYear;
		}
		var contentDiv = this.element.find("#"+this.divIdPrefix+"-content");
		contentDiv.html(
			"<div style='width:" + this.tabs.data.tableWidth + "px;" + this.style.titleDiv + this.style.title + "'>" + 
				this.tabs.data.titleFunction(this.query) + 
			"</div>"
		);
		contentDiv.append(
			"<div class='"+this.divIdPrefix+"-table-row'>" + 
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
				"<div class='"+this.divIdPrefix+"-table-row'>" + 
					"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.data.colWidths[0] + "px;text-align:left;'>" + 
						this.stationData[i].species + 
					"</div>" + 
					"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.data.colWidths[1] + "px;'>" + 
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
		if(this.tabs.data.bottomMsg) {
			contentDiv.append(
				"<div style='" + this.style.bottomMsg + "'>" + this.tabs.data.bottomMsg + "</div>"
			);
		}
		this.setActiveTab(this.tabs.data);
	};	
	
	this.openTabTrends = function() {
		this.openLoadingMessage();
		// not used but get the return svg object for now
		var svg = Scatterplot.create({
			container: this.divIdPrefix+"-content",
			data: this.stationData, 
			dataPointName: 'species', 
			xValueName: 'sampleYear', 
			xAxisLabel: 'Year', 
			yValueName: 'value', 
			yAxisLabel: this.query.contaminant + " (" +  this.stationData[0].units + ")", 
			width: 640,
			height: 360
		});
		this.setActiveTab(this.tabs.trends);
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
			var width = (hasResult) ? this.tabs.nearby.tableWidth : 500;
			// create the header and select options
			contentDiv.html(
				"<div style='width:" + width + "px;" + this.style.titleDiv + "'>" + 
					"<div style='" + this.style.title + "margin-bottom:6px;'>" + 
						this.tabs.nearby.titleFunction(this.query) + 
					"</div>" + 
					"<div>" + 
						"Compare by: " + 
						"<select id='"+this.divIdPrefix+"-species-control' style='width:300px;'>" +
							"<option value='highest'>Any Species with Highest Avg Concentration</option>" + 
							"<option value='lowest'>Any Species with Lowest Avg Concentration</option>" + 
						"</select>" +
					"</div>" + 
				"</div>"
			);
			// add specific species option if applicable,
			var speciesSelect = contentDiv.find("#"+this.divIdPrefix+"-species-control");
			var isASpecies = this.query.species !== "highest" && this.query.species !== "lowest";
			if(isASpecies) {
				speciesSelect.append("<option value='" + this.query.species + "'>" + this.query.species.capitalize() + "</option>");
			}
			// set the currently selected option
			speciesSelect.val(this.tabs.nearby.species);
			// click functionality
			var self = this;
			speciesSelect.on('change', function() {
				self.nearbyData = null;
				self.tabs.nearby.species = speciesSelect.val();
				self.openTabNearby();
			});
			// now get to writing the table
			if(!hasResult) {
				// if no result, display no data message
				contentDiv.append("<div style='margin:0px 15px;'>" + this.tabs.nearby.noDataMsg + "</div>");
			} else {
				// table headers
				contentDiv.append(
					"<div class='"+this.divIdPrefix+"-table-row'>" + 
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
							this.query.contaminant + " (" +  this.nearbyData[0].units + ")</div>" + 
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
				// loop through rows
				for(var i = 0; i < this.nearbyData.length; i++) {
					contentDiv.append(
						"<div class='"+this.divIdPrefix+"-table-row'>" + 
							"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.nearby.colWidths[0] + "px;text-align:left'>" + 
								this.nearbyData[i].station + 
							"</div>" + 
							"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.nearby.colWidths[1] + "px;'>" + 
								this.nearbyData[i].distanceMiles + 
							"</div>" + 
							"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.nearby.colWidths[2] + "px;'>" + 
								this.nearbyData[i].species + 
							"</div>" + 
							"<div class='"+this.divIdPrefix+"-table-cell' style='width:" + this.tabs.nearby.colWidths[3] + "px;'>" + 
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
				if(this.tabs.nearby.bottomMsg) {
					contentDiv.append(
						"<div style='" + this.style.bottomMsg + "'>" + this.tabs.nearby.bottomMsg + "</div>"
					);
				}
			}
		}
		this.setActiveTab(this.tabs.nearby);
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