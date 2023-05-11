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
		this.given_port_only = config.given_port_only || false;
		this.ip_family = config.ip_family || 0;
		this.debug = config.debug || false;
		this.request_rules = config.request_rules || false;
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

			if(node.given_port_only) {
				msg.given_port_only = node.given_port_only;
			}

			if(node.ip_family) {
				msg.ip_family = node.ip_family;
			}

			if(node.debug) {
				msg.debug = node.debug;
			}

			if(node.request_rules) {
				msg.request_rules = node.request_rules;
			}

			gamedig.query({
				'type': msg.server_type,
				'host': msg.host,
				'port': msg.port,
				'maxAttempts': msg.max_attempts,
				'socketTimeout': msg.socket_timeout,
				'attemptTimeout': msg.attempt_timeout,
				'givenPortOnly': msg.given_port_only,
				'ipFamily': msg.ip_family,
				'debug': msg.debug,
				'requestRules': msg.request_rules
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
			let availableTypesContent = fs.readFileSync(require.resolve("gamedig/games.txt"), 'utf-8')
				server_types = [];

			availableTypesContent
				.split(/\r?\n/)
				.forEach(line =>  {
					if(
						line.trim().length === 0
						|| line.trim().length === 0
						|| line.trim().startsWith('#')
					) {
						return;
					}

					// examples:
					// avp2|Aliens versus Predator 2 (2001)|gamespy1|port=27888
					// avp2010|Aliens vs. Predator (2010)|valve|port=27015

					let [game_type, game_name, game_protocol] = line.split('|');
					server_types.push({
						'name': game_name,
						'type': game_type,
						'protocol': game_protocol
					});
				});
			res.json({
				'result': 'ok',
				'server_types': server_types
			});
		});
};