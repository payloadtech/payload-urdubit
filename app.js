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
                    console.log(beat.Latency);
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
      console.log(logged);
        console.log('logged in');
    });
