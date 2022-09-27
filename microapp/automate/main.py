# THIS SCRIPT WILL BE RUNNING AS A SCHEDULED EVENT VIA CRONTAB IN OS
import os
import logging
import psycopg2
import time
import csv
import pandas as pd

from geotagger import GeoTagger
from conversions import Converter


class Main:
	def __init__(self):
		self.con = None
		self.serverPath = "YOUR_ABSOLUTE_PATH"
		self.updateMasterLogs = list()
		self.updateShardLogs = list()
		self.updateShards = list()

		self.masterPath = None
		self.masterFolder = None
		self.currentShardFolder = None
		self.shardsArray = list()

		self.date = None
		self.currentShardTime = None
		self.startTime = None
		self.endTime = None

		self.converter = Converter()

		# logging operations
		self.dir_path = os.path.dirname(os.path.realpath(__file__))
		self.filename = os.path.join(self.dir_path, "tracker.log")

		self.logger = logging.getLogger(__name__)
		self.logger.setLevel(logging.INFO)

		self.file_handler = logging.FileHandler(self.filename)
		self.file_handler.setLevel(logging.INFO)
		self.file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
		self.logger.addHandler(self.file_handler)


	def checkStatus(self):
		currentLogsFromDB = list()

		try:
			con = psycopg2.connect(host="localhost",
							user="postgres",
							password='password',
							database="test",
							port='5432')

			cur = con.cursor()
			cur.execute("select log_name, shards_array from main")

			records = cur.fetchall()
			currentLogsFromDB = records

		except (Exception, psycopg2.Error) as error:
			self.logger.info("DATABASE ERROR")
			print("Error while fetching data from PostgreSQL", error)
			con.close()
			return False

		# check for valid server path
		if not os.path.exists(self.serverPath):
			self.logger.info("SERVER PATH ERROR")
			print("Server path is invalid. Please re-check your path!")
			return False


		# check for new master logs in server
		currentLogsFromServer = os.listdir(self.serverPath)

		# for new DB
		if len(currentLogsFromDB) == 0:
			self.updateMasterLogs = currentLogsFromServer
			print(f'Updating all Master Logs: {self.updateMasterLogs}')
		else:
			for log in currentLogsFromDB:
				# check for new master logs in server
				if log[0] in currentLogsFromServer:
					currentLogsFromServer.remove(log[0])

				currentShardsFromServer = os.listdir('/'.join([self.serverPath, log[0], "dataset"]))

				# equal length of shards == log is up-to-date
				if len(log[1]) == len(currentShardsFromServer): continue

				# check for new shard logs in server -> O(n^2) -> reduce time complexity required
				for shard in currentShardsFromServer:
					if shard not in log[1]:
						print(f'Shard Log {log[0], shard} is not in the database')
						self.updateShardLogs.append((log[0], shard))
						self.updateShards.append(shard)

				# list comprehension method
				# [self.updateShardLogs.append((log[0], shard)) for shard in currentShardsFromServer if shard not in log[1]]

			if len(currentLogsFromServer) > 0:
				self.updateMasterLogs = currentLogsFromServer
				print(f'{self.updateMasterLogs} to be updated to database!')


		# confirm latest updates
		if len(self.updateMasterLogs) == 0 and len(self.updateShardLogs) == 0:
			print("Database is up-to-date!")
			self.logger.info("DATABASE UP-TO-DATE")
			return False
		else:
			return True


	# MAIN FEATURE
	def prepareMetadata(self):
		print("Preparing metadata for Postgres...")

		# update master logs
		if len(self.updateMasterLogs) == 0:
			print("No master logs to update!")
		else:
			for log in self.updateMasterLogs:
				# extend path
				self.masterPath = '/'.join([self.serverPath, log, "dataset"])
				self.masterFolder = self.masterPath.rsplit('/', 2)[1]

				# setup shards
				self.shardsArray = list(map(lambda shards: shards, os.listdir(self.masterPath)))

				self.updateMetadata()

			self.updateMasterLogs.clear()
			print("Updated All Master Logs!")

		# update shard logs
		if len(self.updateShardLogs) == 0:
			print("No shard logs to update!")
		else:
			# update shards
			self.shardsArray = self.updateShards

			for log, shard in self.updateShardLogs:
				# extend path
				self.masterPath = '/'.join([self.serverPath, log, "dataset"])
				self.masterFolder = self.masterPath.rsplit('/', 2)[1]

				self.updateMetadata()

			print("Updated All Shard Logs")


	def updateMetadata(self):

		# get shard start time and end time from main log folder
		self.startTime, self.endTime = self.converter.getStartEndTime(self.shardsArray)

		for shard in self.shardsArray:
			# shard folders/sub folders, containing camera, lidar, geolocation folders
			self.currentShardFolder = shard
			self.date = self.converter.convertDateFormat(shard.split('_')[0])
			self.currentShardTime = self.converter.convertTimeFormat(shard.split('_')[1])

			# START PROCESSING
			self.processMetadata()

		self.logger.info(self.masterPath + " - SUCCESS")
		self.reset()


	def processMetadata(self):

		shardPath = '/'.join([self.masterPath, self.currentShardFolder])

		if not self.isConnected():
			self.startPostgres()

		self.setupShardScene()

		self.geolocationMetadata(shardPath)
		self.cameraMetadata(shardPath)
		self.lidarMetadata(shardPath)


	# DATABASE
	def connect(self):
		print("Connecting to Postgres...")
		try:
			self.con = psycopg2.connect(host="localhost",
							user="postgres",
							password='common',
							database="testv3",
							port='5432')
		except (Exception, psycopg2.DatabaseError) as error:
			self.logger.info("DATABASE ERROR")
			print(error)

	def isConnected(self):
		if self.con is not None:
			return True
		else:
			print("Postgres not connected!")
			return False

	def startPostgres(self):
		self.connect()

		if not self.isConnected():
			print("Failed to connect to Postgres!")
			self.reset()
			print("System has been reset!")
			return

		'''ENSURE THAT DB SCHEMA HAVE BEEN SETUP'''
		self.setupMaster()


	# MAIN LOG TABLE
	def setupMaster(self):
		print("Inserting master information in Postgres...")

		# only update for master logs
		if len(self.updateMasterLogs) != 0:

			logs = list()

			vehicle = "test"
			logs.append((self.masterFolder, self.masterPath, vehicle, self.startTime, self.endTime, self.shardsArray))

			cur = self.con.cursor()

			try:
				# WRITE TO MAIN TABLE
				query = """INSERT INTO main
									(log_name, log_path, vehicle, start_time, end_time, shards_array)
									VALUES (%s,%s,%s,%s,%s,%s);"""
				cur.executemany(query, logs)
				self.con.commit()

			except (Exception, psycopg2.Error) as error:
				self.logger.info(self.masterPath + " - INSERT ERROR")
				print("Error in INSERT operation!", error)

		# only update for shard logs
		else:

			cur = self.con.cursor()

			try:
				# GET CURRENT ARRAY
				cur.execute("select shards_array from main \
								where log_name = %s", [self.masterFolder])
				results = cur.fetchall()

				# UPDATE ARRAY IN MAIN TABLE
				updatedShardsArray = results[0][0] + self.shardsArray
				query = """UPDATE main SET shards_array = %s WHERE log_name = %s"""
				cur.execute(query, [updatedShardsArray, self.masterFolder])
				self.con.commit()

			except (Exception, psycopg2.Error) as error:
				self.logger.info(self.masterPath + " - UPDATE ERROR")
				print("Error in UPDATE operation!", error)
				return

	def setupShardScene(self):

		scenes = list()

		if len(self.shardsArray) == 0:
			print("Please select a valid folder! No folders found in directory: ", self.masterPath)
			return

		shardPath = '/'.join([self.masterPath, self.currentShardFolder])
		scenes.append((self.masterFolder, self.currentShardFolder, shardPath, self.date, self.currentShardTime))

		cur = self.con.cursor()

		try:
			# WRITE TO SCENES
			query = """INSERT INTO sharded_scenes
								(log_name, shard_id, shard_path, shard_date, shard_time)
								VALUES (%s,%s,%s,%s,%s);"""

			cur.executemany(query, scenes)
			self.con.commit()

		except (Exception, psycopg2.Error) as error:
			self.logger.info(self.masterPath + " - INSERT ERROR")
			print("Error in INSERT operation!", error)


	# METADATA
	def cameraMetadata(self, path):

		# print(Preparing camera metadata...")

		topics = ("CameraFrontCenterPairLeft", "CameraFrontCenterPairRight",
			"HDRCamWideFrontCAM", "HDRCamWideRearCAM")
		cameraList = list()

		for topic in topics:
			cameraPath = '/'.join([path, topic])

			if not os.path.exists(cameraPath):
				print("No files found in " + cameraPath)
				continue

			for image in os.listdir(cameraPath):
				timestamp = int(image.split('.')[0])
				time = self.converter.epochToDateTime(timestamp)
				imagePath = '/'.join([cameraPath, image])

				cameraList.append((self.masterFolder, self.currentShardFolder, path, timestamp, imagePath, topic, self.date, time))

		# INSERT INTO POSTGRES
		cur = self.con.cursor()

		query = """INSERT INTO camera
							(primary_log_name, shard_id, shard_path, timestamp, image_path, topic, date, time)
							VALUES (%s,%s,%s,%s,%s,%s,%s,%s);"""
		cur.executemany(query, cameraList)
		self.con.commit()

		# print(str(len(cameraList)) + " rows of camera data have been written to Postgres successfully!")

	def lidarMetadata(self, path):

		# print("Preparing lidar metadata...")

		topic = ("Sensor3dLidarCombined")
		lidarList = list()
		lidarPath = '/'.join([path, topic])

		if not os.path.exists(lidarPath):
			print("No files found in " + lidarPath)
			return

		for binFile in os.listdir(lidarPath):
			timestamp = int(binFile.split('.')[0])
			time = self.converter.epochToDateTime(timestamp)
			binPath = '/'.join([lidarPath, binFile])
			lidarList.append((self.masterFolder, self.currentShardFolder, path, timestamp, binPath, topic, self.date, time))

		# INSERT INTO POSTGRES
		cur = self.con.cursor()

		query = """INSERT INTO lidar
							(primary_log_name, shard_id, shard_path, timestamp, bin_path, topic, date, time)
							VALUES (%s,%s,%s,%s,%s,%s,%s,%s);"""
		cur.executemany(query, lidarList)
		self.con.commit()

		# print(str(len(lidarList)) + " rows of lidar data have been written to Postgres successfully!")

	def geolocationMetadata(self, path):

		# print("Preparing geolocation metadata...")

		topic = "GeometryMsgPoseFused"
		geolocationList = list()
		range_10s = 10000000
		range_20s = 20000000
		range_30s = 30000000
		iteration = 0
		firstTimestamp = 0
		address = None
		geolocationPath = '/'.join([path, topic+".csv"])
		tagger = GeoTagger()

		if not os.path.exists(geolocationPath):
			print(topic + " doesn't exist in " + geolocationPath)
			return

		# PANDAS CHUNKSIZE
		pd_df = pd.read_csv(geolocationPath, header=None, names=['timestamp', 'x', 'y', 'z', 'yaw', 'speed', 'yaw rate'], chunksize=int(1e6))
		pd_df = pd.concat(pd_df)

		lon, lat = tagger.utmToLatLong(pd_df['x'].values, pd_df['y'].values)
		ts = pd_df['timestamp'].values
		yaw = pd_df['yaw'].values
		v = pd_df['speed'].values
		rate = pd_df['yaw rate'].values

		for i in range(len(lon)):

			currentTimestamp = int(ts[i])
			time = self.converter.epochToDateTime(currentTimestamp)

			if iteration == 0:
				firstTimestamp = currentTimestamp
				address = tagger.utmToAddress(lon[i], lat[i])
				print(address)
				iteration = 1

			if abs(currentTimestamp - firstTimestamp) > range_10s:
				# address = tagger.utmToAddress(lon[i], lat[i])
				# print(address)
			# else:
				iteration = 0

			geolocationList.append((self.masterFolder, self.currentShardFolder, path,
										currentTimestamp, topic, lat[i], lon[i], address, yaw[i], v[i], rate[i], self.date, time))


		# INSERT INTO POSTGRES
		cur = self.con.cursor()

		query = """INSERT INTO geolocation
							(primary_log_name, shard_id, shard_path, timestamp, topic, lat, lon, location, speed, yaw, yaw_rate, date, time)
							VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);"""
		cur.executemany(query, geolocationList)
		self.con.commit()

		# print(str(len(geolocationList)) + " rows of geolocation data have been written to Postgres successfully!")


	def reset(self):
		if self.con is not None:
			self.con.close()

		self.masterPath = None
		self.masterFolder = None
		self.currentShardFolder = None
		self.updateShards.clear()
		self.shardsArray.clear()

		self.date = None
		self.currentShardTime = None
		self.startTime = None
		self.endTime = None

	def run(self):
		requireUpdate = self.checkStatus()
		# return

		if requireUpdate:
			self.prepareMetadata()



if __name__ == '__main__':
	app = Main()
	app.run()
