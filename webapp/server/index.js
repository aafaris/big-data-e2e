require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

// with pool, able to run queries with postgres
const pool = require("./db");
const redisClient = require("./initRedis");

// REDIS SETUP
const DEFAULT_EXPIRATION = 1800; // 30 mins cache

// create middleware
app.use(cors());
// access for retrieving json data from client
// app.use(express.json());

// ROUTES
// params =>  http://localhost:5000/:id => req.params
// query parameter => http://localhost:5000/?name=henry => req.query


// FULL JOIN QUERY -> INCLUDING GEOLOCATION, LIDAR AND CAMERA -> PERFORMANCE ABOUT 1720ms WITHOUT REDIS
// var mainQuery = "SELECT DISTINCT ON (main.log_name, sharded_scenes.shard_id) main.log_name, main.vehicle, \
// 					sharded_scenes.shard_date, sharded_scenes.shard_id, sharded_scenes.shard_path, sharded_scenes.shard_time, \
// 					t1.path, t1.timestamp, t1.time, t1.location FROM main \
// 						INNER JOIN sharded_scenes ON main.log_name = sharded_scenes.log_name \
// 						INNER JOIN (SELECT a.primary_log_name, a.shard_id, a.path, a.timestamp, a.time, geolocation.location FROM \
// 							(SELECT primary_log_name, shard_id, image_path AS path, timestamp, time FROM camera \
// 							UNION \
// 							SELECT primary_log_name, shard_id, bin_path, timestamp, time FROM lidar) a \
// 							INNER JOIN geolocation \
// 							ON a.primary_log_name = geolocation.primary_log_name AND a.shard_id = geolocation.shard_id \
//								AND a.timestamp = geolocation.timestamp) AS t1 \
// 				ON main.log_name = t1.primary_log_name AND sharded_scenes.shard_id = t1.shard_id "


// QUERY FOR ONLY GEOLOCATION -> PERFORMANCE ABOUT 74ms WITHOUT REDIS
var mainQuery = "SELECT DISTINCT ON (main.log_name, sharded_scenes.shard_id) main.log_name, main.vehicle, \
					sharded_scenes.shard_date, sharded_scenes.shard_id, sharded_scenes.shard_path, sharded_scenes.shard_time, \
					geolocation.shard_path, geolocation.timestamp, geolocation.time, geolocation.location FROM main \
						INNER JOIN sharded_scenes ON main.log_name = sharded_scenes.log_name \
						INNER JOIN geolocation \
				ON main.log_name = geolocation.primary_log_name AND sharded_scenes.shard_id = geolocation.shard_id "



// DEFAULT
app.get("/", logCache, async(req, res) => {
	try {
		const lists = await pool.query(mainQuery);

		// activate redis
		redisClient.setex(1, DEFAULT_EXPIRATION, JSON.stringify(lists.rows));

		res.json(lists.rows);
	} catch (err) {
		console.error(err.message);
	}
});


// ALL ROUTERS
app.get(["/logs"], async(req, res) => {
	try {
		// from client side
		const { file, vehicle, startTime, endTime, startDate, endDate, loc } = req.query;
		let logs;
		let val = 0;
		let finalQuery = extendedQuery = '';
		let objects = [];

		// SETUP QUERY -> ONLY FUNCTIONAL FOR EVERY ONE SINGLE PARAMS IN REQ.QUERY
		// in SQL, || means concat
		// this SQL way prevents SQL injection

		// CUSTOM FILTER QUERY BY TEXT
		if (file) {
			if (val > 0) { extendedQuery += " AND "; }
			val += 1;
			extendedQuery += "main.log_name || ' ' || sharded_scenes.shard_id || ' ' || sharded_scenes.shard_path || ' ' || geolocation.location ILIKE $" + val;
			objects.push(`%${file}%`);
		}
		// FILTER QUERY BY VEHICLE
		if (vehicle) {
			if (val > 0) { extendedQuery += " AND "; }
			if (vehicle.constructor === Array) {
				// MULTI-SELECT QUERY FOR SAME PARAMS -> vehicle=mb1&vehicle=mb2
				let stackedQuery = '';
				for (let i=0; i < vehicle.length; i++) {
					if (i !== 0 || i === vehicle.length-1) { stackedQuery += " OR "; }
					val += 1;
					stackedQuery += "main.vehicle = $" + val;
					objects.push(vehicle[i]);
				}
				extendedQuery += ("(" + stackedQuery + ")");
			} else {
				val += 1;
				extendedQuery += "main.vehicle = $" + val;
				objects.push(vehicle);
			}
		}
		// FILTER QUERY BY START AND END DATE
		if (startDate) {
			if (val > 0) { extendedQuery += " AND "; }
			extendedQuery += "sharded_scenes.shard_date BETWEEN $" + (val+1) + " AND $" + (val+2);
			val += 2;
			if (endDate == null) {
				objects.push(startDate, startDate);
			}
			else {
				objects.push(startDate, endDate);
			}
		}
		// FILTER QUERY BY START AND END TIME
		if (startTime) {
			if (val > 0) { extendedQuery += " AND "; }
			extendedQuery += "sharded_scenes.shard_time BETWEEN $" + (val+1) + " AND $" + (val+2);
			val += 2;
			if (endTime == null) {
				objects.push(startTime, startTime);
			} else {
				objects.push(startTime, endTime);
			}
		}
		// FILTER QUERY BY LOCATION
		if (loc) {
			if (val > 0) { extendedQuery += " AND "; }
			val += 1;
			extendedQuery += "geolocation.location ILIKE $" + val;
			objects.push(`%${loc}%`);
		}

		// add WHERE clause if params exist
		if (val > 0) {
			finalQuery = mainQuery + "WHERE " + extendedQuery;
		}
		else {
			finalQuery = mainQuery;
		}

		// REQUESTED QUERY
		logs = await pool.query(
			finalQuery,
			objects
		);

		console.log(extendedQuery);
		res.json(logs.rows);

	} catch (err) {
		console.error(err.message);
	}
});


