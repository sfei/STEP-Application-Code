/**
 * The StationDetails object handles the window that opens when you click a station. There is quite a lot of 
 * functionality provided, which is generally organized into tabs. Only one window may be open at a time, but 
 * using the {@link #open(query)} call will load the new data into the existing window (or reopen the window 
 * if it has been closed). A lot can be customized here, but it is not given an easy way to do 
 * programitically. Instead manually change many of the object variables created in the init function. 
 * Probably shouldn't ever have two instances either as then much of the element IDs will be duplicated.
 * @param {Object} query - Query object. Optional.
 * @returns {StationDetails}
 */
define([
	"common",
	"OpenLayers", 
	"noUiSlider", 
	"./module-scatterplot"
], function(common, ol, noUiSlider, Scatterplot) {
	
	//********************************************************************************************************
	// Constructor(s)
	//********************************************************************************************************
	function StationDetails(parentStepApp) {
		this.parent = parentStepApp;
		var self = this;
		// All customizable variables below (but do it by manually coding, not dynamically)
		//****************************************************************************************************
		// the id for the container for any created details dialog
		this.parentId = "step-container";
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
				label: "Data", 
				tabId: "details-tab-data", 
				click: self.openTabData, 
				headers: ['Species', 'Contaminant', 'Sample Year', 'Prep Code', 'SampleType'], 
				colWidths: [180, 80, 60, 80, 150], 
				valueKeys: ['species', 'value', 'sampleYear', 'prepCode', 'sampleType'], 
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
				label: "Trends", 
				tabId: "details-tab-trends", 
				click: self.openTabTrends, 
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
				label: "Nearby", 
				tabId: "details-tab-nearby", 
				click: self.openTabNearby, 
				species: null, 
				headers: ['Location', 'Distance (mi)', 'Species', 'Contaminant', 'Sample Year', 'Prep Code', 'SampleType'], 
				colWidths: [240, 60, 180, 80, 60, 80, 150], 
				valueKeys: ['station', 'distanceMiles', 'species', 'value', 'sampleYear', 'prepCode', 'sampleType'], 
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
				label: "Print Report", 
				tabId: "details-tab-report", 
				click: self.openTabReport, 
				width: 550,
				slider: null, 
				titleFunction: function(query) {
					return "Generate and Print Summary Report";
				}
			}
		};
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
		this.activeTab = null;
		// the element that contains the dialog box/tabs
		if($("#details-container").length === 0) {
			this.createDetailsDialog();
		} else {
			this.element = $("#details-container");
		}
		// open data/query
		this.isOpen = false;
	};
	
	StationDetails.prototype.createDetailsDialog = function() {
		this.element = $(
			"<div id='details-container' class='container-styled' style='padding:"+this.containerPadding+"px;'>" + 
				"<div id='details-dialog' class='inner-container-style' style='padding:"+this.contentPadding+"px;'>" + 
					"<div id='details-title' class='grab'></div>" + // title set elsewhere
					"<div id='details-contaminant-control'></div>" + 
					"<div id='details-info'></div>" +
					"<div id='details-tabs-container'>" + 
						"<ul id='details-dialog-tabs'></ul>" + 
					"</div>" + 
					"<div id='details-content'></div>" + 
				"</div>" + 
			"</div>"
		).appendTo($('#'+this.parentId));
		// add tabs programmatically
		var self = this;
		var tabsList = this.element.find("#details-dialog-tabs");
		for(var t in this.tabs) {
			if(this.tabs.hasOwnProperty(t)) {
				$("<li id='" + this.tabs[t].tabId + "' class='details-tab'>" + this.tabs[t].label + "</li>")  
					.appendTo(tabsList)
					.click(
						// variable scope in javascript callbacks sure is funky, especially within a loop
						function(theTab) { 
							return function() { theTab.click.call(self); };
						}(this.tabs[t])
					);
			}
		}
		// While addGrabCursorFunctionality() exists in map.js, do this a little specifically so grab cursor 
		// appears on title bar only
		var titleElement = this.element.find("#details-title").addClass("grab");
		this.element
			.hide()
			.draggable({containment: "#"+this.parentId})
			.mousedown(function(evt) {
				self.element.addClass("grabbing");
				titleElement.removeClass("grab");
			})
			.mouseup(function(evt) {
				self.element.removeClass("grabbing");
				titleElement.addClass("grab");
			});
	};
	
	
	//********************************************************************************************************
	// Open/load calls
	//********************************************************************************************************
	StationDetails.prototype.open = function(params) {
		if(!params) { return; }
		// the query that constructed this
		this.query = this.copyQuery(params.query);
		this.query.query = "getStationRecords";
		if(params.station) {
			this.station = params.station;
			this.query.station = this.station.get("name");
		}
		// this needs to be reset, maybe
		this.tabs.nearby.species = params.nearbySpecies ? params.nearbySpecies : null;
		// put station name from query and place loading message
		this.setTitle();
		this.element.find("#details-contaminant-control").html("");
		this.openLoadingMessage();
		this.populateContaminantControl();
		this.element.show();
		this.isOpen = true;
		// nearby data is left null until specifically requested
		this.nearbyData = null;
		// get the data at least for the data and trends tabs
		this.stationData = null;
		// self refernce necessary for callbacks
		var self = this;
		$.ajax({
			async: false, 
			url: "lib/query.php", 
			data: this.query, 
			dataType: "json", 
			success: function(data) {
				//console.log(data);
				self.stationData = data;
				switch(params.tab) {
					case "report":
						self.openTabReport();
						break;
					case "nearby":
						self.openTabNearby();
						break;
					case "trends":
						self.openTabTrends();
						break;
					case "data":
					default:
						self.openTabData();
				}
			},
			error: function(e) {
				//self.openErrorMessage();
				alert(defaultErrorMessage + "(Error StationData)");
			}
		});
	};
	
	StationDetails.prototype.copyQuery = function(toCopy) {
		//this.query = Object.assign({}, copyQuery);
		var theCopy = {};
		for(var v in toCopy) {
			if(toCopy.hasOwnProperty(v)) {
				theCopy[v] = toCopy[v];
			}
		}
		return theCopy;
	};
	
	
	//********************************************************************************************************
	// Loading and non-tab related content
	//********************************************************************************************************	
	StationDetails.prototype.setTitle = function() {
		// station name
		this.element.find("#details-title").html(
			"<div id='details-station-name'>" + this.query.station + "</div>" + 
			"<div id='details-dialog-close' class='button'>X</div>"
		);
		// close button
		var self = this;
		this.element.find("#details-dialog-close").click(function() {
			self.isOpen = false;
			self.element.hide();
		});
		// advisory link
		var advisoryName;
		var advisoryUrl = this.station.get("advisoryUrl");
		if(!advisoryUrl) {
			if(this.station.get("waterType").search(/reservoir|lake/i) >= 0) {
				advisoryName = "View <b>General Guidance for Safe Fish Consumption</b> for Lakes/Reservoirs";
				advisoryUrl = "http://www.oehha.ca.gov/fish/special_reports/advisorylakesres.html";
			} else {
				advisoryName = "View <b>General Guidance for Safe Fish Consumption</b>";
				advisoryUrl = "http://www.oehha.ca.gov/fish/general/broch.html";
			}
		} else {
			advisoryName = "View specific <b>Safe Eating Guidelines</b> for this water body";
		}
		var listLinks = $("<ul></ul>").append(
			$("<li></li>").html(
				"<a id='details-advisory' href='" + advisoryUrl + "' target='_blank'>" + advisoryName + "</a>"
			)
		);
		// link for tidal datum if coastal type
		if(this.station.get("waterType").search(/coast/i) >= 0) {
			var coords = ol.proj.toLonLat(this.station.getGeometry().getCoordinates());
			var tidesUrl = (
				"https://tidesandcurrents.noaa.gov/tide_predictions.html?type=Tide+Predictions&searchfor="
				+ coords[1].toFixed(4) + "%2C+" + coords[0].toFixed(4)
			);
			listLinks.append(
				$("<li></li>").html(
					"<a id='details-tides' " + 
						"href='"+tidesUrl+"' target='_blank'>" + 
						"Find nearest <b>Tidal Prediction Stations</b> for this location" + 
					"</a>"
			));
		}
		this.element.find("#details-info").html(listLinks);
	};
	
	StationDetails.prototype.openLoadingMessage = function() {
		this.element.find("#details-content").html(
			"<div style='margin:30px 10px;text-align:center;font-weight:bolder;'>" +
				"<img src='images/ajax-loader.gif' alt='loading' /> Loading data..." + 
			"</div>"
		);
	};
	
	StationDetails.prototype.populateContaminantControl = function() {
		var contaminantSelect = $("<select id='details-contaminant-select'></select>");
		var contaminantQuery = {
			query: "getAvailableContaminantsAtStation",
			station: this.query.station
		};
		var self = this;
		$.ajax({
			async: false, 
			url: "lib/query.php", 
			data: contaminantQuery, 
			dataType: "json", 
			success: function(data) {
				for(var i = 0; i < data.length; i++) {
					contaminantSelect.append(
						$("<option>", {value: data[i][0]}).text(data[i][0])
					);
				}
				$("#details-contaminant-control").append(contaminantSelect);
				contaminantSelect.val(self.query.contaminant);
				$("#details-contaminant-control").on('change', function() {
					self.query.contaminant = contaminantSelect.val();
					self.open({
						station: self.station, 
						query: self.query, 
						nearbySpecies: self.tabs.nearby.species, 
						tab: self.activeTab
					});
				});
			}
		});
	};
	
	
	//********************************************************************************************************
	// Tab Controls
	//********************************************************************************************************
	StationDetails.prototype.setActiveTab = function(tabName) {
		if(!this.tabs[tabName]) {
			return;
		}
		this.activeTab = tabName;
		for(var t in this.tabs) {
			var element = $("#"+this.tabs[t].tabId);
			if(t === this.activeTab) {
				element.removeClass("details-tab").addClass("details-tab-active");
			} else {
				element.removeClass("details-tab-active").addClass("details-tab");
			}
		}
	};
	
	
	// getting divs to fit content across all browsers via css is a pain so just do it manually
	StationDetails.prototype.adjustContainerDimensions = function(width, height) {
		var dialogDiv = this.element.find("#details-dialog");
		if(!width || width <= 0) { 
			width = dialogDiv.width();
		} else {
			width += this.scrollbarWidth;
			dialogDiv.width(width);
			width += 2*this.contentPadding + 2;	// plus 2 from the border
		}
		this.element.width(width);
		// adjust title width (leave room for close button)
		$("#details-station-name").width(width-45);
		
		if(!height || height <= 0) { 
			height = dialogDiv.height();
			height += 2*this.contentPadding;
		} else {
			dialogDiv.height(height);
			height += 2*this.contentPadding + 2;
		}
		this.element.height(height+2*this.containerPadding-1);
	};
	
	
	//********************************************************************************************************
	// Data Tab
	//********************************************************************************************************
	StationDetails.prototype.openTabData = function() {
		var yearMsg;
		if(this.query.startYear !== this.query.endYear) {
			yearMsg = "between " + this.query.startYear + "-" + this.query.endYear;
		} else {
			yearMsg = "in " + this.query.startYear;
		}
		// title
		var contentDiv = this.element.find("#details-content");
		var width = this.tabs.data.tableWidth;
		contentDiv.html(
			"<div style='width:" + (width-this.titleDivPadLeft) + "px;" + this.style.titleDiv + this.style.title + "'>" + 
				this.tabs.data.titleFunction(this.query) + 
			"</div>"
		);
		// create table headers
		var headers = $("<div></div>").appendTo(contentDiv)
			.addClass('details-table-header-row')
			.width(width);
		var hasResult = this.stationData && this.stationData.length > 0;
		for(var i = 0; i < this.tabs.data.headers.length; i++) {
			var title = this.tabs.data.headers[i];
			if(title.toLowerCase() === "contaminant" && hasResult) {
				title = this.query.contaminant;
				if(hasResult) { 
					title += " (" + this.stationData[0].units + ")"; 
				}
			}
			var cell = $("<div></div>").appendTo(headers)
				.html(title)
				.addClass('details-table-header')
				.width(this.tabs.data.colWidths[i]);
			if(i === 0) {
				cell.css('text-align', 'left');
			}
		}
		if(!hasResult) {
			// if no result, display no data message
			$("<div>"+this.tabs.data.noDataMsg+"</div>").appendTo(contentDiv)
				.addClass('details-table-row')
				.width(width)
				.css("padding", "10px 5px")
				.css("margin-bottom", 30);
		} else {
			// otherwise add rows to table
			for(var i = 0; i < this.stationData.length; i++) {
				var row = $("<div></div>").appendTo(contentDiv)
					.addClass('details-table-row')
					.width(width)
					.css("background-color", ((i%2===0)?" style='background-color:#eee;'":""));
				for(var c = 0; c < this.tabs.data.valueKeys.length; c++) {
					var cell = $("<div></div>").appendTo(row)
						.html(this.stationData[i][this.tabs.data.valueKeys[c]])
						.addClass('details-table-cell')
						.width(this.tabs.data.colWidths[c]);
					if(c === 0) {
						cell.css('text-align', 'left');
					}
					// commented out as this gets kind of hard to see depending on color
//					if(this.tabs.data.valueKeys[c] === "value") {
//						// colorize!
//						cell.style("color", getThresholdColor(parseFloat(cell.html())));
//					}
				}
			}
		}
		// final little bottom note
		if(this.tabs.data.bottomMsg) {
			contentDiv.append(
				"<div style='width:" + width + "px;" + this.style.bottomMsg + "'>" + this.tabs.data.bottomMsg + "</div>"
			);
		}
		// set as active tab and adjust dimension to fit new content
		this.setActiveTab("data");
		this.adjustContainerDimensions(this.tabs.data.tableWidth);
	};	
	
	
	//********************************************************************************************************
	// Trends Tab
	//********************************************************************************************************
	StationDetails.prototype.openTabTrends = function() {
		// title
		var contentDiv = this.element.find("#details-content");
		contentDiv.html(
			"<div style='width:" + (this.tabs.trends.chartWidth - this.titleDivPadLeft) + "px;" + this.style.titleDiv + this.style.title + "'>" + 
				this.tabs.trends.titleFunction(this.query) + 
			"</div>"
		);
		if(this.stationData && this.stationData.length > 0) {
			// not used but it returns the svg object (already added to container via the options)
			var svg = Scatterplot({
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
		// set as active tab and adjust dimension to fit new content
		this.setActiveTab("trends");
		this.adjustContainerDimensions(this.tabs.trends.chartWidth);
	};
	
	
	//********************************************************************************************************
	// Nearby Tab
	//********************************************************************************************************
	StationDetails.prototype.openTabNearby = function() {
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
			for(var i = 0; i < this.parent.modules.queryAndUI.speciesList.length; i++) {
				speciesSelect.append(
						"<option value=\"" + this.parent.modules.queryAndUI.speciesList[i][0] + "\">" + 
							this.parent.modules.queryAndUI.speciesList[i][0] + 
						"</option>"
					);
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
			var headers = $("<div></div>").appendTo(contentDiv)
				.addClass('details-table-header-row')
				.width(width);
			for(var i = 0; i < this.tabs.nearby.headers.length; i++) {
				var title = this.tabs.nearby.headers[i];
				if(title.toLowerCase() === "contaminant" && hasResult) {
					title = this.query.contaminant;
					if(hasResult) { 
						title += " (" + this.nearbyData[0].units + ")"; 
					}
				}
				var cell = $("<div></div>").appendTo(headers)
					.html(title)
					.addClass('details-table-header')
					.width(this.tabs.nearby.colWidths[i]);
				if(i === 0) {
					cell.css('text-align', 'left');
				}
			}
			if(!hasResult) {
				// if no result, display no data message
				$("<div>"+this.tabs.nearby.noDataMsg+"</div>").appendTo(contentDiv)
					.addClass('details-table-row')
					.width(width)
					.css("padding", "10px 5px")
					.css("margin-bottom", 30);
			} else {
				// loop through rows
				for(var i = 0; i < this.nearbyData.length; i++) {
					var row = $("<div></div>").appendTo(contentDiv)
						.addClass('details-table-row')
						.width(width)
						.css("background-color", ((i%2===0)?" style='background-color:#eee;'":""));
					for(var c = 0; c < this.tabs.nearby.valueKeys.length; c++) {
						var cell = $("<div></div>").appendTo(row)
							.html(this.nearbyData[i][this.tabs.nearby.valueKeys[c]])
							.addClass('details-table-cell')
							.width(this.tabs.nearby.colWidths[c]);
						if(c === 0) {
							cell.css('text-align', 'left');
						}
						if(this.tabs.nearby.valueKeys[c] === 'station') {
							cell.prop('title', "View this station's details")
								.css('cursor', 'pointer')
								.mouseover(function() {
									$(this).css('color', '#003C88');
								})
								.mouseout(function() {
									$(this).css('color', '#000');
								})
								.click(function() {
									var station = getStationByName($(this).html());
									if(station) {
										zoomToStation(station);
										openStationDetails(station);
									}
								});
						}
						// commented out as this gets kind of hard to see depending on color
	//					if(this.tabs.nearby.valueKeys[c] === "value") {
	//						// colorize!
	//						cell.style("color", getThresholdColor(parseFloat(cell.html())));
	//					}
					}
				}
				// bottom message/note
				if(this.tabs.nearby.bottomMsg) {
					contentDiv.append(
						"<div style='width:" + width + "px;" + this.style.bottomMsg + "'>" + this.tabs.nearby.bottomMsg + "</div>"
					);
				}
			}
		}
		// set as active tab and adjust dimension to fit new content
		this.setActiveTab("nearby");
		this.adjustContainerDimensions(this.tabs.nearby.tableWidth);
	};
	
	StationDetails.prototype.loadNearbyData = function() {
		// load default selection for species type
		if(this.tabs.nearby.species === null) {
			this.tabs.nearby.species = this.query.species;
		}
		// create new query with possibly divergent species type
		var nearbyQuery = this.copyQuery(this.query);
		nearbyQuery.query = "getNearbyData";
		nearbyQuery.species = this.tabs.nearby.species;
		//console.log(nearbyQuery);
		// synchronized ajax call
		var returnData = null;
		$.ajax({
			async: false, 
			url: "lib/query.php", 
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
	
	
	//********************************************************************************************************
	// Report Tab
	//********************************************************************************************************
	StationDetails.prototype.openTabReport = function(reportQuery) {
		// use last report query (which must be stored separately as it can adjust years)
		if(!reportQuery) {
			reportQuery = this.copyQuery(this.query);
		}
		// title
		var contentDiv = this.element.find("#details-content");
		contentDiv.html(
			"<div style='width:" + (this.tabs.report.width - this.titleDivPadLeft) + "px;" + this.style.titleDiv + this.style.title + "'>" + 
				this.tabs.report.titleFunction(reportQuery) + 
			"</div>"
		);
		// create inner content
		$("<div></div>").appendTo(contentDiv)
			.css({ margin:"30px 20px", 'text-align':"center", 'font-size': '14px' })
			// Top message
			.append(
				"Retrieve all data recorded for <b>" + reportQuery.contaminant + "</b> contamination between:"
			)
			// Year select
			.append(
				$("<div id='report-year-range-container'></div>")
					.css({
						'display': 'block', 
						'clear': 'both', 
						'margin': "8px 0px",
						'text-align': 'center'
					})
					.append(
						"<div id='report-year-range-start' style='display:inline-block;font-weight:bolder;'>" + reportQuery.startYear + "</div>" + 
						"<div id='report-year-range' style='display:inline-block;width:300px;margin:0px 20px;'></div>" +
						"<div id='report-year-range-end' style='display:inline-block;font-weight:bolder;'>" + reportQuery.endYear + "</div>"
					)
			)
			// Miles select
			.append(
				"For <b>" + reportQuery.station + "</b> and its 10 nearest stations.<br />"
			)
			// Submit button
			.append(
				$("<div id='create-report'>Generate Report</div>")
					.addClass('button')
					.css({
						width: 180,
						height: 30, 
						margin: "25px auto", 
						'line-height': "30px",
						'text-align': "center", 
						'font-weight': "bolder"
					})
			);
		// get all years for query
		var self = this;
		$.ajax({
			url: "lib/query.php", 
			data: {
				query: "getAvailableYearSpan", 
				contaminant: reportQuery.contaminant,
				species: "highest"
			}, 
			dataType: 'json', 
			success: function(data) {
				// slider fails if start and end year are the same
				if(data.min !== data.max) {
					// create range slider
					if(self.tabs.report.slider) {
						self.tabs.report.slider.destroy();
					}
					self.tabs.report.slider = noUiSlider.create(
						document.getElementById('report-year-range'),
						{
							range: { 'min': data.min, 'max': data.max }, 
							start: [reportQuery.startYear, reportQuery.endYear],
							step: 1, 
							connect: true, 
							behaviour: 'tap-drag'
						}
					);
					// bind values to display
					var display = [
						document.getElementById("report-year-range-start"), 
						document.getElementById("report-year-range-end")
					];
					self.tabs.report.slider.on('update', function(values, handle) {
						display[handle].innerHTML = parseInt(values[handle]);
					});
				} else {
					// if a single year, just remove that part of the options
					$("#report-year-range-container").html("Data only available for year <b>" + data.min + "</b>");
				}
			}
		});
		
		// add click functionality
		var self = this;
		contentDiv.find("#create-report").on("click", function() { 
			if(this.tabs.report.slider) {
				// if no slider, leave as default query, which should've already been adjusted for years available
				var yearRange = this.tabs.report.slider.get();
				reportQuery.startYear = parseInt(yearRange[0]);
				reportQuery.endYear = parseInt(yearRange[1]);
			}
			// open loading message after getting parameters
			self.openLoadingMessage();
			// ajax call to gather data (use async to keep new window call shallower and hopefull avoid popup blocking)
			var onSuccess = false;
			$.ajax({
				async: false, 
				url: "lib/prepareSummaryReport.php", 
				data: reportQuery, 
				dataType: "json", 
				success: function(response) { onSuccess = true; },
				error: function(e) { }
			});
			if(onSuccess) {
				if(self.reportWindow && !self.reportWindow.closed) {
					// close if it already exists (reopening is only way to bring into focus with new browsers)
					self.reportWindow.close();
				}
				// open new window with data (which will be stored in session)
				self.reportWindow = newWindow(null, "summaryreport.php", "Summary Report", 750, 950, true);
				// reset tab html but carry over the last report query
				self.openTabReport(reportQuery);
			} else {
				contentDiv.html(defaultErrorMessage + "(Report Query Error)");
			}
		});
		// set as active tab and adjust dimension to fit new content
		this.setActiveTab("report");
		this.adjustContainerDimensions(this.tabs.report.width);
	};
	
	
	return StationDetails;
	
});