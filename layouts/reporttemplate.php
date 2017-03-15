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
    <link rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/jqueryui/1.11.4/themes/smoothness/jquery-ui.css" />
    <link rel="stylesheet" href="http://openlayers.org/en/v3.10.1/css/ol.css" type="text/css" />
    <link rel="stylesheet" href="css/chosen.min.css" type="text/css" />
    <link rel="stylesheet" href="css/nouislider.min.css" />
    <link rel="stylesheet" href="css/summaryreport.css" />
    <script>
      var summaryReport = true;
      var reportQuery=$jsonQuery;
      var reportData=$jsonData;
    </script>
    <script src="js/lib/require.js" data-main="js/init"></script>
  </head>
  <body>
    <div id="container">
      <h1 id="title">Sportfish Contamination Report</h1>
      <div id="print-button" class="button" onclick="window.print();">Print Report</div>
      <div id="map-view" class="grab"></div>
      <div id="content-header"></div>
      <div id="content-container"></div>
    </div>
  </body>
</html>
HTML;
	
	echo $html;

?>