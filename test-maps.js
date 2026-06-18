const fs = require('fs');

const envFile = fs.readFileSync('c:/Users/sanjay.ra/Downloads/routeMind/.env', 'utf8');
const keyMatch = envFile.match(/EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=(.*)/);
const MAPS_API_KEY = keyMatch ? keyMatch[1].trim() : null;

async function test() {
  console.log("Using Key:", MAPS_API_KEY ? MAPS_API_KEY.substring(0, 10) + "..." : "undefined");
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=Ashok+nagar&key=${MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    console.log("Status:", data.status);
    console.log("Error Message:", data.error_message);
    console.log("Results length:", data.results ? data.results.length : 0);
  } catch (error) {
    console.error("Fetch Error:", error.message);
  }
}

test();
