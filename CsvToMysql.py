#!/usr/bin/env python

# File for running "once" to create MySQL table from CSV.

import MySQLdb
from pprint import pprint
import pandas as pd
import pandas.io.sql as pdsql
from matplotlib.dates import date2num
import ConfigFile

useTestData = False

if useTestData:
    databaseName = 'crime_test'
else:
    databaseName = 'crime'
tableName = 'crime_index'

if 'db' in dir():
    print 'Closing db.'
    db.close()
    del db
db = MySQLdb.connect('localhost', ConfigFile.user, ConfigFile.mysqlPw, databaseName)

try:
    db.query('DROP TABLE %s;' % tableName)
except MySQLdb.OperationalError:
    print 'OperationalError, table probably nonexistant. No problem.'

db.query("""
CREATE TABLE """+tableName+"""
(
crime_id        int           NOT NULL AUTO_INCREMENT,
casenumber      char(50)      NULL,
description     char(255)     NULL,
date_time       datetime      NULL,
weekday         char(50)      NULL,
onlytime        time          NOT NULL,
crime_type      char(100)     NULL,
policebeat      char(50)      NULL,
zipcode         char(10)      NULL,
address         char(255)     NOT NULL,
latitude        decimal(9,6)  NOT NULL,
longitude       decimal(9,6)  NOT NULL,
accuracy        char(50)      NULL,
url             char(255)     NULL,
part_of_day     int           NOT NULL,
crime_weight    decimal(9,6)  NOT NULL,
PRIMARY KEY (crime_id),
INDEX pos (latitude, longitude)
) ENGINE=MyISAM;
""")

if useTestData:
    fileName = '../../CrimeData/CrimeSpotting/Jan08Jan13_100.csv'
else:
    fileName = '../../CrimeData/CrimeSpotting/Jan08Jan13.csv'

crimeFrame = pd.read_csv(fileName, skiprows=1, header=None, index_col=False,
                         names=['casenumber',
                                'description',
                                'date_time',
                                'weekday',
                                'onlytime',
                                'crime_type',
                                'policebeat',
                                'zipcode',
                                'address',
                                'latitude',
                                'longitude',
                                'accuracy',
                                'url'])

crimeFrame.zipcode.fillna(0, inplace=True)
crimeFrame.policebeat.fillna(0, inplace=True)
crimeFrame = crimeFrame[crimeFrame.address.notnull()]

# Now add time of day and crime weight
float_time = crimeFrame.onlytime.apply(pd.to_datetime).apply(date2num).apply(lambda x:x-1)
morning = 1*float_time.between(4/24.0*.999999, 12/24.0*.999999)
afternoon = 2*float_time.between(12/24.0*.999999, 20/24.0*.999999)
night = 4*(float_time.between(20/24.0*.999999, 24/24.0*.999999) +
           float_time.between(0/24.0*.999999, 4/24.0*.999999))
crimeFrame['part_of_day'] = (morning+afternoon+night)

# Crime weight at this stage: the cops put 6.4% of all crimes at exactly midnight. Clearly wrong.
# Assume excess are from rest of day with same distribution as crimes with actual times.
# Normalize 00:00 crimes to average of 23:00 and 01:00 crimes, then reweight all crimes to maintain total normalization.
crimeFrame['crime_weight'] = 1.0541-0.83432*float_time.between(0/24.0*.99999, 0/24.0*1.00001)


db.query('set global max_allowed_packet=1048576000;')
print 'Writing to', tableName
pdsql.write_frame(crimeFrame, tableName, db, flavor='mysql', if_exists='append')
db.query('set global max_allowed_packet=1048576;')


# Testing.
db.query('SELECT * FROM %s LIMIT 10;' % tableName)
r = db.use_result()
print 'fetching row:'
pprint(r.fetch_row(0))

print 'getting count'
db.query('SELECT COUNT(*) FROM %s;' % tableName)
r = db.use_result()
print 'fetching row:'
pprint(r.fetch_row(0))

db.close()
del db
print 'Done.'
