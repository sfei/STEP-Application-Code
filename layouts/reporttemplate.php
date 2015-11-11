<?php
	
	$jsonQuery = json_encode($query, JSON_NUMERIC_CHECK);
	$jsonData = json_encode($data, JSON_NUMERIC_CHECK);
	$station = $query['station'];
	
	// use HEREDOC for ease of writing template
	$html = <<< HTML
<html>
	<head>
		<title>$station Summary Report</title>
		<meta charset="UTF-8">		
		<!-- jQuery -->
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
		<!-- OpenLayers-3 -->
		<link rel="stylesheet" href="http://openlayers.org/en/v3.10.1/css/ol.css" type="text/css" />
		<script src="http://openlayers.org/en/v3.10.1/build/ol-debug.js"></script>
		<!-- page CSS -->
		<link rel="stylesheet" href="../layouts/reporttemplate.css" />
		<!-- color/marker scripts -->
		<script src="../js/ColorMap.js"></script>
		<script src="../js/MarkerFactory.js"></script>
		<!-- main map script -->
		<script src="../js/basemaps.js"></script>
		<script src="../js/map.js"></script>
		<!-- summary report script which overrides the map init, so put after -->
		<script src="../js/summaryreport.js"></script>
		<script>
			var query=$jsonQuery;
			var data=$jsonData;
			window.onload = init2;
		</script>
	</head>
	<body>
		<div id="container">
			<h1 id="title">Sportfish Contamination Report</h1>
			<div id="print-button" class="button" onclick="window.print();">Print Report</div>
			<!-- the actual OpenLayers map -->
			<div id="map-view" class="grab"></div>
			<!-- header information -->
			<div id="content-header"></div>
			<!-- container for tables/data -->
			<div id="content-container"></div>
		</div>
	</body>
</html>
HTML;
	
	echo $html;

?>