class Heatmap {

  /**
   * Class constructor with initial configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data, _dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
      vaccineIntroduced: _config.vaccineIntroduced,
      containerWidth: 300,
      containerHeight: 500,
      tooltipPadding: 15,
      margin: {top: 60, right: 20, bottom: 20, left: 28},
      legendWidth: 160,
      legendBarHeight: 10,
      months: {
        'January': 0,
        'February': 1,
        'March': 2,
        'April': 3,
        'May': 4,
        'June': 5,
        'July': 6,
        'August': 7,
        'September': 8,
        'October': 9,
        'November': 10,
        'December': 11
      }
    }
    this.data = _data;
    this.dispatcher = _dispatcher
    this.initVis();
  }
  
  /**
   * We create the SVG area, initialize scales/axes, and append static elements
   */
  initVis() {
    const vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.config.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.config.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Define size of SVG drawing area
    vis.svg = d3.select(vis.config.parentElement).append('svg')
        .attr('width', vis.config.containerWidth)
        .attr('height', vis.config.containerHeight);

    // Append group element that will contain our actual chart 
    // and position it according to the given margin config
    vis.chartArea = vis.svg.append('g')
        .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    vis.chart = vis.chartArea.append('g');

    // TODO: may have to fix scales to use scaleBand for month?
    // Initialize scales
    vis.colorScale = d3.scaleSequential()
        .domain([0, 17])
        .interpolator(d3.interpolateReds);

    vis.xScale = d3.scaleTime()
        .range([0, vis.config.width])
        .domain([new Date("0000-01-01"), new Date("0000-12-31")]);


    vis.yScale = d3.scaleLinear()
        .range([0, vis.config.height])
        // .paddingInner(0.2);

    // Initialize x-axis
    vis.xAxis = d3.axisTop(vis.xScale)
        .ticks(12)
        .tickSize(3)
        .tickFormat(d => {
          let date = new Date(2000, d, 1)
          let date_function = d3.timeFormat('%b')
          return date_function(date)
        })

    vis.yAxis = d3.axisLeft(vis.yScale)
        .ticks(20)
        .tickSize(3)
        .tickFormat(d3.format("d"));

    // Append empty x-axis group and move it to the bottom of the chart
    vis.xAxisG = vis.chartArea.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(10,0)`);

    vis.yAxisG = vis.chartArea.append('g')
        .attr('class', 'axis y-axis')
        .attr('transform', `translate(0,10)`);

    // Legend
    vis.legend = vis.svg.append('g')
        .attr('transform', `translate(${vis.config.containerWidth - vis.config.legendWidth - (vis.config.margin.right*3)},0)`);

    vis.legendColorGradient = vis.legend.append('defs').append('linearGradient')
        .attr('id', 'linear-gradient');

    vis.legendColorRamp = vis.legend.append('rect')
        .attr('width', vis.config.legendWidth)
        .attr('height', vis.config.legendBarHeight)
        .attr('fill', 'url(#linear-gradient)');

    vis.xLegendScale = d3.scaleLinear()
        .range([0, vis.config.legendWidth]);

    vis.xLegendAxis = d3.axisBottom(vis.xLegendScale)
        .tickSize(vis.config.legendBarHeight + 3)
        .tickFormat(d3.format('d'));

    vis.xLegendAxisG = vis.legend.append('g')
        .attr('class', 'axis x-axis legend-axis');

    vis.updateVis();
  }

  /**
   * Prepare the data and scales before we render it.
   */
  updateVis() {
    const vis = this;

    // Group data per state (we get a nested array)
    // [[2022, [array with values]], [2021, [array with values]], ...]
    vis.groupedData = d3.groups(vis.data.filter((d) => {
      let budget = d.Budget
      return budget >= BudgetFilterValues.min && budget <= BudgetFilterValues.max
    }), d => d.Year);

    vis.groupedMonthData = () => {
      let groupedByMonth = []
      vis.groupedData.forEach(([year, movies]) => {
        let monthGrouped = d3.groups(movies, d => d.Month)
        groupedByMonth.push([year, monthGrouped])
      })
      return groupedByMonth
    }

    // TODO: may have to fix accessor functions
    // Specify accessor functions
    vis.yValue = d => d[0]; // get years
    vis.colorValue = d => d.length; // get movie count
    vis.xValue = d => this.config.months[d]; // get month index

    vis.xScale.domain([0, 11])
    vis.yScale.domain(d3.extent(vis.groupedData.map(vis.yValue)));

    vis.renderVis();
    vis.renderLegend();
  }


  /**
   * Bind data to visual elements.
   */
  renderVis() {
    const vis = this;

    const cellWidth = (vis.config.width / (vis.xScale.domain()[1] - vis.xScale.domain()[0])) - 2;

    // 1. Level: rows
    const row = vis.chart.selectAll('.h-row')
        .data(vis.groupedMonthData(), d => {
          // console.log('outer: ', d[0])
          return d[0]
        });

    // Enter
    const rowEnter = row.enter().append('g')
        .attr('class', 'h-row');

    // // Enter + update
    // rowEnter.merge(row)
    // //   .transition().duration(1000)
    //     .attr('transform', d => {
    //       console.log('transform d: ', vis.yValue(d))
    //       return `translate(0,${vis.yScale(vis.yValue(d))})`
    //     });

    // Exit
    row.exit().remove();

    // 2. Level: columns

    // 2a) Actual cells
    const cell = row.merge(rowEnter).selectAll('.h-cell')
        .data(d => {
          return d[1]
        })

    // Enter
    const cellEnter = cell.enter().append('rect')
        .attr('class', 'h-cell');

    let max_count = 0
    // Enter + update
    cellEnter.merge(cell)
        .attr('height', cellWidth)
        .attr('width', cellWidth)
        .attr('x', d => {
          // get array of movies for the month
          /*
           d[1] gets the array of movies for the month
           d[1][0] gets the first element in the month array. we use this to get the month that all movies of this
           array (all the other movies in this array will be in the same year and month since that's what we grouped by)
           */
          // console.log('x val', vis.xScale(vis.xValue(d[0])))
          return vis.xScale(vis.xValue(d[0]))
        })
        .attr('y', d => {
          return vis.yScale(d[1][0].Year)
        })
        .attr('fill', d => {
          if (d.value === 0 || d.value === null) {
            return '#fff';
          } else {
            max_count = (vis.colorValue(d[1]) > max_count) ? vis.colorValue(d[1]) : max_count;
            return vis.colorScale(vis.colorValue(d[1]));
          }
        })
        .classed('selected', false)
        .attr('stroke', 'none')
        .on('mouseover', (event,d) => {
          let movie_count = d[1].length
          // const value = (d.value === null) ? 'No data available' : Math.round(d.value * 100) / 100;
          let movie_list = '<ul>'
          d[1].forEach(movie => {
            movie_list += '<li>' + movie.Title + '</li>'
          })
          movie_list += '</ul>'

          d3.select('#tooltip')
            .style('display', 'block')
            .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
            .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
            .html(`
              <div class='tooltip-title'>${d[0]}, ${d[1][0].Year}</div>
              <div>Number of movies: <strong>${movie_count}</strong><br><br></div>
              <div>
                    <strong>Movies:<br></strong>
                    ${movie_list}
              </div>
            `);
        })
        .on('mouseleave', () => {
          d3.select('#tooltip').style('display', 'none');
        })
        .on('click', function(event, d) {
          // console.log('onclick function d: ', d)

          const isSelected = d3.select(this).classed('selected');
          let currRect = d3.select(this)
          let moviesInMonth = d[1]
          currRect.classed('selected', !isSelected);

          if (!isSelected) {
            currRect
                .attr('stroke', 'green')
                .attr('stroke-width', '2')
            moviesInMonth.forEach(movie => {
              selectedMovies.add(movie.ID)
            })
            // console.log(selectedMovies)
          } else {
            currRect.attr('stroke', 'none')
            moviesInMonth.forEach(movie => {
              selectedMovies.delete(movie.ID)
            })
          }

          vis.dispatcher.call('heatmapFiltersAllViz')

        });

    // TODO: fix axes so they don't change during global filtering (budget sweeping)
    // Update axis
    vis.xAxisG.call(vis.xAxis);
    vis.yAxisG.call(vis.yAxis);
  }

  /**
   * Update colour legend
   */
  renderLegend() {
    const vis = this;

    // Add stops to the gradient
    // Learn more about gradients: https://www.visualcinnamon.com/2016/05/smooth-color-legend-d3-svg-gradient
    vis.legendColorGradient.selectAll('stop')
        .data(vis.colorScale.range())
      .join('stop')
        .attr('offset', (d,i) => i/(vis.colorScale.range().length-1))
        .attr('stop-color', d => d);

    // Set x-scale and reuse colour-scale because they share the same domain
    // Round values using `nice()` to make them easier to read.
    vis.xLegendScale.domain(vis.colorScale.domain()).nice();
    const extent = vis.xLegendScale.domain();

    // Manually calculate tick values
    vis.xLegendAxis.tickValues([
      extent[0],
      parseInt(extent[1]/3),
      parseInt(extent[1]/3*2),
      extent[1]
    ]);

    // Update legend axis
    vis.xLegendAxisG.call(vis.xLegendAxis);
  }
}