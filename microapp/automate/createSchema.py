create_table_main = """
	CREATE TABLE IF NOT EXISTS main (
	log_name TEXT NOT NULL,
	log_path TEXT NOT NULL,
	vehicle TEXT NOT NULL,
	start_time TEXT,
	end_time TEXT,
	shards_array TEXT ARRAY,
	PRIMARY KEY (log_name)
	);"""

create_table_sharded_scenes = """
	CREATE TABLE sharded_scenes(
	log_name TEXT NOT NULL,
	shard_id TEXT NOT NULL,
	shard_path TEXT NOT NULL,
	shard_date TEXT NOT NULL,
	shard_time TEXT NOT NULL,
	PRIMARY KEY (log_name, shard_id),
	FOREIGN KEY (log_name) REFERENCES main (log_name) ON DELETE CASCADE
	);"""

create_table_camera = """
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
	);"""

create_table_lidar = """
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
	);"""

# object list - OPTIONAL
create_table_objects = """
	CREATE TABLE objects(
	primary_log_name TEXT NOT NULL,
	shard_id TEXT NOT NULL,
	shard_path TEXT NOT NULL,
	timestamp BIGINT NOT NULL,
	object_list BYTEA NOT NULL,
	date TEXT,
	time TEXT,
	PRIMARY KEY (primary_log_name, shard_id, timestamp),
	FOREIGN KEY (primary_log_name, shard_id) REFERENCES sharded_scenes (log_name, shard_id) ON DELETE CASCADE
	);"""

create_table_geolocation = """
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
	);"""


import psycopg2

try:
	con = psycopg2.connect(host="localhost",
					user="postgres",
					password='ENTER_PASSWORD',
					database="ENTER_DATABASE",
					port='5432')

	cur = con.cursor()
	cur.execute(create_table_main)
	cur.execute(create_table_sharded_scenes)
	cur.execute(create_table_camera)
	cur.execute(create_table_lidar)
	# cur.execute(create_table_objects)
	cur.execute(create_table_geolocation)

except (Exception, psycopg2.Error) as error:
    print("Error while fetching data from PostgreSQL", error)
    con.close()
    return
