import os
from PyQt5 import QtCore, QtWidgets, QtGui
from PyQt5.QtCore import Qt
from PyQt5.QtWidgets import QDialog, QInputDialog, QComboBox, QFileDialog, QTableWidgetItem, QHeaderView


class CustomDialog(QDialog):
    """ Widget to prompt user to proceed or return. """

    def __init__(self):
        super().__init__()
        # init GUI
        self.setWindowTitle('Important')
        self.resize(500, 180)

        font = QtGui.QFont()
        font.setPointSize(14)
        font.setBold(True)
        font.setWeight(75)
        spacerItem = QtWidgets.QSpacerItem(40, 20, QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Minimum)
        
        self.verticalLayout = QtWidgets.QVBoxLayout(self)
        self.main_text = QtWidgets.QLabel(self)
        self.main_text.setFont(font)
        self.main_text.setAlignment(QtCore.Qt.AlignCenter)
        self.main_text.setWordWrap(True)
        self.verticalLayout.addWidget(self.main_text)
        self.sub_text = QtWidgets.QLabel(self)
        self.sub_text.setAlignment(QtCore.Qt.AlignCenter)
        self.sub_text.setWordWrap(True)
        self.verticalLayout.addWidget(self.sub_text)

        self.horizontalLayout = QtWidgets.QHBoxLayout()
        self.horizontalLayout.addItem(spacerItem)

        self.pb_proceed = QtWidgets.QPushButton(self)
        self.pb_proceed.setText('Proceed')
        self.horizontalLayout.addWidget(self.pb_proceed)
        self.pb_return = QtWidgets.QPushButton(self)
        self.pb_return.setText('Return')
        self.horizontalLayout.addWidget(self.pb_return)

        self.verticalLayout.addLayout(self.horizontalLayout)
        self.verticalLayout.setStretch(0, 1)
        self.verticalLayout.setStretch(1, 1)

        self.pb_proceed.clicked.connect(self.accept)
        self.pb_return.clicked.connect(self.reject)

    def setTexts(self, main, sub):
        self.main_text.setText(main)
        self.sub_text.setText(sub)

    def accept(self):
        super().done(1)

    def reject(self):
        super().done(0)