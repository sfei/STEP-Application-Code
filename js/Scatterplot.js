
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
 *			<li>margin: (optional - defaults to top-20, right-150, bottom-30, left-40)</li>
 *		</ul> */
var Scatterplot = function(options) {
	
	this.init = function(options) {
		var data = [];
		for(var i = 0; i < options.data.length; i++) {
			data.push({
				name: options.data[i][options.dataPointName], 
				x: options.data[i][options.xValueName], 
				y: options.data[i][options.yValueName]
			});
		}
		var minMax = {
			x: [
				Math.min.apply(Math, data.map(function(d) { return d.x; }))-1,
				Math.max.apply(Math, data.map(function(d) { return d.x; }))+1
			],
			y: [ 0, Math.max.apply(Math, data.map(function(d) { return d.y; })) ]
		};
		
		var margin = (options.margin) ? options.margin : {top: 20, right: 150, bottom: 30, left: 40};
		var width = ((options.width) ?  options.width : 600) - margin.left - margin.right;
		var height = ((options.height) ?  options.height : 400) - margin.top - margin.bottom;
		
		var xScale = d3.scale.linear()
		  .domain(minMax.x)
		  .range([0, width]);
		var xAxis = d3.svg.axis()
		  .scale(xScale)
		  .tickFormat(d3.format('.0f'))
		  .ticks(minMax.x[1] - minMax.x[0])
		  .orient("bottom");
		
		var yScale = d3.scale.linear()
		  .domain(minMax.y)
		  .range([height, 0]);
		var yAxis = d3.svg.axis()
		  .scale(yScale)
		  .orient("left");
		
		var color = d3.scale.category10();
		
		$("#"+options.container).html("");
		var svg = d3.select("#"+options.container)
		  .append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
		  .append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	
		var tooltip = d3.select("#"+options.container).append("div")
			.attr("class", "scatterplot-tooltip")
			.style("opacity", 0);
		
		svg.append("g")
			.attr("class", "scatterplot-xaxis")
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis)
		  .append("text")
			.attr("class", "scatterplot-label")
			.attr("x", width)
			.attr("y", -6)
			.style("text-anchor", "end")
			.text(options.xAxisLabel);			
	
		svg.append("g")
			.attr("class", "scatterplot-yaxis")
			.call(yAxis)
		  .append("text")
			.attr("class", "scatterplot-label")
			.attr("transform", "rotate(-90)")
			.attr("y", 6)
			.attr("dy", ".71em")
			.style("text-anchor", "end")
			.text(options.yAxisLabel);
	
		svg.selectAll(".scatterplot-dot")
			.data(data)
		  .enter().append("circle")
			.attr("class", "dot")
			.attr("r", 8)
			.attr("cx", function(d) { return xScale(d.x); })
			.attr("cy", function(d) { return yScale(d.y); })
			.style("fill", function(d) { return color(d.name);}) 
			.on("mouseover", function(d) {
				tooltip.html(d.name + " - " + d.y)
				  .style("left", (d3.event.pageX + 5) + "px")
				  .style("top", (d3.event.pageY - 28) + "px")
				  .style("opacity", 0.9);
			})
			.on("mouseout", function(d) {
				tooltip.style("opacity", 0);
			});
			
		var legend = svg.selectAll(".scatterplot-legend")
			.data(color.domain())
		  .enter().append("g")
			.attr("class", "scatterplot-legend")
			.attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });
		legend.append("rect")
		  .attr("x", width - 25)
		  .attr("width", 18)
		  .attr("height", 18)
		  .style("fill", color);
		legend.append("text")
          .attr("x", width - 4)
          .attr("y", 9)
          .attr("dy", ".35em")
          .style("text-anchor", "start")
          .text(function(d) { return d; });
	
	};
	
	this.init(options);
	
};