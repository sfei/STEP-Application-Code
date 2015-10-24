<?php
	
	/** Since this is a common function, write it here outside the class for ease of editing. Safely gets the 
	 * query parameters. Parameters looked for are:
	 * <ul>
	 *		<li>(String) <i>species</i> - species name</li>
	 *		<li>(String) <i>parameter</i> - parameter name</li>
	 *		<li>(int) <i>startYear</i> - start year / min. year</li>
	 *		<li>(int) <i>endYear</i> - end year / max. year</li>
	 * </ul>
	 * @return array Query object (associative array) with values (String) <i>species</i>, (String) 
	 *		<i>parameter</i>, (int) <i>startYear</i>, (int) <i>endYear</i>, and (boolean) <i>isASpecies</i>. */
	function getQuery() {
		$species		= strtolower(filter_input(INPUT_GET, 'species', FILTER_SANITIZE_STRING));
		$parameter		= filter_input(INPUT_GET, 'parameter', FILTER_SANITIZE_STRING);
		$startYear		= filter_input(INPUT_GET, 'startYear', FILTER_SANITIZE_NUMBER_INT);
		$endYear		= filter_input(INPUT_GET, 'endYear', FILTER_SANITIZE_NUMBER_INT);
		$station		= strtolower(filter_input(INPUT_GET, 'station', FILTER_SANITIZE_STRING));
		
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
			'isASpecies' => $isASpecies,
			'station' => $station
		);
	}

	/** Singleton class makes it easy to consolidate common functions (and thus edit them in one pass). As a 
	 * singleton, only one instance may exist at one time to reduce redundancy, in an almost static type of 
	 * class functionality. Use StepQueries::getInstance() to get the instance, all functions can then be done 
	 * on the acquired instance.<br />
	 * <br />
	 * Not that while most functions take a generic $param object (usually retrieved from the {@link 
	 * getQuery() getQuery()} general method outside this class), methods follow the search heirarchy of 
	 * species->parameter->years. E.g. the {@link getAllParameters() getAllParameters()} function retrieves 
	 * all available parameters for the species, for any years. The only exception is {@link 
	 * getAvailableSpecies($params) getAvailableSpecies()}, which so far is unused (use {@link 
	 * getAllSpecies($params) getAllSpecies()} instead). */
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
		
		/** Get the existing instance of STEPQueries (create if none exists)
		 * @return StepQueries Singleton instance of class
		 * @static */
		public static function getInstance() {
			if(is_null(self::$instance)) {
				self::$instance = new self();
			}
			return self::$instance;
		}
		
		/** Get the default thresholds for parameter.
		 * @param array $params Associative array of parameters (only 'parameter') is used. See {@link 
		 *		getQuery() getQuery()}.
		 * @return array Associative array of thresholds in ascending order with format:
		 *		<ul>
		 *			<li>(float) value - threshold value</li>
		 *			<li>(String) units - units abbreviation (e.g. ppm)</li>
		 *			<li>(String) comments - description of threshold usually</li>
		 *		</ul> */
		public function getThresholds($params) {
			$query = StepQueries::$dbconn->prepare(
				"SELECT Threshold, Units, Comments "
					. "FROM [dbo].[STEP_Thresholds] "
					. "WHERE Parameter = '" . $params['parameter'] . "' ORDER BY SortOrder ASC"
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
		
		/** Get station data the matches the given parameters of species, parameter, and years.
		 * @param array $params Associative array of parameters. See {@link getQuery() getQuery()}.
		 * @return array Associative array of stations in alphabetical order with keys/values:
		 *		<ul>
		 *			<li>(String) name - station name</li>
		 *			<li>(String) waterType - station water type (e.g. river, coast, lake, etc.)</li>
		 *			<li>(float) lat -latitude coordinates</li>
		 *			<li>(float) long -longitude coordinates</li>
		 *			<li>(String) advisoryName - regional name for where advisories are issues (or null)</li>
		 *			<li>(String) advisoryUrl - link to site-specific advisory webpage if it exists</li>
		 *			<li>(float) value - the value for the parameter specified</li>
		 *		</ul> */
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
		
		/** Get all distinct species that exist in database.
		 * @return array Associate array of all species names, sorted alphabetically. The array is two-deep, 
		 *		i.e. to get the name, it is usually $array[0][0] or $array[0]['result']. */
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
		
		/** Get all available species from given parameters.
		 * @param type $params Associative array of parameters. See {@link getQuery() getQuery()}.
		 * @return array Associate array of all species names that result from the given criteria, sorted 
		 *		alphabetically. The array is two-deep, i.e. to get the name, it is usually $array[0][0] or
		 *		$array[0]['result'].*/
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
		
		/** Get all available parameters that have a record for the given species. Due to the 
		 * species->parameter->years search hierarchy, any year values in $params are ignored. That is, 
		 * returns all existing parameters recorded regardless of year.
		 * @param type $params Associative array of parameters. See {@link getQuery() getQuery()}.
		 * @return array Associate array of all parameters that have a record for the given species, sorted 
		 *		alphabetically. The array is two-deep, i.e. to get the parameter name, it is usually 
		 *		$array[0][0] or $array[0]['result'].*/
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
		
		/** Get the min and max year range for the given parameters (species and parameter type). If no 
		 * records exist, will return false.
		 * @param type $params Associative array of parameters. See {@link getQuery() getQuery()}.
		 * @return array Associate array with keys/values:
		 *		<ul>
		 *			<li>(int) min - Minimum year value found</li>
		 *			<li>(int) max - Maximum year value found</li>
		 *		</ul> */
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
		
		/** Get all distinct years where data points exist for the given species and parameter.
		 * @param type $params Associative array of parameters. See {@link getQuery() getQuery()}.
		 * @return array Associate array of the distinct years that have a record for the given species and 
		 *		parameter, in ascending order. The array is two-deep, i.e. to get the parameter name, it is 
		 *		usually $array[0][0] or $array[0]['result'] */
		public function getDistinctYears($params) {
			$queryString = "SELECT DISTINCT SampleYear as result FROM [dbo].[STEP_Table_AllResults] "
				. "WHERE Parameter = '" . $params['parameter'] . "' ";
			if($params['isASpecies']) {
				$queryString .= "AND CommonName = '" . $params['species'] . "' ";
			}
			$queryString .= "ORDER BY result";
			$query = StepQueries::$dbconn->prepare($queryString);
			$query->execute();
			if($query->errorCode() != 0) {
				die("Query Error: " . $query->errorCode());
			}
			return $query->fetchAll();
		}
		
		public function getStationRecords($params) {
			$queryString = "EXEC [dbo].[P_STEP_Data] "
				. "@station=N'" . $params["station"] . ", "
				. "@param=N'" . $params["parameter"] . ", "
				. "@startyr=" . $params["startYear"] . ", "
				. "@endyr=" . $params["endYear"];
			$query = StepQueries::$dbconn->prepare($queryString);
			$query->execute();
			if($query->errorCode() != 0) {
				die("Query Error: " . $query->errorCode());
			}
			return $query->fetchAll();
		}
		
		public function getNearbyData($params) {
			$queryString = "EXEC [dbo].[P_STEP_Nearby] "
				. "@station=N'" . $params["station"] . ", "
				. "@param=N'" . $params["parameter"] . ", "
				. "@species=N'" . $params["species"] . ", "
				. "@startyr=" . $params["startYear"] . ", "
				. "@endyr=" . $params["endYear"];
			$query = StepQueries::$dbconn->prepare($queryString);
			$query->execute();
			if($query->errorCode() != 0) {
				die("Query Error: " . $query->errorCode());
			}
			return $query->fetchAll();
		}
		
	}