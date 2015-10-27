
var StationDetails = function(options) {
	
	this.close = function() {
		this.element.hide();
	};
	
	this.copyQuery = function(copyQuery) {
		this.query = Object.assign({}, copyQuery);
//		this.query = new Array();
//		for(var i in copyQuery) {
//			if(copyQuery.hasOwnProperty(i)) {
//				this.query[i] = copyQuery[i];
//			}
//		}
	};
	
	this.openTabData = function() {
		var contentDiv = this.element.find("#details-content");
		contentDiv.html(
			"<div class='legend-table-row'>" + 
				"<div class='legend-table-cell'>Species</div>" + 
				"<div class='legend-table-cell'>" + this.query.contaminant + " (" +  this.stationData[0].units + ")</div>" + 
				"<div class='legend-table-cell'>Sample Year</div>" + 
				"<div class='legend-table-cell'>Prep Code</div>" + 
				"<div class='legend-table-cell'>Sample Type</div>" + 
			"</div>"
		);
		for(var i = 0; i < this.stationData.length; i++) {
			var row = "<div class='legend-table-row'>";
			row += "<div class='legend-table-cell'>" + this.stationData[i].species + "</div>";
			row += "<div class='legend-table-cell'>" + this.stationData[i].value + "</div>";
			row += "<div class='legend-table-cell'>" + this.stationData[i].sampleYear + "</div>";
			row += "<div class='legend-table-cell'>" + this.stationData[i].prepCode + "</div>";
			row += "<div class='legend-table-cell'>" + this.stationData[i].tissueCode + "</div>";
			row += "</div>";
			contentDiv.append(row);
		}
	};	
	
	this.openLoadingMessage = function() {
		this.element.find("#details-content").html("Loading data...");
	};
	
	this.createDetailsDialog = function() {
		this.element = $('#map-container').append(
			"<div id='details-dialog'>" + 
				"<div id='details-title'>" + 
					this.query.station + 
					"<span id='details-dialog-close' class='button' style='float:right;'>X</span>" + 
				"</div>" + 
				"<div id='details-dialog-tabs'>" + 
					"<div id='details-tab-data' class='nav-tab-active'>Data</div>" + 
					"<div id='details-tab-trends' class='nav-tab'>Trends</div>" + 
					"<div id='details-tab-nearby' class='nav-tab'>Nearby</div>" + 
				"</div>" + 
				"<div id='details-content'></div>" + 
			"</div>"
		);
		this.element.draggable({containment: "parent"});
//		this.element.find("#details-tab-data").click(this.openTabData);
//		this.element.find("#details-tab-trends").click(this.openTabTrends);
//		this.element.find("#details-tab-nearby").click(this.openTabNearby);
		this.element.find("#details-close").click(this.close);
	};
	
	this.init = function(options) {
		// the query that constructed this
		this.copyQuery(options.query);
		if(options.station) {
			this.query.station = options.station;
		}
		// the element that contains the dialog box/tabs
		if(!options.element || this.element.length === 0) {
			this.createDetailsDialog();
		} else {
			this.element = options.element;
			this.element.show();
		}
		// put station name from query and place loading message
		this.element.find("#details-title").html(this.query.station);
		this.openLoadingMessage();
		// nearby data is left null until specifically requested
		this.nearbyData = null;
		// get the data at least for the data and trends tabs
		this.stationData = null;
		var thisRef = this;
		console.log(this.query);
		$.ajax({
			url: "lib/getStationData.php", 
			data: this.query, 
			dataType: "json", 
			success: function(data) {
				console.log(data);
				thisRef.stationData = data;
				thisRef.openTabData();
			},
			error: function(e) {
				//thisRef.openErrorMessage();
				alert(defaultErrorMessage + "(Error StationData)");
			}
		});
	};
	
	
	this.init(options);
		
};