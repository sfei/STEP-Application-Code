<?php

if(!defined($dbconn) || $dbconn == null) {
	require("../../protected/dbconn.php");
}
//$dbconn = new PDO("dblib:host=data2;dbname=STEPDEV", "step", "WAatfff1");
//if(!$dbconn) {
//	die('Something went wrong while connecting to data2');
//}
try {
	$query = $dbconn->prepare(
		"SELECT 
			[StationCode], 
			[StationNameRevised], 
			[WaterType] ,
			[StationGroupID], 
			[Lat], 
			[Long], 
			[Datum]
		FROM [STEPDEV].[dbo].[STEP_Stations]"
	);
	$query->execute();

	$stations = $query->fetchAll();
} catch(Exception $e) {
	$stations = $e;
}

echo json_encode($stations);