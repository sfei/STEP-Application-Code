<?php

	//********************************************************************************************************
	// Returns list of all species, JSON-encoded. See StepQueries->getAllSpecies() for format information.
	//********************************************************************************************************

	require_once('requireStepQueries.php');
	
	$query = getQuery();
	$instance = StepQueries::getInstance();
	
	echo json_encode($instance->getAvailableYearSpan($query), JSON_NUMERIC_CHECK);

?>
