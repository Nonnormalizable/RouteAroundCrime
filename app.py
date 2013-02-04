#!/usr/bin/env python

from flask import Flask, url_for, request, render_template
from flaskext.mysql import MySQL

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
    c = mysql.get_db().cursor()
    c.execute("SELECT * FROM crime_raw LIMIT 9;")
    print c.fetchone()

    return render_template('index.html')

if __name__ == '__main__':
    app.debug = True

    mysql = MySQL()
    mysql.init_app(app)

    app.run()
