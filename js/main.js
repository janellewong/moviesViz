let data, data_filtered;
/**
 * Load data from CSV file asynchronously and render charts
 */
d3.csv('data/movies-processed.csv')
  .then(_data => {
  data = _data;
  // Convert columns to numerical values
  data = data.map(d => {
    Object.keys(d).forEach(attr => {
      if (attr == 'Budget' || attr == 'Income') {
        d[attr] = (d[attr] == 'Unknown' || d[attr] == null) ? null : +d[attr];
      } else if (attr == 'Country_of_origin' || attr == 'Genre' || attr == 'Stars' || attr == "Directors") {
        d[attr] = d[attr].split(',').map(s => s.trim());
      } else if (attr != 'Certificate' && attr != 'Filming_location' && attr != 'Month' && attr != 'Title') {
        d[attr] = +d[attr];
      }
    });
    return d;
  });

  console.log(data);

  data_filtered = data.filter(d => d.Budget !== null); // if we're using income instead of budget, just change it to income instead 

  scatterplot = new ScatterPlot({parentElement: '#scatter-plot',}, data_filtered); // put the filtered data in since we don't want unknowns in the scatterplot
  scatterplot.updateVis();

  barchart = new BarChart({parentElement: '#bar-chart',}, data);
  barchart.updateVis();

  heatmap = new Heatmap({parentElement: '#lexis-chart',}, data);
  heatmap.updateVis();

  geographic = new Geographic({parentElement: '#geographic-map',}, data);
  geographic.updateVis();
});