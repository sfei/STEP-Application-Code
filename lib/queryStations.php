<?php

//************************************************************************************************************
// The query script. Fairly involved as it automatically adjusts/corrects the query parameters until at 
// least one record is returned.
//************************************************************************************************************

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

require_once('StepQueries.php');

$query = getQuery();
$instance = StepQueries::getInstance();

$result = array(
    'contaminants' => $instance->getAvailableContaminants($query), 
    'years' => $instance->getAvailableYearSpan($query)
);

// if there's no min/max years for species-contaminant combination, there's no row resulting
if(!$result['years'] || !$result['years']['min']) {
    // if contaminant doesn't exist in list of contaminants, pick first available one
    $query['contaminant'] = $result['contaminants'][0][0];
    // update years - way code runs it will try to keep the initial year values, but adjust as necessary
    $result['years'] = $instance->getAvailableYearSpan($query);
}

// adjust years not to exceed min-max values, since they may be off
validateYears($query, $result['years']);
// at this point we know contaminant is valid so add thresholds
$result['thresholds'] = $instance->getThresholds($query);

// now that we have a valid query, grab the stations data
$result['stations'] = $instance->getStations($query);
// One final check to ensure we have at least one station. What often happens is there's one data point at, 
// say, 2005, another at 2010, so searching for 2007-2008 is technically valid but returns no result.
if(count($result['stations']) == 0) {
    $years = $instance->getDistinctYears($query);
    // if there's only a single distinct year, that's easy enough
    if($years.length == 1) {
        $query['startYear'] = $query['endYear'] = $years[0]['result'];
    } else {
        // find the minimum distance
        $minDist = array('dist'=>9999, 'change'=>'startYear', 'to'=>1900);
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
        // update years
        $query[$minDist['change']] = $minDist['to'];
        // there may result an odd case where start year is changed past end year (start year and end year 
        // were same, next year is after them, for example, and defaults to change startYear on tie)
        if($query['startYear'] > $query['endYear']) {
            $tmpYear = $query['startYear'];
            $query['startYear'] = $query['endYear'];
            $query['endYear'] = $tmpYear;
        }
    }
    // update stations
    $result['stations'] = $instance->getStations($query);
}

// update query to match valid query after all that checking
$result['query'] = $query;
// due to database queries, station name escapes the single quote -- revert this to html safe
$result['query']['station'] = str_replace("''", "&#39;", $result['query']['station']);

echo json_encode($result, JSON_NUMERIC_CHECK);

?>
