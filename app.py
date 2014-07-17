import time
from flask import Flask, jsonify, render_template, request

try:
    # this is how you would normally import
    from flask.ext.cors import cross_origin
except:
    # support local usage without installed package
    from flask_cors import cross_origin

################################################################################
# Init
################################################################################

app = Flask(__name__)

################################################################################
# Store SVG temporary
################################################################################

@app.route('/create', methods = ['POST'])
def parseData():

  # store post data
  p_svg = request.form['svg']

  # save svg as file
  filename = 'static/tmp/map_' + str(int(time.time())) + '.svg'
  f = open(filename,'w')
  
  head = '<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'
  f.write(head + p_svg) # python will convert \n to os.linesep
  f.close()
  
  return filename

################################################################################
# Serve index file
################################################################################

@app.route("/")
@cross_origin()
def index():
  return render_template('index.html')
  
################################################################################
# Start app
################################################################################
 
if __name__ == '__main__':
  app.run(debug=True)