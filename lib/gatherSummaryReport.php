<?php

	require_once('requireStepQueries.php');
	
	$query = getQuery();
	$instance = StepQueries::getInstance();
	$result = $instance->getNearbyStationsRecords($query);
	
	// save results to session
	session_start();
	$_SESSION['data'] = $result;
	$_SESSION['query'] = $query;
	
	echo json_encode($result);

?>