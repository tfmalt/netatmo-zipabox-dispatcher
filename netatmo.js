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
const EventEmitter = require('events');
const querystring  = require('querystring');


class NetatmoCtrl extends EventEmitter {
    constructor() {
        super();
        this.interval = process.env.NETATMO_REQ_INTERVAL || 10;
        this.tokens = {};
    }

    /**
     * Tell the object to start running
     */
    start() {
        log("Entering loop with " + this.interval + " second intervals.");
        this.doEveryInterval();    
    }

    /**
     * Fetches the access token and stores it.
     */
    getAccessToken() {

        let that = this;
        
        let params = {
            'grant_type': process.env.NETATMO_GRANT_TYPE,
            'username': process.env.NETATMO_USERNAME,
            'password': process.env.NETATMO_PASSWORD,
            'client_id': process.env.NETATMO_CLIENT_ID,
            'client_secret': process.env.NETATMO_CLIENT_SECRET,
            'scope': ""
        };

        let options = {
            hostname: 'api.netatmo.com',
            path: '/oauth2/token',
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"

            }
        };

        let data = "";
        log("  Getting access token");
        
        let req = https.request(options, (res) => {
            res.on("error", function (e) {
                log("got error in response:", e);
            });

            res.on("data", function (chunk) {
                data += chunk;
            });

            res.on("end", function () {
                let info = JSON.parse(data);
                log("    access_token:", info.access_token);
                that.tokens = info;
                that.emit('got_access_tokens', info);
            });
        });

        req.on('error', function(e) {
            log('There is a problem with your request:', e);
        });

        req.write(querystring.stringify(params));
        req.end();
    }


    getStationData() {
        let that = this;

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
                console.log("error: ", e.code, e.message);
            });

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                let station = JSON.parse(data);
            
                that.emit("update", station); 
            });

        });

        req.on("error", (e) => {
            log("got error: ", e.message);
        });

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
        }

        let that = this;
        setTimeout(function () {
            that.doEveryInterval();
        }, this.interval * 1000);
    }
};



log("Starting Netatmo Thermostat");

let netatmo = new NetatmoCtrl;
netatmo.start();

netatmo.on("update", (data) => {
    let room = data.body.devices[0]
    log("got data:", room.module_name, room.dashboard_data);
});


