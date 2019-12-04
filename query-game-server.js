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
        	var serverInfo = {
        		'type': node.server_type,
        		'host': node.host
        	};

        	if(node.port) {
        		serverInfo['port'] = node.port;
        	}

        	if(msg.server_type) {
        		serverInfo['type'] = msg.server_type;
			}

			if(msg.host) {
				serverInfo['host'] = msg.host;
			}

			if(msg.port) {
				serverInfo['port'] = msg.port;
			}

			Gamedig.query(serverInfo)
				.then(function(state) {
					msg.payload = 'online';
					msg.data = state;
		            if (msg.payload === node.halt_if) {
		                return null;
		            }
	            	node.send(msg);
				}).catch(function(error) {
					msg.payload = 'offline';
					msg.data = {
						'error': error
					};
		            if (msg.payload === node.halt_if) {
		                return null;
		            }
	            	node.send(msg);
				});
        });
    }
    RED.nodes.registerType("query-game-server", QueryGameServer);
};