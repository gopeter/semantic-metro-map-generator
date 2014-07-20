# semantic-metro-map-generator

Little web app that generates semantic metro maps out of GTFS data. Grabs the data from this GTFS API: [semantic-metro-map-gtfs-api.herokuapp.com](http://semantic-metro-map-gtfs-api.herokuapp.com)

[Live demo on Heroku](http://semantic-metro-map-generator.herokuapp.com) (runs with 1 dyno so first start could take a while)

You can use the generated SVG file to query routes with the [`semantic-metro-map`](http://semantic-metro-map.herokuapp.com) tool.

## Todos

- ~~Use arrows as direction indicator~~
- Use shapes to draw correct routes instead of simple lines
- Use correct durations instead of random generated ones

## Installation

1. Clone this repository: `git clone git@github.com:gopeter/semantic-metro-map-generator.git`
2. Create virtual env: `virtualenv venv`
3. Activate virtual env: `source venv/bin/activate` (do this for every new terminal session)
4. Install requirements: `pip install -r requirements.txt`
5. Start app: `foreman start`
6. Visit `http://localhost:5000` and have fun!

Be aware: Just a proof of concept. No validations, no exception handling, no tests.

**Note: to run this app locally, you have to start an instance of this GTFS API: [`node-gtfs`](https://github.com/brendannee/node-gtfs). Or just change the url on the very top of the `app.js` file.**

## Further examples

`semantic-metro-map-generator` is part of a series of experiments

- [`semantic-diagrams`](https://github.com/gopeter/semantic-diagrams)
- [`semantic-graphics`](https://github.com/gopeter/semantic-graphics)
- [`semantic-metro-map`](https://github.com/gopeter/semantic-metro-map)
- [`semantic-metro-map-generator`](https://github.com/gopeter/semantic-metro-map-generator)