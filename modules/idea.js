var require_install = require('require-install'),
    request = require_install('request');


exports.match = function(text) {
    return text.startsWith(this.platform.commandPrefix + 'idea');
};

exports.help = function() {
    return this.platform.commandPrefix + 'idea: Generates an idea for your next StartUp.';
};

exports.idea = function (callback) {
    request.get('http://itsthisforthat.com/api.php?json', function(error, response, body) {
        if (response.statusCode === 200 && response.body) {
            var idea = JSON.parse(response.body);

            if (idea) {
                callback(idea.this + '\nfor\n' + idea.that);
            }
            else {
                callback({error:'Well that was unexpected, api did not return an idea.'});
            }
        }
        else {
            callback({error:'Whomever the system admin is around here, I demand that they should be fired.'});
        }
    });
};

exports.run = function(api, event) {
    exports.idea(function(result) {
        api.sendMessage(result, event.thread_id);
    });
};