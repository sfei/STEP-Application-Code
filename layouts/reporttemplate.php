<?php
    
require_once("init.php");

$jsonQuery = json_encode($query, JSON_NUMERIC_CHECK);
$jsonData = json_encode($data, JSON_NUMERIC_CHECK);
$station = $query['station'];

// use HEREDOC for ease of writing template
echo <<< HTML
<html>
  <head>
    <title>$station Summary Report</title>
    <meta charset="UTF-8">
HTML;
if($ini["devmode"]) {
    echo <<< HTML
    <link rel="stylesheet" href="css/summaryreport.css" />
HTML;
} else {
    echo <<< HTML
    <link rel="stylesheet" href="build/summaryreport.css" />
HTML;
}
echo <<< HTML
    <script>var summaryReport = true, reportQuery = $jsonQuery, reportData = $jsonData;</script>
  </head>
  <body style="overflow:scroll;">
    <div id="container">
      <h1 id="title">Sportfish Contamination Report</h1>
      <div id="print-button" class="button" onclick="window.print();">Print Report</div>
      <div id="map-view" class="grab"></div>
      <div id="content-header"></div>
      <div id="content-container"></div>
    </div>
HTML;
if($ini["devmode"]) {
    echo <<< HTML
    <script src="js/lib/require.js" data-main="js/init"></script>
HTML;
} else {
    echo <<< HTML
    <script src="build/require.js"></script>
    <script>require(["build/libs","build/step-app","build/sreport"],function(){require(["../build/step"]);});</script>
HTML;
    include("analyticstracking.php");
}
echo <<< HTML
  </body>
</html>
HTML;

?>