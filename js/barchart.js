class BarChart {

    /**
     * Class constructor with basic chart configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data, _dispatcher) {
      // Configuration object with defaults
      this.config = {
        parentElement: _config.parentElement,
        containerWidth: _config.containerWidth || 400,
        containerHeight: _config.containerHeight || 400,
        margin: _config.margin || {top: 20, right: 25, bottom: 25 + 50, left: 35},
        tooltipPadding: _config.tooltipPadding || 15
      }
      this.data = _data;
      this.dispatcher = _dispatcher;
      this.globalFilter = "all";
      this.initVis();
    }
    
    /**
     * Initialize scales/axes and append static elements, such as axis titles
     */
    initVis() {
      let vis = this;

      const orderedKeys = ['PG-13',
        'PG',
        'R',
        'TV-14',
        'TV-MA',
        'TV-PG',
        'TV-Y7',
        'NC-17',
        'TV-G',
        'G',
        'Not Rated'];
  
      // Calculate inner chart size. Margin specifies the space around the actual chart.
      vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
      vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;
  
      // Initialize scales and axes
      // Important: we flip array elements in the y output range to position the rectangles correctly
      vis.yScale = d3.scaleLinear()
          .range([vis.height, 0]) 
  
      vis.xScale = d3.scaleBand()
          .range([0, vis.width])
          .domain(orderedKeys)
          .paddingInner(0.2);
  
      vis.xAxis = d3.axisBottom(vis.xScale)
          .ticks(11)
          .tickSizeOuter(0);
  
      vis.yAxis = d3.axisLeft(vis.yScale)
          .ticks(6)
          .tickSize(-vis.width - 10)
          .tickSizeOuter(0);
  
      // Define size of SVG drawing area
      vis.svg = d3.select(vis.config.parentElement)
          .attr('width', vis.config.containerWidth)
          .attr('height', vis.config.containerHeight);
  
      // SVG Group containing the actual chart; D3 margin convention
      vis.chart = vis.svg.append('g')
          .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top + 25})`);
  
      // Append empty x-axis group and move it to the bottom of the chart
      vis.xAxisG = vis.chart.append('g')
          .attr('class', 'axis x-axis')
          .attr('transform', `translate(0,${vis.height})`);
      
      // Append y-axis group 
      vis.yAxisG = vis.chart.append('g')
          .attr('class', 'axis y-axis')
          .attr('transform', `translate(-5,0)`);

      // Append both axis titles
      vis.chart.append('text')
          .attr('class', 'axis-title')
          .attr('y', vis.height + 30)
          .attr('x', vis.width - 20)
          .attr('dy', '.71em')
          .style('text-anchor', 'end')
          .style("font-weight", "bold")
          .text('Certificates');

      vis.svg.append('text')
          .attr('class', 'axis-title')
          .attr('x', 0)
          .attr('y', 0)
          .attr('dy', '.71em')
          .style("font-weight", "bold")
          .attr('transform', `translate(0, 25)`)
          .text('Count of Movies');

      vis.svg.append('text')
          .attr('class', 'chart-title')
          .attr('x', vis.width/2 - vis.config.margin.left - vis.config.margin.right - 5)
          .attr('y', 0)
          .style('font-size', '20px')
          .style("font-weight", "bold")
          .text('Movie Certificates')
          .attr('transform', `translate(0, 25)`);

      vis.updateVis();
    }
  
    /**
     * Prepare data and scales before we render it
     */
    updateVis() {
      let vis = this;
  
      // Prepare data: count number of people in each difficulty category
      // i.e. [{ key: 'easy', count: 10 }, {key: 'intermediate', ...
      const aggregatedDataMap = d3.rollups(vis.data, v => v.length, d => d.Certificate);
      vis.aggregatedData = Array.from(aggregatedDataMap, ([key, count]) => ({ key, count }));

      const orderedKeys = ['PG-13',
        'PG',
        'R',
        'TV-14',
        'TV-MA',
        'TV-PG',
        'TV-Y7',
        'NC-17',
        'TV-G',
        'G',
        'Not Rated'];
      vis.aggregatedData = vis.aggregatedData.sort((a,b) => {
        return orderedKeys.indexOf(a.key) - orderedKeys.indexOf(b.key);
      });
  
      // Specificy accessor functions
      vis.xValue = d => d.key;
      vis.yValue = d => d.count;
  
      // Set the scale input domains
      vis.yScale.domain([0, d3.max(vis.aggregatedData, vis.yValue)]);
  
      vis.renderVis();
    }
  
    /**
     * Bind data to visual elements
     */
    renderVis() {
      let vis = this;
  
      // Add rectangles
      let bars = vis.chart.selectAll('.bar')
          .data(vis.aggregatedData, vis.xValue)
        .join('rect');
      
      bars.attr('opacity', 1)
          .attr('class', 'bar')
          .attr('x', d => vis.xScale(vis.xValue(d)))
          .attr('width', vis.xScale.bandwidth())
          .attr('height', d => vis.height - vis.yScale(vis.yValue(d)))
          .attr('y', d => vis.yScale(vis.yValue(d)))
          .classed('active', d => selectedCertificates.has(d.key))
          .on('click', function(event, d) {
            const isActive = selectedCertificates.has(d.key);
            if (isActive) {
               selectedCertificates.delete(d.key); // Remove filter
            } else {
              selectedCertificates.add(d.key); // Append filter
            }
            d3.select(this).classed('active', !isActive);
            console.log(selectedCertificates);
            console.log(selectedMovies);
            vis.dispatcher.call('barchartFiltersAllViz');
          });
      
      // Tooltip event listeners
      bars
        .on('mouseover', (event,d) => {
            d3.select('#tooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
              .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
              .html(`
                <div class="tooltip-title">Certificate: ${d.key}</div>
                <div><i>Movie Count: ${d.count}</i></div>
              `);
          }
        )
        .on('mouseleave', () => {
          d3.select('#tooltip').style('display', 'none');
        });
  
      // Update axes
      vis.xAxisG.call(vis.xAxis);
      vis.yAxisG.call(vis.yAxis);
    }
  }