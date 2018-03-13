/******************************************************************************/
/*********************************** SETUP ************************************/
/******************************************************************************/

/*
 * All code in this section is focused on performing setup tasks, like making
 * the initial query to Spotify for a valid API token.
 */

// our instance of the Spotify API wrapper
s = new SpotifyWebApi();

// our client id
client_id = "47c6369ae4194f96a070658bc5471db5";

if (window.location.href.indexOf("access_token") !== -1) {
  // we've been redirected already, so we have a token
  access_token = window.location.href.match(/\#(?:access_token)\=([\S\s]*?)\&/)[1];
  s.setAccessToken(access_token);
  $(document).ready(main);
} else {
  // redirect to implicit grant authorization site
  window.location.href = 'https://accounts.spotify.com/authorize?client_id=47c6369ae4194f96a070658bc5471db5&redirect_uri=https%3A%2F%2Fbrowncybersteam.github.io%2Frelated-artists-graph%2Fmusic-find.html&response_type=token&state=123'
}

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
default_artist = 'Radiohead';

/*
 * Default depth of the graph.
 */
default_depth = 2;

/*
 * Width and height of the window, with vanilla js.
 */
width = (window.innerWidth
 || document.documentElement.clientWidth
 || document.body.clientWidth);
height = (window.innerHeight
 || document.documentElement.clientHeight
 || document.body.clientHeight);

/*
 * Videogame-like tips that are displayed on loading screen.
 */
tips = ['click an artist to center them on the map.',
      'double-click an artist to go to their Spotify page.',
      'grab an artist and drag them around!',
      'use the search bar to find a specific artist.',
      'scroll to zoom in and zoom out.',
      'click anywhere on the screen and drag to explore the map.',
      'if two artists are connected on the map, it means that Spotify says they\'re related.',
      'if a map is tightly connected, the artists are more interrelated.',
      'look for distinct clusters branching off an artist to get a sense for the different genres they embody',
      'MusicFind only works on Chrome!']

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
  document.getElementById('artist_searchbar').onkeypress = keyPressEvent;
  document.getElementById('artist_searchbar').value = default_artist;
  // make default graph
  gui_setup();
  setTimeout(
    function() {
      reset(default_artist)
  }, 1000)
}

/*
 * Handler for search bar.
 * @param e: a key event
 */
function keyPressEvent(e) {
  if(e.key === "Enter") {
      document.getElementById('artist_searchbar').blur();
      current_artist = document.getElementById('artist_searchbar').value;
      reset(current_artist);
  }
}

/*
 * Hides the svg container for the graph and reloads the data structures with
 * related artist info for artist query passed in.
 * @param artist: a string, the artist query to search for
 */
