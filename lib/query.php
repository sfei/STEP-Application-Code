<?php

//************************************************************************************************************
// Returns list of all species, JSON-encoded. See StepQueries->getAllSpecies() for format information.
//************************************************************************************************************

require_once('StepQueries.php');

$query = getQuery();
$instance = StepQueries::getInstance();

$result = null;

$callbackArray = array($instance, $query['query']);
if(is_callable($callbackArray)) {
    $result = call_user_func($callbackArray, $query);
}

echo json_encode($result, JSON_NUMERIC_CHECK);

?>