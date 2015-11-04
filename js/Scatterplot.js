
// from http://bl.ocks.org/rveciana/5181105
d3.helper = {};
d3.helper.tooltip = function(accessor){
    return function(selection){
        var tooltipDiv;
        var bodyNode = d3.select('body').node();
        selection.on("mouseover", function(d, i){
            // Clean up lost tooltips
            d3.select('body').selectAll('div.tooltip').remove();
            // Append tooltip
            tooltipDiv = d3.select('body').append('div').attr('class', 'scatterplot-tooltip');
            var absoluteMousePos = d3.mouse(bodyNode);
            tooltipDiv.style('left', (absoluteMousePos[0] + 10)+'px')
                .style('top', (absoluteMousePos[1] - 15)+'px')
                .style('position', 'absolute') 
                .style('z-index', 1001)
				.style('background-color', '#fff')
				.style('border', '1px solid #777')
				.style('border-radius', '4px')
				.style('padding', '4px 6px')
				.style('font-family', "'Century Gothic', CenturyGothic, Geneva, AppleGothic, sans-serif")
				.style('font-size', '12px');
            // Add text using the accessor function
            var tooltipText = accessor(d, i) || '';
            // Crop text arbitrarily
            //tooltipDiv.style('width', function(d, i){return (tooltipText.length > 80) ? '300px' : null;})
            //    .html(tooltipText);
        })
        .on('mousemove', function(d, i) {
            // Move tooltip
            var absoluteMousePos = d3.mouse(bodyNode);
            tooltipDiv.style('left', (absoluteMousePos[0] + 20)+'px')
                .style('top', (absoluteMousePos[1])+'px');
            var tooltipText = accessor(d, i) || '';
            tooltipDiv.html(tooltipText);
        })
        .on("mouseout", function(d, i){
            // Remove tooltip
            tooltipDiv.remove();
        });

    };
};

/** @parm options
 *		<ul>
 *			<li>container: ID to div that will contain the scatterplot</li>
 *			<li>data: the data to plot as an array of values</li>
 *			<li>dataPointName: data category value to use as unique name for each point</li>
 *			<li>xValueName: data category value to use as x-axis location</li>
 *			<li>yValueName: data category value to use as y-axis location</li>
 *			<li>xAxisLabel: x-axis label</li>
 *			<li>yAxisLabel: y-axis label</li>
 *			<li>width: (optional - defaults to 600px)</li>
 *			<li>height: (optional - defaults to 400px)</li>
 *			<li>margin: (optional - defaults to top-20, right-190, bottom-30, left-40)</li>
 *		</ul> */
