var Imap = require("imap");
var anchorme = require("anchorme").default;
var fs = require("fs");
var StringDecoder = require("string_decoder").StringDecoder;
var quotedPrintable = require("quoted-printable");
var _seqno;
var imap = new Imap({
    user: "akixe.otegi@zoho.com",
    password: "U4GkOqOrrUeKTMyN",
    host: "imap.zoho.com",
    port: 993,
    tls: true
});

function openInbox(cb) {
    imap.openBox("INBOX", true, cb);
}

imap.once("ready", function() {
    openInbox(function(err, box) {
        if (err) throw err;
        imap.search(["RECENT", ["SINCE", "May 18, 2018"]], function(
            err,
            results
        ) {
            if (err) throw err;
            var f = imap.fetch(results.slice(0, 1), { bodies: "" });
            f.on("message", function(msg, seqno) {
                _seqno = seqno;
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
                        console.log(buffer);
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
    fs.readFile("msg-" + _seqno + "-body.txt", "utf8", function(err, fileData) {
        if (err) {
            return console.log(err);
        }
        var urls = anchorme(fileData, { list: true });
        console.log("urls", urls);

        fs.writeFile(
            "msg-" + _seqno + "-body.json",
            JSON.stringify(urls),
            function(err) {
                if (err) {
                    return console.log(err);
                }

                console.log("The file was saved!");
            }
        );
    });
});

imap.connect();
