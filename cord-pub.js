/*
Assumes d3 and Google's japi have both been loaded.  For example,
    <script type="text/javascript" src="http://d3js.org/d3.v2.js" charset="utf-8"></script>
    <script type="text/javascript" src="http://www.google.com/jsapi?fake=.js" charset="utf-8"></script>

Author: Bob Baxley, bob@rjbaxley.com
License: MIT
*/

var cordpub = new pubDoc();

if (typeof google == 'undefined') {
    console.log('google jsapi not found');
    console.log('run: <script type="text/javascript" src="http://www.google.com/jsapi?fake=.js" charset="utf-8"></script>');
}
if (typeof d3 == 'undefined') {
    console.log('d3 not found');
    console.log('run: <script type="text/javascript" src="http://d3js.org/d3.v2.js" charset="utf-8"></script>');
}


google.load('visualization', '1');


function columnToLetter(column) {
    column += 1;
    var temp, letter = '';
    while (column > 0) {
        temp = (column - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        column = (column - temp - 1) / 26;
    }
    return letter;
}

function range(start, stop, step){
  var a=[start], b=start;
  while(b<stop){b+=step;a.push(b)}
  return a;
};

function columnifyQuery(queryText) {
    /*
    Converts a string like
        "select * order by %%Author%%"
    to
        "select * order by B"
    */
    for (var col = 0; col < cordpub.columsArray.length; col++) {
        // replace value in template
        queryText = queryText.replace(
            "%%" + cordpub.columsArray[col] + "%%",
            columnToLetter(col));
    }
    return queryText

}

var formatValues = {
    Authors: function(value) {
        var author_list = value.split(",");
        var num_authors = author_list.length;
        if (num_authors > 1) {
            return (author_list
                .slice(0, num_authors - 1)
                .join(', ') + " & " + author_list[num_authors - 1]);
        } else {
            return author_list[0];
        }
    },
    Month: function(value) {
        var monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        return monthNames[value - 1];
    }

}



function pubDoc(key) {
    this.pubs = {};
    this.authors = {};
    this.year = {};
    this.venues = {};
    this.authorGraph = new TwoDNamedArray();
    this.columsByName = {};
    this.columsArray = [];
}

pubDoc.prototype.init = function(
    key,
    formats,
    author_list_div,
    cord_plot_div,
    colorRange
) {
    /*

    INPUTS
    key = google sheets key
        add "&gid=[gid]" to query a sheet other than the first sheet
    formats = json of publication type templates
    author_list_div = name of div id for author list; or false to not show
    cord_plot_div = name of div id for cord plot; or false to not show
    colorRange = list of colors or d3 color scale


    Example arguments:
    colorRange = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"]
      or
    colorRange = d3.scale.category10()

    formats = {
            "Journal": '<div class="row"><div class="type_count col">[J%%Counter%%]</div><div class="citation col">%%Authors%%, "%%Title%%," <i>%%Venue%%</i>, vol. %%Volume%%, no. %%Number%%, pp. %%Pages%%, %%Month%% %%Year%%.</div></div>',
            "Patent": '<div class="row"><div class="type_count col">[P%%Counter%%]</div><div class="citation col">%%Authors%%, %%Title%%, %%Misc_Description%%, %%Month%% %%Year%%.</div></div>'
        }

    */


    // google sheets key
    this.key = key;

    // json of formats for each document type
    // prints data to div with id equal to json key
    this.formats = formats;

    this.author_list_div = author_list_div;
    this.cord_plot_div = cord_plot_div;

    if (colorRange) {
        // convert list to d3 color scale
        if (typeof colorRange != "function") {
            colorRange = d3.scale.ordinal()
              .domain(range(0,colorRange.length,1))
              .range(colorRange);
        }
    }
    this.colorRange = colorRange

    this.queryBase(
        "select * limit 1",
        function(dataTable) {
            cordpub.dataTable = dataTable;
            cordpub.createLabels();
            cordpub.getAllPubs();

        }
    );
}

pubDoc.prototype.createLabels = function() {
    // loop through publication types and store as two jsons
    for (var col = 0; col < cordpub.dataTable.getNumberOfColumns(); col++) {
        columnLabel = cordpub.dataTable.getColumnLabel(col);
        cordpub.columsByName[columnLabel] = col;
        cordpub.columsArray[col] = columnLabel;

        // check to see if we have a formatter for column
        if (typeof formatValues[cordpub.columsArray[col]] == "undefined") {
            console.log(cordpub.columsArray[col]);
            formatValues[cordpub.columsArray[col]] = function(value) {
                return value;
            }
        }
    }
}

pubDoc.prototype.initalizeTypeData = function() {
    cordpub.typeCount = {};
    cordpub.stringsByType = {}
    for (var key in cordpub.formats) {
        if (cordpub.formats.hasOwnProperty(key)) {
            cordpub.typeCount[key] = 0;
            cordpub.stringsByType[key] = [];
        }
    }
}

pubDoc.prototype.printTable = function() {
    for (var key in cordpub.stringsByType) {
        if (cordpub.formats.hasOwnProperty(key)) {
            d3.select("#" + key)
            .html("")
            if (cordpub.stringsByType[key].length>0) {
                // add publications
                d3.select("#" + key)
                    .selectAll("div")
                    .data(cordpub.stringsByType[key])
                    .enter()
                    .append("div")
                    .html(function(d) {
                        return d;
                    })
                    .attr("id", key + "-entries")
                    .attr("class", "div-table");

                // add headers
                d3.select("#" + key)
                    .insert("div",":first-child")
                    .attr("id", key + "-header")
                    .attr("class", "key-header")
                    .text(key);
            }
        }
    }
}

pubDoc.prototype.createStrings = function() {
    /*
    Loops through dataTable and applies format template to each row.
    */

    cordpub.initalizeTypeData();

    // loop through row data
    for (var row = 0; row < cordpub.dataTable.getNumberOfRows(); row++) {
        // extract type
        var pubType = cordpub.dataTable.getFormattedValue(
            row,
            cordpub.columsByName.Type);

        cordpub.typeCount[pubType]++;

        // extract template
        var current = cordpub.formats[pubType];

        // replace counter in template
        current = current.replace(
            "%%Counter%%",
            cordpub.typeCount[pubType]);

        // loop through columns
        for (var col = 0; col < cordpub.columsArray.length; col++) {

            // apply formatter for column
            var formatted_value = formatValues[cordpub.columsArray[col]](
                cordpub.dataTable.getFormattedValue(row, col));

            // replace value in template
            current = current.replace(
                "%%" + cordpub.columsArray[col] + "%%",
                formatted_value);
        }
        cordpub.stringsByType[pubType].push(current);
    }
    console.log(cordpub.pubString);
}

pubDoc.prototype.queryBase = function(queryText, callback) {
    var baseURL = 'http://docs.google.com/spreadsheet/tq?key=';
    var query = new google.visualization.Query(baseURL + cordpub.key);
    console.log(baseURL + cordpub.key);
    console.log(columnifyQuery(queryText));

    query.setQuery(columnifyQuery(queryText));

    query.send(function(response) {
        callback(response.getDataTable());
    });
}

pubDoc.prototype.getAllPubs = function() {
    this.queryBase(
        "select * order by %%Year%% desc, %%Month%% desc",
        this.handle_getPubs);
}

pubDoc.prototype.getPubsForAuthor = function(author) {
    cordpub.queryBase(
        "select * where %%Authors%% contains '" + author + "' order by %%Year%% desc, %%Month%% desc",
        cordpub.handle_getPubs);
}

pubDoc.prototype.getPubsForYear = function(year) {
    cordpub.queryBase(
        "select * where %%Year%% = " + year + " order by %%Year%% desc, %%Month%% desc",
        cordpub.handle_getPubs);
}

pubDoc.prototype.getPubsForVenue = function(venue) {
    this.queryBase(
        "select * where %%Venue%% = " + venue + " order by %%Year%% desc, %%Month%% desc",
        this.handle_getPubs);
}

pubDoc.prototype.handle_getPubs = function(dataTable) {
    cordpub.dataTable = dataTable;

    // find publication types
    cordpub.createLabels();

    // use format template to make html rows for each publication
    cordpub.createStrings();

    // print table to page
    cordpub.printTable();

    if (cordpub.cord_plot_div || cordpub.author_list_div) {
        // create author graph
        cordpub.createTwoDNamedArrayFromTable();
        console.log(cordpub.authorGraph);
    }

    if (cordpub.cord_plot_div) {
        console.log(cordpub.cord_plot_div)
        // draw cord plot
        drawChordPlot(cordpub.authorGraph, cordpub.cord_plot_div);
    }

    if (cordpub.author_list_div) {
        console.log(cordpub.author_list_div)
        // draw author links
        drawAuthorList(cordpub.authorGraph, cordpub.author_list_div);
    }
}

pubDoc.prototype.createTwoDNamedArrayFromTable = function() {

    cordpub.authorGraph = new TwoDNamedArray();
    // loop through each row
    for (var row = 0; row < cordpub.dataTable.getNumberOfRows(); row++) {
        var author_list =
            cordpub.dataTable.getFormattedValue(row, cordpub.columsByName.Authors)
            .split(',');
        var num_authors = author_list.length;

        // create weights for the symetric graph
        for (var arow = 0; arow < num_authors; arow++) {
            for (var acol = 0; acol < num_authors; acol++) {
                var currentWeight = cordpub.authorGraph.getVal(
                    author_list[arow],
                    author_list[acol]);
                cordpub.authorGraph.setVal(
                    author_list[arow],
                    author_list[acol],
                    1 / (num_authors) + currentWeight);
            }
        }
    }
}



function getYears() {}

function handle_getYears(response) {
    console.log(response.getDataTable());
}


function getAuthors(key) {}

function handle_getAuthors(response) {
    console.log(response.getDataTable());
}


function getVenues(key) {}

function handle_getVenues(response) {
    console.log(response.getDataTable());
}

function mouseHoverSVG(i, out) {
    d3.select('#'+cordpub.author_list_div)
        .select("#aut" + i)
        .style("background-color", out ? 'transparent' : cordpub.colorRange(i));

    d3.select('#'+cordpub.cord_plot_div)
        .selectAll("g.chord path")
        .filter(function(d) {
            return d.source.index != i && d.target.index != i;
        })
        .transition()
        .style("opacity", out ? 1 : .1);
}

function nameClick(i) {
    var name = d3.select('#'+cordpub.author_list_div).select("#aut" + i).text();
    cordpub.getPubsForAuthor(name);
    console.log(i + " was clicked");
}


function drawChordPlot(data, id, hoverCallback, clickCallback) {
    /*
    Adds Chord diagram plot to element "id"
    Width and height of diagram are inherited from element css
    Code based on http://bl.ocks.org/mbostock/4062006

    Inputs:
    id = element id where plot is created
    data = TwoDNamedArray object with plot data
    */

    var inVars = data.ob2arr_dict();

    // clear element of old vis
    document.getElementById(id).innerHTML = '';
    var width = document.getElementById(id).offsetWidth;
    var height = document.getElementById(id).offsetHeight;

    var chord = d3
        .layout
        .chord()
        .padding(.05)
        .sortSubgroups(d3.descending)
        .matrix((inVars.mat));

    var innerRadius = Math.min(width, height) * .41,
        outerRadius = innerRadius * 1.1;

    var fill = d3.scale.category20c();

    // Create SVG
    var svg = d3
        .select("#" + id)
        .append("svg")
        .attr("id", 'mainSVG')
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    // Add chords
    svg
        .append("g")
        .attr("class", "chord")
        .selectAll("path")
        .data(chord.chords)
        .enter()
        .append("path")
        .style("fill", function(d) {
            return cordpub.colorRange(d.target.index);
        })
        .attr("d", d3.svg.chord().radius(innerRadius))
        .style("opacity", 1);

    // Add chord groups (edges around chords)
    var groupPath = svg
        .append("g")
        .selectAll("path")
        .data(chord.groups)
        .enter()
        .append("path")
        .style("fill", function(d) {
            return cordpub.colorRange(d.index);
        })
        .style("stroke", function(d) {
            return cordpub.colorRange(d.index);
        })
        .attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius))
        .on("mouseover", function(g, i) {
            mouseHoverSVG(i, false);
        })
        .on("mouseout", function(g, i) {
            mouseHoverSVG(i, true);
        })
        .on("mousedown", function(g, i) {
            nameClick(i);
        })
        .attr("id", function(d, i) {
            return "p" + i;
        });


    // create chord labels
    var groupText = svg
        .append("g")
        .selectAll("text")
        .data(chord.groups)
        .enter()
        .append("text")
        .attr("dy", 15)
        .attr("x", 6);


    // add text to chord labels
    groupText.append("textPath")
        .attr("xlink:href", function(d, i) {
            return "#p" + i;
        })
        .text(function(d, i) {
            return inVars.labels[i];
        })
        .on("mouseover", function(g, i) {
            mouseHoverSVG(i, false);
        })
        .on("mouseout", function(g, i) {
            mouseHoverSVG(i, true);
        })
        .on("mousedown", function(g, i) {
            nameClick(i);
        })
        .style("cursor", "default")
        .attr("class", "chord_labels");


    // Remove the labels that don't fit
    groupText
        .filter(function(d, i) {
            return groupPath[0][i].getTotalLength() / 2 - 30 < this.getComputedTextLength();
        })
        .remove();

    // Add tent objects
    var ticks = svg
        .append("g")
        .selectAll("g")
        .data(chord.groups)
        .enter()
        .append("g")
        .selectAll("g")
        .data(groupTicks)
        .enter()
        .append("g")
        .attr("transform", function(d) {
            return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" + "translate(" + outerRadius + ",0)";
        });

    // Add actual tick lines
    ticks
        .append("line")
        .attr("x1", 1)
        .attr("y1", 0)
        .attr("x2", 5)
        .attr("y2", 0)
        .style("stroke", "#000");

    // Add tick labels
    ticks
        .append("text")
        .attr("x", 8)
        .attr("dy", ".35em")
        .attr("text-anchor", function(d) {
            return d.angle > Math.PI ? "end" : null;
        })
        .attr("transform", function(d) {
            return d.angle > Math.PI ? "rotate(180)translate(-16)" : null;
        })
        .text(function(d) {
            return d.label;
        })
        .attr("class", "tick_labels");

    // Define tick locations
    function groupTicks(d) {
        var k = (d.endAngle - d.startAngle) / d.value;
        return d3.range(0, d.value, 1).map(function(v, i) {
            if (v != 0) {
                return {
                    angle: v * k + d.startAngle,
                    label: (i % 5) ? null : v + ""
                };
            } else {
                return {
                    angle: v * k + d.startAngle,
                    label: null
                };
            }
        });
    }
}


