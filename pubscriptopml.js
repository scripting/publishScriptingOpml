const myVersion = "0.4.2", myProductName = "publishscriptingopml";  

const fs = require ("fs");
const request = require ("request"); 
const utils = require ("daveutils");
const opmlToJs = require ("opmltojs");
const davegithub = require ("davegithub");
const davehttp = require ("davehttp"); 

var config = {
	port: process.env.PORT || 1453,
	flLogToConsole: true,
	
	urlOpml: "http://drummer.scripting.com/davewiner/blog.opml",
	urlUpdateSocket: "ws://sockets.scripting.com:1239"
	};

const fnameConfig = "config.json";

function getScriptingOpmlUrl () {
	return (config.github.baseRepoUrl + config.github.repoPath + "scripting.opml");
	}
function httpReadUrl (url, callback) {
	request (url, function (error, response, data) {
		if (!error && (response.statusCode == 200)) {
			callback (data) 
			}
		else {
			callback (undefined);
			}
		});
	}
function uploadToGithub (relpath, data, type, callback) {
	const options = {
		username: config.github.username,
		repo: config.github.repo,
		repoPath: config.github.repoPath + relpath,
		password: config.github.password,
		data: data,
		type: (type === undefined) ? "text/plain" : type,
		committer: config.github.committer,
		message: config.github.message,
		userAgent: config.github.userAgent
		};
	davegithub.uploadFile (options, function (err, response, body) {
		console.log ("uploadToGithub: url == " + getScriptingOpmlUrl () + ", status == " + response.statusCode); //xxx
		if (err) {
			console.log ("uploadToGithub: err.message == " + err.message);
			}
		if (callback !== undefined) {
			callback (err);
			}
		});
	}
function readConfig (f, config, callback) {
	fs.readFile (f, function (err, jsontext) {
		if (err) {
			console.log ("Error reading " + f);
			}
		else {
			try {
				var jstruct = JSON.parse (jsontext);
				for (var x in jstruct) {
					config [x] = jstruct [x];
					}
				callback ();
				}
			catch (err) {
				console.log (err.message);
				}
			}
		});
	}

function handlePing (callback) {
	httpReadUrl (config.urlOpml, function (opmltext) { 
		if (opmltext !== undefined) {
			opmlToJs.parseWithError (opmltext, function (err, theOutline) {
				if (err) {
					console.log (err.message);
					callback (err);
					}
				else {
					delete theOutline.opml.head.urlJson;
					delete theOutline.opml.head.urInstant;
					theOutline.opml.head.urlUpdateSocket = config.urlUpdateSocket;
					theOutline.opml.head.urlPublic = getScriptingOpmlUrl ();
					theOutline.opml.head.generator = myProductName + " v" + myVersion;
					theOutline.opml.head.urlInstant = "http://instantoutliner.com/qk";
					opmltext = opmlToJs.opmlify (theOutline);
					uploadToGithub ("scripting.opml", opmltext, "text/xml", function (err) {
						if (err) {
							callback (err); 
							}
						else {
							callback (undefined, "Thanks for the ping.");
							}
						});
					}
				});
			}
		})
	}

function startup () {
	console.log ("startup");
	readConfig (fnameConfig, config, function () {
		console.log ("config == " + utils.jsonStringify (config));
		davehttp.start (config, function (theRequest) {
			function returnPlainText (s) {
				theRequest.httpReturn (200, "text/plain", s.toString ());
				}
			function returnError (jstruct) {
				theRequest.httpReturn (500, "application/json", utils.jsonStringify (jstruct));
				}
			function httpReturn (err, message) {
				if (err) {
					returnError (err);
					}
				else {
					returnPlainText (message);
					}
				}
			switch (theRequest.lowerpath) {
				case "/ping":
					handlePing (httpReturn);
					return;
				}
			theRequest.httpReturn (404, "text/plain", "Not found.");
			});
		});
	}

startup ();





