#!/usr/bin/env python

from flask import Flask, url_for, request, render_template
app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    abort(404)
    if request.method == 'POST':
        return 'post method '+request.args.get('bob', '')
    else:
        return 'get method '+request.args.get('bob', '')

@app.route('/user/<username>')
def profile(username):
    return 'User %s totally exists!' % username

@app.route('/map_two')
def map_two():
    return """
<head>
  <script type="text/javascript"
          src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDXluoQqUGT51AesCSg-voAfkLWr8V36SQ&sensor=false">
  </script>
  <script type="text/javascript" src="../static/js/map_display.js"></script>
</head>
<body onload="initialize_map()">
  <div id="map_canvas" style="width:100%; height:100%">
</body>
"""

@app.route('/hello/')
@app.route('/hello/<name>')
def hello(name=None):
    return render_template('hello.html', name=name)

if __name__ == '__main__':
    app.debug = True
    app.run()
