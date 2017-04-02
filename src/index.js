'use strict';

/**
 * Initiate necessary libraries.
 */
const config = require('./config');
const Botkit = require('botkit/lib/Botkit.js');
const uprisebot = Botkit.slackbot({
    debug: false
});
const ManagerModel = require('./models/manager');


/**
 * Instantiate uprisebot.
 */
new ManagerModel(uprisebot);

/**
 * Spawn uprisebot and connect to Slack server.
 */
uprisebot
    .spawn({
        token: config.get('token')
    })
    .startRTM((err, bot, payload) => {
        if (err) return console.error('Error: ', err);
    });
