#!/usr/bin/env python

from flask import Flask, url_for, request, render_template, jsonify
from flaskext.mysql import MySQL
from pprint import pprint
import json

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
    c.execute("""
# just a test point, MLK between 58th and Arlington
SET @lat = 37.84309;
SET @lon = -122.27073;
# just another test point, MLK and 54th
SET @latb = 37.83896;
SET @lonb = -122.26972;
#SET @lonb = @lon;

# use a first order approximation of the metric of a sphere,
# centered on Oakland 12th St. city center
SET @s = Sin(37.80367 / 360 * 2 * PI());
SET @s2 = Pow(@s, 2);
SET @r = 6371009.0; # radius of the Earth in meters
SET @c = 0.0174533; # conversion from degrees to radians
# default distance from point or line
SET @pathlength = Sqrt( Pow(@r*@c*(@latb-@lat), 2) + Sin(@lat*@c)*Sin(@latb*@c)*Pow(@r*@c*(@lonb-@lon), 2));
SET @v1y = @r*@c*(@latb-@lat) / @pathlength;
SET @v1x = Sin(@lat*@c)*@r*@c*(@lonb-@lon) / @pathlength;
SET @v2x = -1 * @v1y;
SET @v2y = @v1x;
SET @d = 70;
""")
    c.close()
    c = mysql.get_db().cursor()

    #c.execute("SELECT @v1x, @v1y, @v2x, @v2y;")
    #pprint(c.fetchall())

    c.execute("""
SELECT latitude, longitude
FROM crime_raw
WHERE Abs((@r*@c*Sin(@lat*@c)*longitude*@v2x + @r*@c*latitude*@v2y) -
       	  (@r*@c*Sin(@lat*@c)*@lon*@v2x + @r*@c*@lat*@v2y)) < @d # (input dot v2) minus (point on path dot v2)
	  AND
	  (@r*@c*Sin(@lat*@c)*longitude*@v1x + @r*@c*latitude*@v1y) -
       	  (@r*@c*Sin(@lat*@c)*@lon*@v1x + @r*@c*@lat*@v1y) > -@d # (input dot v1) minus (point1 on path dot v1)
	  AND
	  (@r*@c*Sin(@lat*@c)*longitude*@v1x + @r*@c*latitude*@v1y) -
       	  (@r*@c*Sin(@lat*@c)*@lonb*@v1x + @r*@c*@latb*@v1y) < @d # (input dot v1) minus (point2 on path dot v1)
LIMIT 10000;
""")

    latLonTuple = c.fetchall()
    #pprint(latLonTuple)
    
    latLonList = []
    for ll in latLonTuple:
        latLonList.append([float(ll[0]), float(ll[1])])

    c.execute("""
SELECT COUNT(*)
FROM crime_raw
WHERE Abs((@r*@c*Sin(@lat*@c)*longitude*@v2x + @r*@c*latitude*@v2y) -
       	  (@r*@c*Sin(@lat*@c)*@lon*@v2x + @r*@c*@lat*@v2y)) < @d # (input dot v2) minus (point on path dot v2)
	  AND
	  (@r*@c*Sin(@lat*@c)*longitude*@v1x + @r*@c*latitude*@v1y) -
       	  (@r*@c*Sin(@lat*@c)*@lon*@v1x + @r*@c*@lat*@v1y) > -@d # (input dot v1) minus (point1 on path dot v1)
	  AND
	  (@r*@c*Sin(@lat*@c)*longitude*@v1x + @r*@c*latitude*@v1y) -
       	  (@r*@c*Sin(@lat*@c)*@lonb*@v1x + @r*@c*@latb*@v1y) < @d # (input dot v1) minus (point2 on path dot v1)
;
""")

    countTuple = c.fetchall()
    #pprint(countTuple)

    return jsonify(latLons=latLonList, pathCount=countTuple[0][0])

@app.route('/_points_for_multiple_paths', methods=['POST'])
def points_for_multiple_paths():
    directions = json.loads(request.data)
    routes = directions['routes']
    if not len(routes[0]['legs']) == 1:
        raise ValueError, 'Unexpected number of "legs".'
    #pprint(routes[0]['legs'][0])
    #pprint(routes[0]['legs'][0].keys())
    print 'number of steps', len(routes[0]['legs'][0]['steps'])
    #pprint(routes[0]['legs'][0]['steps'])
    #pprint(routes[0]['legs'][0]['steps'][0].keys())

    steps = routes[0]['legs'][0]['steps']
    crimesForLinesList = []
    for step in steps:
        lat1 = step['start_location']['Ya']
        lon1 = step['start_location']['Za']
        lat2 = step['end_location']['Ya']
        lon2 = step['end_location']['Za']
        crimesForLinesList.append(FindCrimesNearALine(lat1, lon1, lat2, lon2))
        
    fullPathDict = {'pathCount': 0, 'latLons': []}
    for crimesJson in crimesForLinesList:
        cDict = json.loads(crimesJson.data)
        fullPathDict['pathCount'] += cDict['pathCount']
        fullPathDict['latLons'] += cDict['latLons']
    return jsonify(fullPathDict)

