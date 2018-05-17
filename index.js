var Imap = require('imap'),
    inspect = require('util').inspect;
    extractor = require('unfluff');
    getUrls = require('get-urls');
var anchorme = require("anchorme").default;
    // https://www.npmjs.com/package/url-metadata



var fs = require('fs'), fileStream;
var _seqno;
var imap = new Imap({
  user: 'akixe.otegi@zoho.com',
  password: 'U4GkOqOrrUeKTMyN',
  host: 'imap.zoho.com',
  port: 993,
  tls: true
});

function openInbox(cb) {
  imap.openBox('INBOX', true, cb);
}

imap.once('ready', function() {
  
  
  openInbox(function(err, box) {
    if (err) throw err;
    imap.search([ 'UNSEEN', ['SINCE', 'May 20, 2010'] ], function(err, results) {
      if (err) throw err;
      var f = imap.fetch('1:3', { bodies: '' });
      f.on('message', function(msg, seqno) {
        _seqno = seqno;
        //console.log('Message #%d', seqno);
        var prefix = '(#' + seqno + ') ';
        msg.on('body', function(stream, info) {
          // console.log(prefix + 'Body');
          //stream.pipe(fs.createWriteStream('msg-' + seqno + '-body.txt'));
          /* if (info.which === 'TEXT')
            console.log(prefix + 'Body [%s] found, %d total bytes', inspect(info.which), info.size);
          var buffer = '', count = 0;
          stream.on('data', function(chunk) {
            count += chunk.length;
            buffer += chunk.toString('utf8');
            console.log("BUFFER", buffer)
            if (info.which === 'TEXT')
              console.log(prefix + 'Body [%s] (%d/%d)', inspect(info.which), count, info.size);
          });
          stream.once('end', function() {
            if (info.which !== 'TEXT')
              console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
            else
              console.log(prefix + 'Body [%s] Finished', inspect(info.which));
          }); */
        });
        msg.once('attributes', function(attrs) {
          console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
        });
        msg.once('end', function() {
          console.log(prefix + 'Finished');
        });
      });
      f.once('error', function(err) {
        console.log('Fetch error: ' + err);
      });
      f.once('end', function() {
        console.log('Done fetching all messages!');
        imap.end();
      });
    });
  });
});

imap.once('error', function(err) {
  console.log(err);
});

imap.once('end', function() {
  console.log('Connection ended');
  // fs.readFile('msg-' + _seqno + '-body.txt', 'utf8', function (err,fileData) {
  fs.readFile('msg-1-body.txt', 'utf8', function (err,fileData) {
    if (err) {
      return console.log(err);
    }
    //var data = extractor(fileData);
    //console.log('fileData', fileData);
    // var urls = getUrls(fileData, {extractFromQueryString: true});
    fileData = fileData.replace(/\r?\n|\r/g,"");

    // const regex = /((http[s]?|ftp):\/)?\/?([^:\/\s]+)((\/\w+)*\/)([\w\-\.]+[^#?\s]+)(.*)?(#[\w\-]+)?/gi;
    // const regex = /([^\S]|^)(((https?\:\/\/)|(www\.))(\S+))/gi;
    const regex = /<a.+?\s*href\s*=(3D)?\s*["\']?([^"\'\s>]+)["\']?/gi;
    console.log("urls: ", regex.exec(fileData));
    //var urls = anchorme(fileData, {list: true});
    // console.log('urls', urls);
    /*fs.writeFile('msg-' + _seqno + '-body.json', JSON.stringify(urls), function(err) {
      if(err) {
          return console.log(err);
      }
  
      console.log("The file was saved!");
    });*/
  });
});

imap.connect();