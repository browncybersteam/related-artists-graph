// First, we create an instance of the wrapper.
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

// Main function.
function main() {
    // register listener for text box
    document.getElementById('fartist').onkeypress = enterKeyPressedOnTextbox;
    // do an update to a default
    updateArtist('Radiohead');
}

function enterKeyPressedOnTextbox(e) {
    if (e.key === "Enter") {
        document.getElementById('fartist').blur();
        updateArtist(document.getElementById('fartist').value);
    }
}

// updates page to new artist
function updateArtist(artist) {
    getArtistID(artist, function (artistID) {
        updateArtistAlbums(artistID);
    });
}

// Queries the Spotify api for an artist's ID, given the artist's name.
//
// @param artistName - the name to search for
// @param callback - what to do once the id has been found
function getArtistID(artistName, callback) {
    s.searchArtists(artistName, {}, function(err, data) {
        if (err) { console.error(err); }
        else { callback(data.artists.items[0].id); }
    });
}

// Updates the urls in artist albums array.
//
// @param artistID - the artist ID to display the albums of
function updateArtistAlbums(artistID) {
    s.getArtistAlbums(artistID, function(err, albums) {
        if (err) { console.error(err); }
        else {
            var alreadyDisplayed = []; // to keep track of duplicates
            data.length = 0; // clear the old data
            for (i = 0; i < albums.items.length; i++) {
                if (!alreadyDisplayed.includes(albums.items[i].name)) {
                    data[data.length] = {
                        image: albums.items[i].images[0].url, 
                        url: albums.items[i].external_urls.spotify,
                        name: albums.items[i].name,
                        id: albums.items[i].id
                    };
                    alreadyDisplayed[alreadyDisplayed.length] = albums.items[i].name;
                }
            }
            updateData();
        }
    });
}

// Binds artist data to objects in the DOM with d3.
function updateData() {
    // get the content we care about
    var content = d3.select(".chart").selectAll(".albumcover").data(data, 
        function (d) { return d.id; } );
    
    // add the new
    content.enter()        // sees that there are new elements; creates placeholder elements
        .append("img")     // adds an img to the placeholder that enter() created
        // any time you want to use data to set a parameter, you can pass in
        // a function in place of a hardcoded value to do an operation on the
        // node's data to set the parameter in question.
        .attr("class", "albumcover")
        .attr("src", function (d) { return d.image; })
        .attr("onclick",
            function (d) { return "navigateToURL(\'" + d.url + "\')"; })
        .style("opacity", "0.0")
        .transition()
            .delay(200)
            .duration(400)
            .style("opacity", "1.0")

    // get rid of the old
    content.exit()
    .transition()
        .duration(100)
        .style("opacity", "0.0").delay(200).remove()
}
// Navigates browser to specified url.
function navigateToURL(url) {
    window.location.href = url;
}
