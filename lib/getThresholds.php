<?php

//************************************************************************************************************
// Get thresholds
//************************************************************************************************************

require_once('StepQueries.php');

$query = getQuery();
$instance = StepQueries::getInstance();

echo json_encode($instance->getThresholds($query), JSON_NUMERIC_CHECK);

?>