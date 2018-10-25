'use strict';

const express = require('express');
const cors = require('cors');
const superagent =require('superagent');
require('dotenv').config();
const pg = require('pg');
console.log(process.env.DATABASE_URL);



const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('err', err => console.log(err));

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());

app.get('/location', getLocation);
// app.get('/weather', getWeather);
// app.get('/yelp', getYelp);
// app.get('/movies', getMovies);

function Location(query, data) {
  this.search_query = query;
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
}

Location.prototype.save = function () {
  let SQL = `INSERT INTO locations(search_query, formatted_query, latitude, longitude) VALUES($1, $2, $3, $4)`;
  let values = Object.values(this);

  client.query(SQL,values);
}

Location.fetchLocation = (query) => {
  const _URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;
  console.log('Got the url: ', _URL);

  return superagent.get(_URL)
    .then(data => {
      console.log('got data from api:');
      if (!data.body.results.length) {
        throw 'No Data';
      } else {
        let location = new Location(query, data.body.results[0]);
        location.save();

        return location;
      }
    });
}

function getLocation(request, response) {
  const locationHandler = {
    query: request.query.data,

    cacheHit: (results) => {
      response.send(results.row[0]);
    },

    cacheMiss: () => {
      Location.fetchLocation(request.query.data)
        .then(data => response.send(data));
    }
  }

  Location.lookUpLocation(locationHandler);
}

Location.lookUpLocation = (handler) => {
  const SQL = `SELECT * FROM locations WHERE search_query=$1;`
  const values = [handler.query];

  return client.query(SQL, values)
    .then((results) => {
      if (results.rowCount > 0) {
        handler.cacheHit(results);
      } else {
        handler.cacheMiss();
      }
    })
    .catch(console.error);
}

//This will take the location name and run the searchtolatlong() which will store the location information as an object that contains latitude,longitude and location name.
// app.get('/location', (request, response) => {
//   // console.log('GET /location', request.query);

//   //runs the searchtolatlong() which takes in the query data from the URL.
//   searchToLatLong(request.query.data)
//     .then( locationData => {//location data is the superagent return
//       response.send(locationData);
//     })
//     //This will handle our errors
//     .catch ( error => handleError(error,response));
// });

app.listen(PORT, () => console.log(`App is up on http://localhost:${PORT}`));

//This function takes in the query and makes the request to the API,then format the data that it gets into the object that we need.
// function searchToLatLong(query) {
//   // console.log('getting',URL);

//   return superagent.get(URL)
//     .then( data => {
//       let location = new Location(data.body.results[0]);

//       //This line fills in the Actual search query to the object.
//       location.search_query = query;
//       return location;
//     })
//     .catch(error => handleError(error));
// }



/////weather

// app.get('/weather', (request, response)=>{
//   searchWeather(request.query.data)
//     .then( weatherData => {
//       response.send(weatherData);
//     })
// })

// function searchWeather(location){
//   const URL = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${location.latitude},${location.longitude}`;

//   return superagent.get(URL)
//     .then( data => {
//       let weatherData = data.body.daily.data.map( day => {
//         return new Weather(day);
//       })
//       return weatherData;
//     })
//     .catch(error => handleError(error));
// }

// function Weather (day) {
//   this.forecast = day.summary;
//   this.time = new Date(day.time * 1000).toString().slice(0,15);
// }


////YELP


// app.get('/yelp', (request, response) => {
//   searchYelp(request.query.data)//this is the formatted location objecy
//     .then( yelpData => {
//       response.send(yelpData);
//     })
// })

// function searchYelp(location){
//   const URL = `https://api.yelp.com/v3/businesses/search?latitude=${location.latitude}&longitude=${location.longitude}&categories=restaurants`;

//   return superagent.get(URL)
//     .set( 'Authorization', `Bearer ${process.env.YELP_API_KEY}`)
//     .then( data => {
//       let yelpData = data.body.businesses.map( item => {
//         return new Business(item);
//       })
//       return yelpData;
//     })
//     .catch(error => handleError(error));
// }

// function Business(business) {
//   this.name = business.name;
//   this.image_url = business.image_url;
//   this.price = business.price;
//   this.rating = business.rating;
//   this.url = business.url;
// }

// //////////MOVIES///////////////

// app.get('/movies', (request, response) => {
//   searchMovies(request.query.data)//this is the formatted location objecy
//     .then( movieData => {
//       response.send(movieData);
//     })
// })

// function searchMovies(location){
//   const URL = `https://api.themoviedb.org/3/movie/76341?api_key=${process.env.MOVIES_API_KEY}&query=${location.search_query}`;

//   return superagent.get(URL)
//     .then( data => {
//       return [new Movie(data.body)];
//     })
//     .catch(error => handleError(error));
// }

// function Movie(movie) {
//   this.title = movie.title;
//   this.overview = movie.overview;
//   this.average_votes = movie.vote_average;
//   this.total_votes = movie.vote_count;
//   this.image_url = 'https://image.tmdb.org/t/p/w500/'+movie.poster_path;
//   this.popularity = movie.popularity;
//   this.released_on = movie.release_date;
// }


//////////errors
function handleError(error,response) {
  console.log('error',error);
  if(response){
    response.status(500).send('sorry there is no data')
  }
}

