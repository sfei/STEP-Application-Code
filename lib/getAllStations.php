<?php

	//********************************************************************************************************
	// Returns list of all stations, JSON-encoded. No parameters required for query. See 
	// StepQueries->getAllStations() for format information.
	//********************************************************************************************************

	require_once('requireStepQueries.php');
	
	$instance = StepQueries::getInstance();
	
	echo json_encode($instance->getAllStations(), JSON_NUMERIC_CHECK);
	
?>