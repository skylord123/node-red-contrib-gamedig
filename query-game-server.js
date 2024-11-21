module.exports = function(RED) {
	const { GameDig, games } = require('gamedig');

	function deepCloneToPlain(obj) {
		// Handle null/undefined
		if (!obj) {
			return obj;
		}

		// Handle arrays and array-like objects (including Players collection)
		if (Array.isArray(obj) || (typeof obj === 'object' && obj.length >= 0)) {
			return Array.from(obj, item => deepCloneToPlain(item));
		}

		// Handle instances of custom classes (like Player, Results)
		if (obj && typeof obj === 'object' && Object.getPrototypeOf(obj) !== Object.prototype) {
			// Convert to plain object while preserving enumerable properties
			const plainObj = {};
			for (const key of Object.keys(obj)) {
				plainObj[key] = deepCloneToPlain(obj[key]);
			}
			return plainObj;
		}

		// Handle plain objects
		if (obj && typeof obj === 'object') {
			const result = {};
			for (const key of Object.keys(obj)) {
				// Skip the Buffer instance
				if (key === 'rulesBytes' && Buffer.isBuffer(obj[key])) {
					continue;
				}
				result[key] = deepCloneToPlain(obj[key]);
			}
			return result;
		}

		// Return primitive values as-is
		return obj;
	}

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
					try {
						msg.payload = 'online';
						// GameDig returns Results, Players, and Player objects that we need to convert
						// to standard Array/Object instances so that Node-RED doesn't error
						console.log("RESULT", state);
						msg.data = deepCloneToPlain(state);
						console.log("FORMATTED", msg.data);

						if (msg.payload === node.halt_if) {
							return null;
						}
						node.status({ fill: "green", shape: "dot", text: `Online ${state.players.length} players` });
						node.send(msg);
					} catch(e) {
						node.error("Failed returning data: " + e.stack);
					}
				})
				.catch(function(error) {
					msg.payload = 'offline';
					msg.data = {
						error,
						stack: error.stack,
					};
					if (msg.payload === node.halt_if) {
						return null;
					}
					node.status({ fill: "red", shape: "dot", text: "Offline" });
					node.send(msg);
					node.error(`GameDig Error: \n${error.stack}`);
					console.error(error);
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