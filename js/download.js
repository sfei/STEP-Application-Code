//************************************************************************************************************
// Data download ui and functions
//************************************************************************************************************
function showDownloadDialog() {
	// copy query
	var query = {};
	for(var v in lastQuery) {
		if(lastQuery.hasOwnProperty(v)) {
			query[v] = lastQuery[v];
		}
	}
	// adjust query and messages
	var isASpecies = !(query.species === "highest" || species === "lowest");
	var species = (isASpecies) ? query.species : "all species*";
	var yearMsg;
	if(query.startYear === query.endYear) {
		yearMsg = "during <b>" + query.startYear + "</b>";
	} else {
		yearMsg = "between <b>" + query.startYear + "-" + query.endYear + "</b>";
	}
	// create dialog box
	var buttonStyle = {
		'display': 'inline-block',
		'width': 70, 
		'height': 20, 
		'line-height': '20px', 
		'margin': "0 auto", 
		'text-align': 'center'
	};
	var downloadDialog = $("<div id='download-confirm'></div>")
		.addClass("container-styled")
		.css('text-align', 'center');
	var downloadContent = $("<div id='download-dialog'></div>")
	  .appendTo(downloadDialog)
		.addClass("inner-container-style")
		.append("<span style='font-size:18px;font-weight:bolder;'>Download Data Table<span><hr />")
		.append(
			$("<p></p>").html(
				"Download <b>" + lastQuery.contaminant + "</b> contaminant data " + 
				"for <b>" + species + "</b> " + yearMsg + "?"
			).css({'margin': '15px 0', 'text-align': 'center'})
		);
	if(!isASpecies) {
		downloadContent.append(
			$("<p></p>").html(
				"*Highest or lowest average concentration are not available. " +
				"Instead data for all species will be downloaded."
			).css({'font-size': '10px', 'text-align': 'center'})
		);
	}
	$("<div id='download-buttons'></div>")
	  .appendTo(downloadContent)
		.css('text-align', 'center')
	    .append(
			$("<div id='download-cancel'>Cancel</div>")
				.addClass("button")
				.css(buttonStyle)
				.click(function() { setModal(false); })
		)
		.append(
			$("<div id='download-confirm'>Download</div>")
				.addClass("button")
				.css(buttonStyle)
				.css('margin-left', '4px')
				.click(function() { downloadQueryData(downloadContent, query); })
		);
	// lock interface
	setModal(true, true, downloadDialog);
}

function downloadQueryData(container, query) {
	container.html(
		$("<div id='download-message'></div>")
		.css({
			'text-align': 'center', 
			'margin': '20px 0'
		})
		.html("<img src='images/ajax-loader.gif' alt='loading' /> Preparing file for download..")
	);
	var buttonStyle = {
		'display': 'inline-block',
		'width': 70, 
		'height': 20, 
		'line-height': '20px', 
		'margin': "0 auto", 
		'text-align': 'center'
	};
	var buttonContainer = $("<div id='download-buttons'></div>")
	  .appendTo(container)
		.css('text-align', 'center')
	    .append(
			$("<div id='download-cancel'>Cancel</div>")
				.addClass("button")
				.css(buttonStyle)
				.click(function() {
					container.html();
					setModal(false);
				})
		);
	var downloadUrl = "lib/downloadQueryData.php"+"?species="+query.species+"&contaminant="+query.contaminant+"&startYear="+query.startYear+"&endYear="+query.endYear;
	$("#download-message")
		.append(
			// use iframe to automatically start download
			$("<iframe src='"+downloadUrl+"'></iframe>")
				.css({
					'width': 280, 
					'height': 15, 
					'border': 'none'
				})
				.ready(function() {
					$("#download-message").html(
						"Download should begin automatically. If it does not, <a href='"+downloadUrl+"'>click here</a> to begin download manually."
					);
					buttonContainer.find("#download-cancel").html("Close");
				})
		)
		.append(
			"For information on the data and columns, please see the <a href='metadata.html' target='_blank'>metadata page</a>."
		);
}