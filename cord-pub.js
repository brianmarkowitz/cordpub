 //Publications cord diagram prototype
//
//


google.load('visualization', '1');


google.setOnLoadCallback(drawVisualizations_start);

window.onload = function() {
    var query = new google.visualization.Query('http://docs.google.com/spreadsheet/tq?key=0AqVSrKawR254dENJa2N1TUpWdF9QLXZFaFVtMVN0ZWc&pub=1');

    query.setQuery('SELECT D,count(A) group by D');

    // Send the query with a callback function.
    query.send(handleQueryResponse_years);

    console.log("window.onload");

}


function handleQueryResponse_years(response) {
    if (response.isError()) {
        alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
        return;
    }
    var scale = 12;
    var data = response.getDataTable();
    var form = document.getElementById('list');

    var div = document.createElement("div");
    div.innerHTML = 'All Years';
    div.setAttribute('id', 'all');
    div.setAttribute('onclick', 'drawVis("SELECT * order by A asc,D desc, E desc","all","All");');
    div.style.cursor = 'pointer';
    form.appendChild(div);

    var msizer = 0;

    for (var row = 0; row < data.getNumberOfRows(); row++) {
        var year = data.getFormattedValue(row, 0);
        var sizer = Math.log(data.getFormattedValue(row, 1));
        var msizer = Math.max(sizer, msizer);
        var div = document.createElement("div");
        div.innerHTML = year;
        div.setAttribute('id', year);
        div.setAttribute('class', 'bars');
        div.setAttribute('onclick', 'drawVis("SELECT * where D=' + year + ' order by A asc,D desc, E desc","' + year + '","All");');

        div.style.height = sizer * scale + 'px';
        div.style.cursor = 'pointer';
        form.appendChild(div);

    }
}



function drawVisualizations_start() {

    var query = new google.visualization.Query('http://docs.google.com/spreadsheet/tq?key=0AqVSrKawR254dENJa2N1TUpWdF9QLXZFaFVtMVN0ZWc&pub=1');

    query.setQuery("SELECT * order by A asc,D desc, E desc");

    // Send the query with a callback function.
    query.send(handleQueryResponse);

    console.log("drawVisualizations_start");
}




