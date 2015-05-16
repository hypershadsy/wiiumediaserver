"use strict";

var http = require('http');
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var util = require('util');

http.createServer(function(req, resp) {
	//main page
	if (req.url === "/") {
		console.log('request: main page');
		resp.writeHead(200, { 'Content-Type': 'text/plain' });
		resp.write('<table>');
		resp.end();
		return;
	}
	
	var vidPath = path.join('./', req.url);
	var ffmpeg;
	
	req.on('close', function() {
		console.log(util.format('stream of %s ended by the client', vidPath));
		if (ffmpeg) {
			ffmpeg.stdout.unpipe();
			ffmpeg.stderr.unpipe();
			
			//only way ffmpeg process will die
			//exhausting buffer will waste resources until a full conversion is complete
			//unpiping or closing stdout or stderr also does nothing
			//SIGTERM curiously does nothing as well
			//SIGINT only works for the first of the double-requests
			//I'm trying to avoid using very violent SIGKILL
			process.kill(ffmpeg.pid, 'SIGABRT');
			
			console.log(util.format('stream of %s killed process %d', vidPath, ffmpeg.pid));
		}
	});
	
	//if dumbmovie.mp4, start ffmpeg and pipe it
	if (path.extname(vidPath) === ".mp4") {
		console.log(util.format('request: %s ffmpeg pipe', vidPath));
		
		ffmpeg = child_process.spawn('ffmpeg', [
			'-i', vidPath,
			'-v', 'error',
			'-c:v', 'libx264',
			'-b:v', '500K',
			'-c:a', 'libvo_aacenc',
			'-b:a', '100K',
			'-ac', '2',
			'-f', 'mpegts',
			'pipe:1'
		]);
		
		ffmpeg.on('close', function(code) {
			resp.end();
			console.log(util.format('stream of %s completed with code %s', vidPath, code));
		});
		
		ffmpeg.stderr.pipe(process.stdout);
		ffmpeg.stdout.pipe(resp);
		
		return;
	}
	
	//existsSync will be deprecated
	if (!fs.existsSync(vidPath)) {
		console.log(util.format('request: %s file doesn\'t exist', vidPath));
		resp.writeHead(404);
		resp.end();
		return;
	}
	
	//regular file
	console.log(util.format('request: %s regular file', vidPath));
	var strm = fs.createReadStream(vidPath);
	resp.writeHead(200);
	strm.pipe(resp);
}).listen(1337);
