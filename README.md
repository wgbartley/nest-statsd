nest-statsd
===========

A simple Node.JS daemon that periodically polls your Nest thermostat, parses the data, and pushes it to StatsD.


Installation
------------

1. Clone this repository
2. Change to repo directory (`cd nest-statsd`)
3. Run using `node nest-statsd.js` or use any process manager (nodemon, foreverjs, pm2)


Options
-------
Options are now set via environment variables.  Available options are:

 - `ACCESS_TOKEN` - (Required) Your Nest API access token
 - `METRIC_PATH` - The metric path prefix for Graphite - default: `nest`
 - `STATSD_HOST` - The hostname or IP address of your StatsD instance - default: `127.0.0.1`
 - `STATSD_PORT` - The UDP port of your StatsD instance - default: `8125`
 - `MAX_PACKET_SIZE` - The maximum packet size to send to StatsD (for passing multiple metrics in a single UDP call) - default: `512`
