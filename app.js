// Setup express
var express = require('express');
var app = express();
var bodyParser = require('body-parser')
var port = process.env.PORT || 3000;

// Setup BlinkTrade
var BlinkTrade = require('blinktrade');
var BlinkTradeWS = BlinkTrade.BlinkTradeWS;
var blinktrade = new BlinkTradeWS({
    prod: true
});

var heartbeats = require('heartbeats');
var heart = heartbeats.createHeart(1000);

// Setup Secret
var secret = process.env.SECRET;

console.log('Starting script');


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
    console.log(amount);
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
        console.log(err);
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
        // every heartbeat, run a heartbeat
        return heart.createEvent(1, function(heartbeat, last) {
            blinktrade.heartbeat()
                .then(function(beat) {
                    console.log('Beat ' + heart.age + ' took ' + beat.Latency + ' ms to return');
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
        // console.log(logged);
        console.log('logged in');

        // listing to execution reports
        blinktrade.executionReport()
            .on("EXECUTION_REPORT:NEW", function(data) {
                console.log(data);
            }).on("EXECUTION_REPORT:PARTIAL", function(data) {
                console.log(data);
            }).on("EXECUTION_REPORT:EXECUTION", function(data) {
                console.log(data);
            }).on("EXECUTION_REPORT:CANCELED", function(data) {
                console.log(data);
            }).on("EXECUTION_REPORT:REJECTED", function(data) {
                console.log(data);
            });

        app.listen(port, function() {
            console.log('HTTP server running on PORT ' + port);
        });
        // blinktrade.requestWithdraw({
        //     "amount": parseInt(1200 * 1e8),
        //     "currency": "PKR",
        //     "method": "BankIslami",
        //     "data": {
        //         "AccountName": "A Girl Is No One",
        //         "AccountNumber": "123477",
        //         "Fees": "2"
        //     }
        // });
        //
        //
    }).catch(function(err) {
        console.error(err);
    });
