'use strict';

let Counters = require('./counters.js');
let UrlEntries = require('./urlEntries.js');
let dns = require('dns');


//Find the current count in the data
function GetCountAndIncrease(req, res, next){
    //Query the database with an empty object so that it returns the last item created in the database.
    //
    Counters.findOneAndUpdate({}, {$inc: {count: 1}}, (err, data)=>{
        if(err) return console.log(err);
        if(data){
            next(data.count);
        }else{
            let newCounter = new Counters();
            newCounter.save( (err)=>{
                if(err) return console.log(err);
                Counters.findOneAndUpdate({}, {$inc: {count: 1}}, (err, data)=>{
                    if(err) return console.log(err);
                    next(data.count);
                });
            });
        }
    } );
}


//Handle added URLS when called from the server.js script
exports.addUrl = (req, res) => {
    
    //Declare the regex statements for pulling apart and checking the url for validity
    let protocolRegex = /^https?:\/\/(.*)/i;
    let hostNameRegex = /^([a-z0-9\-_]+\.)+[a-z0-9\-_]+/i;
                        
    let url = req.body.url;
  
    console.log("This is the url that I have stored from the POST: ", url);
    //Check for a forward slash at the end of the url and remove it EX: 'www.example.com/test/'
    if( url.match(/\/$/i) ) url = url.slice(0,-1);
        console.log('now this is what the url looks like after I have sliced it: ', url);
    
    //Check if the url has an appropriate protocol for the browser to use
    let protocolMatch = url.match(protocolRegex);
    if(!protocolMatch){
      res.json({error: "Invalid URL"});
    }
    
    //take the url with the protocol by storing the second match from the protocolMatch
    let hostAndQuery = protocolMatch[1];
    
    //check if the url has a valid url hostname pattern
    let hostNameMatch = hostAndQuery.match(hostNameRegex);
    if(!hostNameMatch){
      res.json({error: "Invalid URL"});
    }
    console.log("This is what is in the host name match: ", hostNameMatch); 
    //Check to see if the URL is a valid URL
    dns.lookup(hostNameMatch[0], (err, addresses, family)=>{
        if(err){
            console.log(err);
            //the URL is invalid - return the error response object
            res.json({error: 'invalid URL'})
        }else{
            //the URL is valid - Check if it already exists before adding to the database
            UrlEntries.findOne({url: url}, (err, data)=>{
                if(err) console.log(err);
                if(data){
                    //the URL is already exists in the database so just return the matched one to the user
                    res.json( {original_url: url, short_url: data.index} );
                }else{
                    //the URL does not exist - increase the counter and add the URL to the database
                    GetCountAndIncrease(res, req, (cnt)=>{
                        let newUrlEntry = new UrlEntries({
                            url: url,
                            index: cnt
                        });
                        //return the stored data
                        newUrlEntry.save((err)=>{
                            if(err) return console.log(err);
                            res.json({original_url: url, short_url: cnt});
                        });
                    });
                }
            });

        }

    });
}   

exports.processShortUrl = (req, res) =>{
    let shurl = req.params.shurl;
    if( !parseInt(shurl, 10) ){
        //short URL identifier is not a number
        res.json({"error": "Wrong Format"});
        return;
    }
    UrlEntries.findOne({"index": shurl}, (err, data) =>{
        if(err) return console.log(err);
        if(data){
            //redirect to the stored website url
            console.log(data.url);
            res.redirect(data.url);
        }else{
            res.json({"error": "No short url found for given input"});
        }
    });
};