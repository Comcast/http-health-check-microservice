#!/usr/bin/env node
/** 
 * Copyright 2016 Comcast Cable Communications Management, LLC 
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); 
 * you may not use this file except in compliance with the License. 
 * You may obtain a copy of the License at 
 * 
 * http://www.apache.org/licenses/LICENSE-2.0 
 * 
 * Unless required by applicable law or agreed to in writing, software 
 * distributed under the License is distributed on an "AS IS" BASIS, 
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
 * See the License for the specific language governing permissions and 
 * limitations under the License. 
 */

/**
*
* This script sets up a local web service which can be used to check to 
* see if a local web server is runing.
*
* It's intended to be as lightweight as possible, so we're not using Express
* or any other node.js modules that we don't absolutely need.
*
* Usage:
* - run this script. It will listen on port 4010 by default, or on any other port you specify.
* - Send GET requests in this format: http://localhost:4010/$PORTNUM where $PORTNUM is the port number to check
*
* For example: http://localhost:4010/8080 will check to see if a service is listening on port 8080.
*
* If there is a service listening, HTTP 200 will be returned.  Otherwise, HTTP 500 will be returned.
*
*/


var http = require("http");
ys

//
// What port are we listening on?
//
var port_listen = 4010;
if (process.argv[2]) {
	port_listen = process.argv[2];
}


/**
* Check our response from the server.
* 
*/
function checkResponse(response, port, post, uri, cb) {

	//console.log("Status code:", response.statusCode);
	var code = response.statusCode;

	var body = "";
	response.on("data", function(part) {
		body += part;
	});

	response.on("end", function() {

		console.log(util.format("Got status code %d on http://localhost:%d%s (post=%s)",
			code, port, uri, post));

		if (code == 200) {
			cb(null);

		} else {
			var error = util.format(
				"Got status code of %d on http://localhost:%d%s (post=%s) instead of 200.\n"
				+ "Body: %s",
				code, port, uri, post, body);
			cb(error);

		}

	});


} // End of checkResponse()


/**
* Test a given port and then fire the callback.
*
* @param integer port The port to rest
* 
* @param boolean post True if we're using POST instead of get
*
* @param string uri The URI to test
*
*/
function testPort(port, post, uri, cb) {

	console.log(util.format(
		"About to test port %d and URI %s (post=%s)...", 
		port, uri, post));

	var method = "GET";
	if (post) {
		method = "POST";
	}

	var request = http.get({
		host: "localhost",
		port: port,
		method: method,
		path: uri,
		}, function(response) {
			checkResponse(response, port, post, uri, cb);
		});

	request.on("error", function(error) {

		console.log(util.format(
			"Unable to connect to backend service on http://localhost:%d%s. Response: %s",
			port, uri, error));

		var error = util.format(
			"Unable to connect to backend service on http://localhost:%d%s. Response: %s",
			port, uri, error);
		cb(error);

	});

	//
	// If we're posting, send no body
	//
	if (post) {
		//request.write("");
	}

	request.end();

}


/**
* Handle requests that com einto the webserver.
*
*/
function handleRequest(request, response){

	var url = request.url;
	//console.log("URL:", url); // Debugging

	//
	// Grab the port
	//
	var port = 80;
	var uri = "/";
	var params = url.split("/");
	var post = false;

	params.shift();

	//
	// Do we have a port?  Is it POST?
	//
	if (params[0]) {
		port = params.shift();
		var last = port.length - 1;
		if (port[last] == "p") {
			post = true;
			port = port.substring(0, port.length - 1);
		}
	}

	//
	// Do we have a URI to add on?
	//
	if (params[0]) {
		//uri = "/" + params.shift();
		uri = "/" + params.join("/");
	}

	if (port != port_listen) {
	
		testPort(port, post, uri, function(results) {

			//console.log("Results", results); // Debugging
			if (results) {
				response.writeHead(503, {'Content-Type': 'text/plain'});
				response.end(results + "\n");

			} else {
				response.writeHead(200, {'Content-Type': 'text/plain'});
				response.end(util.format("Backend service on port %d is running!\n",
					port
					));

			}

			});

	} else {
		//
		// Don't let us query ourselves, that would be confusing.
		//
		response.writeHead(400, {"Content-Type": "text/plain"});
		response.end(util.format("I'm already listening on port %d, I don't need to check myself!\n",
			port_listen));

	}

} // End of handleRequest()


//
// Start up the webserver.
//
var server = http.createServer(handleRequest);
server.listen(port_listen, function(){
	console.log("Server listening on: http://localhost:%s", port_listen);
});



