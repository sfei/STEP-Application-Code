<?php

	require_once('requireStepQueries.php');
	
	$query = getQuery();
	$instance = StepQueries::getInstance();
	
	$result = array(
		'query' => $query, 
		'parameters' => $instance->getAvailableParameters($query), 
		'years' => $instance->getAvailableYearSpan($query)
	);
	
	// if no results returned, adjust one of the inputs based on what fired the change
	$i = 0; 
	$availableParams = NULL;
	$iParam = 0;
	if(count($result['parameters']) == 0 || !$result['years']['min']) {
		// get all parameters available for this species, regardless of year
		$availableParams = $instance->getAvailableParameters(
			array(
				'isASpecies' => (!$query['species'] == "highest" && !$query['species'] == "lowest"), 
				'species' => $query['species']
			)
		);
		// if the parameter itself is missing
		if(in_array($query['parameter'], $availableParams)) {
			// only the years are off
			$minMaxYear = $instance->getAvailableYearSpan($query);
			if($query['startYear'] < $minMaxYear['min']) {
				$query['startYear'] = $minMaxYear['min'];
			}
			if($query['endYear'] > $minMaxYear['max']) {
				$query['endYear'] = $minMaxYear['max'];
			}
			$result = array( 
				'query' => $query, 
				'parameters' => $instance->getAvailableParameters($query), 
				'years' => $instance->getAvailableYearSpan($query)
			);
		} else {
			// parameter itself is invalid for species loop by parameter
			for($i = 0; $i < count($availableParams); $i++) {
				$query['parameter'] = $availableParams[$i]['result'];
				$minMaxYear = $instance->getAvailableYearSpan($query);
				if($minMaxYear['min']) {
					$query["startYear"] = $minMaxYear['min'];
					$query["endYear"] = $minMaxYear['max'];
					$result = array(
						'query' => $query, 
						'parameters' => $instance->getAvailableParameters($query), 
						'years' => $minMaxYear
					);
					break;
				}
			}
		}
	}
	
	echo json_encode($result);

?>