var Scatterplot = {
	
	create: function(options) {
		var data = [];
		var minMax = { x: null, y: null };
		var lines = { names: [], coords: [] };
		// first we gotta comb through the data and organize it nicely
		for(var i = 0; i < options.data.length; i++) {
			// nicely organize data
			data.push({
				name: options.data[i][options.dataPointName], 
				x: parseFloat(options.data[i][options.xValueName]), // ensure numeric type
				y: parseFloat(options.data[i][options.yValueName])
			});
			// get min max values
			if(!minMax.x) {
				minMax.x = [data[i].x , data[i].x];
			} else if(data[i].x < minMax.x[0]) {
				minMax.x[0] = data[i].x;
			} else if(data[i].x > minMax.x[1]) {
				minMax.x[1] = data[i].x;
			}
			if(!minMax.y) {
				minMax.y = [data[i].y , data[i].y];
			} else if(data[i].y < minMax.y[0]) {
				minMax.y[0] = data[i].y;
			} else if(data[i].y > minMax.y[1]) {
				minMax.y[1] = data[i].y;
			}
			// group values of the same data point name together (to create lines)
			if(data[i].name) {
				var lineIndex = lines.names.indexOf(data[i].name);
				if(lineIndex < 0) {
					lines.names.push(data[i].name);
					lines.coords.push (
						[[ data[i].x, data[i].y, 1 ]] // array of [x, y, and count]
					);
				} else {
					// check there's not more than one data point for that x-value
					var exists = false;
					for(var j = 0; j < lines.coords[lineIndex].length; j++) {
						var c = lines.coords[lineIndex][j];
						if(c[0] === data[i].x) {
							// if it exists, add to count and use average y-value
							c[2] += 1;
							c[1] = (c[1]*(c[2]-1) + data[i].y)/c[2];
							exists = true;
							break;
						}
					}
					if(!exists) {
						// if it doesn't exist, push a new data point
						lines.coords[lineIndex].push(
							[data[i].x, data[i].y, 1]
						);
					}
				}
			}
		}
		// clean-up lines data
		for(var i = 0; i < lines.coords.length; i++) {
			if(lines.coords[i].length >= 2) {
				// make sure x-values are in ascending order
				lines.coords[i].sort(function(a, b) {
					return a[0] - b[0];
				});
			}
		}
		// always set y-min to 0, extend max by 10% to avoid overlap on edges
		minMax.y[0] = 0;
		minMax.y[1] *= 1.1;
		// extend range of x-min/max by one to avoid overlap on edges (and also min. of 3 x-range)
		minMax.x[0] -= 1;
		minMax.x[1] += 1;
		
		// adjust width and height by margins
		var margin = (options.margin) ? options.margin : {top: 20, right: 190, bottom: 30, left: 40};
		var width = ((options.width) ?  options.width : 600) - margin.left - margin.right;
		var height = ((options.height) ?  options.height : 400) - margin.top - margin.bottom;
		// 10 category color scale -- if points have more than 10 unique species this may be a problem later
		var color = d3.scale.category10();
		
		// create the SVG
		var svg = d3.select("#"+options.container)
		  .append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
		  .append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		
		// x-axis
		var xScale = d3.scale.linear()
		  .domain(minMax.x)
		  .range([0, width]);
		var xAxis = d3.svg.axis()
		  .scale(xScale)
		  .tickFormat(d3.format('.0f'))
		  .ticks(minMax.x[1] - minMax.x[0])
		  .orient("bottom");
		svg.append("g")
			.attr("class", "scatterplot-xaxis")
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis)
		  .append("text")
			.attr("class", "scatterplot-label")
			.attr("x", width)
			.attr("y", -6)
			.style("text-anchor", "end")
			.style("font-weight", "bolder")
			.text(options.xAxisLabel);
	
		// y-axis
		var yScale = d3.scale.linear()
		  .domain(minMax.y)
		  .range([height, 0]);
		var yAxis = d3.svg.axis()
		  .scale(yScale)
		  .orient("left");
		svg.append("g")
			.attr("class", "scatterplot-yaxis")
			.call(yAxis)
		  .append("text")
			.attr("class", "scatterplot-label")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", ".71em")
			.style("text-anchor", "end")
			.style("font-weight", "bolder")
			.text(options.yAxisLabel);
		
		// grid
		svg.append("g")         
			.attr("class", "scatterplot-grid")
			.attr("transform", "translate(0," + height + ")")
			.style("opacity", 0.7)
			.call(xAxis
				.tickSize(-height, 0, 0)
				.tickFormat("")
			);
		svg.append("g")         
			.attr("class", "scatterplot-grid")
			.attr("opacity", 0.7)
			.call(yAxis
				.tickSize(-width, 0, 0)
				.tickFormat("")
			);
	
		// lines
		svg.selectAll(".scatterplot-line")
			.data(lines.coords)
		  .enter().append("path")
			.attr("class", "scatterplot-line")
			.style("stroke", function(l, i) { return color(lines.names[i]); }) 
			.style("stroke-width", 1.5)
			.style("fill", 'none')
			.attr("d",
				d3.svg.line()
				  .x(function(coords) { return xScale(coords[0]); })
				  .y(function(coords) { return yScale(coords[1]); })
			);
		
		// points
		svg.selectAll(".scatterplot-dot")
			.data(data)
		  .enter().append("rect")
			.attr("class", "scatterplot-point")
			.attr("width", 10)
			.attr("height", 10)
			.attr("x", function(d) { return xScale(d.x)-5; })
			.attr("y", function(d) { return yScale(d.y)-5; })
			.attr("transform", function(d) { return "rotate(45," + xScale(d.x) + "," + yScale(d.y) + ")"; })
			.style("fill", function(d) { return color(d.name);}) 
			.call(d3.helper.tooltip(function(d, i) { 
				return ("<b>" + d.name + "</b><br />" + d.y + " in " + d.x); 
			}));
		
		// legend
		var legend = svg.selectAll(".scatterplot-legend")
			.data(color.domain())
		  .enter().append("g")
			.attr("class", "scatterplot-legend")
			.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
		legend.append("rect")
		  .attr("x", width + 5)
		  .attr("width", 18)
		  .attr("height", 18)
		  .style("fill", color);
		legend.append("text")
          .attr("x", width + 28)
          .attr("y", 9)
          .attr("dy", ".35em")
          .style("text-anchor", "start")
          .text(function(d) { return d; });
		
		return svg;
	}
	
};