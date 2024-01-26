//const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require("pg");

const pool = new Pool({
  user: 'labber',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
})


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool.query('SELECT * FROM users WHERE email = $1', [email])
    .then((res) => {
      return Promise.resolve(res.rows[0] || null);
    }).catch((err) => {
      console.log(err.message);
    });

};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool.query('SELECT * FROM users WHERE id = $1', [id])
    .then((res) => {
      return Promise.resolve(res.rows[0] || null);
    }).catch((err) => {
      console.log(err.message);
    });

};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const query = {
    text: `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;`,
    values: [user.name, user.email, user.password]
  }
  return pool.query(query)
    .then((res) => {
      return new Promise.resolve(res.rows);
    }).catch((err) => {
      console.log(err.message);
    });

};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {


  const query = {
    text: `
    SELECT reservations.*, properties.*, AVG(rating) as average_rating 
    FROM properties 
    JOIN reservations on reservations.property_id = properties.id 
    JOIN property_reviews ON property_reviews.property_id = properties.id 
    WHERE reservations.guest_id = $1 
    GROUP BY reservations.id, properties.id
     ORDER BY start_date 
     LIMIT $2;`,
    values: [guest_id, limit]
  }

  return pool.query(query)
    .then((res) => {
      console.log(res.rows);
      return Promise.resolve(res.rows);
    }).catch((err) => {
      console.log(err.message);
      return Promise.reject(err)
    });

};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = (options, limit = 10) => {
  const queryParams = [];

  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  //Logic to check if specifc opetions were passed to the query
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += ` WHERE city LIKE $${queryParams.length}`;
  }

  if (options.minimum_price_per_night) {

    queryParams.push(`${options.minimum_price_per_night * 100}`);
    queryString += ` AND properties.cost_per_night > $${queryParams.length}`;

  }

  if (options.maximum_price_per_night) {
    queryParams.push(`${options.maximum_price_per_night * 100}`);
    queryString += ` AND properties.cost_per_night < $${queryParams.length}`;
  }

  queryString += `GROUP BY properties.id`;

  if (options.minimum_rating) {
    queryParams.push(`${options.minimum_rating}`);
    queryString += ` HAVING AVG(property_reviews.rating) > $${queryParams.length}`;
  }


  queryParams.push(limit);

  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;
  
  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
 
  const queryParams = [];
  const keys = Object.keys(property);
  const voidParam = 0;

  //Creates string of placeholders for values in query (eg, $1, 2$), uses join so that no comma is added to the end
  const placeholders = keys.map((key, index) => `$${index + 1}`).join(',');

 

  let queryString = `INSERT INTO properties(title, description, number_of_bedrooms, number_of_bathrooms, parking_spaces, cost_per_night, thumbnail_photo_url, cover_photo_url,  street,  country, city, province, post_code,  owner_id )
  VALUES(${placeholders})
  RETURNING *;
  `;


  //Loops over each key and pushes the data to queryParams, if the data is empty we substitute with voidParam
  keys.forEach((key) => {
    queryParams.push(property[key] || voidParam);
  });


  return pool
    .query(queryString, queryParams)
    .then((result) => {
      return Promise.resolve(result.rows[0]);
    })
    .catch((err) => {
      console.log(err.message);
    });

};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
