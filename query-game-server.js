module.exports = function(RED) {
	const gamedig = require('gamedig');
	const fs = require('fs');

    function QueryGameServer(config) {
        RED.nodes.createNode(this, config);
		var node = this;
        this.server_type = config.server_type;
		this.host = config.host;
		this.port = config.port;
		this.halt_if = config.halt_if;
		this.max_attempts = config.max_attempts || 1;
		this.socket_timeout = config.socket_timeout || 2000;
		this.attempt_timeout = config.attempt_timeout || 10000;
        node.on('input', function(msg) {
        	if(node.server_type) {
				msg.server_type = node.server_type;
			}

			if(node.host) {
				msg.host = node.host;
			}
			if(!msg.host) {
				node.error("msg.host missing from input.");
				return;
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

			gamedig.query({
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

	RED.httpAdmin.get(
		"/gamedig/types",
		RED.auth.needsPermission('gamedig.types'),
		function(req, res) {
			// gamedig has no way of listing available server types
			// so we just use regex to parse the info from the README
			// this could break so we also reference the gamedig repo
			let availableTypes = fs.readFileSync(require.resolve("gamedig/README.md"))
					.toString()
					.matchAll(/^\| `(.*)` * \| ([a-zA-Z: (0-9)\-'.]*)/gm),
				results = {};

			for (const match of availableTypes) {
				if(match[1].indexOf("`<br>`") >= 0) {
					let names = match[1].split("`<br>`");
					results[names[0]] = match[2];
					results[names[1]] = match[2];
				} else {
					results[match[1]] = match[2];
				}
			}
			res.json(results);
		});
};