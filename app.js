// Setup express
var express = require('express');
var app = express();
var port = process.env.PORT || 3000;

// Setup BlinkTrade
var BlinkTrade = require('blinktrade');
var BlinkTradeWS = BlinkTrade.BlinkTradeWS;
var blinktrade = new BlinkTradeWS({
    prod: true
});

var heartbeats = require('heartbeats');
var heart = heartbeats.createHeart(1000);

console.log('Starting script');

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


        // blinktrade.sendOrder({
        //     "side": "2", // Sell
        //     "price": parseInt(1), // 1 PKR
        //     "amount": parseInt((0.00505400 * 1e8).toFixed(0)),
        //     "symbol": "BTCPKR",
        // }).then(function(order) {
        //   console.log(order);
        //     // Sent
        // }).catch(function(err) {
        //   console.log(err);
        // });

        blinktrade.requestWithdraw({
            "amount": parseInt(1200 * 1e8),
            "currency": "PKR",
            "method": "BankIslami",
            "data": {
                "AccountName": "A Girl Is No One",
                "AccountNumber": "123477",
                "Fees": "2"
            }
        });


        app.listen(port, function() {
            console.log('HTTP server running');
        });
    });



// // just having some fun
// app.get('/', function(req, res) {
//     res.json({
//         message: 'Wtf? Are you high?',
//         status: '420'
//     });
// });

// app.post('/trades', function(req, res) {
//
// })
