function createMyMap() {
	//create map and center using point and zoom level
	var mymap = L.map('mapid').setView([20.944787, 99.492193], 4.4);

	//Load first layer of base topographic map
	L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {attribution: ''}).addTo(mymap);

	//load data files
	d3.queue()
		.defer(d3.json, "https://raw.githubusercontent.com/anupamabalaji/quiltpublictest/master/flood_regions.geojson")  // flood regions (5)
		.defer(d3.json, "https://raw.githubusercontent.com/anupamabalaji/quiltpublictest/master/cities.geojson") // city polygons in flood regions
		.defer(d3.json, "https://raw.githubusercontent.com/anupamabalaji/quiltpublictest/master/flood_events.geojson") // lat-long points for flood events
		.defer(d3.json,"https://raw.githubusercontent.com/anupamabalaji/quiltpublictest/master/flood_events_polygon_area.geojson")
		.await(ready);

	

	function ready(error, flood, cities, events,event_polygons) {


		//code for slider
		////////// slider //////////
		var formatDateIntoYear = d3.timeFormat("%Y");
		var formatDate = d3.timeFormat("%b %Y");
		var dateFormat = d3.timeFormat("%Y-%m");
		var parseDate = d3.timeParse("%m/%d/%y");

		var margin = {top:-50, right:50, bottom:0, left:150},
		    width = 740 - margin.left - margin.right,
		    height = 150 - margin.top - margin.bottom;

		var svg = d3.select("#vis")
		    .append("svg")
		    .attr("width", "100%")
		    .attr("height", "100%")
		    .attr("viewBox", "0 0 740 75");
		
		var startDate = new Date("1985-01-01"),
	    	endDate = new Date("2020-07-31");

		var moving = false;
		var currentValue = 0;
		var targetValue = width;

		var playButton = d3.select("#play-button");
		    
		var x = d3.scaleTime()
		    .domain([startDate, endDate])
		    .range([0, targetValue])
		    .clamp(true);

		var slider = svg.append("g")
		    .attr("class", "slider")
		    .attr("transform", "translate(" + margin.left + "," + height/5 + ")");

		slider.append("line")
		    .attr("class", "track")
		    .attr("x1", x.range()[0])
		    .attr("x2", x.range()[1])
		  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
		    .attr("class", "track-inset")
		  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
		    .attr("class", "track-overlay")
		    .call(d3.drag()
		        .on("start.interrupt", function() { slider.interrupt(); })
		        .on("start drag", function() {
		          currentValue = d3.event.x;
		          update(x.invert(currentValue)); 
		        })
		    );

		slider.insert("g", ".track-overlay")
		    .attr("class", "ticks")
		    .attr("transform", "translate(0," + 18 + ")")
		  .selectAll("text")
		    .data(x.ticks(10))
		    .enter()
		    .append("text")
		    .attr("x", x)
		    .attr("y", 10)
		    .attr("text-anchor", "middle")
		    .text(function(d) { return formatDateIntoYear(d); });

		var handle = slider.insert("circle", ".track-overlay")
		    .attr("class", "handle")
		    .attr("r", 9);

		var label = slider.append("text")  
		    .attr("class", "label")
		    .attr("text-anchor", "middle")
		    .text(formatDate(startDate))
		    .attr("transform", "translate(0," + (-25) + ")")

		playButton
		    .on("click", function() {
		    var button = d3.select(this);
		    if (button.html() == '<i class="fa fa-pause" stlye="color:white;" aria-hidden="true"></i>') {
		      moving = false;
		      clearInterval(timer);
		      // timer = 0;
		      button.html('<i class="fa fa-play" stlye="color:white;" aria-hidden="true"></i>');
		    } else {
		      moving = true;
		      timer = setInterval(step, 500);
		      button.html('<i class="fa fa-pause" stlye="color:white;" aria-hidden="true"></i>');
		    }
		    console.log("Slider moving: " + moving);
		  })

		function step() {
		  update(x.invert(currentValue));
		  currentValue = currentValue + (targetValue/536);
		  
		  if (currentValue > targetValue) {
		    moving = false;
		    currentValue = 0;
		    clearInterval(timer);
		    // timer = 0;
		    playButton.text("Play");
		    console.log("Slider moving: " + moving);
		  }
		}

		function update(h) {
		  // update position and text of label according to slider scale
		  handle.attr("cx", x(h));
		  label
		    .attr("x", x(h))
		    .text(formatDate(h));

		  console.log(h);
		  drawEvent(h);
		  // // filter data set and redraw plot
		  // var newData = dataset.filter(function(d) {
		  //   return d.date < h;
		  // })
		  // drawPlot(newData);
		}

		////////// slider //////////

		//load 2nd layer of the 5 flood regions
		L.geoJSON(flood.features).addTo(mymap);
		
		//load circles for the flood cities 
		var cities_layer = L.geoJson(cities, {
					style:{fillColor:'blue',color:'blue'},
		  			onEachFeature: function(feature, layer) {
						var fontSize = 12;
						if(fontSize > 1 && feature.properties.city != null) {
							layer.bindTooltip("<span style='font-size: " + fontSize + "px'>" + feature.properties.city + "</span>", {
																className: "label",
																permanent: true, //show always
																direction: "center"
															}
															).openTooltip();
						} //end if

						if(fontSize > 1 && feature.properties.name != null) {
							layer.bindTooltip("<span style='font-size: 10px'>" + feature.properties.name + "</span>", {
																className: "label",
																permanent: false, //show on hover
																direction: "center"
															}
															).openTooltip();
						} //end if
					} //end function
				} //end attributes
			).addTo(mymap);

		//for the text on the maps like legend, city and flood info
		var info = L.control();  
		// var info1 = L.control();
		var info3 = L.control();
		
		info.onAdd = function (map) {
		    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"

		    this.update();
		    return this._div;
		};

		info3.onAdd = function(map){
			this._div = L.DomUtil.create('div','info');
			this._div.innerHTML='<table border="0">\
									<tr>\
										<td class=" square-lightblue"></td>\
										<td style="color:white;">Flood Regions</td>\
										<td class=" square-blue"></td>\
										<td style="color:white;">City Area</td>\
										<td class=" square-red"></td>\
										<td style="color:white;">Flood Events</td>\
									</tr>\
								</table>\
			 ';
			return this._div;
		}

		// method that we will use to update the control based on feature properties passed
		info.update = function (curr_yr,area,dead,displaced) {

			if (curr_yr != null && parseFloat(area) > 0) {
		    	// this._div.innerHTML = '<p>Year: ' + curr_yr + ' Total Affected Area: ' +area+' sq. km. Dead: '+dead+' Displaced: '+displaced+'</p>';

		    	this._div.innerHTML = '\
		    	 		<div class="wrapper">\
					    	<p>Month: '+curr_yr+'</p>\
						<p>Total Affected Area(Sq.Km): '+formatNumber(parseFloat(area).toFixed(2))+'</p>\
						<p>Dead: '+dead+'</p>\
						<p>Displaced: '+displaced+'</p>\
					</div>\';

		    } else {
		    	this._div.innerHTML = '\
		    							<div class="wrapper">\
		    								<div class="table">\
											    <div class="row">\
											      <div class="cell">\
			    									No Flood Events\
			    								  </div>\
			    								</div>\
											</div>\
										</div>';

		    }
		};
		info.setPosition('bottomleft');
		//info1.setPosition('bottomleft');
		info3.setPosition('topleft');
		
		info.addTo(mymap);
		info3.addTo(mymap);
		//info1.addTo(mymap);


		//adding Shanghai to the map
		var marker = new L.marker([31.2304, 121.4737], { opacity: 0 }); //opacity may be set to zero
		marker.bindTooltip("<span style='font-size:12px'>Shanghai</span>", {permanent: true, className: "label", direction:"center" });
		marker.addTo(mymap);

		//creating an empty layer to hold flood event polygons
		var flood_events_layer = L.geoJSON().addTo(mymap);
		// //setting starting year and month to fetch data
		// var year = 1985, month=0, endYear = 2020, endMonth = 8;
		
		// //for the animation
		// var id = setInterval(drawEvents, 500);

		//function to draw the event
		function drawEvent(dateData) {
			//variable to hold list of features from the flood events file that match the corresponding year/month
			var filtered_events = [];

			

			var curr_yr = dateFormat(dateData); //get to YYYY-mm format
			filtered_events = events.filter(function(feature) { 
												return (feature.properties.Country === 'India'
														|| feature.properties.Country === 'Bangladesh'
														|| feature.properties.Country === 'China') 
														&& feature.properties.Ended.toString().includes(curr_yr);
								});


				
			var id_array = []; //to hold id-s of lat-long to enable look up in polygon file
			var area=0, dead=0, displaced = 0; //initializing

			//for each lat-long, get its id and total up the area, dead and displaced
			centroid_details = []
			filtered_events.forEach(function(feature){
				id_array.push(feature.id);
				area = area+parseFloat(feature.properties.Area);
				dead = dead+parseInt(feature.properties.Dead);
				displaced = displaced+parseInt(feature.properties.Displaced);
				centroid_details.push({id: feature.id, 
										area: feature.properties.Area, 
										dead: feature.properties.Dead, 
										displaced: feature.properties.Displaced,
										cause: feature.properties.MainCause,
										began: feature.properties.Began,	
										ended: feature.properties.Ended});

			});

			//get polygons list based on the id array
			filtered_events_polygon = event_polygons.filter(function(feature){
				return(id_array.indexOf(feature.id) !== -1 )
			})

				//update year month, dead and displaced information on the info box
			info.update(formatDate(dateData),area,dead,displaced);
			
			//remove current layer
			flood_events_layer.remove();

			//add new layer with new data
			flood_events_layer = L.geoJson(filtered_events_polygon, {
											style:{fillColor:'red',color:'red'}, 
											onEachFeature: function(feature, layer) {
																var fontSize = 10;
																centroid_detail = centroid_details.filter(function(detail) {
																							return (detail.id === feature.id);
																				  });
																layer.bindTooltip("<table border='0' style='font-size: " + fontSize + "px'>" 
																					+ "<tr><td>Area: </td><td>" + formatNumber(parseFloat(centroid_detail[0].area).toFixed(2)) + " Sq Km</td></tr>"
																					+ "<tr><td>Began: </td><td>" + centroid_detail[0].began + "</td></tr>"
																					+ "<tr><td>Ended: </td><td>" + centroid_detail[0].ended + "</td></tr>"
																					+ "<tr><td>Cause: </td><td>" + centroid_detail[0].cause + "</td></tr>"
																					+ "<tr><td>Dead: </td><td>" + centroid_detail[0].dead + "</td></tr>"
																					+ "<tr><td>Displaced: </td><td>" + centroid_detail[0].displaced
																					+ "</table>", {
																									className: "label",
																									permanent: false, //show on hover
																									direction: "bottom"
																								}
																								).openTooltip();
																

											}}).addTo(mymap);

			

		}
		
	}

	//addCitiesInfo();
}

