<?php

	//********************************************************************************************************
	// Get thresholds
	//********************************************************************************************************

	require_once('requireStepQueries.php');
	
	$query = getQuery();
	$instance = StepQueries::getInstance();
	
	echo json_encode($instance->getThresholds($query), JSON_NUMERIC_CHECK);
	
?>