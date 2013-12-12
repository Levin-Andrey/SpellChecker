var parseString = require('xml2js').parseString;
var xml = "<s>Hello xml2js!</s><s>sadasd</s>"
parseString(xml, function (err, result) {
    console.log(result);
});