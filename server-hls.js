"use strict";

var http = require('http');
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var util = require('util');

http.createServer(function(req, resp) {
	console.log(req.url);
	
	//main page
	if (req.url === "/") {
		console.log('req: MAIN PAGE');
		resp.writeHead(200, { 'Content-Type': 'text/plain' });
		resp.write('ayyy');
		resp.end();
		return;
	}
	
	var vidPath = './' + req.url;
	
	//if dumbmovie.mp4, start ffmpeg, wait 1 second, serve (html with video element pointing to) dumbmovie.m3u8
	if (path.extname(vidPath) === ".mp4") {
		console.log('req: FFMPEG STARTED');
		
		var basename = path.basename(vidPath);
		var ffmpeg = child_process.spawn('ffmpeg', [
			'-re',
			'-i', vidPath,
			'-v', 'error',
			'-c:v', 'libx264',
			'-b:v', '500K',
			'-c:a', 'libvo_aacenc',
			'-b:a', '100K',
			'-ac', '2',
			'-map', '0',
			'-f', 'segment',
			'-segment_time', '4',
			'-segment_list', basename+'.m3u8',
			'-segment_format', 'mpegts',
			'-segment_list_size', '3',
			'-y', //auto overwrite
			basename+'%05d.ts'
		]);
		
		ffmpeg.on('close', function (code) {
			console.log(vidPath + " completed with code " + code);
		});
		
		ffmpeg.stderr.pipe(process.stderr);
		
		setTimeout(function() {
			resp.writeHead(200);
			var htmlDoc = util.format('<html><body><video controls src="%s.m3u8"></body></html>',
				vidPath
			);
			resp.write(htmlDoc);
			resp.end();
		}, 1000);
		
		return;
	}
	
	//existsSync will be deprecated
	if (!fs.existsSync(vidPath)) {
		console.log('req: FILE DOESN\'T EXIST');
		resp.writeHead(404);
		resp.end();
		return;
	}
	
	//regular file
	var strm = fs.createReadStream(vidPath);
	resp.writeHead(200);
	strm.pipe(resp);
}).listen(1337);
