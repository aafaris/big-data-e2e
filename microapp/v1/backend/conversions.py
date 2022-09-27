import pytz
from datetime import datetime

class Converter:
	def __init__(self):
		pass

	def getStartEndTime(self, arr):
		return (self.convertTimeFormat(arr[0].split('_')[1]), self.convertTimeFormat(arr[-1].split('_')[1]))

	def convertDateFormat(self, date):
		return date[:4] + '-' + date[4:6] + '-' + date[6:8]

	def convertTimeFormat(self, t):
		return t[:2] + ':' + t[2:4] + ':' + t[4:6]

	def epochToDateTime(self, ts):
		ts_utc = pytz.utc.localize(datetime.utcfromtimestamp(ts/1000000))
		ts_utc = ts_utc.astimezone(pytz.timezone('Asia/Singapore'))
		return ts_utc.strftime('%H:%M:%S')