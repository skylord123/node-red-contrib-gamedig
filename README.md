# node-red-contrib-gamedig

Query for the status of most game/voice servers using Node-RED.

This package adds the node "Query Game Server" that uses the NPM package [GameDig](https://www.npmjs.com/package/gamedig) to query if a server is online or not and if so returns the data of the server.

You can pass the server type, host, and port on the input message or define them on the node (settings defined on the node will override msg values).

### Usage Examples
#### Inserting query data into InfluxDB and using Grafana to view results
![Flow Preview](https://skylar.tech/content/images/2019/12/image-2.png)
I created a post on my website about how to use this node to query gameservers and store the results in InfluxDB. I then give a dashboard in Grafana that can be used to display the data. Check it out here:
https://skylar.tech/tracking-game-server-statistics-using-node-red-influxdb-and-grafana/

### Other Packages

- [node-red-contrib-matrix-chat](https://www.npmjs.com/package/node-red-contrib-gamedig) - Matrix chat server client for Node-RED

### Developers
So far me (skylord123) is the only person that has contributed towards this package. Feel free to do any pull-requests to get your name here!

### License
This project is licensed under the MIT License. Check [here](LICENSE) for more information.
