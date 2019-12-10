var Gamedig = require('gamedig');

module.exports = function(RED) {
    function QueryGameServer(config) {
        RED.nodes.createNode(this, config);
        this.server_type = config.server_type;
		this.host = config.host;
		this.port = config.port;
		this.halt_if = config.halt_if;
		this.max_attempts = config.max_attempts || 1;
		this.socket_timeout = config.socket_timeout || 2000;
		this.attempt_timeout = config.attempt_timeout || 10000;
        var node = this;
        node.on('input', function(msg) {

        	if(node.server_type) {
				msg.server_type = node.server_type;
			}

			if(node.host) {
				msg.host = node.host;
			}

        	if(node.port) {
        		msg.port = node.port;
        	}

        	if(node.halt_if) {
        		msg.halt_if = node.halt_if;
			}

        	if(node.max_attempts) {
        		msg.max_attempts = node.max_attempts;
			}

			if(node.socket_timeout) {
				msg.socket_timeout = node.socket_timeout;
			}

			if(node.attempt_timeout) {
				msg.attempt_timeout = node.attempt_timeout;
			}

			Gamedig.query({
				'type': msg.server_type,
				'host': msg.host,
				'port': msg.port,
				'maxAttempts': msg.max_attempts,
				'socketTimeout': msg.socket_timeout,
				'attemptTimeout': msg.attempt_timeout
			})
				.then(function(state) {
					msg.payload = 'online';
					msg.data = state;
		            if (msg.payload === msg.halt_if) {
		                return null;
		            }
                    node.status({fill:"green",shape:"dot",text: 'Online ' + msg.data.players.length + ' players' });
                    node.send(msg);
				}).catch(function(error) {
					msg.payload = 'offline';
					msg.data = {
						'error': error
					};
		            if (msg.payload === msg.halt_if) {
		                return null;
		            }
                    node.status({fill:"red", shape:"dot", text: 'Offline'});
                node.send(msg);
				});
        });
    }
    RED.nodes.registerType("query-game-server", QueryGameServer);
};