<?php
	
	function getQuery() {
		$species		= strtolower(filter_input(INPUT_GET, 'species', FILTER_SANITIZE_STRING));
		$parameter		= filter_input(INPUT_GET, 'parameter', FILTER_SANITIZE_STRING);
		$startYear		= filter_input(INPUT_GET, 'startYear', FILTER_SANITIZE_NUMBER_INT);
		$endYear		= filter_input(INPUT_GET, 'endYear', FILTER_SANITIZE_NUMBER_INT);
		$firedBy		= filter_input(INPUT_GET, 'firedBy', FILTER_SANITIZE_STRING);
		
		if($startYear && $endYear) {
			if($startYear > $endYear) {
				$tempyr = $startYear;
				$startYear = $endYear;
				$endYear = $tempyr;
			}
		} else if($startYear) {
			$endYear = $startYear;
		} else if($endYear) {
			$startYear = $endYear;
		}
		
		$isASpecies = $species && $species != 'highest' && $species != 'lowest';
		
		return array(
			'species' => $species, 
			'parameter' => $parameter, 
			'startYear' => $startYear, 
			'endYear' => $endYear, 
			'isASpecies' => $isASpecies
		);
	}

	// toying with this as a singleton class so as to reduce redunant code for queries (for ease of updating)
	// if used would eventually want to move it outside the public web root
	class StepQueries {
		
		private static $host = "data2";
		private static $dbname = "STEPDEV";
		private static $username = "step";
		private static $pass = "WAatfff1";
		private static $dbconn = null;
		
		private static $instance;
		
		private function __construct() {
			if(!StepQueries::$dbconn) {
				StepQueries::$dbconn = new PDO(
					"dblib:host=".StepQueries::$host.";dbname=".StepQueries::$dbname, 
					StepQueries::$username, 
					StepQueries::$pass
				);
				if(!StepQueries::$dbconn) {
					die('Could not connect to data2 server');
				}
			}
		}

		public static function getInstance() {
			if(is_null(self::$instance)) {
				self::$instance = new self();
			}
			return self::$instance;
		}
		
		public function getThresholds($params) {
			$query = StepQueries::$dbconn->prepare(
				"SELECT Threshold, Units, Comments "
					. "FROM [dbo].[STEP_Thresholds] "
					. "WHERE Parameter = '" . $params['parameter'] . "' ORDER BY SortOrder DESC"
			);
			$query->execute();
			if($query->errorCode() != 0) {
				die("Query Error: " . $query->errorCode());
			}
			$raw = $query->fetchAll();

			// could be skipped, reformats data to hide original column names, just in case
			$thresholds = array();
			for($i = 0; $i < count($raw); $i++) {
				$thresholds[] = array(
					"value" => $raw[$i]['Threshold'], 
					"units" => $raw[$i]['Units'], 
					"comments" => $raw[$i]['Comments']
				);
			}
			return $thresholds;
		}
		
		public function getStations($params) {
			$query = StepQueries::$dbconn->prepare(
				"EXEC [dbo].[P_STEP_MAP] "
					. "@param=N'" . $params["parameter"] . "', "
					. "@startyr=" . $params["startYear"] . ", "
					. "@endyr=" . $params["endYear"] . ", "
					. "@species=N'" . $params["species"] . "'"
			);
			$query->execute();
			if($query->errorCode() != 0) {
				die("Query Error: " . $query->errorCode());
			}
			$raw = $query->fetchAll();
			
			$stations = array();
			for($i = 0; $i < count($raw); $i++) {
				$stations[] = array(
					"name" => $raw[$i]['StationName'], 
					"waterType" => $raw[$i]['WaterType'], 
					"lat" => $raw[$i]['lat'], 
					"long" => $raw[$i]['lon'], 
					"advisoryName" => $raw[$i]['AdvisoryName'], 
					"advisoryUrl" => $raw[$i]['AdvisoryURL'], 
					"value" => $raw[$i]['Result']
				);
			}
			return $stations;
		}
		
		public function getAllSpecies() {
			$query = StepQueries::$dbconn->prepare(
				"SELECT DISTINCT CommonName as result "
					. "FROM [dbo].[STEP_Table_AllResults] ORDER BY result"
			);
			$query->execute();
			if($query->errorCode() != 0) {
				die("Query Error: " . $query->errorCode());
			}
			return $query->fetchAll();
		}
		
		public function getAvailableSpecies($params) {
			$query = StepQueries::$dbconn->prepare(
				"SELECT DISTINCT CommonName as result "
					. "FROM [dbo].[STEP_Table_AllResults] "
					. "WHERE Parameter = '" . $params["parameter"] . "' AND "
						. "SampleYear >= " . $params["startYear"] . " AND "
						. "SampleYear <= " . $params["endYear"]
					. " ORDER BY result"
			);
			$query->execute();
			if($query->errorCode() != 0) {
				die("Query Error: " . $query->errorCode());
			}
			return $query->fetchAll();
		}
		
		public function getAvailableParameters($params) {
			$queryString = "SELECT DISTINCT Parameter as result FROM [dbo].[STEP_Table_AllResults] ";
			if($params['isASpecies']) {
				$queryString .= "WHERE CommonName = '" . $params['species'] . "' ";
			}
			$queryString .= "ORDER BY result";
			// Sample years and below heirarchy so ignore them for query
			$query = StepQueries::$dbconn->prepare($queryString);
			$query->execute();
			if($query->errorCode() != 0) {
				die("Query Error: " . $query->errorCode());
			}
			return $query->fetchAll();
		}
		
		public function getAvailableYearSpan($params) {
			$queryString = "SELECT MIN(SampleYear) as 'min', MAX(SampleYear) as 'max' FROM [dbo].[STEP_Table_AllResults] "
				. "WHERE Parameter = '" . $params['parameter'] . "' ";
			if($params['isASpecies']) {
				$queryString .= "AND CommonName = '" . $params['species'] . "'";
			}
			$query = StepQueries::$dbconn->prepare($queryString);
			$query->execute();
			if($query->errorCode() != 0) {
				die("Query Error: " . $query->errorCode());
			}
			return $query->fetch();
		}
		
	}