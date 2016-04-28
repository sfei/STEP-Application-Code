<?php
//************************************************************************************************************
// Script to generate the summary report page. Data is retrieved from the session, so prepareSummaryReport.php
// must have been run recently or the data will have expired.
//************************************************************************************************************

session_start();

if(!array_key_exists('data', $_SESSION)) {
	die("Error retrieving report data, data may have expired");
}

$data = $_SESSION['data'];
$query = $_SESSION['query'];

include("layouts/reporttemplate.php");

?>