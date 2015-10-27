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
		'contaminants' => $instance->getAvailableContaminants($query), 
		'years' => $instance->getAvailableYearSpan($query)
	);
	
	// if there's no min/max years for species-contaminant combination, there's no row resulting
	if(!$result['years']['min']) {
		// if contaminant doesn't exist in list of contaminants, pick first available one
		$query['contaminant'] = $result['contaminant'][0]['result'];
		// update years - way code runs it will try to keep the initial year values, but adjust as necessary
		$result['years'] = $instance->getAvailableYearSpan($query);
	}
	
	// adjust years not to exceed min-max values, since they may be off
	validateYears($query, $result['years']);
	// at this point we know contaminant is valid so add thresholds
	$result['thresholds'] = $instance->getThresholds($query);
	
	// now that we have a valid query, grab the stations data
	$result['stations'] = $instance->getStations($query);
	// One final check to ensure we have at least one station. What often happens is there's one data point 
	// at, say, 2005, another at 2010, so searching for 2007-2008 is technically valid but returns no result.
	if(count($result['stations']) == 0) {
		$years = $instance->getDistinctYears($params);
		// find the minimum distance
		$minDist = array( 'dist'=>9999, 'change'=>'startYear', 'to'=>1900 );
		forEach($years as $y) {
			$dist = abs($query['startYear'] - $y['result']);
			if($dist < $minDist['dist']) {
				$minDist['dist'] = $dist;
				$minDist['change'] = 'startYear';
				$minDist['to'] = $y['result'];
			}
			$dist = abs($query['endYear'] - $y['result']);
			if($dist < $minDist['dist']) {
				$minDist['dist'] = $dist;
				$minDist['change'] = 'endYear';
				$minDist['to'] = $y['result'];
			}
		}
		// update stations
		$result['stations'] = $instance->getStations($query);
	}
	
	// update query to match valid query after all that checking
	$result['query'] = $query;
	
	echo json_encode($result, JSON_NUMERIC_CHECK);

?>
