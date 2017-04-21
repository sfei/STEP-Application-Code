<?php

//************************************************************************************************************
// Prepares the data for the summary report and stores it in the session. Sessions are used so the javascript 
// can wait (and throw a loading whatever) until the data is ready before opening the summary report page. 
// Open the summary report with generateSummaryReport.php (which retrieves the data gathered here from the 
// session).
//************************************************************************************************************

require_once('StepQueries.php');

$query = getQuery();
$instance = StepQueries::getInstance();
$result = $instance->get10NearestStationsRecords($query);

// save results to session
session_start();
$_SESSION['data'] = $result;
$_SESSION['query'] = $query;

?>