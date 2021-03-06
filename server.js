// server.js

// Define required packages
var express    = require('express');        // Call express
var app        = express();                 // Define our app using express
var request    = require('request');        
var _          = require('underscore');

var port   = process.env.PORT || 8080;      // Set operating port
var router = express.Router();              // Get an instance of the express Router

// Test route (GET http://.../api)
router.get('/', function(req, res) {
    res.send('Napolleon, reporting for duty! Vive le sondage!');
});

// Napolleon route (GET http://.../api/napolleon)
router.get('/napolleon', function(req, res) {

    // Configuration variables ================================================
    var slackSlashToken = '4ofROgiGBbMVk1ibnDOflQVU';
    var slackWebhookURL = 'https://hooks.slack.com/services/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';
    var slackAPIToken   = 'xxxx';
    // ========================================================================


    // Return with an error if the wrong token is supplied
    if (slackSlashToken.length > 0 && req.query.token != slackSlashToken)
        return res.send('Invalid Slash Command token supplied!');

    var pollChoices      = req.query.text.split(' -');
    var pollQuestion     = pollChoices.shift();

    // Return with an error if there is no question or if there are too few/too many choices
    if (pollQuestion.substr(0,2) == ' -' || pollChoices.length < 2 || pollChoices.length > 10)
        return res.send('Please provide a question and 2-10 poll choices, like the following example:\n```/poll What is the best choice? -The first one! -Choice number two? [...]```');

    var pollChannelID    = req.query.channel_id;
    var pollChannelType  = req.query.channel_name == 'directmessage' ? 'im' : ( req.query.channel_name == 'privategroup' ? 'groups' : 'channels');
    var pollAnnouncement = req.query.user_name + ' asks: "' + pollQuestion + '"';

    // Define which emoji to use for options
    var optionEmoji = ['one','two','three','four','five','six','seven','eight','nine', 'keycap_ten'];

    // Add numbered emoji to each poll choice
    _.each(pollChoices, function(element, index, list) {
        pollChoices[index] = ':' + optionEmoji[index] + ':  ' + pollChoices[index];
    });

    // Output each poll choice on a new line
    var formattedPollChoices = pollChoices.join('\n');

    // Add poll choices as clickable reaction emoji
    var addReaction = function(emoji, timestamp) {
        request.get({
            url: 'https://slack.com/api/reactions.add',
            qs: {
                "token":     slackAPIToken,
                "name":      emoji,
                "channel":   pollChannelID,
                "timestamp": timestamp
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);
            }
        });
    };

    // Get target channel's recent history and find the poll's timestamp
    var getChannelHistory = function() {
        request.get({
            url: 'https://slack.com/api/' + pollChannelType + '.history',
            qs: {
                "token":   slackAPIToken,
                "channel": pollChannelID,
                "count":   "5"
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);
                var lastMessage   = _.findWhere(JSON.parse(body).messages, {"bot_id": "B0943D5MX"});
                var lastTimestamp = lastMessage.ts;

                _.each(pollChoices, function(element, index, list) {
                    addReaction(optionEmoji[index], lastTimestamp);
                });
            }
        });
    };

    // Post poll to the target Slack channel
    var postToSlack = function() {
        request.post({
            url: slackWebhookURL, 
            json: {
                "channel": pollChannelID,
                "attachments":[{
                    "fallback": pollAnnouncement,
                    "pretext":  pollAnnouncement,
                    "fields":[{
                        "value": formattedPollChoices,
                        "short": false
                    }]
                }]
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);
                getChannelHistory();
            }
        });
    };

    // Post the poll back to the channel it was requested from
    postToSlack();
    
});

// REGISTER ROUTES ---------------------------------------------
// Prefix all routes with /api
app.use('/api', router);

// START SERVER ================================================
app.listen(port);
console.log('The magic happens on port ' + port);