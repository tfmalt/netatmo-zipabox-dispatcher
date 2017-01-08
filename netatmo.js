#!/usr/bin/env node
/**
 * Service polling a netatmo weather station to update virtual meters and 
 * sensor endpoints on a zipabox.
 *
 * @author Thomas Malt <thomas@malt.no>
 * @copyright 2017 (c) Thomas malt <thomas@malt.no>
 * @licence MIT
 */


const log          = require('logging');
const NetatmoCtrl  = require('./lib/NetatmoCtrl');
const pkg          = require('./package');
const zipcfg       = require('./zipabox');
const request      = require('request');

log("Starting Netatmo Zipabox Dispatcher v" + pkg.version);
log(zipcfg);

const netatmo = new NetatmoCtrl({
    verbose:       (process.env.NETATMO_VERBOSE == 1) ? true : false,
    interval:      process.env.NETATMO_INTERVAL || 30,
    grant_type:    process.env.NETATMO_GRANT_TYPE,
    username:      process.env.NETATMO_USERNAME,
    password:      process.env.NETATMO_PASSWORD,
    client_id:     process.env.NETATMO_CLIENT_ID,
    client_secret: process.env.NETATMO_CLIENT_SECRET 
});

const zip = {};
zip.sendUpdate = function (data) {
    let url = zipcfg.baseurl + "&" + 
        zipcfg.Temperature + "=" + data.Temperature + "&" +
        zipcfg.Pressure + "=" + data.Pressure + "&" +
        zipcfg.Noise + "=" + data.Noise + "&" +
        zipcfg.Humidity + "=" + data.Humidity + "&" + 
        zipcfg.CO2 + "=" + data.CO2;

    log(url);
};


netatmo.start();
netatmo.on("update", (data) => {
    let room = data.body.devices[0];
    log("got data:", room.module_name, room.dashboard_data);
    zip.sendUpdate(room.dashboard_data);
});


