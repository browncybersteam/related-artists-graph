/******************************************************************************/
/*********************************** SETUP ************************************/
/******************************************************************************/

/*
 * All code in this section is focused on performing setup tasks, like making
 * the initial query to Spotify for a valid API token.
 */

// our instance of the Spotify API wrapper
s = new SpotifyWebApi();
// our client Authorization
auth = "47c6369ae4194f96a070658bc5471db5:785b8c682d1d434e82a9103dc988d165";

// Get the API token to actually be allowed to make requests to the API. This
// is where our "Client ID" and "Client Secret" come in.
$.ajax({
    type: "POST",
    url: "https://accounts.spotify.com/api/token",
    xhrFields: {
        withCredentials: false
    },
    headers: {
        'Authorization': 'Basic ' + btoa(auth),
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

/******************************************************************************/
/********************************* END SETUP **********************************/
/******************************************************************************/

/******************************************************************************/
/******************************* DECLARATIONS *********************************/
/******************************************************************************/

/*
 * All code in this section defines data structures and other important objects
 * we'll be using.
 */

/*
 * Array of artist data node objects, each consisting of:
 *  @id: the artist's unique Spotify API ID.
 *  @name: the artist's name.
 *  @spotify_url: the url for the artist's spotify page.
 *  @img_url: a url for a display image of the artist.
 *  @popularity: the artist's popularity index, according to Spotify.
 *  @depth: the number of links away from the artist in focus.
 *  @x: the node's x position, referenced by the center of the node.
 *  @y: the node's y position, referenced by the center of the node.
 */
node_data = [];

/*
 * Array of link data objects, each consisting of:
 *  @id: a unique link id, or the form: <artist 1 ID>:<artist 2 ID>
 *  @endpoints: a tuple of the two endpoints of the link, both artist ID's.
 *    i.e. (<artist ID 1>, <artist ID 2>).
 */
link_data = [];

/*
 * Default artist that the graph is built with upon opening the page.
 */
default_artist = 'radiohead';

/*
 * Default depth of the graph.
 */
default_depth = 3;

/******************************************************************************/
/******************************* DECLARATIONS *********************************/
/******************************************************************************/

/******************************************************************************/
/*********************************** MAIN *************************************/
/******************************************************************************/

/*
 * Main function, called upon successful response from Spotify when attempting
 * to get an API token.
 */
function main() {
  get_artist_id(default_artist, build_data_graph, {depth: default_depth});
}

/******************************************************************************/
/********************************* END MAIN ***********************************/
/******************************************************************************/

/******************************************************************************/
/****************************** DATA COLLECTION *******************************/
/******************************************************************************/

/*
 * All code in this section is focused on making requests to the Spotify API
 * and transforming the responses.
 */

/*
 * Called to gather information from Spotify API and populate the node_data
 * and link_data arrays.
 *
 * @param center_artist_id: the id of the artist that the graph building
 * begins with, i.e. the initial center of the graph.
 * @param args: a generic object that will contain:
 *    @depth: how many links away from the center artist to flesh out the
 *    graph with.
 */
function build_data_graph(center_artist_id, args) {
  depth = args.depth;
  // the procedure for loading the first artist is different than loading
  // the related artists
  load_first_artist(center_artist_id);
  load_related_artists(center_artist_id, depth, 0);
  // HACK: use a timeout to ensure that all the data is loaded.
  setTimeout(function() {console.log(nodes)}, 3000)
  setTimeout(function() {console.log(links)}, 3000)
}

/*
 * Loads the first artist into the graph.
 *
 * @param: ID of artist to load.
 */
function load_first_artist(artist_id) {
  s.getArtist(artist_id, function (err, data) {
      if (err) { console.error(err); }
      var idx = node_data.length;
      dataNodes[idx] = {
        id: data.id,
        name: data.name,
        spotify_url: data.external_urls.spotify,
        img_url: data.images[0].url,
        popularity: data.popularity,
        depth: 0,
        x: width / 2,
        y: height / 2,
      };
  });
}

/*
 * Loads artists related to a specified artist into the graph recursively.
 *
 * @param parent_artist_id: ID of the parent artist of the related artists
 * being loaded.
 * @param max_depth: maximum number of links away from center artist to
 * allow for.
 * @param parent_depth: depth of the parent node of this node.
 */
function load_related_artists(parent_artist_id, max_depth, parent_depth) {
  if (parent_depth < max_depth) {
    s.getArtistRelatedArtists(parent_artist_id, function(err, data) {
      if (err) { console.error(err); }
      for (i = 0; i < data.artists.length; i++) {
        var idx = node_data.length;
        dataNodes[idx] = {
          id: data.id,
          name: data.name,
          spotify_url: data.external_urls.spotify,
          img_url: data.images[0].url,
          popularity: data.popularity,
          depth: parent_depth + 1,
          x: width / 2,
          y: height / 2,
        };
        dataLinks[dataLinks.length] = {
          id: parent_artist_id + ":" + data.id,
          endpoints: (parent_artist_id, data.id)
        };
        load_related_artists(data.artists[i].id, max_depth, parent_depth + 1);
      }
    });
  }
}

/*
 * Gets an artist's ID by searching for their name, and executes a callback.
 *
 * @param artist_name: the name of the artist to search for.
 * @param callback: the callback to execute if the API call is successful.
 * @param args: an optional object with arguments to be passed to the callback.
 */
function get_artist_id(artist_name, callback, args) {
    s.searchArtists(artist_name, {}, function(err, data) {
        if (err) { console.error(err); }
        else { callback(data.artists.items[0].id, args); }
    });
}

/******************************************************************************/
/**************************** END DATA COLLECTION *****************************/
/******************************************************************************/
