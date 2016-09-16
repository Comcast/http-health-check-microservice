
# HTTP Health Check Microservice

**The problem:** You're running a web service which does not have a health check built in.  (Example: [Apache Nifi](http://nifi.apache.org/))
Worse yet, the web service doesn't accept GET requests, so you can't just proxy an endpoint to it.

**The solution:** This script.  It is a self-contained node.js script with no external dependencies.
It will listen on a port and test HTTP connections to other TCP ports on localhost. If the connection
succeeds, it returns HTTP 200. Otherwise, it returns HTTP 500.

This has been successfully used in production by the Data Analytics team.

## Pre-requisites

- Node.js


## Starting the microservice on the CLI

`./http-health-check-server.js [ port ] `

- port: The TCP port to listen on


## Using the microservice

The format for using the microservice is: `http://localhost:$PORT/$PORT_TO_TEST[p][/$URI/TO/TEST]`

- `$PORT` is the port this microservice is running on (default 4010)
- `$PORT_TO_TEST` is the port on the localhost to test
- `p` - If specified, send a POST request instead of a GET request
- `$URI/TO/TEST` an optional URI to test against.  Slashes are allowed.

### Examples

Connecting to a service which is down (an HTTP 503 is also returned):
```
$ curl localhost:4010/1234
Unable to connect to backend service on http://localhost:1234/. Response: Error: connect ECONNREFUSED 127.0.0.1:1234
```

Connect to a service which is up (an HTTP 200 is returned):
```
$ curl localhost:4010/8080
Backend service on port 8080 is running!
```

Connect to a service which returns a 302 (we'll return an HTTP 503, since this is a non-200 repsonse):
```
$ curl localhost:4010/8080/nifi
Got status code of 302 on http://localhost:8080/nifi (post=false) instead of 200. Body:
```

Connect to a service which returns a 404 (in which case we'll return a 503):
```
$ curl localhost:4010/4000/
Got status code of 404 on http://localhost:4000/ (post=false) instead of 200. Body: <html>
<head>
<meta http-equiv="Content-Type" content="text/html;charset=ISO-8859-1"/>
```

Let's assume we have a service listening on port 4000 with the URI of `/create`,
but it does not accept GET requests.  Let's try proxying a GET to it:
```
$ curl localhost:4010/4000/create
Got status code of 405 on http://localhost:4000/create (post=false) instead of 200. Body: <html>
<head>
<meta http-equiv="Content-Type" content="text/html;charset=ISO-8859-1"/>
```

...not that this proxy returned an HTTP 503.

Connect to the same service, but make a POST request:
```
# curl localhost:4010/4000p/create
Backend service on port 4000 is running!
```

## Integration with Nginx

Put the following into your `server` block in Nginx:

```
location /ping {

    proxy_set_header        Host $host;
    proxy_set_header        X-Real-IP $remote_addr;
    proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header        X-Forwarded-Proto $scheme;

    # Fix the “It appears that your reverse proxy set up is broken" error.
    proxy_pass          http://localhost:4010/4000p/create;
    proxy_read_timeout  90;
    
}
```

## Integration with Upstart


Put the following into /etc/init/http-health-check-server.conf:

```
start on startup
#start on filesystem and net-device-up IFACE!=lo

#
# Run our server
#
exec /path/to/http-health-check-server.js 4010 2>&1 | logger -t http-health-check-server -i

#
# Respawn if this process dies
#
respawn

#
# Respawn a maximum of 5 times in 10 seconds
#
respawn limit 5 10
```

Once this file is installed, the process can be controlled with `start http-health-check-server`, 
`stop http-health-check-server`, and `status http-health-check-server`.

## Caveats

This has been thoroughly tested on Node.js 0.10.  It has been tested less rigorously on Node.js 6.x.