function reset(artist) {
  svg.style('opacity', '0.0');
  if (!document.getElementById('loading-icon-image')) { // don't add twice on accident
    icon_container = d3.select('#loading-icon')
    icon_container.append('img')
      .attr('id', 'loading-icon-image')
      .attr('class', 'loading')
      .attr('src', 'puff.svg')
      .attr('width', '100')
      .attr('alt', '')
      .style('margin-top', '200px')
      .transition()
        .duration(1000)
        .style('opacity', '1.0')
    icon_container.append('p')
      .attr('class', 'hint loading')
      .text('tip: ' + tips[Math.floor(Math.random() * tips.length)])
    icon_container.style('opacity', '0.0')
      .transition()
        .duration(1000)
        .style('opacity', '1.0')
  }
  // reset data objects
  node_data = [];
  link_data = [];
  artists_already_added = new Set();
  console.log(artist);
  // fetch new data
  err = get_artist_id(artist, build_data_graph, {depth: default_depth});
  setTimeout(function () {
    console.log(err);
    if(err == 1) { 
      alert("Artist not found");
    }
    // update visualization
    setTimeout(function () {
      setTimeout(
        function() {
          update();
        }, 3000);
      // set visibility
      setTimeout(
        function() {
          d3.select('#loading-icon')
          .transition()
            .duration(400)
            .style('opacity', '0.0').selectAll('.loading').remove()
          svg.transition().delay(1000).duration(400).style('opacity', '1.0');
        }, 5000);
    }, 100);
  }, 150);
  if(err == 1) { return; }
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
      // console.log(data);
      image_index_to_load = 2; // index to grab image url from
      if (data.images.length < 3) {
        image_index_to_load = 0; // just in case the low res version is not present
      }
      img_link = "http://iosicongallery.com/img/512/spotify-music-2015-07-30.png"
      if (data.images.length > 0) {
        img_link = data.images[image_index_to_load].url
      }
      node_data[idx] = {
        id: data.id,
        name: data.name,
        spotify_url: data.external_urls.spotify,
        img_url: img_link,
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
        number_to_include = data.artists.length;
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
            image_index_to_load = 2; // index to grab image url from
            if (artist_data.images.length < 3) {
              image_index_to_load = 0; // just in case the low res version is not present
            }
            img_link = "http://iosicongallery.com/img/512/spotify-music-2015-07-30.png"
            if (artist_data.images.length > 0) {
              img_link = artist_data.images[image_index_to_load].url
            }
            node_data[idx] = {
              id: artist_data.id,
              name: artist_data.name,
              spotify_url: artist_data.external_urls.spotify,
              img_url: img_link,
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
        if (err) { 
          console.error(err); 
          return 1;
        }
        else { 
          console.log(data)
          if(data.artists.items.length == 0) {
            console.log("invalid artist")
            return 1;
          } else {
            callback(data.artists.items[0].id, args);
            return 0 
          }
        }
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

var repulsive_force_strength = -100 // strength of repulsive force

var svg;                    // svg selection holder
var defs;                   // for the image resources for the nodes
var simulation;             // d3 force simulation object
var link_graphics_objects;  // document objects for links
var node_graphics_objects;  // document objects for nodes
var image_objs;             // document objects for node images
var text_objs;              // document objects for text

function gui_setup() {
  // a function we'll be using for mouseover functionality
  d3.selection.prototype.move_to_front = function() {
    return this.each(function(){
      this.parentNode.appendChild(this);
    });
  };
  // set up the svg container
  svg = d3.select("#graph").append("svg")
    .attr('width', width)
    .attr('height', height)
    .call(d3.zoom()
      .scaleExtent([1 / 3, 6])
      .on("zoom", function () {
          svg.attr("transform", d3.event.transform)
        }))
      .on("dblclick.zoom", null)
    .append("g")
  // hide til we're done
  svg.attr('opacity', '0.0');

  //svg = svg.append("g")
  txt_filter = svg.append("defs")
    .append("filter")
    .attr("x", "0")
    .attr("y", "0")
    .attr("width", "1")
    .attr("height", "1")
    .attr("id", "text-bg")
  txt_filter.append("feFlood")
    .attr("flood-color", "rgba(220, 220, 220, 0.8)")
  txt_filter.append("feComposite")
    .attr("in", "SourceGraphic")
  // set up the force simulation
  simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(function(d) { return d.id }))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(width / 2 , height / 2))
  // make sure the repulsive force is strong enough
  simulation.force('charge').strength(repulsive_force_strength)
}

function update() {
   // bind the node data and the position updating function to the simulation
  d3.selectAll(".nodes").remove()
  d3.selectAll(".links").remove()
  d3.selectAll(".nametext").remove()

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
            .enter()
              .append("line")
            // .attr("stroke", "black")


  // graphical representations of nodes

  node_groups = svg.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(node_data)
            //.exit().remove()
            .enter()
            .append("g")
            .attr("class", "svg-node-container")
            .attr("id", function(d) { return d.id })

  text_objs = node_groups
            .append("text")
            .attr("class", "nametext unselectable")
            .attr("id", function(d) { return "text-" + d.id.toString() })
            .style("text-align", "center")
            .attr("text-anchor", "start")
            .attr("dy", "-.35em")
            // .attr("filter", "url(#text-bg)")
            .text(function(d) {return d.name;});

  image_objs = node_groups
            .append("foreignObject")
            .style("width", function(d) { return depth_to_radius(d.depth) * 2})
            .style("height", function(d) { return depth_to_radius(d.depth) * 2})

  divs = image_objs.append("xhtml:div")
            .attr("class", "node-container")
            .style("width", function(d) { return depth_to_radius(d.depth) * 2})
            .style("height", function(d) { return depth_to_radius(d.depth) * 2})

  divs.append("xhtml:img")
            .attr("class", "node")
            .attr("id", function(d) { return "img-" + d.id })
            .attr("width", function(d) { return depth_to_radius(d.depth) * 2})
            .attr("height", function(d) { return depth_to_radius(d.depth) * 2})
            .attr("src", function(d) { return d.img_url})
            .on("mousemove", function(d) { d3.select(this)
                                              .transition()
                                                .duration(50)
                                                .attr("width", "100")
                                                .attr("height", "100");})


            .on("mouseout", function(d) { d3.select(this)
                                              .transition()
                                                .duration(50)
                                                .attr("width", depth_to_radius(d.depth) * 2)
                                                .attr("height", depth_to_radius(d.depth) * 2);})
  var dblclick = false;
  node_graphics_objects = svg.selectAll(".svg-node-container")
                  .on("dblclick", function(d) {
                    dblclick = true;
                    console.log("double clicked");
                    navigate_to_url(d.spotify_url);
                  })
                  .on("click", function(d) {
                    setTimeout(function() {
                      if(!dblclick) {
                        document.getElementById("artist_searchbar").value = d.name
                        reset(d.name)
                      }
                      setTimeout(function() {dblclick = false;}, 400);
                    }, 400);

                  })
                  .on("mousemove", function(d) {d3.select(this)
                                                    .move_to_front()
                                                    .transition()
                                                      .duration(50)
                                                      .attr("transform", "translate(" +
                                                      (d.x - 50) + ", " +
                                                      (d.y - 50) + ")")
                                                      .attr("width", "100")
                                                      .attr("height", "100")
                                                d3.select("#img-" + d.id)
                                                    .transition()
                                                      .duration(50)
                                                      .attr("width", "100")
                                                      .attr("height", "100")})
                  .on("mouseout", function(d) {d3.select(this)
                                                    .move_to_front()
                                                    .transition()
                                                      .duration(50)
                                                      .attr("transform", "translate(" +
                                                      (d.x - depth_to_radius(d.depth)) + ", " +
                                                      (d.y - depth_to_radius(d.depth)) + ")")
                                                      .attr("width", depth_to_radius(d.depth) * 2)
                                                      .attr("height", depth_to_radius(d.depth) * 2)
                                                d3.select("#img-" + d.id)
                                                    .transition()
                                                      .duration(50)
                                                      .attr("width", depth_to_radius(d.depth) * 2)
                                                      .attr("height", depth_to_radius(d.depth) * 2)})
                  .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended))


  simulation.alphaTarget(0.3).restart();

}

function ticked() {
  link_graphics_objects.attr('x1', function(d) { return d.source.x; })
    .attr('y1', function(d) { return d.source.y; })
    .attr('x2', function(d) { return d.target.x; })
    .attr('y2', function(d) { return d.target.y; });


  node_graphics_objects
            .attr("transform", function (d) {return "translate(" +
            (d.x - d3.select("#img-" + d.id).attr("width") / 2) + ", " +
            (d.y - d3.select("#img-" + d.id).attr("height") / 2) + ")";});
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
