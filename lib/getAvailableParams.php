<?php

	require_once('requireStepQueries.php');
	
	echo json_encode(
		StepQueries::getInstance()->getAvailableParameters(
			getQuery()
		)
	);

?>