function handleQueryResponse(response) {
    if (response.isError()) {
        alert('Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage());
        return;
    }
    var data = response.getDataTable();

    var vis_without_line_numbers = new myvisualization.MyTable(document.getElementById('visualization'));

    var out = vis_without_line_numbers.draw(data, {
        type: 'J'
    });

    var myNode = document.getElementById("chart");
    myNode.innerHTML = '';
    drawChords(out, '#chart');

    var myNode = document.getElementById("names");
    myNode.innerHTML = '';

    var sampleSVG = d3.select("#names");
    var authors = sampleSVG.selectAll("div").data(out.labels).enter().append("div").text(function(d, i) {
        return out.labels[i];
    }).on("mouseover", function(g, i) {
        mouseHoverSVG(i, false);
    }).on("mouseout", function(g, i) {
        mouseHoverSVG(i, true);
    }).on("mousedown", function(g, i) {
        nameClick(i);
    }).attr("id", function(d, i) {
        return "aut" + i;
    }).style("cursor", "default").style("width", "120px").style("padding", "0px 5px 0px 5px").style("float", "left");
}

function mouseHoverSVG(i, out) {
    var rr = d3.scale.category20c().range();
    d3.select('#aut' + i).style("background-color", out ? 'white' : rr[i % 20]);
    d3.select('#mainSVG').selectAll("g.chord path").filter(function(d) {
        return d.source.index != i && d.target.index != i;
    }).transition().style("opacity", out ? 1 : .1);

}

function nameClick(i) {
        var form = document.getElementById('aut'+i);
        var name = form.innerHTML;
        var cols = ['N', 'or O', 'or P', 'or Q', 'or R', 'or S'];
        var str = '';
        for (kk = 0; kk < cols.length; kk++) {
            str = str + cols[kk] + "='" + name + "' ";
        }
    drawVis('SELECT * where ' + str + ' order by A asc,D desc, E desc', 'all',name);
}



function drawVis(qText, element,name) {

    var query = new google.visualization.Query('http://docs.google.com/spreadsheet/tq?key=0AqVSrKawR254dENJa2N1TUpWdF9QLXZFaFVtMVN0ZWc&pub=1');

    query.setQuery(qText);

    // Send the query with a callback function.
    query.send(handleQueryResponse);

    var div = document.getElementById(element);


    tags = document.getElementById("list").getElementsByTagName("*");
    total = tags.length;
    for (var i = 0; i < total; i++) {
        tags[i].style.backgroundColor = 'LightCoral';
        tags[i].style.color = '#000';
    }

    div.style.backgroundColor = '#000';
    div.style.color = '#fff';

d3.select('#qq').text('Year: '+ ((element=='all')?'All':element)+'; Name: '+((name=='R.J. Baxley')?'All':name));
}



function drawChords(inVars, id) {


    var highlightcolor = "PaleTurquoise";

    var chord = d3.layout.chord().padding(.05).sortSubgroups(d3.descending).matrix((inVars.mat));

    function transpose(a) {
        return Object.keys(a[0]).map(function(c) {
            return a.map(function(r) {
                return r[c];
            });
        });
    }


    var width = 550,
        height = 550,
        innerRadius = Math.min(width, height) * .41,
        outerRadius = innerRadius * 1.1;

    var fill = d3.scale.category20c();


    var svg = d3.select(id).append("svg").attr("id", 'mainSVG').attr("width", width).attr("height", height).append("g").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var groupPath = svg.append("g").selectAll("path").data(chord.groups).enter().append("path").style("fill", function(d) {
        return fill(d.index);
    }).style("stroke", function(d) {
        return fill(d.index);
    }).attr("d", d3.svg.arc().innerRadius(innerRadius).outerRadius(outerRadius)).on("mouseover", function(g, i) {
        mouseHoverSVG(i, false);
    }).on("mouseout", function(g, i) {
        mouseHoverSVG(i, true);
    }).on("mousedown", function(g, i) {
        nameClick(i);
    }).attr("id", function(d, i) {
        return "p" + i;
    });


    var groupText = svg.append("g").selectAll("text").data(chord.groups).enter().append("text").attr("dy", 15).attr("x", 6);


    groupText.append("textPath").attr("xlink:href", function(d, i) {
        return "#p" + i;
    }).text(function(d, i) {
        return inVars.labels[i];
    }).on("mouseover", function(g, i) {
        mouseHoverSVG(i, false);
    }).on("mouseout", function(g, i) {
        mouseHoverSVG(i, true);
    }).on("mousedown", function(g, i) {
        nameClick(i);
    }).style("cursor", "default");


    // Remove the labels that don't fit. :(
    groupText.filter(function(d, i) {
        return groupPath[0][i].getTotalLength() / 2 - 30 < this.getComputedTextLength();
    }).remove();


    var ticks = svg.append("g").selectAll("g").data(chord.groups).enter().append("g").selectAll("g").data(groupTicks).enter().append("g").attr("transform", function(d) {
        return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" + "translate(" + outerRadius + ",0)";
    });

    ticks.append("line").attr("x1", 1).attr("y1", 0).attr("x2", 5).attr("y2", 0).style("stroke", "#000");

    ticks.append("text").attr("x", 8).attr("dy", ".35em").attr("text-anchor", function(d) {
        return d.angle > Math.PI ? "end" : null;
    }).attr("transform", function(d) {
        return d.angle > Math.PI ? "rotate(180)translate(-16)" : null;
    }).text(function(d) {
        return d.label;
    });

    svg.append("g").attr("class", "chord").selectAll("path").data(chord.chords).enter().append("path").style("fill", function(d) {
        return fill(d.target.index);
    }).attr("d", d3.svg.chord().radius(innerRadius)).style("opacity", 1);

    /** Returns an array of tick angles and labels, given a group. */

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

var myvisualization = {};




myvisualization.MyTable = function(container) {
    this.containerElement = container;
}


myvisualization.MyTable.prototype.draw = function(data, options) {
    var authors = new twoDArr();
    var month = new Array();
    var roundfac = 100;
    month[0] = "January";
    month[1] = "February";
    month[2] = "March";
    month[3] = "April";
    month[4] = "May";
    month[5] = "June";
    month[6] = "July";
    month[7] = "August";
    month[8] = "September";
    month[9] = "October";
    month[10] = "November";
    month[11] = "December";

    var html = [];
    var arow = 13;

    var jnum = 0;
    var cnum = 0;
    var pnum = 0;
    var tnum = 0;
    var bcnum = 0;
    html.push('<div id="results">' + data.getNumberOfRows() + ' results</div>');
    html.push('<table border="0">');
    html.push('<tr>');
    html.push('<td align="right" valign="top">');

        authors.setVal('R.J. Baxley', 'R.J. Baxley', 0);
    for (var row = 0; row < data.getNumberOfRows(); row++) {
        var str = [];

        if (data.getFormattedValue(row, 0) == 'BC') {

            if (bcnum == 0) {
                html.push('</td></tr></table>');
                html.push('<div id="PubType">Book Chapter</div>');
                html.push('<table border="0">');
            }
            html.push('<tr>');
            html.push('<td align="right" valign="top">');
            bcnum++;
            html.push('[BC' + bcnum);
            str.push('"' + eHtml(data.getFormattedValue(row, 1)) + '," ' + eHtml(data.getFormattedValue(row, 9)) + ', ');

        } else if (data.getFormattedValue(row, 0) == '0J') {

            if (jnum == 0) {
                html.push('</td></tr></table>');
                html.push('<div id="PubType">Journal</div>');
                html.push('<table border="0">');
            }
            html.push('<tr>');
            html.push('<td align="right" valign="top">');
            jnum++;
            html.push('[J' + jnum);
            str.push('"' + eHtml(data.getFormattedValue(row, 1)) + '," <i>' + eHtml(data.getFormattedValue(row, 2)) + '</i>, ');
            str.push((data.getFormattedValue(row, 5).length > 0) ? ('vol. ' + data.getFormattedValue(row, 5) + ', ') : '');
            str.push((data.getFormattedValue(row, 6).length > 0) ? ('no. ' + data.getFormattedValue(row, 6) + ', ') : '');
            str.push((data.getFormattedValue(row, 7).length > 0) ? ('pp. ' + data.getFormattedValue(row, 7) + ', ') : '');


        } else if (data.getFormattedValue(row, 0) == 'C') {

            if (cnum == 0) {
                html.push('</td></tr></table>');
                html.push('<div id="PubType">Conference</div>');
                html.push('<table border="0">');
            }
            html.push('<tr>');
            html.push('<td align="right" valign="top">');
            cnum++;
            html.push('[C' + cnum);
            str.push('"' + eHtml(data.getFormattedValue(row, 1)));
            str.push('," in <i>Proc. ' + eHtml(data.getFormattedValue(row, 2)) + '</i>, ');
            str.push((data.getFormattedValue(row, 7).length > 2) ? ('pp. ' + eHtml(data.getFormattedValue(row, 7)) + ', ') : '');
            str.push(eHtml(data.getFormattedValue(row, 8)) + ', ');

        } else if (data.getFormattedValue(row, 0) == 'P') {

            if (pnum == 0) {
                html.push('</td></tr></table>');
                html.push('<div id="PubType">Patent</div>');
                html.push('<table border="0">');
            }
            html.push('<tr>');
            html.push('<td align="right" valign="top">');
            pnum++;
            html.push('[P' + pnum);
            str.push('"' + eHtml(data.getFormattedValue(row, 1)) + '," ' + eHtml(data.getFormattedValue(row, 9)) + ', ');


        } else if (data.getFormattedValue(row, 0) == 'T') {

            if (tnum == 0) {
                html.push('</td></tr></table>');
                html.push('<div id="PubType">Thesis</div>');
                html.push('<table border="0">');
            }
            html.push('<tr>');
            html.push('<td align="right" valign="top">');
            tnum++;
            html.push('[T' + tnum);
            str.push('"' + eHtml(data.getFormattedValue(row, 1)) + '," ' + eHtml(data.getFormattedValue(row, 9)) + ', ');

        }

        html.push(']</td>');

        html.push('<td align="left">');


        html.push(eHtml(data.getFormattedValue(row, arow)));




        if (data.getFormattedValue(row, arow + 1).length < 1) {
            html.push(", ");
        }
        var mark = false;
        var col = arow;
        for (col = arow + 1; col < data.getNumberOfColumns(); col++) {

            if (data.getFormattedValue(row, col).length > 2) {
                if (data.getFormattedValue(row, col + 1).length < 3) {
                    html.push(" & " + eHtml(data.getFormattedValue(row, col)) + ", ");
                    mark = true;
                    break;
                } else {
                    html.push(", " + eHtml(data.getFormattedValue(row, col)));
                }
            }

        }


        if (!mark) {
            col = arow;
        }

        for (var kk = arow; kk < col + 1; kk++) {
            var num = col - arow + 1;
            //set authors matrix
                for (var jj = arow; jj < col + 1; jj++) {
                        var cur = authors.getVal(data.getFormattedValue(row, kk), data.getFormattedValue(row, jj));
                        authors.setVal(data.getFormattedValue(row, kk), data.getFormattedValue(row, jj), 1 / (num ) + cur);
            }
        }

        html.push(str.join(''));
        html.push((data.getFormattedValue(row, 4).length > 0) ? (month[eHtml(data.getFormattedValue(row, 4)) - 1] + ' ') : '');
        html.push(eHtml(data.getFormattedValue(row, 3)) + '.');


        html.push('<br />');
        //html.push('[Cited by ');
        //html.push((data.getFormattedValue(row, 12) == 0) ? data.getFormattedValue(row, 12) + '] ' : '<a href="http://scholar.google.com/scholar?oi=bibs&hl=en&cites=' + data.getFormattedValue(row, 11) + '">' + data.getFormattedValue(row, 12) + '</a>] ');


        html.push((data.getFormattedValue(row, 10).length < 3) ? '' : '[<a href="https://docs.google.com/uc?export=download&id=' + data.getFormattedValue(row, 10) + '">pdf</a>] ');

        html.push('</td>');
        html.push('</tr>');
    }
    html.push('</table>');
    //html.push(authors.printVals(100));
    this.containerElement.innerHTML = html.join('');

    return authors.ob2arr();
}


eHtml = function(text) {
    if (text == null) {
        return '';
    }
    return text.replace(/&/g, '&').
    replace(/</g, '<').
    replace(/>/g, '>').
    replace(/"/g, '"');
}


function twoDArr() {
    this.arr = {};
}


twoDArr.prototype.setVal = function(row, col, val) {
    if (row in this.arr) {
        var temp = this.arr[row];
    } else {
        var temp = {};
    }
    temp[col] = val;
    this.arr[row] = temp;
}
twoDArr.prototype.getVal = function(row, col) {
    var val = 0;
    if (row in this.arr) {
        if (col in this.arr[row]) {
            var val = this.arr[row][col];
        }
    }
    return val;
}


twoDArr.prototype.printVals = function(roundfac) {
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

twoDArr.prototype.fill = function() {
    for (var kk in this.arr) {
        for (var jj in this.arr) {
            this.setVal(kk, jj, this.getVal(kk, jj));
        }
    }
}

twoDArr.prototype.ob2arr = function() {
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