function addCitiesInfo() {
	d3.select('#citiesInfo').html(
		'\
	    <div class="wrapper">\
			<div class="table overflow-x:auto;">\
			    \
			    <div class="row header">\
			      <div class="cell">\
			        City\
			      </div>\
			      <div class="cell">\
			        SERI\
			      </div>\
			      <div class="cell">\
			        CVI\
			      </div>\
			       <div class="cell">\
			        SERI Class\
			      </div>\
			      <div class="cell">\
			        CVI Class\
			      </div>\
			      <div class="cell">\
			        Vulnerability Cluster\
			      </div>\
			      \
			    </div>\
			    \
			    <div class="row">\
			      <div class="cell" style="color:grey;">\
			        Guwahati\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			       56.956 \
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        51.420\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        High\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        High\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        Indifferent\
			      </div>\
			      \
			    </div>\
			\
			     <div class="row">\
			      <div class="cell" style="color:grey;">\
			        Kolkata\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			       71.057 \
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        100.000\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        High\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        High\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        Someone else\'s problem\
			      </div>\
			      \
			    </div>\
			    \
			    \
			     <div class="row">\
			      <div class="cell" style="color:grey;">\
			        Dhaka\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			       83.812 \
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        68.551\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        High\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        High\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        Indifferent\
			      </div>\
			      \
			    </div>\
			    \
			    \
			     <div class="row">\
			      <div class="cell" style="color:grey;">\
			        Comilla\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			       69.772 \
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        90.594\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        High\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        High\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        Someone else\'s problem\
			      </div>\
			      \
			    </div>\
			    \
			    \
			     <div class="row">\
			      <div class="cell" style="color:grey;">\
			        Hangzhou\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			       58.169 \
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        75.733\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        High\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        High\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        Avoidant\
			      </div>\
			      \
			    </div>\
			    \
			    \
			     <div class="row">\
			      <div class="cell" style="color:grey;">\
			        Shanghai\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			       69.103 \
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        95.523\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        High\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        High\
			      </div>\
			      <div class="cell" style="color:grey;" >\
			        Avoidant\
			      </div>\
			      \
			    </div>\
			    \
			  </div>\
			  </div>\
			');

}

function formatNumber(x) {
    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}
