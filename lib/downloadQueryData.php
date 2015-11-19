<?php

	//********************************************************************************************************
	// Prepare downloads and print as csv file
	//********************************************************************************************************

	require_once('requireStepQueries.php');
	
	$query = getQuery();
	$instance = StepQueries::getInstance();
	$result = $instance->getAllRecords($query);
	
	if(count($result) == 0) {
		die("<span style='font-family:san-serif;font-size:12px;color:red;'>Query returned no results</span>");
	}
	
	// filename
	if($query['species'] == "highest" || $query['species'] == "lowest") {
       $query['species'] = "allSpecies";
    }
    $filename = "step_".date("Ymd")."_".$query['contaminant']."_".$query['species']."_".$query['startYear']."_".$query['endYear'].".csv";
	
	// CSV headers
	header("Content-Disposition: attachment; filename=\"$filename\"");
    header('Content-Type: text/csv');
	
	// metadata information as first row (UPDATE THIS LINK AS NECESSARY)
	echo "STEP Data Download: Before using this data please view metadata file at: http://eis.sfei.org/cwqmc/step/metadata.html\r\n";
	
	// loop through result
	for($i = 0; $i < count($result); $i++) {
		// print headers if first row
		if($i == 0) {
			echo implode(",", array_keys($result[$i])) . "\r\n";
		}
		$values = array();
		foreach($result[$i] as $key => $value) {
            $values[] = '"' . str_replace('"', '""', html_entity_decode(strip_tags($value))) . '"';
        }
		echo implode(',', $values) . "\r\n";
	}
	
?>