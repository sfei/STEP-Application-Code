<?php

//************************************************************************************************************
// Get the data for the "Nearby Stations" tab
//************************************************************************************************************

require_once('StepQueries.php');

$query = getQuery();
$instance = StepQueries::getInstance();

echo json_encode($instance->getNearbyData($query), JSON_NUMERIC_CHECK);

?>