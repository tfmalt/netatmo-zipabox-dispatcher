/**
 * Service polling a netatmo weather station to update virtual meters and
 * sensor endpoints on a zipabox.
 *
 * @author Thomas Malt <thomas@malt.no>
 * @copyright 2017 (c) Thomas malt <thomas@malt.no>
 * @license MIT
 */

const https        = require("https");
const log          = require("winston");
const EventEmitter = require("events");
const querystring  = require("querystring");

class NetatmoController extends EventEmitter {
    /**
     * Object constructor with defaults
     */
    constructor(options = {
        interval: 10,
        verbose: false
    }) {
        super();

        if (!options.client_id  ||
            !options.client_secret &&
            !options.access_token
        ) {
            throw new Error(
                "Neccessary variables for authentication must be provided."
            );
        }

        this.options = options;
        this.tokens = {};

        log.debug("NetatmoController constructor options: ", options);
    }

    /**
     * Tell the object to start running
     */
    start() {
        log.info("Entering loop with " + this.options.interval + " second intervals.");
        this.doEveryInterval();
    }

    /**
     * Fetches the access token and stores it.
     *
     * @fires NetatmoCtrl#access_token
     */
    getAccessToken() {
        let params = {
            grant_type: this.options.grant_type,
            username: this.options.username,
            password: this.options.password,
            client_id: this.options.client_id,
            client_secret: this.options.client_secret,
            scope: ""
        };

        let options = {
            hostname: 'api.netatmo.com',
            path: '/oauth2/token',
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        };

        log.debug("  Getting access token. params:", params);

        let data = "";
        let req = https.request(options, (res) => {
            res.on("error", e => log.error("got error in response:", e.message));
            res.on("data", chunk => data += chunk);

            res.on("end", () => {
                let info = JSON.parse(data);

                log.debug("access_token:", info.access_token);

                this.tokens = info;
                this.emit("access_token", info);
            });
        });

        req.on('error', e => log.error('There is a problem with your request:', e.message));

        req.write(querystring.stringify(params));
        req.end();
    }

    /**
     * Fetch station data from netatmo and emit an event with the data
     *
     * @fires NetatmoCtrl#update
     */
    getStationData() {
        let options = {
            hostname: "api.netatmo.com",
            path: "/api/getstationsdata",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        };

        let params = querystring.stringify({
            "access_token": this.tokens.access_token
        });

        let req = https.request(options, (res) => {
            let data = "";

            res.on("error", (e) => {
                log.error("getStationData error: ", e.code, e.message);
            });

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                let station = JSON.parse(data);
                log.debug('netatmo: getStationData on end:', station);
                this.emit("update", station);
            });
        });

        req.on("error", (e) => log.error("got error: ", e.message));
        req.write(params);
        req.end();
    }


    /**
     * Running the loop
     */
    doEveryInterval() {
        if (this.tokens.hasOwnProperty("access_token")) {
            this.getStationData();
        } else {
            this.getAccessToken();
            this.on("access_token", () => {
                this.getStationData();
            });
        }

        setTimeout(() => {
            this.doEveryInterval();
        }, this.options.interval * 1000);
    }
}

module.exports = {
    "NetatmoController": NetatmoController
};
