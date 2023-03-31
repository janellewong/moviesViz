let data, data_filtered;

let BudgetFilterValues = {
  min: 10,
  max: 356000000
}

// TODO: Instantiate charts with global filter slider

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

  heatmap = new Heatmap({parentElement: '#heatmap',}, data);
  heatmap.updateVis();

  geographic = new Geographic({parentElement: '#geographic-map',}, data);
  geographic.updateVis();



}).catch(error => console.error(error));


/*
Slider:

Get values from sliders when used and update BudgetFilterValues global filter min and max
 */
function controlSlider(fromSlider, toSlider) {
  let fromVal = fromSlider.value
  let toVal = toSlider.value

  if (fromVal > toVal) {
    BudgetFilterValues.max = fromVal
    BudgetFilterValues.min = toVal
  } else {
    BudgetFilterValues.max = toVal
    BudgetFilterValues.min = fromVal
  }
  console.log('min: ' + BudgetFilterValues.min)
  console.log('max: ' + BudgetFilterValues.max)
}

const fromSlider = document.querySelector('#slider1');
const toSlider = document.querySelector('#slider2');

fromSlider.oninput = () => controlSlider(fromSlider, toSlider);
toSlider.oninput = () => controlSlider(fromSlider, toSlider);


