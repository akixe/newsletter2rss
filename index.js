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

function openInbox(cb) {
    imap.openBox("INBOX", true, cb);
}

imap.once("ready", function() {
    openInbox(function(err, box) {
        if (err) throw err;
        imap.search(
            [
                ["FROM", "kale@hackernewsletter.com"],
                "UNSEEN",
                ["SENTBEFORE", "Aug 15, 2018"]
            ],
            function(err, results) {
                if (err) throw err;
                var f = imap.fetch(results, { bodies: "" });
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
            }
        );
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
                var url = urls[i];
                // https://api.pinboard.in/v1/posts/add

                request
                    .get(urls[i].raw, { timeout: 20000 })
                    .on("response", function(response) {
                        console.log("original --> ", urls[i].raw);
                        console.log(response.statusCode); // 200
                        console.log("redirect --> ", response.request.uri.href);
                        console.log("++++++++++++++++++++++");
                        console.log("");

                        request
                            .get(
                                "https://api.pinboard.in/v1/posts/add?auth_token=patux:35b4712c3910dc065230",
                                {
                                    qs: {
                                        url: response.request.uri.href,
                                        description: "TEST-" + Date.now(),
                                        tag: "TEST"
                                    }
                                }
                            )
                            .then(function(response) {
                                console.log("==pinboard OK==", response);
                            })
                            .catch(function(err) {
                                console.error(err);
                            });
                    })
                    .on("error", function(err) {
                        console.log("original --> ", urls[i].raw);
                        console.log("ERR", err.message);
                        console.log("---------------");
                        console.log("");
                    });
            }
        });
    }
});

imap.connect();
