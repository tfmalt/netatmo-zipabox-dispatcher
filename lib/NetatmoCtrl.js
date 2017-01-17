/**
 * Service polling a netatmo weather station to update virtual meters and
 * sensor endpoints on a zipabox.
 *
 * @author Thomas Malt <thomas@malt.no>
 * @copyright 2017 (c) Thomas malt <thomas@malt.no>
 * @licence MIT
 */


const https        = require("https");
const log          = require("logging");
const EventEmitter = require("events");
const querystring  = require("querystring");


class NetatmoCtrl extends EventEmitter {
    /**
     * Object constructor with defaults
     */
    constructor(options = {
        interval: 10,
        verbose: false
    }) {
        super();

        if (
            !options.hasOwnProperty("client_id") ||
            !options.hasOwnProperty("client_secret") &&
            !options.hasOwnProperty("access_token")) {
            throw new Error(
                "Neccessary variables for authentication must be provided."
            );
        }

        this.options = options;
        this.tokens = {};

        if (this.options.verbose) {
            log("options: ", options);
        }
    }

    /**
     * Tell the object to start running
     */
    start() {
        if (this.options.verbose) {
            log(
                "Entering loop with " +
                this.options.interval +
                " second intervals."
            );
        }
        this.doEveryInterval();
    }

    /**
     * Fetches the access token and stores it.
     *
     * @fires NetatmoCtrl#access_token
     */
    getAccessToken() {
      let params = {
            grant_type:    this.options.grant_type,
            username:      this.options.username,
            password:      this.options.password,
            client_id:     this.options.client_id,
            client_secret: this.options.client_secret,
            scope:         ""
        };

        let options = {
            hostname: 'api.netatmo.com',
            path:     '/oauth2/token',
            method:   'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        };

        if (this.options.verbose) {
            log("  Getting access token");
        }

        let data = "";
        let req = https.request(options, (res) => {
            res.on("error", e => log("got error in response:", e));
            res.on("data", chunk => data += chunk);

            res.on("end", () => {
                let info = JSON.parse(data);

                if (this.options.verbose) {
                    log("    access_token:", info.access_token);
                }

                this.tokens = info;
                this.emit("access_token", info);
            });
        });

        req.on('error', e => log('There is a problem with your request:', e));

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
            path:     "/api/getstationsdata",
            method:   "POST",
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
                console.log("error: ", e.code, e.message);
            });

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                let station = JSON.parse(data);

                /**
                 * Received update event
                 *
                 * @event NetatmoCtrl#update
                 * @type {object}
                 * @property {object} station - station data in json format
                 */
                this.emit("update", station);
            });

        });

        req.on("error", (e) => log("got error: ", e.message));
        req.write(params);
        req.end();
    }


    /**
     * Running the loop
     */
    doEveryInterval() {
        if (this.tokens.hasOwnProperty("access_token")) {
            this.getStationData();
        }
        else {
            this.getAccessToken();
            this.on("access_token", (info) => {
                this.getStationData();
            });
        }

        setTimeout(() => {
            this.doEveryInterval();
        }, this.options.interval * 1000);
    }
}

module.exports = NetatmoCtrl;
