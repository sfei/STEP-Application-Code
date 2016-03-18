<?php

//************************************************************************************************************
// Returns list of all records that fit the parameters for the given station, JSON-encoded. See 
// StepQueries->getStationRecords() for format information.
//************************************************************************************************************

require_once('StepQueries.php');

$query = getQuery();
$instance = StepQueries::getInstance();

echo json_encode($instance->getStationRecords($query), JSON_NUMERIC_CHECK);

?>