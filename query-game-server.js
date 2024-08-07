module.exports = function(RED) {
	const { GameDig, games } = require('gamedig');

    function QueryGameServer(config) {
        RED.nodes.createNode(this, config);
		let node = this;
		this.halt_if = config.halt_if;
		this.output_options = config.output_options || false;
        node.on('input', function(msg) {
			let options = {
				'type': config.server_type || msg.server_type || undefined,
				'host': config.host || msg.host || undefined,
				'address': config.address || msg.address || undefined,
				'port': config.port || msg.port || undefined,
				'maxAttempts': config.max_attempts || msg.max_attempts || 1,
				'socketTimeout': config.socket_timeout || msg.socket_timeout || 2000,
				'attemptTimeout': config.attempt_timeout || msg.attempt_timeout || 10000,
				'givenPortOnly': config.given_port_only || msg.given_port_only || false,
				'ipFamily': config.ip_family || msg.ip_family || undefined,
				'debug': config.debug || msg.config || undefined,
				'requestRules': config.request_rules || msg.request_rules || undefined,
				'strip_colors': typeof config.strip_colors === "undefined" ? true : config.strip_colors
			};

			if(typeof msg.options === 'object' && msg.options)
			{
				options = {...options, ...msg.options};
			}

			// set the things we want to return
			msg.server_type = options.type;
			if(options.host) {
				msg.host = options.host;
			}
			if(options.address) {
				msg.address = options.address;
			}
			msg.port = options.port;
			if(node.output_options)
			{
				msg.options = options;
			}

			if(!msg.host && !msg.address) {
				node.error("host/address missing from input.");
				return;
			}

			if(!options.type) {
				node.error("server_type missing from input.");
				return;
			}

			GameDig.query(options)
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
		RED.auth.needsPermission('flows.write'),
		function(req, res) {
			console.log(games);
			let server_types = Object.keys(games).map(gameKey => {
				let game = games[gameKey];
				game["type"] = gameKey;
				return game;
			});

			res.json({
				'result': 'ok',
				'server_types': server_types
			});
		}
	);
};