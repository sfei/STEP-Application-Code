<?php

	require_once('requireStepQueries.php');
	
	$query = getQuery();
	$instance = StepQueries::getInstance();
	
	$result = array(
		'species' => $instance->getAvailableSpecies($query), 
		'thresholds' => $instance->getThresholds($query)
	);
	echo json_encode($result);

?>