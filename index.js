var Imap = require("imap");
var anchorme = require("anchorme").default;
var _ = require("lodash");
var fs = require("fs");
var StringDecoder = require("string_decoder").StringDecoder;
var quotedPrintable = require("quoted-printable");
var seqnumbers = [];
var imap = new Imap({
    user: "akixe.otegi@zoho.com",
    password: "U4GkOqOrrUeKTMyN",
    host: "imap.zoho.com",
    port: 993,
    tls: true
});
var request = require("request-promise");
var getTitleAtUrl = require("get-title-at-url");

function openInbox(cb) {
    imap.openBox("INBOX", false, cb);
}

imap.once("ready", function() {
    openInbox(function(err, box) {
        if (err) throw err;
        imap.search([["FROM", "kale@hackernewsletter.com"], "UNSEEN"], function(
            err,
            results
        ) {
            if (err) throw err;
            var f = imap.fetch(results, { bodies: "", markSeen: true });
            f.on("message", function(msg, seqno) {
                seqnumbers.push(seqno);
                var prefix = "(#" + seqno + ") ";

                msg.on("body", function(stream, info) {
                    var buffer = "";
                    var count = 0;
                    var decoder = new StringDecoder("utf8");
                    stream.on("data", function(chunk) {
                        count += chunk.length;
                        buffer += decoder.write(chunk);
                    });

                    stream.once("end", function() {
                        buffer = quotedPrintable.decode(buffer);
                        // console.log(buffer);
                        fs.writeFile(
                            "msg-" + seqno + "-body.txt",
                            buffer,
                            function(err) {
                                if (err) return console.log(err);
                            }
                        );
                    });
                });

                msg.once("end", function() {
                    console.log(prefix + "Finished");
                });
            });
            f.once("error", function(err) {
                console.log("Fetch error: " + err);
            });
            f.once("end", function() {
                console.log("Done fetching all messages!");
                imap.end();
            });
        });
    });
});

imap.once("error", function(err) {
    console.log(err);
});

imap.once("end", function() {
    console.log("Connection ended");
    //seqnumbers.forEach(function(seqno) {
    for (let idx = 0; idx < 1 /*seqnumbers.length*/; idx++) {
        var seqno = seqnumbers[idx];
        fs.readFile("msg-" + seqno + "-body.txt", "utf8", function(
            err,
            fileData
        ) {
            if (err) {
                return console.log(err);
            }
            var urls = anchorme(fileData, { list: true });

            urls = _.filter(urls, function(o) {
                // string.indexOf(substring) !== -1;
                return (
                    o.reason === "url" &&
                    o.raw.indexOf("hackernewsletter.us1.list-manage") !== -1
                );
            });
            console.log("URLS", urls);
            for (let i = 0; i < urls.length; i++) {
                getRedirectedLink(urls[i].raw).then(function(redirectedLink) {
                    if (
                        redirectedLink.indexOf("news.ycombinator.com/item") !==
                        -1
                    )
                        return console.log("---- not a link. next");
                    getTitleAtUrl(redirectedLink, function(title) {
                        console.log(title);
                        var username = "de.acqs@gmail.com",
                            password = "W1Cle8WE",
                            auth =
                                "Basic " +
                                new Buffer(username + ":" + password).toString(
                                    "base64"
                                );

                        request
                            .get("https://www.instapaper.com/api/add", {
                                qs: {
                                    url: redirectedLink
                                },
                                headers: {
                                    Host: "www.instapaper.com",
                                    Authorization:
                                        "Basic ZGUuYWNxc0BnbWFpbC5jb206VzFDbGU4V0U="
                                }
                            })
                            .then(function(response) {
                                console.log("==instapaper OK==", response);
                            })
                            .catch(function(err) {
                                // console.error("== instapaper KO!! ==", err);
                            });
                    });
                });
            }
        });
    }
});

imap.connect();

function getRedirectedLink(sourceLink) {
    return new Promise((resolve, reject) => {
        request
            .get(sourceLink, { timeout: 20000 })
            .on("response", function(response) {
                console.log("---------------");
                console.log("[OK]");
                console.log("original --> ", sourceLink);
                console.log(response.statusCode); // 200
                console.log("redirect --> ", response.request.uri.href);
                console.log("---------------");
                console.log("");
                return resolve(response.request.uri.href);
            })
            .on("error", function(err) {
                console.log("---------------");
                console.log("[-] ERR", err.message);
                console.log("original --> ", sourceLink);
                console.log("---------------");
                console.log("");
                return reject(err);
            });
    });
}
