
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
		
		var margin = (options.margin) ? options.margin : {top: 20, right: 190, bottom: 30, left: 40};
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
	
		svg.selectAll(".scatterplot-dot")
			.data(data)
		  .enter().append("circle")
			.attr("class", "scatterplot-dot")
			.attr("r", 8)
			.attr("cx", function(d) { return xScale(d.x); })
			.attr("cy", function(d) { return yScale(d.y); })
			.style("fill", function(d) { return color(d.name);}) 
			.call(d3.helper.tooltip(function(d, i) { 
				return ("<b>" + d.name + "</b><br />" + d.y + " in " + d.x); 
			}));
			
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
	
	};
	
	this.init(options);
	
};