#!/usr/bin/env node

/**
 * Service polling a netatmo weather station to update virtual meters and
 * sensor endpoints on a zipabox.
 *
 * @author Thomas Malt <thomas@malt.no>
 * @copyright 2017 (c) Thomas malt <thomas@malt.no>
 * @license MIT
 */


const log     = require("winston");
const nc      = require("./lib/netatmo-connector");
const pkg     = require("./package");
const zipcfg  = require("./zipabox");
const request = require("request");

log.remove(log.transports.Console);
log.add(log.transports.Console, {
    level:       (process.env.NETATMO_VERBOSE == 1) ? "debug" : "info",
    prettyPrint: true,
    colorize:    false,
    silent:      false,
    timestamp:   false
});
log.info("Starting Netatmo Zipabox Dispatcher v" + pkg.version);
log.debug("  Log level debug");

const netatmo = new nc.NetatmoController({
    verbose:       (process.env.NETATMO_VERBOSE == 1) ? true : false,
    interval:      process.env.NETATMO_REQ_INTERVAL || 30,
    grant_type:    process.env.NETATMO_GRANT_TYPE,
    username:      process.env.NETATMO_USERNAME,
    password:      process.env.NETATMO_PASSWORD,
    client_id:     process.env.NETATMO_CLIENT_ID,
    client_secret: process.env.NETATMO_CLIENT_SECRET
});

const zip = {};
zip.sendUpdate = function(data) {
    let url = zip._getUrl(data);

    log.debug("zipabox: preparing to update -", url);
    request.get(url, (error, response, body) => {
        log.log('info', `zipabox: did update: ${response.statusCode}`, body);
        if (response.statusCode == 200) {
            netatmo.currentTemp = data.Temperature;
        }
    });
};

zip._getUrl = function (data) {
    let url = zipcfg.baseurl;

    for (let key in zipcfg.station) {
        url += "&" + zipcfg.station[key] + "=" + data.dashboard_data[key];
    }

    for (let module of data.modules) {
        log.debug("_getUrl: module:", module.module_name);
        log.debug("_getUrl: zipcfg.modules:", zipcfg.modules);
        if (zipcfg.modules.hasOwnProperty(module.module_name)) {
            let variables = zipcfg.modules[module.module_name];
            for (let key in variables) {
                url += "&" + variables[key] + "=" + module.dashboard_data[key];
            }
        }
    }

    return url;
};

netatmo.on("update", (data) => {
    log.debug("netatmo: on update data:", data);

    if (typeof(data) === "undefined") {
        log.error("netatmo: got undefined data:", data);
        return;
    }
    let room = data.body.devices[0];

    if (typeof(netatmo.currentTemp) === "undefined") {
        netatmo.currentTemp = 0;
    }

    log.info(
        "netatmo: got data from", room.module_name,
        ", new temp:", room.dashboard_data.Temperature,
        ", current temp:", netatmo.currentTemp
    );

    if (room.dashboard_data.Temperature != netatmo.currentTemp) {
        zip.sendUpdate(room);
    }
});

netatmo.start();
