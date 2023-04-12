// TODO: REPLACE CODE AND REFACTOR WITH: https://codesandbox.io/s/github/UBC-InfoVis/447-materials/tree/23Jan/d3-examples/d3-choropleth-map?file=/js/choroplethMap.js

//         parentElement: _config.parentElement,
//         containerWidth: _config.containerWidth || 750,
//         containerHeight: _config.containerHeight || 500,
//         margin: _config.margin || {top: 25, right: 20, bottom: 20, left: 35},
//         tooltipPadding: _config.tooltipPadding || 15

class Geographic {

    /**
     * Class constructor with basic configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data, _dispatcher) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: 800,
            containerHeight: 600,
            margin: _config.margin || {top: 60, right: 20, bottom: 20, left: 35},
            tooltipPadding: 15,
            legendBottom: 120,
            legendLeft: 20,
            legendRectHeight: 12,
            legendRectWidth: 150
        }
        this.data = _data;
        this.dispatcher = _dispatcher;
        this.initVis();
    }

    /**
     * We initialize scales/axes and append static elements, such as axis titles.
     */
    initVis() {
        let vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement).append('svg')
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // Append group element that will contain our actual chart
        // and position it according to the given margin config
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`)
            .text("Film locations");

        vis.svg.append('text')
            .attr('class', 'chart-title')
            // .attr('x', vis.config.containerWidth/2 - vis.config.margin.left - vis.config.margin.right - 5)
            .attr('x', 0)
            .attr('y', 0)
            // .style('text-anchor', 'middle')
            .style('font-size', '20px')
            .style("font-weight", "bold")
            .text('Number of Movies by Filming Location')
            .attr('transform', `translate(0, 25)`);


        // Initialize projection and path generator
        vis.projection = d3.geoMercator();
        vis.geoPath = d3.geoPath().projection(vis.projection);

        vis.colorScale = d3.scaleLinear()
            .range(['#cfe2f2', '#0d306b'])
            .interpolate(d3.interpolateHcl);


        // Initialize gradient that we will later use for the legend
        vis.linearGradient = vis.svg.append('defs').append('linearGradient')
            .attr("id", "legend-gradient");

        // Append legend
        vis.legend = vis.chart.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${vis.config.legendLeft},${vis.height - vis.config.legendBottom})`);

        vis.legendRect = vis.legend.append('rect')
            .attr('width', vis.config.legendRectWidth)
            .attr('height', vis.config.legendRectHeight);

        vis.legendTitle = vis.legend.append('text')
            .attr('class', 'legend-title')
            .attr('dy', '.35em')
            .attr('y', -10)
            .text('Number of movies')

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        const popDensityExtent = d3.extent(vis.data.objects.countries.geometries, d => d.properties.count);

        // Update color scale
        vis.colorScale.domain(popDensityExtent);

        // Define begin and end of the color gradient (legend)
        vis.legendStops = [
            { color: '#cfe2f2', value: popDensityExtent[0], offset: 0},
            { color: '#0d306b', value: popDensityExtent[1], offset: 100},
        ];

        vis.renderVis();
    }


    renderVis() {
        let vis = this;

        // Convert compressed TopoJSON to GeoJSON format
        const countries = topojson.feature(vis.data, vis.data.objects.countries)

        // Defines the scale of the projection so that the geometry fits within the SVG area
        vis.projection.fitSize([vis.width, vis.height], countries);

        // Append world map
        const countryPath = vis.chart.selectAll('.country')
            .data(countries.features)
            .join('path')
            .attr('class', 'country')
            .attr('d', vis.geoPath)
            .attr('fill', d => {
                if (d.properties.count && d.properties.count > 0) {
                    return vis.colorScale(d.properties.count);
                } else {
                    return 'url(#lightstripe)';
                }
            });

        countryPath
          .on('click', function(event, d) {
            const isActive = selectedCountries.has(d.properties.name);
            if (isActive) {
              selectedCountries.delete(d.properties.name); // Remove filter
            } else {
              selectedCountries.add(d.properties.name); // Append filter
            }
            d3.select(this).classed('active', !isActive);
            console.log(selectedCountries);
            vis.dispatcher.call('geomapFiltersAllViz');
          });

        countryPath
            .on('mousemove', (event,d) => {
                const movieCount = d.properties.count ? `<strong>${d.properties.count}</strong> movies` : 'No data available';
                d3.select('#tooltip')
                    .style('display', 'block')
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')
                    .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                    .html(`
              <div class="tooltip-title">${d.properties.name}</div>
              <div>${movieCount}</div>
            `);
            })
            .on('mouseleave', () => {
                d3.select('#tooltip').style('display', 'none');
            });

        // Add legend labels
        vis.legend.selectAll('.legend-label')
            .data(vis.legendStops)
            .join('text')
            .attr('class', 'legend-label')
            .attr('text-anchor', 'middle')
            .attr('dy', '.35em')
            .attr('y', 20)
            .attr('x', (d,index) => {
                return index == 0 ? 0 : vis.config.legendRectWidth;
            })
            .text(d => Math.round(d.value * 10 ) / 10);

        // Update gradient for legend
        vis.linearGradient.selectAll('stop')
            .data(vis.legendStops)
            .join('stop')
            .attr('offset', d => d.offset)
            .attr('stop-color', d => d.color);

        vis.legendRect.attr('fill', 'url(#legend-gradient)');
    }
}