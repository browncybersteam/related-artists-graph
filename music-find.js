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
 *  @depth: the number of link_data away from the artist in focus.
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
 * Set of artist IDs. Meant to keep track of duplicates.
 */
artists_already_added = new Set();

/*
 * Default artist that the graph is built with upon opening the page.
 */
default_artist = 'radiohead';

/*
 * Default depth of the graph.
 */
default_depth = 3;

/*
 * Width and height of the window, with vanilla js.
 */
width = window.innerWidth
 || document.documentElement.clientWidth
 || document.body.clientWidth;
height = window.innerHeight
 || document.documentElement.clientHeight
 || document.body.clientHeight;

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
  setTimeout(gui_setup, 5000);
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
 *    @depth: how many link_data away from the center artist to flesh out the
 *    graph with.
 */
function build_data_graph(center_artist_id, args) {
  depth = args.depth;
  // the procedure for loading the first artist is different than loading
  // the related artists
  load_first_artist(center_artist_id);
  load_related_artists(center_artist_id, depth, 0, width/2, height/2);
  // HACK: use a timeout to ensure that all the data is loaded.
  setTimeout(function() {console.log(node_data)}, 3000)
  setTimeout(function() {console.log(link_data)}, 3000)
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
      console.log(data);
      node_data[idx] = {
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
 * @param max_depth: maximum number of link_data away from center artist to
 * allow for.
 * @param parent_depth: depth of the parent node of this node.
 * @param parent_x: the parent's x position
 * @param parent_y: the parent's y position
 */
function load_related_artists(parent_artist_id, max_depth,
  parent_depth, parent_x, parent_y) {
  if (parent_depth < max_depth) {
    s.getArtistRelatedArtists(parent_artist_id, function(err, data) {
      if (err) {
        console.error(err);
      } else {
        number_to_include = data.artists.length/5;
        for (i = 0; i < number_to_include; i++) {
          artist_data = data.artists[i]
          link_data[link_data.length] = {
            id: parent_artist_id + ":" + artist_data.id,
            source: parent_artist_id,
            target: artist_data.id
          };
          if (!artists_already_added.has(artist_data.id)) {
            artists_already_added.add(artist_data.id);
            idx = node_data.length;
            node_data[idx] = {
              id: artist_data.id,
              name: artist_data.name,
              spotify_url: artist_data.external_urls.spotify,
              img_url: artist_data.images[0].url,
              popularity: artist_data.popularity,
              depth: parent_depth + 1,
              x: calc_child_x_position(parent_x, i, number_to_include, parent_depth + 1),
              y: calc_child_y_position(parent_y, i, number_to_include, parent_depth + 1),
            };
            load_related_artists(artist_data.id, max_depth,
              node_data[idx].depth, node_data[idx].x, node_data[idx].y);
          }
        }
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

/*
 * Calculates a node's x position, given its parents x position, its index
 * as a child node, and the number of other children sharing the same parent.
 *
 * @param parent_x: the parent's x position.
 * @param i: the index of the node as a child node.
 * @param num_steps: the number of other children sharing the same parent.
 * @return: the x position of the child.
 */
function calc_child_x_position(parent_x, i, num_steps, depth) {
  return parent_x + 200.0 / depth * Math.cos(i * (2 * Math.PI / num_steps));
}

/*
 * Calculates a node's y position, given its parents y position, its index
 * as a child node, and the number of other children sharing the same parent.
 *
 * @param parent_x: the parent's y position.
 * @param i: the index of the node as a child node.
 * @param num_steps: the number of other children sharing the same parent.
 * @return: the y position of the child.
 */
function calc_child_y_position(parent_y, i, num_steps, depth) {
  return parent_y + 200.0 / depth * Math.sin(i * (2 * Math.PI / num_steps));
}

/******************************************************************************/
/**************************** END DATA COLLECTION *****************************/
/******************************************************************************/

/******************************************************************************/
/****************************** GRAPH RENDERING *******************************/
/******************************************************************************/

var svg; // svg selection holder
var simulation; // d3 force simulation object
var link_graphics_objects; // document objects for links
var node_graphics_objects; // document objects for nodes

function gui_setup() {
  // set up the svg container
  svg = d3.select("#graph").append("svg")
  svg.attr('width', width)
    .attr('height', height)
  // set up the force simulation
  simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(function(d) { return d.id }))
            .force("charge", d3.forceManyBody(10))
            .force("center", d3.forceCenter(width / 2, height / 2))
  link_graphics_objects = svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(link_data)
            .enter()
            .append("line")
            .attr("stroke", "black")
  node_graphics_objects = svg.append("g")
            .attr("class", "nodes")
            .selectAll("circle")
            .data(node_data)
            .enter().append("circle")
            .attr("r", function(d) { return depth_to_radius(d.depth) })
            .call(d3.drag()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended));
  simulation
            .nodes(node_data)
            .on("tick", ticked);
  simulation.force("link")
            .links(link_data);
  console.log("setup done!")
}

function ticked() {
  link_graphics_objects.attr('x1', function(d) { return d.source.x; })
    .attr('y1', function(d) { return d.source.y; })
    .attr('x2', function(d) { return d.target.x; })
    .attr('y2', function(d) { return d.target.y; });

  node_graphics_objects.attr("cx", function(d) { return d.x; })
    .attr("cy", function(d) { return d.y; });
}


// dragging event functions
function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

/*
 * Converts node depth to displayed node radius.
 *
 * @param depth: the depth to convert
 * @return: depth converted to displayed node radius
 */
function depth_to_radius(depth) {
  return 35.0 / (depth + 1);
}

// comment to test github integration!

/******************************************************************************/
/**************************** END GRAPH RENDERING *****************************/
/******************************************************************************/
