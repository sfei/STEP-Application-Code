<?php

	//********************************************************************************************************
	// Gets MPA layer from MS SQL Server and formats as GeoJSON
	//********************************************************************************************************

	require_once('requireStepQueries.php');
	
	// [FULLNAME],[SHORTNAME],[Type],[DFG_URL],[geom].ToString()
	$result = StepQueries::getInstance()->getMarineProtectedAreas();
	
	$geojson = array(
		'type' => 'FeatureCollection', 
		'crs' => array(
			'type' => 'name', 
			'properties' => array(
				'name' => 'urn:ogc:def:crs:EPSG::4269'
			)
		),
		'features' => array()
	);
	
	for($i = 0; $i < count($result); $i++) {
		$geojson['features'][] = array(
			'type' => 'Feature', 
			'properties' => array(
				'fullname' => $result[$i]['FULLNAME'], 
				'shortlname' => $result[$i]['SHORTNAME'], 
				'type' => $result[$i]['Type'], 
				'url' => $result[$i]['DFG_URL']
			), 
			'geometry' => array(
				'type' => 'polygon'
			)
		);
		// first create an array of coordinates
		$coords = array();
		// this is really not ideal, but I don't know how to get MS SQL to output something more easily read 
		// without having to manually parsing it. It comes as 'POLYGON (( -120 45 0 0, -122 46 0 0... ))' so 
		// remove the 'POLYGON' and parenthesis, split by commas first, then by spaces, and ignore the last 
		// two coordinates (if they exist) as we read in the coordinate pairs
		$geom_string = str_replace(array("POLYGON ((", "))"), "", $result[$i]['geom']);
		$list_coords = explode(',', $geom_string);
		for($j = 0; $j < count($list_coords); $j++) {
			$c = explode(' ', trim($list_coords[$j]));
			$coords[] = array(
				floatVal($c[0]),
				floatVal($c[1])
			);
		}
		// add it as nested array into geojson object
		$geojson[$features][$i]['geometry']['coordinates'] = array(array($coords));
	}
	
	echo json_encode($geojson, JSON_NUMERIC_CHECK);

?>