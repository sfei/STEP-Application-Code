
var StationDetails = function(options) {
	
	this.init = function(options) {
		// container id
		this.containerId = "details-container";
		// tabs
		this.tabs = { 
			data: {
				tabId: "details-tab-data", 
				element: null, 
				colWidths: [200, 80, 60, 80, 80], 
				click: function() { self.openTabData(); }
			}, 
			trends: {
				tabId: "details-tab-trends", 
				element: null, 
				click: function() { self.openTabTrends(); }
			}, 
			nearby: {
				tabId: "details-tab-nearby", 
				element: null, 
				colWidths: [250, 80, 200, 80, 60, 80, 150], 
				click: function() { self.openTabNearby(); }
			}
		};
		for(var t in this.tabs) {
			if(this.tabs.hasOwnProperty(t) && this.tabs[t].colWidths) {
				this.tabs[t].tableWidth = this.tabs[t].colWidths.reduce(function(a, b) { return a + b; });
			}
		}
		// the element that contains the dialog box/tabs
		if($("#"+this.containerId).length === 0) {
			this.createDetailsDialog();
		} else {
			this.element = $("#"+this.containerId);
		}
		// open data/query
		this.open(options);
	};
		
	this.open = function(options) {
		// self refernce necessary for callbacks
		var self = this;
		// the query that constructed this
		this.copyQuery(options.query);
		if(options.station) {
			this.query.station = options.station;
		}
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
	
	this.copyQuery = function(copyQuery) {
		//this.query = Object.assign({}, copyQuery);
		this.query = {};
		for(var v in copyQuery) {
			if(copyQuery.hasOwnProperty(v)) {
				this.query[v] = copyQuery[v];
			}
		}
	};
	
	this.createDetailsDialog = function() {
		var self = this;
		$('#map-container').append(
			"<div id='" + this.containerId + "' class='grab'>" + 
				"<div id='details-dialog'>" + 
					"<div id='details-title'></div>" + // title set elsewhere
						"<div id='details-tabs-container'>" + 
							"<ul id='details-dialog-tabs'>" + 
								"<li id='" + this.tabs.data.tabId + "' class='nav-tab'>Data</li>" + 
								"<li id='" + this.tabs.trends.tabId + "' class='nav-tab'>Trends</li>" + 
								"<li id='" + this.tabs.nearby.tabId + "' class='nav-tab'>Nearby</li>" + 
							"</ul>" + 
						"</div>" + 
					"<div id='details-content'></div>" + 
				"</div>" + 
			"</div>"
		);
		this.element = $("#"+this.containerId);
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
		this.element.find("#details-title").html(
			"<div id='details-station-name'>" + this.query.station + "</div>" + 
			"<div id='details-dialog-close' class='button'>X</div>"
		);
		var self = this;
		this.element.find("#details-dialog-close").click(function() {
			self.element.hide();
		});
	};	
	
	this.openLoadingMessage = function() {
		this.element.find("#details-content").html("Loading data...");
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
					  .removeClass("nav-tab")
					  .addClass("nav-tab-active");
				} else {
					this.tabs[t].element
					  .removeClass("nav-tab-active")
					  .addClass("nav-tab");
				}
			}
		}
	};
	
	this.openTabData = function() {
		var contentDiv = this.element.find("#details-content");
		contentDiv.html(
			"<div style='width:" + this.tabs.data.tableWidth + "px;height:35px;padding-left:12px;padding-top:12px;padding-bottom:12px;font-size:14px;font-weight:bolder;'>" + 
				"What data exists for \"" + this.query.station + "\" between " + this.query.startYear + "-" + this.query.endYear + "?" + 
			"</div>"
		);
		contentDiv.append(
			"<div class='details-table-row'>" + 
				"<div class='details-table-header' style='width:" + this.tabs.data.colWidths[0] + "px;text-align:left;'>Species</div>" + 
				"<div class='details-table-header' style='width:" + this.tabs.data.colWidths[1] + "px;'>" + this.query.contaminant + " (" +  this.stationData[0].units + ")</div>" + 
				"<div class='details-table-header' style='width:" + this.tabs.data.colWidths[2] + "px;'>Sample Year</div>" + 
				"<div class='details-table-header' style='width:" + this.tabs.data.colWidths[3] + "px;'>Prep Code</div>" + 
				"<div class='details-table-header' style='width:" + this.tabs.data.colWidths[4] + "px;'>Sample Type</div>" + 
			"</div>"
		);
		for(var i = 0; i < this.stationData.length; i++) {
			var row = "<div class='details-table-row'>";
			row += "<div class='details-table-cell' style='width:" + this.tabs.data.colWidths[0] + "px;text-align:left;'>" + this.stationData[i].species + "</div>";
			row += "<div class='details-table-cell' style='width:" + this.tabs.data.colWidths[1] + "px;'>" + this.stationData[i].value + "</div>";
			row += "<div class='details-table-cell' style='width:" + this.tabs.data.colWidths[2] + "px;'>" + this.stationData[i].sampleYear + "</div>";
			row += "<div class='details-table-cell' style='width:" + this.tabs.data.colWidths[3] + "px;'>" + this.stationData[i].prepCode + "</div>";
			row += "<div class='details-table-cell' style='width:" + this.tabs.data.colWidths[4] + "px;'>" + this.stationData[i].tissueCode + "</div>";
			row += "</div>";
			contentDiv.append(row);
		}
		contentDiv.append(
			"<div style='height:35px;line-height:35px;text-align:right;font-size:10px;'>" + 
				"A result of ND means the concentration was below detection limits." + 
			"</div>"
		);
		this.setActiveTab(this.tabs.data);
	};	
	
	this.openTabTrends = function() {
		var contentDiv = this.element.find("#details-content");
		contentDiv.html("Sorry, functionality not yet written");
		this.setActiveTab(this.tabs.trends);
	};
	
	this.openTabNearby = function() {
		if(!this.nearbyData) {
			this.openLoadingMessage();
			var self = this;
			console.log(this.query);
			$.ajax({
				async: false, 
				url: "lib/getNearbyData.php", 
				data: this.query, 
				dataType: "json", 
				success: function(data) {
					console.log(data);
					self.nearbyData = data;
				},
				error: function(e) {
					//alert(defaultErrorMessage + "(Error NearbyData)");
					var contentDiv = self.element.find("#details-content");
					contentDiv.html(defaultErrorMessage + "(Error NearbyData)");
					self.setActiveTab(self.tabs.nearby);
				}
			});
		}
		var contentDiv = this.element.find("#details-content");
		if(!this.nearbyData) {
			console.log('why');
			contentDiv.html(defaultErrorMessage + "(Error No NearbyData)");
		} else {
			var hasResult = this.nearbyData.length > 0;
			var width = (hasResult) ? this.tabs.nearby.tableWidth : 500;
			contentDiv.html(
				"<div style='width:" + width + "px;height:35px;padding-left:12px;padding-top:12px;padding-bottom:12px;font-size:14px;font-weight:bolder;'>" + 
					"How does \"" + this.query.station + "\" compare to nearby water bodies between " + this.query.startYear + "-" + this.query.endYear + "?" + 
				"</div>"
			);
			if(hasResult) {
				var speciesMessage = "Species";
				if(this.query.species === "highest" || this.query.species === "lowest") {
					speciesMessage = "Species with " + this.query.species + " Avg Concentration of " + this.query.contaminant;
				}
				contentDiv.append(
					"<div class='details-table-row'>" + 
						"<div class='details-table-header' style='width:" + this.tabs.nearby.colWidths[0] + "px;text-align:left;'>Location</div>" + 
						"<div class='details-table-header' style='width:" + this.tabs.nearby.colWidths[1] + "px;'>Distance (mi)</div>" + 
						"<div class='details-table-header' style='width:" + this.tabs.nearby.colWidths[2] + "px;'>" + speciesMessage + "</div>" + 
						"<div class='details-table-header' style='width:" + this.tabs.nearby.colWidths[3] + "px;'>" + this.query.contaminant + " (" +  this.nearbyData[0].units + ")</div>" + 
						"<div class='details-table-header' style='width:" + this.tabs.nearby.colWidths[4] + "px;'>Sample Year</div>" + 
						"<div class='details-table-header' style='width:" + this.tabs.nearby.colWidths[5] + "px;'>Prep Code</div>" + 
						"<div class='details-table-header' style='width:" + this.tabs.nearby.colWidths[6] + "px;'>Sample Type</div>" + 
					"</div>"
				);
				for(var i = 0; i < this.nearbyData.length; i++) {
					var row = "<div class='details-table-row'>";
					row += "<div class='details-table-cell' style='width:" + this.tabs.nearby.colWidths[0] + "px;text-align:left;'>" + this.nearbyData[i].station + "</div>";
					row += "<div class='details-table-cell' style='width:" + this.tabs.nearby.colWidths[1] + "px;'>" + this.nearbyData[i].distanceMiles + "</div>";
					row += "<div class='details-table-cell' style='width:" + this.tabs.nearby.colWidths[2] + "px;'>" + this.nearbyData[i].species + "</div>";
					row += "<div class='details-table-cell' style='width:" + this.tabs.nearby.colWidths[3] + "px;'>" + this.nearbyData[i].value + "</div>";
					row += "<div class='details-table-cell' style='width:" + this.tabs.nearby.colWidths[4] + "px;'>" + this.nearbyData[i].sampleYear + "</div>";
					row += "<div class='details-table-cell' style='width:" + this.tabs.nearby.colWidths[5] + "px;'>" + this.nearbyData[i].prepCode + "</div>";
					row += "<div class='details-table-cell' style='width:" + this.tabs.nearby.colWidths[6] + "px;'>" + this.nearbyData[i].sampleType + "</div>";
					row += "</div>";
					contentDiv.append(row);
				}
			} else {
				contentDiv.append("<div style='margin:0px 15px;'>No nearby water bodies to compare data against. Try expanding the query year-span or species type.</div>");
			}
		}
		this.setActiveTab(this.tabs.nearby);
	};
	
	this.init(options);
		
};