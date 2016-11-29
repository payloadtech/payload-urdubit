// Setup express
var express = require('express');
var app = express();
var bodyParser = require('body-parser')
var port = process.env.PORT || 3000;

// Setup request
var request = require('request');
var appWebhookUrl = 'https://app.payload.pk/notifications/urdubit';
var appWebhookSecret = process.env.SECRET;

var sendNotification = function sendNotification(type, object) {
    // send a webhook to the app about a block being found
    request({
        url: appWebhookUrl,
        method: 'POST',
        qs: {
            secret: appWebhookSecret
        },
        json: {
            type: type,
            payload: object
        }
    }, function(error, postResponse, body) {
        if (error) logger.error(error);
        logger.info(postResponse, 'Successfully contacted the app');
    });

};

// Setup BlinkTrade
var BlinkTrade = require('blinktrade');
var BlinkTradeWS = BlinkTrade.BlinkTradeWS;
var blinktrade = new BlinkTradeWS({
    prod: true
});

var heartbeats = require('heartbeats');
var heart = heartbeats.createHeart(20000);

// Setup Secret
var secret = process.env.SECRET;

// Setup the logger

var winston = require('winston');

//
// Requiring `winston-papertrail` will expose
// `winston.transports.Papertrail`
//
require('winston-papertrail').Papertrail;

var winstonPapertrail = new winston.transports.Papertrail({
    host: process.env.PAPERTRAIL_HOST,
    port: process.env.PAPERTRAIL_PORT,
    program: 'payload-urdubit'
});

winstonPapertrail.on('error', function(err) {
    // Handle, report, or silently ignore connection errors and failures
});

if (process.env.NODE_ENV === 'production') {

    var logger = new winston.Logger({
        transports: [winstonPapertrail]
    });

} else {
    var logger = new winston.Logger({
        level: 'info',
        transports: [new(winston.transports.Console)()]
    });

}


logger.info('Starting script');


// setup the express app
app.use(bodyParser.json());

app.use(function(req, res, next) {
    // if the secret is correct skip to the next route;
    if (req.query.secret === secret) {
        next();
    } else {
        res.json({
            message: 'Wtf? Are you high?',
            status: '420'
        });
    }
});

app.post('/order', function(req, res) {
    var amount = req.body.amount;
    logger.info(amount);
    // send an order
    blinktrade.sendOrder({
        "side": "2", // Sell
        "price": parseInt(1 * 1e8), // 1 PKR
        "amount": parseInt(amount),
        "symbol": "BTCPKR",
    }).then(function(order) {
        // respond with the order information
        res.json(order);
    }).catch(function(err) {
        logger.info(err);
    });
});

app.post('/withdraw', function(req, res) {
    var amount = parseInt(req.body.amount);
    var bankName = req.body.bank_name;
    var accountNumber = req.body.account_number;
    var accountTitle = req.body.account_title;
    var cnicNumber = req.body.cnic_number;
    var mobileNumber = req.body.mobile_number;
    // withdrawal options
    options = {
        "amount": parseInt(amount * 1e8),
        "currency": "PKR",
        "method": "Other",
        "data": {
            "Name": accountTitle,
            "AccountNumber": accountNumber,
            "BankName": bankName,
            "CNIC": cnicNumber,
            "Mobile": mobileNumber
        }
    };
    // request a withdraw
    logger.info(options);
    blinktrade.requestWithdraw(options).then(function(withdrawal) {
            logger.info(withdrawal);
            res.json(withdrawal);
        })
        .catch(function(err) {
            logger.error(err);
        });
});

app.get('/', function(req, res) {
    res.json({
        message: 'nothing here'
    });
});
// setup the blinktrade behavior
blinktrade
    .connect()
    // run a heartbeat
    .then(function() {
        // every heartbeat, run log the heart
        return heart.createEvent(1, function(heartbeat, last) {
            blinktrade.heartbeat()
                .then(function(beat) {
                    logger.info('Beat ' + heart.age + ' took ' + beat.Latency + ' ms to return');
                });
        });
    })
    // authenticate
    .then(function() {
        return blinktrade.login({
            "BrokerID": 8, // Urdubit
            "username": process.env.BLINKTRADE_API_KEY, // API key
            "password": process.env.BLINKTRADE_API_PASSWORD, // API password
        });
    })
    .then(function(logged) {
        // logger.info(logged);
        logger.info('logged in');

        // listing to execution reports
        blinktrade.executionReport()
            .on("EXECUTION_REPORT:NEW", function(data) {
                logger.debug(data);
            }).on("EXECUTION_REPORT:PARTIAL", function(data) {
                logger.debug(data);
            }).on("EXECUTION_REPORT:EXECUTION", function(data) {
                logger.info(data);
                sendNotification('EXECUTION_REPORT', data);
            }).on("EXECUTION_REPORT:CANCELED", function(data) {
                logger.debug(data);
            }).on("EXECUTION_REPORT:REJECTED", function(data) {
                logger.debug(data);
            });

        blinktrade.onWithdrawRefresh(function(withdraw) {
            logger.info(withdraw);
            sendNotification('WITHDRAW_REFRESH', withdraw);
        });


        app.listen(port, function() {
            logger.info('HTTP server running on PORT ' + port);
        });
    }).catch(function(err) {
        logger.error(err);
    });
