-- CREATE SCHEMA avdb;

-- SCHEMA

-- main table
CREATE TABLE main(
	log_name TEXT NOT NULL,
	log_path TEXT NOT NULL,
	vehicle TEXT NOT NULL,
	start_time TEXT,
	end_time TEXT,
	shards_array TEXT ARRAY,
	PRIMARY KEY (log_name)
);

-- sharded scenes
CREATE TABLE sharded_scenes(
	log_name TEXT NOT NULL,
	shard_id TEXT NOT NULL,
	shard_path TEXT NOT NULL,
	shard_date TEXT NOT NULL,
	shard_time TEXT NOT NULL,
	PRIMARY KEY (log_name, shard_id),
	FOREIGN KEY (log_name) REFERENCES main (log_name) ON DELETE CASCADE
);

-- camera log
CREATE TABLE camera(
	primary_log_name TEXT NOT NULL,
	shard_id TEXT NOT NULL,
	shard_path TEXT NOT NULL,
	timestamp BIGINT NOT NULL,
	image_path TEXT NOT NULL,
	topic TEXT NOT NULL,
	date TEXT,
	time TEXT,
	PRIMARY KEY (primary_log_name, shard_id, timestamp, image_path),
	FOREIGN KEY (primary_log_name, shard_id) REFERENCES sharded_scenes (log_name, shard_id) ON DELETE CASCADE
);

-- lidar log
CREATE TABLE lidar(
	primary_log_name TEXT NOT NULL,
	shard_id TEXT NOT NULL,
	shard_path TEXT NOT NULL,
	timestamp BIGINT NOT NULL,
	bin_path TEXT NOT NULL,
	topic TEXT NOT NULL,
	date TEXT,
	time TEXT,
	PRIMARY KEY (primary_log_name, shard_id, timestamp, bin_path),
	FOREIGN KEY (primary_log_name, shard_id) REFERENCES sharded_scenes (log_name, shard_id) ON DELETE CASCADE
);

-- object list log (TBC)
-- CREATE TABLE objects(
-- 	primary_log_name TEXT NOT NULL,
-- 	shard_id TEXT NOT NULL,
-- 	shard_path TEXT NOT NULL,
-- 	timestamp BIGINT NOT NULL,
-- 	object_list BYTEA NOT NULL,
-- 	date TEXT,
-- 	time TEXT,
-- 	PRIMARY KEY (primary_log_name, shard_id, timestamp),
-- 	FOREIGN KEY (primary_log_name, shard_id) REFERENCES sharded_scenes (log_name, shard_id) ON DELETE CASCADE
-- );

-- geolocation log
CREATE TABLE geolocation(
	primary_log_name TEXT NOT NULL,
	shard_id TEXT NOT NULL,
	shard_path TEXT NOT NULL,
	timestamp BIGINT NOT NULL,
	topic TEXT NOT NULL,
	lat float,
	lon float,
	location TEXT,
	speed float,
	yaw float,
	yaw_rate float,
	date TEXT,
	time TEXT,
	PRIMARY KEY (primary_log_name, shard_id, timestamp),
	FOREIGN KEY (primary_log_name, shard_id) REFERENCES sharded_scenes (log_name, shard_id) ON DELETE CASCADE
);