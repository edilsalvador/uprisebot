'use strict';

const _ = require('lodash');
const MailerModel = require('./mailer');
const config = require('../config');
const async = require('async');
const EventEmitter = require('events').EventEmitter;

class meeting extends EventEmitter {

    /**
     * @constructor
     *
     * @param  {String} channelId
     */
    constructor(channelId) {
        super();
        this.channelId = channelId;
        this.channelName = '';
        this.answers = [];
        this.isActive = true;
    }

    setMembers(members) {
        this.members = members;
    }

    setName(name) {
        this.channelName = name;
    }

    finish(){
        this.isActive = false;
    }

    /**
     * start - Start the questions and conversations
     *
     * @param  {Object} bot
     * @param  {String} message
     * @return {Promise}
     */
    start(bot, message) {
        this.questions = config.get('questions:' + this.channelName) || config.get('questions:default');
        let self = this;
        let memberCount = 0;
        let reciever = '';

        return new Promise((resolve, reject) => {
            async.whilst(() => {
                return memberCount < self.members.length
            },

            (callback) => {
                let member = self.members[memberCount];
                message.user = member.id;

                if(!self.isActive)
                    return;
                bot.startConversation(message, (err, convo) => {
                    let userAnswers = [];
                    convo.say('Hello <@' + member.id +
                        '>, it is your turn now.');

                    let skipMember = () => {
                        self.members.push(member);
                        convo.stop();
                    };

                    let dismissMember = () => {
                        userAnswers.push({
                            question: "Status: ",
                            answer: "Dismissed",
                            createdAt: Date.now()
                        });
                        self.answers.push({
                                member: member,
                                answer: userAnswers
                        });
                        convo.stop();
                    };

                    let quitConversation = () => {
                        bot.say({
                            text: 'Meeting is over',
                            channel: self.channelId
                        });

                        self.finish();
                        convo.stop();
                    };

                    self.once('skip', skipMember)
                        .once('dismiss', dismissMember)
                        .once('quit', quitConversation);

                    _.forEach(self.questions, (question, index) => {

                        convo.ask(self.questions[index], (msg, convo) => {

                            switch (msg.text) {
                                case 'skip':
                                    self.emit('skip'); break;
                                case 'dismiss':
                                    self.emit('dismiss'); break;
                                case 'quit':
                                    self.emit('quit'); break;
                            }

                            userAnswers.push({
                                question: question,
                                answer: msg.text,
                                createdAt: Date.now()
                            });

                            convo.next();
                        });

                        
                    });

                    convo.say('Thank you <@' + member.id + '>');

                    convo.on('end', (convo) => {
                        if (convo.status != 'stopped')
                            self.answers.push({
                                member: member,
                                answer: userAnswers
                            });

                        self.removeListener('skip', skipMember)
                            .removeListener('dismiss', dismissMember)
                            .removeListener('quit', quitConversation);

                        memberCount++;
                        callback();
                    });
                });
            }, (err) => {
                if(err) return reject(err);

                let getRecievers = () => {
                    reciever = '';
                    self.answers.forEach((answer) => {
                        reciever += answer.member.profile.email + ", ";
                    });
                       return (reciever.slice(0, -2));
                };

                bot.say({
                    text: 'Meeting has ended. Results are mailed to ' +
                        getRecievers(),
                    channel: self.channelId
                });

                let mailContent = MailerModel.mailify(self.answers, this.channelName);
                let mailSender = new MailerModel(mailContent, getRecievers());
                mailSender.send();
                resolve();
            });
        });
    }
};


module.exports = meeting;