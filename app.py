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

@app.route('/test')
def test_page():
    return render_template('test.html')

@app.route('/_points_for_multiple_paths', methods=['POST'])
def points_for_multiple_paths():
    directions = json.loads(request.data)
    routes = directions['routes']
    crimeDictsForRoutes = {'paths': []}
    for route in routes:
        if not len(route['legs']) == 1:
            raise ValueError, 'Unexpected number of "legs".'
        print 'In points_for_multiple_paths: Number of steps', len(route['legs'][0]['steps'])

        steps = route['legs'][0]['steps']
        crimesForLinesList = []
        for step in steps:
            lat1 = step['start_location']['Ya']
            lon1 = step['start_location']['Za']
            lat2 = step['end_location']['Ya']
            lon2 = step['end_location']['Za']
            crimesForLinesList.append(FindCrimesNearALine(lat1, lon1, lat2, lon2))
            
        # TO DO: Correct double counting and make more efficient my putting MySQL determination into a function
        # and ORing together the currently seperate queries
        fullPathDict = {'pathCount': 0, 'latLons': []}
        for crimesJson in crimesForLinesList:
            cDict = json.loads(crimesJson.data)
            fullPathDict['pathCount'] += cDict['pathCount']
            fullPathDict['latLons'] += cDict['latLons']
        crimeDictsForRoutes['paths'].append(fullPathDict)
    return jsonify(crimeDictsForRoutes)

@app.route('/_points_for_a_path', methods=['POST'])
def points_for_a_paths():
    route = json.loads(request.data)
    crimeDictsForRoutes = {'paths': []}
    if not len(route['legs']) == 1:
        raise ValueError, 'Unexpected number of "legs".'
    print 'In points_for_a_path: Number of steps', len(route['legs'][0]['steps'])

    steps = route['legs'][0]['steps']
    crimesForLinesList = []
    for step in steps:
        lat1 = step['start_location']['Ya']
        lon1 = step['start_location']['Za']
        lat2 = step['end_location']['Ya']
        lon2 = step['end_location']['Za']
        crimesForLinesList.append(FindCrimesNearALine(lat1, lon1, lat2, lon2))
            
    # TO DO: Correct double counting and make more efficient my putting MySQL determination into a function
    # and ORing together the currently seperate queries
    fullPathDict = {'pathCount': 0, 'latLons': []}
    for crimesJson in crimesForLinesList:
        cDict = json.loads(crimesJson.data)
        fullPathDict['pathCount'] += cDict['pathCount']
        fullPathDict['latLons'] += cDict['latLons']
    crimeDictsForRoutes['paths'].append(fullPathDict)
    crimeDictsForRoutes['routeNum'] = int(route['routeNum'])
    return jsonify(crimeDictsForRoutes)

def FindCrimesNearALine(latA, lonA, latB, lonB, d=60, nmax=1000):
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
    SET @pathlength = Sqrt( Pow(@r*@c*(@latB-@latA), 2) + Cos(@latA*@c)*Cos(@latB*@c)*Pow(@r*@c*(@lonB-@lonA), 2));
    # v1 is unit vector parallel to BA line
    SET @v1y = @r*@c*(@latB-@latA) / @pathlength;
    SET @v1x = Cos(@latA*@c)*@r*@c*(@lonB-@lonA) / @pathlength;
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
    FROM crime_raw_index
    WHERE Abs((@r*@c*Cos(@latA*@c)*longitude*@v2x + @r*@c*latitude*@v2y) -
           	  (@r*@c*Cos(@latA*@c)*@lonA*@v2x + @r*@c*@latA*@v2y)) < @d # (input dot v2) minus (point on path dot v2)
    	  AND
    	  (@r*@c*Cos(@latA*@c)*longitude*@v1x + @r*@c*latitude*@v1y) -
           	  (@r*@c*Cos(@latA*@c)*@lonA*@v1x + @r*@c*@latA*@v1y) > -@d/2 # (input dot v1) minus (point1 on path dot v1)
    	  AND
    	  (@r*@c*Cos(@latA*@c)*longitude*@v1x + @r*@c*latitude*@v1y) -
           	  (@r*@c*Cos(@latA*@c)*@lonB*@v1x + @r*@c*@latB*@v1y) < @d/2 # (input dot v1) minus (point2 on path dot v1)
    LIMIT """+str(nmax)+""";
    """)
    
    latLonTuple = c.fetchall()
    #pprint(latLonTuple)
    
    latLonList = []
    for ll in latLonTuple:
        latLonList.append([float(ll[0]), float(ll[1])])

    if len(latLonList) <= nmax:
        countResult = len(latLonList)
    else:
        c.execute("""
        SELECT COUNT(*)
        FROM crime_raw_index
        WHERE Abs((@r*@c*Cos(@latA*@c)*longitude*@v2x + @r*@c*latitude*@v2y) -
               	  (@r*@c*Cos(@latA*@c)*@lonA*@v2x + @r*@c*@latA*@v2y)) < @d # (input dot v2) minus (point on path dot v2)
        	  AND
        	  (@r*@c*Cos(@latA*@c)*longitude*@v1x + @r*@c*latitude*@v1y) -
               	  (@r*@c*Cos(@latA*@c)*@lonA*@v1x + @r*@c*@latA*@v1y) > -@d/2 # (input dot v1) minus (point1 on path dot v1)
        	  AND
        	  (@r*@c*Cos(@latA*@c)*longitude*@v1x + @r*@c*latitude*@v1y) -
               	  (@r*@c*Cos(@latA*@c)*@lonB*@v1x + @r*@c*@latB*@v1y) < @d/2 # (input dot v1) minus (point2 on path dot v1)
        ;
        """)
        
        countResult = c.fetchall()

    return jsonify(latLons=latLonList, pathCount=countResult)


if __name__ == '__main__':
    app.debug = True

    mysql = MySQL()
    mysql.init_app(app)

    app.run()
