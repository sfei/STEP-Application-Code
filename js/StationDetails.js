
var StationDetails = function(query) {
	
	this.init = function(query) {
		//****************************************************************************************************
		// All customizable variables below (but do it by manually coding, not dynamically)
		//****************************************************************************************************
		// the id for the container for any created details dialog
		this.parent = "map-container";
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
				tabId: "details-tab-data", 
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
				bottomMsg: "A result of ND means the concentration was below detection limits.", 
				noDataMsg: "No data could be retrieved for this station with the contaminant and year parameters. Try expanding the query year-span or changing the contaminant type."
			}, 
			trends: {
				tabId: "details-tab-trends", 
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
				}, 
				noDataMsg: "No data could be retrieved for this station with the contaminant and year parameters. Try expanding the query year-span or changing the contaminant type."
			}, 
			nearby: {
				tabId: "details-tab-nearby", 
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
			}, 
			report: {
				tabId: "details-tab-report", 
				element: null, 
				width: 550,
				titleFunction: function(query) {
					return "Generate and Print Summary Report";
				}
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
		if($("#details-container").length === 0) {
			this.createDetailsDialog();
		} else {
			this.element = $("#details-container");
		}
		// open data/query
		this.open(query);
	};
		
	this.open = function(inputQuery) {
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
		this.element.show();
		// nearby data is left null until specifically requested
		this.nearbyData = null;
		// get the data at least for the data and trends tabs
		this.stationData = null;
		// self refernce necessary for callbacks
		var self = this;
		$.ajax({
			async: false, 
			url: "lib/getStationData.php", 
			data: this.query, 
			dataType: "json", 
			success: function(data) {
				//console.log(data);
				self.stationData = data;
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
	
	this.createDetailsDialog = function() {
		$('#' + this.parent).append(
			"<div id='details-container" + "' style='padding:"+this.containerPadding+"px;'>" + 
				"<div id='details-dialog' style='padding:"+this.contentPadding+"px;'>" + 
					"<div id='details-title' class='grab'></div>" + // title set elsewhere
					"<div id='details-info'></div>" +
					"<div id='details-tabs-container'>" + 
						"<ul id='details-dialog-tabs'>" + 
							"<li id='" + this.tabs.data.tabId + "' class='details-tab'>Data</li>" + 
							"<li id='" + this.tabs.trends.tabId + "' class='details-tab'>Trends</li>" + 
							"<li id='" + this.tabs.nearby.tabId + "' class='details-tab'>Nearby</li>" + 
							"<li id='" + this.tabs.report.tabId + "' class='details-tab'>Print Report</li>" + 
						"</ul>" + 
					"</div>" + 
					"<div id='details-content'></div>" + 
				"</div>" + 
			"</div>"
		);
		this.element = $("#details-container");
		var titleElement = this.element.find("#details-title");
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
		var self = this;
		$("#"+this.tabs.data.tabId).on('click', function() { self.openTabData(); });
		$("#"+this.tabs.trends.tabId).on('click', function() { self.openTabTrends(); });
		$("#"+this.tabs.nearby.tabId).on('click', function() { self.openTabNearby(); });
		$("#"+this.tabs.report.tabId).on('click', function() { self.openTabReport(); });
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
		var advisoryName;
		var advisoryUrl = this.station.get("advisoryUrl");
		if(!advisoryUrl) {
			if(this.station.get("waterType").search(/reservoir|lake/i)) {
				advisoryName = "View <b>General Guidance of Safe Fish Consumption</b> for Lakes/Reservoirs";
				advisoryUrl = "http://www.oehha.ca.gov/fish/special_reports/advisorylakesres.html";
			} else {
				advisoryName = "View <b>General Guidance of Safe Fish Consumption</b>";
				advisoryUrl = "http://www.oehha.ca.gov/fish/general/broch.html";
			}
		} else {
			advisoryName = "View <b>Specific Safe Eating Guidelines</b> for this water body";
		}
		var listLinks = $("<ul></ul>");
		var advisoryUrl = this.station.get("advisoryUrl");
		listLinks.append(
			$("<li></li>").html(
				"<a id='details-advisory' href='" + advisoryUrl + "' target='_blank'>" + 
					advisoryName + 
				"</a>"
		));
		if(this.station.get("waterType") === "coast") {
			var coords = ol.proj.toLonLat(this.station.getGeometry().getCoordinates());
			listLinks.append(
				$("<li></li>").html(
					"<a id='details-tides' " + 
						"href='https://tidesandcurrents.noaa.gov/tide_predictions.html?type=Tide+Predictions&searchfor=" + 
							coords[1].toFixed(4) + "%2C+" + coords[0].toFixed(4) + "' target='_blank'>" + 
						"Find nearest <b>Tidal Prediction Stations</b> for this location" + 
					"</a>"
			));
		}
		this.element.find("#details-info").html(listLinks);
	};	
	
	this.openLoadingMessage = function() {
		this.element.find("#details-content").html(
			"<div style='margin:30px 10px;text-align:center;font-weight:bolder;'>Loading data...</div>"
		);
	};
	
	this.setActiveTab = function(tab) {
		for(var t in this.tabs) {
			if(this.tabs.hasOwnProperty(t)) {
				var element = $("#"+this.tabs[t].tabId);
				if(this.tabs[t] === tab) {
					element
					  .removeClass("details-tab")
					  .addClass("details-tab-active");
				} else {
					element
					  .removeClass("details-tab-active")
					  .addClass("details-tab");
				}
			}
		}
	};
	
	// getting divs to fit content across all browsers is a pain so just do it manually
	this.adjustContainerDimensions = function(width, height) {
		var dialogDiv = this.element.find("#details-dialog");
		
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
		var contentDiv = this.element.find("#details-content");
		var width = this.tabs.data.tableWidth;
		contentDiv.html(
			"<div style='width:" + (width-this.titleDivPadLeft) + "px;" + this.style.titleDiv + this.style.title + "'>" + 
				this.tabs.data.titleFunction(this.query) + 
			"</div>"
		);
		var hasResult = this.stationData && this.stationData.length > 0;
		// create headers
		$("<div></div>").appendTo(contentDiv)
			.addClass('details-table-header-row')
			.width(width)
		  .append(
			$("<div>Species</div>")
			  .addClass('details-table-header')
			  .width(this.tabs.data.colWidths[0])
			  .css('text-align', 'left')
		  )
		  .append(
			$("<div></div>")
			  .html(this.query.contaminant + ((hasResult) ? " (" + this.stationData[0].units + ")" : ""))
			  .addClass('details-table-header')
			  .width(this.tabs.data.colWidths[1])
		  )
		  .append(
			$("<div>Sample Year</div>")
			  .addClass('details-table-header')
			  .width(this.tabs.data.colWidths[2])
		  )
		  .append(
			$("<div>Prep Code</div>")
			  .addClass('details-table-header')
			  .width(this.tabs.data.colWidths[3])
		  )
		  .append(
			$("<div>Sample Type</div>")
			  .addClass('details-table-header')
			  .width(this.tabs.data.colWidths[4])
		  );
		if(!hasResult) {
			// if no result, display no data message
			$("<div>"+this.tabs.data.noDataMsg+"</div>").appendTo(rowHeaders)
				.addClass('details-table-row')
				.width(width)
				.css("padding", "10px 5px")
				.css("margin-bottom", 30);
		} else {
			for(var i = 0; i < this.stationData.length; i++) {
				$("<div></div>").appendTo(contentDiv)
					.addClass('details-table-row')
					.width(width)
					.css("background-color", ((i%2===0)?" style='background-color:#eee;'":""))
				  .append(
					  $("<div></div>")
						.html(this.stationData[i].species)
						.addClass('details-table-cell')
						.width(this.tabs.data.colWidths[0])
						.css('text-align', 'left')
				  )
				  .append(
					  $("<div></div>")
						.html(this.stationData[i].value)
						.addClass('details-table-cell')
						.addClass("color-value")
						.width(this.tabs.data.colWidths[1])
				  )
				  .append(
					  $("<div></div>")
						.html(this.stationData[i].sampleYear)
						.addClass('details-table-cell')
						.width(this.tabs.data.colWidths[2])
				  )
				  .append(
					  $("<div></div>")
						.html(this.stationData[i].prepCode)
						.addClass('details-table-cell')
						.width(this.tabs.data.colWidths[3])
				  )
				  .append(
					  $("<div></div>")
						.html(this.stationData[i].sampleType)
						.addClass('details-table-cell')
						.width(this.tabs.data.colWidths[4])
				  );
			}
			// colorize!
			contentDiv.find(".color-value").each(function(i, element) {
				element.style.color = getThresholdColor(parseFloat(element.innerHTML));
			});
		}
		if(this.tabs.data.bottomMsg) {
			contentDiv.append(
				"<div style='width:" + width + "px;" + this.style.bottomMsg + "'>" + this.tabs.data.bottomMsg + "</div>"
			);
		}
		this.setActiveTab(this.tabs.data);
		this.adjustContainerDimensions(this.tabs.data.tableWidth);
	};	
	
	this.openTabTrends = function() {
		var contentDiv = this.element.find("#details-content");
		contentDiv.html(
			"<div style='width:" + (this.tabs.trends.chartWidth - this.titleDivPadLeft) + "px;" + this.style.titleDiv + this.style.title + "'>" + 
				this.tabs.trends.titleFunction(this.query) + 
			"</div>"
		);
		if(this.stationData && this.stationData.length > 0) {
			// not used but it returns the svg object (already added to container)
			var svg = Scatterplot.create({
				container: "details-content",
				data: this.stationData, 
				dataPointName: 'species', 
				xValueName: 'sampleYear', 
				xAxisLabel: 'Year', 
				yValueName: 'value', 
				yAxisLabel: this.query.contaminant + " (" +  this.stationData[0].units + ")", 
				width: this.tabs.trends.chartWidth,
				height: this.tabs.trends.chartHeight
			});
		} else {
			contentDiv.append(this.tabs.trends.noDataMsg);
		}
		this.setActiveTab(this.tabs.trends);
		this.adjustContainerDimensions(this.tabs.trends.chartWidth);
	};
	
	this.openTabNearby = function() {
		if(!this.nearbyData) {
			// if data does not exist, attempt to load it from server
			this.openLoadingMessage();
			this.nearbyData = this.loadNearbyData();
		}
		var contentDiv = this.element.find("#details-content");
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
						"<select id='details-species-control' style='width:360px;'>" +
							"<option value='highest'>Any Species with Highest Avg Concentration</option>" + 
							"<option value='lowest'>Any Species with Lowest Avg Concentration</option>" + 
						"</select>" +
					"</div>" + 
				"</div>"
			);
			// add all available species to the list
			var speciesSelect = contentDiv.find("#details-species-control");
			for(var i = 0; i < speciesList.length; i++) {
				speciesSelect.append("<option value=\"" + speciesList[i][0].toLowerCase() + "\">" + speciesList[i][0].capitalize() + "</option>");
			}
			// set the currently selected option
			speciesSelect.val(this.tabs.nearby.species);
			// fancy select
			contentDiv.find("#details-species-control").chosen();
			// click functionality
			var self = this;
			speciesSelect.on('change', function() {
				self.nearbyData = null;
				self.tabs.nearby.species = speciesSelect.val();
				self.openTabNearby();
			});
			// write table headers
			$("<div></div>").appendTo(contentDiv)
				.addClass('details-table-header-row')
				.width(width)
			  .append(
				  $("<div>Location</div>")
					.addClass('details-table-header')
					.width(this.tabs.nearby.colWidths[0])
					.css('text-align', 'left')
			  )
			  .append(
				  $("<div>Distance (mi)</div>")
					.addClass('details-table-header')
					.width(this.tabs.nearby.colWidths[1])
			  )
			  .append(
				  $("<div>Species</div>")
					.addClass('details-table-header')
					.width(this.tabs.nearby.colWidths[2])
			  )
			  .append(
				  $("<div></div>")
					.html(this.query.contaminant + (hasResult ? " ("+this.nearbyData[0].units+")" : ""))
					.addClass('details-table-header')
					.width(this.tabs.nearby.colWidths[3])
			  )
			  .append(
				$("<div>Sample Year</div>")
					.addClass('details-table-header')
					.width(this.tabs.nearby.colWidths[4])
			  )
			  .append(
				  $("<div>Prep Code</div>")
					.addClass('details-table-header')
					.width(this.tabs.nearby.colWidths[5])
			  )
			  .append(
				  $("<div>Sample Type</div>")
					.addClass('details-table-header')
					.width(this.tabs.nearby.colWidths[6])
			  );
			if(!hasResult) {
				// if no result, display no data message
				$("<div>"+this.tabs.nearby.noDataMsg+"</div>").appendTo(rowHeaders)
					.addClass('details-table-row')
					.width(width)
					.css("padding", "10px 5px")
					.css("margin-bottom", 30);
			} else {
				// loop through rows
				for(var i = 0; i < this.nearbyData.length; i++) {
					$("<div></div>").appendTo(contentDiv)
						.addClass('details-table-row')
						.width(width)
						.css("background-color", ((i%2===0)?" style='background-color:#eee;'":""))
					  .append(
						  $("<div></div>")
							.html(this.nearbyData[i].station)
							.addClass('details-table-cell')
							.width(this.tabs.nearby.colWidths[0])
							.css('text-align', 'left')
					  )
					  .append(
						  $("<div></div>")
							.html(this.nearbyData[i].distanceMiles)
							.addClass('details-table-cell')
							.width(this.tabs.nearby.colWidths[1])
					  )
					  .append(
						  $("<div></div>")
							.html(this.nearbyData[i].species)
							.addClass('details-table-cell')
							.width(this.tabs.nearby.colWidths[2])
					  )
					  .append(
						  $("<div></div>")
							.html(this.nearbyData[i].value)
							.addClass('details-table-cell')
							.addClass("color-value")
							.width(this.tabs.nearby.colWidths[3])
					  )
					  .append(
						  $("<div></div>")
							.html(this.nearbyData[i].sampleYear)
							.addClass('details-table-cell')
							.width(this.tabs.nearby.colWidths[4])
					  )
					  .append(
						  $("<div></div>")
							.html(this.nearbyData[i].prepCode)
							.addClass('details-table-cell')
							.width(this.tabs.nearby.colWidths[5])
					  )
					  .append(
						  $("<div></div>")
							.html(this.nearbyData[i].sampleType)
							.addClass('details-table-cell')
							.width(this.tabs.nearby.colWidths[6])
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
	
	this.openTabReport = function() {
		var contentDiv = this.element.find("#details-content");
		contentDiv.html(
			"<div style='width:" + (this.tabs.report.width - this.titleDivPadLeft) + "px;" + this.style.titleDiv + this.style.title + "'>" + 
				this.tabs.report.titleFunction(this.query) + 
			"</div>"
		);
		var yearMsg = "";
		if(this.query.startYear === this.query.endYear) {
			yearMsg = "in <b>" + this.query.startYear;
		} else {
			yearMsg = "between <b>" + this.query.startYear + "-" + this.query.endYear;
		}
		yearMsg += "</b> ";
		$("<div></div>").appendTo(contentDiv)
			.css({ margin:"40px 20px", 'text-align':"center" })
			.append(
				"Retrieve all data recorded for <b>" + this.query.contaminant + "</b> contamination " + yearMsg + "<br />" + 
				"within a distance of: <select id='report-select-miles' style='font-weight:bold;'></select> miles from " + 
				"<b>" + this.query.station + "</b><br />"
			)
			.append(
				$("<div id='create-report'>Generate Report</div>")
					.addClass('button')
					.css({
						width: 180,
						height: 30, 
						margin: "15px auto", 
						'line-height': "30px",
						'text-align': "center", 
						'font-weight': "bolder"
					})
			);
		var selectMiles = this.element.find("#report-select-miles");
		selectMiles.append("<option value=5>5</option>");
		selectMiles.append("<option value=10>10</option>");
		selectMiles.append("<option value=15>15</option>");
		selectMiles.append("<option value=20>20</option>");
		selectMiles.append("<option value=25>25</option>");
		selectMiles.val(this.query.radiusMiles);
		if(!selectMiles.val()) { selectMiles.val(10); }
		
		var self = this;
		contentDiv.find("#create-report").on("click", function() { 
			self.openLoadingMessage();
			self.query.radiusMiles = selectMiles.val();
			$.ajax({
				url: "lib/gatherSummaryReport.php", 
				data: self.query, 
				dataType: "json", 
				success: function(response) {
					// open new window with data (which will be stored in session)
					newWindow(null, "lib/generateSummaryReport.php", "Summary Report", 750, 950);
					// reset tab html
					self.openTabReport();
				},
				error: function(e) {
					contentDiv.html(defaultErrorMessage + "(Report Query Error)");
				}
			});
		});
		this.setActiveTab(this.tabs.report);
		this.adjustContainerDimensions(this.tabs.report.width);
	};
	
	// fire init function
	this.init(query);
		
};