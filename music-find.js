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
default_depth = 2;

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
  //var current_artist = default_artist;
  //console.log(document.getElementById('artist_searchbar'))
  document.getElementById('artist_searchbar').onkeypress = 
    function (e) {
      //console.log(document.getElementById('artist_searchbar').value);
      if(e.key === "Enter") {
        current_artist = document.getElementById('artist_searchbar').value;
        //node_data.length = 0;
        //link_data.length = 0;
        node_data = [];
        link_data = [];
        console.log(current_artist);
        get_artist_id(current_artist, build_data_graph, {depth: default_depth});
        setTimeout(
          function() {
            //gui_setup();
            update();
          }, 5000);
      }
    }
  //console.log(current_artist);
  get_artist_id(default_artist, build_data_graph, {depth: default_depth});
  setTimeout(
    function() {
      gui_setup();
      update();
    }, 5000);
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
        img_url: data.images[2].url,
        popularity: data.popularity,
        depth: 0,
        x: width / 2,
        y: height / 2,
      };
      artists_already_added.add(data.id);
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
        number_to_include = data.artists.length / 5;
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
              img_url: artist_data.images[2].url,
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
/******************************* DATA UPDATING ********************************/
/******************************************************************************/

/******************************************************************************/
/***************************** END DATA UPDATING ******************************/
/******************************************************************************/


/******************************************************************************/
/****************************** GRAPH RENDERING *******************************/
/******************************************************************************/

var repulsive_force_strength = -80 // strength of repulsive force

var svg; // svg selection holder
var defs; // for the image resources for the nodes
var simulation; // d3 force simulation object
var link_graphics_objects; // document objects for links
var node_graphics_objects; // document objects for nodes
var labels;
var image_objs; 

function gui_setup() {
  // a function we'll be using for mouseover functionality
  d3.selection.prototype.move_to_front = function() {
    return this.each(function(){
      this.parentNode.appendChild(this);
    });
  };
  // set up the svg container
  svg = d3.select("#graph").append("svg")
  // for the image resources for the nodes
  defs = svg.append("defs")
  svg.attr('width', width)
    .attr('height', height)
  // set up the force simulation
  simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(function(d) { return d.id }))
            .force("charge", d3.forceManyBody(2))
            .force("center", d3.forceCenter(width / 2, height / 2))
  // make sure the repulsive force is strong enough
  simulation.force('charge').strength(repulsive_force_strength)
}

function update() {
   // bind the node data and the position updating function to the simulation
  d3.selectAll(".nodes").remove()
  d3.selectAll(".links").remove()

  simulation
            .nodes(node_data)
            .on("tick", ticked);

  // bind the link data to the simulation
  simulation.force("link")
            .links(link_data);

  // graphical representations of links
  link_graphics_objects = svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(link_data)
  //link_graphics_objects.exit().remove();
  /*link_graphics_objects*/.enter()
            .append("line")
            .attr("stroke", "black")

  //link_graphics_objects.exit().remove();


  // graphical representations of nodes

  image_objs = svg.append("g")
            .attr("class", "nodes")
            .selectAll("foreignObject")
            .data(node_data)
            //.exit().remove()
            .enter().append("foreignObject")
            .attr("width", function(d) { return depth_to_radius(d.depth) * 2})
            .attr("height", function(d) { return depth_to_radius(d.depth) * 2})
            .append("xhtml:img")
            .attr("class", "node")
            .attr("width", function(d) { return depth_to_radius(d.depth) * 2})
            .attr("height", function(d) { return depth_to_radius(d.depth) * 2})
            .attr("src", function(d) { return d.img_url});

  //image_objs.exit().remove();
  //svg.exit().remove();

  node_graphics_objects = svg.selectAll("foreignObject")
                  .on("mousemove", function(d) {d3.select(this)
                                                    .move_to_front()
                                                    .transition()
                                                      .duration(50)
                                                      .attr("r", 50)
                                                    })
                  .on("mouseout", function(d) {d3.select(this)
                                                    .transition()
                                                      .duration(50)
                                                      .attr("r", depth_to_radius(d.depth))
                                              })
                  .on("click", function(d) {navigate_to_url(d.spotify_url)})
                  .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));

  // allow for text fields
  // node_graphics_objects.append("text")
  //           .attr("dy", ".35em")
  //           .attr("dx", -10)
  //           .text(function (d) {return d.name;});

}

function ticked() {
  link_graphics_objects.attr('x1', function(d) { return d.source.x; })
    .attr('y1', function(d) { return d.source.y; })
    .attr('x2', function(d) { return d.target.x; })
    .attr('y2', function(d) { return d.target.y; });


  node_graphics_objects
            .attr("transform", function (d) {return "translate(" +
            (d.x - depth_to_radius(d.depth)) + ", " +
            (d.y - depth_to_radius(d.depth)) + ")";});
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

/*
 * Navigates browser to specified url.
 *
 * @url: the url to navigate to.
 */
function navigate_to_url(url) {
    window.open(url);
}

/******************************************************************************/
/**************************** END GRAPH RENDERING *****************************/
/******************************************************************************/