function drawAuthorList(data, id) {

    var out = data.ob2arr_dict();
    var myNode = document.getElementById(id);
    myNode.innerHTML = '';

    d3.select("#" + id)
        .selectAll("div")
        .data(out.labels)
        .enter()
        .append("div")
        .text(function(d, i) {
            return out.labels[i];
        })
        .on("mouseover", function(g, i) {
            mouseHoverSVG(i, false);
        })
        .on("mouseout", function(g, i) {
            mouseHoverSVG(i, true);
        })
        .on("mousedown", function(g, i) {
            nameClick(i);
        })
        .attr("id", function(d, i) {
            return "aut" + i;
        })
        .attr("class", "author_box");
}

function TwoDNamedArray() {
    /*
    Object that stores named and weighted adjacency matrices
    */
    this.arr = {};
}


TwoDNamedArray.prototype.setVal = function(row, col, val) {
    if (row in this.arr) {
        var temp = this.arr[row];
    } else {
        var temp = {};
    }
    temp[col] = val;
    this.arr[row] = temp;
}
TwoDNamedArray.prototype.getVal = function(row, col) {
    var val = 0;
    if (row in this.arr) {
        if (col in this.arr[row]) {
            var val = this.arr[row][col];
        }
    }
    return val;
}


TwoDNamedArray.prototype.printVals = function(roundfac) {
    var html = [];
    html.push('[');
    for (var kk in this.arr) {
        html.push(kk + ' [');
        for (var jj in this.arr[kk]) {
            html.push(jj + ':' + Math.round(this.arr[kk][jj] * roundfac) / roundfac + ',');
        }
        html.push(']<br />');
    }
    html.push(']');
    return (html.join(''));
}

TwoDNamedArray.prototype.fill = function() {
    for (var kk in this.arr) {
        for (var jj in this.arr) {
            this.setVal(kk, jj, this.getVal(kk, jj));
        }
    }
}

TwoDNamedArray.prototype.ob2arr_dict = function() {
    var out = [];
    var names = [];
    var row = 0;
    for (var kk in this.arr) {
        var col = 0;
        var temp = [];
        for (var jj in this.arr) {
            temp[col] = this.getVal(kk, jj);
            col++;
        }
        out[row] = temp;
        names[row] = kk;
        row++;
    }
    return {
        mat: out,
        labels: names
    };
}
