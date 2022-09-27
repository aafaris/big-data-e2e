# This program is for sharding a log file into multiples and storing data into postgres according to respective properties
# conda activate myenv

import os, sys, re

from PyQt5 import QtWidgets, QtCore, QtGui
from PyQt5.QtWidgets import QWidget, QPushButton, QApplication, QFileDialog

from backend.data import *
from backend.dialog import *


class App(QWidget):
	def __init__(self):
		# setup ui
		super().__init__()
		self.setWindowTitle('Log with Metadata to Postgres')
		self.setFixedSize(600,150)
		font_11 = QtGui.QFont()
		font_11.setPointSize(11)
		self.verticalLayout = QtWidgets.QVBoxLayout(self)
		self.file_text = QtWidgets.QLabel(self)
		self.file_text.setFont(font_11)
		self.file_text.setText("Select Existing Log Folder:")
		self.frame = QtWidgets.QFrame(self)
		self.frame.setFrameShape(QtWidgets.QFrame.NoFrame)
		self.frame.setFrameShadow(QtWidgets.QFrame.Plain)
		self.browse_layout = QtWidgets.QHBoxLayout(self.frame)
		self.browse_layout.setContentsMargins(0, 0, 0, 0)
		self.dir = QtWidgets.QLineEdit(self.frame)
		self.dir.setFont(font_11)
		self.dir.setPlaceholderText("Select a log folder...")
		self.browse = QtWidgets.QPushButton(self.frame)
		self.browse.setFont(font_11)
		self.browse.setText('Browse')
		self.write = QPushButton(self)
		self.write.setText('Import to Postgres')
		self.update = QPushButton(self)
		self.update.setText('Check Database Status')

		self.model = Model()
		self.dialog = CustomDialog()
		self.dialog.pb_proceed.setVisible(False)

		self.browse.clicked.connect(self.browseFile)
		self.write.clicked.connect(self.start)
		self.update.clicked.connect(self.checkDatabaseStatus)

		self.verticalLayout.addWidget(self.file_text)
		self.browse_layout.addWidget(self.dir)
		self.browse_layout.addWidget(self.browse)
		self.verticalLayout.addWidget(self.frame)
		self.verticalLayout.addWidget(self.write)
		self.verticalLayout.addWidget(self.update)

	def browseFile(self):
		file = QFileDialog().getExistingDirectory()

		if file:
			self.dir.setText(file)
			
	def start(self):
		# SELECT MAIN LOG (YY-MM) - SHARDS NOT ALLOWED
		if len(self.dir.text()) == 0 or not os.path.exists(self.dir.text()):
			self.dialog.setTexts(
				"Please select a valid log folder!",""
			)
			self.dialog.exec()
			return
	
		mainLogName = self.dir.text().rsplit('/', 1)[1]

		if bool(re.match("[\d/-]+$", mainLogName)) != True or len(mainLogName) != 7:
			self.dialog.setTexts(
				"Please select a valid log folder!",""
			)
			self.dialog.exec()
			return

		# Write to Postgres
		self.model.onWriting(self.dir.text())
		self.dir.clear()

		self.dialog.setTexts(
			"All metadata has been written to Postgres successfully!",""
		)
		self.dialog.exec()

	def checkDatabaseStatus(self):
		status, remaining = self.model.checkStatus()

		if status:
			self.dialog.setTexts(
				"Your database is up-to-date!",""
			)
		else:
			self.dialog.setTexts(
				"Please update your database!",f'Logs awaiting to update: {remaining}'
			)
		self.dialog.exec()


if __name__ == '__main__':
	app = QApplication(sys.argv)
	view = App()
	view.show()
	sys.exit(app.exec_())