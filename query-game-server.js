module.exports = function(RED) {
	const gamedig = require('gamedig');
	const fs = require('fs');

    function QueryGameServer(config) {
        RED.nodes.createNode(this, config);
		let node = this;
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
		this.output_options = config.output_options || false;
        node.on('input', function(msg) {
			let options = {
				'type': node.server_type || msg.server_type || undefined,
				'host': node.host || msg.host || undefined,
				'port': node.port || msg.port || undefined,
				'maxAttempts': node.max_attempts || msg.max_attempts || undefined,
				'socketTimeout': node.socket_timeout || msg.socket_timeout || undefined,
				'attemptTimeout': node.attempt_timeout || msg.attempt_timeout || undefined,
				'givenPortOnly': node.given_port_only || msg.given_port_only || undefined,
				'ipFamily': node.ip_family || msg.ip_family || undefined,
				'debug': node.debug || msg.config || undefined,
				'requestRules': node.request_rules || msg.request_rules || undefined
			};

			if(typeof msg.options === 'object' && msg.options)
			{
				options = {...options, ...msg.options};
			}

			// set the things we want to return
			msg.server_type = options.type;
			msg.host = options.host;
			msg.port = options.port;
			if(node.output_options)
			{
				msg.options = options;
			}

			if(!options.host) {
				node.error("host missing from input.");
				return;
			}

			if(!options.type) {
				node.error("server_type missing from input.");
				return;
			}

			gamedig.query(options)
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