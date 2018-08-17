var Imap = require("imap");
var anchorme = require("anchorme").default;
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
    seqnumbers.forEach(function(seqno) {
        fs.readFile("msg-" + seqno + "-body.txt", "utf8", function(
            err,
            fileData
        ) {
            if (err) {
                return console.log(err);
            }
            var urls = anchorme(fileData, { list: true });
            for (let i = 0; i < urls.length; i++) {
                var url = urls[i];
                var that = this;
                that.origurl = url.raw;
                /* request
                    .get(url.raw, { timeout: 20000 })
                    .then(
                        function(response) {
                            console.log("original -->> ", origurl);
                            console.log(response.statusCode); // 200
                            console.log(
                                "redirect -->> ",
                                response.request.uri.href
                            );
                        }.bind(that)
                    )
                    .catch(function(err) {
                        console.log("ERR", err);
                    }); */
            }
        });
    });
});

imap.connect();
