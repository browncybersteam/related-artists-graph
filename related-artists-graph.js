/* DONT USE THIS */

instance of the wrapper.
s = new SpotifyWebApi();
data = [];

// Next, we need to get the API token to actually be allowed to make requests
// to the API. This is where our "Client ID" and "Client Secret" come in.
$.ajax({
    type: "POST",
    url: "https://accounts.spotify.com/api/token",
    xhrFields: {
        withCredentials: false
    },
    headers: {
        'Authorization': 'Basic ' + btoa("47c6369ae4194f96a070658bc5471db5:785b8c682d1d434e82a9103dc988d165"),
    },
    data: {
        grant_type: 'client_credentials'
    },
    success: function(data, status) {
        s.setAccessToken(data.access_token);
        main();
    },
    error: function(request, status, error) {
        console.log(request.responseText);
        console.log(error);
    }
});


// set some variables for the width and height
var width = window.innerWidth
|| document.documentElement.clientWidth
|| document.body.clientWidth;
var height = window.innerHeight
|| document.documentElement.clientHeight
|| document.body.clientHeight;

// set up the links and nodes arrays
dataNodes = [];
nodeIdsToIdxs = {};
dataLinks = [];
links = [];
nodes = [];
// set up the force object
var force = null;
// speed of animation.
var animationStep = 400;
var svg = null;

// Main function.
function main() {
    // register listener for text box
    document.getElementById('fartist').onkeypress = enterKeyPressedOnTextbox;
    // One other parameter for our visualization determines how
    // fast (or slow) the animation executes. It's a time value

    // build the graph
    buildGraph();

    // create our svg object
    svg = d3.select('.chart').append('svg')
    .attr('width', width)
    .attr('height', height);
    setTimeout(initForce, 1000);
}

function initForce() {
    svg.selectAll('*').remove();
    // the force object
    force = d3.layout.force()
        .size([width, height])
        .nodes(dataNodes)
        .links(dataLinks);
    // set up some attributes
    force.gravity(1);
    force.linkDistance(height/100);
    // how strong links are; i.e., how elastic they are
    force.linkStrength(1.0);
    // how attracted nodes are to each other
    force.charge(function(node) {
        return node.depth * -1000;
    });

    // set up our links
    links = svg.selectAll('.link')
        .data(dataLinks)
        .enter().append('line')
        .attr('class', 'link')
        .attr('x1', function(d) { return dataNodes[nodeIdsToIdxs[d.source]].x; })
        .attr('y1', function(d) { return dataNodes[nodeIdsToIdxs[d.source]].y; })
        .attr('x2', function(d) { return dataNodes[nodeIdsToIdxs[d.target]].x; })
        .attr('y2', function(d) { return dataNodes[nodeIdsToIdxs[d.target]].y; });
    // set up our nodes
    nodes = svg.selectAll('.node')
        .data(dataNodes)
        .enter().append('circle')
        .attr('r', function(d) {return Math.sqrt(d.depth) * width/100; })
        .attr('cx', function(d) { return d.x; })
        .attr('cy', function(d) { return d.y; });
    // call the step function at each iteration
    force.on('tick', stepForce);
    force.start();
}

function stepForce() {
    nodes.attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; });

    links.attr('x1', function(d) { return dataNodes[nodeIdsToIdxs[d.source]].x; })
    .attr('y1', function(d) { return dataNodes[nodeIdsToIdxs[d.source]].y; })
    .attr('x2', function(d) { return dataNodes[nodeIdsToIdxs[d.target]].x; })
    .attr('y2', function(d) { return dataNodes[nodeIdsToIdxs[d.target]].y; });
}

function enterKeyPressedOnTextbox(e) {
    if (e.key === "Enter") {
        document.getElementById('fartist').blur();
        updateArtist(document.getElementById('fartist').value);
    }
}

// builds graph
function buildGraph() {
    getArtistID('radiohead', seedGraph, {});
    getArtistID('radiohead', addRelatedToGraph, {depth: 2});
}

function seedGraph(artistID, args) {
    s.getArtist(artistID, function (err, data) {
        if (err) { console.error(err); }
        var idx = dataNodes.length;
        dataNodes[idx] = {
            name: data.name,
            url: data.external_urls.spotify,
            img: data.images[0].url,
            x: width / 2,
            y: height / 2,
            depth: 3
        };
        nodeIdsToIdxs[data.id] = idx;
    });
}

function addRelatedToGraph(artistID, args) {
    if (args.depth > 0) {
        s.getArtistRelatedArtists(artistID, function(err, data) {
            if (err) { console.error(err); }
            console.log(data);
            for (i = 0; i < data.artists.length / 3; i++) {
                var idx = dataNodes.length;
                dataNodes[idx] = {
                    name: data.artists[i].name,
                    url: data.artists[i].external_urls.spotify,
                    img: data.artists[i].images[0].url,
                    x: width/2 + (3 - args.depth) * 200.0 * Math.cos(i * (6.28 / (data.artists.length / 3.0))),
                    y: height/2 + (3 - args.depth) * 200.0 * Math.sin(i * (6.28 / (data.artists.length / 3.0))),
                    depth: args.depth
                };
                nodeIdsToIdxs[data.artists[i].id] = idx;
                dataLinks[dataLinks.length] = {
                    source: artistID,
                    target: data.artists[i].id,
                    weight: 1
                };
                addRelatedToGraph(data.artists[i].id, {depth: args.depth - 1});
            }
        });
    }
}

// Queries the Spotify api for an artist's ID, given the artist's name.
//
// @param artistName - the name to search for
// @param callback - what to do once the id has been found
function getArtistID(artistName, callback, args) {
    s.searchArtists(artistName, {}, function(err, data) {
        if (err) { console.error(err); }
        else { callback(data.artists.items[0].id, args); }
    });
}

// Navigates browser to specified url.
function navigateToURL(url) {
    window.location.href = url;
}
