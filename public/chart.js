var canvas = document.getElementById('canvas');
      const rc = rough.canvas(canvas, {
        options: {
          fill: "blue",
          roughness: 0.8,
          bowing: 0.7
        }
      });
  
var context = canvas.getContext("2d");
var margin = { top: 20, right: 20, bottom: 30, left: 40 },
  width = canvas.width - margin.left - margin.right,
  height = canvas.height - margin.top - margin.bottom;
var x = d3.scaleBand()
  .rangeRound([0, width])
  .padding(0.1);
var y = d3.scaleLinear()
  .rangeRound([height, 0]);
context.translate(margin.left, margin.top);

d3.tsv("data.tsv", function (d) {
  d.frequency = +d.frequency;
  return d;
}, function (error, data) {
  if (error) throw error;

  x.domain(data.map(function (d) { return d.letter; }));
  y.domain([0, d3.max(data, function (d) { return d.frequency; })]);

  var yTickCount = 1,
    yTicks = y.ticks(yTickCount),
    yTickFormat = y.tickFormat(yTickCount);

  data.forEach(function (d) {
    rc.rectangle(x(d.letter), y(d.frequency), x.bandwidth(), height - y(d.frequency));
  });


  context.beginPath();
  x.domain().forEach(function (d) {
    context.moveTo(x(d) + x.bandwidth() / 2, height);
    context.lineTo(x(d) + x.bandwidth() / 2, height + 6);
  });
  context.strokeStyle = "black";
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "top";
  x.domain().forEach(function (d) {
    context.fillText(d, x(d) + x.bandwidth() / 2, height + 6);
  });

  context.beginPath();
  yTicks.forEach(function (d) {
    context.moveTo(0, y(d) + 0.5);
    context.lineTo(-6, y(d) + 0.5);
  });
  context.strokeStyle = "black";
  context.stroke();

  context.textAlign = "right";
  context.textBaseline = "middle";
  yTicks.forEach(function (d) {
    context.fillText(yTickFormat(d), -9, y(d));
  });

  context.beginPath();
  context.moveTo(-6.5, 0 + 0.5);
  context.lineTo(0.5, 0 + 0.5);
  context.lineTo(0.5, height + 0.5);
  context.lineTo(-6.5, height + 0.5);
  context.strokeStyle = "black";
  context.stroke();

  context.save();
  context.rotate(-Math.PI / 2);
  context.textAlign = "right";
  context.textBaseline = "top";
  context.font = "bold 15px Gloria Hallelujah";
  context.fillText("word count", -10, 10);
  context.restore();
});