app.get("/map", async(req, res) => {
	try {
		const { route, postal } = req.query;
		var pointers;

		if (postal) {
			// GET LOG NAME AND SHARD ID FROM POSTAL CODE
			var extendQuery = "";
			var postals = [];
			if (postal.constructor === Array) {
				// MULTIPLE POSTAL CODES
				for (let i=0; i<postal.length; i++) {
					if (i !== 0 || i === postal.length-1) { extendQuery += " OR "; }
					extendQuery += `location LIKE $${i+1}`;
					postals.push(`%${postal[i]}%`);
				}
			}
			else {
				// SINGLE POSTAL CODE
				extendQuery = "location LIKE $1";
				postals.push(`%${postal}%`);
			}

			pointers = await pool.query("SELECT DISTINCT ON (primary_log_name, shard_id) primary_log_name, date, shard_id \
											FROM geolocation \
											WHERE " + extendQuery + " ORDER BY primary_log_name",
											postals)
		}
		else {
			pointers = await pool.query("SELECT DISTINCT primary_log_name, date, shard_id FROM geolocation ORDER BY primary_log_name");
		}

		res.json(pointers.rows);
	} catch (err) {
		console.error(err.message);
	}
});


// remove mapCache and redis commands to disable redis
app.get("/map/:logId/:dayId", mapCache, async(req, res) => {
	try {
		const { logId, dayId } = req.params;
		const { shard } = req.query;

		let mapQuery = "SELECT primary_log_name, date, lat, lon, shard_id, location, speed, yaw, yaw_rate, time \
							FROM geolocation \
							WHERE primary_log_name = $1 AND date = $2";
		let objects = [logId, dayId];

		if (shard !== undefined) {
			mapQuery += "AND shard_id = $3";
			objects.push(shard);
		}

		pointers = await pool.query(mapQuery + " ORDER BY time", objects);

		// Set data to Redis
		if (shard === undefined) redisClient.setex(logId.concat(dayId), DEFAULT_EXPIRATION, JSON.stringify(pointers.rows));
		else redisClient.setex(logId.concat(dayId).concat(shard), DEFAULT_EXPIRATION, JSON.stringify(pointers.rows));

		res.json(pointers.rows);
	} catch (err) {
		console.error(err.message);
	}
});

function mapCache(req, res, next) {
	const { logId, dayId } = req.params;
	const { shard } = req.query;

	try {
		if (shard === undefined) {
			redisClient.get(logId.concat(dayId), (err, pointers) => {
				if (err) throw err;

				if (pointers !== null) {
					res.json(JSON.parse(pointers));
				} else {
					next();
				}
			});
		}
		else {
			redisClient.get(logId.concat(dayId).concat(shard), (err, pointers) => {
				if (err) throw err;

				if (pointers !== null) {
					res.json(JSON.parse(pointers));
				} else {
					next();
				}
			});
		}

	}
	catch (err) {
		console.error(err.message);
	}
}

function logCache(req, res, next) {

	try {
		redisClient.get(1, (err, logs) => {
			if (err) throw err;

			if (logs !== null) {
				res.json(JSON.parse(logs));
			} else {
				next();
			}
		});
	}
	catch (err) {
		console.error(err.message);
	}
}


const PORT = process.env.PORT || 5001;
// const REDIS_PORT = process.env.PORT || 6379;

app.listen(PORT, () => {
	console.log(`server has started on port ${PORT}`);
});
