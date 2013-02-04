#!/usr/bin/env python

from flask import Flask, url_for, request, render_template, jsonify
from flaskext.mysql import MySQL
from pprint import pprint

app = Flask(__name__)
app.config.update(
    MYSQL_DATABASE_HOST = 'localhost',
    MYSQL_DATABASE_PORT = 3306,
    MYSQL_DATABASE_USER = 'bacha',
    MYSQL_DATABASE_PASSWORD = 'mysqlPW',
    MYSQL_DATABASE_DB = 'crime'
    )

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/_points')
def points():
    c = mysql.get_db().cursor()
    c.execute("SELECT latitude, longitude FROM crime_raw LIMIT 100;")
    latLonTuple = c.fetchall()
    
    latLonList = []
    for ll in latLonTuple:
        latLonList.append([float(ll[0]), float(ll[1])])

    return jsonify(latLons=latLonList)

if __name__ == '__main__':
    app.debug = True

    mysql = MySQL()
    mysql.init_app(app)

    app.run()