def FindCrimesNearALine(latA, lonA, latB, lonB, d=70, nmax=1000):
    """
    Take the lat and lon (in normal degrees) of two points A and B, and a distance in meters.
    Querys the MySQL crime database.
    Returns a JSON object of the first nmax crimes and the total found.
    """
    c = mysql.get_db().cursor()
    initializeMysqlCommand = """
    SET @latA = """+str(latA)+""";
    SET @lonA = """+str(lonA)+""";
    SET @latB = """+str(latB)+""";
    SET @lonB = """+str(lonB)+""";
    
    # use a first order approximation of the metric of a sphere,
    # centered on Oakland 12th St. city center
    SET @r = 6371009.0; # radius of the Earth in meters
    SET @c = 0.0174533; # conversion from degrees to radians
    SET @pathlength = Sqrt( Pow(@r*@c*(@latB-@latA), 2) + Sin(@latA*@c)*Sin(@latB*@c)*Pow(@r*@c*(@lonB-@lonA), 2));
    # v1 is unit vector parallel to BA line
    SET @v1y = @r*@c*(@latB-@latA) / @pathlength;
    SET @v1x = Sin(@latA*@c)*@r*@c*(@lonB-@lonA) / @pathlength;
    # v2 is perpendicular unit vector
    SET @v2x = -1 * @v1y;
    SET @v2y = @v1x;
    SET @d = """+str(d)+""";
    """
    #print 'initializeMysqlCommand:', initializeMysqlCommand
    c.execute(initializeMysqlCommand)
    c.close()
    c = mysql.get_db().cursor()

    #c.execute("SELECT @v1x, @v1y, @v2x, @v2y;")
    #pprint(c.fetchall())

    c.execute("""
    SELECT latitude, longitude
    FROM crime_raw
    WHERE Abs((@r*@c*Sin(@latA*@c)*longitude*@v2x + @r*@c*latitude*@v2y) -
           	  (@r*@c*Sin(@latA*@c)*@lonA*@v2x + @r*@c*@latA*@v2y)) < @d # (input dot v2) minus (point on path dot v2)
    	  AND
    	  (@r*@c*Sin(@latA*@c)*longitude*@v1x + @r*@c*latitude*@v1y) -
           	  (@r*@c*Sin(@latA*@c)*@lonA*@v1x + @r*@c*@latA*@v1y) > -@d # (input dot v1) minus (point1 on path dot v1)
    	  AND
    	  (@r*@c*Sin(@latA*@c)*longitude*@v1x + @r*@c*latitude*@v1y) -
           	  (@r*@c*Sin(@latA*@c)*@lonB*@v1x + @r*@c*@latB*@v1y) < @d # (input dot v1) minus (point2 on path dot v1)
    LIMIT """+str(nmax)+""";
    """)
    
    latLonTuple = c.fetchall()
    #pprint(latLonTuple)
    
    latLonList = []
    for ll in latLonTuple:
        latLonList.append([float(ll[0]), float(ll[1])])

    c.execute("""
    SELECT COUNT(*)
    FROM crime_raw
    WHERE Abs((@r*@c*Sin(@latA*@c)*longitude*@v2x + @r*@c*latitude*@v2y) -
           	  (@r*@c*Sin(@latA*@c)*@lonA*@v2x + @r*@c*@latA*@v2y)) < @d # (input dot v2) minus (point on path dot v2)
    	  AND
    	  (@r*@c*Sin(@latA*@c)*longitude*@v1x + @r*@c*latitude*@v1y) -
           	  (@r*@c*Sin(@latA*@c)*@lonA*@v1x + @r*@c*@latA*@v1y) > -@d # (input dot v1) minus (point1 on path dot v1)
    	  AND
    	  (@r*@c*Sin(@latA*@c)*longitude*@v1x + @r*@c*latitude*@v1y) -
           	  (@r*@c*Sin(@latA*@c)*@lonB*@v1x + @r*@c*@latB*@v1y) < @d # (input dot v1) minus (point2 on path dot v1)
    ;
    """)

    countTuple = c.fetchall()
    #pprint(countTuple)

    return jsonify(latLons=latLonList, pathCount=countTuple[0][0])


if __name__ == '__main__':
    app.debug = True

    mysql = MySQL()
    mysql.init_app(app)

    app.run()
