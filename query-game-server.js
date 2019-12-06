var Gamedig = require('gamedig');

module.exports = function(RED) {
    function QueryGameServer(config) {
        RED.nodes.createNode(this, config);
        this.server_type = config.server_type;
		this.host = config.host;
		this.port = config.port;
		this.halt_if = config.halt_if;
        var node = this;
        node.on('input', function(msg) {

        	if(node.server_type) {
				msg.host = node.server_type;
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

			Gamedig.query({
				'type': msg.server_type,
				'host': msg.host
			})
				.then(function(state) {
					msg.payload = 'online';
					msg.data = state;
		            if (msg.payload === msg.halt_if) {
		                return null;
		            }
	            	node.send(msg);
				}).catch(function(error) {
					msg.payload = 'offline';
					msg.data = {
						'error': error
					};
		            if (msg.payload === msg.halt_if) {
		                return null;
		            }
	            	node.send(msg);
				});
        });
    }
    RED.nodes.registerType("query-game-server", QueryGameServer);
};