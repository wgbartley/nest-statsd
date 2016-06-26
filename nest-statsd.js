// Require required stuff
var https = require('https'),
    url   = require('url'),
    udp   = require('dgram').createSocket('udp4');


// Require variables
var ACCESS_TOKEN = (process.env.ACCESS_TOKEN ? process.env.ACCESS_TOKEN : '').trim();


// Optional variables
var METRIC_PATH = (process.env.METRIC_PATH ? process.env.METRIC_PATH : 'nest');
var STATSD_HOST = (process.env.STATSD_HOST ? process.env.STATSD_HOST : '127.0.0.1');
var STATSD_PORT = (process.env.STATSD_PORT ? process.env.STATSD_PORT : 8125);
var INTERVAL = (process.env.INTERVAL ? process.env.INTERVAL : 60);
var MAX_PACKET_SIZE = (process.env.MAX_PACKET_SIZE ? process.env.MAX_PACKET_SIZE : 512);

var API_URL = 'https://developer-api.nest.com/';
var statsd_message = '';


// I said it was required!
if(ACCESS_TOKEN.length==0) {
	console.error('You MUST provide an access token');
	process.exit(1);
}

setTimeout(get_stats, 1);


function get_stats() {
	var opts = url.parse(API_URL);
	opts.headers = {
		'Authorization': 'Bearer '+ACCESS_TOKEN
	}

	var req = https.request(opts, function(res) {
		if(res.statusCode==307) {
			API_URL = res.headers.location;
			setTimeout(get_stats, 1);
			return;
		}

		res.on('data', function(d) {
            stats_parse(d);
		});

		setTimeout(get_stats, INTERVAL*1000);
	});

	req.end(function(d) {
		if(d!=undefined)
			console.log(d.toString());
	});
}


// Parse the data from the event
function stats_parse(data) {
    try {
        var D = JSON.parse(data.toString());
        var T = D.devices.thermostats;
    } catch (e) {
        console.log('ERROR: '+e);
        return;
    }

    for(var i in T) {
        var name = T[i].name;

        _log('>>>', T[i]);

        for(var j in T[i]) {
            if(j=='software_version')
                continue;

            switch(j) {
                case 'hvac_state':
                    switch(T[i][j]) {
                        case 'off':
                            T[i][j] = 0;
                            break;

                        case 'cooling':
                            T[i][j] = 1;
                            break;

                        case 'heating':
                            T[i][j] = 2;
                            break;
                    }
                    break;

                case 'hvac_mode':
                    switch(T[i][j]) {
                        case 'off':
                            T[i][j] = 0;
                            break;

                        case 'cool':
                            T[i][j] = 1;
                            break;

                        case 'heat':
                            T[i][j] = 2;
                            break;

                        case 'heat-cool':
                            T[i][j] = 3;
                            break;
                    }
            }

            switch(typeof T[i][j]) {
                case 'number':
                    stats_send(name, j, T[i][j]);
                    break;

                case 'boolean':
                    if(T[i][j])
                        stats_send(name, j, 1);
                    else
                        stats_send(name, j, 0);
                    break;
            }
        }

        stats_send(true);
    }
}


// Send the parsed metrics to StatsD
function stats_send(/* device, variable, value, force */) {
    if(typeof arguments[0]=='boolean') {
        _send();
        return;
    } else {
        device = arguments[0];
        variable = arguments[1];
        value = arguments[2];

        if(arguments[3]!=undefined)
            force = arguments[3];
        else
            force = false;
    }

    var msg = METRIC_PATH+'.'+device+'.'+variable+':'+value+'|g';

    if(force==undefined)
        force = false;

    if(!force) {
        if(statsd_message.length+msg.length+1>=MAX_PACKET_SIZE)
            _send();
    }

    statsd_message += msg+"\n";

    if(force)
    	_send();
}


function _send() {
    statsd_message = statsd_message.replace("\n\n", '').trim();

    var msg = new Buffer(statsd_message);
    statsd_message = "";
    udp.send(msg, 0, msg.length, STATSD_PORT, STATSD_HOST);
    _log('<<<', msg.toString());
}


// Semi-fancy logging with timestamps
function _log() {
	var d = new Date();

	// Year
	d_str = d.getFullYear();
	d_str += '-';

	// Month
	if(d.getMonth()+1<10) d_str += '0';
	d_str += (d.getMonth()+1);
	d_str += '-';

	// Day
	if(d.getDate()<10) d_str += '0';
	d_str += d.getDate();
	d_str += ' ';

	// Hour
	if(d.getHours()<10) d_str += '0';
	d_str += d.getHours();
	d_str += ':';

	// Minute
	if(d.getMinutes()<10) d_str += '0';
	d_str += d.getMinutes();
	d_str += ':';

	// Second
	if(d.getSeconds()<10) d_str += '0';
	d_str += d.getSeconds();
	d_str += '.';

	// Milliseconds
	d_str += d.getMilliseconds();

	if(arguments.length==1)
		var l = arguments[0];
	else {
		var l = [];
		for(var i=0; i<arguments.length; i++)
			l.push(arguments[i]);
	}

	console.log('['+d_str+']', l);
}
