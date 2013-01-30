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
        #show_the_login_form()

@app.route('/user/<username>')
def profile(username):
    return 'User %s totally exists!' % username

@app.route('/hello/')
@app.route('/hello/<name>')
def hello(name=None):
    return render_template('hello.html', name=name)

if __name__ == '__main__':
    app.debug = True
    app.run()
