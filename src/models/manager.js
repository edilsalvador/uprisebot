'use strict';

const Meeting = require('./meeting');
const config = require('../config');
const Channel = require('./channel');

class manager {

    /**
     * @constructor
     * @param  {Object} uprisebot
     */
    constructor(uprisebot) {
        this.meetings = {};
        this.uprisebot = uprisebot;
        this.bindEvents_();
    }


    /**
     * meetingExist - Check if a meeting is ongoing.
     *
     * @param  {String} channelId
     * @return {boolean}
     */
    meetingExist(channelId) {
        return this.meetings[channelId];
    }


    /**
     * create - Creates a meeting.
     *
     * @param  {String} channelId
     * @return {Meeting}
     */
    create(channelId) {
        let meeting = new Meeting(channelId);
        this.meetings[channelId] = meeting;
        return meeting;
    }


    /**
     * destroy - Destroys an existing meeting.
     *
     * @param  {String} channelId
     */
    destroy(channelId) {
        delete this.meetings[channelId];
    }

    /**
     * @private
     *
     * bindEvents_ - Bind interval events.
     */
    bindEvents_() {
        let self = this;

        this.uprisebot
            .hears(['start'], 'ambient', (bot, message) => {
                let channelId = message.channel;

                /**
                 * TODO: After storage implementation get rid of this.
                 */
                let meeting = self.meetingExist(channelId);
                if (meeting && !meeting.isActive)
                    self.destroy(channelId);

                if (meeting)
                    return bot.reply(message,
                        'Sorry, there is an existing meeting in this channel');

                meeting = self.create(channelId);
                let channel = new Channel(self.uprisebot);



                channel
                    .getMembers(channelId)
                    .then((members) => {
                        meeting.setMembers(members);
                        channel
                            .getChannelInfo(channelId)
                            .then((info) => {
                                meeting.setName(info.name);
                                bot.say({
                                    text: 'Good day <#' + info.id +
                                        '>, let\'s start the standup meeting!',
                                    channel: channelId,
                                    link_names: 1,
                                    parse: 'full'
                                });
                                
                                return meeting.start(bot, message);
                            });
                    })
                    .then(() => {
                        self.destroy(channelId);
                    })
                    .catch((err) => {
                        console.error('Error', err);
                    });
            });

        this.uprisebot
            .hears(['status'], 'direct_mention', (bot, message) => {
                bot.reply(message, 'Active meetings are ' +
                    JSON.stringify(self.meetings));
            });

        this.uprisebot
            .hears(['skip', 'dismiss'], 'ambient', (bot, message) => {
                let meeting = self.meetings[message.channel];

                if (!meeting) return;

                meeting.emit(message.text);
            });

        this.uprisebot
            .hears(['quit'], 'ambient', (bot, message) => {
                let meeting = self.meetings[message.channel];

                if (!meeting) return;

                meeting.emit(message.text);
                self.destroy(message.channel);
            });

    }
}

module.exports = manager;
