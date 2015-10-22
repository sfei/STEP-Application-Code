<?php

	require_once('requireStepQueries.php');
	
	echo json_encode(
		StepQueries::getInstance()->getAvailableSpecies(
			getQuery()
		)
	);

?>
