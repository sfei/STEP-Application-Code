<?php

	function validateYears(&$query, $minMaxYear) {
		if($query['startYear'] > $minMaxYear['max']) {
			$query['startYear'] = $minMaxYear['max'];
			$query['endYear'] = $minMaxYear['max'];
		} else if($query['endYear'] < $minMaxYear['min']) {
			$query['startYear'] = $minMaxYear['min'];
			$query['endYear'] = $minMaxYear['min'];
		} else {
			if($query['startYear'] < $minMaxYear['min']) {
				$query['startYear'] = $minMaxYear['min'];
				if($query['endYear'] < $query['startYear']) {
					$query['endYear'] = $query['startYear'];
				}
			}
			if($query['endYear'] > $minMaxYear['max']) {
				$query['endYear'] = $minMaxYear['max'];
				if($query['startYear'] > $query['endYear']) {
					$query['startYear'] = $query['endYear'];
				}
			}
		}
	}
	
	require_once('requireStepQueries.php');
	
	$query = getQuery();
	$instance = StepQueries::getInstance();
	
	$result = array(
		'parameters' => $instance->getAvailableParameters($query), 
		'years' => $instance->getAvailableYearSpan($query)
	);
	
	// if there's no min/max years for species-parameter combination, there's no row resulting
	if(!$result['years']['min']) {
		// get parameters available for this species, pick first valid one
		$availableParams =	$instance->getAvailableParameters(array(
								'isASpecies' => (!$query['species'] == "highest" && !$query['species'] == "lowest"), 
								'species' => $query['species']
							));
		$query['parameter'] = $availableParams[0]['result'];
		// update years - way code runs it will try to keep the initial year values, but adjust as necessary
		$result['years'] = $instance->getAvailableYearSpan($query);
	}
	// adjust years not to exceed min-max values, since they may be off
	validateYears($query, $result['years']);
	
	// update query to match valid query
	$result['query'] = $query;
	// now that we have a valid query, grab the stations data
	$result['stations'] = $instance->getStations($query);
	// also add thresholds
	$result['thresholds'] = $instance->getThresholds($query);
	
	echo json_encode($result, JSON_NUMERIC_CHECK);

?>
